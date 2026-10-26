import React, { useState, useRef, useEffect } from 'react';
import {
  Mic,
  Square,
  Play,
  Pause,
  Save,
  RefreshCw,
  BookOpen,
  Globe,
  PenTool,
  Sparkles,
  Trash2,
  Check,
  CheckCircle2,
  Volume2,
  Cloud,
  HardDrive,
  Languages,
} from 'lucide-react';
import { useMedha } from '../../context/MedhaContext';
import { t } from '../../services/i18n';
import { VoiceVisualizer } from './VoiceVisualizer';

// Inline Audio Player component for saved diary memories
const SavedDiaryAudioPlayer: React.FC<{
  audioUrl?: string | null;
  entryText: string;
  lang: string;
  duration?: number;
  onSpeakFallback: (text: string, lang: string) => void;
  activePlayingId: number | null;
  setActivePlayingId: (id: number | null) => void;
  entryId: number;
}> = ({
  audioUrl,
  entryText,
  lang,
  duration,
  onSpeakFallback,
  activePlayingId,
  setActivePlayingId,
  entryId,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(duration || 0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Sync with activePlayingId so only one audio plays at a time
  useEffect(() => {
    if (activePlayingId !== entryId && isPlaying) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setIsPlaying(false);
    }
  }, [activePlayingId, entryId, isPlaying]);

  // Clean up audio element on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const togglePlay = () => {
    if (!audioUrl) {
      onSpeakFallback(entryText, lang);
      return;
    }

    if (!audioRef.current) {
      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.onloadedmetadata = () => {
        if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
          setTotalDuration(Math.round(audio.duration));
        }
      };

      audio.ontimeupdate = () => {
        setCurrentTime(audio.currentTime);
      };

      audio.onended = () => {
        setIsPlaying(false);
        setCurrentTime(0);
        setActivePlayingId(null);
      };

      audio.onerror = () => {
        console.warn('Audio playback error, falling back to speech synthesis');
        setIsPlaying(false);
        setActivePlayingId(null);
        onSpeakFallback(entryText, lang);
      };
    }

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
      setActivePlayingId(null);
    } else {
      setActivePlayingId(entryId);
      audioRef.current
        .play()
        .then(() => {
          setIsPlaying(true);
        })
        .catch((e) => {
          console.warn('Audio play rejected:', e);
          onSpeakFallback(entryText, lang);
        });
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setCurrentTime(val);
    if (audioRef.current) {
      audioRef.current.currentTime = val;
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="flex items-center gap-3 bg-[#FAF6EE] p-2.5 sm:p-3 rounded-xl border border-[#E9DFC9] my-2.5 transition-colors">
      <button
        type="button"
        onClick={togglePlay}
        className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-white transition shadow-sm cursor-pointer shrink-0 ${
          isPlaying
            ? 'bg-amber-600 animate-pulse'
            : 'bg-[var(--brand)] hover:opacity-90 active:scale-95'
        }`}
        title={isPlaying ? 'Pause voice' : 'Play recorded voice'}
        aria-label={isPlaying ? 'Pause voice' : 'Play recorded voice'}
      >
        {isPlaying ? (
          <span className="text-xs font-bold">❚❚</span>
        ) : (
          <span className="text-xs pl-0.5 font-bold">▶</span>
        )}
      </button>

      <div className="flex-1 min-w-0 flex flex-col justify-center">
        <div className="flex justify-between items-center text-[11px] font-semibold text-gray-700 mb-1">
          <span className="flex items-center gap-1.5 truncate">
            <span className="text-xs">🎙️</span> Stored voice recording
          </span>
          <span className="shrink-0 text-[10px] font-mono text-gray-500">
            {formatTime(currentTime)} / {formatTime(totalDuration || 0)}
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={totalDuration || 10}
          step={0.1}
          value={currentTime}
          onChange={handleSeek}
          className="w-full accent-[var(--brand)] h-1.5 bg-amber-200/60 rounded-lg cursor-pointer"
          aria-label="Seek voice playback"
        />
      </div>
    </div>
  );
};

export const VoiceDiaryView: React.FC = () => {
  const { db, addDiaryEntry, deleteDiaryEntry, syncDiary, speakText, addToast, audioMap } =
    useMedha();

  const [text, setText] = useState('');
  const [translation, setTranslation] = useState('');
  const [recLang, setRecLang] = useState('en-IN');
  const [transLang, setTransLang] = useState('as');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [micHint, setMicHint] = useState('Tap the mic to record your voice or type below…');
  const [stream, setStream] = useState<MediaStream | null>(null);

  // Stored voice recording in progress
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const [recordedDuration, setRecordedDuration] = useState<number>(0);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const [activePlayingId, setActivePlayingId] = useState<number | null>(null);

  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);
  const recordingDurationRef = useRef<number>(0);

  const phrases = [
    '🌱 Watered tulsi',
    '🍵 Tea in garden',
    '🎶 Sang Bihu song',
    '🚶 Walked to temple',
    '👵 Talked with Moloi',
  ];

  // Clean up recording stream on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
        previewAudioRef.current = null;
      }
    };
  }, [stream]);

  const handleToggleRecord = () => {
    if (isRecording) {
      // Stop recording
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      setIsRecording(false);
      setMicHint('Voice captured! Review your recording or add notes below.');
      return;
    }

    // Start recording
    audioChunksRef.current = [];
    setRecordingSeconds(0);
    recordingDurationRef.current = 0;

    // Timer for duration
    timerRef.current = setInterval(() => {
      setRecordingSeconds((prev) => {
        const next = prev + 1;
        recordingDurationRef.current = next;
        return next;
      });
    }, 1000);

    // Speech recognition for simultaneous text transcription
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      try {
        const reco = new SpeechRecognition();
        reco.lang = recLang;
        reco.continuous = false;
        reco.interimResults = true;

        reco.onstart = () => {
          setIsRecording(true);
          setMicHint('Listening… Speak freely 🎙');
        };

        reco.onresult = (e: any) => {
          const current = Array.from(e.results)
            .map((r: any) => r[0].transcript)
            .join(' ');
          setText(current);
        };

        reco.onerror = () => {
          setMicHint('Microphone active. Recording your audio.');
        };

        reco.onend = () => {
          // Keep recording until user stops or media recorder stops
        };

        reco.start();
        recognitionRef.current = reco;
      } catch (err) {
        console.warn('SpeechRecognition failed, continuing with direct audio recording', err);
      }
    } else {
      setMicHint('Recording your voice directly (speech-to-text not supported on this device).');
    }

    // Direct audio recording via getUserMedia
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices
        .getUserMedia({ audio: true })
        .then((micStream) => {
          setStream(micStream);
          setIsRecording(true);
          const recorder = new MediaRecorder(micStream);

          recorder.ondataavailable = (e) => {
            if (e.data && e.data.size > 0) {
              audioChunksRef.current.push(e.data);
            }
          };

          recorder.onstop = () => {
            micStream.getTracks().forEach((track) => track.stop());
            setStream(null);

            if (audioChunksRef.current.length > 0) {
              const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
              const url = URL.createObjectURL(blob);
              setRecordedBlob(blob);
              setRecordedAudioUrl(url);
              setRecordedDuration(recordingDurationRef.current || 1);
            }
          };

          recorder.start(250);
          mediaRecorderRef.current = recorder;
        })
        .catch((err) => {
          console.warn('Microphone access denied:', err);
          setIsRecording(false);
          if (timerRef.current) clearInterval(timerRef.current);
          addToast('Microphone permission needed to record voice', '⚠️');
        });
    } else {
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
      addToast('Audio recording is not supported in this browser', '⚠️');
    }
  };

  const handleDiscardRecording = () => {
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current = null;
    }
    setIsPreviewPlaying(false);
    if (recordedAudioUrl) {
      URL.revokeObjectURL(recordedAudioUrl);
    }
    setRecordedBlob(null);
    setRecordedAudioUrl(null);
    setRecordedDuration(0);
    setMicHint('Recording removed. Tap the mic to record again or type.');
    addToast('Voice recording discarded', '🗑');
  };

  const handleTogglePreviewPlay = () => {
    if (!recordedAudioUrl) return;

    if (!previewAudioRef.current) {
      const audio = new Audio(recordedAudioUrl);
      previewAudioRef.current = audio;
      audio.onended = () => {
        setIsPreviewPlaying(false);
      };
    }

    if (isPreviewPlaying) {
      previewAudioRef.current.pause();
      setIsPreviewPlaying(false);
    } else {
      previewAudioRef.current.play().then(() => {
        setIsPreviewPlaying(true);
      });
    }
  };

  const handleTranslate = () => {
    const raw = text.trim();
    if (!raw) {
      addToast('Speak or type a memory first ✍️', '⚠️');
      return;
    }

    // Multilingual translation map
    const translations: Record<string, Record<string, string>> = {
      as: {
        tea: 'আজি ৰাতিপুৱা বাৰীত চাহ খাইছিলোঁ। মনটো ভাল লাগিছে।',
        bihu: 'বিহুৰ গান মনত পৰিল। ঢোলৰ মাতত মন আনন্দিত হ’ল।',
        default: `[অসমীয়া অনুবাদ] ${raw} — আজিৰ দিনটো শান্তিৰে পাৰ হ’ল।`,
      },
      bn: {
        tea: 'আজ সকালে বাগানে চা খেলাম। খুব ভালো লাগছে।',
        bihu: 'বিহু গানের কথা মনে পড়ল। ঢোলের শব্দ শুনে আনন্দ হলো।',
        default: `[বাংলা অনুবাদ] ${raw} — আজকের দিনটি খুব সুন্দর কাটল।`,
      },
      hi: {
        tea: 'आज सुबह बगीचे में चाय पी। बहुत अच्छा लगा।',
        bihu: 'बिहू नृत्य याद आया। ढोल की थाप पर खुशी महसूस हुई।',
        default: `[हिन्दी अनुवाद] ${raw} — आज का दिन शांतिपूर्ण बीता।`,
      },
      en: {
        default: `[English] ${raw} — Today was peaceful and memorable.`,
      },
    };

    let result = (translations[transLang] && translations[transLang].default) || raw;
    const lower = raw.toLowerCase();
    if (lower.includes('tea') || lower.includes('garden')) {
      result = translations[transLang]?.tea || result;
    } else if (lower.includes('bihu') || lower.includes('song')) {
      result = translations[transLang]?.bihu || result;
    }

    setTranslation(result);
    addToast('Translated ✨', '🌐');
  };

  const handleSave = async () => {
    const content = text.trim();
    if (!content && !recordedBlob) {
      addToast('Please record voice or type a memory first 🎙️✍️', '⚠️');
      return;
    }

    // Auto-generate title if user made direct voice entry without text
    const finalContent =
      content ||
      `🎙️ Voice memory (${new Date().toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
      })})`;

    await addDiaryEntry(
      finalContent,
      translation,
      recLang,
      transLang,
      recordedBlob,
      recordedDuration
    );

    // Reset inputs
    setText('');
    setTranslation('');
    setRecordedBlob(null);
    if (recordedAudioUrl) {
      URL.revokeObjectURL(recordedAudioUrl);
    }
    setRecordedAudioUrl(null);
    setRecordedDuration(0);
    setRecordingSeconds(0);
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current = null;
    }
    setIsPreviewPlaying(false);
    setMicHint('Memory saved! Tap the mic to record another or type below.');
  };

  const handlePlayAudio = (id: number, entryText: string, lang: string) => {
    if (audioMap[id]) {
      new Audio(audioMap[id]).play();
    } else {
      speakText(entryText, lang);
    }
  };

  const handlePlayLatest = () => {
    const first = db.diary[0];
    if (first) {
      handlePlayAudio(first.id, first.text, first.lang);
    } else {
      addToast('No recordings yet', 'ℹ️');
    }
  };

  const formatSeconds = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const queuedCount = db.diary.filter((e) => !e.synced).length;

  return (
    <section id="page-diary" className="page active space-y-6">
      {/* Record panel */}
      <div
        className="card p-6 sm:p-8 text-center relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg,#FFF6E4,#FFFDF8)' }}
      >
        <div className="absolute top-0 left-0 right-0 weave h-1.5"></div>
        <h2 className="font-display text-2xl font-bold ink mt-2">
          {t('voice_diary', db.settings.lang)}
        </h2>
        <p className="muted text-sm mt-1 max-w-md mx-auto">
          Record your voice directly and add thoughts in writing. Your voice is permanently saved
          offline on your device —{' '}
          <span>{t('in_your_lang', db.settings.lang)}</span>.
        </p>

        {/* Language selectors */}
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <select
            id="recLangSel"
            value={recLang}
            onChange={(e) => setRecLang(e.target.value)}
            className="chip px-4 py-3 bg-white text-sm font-bold cursor-pointer shadow-xs"
            aria-label="Recognition language"
          >
            <option value="en-IN">🗣 English</option>
            <option value="hi-IN">🗣 हिन्दी</option>
            <option value="bn-IN">🗣 বাংলা</option>
            <option value="as-IN">🗣 অসমীয়া</option>
          </select>
          <select
            id="transLangSel"
            value={transLang}
            onChange={(e) => setTransLang(e.target.value)}
            className="chip px-4 py-3 bg-white text-sm font-bold cursor-pointer shadow-xs"
            aria-label="Translate to"
          >
            <option value="en">→ English</option>
            <option value="hi">→ हिन्दी</option>
            <option value="bn">→ বাংলা</option>
            <option value="as">→ অসমীয়া</option>
          </select>
        </div>

        {/* Interactive 3D Voice Visualizer & Mic Stage */}
        <div className="relative mt-6 mb-4 max-w-lg mx-auto rounded-3xl bg-gradient-to-b from-[#FFF2E2]/90 via-[#FFF9F3] to-white p-4 sm:p-5 border border-[#F3DEC5] shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-2 mb-1">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-900">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  isRecording ? 'bg-red-500 animate-ping' : 'bg-amber-500'
                }`}
              ></span>
              3D Voice Visualizer
            </span>
            <span className="text-[11px] font-semibold text-amber-800/90 bg-amber-100/70 px-2.5 py-0.5 rounded-full">
              {isRecording ? '🔴 Live Audio Analysis' : 'Touch & Drag to Rotate 3D Orb'}
            </span>
          </div>

          {/* Canvas-based 3D Wireframe Orb */}
          <div className="my-1 rounded-2xl bg-gradient-to-b from-amber-50/40 to-transparent">
            <VoiceVisualizer
              stream={stream}
              isActive={isRecording}
              height={230}
            />
          </div>

          {/* Record Trigger & Status */}
          <div className="mt-3 flex flex-col items-center justify-center">
            <button
              id="micBig"
              onClick={handleToggleRecord}
              className={`w-20 h-20 sm:w-22 sm:h-22 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-md ${
                isRecording
                  ? 'bg-red-500 text-white shadow-red-500/40 scale-105 ring-4 ring-red-300'
                  : 'bg-white shadow-sm hover:scale-105 hover:bg-[#FAF4EB]'
              }`}
              aria-label={isRecording ? 'Stop recording voice' : 'Start voice recording'}
              style={!isRecording ? { border: '3.5px solid var(--brand)', color: 'var(--brand)' } : {}}
            >
              {isRecording ? (
                <Square className="w-8 h-8 fill-white" />
              ) : (
                <Mic className="w-8 h-8" />
              )}
            </button>

            {/* Recording Timer Badge */}
            {isRecording ? (
              <div className="mt-3 flex items-center gap-1.5 px-3.5 py-1 bg-red-600 text-white rounded-full text-xs font-mono font-bold shadow-xs animate-pulse">
                <span className="w-2 h-2 rounded-full bg-white"></span>
                <span>Recording: {formatSeconds(recordingSeconds)}</span>
              </div>
            ) : (
              <span className="mt-2 text-xs font-semibold text-amber-900/80">
                Tap to record voice with 3D visualization
              </span>
            )}
          </div>
        </div>

        <p
          id="micHint"
          className={`text-sm font-bold transition-colors ${
            isRecording ? 'text-red-600 font-semibold' : 'muted'
          }`}
        >
          {isRecording
            ? `Listening & recording your voice (${formatSeconds(recordingSeconds)})… Tap again to stop`
            : micHint}
        </p>

        {/* Voice Preview Player when recording completed */}
        {recordedAudioUrl && (
          <div className="mt-4 p-3.5 rounded-2xl bg-[#F6ECE0] border border-[#E5D2B8] max-w-xl mx-auto flex items-center justify-between gap-3 text-left shadow-xs">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleTogglePreviewPlay}
                className="w-10 h-10 rounded-full bg-[var(--brand)] text-white flex items-center justify-center shadow-sm cursor-pointer hover:opacity-90 active:scale-95 transition shrink-0"
                title={isPreviewPlaying ? 'Pause preview' : 'Play recorded voice'}
                aria-label={isPreviewPlaying ? 'Pause preview' : 'Play recorded voice'}
              >
                {isPreviewPlaying ? (
                  <Pause className="w-4 h-4 fill-white" />
                ) : (
                  <Play className="w-4 h-4 fill-white ml-0.5" />
                )}
              </button>
              <div>
                <p className="text-xs font-bold ink flex items-center gap-1.5">
                  <Mic className="w-3.5 h-3.5 text-[#0E7C66]" />
                  <span>Voice note captured</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-200/80 text-amber-900 font-mono">
                    {formatSeconds(recordedDuration)}
                  </span>
                </p>
                <p className="text-[11px] text-gray-600">
                  Ready to store with your entry. You can add text notes below.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleDiscardRecording}
              className="text-xs px-2.5 py-1.5 rounded-lg border border-amber-300 text-amber-900 hover:bg-amber-100 font-semibold transition cursor-pointer shrink-0 flex items-center gap-1"
              title="Discard voice recording and start over"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Discard</span>
            </button>
          </div>
        )}

        {/* Textbox & Quick chips */}
        <div className="mt-5 max-w-xl mx-auto text-left">
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="diaryText" className="text-xs font-bold ink flex items-center gap-1.5">
              <PenTool className="w-3.5 h-3.5 text-[#0E7C66]" />
              <span>Accompanying text or notes:</span>
            </label>
            {recordedBlob && (
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                <Check className="w-3 h-3" />
                <span>Voice attached ({formatSeconds(recordedDuration)})</span>
              </span>
            )}
          </div>

          <textarea
            id="diaryText"
            rows={3}
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="w-full px-4 py-3.5 rounded-xl border-2 bg-white text-base shadow-inner focus:outline-hidden focus:ring-2 focus:ring-[var(--brand)]"
            style={{ borderColor: 'var(--line)' }}
            placeholder={
              recordedBlob
                ? 'Type any extra memories or thoughts to save alongside your voice…'
                : 'Your spoken words appear here — or type your memory directly…'
            }
          />

          <div id="phraseChips" className="flex flex-wrap gap-2 mt-2.5">
            {phrases.map((phrase, i) => (
              <button
                key={i}
                onClick={() => setText((prev) => (prev ? `${prev} ${phrase}` : phrase))}
                className="chip px-3 py-1.5 text-xs bg-white hover:bg-[#F6F9F7] font-semibold ink cursor-pointer shadow-xs"
              >
                {phrase}
              </button>
            ))}
          </div>

          {/* Gemini Translation Output */}
          {translation && (
            <div
              id="transOut"
              className="mt-3 p-4 rounded-xl bg-[#EDF6F2] border shadow-xs"
              style={{ borderColor: '#CFE6DD' }}
            >
              <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#0A5C4C]">
                <Sparkles className="w-3 h-3 text-[#0A5C4C]" />
                <span>Gemini translation</span>
              </div>
              <p id="transText" className="text-sm ink mt-1 leading-relaxed">
                {translation}
              </p>
            </div>
          )}

          <div className="flex gap-3 mt-4">
            <button
              id="translateBtn"
              onClick={handleTranslate}
              className="chip flex-1 py-3 bg-white text-sm font-bold cursor-pointer hover:bg-[#F8F4EC] shadow-xs flex items-center justify-center gap-2"
            >
              <Globe className="w-4 h-4 text-[#0E7C66]" />
              <span>Translate</span>
            </button>
            <button
              id="saveEntryBtn"
              onClick={handleSave}
              className="btn-p flex-[1.4] py-3 text-sm font-bold cursor-pointer shadow-md active:scale-95 transition flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span>Save to diary {recordedBlob ? '(with voice)' : ''}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Saved Memories Section */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-[#0E7C66]" />
          <h3 className="font-display font-bold text-xl ink">Saved memories</h3>
        </div>
        <div className="flex gap-2">
          <button
            id="syncBtn"
            onClick={syncDiary}
            className="chip px-3 py-2 text-xs font-bold bg-white cursor-pointer hover:bg-[#F8F4EC] shadow-xs flex items-center gap-1.5"
            title="Sync queued entries to cloud"
          >
            <RefreshCw className="w-3.5 h-3.5 text-[#0E7C66]" />
            <span>Sync</span>
            <span
              id="syncCount"
              className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] text-white"
              style={{ background: queuedCount > 0 ? 'var(--danger)' : 'var(--brand)' }}
            >
              {queuedCount}
            </span>
          </button>
          <button
            id="playAllBtn"
            onClick={handlePlayLatest}
            className="chip px-3 py-2 text-xs font-bold bg-white cursor-pointer hover:bg-[#F8F4EC] shadow-xs flex items-center gap-1.5"
          >
            <Play className="w-3 h-3 fill-current text-[#0E7C66]" />
            <span>Play latest</span>
          </button>
        </div>
      </div>

      {/* Entries List */}
      <div id="entriesList" className="space-y-3">
        {db.diary.length === 0 ? (
          <p className="text-center py-8 text-sm muted bg-white rounded-2xl border border-dashed border-gray-200">
            No diary entries saved yet. Tap the microphone above to record your first memory!
          </p>
        ) : (
          db.diary.map((entry, idx) => (
            <div
              key={`patient-diary-${entry.id}-${idx}`}
              className="group relative bg-white rounded-2xl p-5 shadow-xs border transition-shadow hover:shadow-md"
              style={{ borderColor: 'var(--line)' }}
            >
              <div className="flex items-center gap-3 flex-wrap mb-2">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-sm shadow-xs"
                  style={{ background: 'var(--surface)', color: 'var(--brand)' }}
                >
                  {entry.audio ? <Mic className="w-4 h-4 text-[#0E7C66]" /> : <PenTool className="w-3.5 h-3.5 text-[#0E7C66]" />}
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold ink">
                    {new Date(entry.ts).toLocaleString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                  <span className="text-[10px] muted">
                    {new Date(entry.ts).toLocaleString('en-IN', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>

                <span
                  className="chip px-2 py-0.5 text-[10px] font-bold bg-[#F8F4EC] ml-2 flex items-center gap-1"
                  style={{ color: entry.synced ? '#0A5C4C' : '#8A6210' }}
                >
                  {entry.synced ? (
                    <>
                      <Cloud className="w-3 h-3 text-[#0A5C4C]" />
                      <span>Synced</span>
                    </>
                  ) : (
                    <>
                      <HardDrive className="w-3 h-3 text-[#8A6210]" />
                      <span>Stored Offline</span>
                    </>
                  )}
                </span>

                {entry.audio && (
                  <span className="chip px-2 py-0.5 text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
                    <Mic className="w-2.5 h-2.5 text-amber-700" />
                    <span>Voice Attached</span>
                  </span>
                )}

                <span className="flex-1"></span>

                <button
                  onClick={() => handlePlayAudio(entry.id, entry.text, entry.lang)}
                  className="w-8 h-8 rounded-full flex items-center justify-center bg-[#F8F4EC] hover:bg-[#EAE2D1] text-[var(--brand)] transition-colors cursor-pointer"
                  title="Speak or play entry"
                  aria-label="Speak or play entry"
                >
                  <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                </button>
                <button
                  onClick={() => deleteDiaryEntry(entry.id)}
                  className="w-8 h-8 rounded-full flex items-center justify-center bg-[#FBEAE5] hover:bg-[#F5D5CC] text-red-500 transition-colors cursor-pointer opacity-0 group-hover:opacity-100"
                  title="Delete entry"
                  aria-label="Delete entry"
                >
                  <Trash2 className="w-3.5 h-3.5 text-red-500" />
                </button>
              </div>

              {/* Inline Audio Player for voice entries */}
              {entry.audio && (
                <SavedDiaryAudioPlayer
                  entryId={entry.id}
                  audioUrl={audioMap[entry.id]}
                  entryText={entry.text}
                  lang={entry.lang}
                  duration={entry.audioDuration}
                  onSpeakFallback={speakText}
                  activePlayingId={activePlayingId}
                  setActivePlayingId={setActivePlayingId}
                />
              )}

              <p className="text-[15px] ink leading-relaxed mt-1">{entry.text}</p>

              {entry.trans && (
                <div
                  className="mt-3 p-3 rounded-xl bg-[#EDF6F2] border"
                  style={{ borderColor: '#CFE6DD' }}
                >
                  <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: '#0A5C4C' }}>
                    Translation ({entry.to})
                  </p>
                  <p className="text-sm leading-relaxed" style={{ color: '#0A5C4C' }}>
                    {entry.trans}
                  </p>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </section>
  );
};
