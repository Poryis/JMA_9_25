// Electric Guitar — GarageBand-style dual-mode instrument.
//
// **Sound engine (v3): Yamaha MoxF6 "Hard Rock AS1&2"-style analog
// synth patch.** Kids requested a chunkier, more sustained tone that
// holds while a key is pressed and decays on release. Sampled real
// guitars couldn't do that without loop-editing every sample, so we
// switched to a synth voice modeled after the classic hard-rock lead
// patch:
//
//   • Osc 1: Sawtooth at fundamental (main body)
//   • Osc 2: Sawtooth at fundamental × 1.007 (detune — chorus width)
//   • Osc 3: Square at fundamental / 2 (sub-octave weight)
//   • Amp ADSR: A=6ms, D=90ms, S=0.65, R=260ms (snappy attack, held
//     sustain, musical release tail — matches a real guitarist
//     letting a note ring and muting on lift-off)
//   • LP filter with envelope: cutoff opens 1200 → 4500 Hz over 150ms
//     then settles at 3000 Hz sustain. Q=3.5 gives a subtle "wah"
//     opening on every attack — the sound of a Cry Baby pedal
//     locked half-open, which is the hard-rock signature.
//   • WaveShaper distortion (k=60, tame): sits AFTER the filter so
//     the filter env modulates distortion, not the other way around.
//   • Post-gain 0.13 so 6 voices held together (a chord) don't clip.
//
// Each note is a **persistent voice**. Voice.start() begins the amp
// + filter envelope. Voice.release() cancels scheduled ramps and
// gracefully fades to silence over 260ms. Multiple voices can be
// active simultaneously (polyphony) — the component tracks them by
// id in `activeVoicesRef` so the UP handler releases the right one.
//
// **Modes:**
//   • CHORDS — 6 pads. Tap = strum + hold: 6 voices with 22 ms
//     per-string startAt offsets. Release = release all 6 together.
//   • NOTES — 9 pentatonic pads (A minor pentatonic). Tap = single
//     voice. Release = release voice.
//
// **Tone toggle:**
//   • Clean — no distortion, LP cutoff 6 kHz sustain, wider filter env
//   • Crunch — WaveShaper on, LP cutoff 3 kHz sustain, tighter env
//
// **Output:** routed to the parent's masterNode via getAudioGraph so
// the MP3 recorder captures automatically.
//
// **Keyboard bindings** (only active while the Guitar tab is mounted,
// AND the FreePlayPage listener short-circuits on activeTab==='guitar'
// so bell/xylo/piano keys don't fire in parallel):
//   • Chords mode: 1 2 3 4 5 6 → Am Dm Em G C F
//   • Notes  mode: A S D F G H J K L → 9 pentatonic notes
//   • Q / W → Clean / Crunch
//   • Z / X → Chords / Notes mode

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';

// ---------------------------------------------------------------
// Chord voicings — A minor diatonic. Low → high (downstroke feel).
// ---------------------------------------------------------------
const CHORDS = [
  { id: 'Am', label: 'Am', roman: 'i',   color: '#E74C3C', key: '1', freqs: [110.00, 164.81, 220.00, 261.63, 329.63, 440.00] },
  { id: 'Dm', label: 'Dm', roman: 'iv',  color: '#3498DB', key: '2', freqs: [146.83, 220.00, 293.66, 349.23, 440.00, 587.33] },
  { id: 'Em', label: 'Em', roman: 'v',   color: '#9B59B6', key: '3', freqs: [ 82.41, 123.47, 164.81, 196.00, 246.94, 329.63] },
  { id: 'G',  label: 'G',  roman: 'VII', color: '#27AE60', key: '4', freqs: [ 98.00, 123.47, 146.83, 196.00, 246.94, 392.00] },
  { id: 'C',  label: 'C',  roman: 'III', color: '#F1C40F', key: '5', freqs: [130.81, 164.81, 196.00, 261.63, 329.63, 392.00] },
  { id: 'F',  label: 'F',  roman: 'VI',  color: '#E67E22', key: '6', freqs: [ 87.31, 130.81, 174.61, 220.00, 261.63, 349.23] },
];

// A minor pentatonic, mapped to a natural home-row.
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
// Cached distortion curve — hyperbolic soft-clip.
// ---------------------------------------------------------------
let cachedDistortionCurve = null;
function distortionCurve() {
  if (cachedDistortionCurve) return cachedDistortionCurve;
  const n = 4096;
  const curve = new Float32Array(n);
  const k = 60; // tame — sits well with sawtooth oscillators
  const deg = Math.PI / 180;
  for (let i = 0; i < n; i++) {
    const x = (i * 2) / n - 1;
    curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
  }
  cachedDistortionCurve = curve;
  return curve;
}

