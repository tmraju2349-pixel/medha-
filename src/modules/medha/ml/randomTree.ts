/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * MEDHA Cognitive Health Machine Learning Engine
 * Implements an interpretable Random Decision Tree & Forest for Cognitive Telemetry Classification
 */

import type {
  CognitiveState,
  CognitiveTelemetry,
  CognitiveEvaluation,
  DecisionTreeNode,
  TrainingSample,
  TreeConfig,
} from '../types';

const ALL_CLASSES: CognitiveState[] = [
  'OPTIMAL_ENGAGED',
  'COGNITIVE_FATIGUE',
  'ATTENTIONAL_LAPSE',
  'CONFUSION_OVERLOAD',
  'POTENTIAL_DECLINE',
];

const FEATURE_KEYS: (keyof CognitiveTelemetry)[] = [
  'avgReactionTimeMs',
  'accuracy',
  'lapseRate',
  'fatigueDrift',
  'errorClustering',
  'baselineDeviation',
  'hesitationMs',
  'reactionTimeVariability',
  'movementHesitation',
];

export function getFeatureValue(telemetry: CognitiveTelemetry, feat: keyof CognitiveTelemetry): number {
  const val = telemetry[feat];
  if (typeof val === 'number' && !isNaN(val)) return val;
  switch (feat) {
    case 'hesitationMs':
      return telemetry.avgReactionTimeMs ? Math.round(telemetry.avgReactionTimeMs * 1.15) : 680;
    case 'reactionTimeVariability':
      return 0.22;
    case 'movementHesitation':
      return 0.15;
    case 'postErrorRecoveryMs':
      return telemetry.avgReactionTimeMs ? Math.round(telemetry.avgReactionTimeMs * 1.3) : 820;
    default:
      return 0;
  }
}

/**
 * Seedable linear congruential generator for reproducible random feature selection
 */
function createRng(seed: number = 42) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/**
 * Calculates Gini Impurity for a set of samples
 * I(G) = 1 - sum(p_i^2)
 */
export function calculateGini(samples: TrainingSample[]): number {
  if (samples.length === 0) return 0;
  const counts: Record<string, number> = {};
  for (const s of samples) {
    counts[s.label] = (counts[s.label] || 0) + 1;
  }
  let sumSquares = 0;
  for (const label of Object.keys(counts)) {
    const p = counts[label] / samples.length;
    sumSquares += p * p;
  }
  return 1 - sumSquares;
}

/**
 * Random Decision Tree Model
 */
export class RandomTree {
  public root: DecisionTreeNode | null = null;
  public config: Required<TreeConfig>;
  private rng: () => number;
  private nodeIdCounter = 0;

  constructor(config?: TreeConfig) {
    this.config = {
      maxDepth: config?.maxDepth ?? 4,
      minSamplesSplit: config?.minSamplesSplit ?? 2,
      minSamplesLeaf: config?.minSamplesLeaf ?? 1,
      maxFeatures: config?.maxFeatures ?? 'sqrt',
      seed: config?.seed ?? 1337,
    };
    this.rng = createRng(this.config.seed);
  }

  /**
   * Train the Random Tree on labeled telemetry samples
   */
  public fit(samples: TrainingSample[]): void {
    this.nodeIdCounter = 0;
    this.root = this.buildTree(samples, 0);
  }

  private getDistribution(samples: TrainingSample[]): Record<CognitiveState, number> {
    const dist: Record<CognitiveState, number> = {
      OPTIMAL_ENGAGED: 0,
      COGNITIVE_FATIGUE: 0,
      ATTENTIONAL_LAPSE: 0,
      CONFUSION_OVERLOAD: 0,
      POTENTIAL_DECLINE: 0,
    };
    for (const s of samples) {
      dist[s.label] = (dist[s.label] || 0) + 1;
    }
    return dist;
  }

  private getMajorityClass(dist: Record<CognitiveState, number>): CognitiveState {
    let bestClass: CognitiveState = 'OPTIMAL_ENGAGED';
    let bestCount = -1;
    for (const cls of ALL_CLASSES) {
      if (dist[cls] > bestCount) {
        bestCount = dist[cls];
        bestClass = cls;
      }
    }
    return bestClass;
  }

  private selectRandomFeatures(): (keyof CognitiveTelemetry)[] {
    const all = [...FEATURE_KEYS];
    let numToPick = all.length;
    if (this.config.maxFeatures === 'sqrt') {
      numToPick = Math.max(1, Math.round(Math.sqrt(all.length)));
    } else if (typeof this.config.maxFeatures === 'number') {
      numToPick = Math.min(all.length, Math.max(1, this.config.maxFeatures));
    }

    // Fisher-Yates shuffle with seedable RNG
    for (let i = all.length - 1; i > 0; i--) {
      const j = Math.floor(this.rng() * (i + 1));
      [all[i], all[j]] = [all[j], all[i]];
    }
    return all.slice(0, numToPick);
  }

