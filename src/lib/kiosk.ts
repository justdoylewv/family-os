import { useCallback, useEffect, useState } from 'react';

export function useWakeLock(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    if (!('wakeLock' in navigator)) return;

    let sentinel: WakeLockSentinel | null = null;
    let cancelled = false;

    const request = async () => {
      try {
        const lock = await navigator.wakeLock.request('screen');
        if (cancelled) {
          void lock.release();
          return;
        }
        sentinel = lock;
      } catch {
        /* user may need to interact first; ignore */
      }
    };

    void request();
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') void request();
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', handleVisibility);
      void sentinel?.release();
    };
  }, [enabled]);
}

export function useFullscreen() {
  const [isFullscreen, setFullscreen] = useState(
    typeof document !== 'undefined' && Boolean(document.fullscreenElement),
  );

  useEffect(() => {
    const handler = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  const toggle = useCallback(async () => {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else {
      await document.documentElement.requestFullscreen();
    }
  }, []);

  return { isFullscreen, toggle };
}
