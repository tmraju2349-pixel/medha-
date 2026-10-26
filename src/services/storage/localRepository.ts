import { MedhaDB, SyncQueueItem, GameSession } from '../../types/medha';
import { loadDB, saveDB } from '../storage';

export const localRepository = {
  getDB(): MedhaDB {
    return loadDB();
  },
  
  saveDB(db: MedhaDB): void {
    saveDB(db);
  },

  enqueueSyncItem(item: Omit<SyncQueueItem, 'id' | 'createdAt' | 'status' | 'retryCount'>) {
    const db = this.getDB();
    if (!db.syncQueue) db.syncQueue = [];
    
    const queueItem: SyncQueueItem = {
      ...item,
      id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15),
      createdAt: Date.now(),
      status: 'pending',
      retryCount: 0
    };
    
    db.syncQueue.push(queueItem);
    this.saveDB(db);
    return queueItem;
  },

  getPendingSyncItems(): SyncQueueItem[] {
    const db = this.getDB();
    return (db.syncQueue || []).filter(item => item.status === 'pending' || item.status === 'failed');
  },

  updateSyncItemStatus(id: string, updates: Partial<SyncQueueItem>) {
    const db = this.getDB();
    if (!db.syncQueue) return;
    const index = db.syncQueue.findIndex(item => item.id === id);
    if (index !== -1) {
      db.syncQueue[index] = { ...db.syncQueue[index], ...updates };
      this.saveDB(db);
    }
  },

  removeSyncItem(id: string) {
    const db = this.getDB();
    if (!db.syncQueue) return;
    db.syncQueue = db.syncQueue.filter(item => item.id !== id);
    this.saveDB(db);
  },

  // Example entity method: GameSession
  saveGameSession(session: GameSession) {
    const db = this.getDB();
    if (!db.gameSessions) db.gameSessions = [];
    
    // Check if already exists (for updates)
    const existingIdx = db.gameSessions.findIndex(s => s.sessionId === session.sessionId);
    if (existingIdx >= 0) {
      db.gameSessions[existingIdx] = session;
    } else {
      db.gameSessions.push(session);
    }
    this.saveDB(db);

    // Enqueue for sync
    this.enqueueSyncItem({
      entityType: 'game_sessions',
      entityId: session.sessionId,
      operation: existingIdx >= 0 ? 'UPDATE' : 'INSERT',
      payload: session,
    });
  }
};
