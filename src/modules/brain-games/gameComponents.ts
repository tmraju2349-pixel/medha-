/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Game Component Mapping for Brain Development Games
 */

import React, { ComponentType } from 'react';
import WaterJugs from './games/WaterJugs';
import TowerOfHanoi from './games/TowerOfHanoi';
import BallSort from './games/BallSort';
import NBack from './games/NBack';
import LogicPuzzles from './games/LogicPuzzles';
import Stroop from './games/Stroop';
import MentalRotation from './games/MentalRotation';
import SchulteTable from './games/SchulteTable';
import Maze from './games/Maze';
import PatternMatrix from './games/PatternMatrix';
import QuickMath from './games/QuickMath';
import WordScramble from './games/WordScramble';
import SimonSays from './games/SimonSays';
import CardMatching from './games/CardMatching';
import ReactionTime from './games/ReactionTime';
import NumberSequence from './games/NumberSequence';
import DualTask from './games/DualTask';
import VisualSearch from './games/VisualSearch';
import AnagramSolver from './games/AnagramSolver';
import TrailMaking from './games/TrailMaking';
import WorkingMemoryGrid from './games/WorkingMemoryGrid';

export interface BaseGameComponentProps {
  level: number;
}

export const BRAIN_GAME_COMPONENTS: Record<string, ComponentType<BaseGameComponentProps>> = {
  'water-jugs': WaterJugs as ComponentType<BaseGameComponentProps>,
  'tower-of-hanoi': TowerOfHanoi as ComponentType<BaseGameComponentProps>,
  'ball-sort': BallSort as ComponentType<BaseGameComponentProps>,
  'n-back': NBack as ComponentType<BaseGameComponentProps>,
  'logic-puzzles': LogicPuzzles as ComponentType<BaseGameComponentProps>,
  'stroop': Stroop as ComponentType<BaseGameComponentProps>,
  'mental-rotation': MentalRotation as ComponentType<BaseGameComponentProps>,
  'schulte-table': SchulteTable as ComponentType<BaseGameComponentProps>,
  'maze': Maze as ComponentType<BaseGameComponentProps>,
  'pattern-matrix': PatternMatrix as ComponentType<BaseGameComponentProps>,
  'quick-math': QuickMath as ComponentType<BaseGameComponentProps>,
  'word-scramble': WordScramble as ComponentType<BaseGameComponentProps>,
  'simon-says': SimonSays as ComponentType<BaseGameComponentProps>,
  'card-matching': CardMatching as ComponentType<BaseGameComponentProps>,
  'reaction-time': ReactionTime as ComponentType<BaseGameComponentProps>,
  'number-sequence': NumberSequence as ComponentType<BaseGameComponentProps>,
  'dual-task': DualTask as ComponentType<BaseGameComponentProps>,
  'visual-search': VisualSearch as ComponentType<BaseGameComponentProps>,
  'anagram-solver': AnagramSolver as ComponentType<BaseGameComponentProps>,
  'trail-making': TrailMaking as ComponentType<BaseGameComponentProps>,
  'working-memory-grid': WorkingMemoryGrid as ComponentType<BaseGameComponentProps>,
};
