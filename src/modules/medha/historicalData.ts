/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Multi-Session Historical Telemetry Data & Live Data Service for MEDHA
 * Translates stored clinical game sessions into longitudinal trend records.
 */

import type { CognitiveState } from './types';
import type { StandardSessionData, StandardCognitiveDomain } from './games/types';
import { classifyTelemetry } from './ml';

export interface SessionTelemetryRecord {
  id: string;
  sessionNumber: number;
  date: string;
  timestamp: number;
  gameId: string;
  gameName: string;
  gameType: string;
  cognitiveDomain: StandardCognitiveDomain;
  difficultyLevel: number;
  avgReactionTimeMs: number;
  accuracy: number; // 0.0 - 1.0
  baselineReactionTimeMs: number;
  fatigueDrift: number;
  lapseRate: number;
  hesitationMs: number;
  reactionTimeVariability: number;
  movementHesitation: number;
  postErrorRecoveryMs: number;
  cognitiveState: CognitiveState;
  notes?: string;
  rawSession?: StandardSessionData;
}

/**
 * Maps raw game IDs to human-friendly display titles
 */
export function getFriendlyGameTitle(gameId: string): string {
  const cleanId = gameId.replace(/^bg_/, '');
  const titleMap: Record<string, string> = {
    ufov_attention_3d: 'Celestial Horizon 3D',
    nback_spatial_3d: 'Spatial Cubes 3D',
    focus_spotlight: 'Focus Spotlight',
    memory_pairs: 'Memory Pairs',
    'reaction-time': 'Reaction Time',
    'trail-making': 'Trail Making',
    'ball-sort': 'Ball Sort Puzzle',
    'logic-puzzles': 'Logic Grid Puzzles',
    'pattern-matrix': 'Pattern Matrix',
    'number-sequence': 'Number Sequence',
    'simon-says': 'Simon Pattern',
    'schulte-table': 'Schulte Grid',
    maze: 'Labyrinth Maze',
    'mental-rotation': 'Mental Rotation 3D',
    'quick-math': 'Speed Arithmetic',
    'visual-search': 'Visual Search',
    'dual-task': 'Dual Task Interference',
    'word-scramble': 'Word Scramble',
    stroop: 'Stroop Color Conflict',
    'n-back': 'Auditory N-Back',
    'water-jugs': 'Water Jugs Optimization',
    'anagram-solver': 'Anagram Solver',
    'tower-of-hanoi': 'Tower of Hanoi',
    'working-memory-grid': 'Working Memory Matrix',
    'card-matching': 'Card Matching',
    'rush-hour': 'Rush Hour Traffic',
    sudoku: 'Sudoku Mind',
  };
  return (
    titleMap[cleanId] ||
    titleMap[gameId] ||
    cleanId.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

/**
 * Formats a UNIX timestamp into a clean, human-readable date label
 */
export function formatSessionDate(timestamp: number): string {
  const d = new Date(timestamp);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) {
    return `Today ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }
  const isYesterday = new Date(now.getTime() - 86400000).toDateString() === d.toDateString();
  if (isYesterday) {
    return `Yesterday ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

/**
 * Initial longitudinal calibration dataset for Patient Ravi S. (74 yo, MCI follow-up)
 * Spans 14 clinical calibration sessions progressing from baseline fatigue to optimal engagement.
 */
export function generateInitialBaselineSessions(): StandardSessionData[] {
  const now = Date.now();
  const DAY_MS = 86400000;

  const rawProfiles = [
    {
      dayOffset: 14,
      gameId: 'ufov_attention_3d',
      domain: 'attention' as StandardCognitiveDomain,
      level: 1,
      rt: 980,
      accuracy: 0.68,
      hesitation: 880,
      cv: 0.42,
      movement: 0.38,
      recovery: 1250,
      fatigue: 0.38,
      lapse: 0.18,
      notes: 'Initial baseline calibration session. Patient experienced mild visual scanning fatigue.',
    },
    {
      dayOffset: 13,
      gameId: 'nback_spatial_3d',
      domain: 'memory' as StandardCognitiveDomain,
      level: 1,
      rt: 920,
      accuracy: 0.72,
      hesitation: 810,
      cv: 0.38,
      movement: 0.34,
      recovery: 1100,
      fatigue: 0.28,
      lapse: 0.14,
      notes: 'Morning session. Familiarization with 3D spatial positioning.',
    },
    {
      dayOffset: 12,
      gameId: 'focus_spotlight',
      domain: 'executive_function' as StandardCognitiveDomain,
      level: 2,
      rt: 890,
      accuracy: 0.75,
      hesitation: 760,
      cv: 0.35,
      movement: 0.31,
      recovery: 980,
      fatigue: 0.22,
      lapse: 0.12,
      notes: 'Minor room distractions observed during middle trials; recovered quickly.',
    },
    {
      dayOffset: 10,
      gameId: 'ufov_attention_3d',
      domain: 'attention' as StandardCognitiveDomain,
      level: 2,
      rt: 840,
      accuracy: 0.78,
      hesitation: 690,
      cv: 0.31,
      movement: 0.28,
      recovery: 890,
      fatigue: 0.18,
      lapse: 0.09,
      notes: 'Patient showed strong visual scanning improvement in 8-slot peripheral field.',
    },
    {
      dayOffset: 9,
      gameId: 'memory_pairs',
      domain: 'memory' as StandardCognitiveDomain,
      level: 2,
      rt: 810,
      accuracy: 0.81,
      hesitation: 630,
      cv: 0.28,
      movement: 0.25,
      recovery: 820,
      fatigue: 0.14,
      lapse: 0.08,
      notes: 'Consistent working memory retrieval across card pairs.',
    },
    {
      dayOffset: 8,
      gameId: 'bg_reaction-time',
      domain: 'processing_speed' as StandardCognitiveDomain,
      level: 2,
      rt: 860,
      accuracy: 0.76,
      hesitation: 680,
      cv: 0.32,
      movement: 0.29,
      recovery: 920,
      fatigue: 0.26,
      lapse: 0.11,
      notes: 'Afternoon session, mild attention drift towards late trials.',
    },
    {
      dayOffset: 7,
      gameId: 'ufov_attention_3d',
      domain: 'attention' as StandardCognitiveDomain,
      level: 3,
      rt: 760,
      accuracy: 0.84,
      hesitation: 570,
      cv: 0.25,
      movement: 0.22,
      recovery: 740,
      fatigue: 0.11,
      lapse: 0.06,
      notes: 'Central target identification latency improved noticeably.',
    },
    {
      dayOffset: 6,
      gameId: 'nback_spatial_3d',
      domain: 'memory' as StandardCognitiveDomain,
      level: 3,
      rt: 720,
      accuracy: 0.86,
      hesitation: 530,
      cv: 0.22,
      movement: 0.2,
      recovery: 680,
      fatigue: 0.09,
      lapse: 0.05,
      notes: 'High spatial and auditory-visual synchronization achieved.',
    },
    {
      dayOffset: 5,
      gameId: 'bg_trail-making',
      domain: 'visuospatial' as StandardCognitiveDomain,
      level: 3,
      rt: 740,
      accuracy: 0.85,
      hesitation: 550,
      cv: 0.23,
      movement: 0.21,
      recovery: 710,
      fatigue: 0.12,
      lapse: 0.06,
      notes: 'Sequencing trajectory smooth with minimal pencil wander.',
    },
    {
      dayOffset: 4,
      gameId: 'focus_spotlight',
      domain: 'executive_function' as StandardCognitiveDomain,
      level: 3,
      rt: 690,
      accuracy: 0.88,
      hesitation: 490,
      cv: 0.2,
      movement: 0.18,
      recovery: 620,
      fatigue: 0.07,
      lapse: 0.04,
      notes: 'Significant milestone: average reaction speed dropped below 700ms.',
    },
    {
      dayOffset: 3,
      gameId: 'memory_pairs',
      domain: 'memory' as StandardCognitiveDomain,
      level: 3,
      rt: 710,
      accuracy: 0.87,
      hesitation: 510,
      cv: 0.21,
      movement: 0.19,
      recovery: 650,
      fatigue: 0.08,
      lapse: 0.05,
      notes: 'Steady working memory consolidation across complex pattern pairs.',
    },
    {
      dayOffset: 2,
      gameId: 'ufov_attention_3d',
      domain: 'attention' as StandardCognitiveDomain,
      level: 4,
      rt: 650,
      accuracy: 0.9,
      hesitation: 440,
      cv: 0.18,
      movement: 0.15,
      recovery: 540,
      fatigue: 0.06,
      lapse: 0.03,
      notes: 'Hand-eye coordination and peripheral target detection highly fluent.',
    },
    {
      dayOffset: 1,
      gameId: 'bg_stroop',
      domain: 'executive_function' as StandardCognitiveDomain,
      level: 4,
      rt: 630,
      accuracy: 0.91,
      hesitation: 420,
      cv: 0.17,
      movement: 0.14,
      recovery: 510,
      fatigue: 0.05,
      lapse: 0.03,
      notes: 'Rapid cognitive flexibility with minimal hesitation delay.',
    },
    {
      dayOffset: 0,
      gameId: 'ufov_attention_3d',
      domain: 'attention' as StandardCognitiveDomain,
      level: 4,
      rt: 610,
      accuracy: 0.93,
      hesitation: 390,
      cv: 0.15,
      movement: 0.12,
      recovery: 480,
      fatigue: 0.04,
      lapse: 0.02,
      notes: 'Optimal cognitive fitness benchmark achieved. Personal best reaction speed.',
    },
  ];

  return rawProfiles.map((p, idx) => {
    const timestamp = now - p.dayOffset * DAY_MS - Math.round(Math.random() * 3600000);
    const totalTrials = 20;
    const correctCount = Math.round(totalTrials * p.accuracy);
    const incorrectCount = totalTrials - correctCount;

    const normalizedTelemetry = {
      avgReactionTimeMs: p.rt,
      accuracy: p.accuracy,
      lapseRate: p.lapse,
      fatigueDrift: p.fatigue,
      errorClustering: p.lapse * 1.5,
      baselineDeviation: (p.rt - 850) / 850,
      hesitationMs: p.hesitation,
      reactionTimeVariability: p.cv,
      movementHesitation: p.movement,
      postErrorRecoveryMs: p.recovery,
    };

    const mlEvaluation = classifyTelemetry(normalizedTelemetry);

    return {
      session_id: `sess_baseline_${idx + 1}`,
      patient_id: 'patient_ravi_01',
      game_id: p.gameId,
      cognitive_domain: p.domain,
      difficulty_level: p.level,
      score: correctCount * 10,
      max_score: totalTrials * 10,
      accuracy: p.accuracy,
      correct_answers: correctCount,
      incorrect_answers: incorrectCount,
      attempts: totalTrials,
      hints_used: p.level > 2 ? 1 : 2,
      reaction_time_avg: p.rt,
      reaction_time_min: Math.round(p.rt * 0.75),
      reaction_time_max: Math.round(p.rt * 1.45),
      completion_time: Math.round(45 + Math.random() * 25),
      pauses: p.fatigue > 0.25 ? 1 : 0,
      restarts: 0,
      completed: true,
      is_practice: false,
      timestamp,
      dataQuality: 'valid' as const,
      domainMetrics: {
        visualTargetIdentified: correctCount,
        fieldSpanDegrees: p.level * 6,
      },
      normalizedTelemetry,
      mlEvaluation: {
        ...mlEvaluation,
        recommendation: {
          ...mlEvaluation.recommendation,
          caregiverNote: p.notes,
        },
      },
      biomarkers: {
        hesitationMs: p.hesitation,
        reactionTimeVariability: p.cv,
        movementHesitation: p.movement,
        postErrorRecoveryMs: p.recovery,
        reactionTimes: [
          Math.round(p.rt * 0.9),
          Math.round(p.rt * 0.95),
          Math.round(p.rt * 1.05),
          Math.round(p.rt * 1.0),
          Math.round(p.rt * 0.85),
          Math.round(p.rt * 1.1),
        ],
      },
    };
  });
}

/**
 * Transforms an array of standard session data into format suitable for charts
 */
export function convertSessionsToTelemetryRecords(
  sessions: StandardSessionData[]
): SessionTelemetryRecord[] {
  // Sort chronologically (oldest to newest)
  const sorted = [...sessions].sort((a, b) => a.timestamp - b.timestamp);

  let runningRtSum = 0;

  return sorted.map((s, index) => {
    runningRtSum += s.reaction_time_avg;
    const baselineReactionTimeMs = Math.round(runningRtSum / (index + 1));
    const gameName = getFriendlyGameTitle(s.game_id);

    const domainLabel =
      s.cognitive_domain === 'attention'
        ? 'Attention (UFOV)'
        : s.cognitive_domain === 'memory'
        ? 'Memory (N-Back)'
        : s.cognitive_domain === 'executive_function'
        ? 'Executive Function'
        : s.cognitive_domain === 'processing_speed'
        ? 'Processing Speed'
        : 'Visuospatial';

    return {
      id: s.session_id,
      sessionNumber: index + 1,
      date: formatSessionDate(s.timestamp),
      timestamp: s.timestamp,
      gameId: s.game_id,
      gameName,
      gameType: domainLabel,
      cognitiveDomain: s.cognitive_domain,
      difficultyLevel: s.difficulty_level,
      avgReactionTimeMs: s.reaction_time_avg,
      accuracy: s.accuracy,
      baselineReactionTimeMs,
      fatigueDrift: s.normalizedTelemetry?.fatigueDrift ?? 0.1,
      lapseRate: s.normalizedTelemetry?.lapseRate ?? 0.05,
      hesitationMs: s.biomarkers?.hesitationMs ?? s.normalizedTelemetry?.hesitationMs ?? 480,
      reactionTimeVariability:
        s.biomarkers?.reactionTimeVariability ?? s.normalizedTelemetry?.reactionTimeVariability ?? 0.22,
      movementHesitation:
        s.biomarkers?.movementHesitation ?? s.normalizedTelemetry?.movementHesitation ?? 0.18,
      postErrorRecoveryMs:
        s.biomarkers?.postErrorRecoveryMs ?? s.normalizedTelemetry?.postErrorRecoveryMs ?? 550,
      cognitiveState: s.mlEvaluation?.predictedState ?? 'OPTIMAL_ENGAGED',
      notes: s.mlEvaluation?.recommendation?.caregiverNote,
      rawSession: s,
    };
  });
}

/**
 * Default fallback historical sessions for initial render
 */
export const HISTORICAL_SESSIONS: SessionTelemetryRecord[] =
  convertSessionsToTelemetryRecords(generateInitialBaselineSessions());
