/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * MEDHA Game Registry (Section 18 & 19 of Game Specification)
 * Dynamic registry allowing new cognitive games to be integrated without rewriting the Cognitive Engine.
 */

import React from 'react';
import type { GameRegistryItem, StandardCognitiveDomain, GameProps } from './types';
import { FocusSpotlightGame, FOCUS_SPOTLIGHT_DESCRIPTOR } from './FocusSpotlightGame';
import { MemoryPairsGame, MEMORY_PAIRS_DESCRIPTOR } from './MemoryPairsGame';
import { DayNightSwitchGame, DAY_NIGHT_DESCRIPTOR } from './DayNightSwitchGame';
import { SpatialCubesGame, SPATIAL_CUBES_DESCRIPTOR } from './SpatialCubesGame';
import { GAME_REGISTRY as BRAIN_GAMES_METADATA } from '../../brain-games/lib/gameRegistry';
import { BrainGameAdapter } from '../../brain-games/BrainGameAdapter';

const categoryDomainMap: Record<string, StandardCognitiveDomain> = {
  memory: 'memory',
  logic: 'executive_function',
  attention: 'attention',
  speed: 'processing_speed',
  spatial: 'visuospatial',
};

const categoryAccentMap: Record<string, { icon: string; accent: string }> = {
  memory: {
    icon: 'Brain',
    accent: 'from-purple-500/20 to-pink-500/20 text-purple-400 border-purple-500/40',
  },
  logic: {
    icon: 'Sliders',
    accent: 'from-blue-500/20 to-indigo-500/20 text-blue-400 border-blue-500/40',
  },
  attention: {
    icon: 'Zap',
    accent: 'from-amber-500/20 to-orange-500/20 text-amber-400 border-amber-500/40',
  },
  speed: {
    icon: 'Activity',
    accent: 'from-emerald-500/20 to-teal-500/20 text-emerald-400 border-emerald-500/40',
  },
  spatial: {
    icon: 'Compass',
    accent: 'from-cyan-500/20 to-sky-500/20 text-cyan-400 border-cyan-500/40',
  },
};

// Base clinical instruments
const baseRegistry: Record<string, GameRegistryItem> = {
  focus_spotlight: {
    descriptor: FOCUS_SPOTLIGHT_DESCRIPTOR,
    component: FocusSpotlightGame,
    iconName: 'Zap',
    accentColor: 'from-amber-500/20 to-orange-500/20 text-amber-400 border-amber-500/40',
  },
  memory_pairs: {
    descriptor: MEMORY_PAIRS_DESCRIPTOR,
    component: MemoryPairsGame,
    iconName: 'Brain',
    accentColor: 'from-purple-500/20 to-pink-500/20 text-purple-400 border-purple-500/40',
  },
  day_night_switch: {
    descriptor: DAY_NIGHT_DESCRIPTOR,
    component: DayNightSwitchGame,
    iconName: 'Compass',
    accentColor: 'from-amber-500/20 via-purple-500/20 to-indigo-500/20 text-amber-300 border-amber-500/40',
  },
  spatial_cubes: {
    descriptor: SPATIAL_CUBES_DESCRIPTOR,
    component: SpatialCubesGame,
    iconName: 'Box',
    accentColor: 'from-indigo-500/20 to-cyan-500/20 text-indigo-400 border-indigo-500/40',
  },
};

// Dynamically generate entries for all 21 games from brain-development-games
BRAIN_GAMES_METADATA.forEach((meta) => {
  const normalizedId = `bg_${meta.id.replace(/-/g, '_')}`;
  const domain = categoryDomainMap[meta.category] || 'executive_function';
  const { icon, accent } = categoryAccentMap[meta.category] || {
    icon: 'Brain',
    accent: 'from-indigo-500/20 to-slate-800 text-indigo-400 border-indigo-500/40',
  };

  const BrainGameComponent: React.FC<GameProps> = (props) =>
    React.createElement(BrainGameAdapter, { ...props, gameId: meta.id });

  baseRegistry[normalizedId] = {
    descriptor: {
      gameId: normalizedId,
      gameName: meta.name,
      description: meta.description,
      cognitiveDomains: [domain],
      primaryDomain: domain,
      secondaryDomains: [],
      difficultyLevels: [1, 2, 3, 4, 5],
      estimatedDuration: 3,
      supportedLanguages: ['en'],
      gameVersion: '1.0.0',
      dataSchemaVersion: '1.0.0',
    },
    component: BrainGameComponent,
    iconName: icon,
    accentColor: accent,
  };

  // Also register with raw id e.g. 'tower-of-hanoi' for direct lookup
  baseRegistry[meta.id] = baseRegistry[normalizedId];
});

export const GAME_REGISTRY: Record<string, GameRegistryItem> = baseRegistry;

export function getGameRegistry(): Record<string, GameRegistryItem> {
  return GAME_REGISTRY;
}

export function getAllGames(): GameRegistryItem[] {
  const seen = new Set<string>();
  const list: GameRegistryItem[] = [];
  for (const item of Object.values(GAME_REGISTRY)) {
    if (!seen.has(item.descriptor.gameId)) {
      seen.add(item.descriptor.gameId);
      list.push(item);
    }
  }
  return list;
}

export function getGameById(gameId: string): GameRegistryItem | undefined {
  return GAME_REGISTRY[gameId];
}
