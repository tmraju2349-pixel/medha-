/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * MEDHA Game Service & Telemetry Collection Engine
 * Collects micro-events, normalizes session metrics, validates data quality,
 * and feeds telemetry into the ML Random Tree Cognitive Engine.
 */

import type { GameEvent, StandardSessionData, StandardCognitiveDomain } from './types';
import type { CognitiveTelemetry, CognitiveEvaluation } from '../types';
import { classifyTelemetry } from '../ml';
import { generateInitialBaselineSessions } from '../historicalData';
import { localRepository } from '../../../services/storage/localRepository';
import { syncManager } from '../../../services/storage/syncManager';

const SESSIONS_STORAGE_KEY = 'medha_game_sessions_v1';
const SYNC_QUEUE_KEY = 'medha_game_sync_queue_v1';

export class GameSessionTracker {
  private sessionId: string;
  private patientId: string;
  private gameId: string;
  private cognitiveDomain: StandardCognitiveDomain;
  private difficultyLevel: number;
  private isPractice: boolean;
  private startTime: number;
  private events: GameEvent[] = [];
  private pauses = 0;
  private restarts = 0;

  constructor(
    patientId: string,
    gameId: string,
    cognitiveDomain: StandardCognitiveDomain,
    difficultyLevel: number,
    isPractice = false
  ) {
    this.sessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    this.patientId = patientId;
    this.gameId = gameId;
    this.cognitiveDomain = cognitiveDomain;
    this.difficultyLevel = difficultyLevel;
    this.isPractice = isPractice;
    this.startTime = Date.now();
  }

  public getSessionId(): string {
    return this.sessionId;
  }

  public recordEvent(eventData: Omit<GameEvent, 'session_id' | 'event_id' | 'timestamp'>): GameEvent {
    if (eventData.event_type === 'pause') {
      this.pauses++;
    } else if (eventData.event_type === 'restart') {
      this.restarts++;
    }

    const event: GameEvent = {
      ...eventData,
      session_id: this.sessionId,
      event_id: `evt_${this.events.length + 1}_${Date.now()}`,
      timestamp: Date.now(),
    };
    this.events.push(event);
    return event;
  }

  public recordPause() {
    this.recordEvent({
      event_type: 'pause',
      question_id: 'global',
      stimulus_type: 'system',
      difficulty_level: this.difficultyLevel,
    });
  }

  public recordResume() {
    this.recordEvent({
      event_type: 'resume',
      question_id: 'global',
      stimulus_type: 'system',
      difficulty_level: this.difficultyLevel,
    });
  }

  /**
   * Finalizes the session, calculates psychometric telemetry,
   * validates against anti-cheating/corruption rules, runs ML Random Tree inference,
   * and persists into offline local storage.
   */
  public completeSession(summary: {
    score: number;
    maxScore: number;
    correctAnswers: number;
    incorrectAnswers: number;
    hintsUsed: number;
    domainMetrics?: Record<string, number | string>;
    reactionTimes?: number[];
    hesitationMs?: number;
    reactionTimeVariability?: number;
    movementHesitation?: number;
    postErrorRecoveryMs?: number;
  }): StandardSessionData {
    const endTime = Date.now();
    const completionTimeSec = Math.max(1, Math.round((endTime - this.startTime) / 1000));
    const totalAttempts = summary.correctAnswers + summary.incorrectAnswers;
    const accuracy = totalAttempts > 0 ? summary.correctAnswers / totalAttempts : (summary.score > 0 ? 0.8 : 0);

    // Aggregate reaction times from both event stream and explicitly passed summary
    const answerEvents = this.events.filter(
      (e) => (e.event_type === 'answer_correct' || e.event_type === 'answer_incorrect' || e.event_type === 'answer_selected') && typeof e.response_time === 'number'
    );
    const eventRTs = answerEvents.map((e) => e.response_time as number).filter((t) => t > 0);
    const summaryRTs = (summary.reactionTimes || []).filter((t) => typeof t === 'number' && t > 0);
    const combinedRTs = summaryRTs.length > 0 ? summaryRTs : eventRTs;

    // Default fallback if no trials emitted explicit RT
    const responseTimes = combinedRTs.length > 0 ? combinedRTs : [620, 680, 590, 710];

    let rtAvg = 650;
    let rtMin = 650;
    let rtMax = 650;

    if (responseTimes.length > 0) {
      rtAvg = Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length);
      rtMin = Math.min(...responseTimes);
      rtMax = Math.max(...responseTimes);
    }

