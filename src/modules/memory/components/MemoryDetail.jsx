/**
 * MemoryDetail — the detail panel shown when a memory node is opened.
 *
 * Displays the node's photo (with a graceful placeholder when empty), title,
 * category path (breadcrumb), relationship, description, additional metadata,
 * importance badge, created date, and last updated date. Provides large,
 * elderly-friendly action buttons: Edit, Delete, Move, Back, Close, and a
 * Listen button that exposes the onSpeak integration point for the parent
 * MEDHA voice system (no voice assistant is built here).
 *
 * Props:
 *   node      — the memory node to display
 *   path      — array of ancestor node titles (breadcrumb), root first
 *   onEdit    — open the edit form
 *   onDelete  — delete this node (and its descendants)
 *   onMove    — open the move form
 *   onBack    — go back to the parent node
 *   onClose   — close the detail panel
 *   onSpeak   — (optional) called with the node when the user taps Listen
 */

import {
  ArrowLeft,
  CalendarDays,
  ChevronRight,
  Clock,
  Edit3,
  Expand,
  FolderOpen,
  ImageOff,
  Move,
  Pause,
  Pencil,
  Play,
  RotateCcw,
  Sparkles,
  Square,
  Trash2,
  Volume2,
  X,
} from "lucide-react";
import { motion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { speakMemoryAloud, stopSpeakingAloud } from "../services/audioUtils.js";
import AudioPlayer from "./AudioPlayer.jsx";
import PhotoLightbox from "./PhotoLightbox.jsx";

const WAVEFORM_BARS = [
  { id: "mw-1", h: 30 },
  { id: "mw-2", h: 70 },
  { id: "mw-3", h: 45 },
  { id: "mw-4", h: 90 },
  { id: "mw-5", h: 60 },
  { id: "mw-6", h: 85 },
  { id: "mw-7", h: 40 },
  { id: "mw-8", h: 95 },
  { id: "mw-9", h: 55 },
  { id: "mw-10", h: 75 },
  { id: "mw-11", h: 35 },
  { id: "mw-12", h: 65 },
];

const IMPORTANCE_LABELS = {
  high: "High",
  medium: "Medium",
  low: "Low",
};

const IMPORTANCE_STYLES = {
  high: "bg-destructive/15 text-destructive",
  medium: "bg-accent/20 text-accent-foreground",
  low: "bg-muted text-muted-foreground",
};

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function MemoryDetail({
  node,
  path = [],
  onEdit,
  onDelete,
  onMove,
  onBack,
  onClose,
  onSpeak,
  patientName = "",
}) {
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const metadata = node.metadata ?? {};
  const relation = metadata.relation;
  const importance = node.importance ?? "medium";
  const importanceLabel = IMPORTANCE_LABELS[importance] ?? "Medium";
  const importanceStyle =
    IMPORTANCE_STYLES[importance] ?? IMPORTANCE_STYLES.medium;
  const displayTitle =
    node.nodeType === "root" && patientName ? patientName : node.title;

  // Synchronized voice-text state
  const [isSpeakingActive, setIsSpeakingActive] = useState(false);
  const [activeWordIndex, setActiveWordIndex] = useState(-1);
  const [speechSource, setSpeechSource] = useState("idle"); // 'idle' | 'tts' | 'audio'
  const [speechSpeed, setSpeechSpeed] = useState(0.88);
  const ttsControllerRef = useRef(null);
  const tickerTimerRef = useRef(null);

  const words = useMemo(() => {
    if (!node.description) return [];
    return node.description.trim().split(/\s+/).filter(Boolean);
  }, [node.description]);

  // Clean up any active speech synthesis or ticker on node switch or unmount
  useEffect(() => {
    return () => {
      stopSpeakingAloud();
      if (tickerTimerRef.current) clearInterval(tickerTimerRef.current);
    };
  }, [node.id]);

  const stopAllSpeech = useCallback(() => {
    ttsControllerRef.current?.stop?.();
    stopSpeakingAloud();
    if (tickerTimerRef.current) clearInterval(tickerTimerRef.current);
    setIsSpeakingActive(false);
    setSpeechSource("idle");
    setActiveWordIndex(-1);
  }, []);

  const handleListen = () => {
    onSpeak?.(node);

    if (isSpeakingActive && speechSource === "tts") {
      stopAllSpeech();
      return;
    }

    if (node.audioUrl) {
      // Memory has recorded voice note
      setIsSpeakingActive(true);
      setSpeechSource("audio");
      setActiveWordIndex(0);
      return;
    }

    // 100% Offline Speech Synthesis using browser Web Speech API
    setIsSpeakingActive(true);
    setSpeechSource("tts");
    setActiveWordIndex(0);

    if (tickerTimerRef.current) clearInterval(tickerTimerRef.current);
    const intervalMs = Math.max(160, Math.round(260 / speechSpeed));
    let wIdx = 0;
    tickerTimerRef.current = setInterval(() => {
      wIdx += 1;
      if (wIdx < words.length) {
        setActiveWordIndex(wIdx);
      } else {
        clearInterval(tickerTimerRef.current);
      }
    }, intervalMs);

    ttsControllerRef.current = speakMemoryAloud(node, {
      rate: speechSpeed,
      onStart: () => {
        setIsSpeakingActive(true);
        setActiveWordIndex(0);
      },
      onWord: (event) => {
        if (event?.charIndex !== undefined && node.description) {
          const textBefore = node.description.slice(0, event.charIndex);
          const approxWordIdx = textBefore.trim().split(/\s+/).filter(Boolean).length;
          if (approxWordIdx >= 0 && approxWordIdx < words.length) {
            setActiveWordIndex(approxWordIdx);
          }
        }
      },
      onEnd: () => {
        if (tickerTimerRef.current) clearInterval(tickerTimerRef.current);
        setIsSpeakingActive(false);
        setSpeechSource("idle");
        setActiveWordIndex(-1);
      },
      onError: () => {
        if (tickerTimerRef.current) clearInterval(tickerTimerRef.current);
        setIsSpeakingActive(false);
        setSpeechSource("idle");
        setActiveWordIndex(-1);
      },
    });
  };

  const handleAudioPlayerProgress = useCallback(
    ({ isPlaying, progressRatio }) => {
      if (isPlaying) {
        setIsSpeakingActive(true);
        setSpeechSource("audio");
        if (words.length > 0) {
          const idx = Math.min(
            words.length - 1,
            Math.floor(progressRatio * words.length),
          );
          setActiveWordIndex(idx);
        }
      } else {
        if (speechSource === "audio") {
          setIsSpeakingActive(false);
          setSpeechSource("idle");
          setActiveWordIndex(-1);
        }
      }
    },
    [words.length, speechSource],
  );

  // Render any remaining metadata entries (beyond the relationship) as a
  // simple key/value list so nothing is hidden.
  const extraMetadata = Object.entries(metadata).filter(
    ([key]) => key !== "relation",
  );

  return (
    <motion.div
      data-ocid="memory.detail"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 12 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="flex flex-col gap-5"
    >
      {/* Photo Lightbox */}
      {lightboxOpen && node.imageUrl && (
        <PhotoLightbox
          imageUrl={node.imageUrl}
          title={node.title}
          onClose={() => setLightboxOpen(false)}
        />
      )}

      {/* Top action row: Back and Close, always visible for accessibility */}
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          data-ocid="memory.back_button"
          onClick={onBack}
          className="inline-flex items-center gap-2 rounded-full border-2 border-[#E5DEC9] bg-[#FAF6EF] px-4 py-2.5 text-base font-bold text-foreground transition-smooth hover:bg-[#F2ECE0] focus-visible:outline-2 focus-visible:outline-ring shadow-xs cursor-pointer"
        >
          <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          Back
        </button>
        <button
          type="button"
          data-ocid="memory.close_button"
          onClick={onClose}
          aria-label="Close details"
          className="inline-flex h-11 w-11 items-center justify-center rounded-full border-2 border-[#E5DEC9] bg-[#FAF6EF] text-foreground transition-smooth hover:bg-[#F2ECE0] focus-visible:outline-2 focus-visible:outline-ring shadow-xs cursor-pointer"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      {/* Photo / placeholder with click-to-zoom */}
      <div className="relative group overflow-hidden rounded-2xl border-2 border-[#E5DEC9] bg-[#FAF6EF]">
        {node.imageUrl ? (
          <button
            type="button"
            onClick={() => setLightboxOpen(true)}
            aria-label={`View full photo for ${node.title}`}
            className="block w-full text-left cursor-pointer focus-visible:outline-2 focus-visible:outline-ring"
          >
            <img
              src={node.imageUrl}
              alt={node.title}
              className="h-56 w-full object-cover sm:h-64 transition-transform duration-300 group-hover:scale-105"
            />
            <span className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-[#181311]/90 px-3 py-1.5 text-xs font-bold text-white shadow-md transition-opacity group-hover:bg-[#181311]">
              <Expand className="h-4 w-4" /> Full photo
            </span>
          </button>
        ) : (
          <div className="flex h-56 w-full flex-col items-center justify-center gap-2 bg-[#FAF6EF] text-muted-foreground sm:h-64">
            <ImageOff className="h-12 w-12 text-[#8A7E72]" aria-hidden="true" />
            <span className="text-lg font-semibold text-[#8A7E72]">No photo</span>
          </div>
        )}
      </div>

      {/* Breadcrumb / category path */}
      <nav
        aria-label="Category path"
        className="flex flex-wrap items-center gap-1 text-base"
      >
        {path.length > 0 ? (
          path.map((segment, index) => (
            <span
              key={segment.title ?? segment}
              className="flex items-center gap-1"
            >
              {index > 0 && (
                <ChevronRight
                  className="h-4 w-4 text-muted-foreground"
                  aria-hidden="true"
                />
              )}
              <span
                className={
                  index === path.length - 1
                    ? "font-bold text-foreground"
                    : "text-muted-foreground"
                }
              >
                {segment?.nodeType === "root" && patientName
                  ? patientName
                  : (segment?.title ?? segment)}
              </span>
            </span>
          ))
        ) : (
          <span className="text-muted-foreground">No category</span>
        )}
      </nav>

      {/* Title + importance badge */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h3 className="font-display text-3xl font-bold leading-tight text-foreground sm:text-4xl">
          {displayTitle}
        </h3>
        <span
          data-ocid="memory.importance_badge"
          className={`inline-flex items-center rounded-full px-4 py-1.5 text-base font-bold ${importanceStyle}`}
        >
          {importanceLabel} importance
        </span>
      </div>

      {/* Relationship */}
      {relation && (
        <div className="flex items-center gap-2 text-lg text-foreground">
          <FolderOpen
            className="h-5 w-5 text-accent-foreground"
            aria-hidden="true"
          />
          <span>
            <span className="font-bold">Relationship:</span> {relation}
          </span>
        </div>
      )}

      {/* Synchronized Voice Narration Waveform Banner */}
      {isSpeakingActive && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-2xl border border-primary/30 bg-primary/10 p-3.5 shadow-xs animate-fade-in">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-1 h-6 px-1">
              {WAVEFORM_BARS.map((bar, i) => (
                <span
                  key={bar.id}
                  className="w-1 rounded-full bg-primary animate-wave-bar"
                  style={{
                    height: `${Math.max(8, bar.h * 0.24)}px`,
                    animationDelay: `${(i % 5) * 110}ms`,
                  }}
                />
              ))}
            </div>
            <div>
              <p className="font-bold text-sm text-foreground leading-tight">
                {speechSource === "audio"
                  ? "Playing Voice Note (100% Offline)"
                  : "Reading Story Aloud (Offline Voice Engine)"}
              </p>
              <p className="text-xs text-muted-foreground">
                Synchronized voice &amp; text narration
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {speechSource === "tts" && (
              <button
                type="button"
                onClick={() => setSpeechSpeed((s) => (s <= 0.9 ? 1.05 : 0.88))}
                className="rounded-full border border-border bg-secondary px-2.5 py-1 text-xs font-bold text-secondary-foreground hover:bg-muted"
              >
                {speechSpeed <= 0.9 ? "0.85x Gentle" : "1.0x Normal"}
              </button>
            )}
            <button
              type="button"
              onClick={stopAllSpeech}
              className="inline-flex items-center gap-1 rounded-full bg-primary/20 hover:bg-primary/30 px-3 py-1 text-xs font-bold text-primary"
            >
              <Square className="h-3 w-3" /> Stop
            </button>
          </div>
        </div>
      )}

      {/* Description with synchronized word-by-word speech transition */}
      {node.description && (
        <div className="rounded-2xl border-2 border-[#E5DEC9] bg-[#FAF6EF] p-4 sm:p-5 shadow-xs">
          <p className="text-lg leading-relaxed text-foreground sm:text-xl">
            {isSpeakingActive && words.length > 0
              ? words.map((word, idx) => {
                  const isCurrent = idx === activeWordIndex;
                  const isPast = idx < activeWordIndex;
                  return (
                    <span
                      key={`${idx}-${word}`}
                      className={`inline-block transition-all duration-150 ${
                        isCurrent
                          ? "rounded-md bg-primary/25 px-1 py-0.5 text-primary-foreground font-extrabold shadow-xs scale-105 ring-1 ring-primary/40"
                          : isPast
                            ? "text-foreground font-semibold"
                            : "text-muted-foreground/75"
                      }`}
                    >
                      {word}{" "}
                    </span>
                  );
                })
              : node.description}
          </p>
        </div>
      )}

      {/* Additional metadata */}
      {extraMetadata.length > 0 && (
        <dl className="grid gap-2 rounded-2xl border-2 border-[#E5DEC9] bg-[#FAF6EF] p-4 sm:grid-cols-2">
          {extraMetadata.map(([key, value]) => (
            <div key={key} className="flex flex-col">
              <dt className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
                {key}
              </dt>
              <dd className="text-lg text-foreground">
                {Array.isArray(value) ? value.join(", ") : String(value)}
              </dd>
            </div>
          ))}
        </dl>
      )}

      {/* Voice Note Player if recorded */}
      {node.audioUrl && (
        <AudioPlayer
          audioUrl={node.audioUrl}
          audioDuration={node.audioDuration}
          title={node.title}
          onProgress={handleAudioPlayerProgress}
        />
      )}

      {/* Dates */}
      <div className="flex flex-wrap gap-x-6 gap-y-2 text-base text-muted-foreground">
        <span className="inline-flex items-center gap-2">
          <CalendarDays className="h-5 w-5" aria-hidden="true" />
          Created: {formatDate(node.createdAt)}
        </span>
        <span className="inline-flex items-center gap-2">
          <Clock className="h-5 w-5" aria-hidden="true" />
          Updated: {formatDate(node.updatedAt)}
        </span>
      </div>

      {/* Action buttons */}
      <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <button
          type="button"
          data-ocid="memory.listen_button"
          onClick={handleListen}
          className={`inline-flex items-center justify-center gap-2 rounded-full px-5 py-4 text-lg font-bold text-primary-foreground transition-smooth hover:opacity-90 focus-visible:outline-2 focus-visible:outline-ring ${
            isSpeakingActive && speechSource === "tts"
              ? "bg-amber-600 ring-2 ring-amber-400/50 shadow-md"
              : "bg-primary"
          }`}
        >
          {isSpeakingActive && speechSource === "tts" ? (
            <>
              <Square className="h-6 w-6" aria-hidden="true" />
              Stop Listening
            </>
          ) : (
            <>
              <Volume2 className="h-6 w-6" aria-hidden="true" />
              Listen
            </>
          )}
        </button>
        <button
          type="button"
          data-ocid="memory.edit_button"
          onClick={onEdit}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-accent px-5 py-4 text-lg font-bold text-accent-foreground transition-smooth hover:opacity-90 focus-visible:outline-2 focus-visible:outline-ring"
        >
          <Pencil className="h-6 w-6" aria-hidden="true" />
          Edit
        </button>
        <button
          type="button"
          data-ocid="memory.move_button"
          onClick={onMove}
          className="inline-flex items-center justify-center gap-2 rounded-full border border-border bg-secondary px-5 py-4 text-lg font-bold text-secondary-foreground transition-smooth hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
        >
          <Move className="h-6 w-6" aria-hidden="true" />
          Move
        </button>
        <button
          type="button"
          data-ocid="memory.delete_button"
          onClick={() => setConfirmDeleteOpen(true)}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-destructive px-5 py-4 text-lg font-bold text-destructive-foreground transition-smooth hover:opacity-90 focus-visible:outline-2 focus-visible:outline-ring"
        >
          <Trash2 className="h-6 w-6" aria-hidden="true" />
          Delete
        </button>
      </div>

      <p className="text-sm text-muted-foreground">
        <Edit3 className="mr-1 inline h-4 w-4" aria-hidden="true" />
        Deleting removes this memory and everything under it.
      </p>

      {/* Confirmation dialog — a single tap must never irreversibly delete a
          node and its entire subtree, so the user confirms first. */}
      {confirmDeleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white max-w-md w-full rounded-3xl p-6 sm:p-8 shadow-2xl border border-[var(--line)] space-y-5">
            <div className="text-center sm:text-left">
              <h3 className="font-display text-2xl font-bold ink">
                Delete this memory?
              </h3>
              <p className="text-base leading-relaxed muted mt-2">
                This will permanently delete{" "}
                <span className="font-bold ink">{node.title}</span> and everything
                under it. This cannot be undone.
              </p>
            </div>
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                data-ocid="memory.delete_cancel_button"
                onClick={() => setConfirmDeleteOpen(false)}
                className="inline-flex h-14 items-center justify-center rounded-full border border-[var(--line)] bg-white px-6 text-base font-bold text-[#8A7E72] hover:bg-[#F2EEE4] cursor-pointer transition"
              >
                Cancel
              </button>
              <button
                type="button"
                data-ocid="memory.delete_confirm_button"
                onClick={() => {
                  setConfirmDeleteOpen(false);
                  onDelete();
                }}
                className="inline-flex h-14 items-center justify-center gap-2 rounded-full bg-red-600 px-6 text-base font-bold text-white hover:bg-red-700 cursor-pointer shadow transition"
              >
                <Trash2 className="h-5 w-5" aria-hidden="true" />
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
