/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Senior-Friendly Game Runner Modal
 * Implements Introduction -> Practice -> Real Session -> Standardized Telemetry -> Result Flow
 */

import React, { useState, useRef, useEffect } from 'react';
import type { GameRegistryItem, StandardSessionData, GameEvent } from '../../modules/medha/games/types';
import type { CognitiveTelemetry } from '../../modules/medha/types';
import { GameSessionTracker, recommendNextDifficulty } from '../../modules/medha/games/gameService';
import { sound } from '../../modules/medha/games/audio';
import {
  X,
  Volume2,
  VolumeX,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  Trophy,
  ArrowRight,
  Activity,
  CheckCircle,
  HelpCircle,
} from 'lucide-react';

interface GameModalProps {
  gameItem: GameRegistryItem;
  patientId?: string;
  onClose: () => void;
  onSessionComplete?: (sessionData: StandardSessionData) => void;
  onInspectInTree?: (telemetry: CognitiveTelemetry) => void;
}

type ModalFlowState = 'INTRO' | 'PLAYING' | 'PAUSED' | 'RESULT' | 'TELEMETRY_INSPECTION';

export const GameModal: React.FC<GameModalProps> = ({
  gameItem,
  patientId = 'patient_ravi_01',
  onClose,
  onSessionComplete,
  onInspectInTree,
}) => {
  const { descriptor, component: GameComponent } = gameItem;

  // Recommended difficulty from baseline
  const diffRec = recommendNextDifficulty(patientId, descriptor.gameId, 1);

  const [flowState, setFlowState] = useState<ModalFlowState>('INTRO');
  const [selectedDifficulty, setSelectedDifficulty] = useState<number>(diffRec.recommendedDifficulty);
  const [isPractice, setIsPractice] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  const [completedSession, setCompletedSession] = useState<StandardSessionData | null>(null);

  // Active session tracker reference
  const trackerRef = useRef<GameSessionTracker | null>(null);

  const handleStartGame = (practice = false) => {
    sound.playTap();
    setIsPractice(practice);
    trackerRef.current = new GameSessionTracker(
      patientId,
      descriptor.gameId,
      descriptor.primaryDomain,
      selectedDifficulty,
      practice
    );
    setFlowState('PLAYING');
  };

  const handleGameEvent = (eventData: Omit<GameEvent, 'session_id' | 'event_id' | 'timestamp'>) => {
    if (trackerRef.current) {
      trackerRef.current.recordEvent(eventData);
    }
  };

  const handlePause = () => {
    sound.playTap();
    trackerRef.current?.recordPause();
    setFlowState('PAUSED');
  };

  const handleResume = () => {
    sound.playTap();
    trackerRef.current?.recordResume();
    setFlowState('PLAYING');
  };

  const handleRestart = () => {
    sound.playTap();
    trackerRef.current?.recordEvent({
      event_type: 'restart',
      question_id: 'global',
      stimulus_type: 'system',
      difficulty_level: selectedDifficulty,
    });
    handleStartGame(isPractice);
  };

  const handleCompleteGame = (summary: {
    score: number;
    maxScore: number;
    correctAnswers: number;
    incorrectAnswers: number;
    hintsUsed: number;
    domainMetrics?: Record<string, number | string>;
  }) => {
    if (trackerRef.current) {
      const session = trackerRef.current.completeSession(summary);
      setCompletedSession(session);
      onSessionComplete?.(session);
    }
    setFlowState('RESULT');
  };

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    sound.setEnabled(next);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col min-h-[560px]">
        {/* Top Applet Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-slate-950/80 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <span className="text-xl">🎮</span>
            <div>
              <h2 className="text-base font-bold text-slate-100">{descriptor.gameName}</h2>
              <div className="flex items-center gap-2 text-[11px] text-slate-400">
                <span className="uppercase font-mono text-cyan-400">{descriptor.primaryDomain}</span>
                <span>•</span>
                <span>Est. {descriptor.estimatedDuration} mins</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleSound}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
              title={soundEnabled ? 'Mute sound' : 'Enable sound'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
            </button>

            {flowState === 'PLAYING' && (
              <button
                onClick={handlePause}
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
                title="Pause Game"
              >
                <Pause className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-slate-800 hover:bg-rose-900/60 text-slate-400 hover:text-rose-200 transition cursor-pointer"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Area according to flow state */}
        <div className="flex-1 flex flex-col p-4 sm:p-6">
          {/* 1. INTRO SCREEN */}
          {flowState === 'INTRO' && (
            <div className="flex-1 flex flex-col justify-between max-w-xl mx-auto w-full py-4 text-center">
              <div className="space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-3xl">
                  🧠
                </div>
                <h3 className="text-2xl font-extrabold text-slate-100">{descriptor.gameName}</h3>
                <p className="text-sm text-slate-300 leading-relaxed">
                  {descriptor.description}
                </p>

                {/* Difficulty Selector */}
                <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800 text-left my-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-200">
                      Select Difficulty Level:
                    </span>
                    <span className="text-[11px] text-emerald-400 font-mono">
                      {diffRec.rationale}
                    </span>
                  </div>
                  <div className="grid grid-cols-5 gap-2">
                    {descriptor.difficultyLevels.map((lvl) => (
                      <button
                        key={lvl}
                        onClick={() => setSelectedDifficulty(lvl)}
                        className={`py-2 rounded-lg text-xs font-bold font-mono transition cursor-pointer border ${
                          selectedDifficulty === lvl
                            ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md'
                            : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-slate-500'
                        }`}
                      >
                        Level {lvl}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action Buttons: Practice Round vs Real Session */}
              <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
                <button
                  id="btn-start-practice"
                  onClick={() => handleStartGame(true)}
                  className="px-6 py-3.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 font-semibold text-sm rounded-xl border border-slate-700 transition cursor-pointer flex items-center justify-center gap-2"
                >
                  <HelpCircle className="w-4 h-4" />
                  Practice Round (Untracked)
                </button>
                <button
                  id="btn-start-real"
                  onClick={() => handleStartGame(false)}
                  className="px-8 py-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm rounded-xl shadow-lg transition cursor-pointer flex items-center justify-center gap-2"
                >
                  <Play className="w-4 h-4 fill-current" />
                  Start Training Session
                </button>
              </div>
            </div>
          )}

          {/* 2. PLAYING SCREEN */}
          {flowState === 'PLAYING' && (
            <GameComponent
              patientId={patientId}
              difficulty={selectedDifficulty}
              isPractice={isPractice}
              soundEnabled={soundEnabled}
              onEvent={handleGameEvent}
              onComplete={handleCompleteGame}
              onExit={onClose}
            />
          )}

          {/* 3. PAUSED SCREEN */}
          {flowState === 'PAUSED' && (
            <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6">
              <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center text-slate-300">
                <Pause className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-100">Session Paused</h3>
                <p className="text-xs text-slate-400 mt-1">Take your time and resume when ready.</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleRestart}
                  className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-2 border border-slate-700 transition cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Restart
                </button>
                <button
                  onClick={handleResume}
                  className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg transition cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 fill-current" /> Resume
                </button>
              </div>
            </div>
          )}

          {/* 4. RESULT SCREEN (Senior-Friendly Encouragement, Section 14) */}
          {flowState === 'RESULT' && completedSession && (
            <div className="flex-1 flex flex-col justify-between max-w-lg mx-auto w-full py-4 text-center">
              <div className="space-y-4">
                <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-emerald-400 text-slate-950 rounded-2xl flex items-center justify-center mx-auto shadow-xl">
                  <Trophy className="w-9 h-9" />
                </div>
                <h3 className="text-2xl font-black text-slate-100">
                  Wonderful Work!
                </h3>
                <p className="text-sm text-slate-300">
                  You completed <strong className="text-emerald-400">{completedSession.correct_answers}</strong> challenges successfully.
                </p>

                {/* Elder-friendly simple stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-slate-950/70 p-3.5 rounded-xl border border-slate-800 my-4 text-left">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-mono block">Accuracy</span>
                    <span className="text-base font-bold text-emerald-400 font-mono">
                      {Math.round(completedSession.accuracy * 100)}%
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-mono block">Avg Reaction</span>
                    <span className="text-base font-bold text-amber-300 font-mono">
                      {completedSession.reaction_time_avg} ms
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-mono block">Hesitation</span>
                    <span className="text-base font-bold text-cyan-300 font-mono">
                      {completedSession.biomarkers?.hesitationMs ?? completedSession.normalizedTelemetry.hesitationMs ?? '--'} ms
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-mono block">Variability (CV)</span>
                    <span className="text-base font-bold text-purple-300 font-mono">
                      {completedSession.biomarkers?.reactionTimeVariability ?? completedSession.normalizedTelemetry.reactionTimeVariability ?? '--'}
                    </span>
                  </div>
                </div>

                {/* Caregiver Telemetry Alert Banner */}
                {completedSession.mlEvaluation && (
                  <div className="p-3.5 bg-slate-950/90 rounded-xl border border-emerald-900/60 text-left space-y-2">
                    <div className="flex items-center justify-between text-xs text-slate-300 font-semibold mb-1">
                      <span className="flex items-center gap-1.5">
                        <Activity className="w-3.5 h-3.5 text-emerald-400" />
                        Cognitive Engine Evaluation:
                      </span>
                      <span className="text-emerald-400 uppercase font-mono text-[10px] bg-emerald-950 px-2.5 py-0.5 rounded-full border border-emerald-800 font-bold">
                        {completedSession.mlEvaluation.predictedState.replace('_', ' ')} ({(completedSession.mlEvaluation.confidence * 100).toFixed(0)}%)
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 font-sans">
                      {completedSession.mlEvaluation.recommendation.caregiverNote}
                    </p>
                    <div className="text-[11px] text-slate-400 bg-slate-900/70 p-2 rounded border border-slate-800">
                      <strong className="text-slate-300">Adaptation:</strong> {completedSession.mlEvaluation.recommendation.gameAdjustment}
                    </div>
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex flex-wrap gap-2.5 justify-center pt-4">
                <button
                  onClick={() => setFlowState('TELEMETRY_INSPECTION')}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded-xl text-xs font-semibold border border-slate-700 transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Activity className="w-3.5 h-3.5" />
                  View JSON Telemetry
                </button>

                {onInspectInTree && (
                  <button
                    onClick={() => {
                      onInspectInTree(completedSession.normalizedTelemetry);
                      onClose();
                    }}
                    className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 shadow-md"
                  >
                    <Activity className="w-3.5 h-3.5" />
                    Inspect in Decision Tree
                  </button>
                )}

                <button
                  onClick={() => handleStartGame(false)}
                  className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-xs font-bold shadow-lg transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  Play Another Round
                </button>
              </div>
            </div>
          )}

          {/* 5. TELEMETRY INSPECTION SCREEN (Full Developer & Caregiver Audit) */}
          {flowState === 'TELEMETRY_INSPECTION' && completedSession && (
            <div className="flex-1 flex flex-col justify-between overflow-hidden">
              <div className="pb-3 flex items-center justify-between border-b border-slate-800">
                <span className="text-xs font-bold text-slate-200">
                  MEDHA Standardized Session Telemetry (JSON Contract)
                </span>
                <button
                  onClick={() => setFlowState('RESULT')}
                  className="text-xs text-cyan-400 hover:underline cursor-pointer"
                >
                  ← Back to Result
                </button>
              </div>
              <div className="my-3 overflow-y-auto max-h-[340px] p-3 rounded-lg bg-slate-950 border border-slate-800 font-mono text-[11px] text-slate-300">
                <pre>{JSON.stringify(completedSession, null, 2)}</pre>
              </div>
              <div className="flex justify-end pt-2">
                <button
                  onClick={onClose}
                  className="px-5 py-2.5 bg-emerald-500 text-slate-950 font-bold rounded-xl text-xs cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