  private buildTree(samples: TrainingSample[], depth: number): DecisionTreeNode {
    const id = `node_${++this.nodeIdCounter}`;
    const impurity = calculateGini(samples);
    const dist = this.getDistribution(samples);
    const majority = this.getMajorityClass(dist);

    // Stop conditions for leaf node
    if (
      depth >= this.config.maxDepth ||
      samples.length < this.config.minSamplesSplit ||
      impurity === 0
    ) {
      return {
        id,
        isLeaf: true,
        prediction: majority,
        classDistribution: dist,
        samplesCount: samples.length,
        impurity,
        depth,
      };
    }

    const candidateFeatures = this.selectRandomFeatures();
    let bestGain = -1;
    let bestFeature: keyof CognitiveTelemetry | null = null;
    let bestThreshold: number | null = null;
    let bestLeft: TrainingSample[] = [];
    let bestRight: TrainingSample[] = [];

    for (const feature of candidateFeatures) {
      // Gather unique sorted values
      const values = Array.from(new Set(samples.map((s) => s.features[feature]))).sort((a, b) => a - b);
      if (values.length <= 1) continue;

      // Evaluate midpoint thresholds
      for (let i = 0; i < values.length - 1; i++) {
        const threshold = (values[i] + values[i + 1]) / 2;
        const left = samples.filter((s) => s.features[feature] <= threshold);
        const right = samples.filter((s) => s.features[feature] > threshold);

        if (left.length < this.config.minSamplesLeaf || right.length < this.config.minSamplesLeaf) {
          continue;
        }

        const leftImpurity = calculateGini(left);
        const rightImpurity = calculateGini(right);
        const weightedChildImpurity =
          (left.length / samples.length) * leftImpurity + (right.length / samples.length) * rightImpurity;
        const gain = impurity - weightedChildImpurity;

        if (gain > bestGain) {
          bestGain = gain;
          bestFeature = feature;
          bestThreshold = threshold;
          bestLeft = left;
          bestRight = right;
        }
      }
    }

    // If no valid split found that improves impurity
    if (bestGain <= 0 || !bestFeature || bestThreshold === null) {
      return {
        id,
        isLeaf: true,
        prediction: majority,
        classDistribution: dist,
        samplesCount: samples.length,
        impurity,
        depth,
      };
    }

    const leftNode = this.buildTree(bestLeft, depth + 1);
    const rightNode = this.buildTree(bestRight, depth + 1);

    return {
      id,
      isLeaf: false,
      feature: bestFeature,
      threshold: Number(bestThreshold.toFixed(4)),
      left: leftNode,
      right: rightNode,
      classDistribution: dist,
      samplesCount: samples.length,
      impurity,
      depth,
    };
  }

  /**
   * Evaluates input telemetry and returns diagnosis, active traversal path, and prescriptive guidance
   */
  public evaluate(telemetry: CognitiveTelemetry): CognitiveEvaluation {
    if (!this.root) {
      throw new Error('Random Tree must be fitted before evaluation.');
    }

    const path: string[] = [];
    const drivers: { feature: keyof CognitiveTelemetry; contribution: string }[] = [];
    let current: DecisionTreeNode = this.root;

    while (!current.isLeaf) {
      path.push(current.id);
      const feat = current.feature!;
      const val = getFeatureValue(telemetry, feat);
      const thresh = current.threshold!;

      if (val <= thresh) {
        drivers.push({
          feature: feat,
          contribution: `${feat} (${val}) ≤ ${thresh}`,
        });
        current = current.left!;
      } else {
        drivers.push({
          feature: feat,
          contribution: `${feat} (${val}) > ${thresh}`,
        });
        current = current.right!;
      }
    }
    path.push(current.id);

    const predictedState = current.prediction || 'OPTIMAL_ENGAGED';
    const dist = current.classDistribution || this.getDistribution([]);
    const total = Object.values(dist).reduce((a, b) => a + b, 0) || 1;

    const classProbabilities: Record<CognitiveState, number> = {
      OPTIMAL_ENGAGED: Number(((dist.OPTIMAL_ENGAGED || 0) / total).toFixed(3)),
      COGNITIVE_FATIGUE: Number(((dist.COGNITIVE_FATIGUE || 0) / total).toFixed(3)),
      ATTENTIONAL_LAPSE: Number(((dist.ATTENTIONAL_LAPSE || 0) / total).toFixed(3)),
      CONFUSION_OVERLOAD: Number(((dist.CONFUSION_OVERLOAD || 0) / total).toFixed(3)),
      POTENTIAL_DECLINE: Number(((dist.POTENTIAL_DECLINE || 0) / total).toFixed(3)),
    };

    const confidence = classProbabilities[predictedState] || 0.8;
    const recommendation = this.generateRecommendation(predictedState, telemetry);

    return {
      predictedState,
      confidence,
      classProbabilities,
      activePathNodeIds: path,
      primaryFeatureDrivers: drivers,
      recommendation,
    };
  }

