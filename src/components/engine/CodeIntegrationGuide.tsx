/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Code Integration Guide for importing MEDHA ML Module
 */

import React, { useState } from 'react';
import { Copy, Check, Code2, Terminal } from 'lucide-react';

export const CodeIntegrationGuide: React.FC = () => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const SNIPPET_1 = `// 1. Import the MEDHA Cognitive ML Module
import { 
  classifyTelemetry, 
  RandomTree, 
  type CognitiveTelemetry 
} from './modules/medha/ml';

// 2. Pass telemetry from your game session
const telemetry: CognitiveTelemetry = {
  avgReactionTimeMs: 940,
  accuracy: 0.72,
  lapseRate: 0.14,
  fatigueDrift: 0.44,       // Reaction times slowing toward session end
  errorClustering: 0.20,
  baselineDeviation: 0.16,
};

// 3. Classify cognitive state instantly in <1ms
const evaluation = classifyTelemetry(telemetry);

console.log(evaluation.predictedState); 
// Output: 'COGNITIVE_FATIGUE'

console.log(evaluation.recommendation.gameAdjustment);
// Output: 'Provide a relaxing warm-down sequence and transition to restful completion.'

console.log(evaluation.recommendation.caregiverNote);
// Output: 'Patient is experiencing natural cognitive fatigue. Encourage hydration and a short rest.'`;

  const SNIPPET_2 = `// Train a custom Random Forest with patient-specific samples
import { RandomForest, type TrainingSample } from './modules/medha/ml';

const forest = new RandomForest(7, {
  maxDepth: 5,
  maxFeatures: 'sqrt',
  seed: 42,
});

forest.fit(patientHistoricalSamples);

const ensembleDiagnosis = forest.evaluateEnsemble(currentSessionTelemetry);
console.log(ensembleDiagnosis.predictedState, ensembleDiagnosis.confidence);`;

  return (
    <div className="bg-slate-900/80 rounded-xl border border-slate-800 p-5 shadow-lg">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Code2 className="w-5 h-5 text-cyan-400" />
          <h3 className="text-base font-bold text-slate-100">
            How to Import &amp; Integrate this Module into Your React Project
          </h3>
        </div>
        <span className="text-xs text-slate-400 font-mono">Zero External Dependencies</span>
      </div>

      <div className="space-y-4">
        <div>
          <div className="flex items-center justify-between text-xs text-slate-300 font-semibold mb-1.5">
            <span className="flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-emerald-400" />
              Standard Usage (Real-Time In-Game Classification)
            </span>
            <button
              onClick={() => copyToClipboard(SNIPPET_1, 1)}
              className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white transition cursor-pointer"
            >
              {copiedIndex === 1 ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              {copiedIndex === 1 ? 'Copied!' : 'Copy Code'}
            </button>
          </div>
          <pre className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-slate-300 font-mono overflow-x-auto leading-relaxed">
            {SNIPPET_1}
          </pre>
        </div>

        <div>
          <div className="flex items-center justify-between text-xs text-slate-300 font-semibold mb-1.5">
            <span className="flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-purple-400" />
              Ensemble Random Forest Usage (Multi-Tree Voting)
            </span>
            <button
              onClick={() => copyToClipboard(SNIPPET_2, 2)}
              className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white transition cursor-pointer"
            >
              {copiedIndex === 2 ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              {copiedIndex === 2 ? 'Copied!' : 'Copy Code'}
            </button>
          </div>
          <pre className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-slate-300 font-mono overflow-x-auto leading-relaxed">
            {SNIPPET_2}
          </pre>
        </div>
      </div>
    </div>
  );
};
