import { useState, useEffect, useCallback, useRef, memo } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Play, Square, Plus, Minus, Volume2, Circle, Download } from 'lucide-react';
import { GameHeader } from '../components/GameUI';
import RoomCharacters from '../components/RoomCharacters';
import { FullscreenButton } from '../components/FullscreenButton';
import { DrumKitVisual, TurntableVisual } from '../components/Instruments';
import useAudio from '../hooks/useAudio';
import useMp3Recorder from '../hooks/useMp3Recorder';
import usePlayer from '../hooks/usePlayer';
import { earnSticker, earnAchievement, earnAchievementUpTo } from '../hooks/useStickers';

const DEFAULT_BPM = 100;

// Memoized mascots — Charlie (drum kit) and Sharky (turntable) only
// depend on `isPlaying` and `bpm`. The parent LoopStudioPage re-renders
// on every step tick (~150ms at 100 BPM) because `currentStep` and
// `activeHits` are state; before this memo, both `motion.img` subtrees
// reconciled every one of those ticks even though nothing about them
// had changed. Wrapping them in React.memo drops that work entirely —
// they only re-render on real prop changes (play/stop, BPM adjustment).
const CharlieMascot = memo(function CharlieMascot({ isPlaying, bpm }) {
  return (
    <motion.img
      src="assets/characters/charlie-rundmc.png"
      alt=""
      aria-hidden="true"
      className="hidden md:block"
      style={{
        height: 176,
        width: 'auto',
        filter: 'drop-shadow(0 4px 0 rgba(0,0,0,0.35))',
        flexShrink: 0,
      }}
      animate={isPlaying ? { y: [0, -6, 0] } : { y: 0 }}
      transition={isPlaying ? { duration: 60 / bpm, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.3 }}
    />
  );
});

const SharkyMascot = memo(function SharkyMascot({ isPlaying, bpm }) {
  return (
    <motion.img
      src="assets/characters/sharky-hiphop.png"
      alt=""
      aria-hidden="true"
      className="hidden md:block"
      style={{
        height: 190,
        width: 'auto',
        filter: 'drop-shadow(0 4px 0 rgba(0,0,0,0.35))',
        flexShrink: 0,
      }}
      animate={isPlaying ? { y: [0, -6, 0] } : { y: 0 }}
      transition={isPlaying ? { duration: 60 / bpm, repeat: Infinity, ease: 'easeInOut', delay: (60 / bpm) / 2 } : { duration: 0.3 }}
    />
  );
});

// Canonical order for the deck: bells (low → high), then drums, then
// scratches. `sortTracks` reindexes any track-id list by their position
// in TRACK_PRESETS so kids never see "Do, Kick, Mi, Snare, Re..." — the
// row always reads bells → drums → turntable regardless of the order
// tracks were added.
// Available tracks with instruments (bells hidden visually but still playable via sequencer)
const TRACK_PRESETS = [
  { id: 'bells_C', label: 'Do (C)', type: 'bell', note: 'C', color: '#FF3B30' },
  { id: 'bells_D', label: 'Re (D)', type: 'bell', note: 'D', color: '#FF9500' },
  { id: 'bells_E', label: 'Mi (E)', type: 'bell', note: 'E', color: '#FFCC00' },
  { id: 'bells_F', label: 'Fa (F)', type: 'bell', note: 'F', color: '#4CD964' },
  { id: 'bells_G', label: 'So (G)', type: 'bell', note: 'G', color: '#34A853' },
  { id: 'bells_A', label: 'La (A)', type: 'bell', note: 'A', color: '#4285F4' },
  { id: 'bells_B', label: 'Ti (B)', type: 'bell', note: 'B', color: '#AF52DE' },
  { id: 'bells_HC', label: 'Do (Hi)', type: 'bell', note: 'High C', color: '#FF2D55' },
  { id: 'drum_kick', label: 'Kick', type: 'drum', note: 'kick', color: '#E74C3C' },
  { id: 'drum_snare', label: 'Snare', type: 'drum', note: 'snare', color: '#3498DB' },
  { id: 'drum_hihat', label: 'Hi-Hat', type: 'drum', note: 'hihat', color: '#F1C40F' },
  { id: 'drum_crash', label: 'Crash', type: 'drum', note: 'crash', color: '#E67E22' },
  { id: 'scratch_pull', label: 'Scratch Pull', type: 'scratch', note: 'scratchPull', color: '#1ABC9C' },
  { id: 'scratch_push', label: 'Scratch Push', type: 'scratch', note: 'scratchPush', color: '#16A085' },
  { id: 'scratch_pp', label: 'Scratch P/P', type: 'scratch', note: 'scratchPushPull', color: '#2ECC71' },
];

// Canonical row order: bells (low → high) → drums → scratches. Kids add
// tracks in any order and load presets that dump a mix; the deck row
// should still always read Do, Re, Mi… then Kick/Snare/Hi-Hat… then
// turntable. `sortTracks` reindexes any track-id list by position in
// TRACK_PRESETS.
const TRACK_ORDER = TRACK_PRESETS.reduce((m, t, i) => { m[t.id] = i; return m; }, {});
const sortTracks = (ids) => [...ids].sort((a, b) => (TRACK_ORDER[a] ?? 999) - (TRACK_ORDER[b] ?? 999));

