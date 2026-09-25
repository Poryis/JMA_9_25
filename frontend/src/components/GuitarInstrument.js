// Electric Guitar — GarageBand-style dual-mode instrument.
//
// Two modes (toggleable at the top of the instrument surface):
//   • CHORDS — 6 fat chord pads. Tap = strum down. Diatonic chords in
//     A minor (Am · Dm · Em · G · C · F) so kids can jam any pattern
//     and it always sounds musical. Every chord is a real 6-string
//     voicing with slight staggered timing between the strings so it
//     reads as a strum, not a stab.
//   • NOTES — a 9-note fretboard strip locked to the A minor
//     pentatonic scale (the "always sounds cool" scale). Kids can
//     solo over their own chord loops without ever hitting a wrong
//     note.
//
// Tone toggle (Clean / Crunch):
//   • Clean — real electric-guitar samples routed to master, gentle
//     6 kHz LP to trim harshness. Reads as jangly Fender clean.
//   • Crunch — same samples through a hyperbolic WaveShaper (k=100,
//     tamed) + 3 kHz LP. Reads as bluesy rock lead. Not so hot it
//     becomes noise.
//
// Sound engine: **real sampled electric guitar** (Tone.js instruments
// pack, MIT-licensed, ~100 KB each). Sparse sample set (A2/3/4/5,
// C3/4/5, E2, Fs3/4/5) with playbackRate pitch-shifting to fill in
// the gaps for the chord/note frequencies. For each target freq we
// pick the nearest sampled note (in semitone distance) and set
// playbackRate = target/sample. Within ±3 semitones (~±20% rate
// change) the pitch shift is inaudible — this is the standard
// "multisample" trick every sampler plug-in uses.
//
// Output routes into the parent's master gain node (via
// getAudioGraph) so the guitar is captured by the MP3 recorder
// automatically. Guitar gain sits at 0.18 to match the loudness of
// the bells / xylo / piano (which peak around 0.5-0.8 at the note
// gain node but have shorter, less dense attacks — a strum layers
// 6 voices so we throttle harder).
//
// Keyboard bindings:
//   • Chords mode: 1 2 3 4 5 6 → Am Dm Em G C F
//   • Notes  mode: A S D F G H J K L → 9 pentatonic notes (low→high)
//   • Q / W → Clean / Crunch toggle
//   • Z / X → Chords / Notes mode toggle
//
// All bindings are active only while the Guitar tab is visible
// (component mounted).

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';

// ---------------------------------------------------------------
// Sample manifest — filenames map to their sampled frequencies.
// Sparse coverage, filled by pitch-shifting. All files live in
// /public/assets/audio/guitar/ and are ~100 KB MP3.
// ---------------------------------------------------------------
const SAMPLE_MAP = [
  { file: 'A2.mp3',  freq: 110.00 },
  { file: 'A3.mp3',  freq: 220.00 },
  { file: 'A4.mp3',  freq: 440.00 },
  { file: 'A5.mp3',  freq: 880.00 },
  { file: 'C3.mp3',  freq: 130.81 },
  { file: 'C4.mp3',  freq: 261.63 },
  { file: 'C5.mp3',  freq: 523.25 },
  { file: 'E2.mp3',  freq:  82.41 },
  { file: 'Fs3.mp3', freq: 185.00 },
  { file: 'Fs4.mp3', freq: 369.99 },
  { file: 'Fs5.mp3', freq: 739.99 },
];

// Pick the nearest sampled frequency to `target`, measured in
// semitones (log2 space) so a shift of one octave is treated the
// same up or down. Returns { file, freq }.
function nearestSample(target) {
  let best = SAMPLE_MAP[0];
  let bestDist = Infinity;
  for (const s of SAMPLE_MAP) {
    const dist = Math.abs(Math.log2(target / s.freq));
    if (dist < bestDist) { bestDist = dist; best = s; }
  }
  return best;
}

