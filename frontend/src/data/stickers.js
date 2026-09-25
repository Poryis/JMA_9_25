// Sticker definitions for the JMA Sticker Book.
//
// As of the achievement-system redesign there are TWO kinds of stickers:
//
//   1. Collection stickers (this file)
//      Characters, outfits, instruments, bells, songs, lessons, fun
//      milestones. Earned for pure flair — they don't gate rank.
//
//   2. Achievement stickers (data/achievements.js)
//      Six skill-domain badges × three tiers (Cadet/Pro/Master) = 18 badges.
//      ONLY these determine rank advancement.
//
// Storage is unchanged: every earned sticker (collection or achievement)
// lives in the same localStorage map keyed by sticker id.

import { ACHIEVEMENT_STICKERS, DOMAIN_MAP } from './achievements';

// Category ids for the Sticker Book layout.
export const STICKER_CATEGORIES = [
  { id: 'achievements', label: 'Achievement Badges', kind: 'achievement' },
  { id: 'characters',   label: 'Meet the Band',     kind: 'collection' },
  { id: 'outfits',      label: 'Outfit Collection', kind: 'collection' },
  { id: 'instruments',  label: 'Instruments',       kind: 'collection' },
  { id: 'bells',        label: 'Jellybells',        kind: 'collection' },
  { id: 'songs',        label: 'Song Champion',     kind: 'collection' },
  { id: 'lessons',      label: 'Lessons',           kind: 'collection' },
  { id: 'boogie',       label: 'Robot Boogie Band', kind: 'collection' },
  { id: 'milestones',   label: 'Fun Milestones',    kind: 'collection' },
];

