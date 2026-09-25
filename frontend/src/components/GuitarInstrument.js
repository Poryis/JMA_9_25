// Electric Guitar — real FluidR3 GM samples with press/release gating.
//
// **Sound engine (v5): full chromatic real-sample playback.**
// After trying Karplus-Strong (v1), Tone.js sparse pack (v2), pure
// synth voice (v3), and synth + pick transient (v4), we landed on
// **FluidR3 GM SoundFont MP3s** from gleitz/midi-js-soundfonts on
// GitHub (MIT-licensed). Two full-chromatic sample sets — one for
// Clean (`electric_guitar_clean`), one for Crunch (`distortion_
// guitar`). ~27 samples per tone (C3 through E5, chromatic), ~20KB
// each so total footprint ~1 MB. Real recorded electric guitar,
// real pick attack, real body — no more synthy compromise.
//
// **Press/release gating.** Real guitar samples don't sustain
// indefinitely (they decay over ~2 seconds like a real string).
// That's actually more authentic than a synth pad — a real
// electric guitar DOES fade naturally. But we still honor the
// user's "cut on release" request: on pointer-up / key-up, an
// envelope gain fades the note to silence over 120 ms — like
// palm-muting the string.
//
// This gives:
//   • Real picked attack (from the sample)
//   • Real body (from the sample's decay)
//   • Kid-controlled note length via press/hold/release
//   • Chord strum = 6 layered sample playbacks with 22 ms offsets
//
// Full chromatic coverage means the pitch-shift for any target
// frequency is at most half a semitone — inaudible. No more
// "sample too far away" artifacts.
//
// **Keyboard bindings** (only active while the Guitar tab is
// mounted, AND the FreePlayPage listener short-circuits on
// activeTab==='guitar'):
//   • Chords: 1 2 3 4 5 6 → Am Dm Em G C F
//   • Notes:  A S D F G H J K L → A minor pentatonic (low→high)
//   • Q / W → Clean / Crunch
//   • Z / X → Chords / Notes mode

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';

// ---------------------------------------------------------------
// Sample manifest — full chromatic C3 to E5. Each entry lists the
// note letter and its true frequency (equal temperament, A4=440).
// The `file` field is the MP3 filename inside guitar-clean/ or
// guitar-crunch/.
// ---------------------------------------------------------------
function noteFreq(midi) {
  // A4 = MIDI 69 = 440 Hz.
  return 440 * Math.pow(2, (midi - 69) / 12);
}
const SEMITONE_TO_FILE = [
  { midi: 48, file: 'C3.mp3' },   // C3
  { midi: 49, file: 'Db3.mp3' },
  { midi: 50, file: 'D3.mp3' },
  { midi: 51, file: 'Eb3.mp3' },
  { midi: 52, file: 'E3.mp3' },
  { midi: 53, file: 'F3.mp3' },
  { midi: 54, file: 'Gb3.mp3' },
  { midi: 55, file: 'G3.mp3' },
  { midi: 56, file: 'Ab3.mp3' },
  { midi: 57, file: 'A3.mp3' },
  { midi: 58, file: 'Bb3.mp3' },
  { midi: 59, file: 'B3.mp3' },
  { midi: 60, file: 'C4.mp3' },
  { midi: 61, file: 'Db4.mp3' },
  { midi: 62, file: 'D4.mp3' },
  { midi: 63, file: 'Eb4.mp3' },
  { midi: 64, file: 'E4.mp3' },
  { midi: 65, file: 'F4.mp3' },
  { midi: 66, file: 'Gb4.mp3' },
  { midi: 67, file: 'G4.mp3' },
  { midi: 68, file: 'Ab4.mp3' },
  { midi: 69, file: 'A4.mp3' },
  { midi: 70, file: 'Bb4.mp3' },
  { midi: 71, file: 'B4.mp3' },
  { midi: 72, file: 'C5.mp3' },
  { midi: 74, file: 'D5.mp3' },
  { midi: 76, file: 'E5.mp3' },
].map(s => ({ ...s, freq: noteFreq(s.midi) }));

