// useStickers: localStorage-backed hook for earning and reading stickers.
// Also exposes a lightweight event system so UI can show a "sticker earned"
// toast when a mode awards a new sticker.
//
// Two earn paths:
//   • earnSticker(id)              - any collection sticker, idempotent
//   • earnAchievement(domain, tier) - achievement sticker, enforces the
//                                     Cadet → Pro → Master prerequisite in
//                                     the same domain so kids can't skip
//                                     the ladder.

import { useCallback, useEffect, useState } from 'react';
import { STICKER_MAP } from '../data/stickers';
import {
  ACHIEVEMENT_MAP,
  ALL_ACHIEVEMENT_IDS,
  achievementId,
  tierRank,
} from '../data/achievements';

const STORAGE_KEY = 'jma_stickers_v1';
const FACT_COUNT_KEY = 'jma_facts_seen_v1';
const MIGRATION_KEY = 'jma_stickers_migrated_v2';

function readEarned() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) || {};
  } catch (_) { return {}; }
}

function writeEarned(earned) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(earned)); } catch (_) {}
}

// ----- One-time migration -----
//
// Players who already earned legacy stickers in the old "X total stickers
// = rank N" system should retain their progress when the new achievement-
// based ranks land. We translate legacy proof-of-skill stickers into the
// new achievement IDs once per kid, then mark migration complete so we
// never overwrite later state.
//
// Note: the legacy 'songwriter' / 'ach_simon_5' / 'ach_ear_trainer' /
// 'fit_doctor_detective' stickers prove the same skills the new Cadet-tier
// achievements do — so we grant them. Where strong evidence exists for
// Pro/Master tiers (e.g. detective_master sticker, lesson_graduate, etc.),
// we grant those too.
const MIGRATION_MAP = {
  // legacy id            → list of [domain, tier] grants
  // Rhythm Reader
  ach_streak_10:          [['rhythm', 'cadet']],
  ach_streak_25:          [['rhythm', 'cadet'], ['rhythm', 'pro']],
  ach_song_5:             [['rhythm', 'cadet']],
  fit_charlie_punk:       [['rhythm', 'pro']],          // streak of 15
  fit_charlie_ragu:       [['rhythm', 'cadet'], ['rhythm', 'pro'], ['rhythm', 'master']], // turbo complete
  // Note Detective
  match_easy:             [['ear', 'cadet']],
  match_medium:           [['ear', 'cadet'], ['ear', 'pro']],
  match_hard:             [['ear', 'cadet'], ['ear', 'pro'], ['ear', 'master']],
  detective_rookie:       [['ear', 'cadet']],
  detective_sleuth:       [['ear', 'cadet'], ['ear', 'pro']],
  detective_master:       [['ear', 'cadet'], ['ear', 'pro'], ['ear', 'master']],
  fit_doctor_detective:   [['ear', 'cadet']],
  ach_ear_trainer:        [['ear', 'cadet']],
  // Keyboard Scout
  inst_bells:             [['keyboard', 'cadet']],
  fit_charlie_grad:       [['keyboard', 'cadet'], ['keyboard', 'pro'], ['keyboard', 'master']],
  ach_simon_5:            [['keyboard', 'cadet'], ['keyboard', 'pro']],
  // Beat Builder
  ach_beat_maker:         [['beat', 'cadet']],
  fit_charlie_surf:       [['beat', 'cadet'], ['beat', 'pro']],
  fit_charlie_rundmc:     [['beat', 'cadet'], ['beat', 'pro']],
  fit_charlie_disco:      [['beat', 'cadet'], ['beat', 'pro'], ['beat', 'master']],
  // Song Creator
  songwriter:             [['song', 'cadet']],
  // Music Scholar
  lesson_1:               [['scholar', 'cadet']],
  lesson_4:               [['scholar', 'cadet'], ['scholar', 'pro']],
  lesson_graduate:        [['scholar', 'cadet'], ['scholar', 'pro'], ['scholar', 'master']],
};

