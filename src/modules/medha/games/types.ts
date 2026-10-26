/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * MEDHA Cognitive Game Specification - Core Types & Contracts
 */

import type { ComponentType } from 'react';
import type { CognitiveTelemetry, CognitiveEvaluation } from '../types';

export type StandardCognitiveDomain =
  | 'memory'
  | 'attention'
  | 'processing_speed'
  | 'executive_function'
  | 'visuospatial'
  | 'language'
  | 'reasoning';

export type GameEventType =
  | 'stimulus_shown'
  | 'answer_selected'
  | 'answer_correct'
  | 'answer_incorrect'
  | 'hint_used'
  | 'level_started'
  | 'level_completed'
  | 'pause'
  | 'resume'
  | 'restart'
  | 'game_completed';

export interface GameDescriptor {
  gameId: string;
  gameName: string;
  description: string;
  cognitiveDomains: StandardCognitiveDomain[];
  primaryDomain: StandardCognitiveDomain;
  secondaryDomains: StandardCognitiveDomain[];
  difficultyLevels: number[];
  estimatedDuration: number; // in minutes
  supportedLanguages: string[];
  gameVersion: string;
  dataSchemaVersion: string;
}

export interface GameEvent {
  session_id: string;
  event_id: string;
  event_type: GameEventType;
  question_id: string;
  stimulus_type: string;
  expected_answer?: string;
  actual_answer?: string;
  correct?: boolean;
  response_time?: number; // ms
  hint_used?: boolean;
  difficulty_level: number;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export interface StandardSessionData {
  session_id: string;
  patient_id: string;
  game_id: string;
  cognitive_domain: StandardCognitiveDomain;
  difficulty_level: number;

  score: number;
  max_score: number;
  accuracy: number; // 0.0 - 1.0

  correct_answers: number;
  incorrect_answers: number;
  attempts: number;

  hints_used: number;

  reaction_time_avg: number;
  reaction_time_min: number;
  reaction_time_max: number;

  completion_time: number; // seconds

  pauses: number;
  restarts: number;

  completed: boolean;
  is_practice: boolean;

  timestamp: number;
  dataQuality: 'valid' | 'suspect' | 'incomplete';

  // Domain-specific additional metrics
  domainMetrics?: Record<string, number | string>;

  // Normalized cognitive telemetry passed into ML Random Tree
  normalizedTelemetry: CognitiveTelemetry;
  // ML Evaluation result
  mlEvaluation?: CognitiveEvaluation;

  // Real biomarker readings calculated from actual user moves & hesitation
  biomarkers?: {
    hesitationMs: number;
    reactionTimeVariability: number;
    movementHesitation: number;
    reactionTimes: number[];
    postErrorRecoveryMs?: number;
  };
}

export interface GameProps {
  patientId: string;
  difficulty: number;
  isPractice?: boolean;
  soundEnabled?: boolean;
  onEvent: (event: Omit<GameEvent, 'session_id' | 'event_id' | 'timestamp'>) => void;
  onComplete: (summary: {
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
  }) => void;
  onExit: () => void;
}

export interface GameRegistryItem {
  descriptor: GameDescriptor;
  component: ComponentType<GameProps>;
  iconName: string;
  accentColor: string;
}
