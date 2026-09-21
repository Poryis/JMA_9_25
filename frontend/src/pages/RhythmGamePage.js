import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Play, Trophy, Zap, Drum, Music2, Star, Sparkles, Flame, Leaf } from 'lucide-react';
import { BELLS, KEY_TO_NOTE } from '../components/JellyBells';
import { GameHeader, FeedbackPopup, ProgressBar } from '../components/GameUI';
import { PageCharacters } from '../components/PageCharacters';
import RoomCharacters from '../components/RoomCharacters';
import { FullscreenButton } from '../components/FullscreenButton';
import useAudio from '../hooks/useAudio';
import { earnSticker, earnAchievement, earnAchievementUpTo } from '../hooks/useStickers';
import { SONG_LIBRARY, SPEED_SETTINGS, getSongsByCategory } from '../data/songs';
import { getHighScore, saveHighScore, getTopScores } from '../hooks/useScores';
import useNoteNames, { formatNoteName } from '../hooks/useNoteNames';

const NOTE_ORDER = ['C', 'D', 'E', 'F', 'G', 'A', 'B', 'High C'];

// Per-category visual styling for the song cards.
const CATEGORY_STYLE = {
  'JMA Originals': { icon: Star,      tint: '#FFCC00', accent: '#F39C12', label: 'JMA ORIGINALS' },
  'Classic':       { icon: Music2,    tint: '#AF52DE', accent: '#5E2D8C', label: 'CLASSIC' },
  'Mini Jams':     { icon: Sparkles,  tint: '#FF6BAA', accent: '#C7367C', label: 'MINI JAMS' },
};

// Per-speed icon
const SPEED_ICON = { chill: Leaf, normal: Music2, turbo: Flame };

// Drum-mode lanes: same falling-note machinery, but the targets at the bottom
// are drum images, kid plays drum sounds, and the keyboard map uses simpler keys.
const DRUM_LANES = {
  kick:  { label: 'Kick',   short: 'KICK',  key: 'Z', color: '#3498DB', img1: 'assets/drums/kICK 1.png',   img2: 'assets/drums/kICK 2.png' },
  snare: { label: 'Snare',  short: 'SNARE', key: 'X', color: '#FFCC00', img1: 'assets/drums/Snare 1.png',  img2: 'assets/drums/Snare 2.png' },
  hihat: { label: 'Hi-Hat', short: 'HAT',   key: 'C', color: '#34A853', img1: 'assets/drums/Hi hat 1.png', img2: 'assets/drums/Hi hat 2.png' },
  crash: { label: 'Crash',  short: 'CRASH', key: 'V', color: '#FF3B30', img1: 'assets/drums/Crash 1.png',  img2: 'assets/drums/Crash 2.png' },
};
const DRUM_ORDER = ['kick', 'snare', 'hihat', 'crash'];
const DRUM_KEY_TO_NOTE = Object.fromEntries(
  Object.entries(DRUM_LANES).flatMap(([id, info]) => [
    [info.key.toLowerCase(), id],
    [info.key.toUpperCase(), id],
  ])
);

// Falling note - works for both bell (note string like 'C') and drum (id like 'kick')
// Forwards its motion.div ref to the parent via `registerRef(noteId, ref)` so the
// parent can measure the actual on-screen position at the moment of tap. The
// halo timing is also driven by the parent's measured `glowDelayMs` (it knows
// where the target bell sits on this device, so the glow peaks at the visual
// overlap moment regardless of screen size).
function FallingBellNote({ note, noteId, laneIndex, totalLanes, speed, isDrum, registerRef, glowDelayMs, glowDurationMs }) {
  const lane = isDrum ? DRUM_LANES[note] : null;
  const bell = isDrum ? null : BELLS.find(b => b.note === note);
  const img = isDrum ? lane?.img1 : bell?.image1;
  const label = isDrum ? lane?.short : (bell ? formatNoteName(bell.note, bell.solfege) : '');
  const color = isDrum ? lane?.color : bell?.color;
  const laneWidth = 100 / totalLanes;
  const elRef = useRef(null);

  useEffect(() => {
    if (registerRef) registerRef(noteId, elRef);
    return () => { if (registerRef) registerRef(noteId, null); };
  }, [noteId, registerRef]);

  return (
    <motion.div
      ref={elRef}
      className="absolute flex flex-col items-center"
      style={{
        left: `${laneIndex * laneWidth + laneWidth / 2}%`,
        transform: 'translateX(-50%)',
        pointerEvents: 'none',
      }}
      initial={{ top: -80 }}
      animate={{ top: 'calc(100% + 80px)' }}
      transition={{ duration: speed / 1000, ease: 'linear' }}
    >
      <div className="relative">
        <div
          className="bell-tap-now-halo"
          style={{
            '--glow-delay': `${glowDelayMs}ms`,
            '--glow-duration': `${glowDurationMs}ms`,
          }}
        />
        <img
          src={img}
          alt={label}
          className="relative w-10 h-12 md:w-12 md:h-14 object-contain drop-shadow-md"
          draggable={false}
        />
      </div>
      <span className="text-xs font-bold mt-0.5 px-1.5 rounded-full text-white"
        style={{ backgroundColor: color, textShadow: '1px 1px 0 rgba(0,0,0,0.3)' }}>
        {label}
      </span>
    </motion.div>
  );
}

