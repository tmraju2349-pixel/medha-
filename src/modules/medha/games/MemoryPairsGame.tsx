/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Game 2: Memory Garden Pairs (Associative & Working Memory Recall)
 * Measures immediate recall, recognition accuracy, repeated errors, and flip latency.
 */

import React, { useState, useEffect, useRef } from 'react';
import type { GameProps, GameDescriptor } from './types';
import { sound } from './audio';
import { Eye, HelpCircle, Sparkles, CheckCircle2 } from 'lucide-react';

export const MEMORY_PAIRS_DESCRIPTOR: GameDescriptor = {
  gameId: 'memory_pairs',
  gameName: 'Memory Garden Pairs',
  description: 'Strengthen working memory and visual recall by uncovering matching pairs of gentle nature symbols.',
  cognitiveDomains: ['memory', 'attention', 'visuospatial'],
  primaryDomain: 'memory',
  secondaryDomains: ['attention', 'visuospatial'],
  difficultyLevels: [1, 2, 3, 4, 5],
  estimatedDuration: 4,
  supportedLanguages: ['en'],
  gameVersion: '1.0.0',
  dataSchemaVersion: '1.0.0',
};

interface MemoryCard {
  id: number;
  symbolId: string;
  emoji: string;
  name: string;
  isFlipped: boolean;
  isMatched: boolean;
}

const ALL_SYMBOLS = [
  { symbolId: 'lotus', emoji: '🪷', name: 'Lotus Flower' },
  { symbolId: 'tea', emoji: '🍵', name: 'Warm Tea' },
  { symbolId: 'sunflower', emoji: '🌻', name: 'Sunflower' },
  { symbolId: 'butterfly', emoji: '🦋', name: 'Butterfly' },
  { symbolId: 'bird', emoji: '🐦', name: 'Songbird' },
  { symbolId: 'bell', emoji: '🔔', name: 'Temple Bell' },
];

