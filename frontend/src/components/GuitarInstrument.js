// Electric Guitar — GarageBand-style dual-mode instrument.
//
// Two modes (toggleable at the top of the instrument surface):
//   • SMART — 6 fat chord pads. Tap = strum down. Diatonic chords in
//     A minor (Am · Dm · Em · G · C · F) so kids can jam any pattern
//     and it always sounds musical. Every chord is a real 6-string
//     voicing with slight staggered timing between the strings so it
//     reads as a strum, not a stab.
//   • NOTES — a 9-note fretboard strip locked to the A minor
//     pentatonic scale (the "always sounds cool" scale). Kids can
//     solo over their own chord loops in Beat Lab or over jam tracks
//     without ever hitting a wrong note.
//
// Tone toggle (Clean / Distorted) sits alongside the mode toggle:
//   • Clean — bright plucked tone, gentle low-pass at 5 kHz. Reads as
//     jangly surf / pop.
//   • Distorted — WaveShaper hyperbolic curve into a 3 kHz low-pass.
//     Reads as crunchy rock lead. Not so hot it becomes noise.
//
// Sound engine: Web Audio Karplus-Strong plucked-string synthesis.
// Each note is a one-shot AudioBuffer generated in real time. Chord
// strums layer 6 KS voices with 25ms offsets between adjacent strings
// so the strum has a natural, sequenced attack. Output routes into
// the parent's master gain node (via getAudioGraph) so the guitar
// is captured by the MP3 recorder in Jam Session automatically —
// no separate wiring needed.
//
// This is the "we'll try option A" build (per user, Feb 2026): all
// audio is synthesized. Swapping in real sampled chord MP3s later
// is a one-line change per chord — replace pluckChord() with a
// buffer playback that loads from `assets/audio/guitar/{chord}.mp3`.