// ---------------------------------------------------------------
// Pick transient — the click of a pick striking a string. Very
// short (30ms) burst of band-passed white noise layered ON TOP of
// the sustained synth voice. Without this, sawtooth attacks read
// as "synth" — with it, the ear hears "plucked/picked" and the
// sustained body just carries the note. This is exactly how every
// commercial synth-guitar patch is built (Yamaha MoxF6, Roland
// SuperNATURAL, GarageBand's Modern Stack) — a percussive layer +
// a sustained layer.
//
// Band-pass 3.5 kHz, Q=2, with a very fast decay. Extra HP at
// 600 Hz clears the low mud. Level scales with note level so pick
// transients get quieter for stacked chord voices.
// ---------------------------------------------------------------
function firePickTransient({ ctx, destination, distorted, startAt = 0, level = 1.0 }) {
  const t0 = ctx.currentTime + startAt;
  const dur = 0.06; // 60 ms total, most energy in first 20 ms
  const sr = ctx.sampleRate;
  const N = Math.max(64, Math.floor(sr * dur));
  const buf = ctx.createBuffer(1, N, sr);
  const data = buf.getChannelData(0);
  // Pink-ish noise (crude filter over white noise) — brighter than
  // pink, less harsh than white. Sounds like real pick attack.
  let last = 0;
  for (let i = 0; i < N; i++) {
    const white = Math.random() * 2 - 1;
    last = 0.6 * last + 0.4 * white;
    data[i] = last;
  }
  const src = ctx.createBufferSource();
  src.buffer = buf;

  // Band-pass shaping — mid-high, around pick-attack sweet spot.
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 3500;
  bp.Q.value = 2.2;

  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 600;

  const g = ctx.createGain();
  // Very fast attack, aggressive decay — the "click".
  const peak = 0.5 * level * (distorted ? 0.7 : 1.0); // crunch already has extra energy
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(peak, t0 + 0.003);
  g.gain.exponentialRampToValueAtTime(0.0005, t0 + dur);

  src.connect(hp);
  hp.connect(bp);
  bp.connect(g);
  g.connect(destination);

  src.start(t0);
  src.stop(t0 + dur + 0.02);
}

// ---------------------------------------------------------------
// Voice — one held note. Detuned saw pair + sub-octave square +
// filter env + amp env. Distorted / clean swap the signal chain.
// A pick transient is fired in parallel by makeVoice() so the
// attack reads as picked, not synthy.
// ---------------------------------------------------------------
function makeVoice({ ctx, destination, freq, distorted, startAt = 0, level = 1.0 }) {
  const t0 = ctx.currentTime + startAt;

  // Fire the pick transient FIRST (layered on top of the synth
  // body). Level scales down slightly for stacked chord voices
  // so the strum doesn't sound like six pick attacks at once.
  firePickTransient({ ctx, destination, distorted, startAt, level });

  // Oscillators.
  const osc1 = ctx.createOscillator();
  osc1.type = 'sawtooth';
  osc1.frequency.setValueAtTime(freq, t0);

  const osc2 = ctx.createOscillator();
  osc2.type = 'sawtooth';
  osc2.frequency.setValueAtTime(freq * 1.007, t0); // ~12 cents up

  const osc3 = ctx.createOscillator();
  osc3.type = 'square';
  osc3.frequency.setValueAtTime(freq / 2, t0);

  const oscMix = ctx.createGain();
  oscMix.gain.value = 1.0;
  osc1.connect(oscMix);
  osc2.connect(oscMix);
  // Sub-octave square adds weight without muddying the fundamental.
  const subGain = ctx.createGain();
  subGain.gain.value = 0.4;
  osc3.connect(subGain);
  subGain.connect(oscMix);

  // Amp envelope — SHARPER attack than v3 so the synth body pops
  // in fast enough to line up with the pick transient. A=2 ms
  // linear (immediate), tiny decay to sustain, S=0.62.
  const amp = ctx.createGain();
  amp.gain.setValueAtTime(0, t0);
  amp.gain.linearRampToValueAtTime(level * 1.05, t0 + 0.002);       // A: 2 ms — near-instant
  amp.gain.linearRampToValueAtTime(level * 0.62, t0 + 0.002 + 0.05); // D: 50 ms → S: 0.62

  // LP filter with envelope — TIGHTER sweep than v3. Cutoff opens
  // 1600 → 6000 Hz over just 25 ms so the "wah" isn't audible on
  // its own; it just adds bite to the pick attack. Then settles to
  // sustain cutoff (higher for clean, tighter for crunch).
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.Q.value = 2.0;
  const sustainCutoff = distorted ? 2600 : 5500;
  lp.frequency.setValueAtTime(1600, t0);
  lp.frequency.exponentialRampToValueAtTime(6000, t0 + 0.025);
  lp.frequency.exponentialRampToValueAtTime(sustainCutoff, t0 + 0.18);

  oscMix.connect(amp);
  amp.connect(lp);

  // Distortion branch or clean-out.
  const outGain = ctx.createGain();
  outGain.gain.value = distorted ? 0.10 : 0.12;
  if (distorted) {
    const shaper = ctx.createWaveShaper();
    shaper.curve = distortionCurve();
    shaper.oversample = '4x';
    lp.connect(shaper);
    shaper.connect(outGain);
  } else {
    lp.connect(outGain);
  }
  outGain.connect(destination);

  osc1.start(t0);
  osc2.start(t0);
  osc3.start(t0);

  const voice = {
    ctx,
    amp,
    osc1, osc2, osc3,
    released: false,
    release() {
      if (this.released) return;
      this.released = true;
      const t = this.ctx.currentTime;
      const R = 0.22;
      this.amp.gain.cancelScheduledValues(t);
      const cur = this.amp.gain.value;
      this.amp.gain.setValueAtTime(cur, t);
      this.amp.gain.exponentialRampToValueAtTime(0.0001, t + R);
      this.osc1.stop(t + R + 0.04);
      this.osc2.stop(t + R + 0.04);
      this.osc3.stop(t + R + 0.04);
    },
  };
  return voice;
}

