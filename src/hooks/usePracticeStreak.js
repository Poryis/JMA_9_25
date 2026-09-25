// usePracticeStreak — tracks daily return streak for the "Practice Buddy" feature.
//
// Records the date (yyyy-mm-dd) of every visit. On each mount we update the
// streak:
//   - same day as last → no change
//   - previous calendar day → increment streak
//   - any further gap → reset to 1
//
// When the streak first crosses 3 / 7 / 14, we award the corresponding
// `practice_buddy_*` milestone collection stickers. (These live in
// data/stickers.js and are pure flair — they do NOT gate the rank ladder.)

import { useEffect, useState } from 'react';
import { earnSticker } from './useStickers';

const STREAK_KEY = 'jma_practice_streak_v1'; // { count, lastDate: 'yyyy-mm-dd' }

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function yesterdayStr(refStr) {
  const [y, m, d] = refStr.split('-').map(n => parseInt(n, 10));
  // Build a Date at noon to avoid DST off-by-one
  const ref = new Date(y, m - 1, d, 12, 0, 0);
  ref.setDate(ref.getDate() - 1);
  return `${ref.getFullYear()}-${String(ref.getMonth() + 1).padStart(2, '0')}-${String(ref.getDate()).padStart(2, '0')}`;
}

function readState() {
  try {
    const raw = localStorage.getItem(STREAK_KEY);
    if (!raw) return { count: 0, lastDate: null };
    return JSON.parse(raw) || { count: 0, lastDate: null };
  } catch (_) { return { count: 0, lastDate: null }; }
}

function writeState(state) {
  try { localStorage.setItem(STREAK_KEY, JSON.stringify(state)); } catch (_) {}
}

// Returns the updated state (so callers don't have to re-read).
function bumpStreak() {
  const today = todayStr();
  const prev = readState();
  if (prev.lastDate === today) return prev;
  let count;
  if (prev.lastDate === yesterdayStr(today)) {
    count = (prev.count || 0) + 1;
  } else {
    count = 1;
  }
  const next = { count, lastDate: today };
  writeState(next);
  if (count === 3)  earnSticker('practice_buddy_3');
  if (count === 7)  earnSticker('practice_buddy_7');
  if (count === 14) earnSticker('practice_buddy_14');
  return next;
}

export default function usePracticeStreak() {
  const [state, setState] = useState(() => readState());
  useEffect(() => {
    setState(bumpStreak());
  }, []);
  return state; // { count, lastDate }
}