    // Reaction Time Variability (RTV = stdDev / mean)
    const variance = responseTimes.reduce((acc, t) => acc + Math.pow(t - rtAvg, 2), 0) / responseTimes.length;
    const stdDev = Math.sqrt(variance);
    const computedVariability = Number((stdDev / Math.max(1, rtAvg)).toFixed(3));
    const reactionTimeVariability = summary.reactionTimeVariability ?? Math.max(0.12, computedVariability);

    // Hesitation Index (Initiation delay before acting / first move delay)
    let hesitationMs = summary.hesitationMs;
    if (hesitationMs === undefined || isNaN(hesitationMs)) {
      // Find time from level start or stimulus to first interaction event
      const stimEvent = this.events.find((e) => e.event_type === 'level_started' || e.event_type === 'stimulus_shown');
      const firstActEvent = this.events.find((e) => e.event_type === 'answer_selected' || e.event_type === 'answer_correct' || e.event_type === 'answer_incorrect');
      if (stimEvent && firstActEvent && firstActEvent.timestamp >= stimEvent.timestamp) {
        hesitationMs = firstActEvent.timestamp - stimEvent.timestamp;
      } else {
        hesitationMs = Math.round(rtAvg * 1.18);
      }
    }

    // Movement Hesitation (Motor/cursor indecision and hovering before commit)
    const movementHesitation = summary.movementHesitation ?? (
      this.pauses > 0 ? 0.32 : Math.min(0.65, Number((reactionTimeVariability * 0.75).toFixed(3)))
    );

    // Post-Error Recovery Delay
    let postErrorRecoveryMs = summary.postErrorRecoveryMs;
    if (postErrorRecoveryMs === undefined || isNaN(postErrorRecoveryMs)) {
      const firstMistakeIdx = answerEvents.findIndex((e) => !e.correct);
      if (firstMistakeIdx !== -1 && firstMistakeIdx + 1 < answerEvents.length) {
        postErrorRecoveryMs = answerEvents[firstMistakeIdx + 1].response_time || Math.round(rtAvg * 1.3);
      } else {
        postErrorRecoveryMs = Math.round(rtAvg * 1.25);
      }
    }

    // Fatigue drift: early trials RT vs late trials RT
    let fatigueDrift = 0;
    if (responseTimes.length >= 4) {
      const half = Math.floor(responseTimes.length / 2);
      const earlyAvg = responseTimes.slice(0, half).reduce((a, b) => a + b, 0) / half;
      const lateAvg = responseTimes.slice(half).reduce((a, b) => a + b, 0) / (responseTimes.length - half);
      fatigueDrift = Number(((lateAvg / earlyAvg) - 1.0).toFixed(3));
    }

    // Attentional lapse rate: responses exceeding 2.2x personal/session average
    let lapseRate = 0;
    if (responseTimes.length > 0) {
      const lapseThreshold = rtAvg * 2.2;
      const lapses = responseTimes.filter((t) => t > lapseThreshold).length;
      lapseRate = Number((lapses / responseTimes.length).toFixed(3));
    }

    // Error clustering: consecutive mistakes
    let consecutiveMistakes = 0;
    let clusters = 0;
    answerEvents.forEach((e) => {
      if (!e.correct) {
        consecutiveMistakes++;
        if (consecutiveMistakes >= 2) clusters++;
      } else {
        consecutiveMistakes = 0;
      }
    });
    const errorClustering = totalAttempts > 0 ? Math.min(1.0, Number((clusters / totalAttempts).toFixed(3))) : 0;

    // Retrieve historical baseline for this patient to compute baselineDeviation
    const personalBaseline = getPatientBaseline(this.patientId, this.gameId);
    let baselineDeviation = 0;
    if (personalBaseline && personalBaseline.avgReactionTimeMs > 0) {
      baselineDeviation = Number(((rtAvg - personalBaseline.avgReactionTimeMs) / personalBaseline.avgReactionTimeMs).toFixed(3));
    }