export const MemoryPairsGame: React.FC<GameProps> = ({
  difficulty,
  isPractice = false,
  onEvent,
  onComplete,
}) => {
  // Determine number of pairs based on difficulty
  const pairCount = isPractice ? 2 : Math.min(ALL_SYMBOLS.length, 2 + difficulty); // 3 pairs for diff 1, up to 6
  const totalCards = pairCount * 2;

  const [cards, setCards] = useState<MemoryCard[]>([]);
  const [flippedIndices, setFlippedIndices] = useState<number[]>([]);
  const [isLocked, setIsLocked] = useState(false);

  // Performance metrics
  const [matchesFound, setMatchesFound] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [correctFlips, setCorrectFlips] = useState(0);
  const [incorrectFlips, setIncorrectFlips] = useState(0);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [cardErrorHistory, setCardErrorHistory] = useState<Record<number, number>>({});

  const sessionStartRef = useRef<number>(Date.now());
  const flipStartRef = useRef<number>(Date.now());

  // Initialize board
  useEffect(() => {
    const selected = ALL_SYMBOLS.slice(0, pairCount);
    const deck: MemoryCard[] = [];
    selected.forEach((sym, idx) => {
      deck.push({
        id: idx * 2,
        symbolId: sym.symbolId,
        emoji: sym.emoji,
        name: sym.name,
        isFlipped: false,
        isMatched: false,
      });
      deck.push({
        id: idx * 2 + 1,
        symbolId: sym.symbolId,
        emoji: sym.emoji,
        name: sym.name,
        isFlipped: false,
        isMatched: false,
      });
    });

    // Shuffle deck
    const shuffled = [...deck].sort(() => Math.random() - 0.5);
    setCards(shuffled);
    flipStartRef.current = performance.now();

    onEvent({
      event_type: 'level_started',
      question_id: `memory_deck_${pairCount}`,
      stimulus_type: 'card_grid',
      difficulty_level: difficulty,
      metadata: { pairCount, totalCards },
    });
  }, [pairCount, totalCards, difficulty, onEvent]);

  // Handle card click
  const handleCardClick = (index: number) => {
    if (isLocked || cards[index].isFlipped || cards[index].isMatched) return;

    sound.playTap();
    const responseTime = Math.round(performance.now() - flipStartRef.current);

    const newCards = [...cards];
    newCards[index].isFlipped = true;
    setCards(newCards);

    const newFlipped = [...flippedIndices, index];
    setFlippedIndices(newFlipped);

    onEvent({
      event_type: 'answer_selected',
      question_id: `card_${cards[index].symbolId}`,
      stimulus_type: 'card_flip',
      actual_answer: cards[index].symbolId,
      response_time: responseTime,
      difficulty_level: difficulty,
    });

    // If second card flipped, check match
    if (newFlipped.length === 2) {
      setIsLocked(true);
      setAttempts((a) => a + 1);

      const [firstIdx, secondIdx] = newFlipped;
      const firstCard = newCards[firstIdx];
      const secondCard = newCards[secondIdx];
      const isMatch = firstCard.symbolId === secondCard.symbolId;

      if (isMatch) {
        sound.playSuccess();
        setCorrectFlips((c) => c + 1);
        setMatchesFound((m) => m + 1);

        onEvent({
          event_type: 'answer_correct',
          question_id: `pair_${firstCard.symbolId}`,
          stimulus_type: 'card_match',
          expected_answer: firstCard.symbolId,
          actual_answer: secondCard.symbolId,
          correct: true,
          response_time: responseTime,
          difficulty_level: difficulty,
        });

        setTimeout(() => {
          setCards((prev) =>
            prev.map((c, i) => (i === firstIdx || i === secondIdx ? { ...c, isMatched: true } : c))
          );
          setFlippedIndices([]);
          setIsLocked(false);
          flipStartRef.current = performance.now();

          // Check if board completed
          if (matchesFound + 1 === pairCount) {
            handleComplete();
          }
        }, 500);
      } else {
        sound.playGentleNotice();
        setIncorrectFlips((inc) => inc + 1);

        // Track repeated errors
        setCardErrorHistory((prev) => ({
          ...prev,
          [firstIdx]: (prev[firstIdx] || 0) + 1,
          [secondIdx]: (prev[secondIdx] || 0) + 1,
        }));

        onEvent({
          event_type: 'answer_incorrect',
          question_id: `pair_${firstCard.symbolId}`,
          stimulus_type: 'card_match',
          expected_answer: firstCard.symbolId,
          actual_answer: secondCard.symbolId,
          correct: false,
          response_time: responseTime,
          difficulty_level: difficulty,
        });

        setTimeout(() => {
          setCards((prev) =>
            prev.map((c, i) => (i === firstIdx || i === secondIdx ? { ...c, isFlipped: false } : c))
          );
          setFlippedIndices([]);
          setIsLocked(false);
          flipStartRef.current = performance.now();
        }, 1100);
      }
    }
  };

  const handleComplete = () => {
    sound.playComplete();
    const finalScore = Math.max(10, pairCount * 20 - hintsUsed * 5);

    onComplete({
      score: finalScore,
      maxScore: pairCount * 20,
      correctAnswers: correctFlips + 1,
      incorrectAnswers: incorrectFlips,
      hintsUsed,
      domainMetrics: {
        pairCount,
        attempts: attempts + 1,
        repeatedErrors: Object.values(cardErrorHistory).filter((count: number) => count >= 2).length,
      },
    });
  };

  // Elder-friendly gentle hint: Briefly reveals unmatched cards
  const handleGentleHint = () => {
    if (isLocked) return;
    sound.playTap();
    setIsLocked(true);
    setHintsUsed((h) => h + 1);

    onEvent({
      event_type: 'hint_used',
      question_id: 'peek_board',
      stimulus_type: 'reveal_hint',
      hint_used: true,
      difficulty_level: difficulty,
    });

    setCards((prev) => prev.map((c) => ({ ...c, isFlipped: true })));

    setTimeout(() => {
      setCards((prev) => prev.map((c) => (c.isMatched ? c : { ...c, isFlipped: false })));
      setIsLocked(false);
    }, 1400);
  };

  return (
    <div className="flex flex-col items-center justify-between min-h-[480px] w-full max-w-xl mx-auto p-4 select-none">
      {/* Top Header */}
      <div className="w-full flex items-center justify-between pb-3 border-b border-slate-800 text-slate-300">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-bold bg-purple-950 text-purple-300 px-2.5 py-1 rounded-full border border-purple-800">
            {isPractice ? 'Practice Mode' : `Memory Level ${difficulty}`}
          </span>
          <span className="text-xs text-slate-400">
            {matchesFound} of {pairCount} Pairs Found
          </span>
        </div>
        <button
          id="btn-hint-memory"
          onClick={handleGentleHint}
          disabled={isLocked}
          className="flex items-center gap-1.5 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 rounded-lg text-xs font-medium transition cursor-pointer disabled:opacity-50"
        >
          <Eye className="w-3.5 h-3.5" />
          Gentle Peek (Hint)
        </button>
      </div>

      {/* Card Grid */}
      <div className="flex-1 flex items-center justify-center w-full py-6">
        <div
          className={`grid gap-3.5 w-full max-w-md ${
            pairCount <= 3 ? 'grid-cols-3' : pairCount <= 4 ? 'grid-cols-4' : 'grid-cols-4 sm:grid-cols-5'
          }`}
        >
          {cards.map((card, idx) => {
            const showFace = card.isFlipped || card.isMatched;
            return (
              <button
                key={card.id}
                id={`card-${idx}`}
                onClick={() => handleCardClick(idx)}
                disabled={card.isMatched || isLocked}
                className={`h-24 sm:h-28 rounded-2xl flex flex-col items-center justify-center transition-all duration-300 transform active:scale-95 cursor-pointer border-2 ${
                  card.isMatched
                    ? 'bg-emerald-950/60 border-emerald-500/80 shadow-[0_0_12px_rgba(16,185,129,0.3)] opacity-90'
                    : showFace
                    ? 'bg-slate-900 border-purple-500/80 shadow-md scale-105'
                    : 'bg-slate-800 hover:bg-slate-750 border-slate-700 hover:border-slate-500 shadow-md'
                }`}
              >
                {showFace ? (
                  <>
                    <span className="text-3xl sm:text-4xl mb-1">{card.emoji}</span>
                    <span className="text-[10px] font-medium text-slate-300 truncate max-w-[70px]">
                      {card.name.split(' ')[0]}
                    </span>
                  </>
                ) : (
                  <div className="flex flex-col items-center text-slate-500">
                    <span className="text-xl">🌿</span>
                    <span className="text-[9px] font-mono tracking-widest mt-1 text-slate-400">MEDHA</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Bottom helper */}
      <div className="w-full text-center text-xs text-slate-400 pt-2 border-t border-slate-800/80">
        Tap any two cards to reveal their matching nature symbol. Take your time!
      </div>
    </div>
  );
};