function RhythmGamePage({ score, setScore, gameStats, setGameStats, resetGame }) {
  const { nameFor } = useNoteNames();
  const navigate = useNavigate();
  const { playBellNote, playDrumSound, playFeedbackSound, initAudioContext } = useAudio();

  const [gameState, setGameState] = useState('menu');
  const [selectedSong, setSelectedSong] = useState(SONG_LIBRARY[0]);
  const [speed, setSpeed] = useState('normal');
  const [showHighScores, setShowHighScores] = useState(false);
  const [fallingNotes, setFallingNotes] = useState([]);
  const [currentNoteIndex, setCurrentNoteIndex] = useState(0);
  const [feedback, setFeedback] = useState(null);
  const [isNewRecord, setIsNewRecord] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('JMA Originals');

  const gameLoopRef = useRef(null);
  const noteIdRef = useRef(0);
  const fallingNotesRef = useRef([]);
  const audioRef = useRef(null); // Backing track <audio> element for JMA Originals
  // Imperative refs for instant bell frame swap (no React render involved)
  const bellImgRefs = useRef({});
  const pressedKeysRef = useRef(new Set()); // dedup keyboard repeats
  // DOM refs to each in-flight FallingBellNote so we can measure its actual
  // on-screen Y at the moment of tap (position-based hit detection — what you
  // see is what you get, no fragile time math).
  const fallingNoteRefs = useRef({});
  const registerFallingRef = useCallback((id, ref) => {
    if (ref) fallingNoteRefs.current[id] = ref;
    else delete fallingNoteRefs.current[id];
  }, []);

  const speedConfig = SPEED_SETTINGS[speed];
  // If the selected song has a bpm, override spawn interval to sync to the music.
  // Each song has its own `beatsPerNote` base rate (default 2 = half notes).
  // Difficulty speeds scale this: chill = 2x (slower), normal = 1x, turbo = 0.5x (faster).
  const effectiveSpawnMs = useMemo(() => {
    if (selectedSong.bpm) {
      const msPerBeat = 60000 / selectedSong.bpm;
      const baseBeats = selectedSong.beatsPerNote ?? 2;
      const difficultyMult = { chill: 2, normal: 1, turbo: 0.5 }[speed] || 1;
      return Math.round(msPerBeat * baseBeats * difficultyMult);
    }
    return speedConfig.ms;
  }, [selectedSong.bpm, selectedSong.beatsPerNote, speed, speedConfig.ms]);
  const songCategories = useMemo(() => getSongsByCategory(), []);
  // Show only the three top-level categories — no "All", and "Game" tracks
  // have been removed entirely from the library.
  const categories = Object.keys(songCategories).filter((c) => c in CATEGORY_STYLE);

  // Rhythm Arcade hides jamOnly tracks (drum loops with no melody).
  const baseSongs = SONG_LIBRARY.filter((s) => !s.jamOnly);
  const filteredSongs = baseSongs.filter((s) => s.category === categoryFilter);

  const isDrumMode = selectedSong.instrumentMode === 'drums';

  const activeBells = useMemo(() => {
    // Filter out nulls (rests) before computing unique notes/drums needed.
    const unique = [...new Set(selectedSong.notes.filter(n => n != null))];
    if (isDrumMode) {
      return unique.sort((a, b) => DRUM_ORDER.indexOf(a) - DRUM_ORDER.indexOf(b));
    }
    return unique.sort((a, b) => NOTE_ORDER.indexOf(a) - NOTE_ORDER.indexOf(b));
  }, [selectedSong.notes, isDrumMode]);

  useEffect(() => { fallingNotesRef.current = fallingNotes; }, [fallingNotes]);

  const startGame = useCallback(() => {
    initAudioContext();
    resetGame();
    setGameState('playing');
    setCurrentNoteIndex(0);
    setFallingNotes([]);
    noteIdRef.current = 0;
    setIsNewRecord(false);
  }, [initAudioContext, resetGame]);

  // Play / stop backing track. Audio starts IMMEDIATELY (fading in while notes are
  // delayed). The note-spawn effect below waits FADE_IN_MS before starting so the
  // first note lands after the fade-in completes.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !selectedSong.audioUrl) return;
    if (gameState === 'playing') {
      audio.currentTime = 0;
      audio.volume = 0.7;
      audio.play().catch(() => {});
      return () => { audio.pause(); };
    } else {
      audio.pause();
      audio.currentTime = 0;
    }
  }, [gameState, selectedSong.audioUrl, speedConfig.fallSpeed]);

  const handlePlayNote = useCallback((tappedNote) => {
    if (isDrumMode) {
      playDrumSound(tappedNote);
    } else {
      playBellNote(tappedNote);
    }
    const currentNotes = fallingNotesRef.current;
    // Super forgiving: any un-hit note of the matching pitch on screen counts as a hit.
    const matchingNote = currentNotes.find(n => n.note === tappedNote && !n.hit);

    if (matchingNote) {
      // Position-based hit detection. We measure the actual on-screen vertical
      // distance between the FALLING bell's center and the STATIC target bell's
      // center. Closer = better. This is screen-size agnostic and matches
      // exactly what the kid sees — no magic timing constants.
      const fallingRef = fallingNoteRefs.current[matchingNote.id];
      const targetEl = bellImgRefs.current[tappedNote]?.current;
      let tier = 'good', points = 50, distance = 9999;
      if (fallingRef?.current && targetEl) {
        const fRect = fallingRef.current.getBoundingClientRect();
        const tRect = targetEl.getBoundingClientRect();
        const fCenter = fRect.top + fRect.height / 2;
        const tCenter = tRect.top + tRect.height / 2;
        distance = Math.abs(fCenter - tCenter);
        // PERFECT = the bells visually overlap (within ~40 % of the target
        // bell's height). GREAT = falling bell is within a target-bell-radius
        // of the target. GOOD = anything else on screen (forgiving).
        const targetH = tRect.height || 100;
        if (distance <= targetH * 0.40) { tier = 'perfect'; points = 100; }
        else if (distance <= targetH * 0.90) { tier = 'great'; points = 75; }
      }

      // Lock-in flash: on PERFECT, briefly flare the static target bell — kids
      // see the falling bell "snap" onto the target. Class toggle via ref, no
      // React render. The reflow read restarts the animation on rapid PERFECTs.
      if (tier === 'perfect') {
        const refs = bellImgRefs.current[matchingNote.note];
        if (refs?.lockEl) {
          refs.lockEl.classList.remove('bell-lock-in-active');
          // eslint-disable-next-line no-unused-expressions
          refs.lockEl.offsetHeight;
          refs.lockEl.classList.add('bell-lock-in-active');
          setTimeout(() => refs.lockEl?.classList.remove('bell-lock-in-active'), 320);
        }
      }

      setScore(prev => prev + points);
      setGameStats(prev => ({
        ...prev, perfect: prev.perfect + 1, streak: prev.streak + 1,
        maxStreak: Math.max(prev.maxStreak, prev.streak + 1)
      }));
      setFeedback(tier);
      // Removed playFeedbackSound('perfect') - the synth chirp clashed with the bell/drum sound
      setFallingNotes(prev => prev.filter(n => n.id !== matchingNote.id));
    } else {
      // Wrong note (no falling note of this pitch on screen).
      // Penalty is half the value of a correct hit (-50, since correct = +100).
      // Score is clamped at 0 so kids can't go negative.
      setScore(prev => Math.max(0, prev - 50));
      setGameStats(prev => ({ ...prev, streak: 0 }));
      setFeedback('miss');
    }
    setTimeout(() => setFeedback(null), 400);
  }, [isDrumMode, playBellNote, playDrumSound, setScore, setGameStats]);

  // Keyboard controls - imperative image swap via ref (no React render)
  useEffect(() => {
    if (gameState !== 'playing') return;
    const keyMap = isDrumMode ? DRUM_KEY_TO_NOTE : KEY_TO_NOTE;
    const handleKeyDown = (e) => {
      const note = keyMap[e.key];
      if (note && activeBells.includes(note) && !pressedKeysRef.current.has(e.key)) {
        pressedKeysRef.current.add(e.key);
        const refs = bellImgRefs.current[note];
        if (refs?.current) refs.current.style.opacity = '0';
        if (refs?.pressedEl) {
          refs.pressedEl.style.display = 'block';
          refs.pressedEl.style.transform = 'scale(0.95)';
        }
        handlePlayNote(note);
      }
    };
    const handleKeyUp = (e) => {
      const note = keyMap[e.key];
      if (note) {
        pressedKeysRef.current.delete(e.key);
        const refs = bellImgRefs.current[note];
        if (refs?.pressedEl) {
          refs.pressedEl.style.display = '';
          refs.pressedEl.style.transform = '';
        }
        if (refs?.current) refs.current.style.opacity = '';
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => { window.removeEventListener('keydown', handleKeyDown); window.removeEventListener('keyup', handleKeyUp); };
  }, [gameState, isDrumMode, activeBells, handlePlayNote]);

  // Spawn notes. First note is delayed FADE_IN_MS so audio fade-in completes
  // before it lands. Subsequent notes cadence at effectiveSpawnMs.
  // `null` entries in notes[] are RESTS - tick forward but don't spawn a visual note.
  useEffect(() => {
    if (gameState !== 'playing') return;
    const FADE_IN_MS = selectedSong.audioUrl ? 2000 : 0;
    const delay = currentNoteIndex === 0 ? FADE_IN_MS : effectiveSpawnMs;
    const spawnNote = () => {
      if (currentNoteIndex >= selectedSong.notes.length) {
        setTimeout(() => setGameState('finished'), 2000);
        return;
      }
      const note = selectedSong.notes[currentNoteIndex];
      if (note == null) {
        // Rest - just advance the index, no visual note spawns
        setCurrentNoteIndex(prev => prev + 1);
        return;
      }
      const laneIndex = activeBells.indexOf(note);
      setFallingNotes(prev => [...prev, { id: noteIdRef.current++, note, laneIndex, hit: false, spawnedAt: Date.now() }]);
      setCurrentNoteIndex(prev => prev + 1);
    };
    const t = setTimeout(spawnNote, delay);
    return () => clearTimeout(t);
  }, [gameState, currentNoteIndex, selectedSong, activeBells, effectiveSpawnMs]);

  // Handle missed notes
  const handleNoteMiss = useCallback((noteId) => {
    setFallingNotes(prev => {
      const note = prev.find(n => n.id === noteId);
      if (note && !note.hit) {
        setGameStats(p => ({ ...p, miss: p.miss + 1, streak: 0 }));
        setFeedback('miss');
        playFeedbackSound('miss');
        setTimeout(() => setFeedback(null), 400);
      }
      return prev.filter(n => n.id !== noteId);
    });
  }, [playFeedbackSound, setGameStats]);

  // Save score when game ends + award stickers
  useEffect(() => {
    if (gameState !== 'finished') return;
    const total = gameStats.perfect + gameStats.miss;
    const accuracy = total > 0 ? Math.round((gameStats.perfect / total) * 100) : 0;
    const newRecord = saveHighScore(selectedSong.id, speed, score, { accuracy, maxStreak: gameStats.maxStreak });
    setIsNewRecord(newRecord);
    // Award song-completion sticker if accuracy >= 70%
    if (accuracy >= 70) {
      const id = `song_${selectedSong.id}`;
      earnSticker(id);
      // 🎯 Rhythm Reader achievements
      // Cadet: 20+ perfect hits in a single song
      if (gameStats.perfect >= 20) earnAchievement('rhythm', 'cadet');
      // Pro: complete with 90%+ accuracy
      if (accuracy >= 90) earnAchievementUpTo('rhythm', 'pro');
      // Master: complete on Turbo speed
      if (speed === 'turbo') earnAchievementUpTo('rhythm', 'master');
      // Turbo speed wins earn the Ragu Charlie outfit
      if (speed === 'turbo') earnSticker('fit_charlie_ragu');
      // Specific JMA Original outfit tie-ins
      if (selectedSong.id === 'jma_goody_bag') earnSticker('fit_lou_disco');
      if (selectedSong.id === 'jma_faster_as_we_go') earnSticker('fit_stew_swing');
      // Track cumulative completions for Song Collector & 10-song outfit
      try {
        const set = new Set(JSON.parse(localStorage.getItem('jma_songs_completed_v1') || '[]'));
        set.add(selectedSong.id);
        localStorage.setItem('jma_songs_completed_v1', JSON.stringify([...set]));
        // Song Collector 5-song milestone earns Rhythm Cadet
        if (set.size >= 5) earnAchievement('rhythm', 'cadet');
        if (set.size >= 10) earnSticker('fit_jazzy_disco');
        // Steampunk Charlie = all 5 JMA Originals cleared with 70%+ accuracy
        const jmaIds = ['jma_play_one_skip_one','jma_magic_in_music','jma_brand_new_friend','jma_faster_as_we_go','jma_goody_bag'];
        if (jmaIds.every(x => set.has(x))) earnSticker('fit_charlie_steampunk');
      } catch (_) {}
    }
    // Score milestone
    if (score >= 1000) earnSticker('fit_sharky_hiphop');
    // Streak stickers
    if (gameStats.maxStreak >= 10) earnSticker('ach_streak_10');
    if (gameStats.maxStreak >= 15) {
      earnSticker('fit_charlie_punk');
      earnAchievementUpTo('rhythm', 'pro');
    }
    if (gameStats.maxStreak >= 25) earnSticker('ach_streak_25');
  }, [gameState, selectedSong.id, speed, score, gameStats]);

  // FINISHED screen
  if (gameState === 'finished') {
    const total = gameStats.perfect + gameStats.miss;
    const accuracy = total > 0 ? Math.round((gameStats.perfect / total) * 100) : 0;
    let rating, ratingColor;
    if (accuracy >= 90) { rating = 'SUPERSTAR!'; ratingColor = '#FFD700'; }
    else if (accuracy >= 70) { rating = 'GREAT JOB!'; ratingColor = '#4CD964'; }
    else if (accuracy >= 50) { rating = 'GOOD TRY!'; ratingColor = '#4285F4'; }
    else { rating = 'KEEP GOING!'; ratingColor = '#FF9500'; }

    return (
      <div className="min-h-screen flex flex-col items-center justify-center jma-safe-center p-4 pt-20 md:pt-24 lg:pt-32 pb-8 relative overflow-hidden"
           data-testid="rhythm-results" style={{ backgroundColor: '#2E1D5C' }}>
        {/* Same 3-state tile floor cycle as the playing screen — keeps
            the after-song moment feeling like a continuation of the
            gig instead of dumping you into a plain results card. */}
        <div aria-hidden="true" className="absolute inset-0 pointer-events-none" style={{ zIndex: 0 }}>
          {[1, 2, 3].map((n, i) => (
            <img
              key={n}
              src={`assets/backgrounds/jukebox-floor-${n}.png`}
              alt=""
              draggable={false}
              className="absolute inset-0 w-full h-full object-cover"
              style={{
                animation: `jjFloorCycle 3s ${(i * 1).toFixed(2)}s ease-in-out infinite`,
                opacity: i === 0 ? 1 : 0,
              }}
            />
          ))}
        </div>
        {/* Soft dark scrim so the trophy + numbers still pop against the
            colorful, moving disco floor below. */}
        <div aria-hidden="true" className="absolute inset-0 pointer-events-none"
             style={{ zIndex: 1, background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.55) 90%)' }} />
        <div className="relative z-10 flex flex-col items-center">
        <motion.div initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring' }} className="mb-4">
          <div className="w-24 h-24 rounded-full flex items-center justify-center border-4 border-[var(--jma-dark)]" style={{ backgroundColor: ratingColor }}>
            <Trophy className="w-12 h-12 text-white" />
          </div>
        </motion.div>
        {isNewRecord && (
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="bg-[var(--jma-yellow)] text-[var(--jma-dark)] px-4 py-2 rounded-full border-4 border-[var(--jma-dark)] mb-4 font-display text-xl font-bold">
            NEW HIGH SCORE!
          </motion.div>
        )}
        <h1 className="text-4xl md:text-5xl font-black mb-2 font-display" style={{ color: ratingColor, textShadow: '3px 3px 0 var(--jma-dark)' }}>{rating}</h1>
        <p className="text-lg mb-4 font-display" style={{ color: 'var(--jma-dark)' }}>{selectedSong.name} - {speedConfig.label}</p>
        <div className="game-card p-6 w-full max-w-sm mb-6">
          <div className="text-center mb-4">
            <p className="text-sm uppercase opacity-70">Score</p>
            <p className="text-5xl font-black font-display" style={{ color: 'var(--jma-dark)' }}>{score.toLocaleString()}</p>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="p-2 rounded-xl" style={{ backgroundColor: '#4CD96420' }}>
              <p className="text-xl font-bold" style={{ color: '#4CD964' }}>{gameStats.perfect}</p>
              <p className="text-xs">Hit</p>
            </div>
            <div className="p-2 rounded-xl" style={{ backgroundColor: '#FF3B3020' }}>
              <p className="text-xl font-bold" style={{ color: '#FF3B30' }}>{gameStats.miss}</p>
              <p className="text-xs">Miss</p>
            </div>
            <div className="p-2 rounded-xl" style={{ backgroundColor: '#FF950020' }}>
              <p className="text-xl font-bold" style={{ color: '#FF9500' }}>{gameStats.maxStreak}x</p>
              <p className="text-xs">Streak</p>
            </div>
          </div>
        </div>
        <div className="flex gap-3">
          <motion.button data-testid="play-again-button" className="chunky-btn bg-[var(--jma-green)] text-white px-6 py-3 font-bold" onClick={startGame} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>Play Again</motion.button>
          <motion.button className="chunky-btn bg-white px-6 py-3 font-bold" style={{ color: 'var(--jma-dark)' }} onClick={() => setGameState('menu')} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>Pick Song</motion.button>
          <motion.button data-testid="home-button-results" className="chunky-btn bg-white px-6 py-3 font-bold" style={{ color: 'var(--jma-dark)' }} onClick={() => navigate('/')} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>Home</motion.button>
        </div>
        </div>
      </div>
    );
  }

  // MENU screen
  if (gameState === 'menu') {
    const topScores = getTopScores(5);
    return (
      <div
        className="min-h-screen flex flex-col items-center px-3 pt-20 md:pt-20 pb-6 relative overflow-x-hidden"
        data-testid="rhythm-game-menu"
        style={{
          backgroundImage: 'url(assets/backgrounds/jelly-jukebox-scene.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center 20%',
        }}
      >
        {/* Rainbow disco overlay tints so title still pops against the scene. */}
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(circle at 30% 20%, rgba(255,107,170,0.35) 0%, transparent 55%),' +
              'radial-gradient(circle at 80% 40%, rgba(255,204,0,0.28) 0%, transparent 55%),' +
              'linear-gradient(180deg, rgba(27,17,64,0.35) 0%, transparent 40%, rgba(20,10,45,0.55) 100%)',
          }}
        />
        <GameHeader showHomeButton={true} />

        {/* Title block — JELLY JUKEBOX, disco-themed. Rainbow glow, chunky
            stroke, big NES-cartridge presence. */}
        <motion.div
          className="text-center mb-3"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
        >
          <h1
            className="text-5xl md:text-7xl font-black font-display leading-none uppercase"
            style={{
              color: '#FFF3A6',
              WebkitTextStroke: 'clamp(3px, 0.5vw, 5px) #0A2540',
              paintOrder: 'stroke fill',
              textShadow:
                '3px 3px 0 #FF3B9A, 5px 5px 0 #4285F4, 8px 8px 0 #FFCC00, 0 0 24px rgba(255,107,170,0.55)',
              letterSpacing: '0.03em',
            }}
          >
            Jelly Jukebox
          </h1>
          <p className="text-xs md:text-sm mt-2 font-black uppercase tracking-widest inline-block px-3 py-1 rounded-full"
             style={{ color: '#FFF3A6', backgroundColor: 'rgba(0,0,0,0.35)', border: '2px solid #FF6BAA' }}>
            Catch the falling notes
          </p>
        </motion.div>

        {/* Speed selector — chunky pill row with proper "Speed:" label */}
        <div className="flex items-center gap-2 mb-3 flex-wrap justify-center">
          <span className="text-[10px] md:text-xs uppercase font-black opacity-60 mr-1" style={{ color: 'var(--jma-dark)' }}>
            Speed
          </span>
          {Object.entries(SPEED_SETTINGS).map(([key, cfg]) => {
            const Icon = SPEED_ICON[key] || Zap;
            const selected = speed === key;
            return (
              <motion.button
                key={key}
                data-testid={`speed-${key}`}
                onClick={() => setSpeed(key)}
                whileTap={{ scale: 0.94 }}
                className="rounded-full border-3 px-3 py-1.5 text-xs md:text-sm font-black font-display flex items-center gap-1.5"
                style={{
                  borderColor: 'var(--jma-dark)',
                  backgroundColor: selected ? cfg.color : 'white',
                  color: selected && key !== 'normal' ? 'white' : 'var(--jma-dark)',
                  boxShadow: selected ? `0 5px 0 0 var(--jma-dark)` : `0 3px 0 0 var(--jma-dark)`,
                  transform: selected ? 'translateY(-2px)' : 'translateY(0)',
                  transition: 'transform 0.12s, background-color 0.18s, box-shadow 0.12s',
                }}
              >
                <Icon className="w-3.5 h-3.5 md:w-4 md:h-4" />
                {cfg.label}
              </motion.button>
            );
          })}
        </div>

        {/* Category filter chips */}
        <div className="flex gap-1.5 mb-3 flex-wrap justify-center max-w-2xl">
          {categories.map((cat) => {
            const style = CATEGORY_STYLE[cat];
            const Icon = style.icon;
            const isActive = categoryFilter === cat;
            return (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className="rounded-full px-3 py-1 text-[11px] md:text-xs font-black border-2 flex items-center gap-1 transition-all"
                style={{
                  borderColor: 'var(--jma-dark)',
                  backgroundColor: isActive
                    ? style.tint
                    : 'rgba(255,255,255,0.88)',
                  color: isActive ? 'var(--jma-dark)' : 'var(--jma-dark)',
                  boxShadow: isActive ? '0 3px 0 0 var(--jma-dark)' : '0 2px 0 0 var(--jma-dark)',
                  transform: isActive ? 'translateY(-1px)' : 'translateY(0)',
                }}
              >
                {Icon && <Icon className="w-3 h-3" />}
                {style.label}
              </button>
            );
          })}
        </div>

        {/* Song grid — polished tiles */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 w-full max-w-3xl mb-3 max-h-[55vh] overflow-y-auto px-1 pb-2">
          {filteredSongs.map((song) => {
            const highScore = getHighScore(song.id, speed);
            const isDrums = song.instrumentMode === 'drums';
            const catStyle = CATEGORY_STYLE[song.category] || CATEGORY_STYLE['Mini Jams'];
            const CatIcon = catStyle.icon;
            // Drum songs get a distinct purple sash so they pop from melodic tracks
            const tint = isDrums ? '#AF52DE' : catStyle.tint;
            const accent = isDrums ? '#5E2D8C' : catStyle.accent;
            const hitCount = song.notes.filter((n) => n != null).length;
            return (
              <motion.button
                key={song.id}
                data-testid={`song-${song.id}`}
                onClick={() => { setSelectedSong(song); startGame(); }}
                whileHover={{ y: -3, scale: 1.015 }}
                whileTap={{ scale: 0.98 }}
                className="relative rounded-2xl border-3 overflow-hidden text-left flex items-stretch"
                style={{
                  borderColor: 'var(--jma-dark)',
                  backgroundColor: 'white',
                  boxShadow: '0 5px 0 0 var(--jma-dark), 0 10px 18px rgba(10,37,64,0.10)',
                  transition: 'transform 0.12s, box-shadow 0.12s',
                  minHeight: '78px',
                }}
              >
                {/* Left accent strip — color-codes the category at a glance */}
                <div
                  className="flex-shrink-0 w-3"
                  style={{ backgroundColor: tint }}
                />
                {/* Icon column */}
                <div className="flex-shrink-0 flex items-center justify-center pl-2.5 md:pl-3 pr-2 md:pr-2.5">
                  <div
                    className="w-11 h-11 md:w-12 md:h-12 rounded-full border-3 flex items-center justify-center"
                    style={{
                      borderColor: 'var(--jma-dark)',
                      backgroundColor: accent,
                      boxShadow: '0 3px 0 0 var(--jma-dark)',
                    }}
                  >
                    {isDrums
                      ? <Drum className="w-5 h-5 md:w-6 md:h-6 text-white" />
                      : <Play className="w-5 h-5 md:w-6 md:h-6 text-white" fill="white" />}
                  </div>
                </div>
                {/* Title + meta — vertical stack with proper wrapping */}
                <div className="flex-1 min-w-0 py-2 pr-2 md:pr-3 flex flex-col justify-center">
                  <div className="flex items-center gap-1 text-[9px] md:text-[10px] uppercase font-black opacity-70 leading-none mb-1" style={{ color: 'var(--jma-dark)' }}>
                    <CatIcon className="w-3 h-3 flex-shrink-0" />
                    <span className="truncate">{catStyle.label}{isDrums && ' · DRUMS'}</span>
                  </div>
                  <h3
                    className="text-sm md:text-lg font-black font-display leading-tight"
                    style={{
                      color: 'var(--jma-dark)',
                      // Allow up to 2 lines on phones, then ellipsis if still too long
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {song.name}
                  </h3>
                  <div className="text-[10px] md:text-xs opacity-60 font-bold mt-0.5 leading-none" style={{ color: 'var(--jma-dark)' }}>
                    {hitCount} hits{song.bpm ? ` · ${song.bpm} BPM` : ''}
                  </div>
                </div>
                {/* Right: high-score badge OR a chunky play arrow when unplayed */}
                <div className="flex-shrink-0 flex items-center pr-2 md:pr-3">
                  {highScore ? (
                    <div
                      className="flex items-center gap-1 rounded-full border-2 px-2 py-1"
                      style={{
                        borderColor: 'var(--jma-dark)',
                        backgroundColor: '#FFF3C4',
                        color: 'var(--jma-dark)',
                      }}
                    >
                      <Trophy className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#D89B00' }} />
                      <span className="text-[11px] md:text-xs font-black font-display leading-none">
                        {highScore.score.toLocaleString()}
                      </span>
                    </div>
                  ) : (
                    <div
                      className="w-7 h-7 md:w-8 md:h-8 rounded-full border-2 flex items-center justify-center"
                      style={{ borderColor: 'var(--jma-dark)', backgroundColor: 'white' }}
                    >
                      <Play className="w-3.5 h-3.5 md:w-4 md:h-4" style={{ color: 'var(--jma-dark)' }} fill="var(--jma-dark)" />
                    </div>
                  )}
                </div>
              </motion.button>
            );
          })}
        </div>

        {/* Compact "View Top Scores" toggle - moved to the bottom and small */}
        <button
          data-testid="toggle-high-scores"
          className="text-[11px] md:text-xs font-bold underline mb-1"
          style={{ color: 'var(--jma-blue)' }}
          onClick={() => setShowHighScores(!showHighScores)}
        >
          {showHighScores ? 'Hide' : 'View'} Top Scores Across All Songs
        </button>
        {showHighScores && topScores.length > 0 && (
          <motion.div className="game-card p-3 mb-2 w-full max-w-md" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}>
            <div className="space-y-1">
              {topScores.map((s, i) => {
                const song = SONG_LIBRARY.find(sl => sl.id === s.songId);
                return (
                  <div key={i} className="flex justify-between text-xs px-2 py-1 rounded bg-[var(--jma-bg)]">
                    <span className="font-bold truncate">{i + 1}. {song?.name || s.songId}</span>
                    <span className="flex-shrink-0 ml-2">{s.score.toLocaleString()} ({s.speed})</span>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        <RoomCharacters room="rhythm-arcade" />
      </div>
    );
  }

  // PLAYING screen - with Jelly Bell images!
  // Background pulse — one breath per beat synced to the song's BPM. Combines
  // scale + slight rotation + brightness so the radial sunburst actually
  // VISIBLY throbs (a pure scale change on a uniform radial pattern is
  // invisible — the rays need to twist to read as motion).
  const pulseDurationSec = selectedSong.bpm
    ? Math.max(0.2, 60 / selectedSong.bpm)
    : 0.6;

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden" data-testid="rhythm-game-playing"
         style={{ backgroundColor: '#2E1D5C' }}>
      {/* Cycling disco floor — three color-swap states of the tiled
          floor cross-fade so the whole scene reads like the tiles
          change color on the beat. This IS the background now (the
          old cyan sunburst was replaced per user request). */}
      <div aria-hidden="true" className="absolute inset-0 pointer-events-none" style={{ zIndex: 0 }}>
        {[1, 2, 3].map((n, i) => (
          <img
            key={n}
            src={`assets/backgrounds/jukebox-floor-${n}.png`}
            alt=""
            draggable={false}
            className="absolute inset-0 w-full h-full object-cover"
            style={{
              // 3 layers stacked; each visible for ~1/3 of a 3 s
              // loop with brief cross-fades. Staggered starts (0 →
              // 1 s → 2 s) mean they take turns being on top.
              animation: `jjFloorCycle 3s ${(i * 1).toFixed(2)}s ease-in-out infinite`,
              opacity: i === 0 ? 1 : 0,
            }}
          />
        ))}
      </div>
      {/* Pulsing sunburst layer — gentle scale + slight rotation so the rays
          read as "alive" without strobing. Kept WELL under photo-sensitivity
          thresholds (small brightness delta, no large area flashes). Now
          uses overlay blend so it enriches the tile-floor background
          instead of replacing it. */}
      <motion.div
        aria-hidden="true"
        className="absolute inset-0 sunburst-cool pointer-events-none"
        style={{
          transformOrigin: 'center',
          zIndex: 0,
          willChange: 'transform, filter',
          mixBlendMode: 'overlay',
          opacity: 0.35,
        }}
        animate={{
          scale: [1, 1.03, 1],
          rotate: [-0.4, 0.4, -0.4],
          filter: ['brightness(1)', 'brightness(1.025)', 'brightness(1)'],
        }}
        transition={{
          duration: pulseDurationSec,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
      {/* Soft radial accent — VERY subtle "stadium glow" pump at center */}
      <motion.div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(circle at 50% 55%, rgba(255,255,255,0.32) 0%, rgba(255,255,255,0) 60%)',
          mixBlendMode: 'screen',
          zIndex: 0,
        }}
        animate={{ opacity: [0.05, 0.15, 0.05] }}
        transition={{
          duration: pulseDurationSec,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
      {selectedSong.audioUrl && (
        <audio ref={audioRef} src={selectedSong.audioUrl} preload="auto" data-testid="backing-track" />
      )}
      <GameHeader title={selectedSong.name} score={score} streak={gameStats.streak} showHomeButton={true} backLink={{ to: '/play', label: 'Play' }} />
      <div className="fixed top-20 left-0 right-0 px-4 py-1 z-40 flex justify-center">
        <ProgressBar current={currentNoteIndex} total={selectedSong.notes.length} color={speedConfig.color} />
      </div>
      {selectedSong.mode && selectedSong.mode !== 'C-major' && (
        <div className="fixed top-28 left-1/2 -translate-x-1/2 z-40 bg-[var(--jma-yellow)] border-2 border-[var(--jma-dark)] rounded-full px-3 py-0.5 shadow-[0_2px_0_0_var(--jma-dark)]">
          <span className="text-xs font-bold font-display" style={{ color: 'var(--jma-dark)' }}>
            {selectedSong.mode === 'G-mixolydian' ? 'G Mode - Start on So (5)' : 'A Minor - Start on La (6)'}
          </span>
        </div>
      )}
      <AnimatePresence>{feedback && <FeedbackPopup feedback={feedback} />}</AnimatePresence>
      <main className="relative z-10 flex-1 flex flex-col pt-20 pb-2 px-2 md:px-4">
        <div className="game-board relative overflow-hidden" style={{ height: 'calc(100vh - 100px)' }}>
          {/* Lanes - each lane has its instrument target at the bottom */}
          <div className="rhythm-lanes" style={{ height: '100%' }}>
            {activeBells.map((note) => {
              const bell = isDrumMode ? DRUM_LANES[note] : BELLS.find(b => b.note === note);
              const idleSrc = isDrumMode ? bell?.img1 : bell?.image1;
              const pressedSrc = isDrumMode ? bell?.img2 : bell?.image2;
              const labelText = isDrumMode ? bell?.short : (bell ? nameFor(bell.note, bell.solfege) : '');
              const keyHint = bell?.key;
              const tintColor = bell?.color;
              if (!bellImgRefs.current[note]) bellImgRefs.current[note] = { current: null, pressedEl: null, lockEl: null };
              const setIdleRef = (el) => { bellImgRefs.current[note].current = el; };
              const setPressedRef = (el) => { bellImgRefs.current[note].pressedEl = el; };
              const setLockRef = (el) => { bellImgRefs.current[note].lockEl = el; };
              const doDown = (e) => {
                e.preventDefault();
                try { e.target.setPointerCapture(e.pointerId); } catch (_) {}
                const idle = bellImgRefs.current[note]?.current;
                const pressed = bellImgRefs.current[note]?.pressedEl;
                if (idle) idle.style.opacity = '0';
                if (pressed) {
                  pressed.style.display = 'block';
                  pressed.style.transform = 'scale(0.95)';
                }
                handlePlayNote(note);
              };
              const doUp = (e) => {
                if (e) e.preventDefault();
                const idle = bellImgRefs.current[note]?.current;
                const pressed = bellImgRefs.current[note]?.pressedEl;
                if (pressed) {
                  pressed.style.display = '';
                  pressed.style.transform = '';
                }
                if (idle) idle.style.opacity = '';
              };
              return (
                <div key={note} className="rhythm-lane" style={{ backgroundColor: `${tintColor}10` }}>
                  <div className="lane-target" />
                  {/* Mobile big-finger lane: invisible button covering the
                      entire lane on small screens, so kids can jab anywhere
                      in the column to score. Hidden (`md:hidden`) on
                      tablet+. Lower z-index than the static bell so taps
                      ON the bell still go to the bell. */}
                  <button
                    data-testid={`game-lane-${note}`}
                    type="button"
                    aria-label={`Tap to play ${labelText}`}
                    onPointerDown={doDown}
                    onPointerUp={doUp}
                    onPointerLeave={doUp}
                    onPointerCancel={doUp}
                    className="md:hidden absolute inset-0 bg-transparent border-0 p-0 z-0"
                    style={{ touchAction: 'none' }}
                  />
                  {/* Target instrument — sits at the catch line. On mobile we
                      raise it well off the bottom edge so kids can see the
                      bell + the falling bell meeting clearly. */}
                  <button
                    data-testid={`game-${isDrumMode ? 'drum' : 'bell'}-${note}`}
                    type="button"
                    onPointerDown={doDown}
                    onPointerUp={doUp}
                    onPointerLeave={doUp}
                    onPointerCancel={doUp}
                    className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center bg-transparent border-0 p-0 z-10 bottom-24 md:bottom-5"
                    style={{ touchAction: 'none' }}
                  >
                    <div className="relative">
                      {/* Lock-in flash overlay — invisible by default, briefly
                          flares gold ring + scales when a PERFECT hit lands
                          on this bell. Imperative class toggle, no React render. */}
                      <div
                        ref={setLockRef}
                        className="bell-lock-in pointer-events-none absolute inset-0"
                        aria-hidden="true"
                      />
                      <img
                        ref={setIdleRef}
                        src={idleSrc}
                        alt={labelText}
                        className="instrument-frame-idle w-20 h-24 md:w-28 md:h-32 lg:w-32 lg:h-36 object-contain pointer-events-none"
                        draggable={false}
                      />
                      <img
                        ref={setPressedRef}
                        src={pressedSrc}
                        alt=""
                        aria-hidden="true"
                        className="instrument-frame-pressed w-20 h-24 md:w-28 md:h-32 lg:w-32 lg:h-36 object-contain pointer-events-none absolute top-0 left-0"
                        draggable={false}
                      />
                      <span className="absolute -top-1 -right-1 w-7 h-7 rounded-full bg-white border border-[var(--jma-dark)] text-sm font-bold flex items-center justify-center pointer-events-none"
                        style={{ color: tintColor }}>{keyHint}</span>
                    </div>
                    <span className="text-sm md:text-base font-bold pointer-events-none mt-1" style={{ color: tintColor }}>
                      {labelText}
                    </span>
                  </button>
                </div>
              );
            })}
            {/* Falling notes (bells or drums). Halo lights up the bell from
                ~55 % of the fall through ~95 %, peaking around the visual
                overlap with the target. Long warmup so kids see it coming. */}
            <AnimatePresence>
              {fallingNotes.map(note => (
                <FallingBellNote
                  key={note.id}
                  noteId={note.id}
                  note={note.note}
                  laneIndex={note.laneIndex}
                  totalLanes={activeBells.length}
                  speed={speedConfig.fallSpeed}
                  isDrum={isDrumMode}
                  registerRef={registerFallingRef}
                  glowDelayMs={0.55 * speedConfig.fallSpeed}
                  glowDurationMs={0.40 * speedConfig.fallSpeed}
                />
              ))}
            </AnimatePresence>
          </div>
        </div>
      </main>
    </div>
  );
}

export default RhythmGamePage;