function runMigration() {
  try {
    if (localStorage.getItem(MIGRATION_KEY) === 'done') return;
    const earned = readEarned();
    let changed = false;
    for (const [legacyId, grants] of Object.entries(MIGRATION_MAP)) {
      if (!earned[legacyId]) continue;
      for (const [domain, tier] of grants) {
        const id = achievementId(domain, tier);
        if (!earned[id]) {
          earned[id] = { earnedAt: earned[legacyId].earnedAt || new Date().toISOString(), migrated: true };
          changed = true;
        }
      }
    }
    if (changed) writeEarned(earned);
    localStorage.setItem(MIGRATION_KEY, 'done');
  } catch (_) { /* ignore */ }
}

// Run once at module load so any page that uses the hook (or imports earnSticker)
// has the migrated state.
runMigration();

// Subscribe listeners fire on every earn() call so the UI can react.
// The listener receives a BATCH of newly-earned sticker IDs — single earns
// arrive as `[id]`, rapid-fire earns (e.g. earnAchievementUpTo() firing 3
// tiers at once, or first-session exploration triggering several earns
// within a heartbeat) are coalesced into one batch via a short debounce.
// This keeps the early-app onboarding from buzzing the kid with 4 popups
// back-to-back while still preserving the dopamine hit of a single earn.
const listeners = new Set();

// Module-level batching state. Sticker earns within BATCH_WINDOW_MS of
// each other are collapsed into a single notification with all IDs.
const BATCH_WINDOW_MS = 700;
let pendingBatch = [];
let pendingBatchTimer = null;

function flushBatch() {
  const ids = pendingBatch;
  pendingBatch = [];
  pendingBatchTimer = null;
  if (ids.length === 0) return;
  listeners.forEach(fn => {
    try { fn(ids); } catch (_) {}
  });
}

function notify(newlyEarnedId) {
  // null = "data wiped, please re-read" — fire immediately and clear any
  // pending batch (the old IDs no longer make sense after a reset).
  if (newlyEarnedId === null) {
    pendingBatch = [];
    if (pendingBatchTimer) { clearTimeout(pendingBatchTimer); pendingBatchTimer = null; }
    listeners.forEach(fn => { try { fn(null); } catch (_) {} });
    return;
  }
  pendingBatch.push(newlyEarnedId);
  if (pendingBatchTimer) clearTimeout(pendingBatchTimer);
  pendingBatchTimer = setTimeout(flushBatch, BATCH_WINDOW_MS);
}

/**
 * earnSticker(id) - idempotent. Stores the sticker with its earned date.
 * Returns true if this was a NEW earn, false if already owned.
 * Safe to call anywhere without a hook (useful inside event handlers).
 *
 * For ACHIEVEMENT stickers, prefer earnAchievement() which enforces tier
 * prerequisites. This function will still work but skips the prereq check.
 */
/**
 * Wipe ALL sticker / achievement / rank progress for this device.
 *
 * Also clears related counters (loops played, bells played, songs completed,
 * music facts seen, instruments played, lessons watched, rank "last seen"
 * flag, and the legacy-migration flag — so a kid who resets after the
 * upgrade migrates cleanly again with the now-empty earned list).
 *
 * Caller is responsible for confirming with the user; this function just
 * does the wipe and triggers the listeners so the UI can react.
 */
export function resetAllStickers() {
  const keysToClear = [
    STORAGE_KEY,
    MIGRATION_KEY,
    FACT_COUNT_KEY,
    'jma_rank_seen_v1',
    'jma_loops_played_v1',
    'jma_songs_completed_v1',
    'jma_bells_played_v1',
    'jma_instruments_played_v1',
    'jma_lessons_watched_v1',
  ];
  try {
    for (const k of keysToClear) localStorage.removeItem(k);
  } catch (_) { /* ignore */ }
  // Fire one notification so any open useStickers/useRank consumer re-renders.
  notify(null);
}

export function earnSticker(id) {
  if (!STICKER_MAP[id]) return false;
  const earned = readEarned();
  if (earned[id]) return false;
  earned[id] = { earnedAt: new Date().toISOString() };
  writeEarned(earned);
  notify(id);
  return true;
}

