// Electric Guitar — real FluidR3 GM samples + visual guitar surface.
//
// **v6 highlights** (Feb 2026, on top of v5's real-sample engine):
//   • **Volume brought up**: 0.60 base for chord strings, 0.9 for
//     pentatonic notes. Still tucks under bells/xylo but is now
//     center-stage when it's active.
//   • **Power chords on Crunch**: full 6-note voicings get muddy
//     under distortion (rock guitarists never play full chords with
//     high gain — they play power chords: root + 5th + octave, 3
//     strings, no 3rd). We swap voicings automatically when the tone
//     toggle is on Crunch.
//   • **Real guitar visual**: 6 SVG strings running across the top
//     of the component with tuning pegs on the left, a black pickup
//     bar in the middle, and a bridge on the right. Each string has
//     its own thickness (low E chunky, high E thin) and its own
//     wobble animation triggered on strum. Power chords vibrate only
//     3 of the 6 strings — the rock-guitarist visual signature.
//   • **Fret-position chord pads**: chord pads redesigned to feel
//     like fret grips (dark headstock border, "position" number in
//     the corner, string count indicator).
//
// Full v5 engine unchanged: FluidR3 chromatic samples, pitch-shift,
// press/release gating (120 ms palm-mute fade), full keyboard
// bindings, tone/mode toggles.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

// ---------------------------------------------------------------
// Sample manifest — chromatic C3 → E5. Loaded on tab-open into
// bufferCache. Same as v5.
// ---------------------------------------------------------------
function noteFreq(midi) { return 440 * Math.pow(2, (midi - 69) / 12); }
const SEMITONE_TO_FILE = [
  { midi: 48, file: 'C3.mp3' },  { midi: 49, file: 'Db3.mp3' }, { midi: 50, file: 'D3.mp3' },
  { midi: 51, file: 'Eb3.mp3' }, { midi: 52, file: 'E3.mp3' },  { midi: 53, file: 'F3.mp3' },
  { midi: 54, file: 'Gb3.mp3' }, { midi: 55, file: 'G3.mp3' },  { midi: 56, file: 'Ab3.mp3' },
  { midi: 57, file: 'A3.mp3' },  { midi: 58, file: 'Bb3.mp3' }, { midi: 59, file: 'B3.mp3' },
  { midi: 60, file: 'C4.mp3' },  { midi: 61, file: 'Db4.mp3' }, { midi: 62, file: 'D4.mp3' },
  { midi: 63, file: 'Eb4.mp3' }, { midi: 64, file: 'E4.mp3' },  { midi: 65, file: 'F4.mp3' },
  { midi: 66, file: 'Gb4.mp3' }, { midi: 67, file: 'G4.mp3' },  { midi: 68, file: 'Ab4.mp3' },
  { midi: 69, file: 'A4.mp3' },  { midi: 70, file: 'Bb4.mp3' }, { midi: 71, file: 'B4.mp3' },
  { midi: 72, file: 'C5.mp3' },  { midi: 74, file: 'D5.mp3' },  { midi: 76, file: 'E5.mp3' },
].map(s => ({ ...s, freq: noteFreq(s.midi) }));

function nearestSample(target) {
  let best = SEMITONE_TO_FILE[0], bestDist = Infinity;
  for (const s of SEMITONE_TO_FILE) {
    const dist = Math.abs(Math.log2(target / s.freq));
    if (dist < bestDist) { bestDist = dist; best = s; }
  }
  return best;
}