    // Standardized CognitiveTelemetry with rich behavioral biomarkers
    const normalizedTelemetry: CognitiveTelemetry = {
      avgReactionTimeMs: Math.max(300, Math.min(2500, rtAvg)),
      accuracy: Math.max(0, Math.min(1, Number(accuracy.toFixed(3)))),
      lapseRate: Math.max(0, Math.min(1, lapseRate)),
      fatigueDrift: Math.max(-0.5, Math.min(1.5, fatigueDrift)),
      errorClustering: Math.max(0, Math.min(1, errorClustering)),
      baselineDeviation: Math.max(-0.5, Math.min(0.8, baselineDeviation)),
      hesitationMs: Math.max(250, Math.min(3500, Math.round(hesitationMs))),
      reactionTimeVariability: Math.max(0.05, Math.min(1.5, reactionTimeVariability)),
      movementHesitation: Math.max(0, Math.min(1, Number(movementHesitation.toFixed(3)))),
      postErrorRecoveryMs: Math.max(300, Math.min(4000, Math.round(postErrorRecoveryMs))),
    };

    // Data Quality Validation
    let dataQuality: 'valid' | 'suspect' | 'incomplete' = 'valid';
    if (!this.patientId || !this.gameId || summary.score < 0) {
      dataQuality = 'suspect';
    } else if (responseTimes.some((t) => t < 90)) {
      // Humanly impossible reaction time (<90ms suggests erratic machine spam)
      dataQuality = 'suspect';
    } else if (totalAttempts < 1 && responseTimes.length < 2 && !this.isPractice) {
      dataQuality = 'incomplete';
    }

    // Execute ML Random Tree classification
    let mlEvaluation: CognitiveEvaluation | undefined;
    if (dataQuality === 'valid') {
      mlEvaluation = classifyTelemetry(normalizedTelemetry);
    }

    const sessionData: StandardSessionData = {
      session_id: this.sessionId,
      patient_id: this.patientId,
      game_id: this.gameId,
      cognitive_domain: this.cognitiveDomain,
      difficulty_level: this.difficultyLevel,
      score: summary.score,
      max_score: summary.maxScore,
      accuracy: Number(accuracy.toFixed(3)),
      correct_answers: summary.correctAnswers,
      incorrect_answers: summary.incorrectAnswers,
      attempts: totalAttempts,
      hints_used: summary.hintsUsed,
      reaction_time_avg: rtAvg,
      reaction_time_min: rtMin,
      reaction_time_max: rtMax,
      completion_time: completionTimeSec,
      pauses: this.pauses,
      restarts: this.restarts,
      completed: true,
      is_practice: this.isPractice,
      timestamp: endTime,
      dataQuality,
      domainMetrics: summary.domainMetrics,
      normalizedTelemetry,
      mlEvaluation,
      biomarkers: {
        hesitationMs: Math.round(hesitationMs),
        reactionTimeVariability,
        movementHesitation: Number(movementHesitation.toFixed(3)),
        reactionTimes: responseTimes.slice(0, 50),
        postErrorRecoveryMs: Math.round(postErrorRecoveryMs),
      },
    };

    // Save into offline local storage & sync queue
    saveSessionLocally(sessionData);

    return sessionData;
  }
}

/**
 * Storage helpers for Offline-first architecture
 */
export function getStoredSessions(): StandardSessionData[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(SESSIONS_STORAGE_KEY);
    if (!raw) {
      const initial = generateInitialBaselineSessions();
      localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(initial));
      return initial;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      const initial = generateInitialBaselineSessions();
      localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(initial));
      return initial;
    }
    // Deduplicate by session_id
    const seen = new Set<string>();
    const deduplicated = parsed.filter(s => {
      if (seen.has(s.session_id)) return false;
      seen.add(s.session_id);
      return true;
    });
    return deduplicated;
  } catch (err) {
    console.error('Failed to read stored sessions:', err);
    return [];
  }
}

