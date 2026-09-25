// usePlayTime — accumulates "active time on app" into localStorage.
//
// We tick once a second only when the page is visible AND the user has
// interacted within the last 60s (active window). This avoids inflating the
// total when a kid leaves the tab open in the background or walks away.
//
// Stored as a plain ms total in `jma_total_play_ms_v1`. Exposed via
// `getTotalPlayTimeMs()` so the print report can read it without subscribing.

import { useEffect, useRef } from 'react';

const KEY = 'jma_total_play_ms_v1';
const TICK_MS = 1000;          // 1-second granularity
const IDLE_TIMEOUT_MS = 60_000; // 60s of no interaction → pause

export function getTotalPlayTimeMs() {
  try { return parseInt(localStorage.getItem(KEY) || '0', 10) || 0; } catch { return 0; }
}

function addPlayTimeMs(delta) {
  try {
    const cur = getTotalPlayTimeMs();
    localStorage.setItem(KEY, String(cur + delta));
  } catch (_) { /* ignore */ }
}

// Mount once at App root.
export default function usePlayTime() {
  const lastInteractionRef = useRef(Date.now());

  useEffect(() => {
    const onAnyInteraction = () => { lastInteractionRef.current = Date.now(); };
    const events = ['pointerdown', 'keydown', 'touchstart', 'visibilitychange'];
    events.forEach(e => document.addEventListener(e, onAnyInteraction, { passive: true }));

    const interval = setInterval(() => {
      const now = Date.now();
      const isActive = document.visibilityState === 'visible'
        && (now - lastInteractionRef.current) < IDLE_TIMEOUT_MS;
      if (isActive) addPlayTimeMs(TICK_MS);
    }, TICK_MS);

    return () => {
      clearInterval(interval);
      events.forEach(e => document.removeEventListener(e, onAnyInteraction));
    };
  }, []);
}

// Helper for the report — humanizes ms into "1h 23m" / "12m" / "45s".
export function formatPlayTime(ms) {
  if (!ms || ms < 1000) return '0m';
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return `${totalSec}s`;
}