/**
 * earnAchievement(domain, tier)
 *
 * Earn a specific achievement-sticker. Enforces tier prerequisites:
 *   - Pro requires Cadet (same domain) first
 *   - Master requires Pro (same domain) first
 *
 * Calling earnAchievement('rhythm', 'master') on a fresh account silently
 * no-ops because Cadet+Pro aren't earned yet. To skill-skip, the prerequisite
 * activity has to actually be completed.
 *
 * Returns true if this call actually earned a new achievement, false if
 * already owned OR if a prerequisite is missing.
 */
export function earnAchievement(domain, tier) {
  const id = achievementId(domain, tier);
  if (!ACHIEVEMENT_MAP[id]) return false;
  const earned = readEarned();
  if (earned[id]) return false;
  // Enforce tier prerequisites within the same domain.
  const myRank = tierRank(tier);
  if (myRank > 1) {
    const prereqTier = myRank === 3 ? 'pro' : 'cadet';
    const prereqId = achievementId(domain, prereqTier);
    if (!earned[prereqId]) return false; // skill-skip blocked
  }
  earned[id] = { earnedAt: new Date().toISOString() };
  writeEarned(earned);
  notify(id);
  return true;
}

/**
 * Convenience: tries to earn a whole tier ladder up to (and including) the
 * given tier. Useful when an event proves Master-level skill but the kid
 * skipped collecting Cadet/Pro along the way (e.g. they crushed it on first
 * try). We still grant lower tiers in order so the rank engine is happy.
 *
 * Returns the array of newly-earned achievement IDs.
 */
export function earnAchievementUpTo(domain, tier) {
  const order = ['cadet', 'pro', 'master'];
  const limit = order.indexOf(tier);
  if (limit < 0) return [];
  const out = [];
  for (let i = 0; i <= limit; i++) {
    if (earnAchievement(domain, order[i])) out.push(achievementId(domain, order[i]));
  }
  return out;
}

/** Helper: count of music facts seen, gates the fact_finder sticker. */
export function noteFactSeen() {
  try {
    const n = parseInt(localStorage.getItem(FACT_COUNT_KEY) || '0', 10) + 1;
    localStorage.setItem(FACT_COUNT_KEY, String(n));
    if (n >= 10) earnSticker('ach_fact_finder');
  } catch (_) {}
}

export default function useStickers() {
  const [earned, setEarned] = useState(() => readEarned());
  // Toast shape: { ids: string[], primary: meta } where `primary` is the
  // metadata for ids[0] (used as the headline sticker). For a single earn
  // ids.length === 1 and the toast renders as a single-sticker card; for
  // a batch (e.g. earnAchievementUpTo() firing all 3 tiers, or initial
  // exploration earning a handful inside one second) it renders as a
  // compact "🎉 N New Stickers!" pill with a row of mini icons.
  const [toast, setToast] = useState(null);

  useEffect(() => {
    const handler = (idsOrNull) => {
      // null = a hard reset (resetAllStickers). Re-read storage so any
      // open consumer drops its cached `earned` map, but don't pop a toast.
      if (idsOrNull === null) {
        setEarned(readEarned());
        setToast(null);
        return;
      }
      setEarned(readEarned());
      const ids = Array.isArray(idsOrNull) ? idsOrNull : [idsOrNull];
      const primary = STICKER_MAP[ids[0]];
      if (primary) setToast({ ids, primary });
    };
    listeners.add(handler);
    return () => { listeners.delete(handler); };
  }, []);

  useEffect(() => {
    if (!toast) return;
    // Quieter onboarding: 2.5 s on-screen instead of 3.2 s. Batches naturally
    // stay longer because each batch is a single toast (no re-trigger).
    const t = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  const earn = useCallback((id) => earnSticker(id), []);
  const dismissToast = useCallback(() => setToast(null), []);

  // Achievement-aware counters
  const achievementCount = Object.keys(earned).filter(id => ALL_ACHIEVEMENT_IDS.includes(id)).length;
  const collectionCount = Object.keys(earned).length - achievementCount;

  return {
    earned,              // { [id]: { earnedAt } }
    earnedCount: Object.keys(earned).length,
    achievementCount,
    collectionCount,
    earn,
    toast,
    dismissToast,
  };
}