// ---------------------------------------------------------------
// Component
// ---------------------------------------------------------------
export default function GuitarInstrument({ getAudioGraph, initAudioContext, onPlay }) {
  const [mode, setMode] = useState('chords'); // 'chords' | 'notes'
  const [tone, setTone] = useState('clean');  // 'clean' | 'crunch'

  // Latest values for callbacks that live in refs (so we don't
  // recreate handlers on every toggle and lose active voices).
  const distortedRef = useRef(false);
  distortedRef.current = tone === 'crunch';
  const modeRef = useRef('chords');
  modeRef.current = mode;

  // Track active held voices by their trigger id (chord id or
  // `note-${idx}` for pentatonic pads). Each entry is an array of
  // Voice objects (a chord = 6 voices; a note = 1).
  const activeVoicesRef = useRef(new Map());

  // Flash id for visual "press" feedback — set on down, cleared on
  // up so the pad stays "pressed" while the note sustains.
  const [heldIds, setHeldIds] = useState(new Set());

  // -----------------------------------------------------------
  // Voice lifecycle
  // -----------------------------------------------------------
  const startChord = useCallback((chord) => {
    if (initAudioContext) initAudioContext();
    const graph = getAudioGraph && getAudioGraph();
    if (!graph) return;
    // If already held (rapid re-press), release previous voices first.
    const prev = activeVoicesRef.current.get(chord.id);
    if (prev) prev.forEach(v => v.release());

    const voices = chord.freqs.map((freq, i) =>
      makeVoice({
        ctx: graph.ctx,
        destination: graph.masterNode,
        freq,
        distorted: distortedRef.current,
        startAt: i * 0.022,
        level: 0.9 - i * 0.03,
      })
    );
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
      freq: note.freq,
      distorted: distortedRef.current,
      level: 1.0,
    });
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

  // -----------------------------------------------------------
  // Cleanup on unmount — release every voice.
  // -----------------------------------------------------------
  useEffect(() => () => {
    activeVoicesRef.current.forEach(voices => voices.forEach(v => v.release()));
    activeVoicesRef.current.clear();
  }, []);

  // -----------------------------------------------------------
  // Keyboard bindings. Only fires while this component is mounted.
  // The FreePlayPage keyboard listener short-circuits on
  // activeTab==='guitar' so bell/piano keys can't double-fire.
  // -----------------------------------------------------------
  useEffect(() => {
    const chordByKey = Object.fromEntries(CHORDS.map(c => [c.key, c]));
    const noteByKey = Object.fromEntries(NOTES.map((n, i) => [n.key, { note: n, idx: i }]));

    const onKeyDown = (e) => {
      if (e.repeat) return; // ignore OS auto-repeat while held
      const k = e.key.toLowerCase();
      // Toggles fire regardless of mode.
      if (k === 'q') { setTone('clean'); return; }
      if (k === 'w') { setTone('crunch'); return; }
      if (k === 'z') { setMode('chords'); return; }
      if (k === 'x') { setMode('notes'); return; }
      if (modeRef.current === 'chords' && chordByKey[k]) {
        startChord(chordByKey[k]);
      } else if (modeRef.current === 'notes' && noteByKey[k]) {
        startNote(noteByKey[k].note, noteByKey[k].idx);
      }
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

  // -----------------------------------------------------------
  // Pointer handlers for touch/mouse — press to start, release
  // (up / leave / cancel) to stop.
  // -----------------------------------------------------------
  const chordDown = useCallback((chord) => (e) => {
    e.preventDefault();
    startChord(chord);
  }, [startChord]);
  const chordUp = useCallback((chordId) => () => stopChord(chordId), [stopChord]);

  const noteDown = useCallback((note, idx) => (e) => {
    e.preventDefault();
    startNote(note, idx);
  }, [startNote]);
  const noteUp = useCallback((idx) => () => stopNote(idx), [stopNote]);

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
                animate={{
                  scale: held ? 0.96 : 1,
                  y: held ? 3 : 0,
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
                animate={{
                  scale: held ? 0.94 : 1,
                  y: held ? 2 : 0,
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
        Key: A minor · {mode === 'chords' ? 'Hold a chord (1–6) — sustains, releases on lift' : 'Hold a note (A S D F G H J K L)'} · Q/W tone · Z/X mode
      </div>
    </div>
  );
}