import { useCallback, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';

// ---------------------------------------------------------------
// Chord voicings — 6-string open-position voicings, A minor
// diatonic. Frequencies in Hz. Low strings first, high strings
// last so the default strum order (low → high) reads as a
// downstroke. Chord chosen to sit comfortably on the fretboard so
// swapping later for real samples is a straight 1:1 mapping.
// ---------------------------------------------------------------
const CHORDS = [
  { id: 'Am', label: 'Am', roman: 'i',   color: '#E74C3C', freqs: [110.00, 164.81, 220.00, 261.63, 329.63, 440.00] }, // A2 E3 A3 C4 E4 A4
  { id: 'Dm', label: 'Dm', roman: 'iv',  color: '#3498DB', freqs: [146.83, 220.00, 293.66, 349.23, 440.00, 587.33] }, // D3 A3 D4 F4 A4 D5
  { id: 'Em', label: 'Em', roman: 'v',   color: '#9B59B6', freqs: [ 82.41, 123.47, 164.81, 196.00, 246.94, 329.63] }, // E2 B2 E3 G3 B3 E4
  { id: 'G',  label: 'G',  roman: 'VII', color: '#27AE60', freqs: [ 98.00, 123.47, 146.83, 196.00, 246.94, 392.00] }, // G2 B2 D3 G3 B3 G4
  { id: 'C',  label: 'C',  roman: 'III', color: '#F1C40F', freqs: [130.81, 164.81, 196.00, 261.63, 329.63, 392.00] }, // C3 E3 G3 C4 E4 G4
  { id: 'F',  label: 'F',  roman: 'VI',  color: '#E67E22', freqs: [ 87.31, 130.81, 174.61, 220.00, 261.63, 349.23] }, // F2 C3 F3 A3 C4 F4
];

// A minor pentatonic scale — the "always sounds cool" scale over
// any of the CHORDS above. Two octaves + a top A so kids have real
// solo range without ever hitting a wrong note.
const NOTES = [
  { label: 'A',  freq: 220.00 },
  { label: 'C',  freq: 261.63 },
  { label: 'D',  freq: 293.66 },
  { label: 'E',  freq: 329.63 },
  { label: 'G',  freq: 392.00 },
  { label: 'A',  freq: 440.00 },
  { label: 'C',  freq: 523.25 },
  { label: 'D',  freq: 587.33 },
  { label: 'E',  freq: 659.25 },
];

// ---------------------------------------------------------------
// Audio helpers
// ---------------------------------------------------------------

// Build a WaveShaper curve for the crunchy tone. Hyperbolic soft
// clipper — sounds musical, doesn't get harsh at high input levels.
// Cached so we don't rebuild 44100 floats per note.
let cachedDistortionCurve = null;
function distortionCurve() {
  if (cachedDistortionCurve) return cachedDistortionCurve;
  const n = 4096;
  const curve = new Float32Array(n);
  const k = 400;
  const deg = Math.PI / 180;
  for (let i = 0; i < n; i++) {
    const x = (i * 2) / n - 1;
    curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
  }
  cachedDistortionCurve = curve;
  return curve;
}

// Karplus-Strong plucked-string synthesis. Fills a decay buffer with
// initial noise, then averages+dampens each period across two neighbor
// samples to simulate a vibrating string losing energy to bridge
// friction. Cheap, sounds authentic. `freq` sets pitch (Hz), `dur`
// is total buffer length in seconds.
function makePluckBuffer(ctx, freq, dur) {
  const sr = ctx.sampleRate;
  const N = Math.max(2, Math.floor(sr / Math.max(20, freq)));
  const totalSamples = Math.floor(sr * dur);
  const buffer = ctx.createBuffer(1, totalSamples, sr);
  const data = buffer.getChannelData(0);
  const damping = 0.996;
  // Initial noise burst (one period). Filtered slightly to soften
  // the attack (raw white noise reads as clicky).
  let prev = 0;
  for (let i = 0; i < N; i++) {
    const s = Math.random() * 2 - 1;
    prev = 0.5 * (s + prev);
    data[i] = prev;
  }
  // Karplus-Strong feedback — each sample = average of previous two
  // period-delayed samples, times damping.
  for (let i = N; i < totalSamples; i++) {
    data[i] = damping * 0.5 * (data[i - N] + data[i - N + 1]);
  }
  return buffer;
}

// Play a single guitar note into the given destination node.
// Returns the source node for optional external stop.
function pluckNote({ ctx, destination, freq, gain = 0.55, dur = 2.0, distorted = false, startAt = 0 }) {
  const buffer = makePluckBuffer(ctx, freq, dur);
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const g = ctx.createGain();
  g.gain.value = gain;
  // Amp envelope release — after ~90% of dur, fade to silence so
  // ringing notes don't stack forever when kids play fast.
  g.gain.setValueAtTime(gain, ctx.currentTime + startAt);
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startAt + dur);

  const brightness = ctx.createBiquadFilter();
  brightness.type = 'lowpass';
  brightness.frequency.value = distorted ? 3000 : 5200;
  brightness.Q.value = 0.7;

  src.connect(g);
  g.connect(brightness);

  if (distorted) {
    const shaper = ctx.createWaveShaper();
    shaper.curve = distortionCurve();
    shaper.oversample = '4x';
    const postGain = ctx.createGain();
    postGain.gain.value = 0.45; // trim so distortion doesn't clip master
    brightness.connect(shaper);
    shaper.connect(postGain);
    postGain.connect(destination);
  } else {
    brightness.connect(destination);
  }

  src.start(ctx.currentTime + startAt);
  src.stop(ctx.currentTime + startAt + dur + 0.05);
  return src;
}

// Strum a chord — pluck all 6 string frequencies with 25ms offsets
// between adjacent strings so it reads as a real down-strum, not
// a stab. Order of the freqs array is low→high (downstroke feel).
function strumChord({ ctx, destination, freqs, distorted = false }) {
  const perStringDelay = 0.025; // 25ms — matches human hand speed
  freqs.forEach((freq, i) => {
    pluckNote({
      ctx,
      destination,
      freq,
      gain: 0.45 - i * 0.02, // low strings slightly louder
      dur: 2.4,
      distorted,
      startAt: i * perStringDelay,
    });
  });
}