export function saveSessionLocally(session: StandardSessionData) {
  if (typeof window === 'undefined') return;
  try {
    const sessions = getStoredSessions();
    sessions.unshift(session);
    // Keep last 100 sessions locally
    const trimmed = sessions.slice(0, 100);
    localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(trimmed));

    // Also queue for remote synchronization
    const queueRaw = localStorage.getItem(SYNC_QUEUE_KEY);
    const queue: StandardSessionData[] = queueRaw ? JSON.parse(queueRaw) : [];
    queue.push(session);
    localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));

    // Ensure session is also queued in central MedhaDB syncQueue for Supabase upload
    try {
      localRepository.enqueueSyncItem({
        entityType: 'game_sessions',
        entityId: session.session_id,
        operation: 'INSERT',
        payload: {
          sessionId: session.session_id,
          patientId: session.patient_id,
          gameId: session.game_id,
          score: session.score,
          incorrectAnswers: session.incorrect_answers,
          accuracy: session.accuracy,
        }
      });
      syncManager.triggerSync();
    } catch (syncErr) {
      console.warn('Silent localRepository enqueue sync error:', syncErr);
    }

    // Reactive event dispatch for real-time graphs and progress listeners
    window.dispatchEvent(new CustomEvent('medha-sessions-updated', { detail: session }));
    window.dispatchEvent(new Event('progress-updated'));
  } catch (err) {
    console.error('Failed to save session locally:', err);
  }
}

/**
 * Resets local game sessions back to the calibrated baseline
 */
export function resetStoredSessions(): StandardSessionData[] {
  if (typeof window === 'undefined') return [];
  try {
    const initial = generateInitialBaselineSessions();
    localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(initial));
    window.dispatchEvent(new CustomEvent('medha-sessions-updated', { detail: null }));
    window.dispatchEvent(new Event('progress-updated'));
    return initial;
  } catch (err) {
    console.error('Failed to reset stored sessions:', err);
    return [];
  }
}

/**
 * Creates and records a realistic clinical session for testing real-time progress & trends
 */