// All loop presets (drums, scratches, AND bells)
const LOOP_PRESETS = {
  'Basic Beat': {
    drum_kick:  [1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0],
    drum_snare: [0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0],
    drum_hihat: [1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0],
  },
  'Funk Beat': {
    drum_kick:  [1,0,0,1,0,0,1,0,0,1,0,0,1,0,0,0],
    drum_snare: [0,0,0,0,1,0,0,1,0,0,0,0,1,0,0,0],
    drum_hihat: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  },
  'Rock Pattern': {
    drum_kick:  [1,0,0,0,0,0,1,0,1,0,0,0,0,0,1,0],
    drum_snare: [0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0],
    drum_hihat: [1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0],
    drum_crash: [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  },
  'Do-Mi-So': {
    bells_C:    [1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0],
    bells_E:    [0,0,1,0,0,0,0,0,0,0,1,0,0,0,0,0],
    bells_G:    [0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0],
  },
  'Scale Up': {
    bells_C:    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    bells_D:    [0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0],
    bells_E:    [0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0],
    bells_F:    [0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0],
    bells_G:    [0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0],
    bells_A:    [0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0],
    bells_B:    [0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0],
    bells_HC:   [0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0],
  },
  'Arpeggio': {
    bells_C:    [1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0],
    bells_E:    [0,0,1,0,0,0,0,0,0,0,1,0,0,0,0,0],
    bells_G:    [0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0],
    bells_HC:   [0,0,0,0,0,0,1,0,0,0,0,0,0,0,1,0],
  },
  'Waltz Feel': {
    bells_C:    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    bells_E:    [0,0,0,0,1,0,0,0,1,0,0,0,0,0,0,0],
    bells_G:    [0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0],
    drum_kick:  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    drum_hihat: [0,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0],
  },
  'Happy Song': {
    bells_C:    [1,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0],
    bells_D:    [0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0],
    bells_E:    [0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0],
    bells_F:    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0],
    drum_kick:  [1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0],
    drum_snare: [0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0],
  },
  'Jelly Jam': {
    bells_G:    [1,0,0,0,0,0,1,0,0,0,0,0,1,0,0,0],
    bells_E:    [0,0,1,0,0,0,0,0,1,0,0,0,0,0,1,0],
    bells_C:    [0,0,0,0,1,0,0,0,0,0,1,0,0,0,0,0],
    drum_kick:  [1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0],
    drum_hihat: [1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0],
    drum_snare: [0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0],
  },
  'DJ Scratch': {
    drum_kick:  [1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0],
    drum_hihat: [0,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1],
    scratch_pull: [0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],
    scratch_push: [0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0],
  },
  'Scratch Mix': {
    drum_kick:     [1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0],
    drum_hihat:    [1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0],
    scratch_pull:  [0,0,0,0,0,0,1,0,0,0,0,0,0,0,1,0],
    scratch_push:  [0,0,1,0,0,0,0,0,0,0,1,0,0,0,0,0],
  },
};

// Measure lengths
const MEASURE_OPTIONS = [
  { label: '1 Bar', steps: 16 },
  { label: '2 Bars', steps: 32 },
  { label: '4 Bars', steps: 64 },
];

