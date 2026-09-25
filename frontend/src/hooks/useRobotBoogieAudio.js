// useRobotBoogieAudio — Web Audio API version.
//
// The v1 attempt used HTMLAudioElement with `loop=true`, but MP3 loops on
// HTMLAudioElement are NOT sample-accurate — each loop can gap by tens of
// milliseconds, and after a few laps the 12 stems drift wildly out of sync.
// The user reported "the loops arent at all together" and that was the
// core problem.
//
// This version:
//   1. Fetches + decodes each stem into an in-memory AudioBuffer (once).
//   2. On the FIRST character tap, spins up 12 AudioBufferSourceNodes and
//      calls .start(startTime) on ALL of them at the exact same audio-clock
//      timestamp — sample-accurate group start.
//   3. Each source is routed through its own GainNode. Toggling a character
//      just ramps that GainNode to 1.0 (audible) or 0.0 (silent) over ~15
//      ms. The source never stops, so it stays in perfect sync with the
//      other 11 for the entire session.
//
// Result: every stem lines up on the measure grid indefinitely.

import { useCallback, useEffect, useRef, useState } from 'react';

export const STEM_IDS = [
  'robot-bass',
  'robot-drum-1',
  'robot-drum-1-1',
  'robot-drum-2',
  'robot-drum-3',
  'robot-gtr',
  'robot-horns-1',
  'robot-horns-2',
  'robot-horns-3',
  'robot-synth-1',
  'robot-synth-2',
  'robot-synth-3',
];

