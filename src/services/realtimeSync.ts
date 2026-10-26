/**
 * Real-time Cross-Tab Synchronization Service for MEDHA
 * Enables instant (<5ms) bidirectional state sync between Patient and Caregiver tabs
 * via BroadcastChannel with fallback to localStorage storage events.
 */

import { MedhaDB, LocationCoord } from '../types/medha';

export type RealtimeEventType =
  | 'DB_UPDATE'
  | 'SOS_TRIGGER'
  | 'SOS_CLEAR'
  | 'MED_TAKEN'
  | 'TASK_DONE'
  | 'LOCATION_UPDATE'
  | 'HYDRATION_UPDATE'
  | 'VOICE_REASSURANCE'
  | 'PING'
  | 'PONG';

export interface RealtimeSyncMessage {
  type: RealtimeEventType;
  key?: string;
  senderRole?: 'patient' | 'caregiver';
  senderUsername?: string;
  timestamp: number;
  db?: MedhaDB;
  payload?: any;
}

type SyncListener = (msg: RealtimeSyncMessage) => void;

class RealtimeSyncService {
  private channel: BroadcastChannel | null = null;
  private listeners: Set<SyncListener> = new Set();
  private isInitialized = false;

  constructor() {
    this.init();
  }

  private init() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    // 1. Initialize BroadcastChannel if supported
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.channel = new BroadcastChannel('medha_realtime_sync_bus');
        this.channel.onmessage = (event: MessageEvent<RealtimeSyncMessage>) => {
          if (event.data && event.data.type) {
            this.notifyListeners(event.data);
          }
        };
      } catch (err) {
        console.warn('BroadcastChannel initialization failed, using storage event fallback:', err);
      }
    }

    // 2. Storage event fallback for cross-tab notifications
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (e: StorageEvent) => {
        if (e.key === 'medha_realtime_event_bus' && e.newValue) {
          try {
            const msg: RealtimeSyncMessage = JSON.parse(e.newValue);
            this.notifyListeners(msg);
          } catch {
            // ignore JSON parse error
          }
        }
      });
    }
  }

  private notifyListeners(msg: RealtimeSyncMessage) {
    this.listeners.forEach((listener) => {
      try {
        listener(msg);
      } catch (err) {
        console.error('Error in realtime sync listener:', err);
      }
    });
  }

  /**
   * Broadcast a message to all other tabs in real-time
   */
  public broadcast(msg: Omit<RealtimeSyncMessage, 'timestamp'>) {
    const fullMsg: RealtimeSyncMessage = {
      ...msg,
      timestamp: Date.now(),
    };

    // Send via BroadcastChannel (instant)
    if (this.channel) {
      try {
        this.channel.postMessage(fullMsg);
      } catch (err) {
        console.warn('BroadcastChannel postMessage error:', err);
      }
    }

    // Also trigger via localStorage for maximum cross-tab redundancy
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem('medha_realtime_event_bus', JSON.stringify(fullMsg));
      } catch {
        // storage might be full or blocked
      }
    }
  }

  /**
   * Subscribe to incoming real-time sync events from other tabs
   */
  public subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
}

export const realtimeSync = new RealtimeSyncService();
