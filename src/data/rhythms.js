// Boom Garden — rhythm-reading data model.
//
// Note durations and Kodály-style counting syllables match exactly what the
// Jelly of the Month Club Music Academy teaches in Lesson 4:
//   Whole   = "Toe-ee--O-ee"  (4 beats, sustained)
//   Half    = "Toe-ee"         (2 beats, sustained)
//   Quarter = "Ta"             (1 beat)
//   Eighth  = "Ti"             (1/2 beat — say "Ti Ti" per beat)
//
// `beats` is the duration in quarter-note beats. Block width in the visual
// strip is proportional to this value.

export const NOTE_DEFS = {
  whole:   { beats: 4,   syllable: 'Toe-ee--O-ee', color: '#4285F4', label: 'Whole',
             img: 'assets/notes/rhythm/whole.png',     imgHi: 'assets/notes/rhythm/whole-hi.png' },
  half:    { beats: 2,   syllable: 'Toe-ee',       color: '#34A853', label: 'Half',
             img: 'assets/notes/rhythm/half.png',      imgHi: 'assets/notes/rhythm/half-hi.png' },
  quarter: { beats: 1,   syllable: 'Ta',           color: '#FFCC00', label: 'Quarter',
             img: 'assets/notes/rhythm/quarter.png',   imgHi: 'assets/notes/rhythm/quarter-hi.png' },
  eighth:  { beats: 0.5, syllable: 'Ti',           color: '#FF9500', label: 'Eighth',
             img: 'assets/notes/rhythm/eighth.png',    imgHi: 'assets/notes/rhythm/eighth-hi.png' },
  rest:    { beats: 1,   syllable: 'Shh',          color: '#B0B0B0', label: 'Rest',
             img: 'assets/ui/seahorse-rest.png',       imgHi: 'assets/ui/seahorse-rest.png' },
};

// Tempo for demo + read-along playback. 80 BPM @ quarter = 750 ms per beat —
// slow enough for 5-year-olds to track yet fast enough to feel musical.
export const BEAT_MS = 750;

// All patterns sit in 4/4 — every 4 beats is one measure. Used by the strips
// to draw a "barline" between measures so kids start to read music in
// chunks, not as one long ribbon.
export const BEATS_PER_MEASURE = 4;

// How many rounds a player plays before we show a Session Summary screen.
// 5 keeps the loop tight enough that little kids don't burn out, but long
// enough that streaks + multipliers actually pay off.
export const ROUNDS_PER_SESSION = 5;

// Per-difficulty tap-timing tolerance windows (± ms from the expected beat).
// Sweet-spot tuning after user feedback: the original (400 / 275 / 175) felt
// punishing, the +50 % bump (600 / 400 / 275) felt too forgiving — these
// midpoints (+25 %) sit in between. Tier ratios inside `handleSnareTap`
// (0.3 / 0.6 / 1.0 of tol) are unchanged so PERFECT/GREAT/GOOD still feel
// proportionally distinct.
export const TOLERANCE_MS = {
  cadet:  500,   // +25 % vs original
  pro:    340,
  master: 220,
};

