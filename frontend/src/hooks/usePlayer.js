// usePlayer — single source of truth for the "current player" identity.
//
// Today: a name in localStorage. One-time prompt on first homepage visit.
// Future: when we add accounts, this hook becomes the place that resolves
// either the local-cached player OR the server-authoritative player.
//
// Data model (future-proofed):
//   player = { id, displayName, createdAt }
// Today `id` is just 'local' (single-player-per-device). When accounts ship
// we replace it with the server's user id and namespace all progress keys
// under `player_${id}_*` — a 1-day migration job, not a rewrite.

import { useCallback, useEffect, useState } from 'react';

const PLAYER_KEY = 'jma_player_v1';

function readPlayer() {
  try {
    const raw = localStorage.getItem(PLAYER_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

function writePlayer(p) {
  try { localStorage.setItem(PLAYER_KEY, JSON.stringify(p)); } catch { /* ignore */ }
}

export default function usePlayer() {
  const [player, setPlayer] = useState(readPlayer);

  // Re-read on storage events so the home page updates if someone edits
  // the name on a tooltip or in the print report.
  useEffect(() => {
    const handler = () => setPlayer(readPlayer());
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  const setDisplayName = useCallback((name) => {
    const trimmed = (name || '').trim();
    if (!trimmed) return;
    const next = {
      id: 'local',
      displayName: trimmed,
      createdAt: player?.createdAt || new Date().toISOString(),
    };
    writePlayer(next);
    setPlayer(next);
  }, [player]);

  const clearPlayer = useCallback(() => {
    try { localStorage.removeItem(PLAYER_KEY); } catch { /* ignore */ }
    setPlayer(null);
  }, []);

  return { player, setDisplayName, clearPlayer };
}

// Direct helper for components that just need the name once (e.g. print).
export function getPlayerDisplayName() {
  return readPlayer()?.displayName || null;
}
