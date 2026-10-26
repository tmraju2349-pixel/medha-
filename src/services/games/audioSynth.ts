// Web Audio API harmonic sound synthesizer for 3D Cognitive Games
class GameAudioSynth {
  private ctx: AudioContext | null = null;

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  // Play a harmonic chime based on orb index
  playChime(index: number = 0, duration: number = 0.4) {
    const ctx = this.getContext();
    if (!ctx) return;

    // Pentatonic frequencies (pleasant, calming Indian Classical Bhupali / Pentatonic scale)
    const freqs = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25]; // C, D, E, G, A, C5, D5, E5
    const baseFreq = freqs[index % freqs.length] || 330;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(baseFreq, ctx.currentTime);

    // Subtle second harmonic for warmth
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(baseFreq * 2, ctx.currentTime);

    const now = ctx.currentTime;
    gain.gain.setValueAtTime(0.01, now);
    gain.gain.exponentialRampToValueAtTime(0.25, now + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    gain2.gain.setValueAtTime(0.005, now);
    gain2.gain.exponentialRampToValueAtTime(0.08, now + 0.03);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + duration * 0.7);

    osc.connect(gain);
    osc2.connect(gain2);
    gain.connect(ctx.destination);
    gain2.connect(ctx.destination);

    osc.start(now);
    osc2.start(now);
    osc.stop(now + duration + 0.1);
    osc2.stop(now + duration + 0.1);
  }

  // Success chord sweep upon completing a level
  playLevelSuccess() {
    const ctx = this.getContext();
    if (!ctx) return;

    const freqs = [261.63, 329.63, 392.0, 523.25]; // Major triad
    freqs.forEach((freq, i) => {
      setTimeout(() => {
        if (!ctx) return;
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);

        gain.gain.setValueAtTime(0.01, now);
        gain.gain.exponentialRampToValueAtTime(0.2, now + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.7);
      }, i * 90);
    });
  }

  // Gentle low tone for error or miss
  playMiss() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.exponentialRampToValueAtTime(110, now + 0.35);

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.4);
  }

  // Sound for ML intervention trigger
  playInterventionCue() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.exponentialRampToValueAtTime(660, now + 0.15);

    gain.gain.setValueAtTime(0.01, now);
    gain.gain.exponentialRampToValueAtTime(0.12, now + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.35);
  }
}

export const gameAudio = new GameAudioSynth();
