/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Level Selector for Brain Development Games
 */

import React from 'react';
import { useLevel } from './LevelContext';

interface LevelSelectorProps {
  currentLevel?: number;
  maxLevel?: number;
  onSelectLevel?: (lvl: number) => void;
}

export default function LevelSelector({
  currentLevel,
  maxLevel = 10,
  onSelectLevel,
}: LevelSelectorProps): React.JSX.Element {
  const context = useLevel();
  const activeLevel = currentLevel ?? context.level;
  const totalLevels = maxLevel ?? context.maxLevel ?? 10;

  const handleChange = (lvl: number) => {
    if (onSelectLevel) {
      onSelectLevel(lvl);
    } else {
      context.setLevel(lvl);
    }
  };

  return (
    <div className="flex items-center justify-between flex-wrap gap-2 mb-4 bg-slate-900/70 p-2.5 rounded-xl border border-slate-800">
      <div className="flex items-center gap-2">
        <span className="text-xs font-mono uppercase tracking-wider text-slate-400 font-bold">
          Difficulty Stage
        </span>
        <div className="flex items-center gap-1">
          {Array.from({ length: totalLevels }, (_, i) => i + 1).map((lvl) => {
            const isSelected = lvl === activeLevel;
            return (
              <button
                key={lvl}
                onClick={() => handleChange(lvl)}
                className={`w-7 h-7 rounded-lg text-xs font-bold font-mono transition cursor-pointer flex items-center justify-center ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 ring-2 ring-indigo-400/50'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
                }`}
                title={`Level ${lvl}`}
              >
                {lvl}
              </button>
            );
          })}
        </div>
      </div>

      <div className="text-xs font-mono text-slate-400">
        Level <span className="font-bold text-indigo-400">{activeLevel}</span> of {totalLevels}
      </div>
    </div>
  );
}