// Collection stickers — pure flair, never gate ranks.
export const COLLECTION_STICKERS = [
  // ---- Characters (earned first time you interact with each on home page) ----
  { id: 'char_finn',      name: 'Finn',            category: 'characters', icon: 'assets/characters/finn-danger.png',     color: '#FF3B30', hint: 'Meet Finn on the home page' },
  { id: 'char_charlie',   name: 'Charlie',         category: 'characters', icon: 'assets/characters/charlie-polliwog.png', color: '#34A853', hint: 'Meet Charlie on the home page' },
  { id: 'char_chunk',     name: 'Chunk',           category: 'characters', icon: 'assets/characters/chunk.png',           color: '#9B59B6', hint: 'Meet Chunk on the home page' },
  { id: 'char_jazzy',     name: 'Jazzy',           category: 'characters', icon: 'assets/characters/jazzy.png',            color: '#FF9500', hint: 'Meet Jazzy on the home page' },
  { id: 'char_doctor',    name: 'Dr. Jellybone',   category: 'characters', icon: 'assets/characters/dr-jellybone.png',     color: '#4285F4', hint: 'Meet Dr. Jellybone on the home page' },
  { id: 'char_lou',       name: 'Lou',             category: 'characters', icon: 'assets/characters/lou.png',                    color: '#AF52DE', hint: 'Find Lou in the Fun Facts Clubhouse' },
  { id: 'char_stew',      name: 'Stew',            category: 'characters', icon: 'assets/characters/stew.png',                   color: '#16A085', hint: 'Find Stew in the Fun Facts Clubhouse' },

  // ---- Outfits (alternate looks, unlocked via gameplay milestones) ----
  // CHARLIE
  { id: 'fit_charlie_zoot',       name: 'Zoot Charlie',        category: 'outfits', icon: 'assets/characters/charlie-zoot.png',        color: '#C0392B', hint: 'Play the Xylophone in Jam Hall' },
  { id: 'fit_charlie_punk',       name: 'Punk Charlie',        category: 'outfits', icon: 'assets/characters/charlie-punk.png',        color: '#E91E63', hint: 'Hit a streak of 15 in Jelly Jukebox' },
  { id: 'fit_charlie_ragu',       name: 'Ragu Charlie',        category: 'outfits', icon: 'assets/characters/charlie-ragu.png',        color: '#E67E22', hint: 'Complete any song in Turbo speed' },
  { id: 'fit_charlie_surf',       name: 'Surf Charlie',        category: 'outfits', icon: 'assets/characters/charlie-surf.png',        color: '#3498DB', hint: 'Play 3 loops in the Beat Lab' },
  { id: 'fit_charlie_grad',       name: 'Grad Charlie',        category: 'outfits', icon: 'assets/characters/charlie-grad.png',        color: '#2C3E50', hint: 'Beat Stew Kazoo Says level 8' },
  { id: 'fit_charlie_rundmc',     name: 'DMC Charlie',         category: 'outfits', icon: 'assets/characters/charlie-rundmc.png',     color: '#F1C40F', hint: 'Make a Beat Lab loop with 3+ drum tracks' },
  { id: 'fit_charlie_disco',      name: 'Disco Charlie',       category: 'outfits', icon: 'assets/characters/charlie-disco.png',       color: '#FF6B9D', hint: 'Play a Beat Lab loop at 140+ BPM' },
  { id: 'fit_charlie_drum_major', name: 'Drum Major Charlie',  category: 'outfits', icon: 'assets/characters/charlie-drum-major.png',  color: '#4285F4', hint: 'Play the drum kit in Jam Hall' },
  { id: 'fit_charlie_steampunk',  name: 'Steampunk Charlie',   category: 'outfits', icon: 'assets/characters/charlie-steampunk.png',   color: '#8B4513', hint: 'Complete all 5 JMA Originals' },
  // CHUNK
  { id: 'fit_chunk_disco',        name: 'Disco Chunk',         category: 'outfits', icon: 'assets/characters/chunk-disco.png',         color: '#FF6B9D', hint: 'Play a Beat Lab loop for 30 seconds' },
  { id: 'fit_chunk_steampunk',    name: 'Steampunk Chunk',     category: 'outfits', icon: 'assets/characters/chunk-steampunk.png',     color: '#654321', hint: 'Record and play back 10 notes in Jam Hall' },
  // SHARKY
  { id: 'fit_sharky_hiphop',      name: 'Hip-Hop Sharky',      category: 'outfits', icon: 'assets/characters/sharky-hiphop.png',      color: '#F39C12', hint: 'Score 1000 points in Jelly Jukebox' },
  { id: 'fit_sharky_snorkel',     name: 'Snorkel Sharky',      category: 'outfits', icon: 'assets/characters/sharky-snorkel.png',     color: '#1ABC9C', hint: 'Play Ear Quest 10 times' },
  { id: 'fit_sharky_zoot',        name: 'Zoot Sharky',         category: 'outfits', icon: 'assets/characters/sharky-zoot.png',        color: '#27AE60', hint: 'Play the Piano in Jam Hall' },
  // JAZZY
  { id: 'fit_jazzy_disco',        name: 'Disco Jazzy',         category: 'outfits', icon: 'assets/characters/jazzy-disco.png',        color: '#FF1493', hint: 'Complete 10 songs total' },
  // DR. JELLYBONE
  { id: 'fit_doctor_detective',   name: 'Detective Dr. Jellybone', category: 'outfits', icon: 'assets/characters/dr-jellybone-detective.png', color: '#9B6DE0', hint: 'Solve a case in Detective Dr. Jellybone' },
  // LOU & STEW
  { id: 'fit_lou_disco',          name: 'Disco Lou',           category: 'outfits', icon: 'assets/characters/lou-disco.png',          color: '#D35400', hint: 'Complete Goody Bag in the Rhythm Game' },
  { id: 'fit_stew_swing',         name: 'Swing Stew',          category: 'outfits', icon: 'assets/characters/stew-swing.png',         color: '#16A085', hint: 'Complete Faster As We Go in the Rhythm Game' },

  // ---- Instruments (earned by playing each one in Jam Hall) ----
  { id: 'inst_bells',     name: 'Jelly Bells',     category: 'instruments', icon: 'assets/bells/C 1.png',       color: '#FF3B30', hint: 'Play the Jelly Bells in Jam Hall' },
  { id: 'inst_xylo',      name: 'Xylophone',       category: 'instruments', icon: 'assets/bells/G 1.png',       color: '#34A853', hint: 'Play the Xylophone in Jam Hall' },
  { id: 'inst_piano',     name: 'Piano',           category: 'instruments', icon: 'assets/bells/A 1.png',       color: '#4285F4', hint: 'Play the Piano in Jam Hall' },
  { id: 'inst_drums',     name: 'Drum Kit',        category: 'instruments', icon: 'assets/drums/Snare 1.png',  color: '#E74C3C', hint: 'Play the Drums in Jam Hall' },

  // ---- Jellybells (earned first time you play each bell) ----
  { id: 'bell_C',         name: 'Do',              category: 'bells', icon: 'assets/bells/C 2.png', color: '#FF3B30', hint: 'Play Do (key 1)' },
  { id: 'bell_D',         name: 'Re',              category: 'bells', icon: 'assets/bells/D 2.png', color: '#FF9500', hint: 'Play Re (key 2)' },
  { id: 'bell_E',         name: 'Mi',              category: 'bells', icon: 'assets/bells/E 2.png', color: '#FFCC00', hint: 'Play Mi (key 3)' },
  { id: 'bell_F',         name: 'Fa',              category: 'bells', icon: 'assets/bells/F 2.png', color: '#4CD964', hint: 'Play Fa (key 4)' },
  { id: 'bell_G',         name: 'So',              category: 'bells', icon: 'assets/bells/G 2.png', color: '#34A853', hint: 'Play So (key 5)' },
  { id: 'bell_A',         name: 'La',              category: 'bells', icon: 'assets/bells/A 2.png', color: '#4285F4', hint: 'Play La (key 6)' },
  { id: 'bell_B',         name: 'Ti',              category: 'bells', icon: 'assets/bells/B 2.png', color: '#AF52DE', hint: 'Play Ti (key 7)' },
  { id: 'bell_HC',        name: 'High Do',         category: 'bells', icon: 'assets/bells/C 2.png', color: '#FF2D55', hint: 'Play High Do (key 8)' },

  // ---- Songs (earned by completing each song in Jelly Jukebox) ----
  // ID convention: `song_${song.id}` — matches the runtime earn call
  // in RhythmGamePage.js line 340. Kept aligned with data/songs.js so
  // every completable song has a corresponding sticker (fixed during
  // the sticker-audit pass: the previous list referenced 12 songs that
  // don't exist in the library and MISSED all 16 songs that do —
  // every song completion was silently no-op-ing on a dead sticker id).
  { id: 'song_jma_play_one_skip_one', name: 'Play One, Skip One',       category: 'songs', icon: 'assets/bells/C 1.png', color: '#FFCC00', hint: 'Complete Play One, Skip One' },
  { id: 'song_jma_magic_in_music',    name: 'The Magic Is in the Music', category: 'songs', icon: 'assets/bells/E 1.png', color: '#FF9500', hint: 'Complete The Magic Is in the Music' },
  { id: 'song_jma_brand_new_friend',  name: 'Brand New Friend',         category: 'songs', icon: 'assets/bells/G 1.png', color: '#4CD964', hint: 'Complete Brand New Friend' },
  { id: 'song_jma_faster_as_we_go',   name: 'Faster As We Go',          category: 'songs', icon: 'assets/bells/A 1.png', color: '#34A853', hint: 'Complete Faster As We Go' },
  { id: 'song_jma_goody_bag',         name: 'Goody Bag',                category: 'songs', icon: 'assets/bells/B 1.png', color: '#AF52DE', hint: 'Complete Goody Bag' },
  { id: 'song_jma_play_one_drums',    name: 'Play One (Drums)',         category: 'songs', icon: 'assets/drums/Snare 1.png', color: '#E74C3C', hint: 'Complete Play One, Skip One (Drums)' },
  { id: 'song_jma_goody_bag_drums',   name: 'Goody Bag (Drums)',        category: 'songs', icon: 'assets/drums/Snare 1.png', color: '#C0392B', hint: 'Complete Goody Bag (Drums)' },
  { id: 'song_jam_drums_pocket',      name: 'Pocket Groove',            category: 'songs', icon: 'assets/drums/Snare 1.png', color: '#3498DB', hint: 'Complete Pocket Groove' },
  { id: 'song_jam_drums_boogie',      name: 'Boogie Stomp',             category: 'songs', icon: 'assets/drums/Snare 1.png', color: '#8E44AD', hint: 'Complete Boogie Stomp' },
  { id: 'song_ode_to_joy',            name: 'Ode to Joy',               category: 'songs', icon: 'assets/bells/E 1.png', color: '#FFCC00', hint: 'Complete Ode to Joy' },
  { id: 'song_when_saints',           name: 'When the Saints',          category: 'songs', icon: 'assets/bells/C 1.png', color: '#FF9500', hint: 'Complete When the Saints' },
  { id: 'song_amazing_grace',         name: 'Amazing Grace',            category: 'songs', icon: 'assets/bells/F 1.png', color: '#4CD964', hint: 'Complete Amazing Grace' },
  { id: 'song_jelly_groove',          name: 'Jelly Groove',             category: 'songs', icon: 'assets/bells/G 1.png', color: '#FF6B9D', hint: 'Complete Jelly Groove' },
  { id: 'song_ocean_wave',            name: 'Ocean Wave',               category: 'songs', icon: 'assets/bells/D 1.png', color: '#1ABC9C', hint: 'Complete Ocean Wave' },
  { id: 'song_bell_bounce',           name: 'Bell Bounce',              category: 'songs', icon: 'assets/bells/A 1.png', color: '#4285F4', hint: 'Complete Bell Bounce' },
  { id: 'song_funky_fish',            name: 'Funky Fish',               category: 'songs', icon: 'assets/bells/F 1.png', color: '#F39C12', hint: 'Complete Funky Fish' },

  // ---- Robot Boogie (earned by activating each Club Member at
  // least once in Robot Boogie, plus one milestone for having the
  // whole 8-piece band jamming at the same time). Awarded from
  // /app/frontend/src/pages/RobotBoogiePage.js via
  // earnSticker(`boogie_${charId}`) inside handleCharacterClick.
  { id: 'boogie_robot1',    name: 'Robot 1',       category: 'boogie', icon: 'assets/robot-boogie/robot1-neutral/robot1-neutral-01.png', color: '#4285F4', hint: 'Jam with Robot 1 in Robot Boogie' },
  { id: 'boogie_robot2',    name: 'Robot 2',       category: 'boogie', icon: 'assets/robot-boogie/robot2-neutral/robot2-neutral-01.png', color: '#8E44AD', hint: 'Jam with Robot 2 in Robot Boogie' },
  { id: 'boogie_chunk',     name: 'Chunk',         category: 'boogie', icon: 'assets/robot-boogie/chunk-neutral.png',                     color: '#E74C3C', hint: 'Jam with Chunk in Robot Boogie' },
  { id: 'boogie_finn',      name: 'Finn',          category: 'boogie', icon: 'assets/robot-boogie/finn-neutral.png',                      color: '#1ABC9C', hint: 'Jam with Finn in Robot Boogie' },
  { id: 'boogie_charlie',   name: 'Charlie',       category: 'boogie', icon: 'assets/robot-boogie/charlie-neutral/charlie-neutral-01.png', color: '#FF3B30', hint: 'Jam with Charlie in Robot Boogie' },
  { id: 'boogie_jazzy',     name: 'Jazzy',         category: 'boogie', icon: 'assets/robot-boogie/jazzy-neutral.png',                     color: '#FF3AA8', hint: 'Jam with Jazzy in Robot Boogie' },
  { id: 'boogie_jellybone', name: 'Dr. Jellybone', category: 'boogie', icon: 'assets/robot-boogie/jellybone-neutral.png',                 color: '#AF52DE', hint: 'Jam with Dr. Jellybone in Robot Boogie' },
  { id: 'boogie_lou',       name: 'Llama Lou',     category: 'boogie', icon: 'assets/robot-boogie/lou-neutral.png',                       color: '#34A853', hint: 'Jam with Llama Lou in Robot Boogie' },
  { id: 'boogie_full_band', name: 'Full Band!',    category: 'boogie', icon: 'assets/robot-boogie/time-machine-idle.png',                 color: '#FFCC00', hint: 'Have all 8 Club Members dancing at the same time' },

  // ---- Lessons (earned by completing each video lesson in Learn) ----
  { id: 'lesson_1', name: 'Lesson 1 Complete', category: 'lessons', icon: 'assets/characters/charlie-polliwog.png', color: '#FFCC00', hint: 'Finish Lesson 1' },
  { id: 'lesson_2', name: 'Lesson 2 Complete', category: 'lessons', icon: 'assets/characters/charlie.png',          color: '#FF9500', hint: 'Finish Lesson 2' },
  { id: 'lesson_3', name: 'Lesson 3 Complete', category: 'lessons', icon: 'assets/characters/charlie-rundmc.png',   color: '#FF3B30', hint: 'Finish Lesson 3' },
  { id: 'lesson_4', name: 'Lesson 4 Complete', category: 'lessons', icon: 'assets/characters/charlie-disco.png',    color: '#AF52DE', hint: 'Finish Lesson 4' },
  { id: 'lesson_5', name: 'Lesson 5 Complete', category: 'lessons', icon: 'assets/characters/charlie-surf.png',     color: '#4285F4', hint: 'Finish Lesson 5' },
  { id: 'lesson_6', name: 'Lesson 6 Complete', category: 'lessons', icon: 'assets/characters/charlie-zoot.png',     color: '#34A853', hint: 'Finish Lesson 6' },
  { id: 'lesson_7', name: 'Lesson 7 Complete', category: 'lessons', icon: 'assets/characters/charlie-steampunk.png',color: '#8B4513', hint: 'Finish Lesson 7' },
  { id: 'lesson_graduate', name: 'JMA Graduate!', category: 'lessons', icon: 'assets/characters/charlie-grad.png',  color: '#FFD700', hint: 'Finish every lesson' },

  // ---- Fun milestones (silly / playful collection — NOT skill-gating) ----
  { id: 'ach_first_note',    name: 'First Note!',        category: 'milestones', icon: 'assets/characters/finn-danger.png',     color: '#FFCC00', hint: 'Play your very first note' },
  { id: 'ach_one_kid_band',  name: 'One-Kid Band',       category: 'milestones', icon: 'assets/characters/chunk.png',           color: '#9B59B6', hint: 'Play all 4 instruments in Jam Hall' },
  { id: 'ach_streak_10',     name: 'Streak of 10!',      category: 'milestones', icon: 'assets/characters/jazzy.png',            color: '#FF9500', hint: 'Hit 10 notes in a row' },
  { id: 'ach_streak_25',     name: 'Streak of 25!',      category: 'milestones', icon: 'assets/characters/jazzy.png',            color: '#FF3B30', hint: 'Hit 25 notes in a row' },
  { id: 'ach_fact_finder',   name: 'Fact Finder',        category: 'milestones', icon: 'assets/characters/dr-jellybone.png',     color: '#AF52DE', hint: 'Learn 10 music facts on the home page' },
  { id: 'detective_perfect', name: 'Perfect Case File',  category: 'milestones', icon: 'assets/characters/dr-jellybone.png',     color: '#34A853', hint: 'Solve all 5 cases in a row' },
  // ---- Practice Buddy — daily return streaks ----
  { id: 'practice_buddy_3',  name: 'Practice Buddy',     category: 'milestones', icon: 'assets/characters/finn-danger.png',      color: '#FF9500', hint: 'Come back and play 3 days in a row' },
  { id: 'practice_buddy_7',  name: 'Weekly Wonder',      category: 'milestones', icon: 'assets/characters/jazzy.png',            color: '#FF3B30', hint: 'Come back and play 7 days in a row' },
  { id: 'practice_buddy_14', name: 'Two-Week Trooper',   category: 'milestones', icon: 'assets/characters/charlie-grad.png',     color: '#FFD700', hint: 'Come back and play 14 days in a row' },
  // ---- JMAtv collection ----
  { id: 'jmatv-first-watch',  name: 'TV Time!',          category: 'milestones', icon: 'assets/ui/jmatv-logo-v2.png',               color: '#FFCC00', hint: 'Watch your first JMAtv episode' },
  // ---- Name That Note (Finn's staff school) — perfect-round flair ----
  { id: 'ntn_staff_star',    name: 'Staff Star',         category: 'milestones', icon: 'assets/characters/finn-disco.png',       color: '#34A853', hint: 'Score a perfect 10/10 in Name That Note (Name It)' },
  { id: 'ntn_place_ace',     name: 'Note Navigator',     category: 'milestones', icon: 'assets/characters/finn-danger.png',      color: '#4285F4', hint: 'Score a perfect 10/10 in Name That Note (Place It)' },
];

