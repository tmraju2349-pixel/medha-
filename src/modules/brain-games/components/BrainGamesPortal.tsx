/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Brain Games Portal & Arcade Browser
 * Integrated from sojinantony01/brain-development-games
 * 21 Cognitive Training Games with real-time level progression, leaderboards, and telemetry.
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { GAME_REGISTRY, GameMetadata, getGamesByCategory } from '../lib/gameRegistry';
import { getAllProgress, resetAllProgress, markGameCompletedLevel, ProgressState } from '../lib/progress';
import { BrainGameAdapter } from '../BrainGameAdapter';
import LeaderBoard from './LeaderBoard';
import type { StandardSessionData } from '../../medha/games/types';
import type { CognitiveTelemetry } from '../../medha/types';
import { GameSessionTracker } from '../../medha/games/gameService';
import {
  Brain,
  Zap,
  Target,
  Search,
  Trophy,
  RotateCcw,
  Sparkles,
  Sliders,
  Filter,
  CheckCircle2,
  Compass,
  Layers,
  ArrowRight,
  Flame,
  Lightbulb,
  Gauge,
  Play,
  Activity,
  Timer,
  AlertTriangle,
  Code,
  X,
  ExternalLink,
} from 'lucide-react';

interface BrainGamesPortalProps {
  onSessionComplete?: (session: StandardSessionData) => void;
  onInspectInTree?: (telemetry: CognitiveTelemetry) => void;
  defaultGameId?: string | null;
}