// ---------------------------------------------------------------
// Chord voicings — TWO sets:
//   FULL_CHORDS  → clean-tone, all 6 strings (triad+octaves)
//   POWER_CHORDS → crunch-tone, 3 strings only (root+5th+octave)
// Each chord entry also lists which of the six visual strings light
// up during the strum (indices into the 6-string display, 0=low E).
// ---------------------------------------------------------------
const CHORDS = [
  {
    id: 'Am', label: 'Am', roman: 'i', color: '#E74C3C', key: '1',
    fullFreqs:  [110.00, 164.81, 220.00, 261.63, 329.63, 440.00], // A2 E3 A3 C4 E4 A4
    fullStrings: [0, 1, 2, 3, 4, 5],
    powerFreqs: [110.00, 164.81, 220.00],                          // A2 E3 A3
    powerStrings: [0, 1, 2],
  },
  {
    id: 'Dm', label: 'Dm', roman: 'iv', color: '#3498DB', key: '2',
    fullFreqs:  [146.83, 220.00, 293.66, 349.23, 440.00, 587.33], // D3 A3 D4 F4 A4 D5
    fullStrings: [0, 1, 2, 3, 4, 5],
    powerFreqs: [146.83, 220.00, 293.66],
    powerStrings: [1, 2, 3],
  },
  {
    id: 'Em', label: 'Em', roman: 'v', color: '#9B59B6', key: '3',
    fullFreqs:  [ 82.41, 123.47, 164.81, 196.00, 246.94, 329.63], // E2 B2 E3 G3 B3 E4
    fullStrings: [0, 1, 2, 3, 4, 5],
    powerFreqs: [ 82.41, 123.47, 164.81],
    powerStrings: [0, 1, 2],
  },
  {
    id: 'G',  label: 'G',  roman: 'VII', color: '#27AE60', key: '4',
    fullFreqs:  [ 98.00, 123.47, 146.83, 196.00, 246.94, 392.00], // G2 B2 D3 G3 B3 G4
    fullStrings: [0, 1, 2, 3, 4, 5],
    powerFreqs: [ 98.00, 146.83, 196.00],                          // G2 D3 G3
    powerStrings: [0, 1, 2],
  },
  {
    id: 'C',  label: 'C',  roman: 'III', color: '#F1C40F', key: '5',
    fullFreqs:  [130.81, 164.81, 196.00, 261.63, 329.63, 392.00], // C3 E3 G3 C4 E4 G4
    fullStrings: [0, 1, 2, 3, 4, 5],
    powerFreqs: [130.81, 196.00, 261.63],                          // C3 G3 C4
    powerStrings: [1, 2, 3],
  },
  {
    id: 'F',  label: 'F',  roman: 'VI',  color: '#E67E22', key: '6',
    fullFreqs:  [ 87.31, 130.81, 174.61, 220.00, 261.63, 349.23], // F2 C3 F3 A3 C4 F4
    fullStrings: [0, 1, 2, 3, 4, 5],
    powerFreqs: [ 87.31, 130.81, 174.61],
    powerStrings: [0, 1, 2],
  },
];

const NOTES = [
  { label: 'A', freq: 220.00, key: 'a', string: 2 },
  { label: 'C', freq: 261.63, key: 's', string: 3 },
  { label: 'D', freq: 293.66, key: 'd', string: 3 },
  { label: 'E', freq: 329.63, key: 'f', string: 4 },
  { label: 'G', freq: 392.00, key: 'g', string: 4 },
  { label: 'A', freq: 440.00, key: 'h', string: 5 },
  { label: 'C', freq: 523.25, key: 'j', string: 5 },
  { label: 'D', freq: 587.33, key: 'k', string: 5 },
  { label: 'E', freq: 659.25, key: 'l', string: 5 },
];

// ---------------------------------------------------------------
// Buffer cache (module-scope so it survives tab switches).
// ---------------------------------------------------------------
const bufferCache = new Map();

async function loadSample(ctx, tone, file) {
  const cacheKey = `${tone}:${file}`;
  if (bufferCache.has(cacheKey)) return bufferCache.get(cacheKey);
  const url = `assets/audio/guitar-${tone}/${file}`;
  try {
    const resp = await fetch(url);
    const buf = await resp.arrayBuffer();
    const audioBuffer = await ctx.decodeAudioData(buf);
    bufferCache.set(cacheKey, audioBuffer);
    return audioBuffer;
  } catch (err) {
    console.warn('[guitar] failed to load', tone, file, err);
    return null;
  }
}

