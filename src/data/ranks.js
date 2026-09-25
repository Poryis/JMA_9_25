// Jelly of the Month Club Music Academy — Rank ladder.
//
// Ranks are NO LONGER based on total sticker count. They are gated by the
// breadth AND depth of music skills the kid has demonstrated, tracked via
// the Achievement Stickers (data/achievements.js).
//
// Why this matters: a kid can no longer hop from Cadet to Maestro by
// collecting fun stickers — each rank requires real, varied skill proof.
//
// Two compounding gates:
//   1. WITHIN a domain, Pro requires Cadet first, Master requires Pro first.
//      (Enforced in earnAchievement().)
//   2. ACROSS domains, ranks require multiple skill domains at a given tier.
//      (Defined here.)
//
// Resulting arc: to reach Maestro a kid must demonstrate 3 distinct skills
// at all three tiers (3 domains × 3 tiers = 9 separate skill proofs).

import { summarizeAchievements } from './achievements';

export const RANKS = [
  {
    id: 'polliwog',
    title: 'Polliwog',
    subtitle: 'Brand New Friend',
    color: '#4CD964',
    badgeBg: '#E8F8EE',
    icon: 'assets/characters/charlie-polliwog.png',
    blurb: 'Just hatched! Hop in and make some music.',
    // Not celebrated — it's the starting rank; nobody "reaches" it.
    celebrationHint: null,
    // Requirement is implicit: the starting rank
    requirement: { kind: 'start', label: 'Start your music journey' },
  },
  {
    id: 'tadpole',
    title: 'Tadpole',
    subtitle: 'Tapping Along',
    color: '#34A853',
    badgeBg: '#E8F8EE',
    icon: 'assets/characters/finn-danger.png',
    blurb: 'Your tail is twitching with rhythm!',
    // Polliwog → Tadpole IS the very first-badge moment — coordinated
    // as one celebration overlay (no separate first-badge toast).
    celebrationHint: '🎉 Your first music badge! Keep exploring different music skills to keep ranking up.',
    requirement: { kind: 'minDomainsAtTier', tier: 'cadet', count: 1, label: 'Earn 1 Cadet badge' },
  },
  {
    id: 'apprentice',
    title: 'Apprentice',
    subtitle: 'Sampling the Academy',
    color: '#4285F4',
    badgeBg: '#E5F0FF',
    icon: 'assets/characters/dr-jellybone.png',
    blurb: 'Stew is impressed. Keep exploring different skills!',
    celebrationHint: 'You earned Cadet badges in 3 different music skills.',
    requirement: { kind: 'minDomainsAtTier', tier: 'cadet', count: 3, label: 'Earn Cadet badges in 3 different domains' },
  },
  {
    id: 'soloist',
    title: 'Soloist',
    subtitle: 'In the Spotlight',
    color: '#FF9500',
    badgeBg: '#FFF1DC',
    icon: 'assets/characters/jazzy.png',
    blurb: 'You can really play one thing. The band is listening!',
    celebrationHint: 'You earned your first Pro badge.',
    requirement: { kind: 'minDomainsAtTier', tier: 'pro', count: 1, label: 'Earn 1 Pro badge' },
  },
  {
    id: 'performer',
    title: 'Performer',
    subtitle: 'Versatile Musician',
    color: '#FF3B30',
    badgeBg: '#FFE5E1',
    icon: 'assets/characters/charlie-rundmc.png',
    blurb: 'Strong in multiple skills. A real performer!',
    celebrationHint: 'You earned Pro badges in 3 different music skills.',
    requirement: { kind: 'minDomainsAtTier', tier: 'pro', count: 3, label: 'Earn Pro badges in 3 different domains' },
  },
  {
    id: 'conductor',
    title: 'Conductor',
    subtitle: 'Leading the Band',
    color: '#AF52DE',
    badgeBg: '#F2E7FA',
    icon: 'assets/characters/charlie-drum-major.png',
    blurb: 'You set the tempo around here.',
    celebrationHint: 'You earned your first Master badge.',
    requirement: { kind: 'minDomainsAtTier', tier: 'master', count: 1, label: 'Earn 1 Master badge' },
  },
  {
    id: 'maestro',
    title: 'Maestro',
    subtitle: 'Off the Charts',
    color: '#FFCC00',
    badgeBg: '#FFF8D6',
    icon: 'assets/characters/charlie-grad.png',
    blurb: 'Maestro! You officially run this place.',
    celebrationHint: 'You earned Master badges in 3 different music skills.',
    requirement: { kind: 'minDomainsAtTier', tier: 'master', count: 3, label: 'Earn Master badges in 3 different domains' },
  },
];

const RANK_INDEX = Object.fromEntries(RANKS.map((r, i) => [r.id, i]));

function meetsRequirement(req, summary) {
  if (req.kind === 'start') return true;
  if (req.kind === 'minDomainsAtTier') {
    const counts = {
      cadet:  summary.domainsWithCadet,
      pro:    summary.domainsWithPro,
      master: summary.domainsWithMaster,
    };
    return (counts[req.tier] || 0) >= req.count;
  }
  return false;
}

// Highest rank the kid currently qualifies for.
// Iterates the ladder top-to-bottom and returns the first match.
export function getCurrentRank(earnedSet) {
  const summary = summarizeAchievements(earnedSet);
  for (let i = RANKS.length - 1; i >= 0; i--) {
    if (meetsRequirement(RANKS[i].requirement, summary)) return RANKS[i];
  }
  return RANKS[0];
}

export function getNextRank(currentRankId) {
  const idx = RANK_INDEX[currentRankId];
  if (idx == null || idx >= RANKS.length - 1) return null;
  return RANKS[idx + 1];
}

// Returns { current, target, pct } describing the kid's progress toward the
// next rank — for the home-page progress bar. We use the requirement count
// of the NEXT rank as the target.
export function getProgressToNext(earnedSet) {
  const summary = summarizeAchievements(earnedSet);
  const cur = getCurrentRank(earnedSet);
  const next = getNextRank(cur.id);
  if (!next) {
    return { current: summary.domainsWithMaster, target: 3, pct: 100, hint: 'Maxed out!' };
  }
  const req = next.requirement;
  if (req.kind === 'minDomainsAtTier') {
    const counts = {
      cadet:  summary.domainsWithCadet,
      pro:    summary.domainsWithPro,
      master: summary.domainsWithMaster,
    };
    const current = counts[req.tier] || 0;
    const target = req.count;
    const pct = Math.max(0, Math.min(100, Math.round((current / target) * 100)));
    return { current, target, pct, hint: next.requirement.label };
  }
  return { current: 0, target: 1, pct: 0, hint: next.requirement.label };
}
