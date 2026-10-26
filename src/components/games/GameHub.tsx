/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Game Hub & Cognitive Assessment Suite Portal
 * Browse, select, and launch standardized cognitive games:
 * - 3D WebGL Clinical Instruments (Celestial Horizon, Spatial Cubes, Focus Spotlight, Memory Pairs)
 * - 21 Brain Development Games Arcade (from sojinantony01/brain-development-games)
 */

import React, { useState, useEffect, useMemo } from 'react';
import { getAllGames, getGameById } from '../../modules/medha/games/registry';
import type { GameRegistryItem, StandardSessionData } from '../../modules/medha/games/types';
import type { CognitiveTelemetry } from '../../modules/medha/types';
import { getStoredSessions, getPatientBaseline } from '../../modules/medha/games/gameService';
import { GameModal } from './GameModal';
import { BrainGamesPortal } from '../../modules/brain-games/components/BrainGamesPortal';
import { useMedha } from '../../context/MedhaContext';
import {
  Brain,
  Zap,
  Sliders,
  Play,
  Clock,
  Award,
  History,
  Activity,
  CheckCircle2,
  Sparkles,
  Compass,
  Box,
  Layers,
  Search,
} from 'lucide-react';

interface GameHubProps {
  initialGameId?: string | null;
  onClearInitialGameId?: () => void;
  onSessionComplete?: (session: StandardSessionData) => void;
  onInspectInTree?: (telemetry: CognitiveTelemetry) => void;
}

