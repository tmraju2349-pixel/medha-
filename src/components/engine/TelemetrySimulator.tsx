/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Live Patient Telemetry Simulator
 */

import React from 'react';
import type { CognitiveTelemetry } from '../../modules/medha/types';
import { FEATURE_METADATA } from '../../modules/medha/ml/trainingData';
import { Activity, Gauge, Zap, AlertCircle, Compass, BarChart3, Timer, Move, RotateCcw, Sparkles } from 'lucide-react';

interface TelemetrySimulatorProps {
  telemetry: CognitiveTelemetry;
  onChange: (updated: CognitiveTelemetry) => void;
  onReset: () => void;
}

const FEATURE_ICONS: Record<keyof CognitiveTelemetry, React.ReactNode> = {
  avgReactionTimeMs: <Zap className="w-4 h-4 text-amber-400" />,
  accuracy: <Gauge className="w-4 h-4 text-emerald-400" />,
  fatigueDrift: <Activity className="w-4 h-4 text-rose-400" />,
  lapseRate: <AlertCircle className="w-4 h-4 text-blue-400" />,
  errorClustering: <BarChart3 className="w-4 h-4 text-purple-400" />,
  baselineDeviation: <Compass className="w-4 h-4 text-cyan-400" />,
  hesitationMs: <Timer className="w-4 h-4 text-cyan-400" />,
  reactionTimeVariability: <Sparkles className="w-4 h-4 text-indigo-400" />,
  movementHesitation: <Move className="w-4 h-4 text-yellow-400" />,
  postErrorRecoveryMs: <RotateCcw className="w-4 h-4 text-orange-400" />,
};

export const TelemetrySimulator: React.FC<TelemetrySimulatorProps> = ({
  telemetry,
  onChange,
  onReset,
}) => {
  const handleSliderChange = (key: keyof CognitiveTelemetry, value: number) => {
    onChange({
      ...telemetry,
      [key]: value,
    });
  };

  return (
    <div className="bg-slate-900/80 rounded-xl border border-slate-800 p-5 shadow-lg backdrop-blur-sm">
      <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
        <div>
          <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
            <Activity className="w-5 h-5 text-emerald-400" />
            Live Game Telemetry Controller
          </h2>
          <p className="text-xs text-slate-400">
            Simulate real-time psychometric telemetry from memory and attention game trials
          </p>
        </div>
        <button
          id="reset-telemetry-btn"
          onClick={onReset}
          className="text-xs px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white transition cursor-pointer"
        >
          Reset Baseline
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
        {(Object.keys(FEATURE_METADATA) as (keyof CognitiveTelemetry)[]).map((key) => {
          const meta = FEATURE_METADATA[key];
          const val = telemetry[key] ?? meta.min;
          const icon = FEATURE_ICONS[key];

          // Format value display
          let displayVal = `${val}`;
          if (key === 'avgReactionTimeMs' || key === 'hesitationMs' || key === 'postErrorRecoveryMs') {
            displayVal = `${Math.round(val)} ms`;
          } else if (key === 'accuracy' || key === 'lapseRate') {
            displayVal = `${Math.round(val * 100)}%`;
          } else if (key === 'fatigueDrift' || key === 'baselineDeviation') {
            displayVal = `${val >= 0 ? '+' : ''}${Math.round(val * 100)}%`;
          } else if (key === 'reactionTimeVariability') {
            displayVal = `CV ${Number(val).toFixed(2)}`;
          } else {
            displayVal = `${Number(val).toFixed(2)}`;
          }

          return (
            <div
              key={String(key)}
              className="bg-slate-950/60 rounded-lg p-3 border border-slate-800/70 hover:border-slate-700 transition"
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  {icon}
                  <label htmlFor={`slider-${String(key)}`} className="text-xs font-medium text-slate-200">
                    {meta.name}
                  </label>
                </div>
                <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800/60">
                  {displayVal}
                </span>
              </div>

              <input
                id={`slider-${String(key)}`}
                type="range"
                min={meta.min}
                max={meta.max}
                step={meta.step}
                value={val}
                onChange={(e) => handleSliderChange(key, parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-400"
              />

              <div className="flex justify-between items-center mt-1 text-[10px] text-slate-400 font-mono">
                <span>{meta.min}{meta.unit}</span>
                <span className="text-slate-400 truncate max-w-[170px] text-right" title={meta.description}>
                  {meta.description}
                </span>
                <span>{meta.max}{meta.unit}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
