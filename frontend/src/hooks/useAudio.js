// Audio hook for playing bell sounds - supports polyphonic playback
import { useCallback, useRef, useEffect } from 'react';

// Note frequencies for Web Audio API fallback
const NOTE_FREQUENCIES = {
  C: 261.63,
  D: 293.66,
  E: 329.63,
  F: 349.23,
  G: 392.00,
  A: 440.00,
  B: 493.88,
  'High C': 523.25
};

// Bell audio file mapping
const BELL_AUDIO_FILES = {
  C: 'assets/audio/C - Do.mp3',
  D: 'assets/audio/D - Re.mp3',
  E: 'assets/audio/E - Mi.mp3',
  F: 'assets/audio/F - Fa.mp3',
  G: 'assets/audio/G - So.mp3',
  A: 'assets/audio/A - La.mp3',
  B: 'assets/audio/B - ti.mp3',
  'High C': 'assets/audio/High C - High Do.mp3'
};

// Drum audio file mapping  
const DRUM_AUDIO_FILES = {
  kick: 'assets/audio/Bass drum - kick.mp3',
  snare: 'assets/audio/Snare.mp3',
  hihat: 'assets/audio/Hi Hat closed.mp3',
  crash: 'assets/audio/Crash cymbal.mp3',
  ride: 'assets/audio/Ride.mp3',
  tom: 'assets/audio/Tom.mp3',
  lowTom: 'assets/audio/Low Tom.mp3',
  scratchPull: 'assets/audio/scratch-pull.mp3',
  scratchPush: 'assets/audio/scratch-push.mp3',
  scratchPushPull: 'assets/audio/scratch-push-pull.mp3'
};

// Kazoo audio file mapping. Keys are prefixed with `kazoo:` to avoid colliding
// with bell-note buffer keys (which use just 'C', 'D', etc.).
const KAZOO_AUDIO_FILES = {
  'kazoo:C':      'assets/audio/kazoos/kazoo-C.mp3',
  'kazoo:D':      'assets/audio/kazoos/kazoo-D.mp3',
  'kazoo:E':      'assets/audio/kazoos/kazoo-E.mp3',
  'kazoo:F':      'assets/audio/kazoos/kazoo-F.mp3',
  'kazoo:G':      'assets/audio/kazoos/kazoo-G.mp3',
  'kazoo:A':      'assets/audio/kazoos/kazoo-A.mp3',
  'kazoo:B':      'assets/audio/kazoos/kazoo-B.mp3',
  'kazoo:High C': 'assets/audio/kazoos/kazoo-HighC.mp3'
};

