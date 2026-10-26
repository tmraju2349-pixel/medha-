/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Game 1: Focus Spotlight (NIH ACTIVE UFOV Attention & Processing Speed)
 * Measures central identification, peripheral localization, distractibility, and reaction latency.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { GameProps, GameDescriptor } from './types';
import { sound } from './audio';
import { Sparkles, HelpCircle, CheckCircle2, RotateCcw } from 'lucide-react';

export const FOCUS_SPOTLIGHT_DESCRIPTOR: GameDescriptor = {
  gameId: 'focus_spotlight',
  gameName: 'Focus Spotlight',
  description: 'Train visual attention and processing speed by identifying a center symbol while noticing a peripheral star.',
  cognitiveDomains: ['attention', 'processing_speed', 'visuospatial'],
  primaryDomain: 'attention',
  secondaryDomains: ['processing_speed', 'visuospatial'],
  difficultyLevels: [1, 2, 3, 4, 5],
  estimatedDuration: 3,
  supportedLanguages: ['en'],
  gameVersion: '1.0.0',
  dataSchemaVersion: '1.0.0',
};

const CENTER_SYMBOLS = [
  { id: 'apple', label: 'Red Apple', emoji: '🍎' },
  { id: 'sun', label: 'Golden Sun', emoji: '☀️' },
  { id: 'flower', label: 'Sunflower', emoji: '🌻' },
];

const PERIPHERAL_POSITIONS = [
  { id: 0, label: 'Top', angle: 270 },
  { id: 1, label: 'Top Right', angle: 315 },
  { id: 2, label: 'Right', angle: 0 },
  { id: 3, label: 'Bottom Right', angle: 45 },
  { id: 4, label: 'Bottom', angle: 90 },
  { id: 5, label: 'Bottom Left', angle: 135 },
  { id: 6, label: 'Left', angle: 180 },
  { id: 7, label: 'Top Left', angle: 225 },
];

