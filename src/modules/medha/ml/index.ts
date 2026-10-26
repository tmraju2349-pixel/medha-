/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * MEDHA Cognitive Engine - ML Module Public API
 */

export * from '../types';
export * from './randomTree';
export * from './trainingData';

import { RandomTree } from './randomTree';
import { CLINICAL_TRAINING_DATA } from './trainingData';
import type { CognitiveTelemetry, CognitiveEvaluation } from '../types';

let cachedDefaultTree: RandomTree | null = null;

/**
 * Returns a ready-to-use Random Tree pre-fitted with clinical gerontology benchmarks
 */
export function getDefaultCognitiveModel(): RandomTree {
  if (!cachedDefaultTree) {
    cachedDefaultTree = new RandomTree({
      maxDepth: 4,
      minSamplesSplit: 2,
      minSamplesLeaf: 1,
      maxFeatures: 'sqrt',
      seed: 42,
    });
    cachedDefaultTree.fit(CLINICAL_TRAINING_DATA);
  }
  return cachedDefaultTree;
}

/**
 * One-line evaluation function for direct project integration
 */
export function classifyTelemetry(telemetry: CognitiveTelemetry): CognitiveEvaluation {
  const model = getDefaultCognitiveModel();
  return model.evaluate(telemetry);
}
