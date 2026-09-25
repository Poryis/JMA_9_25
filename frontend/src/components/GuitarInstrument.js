// Electric Guitar — real FluidR3 GM samples + the user's hand-drawn guitar
// (vector-traced in guitarFrames.js). Pads select a chord / note position
// and strum once; swiping across the drawn strings strums for real with a
// pick riding under the finger. Defaults: Notes mode, Crunch tone.

import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { GUITAR_FRAMES, GUITAR_ROTATE, GUITAR_VIEWBOX } from './guitarFrames';

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

const CHORDS = [
  { id: 'Em', label: 'Em', color: '#9B59B6', key: '1',
    fullFreqs: [ 82.41, 123.47, 164.81, 196.00, 246.94, 329.63], powerFreqs: [ 82.41, 123.47, 164.81] },
  { id: 'F',  label: 'F',  color: '#E67E22', key: '2',
    fullFreqs: [ 87.31, 130.81, 174.61, 220.00, 261.63, 349.23], powerFreqs: [ 87.31, 130.81, 174.61] },
  { id: 'G',  label: 'G',  color: '#27AE60', key: '3',
    fullFreqs: [ 98.00, 123.47, 146.83, 196.00, 246.94, 392.00], powerFreqs: [ 98.00, 146.83, 196.00] },
  { id: 'Am', label: 'Am', color: '#E74C3C', key: '4',
    fullFreqs: [110.00, 164.81, 220.00, 261.63, 329.63, 440.00], powerFreqs: [110.00, 164.81, 220.00] },
  { id: 'C',  label: 'C',  color: '#F1C40F', key: '5',
    fullFreqs: [130.81, 164.81, 196.00, 261.63, 329.63, 392.00], powerFreqs: [130.81, 196.00, 261.63] },
  { id: 'Dm', label: 'Dm', color: '#3498DB', key: '6',
    fullFreqs: [146.83, 220.00, 293.66, 349.23, 440.00, 587.33], powerFreqs: [146.83, 220.00, 293.66] },
];

const NOTES = [
  { label: 'A', freq: 220.00, key: '1' },
  { label: 'C', freq: 261.63, key: '2' },
  { label: 'D', freq: 293.66, key: '3' },
  { label: 'E', freq: 329.63, key: '4' },
  { label: 'G', freq: 392.00, key: '5' },
  { label: 'A', freq: 440.00, key: '6' },
  { label: 'C', freq: 523.25, key: '7' },
  { label: 'D', freq: 587.33, key: '8' },
  { label: 'E', freq: 659.25, key: '9' },
  { label: 'G', freq: 783.99, key: '0' },
  { label: 'A', freq: 880.00, key: '-' },
];
const NOTE_COLORS = ['#E74C3C', '#E67E22', '#F1C40F', '#27AE60', '#0FA3B1', '#3498DB', '#5E60CE', '#9B59B6', '#C71585', '#E74C3C', '#E67E22'];
// ---------------------------------------------------------------
// Sample cache + voice
// ---------------------------------------------------------------
const bufferCache = new Map();

async function loadSample(ctx, tone, file) {
  const cacheKey = `${tone}:${file}`;
  if (bufferCache.has(cacheKey)) return bufferCache.get(cacheKey);
  try {
    const resp = await fetch(`assets/audio/guitar-${tone}/${file}`);
    const audioBuffer = await ctx.decodeAudioData(await resp.arrayBuffer());
    bufferCache.set(cacheKey, audioBuffer);
    return audioBuffer;
  } catch (err) {
    console.warn('[guitar] failed to load', tone, file, err);
    return null;
  }
}

function makeVoice({ ctx, destination, tone, freq, startAt = 0, level = 1.0, ring = 3.5 }) {
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
  if (ring < 3.5) {
    g.gain.setValueAtTime(level, t0 + 0.05);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + ring);
  }
  src.connect(g);
  g.connect(destination);
  src.start(t0);
  src.stop(t0 + ring + 0.05);
  return {
    released: false,
    release() {
      if (this.released) return;
      this.released = true;
      const t = ctx.currentTime;
      g.gain.cancelScheduledValues(t);
      g.gain.setValueAtTime(g.gain.value, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
      try { src.stop(t + 0.15); } catch (_) {}
    },
  };
}

// ---------------------------------------------------------------
// Guitar art — traced frames + strap pins + strum zone + pick.
// String geometry measured in viewBox coords on the rotated drawing.
// ---------------------------------------------------------------
// Playable strip along the strings (viewBox coords). Headstock side
// (right, x≈894 nut) = lowest pitch; bridge side (left, x≈163) = highest.
const NUT_X = 894;
const BRIDGE_X = 163;
const STRIP_Y1 = 392;
const STRIP_Y2 = 522;