export function useAudio() {
  const audioContextRef = useRef(null);
  const audioBuffersRef = useRef({});
  const loadedRef = useRef(false);
  const masterGainRef = useRef(null);

  // Initialize audio context
  const initAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      // Master gain - all sounds route through this so a recorder can tap a single node
      masterGainRef.current = audioContextRef.current.createGain();
      masterGainRef.current.gain.value = 1;
      masterGainRef.current.connect(audioContextRef.current.destination);
    }
    // Resume if suspended (for autoplay policies)
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
    return audioContextRef.current;
  }, []);

  // Returns { ctx, masterNode } - useful for recording. Initializes context lazily.
  const getAudioGraph = useCallback(() => {
    const ctx = initAudioContext();
    return { ctx, masterNode: masterGainRef.current };
  }, [initAudioContext]);

  // Preload audio files
  const preloadAudio = useCallback(async () => {
    if (loadedRef.current) return;
    
    const ctx = initAudioContext();
    const allFiles = { ...BELL_AUDIO_FILES, ...DRUM_AUDIO_FILES, ...KAZOO_AUDIO_FILES };
    
    const loadPromises = Object.entries(allFiles).map(async ([note, url]) => {
      try {
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
        audioBuffersRef.current[note] = audioBuffer;
      } catch (error) {
        console.warn(`Could not load audio for ${note}:`, error);
      }
    });

    await Promise.all(loadPromises);
    loadedRef.current = true;
  }, [initAudioContext]);

  // Play a bell note - supports polyphonic playback (multiple notes at once)
  const playBellNote = useCallback((note) => {
    const ctx = initAudioContext();

    // Try to play loaded audio file
    const buffer = audioBuffersRef.current[note];
    if (buffer) {
      // Create a NEW source node each time (allows polyphonic playback)
      const source = ctx.createBufferSource();
      const gainNode = ctx.createGain();
      
      source.buffer = buffer;
      gainNode.gain.setValueAtTime(0.7, ctx.currentTime);
      
      source.connect(gainNode);
      gainNode.connect(masterGainRef.current);
      source.start(0);
      return;
    }

    // Fallback to synthesized tone
    const freq = NOTE_FREQUENCIES[note];
    if (!freq) return;

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(freq, ctx.currentTime);

    // Bell-like envelope
    gainNode.gain.setValueAtTime(0.5, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.8);

    oscillator.connect(gainNode);
    gainNode.connect(masterGainRef.current);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.8);
  }, [initAudioContext]);

  // Play drum sound - supports polyphonic playback
  const playDrumSound = useCallback((drum) => {
    const ctx = initAudioContext();

    const buffer = audioBuffersRef.current[drum];
    if (buffer) {
      const source = ctx.createBufferSource();
      const gainNode = ctx.createGain();
      
      source.buffer = buffer;
      gainNode.gain.setValueAtTime(0.8, ctx.currentTime);
      
      source.connect(gainNode);
      gainNode.connect(masterGainRef.current);
      source.start(0);
    }
  }, [initAudioContext]);

  // Play a kazoo note - same polyphonic pattern as bells, just different buffers.
  // Falls back to a slightly buzzier oscillator if the sample failed to load.
  const playKazooNote = useCallback((note) => {
    const ctx = initAudioContext();
    const buffer = audioBuffersRef.current[`kazoo:${note}`];
    if (buffer) {
      const source = ctx.createBufferSource();
      const gainNode = ctx.createGain();
      source.buffer = buffer;
      gainNode.gain.setValueAtTime(0.7, ctx.currentTime);
      // Brief release after ~0.6s so notes don't all stack up
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.7);
      source.connect(gainNode);
      gainNode.connect(masterGainRef.current);
      source.start(0);
      source.stop(ctx.currentTime + 0.75);
      return;
    }
    // Fallback - sawtooth (kazoo-ish buzz)
    const freq = NOTE_FREQUENCIES[note];
    if (!freq) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
    osc.connect(gain);
    gain.connect(masterGainRef.current);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.5);
  }, [initAudioContext]);

  // Play success/feedback sound
  const playFeedbackSound = useCallback((type) => {
    const ctx = initAudioContext();

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    if (type === 'perfect') {
      oscillator.frequency.setValueAtTime(523.25, ctx.currentTime);
      oscillator.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1);
    } else if (type === 'miss') {
      oscillator.frequency.setValueAtTime(200, ctx.currentTime);
    } else {
      oscillator.frequency.setValueAtTime(440, ctx.currentTime);
    }

    gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);

    oscillator.connect(gainNode);
    gainNode.connect(masterGainRef.current);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.3);
  }, [initAudioContext]);

  // Count-in beep — pure tone via oscillator, distinctly different from the
  // hi-hat used in the gameplay click track. `isLast` raises the pitch a
  // perfect 5th on beat 4 so the kid hears "ready... ready... ready... GO"
  // and naturally tap on the next downbeat.
  const playCountInBeep = useCallback((isLast = false) => {
    const ctx = initAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    // Beat 1–3: A5 (880 Hz). Beat 4: E6 (1320 Hz) — a fifth higher,
    // unmistakably "go time".
    osc.frequency.setValueAtTime(isLast ? 1320 : 880, ctx.currentTime);
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.32, ctx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + (isLast ? 0.22 : 0.14));
    osc.connect(gain);
    gain.connect(masterGainRef.current);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.28);
  }, [initAudioContext]);

  // Preload deferred to browser idle time.
  //
  // Before: preloadAudio() ran synchronously inside a mount effect on
  // every page that uses this hook. That fired 26 fetch + decodeAudioData
  // operations up-front (8 bells + 10 drums/scratches + 8 kazoos), which
  // on mobile competes with the initial paint and the Framer-Motion
  // entrance animations. Beat Lab was the loudest offender because its
  // first render also mounts big SVG mascots + a 96-cell sequencer grid.
  //
  // After: same preload, but wrapped in requestIdleCallback (falls back
  // to a short setTimeout on Safari) so the browser paints the UI first
  // and only then starts decoding audio. Everything else is unchanged —
  // `initAudioContext` + the play* helpers still lazy-load, so if a kid
  // manages to tap before the idle pass finishes, playback still works
  // (fallback synth voices for anything not yet decoded).
  useEffect(() => {
    const kick = () => { preloadAudio(); };
    const ric = typeof window !== 'undefined' && window.requestIdleCallback;
    const handle = ric
      ? window.requestIdleCallback(kick, { timeout: 1500 })
      : setTimeout(kick, 250);
    return () => {
      if (ric && typeof window.cancelIdleCallback === 'function') {
        window.cancelIdleCallback(handle);
      } else {
        clearTimeout(handle);
      }
    };
  }, [preloadAudio]);

  return {
    playBellNote,
    playDrumSound,
    playKazooNote,
    playFeedbackSound,
    playCountInBeep,
    preloadAudio,
    initAudioContext,
    getAudioGraph,
  };
}

export default useAudio;
