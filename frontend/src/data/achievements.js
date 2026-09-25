// Jelly of the Month Club Music Academy — Achievement system.
//
// Achievement stickers are badge-style stickers that represent demonstrated
// MUSIC SKILLS. Six domains × three tiers (Cadet → Pro → Master) = 18 badges.
//
// Critical rule: each tier requires the previous tier in the SAME domain.
// `earnAchievement('rhythm', 'master')` will silently no-op if Pro isn't
// already earned. The helper enforces this so kids can't speedrun the ladder.
//
// Only achievement stickers determine rank — collection stickers (characters,
// outfits, bells, songs) are pure flair.

export const ACHIEVEMENT_DOMAINS = [
  {
    id: 'rhythm',
    label: 'Rhythm Reader',
    blurb: 'Timing & note tracking',
    teacherDescription: 'Demonstrates beat tracking, rhythmic accuracy, and the ability to follow a steady pulse while reading falling-note notation.',
    color: '#FF9500',
    icon: 'assets/characters/jazzy.png',
  },
  {
    id: 'ear',
    label: 'Note Detective',
    blurb: 'Pitch & ear recognition',
    teacherDescription: 'Demonstrates aural pitch discrimination, melodic memory, and identification of incorrect or extra notes within a familiar melody.',
    color: '#9B6DE0',
    icon: 'assets/characters/dr-jellybone.png',
  },
  {
    id: 'keyboard',
    label: 'Keyboard Scout',
    blurb: 'Playing the actual notes',
    teacherDescription: 'Demonstrates instrumental coordination, kinesthetic memory of pitch positions, and the ability to reproduce melodic patterns by ear.',
    color: '#4285F4',
    icon: 'assets/characters/charlie-zoot.png',
  },
  {
    id: 'beat',
    label: 'Beat Builder',
    blurb: 'Rhythm composition',
    teacherDescription: 'Demonstrates rhythmic composition, multi-track layering, and understanding of tempo (BPM) as a creative tool.',
    color: '#E74C3C',
    icon: 'assets/characters/charlie-rundmc.png',
  },
  {
    id: 'song',
    label: 'Song Creator',
    blurb: 'Melodic composition',
    teacherDescription: 'Demonstrates melodic composition, phrase structure, mood-based key/mode selection, and complete-song organization across measures.',
    color: '#FFCC00',
    icon: 'assets/characters/charlie-grad.png',
  },
  {
    id: 'scholar',
    label: 'Music Scholar',
    blurb: 'Reading & theory',
    teacherDescription: 'Demonstrates music literacy: notation reading, solfège and letter-name vocabulary, treble-staff note identification, sight-reading, and engagement with formal music-theory lessons.',
    color: '#34A853',
    icon: 'assets/characters/charlie-polliwog.png',
  },
];

export const ACHIEVEMENT_TIERS = [
  {
    id: 'cadet',
    label: 'Cadet',
    rank: 1,
    frame: '#CD7F32',          // bronze
    frameHi: '#E29D54',
    ribbonBg: '#8B5A2B',
    ribbon: 'CADET',
  },
  {
    id: 'pro',
    label: 'Pro',
    rank: 2,
    frame: '#9DA3A8',          // silver
    frameHi: '#C6CCD1',
    ribbonBg: '#5F676E',
    ribbon: 'PRO',
  },
  {
    id: 'master',
    label: 'Master',
    rank: 3,
    frame: '#F4C835',          // gold
    frameHi: '#FFE07A',
    ribbonBg: '#A37D00',
    ribbon: 'MASTER',
  },
];

