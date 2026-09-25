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
//   • **Guitar visual**: the user's own hand-drawn guitar, vector-
//     traced into SVG (guitarFrames.js) so it scales crisply at any
//     resolution. Rotated horizontal; strums flip between the two
//     hand-drawn strum frames.
//   • **Fret-position chord pads**: chord pads redesigned to feel
//     like fret grips (dark headstock border, "position" number in
//     the corner, string count indicator).
//
// Full v5 engine unchanged: FluidR3 chromatic samples, pitch-shift,
// press/release gating (120 ms palm-mute fade), full keyboard
// bindings, tone/mode toggles.

import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { GUITAR_FRAMES, GUITAR_ROTATE, GUITAR_VIEWBOX } from './guitarFrames';

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
// Guitar visual — vector-traced frames of the user's hand-drawn
// guitar (idle + two strum frames), rotated to sit horizontally.
// ---------------------------------------------------------------
function StrapPin({ x, y, angle }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${angle})`}>
      <rect x="0" y="-5" width="13" height="10" fill="#8A8A8A" stroke="#000" strokeWidth="3" strokeLinejoin="round" />
      <rect x="11" y="-11" width="8" height="22" rx="2.5" fill="#9A9A9A" stroke="#000" strokeWidth="3" strokeLinejoin="round" />
    </g>
  );
}

const GuitarFrame = memo(function GuitarFrame({ html, visible }) {
  return <g style={{ display: visible ? 'inline' : 'none' }} dangerouslySetInnerHTML={{ __html: html }} />;
});

function GuitarArt({ frame }) {
  return (
    <svg
      viewBox={GUITAR_VIEWBOX}
      preserveAspectRatio="xMidYMid meet"
      className="w-full h-36 md:h-60"
      aria-hidden="true"
    >
      <g transform={GUITAR_ROTATE}>
        {GUITAR_FRAMES.map((html, i) => (
          <GuitarFrame key={i} html={html} visible={i === frame} />
        ))}
        <StrapPin x={427} y={392} angle={-42} />
        <StrapPin x={157} y={814} angle={150} />
      </g>
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

  // Strum animation: flip between the two strum frames, then idle.
  const [frame, setFrame] = useState(0);
  const strumTimersRef = useRef([]);
  const triggerStrings = useCallback(() => {
    strumTimersRef.current.forEach(clearTimeout);
    strumTimersRef.current = [];
    const steps = [1, 2, 1, 2, 1, 2, 1, 0];
    steps.forEach((f, i) => {
      strumTimersRef.current.push(setTimeout(() => setFrame(f), i * 75));
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
    triggerStrings();
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
    triggerStrings();
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
    strumTimersRef.current.forEach(clearTimeout);
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
        <GuitarArt frame={frame} />
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
