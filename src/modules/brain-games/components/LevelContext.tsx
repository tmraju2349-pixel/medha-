/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Level Context for Brain Development Games
 * Enables fluid level switching, progress recording, and next-level progression without hard router dependencies.
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface LevelContextValue {
  level: number;
  setLevel: (lvl: number) => void;
  maxLevel: number;
  gameId: string;
  onExit?: () => void;
  onLevelComplete?: (level: number, score?: number) => void;
}

const LevelContext = createContext<LevelContextValue | null>(null);

export interface LevelProviderProps {
  children: ReactNode;
  initialLevel?: number;
  maxLevel?: number;
  gameId?: string;
  onLevelChange?: (level: number) => void;
  onExit?: () => void;
  onLevelComplete?: (level: number, score?: number) => void;
}

export const LevelProvider: React.FC<LevelProviderProps> = ({
  children,
  initialLevel = 1,
  maxLevel = 10,
  gameId = '',
  onLevelChange,
  onExit,
  onLevelComplete,
}) => {
  const [level, setLevelState] = useState<number>(initialLevel);

  useEffect(() => {
    setLevelState(initialLevel);
  }, [initialLevel]);

  const setLevel = (newLevel: number) => {
    const clamped = Math.min(Math.max(1, newLevel), maxLevel);
    setLevelState(clamped);
    onLevelChange?.(clamped);
    window.dispatchEvent(
      new CustomEvent('brain-game-level-change', {
        detail: { gameId, level: clamped },
      })
    );
  };

  return (
    <LevelContext.Provider
      value={{
        level,
        setLevel,
        maxLevel,
        gameId,
        onExit,
        onLevelComplete,
      }}
    >
      {children}
    </LevelContext.Provider>
  );
};

export const useLevel = (): LevelContextValue => {
  const ctx = useContext(LevelContext);
  if (!ctx) {
    // Fallback dummy context if component rendered standalone
    return {
      level: 1,
      setLevel: () => {},
      maxLevel: 10,
      gameId: '',
    };
  }
  return ctx;
};
