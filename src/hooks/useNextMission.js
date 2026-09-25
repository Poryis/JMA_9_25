// useNextMission — picks the single best "do this next" recommendation for
// the kid based on their current rank progression.
//
// Strategy: lean on the rank engine. The next rank's requirement already
// tells us what tier we need to earn more of (Cadet / Pro / Master). From
// there we pick the most accessible domain the kid can earn it in:
//   • prefers domains the kid hasn't touched (breadth) when chasing more
//     domain coverage,
//   • respects tier prerequisites (can't recommend Pro if no Cadet yet, etc.)
//   • falls back gracefully (e.g. "need 1 Pro but have no Cadets" → pick a
//     Cadet first).
//
// The mission catalog maps each achievement → a kid-facing route, CTA verb,
// and one-line instruction. Pure data — no rendering here.

import { useMemo } from 'react';
import {
  ACHIEVEMENT_DOMAINS,
  ACHIEVEMENT_MAP,
  DOMAIN_MAP,
  TIER_MAP,
  achievementId,
  ALL_ACHIEVEMENT_IDS,
} from '../data/achievements';
import { getCurrentRank, getNextRank } from '../data/ranks';
import useStickers from './useStickers';

// Achievement ID → mission UX metadata.
// `route` is the HashRouter target. `cta` is the button verb (short).
// `instruction` is the one-line "what to do" the kid sees on the card.
// Exported so StickerDetailModal can surface the earn-instruction on a
// per-badge basis (§5 progression cleanup) without duplicating the catalog.
export const MISSIONS = {
  ach_rhythm_cadet:    { route: '/rhythm-game',  cta: 'Play Jelly Jukebox', instruction: 'Hit 20 perfect notes in any song' },
  ach_rhythm_pro:      { route: '/rhythm-game',  cta: 'Chase a streak',     instruction: 'Hit a streak of 15 in any song' },
  ach_rhythm_master:   { route: '/rhythm-game',  cta: 'Try Turbo speed!',   instruction: 'Finish a song at Turbo speed' },
  ach_ear_cadet:       { route: '/detective',    cta: 'Solve a case',       instruction: 'Crack one case in Detective Dr. Jellybone' },
  ach_ear_pro:         { route: '/note-match',   cta: 'Note Match: Medium', instruction: 'Clear a Note Match round on Medium' },
  ach_ear_master:      { route: '/detective',    cta: 'Master case!',       instruction: 'Solve a Master case in Detective' },
  ach_keyboard_cadet:  { route: '/free-play',    cta: 'Visit Jam Session',  instruction: 'Tap all 8 bells in Jam Session' },
  ach_keyboard_pro:    { route: '/simon-says',   cta: 'Stew Says: Lvl 4',   instruction: 'Beat Stew Kazoo Says level 4' },
  ach_keyboard_master: { route: '/simon-says',   cta: 'Stew Says: Lvl 8',   instruction: 'Beat Stew Kazoo Says level 8' },
  ach_beat_cadet:      { route: '/loop-studio',  cta: 'Make a loop',        instruction: 'Make any loop in the Beat Lab' },
  ach_beat_pro:        { route: '/loop-studio',  cta: '3-track loop',       instruction: 'Make a loop with 3+ instrument tracks' },
  ach_beat_master:     { route: '/loop-studio',  cta: 'Fast 4-track',       instruction: 'Make a 4+ track loop at 140+ BPM' },
  ach_song_cadet:      { route: '/song-studio',  cta: 'Save a song',        instruction: "Save your first song in Charlie's Song Studio" },
  ach_song_pro:        { route: '/song-studio',  cta: 'Try 3 moods',        instruction: 'Save songs in 3 different moods' },
  ach_song_master:     { route: '/song-studio',  cta: 'Fill all 16 slots',  instruction: 'Fill all 16 slots of any song' },
  ach_scholar_cadet:   { route: '/lessons',         cta: 'Watch Lesson 1',         instruction: 'Finish Lesson 1' },
  ach_scholar_pro:     { route: '/name-that-note',  cta: 'Name That Note: Pro',    instruction: 'Score 8/10 in Name That Note on Pro' },
  ach_scholar_master:  { route: '/name-that-note',  cta: 'Name That Note: Master', instruction: 'Score 8/10 in Name That Note on Master' },
};

// Which Cadet do we recommend FIRST for a kid with zero achievements?
// Detective is the most immediately rewarding starter — one case, one badge.
const FIRST_TIME_PICK = 'ach_ear_cadet';