// ---------------------------------------------------------------
// Voice — same as v5.
// ---------------------------------------------------------------
function makeVoice({ ctx, destination, tone, freq, startAt = 0, level = 1.0 }) {
  const s = nearestSample(freq);
  const buffer = bufferCache.get(`${tone}:${s.file}`);
  if (!buffer) return null;
  const t0 = ctx.currentTime + startAt;
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  src.playbackRate.value = freq / s.freq;

  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(level, t0 + 0.003);

  src.connect(g);
  g.connect(destination);
  src.start(t0);
  src.stop(t0 + 3.5);

  return {
    ctx, src, gain: g, released: false,
    release() {
      if (this.released) return;
      this.released = true;
      const t = this.ctx.currentTime;
      const R = 0.12;
      this.gain.gain.cancelScheduledValues(t);
      const cur = this.gain.gain.value;
      this.gain.gain.setValueAtTime(cur, t);
      this.gain.gain.exponentialRampToValueAtTime(0.0001, t + R);
      try { this.src.stop(t + R + 0.03); } catch (_) {}
    },
  };
}

// ---------------------------------------------------------------
// String visual — Telecaster-styled cartoon guitar. Cream body on
// the right, wooden fretboard in the middle, red headstock on the
// left, 6 strings from tuning pegs → converge at the nut → run
// parallel to the bridge. Skull knobs, black pickup, strap fragment
// off the top horn. Each string vibrates independently on strum.
//
// Style keys pulled from user's reference sketch: chunky 2.5-3px
// black outlines (all bodies + neck + pickguard), cream body
// (#F5EFDD), red headstock (#D62828), tan wooden neck (#B8956F),
// steel tuning pegs, skull knobs on the pickguard, black leather
// strap fragment off the upper horn.
// ---------------------------------------------------------------
const STRING_WIDTHS = [3.0, 2.6, 2.2, 1.8, 1.4, 1.1];
const STRING_COLORS = ['#B8860B', '#B8860B', '#C0C0C0', '#C0C0C0', '#C0C0C0', '#C0C0C0'];

function SkullKnob({ cx, cy }) {
  return (
    <g>
      {/* Skull head */}
      <circle cx={cx} cy={cy} r="6.5" fill="#C4C4C4" stroke="#000" strokeWidth="1.4" />
      {/* Eye sockets */}
      <ellipse cx={cx - 2.3} cy={cy - 1.2} rx="1.4" ry="1.6" fill="#000" />
      <ellipse cx={cx + 2.3} cy={cy - 1.2} rx="1.4" ry="1.6" fill="#000" />
      {/* Jaw slit */}
      <line x1={cx - 2.5} y1={cy + 2.5} x2={cx + 2.5} y2={cy + 2.5} stroke="#000" strokeWidth="1.1" strokeLinecap="round" />
      {/* Tooth notch */}
      <line x1={cx} y1={cy + 1.8} x2={cx} y2={cy + 3.5} stroke="#000" strokeWidth="0.7" />
    </g>
  );
}