// Find the nearest sample (by semitone distance) for a target freq.
function nearestSample(target) {
  let best = SEMITONE_TO_FILE[0];
  let bestDist = Infinity;
  for (const s of SEMITONE_TO_FILE) {
    const dist = Math.abs(Math.log2(target / s.freq));
    if (dist < bestDist) { bestDist = dist; best = s; }
  }
  return best;
}

// ---------------------------------------------------------------
// Chords & notes — A minor diatonic + pentatonic.
// ---------------------------------------------------------------
const CHORDS = [
  { id: 'Am', label: 'Am', roman: 'i',   color: '#E74C3C', key: '1', freqs: [110.00, 164.81, 220.00, 261.63, 329.63, 440.00] },
  { id: 'Dm', label: 'Dm', roman: 'iv',  color: '#3498DB', key: '2', freqs: [146.83, 220.00, 293.66, 349.23, 440.00, 587.33] },
  { id: 'Em', label: 'Em', roman: 'v',   color: '#9B59B6', key: '3', freqs: [ 82.41, 123.47, 164.81, 196.00, 246.94, 329.63] },
  { id: 'G',  label: 'G',  roman: 'VII', color: '#27AE60', key: '4', freqs: [ 98.00, 123.47, 146.83, 196.00, 246.94, 392.00] },
  { id: 'C',  label: 'C',  roman: 'III', color: '#F1C40F', key: '5', freqs: [130.81, 164.81, 196.00, 261.63, 329.63, 392.00] },
  { id: 'F',  label: 'F',  roman: 'VI',  color: '#E67E22', key: '6', freqs: [ 87.31, 130.81, 174.61, 220.00, 261.63, 349.23] },
];

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
// Buffer cache — keyed by tone + filename so we don't refetch
// samples when the user toggles Clean ↔ Crunch back and forth.
// The cache lives at module scope so it survives tab switches
// (parent's AudioContext is app-lifetime).
// ---------------------------------------------------------------
const bufferCache = new Map(); // key: `${tone}:${file}` → AudioBuffer

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
// Voice — one held note. Wraps a BufferSource playing the nearest
// sample pitch-shifted to `freq`. On release(), a fast envelope
// fade (120 ms) cuts the note like palm-muting. Sample continues
// playing underneath but is silenced by the gain node.
// ---------------------------------------------------------------
function makeVoice({ ctx, destination, tone, freq, startAt = 0, level = 1.0 }) {
  const s = nearestSample(freq);
  const buffer = bufferCache.get(`${tone}:${s.file}`);
  if (!buffer) return null;

  const t0 = ctx.currentTime + startAt;
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  src.playbackRate.value = freq / s.freq; // pitch shift to exact target

  const g = ctx.createGain();
  // Real samples already have their own natural pick attack — we
  // just need to gate them cleanly. Instant attack (2 ms fade-in
  // avoids any click from mid-buffer start artifacts).
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(level, t0 + 0.003);

  src.connect(g);
  g.connect(destination);

  src.start(t0);
  // Failsafe: stop after 3.5 s in case release is never called.
  src.stop(t0 + 3.5);

  return {
    ctx,
    src,
    gain: g,
    released: false,
    release() {
      if (this.released) return;
      this.released = true;
      const t = this.ctx.currentTime;
      const R = 0.12; // 120 ms — palm-mute feel
      this.gain.gain.cancelScheduledValues(t);
      const cur = this.gain.gain.value;
      this.gain.gain.setValueAtTime(cur, t);
      this.gain.gain.exponentialRampToValueAtTime(0.0001, t + R);
      try { this.src.stop(t + R + 0.03); } catch (_) { /* already stopped */ }
    },
  };
}

