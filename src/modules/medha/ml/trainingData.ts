/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * MEDHA Clinical Telemetry Benchmark Dataset
 * Calibrated for geriatric cognitive assessment and dementia telemetry monitoring.
 */

import type { TrainingSample, CognitiveTelemetry } from '../types';

export const CLINICAL_TRAINING_DATA: TrainingSample[] = [
  // --- OPTIMAL_ENGAGED (Alert, well-rested, engaged) ---
  {
    features: { avgReactionTimeMs: 520, accuracy: 0.92, lapseRate: 0.04, fatigueDrift: 0.05, errorClustering: 0.05, baselineDeviation: -0.05, hesitationMs: 480, reactionTimeVariability: 0.16, movementHesitation: 0.08, postErrorRecoveryMs: 580 },
    label: 'OPTIMAL_ENGAGED',
  },
  {
    features: { avgReactionTimeMs: 580, accuracy: 0.88, lapseRate: 0.06, fatigueDrift: 0.08, errorClustering: 0.08, baselineDeviation: 0.02, hesitationMs: 550, reactionTimeVariability: 0.19, movementHesitation: 0.11, postErrorRecoveryMs: 640 },
    label: 'OPTIMAL_ENGAGED',
  },
  {
    features: { avgReactionTimeMs: 640, accuracy: 0.85, lapseRate: 0.08, fatigueDrift: 0.12, errorClustering: 0.10, baselineDeviation: 0.04, hesitationMs: 620, reactionTimeVariability: 0.22, movementHesitation: 0.14, postErrorRecoveryMs: 710 },
    label: 'OPTIMAL_ENGAGED',
  },
  {
    features: { avgReactionTimeMs: 490, accuracy: 0.95, lapseRate: 0.02, fatigueDrift: 0.03, errorClustering: 0.02, baselineDeviation: -0.08, hesitationMs: 440, reactionTimeVariability: 0.14, movementHesitation: 0.06, postErrorRecoveryMs: 520 },
    label: 'OPTIMAL_ENGAGED',
  },
  {
    features: { avgReactionTimeMs: 610, accuracy: 0.89, lapseRate: 0.05, fatigueDrift: 0.10, errorClustering: 0.07, baselineDeviation: 0.01, hesitationMs: 590, reactionTimeVariability: 0.20, movementHesitation: 0.12, postErrorRecoveryMs: 680 },
    label: 'OPTIMAL_ENGAGED',
  },

  // --- COGNITIVE_FATIGUE (Reaction time slowing down late in session, mental exhaustion) ---
  {
    features: { avgReactionTimeMs: 890, accuracy: 0.74, lapseRate: 0.12, fatigueDrift: 0.38, errorClustering: 0.18, baselineDeviation: 0.14, hesitationMs: 1050, reactionTimeVariability: 0.38, movementHesitation: 0.28, postErrorRecoveryMs: 1220 },
    label: 'COGNITIVE_FATIGUE',
  },
  {
    features: { avgReactionTimeMs: 980, accuracy: 0.70, lapseRate: 0.15, fatigueDrift: 0.45, errorClustering: 0.22, baselineDeviation: 0.18, hesitationMs: 1180, reactionTimeVariability: 0.42, movementHesitation: 0.32, postErrorRecoveryMs: 1350 },
    label: 'COGNITIVE_FATIGUE',
  },
  {
    features: { avgReactionTimeMs: 840, accuracy: 0.78, lapseRate: 0.10, fatigueDrift: 0.32, errorClustering: 0.14, baselineDeviation: 0.10, hesitationMs: 960, reactionTimeVariability: 0.34, movementHesitation: 0.24, postErrorRecoveryMs: 1100 },
    label: 'COGNITIVE_FATIGUE',
  },
  {
    features: { avgReactionTimeMs: 1050, accuracy: 0.68, lapseRate: 0.18, fatigueDrift: 0.52, errorClustering: 0.25, baselineDeviation: 0.22, hesitationMs: 1280, reactionTimeVariability: 0.46, movementHesitation: 0.36, postErrorRecoveryMs: 1460 },
    label: 'COGNITIVE_FATIGUE',
  },
  {
    features: { avgReactionTimeMs: 910, accuracy: 0.72, lapseRate: 0.14, fatigueDrift: 0.40, errorClustering: 0.19, baselineDeviation: 0.15, hesitationMs: 1100, reactionTimeVariability: 0.39, movementHesitation: 0.29, postErrorRecoveryMs: 1260 },
    label: 'COGNITIVE_FATIGUE',
  },

  // --- ATTENTIONAL_LAPSE (Distraction, wandering attention, sudden long delays) ---
  {
    features: { avgReactionTimeMs: 760, accuracy: 0.80, lapseRate: 0.32, fatigueDrift: 0.14, errorClustering: 0.12, baselineDeviation: 0.08, hesitationMs: 1150, reactionTimeVariability: 0.58, movementHesitation: 0.32, postErrorRecoveryMs: 1300 },
    label: 'ATTENTIONAL_LAPSE',
  },
  {
    features: { avgReactionTimeMs: 820, accuracy: 0.76, lapseRate: 0.38, fatigueDrift: 0.18, errorClustering: 0.15, baselineDeviation: 0.11, hesitationMs: 1280, reactionTimeVariability: 0.64, movementHesitation: 0.38, postErrorRecoveryMs: 1420 },
    label: 'ATTENTIONAL_LAPSE',
  },
  {
    features: { avgReactionTimeMs: 710, accuracy: 0.84, lapseRate: 0.28, fatigueDrift: 0.11, errorClustering: 0.09, baselineDeviation: 0.05, hesitationMs: 1020, reactionTimeVariability: 0.52, movementHesitation: 0.26, postErrorRecoveryMs: 1180 },
    label: 'ATTENTIONAL_LAPSE',
  },
  {
    features: { avgReactionTimeMs: 880, accuracy: 0.72, lapseRate: 0.42, fatigueDrift: 0.16, errorClustering: 0.16, baselineDeviation: 0.12, hesitationMs: 1390, reactionTimeVariability: 0.68, movementHesitation: 0.44, postErrorRecoveryMs: 1540 },
    label: 'ATTENTIONAL_LAPSE',
  },
  {
    features: { avgReactionTimeMs: 750, accuracy: 0.79, lapseRate: 0.30, fatigueDrift: 0.15, errorClustering: 0.11, baselineDeviation: 0.07, hesitationMs: 1110, reactionTimeVariability: 0.56, movementHesitation: 0.30, postErrorRecoveryMs: 1250 },
    label: 'ATTENTIONAL_LAPSE',
  },

  // --- CONFUSION_OVERLOAD (High difficulty mismatch, repetitive mistake bursts) ---
  {
    features: { avgReactionTimeMs: 950, accuracy: 0.52, lapseRate: 0.20, fatigueDrift: 0.22, errorClustering: 0.48, baselineDeviation: 0.20, hesitationMs: 1520, reactionTimeVariability: 0.48, movementHesitation: 0.62, postErrorRecoveryMs: 1780 },
    label: 'CONFUSION_OVERLOAD',
  },
  {
    features: { avgReactionTimeMs: 1100, accuracy: 0.45, lapseRate: 0.24, fatigueDrift: 0.28, errorClustering: 0.58, baselineDeviation: 0.26, hesitationMs: 1750, reactionTimeVariability: 0.54, movementHesitation: 0.72, postErrorRecoveryMs: 1950 },
    label: 'CONFUSION_OVERLOAD',
  },
  {
    features: { avgReactionTimeMs: 870, accuracy: 0.58, lapseRate: 0.18, fatigueDrift: 0.19, errorClustering: 0.42, baselineDeviation: 0.18, hesitationMs: 1410, reactionTimeVariability: 0.44, movementHesitation: 0.55, postErrorRecoveryMs: 1620 },
    label: 'CONFUSION_OVERLOAD',
  },
  {
    features: { avgReactionTimeMs: 1020, accuracy: 0.48, lapseRate: 0.22, fatigueDrift: 0.25, errorClustering: 0.52, baselineDeviation: 0.24, hesitationMs: 1650, reactionTimeVariability: 0.51, movementHesitation: 0.68, postErrorRecoveryMs: 1860 },
    label: 'CONFUSION_OVERLOAD',
  },
  {
    features: { avgReactionTimeMs: 920, accuracy: 0.54, lapseRate: 0.19, fatigueDrift: 0.21, errorClustering: 0.45, baselineDeviation: 0.19, hesitationMs: 1480, reactionTimeVariability: 0.46, movementHesitation: 0.58, postErrorRecoveryMs: 1700 },
    label: 'CONFUSION_OVERLOAD',
  },

  // --- POTENTIAL_DECLINE (Severe sustained baseline deviation, slow speeds across entire test) ---
  {
    features: { avgReactionTimeMs: 1350, accuracy: 0.62, lapseRate: 0.26, fatigueDrift: 0.24, errorClustering: 0.36, baselineDeviation: 0.44, hesitationMs: 1850, reactionTimeVariability: 0.58, movementHesitation: 0.56, postErrorRecoveryMs: 2100 },
    label: 'POTENTIAL_DECLINE',
  },
  {
    features: { avgReactionTimeMs: 1480, accuracy: 0.56, lapseRate: 0.30, fatigueDrift: 0.28, errorClustering: 0.40, baselineDeviation: 0.52, hesitationMs: 2050, reactionTimeVariability: 0.63, movementHesitation: 0.64, postErrorRecoveryMs: 2350 },
    label: 'POTENTIAL_DECLINE',
  },
  {
    features: { avgReactionTimeMs: 1280, accuracy: 0.64, lapseRate: 0.22, fatigueDrift: 0.20, errorClustering: 0.32, baselineDeviation: 0.38, hesitationMs: 1720, reactionTimeVariability: 0.52, movementHesitation: 0.50, postErrorRecoveryMs: 1980 },
    label: 'POTENTIAL_DECLINE',
  },
  {
    features: { avgReactionTimeMs: 1600, accuracy: 0.51, lapseRate: 0.35, fatigueDrift: 0.32, errorClustering: 0.44, baselineDeviation: 0.58, hesitationMs: 2280, reactionTimeVariability: 0.70, movementHesitation: 0.72, postErrorRecoveryMs: 2580 },
    label: 'POTENTIAL_DECLINE',
  },
  {
    features: { avgReactionTimeMs: 1400, accuracy: 0.60, lapseRate: 0.28, fatigueDrift: 0.26, errorClustering: 0.38, baselineDeviation: 0.46, hesitationMs: 1940, reactionTimeVariability: 0.60, movementHesitation: 0.59, postErrorRecoveryMs: 2200 },
    label: 'POTENTIAL_DECLINE',
  },
];