export function simulateQuickSession(options?: {
  domain?: StandardCognitiveDomain;
  gameId?: string;
  difficulty?: number;
  rtAvg?: number;
  accuracy?: number;
}): StandardSessionData {
  const domain = options?.domain ?? 'attention';
  const gameId = options?.gameId ?? 'ufov_attention_3d';
  const difficulty = options?.difficulty ?? 3;
  const rtAvg = options?.rtAvg ?? Math.round(580 + Math.random() * 120);
  const accuracy = options?.accuracy ?? Number((0.85 + Math.random() * 0.12).toFixed(2));
  const hesitationMs = Math.round(350 + Math.random() * 150);
  const cv = Number((0.14 + Math.random() * 0.08).toFixed(2));

  const totalTrials = 15;
  const correct = Math.round(totalTrials * accuracy);
  const incorrect = totalTrials - correct;

  const normalizedTelemetry: CognitiveTelemetry = {
    avgReactionTimeMs: rtAvg,
    accuracy,
    lapseRate: Number((0.02 + Math.random() * 0.04).toFixed(2)),
    fatigueDrift: Number((0.03 + Math.random() * 0.05).toFixed(2)),
    errorClustering: 0.05,
    baselineDeviation: Number(((rtAvg - 850) / 850).toFixed(2)),
    hesitationMs,
    reactionTimeVariability: cv,
    movementHesitation: Number((0.12 + Math.random() * 0.06).toFixed(2)),
    postErrorRecoveryMs: Math.round(480 + Math.random() * 120),
  };

  const mlEvaluation = classifyTelemetry(normalizedTelemetry);

  const session: StandardSessionData = {
    session_id: `sess_live_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    patient_id: 'patient_ravi_01',
    game_id: gameId,
    cognitive_domain: domain,
    difficulty_level: difficulty,
    score: correct * 10,
    max_score: totalTrials * 10,
    accuracy,
    correct_answers: correct,
    incorrect_answers: incorrect,
    attempts: totalTrials,
    hints_used: 1,
    reaction_time_avg: rtAvg,
    reaction_time_min: Math.round(rtAvg * 0.8),
    reaction_time_max: Math.round(rtAvg * 1.3),
    completion_time: Math.round(40 + Math.random() * 20),
    pauses: 0,
    restarts: 0,
    completed: true,
    is_practice: false,
    timestamp: Date.now(),
    dataQuality: 'valid',
    normalizedTelemetry,
    mlEvaluation,
    biomarkers: {
      hesitationMs,
      reactionTimeVariability: cv,
      movementHesitation: Number((0.12 + Math.random() * 0.06).toFixed(2)),
      postErrorRecoveryMs: Math.round(480 + Math.random() * 120),
      reactionTimes: [rtAvg - 30, rtAvg + 15, rtAvg - 10, rtAvg + 25, rtAvg],
    },
  };

  saveSessionLocally(session);
  return session;
}

/**
 * Calculates rolling personal baseline across completed sessions
 */
export function getPatientBaseline(patientId?: string, gameId?: string): {
  avgReactionTimeMs: number;
  avgAccuracy: number;
  totalSessions: number;
} {
  const allStored = getStoredSessions().filter(
    (s) => s.dataQuality === 'valid' && !s.is_practice && (!gameId || s.game_id === gameId)
  );
  const patientMatches = patientId ? allStored.filter((s) => s.patient_id === patientId) : allStored;
  const sessions = patientMatches.length > 0 ? patientMatches : allStored;

  if (sessions.length === 0) {
    return { avgReactionTimeMs: 640, avgAccuracy: 0.88, totalSessions: 0 };
  }

  const avgReactionTimeMs = Math.round(
    sessions.reduce((acc, s) => acc + s.reaction_time_avg, 0) / sessions.length
  );
  const avgAccuracy = Number(
    (sessions.reduce((acc, s) => acc + s.accuracy, 0) / sessions.length).toFixed(3)
  );

  return {
    avgReactionTimeMs,
    avgAccuracy,
    totalSessions: sessions.length,
  };
}

/**
 * Calculates difficulty recommendation for next session
 */
export function recommendNextDifficulty(
  patientId: string,
  gameId: string,
  currentDifficulty: number
): { recommendedDifficulty: number; rationale: string } {
  const sessions = getStoredSessions().filter(
    (s) => s.patient_id === patientId && s.game_id === gameId && s.dataQuality === 'valid' && !s.is_practice
  );

  if (sessions.length === 0) {
    return {
      recommendedDifficulty: currentDifficulty,
      rationale: 'Starting at calibrated introductory baseline.',
    };
  }

  const latest = sessions[0];
  if (latest.accuracy >= 0.85 && latest.hints_used <= 1) {
    const next = Math.min(5, currentDifficulty + 1);
    return {
      recommendedDifficulty: next,
      rationale: next > currentDifficulty ? 'High accuracy and fluency achieved; gently progressing.' : 'Max level reached, maintain mastery.',
    };
  } else if (latest.accuracy < 0.60 || latest.hints_used >= 3) {
    const prev = Math.max(1, currentDifficulty - 1);
    return {
      recommendedDifficulty: prev,
      rationale: 'Easing complexity and pace to ensure comfortable engagement.',
    };
  }

  return {
    recommendedDifficulty: currentDifficulty,
    rationale: 'Steady performance; maintaining current comfortable level.',
  };
}

/**
 * Convenient helper to record a completed game session directly into MEDHA local storage and ML classifier
 */
export function recordGameSession(params: {
  patientId: string;
  gameId: string;
  cognitiveDomain: StandardCognitiveDomain;
  difficultyLevel: number;
  score: number;
  maxScore: number;
  correctAnswers: number;
  incorrectAnswers: number;
  hintsUsed: number;
  reactionTimes?: number[];
  completionTimeSeconds?: number;
  hesitationMs?: number;
  reactionTimeVariability?: number;
  movementHesitation?: number;
  postErrorRecoveryMs?: number;
  pauses?: number;
  restarts?: number;
  isPractice?: boolean;
  domainMetrics?: Record<string, number | string>;
}): StandardSessionData {
  const tracker = new GameSessionTracker(
    params.patientId,
    params.gameId,
    params.cognitiveDomain,
    params.difficultyLevel,
    params.isPractice || false
  );

  return tracker.completeSession({
    score: params.score,
    maxScore: params.maxScore,
    correctAnswers: params.correctAnswers,
    incorrectAnswers: params.incorrectAnswers,
    hintsUsed: params.hintsUsed,
    domainMetrics: params.domainMetrics,
    reactionTimes: params.reactionTimes,
    hesitationMs: params.hesitationMs,
    reactionTimeVariability: params.reactionTimeVariability,
    movementHesitation: params.movementHesitation,
    postErrorRecoveryMs: params.postErrorRecoveryMs,
  });
}

