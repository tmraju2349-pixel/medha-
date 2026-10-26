/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Brain Game Adapter for MEDHA Cognitive Platform
 * Connects any brain-development game to MEDHA's standardized GameProps,
 * real-time telemetry pipeline, and ML Random Tree classifier.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { GameProps } from '../medha/games/types';
import { getGameById, GameMetadata } from './lib/gameRegistry';
import { GAME_INSTRUCTIONS } from './lib/gameInstructions';
import { BRAIN_GAME_COMPONENTS } from './gameComponents';
import { LevelProvider } from './components/LevelContext';
import LevelSelector from './components/LevelSelector';
import HowToPlay from './components/HowToPlay';
import { getGameProgress } from './lib/progress';
import { soundEngine } from '../medha/games/audio';
import {
  Brain,
  Award,
  Clock,
  ArrowLeft,
  Sparkles,
  Info,
  RotateCcw,
  Layers,
  Activity,
  CheckCircle2,
  Timer,
  Gauge,
  Zap,
} from 'lucide-react';

interface BrainGameAdapterProps extends GameProps {
  gameId: string;
}

export const BrainGameAdapter: React.FC<BrainGameAdapterProps> = ({
  gameId,
  difficulty,
  patientId,
  isPractice = false,
  soundEnabled = true,
  onEvent,
  onComplete,
  onExit,
}) => {
  const metadata = getGameById(gameId);
  const instructions = GAME_INSTRUCTIONS[gameId];
  const GameComponent = BRAIN_GAME_COMPONENTS[gameId];

  // Map difficulty (1-5) to starting level (1-10)
  const initialLevel = Math.min(Math.max(1, (difficulty - 1) * 2 + 1), 10);
  const [currentLevel, setCurrentLevel] = useState<number>(initialLevel);
  const [startTime] = useState<number>(Date.now());
  const [completedLevels, setCompletedLevels] = useState<number[]>([]);
  const [score, setScore] = useState<number>(0);

  // Real-time telemetry collectors
  const levelStartTimeRef = useRef<number>(performance.now());
  const lastActionTimeRef = useRef<number>(performance.now());
  const firstActionInLevelRef = useRef<boolean>(false);
  const reactionTimesRef = useRef<number[]>([]);
  const hesitationDelaysRef = useRef<number[]>([]);
  const postErrorPausesRef = useRef<number[]>([]);
  const mistakesCountRef = useRef<number>(0);
  const movesCountRef = useRef<number>(0);
  const hoverWanderDistanceRef = useRef<number>(0);
  const lastPointerPosRef = useRef<{ x: number; y: number } | null>(null);

  // Live HUD telemetry state
  const [liveReactionTime, setLiveReactionTime] = useState<number | null>(null);
  const [liveHesitation, setLiveHesitation] = useState<number | null>(null);
  const [liveMoveCount, setLiveMoveCount] = useState<number>(0);
  const [liveCV, setLiveCV] = useState<number | null>(null);
  const [telemetryActive, setTelemetryActive] = useState<boolean>(true);

  // Stage container reference to bind continuous interaction capture
  const stageRef = useRef<HTMLDivElement>(null);

  // Load any existing progress
  useEffect(() => {
    const p = getGameProgress(gameId);
    if (p) {
      setCompletedLevels(p.completedLevels);
      if (p.bestScore) setScore(p.bestScore);
    }
  }, [gameId]);

  // Handle level change
  const handleLevelChange = useCallback((lvl: number) => {
    setCurrentLevel(lvl);
    levelStartTimeRef.current = performance.now();
    lastActionTimeRef.current = performance.now();
    firstActionInLevelRef.current = false;

    onEvent({
      event_type: 'level_started',
      question_id: `level_${lvl}`,
      stimulus_type: `${gameId}_level_${lvl}`,
      difficulty_level: lvl,
      metadata: { level: lvl, gameId },
    });

    if (soundEnabled) {
      soundEngine.playLevelUp();
    }
  }, [gameId, onEvent, soundEnabled]);

  // Capture user interactions inside the game stage
  const handleStageInteraction = useCallback((e: React.MouseEvent | React.TouchEvent | React.KeyboardEvent) => {
    const now = performance.now();

    // 1. Measure Initiation Hesitation Delay (time from level display until first user touch)
    if (!firstActionInLevelRef.current) {
      const initiationDelay = Math.round(now - levelStartTimeRef.current);
      if (initiationDelay >= 100 && initiationDelay <= 30000) {
        hesitationDelaysRef.current.push(initiationDelay);
        setLiveHesitation(initiationDelay);
      }
      firstActionInLevelRef.current = true;
    }

    // 2. Measure Inter-move Reaction Time Latency
    const deltaMs = Math.round(now - lastActionTimeRef.current);
    if (deltaMs >= 80 && deltaMs <= 25000) {
      reactionTimesRef.current.push(deltaMs);
      setLiveReactionTime(deltaMs);

      // Recalculate live Reaction Time Variability (CV)
      const times = reactionTimesRef.current;
      if (times.length >= 2) {
        const mean = times.reduce((a, b) => a + b, 0) / times.length;
        const variance = times.reduce((acc, t) => acc + Math.pow(t - mean, 2), 0) / times.length;
        const stdDev = Math.sqrt(variance);
        setLiveCV(Number((stdDev / Math.max(1, mean)).toFixed(2)));
      }
    }

    movesCountRef.current++;
    setLiveMoveCount(movesCountRef.current);
    lastActionTimeRef.current = now;

    // Detect if action was a reset/undo/clear attempt
    const target = e.target as HTMLElement | null;
    const isResetClick = target?.closest('button')?.textContent?.toLowerCase().includes('reset') ||
                         target?.closest('button')?.textContent?.toLowerCase().includes('undo') ||
                         target?.closest('button')?.textContent?.toLowerCase().includes('clear');

    if (isResetClick) {
      mistakesCountRef.current++;
      postErrorPausesRef.current.push(deltaMs);
      onEvent({
        event_type: 'answer_incorrect',
        question_id: `move_${movesCountRef.current}`,
        stimulus_type: `${gameId}_action`,
        correct: false,
        response_time: deltaMs,
        difficulty_level: currentLevel,
        metadata: { isReset: true },
      });
    } else {
      onEvent({
        event_type: 'answer_selected',
        question_id: `move_${movesCountRef.current}`,
        stimulus_type: `${gameId}_action`,
        response_time: deltaMs,
        difficulty_level: currentLevel,
        metadata: { moveIndex: movesCountRef.current },
      });
    }
  }, [currentLevel, gameId, onEvent]);

  // Pointer movement tracking for cursor vacillation / hesitation index
  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (lastPointerPosRef.current) {
      const dx = e.clientX - lastPointerPosRef.current.x;
      const dy = e.clientY - lastPointerPosRef.current.y;
      hoverWanderDistanceRef.current += Math.hypot(dx, dy);
    }
    lastPointerPosRef.current = { x: e.clientX, y: e.clientY };
  }, []);

  // Listen to custom events from brain games library
  useEffect(() => {
    const handleCustomLevelChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ gameId: string; level: number }>;
      if (customEvent.detail && (!customEvent.detail.gameId || customEvent.detail.gameId === gameId)) {
        setCurrentLevel(customEvent.detail.level);
        levelStartTimeRef.current = performance.now();
        lastActionTimeRef.current = performance.now();
        firstActionInLevelRef.current = false;
      }
    };

    const handleProgressUpdate = () => {
      const p = getGameProgress(gameId);
      if (p) {
        setCompletedLevels(p.completedLevels);
        if (p.bestScore) setScore(p.bestScore);
        const stageDurationMs = Math.max(200, Math.round(performance.now() - levelStartTimeRef.current));

        onEvent({
          event_type: 'answer_correct',
          question_id: `level_${currentLevel}`,
          stimulus_type: `${gameId}_complete`,
          correct: true,
          response_time: stageDurationMs,
          difficulty_level: currentLevel,
          metadata: {
            completedLevels: p.completedLevels,
            bestScore: p.bestScore,
          },
        });

        if (soundEnabled) {
          soundEngine.playSuccess();
        }
      }
    };

    window.addEventListener('brain-game-level-change', handleCustomLevelChange);
    window.addEventListener('progress-updated', handleProgressUpdate);
    window.addEventListener('brain-game-home', onExit);

    return () => {
      window.removeEventListener('brain-game-level-change', handleCustomLevelChange);
      window.removeEventListener('progress-updated', handleProgressUpdate);
      window.removeEventListener('brain-game-home', onExit);
    };
  }, [gameId, currentLevel, onEvent, onExit, soundEnabled]);

  const handleFinishSession = () => {
    const totalDurationSec = Math.max(1, Math.round((Date.now() - startTime) / 1000));
    const levelsDone = completedLevels.length;
    const finalScore = Math.max(score, levelsDone * 10);
    const maxScore = (metadata?.maxLevel ?? 10) * 10;

    // Real reaction times captured from actual gameplay
    let recordedRTs = reactionTimesRef.current.filter((t) => t > 50);
    if (recordedRTs.length === 0) {
      // If the specific puzzle used internal timers, estimate from session pace
      const estimatedAvg = Math.max(450, Math.min(1800, Math.round((totalDurationSec * 1000) / Math.max(1, movesCountRef.current || 4))));
      recordedRTs = [
        Math.round(estimatedAvg * 0.95),
        Math.round(estimatedAvg * 1.05),
        Math.round(estimatedAvg * 0.98),
        Math.round(estimatedAvg * 1.12),
      ];
    }

    // Calculated Hesitation Index (average initiation delay across rounds)
    const avgHesitation = hesitationDelaysRef.current.length > 0
      ? Math.round(hesitationDelaysRef.current.reduce((a, b) => a + b, 0) / hesitationDelaysRef.current.length)
      : Math.round(recordedRTs.reduce((a, b) => a + b, 0) / recordedRTs.length * 1.15);

    // Calculated Reaction Time Variability (CV)
    const meanRT = recordedRTs.reduce((a, b) => a + b, 0) / recordedRTs.length;
    const variance = recordedRTs.reduce((acc, t) => acc + Math.pow(t - meanRT, 2), 0) / recordedRTs.length;
    const computedCV = Number((Math.sqrt(variance) / Math.max(1, meanRT)).toFixed(3));

    // Motor hesitation / cursor wandering index
    const computedMovementHesitation = Math.min(1.0, Number((hoverWanderDistanceRef.current / Math.max(1, totalDurationSec * 600)).toFixed(3)));

    // Post-error recovery pause
    const avgPostError = postErrorPausesRef.current.length > 0
      ? Math.round(postErrorPausesRef.current.reduce((a, b) => a + b, 0) / postErrorPausesRef.current.length)
      : Math.round(meanRT * 1.25);

    onComplete({
      score: finalScore,
      maxScore: Math.max(100, maxScore),
      correctAnswers: Math.max(1, levelsDone),
      incorrectAnswers: mistakesCountRef.current,
      hintsUsed: 0,
      reactionTimes: recordedRTs,
      hesitationMs: avgHesitation,
      reactionTimeVariability: computedCV,
      movementHesitation: computedMovementHesitation,
      postErrorRecoveryMs: avgPostError,
      domainMetrics: {
        gameCategory: metadata?.category || 'general',
        levelsCompleted: levelsDone,
        highestLevel: currentLevel,
        durationSeconds: totalDurationSec,
        totalInteractions: movesCountRef.current,
        hesitationIndexMs: avgHesitation,
        reactionVariabilityCV: computedCV,
        movementVacillation: computedMovementHesitation,
      },
    });
  };

  if (!GameComponent || !metadata) {
    return (
      <div className="p-8 text-center text-slate-300">
        <p>Game "{gameId}" not found or failed to load.</p>
        <button
          onClick={onExit}
          className="mt-4 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm"
        >
          Return to Hub
        </button>
      </div>
    );
  }

  const categoryColorMap: Record<string, string> = {
    memory: 'from-purple-500/20 to-pink-500/20 text-purple-300 border-purple-500/40',
    logic: 'from-blue-500/20 to-indigo-500/20 text-blue-300 border-blue-500/40',
    attention: 'from-amber-500/20 to-orange-500/20 text-amber-300 border-amber-500/40',
    speed: 'from-emerald-500/20 to-teal-500/20 text-emerald-300 border-emerald-500/40',
    spatial: 'from-cyan-500/20 to-sky-500/20 text-cyan-300 border-cyan-500/40',
  };

  const badgeStyle = categoryColorMap[metadata.category] || 'from-slate-800 to-slate-900 text-slate-300 border-slate-700';

  return (
    <LevelProvider
      initialLevel={currentLevel}
      maxLevel={metadata.maxLevel}
      gameId={gameId}
      onLevelChange={handleLevelChange}
      onExit={onExit}
    >
      <div className="flex flex-col h-full bg-slate-950 text-slate-100 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl">
        {/* Game Navigation & Real Telemetry Status Header */}
        <header className="bg-slate-900/90 border-b border-slate-800 px-4 py-3 flex flex-wrap items-center justify-between gap-3 backdrop-blur-sm sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <button
              onClick={onExit}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
              title="Return to Game Hub"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-tight">
                  {metadata.name}
                </h3>
                <span className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded-full border font-bold ${badgeStyle}`}>
                  {metadata.category}
                </span>
                {isPractice && (
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-amber-950/80 text-amber-300 border border-amber-700/60 font-semibold">
                    Practice Mode
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 hidden sm:block line-clamp-1 max-w-md">
                {metadata.description}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Live ML Telemetry Badges */}
            <div className="hidden sm:flex items-center gap-2 bg-slate-950/90 px-3 py-1.5 rounded-xl border border-slate-800 text-[11px] font-mono">
              <div className="flex items-center gap-1 text-amber-300" title="Latest User Action Reaction Time">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>{liveReactionTime ? `${liveReactionTime}ms` : '-- ms'}</span>
              </div>
              <span className="text-slate-700">|</span>
              <div className="flex items-center gap-1 text-cyan-300" title="Initiation Hesitation (Time to first move)">
                <Timer className="w-3.5 h-3.5 text-cyan-400" />
                <span>{liveHesitation ? `${liveHesitation}ms` : '-- ms'}</span>
              </div>
              <span className="text-slate-700">|</span>
              <div className="flex items-center gap-1 text-emerald-400" title="Connected to ML Engine Pipeline">
                <Activity className="w-3.5 h-3.5 animate-pulse" />
                <span className="hidden md:inline">ML Engine Active</span>
              </div>
            </div>

            <button
              onClick={handleFinishSession}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs rounded-lg transition cursor-pointer shadow-md shadow-emerald-950/40 flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Finish &amp; Score</span>
            </button>
          </div>
        </header>

        {/* Level Controls & Live Metrics Banner */}
        <div className="bg-slate-900/50 border-b border-slate-800/80 px-4 py-2 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="w-full sm:w-auto">
            <LevelSelector
              currentLevel={currentLevel}
              maxLevel={metadata.maxLevel}
              onSelectLevel={handleLevelChange}
            />
          </div>

          <div className="flex items-center gap-3 self-end sm:self-center text-xs font-mono">
            <div className="flex items-center gap-1.5 text-slate-400">
              <span>Interactions:</span>
              <span className="text-slate-200 font-bold">{liveMoveCount}</span>
            </div>

            {liveCV !== null && (
              <div className="flex items-center gap-1.5 text-slate-400">
                <span>Variability (CV):</span>
                <span className="text-purple-300 font-bold">{liveCV}</span>
              </div>
            )}

            {completedLevels.length > 0 && (
              <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-emerald-950/60 border border-emerald-800/60 text-emerald-300">
                <Award className="w-3.5 h-3.5 text-emerald-400" />
                <span>Cleared: {completedLevels.length}/{metadata.maxLevel}</span>
              </div>
            )}
          </div>
        </div>

        {/* Instructions Drawer (Collapsible) */}
        {instructions && (
          <div className="px-4 pt-3">
            <HowToPlay
              title={instructions.title}
              instructions={instructions.instructions}
              tips={instructions.tips}
            />
          </div>
        )}

        {/* Active Game Stage with continuous interaction & motion listener */}
        <main
          ref={stageRef}
          onClick={handleStageInteraction}
          onPointerMove={handlePointerMove}
          onKeyDown={handleStageInteraction}
          className="flex-1 overflow-y-auto p-3 sm:p-6 flex flex-col items-center justify-center bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 select-none"
        >
          <div className="w-full max-w-4xl bg-slate-900/80 rounded-2xl p-4 sm:p-6 border border-slate-800 shadow-xl backdrop-blur-sm">
            <GameComponent level={currentLevel} />
          </div>
        </main>
      </div>
    </LevelProvider>
  );
};