  private generateRecommendation(
    state: CognitiveState,
    telemetry: CognitiveTelemetry
  ): CognitiveEvaluation['recommendation'] {
    switch (state) {
      case 'OPTIMAL_ENGAGED':
        return {
          action: 'MAINTAIN',
          description: 'Patient demonstrates solid vigilance, stable reaction times, and high accuracy.',
          gameAdjustment: 'Progress to next stage or maintain current stimulus exposure time.',
          caregiverNote: 'Excellent session engagement. No signs of fatigue or psychomotor distress.',
        };
      case 'COGNITIVE_FATIGUE':
        return {
          action: 'GENTLE_BREAK',
          description: `Reaction latency degraded by ${Math.round(telemetry.fatigueDrift * 100)}% toward session end. Mental fatigue detected.`,
          gameAdjustment: 'Provide a relaxing warm-down sequence and transition to restful completion.',
          caregiverNote: 'Patient is experiencing natural cognitive fatigue. Encourage hydration and a short rest.',
        };
      case 'ATTENTIONAL_LAPSE':
        return {
          action: 'SIMPLIFY_PACE',
          description: `${Math.round(telemetry.lapseRate * 100)}% of trials triggered delay timeouts with high reaction variability (${telemetry.reactionTimeVariability ? `CV ${(telemetry.reactionTimeVariability).toFixed(2)}` : 'scattered tempo'}). Lapses in sustained attention.`,
          gameAdjustment: 'Activate sensory chime reminders and increase inter-stimulus pause by 300ms.',
          caregiverNote: 'Scattered attention detected. Check for environmental distractions or auditory background noise.',
        };
      case 'CONFUSION_OVERLOAD':
        return {
          action: 'INCREASE_SUPPORT',
          description: `Consecutive error bursts and low accuracy indicate frustration${telemetry.hesitationMs ? ` alongside prolonged hesitation (${Math.round(telemetry.hesitationMs)}ms)` : ''}.`,
          gameAdjustment: 'Automatically step down difficulty: widen target sizes and remove distractors.',
          caregiverNote: 'Task was too challenging today. The system has automatically reduced difficulty to prevent agitation.',
        };
      case 'POTENTIAL_DECLINE':
        return {
          action: 'NOTIFY_CAREGIVER',
          description: `Performance is ${Math.round(telemetry.baselineDeviation * 100)}% below 14-day established baseline${telemetry.hesitationMs ? ` with elevated initiation hesitation (${Math.round(telemetry.hesitationMs)}ms)` : ''}.`,
          gameAdjustment: 'Limit session duration and switch to gentle cognitive comfort games.',
          caregiverNote: 'Clinical Flag: Significant multi-metric deviation from baseline. Monitor for sleep disruption, illness, or medication change.',
        };
    }
  }
}

/**
 * Random Forest Ensemble (Bagging of Multiple Random Trees)
 */
export class RandomForest {
  public trees: RandomTree[] = [];
  public numTrees: number;

  constructor(numTrees = 5, config?: TreeConfig) {
    this.numTrees = numTrees;
    for (let i = 0; i < numTrees; i++) {
      this.trees.push(
        new RandomTree({
          ...config,
          seed: (config?.seed ?? 100) + i * 37,
        })
      );
    }
  }

  public fit(samples: TrainingSample[]): void {
    const n = samples.length;
    for (const tree of this.trees) {
      // Bootstrap sampling with replacement
      const bootstrap: TrainingSample[] = [];
      for (let i = 0; i < n; i++) {
        const idx = Math.floor(Math.random() * n);
        bootstrap.push(samples[idx]);
      }
      tree.fit(bootstrap);
    }
  }

  public evaluateEnsemble(telemetry: CognitiveTelemetry): {
    predictedState: CognitiveState;
    confidence: number;
    votes: Record<CognitiveState, number>;
  } {
    const votes: Record<CognitiveState, number> = {
      OPTIMAL_ENGAGED: 0,
      COGNITIVE_FATIGUE: 0,
      ATTENTIONAL_LAPSE: 0,
      CONFUSION_OVERLOAD: 0,
      POTENTIAL_DECLINE: 0,
    };

    for (const tree of this.trees) {
      const res = tree.evaluate(telemetry);
      votes[res.predictedState] += 1;
    }

    let winner: CognitiveState = 'OPTIMAL_ENGAGED';
    let maxVotes = -1;
    for (const cls of ALL_CLASSES) {
      if (votes[cls] > maxVotes) {
        maxVotes = votes[cls];
        winner = cls;
      }
    }

    return {
      predictedState: winner,
      confidence: Number((maxVotes / this.numTrees).toFixed(3)),
      votes,
    };
  }
}
