/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * MEDHA Caregiver Cognitive Engine Suite
 * Real-time Machine Learning Telemetry Classifier, Decision Tree Visualizer,
 * Clinical Presets, Trend Analytics, and Pipeline Architecture for Caregivers.
 */

import React, { useState, useMemo, useEffect } from 'react';
import { getDefaultCognitiveModel } from '../../modules/medha/ml';
import type { CognitiveTelemetry, DecisionTreeNode } from '../../modules/medha/types';
import { TreeVisualizer } from '../engine/TreeVisualizer';
import { TelemetrySimulator } from '../engine/TelemetrySimulator';
import { CaregiverAlertCard } from '../engine/CaregiverAlertCard';
import { PresetScenarios } from '../engine/PresetScenarios';
import { ArchitectureMap } from '../engine/ArchitectureMap';
import { CodeIntegrationGuide } from '../engine/CodeIntegrationGuide';
import { HistoricalTrendChart } from '../engine/HistoricalTrendChart';
import {
  Brain,
  Cpu,
  Layers,
  Code,
  Sparkles,
  Info,
  X,
  TrendingUp,
  Sliders,
  ShieldAlert,
  Activity,
  CheckCircle2,
} from 'lucide-react';

interface CaregiverCognitiveEngineSuiteProps {
  patientName?: string;
  initialTelemetry?: CognitiveTelemetry;
}

const DEFAULT_TELEMETRY: CognitiveTelemetry = {
  avgReactionTimeMs: 640,
  accuracy: 0.88,
  lapseRate: 0.05,
  fatigueDrift: 0.08,
  errorClustering: 0.08,
  baselineDeviation: 0.02,
  hesitationMs: 620,
  reactionTimeVariability: 0.22,
  movementHesitation: 0.14,
  postErrorRecoveryMs: 710,
};