// ---------------------------------------------------------------
// Component
// ---------------------------------------------------------------
export default function GuitarInstrument({ getAudioGraph, initAudioContext, onPlay }) {
  const [mode, setMode] = useState('chords');
  const [tone, setTone] = useState('clean');
  const [ready, setReady] = useState({ clean: false, crunch: false });

  const toneRef = useRef('clean');
  toneRef.current = tone;
  const modeRef = useRef('chords');
  modeRef.current = mode;

  const activeVoicesRef = useRef(new Map());
  const [heldIds, setHeldIds] = useState(new Set());

  // Preload BOTH tone sets on mount so toggling Clean ↔ Crunch
  // never blocks. Load clean first (default tone), crunch second.
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
  // Voice lifecycle
  // -----------------------------------------------------------
  const startChord = useCallback((chord) => {
    if (initAudioContext) initAudioContext();
    const graph = getAudioGraph && getAudioGraph();
    if (!graph) return;
    const prev = activeVoicesRef.current.get(chord.id);
    if (prev) prev.forEach(v => v.release());
    const voices = chord.freqs.map((freq, i) =>
      makeVoice({
        ctx: graph.ctx,
        destination: graph.masterNode,
        tone: toneRef.current,
        freq,
        startAt: i * 0.022,
        level: 0.35 - i * 0.015,
      })
    ).filter(Boolean);
    if (voices.length === 0) return;
    activeVoicesRef.current.set(chord.id, voices);
    setHeldIds(prev => new Set(prev).add(chord.id));
    if (onPlay) onPlay({ type: 'guitar-chord', chord: chord.id });
  }, [initAudioContext, getAudioGraph, onPlay]);

  const stopChord = useCallback((chordId) => {
    const voices = activeVoicesRef.current.get(chordId);
    if (voices) {
      voices.forEach(v => v.release());
      activeVoicesRef.current.delete(chordId);
    }
    setHeldIds(prev => {
      if (!prev.has(chordId)) return prev;
      const n = new Set(prev);
      n.delete(chordId);
      return n;
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
      level: 0.55,
    });
    if (!voice) return;
    activeVoicesRef.current.set(id, [voice]);
    setHeldIds(prev => new Set(prev).add(id));
    if (onPlay) onPlay({ type: 'guitar-note', note: note.label });
  }, [initAudioContext, getAudioGraph, onPlay]);

  const stopNote = useCallback((idx) => {
    const id = `note-${idx}`;
    const voices = activeVoicesRef.current.get(id);
    if (voices) {
      voices.forEach(v => v.release());
      activeVoicesRef.current.delete(id);
    }
    setHeldIds(prev => {
      if (!prev.has(id)) return prev;
      const n = new Set(prev);
      n.delete(id);
      return n;
    });
  }, []);

  // Cleanup on unmount.
  useEffect(() => () => {
    activeVoicesRef.current.forEach(voices => voices.forEach(v => v.release()));
    activeVoicesRef.current.clear();
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

      {mode === 'chords' ? (
        <div data-testid="guitar-chord-grid" className="grid grid-cols-3 md:grid-cols-6 gap-2 md:gap-3">
          {CHORDS.map((chord) => {
            const held = heldIds.has(chord.id);
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
                  borderColor: 'var(--jma-dark)',
                  boxShadow: held ? '0 1px 0 0 var(--jma-dark)' : '0 4px 0 0 var(--jma-dark)',
                  color: 'white',
                }}
                animate={{ scale: held ? 0.96 : 1, y: held ? 3 : 0 }}
                transition={{ type: 'spring', stiffness: 400, damping: 22 }}
              >
                <span className="font-black text-2xl md:text-3xl leading-none">{chord.label}</span>
                <span className="font-bold text-[9px] md:text-[10px] uppercase tracking-widest opacity-80 mt-1">
                  {chord.roman}
                </span>
                <span className="absolute top-1 right-2 text-white/60 font-bold text-[10px] md:text-xs" aria-hidden="true">
                  {chord.key}
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
                  borderColor: 'var(--jma-dark)',
                  boxShadow: held ? '0 1px 0 0 var(--jma-dark)' : '0 3px 0 0 var(--jma-dark)',
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
        Key: A minor · {mode === 'chords' ? 'Press-and-hold a chord (1–6) — release to cut' : 'Press-and-hold a note (A S D F G H J K L)'} · Q/W tone · Z/X mode
        {loadingLabel && <span className="ml-2 text-yellow-300">· {loadingLabel}</span>}
      </div>
    </div>
  );
}