function LoopStudioPage() {
  const navigate = useNavigate();
  const { playBellNote, playDrumSound, initAudioContext, getAudioGraph } = useAudio();
  const recorder = useMp3Recorder(getAudioGraph);
  const { player } = usePlayer();
  const playerName = player?.displayName || '';

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(-1);
  const [bpm, setBpm] = useState(DEFAULT_BPM);
  const [totalSteps, setTotalSteps] = useState(16);
  const [activeTracks, setActiveTracks] = useState(() => sortTracks(['drum_kick', 'drum_snare', 'drum_hihat', 'bells_C', 'bells_E', 'bells_G']));
  const [grid, setGrid] = useState({});
  const [mutedTracks, setMutedTracks] = useState(new Set());
  // For turntable scratch visual (kept as state since spin animation needs it)
  const [activeHits, setActiveHits] = useState(new Set());

  // Idle-state LCD chatter — while nothing is playing, the STEP readout
  // cycles a few playful prompts so the deck feels alive and inviting to
  // kids instead of showing a static "--/16".
  const IDLE_MESSAGES = ['READY?', 'TAP PADS', 'MAKE BEATS', 'LETS JAM'];
  const [idleMsgIndex, setIdleMsgIndex] = useState(0);
  useEffect(() => {
    if (isPlaying) return;
    const t = setInterval(() => setIdleMsgIndex(i => (i + 1) % IDLE_MESSAGES.length), 1600);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying]);

  // First-visit welcome — instead of an intimidating empty grid, load the
  // Basic Beat preset so a new kid sees the sequencer already lit up and
  // hears music the moment they hit PLAY. Only runs once per browser
  // (returning kids get whatever they were last working on).
  useEffect(() => {
    const FIRST_VISIT_KEY = 'jma_beat_lab_first_visit_v1';
    if (typeof window === 'undefined') return;
    if (localStorage.getItem(FIRST_VISIT_KEY)) return;
    // Slight delay so loadPreset's setState batches don't race with the
    // initial grid initialization useEffect.
    const t = setTimeout(() => {
      try {
        loadPreset('Basic Beat');
        localStorage.setItem(FIRST_VISIT_KEY, '1');
      } catch (e) {}
    }, 80);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const intervalRef = useRef(null);
  const gridRef = useRef(grid);
  const mutedRef = useRef(mutedTracks);
  const totalStepsRef = useRef(totalSteps);
  // Imperative handle for drum kit visual (instant frame swap, no state)
  const drumKitRef = useRef(null);

  useEffect(() => { gridRef.current = grid; }, [grid]);
  useEffect(() => { mutedRef.current = mutedTracks; }, [mutedTracks]);
  useEffect(() => { totalStepsRef.current = totalSteps; }, [totalSteps]);

  // Initialize grid for active tracks
  useEffect(() => {
    setGrid(prev => {
      const newGrid = { ...prev };
      activeTracks.forEach(trackId => {
        if (!newGrid[trackId] || newGrid[trackId].length < totalSteps) {
          const existing = newGrid[trackId] || [];
          newGrid[trackId] = [...existing, ...new Array(totalSteps - existing.length).fill(0)];
        }
      });
      return newGrid;
    });
  }, [activeTracks, totalSteps]);

  const toggleCell = useCallback((trackId, step) => {
    setGrid(prev => {
      const newGrid = { ...prev };
      const track = [...(newGrid[trackId] || new Array(totalSteps).fill(0))];
      const wasActive = track[step];
      track[step] = wasActive ? 0 : 1;
      newGrid[trackId] = track;
      // Play sound when activating a cell
      if (!wasActive) {
        initAudioContext();
        const preset = TRACK_PRESETS.find(p => p.id === trackId);
        if (preset?.type === 'bell') playBellNote(preset.note);
        else if (preset?.type === 'drum' || preset?.type === 'scratch') playDrumSound(preset.note);
      }
      return newGrid;
    });
  }, [totalSteps, initAudioContext, playBellNote, playDrumSound]);

  // Play a sound for preview
  const previewSound = useCallback((trackId) => {
    initAudioContext();
    const preset = TRACK_PRESETS.find(p => p.id === trackId);
    if (!preset) return;
    if (preset.type === 'bell') playBellNote(preset.note);
    else playDrumSound(preset.note);
  }, [initAudioContext, playBellNote, playDrumSound]);

  // Direct tap on the drum kit visual — kids fire individual drum hits without
  // needing to use the sequencer grid. Same audio path as the loop player.
  const handleDrumTap = useCallback((drumId) => {
    initAudioContext();
    playDrumSound(drumId);
  }, [initAudioContext, playDrumSound]);

  // Direct tap on a turntable record — fires the matching scratch sample and
  // briefly halts the record spin via the existing `activeHits` mechanism.
  const handleScratchTap = useCallback((scratchId) => {
    initAudioContext();
    playDrumSound(scratchId);
    setActiveHits((prev) => {
      const next = new Set(prev);
      next.add(scratchId);
      return next;
    });
    setTimeout(() => {
      setActiveHits((prev) => {
        const next = new Set(prev);
        next.delete(scratchId);
        return next;
      });
    }, 200);
  }, [initAudioContext, playDrumSound]);

  const playStep = useCallback((step) => {
    const currentGrid = gridRef.current;
    const muted = mutedRef.current;
    const scratchHits = new Set();
    Object.entries(currentGrid).forEach(([trackId, steps]) => {
      if (muted.has(trackId)) return;
      if (steps[step]) {
        const preset = TRACK_PRESETS.find(p => p.id === trackId);
        if (preset?.type === 'bell') {
          playBellNote(preset.note);
        }
        else if (preset?.type === 'drum') {
          playDrumSound(preset.note);
          // Only flash kick & snare visually — cymbal/tom frame swaps have
          // been unreliable in the loop context, so we prefer "static but clean"
          // over "glitchy". Per user preference.
          if (drumKitRef.current && (preset.note === 'kick' || preset.note === 'snare')) {
            drumKitRef.current.flash(preset.note);
          }
        }
        else if (preset?.type === 'scratch') {
          playDrumSound(preset.note);
          scratchHits.add(preset.note);
        }
      }
    });
    // Scratch hits still use state because the turntable records animate continuously
    setActiveHits(scratchHits);
    setTimeout(() => { setActiveHits(new Set()); }, 100);
  }, [playBellNote, playDrumSound]);

  const togglePlay = useCallback(() => {
    initAudioContext();
    if (isPlaying) {
      clearInterval(intervalRef.current);
      setIsPlaying(false);
      setCurrentStep(-1);
    } else {
      setIsPlaying(true);
      // 🥁 Beat Builder achievement — playing any loop = Cadet
      earnAchievement('beat', 'cadet');
      // Count active tracks (any track with at least one hit) for the Pro tier
      const activeTrackCount = Object.values(gridRef.current).filter(steps => steps.some(s => s)).length;
      if (activeTrackCount >= 3) earnAchievementUpTo('beat', 'pro');
      if (activeTrackCount >= 4 && bpm >= 140) earnAchievementUpTo('beat', 'master');
      // Track play count for Surf Charlie (3 loops played)
      try {
        const n = parseInt(localStorage.getItem('jma_loops_played_v1') || '0', 10) + 1;
        localStorage.setItem('jma_loops_played_v1', String(n));
        if (n >= 3) earnSticker('fit_charlie_surf');
      } catch (_) {}
      // Disco Charlie for fast loops
      if (bpm >= 140) earnSticker('fit_charlie_disco');
      // DMC Charlie for drum-heavy loops (3+ drum tracks with at least one hit each)
      const drumTracksActive = Object.entries(gridRef.current).filter(([tid, steps]) =>
        tid.startsWith('drum_') && steps.some(s => s)
      ).length;
      if (drumTracksActive >= 3) earnSticker('fit_charlie_rundmc');
      // Start tracking for Disco Chunk (30s of playing)
      const startTs = Date.now();
      setTimeout(() => {
        if (Date.now() - startTs >= 30000) earnSticker('fit_chunk_disco');
      }, 30000);
      let step = 0;
      const msPerStep = (60 / bpm / 4) * 1000;
      playStep(0);
      setCurrentStep(0);
      intervalRef.current = setInterval(() => {
        step = (step + 1) % totalStepsRef.current;
        setCurrentStep(step);
        playStep(step);
      }, msPerStep);
    }
  }, [isPlaying, bpm, initAudioContext, playStep]);

  useEffect(() => {
    if (!isPlaying) return;
    clearInterval(intervalRef.current);
    let step = currentStep;
    const msPerStep = (60 / bpm / 4) * 1000;
    intervalRef.current = setInterval(() => {
      step = (step + 1) % totalStepsRef.current;
      setCurrentStep(step);
      playStep(step);
    }, msPerStep);
    return () => clearInterval(intervalRef.current);
  }, [bpm, totalSteps]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  // Spacebar = play/stop, ignored when typing in inputs
  useEffect(() => {
    const onKey = (e) => {
      if (e.code !== 'Space') return;
      const tag = (e.target && e.target.tagName) || '';
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target && e.target.isContentEditable)) return;
      e.preventDefault();
      togglePlay();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [togglePlay]);

  const loadPreset = useCallback((presetName) => {
    const preset = LOOP_PRESETS[presetName];
    if (!preset) return;
    const trackIds = Object.keys(preset);
    setActiveTracks(prev => sortTracks([...new Set([...prev, ...trackIds])]));
    setGrid(prev => {
      const newGrid = { ...prev };
      Object.entries(preset).forEach(([trackId, steps]) => {
        // Extend pattern to fill current totalSteps by repeating
        const extended = [];
        for (let i = 0; i < totalSteps; i++) {
          extended.push(steps[i % steps.length]);
        }
        newGrid[trackId] = extended;
      });
      return newGrid;
    });
  }, [totalSteps]);

  const clearAll = useCallback(() => {
    setGrid(prev => {
      const newGrid = {};
      Object.keys(prev).forEach(k => { newGrid[k] = new Array(totalSteps).fill(0); });
      return newGrid;
    });
  }, [totalSteps]);

  const toggleMute = useCallback((trackId) => {
    setMutedTracks(prev => {
      const s = new Set(prev);
      if (s.has(trackId)) s.delete(trackId); else s.add(trackId);
      return s;
    });
  }, []);

  const addTrack = useCallback((trackId) => {
    if (!activeTracks.includes(trackId)) {
      setActiveTracks(prev => sortTracks([...prev, trackId]));
    }
  }, [activeTracks]);

  const removeTrack = useCallback((trackId) => {
    setActiveTracks(prev => prev.filter(t => t !== trackId));
    setGrid(prev => { const g = { ...prev }; delete g[trackId]; return g; });
  }, []);

  // Handle measure change
  const changeMeasures = useCallback((newSteps) => {
    if (isPlaying) {
      clearInterval(intervalRef.current);
      setIsPlaying(false);
      setCurrentStep(-1);
    }
    setTotalSteps(newSteps);
    // Extend or trim grid
    setGrid(prev => {
      const newGrid = {};
      Object.entries(prev).forEach(([trackId, steps]) => {
        if (steps.length < newSteps) {
          // Repeat pattern to fill
          const extended = [];
          for (let i = 0; i < newSteps; i++) extended.push(steps[i % steps.length]);
          newGrid[trackId] = extended;
        } else {
          newGrid[trackId] = steps.slice(0, newSteps);
        }
      });
      return newGrid;
    });
  }, [isPlaying]);

  const availableTracks = TRACK_PRESETS.filter(t => !activeTracks.includes(t.id));
  const measureBars = totalSteps / 16;

  return (
    <div
      className="min-h-screen relative overflow-hidden"
      data-testid="loop-studio-page"
      style={{
        background:
          'radial-gradient(circle at 50% 10%, #1F3352 0%, #0A1626 75%)',
      }}
    >
      <GameHeader title="Beat Lab" showHomeButton={true} backLink={{ to: '/create', label: 'Create' }} />
      <FullscreenButton />
      <RoomCharacters room="beat-lab" />

      {/* Subtle dot-grid texture on the room bg for studio ambience. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            'radial-gradient(rgba(97, 232, 218, 0.22) 1.2px, transparent 1.2px)',
          backgroundSize: '24px 24px',
          opacity: 0.35,
        }}
      />

      <main className="relative flex-1 pt-24 md:pt-28 lg:pt-28 pb-6 px-2 md:px-4">
        {/* Landscape phones have short viewports; the fixed GameHeader
            back-button sits at top-left and used to visually overlap
            the Play button of the deck's transport row. Extra top
            padding + a small left inset on the deck below keeps the
            controls clear of the back pill in any orientation. */}
        {/* THE DECK — one cohesive piece of cartoon studio hardware that
            holds the transport, the sequencer, and the instruments. All
            existing state and handlers untouched; this is a re-skin only. */}
        <div
          className="max-w-6xl mx-auto rounded-[32px] border-[3px] p-3 md:p-5 relative"
          style={{
            background:
              'linear-gradient(180deg, #3A557A 0%, #1E2F44 100%)',
            borderColor: '#050C18',
            boxShadow:
              '0 10px 0 rgba(0,0,0,0.35), inset 0 3px 0 rgba(255,255,255,0.08), inset 0 -6px 0 rgba(0,0,0,0.35)',
            // Nudge the deck right of the fixed back-button pill on
            // narrow landscape viewports so the two never overlap.
            marginLeft: 'max(0px, env(safe-area-inset-left))',
          }}
        >
          {/* Name tag if player has entered a name — the star + shield
              decals were removed after beta testing (§B cleanup). */}
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden rounded-[32px]">
            {playerName && (
              <div
                className="absolute"
                style={{ bottom: 10, left: 22, transform: 'rotate(-6deg)', filter: 'drop-shadow(0 2px 0 rgba(0,0,0,0.35))' }}
              >
                <div
                  className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded"
                  style={{ background: '#61E8DA', color: '#0A1626', border: '2px solid #0A1626' }}
                >
                  Made by {playerName}
                </div>
              </div>
            )}
          </div>
          {/* --- TOP STRIP: TRANSPORT + LCD + REC --- */}
          <div
            className="rounded-2xl border-2 p-2.5 md:p-3 flex flex-wrap items-center gap-2 md:gap-3"
            style={{
              background: 'linear-gradient(180deg, #1B2A3F 0%, #0F1A2E 100%)',
              borderColor: '#000',
              boxShadow: 'inset 0 2px 0 rgba(255,255,255,0.05)',
            }}
          >
            {/* Play / Stop hero button */}
            <motion.button
              data-testid="loop-play-button"
              onClick={togglePlay}
              whileTap={{ scale: 0.9 }}
              whileHover={{ scale: 1.03 }}
              className="flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-lg md:text-xl"
              style={{
                backgroundColor: isPlaying ? '#FF3B30' : '#4CD964',
                color: '#0A1626',
                border: '3px solid #000',
                boxShadow:
                  '0 5px 0 rgba(0,0,0,0.6), inset 0 -3px 0 rgba(0,0,0,0.25), inset 0 2px 0 rgba(255,255,255,0.45)',
                minWidth: 130,
              }}
            >
              {isPlaying ? <Square className="w-6 h-6" /> : <Play className="w-6 h-6" />}
              {isPlaying ? 'STOP' : 'PLAY'}
            </motion.button>

            {/* LCD readout — BPM / STEP / BARS */}
            <div
              className="rounded-lg px-3 py-1.5 flex items-center gap-3"
              style={{
                background: '#061019',
                border: '2px solid #000',
                color: '#61E8DA',
                fontFamily: 'ui-monospace, Menlo, monospace',
                boxShadow: 'inset 0 0 12px rgba(97,232,218,0.15)',
                minWidth: 176,
              }}
            >
              <div className="flex flex-col items-center leading-tight">
                <span className="text-[9px] uppercase opacity-70">BPM</span>
                <span className="text-base md:text-lg font-bold tabular-nums">{String(bpm).padStart(3, '0')}</span>
              </div>
              <div className="w-px h-8" style={{ background: '#61E8DA', opacity: 0.3 }} />
              <div className="flex flex-col items-center leading-tight" style={{ minWidth: 84 }}>
                <span className="text-[9px] uppercase opacity-70">{isPlaying ? 'STEP' : 'STATUS'}</span>
                <span className="text-base md:text-lg font-bold tabular-nums">
                  {isPlaying && currentStep >= 0
                    ? `${String(currentStep + 1).padStart(2, '0')}/${totalSteps}`
                    : IDLE_MESSAGES[idleMsgIndex]}
                </span>
              </div>
              <div className="hidden sm:block w-px h-8" style={{ background: '#61E8DA', opacity: 0.3 }} />
              <div className="hidden sm:flex flex-col items-center leading-tight">
                <span className="text-[9px] uppercase opacity-70">BARS</span>
                <span className="text-base md:text-lg font-bold tabular-nums">{totalSteps / 16}</span>
              </div>
            </div>

            {/* BPM +/- */}
            <div className="flex items-center gap-1">
              <button
                className="w-9 h-9 rounded-lg flex items-center justify-center"
                style={{
                  background: '#3E5471',
                  color: '#E8F4FF',
                  border: '2px solid #000',
                  boxShadow: '0 3px 0 rgba(0,0,0,0.55)',
                }}
                onClick={() => setBpm(b => Math.max(60, b - 10))}
                data-testid="bpm-minus"
              >
                <Minus className="w-4 h-4" />
              </button>
              <button
                className="w-9 h-9 rounded-lg flex items-center justify-center"
                style={{
                  background: '#3E5471',
                  color: '#E8F4FF',
                  border: '2px solid #000',
                  boxShadow: '0 3px 0 rgba(0,0,0,0.55)',
                }}
                onClick={() => setBpm(b => Math.min(200, b + 10))}
                data-testid="bpm-plus"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* Bars selector — pill segmented control */}
            <div
              className="flex items-center gap-0.5 rounded-lg p-0.5"
              style={{ background: '#3E5471', border: '2px solid #000' }}
            >
              {MEASURE_OPTIONS.map(opt => (
                <button
                  key={opt.steps}
                  data-testid={`measure-${opt.steps}`}
                  onClick={() => changeMeasures(opt.steps)}
                  className="px-2.5 py-1 rounded text-xs font-black"
                  style={{
                    background: totalSteps === opt.steps ? '#61E8DA' : 'transparent',
                    color: totalSteps === opt.steps ? '#0A1626' : '#E8F4FF',
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Clear — needs enough horizontal room for the "CLEAR" label
                (was w-9 h-9 fixed square which pushed the text outside
                the button on some screens). Auto-width w/ chunky padding
                keeps the pill visually balanced against BPM +/- next to
                it. */}
            <button
              className="h-9 px-3 rounded-lg flex items-center justify-center"
              style={{
                background: '#3E5471',
                color: '#FF6B6B',
                border: '2px solid #000',
                boxShadow: '0 3px 0 rgba(0,0,0,0.55)',
              }}
              onClick={clearAll}
              data-testid="clear-all"
              title="Clear all"
            >
              <span className="text-[10px] md:text-xs font-black uppercase tracking-wider">Clear</span>
            </button>

            <div className="flex-1 min-w-0" />

            {/* REC / STOP / DL */}
            <div className="flex items-center gap-1">
              {!recorder.isRecording ? (
                <button
                  data-testid="loop-record-btn"
                  className="px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-xs md:text-sm font-black"
                  style={{
                    background: '#FF3B30',
                    color: '#fff',
                    border: '2px solid #000',
                    boxShadow: '0 3px 0 rgba(0,0,0,0.55)',
                  }}
                  onClick={() => { initAudioContext(); recorder.start(); }}
                  disabled={recorder.isProcessing}
                >
                  <Circle className="w-3 h-3 fill-current" /> REC
                </button>
              ) : (
                <button
                  data-testid="loop-stop-rec-btn"
                  className="px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-xs md:text-sm font-black animate-pulse"
                  style={{
                    background: '#0A1626',
                    color: '#fff',
                    border: '2px solid #FF3B30',
                    boxShadow: '0 3px 0 rgba(0,0,0,0.55)',
                  }}
                  onClick={async () => { await recorder.stop(); }}
                >
                  <Square className="w-3 h-3 fill-current" /> STOP {recorder.secondsLeft}s
                </button>
              )}
              {recorder.isProcessing && (
                <span className="text-[10px] font-bold opacity-70 text-white">Saving...</span>
              )}
              {recorder.lastMp3Url && !recorder.isRecording && !recorder.isProcessing && (
                <button
                  data-testid="loop-download-mp3"
                  className="px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-xs md:text-sm font-black"
                  style={{
                    background: '#4CD964',
                    color: '#0A1626',
                    border: '2px solid #000',
                    boxShadow: '0 3px 0 rgba(0,0,0,0.55)',
                  }}
                  onClick={() => recorder.download(`my-loop-${Date.now()}.mp3`)}
                >
                  <Download className="w-3 h-3" /> MP3
                </button>
              )}
            </div>
          </div>

          {/* --- PRESET STRIP — sticker-style pill chips, each rotated a
               different tiny angle so the row feels hand-placed. --- */}
          <div className="mt-3 relative">
            <div className="flex gap-2 flex-wrap justify-center">
              {Object.keys(LOOP_PRESETS).map((name, i) => {
                const stickerColors = ['#FFCC00', '#FF6B6B', '#4CD964', '#61E8DA', '#FF9500', '#AF52DE'];
                const bg = stickerColors[i % stickerColors.length];
                const rot = ((i * 37) % 5) - 2; // -2..+2 deg pseudo-random
                return (
                  <button
                    key={name}
                    data-testid={`preset-${name.replace(/\s/g, '-')}`}
                    className="px-3 py-1.5 rounded-full text-xs font-black"
                    style={{
                      background: bg,
                      color: '#0A1626',
                      border: '2px solid #0A1626',
                      boxShadow: '0 2px 0 rgba(0,0,0,0.55), inset 0 -2px 0 rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.4)',
                      transform: `rotate(${rot}deg)`,
                    }}
                    onClick={() => loadPreset(name)}
                  >
                    {name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* --- SEQUENCER PAD MATRIX --- */}
          <div
            className="mt-3 rounded-2xl border-2 p-2.5 md:p-3"
            style={{
              background: 'linear-gradient(180deg, #0F1A2E 0%, #0A1424 100%)',
              borderColor: '#000',
              boxShadow: 'inset 0 3px 0 rgba(0,0,0,0.35), inset 0 -2px 0 rgba(255,255,255,0.03)',
            }}
          >
            <div className="flex gap-1">
              {/* Frozen label column */}
              <div className="w-24 md:w-32 flex-shrink-0 flex flex-col gap-1">
                <div className="h-3.5" aria-hidden="true" />
                {activeTracks.map(trackId => {
                  const preset = TRACK_PRESETS.find(p => p.id === trackId);
                  const isMuted = mutedTracks.has(trackId);
                  return (
                    <div
                      key={`label-${trackId}`}
                      className="h-9 md:h-11 flex items-center gap-1.5"
                      data-testid={`track-label-${trackId}`}
                    >
                      <button
                        className="w-5 h-5 rounded-full flex-shrink-0"
                        style={{
                          background: preset?.color,
                          boxShadow: isMuted ? 'inset 0 0 6px rgba(0,0,0,0.7)' : `0 0 10px ${preset?.color}`,
                          opacity: isMuted ? 0.4 : 1,
                          border: '1.5px solid rgba(0,0,0,0.7)',
                        }}
                        onClick={() => previewSound(trackId)}
                        data-testid={`preview-${trackId}`}
                        title={`Preview ${preset?.label}`}
                      />
                      <button
                        className="px-2 py-1 rounded-lg text-xs md:text-sm font-black truncate flex-1"
                        style={{
                          background: isMuted ? '#131F30' : '#243854',
                          color: isMuted ? '#5E7899' : '#E8F4FF',
                          border: `2px solid ${preset?.color}`,
                        }}
                        onClick={() => toggleMute(trackId)}
                        data-testid={`mute-${trackId}`}
                      >
                        {preset?.label}
                      </button>
                      <button
                        className="text-sm opacity-40 hover:opacity-90 flex-shrink-0 text-white"
                        onClick={() => removeTrack(trackId)}
                        aria-label={`Remove ${preset?.label}`}
                      >
                        ×
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Grid scroll area */}
              <div className="flex-1 overflow-x-auto">
                <div className="flex flex-col gap-1" style={{ minWidth: totalSteps > 16 ? `${totalSteps * 20}px` : '100%' }}>
                  {/* Step indicator */}
                  <div className="flex">
                    {Array.from({ length: totalSteps }, (_, i) => (
                      <div
                        key={i}
                        className="text-center"
                        style={{ minWidth: totalSteps > 16 ? '20px' : 'auto', flex: totalSteps <= 16 ? 1 : 'none' }}
                      >
                        <div
                          className="w-2 h-2 mx-auto rounded-full"
                          style={{
                            background: currentStep === i && isPlaying ? '#FFCC00' : 'rgba(255,255,255,0.14)',
                            boxShadow: currentStep === i && isPlaying ? '0 0 10px #FFCC00' : 'none',
                          }}
                        />
                        {i % 16 === 0 && totalSteps > 16 && (
                          <span className="text-[8px] font-bold opacity-40" style={{ color: '#61E8DA' }}>{Math.floor(i / 16) + 1}</span>
                        )}
                      </div>
                    ))}
                  </div>
                  {/* Track pad rows */}
                  {activeTracks.map(trackId => {
                    const preset = TRACK_PRESETS.find(p => p.id === trackId);
                    const steps = grid[trackId] || new Array(totalSteps).fill(0);
                    const isMuted = mutedTracks.has(trackId);
                    return (
                      <div
                        key={`steps-${trackId}`}
                        className="flex gap-[2px]"
                        data-testid={`track-${trackId}`}
                      >
                        {steps.slice(0, totalSteps).map((active, stepIdx) => (
                          <button
                            key={stepIdx}
                            data-testid={`cell-${trackId}-${stepIdx}`}
                            className={`loop-grid-cell h-9 md:h-11 ${active ? 'active' : ''} ${currentStep === stepIdx && isPlaying ? 'playing' : ''}`}
                            style={{
                              minWidth: totalSteps > 16 ? '22px' : 'auto',
                              flex: totalSteps <= 16 ? 1 : 'none',
                              backgroundColor: active ? (preset?.color || '#ccc') : (stepIdx % 4 === 0 ? '#243854' : '#1B2A3F'),
                              opacity: isMuted ? 0.35 : 1,
                              color: preset?.color,
                              borderLeft: stepIdx % 16 === 0 && stepIdx > 0 ? '2px solid #61E8DA' : undefined,
                            }}
                            onClick={() => toggleCell(trackId, stepIdx)}
                          />
                        ))}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Add-track chip strip */}
            {availableTracks.length > 0 && (
              <div className="mt-3 pt-3 flex flex-wrap gap-1.5" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                <span className="text-[10px] font-black uppercase tracking-wider opacity-50 self-center mr-1" style={{ color: '#61E8DA' }}>+ Add</span>
                {availableTracks.map(track => (
                  <div key={track.id} className="flex items-center gap-0.5">
                    <button
                      className="w-4 h-4 rounded-full flex-shrink-0"
                      style={{ background: track.color, boxShadow: `0 0 6px ${track.color}`, border: '1px solid rgba(0,0,0,0.6)' }}
                      onClick={() => previewSound(track.id)}
                      title={`Preview ${track.label}`}
                    />
                    <button
                      className="px-2 py-1 rounded-md text-[10px] md:text-xs font-black"
                      style={{
                        background: 'transparent',
                        color: '#E8F4FF',
                        border: `1.5px dashed ${track.color}`,
                      }}
                      onClick={() => addTrack(track.id)}
                      data-testid={`add-track-${track.id}`}
                    >
                      {track.label}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* --- GEAR SLOTS: drum kit + turntable, docked into the deck.
               Each slot has a peeking RUNDMC mascot poking up from behind
               the header to warm the whole thing up. --- */}
          {/* --- GEAR SLOTS: drum kit + turntable, each staged like a
               mini-scene where the character stands SIDE-BY-SIDE with
               their instrument on a shared floor plane. Reactive speech
               bubble reflects how many pads the kid has placed. --- */}
          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Compute total active pads for reactive character copy */}
            {(() => { return null; })()}
            <div
              className="rounded-3xl border-2 p-3 relative"
              style={{
                background: 'linear-gradient(180deg, #2C4664 0%, #2C4664 62%, #1B2B44 62%, #16243A 100%)',
                borderColor: '#000',
                boxShadow: 'inset 0 3px 0 rgba(0,0,0,0.4), inset 0 -3px 0 rgba(255,255,255,0.04)',
                minHeight: 260,
              }}
            >
              <div
                className="absolute top-2 left-3 text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full z-10"
                style={{ color: '#0A1626', background: '#61E8DA', border: '2px solid #0A1626' }}
              >
                DRUM KIT
              </div>
              {/* Soft floor shadow that both Charlie and the kit sit on. */}
              <div
                aria-hidden="true"
                className="absolute pointer-events-none"
                style={{
                  left: '8%',
                  right: '8%',
                  bottom: 10,
                  height: 16,
                  borderRadius: '50%',
                  background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.55), transparent 70%)',
                  zIndex: 1,
                }}
              />
              {/* Speech bubble anchored above Charlie's head. Hidden on
                  phones where Charlie is also hidden — the bubble would
                  otherwise float orphaned in the top-left corner. */}
              {!isPlaying && (
                <motion.div
                  aria-hidden="true"
                  className="absolute pointer-events-none z-[6] hidden md:block"
                  style={{ top: 30, left: '4%' }}
                  initial={{ opacity: 0, scale: 0.7 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  <div
                    className="text-[11px] font-black uppercase tracking-wide px-3 py-1.5 relative"
                    style={{
                      background: '#FFF',
                      color: '#0A1626',
                      border: '2.5px solid #0A1626',
                      borderRadius: 14,
                      boxShadow: '0 3px 0 rgba(0,0,0,0.35)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {(() => {
                      const total = Object.values(grid).reduce((s, arr) => s + (Array.isArray(arr) ? arr.filter(v => v).length : 0), 0);
                      if (total === 0) return IDLE_MESSAGES[idleMsgIndex];
                      if (total < 4) return 'NICE!';
                      if (total < 10) return 'COOL BEAT!';
                      return "YOU'RE A DJ!";
                    })()}
                    <span className="absolute" style={{ left: 18, bottom: -8, width: 0, height: 0, borderLeft: '8px solid transparent', borderRight: '8px solid transparent', borderTop: '10px solid #0A1626' }} />
                    <span className="absolute" style={{ left: 20, bottom: -5, width: 0, height: 0, borderLeft: '6px solid transparent', borderRight: '6px solid transparent', borderTop: '8px solid #FFF' }} />
                  </div>
                </motion.div>
              )}
              {/* Character + instrument staged on the same floor. */}
              <div className="flex items-end justify-center gap-2 md:gap-3 pt-10 pb-5 relative z-[2] px-2">
                <CharlieMascot isPlaying={isPlaying} bpm={bpm} />
                <div className="flex-shrink-0">
                  <DrumKitVisual ref={drumKitRef} onHit={handleDrumTap} />
                </div>
              </div>
            </div>

            <div
              className="rounded-3xl border-2 p-3 relative"
              style={{
                background: 'linear-gradient(180deg, #2C4664 0%, #2C4664 62%, #1B2B44 62%, #16243A 100%)',
                borderColor: '#000',
                boxShadow: 'inset 0 3px 0 rgba(0,0,0,0.4), inset 0 -3px 0 rgba(255,255,255,0.04)',
                minHeight: 260,
              }}
            >
              <div
                className="absolute top-2 left-3 text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full z-10"
                style={{ color: '#0A1626', background: '#61E8DA', border: '2px solid #0A1626' }}
              >
                TURNTABLE
              </div>
              <div
                aria-hidden="true"
                className="absolute pointer-events-none"
                style={{
                  left: '8%',
                  right: '8%',
                  bottom: 10,
                  height: 16,
                  borderRadius: '50%',
                  background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.55), transparent 70%)',
                  zIndex: 1,
                }}
              />
              <div className="flex items-end justify-center gap-2 md:gap-3 pt-10 pb-5 relative z-[2] px-2">
                <SharkyMascot isPlaying={isPlaying} bpm={bpm} />
                <div className="flex-shrink-0">
                  <TurntableVisual activeHits={activeHits} onScratch={handleScratchTap} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default LoopStudioPage;