// Order in which we'd prefer Cadets when recommending breadth. Easier games
// first so a 5-year-old gets a quick win before bumping into the harder ones.
const CADET_PREFERENCE = ['ear', 'keyboard', 'rhythm', 'beat', 'song', 'scholar'];

function getMissionForAchievement(achId) {
  const ach = ACHIEVEMENT_MAP[achId];
  const ux = MISSIONS[achId];
  if (!ach || !ux) return null;
  const domain = DOMAIN_MAP[ach.domain];
  const tier = TIER_MAP[ach.tier];
  return {
    achievementId: achId,
    achievementName: ach.name,
    tier,
    domain,
    route: ux.route,
    cta: ux.cta,
    instruction: ux.instruction,
  };
}

// Returns the achievement id the kid should chase next — or null if maxed.
function pickAchievementId(earnedSet) {
  // First-time user gets a friendly fixed starter so the homepage isn't
  // a coin-flip on first load.
  const anyEarned = ALL_ACHIEVEMENT_IDS.some(id => earnedSet.has(id));
  if (!anyEarned) return FIRST_TIME_PICK;

  const cur = getCurrentRank(earnedSet);
  const next = getNextRank(cur.id);
  if (!next) return null;

  // The next rank's requirement tells us which tier matters.
  const req = next.requirement;
  if (req.kind !== 'minDomainsAtTier') return null;
  const targetTier = req.tier;

  // Domains where the kid can EARN that tier right now (prereqs satisfied,
  // not already owned).
  const eligible = ACHIEVEMENT_DOMAINS.filter(d => {
    const id = achievementId(d.id, targetTier);
    if (earnedSet.has(id)) return false;
    if (targetTier === 'pro'    && !earnedSet.has(achievementId(d.id, 'cadet'))) return false;
    if (targetTier === 'master' && !earnedSet.has(achievementId(d.id, 'pro'))) return false;
    return true;
  });

  if (eligible.length > 0) {
    // Sort by our preferred-domain order so first-time kids get the easiest.
    eligible.sort((a, b) =>
      CADET_PREFERENCE.indexOf(a.id) - CADET_PREFERENCE.indexOf(b.id));
    return achievementId(eligible[0].id, targetTier);
  }

  // Fallback: rank wants a tier the kid can't immediately earn (e.g. needs
  // a Pro but has no Cadets yet). Walk DOWN the tier ladder so we always
  // recommend something the kid CAN realistically earn next. (Walking the
  // ladder up could skip past the genuinely-earnable tier.)
  const tierWalk = { cadet: ['cadet'], pro: ['cadet', 'pro'], master: ['cadet', 'pro', 'master'] };
  for (const fallbackTier of tierWalk[targetTier] || ['cadet']) {
    if (fallbackTier === targetTier) continue;
    const candidates = ACHIEVEMENT_DOMAINS.filter(d => {
      const id = achievementId(d.id, fallbackTier);
      if (earnedSet.has(id)) return false;
      if (fallbackTier === 'pro'    && !earnedSet.has(achievementId(d.id, 'cadet'))) return false;
      if (fallbackTier === 'master' && !earnedSet.has(achievementId(d.id, 'pro'))) return false;
      return true;
    });
    if (candidates.length) {
      candidates.sort((a, b) =>
        CADET_PREFERENCE.indexOf(a.id) - CADET_PREFERENCE.indexOf(b.id));
      return achievementId(candidates[0].id, fallbackTier);
    }
  }
  return null;
}

export default function useNextMission() {
  const { earned } = useStickers();
  const earnedSet = useMemo(() => new Set(Object.keys(earned)), [earned]);

  return useMemo(() => {
    const id = pickAchievementId(earnedSet);
    if (!id) {
      // Either maxed out or no eligible mission.
      const totalAchievements = ALL_ACHIEVEMENT_IDS.length;
      const earnedAchievements = ALL_ACHIEVEMENT_IDS.filter(a => earnedSet.has(a)).length;
      return {
        mission: null,
        complete: earnedAchievements >= totalAchievements,
      };
    }
    return { mission: getMissionForAchievement(id), complete: false };
  }, [earnedSet]);
}

// Exported for tests/sticker book. MISSIONS is already exported inline
// via `export const MISSIONS` at the top of the file.
export { getMissionForAchievement, pickAchievementId };