// ---------------------------------------------------------------
// Chord voicings — 6-string open-position voicings, A minor
// diatonic. Frequencies in Hz. Low strings first, high strings
// last so the default strum order (low → high) reads as a
// downstroke.
// ---------------------------------------------------------------
const CHORDS = [
  { id: 'Am', label: 'Am', roman: 'i',   color: '#E74C3C', key: '1', freqs: [110.00, 164.81, 220.00, 261.63, 329.63, 440.00] },
  { id: 'Dm', label: 'Dm', roman: 'iv',  color: '#3498DB', key: '2', freqs: [146.83, 220.00, 293.66, 349.23, 440.00, 587.33] },
  { id: 'Em', label: 'Em', roman: 'v',   color: '#9B59B6', key: '3', freqs: [ 82.41, 123.47, 164.81, 196.00, 246.94, 329.63] },
  { id: 'G',  label: 'G',  roman: 'VII', color: '#27AE60', key: '4', freqs: [ 98.00, 123.47, 146.83, 196.00, 246.94, 392.00] },
  { id: 'C',  label: 'C',  roman: 'III', color: '#F1C40F', key: '5', freqs: [130.81, 164.81, 196.00, 261.63, 329.63, 392.00] },
  { id: 'F',  label: 'F',  roman: 'VI',  color: '#E67E22', key: '6', freqs: [ 87.31, 130.81, 174.61, 220.00, 261.63, 349.23] },
];

// A minor pentatonic — mapped to a natural piano row.
const NOTES = [
  { label: 'A',  freq: 220.00, key: 'a' },
  { label: 'C',  freq: 261.63, key: 's' },
  { label: 'D',  freq: 293.66, key: 'd' },
  { label: 'E',  freq: 329.63, key: 'f' },
  { label: 'G',  freq: 392.00, key: 'g' },
  { label: 'A',  freq: 440.00, key: 'h' },
  { label: 'C',  freq: 523.25, key: 'j' },
  { label: 'D',  freq: 587.33, key: 'k' },
  { label: 'E',  freq: 659.25, key: 'l' },
];

// ---------------------------------------------------------------
// Distortion curve — hyperbolic soft clip. Cached (44100 floats
// is expensive to build per-note).
// ---------------------------------------------------------------
let cachedDistortionCurve = null;
function distortionCurve() {
  if (cachedDistortionCurve) return cachedDistortionCurve;
  const n = 4096;
  const curve = new Float32Array(n);
  const k = 100; // tamer than the KS version — samples are hotter to start
  const deg = Math.PI / 180;
  for (let i = 0; i < n; i++) {
    const x = (i * 2) / n - 1;
    curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
  }
  cachedDistortionCurve = curve;
  return curve;
}

// ---------------------------------------------------------------
// Sample buffer cache — decoded once per audio context, reused.
// ---------------------------------------------------------------
const bufferCache = new Map(); // key: `${ctxId}:${file}` → AudioBuffer

async function loadSample(ctx, file) {
  // Give the ctx a stable id so we can share the cache across
  // component remounts (parent's ctx lives for the app's lifetime).
  if (!ctx._jmaId) ctx._jmaId = String(Math.random());
  const cacheKey = `${ctx._jmaId}:${file}`;
  if (bufferCache.has(cacheKey)) return bufferCache.get(cacheKey);
  const url = `assets/audio/guitar/${file}`;
  try {
    const resp = await fetch(url);
    const buf = await resp.arrayBuffer();
    const audioBuffer = await ctx.decodeAudioData(buf);
    bufferCache.set(cacheKey, audioBuffer);
    return audioBuffer;
  } catch (err) {
    console.warn('[guitar] failed to load', file, err);
    return null;
  }
}

