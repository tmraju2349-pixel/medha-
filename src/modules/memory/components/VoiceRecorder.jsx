import {
  Mic,
  MicOff,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  Square,
  Trash2,
  Upload,
  Volume2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  fileToAudioDataUrl,
  formatAudioTime,
  generateSampleChimeAudio,
  isAudioRecordingSupported,
  startAudioRecording,
} from "../services/audioUtils";

const VISUALIZER_BARS = [
  { id: "vb-1", height: 40 },
  { id: "vb-2", height: 75 },
  { id: "vb-3", height: 55 },
  { id: "vb-4", height: 90 },
  { id: "vb-5", height: 60 },
  { id: "vb-6", height: 80 },
  { id: "vb-7", height: 45 },
];

export default function VoiceRecorder({
  audioUrl,
  audioDuration = 0,
  onChange,
}) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackTime, setPlaybackTime] = useState(0);
  const [errorMessage, setErrorMessage] = useState(null);

  const recorderRef = useRef(null);
  const timerIntervalRef = useRef(null);
  const audioElementRef = useRef(null);
  const fileInputRef = useRef(null);

  const supported = isAudioRecordingSupported();

  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (recorderRef.current) recorderRef.current.cancel();
      if (audioElementRef.current) {
        audioElementRef.current.pause();
      }
    };
  }, []);

  const handleStartRecording = async () => {
    setErrorMessage(null);
    try {
      const recorder = await startAudioRecording();
      recorderRef.current = recorder;
      setIsRecording(true);
      setRecordingSeconds(0);

      timerIntervalRef.current = setInterval(() => {
        setRecordingSeconds((sec) => sec + 1);
      }, 1000);
    } catch (_err) {
      setErrorMessage(
        "Could not access microphone. Please check browser permissions or upload an audio file below.",
      );
      setIsRecording(false);
    }
  };

  const handleStopRecording = async () => {
    if (!recorderRef.current) return;
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);

    try {
      const result = await recorderRef.current.stop();
      setIsRecording(false);
      onChange(result.audioUrl, result.duration);
    } catch (_err) {
      setErrorMessage("Failed to save audio recording.");
      setIsRecording(false);
    }
  };

  const handleCancelRecording = () => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    if (recorderRef.current) recorderRef.current.cancel();
    setIsRecording(false);
    setRecordingSeconds(0);
  };

  const handleTogglePlay = () => {
    if (!audioElementRef.current) return;
    if (isPlaying) {
      try {
        audioElementRef.current.pause?.();
      } catch {
        // Ignored
      }
      setIsPlaying(false);
    } else {
      try {
        const p = audioElementRef.current.play?.();
        if (p?.then) {
          p.then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
        } else {
          setIsPlaying(true);
        }
      } catch {
        setIsPlaying(false);
      }
    }
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
    setPlaybackTime(0);
  };

  const handleAudioTimeUpdate = () => {
    if (audioElementRef.current) {
      setPlaybackTime(Math.round(audioElementRef.current.currentTime));
    }
  };

  const handleAudioFileUpload = async (file) => {
    if (!file) return;
    setErrorMessage(null);
    try {
      const { audioUrl: url, duration } = await fileToAudioDataUrl(file);
      onChange(url, duration);
    } catch (_err) {
      setErrorMessage("Could not load audio file.");
    }
  };

  const handleAddSampleVoiceNote = () => {
    const sample = generateSampleChimeAudio(480, 4);
    if (sample) {
      onChange(sample, 4);
    }
  };

  const handleRemove = () => {
    if (audioElementRef.current) {
      try {
        audioElementRef.current.pause?.();
      } catch {
        // Ignored
      }
    }
    setIsPlaying(false);
    onChange(null, 0);
  };

  return (
    <div className="flex flex-col gap-2.5">
      <div className="text-lg font-bold text-foreground flex items-center justify-between">
        <span className="flex items-center gap-2">
          <Mic className="h-5 w-5 text-primary" aria-hidden="true" />
          Voice Note &amp; Spoken Message
        </span>
        {audioUrl && (
          <button
            type="button"
            onClick={handleRemove}
            className="text-sm font-semibold text-destructive hover:underline flex items-center gap-1"
          >
            <Trash2 className="h-4 w-4" /> Remove Audio
          </button>
        )}
      </div>

      {audioUrl ? (
        /* Recorded Audio Preview */
        <div className="flex flex-col gap-3 rounded-2xl border-2 border-accent/40 bg-accent/10 p-4 sm:p-5">
          <audio
            ref={audioElementRef}
            src={audioUrl}
            onEnded={handleAudioEnded}
            onTimeUpdate={handleAudioTimeUpdate}
            className="hidden"
          >
            <track kind="captions" />
          </audio>

          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleTogglePlay}
                className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md transition-transform hover:scale-105"
                aria-label={isPlaying ? "Pause voice note" : "Play voice note"}
              >
                {isPlaying ? (
                  <Pause className="h-7 w-7" />
                ) : (
                  <Play className="h-7 w-7 ml-0.5" />
                )}
              </button>

              <div>
                <span className="font-bold text-base text-foreground block">
                  Voice Note Attached
                </span>
                <span className="text-sm text-muted-foreground">
                  {isPlaying ? formatAudioTime(playbackTime) : "00:00"} /{" "}
                  {formatAudioTime(audioDuration || 5)}
                </span>
              </div>
            </div>

            {/* Visualizer animation bars */}
            <div className="flex items-center gap-1">
              {VISUALIZER_BARS.map((bar, i) => (
                <span
                  key={bar.id}
                  className={`w-1 rounded-full bg-primary transition-all duration-300 ${
                    isPlaying ? "animate-pulse" : "opacity-40"
                  }`}
                  style={{
                    height: isPlaying ? `${bar.height * 0.3}px` : "10px",
                    animationDelay: `${i * 120}ms`,
                  }}
                />
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between border-t border-accent/20 pt-3 gap-2">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Volume2 className="h-4 w-4 text-accent" /> Will play when patient
              clicks "Listen"
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  handleRemove();
                  handleStartRecording();
                }}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-bold text-foreground hover:bg-muted"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Re-record
              </button>
            </div>
          </div>
        </div>
      ) : isRecording ? (
        /* Active Recording View */
        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-destructive/50 bg-destructive/5 p-6 text-center animate-pulse">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-lg">
            <Mic className="h-8 w-8 animate-bounce" />
          </div>

          <div>
            <span className="text-2xl font-mono font-bold text-destructive">
              {formatAudioTime(recordingSeconds)}
            </span>
            <p className="text-sm text-foreground font-medium mt-1">
              Recording your voice message… Speak gently and clearly
            </p>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleStopRecording}
              className="inline-flex items-center gap-2 rounded-full bg-destructive px-6 py-3 text-base font-bold text-destructive-foreground shadow-md hover:opacity-90"
            >
              <Square className="h-5 w-5 fill-current" /> Finish Recording
            </button>
            <button
              type="button"
              onClick={handleCancelRecording}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-5 py-3 text-base font-bold text-secondary-foreground hover:bg-muted"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        /* Empty / Record Prompt View */
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-border bg-card/60 p-5 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/15 text-accent-foreground">
            <Mic className="h-6 w-6" aria-hidden="true" />
          </div>
          <div>
            <p className="text-base font-bold text-foreground">
              Add a personalized voice message
            </p>
            <p className="text-sm text-muted-foreground">
              Record a loved one's voice, greetings, stories, or reassuring
              words
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 mt-1">
            <button
              type="button"
              onClick={handleStartRecording}
              disabled={!supported}
              title={
                !supported
                  ? "Microphone recording is not supported in this browser"
                  : "Record voice note"
              }
              className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2.5 text-sm font-bold text-accent-foreground hover:opacity-90 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Mic className="h-4 w-4" /> Record Voice Note
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary px-3.5 py-2 text-sm font-bold text-secondary-foreground hover:bg-muted"
            >
              <Upload className="h-4 w-4" /> Upload Audio File
            </button>
            <button
              type="button"
              onClick={handleAddSampleVoiceNote}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary px-3.5 py-2 text-sm font-bold text-secondary-foreground hover:bg-muted"
            >
              <Sparkles className="h-4 w-4 text-warning" /> Sample Chime Note
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.[0]) {
                handleAudioFileUpload(e.target.files[0]);
              }
            }}
          />
        </div>
      )}

      {errorMessage && (
        <p className="text-sm font-medium text-destructive">{errorMessage}</p>
      )}
    </div>
  );
}
