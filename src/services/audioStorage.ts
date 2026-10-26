// IndexedDB Audio Storage Service for persistent offline voice recording storage

const DB_NAME = 'medha_audio_db';
const DB_VERSION = 1;
const STORE_NAME = 'audio_recordings';

interface StoredAudioRecord {
  id: number;
  blob: Blob;
  mimeType: string;
  duration?: number;
  timestamp: number;
}

let dbPromise: Promise<IDBDatabase> | null = null;

function getDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB is not supported'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error || new Error('Failed to open audio database'));
    };
  });

  return dbPromise;
}

/**
 * Save audio blob to persistent IndexedDB
 */
export async function saveAudioEntry(
  id: number,
  blob: Blob,
  duration?: number
): Promise<string> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);

      const record: StoredAudioRecord = {
        id,
        blob,
        mimeType: blob.type || 'audio/webm',
        duration,
        timestamp: Date.now(),
      };

      const request = store.put(record);

      request.onsuccess = () => {
        const objectUrl = URL.createObjectURL(blob);
        resolve(objectUrl);
      };

      request.onerror = () => {
        reject(request.error || new Error('Failed to save audio blob'));
      };
    });
  } catch (err) {
    console.error('AudioStorage save failed:', err);
    // Fallback: create temporary object URL even if IndexedDB fails
    return URL.createObjectURL(blob);
  }
}

/**
 * Retrieve audio blob and create object URL
 */
export async function getAudioEntry(
  id: number
): Promise<{ url: string; duration?: number; blob: Blob } | null> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(id);

      request.onsuccess = () => {
        const result: StoredAudioRecord | undefined = request.result;
        if (!result || !result.blob) {
          resolve(null);
          return;
        }
        const url = URL.createObjectURL(result.blob);
        resolve({
          url,
          duration: result.duration,
          blob: result.blob,
        });
      };

      request.onerror = () => {
        reject(request.error || new Error('Failed to retrieve audio blob'));
      };
    });
  } catch (err) {
    console.error('AudioStorage get failed:', err);
    return null;
  }
}

/**
 * Load all stored audio files as object URLs into an in-memory map
 */
export async function loadAllAudioUrls(): Promise<
  Record<number, { url: string; duration?: number }>
> {
  const result: Record<number, { url: string; duration?: number }> = {};
  try {
    const db = await getDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.openCursor();

      request.onsuccess = (e) => {
        const cursor = (e.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          const record: StoredAudioRecord = cursor.value;
          if (record && record.blob) {
            try {
              const url = URL.createObjectURL(record.blob);
              result[record.id] = {
                url,
                duration: record.duration,
              };
            } catch (createErr) {
              console.warn('Failed to create object URL for audio record', record.id, createErr);
            }
          }
          cursor.continue();
        } else {
          resolve(result);
        }
      };

      request.onerror = () => {
        console.warn('Cursor error when loading all audio records:', request.error);
        resolve(result);
      };
    });
  } catch (err) {
    console.warn('IndexedDB not accessible for audio:', err);
    return result;
  }
}

/**
 * Delete an audio recording from IndexedDB
 */
export async function deleteAudioEntry(id: number): Promise<void> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error || new Error('Failed to delete audio'));
    });
  } catch (err) {
    console.warn('AudioStorage delete failed:', err);
  }
}