// ---------------------------------------------------------------
// Play one guitar note. Picks the nearest sample, pitch-shifts via
// playbackRate. Routes through gain → LP filter → (optional
// distortion) → destination.
// ---------------------------------------------------------------
function playSampledNote({ ctx, destination, freq, gain = 0.18, distorted = false, startAt = 0 }) {
  const s = nearestSample(freq);
  const buffer = bufferCache.get(`${ctx._jmaId}:${s.file}`);
  if (!buffer) return; // still loading — silent drop is better than a glitch
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  src.playbackRate.value = freq / s.freq;

  const g = ctx.createGain();
  // Fast attack, medium release. Samples already have their own
  // natural pluck envelope so we only shape the tail slightly.
  const t0 = ctx.currentTime + startAt;
  g.gain.setValueAtTime(gain, t0);
  g.gain.setValueAtTime(gain, t0 + 1.0);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + 2.2);

  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = distorted ? 3000 : 6000;
  lp.Q.value = 0.7;

  src.connect(g);
  g.connect(lp);

  if (distorted) {
    const shaper = ctx.createWaveShaper();
    shaper.curve = distortionCurve();
    shaper.oversample = '4x';
    const postGain = ctx.createGain();
    postGain.gain.value = 0.35; // distortion adds ~9dB of energy — trim it back
    lp.connect(shaper);
    shaper.connect(postGain);
    postGain.connect(destination);
  } else {
    lp.connect(destination);
  }

  src.start(t0);
  src.stop(t0 + 2.4);
}

// Strum a chord — layered notes, 22ms per-string offset.
function strumChordSampled({ ctx, destination, freqs, distorted = false }) {
  freqs.forEach((freq, i) => {
    playSampledNote({
      ctx,
      destination,
      freq,
      gain: 0.16 - i * 0.008, // low strings marginally louder
      distorted,
      startAt: i * 0.022,
    });
  });
}

