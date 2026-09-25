// Rank tracking: rank is now derived from EARNED ACHIEVEMENT STICKERS, not
// total sticker count. Achievement-driven ranks reflect demonstrated music
// skill across multiple domains.
//
// Rank-up celebration is opt-in via `withCelebration: true` — only one
// component (RankUpCelebration in App.js) should request celebration
// tracking; everyone else just reads currentRank/progress.

import { useEffect, useMemo, useState, useCallback } from 'react';
import { RANKS, getCurrentRank, getNextRank, getProgressToNext } from '../data/ranks';
import { ALL_ACHIEVEMENT_IDS } from '../data/achievements';
import useStickers from './useStickers';

const LAST_SEEN_KEY = 'jma_rank_seen_v1';

function readLastSeen() {
  try { return localStorage.getItem(LAST_SEEN_KEY) || 'polliwog'; }
  catch (_) { return 'polliwog'; }
}

function writeLastSeen(id) {
  try { localStorage.setItem(LAST_SEEN_KEY, id); } catch (_) {}
}

export default function useRank({ withCelebration = false } = {}) {
  const { earned, earnedCount } = useStickers();
  const [rankUp, setRankUp] = useState(null);

  // Filter the earned-sticker map down to just the achievement IDs, then
  // compute current/next rank from that set.
  const achievementSet = useMemo(() => {
    const s = new Set();
    for (const id of ALL_ACHIEVEMENT_IDS) {
      if (earned[id]) s.add(id);
    }
    return s;
  }, [earned]);

  const currentRank = useMemo(() => getCurrentRank(achievementSet), [achievementSet]);
  const nextRank = useMemo(() => getNextRank(currentRank.id), [currentRank]);
  const progress = useMemo(() => getProgressToNext(achievementSet), [achievementSet]);

  useEffect(() => {
    if (!withCelebration) return;
    const last = readLastSeen();
    if (last !== currentRank.id) {
      const lastIdx = RANKS.findIndex(r => r.id === last);
      const curIdx = RANKS.findIndex(r => r.id === currentRank.id);
      if (curIdx > lastIdx) setRankUp(currentRank);
      writeLastSeen(currentRank.id);
    }
  }, [currentRank, withCelebration]);

  const dismissRankUp = useCallback(() => setRankUp(null), []);

  return {
    currentRank,
    nextRank,
    progress,
    rankUp,
    dismissRankUp,
    achievementCount: achievementSet.size,
    totalStickers: earnedCount,
  };
}
