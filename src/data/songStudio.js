// Charlie's Song Studio — data definitions.
// 8-key high-octave piano (C5 → C6) plus mood configs.
// The melody lives an octave above the chord triads so kids' notes don't
// clash with the underlying I-V-vi-IV harmony.

// Solfège + color per pitch class (matches the JellyBells palette).
const PITCH = {
  C: { solfege: 'Do', color: '#FF3B30' },
  D: { solfege: 'Re', color: '#FF9500' },
  E: { solfege: 'Mi', color: '#FFCC00' },
  F: { solfege: 'Fa', color: '#4CD964' },
  G: { solfege: 'So', color: '#4285F4' },
  A: { solfege: 'La', color: '#AF52DE' },
  B: { solfege: 'Ti', color: '#FF2D92' },
};

// 8 white keys from C5 → C6 — what the kid taps on (high octave melody).
const PIANO_NOTES = ['C5','D5','E5','F5','G5','A5','B5','C6'];

// All notes we need to be able to play back (melody keys + chord-triad notes
// one octave lower). The audio hook preloads these so the soft chord notes
// played beneath the melody have zero latency.
export const ALL_PIANO_NOTE_IDS = [
  'C4','D4','E4','F4','G4','A4','B4',
  'C5','D5','E5','F5','G5','A5','B5','C6',
];

export const noteFile = (id) => `assets/audio/${id}.mp3`;

export const PIANO_KEYS = PIANO_NOTES.map((n) => {
  const pitch = n[0]; // 'C', 'D', etc.
  const octave = parseInt(n.slice(1), 10);
  return {
    id: n,
    file: noteFile(n),
    pitch,
    octave,
    solfege: PITCH[pitch].solfege,
    color: PITCH[pitch].color,
    // Octave indicator dot tint
    octaveBand: octave === 4 ? 'low' : octave === 5 ? 'mid' : 'high',
  };
});

// Three moods. Each defines:
//  - tonic: which pitch class is the "home"
//  - scaleNotes: which pitch classes are IN the mood's scale (so the kid sees them highlighted)
//  - drumLoop: backing track during playback (null = no drums)
//  - bpm: melody playback tempo
//  - charlie: Charlie outfit to display
//  - chordProgression: 4 triads, one per measure. Voicings are chosen so every
//    chord-note sits strictly BELOW the melody octave (i.e. ≤ B4) — we use root
//    position when possible, 1st inversion otherwise — so the kid's C5→C6
//    melody always sounds on top.
//  - color: theme color for the mood card
export const MOODS = {
  happy: {
    id: 'happy',
    name: 'Happy',
    emoji: '😊',
    description: 'Bright & bouncy (C major)',
    tonic: 'C',
    scaleNotes: ['C', 'D', 'E', 'F', 'G', 'A', 'B'],
    drumLoop: 'assets/audio/songs/jam_drums_pocket.mp3',
    bpm: 100,
    charlie: 'assets/characters/charlie-studio.png',
    color: '#FFCC00',
    accent: '#FF9500',
    // "Let It Be" / "Don't Stop Believin'" progression: I-V-vi-IV
    // Voicings stay ≤ B4 so they never collide with melody.
    chordProgression: [
      { label: 'C',  notes: ['C4', 'E4', 'G4'] },           // C root position
      { label: 'G',  notes: ['D4', 'G4', 'B4'] },           // G 1st inversion (drops D5→D4)
      { label: 'Am', notes: ['C4', 'E4', 'A4'] },           // Am 1st inversion (drops C5→C4, E5→E4)
      { label: 'F',  notes: ['C4', 'F4', 'A4'] },           // F 2nd inversion (drops C5→C4)
    ],
  },
  sad: {
    id: 'sad',
    name: 'Sad',
    emoji: '😢',
    description: 'Slow & thoughtful (A minor)',
    tonic: 'A',
    scaleNotes: ['A', 'B', 'C', 'D', 'E', 'F', 'G'],
    drumLoop: 'assets/audio/songs/jam_drums_sad.mp3',
    bpm: 70,
    charlie: 'assets/characters/charlie-studio.png',
    color: '#4285F4',
    accent: '#2A5DB0',
    // Reflective minor progression: i-VI-III-VII (Am-F-C-G)
    chordProgression: [
      { label: 'Am', notes: ['C4', 'E4', 'A4'] },           // Am 1st inversion
      { label: 'F',  notes: ['C4', 'F4', 'A4'] },           // F 2nd inversion
      { label: 'C',  notes: ['C4', 'E4', 'G4'] },           // C root
      { label: 'G',  notes: ['D4', 'G4', 'B4'] },           // G 1st inversion
    ],
  },
  mysterious: {
    id: 'mysterious',
    name: 'Mysterious',
    emoji: '👻',
    description: 'Spooky & wandering (D Dorian)',
    tonic: 'D',
    scaleNotes: ['D', 'E', 'F', 'G', 'A', 'B', 'C'],
    drumLoop: 'assets/audio/songs/jam_drums_mysterious.mp3',
    bpm: 85,
    charlie: 'assets/characters/charlie-studio.png',
    color: '#9B6DE0',
    accent: '#5E2D8C',
    // Modal Dorian groove: i-IV-i-bVII (Dm-G-Dm-C) — keeps the major IV signature
    chordProgression: [
      { label: 'Dm', notes: ['D4', 'F4', 'A4'] },           // Dm root
      { label: 'G',  notes: ['D4', 'G4', 'B4'] },           // G 1st inversion
      { label: 'Dm', notes: ['D4', 'F4', 'A4'] },           // Dm root
      { label: 'C',  notes: ['C4', 'E4', 'G4'] },           // C root
    ],
  },
};

export const TOTAL_SLOTS = 16; // 4 measures × 4 beats
export const SLOTS_PER_ROW = 4;