export const GameHub: React.FC<GameHubProps> = ({
  initialGameId,
  onClearInitialGameId,
  onSessionComplete,
  onInspectInTree,
}) => {
  const { currentPatient, db } = useMedha();
  const [activeGameItem, setActiveGameItem] = useState<GameRegistryItem | null>(null);
  const [hubMode, setHubMode] = useState<'core_3d' | 'brain_arcade' | 'all'>('core_3d');
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [sessions, setSessions] = useState<StandardSessionData[]>([]);
  const [baseline, setBaseline] = useState<{ avgReactionTimeMs: number; avgAccuracy: number; totalSessions: number }>({
    avgReactionTimeMs: 640,
    avgAccuracy: 0.88,
    totalSessions: 0,
  });

  const allGames = getAllGames();

  // Handle external launch trigger
  useEffect(() => {
    if (initialGameId) {
      const cleanId = initialGameId.toLowerCase().replace(/-/g, '_');
      const found = allGames.find(
        (g) =>
          g.descriptor.gameId.toLowerCase() === cleanId ||
          g.descriptor.gameId.toLowerCase() === `bg_${cleanId}` ||
          g.descriptor.gameId.toLowerCase().replace('bg_', '') === cleanId
      );
      if (found) {
        setActiveGameItem(found);
        if (found.descriptor.gameId.startsWith('bg_')) {
          setHubMode('brain_arcade');
        } else {
          setHubMode('core_3d');
        }
        onClearInitialGameId?.();
      }
    }
  }, [initialGameId, allGames, onClearInitialGameId]);

  // Distinguish core 3D / standard instruments vs brain arcade games
  const coreGameIds = ['focus_spotlight', 'memory_pairs', 'day_night_switch', 'spatial_cubes'];
  const coreGames = useMemo(
    () => allGames.filter((g) => coreGameIds.includes(g.descriptor.gameId)),
    [allGames]
  );

  const displayedGames = useMemo(() => {
    let list = allGames;
    if (hubMode === 'core_3d') {
      list = coreGames;
    }
    if (!searchFilter.trim()) return list;
    return list.filter(
      (g) =>
        g.descriptor.gameName.toLowerCase().includes(searchFilter.toLowerCase()) ||
        g.descriptor.description.toLowerCase().includes(searchFilter.toLowerCase()) ||
        g.descriptor.primaryDomain.toLowerCase().includes(searchFilter.toLowerCase())
    );
  }, [allGames, coreGames, hubMode, searchFilter]);

  const refreshSessions = () => {
    const pid = currentPatient?.id || db.book.profile.name || 'patient_01';
    const loaded = getStoredSessions().filter(s => s.patient_id === pid);
    setSessions(loaded);
    setBaseline(getPatientBaseline(pid));
  };

  useEffect(() => {
    refreshSessions();
    const handleUpdate = () => refreshSessions();
    window.addEventListener('medha-sessions-updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    window.addEventListener('progress-updated', handleUpdate);
    return () => {
      window.removeEventListener('medha-sessions-updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
      window.removeEventListener('progress-updated', handleUpdate);
    };
  }, [currentPatient?.id, db.book.profile.name]);

  const handleGameComplete = (session: StandardSessionData) => {
    refreshSessions();
    onSessionComplete?.(session);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Clinical Objective */}
      <div className="bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900 rounded-2xl border border-emerald-900/40 p-5 sm:p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-400">
                Cognitive Training &amp; Assessment Ecosystem
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-100 tracking-tight">
              MEDHA Clinical Game Suite
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
              Standardized evidence-based assessment instruments. Includes immersive 3D WebGL tasks (Celestial Horizon &amp; Spatial Cubes) plus the 21-game Brain Development arcade. Micro-telemetry feeds directly into the ML Random Tree classifier.
            </p>
          </div>

          {/* Quick Baseline Snapshot */}
          <div className="flex items-center gap-4 bg-slate-950/80 p-3.5 rounded-xl border border-slate-800">
            <div>
              <div className="text-[10px] uppercase font-mono text-slate-400">Personal Baseline</div>
              <div className="text-base font-bold font-mono text-amber-300">
                {baseline.avgReactionTimeMs} <span className="text-xs font-sans text-slate-400">ms</span>
              </div>
            </div>
            <div className="h-8 w-px bg-slate-800" />
            <div>
              <div className="text-[10px] uppercase font-mono text-slate-400">Accuracy Rate</div>
              <div className="text-base font-bold font-mono text-emerald-300">
                {Math.round(baseline.avgAccuracy * 100)}%
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Hub Mode Navigation Tabs */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900/90 p-2 rounded-xl border border-slate-800">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <button
            id="hub-tab-core"
            onClick={() => setHubMode('core_3d')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap ${
              hubMode === 'core_3d'
                ? 'bg-emerald-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>3D &amp; Core Instruments (4)</span>
          </button>
          <button
            id="hub-tab-arcade"
            onClick={() => setHubMode('brain_arcade')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap ${
              hubMode === 'brain_arcade'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Brain className="w-4 h-4" />
            <span>Brain Development Arcade (21)</span>
          </button>
          <button
            id="hub-tab-all"
            onClick={() => setHubMode('all')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap ${
              hubMode === 'all'
                ? 'bg-slate-700 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>All Instruments ({allGames.length})</span>
          </button>
        </div>

        {hubMode !== 'brain_arcade' && (
          <div className="relative min-w-[200px] sm:w-56">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Filter instruments..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>
        )}
      </div>

      {/* Mode 1: Dedicated Brain Games Arcade View */}
      {hubMode === 'brain_arcade' ? (
        <BrainGamesPortal
          onSessionComplete={handleGameComplete}
          onInspectInTree={onInspectInTree}
        />
      ) : (
        /* Mode 2: Grid for 3D Core or All games */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {displayedGames.map((item) => {
            const { descriptor, accentColor } = item;
            const is3D =
              descriptor.gameId === 'day_night_switch' ||
              descriptor.gameId === 'spatial_cubes';

            return (
              <div
                key={descriptor.gameId}
                id={`game-card-${descriptor.gameId}`}
                className="bg-slate-900/90 rounded-2xl border border-slate-800 hover:border-slate-700 p-5 flex flex-col justify-between transition-all duration-300 shadow-lg hover:shadow-2xl group"
              >
                <div>
                  {/* Header Icon + Domain Badge */}
                  <div className="flex items-start justify-between mb-4">
                    <div className={`p-3 rounded-xl bg-gradient-to-br ${accentColor} border shadow-md`}>
                      {descriptor.primaryDomain === 'attention' && <Zap className="w-5 h-5" />}
                      {descriptor.primaryDomain === 'memory' && <Brain className="w-5 h-5" />}
                      {descriptor.primaryDomain === 'executive_function' && <Sliders className="w-5 h-5" />}
                      {descriptor.primaryDomain === 'processing_speed' && <Activity className="w-5 h-5" />}
                      {descriptor.primaryDomain === 'visuospatial' && <Compass className="w-5 h-5" />}
                    </div>
                    <div className="flex items-center gap-1.5">
                      {is3D && (
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-700/60">
                          3D WebGL
                        </span>
                      )}
                      <div className="flex items-center gap-1 text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-800">
                        <Activity className="w-3 h-3" />
                        <span>ML Connected</span>
                      </div>
                    </div>
                  </div>

                  <h3 className="text-lg font-bold text-slate-100 group-hover:text-emerald-400 transition-colors">
                    {descriptor.gameName}
                  </h3>
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed min-h-[44px]">
                    {descriptor.description}
                  </p>

                  {/* Secondary Domains */}
                  <div className="flex flex-wrap gap-1.5 my-4">
                    {descriptor.cognitiveDomains.map((dom) => (
                      <span
                        key={dom}
                        className="text-[10px] px-2 py-0.5 rounded-md bg-slate-950 text-slate-400 border border-slate-800/80"
                      >
                        {dom.replace('_', ' ')}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Card Footer: Metadata + Start Button */}
                <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                    <Clock className="w-3.5 h-3.5" />
                    <span>~{descriptor.estimatedDuration} mins</span>
                  </div>

                  <button
                    id={`btn-launch-${descriptor.gameId}`}
                    onClick={() => setActiveGameItem(item)}
                    className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-md active:scale-95"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    Play Game
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Recent Local Session Activity */}
      {sessions.length > 0 && (
        <div className="bg-slate-900/80 rounded-2xl border border-slate-800 p-5 shadow-xl">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-bold text-slate-200">
                Recent Game Sessions Log (Offline-First Cache)
              </h3>
            </div>
            <span className="text-xs text-slate-400 font-mono">
              {sessions.length} sessions logged locally
            </span>
          </div>

          <div className="overflow-x-auto max-h-48 overflow-y-auto rounded-lg border border-slate-800 bg-slate-950/60 text-xs font-mono">
            <table className="w-full text-left">
              <thead className="bg-slate-900 text-slate-400 sticky top-0 text-[11px] border-b border-slate-800">
                <tr>
                  <th className="p-2.5">Game</th>
                  <th className="p-2.5">Domain</th>
                  <th className="p-2.5">Level</th>
                  <th className="p-2.5">Reaction Time</th>
                  <th className="p-2.5">Hesitation</th>
                  <th className="p-2.5">Accuracy</th>
                  <th className="p-2.5">ML Status</th>
                  <th className="p-2.5">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {sessions.slice(0, 8).map((s, index) => (
                  <tr key={`${s.session_id}-${index}`} className="hover:bg-slate-900/50">
                    <td className="p-2.5 font-bold text-slate-200">{s.game_id}</td>
                    <td className="p-2.5 text-cyan-300">{s.cognitive_domain}</td>
                    <td className="p-2.5">Lvl {s.difficulty_level}</td>
                    <td className="p-2.5 font-bold text-amber-300">{s.reaction_time_avg} ms</td>
                    <td className="p-2.5 text-cyan-300">
                      {s.biomarkers?.hesitationMs ?? s.normalizedTelemetry.hesitationMs ?? '--'} ms
                    </td>
                    <td className="p-2.5 font-bold text-emerald-400">{Math.round(s.accuracy * 100)}%</td>
                    <td className="p-2.5">
                      <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300">
                        {s.mlEvaluation?.predictedState.replace('_', ' ') || 'PROCESSED'}
                      </span>
                    </td>
                    <td className="p-2.5 text-slate-400">
                      {new Date(s.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Active Game Modal */}
      {activeGameItem && (
        <GameModal
          gameItem={activeGameItem}
          patientId="patient_ravi_01"
          onClose={() => setActiveGameItem(null)}
          onSessionComplete={handleGameComplete}
          onInspectInTree={onInspectInTree}
        />
      )}
    </div>
  );
};
