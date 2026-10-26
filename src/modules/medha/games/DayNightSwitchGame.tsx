/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Game 3: Celestial Horizon (3D Day, Night & Eclipse)
 * Modernized 3D WebGL Executive Function, Inhibitory Control & Stroop Task-Switching Instrument
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { GameProps, GameDescriptor } from './types';
import { sound } from './audio';
import { CelestialCanvas, type StimulusType } from './3d/CelestialCanvas';
import {
  Sun,
  Moon,
  Cloud,
  CheckCircle2,
  AlertCircle,
  ShieldAlert,
  Sparkles,
  Zap,
  HelpCircle,
  Keyboard,
  ShieldCheck,
} from 'lucide-react';

export const DAY_NIGHT_DESCRIPTOR: GameDescriptor = {
  gameId: 'day_night_switch',
  gameName: 'Celestial Horizon (Day, Night & Eclipse 3D)',
  description: 'An interactive 3D WebGL cognitive instrument training executive inhibitory control, Stroop resistance, and task-switching.',
  cognitiveDomains: ['executive_function', 'attention', 'processing_speed'],
  primaryDomain: 'executive_function',
  secondaryDomains: ['attention', 'processing_speed'],
  difficultyLevels: [1, 2, 3, 4, 5],
  estimatedDuration: 3,
  supportedLanguages: ['en'],
  gameVersion: '2.0.0',
  dataSchemaVersion: '2.0.0',
};

type RuleMode = 'DIRECT' | 'ECLIPSE_MIRROR';

interface TrialConfig {
  stimulus: StimulusType;
  mode: RuleMode;
  expectedAction: 'SUN' | 'MOON' | 'HOLD';
  isSwitchTrial: boolean;
}