export const BrainGamesPortal: React.FC<BrainGamesPortalProps> = ({
  onSessionComplete,
  onInspectInTree,
  defaultGameId = null,
}) => {
  const [selectedGameId, setSelectedGameId] = useState<string | null>(defaultGameId);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [progress, setProgress] = useState<ProgressState>(() => getAllProgress());
  const [showLeaderboard, setShowLeaderboard] = useState<boolean>(false);
  const [activeDifficulty, setActiveDifficulty] = useState<number>(3);

  // Completed session evaluation state for post-game inspection
  const [evaluatedSession, setEvaluatedSession] = useState<StandardSessionData | null>(null);
  const [showJsonTelemetry, setShowJsonTelemetry] = useState<boolean>(false);

  // Session Tracker instance
  const trackerRef = useRef<GameSessionTracker | null>(null);

  useEffect(() => {
    const handler = () => setProgress(getAllProgress());
    window.addEventListener('progress-updated', handler);
    return () => window.removeEventListener('progress-updated', handler);
  }, []);

  const filteredGames = useMemo(() => {
    return GAME_REGISTRY.filter((game) => {
      const matchesCategory =
        activeCategory === 'all' || game.category === activeCategory;
      const matchesSearch =
        game.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        game.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [activeCategory, searchQuery]);

  // Calculate overall stats
  const stats = useMemo(() => {
    const total = GAME_REGISTRY.length;
    let completedCount = 0;
    let totalLevelsCleared = 0;

    Object.values(progress).forEach((p: any) => {
      if (p?.completedLevels && p.completedLevels.length > 0) {
        completedCount++;
        totalLevelsCleared += p.completedLevels.length;
      }
    });

    return { total, completedCount, totalLevelsCleared };
  }, [progress]);

  const handleLaunchGame = (gameId: string) => {
    const game = GAME_REGISTRY.find((g) => g.id === gameId);
    const domain =
      game?.category === 'speed'
        ? 'processing_speed'
        : game?.category === 'spatial'
        ? 'visuospatial'
        : (game?.category as any) || 'executive_function';

    trackerRef.current = new GameSessionTracker(
      'patient_ravi_01',
      `bg_${gameId}`,
      domain,
      activeDifficulty,
      false
    );

    setEvaluatedSession(null);
    setShowJsonTelemetry(false);
    setSelectedGameId(gameId);
  };

  const handleExitGame = () => {
    setSelectedGameId(null);
    setEvaluatedSession(null);
  };

  const handleGameComplete = (summary: {
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
  }) => {
    if (!trackerRef.current) {
      const game = GAME_REGISTRY.find((g) => g.id === selectedGameId);
      trackerRef.current = new GameSessionTracker(
        'patient_ravi_01',
        `bg_${selectedGameId}`,
        (game?.category as any) || 'executive_function',
        activeDifficulty,
        false
      );
    }

    const session = trackerRef.current.completeSession(summary);
    if (selectedGameId) {
      markGameCompletedLevel(selectedGameId, activeDifficulty, summary.score, summary.maxScore);
    }
    setEvaluatedSession(session);
    onSessionComplete?.(session);
  };

  const handleInspectInDecisionTree = () => {
    if (evaluatedSession?.normalizedTelemetry && onInspectInTree) {
      onInspectInTree(evaluatedSession.normalizedTelemetry);
    }
  };

  // If a game is active, render the BrainGameAdapter
  if (selectedGameId) {
    return (
      <div className="min-h-[600px] w-full relative">
        <BrainGameAdapter
          gameId={selectedGameId}
          patientId="patient_ravi_01"
          difficulty={activeDifficulty}
          onEvent={(evt) => {
            trackerRef.current?.recordEvent(evt);
          }}
          onComplete={handleGameComplete}
          onExit={handleExitGame}
        />

        {/* Post-Game Clinical ML Evaluation Modal */}
        {evaluatedSession && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto flex flex-col p-6 space-y-5 animate-in fade-in zoom-in-95 duration-200">
              {/* Header */}
              <div className="flex items-start justify-between border-b border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                    <Brain className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-white flex items-center gap-2">
                      Cognitive Session Evaluation
                      <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-700">
                        ML Random Tree
                      </span>
                    </h3>
                    <p className="text-xs text-slate-400">
                      Real-time behavioral telemetry captured and classified by MEDHA ML Engine
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setEvaluatedSession(null)}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* ML Predicted State Banner */}
              {evaluatedSession.mlEvaluation && (
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs text-slate-400 font-mono uppercase">Classified State:</span>
                    <span className={`text-xs font-bold font-mono px-3 py-1 rounded-full border ${
                      evaluatedSession.mlEvaluation.predictedState === 'OPTIMAL_ENGAGED'
                        ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                        : evaluatedSession.mlEvaluation.predictedState === 'COGNITIVE_FATIGUE'
                        ? 'bg-amber-950 text-amber-300 border-amber-700'
                        : evaluatedSession.mlEvaluation.predictedState === 'ATTENTIONAL_LAPSE'
                        ? 'bg-purple-950 text-purple-300 border-purple-700'
                        : 'bg-rose-950 text-rose-300 border-rose-700'
                    }`}>
                      {evaluatedSession.mlEvaluation.predictedState.replace('_', ' ')} ({(evaluatedSession.mlEvaluation.confidence * 100).toFixed(0)}% Confidence)
                    </span>
                  </div>

                  <p className="text-sm text-slate-200">
                    {evaluatedSession.mlEvaluation.recommendation.caregiverNote}
                  </p>

                  <div className="text-xs text-slate-400 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/80">
                    <strong className="text-slate-300">Adaptive Game Adjustment:</strong> {evaluatedSession.mlEvaluation.recommendation.gameAdjustment}
                  </div>
                </div>
              )}

              {/* Real Telemetry Biomarkers Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-mono block">Avg Reaction</span>
                  <span className="text-lg font-bold text-amber-300 font-mono">
                    {evaluatedSession.reaction_time_avg} ms
                  </span>
                </div>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-mono block">Hesitation Delay</span>
                  <span className="text-lg font-bold text-cyan-300 font-mono">
                    {evaluatedSession.biomarkers?.hesitationMs ?? evaluatedSession.normalizedTelemetry.hesitationMs ?? '--'} ms
                  </span>
                </div>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-mono block">Variability (CV)</span>
                  <span className="text-lg font-bold text-purple-300 font-mono">
                    {evaluatedSession.biomarkers?.reactionTimeVariability ?? evaluatedSession.normalizedTelemetry.reactionTimeVariability ?? '--'}
                  </span>
                </div>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-mono block">Accuracy</span>
                  <span className="text-lg font-bold text-emerald-400 font-mono">
                    {Math.round(evaluatedSession.accuracy * 100)}%
                  </span>
                </div>
              </div>

              {/* Primary Feature Drivers */}
              {evaluatedSession.mlEvaluation?.primaryFeatureDrivers && evaluatedSession.mlEvaluation.primaryFeatureDrivers.length > 0 && (
                <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800 text-xs">
                  <span className="text-slate-400 font-mono uppercase text-[10px] block mb-1.5 font-bold">
                    Primary ML Decision Tree Rule Triggers:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {evaluatedSession.mlEvaluation.primaryFeatureDrivers.map((d, idx) => (
                      <span
                        key={idx}
                        className="font-mono text-[11px] px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300"
                      >
                        {d.contribution}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* JSON Telemetry Inspector Toggle */}
              {showJsonTelemetry && (
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 max-h-48 overflow-y-auto font-mono text-[11px] text-emerald-400">
                  <pre>{JSON.stringify(evaluatedSession, null, 2)}</pre>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <button
                  onClick={() => setShowJsonTelemetry(!showJsonTelemetry)}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl border border-slate-700 transition cursor-pointer flex items-center gap-1.5"
                >
                  <Code className="w-3.5 h-3.5" />
                  <span>{showJsonTelemetry ? 'Hide Raw Telemetry' : 'View Raw JSON Telemetry'}</span>
                </button>

                <div className="flex items-center gap-2">
                  {onInspectInTree && (
                    <button
                      onClick={handleInspectInDecisionTree}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-md flex items-center gap-1.5"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Inspect in Decision Tree</span>
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setEvaluatedSession(null);
                      setSelectedGameId(null);
                    }}
                    className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-xl transition cursor-pointer shadow-md"
                  >
                    Back to Arcade
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  const categoryMeta: Record<string, { label: string; icon: any; color: string }> = {
    all: { label: 'All Games', icon: Brain, color: 'text-indigo-400' },
    logic: { label: 'Logic & Planning', icon: Target, color: 'text-blue-400' },
    memory: { label: 'Working Memory', icon: Brain, color: 'text-purple-400' },
    attention: { label: 'Focus & Attention', icon: Zap, color: 'text-amber-400' },
    speed: { label: 'Processing Speed', icon: Flame, color: 'text-emerald-400' },
    spatial: { label: 'Visuospatial', icon: Compass, color: 'text-cyan-400' },
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-indigo-950/50 via-slate-900 to-slate-900 rounded-2xl border border-indigo-900/40 p-5 sm:p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-indigo-400 animate-pulse" />
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-indigo-400">
                Integrated Open-Source Cognitive Library
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-100 tracking-tight flex items-center gap-2.5">
              Brain Development Games Arcade
              <span className="text-xs font-mono px-2 py-0.5 rounded-md bg-indigo-950 border border-indigo-700/60 text-indigo-300">
                21 Games Active
              </span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
              Complete suite of evidence-based cognitive training games from <span className="font-mono text-indigo-300">sojinantony01/brain-development-games</span>. All 21 games feature 10 progressive difficulty levels, standardized scoring, and continuous ML telemetry integration.
            </p>
          </div>

          {/* Quick Metrics & Leaderboard Trigger */}
          <div className="flex items-center gap-3 bg-slate-950/80 p-3 rounded-xl border border-slate-800 self-start md:self-auto">
            <div>
              <div className="text-[10px] uppercase font-mono text-slate-400">Games Mastered</div>
              <div className="text-base font-bold font-mono text-indigo-300">
                {stats.completedCount} <span className="text-xs font-sans text-slate-500">/ {stats.total}</span>
              </div>
            </div>
            <div className="h-8 w-px bg-slate-800" />
            <div>
              <div className="text-[10px] uppercase font-mono text-slate-400">Stages Cleared</div>
              <div className="text-base font-bold font-mono text-emerald-300">
                {stats.totalLevelsCleared}
              </div>
            </div>
            <div className="h-8 w-px bg-slate-800" />
            <button
              onClick={() => setShowLeaderboard(!showLeaderboard)}
              className={`p-2 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                showLeaderboard
                  ? 'bg-amber-500 text-slate-950 font-black'
                  : 'bg-slate-800 hover:bg-slate-700 text-amber-300'
              }`}
              title="Toggle Leaderboard & Certificates"
            >
              <Trophy className="w-4 h-4" />
              <span className="hidden sm:inline">Leaderboard</span>
            </button>
          </div>
        </div>
      </div>

      {/* Leaderboard Drawer if open */}
      {showLeaderboard && (
        <div className="bg-slate-900/90 border border-amber-500/40 rounded-2xl p-5 shadow-2xl animate-fade-in">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-400" />
              <h3 className="font-bold text-white text-base">Arcade Leaderboard &amp; Mastery Certificate</h3>
            </div>
            <button
              onClick={() => setShowLeaderboard(false)}
              className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded bg-slate-800"
            >
              Close
            </button>
          </div>
          <div className="bg-white rounded-xl p-4 text-slate-900 shadow-inner">
            <LeaderBoard />
          </div>
        </div>
      )}

      {/* Filters, Categories & Search */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-xl border border-slate-800/80">
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-thin">
          {['all', 'logic', 'memory', 'attention', 'speed', 'spatial'].map((catKey) => {
            const meta = categoryMeta[catKey];
            const isSelected = activeCategory === catKey;
            const Icon = meta.icon;

            return (
              <button
                key={catKey}
                onClick={() => setActiveCategory(catKey)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer whitespace-nowrap ${
                  isSelected
                    ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-600/30'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{meta.label}</span>
              </button>
            );
          })}
        </div>

        {/* Search Bar */}
        <div className="relative min-w-[200px] md:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search 21 games..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
          />
        </div>
      </div>

      {/* Games Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredGames.map((game) => {
          const gameProgress = progress[game.id];
          const hasPlayed = !!(gameProgress && gameProgress.completedLevels.length > 0);
          const bestLevel = gameProgress?.bestLevel || 0;
          const bestScore = gameProgress?.bestScore;

          const categoryColorMap: Record<string, { badge: string; border: string }> = {
            memory: { badge: 'bg-purple-950/80 text-purple-300 border-purple-800/60', border: 'hover:border-purple-500/50' },
            logic: { badge: 'bg-blue-950/80 text-blue-300 border-blue-800/60', border: 'hover:border-blue-500/50' },
            attention: { badge: 'bg-amber-950/80 text-amber-300 border-amber-800/60', border: 'hover:border-amber-500/50' },
            speed: { badge: 'bg-emerald-950/80 text-emerald-300 border-emerald-800/60', border: 'hover:border-emerald-500/50' },
            spatial: { badge: 'bg-cyan-950/80 text-cyan-300 border-cyan-800/60', border: 'hover:border-cyan-500/50' },
          };

          const styling = categoryColorMap[game.category] || {
            badge: 'bg-slate-800 text-slate-300 border-slate-700',
            border: 'hover:border-slate-600',
          };

          return (
            <div
              key={game.id}
              className={`flex flex-col justify-between bg-slate-900/70 rounded-xl p-4 border border-slate-800 ${styling.border} transition duration-200 shadow-md hover:shadow-xl hover:bg-slate-900 group`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className={`text-[10px] uppercase font-mono font-bold px-2 py-0.5 rounded-full border ${styling.badge}`}>
                    {game.category}
                  </span>
                  <div className="flex items-center gap-1.5 text-[10px] font-mono text-emerald-400/90 bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-800/40">
                    <Activity className="w-3 h-3 text-emerald-400" />
                    <span>ML Engine Connected</span>
                  </div>
                </div>

                <h3 className="text-base font-bold text-white group-hover:text-indigo-300 transition-colors">
                  {game.name}
                </h3>
                <p className="text-xs text-slate-400 mt-1.5 line-clamp-2 leading-relaxed">
                  {game.description}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                <div>
                  {hasPlayed ? (
                    <div className="flex items-center gap-1.5 text-[11px] font-mono text-emerald-400">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Level {bestLevel}/10</span>
                      {bestScore !== undefined && (
                        <span className="text-slate-400">({bestScore} pts)</span>
                      )}
                    </div>
                  ) : (
                    <span className="text-[11px] font-mono text-slate-500">
                      Ready to start
                    </span>
                  )}
                </div>

                <button
                  onClick={() => handleLaunchGame(game.id)}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg transition cursor-pointer flex items-center gap-1.5 shadow-sm group-hover:shadow-indigo-600/30"
                >
                  <Play className="w-3 h-3 fill-current" />
                  <span>Play</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {filteredGames.length === 0 && (
        <div className="p-8 text-center bg-slate-900/40 rounded-xl border border-slate-800">
          <p className="text-sm text-slate-400">No games found matching "{searchQuery}" in category "{activeCategory}".</p>
          <button
            onClick={() => {
              setActiveCategory('all');
              setSearchQuery('');
            }}
            className="mt-3 px-3 py-1.5 bg-slate-800 text-xs text-slate-200 rounded-lg hover:bg-slate-700"
          >
            Clear Filters
          </button>
        </div>
      )}
    </div>
  );
};