function GuitarStrings({ vibratingStrings }) {
  // String Y positions — 6 strings evenly spaced, running parallel
  // across the fretboard and body. Low E on top (visually higher in
  // the SVG) because the guitar is drawn with the neck angled
  // slightly toward the viewer's right, which is how kids
  // instinctively read left→right = low→high.
  const stringYs = [82, 94, 106, 118, 130, 142];
  const nutX = 78;
  const bridgeX = 452;

  return (
    <svg
      viewBox="0 0 500 200"
      preserveAspectRatio="xMidYMid meet"
      className="w-full h-28 md:h-40"
      aria-hidden="true"
    >
      {/* Strap fragment coming off the upper-body horn — decorative,
          matches the black leather strap in the reference. */}
      <path
        d="M 255 62 C 248 30, 232 10, 218 20 L 236 62 Z"
        fill="#2A2A2A"
        stroke="#000"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <circle cx="252" cy="68" r="4" fill="#999" stroke="#000" strokeWidth="1.5" />

      {/* Tele body — cream, thick black outline, single upper
          cutaway to accommodate the neck join. Right lower bout is
          the classic Tele slab shape. */}
      <path
        d="
          M 258 64
          C 258 55, 262 50, 268 50
          L 290 46
          C 350 42, 460 44, 470 68
          C 484 96, 484 130, 468 160
          C 456 178, 340 182, 290 178
          L 258 172
          C 248 168, 240 158, 244 146
          L 258 138
          L 258 100
          L 240 88
          C 232 82, 232 72, 244 68
          Z
        "
        fill="#F5EFDD"
        stroke="#000"
        strokeWidth="3"
        strokeLinejoin="round"
      />

      {/* White pickguard covering the pickup + knobs area of the body */}
      <path
        d="
          M 320 68
          L 460 74
          C 468 92, 468 130, 458 158
          L 328 168
          C 310 160, 302 138, 308 108
          C 310 88, 314 76, 320 68
          Z
        "
        fill="#FDFDFC"
        stroke="#000"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />

      {/* Wooden fretboard — tan, chunky outline */}
      <rect x="78" y="76" width="180" height="72" fill="#B8956F" stroke="#000" strokeWidth="2.2" rx="1" />

      {/* Frets — cross-lines on the fretboard */}
      {[100, 122, 144, 166, 188, 210, 232].map((x, i) => (
        <line key={i} x1={x} y1="78" x2={x} y2="146" stroke="#5A4530" strokeWidth="1.6" strokeLinecap="round" />
      ))}
      {/* Inlay dots (fret markers) at frets 3, 5, 7, 9 */}
      {[133, 177].map((x, i) => (
        <circle key={i} cx={x} cy="112" r="2.2" fill="#F0E5C8" opacity="0.85" />
      ))}

      {/* Nut — bone/plastic ridge between headstock and fretboard */}
      <rect x="74" y="74" width="5" height="76" fill="#F0F0F0" stroke="#000" strokeWidth="1.2" />

      {/* Red Tele-style headstock (paddle shape) */}
      <path
        d="
          M 4 82
          C 4 74, 10 68, 20 66
          L 66 60
          C 74 58, 78 66, 78 74
          L 78 150
          C 78 158, 72 164, 62 164
          L 22 156
          C 10 152, 4 146, 4 138
          Z
        "
        fill="#D62828"
        stroke="#000"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />

      {/* 6 tuning pegs — 6-inline Tele style, staggered down the
          headstock. Each = a chrome cap on top and a small button. */}
      {stringYs.map((y, i) => {
        const pegX = 20 + (i % 2) * 10; // slight zigzag for authenticity
        return (
          <g key={i}>
            {/* String post (small cylinder poking through the headstock) */}
            <circle cx={pegX} cy={y} r="3.4" fill="#DDD" stroke="#222" strokeWidth="0.9" />
            {/* Tuning key (side wing) */}
            <rect x={pegX - 8} y={y - 1.8} width="7" height="3.6" fill="#C8C8C8" stroke="#000" strokeWidth="0.9" rx="1" />
            <circle cx={pegX - 8} cy={y} r="1.6" fill="#333" />
          </g>
        );
      })}

      {/* Pickup — chunky black humbucker-ish rectangle with 6 pole
          pieces (matches user's reference). */}
      <rect x="376" y="80" width="30" height="80" fill="#1A1A1A" stroke="#000" strokeWidth="1.8" rx="1.5" />
      <rect x="380" y="84" width="22" height="72" fill="#2E2E2E" rx="0.8" />
      {stringYs.map((y, i) => (
        <circle key={i} cx="391" cy={y} r="2.8" fill="#7A7A7A" stroke="#333" strokeWidth="0.5" />
      ))}

      {/* Bridge saddles on the far right */}
      <rect x="438" y="82" width="22" height="72" fill="#B0B0B0" stroke="#000" strokeWidth="1.6" rx="1" />
      {stringYs.map((y, i) => (
        <rect key={i} x="442" y={y - 2.5} width="14" height="5" fill="#666" stroke="#333" strokeWidth="0.5" rx="0.8" />
      ))}

      {/* 2 skull knobs on the pickguard (matches reference) */}
      <SkullKnob cx={430} cy={168} />
      <SkullKnob cx={452} cy={175} />

      {/* Output jack (small notch on the body's side) */}
      <rect x="472" y="118" width="10" height="10" fill="#666" stroke="#000" strokeWidth="1.4" rx="1.5" />

      {/* -------- 6 STRINGS --------
          Two segments per string:
          (a) STATIC — tuning peg to nut (short, angled to converge)
          (b) ANIMATED — nut to bridge (long, wobbles on strum) */}
      {stringYs.map((y, i) => {
        const pegX = 20 + (i % 2) * 10;
        const w = STRING_WIDTHS[i];
        const color = STRING_COLORS[i];
        const vibrating = vibratingStrings.has(i);
        const nutY = y;
        const bridgeY = y;
        const basePath = `M ${nutX} ${nutY} L ${bridgeX} ${bridgeY}`;
        return (
          <g key={i}>
            {/* Peg → nut convergence line (static, thin) */}
            <line
              x1={pegX + 3.4}
              y1={y}
              x2={nutX}
              y2={nutY}
              stroke={color}
              strokeWidth={Math.max(1, w * 0.7)}
              strokeLinecap="round"
              opacity="0.9"
            />
            {/* Nut → bridge (animated) */}
            <motion.path
              d={basePath}
              stroke={color}
              strokeWidth={w}
              fill="none"
              strokeLinecap="round"
              animate={vibrating ? {
                d: [
                  basePath,
                  `M ${nutX} ${nutY} Q ${(nutX + bridgeX) / 2} ${bridgeY - 6} ${bridgeX} ${bridgeY}`,
                  `M ${nutX} ${nutY} Q ${(nutX + bridgeX) / 2} ${bridgeY + 5} ${bridgeX} ${bridgeY}`,
                  `M ${nutX} ${nutY} Q ${(nutX + bridgeX) / 2} ${bridgeY - 3} ${bridgeX} ${bridgeY}`,
                  `M ${nutX} ${nutY} Q ${(nutX + bridgeX) / 2} ${bridgeY + 2} ${bridgeX} ${bridgeY}`,
                  basePath,
                ],
              } : { d: basePath }}
              transition={vibrating
                ? { duration: 0.9, ease: 'easeOut', times: [0, 0.08, 0.22, 0.42, 0.7, 1] }
                : { duration: 0.2 }}
            />
          </g>
        );
      })}
    </svg>
  );
}

