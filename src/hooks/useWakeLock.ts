import { useEffect, useRef, useCallback } from 'react';

/**
 * Screen Wake Lock API hook: keeps tablet/phone screen awake
 * during critical activities (e.g. cognitive games, memory recording, SOS drill).
 */
export function useWakeLock(shouldLock: boolean = false) {
  const wakeLockRef = useRef<any>(null);

  const requestLock = useCallback(async () => {
    if (typeof navigator !== 'undefined' && 'wakeLock' in navigator && !wakeLockRef.current) {
      try {
        wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
        wakeLockRef.current.addEventListener('release', () => {
          wakeLockRef.current = null;
        });
      } catch (err) {
        // WakeLock may fail if low battery or permission denied; graceful fallback
        console.debug('Wake lock request not granted:', err);
      }
    }
  }, []);

  const releaseLock = useCallback(async () => {
    if (wakeLockRef.current) {
      try {
        await wakeLockRef.current.release();
      } catch (err) {
        console.debug('Wake lock release error:', err);
      } finally {
        wakeLockRef.current = null;
      }
    }
  }, []);

  useEffect(() => {
    if (shouldLock) {
      requestLock();
    } else {
      releaseLock();
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && shouldLock) {
        requestLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      releaseLock();
    };
  }, [shouldLock, requestLock, releaseLock]);

  return { requestLock, releaseLock };
}
