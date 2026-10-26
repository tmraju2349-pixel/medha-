/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Caregiver Alert & Cognitive Engine Decision Card
 */

import React from 'react';
import type { CognitiveEvaluation, CognitiveState } from '../../modules/medha/types';
import {
  ShieldAlert,
  CheckCircle2,
  Coffee,
  Eye,
  HelpCircle,
  Sliders,
  BellRing,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

interface CaregiverAlertCardProps {
  evaluation: CognitiveEvaluation;
}

const STATE_CONFIG: Record<
  CognitiveState,
  {
    title: string;
    badgeBg: string;
    badgeText: string;
    border: string;
    icon: React.ReactNode;
    statusSeverity: 'normal' | 'notice' | 'warning' | 'critical';
  }
> = {
  OPTIMAL_ENGAGED: {
    title: 'Optimal Cognitive Engagement',
    badgeBg: 'bg-emerald-500/15',
    badgeText: 'text-emerald-400',
    border: 'border-emerald-500/40',
    icon: <CheckCircle2 className="w-5 h-5 text-emerald-400" />,
    statusSeverity: 'normal',
  },
  COGNITIVE_FATIGUE: {
    title: 'Mental Exhaustion / Cognitive Fatigue',
    badgeBg: 'bg-amber-500/15',
    badgeText: 'text-amber-400',
    border: 'border-amber-500/40',
    icon: <Coffee className="w-5 h-5 text-amber-400" />,
    statusSeverity: 'notice',
  },
  ATTENTIONAL_LAPSE: {
    title: 'Transient Attentional Lapse',
    badgeBg: 'bg-blue-500/15',
    badgeText: 'text-blue-400',
    border: 'border-blue-500/40',
    icon: <Eye className="w-5 h-5 text-blue-400" />,
    statusSeverity: 'notice',
  },
  CONFUSION_OVERLOAD: {
    title: 'Task Overload / Disorientation',
    badgeBg: 'bg-purple-500/15',
    badgeText: 'text-purple-400',
    border: 'border-purple-500/40',
    icon: <HelpCircle className="w-5 h-5 text-purple-400" />,
    statusSeverity: 'warning',
  },
  POTENTIAL_DECLINE: {
    title: 'Multi-Day Baseline Deviation Alert',
    badgeBg: 'bg-rose-500/15',
    badgeText: 'text-rose-400',
    border: 'border-rose-500/40',
    icon: <ShieldAlert className="w-5 h-5 text-rose-400" />,
    statusSeverity: 'critical',
  },
};

export const CaregiverAlertCard: React.FC<CaregiverAlertCardProps> = ({ evaluation }) => {
  const { predictedState, confidence, classProbabilities, primaryFeatureDrivers, recommendation } =
    evaluation;
  const config = STATE_CONFIG[predictedState];

  return (
    <div
      id="caregiver-alert-card"
      className={`rounded-xl border p-5 bg-slate-900/90 shadow-xl backdrop-blur-sm transition-all duration-300 ${config.border}`}
    >
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl ${config.badgeBg} border ${config.border}`}>
            {config.icon}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                Cognitive Engine State
              </span>
              <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold uppercase ${config.badgeBg} ${config.badgeText}`}>
                {predictedState.replace('_', ' ')}
              </span>
            </div>
            <h3 className="text-lg font-bold text-slate-100">{config.title}</h3>
          </div>
        </div>

        {/* Confidence Meter */}
        <div className="flex items-center gap-3 bg-slate-950/70 px-3.5 py-2 rounded-lg border border-slate-800">
          <Sparkles className="w-4 h-4 text-emerald-400" />
          <div>
            <div className="text-[10px] font-mono text-slate-400">Model Confidence</div>
            <div className="text-sm font-bold text-emerald-300">
              {Math.round(confidence * 100)}% Match
            </div>
          </div>
        </div>
      </div>

      {/* Probability Distribution */}
      <div className="my-4">
        <div className="text-xs font-semibold text-slate-300 mb-2 flex items-center justify-between">
          <span>Class Probabilities (Random Tree Leaves)</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {(Object.keys(classProbabilities) as CognitiveState[]).map((cls) => {
            const prob = classProbabilities[cls];
            const isWinner = cls === predictedState;
            return (
              <div
                key={cls}
                className={`p-2 rounded-lg border text-center transition ${
                  isWinner
                    ? `${STATE_CONFIG[cls].badgeBg} ${STATE_CONFIG[cls].border} border-2`
                    : 'bg-slate-950/40 border-slate-800/80 opacity-60'
                }`}
              >
                <div className="text-[10px] font-mono text-slate-400 truncate" title={cls}>
                  {cls.split('_')[0]}
                </div>
                <div
                  className={`text-xs font-bold ${
                    isWinner ? STATE_CONFIG[cls].badgeText : 'text-slate-300'
                  }`}
                >
                  {Math.round(prob * 100)}%
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Explainable AI Decision Trail */}
      <div className="bg-slate-950/70 rounded-lg p-3.5 border border-slate-800 mb-4">
        <div className="text-xs font-semibold text-slate-300 mb-2 flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-cyan-400" />
          Explainable Inference Rule Trail:
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
          {primaryFeatureDrivers.map((driver, idx) => (
            <React.Fragment key={idx}>
              <span className="px-2.5 py-1 rounded bg-slate-800/90 text-cyan-300 border border-slate-700">
                {driver.contribution}
              </span>
              {idx < primaryFeatureDrivers.length - 1 && (
                <ArrowRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Two Action Columns: Game Adaptive Adjustment & Caregiver Alert */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Game Engine Action */}
        <div className="bg-slate-950/60 rounded-xl p-3.5 border border-emerald-900/40">
          <div className="flex items-center gap-2 mb-2">
            <Sliders className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold text-emerald-300 uppercase tracking-wide">
              Automated Game Difficulty Adjustment
            </span>
          </div>
          <p className="text-xs text-slate-200 font-medium mb-1">
            Action: <span className="text-emerald-400 font-bold">{recommendation.action}</span>
          </p>
          <p className="text-xs text-slate-400 leading-relaxed">
            {recommendation.gameAdjustment}
          </p>
        </div>

        {/* Caregiver Notice */}
        <div className="bg-slate-950/60 rounded-xl p-3.5 border border-amber-900/40">
          <div className="flex items-center gap-2 mb-2">
            <BellRing className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-bold text-amber-300 uppercase tracking-wide">
              Caregiver Insight &amp; Action
            </span>
          </div>
          <p className="text-xs text-slate-200 font-medium mb-1">
            Clinical Note:
          </p>
          <p className="text-xs text-slate-400 leading-relaxed">
            {recommendation.caregiverNote}
          </p>
        </div>
      </div>
    </div>
  );
};
