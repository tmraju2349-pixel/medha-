/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * MEDHA Cognitive Health System - Types & Definitions
 */

export type CognitiveState = 
  | 'OPTIMAL_ENGAGED'
  | 'COGNITIVE_FATIGUE'
  | 'ATTENTIONAL_LAPSE'
  | 'CONFUSION_OVERLOAD'
  | 'POTENTIAL_DECLINE';

export interface CognitiveTelemetry {
  /** Average reaction latency across trials in milliseconds (e.g. 400 - 1800ms) */
  avgReactionTimeMs: number;
  /** Overall accuracy score [0.0 - 1.0] */
  accuracy: number;
  /** Percentage of trials where response time exceeded 2.5x baseline (0.0 - 1.0) */
  lapseRate: number;
  /** Reaction time slope: (late trials RT / early trials RT) - 1.0 (> 0 means slowing down) */
  fatigueDrift: number;
  /** Frequency of consecutive mistake clusters (0.0 - 1.0) */
  errorClustering: number;
  /** Percentage deviation from patient's 14-day established baseline (-0.5 to +0.5) */
  baselineDeviation: number;
  /** Average decision latency / hesitation before committing to an action or first move in ms (e.g. 300 - 2500ms) */
  hesitationMs?: number;
  /** Intra-individual reaction time variability (CV = stdDev / mean) [0.05 - 1.2] */
  reactionTimeVariability?: number;
  /** Motor & cursor hesitation index (hovering, direction reversals before click) [0.0 - 1.0] */
  movementHesitation?: number;
  /** Average recovery latency following an incorrect move or mistake in ms */
  postErrorRecoveryMs?: number;
}

export interface CognitiveEvaluation {
  predictedState: CognitiveState;
  confidence: number;
  classProbabilities: Record<CognitiveState, number>;
  activePathNodeIds: string[];
  primaryFeatureDrivers: { feature: keyof CognitiveTelemetry; contribution: string }[];
  recommendation: {
    action: 'MAINTAIN' | 'SIMPLIFY_PACE' | 'GENTLE_BREAK' | 'INCREASE_SUPPORT' | 'NOTIFY_CAREGIVER';
    description: string;
    gameAdjustment: string;
    caregiverNote: string;
  };
}

export interface DecisionTreeNode {
  id: string;
  isLeaf: boolean;
  feature?: keyof CognitiveTelemetry;
  threshold?: number;
  left?: DecisionTreeNode;
  right?: DecisionTreeNode;
  prediction?: CognitiveState;
  classDistribution?: Record<CognitiveState, number>;
  samplesCount: number;
  impurity: number;
  depth: number;
}

export interface TrainingSample {
  features: CognitiveTelemetry;
  label: CognitiveState;
}

export interface TreeConfig {
  maxDepth?: number;
  minSamplesSplit?: number;
  minSamplesLeaf?: number;
  maxFeatures?: number | 'sqrt' | 'all';
  seed?: number;
}
