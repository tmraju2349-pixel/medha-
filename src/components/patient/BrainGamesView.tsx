/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Patient Cognitive Portal - MEDHA Game Engine
 * Standardized 3D Clinical Instruments & 21 Brain Development Games Arcade.
 */

import React, { useState } from 'react';
import {
  Brain,
  Sparkles,
  BarChart3,
  Award,
  Flame,
  CheckCircle2,
  Heart,
  Volume2,
} from 'lucide-react';
import { useMedha } from '../../context/MedhaContext';
import { t } from '../../services/i18n';
import { GameHub } from '../games/GameHub';
import { AnalysisModal } from '../modals/AnalysisModal';
import { localRepository } from '../../services/storage/localRepository';
import { syncManager } from '../../services/storage/syncManager';
import { saveSessionLocally } from '../../modules/medha/games/gameService';
import type { StandardSessionData } from '../../modules/medha/games/types';
import type { GameSession } from '../../types/medha';

interface BrainGamesViewProps {
  onOpenAnalysis?: () => void;
}

export const BrainGamesView: React.FC<BrainGamesViewProps> = () => {
  const { db, addToast, updateDb, speakText, selectedGameToLaunch, setSelectedGameToLaunch } = useMedha();
  const [analysisOpen, setAnalysisOpen] = useState(false);

  const pendingCount = localRepository.getPendingSyncItems().length;

  // Compute daily patient progress stats
  const sessions = db.gameSessions || [];
  const today = new Date().toISOString().slice(0, 10);
  const todaySessions = sessions.filter((s) => {
    const sessionTime = s.completedAt || s.startedAt;
    if (!sessionTime) return false;
    const sessionDate = new Date(sessionTime).toISOString().slice(0, 10);
    return sessionDate === today;
  });

  const dailyGoal = 3;
  const completedToday = todaySessions.length;
  const starsEarned = Math.min(dailyGoal, completedToday);

  // Mean score across recent sessions
  const recentScores = sessions.slice(-5);
  const avgScore = recentScores.length > 0
    ? Math.round(recentScores.reduce((acc, s) => acc + (s.score || 75), 0) / recentScores.length)
    : 85;

  const handleSessionComplete = (session: StandardSessionData) => {
    // 1. Update MedhaContext persistent state across all modules
    updateDb((prev) => {
      const currentSessions = prev.gameSessions || [];
      const newSessionRecord: GameSession = {
        sessionId: session.session_id,
        patientId: session.patient_id || 'patient_01',
        gameId: session.game_id,
        cognitiveDomains: [session.cognitive_domain],
        difficulty: session.difficulty_level,
        score: session.score,
        accuracy: session.accuracy,
        correctAnswers: session.correct_answers || 0,
        incorrectAnswers: session.incorrect_answers || 0,
        attempts: session.attempts || 1,
        hintsUsed: session.hints_used || 0,
        averageReactionTime: (session.reaction_time_avg || 600) / 1000,
        motorStabilityScore: Math.round(
          100 - (session.normalizedTelemetry?.reactionTimeVariability || 0.15) * 100
        ),
        fatigueIndex: (session.normalizedTelemetry?.fatigueDrift || 0.05) * 10,
        completionTime: session.completion_time || 60,
        completed: session.completed,
        startedAt: (session.timestamp || Date.now()) - (session.completion_time || 60) * 1000,
        completedAt: session.timestamp || Date.now(),
        mlInterventions: session.mlEvaluation
          ? [
              {
                timestamp: Date.now(),
                type: session.score >= 70 ? 'level_promote' : 'target_assist',
                previousLevel: session.difficulty_level,
                newLevel: Math.max(1, session.difficulty_level + (session.score >= 70 ? 1 : 0)),
                reason:
                  session.mlEvaluation.recommendation?.caregiverNote ||
                  'Optimal therapeutic stimulation maintained',
              },
            ]
          : [],
      };

      // Persist to localRepository storage queue
      localRepository.saveGameSession(newSessionRecord);

      // Advance unlocked level if completed with good score
      const newLevels = {
        ...prev.levels,
        [session.game_id]: Math.max(
          prev.levels[session.game_id] || 1,
          session.difficulty_level + (session.score >= 70 ? 1 : 0)
        ),
      };

      // Update gameLog for real-time caregiver table
      const newGameLog = [
        {
          game: session.game_id,
          score: session.score,
          ts: session.timestamp || Date.now(),
        },
        ...(prev.gameLog || []),
      ].slice(0, 50);

      // Dynamically update the 14-day cognitive score history
      const scoresCopy = [...(prev.scores || [])];
      if (scoresCopy.length > 0) {
        const lastIdx = scoresCopy.length - 1;
        const lastScore = { ...scoresCopy[lastIdx] };
        const domain = session.cognitive_domain;
        const rtSeconds = (session.reaction_time_avg || 600) / 1000;
        const speedVal = Math.min(100, Math.max(30, Math.round(110 - rtSeconds * 100)));

        if (
          domain === 'attention' ||
          domain === 'processing_speed' ||
          (domain as string) === 'speed'
        ) {
          lastScore.speed = Math.round(lastScore.speed * 0.7 + speedVal * 0.3);
          lastScore.attention = Math.round(lastScore.attention * 0.7 + session.score * 0.3);
        } else if (domain === 'memory' || (domain as string) === 'working_memory') {
          lastScore.memory = Math.round(lastScore.memory * 0.7 + session.score * 0.3);
        }
        scoresCopy[lastIdx] = lastScore;
      }

      return {
        ...prev,
        gameSessions: [...currentSessions, newSessionRecord],
        gameLog: newGameLog,
        scores: scoresCopy,
        levels: newLevels,
      };
    });

    // 2. Save into Recharts offline session repository
    saveSessionLocally(session);

    // 3. Trigger remote database sync if connected
    syncManager.triggerSync();

    // 4. Dispatch events for real-time dashboard listeners
    window.dispatchEvent(new CustomEvent('medha-sessions-updated', { detail: session }));
    window.dispatchEvent(new Event('progress-updated'));
    window.dispatchEvent(new Event('storage'));

    // 5. Play gentle celebratory message
    addToast(
      `Wonderful work! Scored ${session.score} pts · ${session.cognitive_domain.toUpperCase()} trained & saved to Caregiver dashboard!`,
      '🌟'
    );

    // 6. Audio encouragement if enabled
    if (db.settings.voice) {
      speakText(`Well done! You scored ${session.score} points and trained your brain beautifully.`);
    }
  };

  return (
    <section id="page-games" className="page active space-y-6">
      {/* Offline sync alert banner if pending items */}
      {pendingCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 text-amber-900 px-4 py-3 rounded-xl text-xs font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-amber-500 animate-ping" />
            <span>
              Offline active — {pendingCount} game {pendingCount === 1 ? 'session' : 'sessions'} stored locally on device.
            </span>
          </div>
          <span className="text-[11px] font-mono text-amber-700 bg-amber-100 px-2 py-0.5 rounded">
            Auto-syncs on reconnect
          </span>
        </div>
      )}

      {/* Patient Cognitive Header & Daily Motivation */}
      <div
        id="games-header-banner"
        className="p-5 sm:p-7 text-white rounded-2xl shadow-md border border-[#0A5C4C] relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #074236 0%, #0E7C66 55%, #12907A 100%)' }}
      >
        {/* Subtle decorative background flourishes */}
        <svg
          className="absolute -right-8 -top-8 opacity-20 pointer-events-none"
          width="200"
          height="200"
          viewBox="0 0 100 100"
        >
          <circle cx="50" cy="50" r="42" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeDasharray="6 4" />
          <path d="M50 12 L50 88 M12 50 L88 50" stroke="#FFFFFF" strokeWidth="1.5" />
        </svg>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm text-xs font-bold text-white tracking-wide uppercase shadow-sm">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                {t('brain_gym', db.settings.lang)}
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/40 backdrop-blur-sm text-emerald-200 text-xs font-mono font-bold border border-emerald-500/40">
                <Flame className="w-3.5 h-3.5 text-amber-400" />
                3 Day Streak
              </span>
            </div>

            <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-white drop-shadow-sm">
              Daily Brain Vitality &amp; Cognitive Games
            </h2>
            <p className="text-white/95 text-xs sm:text-sm max-w-xl leading-relaxed font-medium">
              Strengthen memory, visual attention, and processing speed with 3D clinical instruments and 21 interactive brain games. Difficulty automatically adapts to keep training comfortable.
            </p>
          </div>

          {/* Daily Goal Stars Card with High-Contrast Dark Translucent Backing */}
          <div className="flex items-center gap-4 bg-black/35 backdrop-blur-md p-4 rounded-xl border border-white/20 shrink-0 shadow-lg">
            <div className="text-center">
              <div className="text-[11px] font-bold uppercase tracking-wider text-white/85">
                Today's Goal
              </div>
              <div className="flex items-center justify-center gap-1 mt-1 text-amber-300 text-lg">
                {[1, 2, 3].map((star) => (
                  <span
                    key={`star-${star}`}
                    className={`transition-transform duration-300 ${
                      star <= starsEarned ? 'scale-110 text-amber-300' : 'opacity-35 text-white'
                    }`}
                  >
                    ★
                  </span>
                ))}
              </div>
              <p className="text-[10px] text-white/80 font-mono mt-0.5 font-bold">
                {completedToday}/{dailyGoal} completed
              </p>
            </div>

            <div className="h-10 w-px bg-white/25" />

            <div className="text-center">
              <div className="text-[11px] font-bold uppercase tracking-wider text-white/85">
                Cognitive Vitality
              </div>
              <div className="font-display text-2xl font-bold text-white mt-0.5">
                {avgScore}<span className="text-xs text-emerald-300 font-sans">/100</span>
              </div>
              <button
                onClick={() => setAnalysisOpen(true)}
                className="mt-1 text-[11px] font-bold text-emerald-200 hover:text-white underline flex items-center justify-center gap-1 cursor-pointer"
              >
                <BarChart3 className="w-3 h-3" />
                <span>View Report</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Complete MEDHA Game Engine Hub (Core 3D Instruments + 21 Brain Development Games) */}
      <div className="pt-2">
        <GameHub
          initialGameId={selectedGameToLaunch}
          onClearInitialGameId={() => setSelectedGameToLaunch(null)}
          onSessionComplete={handleSessionComplete}
        />
      </div>

      {/* Cognitive Report Modal */}
      <AnalysisModal
        isOpen={analysisOpen}
        onClose={() => setAnalysisOpen(false)}
      />
    </section>
  );
};
