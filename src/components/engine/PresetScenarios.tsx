/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Preset Clinical Scenarios
 */

import React from 'react';
import type { CognitiveTelemetry } from '../../modules/medha/types';
import { Sun, Moon, AlertTriangle, HelpCircle, Activity } from 'lucide-react';

interface PresetScenariosProps {
  onSelectScenario: (scenario: CognitiveTelemetry, name: string) => void;
  activeScenarioName: string;
}

interface Scenario {
  name: string;
  description: string;
  icon: React.ReactNode;
  data: CognitiveTelemetry;
}

const PRESETS: Scenario[] = [
  {
    name: 'Morning Alert Peak',
    description: 'Alert senior playing after breakfast. High accuracy, brisk reaction times.',
    icon: <Sun className="w-4 h-4 text-amber-400" />,
    data: {
      avgReactionTimeMs: 530,
      accuracy: 0.94,
      lapseRate: 0.04,
      fatigueDrift: 0.04,
      errorClustering: 0.04,
      baselineDeviation: -0.04,
    },
  },
  {
    name: 'Afternoon Cognitive Fatigue',
    description: 'Reaction times progressively slowing toward the end of a 15-minute session.',
    icon: <Moon className="w-4 h-4 text-indigo-400" />,
    data: {
      avgReactionTimeMs: 940,
      accuracy: 0.72,
      lapseRate: 0.14,
      fatigueDrift: 0.44,
      errorClustering: 0.20,
      baselineDeviation: 0.16,
    },
  },
  {
    name: 'Attention Wandering',
    description: 'Patient is distracted by room noise; sporadic long reaction time lapses.',
    icon: <Activity className="w-4 h-4 text-blue-400" />,
    data: {
      avgReactionTimeMs: 780,
      accuracy: 0.79,
      lapseRate: 0.35,
      fatigueDrift: 0.14,
      errorClustering: 0.12,
      baselineDeviation: 0.08,
    },
  },
  {
    name: 'Task Disorientation / Confusion',
    description: 'Difficulty mismatch causing rapid burst mistakes and frustration.',
    icon: <HelpCircle className="w-4 h-4 text-purple-400" />,
    data: {
      avgReactionTimeMs: 990,
      accuracy: 0.48,
      lapseRate: 0.22,
      fatigueDrift: 0.24,
      errorClustering: 0.54,
      baselineDeviation: 0.24,
    },
  },
  {
    name: 'Multi-Day Baseline Decline',
    description: 'Performance across speed & memory is 48% below established 14-day baseline.',
    icon: <AlertTriangle className="w-4 h-4 text-rose-400" />,
    data: {
      avgReactionTimeMs: 1450,
      accuracy: 0.58,
      lapseRate: 0.30,
      fatigueDrift: 0.28,
      errorClustering: 0.40,
      baselineDeviation: 0.48,
    },
  },
];

export const PresetScenarios: React.FC<PresetScenariosProps> = ({
  onSelectScenario,
  activeScenarioName,
}) => {
  return (
    <div className="bg-slate-900/60 rounded-xl border border-slate-800 p-4">
      <div className="text-xs font-semibold text-slate-300 mb-3 flex items-center justify-between">
        <span>Clinical Patient Test Profiles (Click to test ML response)</span>
        <span className="text-[10px] text-slate-400">Geriatric Telemetry Samples</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
        {PRESETS.map((preset) => {
          const isSelected = activeScenarioName === preset.name;
          return (
            <button
              key={preset.name}
              id={`preset-${preset.name.toLowerCase().replace(/\s+/g, '-')}`}
              onClick={() => onSelectScenario(preset.data, preset.name)}
              className={`p-3 rounded-lg border text-left transition-all cursor-pointer flex flex-col justify-between ${
                isSelected
                  ? 'bg-emerald-950/70 border-emerald-500/80 ring-1 ring-emerald-500 shadow-md'
                  : 'bg-slate-950/50 border-slate-800 hover:border-slate-700 hover:bg-slate-950/80'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <div className="p-1 rounded bg-slate-800/80">{preset.icon}</div>
                <div className="text-xs font-bold text-slate-200 truncate">{preset.name}</div>
              </div>
              <p className="text-[11px] text-slate-400 leading-snug line-clamp-2">
                {preset.description}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
};
