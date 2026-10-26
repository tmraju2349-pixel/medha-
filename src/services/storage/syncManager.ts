import { localRepository } from './localRepository';
import { supabaseRepository } from '../supabase/supabaseRepository';
import { connectivityService } from './connectivityService';

const MAX_RETRIES = 3;

class SyncManager {
  private isSyncing = false;

  constructor() {
    // Listen for connectivity changes
    connectivityService.addListener((status) => {
      if (status === 'online') {
        this.processQueue();
      }
    });
  }

  public async processQueue(): Promise<void> {
    if (this.isSyncing) return;
    if (!connectivityService.isOnline()) return;

    this.isSyncing = true;
    
    try {
      const items = localRepository.getPendingSyncItems();
      
      for (const item of items) {
        if (item.retryCount >= MAX_RETRIES) {
           // Skip permanently failed items until manually cleared or retried
           continue; 
        }

        localRepository.updateSyncItemStatus(item.id, { 
          status: 'syncing', 
          lastAttemptAt: Date.now() 
        });

        try {
          await supabaseRepository.syncItem(item);
          // Success: Mark as synced or just remove from queue to save space
          localRepository.removeSyncItem(item.id);
          
          // Optionally update the local entity to mark it as synced
          // e.g., db.gameSessions[...].syncedAt = Date.now()
        } catch (error: any) {
          console.error(`Failed to sync item ${item.id}:`, error);
          localRepository.updateSyncItemStatus(item.id, { 
            status: 'failed', 
            error: error.message || 'Unknown error',
            retryCount: item.retryCount + 1 
          });
        }
      }
    } finally {
      this.isSyncing = false;
    }
  }

  public triggerSync() {
    this.processQueue();
  }
}

export const syncManager = new SyncManager();
