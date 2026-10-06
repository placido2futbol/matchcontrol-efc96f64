import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * Wall-clock based timer: keeps counting correctly even if the tablet screen
 * turns off or the tab is in background (time is computed from timestamps).
 * Also requests a screen wake lock while running.
 */
export function useTimer() {
  const [seconds, setSecondsState] = useState(0);
  const [running, setRunning] = useState(false);
  const baseRef = useRef(0); // seconds accumulated before current run
  const startRef = useRef<number | null>(null); // Date.now() when run started
  const wakeRef = useRef<any>(null);

  const compute = () =>
    baseRef.current + (startRef.current ? Math.floor((Date.now() - startRef.current) / 1000) : 0);

  useEffect(() => {
    if (!running) return;
    const tick = () => setSecondsState(compute());
    tick();
    const id = setInterval(tick, 500);
    const onVis = () => {
      tick();
      if (document.visibilityState === 'visible') requestWake();
    };
    document.addEventListener('visibilitychange', onVis);
    requestWake();
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVis);
      releaseWake();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  const requestWake = async () => {
    try {
      const nav: any = navigator;
      if (nav.wakeLock && !wakeRef.current) {
        wakeRef.current = await nav.wakeLock.request('screen');
        wakeRef.current.addEventListener?.('release', () => { wakeRef.current = null; });
      }
    } catch { /* not supported */ }
  };
  const releaseWake = () => {
    try { wakeRef.current?.release(); } catch { /* ignore */ }
    wakeRef.current = null;
  };

  const toggle = useCallback(() => {
    if (startRef.current) {
      baseRef.current = compute();
      startRef.current = null;
      setSecondsState(baseRef.current);
      setRunning(false);
    } else {
      startRef.current = Date.now();
      setRunning(true);
    }
  }, []);

  const reset = useCallback(() => {
    baseRef.current = 0;
    startRef.current = null;
    setSecondsState(0);
    setRunning(false);
  }, []);

  const setSeconds = useCallback((v: number | ((s: number) => number)) => {
    const next = typeof v === 'function' ? (v as (s: number) => number)(compute()) : v;
    baseRef.current = next || 0;
    if (startRef.current) startRef.current = Date.now();
    setSecondsState(baseRef.current);
  }, []);

  const formatTime = useCallback((sec: number) => {
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }, []);

  return { seconds, setSeconds, running, toggle, reset, formatTime };
}