const SKULL_KNOBS = [{ x: 164, y: 571 }, { x: 105, y: 585 }];

function zoneRect(zone, count) {
  const w = (NUT_X - BRIDGE_X) / count;
  return { x: NUT_X - (zone + 1) * w, width: w };
}

function zoneAt(x, y, count) {
  if (y < STRIP_Y1 || y > STRIP_Y2) return null;
  const t = Math.max(0, Math.min(0.999, (NUT_X - x) / (NUT_X - BRIDGE_X)));
  return Math.floor(t * count);
}

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

const PICK_PATH = 'M 0 -16 C 12 -16, 16 -8, 14 0 C 11 12, 4 20, 0 22 C -4 20, -11 12, -14 0 C -16 -8, -12 -16, 0 -16 Z';

function Pick({ x, y, label }) {
  return (
    <g transform={`translate(${x} ${y})`} pointerEvents="none">
      <g transform="rotate(-20)">
        <path d={PICK_PATH} fill="var(--jma-yellow)" stroke="#000" strokeWidth="2.5" strokeLinejoin="round" />
        <circle cx="0" cy="-4" r="3" fill="#000" opacity="0.25" />
      </g>
      {label && (
        <g transform="translate(0 -40)">
          <rect x="-22" y="-16" width="44" height="30" rx="8" fill="#fff" stroke="#000" strokeWidth="2.5" />
          <text x="0" y="6" textAnchor="middle" fontSize="20" fontWeight="900" fill="#1B1B24" fontFamily="inherit">{label}</text>
        </g>
      )}
    </g>
  );
}

function SkullKnob({ x, y, twistId, onTap }) {
  return (
    <g>
      {twistId > 0 && (
        <motion.circle
          key={twistId}
          cx={x} cy={y} r="24"
          fill="none" stroke="var(--jma-yellow)" strokeWidth="5" strokeDasharray="14 10" strokeLinecap="round"
          initial={{ rotate: 0, opacity: 1, scale: 0.8 }}
          animate={{ rotate: [0, -40, 30, 0], opacity: [1, 1, 1, 0], scale: [0.8, 1.1, 1, 1.05] }}
          transition={{ duration: 0.55, ease: 'easeOut' }}
          style={{ originX: `${x}px`, originY: `${y}px`, transformBox: 'view-box' }}
          pointerEvents="none"
        />
      )}
      <circle
        cx={x} cy={y} r="26" fill="transparent"
        style={{ cursor: 'pointer' }}
        data-testid={`guitar-skull-knob-${x}`}
        onPointerDown={(e) => { e.stopPropagation(); e.preventDefault(); onTap(); }}
      />
    </g>
  );
}

function GuitarArt({ frame, pick, glow, sweepId, twist, onKnobTap, svgRef, onPointerDown, onPointerMove, onPointerUp }) {
  const glowRect = glow ? zoneRect(glow.zone, glow.count) : null;
  return (
    <svg
      ref={svgRef}
      viewBox={GUITAR_VIEWBOX}
      preserveAspectRatio="xMidYMid meet"
      className="w-full h-44 md:h-64 select-none"
      style={{ touchAction: 'none' }}
      data-testid="guitar-art"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <g transform={GUITAR_ROTATE}>
        {GUITAR_FRAMES.map((html, i) => (
          <GuitarFrame key={i} html={html} visible={i === frame} />
        ))}
        <StrapPin x={427} y={392} angle={-42} />
        <StrapPin x={157} y={814} angle={150} />
      </g>
      {glowRect && (
        <rect
          data-testid="guitar-fret-glow"
          x={glowRect.x + 2} y={STRIP_Y1 + 18} width={glowRect.width - 4} height={STRIP_Y2 - STRIP_Y1 - 36}
          rx="10" fill="var(--jma-yellow)" opacity="0.45" stroke="#000" strokeWidth="2.5" pointerEvents="none"
        />
      )}
      {SKULL_KNOBS.map((k, i) => (
        <SkullKnob key={i} x={k.x} y={k.y} twistId={twist.knob === i ? twist.id : 0} onTap={() => onKnobTap(i)} />
      ))}
      {sweepId > 0 && (
        <motion.g
          key={sweepId}
          initial={{ y: STRIP_Y1 - 6, opacity: 1 }}
          animate={{ y: [STRIP_Y1 - 6, STRIP_Y2 + 6, STRIP_Y2 + 6], opacity: [1, 1, 0] }}
          transition={{ duration: 0.36, times: [0, 0.5, 1], ease: 'easeIn' }}
          pointerEvents="none"
        >
          <Pick x={300} y={0} />
        </motion.g>
      )}
      {pick && <Pick x={pick.x} y={pick.y} label={pick.label} />}
    </svg>
  );
}

