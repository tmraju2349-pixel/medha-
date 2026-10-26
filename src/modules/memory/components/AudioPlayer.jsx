import { Mic, Pause, Play, RotateCcw, Volume2, VolumeX } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { formatAudioTime } from "../services/audioUtils";

const WAVE_BARS = [
  { id: "wb-0", h: 35 },
  { id: "wb-1", h: 65 },
  { id: "wb-2", h: 95 },
  { id: "wb-3", h: 50 },
  { id: "wb-4", h: 80 },
  { id: "wb-5", h: 45 },
  { id: "wb-6", h: 90 },
  { id: "wb-7", h: 70 },
  { id: "wb-8", h: 40 },
  { id: "wb-9", h: 85 },
  { id: "wb-10", h: 60 },
  { id: "wb-11", h: 30 },
];

export default function AudioPlayer({
  audioUrl,
  audioDuration = 0,
  title = "Voice Note",
  onProgress,
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(audioDuration || 0);
  const [isMuted, setIsMuted] = useState(false);

  const audioRef = useRef(null);

  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    if (audioRef.current) {
      try {
        audioRef.current.currentTime = 0;
        audioRef.current.pause?.();
      } catch {
        // Ignored in test/unsupported environments
      }
    }
  }, [audioUrl]);

  const effectiveDuration = duration || audioDuration || 5;

  const notifyProgress = (time, playing) => {
    const dur = effectiveDuration > 0 ? effectiveDuration : 5;
    const ratio = Math.max(0, Math.min(1, time / dur));
    onProgress?.({
      currentTime: time,
      duration: dur,
      isPlaying: playing,
      progressRatio: ratio,
    });
  };

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      try {
        audioRef.current.pause?.();
      } catch {
        // Ignored
      }
      setIsPlaying(false);
      notifyProgress(currentTime, false);
    } else {
      try {
        const p = audioRef.current.play?.();
        if (p?.then) {
          p.then(() => {
            setIsPlaying(true);
            notifyProgress(currentTime, true);
          }).catch(() => {
            setIsPlaying(false);
            notifyProgress(currentTime, false);
          });
        } else {
          setIsPlaying(true);
          notifyProgress(currentTime, true);
        }
      } catch {
        setIsPlaying(false);
        notifyProgress(currentTime, false);
      }
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const cur = audioRef.current.currentTime;
      setCurrentTime(cur);
      notifyProgress(cur, true);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current && (!duration || duration <= 0)) {
      const d = Math.round(audioRef.current.duration) || 5;
      setDuration(d);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
    notifyProgress(0, false);
  };

  const handleSeek = (e) => {
    const newTime = Number.parseFloat(e.target.value);
    setCurrentTime(newTime);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
    notifyProgress(newTime, isPlaying);
  };

  const handleRestart = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      setCurrentTime(0);
      try {
        audioRef.current.play?.().then(() => {
          setIsPlaying(true);
          notifyProgress(0, true);
        });
      } catch {
        setIsPlaying(true);
        notifyProgress(0, true);
      }
    }
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    audioRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  if (!audioUrl) return null;

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-accent/40 bg-accent/10 p-5 shadow-sm">
      <audio
        ref={audioRef}
        src={audioUrl}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        className="hidden"
      >
        <track kind="captions" />
      </audio>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-xs">
            <Mic className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-bold text-lg text-foreground leading-tight">
                Personal Voice Note
              </h4>
              <span className="rounded-full bg-accent/20 px-2 py-0.5 text-[11px] font-bold text-accent-foreground">
                100% Offline Audio
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              Recorded memory audio for {title}
            </p>
          </div>
        </div>

        {/* Dynamic dancing audio waveform visualizer */}
        <div className="flex items-center gap-1 h-7 px-2">
          {WAVE_BARS.map((bar, i) => (
            <span
              key={bar.id}
              className={`w-1 rounded-full bg-accent transition-all duration-200 ${
                isPlaying ? "animate-wave-bar" : "opacity-35"
              }`}
              style={{
                height: isPlaying ? `${Math.max(8, bar.h * 0.28)}px` : "6px",
                animationDelay: `${(i % 5) * 120}ms`,
              }}
            />
          ))}
        </div>
      </div>

      {/* Progress track */}
      <div className="flex flex-col gap-1.5 pt-1">
        <input
          type="range"
          min="0"
          max={effectiveDuration}
          step="0.1"
          value={currentTime}
          onChange={handleSeek}
          aria-label="Audio progress slider"
          className="w-full accent-primary h-2 bg-secondary rounded-lg cursor-pointer"
        />
        <div className="flex justify-between text-xs font-mono text-muted-foreground">
          <span>{formatAudioTime(currentTime)}</span>
          <span>{formatAudioTime(effectiveDuration)}</span>
        </div>
      </div>

      {/* Controls row */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={togglePlay}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md transition-transform hover:scale-105 focus-visible:outline-2 focus-visible:outline-ring"
            aria-label={isPlaying ? "Pause voice note" : "Play voice note"}
          >
            {isPlaying ? (
              <Pause className="h-7 w-7" />
            ) : (
              <Play className="h-7 w-7 ml-0.5" />
            )}
          </button>

          <button
            type="button"
            onClick={handleRestart}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-card text-foreground transition-smooth hover:bg-muted"
            aria-label="Replay from start"
            title="Replay from start"
          >
            <RotateCcw className="h-5 w-5" />
          </button>
        </div>

        <button
          type="button"
          onClick={toggleMute}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-card text-foreground transition-smooth hover:bg-muted"
          aria-label={isMuted ? "Unmute" : "Mute"}
        >
          {isMuted ? (
            <VolumeX className="h-5 w-5 text-destructive" />
          ) : (
            <Volume2 className="h-5 w-5" />
          )}
        </button>
      </div>
    </div>
  );
}
