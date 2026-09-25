// Lightweight piano-audio hook for Charlie's Song Studio.
// Uses Web Audio so notes AND the optional drum loop share the same
// `AudioContext.currentTime` clock — that's what guarantees the drums
// don't drift behind the melody.

import { useCallback, useEffect, useRef } from 'react';
import { ALL_PIANO_NOTE_IDS, noteFile } from '../data/songStudio';

export default function usePianoAudio() {
  const ctxRef = useRef(null);
  const buffersRef = useRef({});       // note id   -> AudioBuffer
  const loopBuffersRef = useRef({});   // loop url  -> AudioBuffer
  const masterGainRef = useRef(null);

  const initContext = useCallback(() => {
    if (!ctxRef.current) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      ctxRef.current = new Ctx();
      masterGainRef.current = ctxRef.current.createGain();
      masterGainRef.current.gain.value = 1;
      masterGainRef.current.connect(ctxRef.current.destination);
    }
    if (ctxRef.current.state === 'suspended') ctxRef.current.resume();
    return ctxRef.current;
  }, []);

  const decodeUrl = useCallback(async (url) => {
    const ctx = initContext();
    const r = await fetch(url);
    const buf = await r.arrayBuffer();
    return ctx.decodeAudioData(buf);
  }, [initContext]);

  // Preload all melody+chord piano notes
  const preload = useCallback(async () => {
    initContext();
    await Promise.all(ALL_PIANO_NOTE_IDS.map(async (id) => {
      if (buffersRef.current[id]) return;
      try {
        buffersRef.current[id] = await decodeUrl(noteFile(id));
      } catch {
        // Silently ignore — fallback path will kick in if a note is tapped early
      }
    }));
  }, [initContext, decodeUrl]);

  // Preload (and cache) a drum loop URL → AudioBuffer
  const preloadLoop = useCallback(async (url) => {
    if (!url) return null;
    if (loopBuffersRef.current[url]) return loopBuffersRef.current[url];
    try {
      const buf = await decodeUrl(url);
      loopBuffersRef.current[url] = buf;
      return buf;
    } catch {
      return null;
    }
  }, [decodeUrl]);

  // Play a piano note. Polyphonic. `when` is an AudioContext timestamp; 0 = now.
  // Returns the underlying AudioBufferSourceNode (or null on fallback path) so
  // the caller can `.stop()` scheduled future notes if the user hits Stop.
  const playPianoNote = useCallback((id, gain = 0.7, when = 0) => {
    const ctx = initContext();
    const startAt = when || ctx.currentTime;
    const buf = buffersRef.current[id];
    if (!buf) {
      // Fallback for the very first taps before preload finishes.
      // We can't honor `when` precisely here, but for the immediate-tap path
      // it's fine (no scheduling involved).
      if (!ALL_PIANO_NOTE_IDS.includes(id)) return null;
      try {
        const a = new Audio(noteFile(id));
        a.volume = gain;
        a.play().catch(() => { /* ignore */ });
      } catch { /* ignore */ }
      return null;
    }
    const source = ctx.createBufferSource();
    const g = ctx.createGain();
    source.buffer = buf;
    g.gain.setValueAtTime(gain, startAt);
    source.connect(g).connect(masterGainRef.current);
    source.start(startAt);
    return source;
  }, [initContext]);

  // Start a looped drum buffer at a precise AudioContext timestamp.
  // Returns the source so the caller can stop it.
  const playLoop = useCallback((buf, gain = 0.45, when = 0) => {
    if (!buf) return null;
    const ctx = initContext();
    const startAt = when || ctx.currentTime;
    const source = ctx.createBufferSource();
    const g = ctx.createGain();
    source.buffer = buf;
    source.loop = true;
    g.gain.setValueAtTime(gain, startAt);
    source.connect(g).connect(masterGainRef.current);
    source.start(startAt);
    return source;
  }, [initContext]);

  // Current AudioContext time (callers schedule relative to this).
  const now = useCallback(() => {
    const ctx = initContext();
    return ctx.currentTime;
  }, [initContext]);

  useEffect(() => {
    return () => {
      try { ctxRef.current?.close(); } catch { /* ignore */ }
    };
  }, []);

  return { preload, preloadLoop, playPianoNote, playLoop, initContext, now };
}