export const DayNightSwitchGame: React.FC<GameProps> = ({
  difficulty,
  isPractice = false,
  onEvent,
  onComplete,
}) => {
  const totalTrials = isPractice ? 4 : Math.min(12, 8 + difficulty);
  const [trialIndex, setTrialIndex] = useState(0);
  const [stage, setStage] = useState<'READY' | 'STIMULUS' | 'TRIAL_FEEDBACK'>('READY');

  // Current trial state
  const [currentStimulus, setCurrentStimulus] = useState<StimulusType>('NONE');
  const [currentMode, setCurrentMode] = useState<RuleMode>('DIRECT');
  const [expectedAction, setExpectedAction] = useState<'SUN' | 'MOON' | 'HOLD'>('SUN');
  const [userAction, setUserAction] = useState<'SUN' | 'MOON' | 'HOLD' | null>(null);
  const [wasCorrect, setWasCorrect] = useState<boolean | null>(null);
  const [holdProgress, setHoldProgress] = useState<number>(0);

  // Performance telemetry counters
  const [score, setScore] = useState(0);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [incorrectAnswers, setIncorrectAnswers] = useState(0);
  const [commissionErrors, setCommissionErrors] = useState(0); // Pressed when cloud
  const [omissionErrors, setOmissionErrors] = useState(0); // Timed out on sun/moon

  // Reaction time arrays for Congruent vs. Incongruent vs. Switch cost
  const [congruentRTs, setCongruentRTs] = useState<number[]>([]);
  const [incongruentRTs, setIncongruentRTs] = useState<number[]>([]);
  const [switchRTs, setSwitchRTs] = useState<number[]>([]);
  const [repeatRTs, setRepeatRTs] = useState<number[]>([]);

  const trialStartRef = useRef<number>(0);
  const timeoutTimerRef = useRef<number | null>(null);
  const holdAnimFrameRef = useRef<number | null>(null);
  const previousModeRef = useRef<RuleMode>('DIRECT');

  // Response window calibrated to difficulty: 2400ms down to 1400ms
  const responseWindowMs = Math.max(1400, 2400 - difficulty * 180);

  // Determine trial rule configuration based on difficulty
  const determineTrialConfig = useCallback(
    (idx: number): TrialConfig => {
      let mode: RuleMode = 'DIRECT';

      if (isPractice) {
        mode = 'DIRECT';
      } else if (difficulty <= 2) {
        // Levels 1-2: Pure Direct match Go/No-Go
        mode = 'DIRECT';
      } else if (difficulty === 3) {
        // Level 3: Inverted Eclipse Stroop Mode
        mode = 'ECLIPSE_MIRROR';
      } else {
        // Levels 4-5: Dynamic Task Switching (switches every 2-3 trials)
        const block = Math.floor(idx / 2.5);
        mode = block % 2 === 0 ? 'DIRECT' : 'ECLIPSE_MIRROR';
      }

      const isSwitchTrial = idx > 0 && mode !== previousModeRef.current;
      previousModeRef.current = mode;

      // Pick stimulus: 40% Sun, 40% Moon, 20% Cloud
      const rand = Math.random();
      let stim: StimulusType = 'SUN';
      let expected: 'SUN' | 'MOON' | 'HOLD' = 'SUN';

      if (rand < 0.4) {
        stim = 'SUN';
        expected = mode === 'DIRECT' ? 'SUN' : 'MOON';
      } else if (rand < 0.8) {
        stim = 'MOON';
        expected = mode === 'DIRECT' ? 'MOON' : 'SUN';
      } else {
        stim = 'CLOUD';
        expected = 'HOLD';
      }

      return { stimulus: stim, mode, expectedAction: expected, isSwitchTrial };
    },
    [difficulty, isPractice]
  );

  const startNextTrial = useCallback(() => {
    setUserAction(null);
    setWasCorrect(null);
    setHoldProgress(0);

    const config = determineTrialConfig(trialIndex);
    setCurrentStimulus(config.stimulus);
    setCurrentMode(config.mode);
    setExpectedAction(config.expectedAction);
    setStage('STIMULUS');

    trialStartRef.current = performance.now();

    onEvent({
      event_type: 'stimulus_shown',
      question_id: `trial_${trialIndex + 1}`,
      stimulus_type: `3d_stimulus_${config.stimulus.toLowerCase()}`,
      expected_answer: config.expectedAction,
      difficulty_level: difficulty,
      metadata: {
        mode: config.mode,
        isSwitchTrial: config.isSwitchTrial,
      },
    });

    // Cloud Stimulus: Animate smooth hold gauge
    if (config.stimulus === 'CLOUD') {
      const holdStartTime = performance.now();
      const updateHoldGauge = () => {
        const elapsed = performance.now() - holdStartTime;
        const progress = Math.min(1, elapsed / responseWindowMs);
        setHoldProgress(progress);
        if (progress < 1) {
          holdAnimFrameRef.current = requestAnimationFrame(updateHoldGauge);
        }
      };
      holdAnimFrameRef.current = requestAnimationFrame(updateHoldGauge);
    }

    // Timeout timer: triggers completion of hold or omission error
    if (timeoutTimerRef.current) clearTimeout(timeoutTimerRef.current);
    timeoutTimerRef.current = window.setTimeout(() => {
      handleTimeout(config.expectedAction, config.mode, config.isSwitchTrial);
    }, responseWindowMs);
  }, [determineTrialConfig, difficulty, onEvent, responseWindowMs, trialIndex]);

  // Handle timeout event
  const handleTimeout = (action: 'SUN' | 'MOON' | 'HOLD', mode: RuleMode, isSwitch: boolean) => {
    if (holdAnimFrameRef.current) cancelAnimationFrame(holdAnimFrameRef.current);

    if (action === 'HOLD') {
      // Patient successfully held their hands off the controls!
      sound.playCloudHold();
      setScore((s) => s + 10);
      setCorrectAnswers((c) => c + 1);
      setWasCorrect(true);
      setUserAction('HOLD');

      onEvent({
        event_type: 'answer_correct',
        question_id: `trial_${trialIndex + 1}`,
        stimulus_type: '3d_inhibition_hold',
        expected_answer: 'HOLD',
        actual_answer: 'HOLD',
        correct: true,
        response_time: responseWindowMs,
        difficulty_level: difficulty,
        metadata: { mode, isSwitch },
      });
    } else {
      // Omission error: patient missed the window
      sound.playGentleNotice();
      setIncorrectAnswers((inc) => inc + 1);
      setOmissionErrors((o) => o + 1);
      setWasCorrect(false);
      setUserAction(null);

      onEvent({
        event_type: 'answer_incorrect',
        question_id: `trial_${trialIndex + 1}`,
        stimulus_type: `3d_omission_${action.toLowerCase()}`,
        expected_answer: action,
        actual_answer: 'TIMEOUT',
        correct: false,
        response_time: responseWindowMs,
        difficulty_level: difficulty,
        metadata: { mode, isSwitch },
      });
    }

    setStage('TRIAL_FEEDBACK');
  };

  // Handle player pressing Sun or Moon altar
  const handleUserChoice = (action: 'SUN' | 'MOON') => {
    if (stage !== 'STIMULUS') return;

    if (timeoutTimerRef.current) clearTimeout(timeoutTimerRef.current);
    if (holdAnimFrameRef.current) cancelAnimationFrame(holdAnimFrameRef.current);

    const rt = Math.round(performance.now() - trialStartRef.current);
    setUserAction(action);
    const isCorrect = action === expectedAction;

    if (isCorrect) {
      if (action === 'SUN') {
        sound.playSolarChime();
      } else {
        sound.playLunarChime();
      }
      setScore((s) => s + 10);
      setCorrectAnswers((c) => c + 1);
      setWasCorrect(true);

      // Record reaction time breakdowns
      if (currentMode === 'DIRECT') {
        setCongruentRTs((prev) => [...prev, rt]);
      } else {
        setIncongruentRTs((prev) => [...prev, rt]);
      }

      if (trialIndex > 0) {
        if (currentMode !== previousModeRef.current) {
          setSwitchRTs((prev) => [...prev, rt]);
        } else {
          setRepeatRTs((prev) => [...prev, rt]);
        }
      }
    } else {
      sound.playGentleNotice();
      setIncorrectAnswers((inc) => inc + 1);
      if (expectedAction === 'HOLD') {
        setCommissionErrors((comm) => comm + 1);
      }
      setWasCorrect(false);
    }

    setStage('TRIAL_FEEDBACK');

    onEvent({
      event_type: isCorrect ? 'answer_correct' : 'answer_incorrect',
      question_id: `trial_${trialIndex + 1}`,
      stimulus_type: `3d_choice_${action.toLowerCase()}`,
      expected_answer: expectedAction,
      actual_answer: action,
      correct: isCorrect,
      response_time: rt,
      difficulty_level: difficulty,
      metadata: { mode: currentMode },
    });
  };

  // Keyboard navigation listener (← Sun, → Moon)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (stage !== 'STIMULUS') return;
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        handleUserChoice('SUN');
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        e.preventDefault();
        handleUserChoice('MOON');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [stage, expectedAction, currentMode]);

  // Advance to next trial or complete session
  const handleContinue = () => {
    sound.playTap();
    if (trialIndex + 1 < totalTrials) {
      setTrialIndex((prev) => prev + 1);
      startNextTrial();
    } else {
      sound.playComplete();

      // Psychometric calculations
      const avgCongruent =
        congruentRTs.length > 0 ? Math.round(congruentRTs.reduce((a, b) => a + b, 0) / congruentRTs.length) : 650;
      const avgIncongruent =
        incongruentRTs.length > 0 ? Math.round(incongruentRTs.reduce((a, b) => a + b, 0) / incongruentRTs.length) : 780;
      const avgSwitch =
        switchRTs.length > 0 ? Math.round(switchRTs.reduce((a, b) => a + b, 0) / switchRTs.length) : 800;
      const avgRepeat =
        repeatRTs.length > 0 ? Math.round(repeatRTs.reduce((a, b) => a + b, 0) / repeatRTs.length) : 700;
      const switchCost = Math.max(0, avgSwitch - avgRepeat);

      onComplete({
        score,
        maxScore: totalTrials * 10,
        correctAnswers: correctAnswers + (wasCorrect ? 1 : 0),
        incorrectAnswers: incorrectAnswers + (wasCorrect ? 0 : 1),
        hintsUsed: 0,
        domainMetrics: {
          congruentRtAvg: avgCongruent,
          incongruentRtAvg: avgIncongruent,
          switchCostMs: switchCost,
          commissionErrors,
          omissionErrors,
          totalTrials,
          responseWindowMs,
          mode: difficulty >= 3 ? 'dynamic_stroop_switch' : 'direct_go_nogo',
        },
      });
    }
  };

  useEffect(() => {
    startNextTrial();
    return () => {
      if (timeoutTimerRef.current) clearTimeout(timeoutTimerRef.current);
      if (holdAnimFrameRef.current) cancelAnimationFrame(holdAnimFrameRef.current);
    };
  }, [startNextTrial]);

  return (
    <div className="flex flex-col items-center justify-between min-h-[510px] w-full max-w-2xl mx-auto p-3 sm:p-4 select-none">
      {/* Top Status & Trial Header */}
      <div className="w-full flex items-center justify-between pb-2.5 border-b border-slate-800 text-slate-300">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-bold bg-amber-950 text-amber-300 px-2.5 py-1 rounded-full border border-amber-800 flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-ping" />
            {isPractice ? '3D Practice Flight' : `Trial ${trialIndex + 1} of ${totalTrials}`}
          </span>
          <span className="text-xs text-slate-400 hidden sm:inline-block">
            Window: {(responseWindowMs / 1000).toFixed(1)}s
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 text-[11px] text-slate-400 hidden sm:flex">
            <Keyboard className="w-3.5 h-3.5" />
            <span>Hotkeys: ← / →</span>
          </div>
          <div className="text-xs font-semibold text-amber-300">Score: {score}</div>
        </div>
      </div>

      {/* Dynamic Rule & Mode Indicator Banner */}
      <div className="w-full my-2">
        <div
          className={`w-full p-2.5 rounded-xl border flex items-center justify-between text-xs transition-all ${
            currentMode === 'DIRECT'
              ? 'bg-amber-950/40 border-amber-800/60 text-amber-200'
              : 'bg-purple-950/50 border-purple-700/60 text-purple-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="text-base">{currentMode === 'DIRECT' ? '☀️' : '🌌'}</span>
            <div className="flex flex-col">
              <span className="font-bold tracking-wide uppercase text-[10px] text-slate-400">
                {currentMode === 'DIRECT' ? 'Direct Celestial Law' : 'Eclipse Mirror Law (Inverted)'}
              </span>
              <span className="font-medium">
                {currentMode === 'DIRECT'
                  ? 'Sun → Press Sun | Moon → Press Moon | Cloud → HOLD'
                  : 'Sun → Press MOON | Moon → Press SUN | Cloud → HOLD'}
              </span>
            </div>
          </div>

          <div className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-slate-900/80 border border-slate-700 text-slate-300">
            Lvl {difficulty}
          </div>
        </div>
      </div>

      {/* Main 3D Canvas Viewport */}
      <div className="relative w-full h-64 sm:h-72 rounded-2xl overflow-hidden border border-slate-800 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 shadow-2xl flex items-center justify-center">
        {/* 3D WebGL Canvas */}
        <CelestialCanvas
          stimulus={currentStimulus}
          isEclipse={currentMode === 'ECLIPSE_MIRROR'}
          userAction={userAction}
          isCorrect={wasCorrect}
          holdProgress={holdProgress}
          className="absolute inset-0"
        />

        {/* Ambient Overlay Target Cue Card for Seniors */}
        <div className="absolute top-3 left-3 pointer-events-none z-10 flex items-center gap-2 bg-slate-950/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-800">
          <span className="text-xs text-slate-400 font-mono uppercase">Sky Target:</span>
          <span className="text-xs font-bold text-slate-100 flex items-center gap-1">
            {currentStimulus === 'SUN' && (
              <>
                <Sun className="w-4 h-4 text-amber-400" />
                <span className="text-amber-300">Solar Orb</span>
              </>
            )}
            {currentStimulus === 'MOON' && (
              <>
                <Moon className="w-4 h-4 text-indigo-400" />
                <span className="text-indigo-300">Lunar Orb</span>
              </>
            )}
            {currentStimulus === 'CLOUD' && (
              <>
                <Cloud className="w-4 h-4 text-rose-400 animate-pulse" />
                <span className="text-rose-400">Storm Cloud (HOLD)</span>
              </>
            )}
          </span>
        </div>

        {/* Cloud Hold Progress Ring / Bar when Cloud is active */}
        {currentStimulus === 'CLOUD' && stage === 'STIMULUS' && (
          <div className="absolute bottom-4 inset-x-6 z-10 flex flex-col items-center bg-slate-950/85 backdrop-blur-md p-2.5 rounded-xl border border-rose-900/60 shadow-lg animate-in fade-in">
            <div className="flex items-center justify-between w-full text-xs text-rose-300 font-bold mb-1.5 px-1">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Holding self-control... Keep hands off altars
              </span>
              <span className="font-mono text-[11px] text-slate-400">
                {Math.round(holdProgress * 100)}%
              </span>
            </div>
            <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-cyan-400 to-emerald-400 h-full rounded-full transition-all duration-75"
                style={{ width: `${Math.min(100, holdProgress * 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* Feedback Overlay inside Canvas */}
        {stage === 'TRIAL_FEEDBACK' && (
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm z-20 flex flex-col items-center justify-center p-4 text-center animate-in fade-in">
            {wasCorrect ? (
              <div className="space-y-2 max-w-xs">
                <div className="w-12 h-12 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-500">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <h4 className="text-base font-bold text-emerald-300">
                  {expectedAction === 'HOLD' ? 'Peaceful Restraint Achieved!' : 'Aligned with the Cosmos!'}
                </h4>
                <p className="text-xs text-slate-300 leading-tight">
                  {expectedAction === 'HOLD'
                    ? 'You wisely let the storm pass without touching the altars.'
                    : `Correct action: ${expectedAction.toLowerCase()} triggered.`}
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-w-xs">
                <div className="w-12 h-12 bg-amber-500/20 text-amber-400 rounded-full flex items-center justify-center mx-auto border border-amber-500">
                  {expectedAction === 'HOLD' ? (
                    <ShieldAlert className="w-7 h-7" />
                  ) : (
                    <AlertCircle className="w-7 h-7" />
                  )}
                </div>
                <h4 className="text-base font-bold text-amber-300">
                  {expectedAction === 'HOLD' ? 'Storm Disturbance' : 'Celestial Misalignment'}
                </h4>
                <p className="text-xs text-slate-300 leading-tight">
                  {expectedAction === 'HOLD'
                    ? 'Whenever clouds drift into the sky, hold your hands still!'
                    : `In this sky phase, target required: ${expectedAction.toLowerCase()}.`}
                </p>
              </div>
            )}

            <button
              id="btn-next-trial-celestial"
              onClick={handleContinue}
              className="mt-4 px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg transition cursor-pointer active:scale-95"
            >
              {trialIndex + 1 < totalTrials ? 'Continue to Next Horizon' : 'Complete 3D Session'}
            </button>
          </div>
        )}
      </div>

      {/* Dual Tactile 3D Altar Action Pads */}
      <div className="w-full grid grid-cols-2 gap-4 mt-3">
        {/* Sun Altar Button */}
        <button
          id="btn-action-sun"
          onClick={() => handleUserChoice('SUN')}
          disabled={stage !== 'STIMULUS'}
          className={`h-20 sm:h-24 rounded-2xl border-2 transition-all transform active:scale-95 cursor-pointer flex flex-col items-center justify-center gap-1 shadow-xl disabled:opacity-50 ${
            userAction === 'SUN'
              ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-[0_0_20px_rgba(251,191,36,0.6)]'
              : 'bg-gradient-to-b from-amber-950/60 to-slate-900 border-amber-600/70 hover:border-amber-400 text-amber-300 hover:bg-amber-950/80'
          }`}
        >
          <div className="flex items-center gap-2">
            <Sun className="w-6 h-6 text-amber-400 animate-spin-slow" />
            <span className="text-base sm:text-lg font-black tracking-wide uppercase">
              Sun Altar
            </span>
          </div>
          <span className="text-[10px] font-mono text-amber-400/80">Press Left Key (←) or Tap</span>
        </button>

        {/* Moon Altar Button */}
        <button
          id="btn-action-moon"
          onClick={() => handleUserChoice('MOON')}
          disabled={stage !== 'STIMULUS'}
          className={`h-20 sm:h-24 rounded-2xl border-2 transition-all transform active:scale-95 cursor-pointer flex flex-col items-center justify-center gap-1 shadow-xl disabled:opacity-50 ${
            userAction === 'MOON'
              ? 'bg-indigo-500 text-white border-indigo-400 shadow-[0_0_20px_rgba(99,102,241,0.6)]'
              : 'bg-gradient-to-b from-indigo-950/60 to-slate-900 border-indigo-600/70 hover:border-indigo-400 text-indigo-300 hover:bg-indigo-950/80'
          }`}
        >
          <div className="flex items-center gap-2">
            <Moon className="w-6 h-6 text-indigo-400" />
            <span className="text-base sm:text-lg font-black tracking-wide uppercase">
              Moon Altar
            </span>
          </div>
          <span className="text-[10px] font-mono text-indigo-400/80">Press Right Key (→) or Tap</span>
        </button>
      </div>

      {/* Helpful Senior Guidance Note */}
      <div className="w-full text-center text-[11px] text-slate-400 pt-2 flex items-center justify-center gap-1.5">
        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
        <span>Notice the 3D celestial body in the sky. If storm clouds appear, hold back and do not press!</span>
      </div>
    </div>
  );
};
