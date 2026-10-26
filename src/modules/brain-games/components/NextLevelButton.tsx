/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Next Level Button with Level Context & Event fallback
 */

import React from 'react';
import { useLevel } from './LevelContext';

export type NextLevelButtonProps = {
  currentLevel: number;
  maxLevel?: number;
  onNext?: () => void;
  onHome?: () => void;
};

export default function NextLevelButton({
  currentLevel,
  maxLevel = 10,
  onNext,
  onHome,
}: NextLevelButtonProps): React.JSX.Element {
  const { setLevel, onExit } = useLevel();
  const nextLevel = currentLevel + 1;
  const hasNextLevel = nextLevel <= maxLevel;

  const goToNextLevel = (): void => {
    if (!hasNextLevel) return;
    if (onNext) {
      onNext();
    } else {
      setLevel(nextLevel);
    }
  };

  const goHome = (): void => {
    if (onHome) {
      onHome();
    } else if (onExit) {
      onExit();
    } else {
      window.dispatchEvent(new CustomEvent('brain-game-home'));
    }
  };

  if (!hasNextLevel) {
    return (
      <div className="flex items-center gap-2">
        <div className="px-4 py-2 bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 rounded-lg text-sm font-semibold shadow-sm">
          🎉 All {maxLevel} levels completed!
        </div>
        <button
          onClick={goHome}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-semibold transition cursor-pointer shadow-md"
        >
          Return to Games
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={goToNextLevel}
      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-semibold transition cursor-pointer shadow-md flex items-center gap-2"
    >
      <span>Next Level</span>
      <span>→</span>
    </button>
  );
}