export const FEATURE_METADATA: Record<keyof CognitiveTelemetry, {
  name: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  description: string;
}> = {
  avgReactionTimeMs: {
    name: 'Avg Reaction Time',
    unit: 'ms',
    min: 300,
    max: 2000,
    step: 10,
    description: 'Mean psychomotor latency from stimulus onset to user tap.',
  },
  accuracy: {
    name: 'Task Accuracy',
    unit: '%',
    min: 0.2,
    max: 1.0,
    step: 0.01,
    description: 'Percentage of correct responses in session.',
  },
  fatigueDrift: {
    name: 'Fatigue Drift Slope',
    unit: 'Δ',
    min: -0.2,
    max: 0.8,
    step: 0.02,
    description: 'Late-session RT divided by early-session RT. Higher values indicate slowing.',
  },
  lapseRate: {
    name: 'Attentional Lapse Rate',
    unit: '%',
    min: 0.0,
    max: 0.6,
    step: 0.01,
    description: 'Proportion of trials with responses slower than 2.5x baseline mean.',
  },
  errorClustering: {
    name: 'Error Clustering',
    unit: 'burst',
    min: 0.0,
    max: 0.8,
    step: 0.02,
    description: 'Occurrence of consecutive errors, signalling confusion or task disorientation.',
  },
  baselineDeviation: {
    name: 'Baseline Deviation',
    unit: '% shift',
    min: -0.2,
    max: 0.8,
    step: 0.02,
    description: 'Comparative deviation from patient’s 14-day established psychometric baseline.',
  },
  hesitationMs: {
    name: 'Hesitation Index',
    unit: 'ms',
    min: 300,
    max: 3000,
    step: 25,
    description: 'Initiation latency / decision pause before making the first move or committing action.',
  },
  reactionTimeVariability: {
    name: 'Reaction Time Variability',
    unit: 'CV',
    min: 0.08,
    max: 0.95,
    step: 0.02,
    description: 'Intra-individual consistency (standard deviation / mean). Higher CV signals lapse-prone attention.',
  },
  movementHesitation: {
    name: 'Movement Vacillation',
    unit: 'index',
    min: 0.0,
    max: 1.0,
    step: 0.02,
    description: 'Motor hesitation, cursor wandering, and trajectory reversals prior to clicking.',
  },
  postErrorRecoveryMs: {
    name: 'Post-Error Recovery',
    unit: 'ms',
    min: 400,
    max: 3500,
    step: 50,
    description: 'Average processing latency following an incorrect response or puzzle mistake.',
  },
};