// What it takes to earn each badge (kid-facing hint copy).
// `id` is the legacy-style id we store in localStorage: `ach_<domain>_<tier>`.
export const ACHIEVEMENT_STICKERS = [
  // ---------- Rhythm Reader ----------
  // Earned via either Who's Got the Rhythm (Parrot Percussion / Beat Finder /
  // Rhythm Run) at the matching difficulty OR the Jelly Jukebox falling-
  // notes game. Two distinct doorways into the same domain so kids who
  // hate one game still have a path.
  { id: 'ach_rhythm_cadet',    domain: 'rhythm',   tier: 'cadet',  name: 'Rhythm Rookie',  hint: "Ace any round in Who's Got the Rhythm (or hit 20 perfects in Jelly Jukebox)" },
  { id: 'ach_rhythm_pro',      domain: 'rhythm',   tier: 'pro',    name: 'Rhythm Pro',     hint: "Pass a round at Pro level in Who's Got the Rhythm (or hit a streak of 15 in Jelly Jukebox)" },
  { id: 'ach_rhythm_master',   domain: 'rhythm',   tier: 'master', name: 'Rhythm Master',  hint: "Pass a round at Master level in Who's Got the Rhythm (or finish a song at Turbo speed)" },
  // ---------- Note Detective ----------
  { id: 'ach_ear_cadet',       domain: 'ear',      tier: 'cadet',  name: 'Ear Cadet',      hint: 'Solve a case in Detective Dr. Jellybone' },
  { id: 'ach_ear_pro',         domain: 'ear',      tier: 'pro',    name: 'Ear Pro',        hint: 'Clear Note Match on Medium' },
  { id: 'ach_ear_master',      domain: 'ear',      tier: 'master', name: 'Ear Master',     hint: 'Solve a Master case AND score 5 in Ear Quest' },
  // ---------- Keyboard Scout ----------
  { id: 'ach_keyboard_cadet',  domain: 'keyboard', tier: 'cadet',  name: 'Keyboard Cadet', hint: 'Play all 8 bells in Jam Hall' },
  { id: 'ach_keyboard_pro',    domain: 'keyboard', tier: 'pro',    name: 'Keyboard Pro',   hint: 'Beat Stew Kazoo Says level 4' },
  { id: 'ach_keyboard_master', domain: 'keyboard', tier: 'master', name: 'Keyboard Master',hint: 'Beat Stew Kazoo Says level 8' },
  // ---------- Beat Builder ----------
  { id: 'ach_beat_cadet',      domain: 'beat',     tier: 'cadet',  name: 'Beat Cadet',     hint: 'Make any loop in the Beat Lab' },
  { id: 'ach_beat_pro',        domain: 'beat',     tier: 'pro',    name: 'Beat Pro',       hint: 'Make a Beat Lab loop with 3+ tracks' },
  { id: 'ach_beat_master',     domain: 'beat',     tier: 'master', name: 'Beat Master',    hint: 'Make a 4+ track loop at 140+ BPM' },
  // ---------- Song Creator ----------
  { id: 'ach_song_cadet',      domain: 'song',     tier: 'cadet',  name: 'Song Cadet',     hint: "Save your first song in Charlie's Song Studio" },
  { id: 'ach_song_pro',        domain: 'song',     tier: 'pro',    name: 'Song Pro',       hint: 'Save songs in 3 different moods' },
  { id: 'ach_song_master',     domain: 'song',     tier: 'master', name: 'Song Master',    hint: 'Save a fully filled song (all 16 slots) in any mood' },
  // ---------- Music Scholar ----------
  // Two doors here too: the formal Lessons series for theory + the
  // Sight-Reading Sprint for applied staff-reading.
  { id: 'ach_scholar_cadet',   domain: 'scholar',  tier: 'cadet',  name: 'Scholar Cadet',  hint: 'Finish Lesson 1 (or clear Sight-Read or Name That Note on Cadet)' },
  { id: 'ach_scholar_pro',     domain: 'scholar',  tier: 'pro',    name: 'Scholar Pro',    hint: 'Finish Lessons 1–4 (or clear Sight-Read or Name That Note on Pro)' },
  { id: 'ach_scholar_master',  domain: 'scholar',  tier: 'master', name: 'Scholar Master', hint: 'Finish all 7 lessons (or clear Sight-Read or Name That Note on Master)' },
];

export const ACHIEVEMENT_MAP = Object.fromEntries(ACHIEVEMENT_STICKERS.map(a => [a.id, a]));
export const DOMAIN_MAP = Object.fromEntries(ACHIEVEMENT_DOMAINS.map(d => [d.id, d]));
export const TIER_MAP = Object.fromEntries(ACHIEVEMENT_TIERS.map(t => [t.id, t]));

// Helper: id builder.
export function achievementId(domain, tier) {
  return `ach_${domain}_${tier}`;
}

// Returns the achievement object for a (domain, tier), or null.
export function getAchievement(domain, tier) {
  return ACHIEVEMENT_MAP[achievementId(domain, tier)] || null;
}

// Convenience: list of all achievement IDs (for migration / queries).
export const ALL_ACHIEVEMENT_IDS = ACHIEVEMENT_STICKERS.map(a => a.id);

// Tier rank ordering helpers.
export function tierRank(tierId) {
  return TIER_MAP[tierId]?.rank ?? 0;
}

// Given the set of earned achievement IDs, returns how many achievements at
// each tier-or-better the kid owns, and a per-domain summary.
export function summarizeAchievements(earnedSet) {
  const perDomain = {};
  for (const d of ACHIEVEMENT_DOMAINS) {
    perDomain[d.id] = { highestTier: 0 }; // 0 = none, 1 = cadet, 2 = pro, 3 = master
  }
  for (const a of ACHIEVEMENT_STICKERS) {
    if (earnedSet.has(a.id)) {
      const t = tierRank(a.tier);
      if (t > perDomain[a.domain].highestTier) perDomain[a.domain].highestTier = t;
    }
  }
  const domainsAtTier = (minTier) =>
    Object.values(perDomain).filter(d => d.highestTier >= minTier).length;
  return {
    perDomain,
    domainsWithCadet:  domainsAtTier(1),
    domainsWithPro:    domainsAtTier(2),
    domainsWithMaster: domainsAtTier(3),
  };
}
