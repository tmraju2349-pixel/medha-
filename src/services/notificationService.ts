/**
 * Enhanced Web Notification Service for MEDHA
 * Dispatches real OS/Browser system notifications using Notification API & ServiceWorker registration
 * Includes chime synthesizers, vibration motor triggers, and fallback handlers.
 */

export type NotificationPermissionStatus = 'granted' | 'denied' | 'default' | 'unsupported';

export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function getNotificationPermission(): NotificationPermissionStatus {
  if (!isNotificationSupported()) {
    return 'unsupported';
  }
  return Notification.permission;
}

/**
 * Triggers hardware vibration if supported by the device (Android / mobile browsers)
 */
export function triggerVibration(pattern: number | number[] = [200, 100, 200]): void {
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  } catch {
    // Ignore if not supported or prevented by policy
  }
}

/**
 * Plays a pleasant auditory notification chime using Web Audio API
 */
export function playNotificationChime(type: 'gentle' | 'alert' | 'sos' = 'gentle'): void {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    if (type === 'sos') {
      // High urgency siren tone
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(440, now + 0.3);
      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.5);
      return;
    }

    if (type === 'alert') {
      // Crisp 3-step alert chime
      [523.25, 659.25, 783.99].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        const start = now + idx * 0.1;
        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(0.25, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + 0.3);
      });
      return;
    }

    // Default gentle chime (D5 - 587.33 Hz, followed by A5 - 880.00 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now);
    gain1.gain.setValueAtTime(0.2, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.3);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880.0, now + 0.12);
    gain2.gain.setValueAtTime(0.25, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.5);
  } catch {
    // Audio context may be restricted before user gesture
  }
}

/**
 * Requests native system notification permission from the user
 */
export async function requestNotificationPermission(): Promise<NotificationPermissionStatus> {
  if (!isNotificationSupported()) {
    return 'unsupported';
  }

  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (err) {
    console.warn('Failed to request notification permission:', err);
    return Notification.permission;
  }
}

export interface SendNotificationOptions {
  body?: string;
  icon?: string;
  badge?: string;
  tag?: string;
  playChime?: boolean;
  chimeType?: 'gentle' | 'alert' | 'sos';
  vibrate?: boolean;
  data?: any;
  silent?: boolean;
}

/**
 * Dispatches an actual OS/browser system notification
 */
export async function sendRealNotification(
  title: string,
  options: SendNotificationOptions = {}
): Promise<{ success: boolean; reason?: string }> {
  // 1. Play audio chime
  if (options.playChime !== false) {
    playNotificationChime(options.chimeType || 'gentle');
  }

  // 2. Hardware vibration
  if (options.vibrate !== false) {
    triggerVibration(options.chimeType === 'sos' ? [300, 100, 300, 100, 400] : [150, 80, 150]);
  }

  // 3. Dispatch native browser Notification
  if (!isNotificationSupported()) {
    return { success: false, reason: 'Notifications not supported in this browser' };
  }

  // If permission has not yet been prompted, request it
  if (Notification.permission === 'default') {
    const granted = await requestNotificationPermission();
    if (granted !== 'granted') {
      return { success: false, reason: 'Notification permission was not granted by user' };
    }
  }

  if (Notification.permission !== 'granted') {
    return { success: false, reason: 'Notification permission is blocked or denied in browser settings' };
  }

  try {
    // If ServiceWorker registration is available, try showNotification
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator && navigator.serviceWorker.controller) {
      try {
        const reg = await navigator.serviceWorker.ready;
        if (reg && 'showNotification' in reg) {
          await reg.showNotification(title, {
            body: options.body || '',
            icon: options.icon || '/icon.svg',
            badge: options.badge || '/icon.svg',
            tag: options.tag || `medha-${Date.now()}`,
            data: options.data,
            silent: options.silent || false,
          });
          return { success: true };
        }
      } catch {
        // Fall back to standard Notification constructor
      }
    }

    // Standard Window Notification
    const notif = new Notification(title, {
      body: options.body || '',
      icon: options.icon || '/icon.svg',
      badge: options.badge || '/icon.svg',
      tag: options.tag || `medha-${Date.now()}`,
      silent: options.silent || false,
    });

    notif.onclick = () => {
      try {
        window.focus();
      } catch {
        // Ignore focus errors
      }
      notif.close();
    };

    return { success: true };
  } catch (err: any) {
    console.error('Error creating Notification instance:', err);
    return { success: false, reason: err?.message || 'Error creating notification' };
  }
}

/**
 * Continuous Web Audio Emergency Siren Manager for SOS & Perimeter Breaches
 * Emits an alternating emergency warble siren until resolved or muted by the caregiver.
 */
class EmergencySirenManager {
  private ctx: AudioContext | null = null;
  private osc: OscillatorNode | null = null;
  private gain: GainNode | null = null;
  private intervalId: any = null;
  private isRunning = false;
  private isMuted = false;
  private highPitch = true;

  public start(): void {
    if (this.isRunning) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      this.ctx = new AudioCtx();
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }

      const now = this.ctx.currentTime;
      this.osc = this.ctx.createOscillator();
      this.gain = this.ctx.createGain();

      this.osc.type = 'sawtooth';
      this.osc.frequency.setValueAtTime(800, now);

      this.gain.gain.setValueAtTime(this.isMuted ? 0 : 0.22, now);

      this.osc.connect(this.gain);
      this.gain.connect(this.ctx.destination);
      this.osc.start(now);

      this.isRunning = true;

      // Modulate frequency back and forth between 880Hz and 520Hz every 380ms
      this.intervalId = setInterval(() => {
        if (!this.ctx || !this.osc) return;
        try {
          const t = this.ctx.currentTime;
          this.highPitch = !this.highPitch;
          const targetFreq = this.highPitch ? 880 : 520;
          this.osc.frequency.cancelScheduledValues(t);
          this.osc.frequency.exponentialRampToValueAtTime(targetFreq, t + 0.32);
        } catch {
          // ignore ramp scheduling edge case
        }
      }, 380);
    } catch (err) {
      console.warn('Could not start emergency siren audio:', err);
    }
  }

  public stop(): void {
    if (!this.isRunning) return;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    if (this.osc) {
      try {
        this.osc.stop();
        this.osc.disconnect();
      } catch {
        // ignore
      }
      this.osc = null;
    }
    if (this.gain) {
      try {
        this.gain.disconnect();
      } catch {
        // ignore
      }
      this.gain = null;
    }
    if (this.ctx) {
      try {
        this.ctx.close();
      } catch {
        // ignore
      }
      this.ctx = null;
    }
    this.isRunning = false;
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.gain && this.ctx) {
      const now = this.ctx.currentTime;
      this.gain.gain.cancelScheduledValues(now);
      this.gain.gain.setValueAtTime(this.isMuted ? 0 : 0.22, now);
    }
    return this.isMuted;
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public getIsRunning(): boolean {
    return this.isRunning;
  }
}

export const emergencySiren = new EmergencySirenManager();

export function startEmergencySiren(): void {
  emergencySiren.start();
}

export function stopEmergencySiren(): void {
  emergencySiren.stop();
}

export function toggleEmergencySirenMute(): boolean {
  return emergencySiren.toggleMute();
}

export function isEmergencySirenMuted(): boolean {
  return emergencySiren.getIsMuted();
}

export function isEmergencySirenRunning(): boolean {
  return emergencySiren.getIsRunning();
}
