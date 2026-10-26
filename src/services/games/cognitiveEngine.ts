import { GameSession, MLInterventionRecord, CognitiveTelemetryTrial } from '../../types/medha';
import { gameSessionService } from './gameSessionService';

export interface MLInterferenceResult {
  shouldIntervene: boolean;
  action: 'speed_reduction' | 'target_assist' | 'level_demote' | 'level_promote' | 'contrast_boost' | 'none';
  speedMultiplier: number;
  hitboxScaleMultiplier: number;
  visualAssistActive: boolean;
  recommendedLevel: number;
  reason: string;
  fatigueSlope: number;
  currentEmaRtMs: number;
  motorStability: number;
}

export class MLCognitiveEngine {
  private baselineRtMs: number = 650; // Healthy senior baseline
  private trials: CognitiveTelemetryTrial[] = [];
  private emaRtMs: number = 650;
  private currentLevel: number = 1;
  private interventions: MLInterventionRecord[] = [];
  private consecutiveErrors: number = 0;
  private consecutiveCorrect: number = 0;

  constructor(initialLevel = 1, baselineRt = 650) {
    this.currentLevel = initialLevel;
    this.baselineRtMs = baselineRt;
    this.emaRtMs = baselineRt;
    this.reset();
  }

  public reset(level = 1) {
    this.trials = [];
    this.interventions = [];
    this.consecutiveErrors = 0;
    this.consecutiveCorrect = 0;
    this.currentLevel = level;
    this.emaRtMs = this.baselineRtMs;
  }

  /**
   * Records a user interaction and computes cognitive metrics
   */
  public recordTrial(
    reactionTimeMs: number,
    isCorrect: boolean,
    hesitationMs: number = 0,
    targetId: string = 'target'
  ): MLInterferenceResult {
    const trialIndex = this.trials.length + 1;
    const trial: CognitiveTelemetryTrial = {
      trialIndex,
      reactionTimeMs: Math.max(50, Math.min(6000, reactionTimeMs)),
      hesitationMs: Math.max(0, hesitationMs),
      isCorrect,
      targetId,
      difficultyLevel: this.currentLevel,
    };
    this.trials.push(trial);

    // Update Exponential Moving Average (alpha = 0.35)
    const alpha = 0.35;
    this.emaRtMs = Math.round(alpha * trial.reactionTimeMs + (1 - alpha) * this.emaRtMs);

    if (isCorrect) {
      this.consecutiveCorrect++;
      this.consecutiveErrors = 0;
    } else {
      this.consecutiveErrors++;
      this.consecutiveCorrect = 0;
    }

    // Evaluate ML Dynamic Interference
    return this.evaluateInterference();
  }

  /**
   * ML dynamic inference logic to interfere with game pacing, scale, or difficulty level
   */
  private evaluateInterference(): MLInterferenceResult {
    const fatigueSlope = this.calculateFatigueSlope();
    const motorStability = this.calculateMotorStability();
    let action: MLInterferenceResult['action'] = 'none';
    let shouldIntervene = false;
    let speedMultiplier = 1.0;
    let hitboxScaleMultiplier = 1.0;
    let visualAssistActive = false;
    let reason = 'Cognitive state balanced within target parameters.';
    let recommendedLevel = this.currentLevel;

    // RULE 1: Repeated errors or severe reaction delay -> Immediate Assist & Downscale
    if (this.consecutiveErrors >= 2 || (this.emaRtMs > 1300 && this.trials.length >= 3)) {
      shouldIntervene = true;
      visualAssistActive = true;
      hitboxScaleMultiplier = 1.35; // Expand target hit area
      speedMultiplier = 0.65; // Slow down 3D orbit

      if (this.currentLevel > 1 && this.consecutiveErrors >= 3) {
        action = 'level_demote';
        recommendedLevel = Math.max(1, this.currentLevel - 1);
        reason = `High cognitive hesitation detected (RT: ${this.emaRtMs}ms). Downscaled to Level ${recommendedLevel} with glowing cues.`;
      } else {
        action = 'target_assist';
        reason = `Visual assist engaged. Orbital speed slowed by 35% and target beacon contrast amplified.`;
      }
    }
    // RULE 2: High Fatigue Curve Slope -> Pacing Relief
    else if (fatigueSlope > 18 && this.trials.length >= 6) {
      shouldIntervene = true;
      action = 'speed_reduction';
      speedMultiplier = 0.75;
      hitboxScaleMultiplier = 1.2;
      reason = `Cognitive fatigue curve rising (+${Math.round(fatigueSlope)}ms/trial). Moderating rotation speed to preserve focus.`;
    }
    // RULE 3: Neuroplastic Mastery & Rapid Response -> Elevate Challenge
    else if (this.consecutiveCorrect >= 4 && this.emaRtMs < 680 && this.currentLevel < 5) {
      shouldIntervene = true;
      action = 'level_promote';
      recommendedLevel = Math.min(5, this.currentLevel + 1);
      speedMultiplier = 1.2;
      hitboxScaleMultiplier = 0.92;
      reason = `Fast reaction speed sustained (${this.emaRtMs}ms, 100% accuracy). Promoting to Level ${recommendedLevel}!`;
    }
    // RULE 4: Steady state
    else {
      speedMultiplier = 1.0;
      hitboxScaleMultiplier = 1.0;
      visualAssistActive = false;
    }

    if (shouldIntervene && action !== 'none') {
      const interventionRecord: MLInterventionRecord = {
        timestamp: Date.now(),
        type: action,
        reason,
        previousLevel: this.currentLevel,
        newLevel: recommendedLevel,
      };
      this.interventions.push(interventionRecord);
      this.currentLevel = recommendedLevel;
    }

    return {
      shouldIntervene,
      action,
      speedMultiplier,
      hitboxScaleMultiplier,
      visualAssistActive,
      recommendedLevel: this.currentLevel,
      reason,
      fatigueSlope,
      currentEmaRtMs: this.emaRtMs,
      motorStability,
    };
  }

