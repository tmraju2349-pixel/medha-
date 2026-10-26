/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Game 4: Spatial Cubes (3D Corsi Block-Tapping Test)
 * Standard neuropsychological instrument for Visuospatial Working Memory.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { GameProps, GameDescriptor } from './types';
import { sound } from './audio';
import { CorsiCanvas } from './3d/CorsiCanvas';
import { CheckCircle2, AlertCircle, Play, Eye, Hand, Sparkles } from 'lucide-react';

export const SPATIAL_CUBES_DESCRIPTOR: GameDescriptor = {
  gameId: 'spatial_cubes',
  gameName: 'Spatial Cubes (3D Corsi)',
  description: 'Evaluate and train visuospatial working memory by recalling sequences of illuminated 3D blocks.',
  cognitiveDomains: ['visuospatial', 'memory', 'executive_function'],
  primaryDomain: 'memory',
  secondaryDomains: ['visuospatial'],
  difficultyLevels: [1, 2, 3, 4, 5],
  estimatedDuration: 4,
  supportedLanguages: ['en'],
  gameVersion: '1.0.0',
  dataSchemaVersion: '1.0.0',
};

export const SpatialCubesGame: React.FC<GameProps> = ({
  difficulty,
  isPractice = false,
  onEvent,
  onComplete,
}) => {
  const totalTrials = isPractice ? 3 : 6;
  const [trialIndex, setTrialIndex] = useState(0);
  
  // Game State Machine
  const [stage, setStage] = useState<'READY' | 'WATCH' | 'RECALL' | 'FEEDBACK'>('READY');
  
  // Sequence State
  const [correctSequence, setCorrectSequence] = useState<number[]>([]);
  const [userSequence, setUserSequence] = useState<number[]>([]);
  const [highlightedCube, setHighlightedCube] = useState<number | null>(null);
  
  // Trial Outcome
  const [wasCorrect, setWasCorrect] = useState<boolean | null>(null);

  // Telemetry Metrics
  const [score, setScore] = useState(0);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [incorrectAnswers, setIncorrectAnswers] = useState(0);
  const [maxSpan, setMaxSpan] = useState(0); // Longest correct sequence

  const trialStartRef = useRef<number>(0);
  const sequenceTimeoutRefs = useRef<number[]>([]);

  // Configure trial parameters based on difficulty
  const getSequenceLength = useCallback((idx: number) => {
    // Level 1: length 3
    // Level 2: length 4
    // Level 3: length 4-5
    // Level 4: length 5-6
    // Level 5: length 6-7
    let baseLength = 2 + difficulty;
    if (idx > totalTrials / 2) {
        baseLength += 1; // Increase difficulty slightly halfway through
    }
    return Math.min(baseLength, 9); // Max 9 blocks
  }, [difficulty, totalTrials]);

  const startNextTrial = useCallback(() => {
    setStage('WATCH');
    setUserSequence([]);
    setWasCorrect(null);
    setHighlightedCube(null);
    
    // Clear any pending timeouts
    sequenceTimeoutRefs.current.forEach(clearTimeout);
    sequenceTimeoutRefs.current = [];

    const seqLength = getSequenceLength(trialIndex);
    const newSequence: number[] = [];
    
    // Generate sequence without consecutive immediate repeats
    let lastCube = -1;
    for (let i = 0; i < seqLength; i++) {
      let nextCube;
      do {
        nextCube = Math.floor(Math.random() * 9);
      } while (nextCube === lastCube);
      newSequence.push(nextCube);
      lastCube = nextCube;
    }
    
    setCorrectSequence(newSequence);

    onEvent({
      event_type: 'stimulus_shown',
      question_id: `trial_${trialIndex + 1}`,
      stimulus_type: 'corsi_sequence',
      expected_answer: newSequence.join(','),
      difficulty_level: difficulty,
      metadata: { sequenceLength: seqLength }
    });

    // Playback sequence
    let delay = 1000; // Initial pause before starting
    const flashDuration = 600;
    const interStimulusInterval = 400;

    newSequence.forEach((cubeIndex, i) => {
      // Turn ON
      const onTimer = window.setTimeout(() => {
        setHighlightedCube(cubeIndex);
        sound.playTap(); // Play a soft tick for the flash
      }, delay);
      
      delay += flashDuration;
      
      // Turn OFF
      const offTimer = window.setTimeout(() => {
        setHighlightedCube(null);
      }, delay);
      
      delay += interStimulusInterval;
      sequenceTimeoutRefs.current.push(onTimer, offTimer);
    });

    // Start Recall Phase
    const recallTimer = window.setTimeout(() => {
      setStage('RECALL');
      trialStartRef.current = performance.now();
      sound.playGentleNotice(); // Soft prompt to begin
    }, delay);
    sequenceTimeoutRefs.current.push(recallTimer);

  }, [difficulty, getSequenceLength, onEvent, trialIndex]);

  const handleCubeClick = (cubeIndex: number) => {
    if (stage !== 'RECALL') return;

    sound.playTap();
    const newSequence = [...userSequence, cubeIndex];
    setUserSequence(newSequence);
    
    // Check if the sequence so far is correct
    const currentIndex = newSequence.length - 1;
    const isCurrentClickCorrect = newSequence[currentIndex] === correctSequence[currentIndex];

    if (!isCurrentClickCorrect) {
      // Immediate failure on wrong click
      handleTrialEnd(false, newSequence);
    } else if (newSequence.length === correctSequence.length) {
      // Completed successfully
      handleTrialEnd(true, newSequence);
    }
  };

  const handleTrialEnd = (isTrialCorrect: boolean, finalSequence: number[]) => {
    setStage('FEEDBACK');
    setWasCorrect(isTrialCorrect);
    
    const rt = Math.round(performance.now() - trialStartRef.current);
    
    if (isTrialCorrect) {
      sound.playSuccess();
      setScore(s => s + (correctSequence.length * 10));
      setCorrectAnswers(c => c + 1);
      setMaxSpan(Math.max(maxSpan, correctSequence.length));
    } else {
      sound.playGentleNotice();
      setIncorrectAnswers(i => i + 1);
    }

    onEvent({
      event_type: isTrialCorrect ? 'answer_correct' : 'answer_incorrect',
      question_id: `trial_${trialIndex + 1}`,
      stimulus_type: 'corsi_recall',
      expected_answer: correctSequence.join(','),
      actual_answer: finalSequence.join(','),
      correct: isTrialCorrect,
      response_time: rt,
      difficulty_level: difficulty,
      metadata: { 
        sequenceLength: correctSequence.length,
        errorIndex: isTrialCorrect ? -1 : finalSequence.length - 1
      }
    });
  };

  const handleContinue = () => {
    sound.playTap();
    if (trialIndex + 1 < totalTrials) {
      setTrialIndex(prev => prev + 1);
      startNextTrial();
    } else {
      sound.playComplete();
      onComplete({
        score,
        maxScore: totalTrials * (difficulty + 3) * 10,
        correctAnswers: correctAnswers + (wasCorrect ? 1 : 0),
        incorrectAnswers: incorrectAnswers + (wasCorrect ? 0 : 1),
        hintsUsed: 0,
        domainMetrics: {
          corsiMaxSpan: maxSpan,
          totalTrials,
        }
      });
    }
  };

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      sequenceTimeoutRefs.current.forEach(clearTimeout);
    };
  }, []);

  return (
    <div className="flex flex-col items-center justify-between min-h-[510px] w-full max-w-2xl mx-auto p-3 sm:p-4 select-none">
      {/* Header */}
      <div className="w-full flex items-center justify-between pb-2.5 border-b border-slate-800 text-slate-300">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-bold bg-indigo-950 text-indigo-300 px-2.5 py-1 rounded-full border border-indigo-800 flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-pulse" />
            {isPractice ? 'Practice Span' : `Trial ${trialIndex + 1} of ${totalTrials}`}
          </span>
          <span className="text-xs text-slate-400 hidden sm:inline-block">
            Span: {correctSequence.length || getSequenceLength(trialIndex)} blocks
          </span>
        </div>
        <div className="text-xs font-semibold text-indigo-300">Score: {score}</div>
      </div>

      {/* Main 3D Canvas Area */}
      <div className="relative w-full h-[320px] sm:h-[380px] mt-4 rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 shadow-2xl flex items-center justify-center">
        
        {stage === 'READY' ? (
           <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/80 backdrop-blur-sm z-20">
             <div className="w-16 h-16 bg-indigo-500/20 text-indigo-400 rounded-full flex items-center justify-center mb-4 border border-indigo-500">
               <Eye className="w-8 h-8" />
             </div>
             <h3 className="text-xl font-bold text-white mb-2">Watch the Sequence</h3>
             <p className="text-sm text-slate-300 max-w-xs text-center mb-6">
               Memorize the order in which the cubes light up. You will need to repeat it.
             </p>
             <button
               onClick={startNextTrial}
               className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition shadow-lg flex items-center gap-2 cursor-pointer"
             >
               <Play className="w-4 h-4 fill-current" /> Begin
             </button>
           </div>
        ) : (
          <CorsiCanvas
             stage={stage}
             highlightedCube={highlightedCube}
             userSequence={userSequence}
             correctSequence={correctSequence}
             isCorrect={wasCorrect}
             onCubeClick={handleCubeClick}
             className="absolute inset-0"
          />
        )}

        {/* Status Overlays */}
        {stage === 'WATCH' && (
           <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-slate-900/80 backdrop-blur-md px-4 py-2 rounded-full border border-sky-900/50 shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-4">
             <Eye className="w-4 h-4 text-sky-400 animate-pulse" />
             <span className="text-sm font-bold text-sky-300 tracking-wide uppercase">Watch Closely...</span>
           </div>
        )}

        {stage === 'RECALL' && (
           <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-indigo-900/80 backdrop-blur-md px-4 py-2 rounded-full border border-indigo-500/50 shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-4">
             <Hand className="w-4 h-4 text-indigo-300" />
             <span className="text-sm font-bold text-indigo-200 tracking-wide">
               Tap cubes in order: {userSequence.length} / {correctSequence.length}
             </span>
           </div>
        )}

        {/* Feedback Overlay */}
        {stage === 'FEEDBACK' && (
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm z-20 flex flex-col items-center justify-center p-4 text-center animate-in fade-in">
            {wasCorrect ? (
              <div className="space-y-2 max-w-xs">
                <div className="w-12 h-12 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-500">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <h4 className="text-base font-bold text-emerald-300">Perfect Recall!</h4>
                <p className="text-xs text-slate-300">You successfully remembered the {correctSequence.length}-block sequence.</p>
              </div>
            ) : (
              <div className="space-y-2 max-w-xs">
                <div className="w-12 h-12 bg-rose-500/20 text-rose-400 rounded-full flex items-center justify-center mx-auto border border-rose-500">
                  <AlertCircle className="w-7 h-7" />
                </div>
                <h4 className="text-base font-bold text-rose-300">Sequence Broken</h4>
                <p className="text-xs text-slate-300">
                   You made it to block {userSequence.length} before making a mistake.
                </p>
              </div>
            )}

            <button
              onClick={handleContinue}
              className="mt-6 px-8 py-3 bg-indigo-500 hover:bg-indigo-400 text-white font-bold text-sm rounded-xl shadow-lg transition cursor-pointer active:scale-95"
            >
              {trialIndex + 1 < totalTrials ? 'Next Sequence' : 'Finish Task'}
            </button>
          </div>
        )}
      </div>

      <div className="w-full text-center text-[11px] text-slate-400 mt-4 flex items-center justify-center gap-1.5">
        <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
        <span>Visuospatial working memory test based on the Corsi Block paradigm.</span>
      </div>
    </div>
  );
};