// ---------------------------------------------------------------
// Component
// ---------------------------------------------------------------
export default function GuitarInstrument({ getAudioGraph, initAudioContext, onPlay }) {
  const [mode, setMode] = useState('chords'); // 'chords' | 'notes'
  const [tone, setTone] = useState('clean');  // 'clean' | 'crunch'
  const [samplesReady, setSamplesReady] = useState(false);
  const distortedRef = useRef(false);
  const modeRef = useRef('chords');
  distortedRef.current = tone === 'crunch';
  modeRef.current = mode;

  // Preload all 11 samples once when the component mounts. Uses the
  // parent's shared AudioContext (via getAudioGraph) so decoded
  // buffers persist across tab switches without re-fetching.
  useEffect(() => {
    if (initAudioContext) initAudioContext();
    const graph = getAudioGraph && getAudioGraph();
    if (!graph) return;
    let cancelled = false;
    (async () => {
      await Promise.all(SAMPLE_MAP.map(s => loadSample(graph.ctx, s.file)));
      if (!cancelled) setSamplesReady(true);
    })();
    return () => { cancelled = true; };
  }, [getAudioGraph, initAudioContext]);

  // Visual flash for tap feedback.
  const [flashId, setFlashId] = useState(null);
  const flashTimeoutRef = useRef(null);
  const flash = useCallback((id) => {
    setFlashId(id);
    if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
    flashTimeoutRef.current = setTimeout(() => setFlashId(null), 180);
  }, []);

  const strum = useCallback((chord) => {
    if (initAudioContext) initAudioContext();
    const graph = getAudioGraph && getAudioGraph();
    if (!graph) return;
    strumChordSampled({ ctx: graph.ctx, destination: graph.masterNode, freqs: chord.freqs, distorted: distortedRef.current });
    flash(chord.id);
    if (onPlay) onPlay({ type: 'guitar-chord', chord: chord.id });
  }, [initAudioContext, getAudioGraph, flash, onPlay]);

  const pluck = useCallback((note, idx) => {
    if (initAudioContext) initAudioContext();
    const graph = getAudioGraph && getAudioGraph();
    if (!graph) return;
    playSampledNote({ ctx: graph.ctx, destination: graph.masterNode, freq: note.freq, distorted: distortedRef.current, gain: 0.22 });
    flash(`note-${idx}`);
    if (onPlay) onPlay({ type: 'guitar-note', note: note.label });
  }, [initAudioContext, getAudioGraph, flash, onPlay]);

  // Keyboard bindings. 1-6 → chords. A/S/D/F/G/H/J/K/L → pentatonic
  // notes. Q/W → tone toggle. Z/X → mode toggle. Bindings active
  // only while this component is mounted (i.e. Guitar tab is on).
  useEffect(() => {
    const chordByKey = Object.fromEntries(CHORDS.map(c => [c.key, c]));
    const noteByKey = Object.fromEntries(NOTES.map((n, i) => [n.key, { note: n, idx: i }]));
    const pressed = new Set();

    const onKeyDown = (e) => {
      const k = e.key.toLowerCase();
      if (pressed.has(k)) return;
      pressed.add(k);
      // Mode + tone toggles first (work regardless of mode).
      if (k === 'q') { setTone('clean'); return; }
      if (k === 'w') { setTone('crunch'); return; }
      if (k === 'z') { setMode('chords'); return; }
      if (k === 'x') { setMode('notes'); return; }
      if (modeRef.current === 'chords' && chordByKey[k]) {
        strum(chordByKey[k]);
      } else if (modeRef.current === 'notes' && noteByKey[k]) {
        pluck(noteByKey[k].note, noteByKey[k].idx);
      }
    };
    const onKeyUp = (e) => { pressed.delete(e.key.toLowerCase()); };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [strum, pluck]);

  const noteColors = useMemo(() => (
    ['#E74C3C', '#E67E22', '#F1C40F', '#27AE60', '#0FA3B1', '#3498DB', '#5E60CE', '#9B59B6', '#C71585']
  ), []);

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
      {/* Top controls — mode + tone toggles. */}
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

      {/* Playing surface */}
      {mode === 'chords' ? (
        <div
          data-testid="guitar-chord-grid"
          className="grid grid-cols-3 md:grid-cols-6 gap-2 md:gap-3"
        >
          {CHORDS.map((chord) => {
            const active = flashId === chord.id;
            return (
              <motion.button
                key={chord.id}
                type="button"
                data-testid={`guitar-chord-${chord.id}`}
                onPointerDown={() => strum(chord)}
                className="relative rounded-2xl flex flex-col items-center justify-center py-4 md:py-6 border-2 touch-manipulation"
                style={{
                  background: `linear-gradient(180deg, ${chord.color} 0%, ${chord.color}CC 100%)`,
                  borderColor: 'var(--jma-dark)',
                  boxShadow: active ? '0 1px 0 0 var(--jma-dark)' : '0 4px 0 0 var(--jma-dark)',
                  color: 'white',
                }}
                animate={{
                  scale: active ? 0.96 : 1,
                  y: active ? 3 : 0,
                }}
                transition={{ type: 'spring', stiffness: 400, damping: 22 }}
              >
                <span className="font-black text-2xl md:text-3xl leading-none">{chord.label}</span>
                <span className="font-bold text-[9px] md:text-[10px] uppercase tracking-widest opacity-80 mt-1">
                  {chord.roman}
                </span>
                <span
                  className="absolute top-1 right-2 text-white/60 font-bold text-[10px] md:text-xs"
                  aria-hidden="true"
                >
                  {chord.key}
                </span>
              </motion.button>
            );
          })}
        </div>
      ) : (
        <div
          data-testid="guitar-note-strip"
          className="grid grid-cols-3 md:grid-cols-9 gap-1.5 md:gap-2"
        >
          {NOTES.map((note, idx) => {
            const active = flashId === `note-${idx}`;
            const color = noteColors[idx % noteColors.length];
            return (
              <motion.button
                key={idx}
                type="button"
                data-testid={`guitar-note-${idx}`}
                onPointerDown={() => pluck(note, idx)}
                className="relative rounded-xl flex flex-col items-center justify-center py-3 md:py-5 border-2 touch-manipulation"
                style={{
                  background: `linear-gradient(180deg, ${color} 0%, ${color}CC 100%)`,
                  borderColor: 'var(--jma-dark)',
                  boxShadow: active ? '0 1px 0 0 var(--jma-dark)' : '0 3px 0 0 var(--jma-dark)',
                  color: 'white',
                }}
                animate={{
                  scale: active ? 0.94 : 1,
                  y: active ? 2 : 0,
                }}
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
        Key: A minor · {mode === 'chords' ? 'Tap a chord or press 1–6' : 'Tap a note or use A S D F G H J K L'} · Q/W tone · Z/X mode
        {!samplesReady && <span className="ml-2 text-yellow-300">· loading samples…</span>}
      </div>
    </div>
  );
}