  /**
   * Calculates reaction time slope over trials (indicates mental exhaustion or boredom)
   */
  private calculateFatigueSlope(): number {
    if (this.trials.length < 4) return 0;
    const recent = this.trials.slice(-8);
    const n = recent.length;
    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumXX = 0;

    recent.forEach((t, i) => {
      sumX += i;
      sumY += t.reactionTimeMs;
      sumXY += i * t.reactionTimeMs;
      sumXX += i * i;
    });

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX || 1);
    return Math.round(slope);
  }

  /**
   * Measures stability of response timing (0 - 100)
   */
  private calculateMotorStability(): number {
    if (this.trials.length < 2) return 90;
    const rts = this.trials.map((t) => t.reactionTimeMs);
    const mean = rts.reduce((a, b) => a + b, 0) / rts.length;
    const variance = rts.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / rts.length;
    const stdDev = Math.sqrt(variance);
    // Lower standard deviation = higher motor stability score
    return Math.round(Math.max(20, Math.min(100, 100 - stdDev / 8)));
  }

  /**
   * Finalizes the session and saves to storage & queues Supabase sync
   */
  public finalizeSession(
    patientId: string,
    gameId: string,
    domains: string[],
    hintsUsed = 0,
    startTime: number = Date.now() - 60000
  ): GameSession {
    const totalTrials = this.trials.length;
    const correctCount = this.trials.filter((t) => t.isCorrect).length;
    const accuracy = totalTrials > 0 ? correctCount / totalTrials : 1;
    const rts = this.trials.map((t) => t.reactionTimeMs);
    const avgRtMs = rts.length > 0 ? Math.round(rts.reduce((a, b) => a + b, 0) / rts.length) : 550;
    const peakRtMs = rts.length > 0 ? Math.min(...rts) : avgRtMs;
    const hesitationAvg =
      this.trials.length > 0
        ? Math.round(this.trials.reduce((a, b) => a + b.hesitationMs, 0) / this.trials.length)
        : 0;

    // Score calculation factoring accuracy, speed bonus, and level difficulty
    const speedFactor = Math.max(0.4, Math.min(1.4, (900 - avgRtMs) / 400 + 0.5));
    const rawScore = Math.round(accuracy * 80 + this.currentLevel * 4 + speedFactor * 10);
    const finalScore = Math.max(30, Math.min(100, rawScore));

    const sessionData = {
      patientId,
      gameId,
      cognitiveDomains: domains,
      difficulty: this.currentLevel,
      score: finalScore,
      accuracy: Math.round(accuracy * 100) / 100,
      correctAnswers: correctCount,
      incorrectAnswers: totalTrials - correctCount,
      attempts: totalTrials,
      hintsUsed,
      averageReactionTime: Math.round(avgRtMs) / 1000, // in seconds for compatibility
      peakReactionTimeMs: peakRtMs,
      reactionTimesMs: rts,
      hesitationMs: hesitationAvg,
      fatigueIndex: Math.round(this.calculateFatigueSlope()),
      mlInterventions: [...this.interventions],
      motorStabilityScore: this.calculateMotorStability(),
      completionTime: Math.round((Date.now() - startTime) / 1000),
      startedAt: startTime,
    };

    return gameSessionService.completeSession(sessionData);
  }
}
