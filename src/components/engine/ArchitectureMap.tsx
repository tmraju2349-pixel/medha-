/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Visual Diagram of MEDHA Cognitive System Architecture
 */

import React from 'react';
import { Brain, Cpu, Activity, UserCheck, Sliders, LineChart, Sparkles } from 'lucide-react';

export const ArchitectureMap: React.FC = () => {
  return (
    <div className="bg-slate-900/70 rounded-xl border border-slate-800 p-5 shadow-lg">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-emerald-400" />
          <h3 className="text-base font-bold text-slate-100">
            MEDHA System Architecture &amp; ML Random Tree Integration
          </h3>
        </div>
        <span className="text-xs bg-emerald-950/80 text-emerald-300 border border-emerald-800/60 px-2.5 py-1 rounded-full font-mono">
          Clinical AI Pipeline
        </span>
      </div>

      <div className="flex flex-col gap-4 text-xs font-mono">
        {/* Layer 1: Game Modules */}
        <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800">
          <div className="text-slate-400 font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-cyan-400" />
            1. Medha Game Module (Triple Domain Cognitive Training)
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="p-2.5 rounded bg-slate-900 border border-slate-800 text-center">
              <span className="text-cyan-300 font-bold block">MEMORY GAMES</span>
              <span className="text-[11px] text-slate-400">Dual / Single N-Back &amp; Spatial Recall</span>
            </div>
            <div className="p-2.5 rounded bg-slate-900 border border-slate-800 text-center">
              <span className="text-cyan-300 font-bold block">ATTENTION GAMES</span>
              <span className="text-[11px] text-slate-400">Double Decision &amp; Useful Field of View</span>
            </div>
            <div className="p-2.5 rounded bg-slate-900 border border-slate-800 text-center">
              <span className="text-cyan-300 font-bold block">EXECUTIVE FUNCTION</span>
              <span className="text-[11px] text-slate-400">Inhibitory Control &amp; Task Switching</span>
            </div>
          </div>
        </div>

        {/* Down Arrow */}
        <div className="flex justify-center text-slate-500 font-bold">↓ Streams Micro-Trial Events</div>

        {/* Layer 2: Game Telemetry */}
        <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800">
          <div className="text-slate-400 font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-amber-400" />
            2. High-Precision Telemetry Layer
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
              <span className="text-amber-300 font-bold block">Performance Data</span>
              <span className="text-[11px] text-slate-400">Latency (ms), Accuracy (%), Fatigue Slope, Error Bursts</span>
            </div>
            <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
              <span className="text-amber-300 font-bold block">Session Data</span>
              <span className="text-[11px] text-slate-400">Time of Day, Session Length, Adherence Streaks</span>
            </div>
          </div>
        </div>

        {/* Down Arrow */}
        <div className="flex justify-center text-slate-500 font-bold">↓ Calibrated with Personal Baseline</div>

        {/* Layer 3: Cognitive Engine with ML Random Tree */}
        <div className="bg-emerald-950/30 p-4 rounded-lg border-2 border-emerald-500/60 shadow-[0_0_20px_rgba(16,185,129,0.15)]">
          <div className="text-emerald-300 font-bold uppercase tracking-wider mb-2 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-emerald-400" />
              3. Cognitive Engine (Powered by ML Random Tree / Forest)
            </span>
            <span className="bg-emerald-500 text-slate-950 text-[10px] px-2 py-0.5 rounded font-bold">
              ACTIVE HERE
            </span>
          </div>
          <p className="text-slate-300 text-xs font-sans leading-relaxed mb-3">
            The <strong>Random Tree ML Module</strong> executes client-side during active gameplay. It evaluates Gini-split decision paths across the 6 telemetry features to diagnose cognitive state in &lt;1ms without cloud latency.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="p-2.5 rounded bg-slate-900 border border-emerald-800/60">
              <div className="flex items-center gap-1.5 text-emerald-300 font-bold mb-1">
                <Sliders className="w-3.5 h-3.5" />
                Difficulty Adjustment
              </div>
              <p className="text-[11px] text-slate-400 font-sans">
                Adapts speed-of-processing stimulus duration (ms), distractor count, and enforces gentle warm-downs.
              </p>
            </div>
            <div className="p-2.5 rounded bg-slate-900 border border-emerald-800/60">
              <div className="flex items-center gap-1.5 text-emerald-300 font-bold mb-1">
                <LineChart className="w-3.5 h-3.5" />
                Trend &amp; Score Analysis
              </div>
              <p className="text-[11px] text-slate-400 font-sans">
                Tracks 14-day rolling baselines to detect subtle decline signals before standard clinical checkups.
              </p>
            </div>
          </div>
        </div>

        {/* Down Arrow */}
        <div className="flex justify-center text-slate-500 font-bold">↓ Generates Prescriptive Guidance</div>

        {/* Layer 4: Caregiver Dashboard */}
        <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800">
          <div className="text-slate-400 font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <UserCheck className="w-3.5 h-3.5 text-indigo-400" />
            4. Caregiver Dashboard &amp; Clinical Alerts
          </div>
          <p className="text-slate-300 text-xs font-sans leading-relaxed">
            Translates complex machine learning probabilities into compassionate, plain-English notifications for family caregivers and geriatric specialists (e.g. fatigue prompts, hydration reminders, and clinical consultation alerts).
          </p>
        </div>
      </div>
    </div>
  );
};