export default function useRobotBoogieAudio() {
  const ctxRef = useRef(null);
  const buffersRef = useRef({});   // stemId -> AudioBuffer
  const sourcesRef = useRef({});   // stemId -> AudioBufferSourceNode
  const gainsRef = useRef({});     // stemId -> GainNode
  const startedRef = useRef(false);
  // Exposed via getAudioClock() so downstream visual effects (lightning,
  // beat pulses) can lock to the exact same audio-clock timeline the
  // stems are looping on. Populated on first playback.
  const startTimeRef = useRef(null);
  const loopDurationRef = useRef(null);

  const [loaded, setLoaded] = useState(false);
  const [activeStems, setActiveStems] = useState(new Set());

  // ---- preload + decode all 12 stems as AudioBuffers ----
  useEffect(() => {
    let cancelled = false;
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) {
      setLoaded(true);
      return;
    }
    const ctx = new Ctor();
    ctxRef.current = ctx;

    Promise.all(
      STEM_IDS.map(async (stem) => {
        try {
          const res = await fetch(`assets/audio/robot-boogie/${stem}.mp3`);
          const arrayBuf = await res.arrayBuffer();
          // Wrap in a Promise because some old iOS Safari builds only
          // support the callback form of decodeAudioData.
          const audioBuf = await new Promise((resolve, reject) => {
            const p = ctx.decodeAudioData(arrayBuf, resolve, reject);
            if (p && typeof p.then === 'function') p.then(resolve, reject);
          });
          buffersRef.current[stem] = audioBuf;
        } catch (_) {
          /* individual stem failure — page still functions with others */
        }
      })
    ).then(() => {
      if (!cancelled) setLoaded(true);
    });

    return () => {
      cancelled = true;
      // Stop every source
      Object.values(sourcesRef.current).forEach((s) => {
        try { s.stop(); } catch (_) { /* already stopped */ }
      });
      try { ctx.close(); } catch (_) { /* ignore */ }
      ctxRef.current = null;
      buffersRef.current = {};
      sourcesRef.current = {};
      gainsRef.current = {};
      startedRef.current = false;
    };
  }, []);

  // ---- toggle a stem's audibility ----
  const setStemActive = useCallback(async (stemId, active) => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      try { await ctx.resume(); } catch (_) { /* ignore */ }
    }

    // First-touch: spin up all 12 sources + gains and start them at the
    // SAME AudioContext timestamp. This is the anti-drift move.
    if (!startedRef.current) {
      startedRef.current = true;
      const startTime = ctx.currentTime + 0.05; // small lookahead
      startTimeRef.current = startTime;

      // Trim the ~40 ms of MP3 encoder-added silence at the head + tail
      // of every stem so the loop points are seamless. Files decode to
      // ~11.024 s but the actual musical content is ~10.984 s (drum
      // stems) with 20 ms silence at each end — hearing that silence
      // read to the user as "an extra 16th beat before the loop starts
      // over." Setting loopStart/loopEnd (in seconds) tells Web Audio
      // to jump back to loopStart when it hits loopEnd, cutting the
      // dead air out entirely. Values tuned to the shortest reliable
      // musical duration across all 12 stems so they stay locked in
      // phase. If the loop still isn't clean, tune LOOP_END down in
      // small (0.01 s) steps.
      const LOOP_START = 0.020;
      const LOOP_END   = 10.984;

      STEM_IDS.forEach((id) => {
        const buf = buffersRef.current[id];
        if (!buf) return;
        // Capture the loop duration off the first available buffer —
        // every stem is trimmed to the same LOOP window so beat-pulse
        // math should use the trimmed length, not the raw buffer.
        if (loopDurationRef.current === null) {
          loopDurationRef.current = LOOP_END - LOOP_START;
        }
        const src = ctx.createBufferSource();
        src.buffer = buf;
        src.loop = true;
        // Clamp loopEnd defensively in case a shorter buffer sneaks in.
        src.loopStart = LOOP_START;
        src.loopEnd   = Math.min(LOOP_END, buf.duration - 0.001);
        const gain = ctx.createGain();
        gain.gain.value = 0; // start silent
        src.connect(gain).connect(ctx.destination);
        // Start playback at loopStart so we skip the head silence on
        // the very first pass too — otherwise the FIRST play would
        // include the 20 ms lead but every subsequent loop wouldn't.
        src.start(startTime, LOOP_START);
        sourcesRef.current[id] = src;
        gainsRef.current[id] = gain;
      });
    }

    // Ramp the requested gain — 15 ms is enough to avoid audible clicks
    // without introducing a perceptible fade delay.
    const gain = gainsRef.current[stemId];
    if (gain) {
      const now = ctx.currentTime;
      // Cancel any in-flight ramp on this node so we don't fight it
      try { gain.gain.cancelScheduledValues(now); } catch (_) { /* ignore */ }
      gain.gain.setValueAtTime(gain.gain.value, now);
      gain.gain.linearRampToValueAtTime(active ? 1.0 : 0.0, now + 0.015);
    }

    setActiveStems((prev) => {
      const next = new Set(prev);
      if (active) next.add(stemId);
      else next.delete(stemId);
      return next;
    });
  }, []);

  // ---- mute everyone (reset button) ----
  const muteAll = useCallback(() => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    const now = ctx.currentTime;
    Object.values(gainsRef.current).forEach((g) => {
      try { g.gain.cancelScheduledValues(now); } catch (_) { /* ignore */ }
      g.gain.setValueAtTime(g.gain.value, now);
      g.gain.linearRampToValueAtTime(0, now + 0.04);
    });
    setActiveStems(new Set());
  }, []);

  // ---- audio-clock accessor for beat-synced visuals ----
  //
  // Returns null until the first tap has kicked off the group start.
  // After that, callers can use `elapsed = ctx.currentTime - startTime`
  // together with `loopDuration` (seconds per loop) to derive an exact
  // beat phase locked to the audio timeline.
  const getAudioClock = useCallback(() => {
    const ctx = ctxRef.current;
    if (!ctx || startTimeRef.current === null || loopDurationRef.current === null) {
      return null;
    }
    return {
      audioTime: ctx.currentTime,
      startTime: startTimeRef.current,
      loopDuration: loopDurationRef.current,
    };
  }, []);

  // -----------------------------------------------------------------
  // Interactive one-shot synths (added Feb 30 evening).
  //
  // The main loop stems are the "song"; these helpers let the kid
  // PLAY the Time Machine like an instrument on top:
  //   • triggerStab()  — single kick+noise burst on tap
  //   • startRiser() / stopRiser() — rising noise+sine while held,
  //     resolves with a low "drop" hit on release
  //   • setPlaybackRate(rate) — silly-speed dial (all loop sources
  //     retune together; pitch shifts with tempo, which is fine for
  //     kids)
  // -----------------------------------------------------------------
  const riserRef = useRef(null); // { osc, noise, filter, gain, startedAt } | null
  const playbackRateRef = useRef(1);

  const triggerStab = useCallback(async () => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    if (ctx.state === 'suspended') { try { await ctx.resume(); } catch (_) { /* ignore */ } }
    const now = ctx.currentTime;
    // Kick body: 160 Hz → 45 Hz sweep in ~120 ms with a snappy gain
    // envelope. Simulates a soft rubber-mallet thump.
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.exponentialRampToValueAtTime(45, now + 0.12);
    const oscGain = ctx.createGain();
    oscGain.gain.setValueAtTime(0.0001, now);
    oscGain.gain.exponentialRampToValueAtTime(0.85, now + 0.008);
    oscGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);
    osc.connect(oscGain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.32);
    // Click/noise layer for attack transient — bandpassed white noise
    const noiseBuf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.05), ctx.sampleRate);
    const nData = noiseBuf.getChannelData(0);
    for (let i = 0; i < nData.length; i += 1) nData[i] = (Math.random() * 2 - 1);
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuf;
    const nFilter = ctx.createBiquadFilter();
    nFilter.type = 'bandpass';
    nFilter.frequency.value = 3200;
    nFilter.Q.value = 0.7;
    const nGain = ctx.createGain();
    nGain.gain.setValueAtTime(0.35, now);
    nGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);
    noise.connect(nFilter).connect(nGain).connect(ctx.destination);
    noise.start(now);
    noise.stop(now + 0.07);
  }, []);

  const startRiser = useCallback(async () => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    if (ctx.state === 'suspended') { try { await ctx.resume(); } catch (_) { /* ignore */ } }
    // If a previous riser is still up (very fast repeat-taps), tear it
    // down cleanly before starting a new one.
    if (riserRef.current) { try { riserRef.current.osc.stop(); riserRef.current.noise.stop(); } catch (_) { /* ignore */ } riserRef.current = null; }
    const now = ctx.currentTime;
    // Riser components:
    //   • Sine osc sweeping 220 Hz → 1200 Hz over 3 s
    //   • Filtered white noise with cutoff sweeping 400 → 8000 Hz
    //   • Combined gain envelope ramping 0 → 0.55 over 3 s (linear)
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(1200, now + 3.0);
    const oscGain = ctx.createGain();
    oscGain.gain.setValueAtTime(0.0001, now);
    oscGain.gain.exponentialRampToValueAtTime(0.28, now + 3.0);
    osc.connect(oscGain);

    const noiseBuf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 3.5), ctx.sampleRate);
    const nData = noiseBuf.getChannelData(0);
    for (let i = 0; i < nData.length; i += 1) nData[i] = (Math.random() * 2 - 1);
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuf;
    const nFilter = ctx.createBiquadFilter();
    nFilter.type = 'lowpass';
    nFilter.frequency.setValueAtTime(400, now);
    nFilter.frequency.exponentialRampToValueAtTime(8000, now + 3.0);
    const nGain = ctx.createGain();
    nGain.gain.setValueAtTime(0.0001, now);
    nGain.gain.exponentialRampToValueAtTime(0.25, now + 3.0);
    noise.connect(nFilter).connect(nGain);

    const master = ctx.createGain();
    master.gain.value = 1;
    oscGain.connect(master);
    nGain.connect(master);
    master.connect(ctx.destination);

    osc.start(now);
    noise.start(now);

    riserRef.current = { osc, noise, master, startedAt: now };
  }, []);

  const stopRiser = useCallback(async () => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    const r = riserRef.current;
    if (!r) return;
    riserRef.current = null;
    const now = ctx.currentTime;
    // Fade the riser out over 60 ms so its tail doesn't clash with the
    // drop hit, then stop and dispose.
    try {
      r.master.gain.cancelScheduledValues(now);
      r.master.gain.setValueAtTime(r.master.gain.value, now);
      r.master.gain.linearRampToValueAtTime(0.0001, now + 0.06);
    } catch (_) { /* ignore */ }
    try { r.osc.stop(now + 0.08); r.noise.stop(now + 0.08); } catch (_) { /* ignore */ }
    // Drop hit: big low kick with a longer decay so it feels like the
    // room just dropped out.
    const dOsc = ctx.createOscillator();
    dOsc.type = 'sine';
    dOsc.frequency.setValueAtTime(120, now);
    dOsc.frequency.exponentialRampToValueAtTime(30, now + 0.55);
    const dGain = ctx.createGain();
    dGain.gain.setValueAtTime(0.0001, now);
    dGain.gain.exponentialRampToValueAtTime(1.0, now + 0.012);
    dGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.7);
    dOsc.connect(dGain).connect(ctx.destination);
    dOsc.start(now);
    dOsc.stop(now + 0.75);
  }, []);

  // Silly-speed dial — retunes every currently-running loop source.
  // Web Audio changes both pitch AND tempo when you touch playbackRate
  // (no time-stretch); that IS what "silly speed" means to a kid.
  const setPlaybackRate = useCallback((rate) => {
    playbackRateRef.current = rate;
    Object.values(sourcesRef.current).forEach((src) => {
      if (src && src.playbackRate) {
        try {
          const now = ctxRef.current && ctxRef.current.currentTime;
          src.playbackRate.cancelScheduledValues(now || 0);
          src.playbackRate.linearRampToValueAtTime(rate, (now || 0) + 0.15);
        } catch (_) { /* ignore */ }
      }
    });
  }, []);

  return {
    loaded,
    activeStems,
    setStemActive,
    muteAll,
    getAudioClock,
    triggerStab,
    startRiser,
    stopRiser,
    setPlaybackRate,
  };
}