export const FocusSpotlightGame: React.FC<GameProps> = ({
  difficulty,
  isPractice = false,
  onEvent,
  onComplete,
}) => {
  const totalTrials = isPractice ? 3 : 8;
  const [trialIndex, setTrialIndex] = useState(0);
  const [stage, setStage] = useState<'READY' | 'FLASH' | 'INPUT_CENTER' | 'INPUT_PERIPHERAL' | 'TRIAL_FEEDBACK'>('READY');

  // Trial state
  const [currentCenter, setCurrentCenter] = useState(CENTER_SYMBOLS[0]);
  const [currentPeripheralPos, setCurrentPeripheralPos] = useState(0);
  const [selectedCenter, setSelectedCenter] = useState<string | null>(null);
  const [selectedPeripheral, setSelectedPeripheral] = useState<number | null>(null);
  const [trialResult, setTrialResult] = useState<{ centerCorrect: boolean; peripheralCorrect: boolean } | null>(null);

  // Overall session metrics
  const [score, setScore] = useState(0);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [incorrectAnswers, setIncorrectAnswers] = useState(0);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [showHint, setShowHint] = useState(false);

  const trialStartTimeRef = useRef<number>(0);
  const flashTimerRef = useRef<number | null>(null);

  // Calculate display duration based on difficulty (longer for elderly comfort: 900ms down to 400ms)
  const flashDurationMs = Math.max(400, 1000 - difficulty * 120);

  const startNextTrial = useCallback(() => {
    setShowHint(false);
    setSelectedCenter(null);
    setSelectedPeripheral(null);
    setTrialResult(null);

    // Pick random center symbol and peripheral position
    const center = CENTER_SYMBOLS[Math.floor(Math.random() * CENTER_SYMBOLS.length)];
    const peripheral = Math.floor(Math.random() * PERIPHERAL_POSITIONS.length);

    setCurrentCenter(center);
    setCurrentPeripheralPos(peripheral);
    setStage('READY');
  }, []);

  // Launch the flash stimulus
  const triggerFlash = () => {
    sound.playTap();
    setStage('FLASH');
    onEvent({
      event_type: 'stimulus_shown',
      question_id: `trial_${trialIndex + 1}`,
      stimulus_type: 'dual_visual_target',
      expected_answer: `${currentCenter.id}_pos${currentPeripheralPos}`,
      difficulty_level: difficulty,
    });

    flashTimerRef.current = window.setTimeout(() => {
      setStage('INPUT_CENTER');
      trialStartTimeRef.current = performance.now();
    }, flashDurationMs);
  };

  useEffect(() => {
    startNextTrial();
    return () => {
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    };
  }, [startNextTrial]);

  // Handle center symbol answer
  const handleSelectCenter = (symbolId: string) => {
    sound.playTap();
    setSelectedCenter(symbolId);
    setStage('INPUT_PERIPHERAL');
  };

  // Handle peripheral target position answer
  const handleSelectPeripheral = (positionId: number) => {
    const responseTime = Math.round(performance.now() - trialStartTimeRef.current);
    setSelectedPeripheral(positionId);

    const isCenterCorrect = selectedCenter === currentCenter.id;
    const isPeripheralCorrect = positionId === currentPeripheralPos;
    const fullyCorrect = isCenterCorrect && isPeripheralCorrect;

    if (fullyCorrect) {
      sound.playSuccess();
      setScore((s) => s + 10);
      setCorrectAnswers((c) => c + 1);
    } else {
      sound.playGentleNotice();
      setIncorrectAnswers((inc) => inc + 1);
    }

    setTrialResult({ centerCorrect: isCenterCorrect, peripheralCorrect: isPeripheralCorrect });
    setStage('TRIAL_FEEDBACK');

    onEvent({
      event_type: fullyCorrect ? 'answer_correct' : 'answer_incorrect',
      question_id: `trial_${trialIndex + 1}`,
      stimulus_type: 'dual_visual_target',
      expected_answer: `${currentCenter.id}_pos${currentPeripheralPos}`,
      actual_answer: `${selectedCenter}_pos${positionId}`,
      correct: fullyCorrect,
      response_time: responseTime,
      hint_used: showHint,
      difficulty_level: difficulty,
    });
  };

  // Advance to next trial or finish
  const handleContinue = () => {
    sound.playTap();
    if (trialIndex + 1 < totalTrials) {
      setTrialIndex((prev) => prev + 1);
      startNextTrial();
    } else {
      sound.playComplete();
      onComplete({
        score,
        maxScore: totalTrials * 10,
        correctAnswers: correctAnswers + (trialResult?.centerCorrect && trialResult?.peripheralCorrect ? 1 : 0),
        incorrectAnswers: incorrectAnswers + (trialResult?.centerCorrect && trialResult?.peripheralCorrect ? 0 : 1),
        hintsUsed,
        domainMetrics: {
          flashDurationMs,
          totalTrials,
          distractorCount: difficulty >= 3 ? 4 : 2,
        },
      });
    }
  };

  const handleUseHint = () => {
    sound.playTap();
    setShowHint(true);
    setHintsUsed((h) => h + 1);
    onEvent({
      event_type: 'hint_used',
      question_id: `trial_${trialIndex + 1}`,
      stimulus_type: 'dual_visual_target',
      hint_used: true,
      difficulty_level: difficulty,
    });
  };

  return (
    <div className="flex flex-col items-center justify-between min-h-[480px] w-full max-w-2xl mx-auto p-4 select-none">
      {/* Top trial indicator */}
      <div className="w-full flex items-center justify-between pb-3 border-b border-slate-800 text-slate-300">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-bold bg-emerald-950 text-emerald-300 px-2.5 py-1 rounded-full border border-emerald-800">
            {isPractice ? 'Practice Round' : `Challenge ${trialIndex + 1} of ${totalTrials}`}
          </span>
          <span className="text-xs text-slate-400 font-sans">
            Speed: {flashDurationMs}ms
          </span>
        </div>
        <div className="text-xs font-semibold text-amber-300">
          Score: {score}
        </div>
      </div>

      {/* Main Gameplay Stage */}
      <div className="flex-1 flex flex-col items-center justify-center w-full py-4">
        {/* STAGE 1: READY */}
        {stage === 'READY' && (
          <div className="text-center space-y-4 max-w-md">
            <p className="text-base text-slate-200 font-medium">
              A symbol will appear in the center, and a <strong className="text-amber-300">Star 🌟</strong> will appear on the circle.
            </p>
            <p className="text-xs text-slate-400">
              Keep your eyes relaxed in the center and notice both!
            </p>
            <button
              id="btn-ready-flash"
              onClick={triggerFlash}
              className="mt-4 px-8 py-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-base rounded-2xl shadow-lg transition-all transform active:scale-95 cursor-pointer"
            >
              Start Focus Flash
            </button>
          </div>
        )}

        {/* STAGE 2: FLASH STIMULUS */}
        {stage === 'FLASH' && (
          <div className="relative w-64 h-64 flex items-center justify-center rounded-full border-2 border-dashed border-slate-700 bg-slate-900/60">
            {/* Center target */}
            <div className="text-5xl transform scale-125 animate-pulse">
              {currentCenter.emoji}
            </div>

            {/* Peripheral target */}
            {PERIPHERAL_POSITIONS.map((pos) => {
              const rad = (pos.angle * Math.PI) / 180;
              const radius = 100;
              const x = Math.cos(rad) * radius;
              const y = Math.sin(rad) * radius;
              const isTarget = pos.id === currentPeripheralPos;

              return (
                <div
                  key={pos.id}
                  style={{ transform: `translate(${x}px, ${y}px)` }}
                  className="absolute flex items-center justify-center"
                >
                  {isTarget ? (
                    <span className="text-3xl text-amber-300 drop-shadow-[0_0_12px_rgba(251,191,36,0.9)]">
                      🌟
                    </span>
                  ) : difficulty >= 3 ? (
                    <span className="h-2 w-2 rounded-full bg-slate-700" />
                  ) : null}
                </div>
              );
            })}
          </div>
        )}

        {/* STAGE 3: INPUT CENTER SYMBOL */}
        {stage === 'INPUT_CENTER' && (
          <div className="text-center space-y-4 w-full">
            <h3 className="text-lg font-bold text-slate-100">
              1. Which symbol was in the center?
            </h3>
            <div className="grid grid-cols-3 gap-4 max-w-md mx-auto">
              {CENTER_SYMBOLS.map((item) => (
                <button
                  key={item.id}
                  id={`btn-center-${item.id}`}
                  onClick={() => handleSelectCenter(item.id)}
                  className="p-4 bg-slate-900 hover:bg-slate-800 border-2 border-slate-700 hover:border-emerald-400 rounded-2xl flex flex-col items-center gap-2 transition cursor-pointer active:scale-95"
                >
                  <span className="text-4xl">{item.emoji}</span>
                  <span className="text-xs font-semibold text-slate-200">{item.label}</span>
                </button>
              ))}
            </div>
            {!showHint && (
              <button
                onClick={handleUseHint}
                className="mt-2 text-xs text-cyan-400 hover:underline flex items-center gap-1 mx-auto cursor-pointer"
              >
                <HelpCircle className="w-3.5 h-3.5" /> Need a hint?
              </button>
            )}
            {showHint && (
              <p className="text-xs text-amber-300">
                Hint: It was a bright nature object.
              </p>
            )}
          </div>
        )}

        {/* STAGE 4: INPUT PERIPHERAL POSITION */}
        {stage === 'INPUT_PERIPHERAL' && (
          <div className="text-center space-y-3 w-full">
            <h3 className="text-lg font-bold text-slate-100">
              2. Where did the Star 🌟 flash on the circle?
            </h3>
            <div className="relative w-72 h-72 mx-auto flex items-center justify-center rounded-full border border-slate-800 bg-slate-950">
              <div className="text-xs text-slate-400 font-mono">Tap Star Location</div>
              {PERIPHERAL_POSITIONS.map((pos) => {
                const rad = (pos.angle * Math.PI) / 180;
                const radius = 105;
                const x = Math.cos(rad) * radius;
                const y = Math.sin(rad) * radius;

                return (
                  <button
                    key={pos.id}
                    id={`btn-pos-${pos.id}`}
                    style={{ transform: `translate(${x}px, ${y}px)` }}
                    onClick={() => handleSelectPeripheral(pos.id)}
                    className="absolute w-12 h-12 rounded-full bg-slate-800 hover:bg-amber-400 hover:text-slate-950 border-2 border-slate-600 hover:border-amber-300 flex items-center justify-center font-bold text-base transition-all active:scale-90 cursor-pointer shadow-md"
                    title={pos.label}
                  >
                    ★
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* STAGE 5: TRIAL FEEDBACK */}
        {stage === 'TRIAL_FEEDBACK' && trialResult && (
          <div className="text-center space-y-4 max-w-sm mx-auto bg-slate-900/90 p-5 rounded-2xl border border-slate-700 shadow-xl">
            {trialResult.centerCorrect && trialResult.peripheralCorrect ? (
              <div className="space-y-2">
                <div className="w-12 h-12 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-500">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <h4 className="text-lg font-bold text-emerald-300">Spot on! Excellent focus.</h4>
                <p className="text-xs text-slate-300">Both center and peripheral targets identified.</p>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="w-12 h-12 bg-amber-500/20 text-amber-400 rounded-full flex items-center justify-center mx-auto border border-amber-500">
                  <Sparkles className="w-7 h-7" />
                </div>
                <h4 className="text-base font-bold text-amber-300">Good attempt!</h4>
                <p className="text-xs text-slate-300">
                  Center was: {currentCenter.emoji} {currentCenter.label}
                </p>
              </div>
            )}

            <button
              id="btn-next-trial"
              onClick={handleContinue}
              className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm rounded-xl transition cursor-pointer"
            >
              {trialIndex + 1 < totalTrials ? 'Next Challenge' : 'Complete Session'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