export const CaregiverCognitiveEngineSuite: React.FC<CaregiverCognitiveEngineSuiteProps> = ({
  patientName = 'Patient',
  initialTelemetry,
}) => {
  const [telemetry, setTelemetry] = useState<CognitiveTelemetry>(initialTelemetry || DEFAULT_TELEMETRY);
  const [activeScenarioName, setActiveScenarioName] = useState<string>('Live Session Baseline');
  const [activeTab, setActiveTab] = useState<'simulator' | 'trends' | 'architecture' | 'integration'>('simulator');
  const [selectedNode, setSelectedNode] = useState<DecisionTreeNode | null>(null);

  // Sync when parent provides new inspection telemetry
  useEffect(() => {
    if (initialTelemetry) {
      setTelemetry(initialTelemetry);
      setActiveScenarioName('Live Game Telemetry Inspection');
      setActiveTab('simulator');
    }
  }, [initialTelemetry]);

  // Reactive listener for real-time game completion events across portals
  useEffect(() => {
    const handleUpdate = (e: any) => {
      const session = e?.detail;
      if (session && session.normalizedTelemetry) {
        setTelemetry(session.normalizedTelemetry);
        setActiveScenarioName(`Live: ${session.game_id || 'Game'} (${session.cognitive_domain || 'telemetry'})`);
      }
    };
    window.addEventListener('medha-sessions-updated', handleUpdate);
    return () => window.removeEventListener('medha-sessions-updated', handleUpdate);
  }, []);

  // Initialize and memoize the ML Random Tree model
  const model = useMemo(() => getDefaultCognitiveModel(), []);

  // Run real-time inference on current telemetry
  const evaluation = useMemo(() => {
    return model.evaluate(telemetry);
  }, [model, telemetry]);

  const handleSelectScenario = (scenario: CognitiveTelemetry, name: string) => {
    setTelemetry(scenario);
    setActiveScenarioName(name);
  };

  const handleTelemetryChange = (updated: CognitiveTelemetry) => {
    setTelemetry(updated);
    setActiveScenarioName('Custom Simulation');
  };

  const handleReset = () => {
    setTelemetry(initialTelemetry || DEFAULT_TELEMETRY);
    setActiveScenarioName('Reset Baseline');
  };

  const handleInspectInTree = (customTelemetry: CognitiveTelemetry) => {
    setTelemetry(customTelemetry);
    setActiveScenarioName('Live Game Telemetry Inspection');
    setActiveTab('simulator');
  };

  return (
    <div className="card p-5 sm:p-6 border-[#0E7C66]/30 bg-slate-950 text-slate-100 rounded-2xl shadow-xl space-y-6">
      {/* Header bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
            <Brain className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-lg font-extrabold tracking-tight text-white">
                ML Cognitive Engine &amp; Neuro-Telemetry Suite
              </h3>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-700/60 font-semibold">
                Random Tree v1.0
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 font-medium">
                {patientName}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Client-side gerontology machine learning classifier analyzing micro-trial latency, fatigue drift, and error clusters
            </p>
          </div>
        </div>

        {/* Engine Navigation Tabs */}
        <div className="flex items-center gap-1.5 bg-slate-900 p-1.5 rounded-xl border border-slate-800 overflow-x-auto">
          <button
            id="tab-cg-simulator"
            onClick={() => setActiveTab('simulator')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap ${
              activeTab === 'simulator'
                ? 'bg-emerald-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Simulator &amp; Tree</span>
          </button>

          <button
            id="tab-cg-trends"
            onClick={() => setActiveTab('trends')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap ${
              activeTab === 'trends'
                ? 'bg-emerald-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Progress &amp; Trends</span>
          </button>

          <button
            id="tab-cg-architecture"
            onClick={() => setActiveTab('architecture')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap ${
              activeTab === 'architecture'
                ? 'bg-emerald-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Architecture</span>
          </button>

          <button
            id="tab-cg-integration"
            onClick={() => setActiveTab('integration')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap ${
              activeTab === 'integration'
                ? 'bg-emerald-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Code className="w-3.5 h-3.5" />
            <span>Module Guide</span>
          </button>
        </div>
      </div>

      {/* Main Tab Views */}
      <div className="space-y-6">
        {/* Tab 1: Simulator & Tree Inspector */}
        {activeTab === 'simulator' && (
          <div className="space-y-6">
            {/* Quick Scenario Selector */}
            <PresetScenarios
              onSelectScenario={handleSelectScenario}
              activeScenarioName={activeScenarioName}
            />

            {/* Split Top Controls: Telemetry Sliders + Caregiver Output Card */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-6">
                <TelemetrySimulator
                  telemetry={telemetry}
                  onChange={handleTelemetryChange}
                  onReset={handleReset}
                />
              </div>
              <div className="lg:col-span-6">
                <CaregiverAlertCard evaluation={evaluation} />
              </div>
            </div>

            {/* Decision Tree Visual Graph with Real-Time Inference Path */}
            <div className="relative">
              <TreeVisualizer
                root={model.root}
                activePathNodeIds={evaluation.activePathNodeIds}
                onSelectNode={(node) => setSelectedNode(node)}
                selectedNodeId={selectedNode?.id}
              />

              {/* Node Details Modal / Drawer */}
              {selectedNode && (
                <div className="absolute top-16 right-6 z-30 w-80 bg-slate-900 border border-slate-700 rounded-xl p-4 shadow-2xl backdrop-blur-md">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-3">
                    <div className="flex items-center gap-2">
                      <Info className="w-4 h-4 text-cyan-400" />
                      <span className="text-xs font-bold text-slate-200">
                        Node Details: {selectedNode.id}
                      </span>
                    </div>
                    <button
                      onClick={() => setSelectedNode(null)}
                      className="text-slate-400 hover:text-white p-1 rounded transition cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-2 text-xs font-mono">
                    <div className="flex justify-between text-slate-300">
                      <span>Type:</span>
                      <span className="font-bold text-cyan-400">
                        {selectedNode.isLeaf ? 'Leaf Decision' : 'Split Test'}
                      </span>
                    </div>
                    {selectedNode.feature && (
                      <div className="flex justify-between text-slate-300">
                        <span>Feature Split:</span>
                        <span className="font-bold text-emerald-400">
                          {selectedNode.feature} ≤ {selectedNode.threshold}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between text-slate-300">
                      <span>Gini Impurity:</span>
                      <span>{selectedNode.impurity.toFixed(4)}</span>
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span>Samples Handled:</span>
                      <span>{selectedNode.samplesCount}</span>
                    </div>
                    {selectedNode.prediction && (
                      <div className="flex justify-between text-slate-300">
                        <span>Leaf Class:</span>
                        <span className="font-bold text-emerald-300">
                          {selectedNode.prediction}
                        </span>
                      </div>
                    )}
                  </div>

                  {selectedNode.classDistribution && (
                    <div className="mt-3 pt-2 border-t border-slate-800">
                      <div className="text-[10px] text-slate-400 mb-1.5 uppercase font-mono">
                        Class Distribution (N):
                      </div>
                      <div className="space-y-1 text-[11px] font-mono">
                        {Object.entries(selectedNode.classDistribution).map(([cls, cnt]) => (
                          <div key={cls} className="flex justify-between text-slate-300">
                            <span className="truncate max-w-[160px]">{cls}:</span>
                            <span className="font-bold">{cnt}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Historical Telemetry Trends */}
        {activeTab === 'trends' && (
          <div className="space-y-6">
            <HistoricalTrendChart onInspectInTree={handleInspectInTree} />
          </div>
        )}

        {/* Tab 3: System Architecture */}
        {activeTab === 'architecture' && <ArchitectureMap />}

        {/* Tab 4: Module Integration Guide */}
        {activeTab === 'integration' && <CodeIntegrationGuide />}
      </div>
    </div>
  );
};