// Difficulty tiers — each pattern is an array of note keys from NOTE_DEFS.
// Cadet stays in 4/4 with quarters + rests only.
// Pro adds half notes and beamed-eighth pairs.
// Master adds whole notes and longer 8-beat patterns.
export const PATTERNS = {
  cadet: [
    ['quarter', 'quarter', 'quarter', 'quarter'],
    ['quarter', 'quarter', 'rest',    'quarter'],
    ['quarter', 'rest',    'quarter', 'quarter'],
    ['rest',    'quarter', 'quarter', 'quarter'],
    ['quarter', 'quarter', 'quarter', 'rest'],
    ['quarter', 'rest',    'rest',    'quarter'],
  ],
  pro: [
    ['half',    'quarter', 'quarter'],
    ['quarter', 'half',    'quarter'],
    ['quarter', 'quarter', 'half'],
    ['quarter', 'eighth',  'eighth',  'quarter', 'quarter'],
    ['half',    'eighth',  'eighth',  'quarter'],
    ['eighth',  'eighth',  'quarter', 'eighth',  'eighth',  'quarter'],
  ],
  // Copy Cat hard = TWO measures (8 beats). Every pattern below is exactly
  // 8 beats so the strip always shows a clean two-bar phrase — never a
  // lop-sided 6-beat thing that lands mid-measure.
  master: [
    ['whole', 'half', 'half'],                                                  // 4+2+2 = 8
    ['half', 'half', 'quarter', 'quarter', 'half'],                             // 2+2+1+1+2 = 8
    ['quarter', 'quarter', 'half', 'quarter', 'quarter', 'half'],               // 1+1+2+1+1+2 = 8
    ['eighth', 'eighth', 'eighth', 'eighth', 'quarter', 'quarter', 'quarter', 'quarter', 'half'], // 2+1+1+1+1+2 = 8
    ['half', 'quarter', 'eighth', 'eighth', 'quarter', 'half', 'quarter'],      // 2+1+1+1+2+1 = 8
    ['quarter', 'quarter', 'half', 'whole'],                                    // 1+1+2+4 = 8
  ],
};

export const DIFFICULTIES = [
  { id: 'cadet',  label: 'Cadet',  description: 'Quarters & rests',        color: '#FFCC00' },
  { id: 'pro',    label: 'Pro',    description: 'Halves & eighth pairs',   color: '#FF9500' },
  { id: 'master', label: 'Master', description: 'Whole notes & long runs', color: '#FF3B30' },
];

// Tap Trail (scrolling reader) uses multi-measure patterns so kids practice
// reading + playing rhythm over a longer arc, not just one bar at a time.
export const TRAIL_PATTERNS = {
  cadet: [
    ['quarter','quarter','quarter','quarter', 'quarter','quarter','rest','quarter'],
    ['quarter','rest','quarter','quarter',     'quarter','quarter','quarter','rest'],
    ['quarter','quarter','quarter','rest',     'quarter','rest','quarter','quarter'],
    ['rest','quarter','quarter','quarter',     'quarter','quarter','rest','quarter'],
  ],
  pro: [
    ['quarter','eighth','eighth','quarter','quarter',  'half','quarter','quarter'],
    ['half','eighth','eighth','quarter',               'quarter','quarter','eighth','eighth','quarter'],
    ['quarter','quarter','half',                       'eighth','eighth','eighth','eighth','quarter','quarter'],
    ['eighth','eighth','quarter','quarter','quarter',  'quarter','eighth','eighth','half'],
  ],
  master: [
    ['whole',                                          'half','half',                                'quarter','quarter','half'],
    ['half','quarter','quarter',                       'eighth','eighth','eighth','eighth','half',   'quarter','quarter','half'],
    ['quarter','eighth','eighth','quarter','quarter',  'half','quarter','quarter',                   'whole'],
    ['eighth','eighth','eighth','eighth','quarter','quarter',  'half','half',                       'quarter','quarter','quarter','quarter'],
  ],
};

// Total beats in a pattern — helper.
export function patternBeats(pattern) {
  return pattern.reduce((s, k) => s + NOTE_DEFS[k].beats, 0);
}

// Returns the expected start time (ms from pattern start) for each note in
// the pattern, indexed by note position.
export function noteStartTimes(pattern, beatMs = BEAT_MS) {
  const starts = [];
  let acc = 0;
  for (const k of pattern) {
    starts.push(acc);
    acc += NOTE_DEFS[k].beats * beatMs;
  }
  return starts;
}

// For drawing barlines: returns a Set of note indices AFTER which a measure
// ends (i.e. cumulative beats reaches a multiple of BEATS_PER_MEASURE).
// The very last note isn't included — no trailing barline needed visually.
export function measureBoundaryAfterIndices(pattern) {
  const out = new Set();
  let acc = 0;
  for (let i = 0; i < pattern.length; i++) {
    acc += NOTE_DEFS[pattern[i]].beats;
    if (i < pattern.length - 1 && Math.abs(acc % BEATS_PER_MEASURE) < 1e-6) {
      out.add(i);
    }
  }
  return out;
}
