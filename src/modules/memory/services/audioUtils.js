/**
 * audioUtils — Helpers for recording voice notes, converting audio files,
 * extracting durations, and speaking text aloud using Web Speech API.
 */

/**
 * Check if microphone recording is supported in current environment.
 */
export function isAudioRecordingSupported() {
  return (
    typeof window !== "undefined" &&
    typeof navigator !== "undefined" &&
    Boolean(navigator.mediaDevices?.getUserMedia) &&
    typeof MediaRecorder !== "undefined"
  );
}

/**
 * Start recording a voice note using MediaRecorder.
 * Returns an object with stop() to finish recording and return { audioUrl, duration }.
 */
export async function startAudioRecording() {
  if (!isAudioRecordingSupported()) {
    throw new Error("Microphone recording is not supported in this browser.");
  }

  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
    ? "audio/webm;codecs=opus"
    : MediaRecorder.isTypeSupported("audio/mp4")
      ? "audio/mp4"
      : "";

  const recorder = mimeType
    ? new MediaRecorder(stream, { mimeType })
    : new MediaRecorder(stream);

  const chunks = [];
  const startTime = Date.now();

  recorder.ondataavailable = (event) => {
    if (event.data && event.data.size > 0) {
      chunks.push(event.data);
    }
  };

  recorder.start(100);

  return {
    stop: () =>
      new Promise((resolve, reject) => {
        recorder.onstop = () => {
          try {
            const rawType = recorder.mimeType || "audio/webm";
            const blob = new Blob(chunks, { type: rawType });
            // Stop all tracks on the stream to release the mic
            for (const track of stream.getTracks()) {
              track.stop();
            }
            const durationSec = Math.max(
              1,
              Math.round((Date.now() - startTime) / 1000),
            );

            const reader = new FileReader();
            reader.onloadend = () => {
              resolve({
                audioUrl: reader.result,
                duration: durationSec,
                mimeType: rawType,
              });
            };
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(blob);
          } catch (err) {
            reject(err);
          }
        };

        if (recorder.state !== "inactive") {
          recorder.stop();
        }
      }),
    cancel: () => {
      for (const track of stream.getTracks()) {
        track.stop();
      }
      if (recorder.state !== "inactive") {
        recorder.stop();
      }
    },
  };
}

/**
 * Converts an audio File to base64 Data URL and estimates duration.
 */
export function fileToAudioDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const audioUrl = reader.result;
      if (typeof window !== "undefined" && typeof Audio !== "undefined") {
        const audio = new Audio();
        audio.src = audioUrl;
        audio.onloadedmetadata = () => {
          const duration = Math.round(audio.duration) || 0;
          resolve({ audioUrl, duration });
        };
        audio.onerror = () => {
          resolve({ audioUrl, duration: 0 });
        };
      } else {
        resolve({ audioUrl, duration: 0 });
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Converts an image File to base64 Data URL.
 */
export function fileToImageDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Formats seconds into mm:ss display (e.g. 65 -> "01:05")
 */
export function formatAudioTime(seconds) {
  if (!seconds || Number.isNaN(seconds) || seconds < 0) return "00:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Text-to-speech fallback using SpeechSynthesis with a gentle, calming tone.
 * Operates 100% offline using the browser's built-in speech engine.
 */
export function speakMemoryAloud(memory, callbacks = {}) {
  if (typeof window === "undefined" || !window.speechSynthesis) return null;

  try {
    window.speechSynthesis.cancel();
  } catch {
    // Ignore in environments where speechSynthesis is partially mocked
  }

  const textToSpeak = [
    memory.title,
    memory.metadata?.relation
      ? `Relationship: ${memory.metadata.relation}.`
      : null,
    memory.description,
  ]
    .filter(Boolean)
    .join(". ");

  try {
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.rate = callbacks.rate ?? 0.88; // slightly slower, very clear and gentle for memory care
    utterance.pitch = callbacks.pitch ?? 1.0;

    utterance.onstart = () => {
      callbacks.onStart?.(textToSpeak);
    };

    utterance.onboundary = (event) => {
      if (event.name === "word") {
        callbacks.onWord?.({
          charIndex: event.charIndex,
          charLength: event.charLength,
          name: event.name,
        });
      }
    };

    utterance.onend = () => {
      callbacks.onEnd?.();
    };

    utterance.onerror = (e) => {
      callbacks.onError?.(e);
    };

    window.speechSynthesis.speak(utterance);

    return {
      stop: () => {
        try {
          window.speechSynthesis.cancel();
        } catch {
          // Ignored
        }
      },
      pause: () => {
        try {
          window.speechSynthesis.pause();
        } catch {
          // Ignored
        }
      },
      resume: () => {
        try {
          window.speechSynthesis.resume();
        } catch {
          // Ignored
        }
      },
    };
  } catch (err) {
    callbacks.onError?.(err);
    return null;
  }
}

/**
 * Stops any ongoing offline speech synthesis.
 */
export function stopSpeakingAloud() {
  if (typeof window !== "undefined" && window.speechSynthesis) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      // Ignored
    }
  }
}

/**
 * Creates a tiny gentle melodic chime audio as a base64 WAV data URI.
 * Provides an immediate working sample voice note for seeded memories.
 */
export function generateSampleChimeAudio(toneFreq = 440, durationSeconds = 3) {
  if (typeof window === "undefined") return null;
  try {
    const sampleRate = 8000;
    const numSamples = sampleRate * durationSeconds;
    const buffer = new ArrayBuffer(44 + numSamples * 2);
    const view = new DataView(buffer);

    // RIFF chunk
    writeString(view, 0, "RIFF");
    view.setUint32(4, 36 + numSamples * 2, true);
    writeString(view, 8, "WAVE");

    // FMT sub-chunk
    writeString(view, 12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM
    view.setUint16(22, 1, true); // Mono
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);

    // DATA sub-chunk
    writeString(view, 36, "data");
    view.setUint32(40, numSamples * 2, true);

    const notes = [toneFreq, toneFreq * 1.25, toneFreq * 1.5, toneFreq * 2];
    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      const noteIdx = Math.min(notes.length - 1, Math.floor(t * 1.5));
      const f = notes[noteIdx];
      const env = Math.exp(-((t % 0.65) * 3));
      const sample = Math.sin(2 * Math.PI * f * t) * env * 0.35;
      const intSample = Math.max(
        -32768,
        Math.min(32767, Math.floor(sample * 32767)),
      );
      view.setInt16(44 + i * 2, intSample, true);
    }

    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const b64 =
      typeof btoa !== "undefined"
        ? btoa(binary)
        : typeof Buffer !== "undefined"
          ? Buffer.from(binary, "binary").toString("base64")
          : "";
    return b64 ? `data:audio/wav;base64,${b64}` : null;
  } catch (_err) {
    return null;
  }
}

function writeString(view, offset, string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}