// ---------------------------------------------------------------
// Component
// ---------------------------------------------------------------
export default function GuitarInstrument({ getAudioGraph, initAudioContext, onPlay }) {
  const [mode, setMode] = useState('notes');
  const [tone, setTone] = useState('crunch');
  const [ready, setReady] = useState({ clean: false, crunch: false });
  const [heldIds, setHeldIds] = useState(new Set());
  const [frame, setFrame] = useState(0);
  const [pick, setPick] = useState(null);
  const [sweepId, setSweepId] = useState(0);
  const [glow, setGlow] = useState(null);
  const [twist, setTwist] = useState({ knob: -1, id: 0 });

  const toneRef = useRef(tone); toneRef.current = tone;
  const modeRef = useRef(mode); modeRef.current = mode;

  const activeVoicesRef = useRef(new Map());
  const guitarVoicesRef = useRef([]);
  const guitarHeldRef = useRef(null);
  const strumTimersRef = useRef([]);
  const svgRef = useRef(null);
  const dragRef = useRef({ active: false, last: null });

  const triggerStrings = useCallback(() => {
    strumTimersRef.current.forEach(clearTimeout);
    strumTimersRef.current = [1, 2, 1, 2, 1, 2, 1, 0].map((f, i) => setTimeout(() => setFrame(f), i * 75));
  }, []);

  useEffect(() => {
    if (initAudioContext) initAudioContext();
    const graph = getAudioGraph && getAudioGraph();
    if (!graph) return;
    let cancelled = false;
    const preload = async (t) => {
      await Promise.all(SEMITONE_TO_FILE.map(s => loadSample(graph.ctx, t, s.file)));
      if (!cancelled) setReady(prev => ({ ...prev, [t]: true }));
    };
    preload('crunch').then(() => preload('clean'));
    return () => { cancelled = true; };
  }, [getAudioGraph, initAudioContext]);

  const graphOrNull = useCallback(() => {
    if (initAudioContext) initAudioContext();
    return getAudioGraph ? getAudioGraph() : null;
  }, [initAudioContext, getAudioGraph]);

  // ---- pads ----
  const startChord = useCallback((chord) => {
    const graph = graphOrNull();
    if (!graph) return;
    const prev = activeVoicesRef.current.get(chord.id);
    if (prev) prev.forEach(v => v.release());
    const isCrunch = toneRef.current === 'crunch';
    const freqs = isCrunch ? chord.powerFreqs : chord.fullFreqs;
    const voices = freqs.map((freq, i) => makeVoice({
      ctx: graph.ctx, destination: graph.masterNode, tone: toneRef.current,
      freq, startAt: i * 0.022, level: 0.60 - i * 0.02,
    })).filter(Boolean);
    if (voices.length === 0) return;
    activeVoicesRef.current.set(chord.id, voices);
    setHeldIds(prev => new Set(prev).add(chord.id));
    setSweepId(n => n + 1);
    triggerStrings();
    if (onPlay) onPlay({ type: 'guitar-chord', chord: chord.id });
  }, [graphOrNull, onPlay, triggerStrings]);

  const stopChord = useCallback((chordId) => {
    const voices = activeVoicesRef.current.get(chordId);
    if (voices) { voices.forEach(v => v.release()); activeVoicesRef.current.delete(chordId); }
    setHeldIds(prev => { if (!prev.has(chordId)) return prev; const n = new Set(prev); n.delete(chordId); return n; });
  }, []);

  const startNote = useCallback((note, idx) => {
    const graph = graphOrNull();
    if (!graph) return;
    const id = `note-${idx}`;
    const prev = activeVoicesRef.current.get(id);
    if (prev) prev.forEach(v => v.release());
    const voice = makeVoice({ ctx: graph.ctx, destination: graph.masterNode, tone: toneRef.current, freq: note.freq, level: 0.90 });
    if (!voice) return;
    activeVoicesRef.current.set(id, [voice]);
    setHeldIds(prev => new Set(prev).add(id));
    triggerStrings();
    if (onPlay) onPlay({ type: 'guitar-note', note: note.label });
  }, [graphOrNull, onPlay, triggerStrings]);

  const stopNote = useCallback((idx) => {
    const id = `note-${idx}`;
    const voices = activeVoicesRef.current.get(id);
    if (voices) { voices.forEach(v => v.release()); activeVoicesRef.current.delete(id); }
    setHeldIds(prev => { if (!prev.has(id)) return prev; const n = new Set(prev); n.delete(id); return n; });
  }, []);

  // ---- playing the drawn guitar: x along the neck picks the pitch ----
  const setGuitarHeld = useCallback((id) => {
    const prev = guitarHeldRef.current;
    if (prev === id) return;
    guitarHeldRef.current = id;
    setHeldIds(h => {
      const n = new Set(h);
      if (prev) n.delete(prev);
      if (id) n.add(id);
      return n;
    });
  }, []);

  const releaseGuitarVoices = useCallback(() => {
    guitarVoicesRef.current.forEach(v => v.release());
    guitarVoicesRef.current = [];
  }, []);

  const playZone = useCallback((zone) => {
    const graph = graphOrNull();
    if (!graph) return null;
    releaseGuitarVoices();
    const common = { ctx: graph.ctx, destination: graph.masterNode, tone: toneRef.current };
    let label, heldId;
    if (modeRef.current === 'chords') {
      const chord = CHORDS[zone];
      const freqs = toneRef.current === 'crunch' ? chord.powerFreqs : chord.fullFreqs;
      guitarVoicesRef.current = freqs.map((freq, i) =>
        makeVoice({ ...common, freq, startAt: i * 0.022, level: 0.60 - i * 0.02 })
      ).filter(Boolean);
      label = chord.label + (toneRef.current === 'crunch' ? '5' : '');
      heldId = chord.id;
      if (onPlay) onPlay({ type: 'guitar-chord', chord: chord.id });
    } else {
      const note = NOTES[zone];
      const v = makeVoice({ ...common, freq: note.freq, level: 0.85, ring: 1.6 });
      guitarVoicesRef.current = v ? [v] : [];
      label = note.label;
      heldId = `note-${zone}`;
      if (onPlay) onPlay({ type: 'guitar-note', note: note.label });
    }
    setGuitarHeld(heldId);
    triggerStrings();
    return label;
  }, [graphOrNull, onPlay, triggerStrings, releaseGuitarVoices, setGuitarHeld]);

  const svgPoint = useCallback((e) => {
    const svg = svgRef.current;
    if (!svg) return null;
    const ctm = svg.getScreenCTM();
    if (!ctm) return null;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    const p = pt.matrixTransform(ctm.inverse());
    return { x: p.x, y: p.y };
  }, []);

  const zoneCount = () => (modeRef.current === 'chords' ? CHORDS.length : NOTES.length);

  const onArtDown = useCallback((e) => {
    const p = svgPoint(e);
    if (!p) return;
    e.preventDefault();
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch (_) {}
    const zone = zoneAt(p.x, p.y, zoneCount());
    dragRef.current = { active: true, last: zone };
    const label = zone === null ? null : playZone(zone);
    setPick({ ...p, label });
    setGlow(zone === null ? null : { zone, count: zoneCount() });
  }, [svgPoint, playZone]);

  const onArtMove = useCallback((e) => {
    if (!dragRef.current.active) return;
    const p = svgPoint(e);
    if (!p) return;
    const zone = zoneAt(p.x, p.y, zoneCount());
    if (zone !== null && zone !== dragRef.current.last) {
      dragRef.current.last = zone;
      setPick({ ...p, label: playZone(zone) });
      setGlow({ zone, count: zoneCount() });
    } else {
      setPick(prev => ({ ...p, label: zone === null ? null : (prev && prev.label) }));
    }
  }, [svgPoint, playZone]);

  const onArtUp = useCallback(() => {
    if (!dragRef.current.active) return;
    dragRef.current = { active: false, last: null };
    setPick(null);
    setGlow(null);
    setGuitarHeld(null);
    if (modeRef.current === 'chords') releaseGuitarVoices();
  }, [setGuitarHeld, releaseGuitarVoices]);

  const onKnobTap = useCallback((knob) => {
    setTone(t => (t === 'crunch' ? 'clean' : 'crunch'));
    setTwist(prev => ({ knob, id: prev.id + 1 }));
  }, []);

  useEffect(() => () => {
    activeVoicesRef.current.forEach(voices => voices.forEach(v => v.release()));
    activeVoicesRef.current.clear();
    guitarVoicesRef.current.forEach(v => v.release());
    strumTimersRef.current.forEach(clearTimeout);
  }, []);

  // Keyboard: 1-6 chords / 1-0,- notes (by mode); Q/W tone; Z/X mode.
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

  const loadingLabel = !ready.crunch ? 'loading…' : null;
  const isCrunch = tone === 'crunch';
  const toggleCls = (on, onCls) => `px-3 py-1 rounded-full text-[10px] md:text-xs font-black uppercase tracking-wider transition-colors touch-manipulation ${on ? onCls : 'bg-transparent text-white/70'}`;

  return (
    <div
      data-testid="guitar-instrument"
      className="w-full max-w-[900px] mx-auto rounded-2xl px-3 py-3 md:px-4 md:py-4 relative"
      style={{ background: 'linear-gradient(180deg, #1B1B24 0%, #2A2A3A 100%)', border: '4px solid var(--jma-dark)', boxShadow: '0 6px 0 0 var(--jma-dark)' }}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-1 bg-black/40 rounded-full p-1">
          <button type="button" data-testid="guitar-mode-chords" onClick={() => setMode('chords')} className={toggleCls(mode === 'chords', 'bg-[var(--jma-yellow)] text-[var(--jma-dark)]')}>Chords</button>
          <button type="button" data-testid="guitar-mode-notes" onClick={() => setMode('notes')} className={toggleCls(mode === 'notes', 'bg-[var(--jma-yellow)] text-[var(--jma-dark)]')}>Notes</button>
        </div>
        {loadingLabel && <span data-testid="guitar-loading" className="text-yellow-300 text-[10px] font-bold uppercase tracking-widest">{loadingLabel}</span>}
        <div className="flex items-center gap-1 bg-black/40 rounded-full p-1">
          <button type="button" data-testid="guitar-tone-clean" onClick={() => setTone('clean')} className={toggleCls(tone === 'clean', 'bg-white text-[var(--jma-dark)]')}>Clean</button>
          <button type="button" data-testid="guitar-tone-crunch" onClick={() => setTone('crunch')} className={toggleCls(tone === 'crunch', 'bg-[#E74C3C] text-white')}>Crunch</button>
        </div>
      </div>

      <div
        data-testid="guitar-strings"
        className="relative w-full mb-3 rounded-lg overflow-hidden"
        style={{ background: 'linear-gradient(180deg, #F4E6C8 0%, #E5D1A3 100%)', border: '2px solid #000', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.15)' }}
      >
        <GuitarArt
          frame={frame}
          pick={pick}
          glow={glow}
          sweepId={sweepId}
          twist={twist}
          onKnobTap={onKnobTap}
          svgRef={svgRef}
          onPointerDown={onArtDown}
          onPointerMove={onArtMove}
          onPointerUp={onArtUp}
        />
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
                onPointerDown={(e) => { e.preventDefault(); startChord(chord); }}
                onPointerUp={() => stopChord(chord.id)}
                onPointerLeave={() => stopChord(chord.id)}
                onPointerCancel={() => stopChord(chord.id)}
                className="relative rounded-2xl flex items-center justify-center py-4 md:py-6 border-2 touch-manipulation select-none"
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
              </motion.button>
            );
          })}
        </div>
      ) : (
        <div data-testid="guitar-note-strip" className="grid grid-cols-6 md:grid-cols-11 gap-1.5 md:gap-2">
          {NOTES.map((note, idx) => {
            const held = heldIds.has(`note-${idx}`);
            return (
              <motion.button
                key={idx}
                type="button"
                data-testid={`guitar-note-${idx}`}
                onPointerDown={(e) => { e.preventDefault(); startNote(note, idx); }}
                onPointerUp={() => stopNote(idx)}
                onPointerLeave={() => stopNote(idx)}
                onPointerCancel={() => stopNote(idx)}
                className="relative rounded-xl flex items-center justify-center py-3 md:py-5 border-2 touch-manipulation select-none"
                style={{
                  background: `linear-gradient(180deg, ${NOTE_COLORS[idx]} 0%, ${NOTE_COLORS[idx]}CC 100%)`,
                  borderColor: '#000',
                  boxShadow: held ? '0 1px 0 0 #000' : '0 3px 0 0 #000',
                  color: 'white',
                }}
                animate={{ scale: held ? 0.94 : 1, y: held ? 2 : 0 }}
                transition={{ type: 'spring', stiffness: 400, damping: 22 }}
              >
                <span className="font-black text-lg md:text-2xl leading-none">{note.label}</span>
              </motion.button>
            );
          })}
        </div>
      )}
    </div>
  );
}