// Build sticker arrays/maps. Achievements come from the achievements file
// (where they include extra `domain` and `tier` metadata) and are tagged
// with category 'achievements' here so the sticker book groups them.
//
// `icon` / `color` are pulled from the achievement's DOMAIN so that generic
// consumers (Newest-Sticker spotlight on the Home page, the "You earned a
// sticker!" toast, batch-earn preview icons) can render an image without
// needing to know the difference between a collection sticker and an
// achievement badge. The Sticker Book itself uses the dedicated
// `AchievementBadge` component for the fancy Cadet/Pro/Master framing.
const ACHIEVEMENT_STICKER_ENTRIES = ACHIEVEMENT_STICKERS.map(a => {
  const dom = DOMAIN_MAP[a.domain];
  return {
    id: a.id,
    name: a.name,
    category: 'achievements',
    domain: a.domain,
    tier: a.tier,
    hint: a.hint,
    icon: dom?.icon || 'assets/ui/logo.png',
    color: dom?.color || '#FFCC00',
  };
});

export const STICKERS = [...ACHIEVEMENT_STICKER_ENTRIES, ...COLLECTION_STICKERS];

// Quick lookup map.
export const STICKER_MAP = Object.fromEntries(STICKERS.map(s => [s.id, s]));

// Quick test: is this sticker id an achievement (i.e. rank-gating)?
export function isAchievement(id) {
  return STICKER_MAP[id]?.category === 'achievements';
}
