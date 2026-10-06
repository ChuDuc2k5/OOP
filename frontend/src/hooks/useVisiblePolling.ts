'use client';
import { useEffect, useRef, useState } from 'react';

export function useVisiblePolling(refresh: () => void | Promise<void>, enabled: boolean, interval: number) {
  const latest = useRef(refresh);
  latest.current = refresh;
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined;
    const sync = (resume = false) => {
      if (timer) clearInterval(timer);
      timer = undefined;
      const shown = document.visibilityState === 'visible';
      setVisible(shown);
      if (!enabled || !shown) return;
      if (resume) void latest.current();
      timer = setInterval(() => {
        if (document.visibilityState === 'visible') void latest.current();
      }, interval);
    };
    const visibilityChanged = () => sync(true);
    sync();
    document.addEventListener('visibilitychange', visibilityChanged);
    return () => {
      if (timer) clearInterval(timer);
      document.removeEventListener('visibilitychange', visibilityChanged);
    };
  }, [enabled, interval]);
  return enabled && visible;
}
