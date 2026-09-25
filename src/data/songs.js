// Song library for rhythm game - fun, engaging, NOT kiddy nursery rhymes
// Each song has notes, a display name, and a category
// Speed is controlled by difficulty setting, not note count

export const SONG_LIBRARY = [
  // JMA Originals - the user's own songs, pitch-shifted to C or G to fit the 8-bell scale.
  // `null` in notes = REST (no note spawns, creating rhythmic variance).
  // `beatsPerNote` is the spawn cadence at normal speed (1 = quarter note, 2 = half, 0.5 = eighth).
  {
    id: 'jma_play_one_skip_one',
    name: 'Play One, Skip One',
    category: 'JMA Originals',
    audioUrl: 'assets/audio/songs/play_one_skip_one.mp3',
    bpm: 76,
    beatsPerNote: 1, // quarter notes
    mode: 'C-major',
    originalKey: 'C major',
    shift: 0,
    // Chord prog: 2 bars Cmaj | 2 bars Dmin, repeating.
    // Melody = arpeggios of the current chord. 16 bars / 4 cycles.
    notes: [
      // Cycle 1 - sparse intro
      'C',null,'E',null, 'G',null,'E','C',   // Cmaj 2 bars
      'D',null,'F',null, 'A',null,'F','D',   // Dmin 2 bars
      // Cycle 2 - full arpeggios
      'C','E','G','High C', 'G','E','C','E',
      'D','F','A','D',     'F','A','D','F',
      // Cycle 3 - syncopated
      null,'C','E','G', null,'G','E','C',
      null,'D','F','A', null,'A','F','D',
      // Cycle 4 - ending
      'C','E','G',null, 'E','G','C',null,
      'D','F','A',null, 'D','F','A',null,
    ]
  },
  {
    id: 'jma_magic_in_music',
    name: 'The Magic Is in the Music',
    category: 'JMA Originals',
    audioUrl: 'assets/audio/songs/magic_in_music.mp3',
    bpm: 152,
    beatsPerNote: 1, // quarter notes
    mode: 'A-minor',
    originalKey: 'A minor',
    shift: 0,
    // Chord prog per user: La (1 bar) | Do (1 bar) | Re (2 bars), stay on each note.
    // 8 cycles × 4 bars each.
    notes: [
      // C1 simple
      'A','A','A','A',  'C','C','C','C',  'D','D','D','D',  'D','D','D','D',
      // C2 syncopated
      'A',null,'A','A', 'C','C',null,'C', 'D',null,'D','D', null,'D','D','D',
      // C3
      'A','A',null,'A', null,'C','C','C', 'D','D','D',null, 'D',null,'D','D',
      // C4 sparse
      null,'A',null,'A', 'C',null,null,'C', 'D',null,'D',null, null,'D',null,'D',
      // C5
      'A','A','A',null, 'C',null,'C','C', null,'D','D','D', 'D','D',null,'D',
      // C6
      'A',null,'A','A', 'C','C','C',null, 'D','D',null,'D', 'D',null,'D','D',
      // C7 climax
      'A','A','A','A',  'C','C','C','C',  'D','D','D','D',  'D','D','D','D',
      // C8 ending
      'A',null,'A',null, 'C',null,null,'C', 'D',null,'D',null, null,'D',null,'D',
    ]
  },
  {
    id: 'jma_brand_new_friend',
    name: 'Brand New Friend',
    category: 'JMA Originals',
    audioUrl: 'assets/audio/songs/brand_new_friend.mp3',
    bpm: 136,
    beatsPerNote: 1, // quarter notes - lots of rests create the rhythmic variance
    mode: 'C-mixolydian',
    originalKey: 'C major',
    // Chord prog I-V-vi-IV in G: G | D | Em | C (4-bar cycle × 7)
    // Heavy rhythmic variance - syncopation, rests, arpeggio-chord-tones-only melody.
    notes: [
      // C1 sparse intro (8 hits)
      'G',null,null,'G',  null,'D',null,'A',  'E',null,null,'E',  null,'C',null,'G',
      // C2 growing (12)
      'G',null,'B','G',   'D',null,'A','D',   'E',null,'G','E',   'C',null,'E','C',
      // C3 syncopated (11)
      'G','G',null,'G',   null,'D','D',null,  'E','E',null,'G',   null,'C','C','E',
      // C4 arpeggios (16)
      'G','B','D','G',    'D','A','D','A',    'E','G','B','E',    'C','E','G','E',
      // C5 hooky (10)
      'G',null,'B','D',   'A',null,'D',null,  'E',null,'G','B',   'E',null,'C',null,
      // C6 finale (16)
      'D','B','G','B',    'D','A','F','A',    'E','G','B','G',    'C','E','G','High C',
      // C7 outro (5)
      'G',null,null,'G',  null,'D',null,null, 'E',null,null,null, 'C',null,null,null,
    ]
  },
  {
    id: 'jma_faster_as_we_go',
    name: 'Faster As We Go',
    category: 'JMA Originals',
    audioUrl: 'assets/audio/songs/faster_as_we_go.mp3',
    bpm: 103,
    beatsPerNote: 1, // quarter notes
    mode: 'A-minor',
    originalKey: 'A minor',
    // Chord prog: G - Em - C - D (i-relative-IV-V folk feel in G minor key).
    // 5 cycles × 4 bars.
    notes: [
      // C1 mellow (8 hits)
      'G',null,'G',null,  'E',null,'E',null,  'C',null,'C',null,  'D',null,'D',null,
      // C2 rhythm in (12)
      'G',null,'B','G',   'E',null,'G','E',   'C',null,'E','C',   'D',null,'A','D',
      // C3 driving (12)
      'G','G','D',null,   'E','E','G',null,   'C','C','G',null,   'D','D','A',null,
      // C4 climactic (16)
      'G','B','D','G',    'E','G','B','E',    'C','E','G','E',    'D','A','D','A',
      // C5 outro (5)
      'G',null,null,'G',  null,'E',null,null, null,null,'C',null, 'D',null,null,null,
    ]
  },
  {
    id: 'jma_goody_bag',
    name: 'Goody Bag',
    category: 'JMA Originals',
    audioUrl: 'assets/audio/songs/goody_bag.mp3',
    bpm: 123,
    beatsPerNote: 1, // quarter notes
    mode: 'A-minor',
    originalKey: 'A minor',
    shift: 0,
    // Chord prog: G - C - G - D (boogie feel). 6 cycles × 4 bars.
    notes: [
      // C1 warm open (8)
      'G',null,'B',null,  'C',null,'E',null,  'G',null,'D',null,  'D',null,'A',null,
      // C2 arpeggios (16)
      'G','B','D','G',    'C','E','G','E',    'G','D','B','G',    'D','A','D','A',
      // C3 bouncy (10)
      'G',null,'G','B',   null,'C',null,'E',  'G',null,'D',null,  'D','D',null,'A',
      // C4 riff (16)
      'G','B','G','B',    'C','E','C','E',    'G','B','D','B',    'D','A','D','A',
      // C5 syncopated (10)
      'G',null,'B','G',   null,'E','C',null,  'G','B',null,'D',   null,'A',null,'D',
      // C6 outro (5)
      'G',null,'B',null,  null,'C',null,null, null,null,'G',null, 'D',null,null,null,
    ]
  },
  // Drums-only versions - same audio, kid plays the drum kit instead of bells
  {
    id: 'jma_play_one_drums',
    name: 'Play One, Skip One (Drums)',
    category: 'JMA Originals',
    audioUrl: 'assets/audio/songs/play_one_skip_one.mp3',
    bpm: 76,
    beatsPerNote: 1,
    instrumentMode: 'drums',
    // Standard rock pattern: kick/snare backbeat with a hihat ride
    // 64 slots. kick = beat 1 & 3, snare = beat 2 & 4, hihat = on every quarter
    notes: [
      // bar 1-2 (Cmaj) kick-snare with hihat
      'kick','hihat','snare','hihat',  'kick','hihat','snare','hihat',
      'kick','hihat','snare','hihat',  'kick','hihat','snare','hihat',
      // bar 3-4 (Dmin) sparser
      'kick',null,'snare','hihat',     'kick','hihat','snare',null,
      'kick','hihat','snare','hihat',  'kick','hihat','snare','hihat',
      // bar 5-6 build
      'kick','hihat','snare','hihat',  'kick','hihat','snare','crash',
      'kick','hihat','snare','hihat',  'kick','hihat','snare','crash',
      // bar 7-8 ending
      'kick',null,'snare',null,        'kick','hihat','snare','crash',
      'kick',null,'snare',null,        'kick',null,'snare','crash',
    ]
  },
  {
    id: 'jma_goody_bag_drums',
    name: 'Goody Bag (Drums)',
    category: 'JMA Originals',
    audioUrl: 'assets/audio/songs/goody_bag.mp3',
    bpm: 123,
    beatsPerNote: 1,
    instrumentMode: 'drums',
    // Bouncy boogie pattern with crash accents
    // 96 slots
    notes: [
      // C1 simple
      'kick','hihat','snare','hihat',  'kick','hihat','snare','hihat',
      'kick','hihat','snare','hihat',  'kick','hihat','snare','crash',
      // C2 arpeggios (rhythmic version)
      'kick','hihat','snare','hihat',  'kick','hihat','snare','hihat',
      'kick','hihat','snare','hihat',  'kick','hihat','snare','crash',
      // C3 bouncy
      'kick',null,'snare','hihat',     'kick','hihat','snare',null,
      'kick','hihat','snare','hihat',  'kick',null,'snare','crash',
      // C4 riff
      'kick','hihat','snare','hihat',  'kick','hihat','snare','hihat',
      'kick','hihat','snare','hihat',  'kick','hihat','snare','crash',
      // C5 syncopated
      'kick',null,'snare','hihat',     null,'hihat','snare',null,
      'kick','hihat',null,'snare',     null,'hihat',null,'snare',
      // C6 outro
      'kick',null,'snare',null,        null,'hihat',null,null,
      null,null,'snare',null,          'crash',null,null,null,
    ]
  },
  // Jam-along drum loops (no notes/melody — just a 1-min groove for kids to
  // play instruments over). Marked `jamOnly` so they never appear in Rhythm Arcade.
  {
    id: 'jam_drums_pocket',
    name: 'Pocket Groove',
    category: 'JMA Originals',
    audioUrl: 'assets/audio/songs/jam_drums_pocket.mp3',
    bpm: 100,
    jamOnly: true,
    originalKey: 'C major',
    notes: [],
  },
  {
    id: 'jam_drums_boogie',
    name: 'Boogie Stomp',
    category: 'JMA Originals',
    audioUrl: 'assets/audio/songs/jam_drums_boogie.mp3',
    bpm: 120,
    jamOnly: true,
    originalKey: 'C major',
    notes: [],
  },
  // Classic & Fun
  {
    id: 'ode_to_joy',
    name: 'Ode to Joy',
    category: 'Classic',
    notes: ['E','E','F','G','G','F','E','D','C','C','D','E','E','D','D',
            'E','E','F','G','G','F','E','D','C','C','D','E','D','C','C']
  },
  {
    id: 'when_saints',
    name: 'When the Saints',
    category: 'Classic',
    notes: ['C','E','F','G','C','E','F','G','C','E','F','G','E','C','E','D',
            'E','E','D','C','C','E','G','G','F','E','F','G','E','C','D','C']
  },
  {
    id: 'amazing_grace',
    name: 'Amazing Grace',
    category: 'Classic',
    // 3/4 time: | - - do | fa - la fa | la - so | fa - re | do - do |
    //           | fa - la fa | la - so | HiDo - - | - - la |
    //           | HiDo - la so | fa - re | re - fa | do - do |
    //           | fa - la fa | la - so | fa |
    notes: ['C',
            'F','A','F',
            'A','G',
            'F','D',
            'C','C',
            'F','A','F',
            'A','G',
            'High C',
            'A',
            'High C','A','G',
            'F','D',
            'D','F',
            'C','C',
            'F','A','F',
            'A','G',
            'F']
  },
  // Mini Jams — short bonus tunes
  {
    id: 'jelly_groove',
    name: 'Jelly Groove',
    category: 'Mini Jams',
    notes: ['C','E','G','E','C','D','F','A','F','D','E','G','B','G','E',
            'G','E','C','F','D','B','D','F','A','G','E','C']
  },
  {
    id: 'ocean_wave',
    name: 'Ocean Wave',
    category: 'Mini Jams',
    notes: ['C','D','E','F','G','A','G','F','E','D','C','D','E','F','G',
            'High C','G','F','E','D','C','E','G','E','C']
  },
  {
    id: 'bell_bounce',
    name: 'Bell Bounce',
    category: 'Mini Jams',
    notes: ['C','G','E','G','C','A','F','A','C','B','G','B','C',
            'G','E','C','F','A','F','D','G','B','G','E','High C']
  },
  {
    id: 'funky_fish',
    name: 'Funky Fish',
    category: 'Mini Jams',
    notes: ['G','G','A','G','F','E','G','G','A','G','F','E','C','D','E','F',
            'G','A','G','F','E','D','C','D','E','D','C']
  }
];

// Speed settings (ms per note) - lower = faster
export const SPEED_SETTINGS = {
  chill: { label: 'Chill', ms: 900, fallSpeed: 3500, color: '#4CD964' },
  normal: { label: 'Normal', ms: 600, fallSpeed: 2500, color: '#FFCC00' },
  turbo: { label: 'Turbo', ms: 350, fallSpeed: 1500, color: '#FF3B30' }
};

// Group songs by category
export function getSongsByCategory() {
  const categories = {};
  SONG_LIBRARY.forEach(song => {
    if (!categories[song.category]) {
      categories[song.category] = [];
    }
    categories[song.category].push(song);
  });
  return categories;
}