// ---------------------------------------------------------------
// Component
// ---------------------------------------------------------------
export default function GuitarInstrument({ getAudioGraph, initAudioContext, onPlay }) {
  const [mode, setMode] = useState('chords');
  const [tone, setTone] = useState('clean');
  const [ready, setReady] = useState({ clean: false, crunch: false });

  const toneRef = useRef('clean'); toneRef.current = tone;
  const modeRef = useRef('chords'); modeRef.current = mode;

  const activeVoicesRef = useRef(new Map());
  const [heldIds, setHeldIds] = useState(new Set());

  // Which of the 6 visual strings are currently vibrating. Auto
  // clears after ~1s per string. Managed via a Map<stringIdx, timeoutId>.
  const [vibratingStrings, setVibratingStrings] = useState(new Set());
  const vibrateTimeoutsRef = useRef(new Map());
  const triggerStrings = useCallback((stringIndices, staggerMs = 22) => {
    stringIndices.forEach((si, i) => {
      setTimeout(() => {
        setVibratingStrings(prev => new Set(prev).add(si));
        const prevTimeout = vibrateTimeoutsRef.current.get(si);
        if (prevTimeout) clearTimeout(prevTimeout);
        const timeout = setTimeout(() => {
          setVibratingStrings(prev => {
            const n = new Set(prev);
            n.delete(si);
            return n;
          });
          vibrateTimeoutsRef.current.delete(si);
        }, 900);
        vibrateTimeoutsRef.current.set(si, timeout);
      }, i * staggerMs);
    });
  }, []);

  // Preload both tones on mount.
  useEffect(() => {
    if (initAudioContext) initAudioContext();
    const graph = getAudioGraph && getAudioGraph();
    if (!graph) return;
    let cancelled = false;
    const preload = async (t) => {
      await Promise.all(SEMITONE_TO_FILE.map(s => loadSample(graph.ctx, t, s.file)));
      if (!cancelled) setReady(prev => ({ ...prev, [t]: true }));
    };
    preload('clean').then(() => preload('crunch'));
    return () => { cancelled = true; };
  }, [getAudioGraph, initAudioContext]);

  // -----------------------------------------------------------
  // Voice lifecycle. Chords pick FULL vs POWER voicings based
  // on current tone: clean → full 6-note chord; crunch → 3-note
  // power chord (rock-guitarist convention).
  // -----------------------------------------------------------
  const startChord = useCallback((chord) => {
    if (initAudioContext) initAudioContext();
    const graph = getAudioGraph && getAudioGraph();
    if (!graph) return;
    const prev = activeVoicesRef.current.get(chord.id);
    if (prev) prev.forEach(v => v.release());

    const isCrunch = toneRef.current === 'crunch';
    const freqs = isCrunch ? chord.powerFreqs : chord.fullFreqs;
    const stringIndices = isCrunch ? chord.powerStrings : chord.fullStrings;
    const baseLevel = 0.60; // brought up from v5's 0.35

    const voices = freqs.map((freq, i) =>
      makeVoice({
        ctx: graph.ctx,
        destination: graph.masterNode,
        tone: toneRef.current,
        freq,
        startAt: i * 0.022,
        level: baseLevel - i * 0.02,
      })
    ).filter(Boolean);
    if (voices.length === 0) return;
    activeVoicesRef.current.set(chord.id, voices);
    setHeldIds(prev => new Set(prev).add(chord.id));
    triggerStrings(stringIndices, 22);
    if (onPlay) onPlay({ type: 'guitar-chord', chord: chord.id });
  }, [initAudioContext, getAudioGraph, onPlay, triggerStrings]);

  const stopChord = useCallback((chordId) => {
    const voices = activeVoicesRef.current.get(chordId);
    if (voices) {
      voices.forEach(v => v.release());
      activeVoicesRef.current.delete(chordId);
    }
    setHeldIds(prev => {
      if (!prev.has(chordId)) return prev;
      const n = new Set(prev); n.delete(chordId); return n;
    });
  }, []);

  const startNote = useCallback((note, idx) => {
    if (initAudioContext) initAudioContext();
    const graph = getAudioGraph && getAudioGraph();
    if (!graph) return;
    const id = `note-${idx}`;
    const prev = activeVoicesRef.current.get(id);
    if (prev) prev.forEach(v => v.release());
    const voice = makeVoice({
      ctx: graph.ctx,
      destination: graph.masterNode,
      tone: toneRef.current,
      freq: note.freq,
      level: 0.90, // brought up from v5's 0.55
    });
    if (!voice) return;
    activeVoicesRef.current.set(id, [voice]);
    setHeldIds(prev => new Set(prev).add(id));
    triggerStrings([note.string], 0);
    if (onPlay) onPlay({ type: 'guitar-note', note: note.label });
  }, [initAudioContext, getAudioGraph, onPlay, triggerStrings]);

  const stopNote = useCallback((idx) => {
    const id = `note-${idx}`;
    const voices = activeVoicesRef.current.get(id);
    if (voices) {
      voices.forEach(v => v.release());
      activeVoicesRef.current.delete(id);
    }
    setHeldIds(prev => {
      if (!prev.has(id)) return prev;
      const n = new Set(prev); n.delete(id); return n;
    });
  }, []);

  useEffect(() => () => {
    activeVoicesRef.current.forEach(voices => voices.forEach(v => v.release()));
    activeVoicesRef.current.clear();
    vibrateTimeoutsRef.current.forEach(id => clearTimeout(id));
    vibrateTimeoutsRef.current.clear();
  }, []);

  // Keyboard bindings.
  useEffect(() => {
    const chordByKey = Object.fromEntries(CHORDS.map(c => [c.key, c]));
    const noteByKey = Object.fromEntries(NOTES.map((n, i) => [n.key, { note: n, idx: i }]));
    const onKeyDown = (e) => {
      if (e.repeat) return;
      const k = e.key.toLowerCase();
      if (k === 'q') { setTone('clean'); return; }
      if (k === 'w') { setTone('crunch'); return; }
      if (k === 'z') { setMode('chords'); return; }
      if (k === 'x') { setMode('notes'); return; }
      if (modeRef.current === 'chords' && chordByKey[k]) startChord(chordByKey[k]);
      else if (modeRef.current === 'notes' && noteByKey[k]) startNote(noteByKey[k].note, noteByKey[k].idx);
    };
    const onKeyUp = (e) => {
      const k = e.key.toLowerCase();
      if (chordByKey[k]) stopChord(chordByKey[k].id);
      if (noteByKey[k]) stopNote(noteByKey[k].idx);
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [startChord, stopChord, startNote, stopNote]);

  const chordDown = useCallback((chord) => (e) => { e.preventDefault(); startChord(chord); }, [startChord]);
  const chordUp = useCallback((chordId) => () => stopChord(chordId), [stopChord]);
  const noteDown = useCallback((note, idx) => (e) => { e.preventDefault(); startNote(note, idx); }, [startNote]);
  const noteUp = useCallback((idx) => () => stopNote(idx), [stopNote]);

  const noteColors = useMemo(() => (
    ['#E74C3C', '#E67E22', '#F1C40F', '#27AE60', '#0FA3B1', '#3498DB', '#5E60CE', '#9B59B6', '#C71585']
  ), []);

  const loadingLabel = !ready.clean ? 'loading clean tone…' : !ready.crunch ? 'loading crunch tone…' : null;
  const isCrunch = tone === 'crunch';

  return (
    <div
      data-testid="guitar-instrument"
      className="w-full max-w-[900px] mx-auto rounded-2xl px-3 py-3 md:px-4 md:py-4 relative"
      style={{
        background: 'linear-gradient(180deg, #1B1B24 0%, #2A2A3A 100%)',
        border: '4px solid var(--jma-dark)',
        boxShadow: '0 6px 0 0 var(--jma-dark)',
      }}
    >
      {/* -------- Toggle row (mode + tone) -------- */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-1 bg-black/40 rounded-full p-1">
          <button
            type="button"
            data-testid="guitar-mode-chords"
            onClick={() => setMode('chords')}
            className={`px-3 py-1 rounded-full text-[10px] md:text-xs font-black uppercase tracking-wider transition-all touch-manipulation ${mode === 'chords' ? 'bg-[var(--jma-yellow)] text-[var(--jma-dark)]' : 'bg-transparent text-white/70'}`}
          >
            Chords <span className="opacity-60 font-normal ml-1">Z</span>
          </button>
          <button
            type="button"
            data-testid="guitar-mode-notes"
            onClick={() => setMode('notes')}
            className={`px-3 py-1 rounded-full text-[10px] md:text-xs font-black uppercase tracking-wider transition-all touch-manipulation ${mode === 'notes' ? 'bg-[var(--jma-yellow)] text-[var(--jma-dark)]' : 'bg-transparent text-white/70'}`}
          >
            Notes <span className="opacity-60 font-normal ml-1">X</span>
          </button>
        </div>
        <div className="flex items-center gap-1 bg-black/40 rounded-full p-1">
          <button
            type="button"
            data-testid="guitar-tone-clean"
            onClick={() => setTone('clean')}
            className={`px-3 py-1 rounded-full text-[10px] md:text-xs font-black uppercase tracking-wider transition-all touch-manipulation ${tone === 'clean' ? 'bg-white text-[var(--jma-dark)]' : 'bg-transparent text-white/70'}`}
          >
            Clean <span className="opacity-60 font-normal ml-1">Q</span>
          </button>
          <button
            type="button"
            data-testid="guitar-tone-crunch"
            onClick={() => setTone('crunch')}
            className={`px-3 py-1 rounded-full text-[10px] md:text-xs font-black uppercase tracking-wider transition-all touch-manipulation ${tone === 'crunch' ? 'bg-[#E74C3C] text-white' : 'bg-transparent text-white/70'}`}
          >
            Crunch <span className="opacity-60 font-normal ml-1">W</span>
          </button>
        </div>
      </div>

      {/* -------- The guitar itself — Telecaster body, red headstock,
          6 strings, wooden fretboard, black strap fragment, skull knobs.
          Matches the cartoon reference the user provided. -------- */}
      <div
        data-testid="guitar-strings"
        className="relative w-full mb-3 rounded-lg overflow-hidden"
        style={{
          background: 'linear-gradient(180deg, #F4E6C8 0%, #E5D1A3 100%)',
          border: '2px solid #000',
          boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.15)',
        }}
      >
        <GuitarStrings vibratingStrings={vibratingStrings} />
        {/* Crunch mode indicator — small "POWER" badge in the corner
            so kids see WHY chords sound different from full ones. */}
        <AnimatePresence>
          {isCrunch && mode === 'chords' && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="absolute top-1 right-2 px-2 py-0.5 rounded-full text-[9px] md:text-[10px] font-black tracking-widest"
              style={{ background: '#E74C3C', color: 'white', border: '1.5px solid #000' }}
            >
              POWER CHORDS
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* -------- Playing surface — chord pads or note pads -------- */}
      {mode === 'chords' ? (
        <div data-testid="guitar-chord-grid" className="grid grid-cols-3 md:grid-cols-6 gap-2 md:gap-3">
          {CHORDS.map((chord) => {
            const held = heldIds.has(chord.id);
            const stringCount = isCrunch ? chord.powerStrings.length : chord.fullStrings.length;
            return (
              <motion.button
                key={chord.id}
                type="button"
                data-testid={`guitar-chord-${chord.id}`}
                onPointerDown={chordDown(chord)}
                onPointerUp={chordUp(chord.id)}
                onPointerLeave={chordUp(chord.id)}
                onPointerCancel={chordUp(chord.id)}
                className="relative rounded-2xl flex flex-col items-center justify-center py-4 md:py-6 border-2 touch-manipulation select-none"
                style={{
                  background: `linear-gradient(180deg, ${chord.color} 0%, ${chord.color}CC 100%)`,
                  borderColor: '#000',
                  boxShadow: held ? '0 1px 0 0 #000' : '0 4px 0 0 #000',
                  color: 'white',
                }}
                animate={{ scale: held ? 0.96 : 1, y: held ? 3 : 0 }}
                transition={{ type: 'spring', stiffness: 400, damping: 22 }}
              >
                <span className="font-black text-2xl md:text-3xl leading-none">{chord.label}{isCrunch ? '5' : ''}</span>
                <span className="font-bold text-[9px] md:text-[10px] uppercase tracking-widest opacity-80 mt-1">
                  {chord.roman}
                </span>
                {/* Key hint top-right */}
                <span className="absolute top-1 right-2 text-white/60 font-bold text-[10px] md:text-xs" aria-hidden="true">
                  {chord.key}
                </span>
                {/* String-count dots bottom-center — one dot per
                    active string. Visualizes the difference between
                    full chords (6 dots) and power chords (3 dots). */}
                <span className="absolute bottom-1 flex gap-0.5" aria-hidden="true">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <span
                      key={i}
                      className="w-1 h-1 rounded-full"
                      style={{ background: i < stringCount ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.15)' }}
                    />
                  ))}
                </span>
              </motion.button>
            );
          })}
        </div>
      ) : (
        <div data-testid="guitar-note-strip" className="grid grid-cols-3 md:grid-cols-9 gap-1.5 md:gap-2">
          {NOTES.map((note, idx) => {
            const held = heldIds.has(`note-${idx}`);
            const color = noteColors[idx % noteColors.length];
            return (
              <motion.button
                key={idx}
                type="button"
                data-testid={`guitar-note-${idx}`}
                onPointerDown={noteDown(note, idx)}
                onPointerUp={noteUp(idx)}
                onPointerLeave={noteUp(idx)}
                onPointerCancel={noteUp(idx)}
                className="relative rounded-xl flex flex-col items-center justify-center py-3 md:py-5 border-2 touch-manipulation select-none"
                style={{
                  background: `linear-gradient(180deg, ${color} 0%, ${color}CC 100%)`,
                  borderColor: '#000',
                  boxShadow: held ? '0 1px 0 0 #000' : '0 3px 0 0 #000',
                  color: 'white',
                }}
                animate={{ scale: held ? 0.94 : 1, y: held ? 2 : 0 }}
                transition={{ type: 'spring', stiffness: 400, damping: 22 }}
              >
                <span className="font-black text-lg md:text-2xl leading-none">{note.label}</span>
                <span className="font-bold text-[9px] md:text-[10px] opacity-70 uppercase tracking-widest mt-0.5">
                  {note.key.toUpperCase()}
                </span>
              </motion.button>
            );
          })}
        </div>
      )}

      <div className="text-center text-white/60 text-[9px] md:text-[10px] font-bold uppercase tracking-widest mt-2">
        Key: A minor · {mode === 'chords' ? (isCrunch ? 'Power chords for rock crunch — 3 strings' : 'Full chords — all 6 strings') : 'Hold a note to sustain, release to cut'} · Q/W tone · Z/X mode
        {loadingLabel && <span className="ml-2 text-yellow-300">· {loadingLabel}</span>}
      </div>
    </div>
  );
}