// ---------------------------------------------------------------
// Component
// ---------------------------------------------------------------
export default function GuitarInstrument({ getAudioGraph, initAudioContext, onPlay }) {
  const [mode, setMode] = useState('smart'); // 'smart' | 'notes'
  const [tone, setTone] = useState('clean'); // 'clean' | 'distorted'
  const distorted = tone === 'distorted';

  // Track "just tapped" for a brief flash on each chord/note pad —
  // pure visual feedback so kids see their tap register even before
  // the audio decodes on very cold-start Safari.
  const [flashId, setFlashId] = useState(null);
  const flashTimeoutRef = useRef(null);
  const flash = useCallback((id) => {
    setFlashId(id);
    if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
    flashTimeoutRef.current = setTimeout(() => setFlashId(null), 180);
  }, []);

  const handleChordTap = useCallback((chord) => {
    if (initAudioContext) initAudioContext();
    const graph = getAudioGraph && getAudioGraph();
    if (!graph) return;
    strumChord({ ctx: graph.ctx, destination: graph.masterNode, freqs: chord.freqs, distorted });
    flash(chord.id);
    if (onPlay) onPlay({ type: 'guitar-chord', chord: chord.id });
  }, [initAudioContext, getAudioGraph, distorted, flash, onPlay]);

  const handleNoteTap = useCallback((note, idx) => {
    if (initAudioContext) initAudioContext();
    const graph = getAudioGraph && getAudioGraph();
    if (!graph) return;
    pluckNote({ ctx: graph.ctx, destination: graph.masterNode, freq: note.freq, distorted, dur: 1.8 });
    flash(`note-${idx}`);
    if (onPlay) onPlay({ type: 'guitar-note', note: note.label });
  }, [initAudioContext, getAudioGraph, distorted, flash, onPlay]);

  // Cache the note color ramp so pentatonic pads read as a tonal
  // gradient (low = warm red → high = cool violet) — makes the
  // fretboard scan intuitively.
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
      {/* Top controls — mode + tone toggles. Compact so pads have
          maximum real estate. */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-1 bg-black/40 rounded-full p-1">
          <button
            type="button"
            data-testid="guitar-mode-smart"
            onClick={() => setMode('smart')}
            className={`px-3 py-1 rounded-full text-[10px] md:text-xs font-black uppercase tracking-wider transition-all touch-manipulation ${mode === 'smart' ? 'bg-[var(--jma-yellow)] text-[var(--jma-dark)]' : 'bg-transparent text-white/70'}`}
          >
            Chords
          </button>
          <button
            type="button"
            data-testid="guitar-mode-notes"
            onClick={() => setMode('notes')}
            className={`px-3 py-1 rounded-full text-[10px] md:text-xs font-black uppercase tracking-wider transition-all touch-manipulation ${mode === 'notes' ? 'bg-[var(--jma-yellow)] text-[var(--jma-dark)]' : 'bg-transparent text-white/70'}`}
          >
            Notes
          </button>
        </div>

        <div className="flex items-center gap-1 bg-black/40 rounded-full p-1">
          <button
            type="button"
            data-testid="guitar-tone-clean"
            onClick={() => setTone('clean')}
            className={`px-3 py-1 rounded-full text-[10px] md:text-xs font-black uppercase tracking-wider transition-all touch-manipulation ${tone === 'clean' ? 'bg-white text-[var(--jma-dark)]' : 'bg-transparent text-white/70'}`}
          >
            Clean
          </button>
          <button
            type="button"
            data-testid="guitar-tone-distorted"
            onClick={() => setTone('distorted')}
            className={`px-3 py-1 rounded-full text-[10px] md:text-xs font-black uppercase tracking-wider transition-all touch-manipulation ${tone === 'distorted' ? 'bg-[#E74C3C] text-white' : 'bg-transparent text-white/70'}`}
          >
            Crunch
          </button>
        </div>
      </div>

      {/* Playing surface */}
      {mode === 'smart' ? (
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
                onPointerDown={() => handleChordTap(chord)}
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
                onPointerDown={() => handleNoteTap(note, idx)}
                className="relative rounded-xl flex items-center justify-center py-3 md:py-5 border-2 touch-manipulation"
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
              </motion.button>
            );
          })}
        </div>
      )}

      {/* Tiny "A minor" scale key hint on the bottom — reassures kids
          + parents that the key is intentional and consistent. */}
      <div className="text-center text-white/60 text-[9px] md:text-[10px] font-bold uppercase tracking-widest mt-2">
        Key: A minor · {mode === 'smart' ? 'Tap a chord to strum' : 'Solo on the pentatonic scale'}
      </div>
    </div>
  );
}
