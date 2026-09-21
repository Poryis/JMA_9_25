import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Play, Eye, RotateCcw } from 'lucide-react';
import { KazoosRow, KAZOOS } from '../components/Kazoos';
import { GameHeader, FeedbackPopup, ProgressBar } from '../components/GameUI';
import { FullscreenButton } from '../components/FullscreenButton';
import useAudio from '../hooks/useAudio';
import { earnSticker, earnAchievement, earnAchievementUpTo } from '../hooks/useStickers';
import Confetti from '../components/Confetti';
import RoomCharacters from '../components/RoomCharacters';

// Patterns for Stew Kazoo Says (progressively harder)
const PATTERNS = {
  1: ['C', 'E', 'G'],
  2: ['C', 'D', 'E', 'F'],
  3: ['G', 'E', 'C', 'E', 'G'],
  4: ['C', 'E', 'G', 'High C', 'G', 'E'],
  5: ['D', 'E', 'F', 'G', 'A', 'G', 'F'],
  6: ['C', 'D', 'E', 'F', 'G', 'F', 'E', 'D'],
  7: ['E', 'E', 'F', 'G', 'G', 'F', 'E', 'D', 'C'],
  8: ['C', 'C', 'G', 'G', 'A', 'A', 'G', 'F', 'F', 'E']
};

// Stew animation frames - cycles through 0,1,2,3,0 quickly on each note play
const STEW_FRAMES = [
  'assets/stew/stew-neutral.png',
  'assets/stew/stew-plays-1.png',
  'assets/stew/stew-plays-2.png',
  'assets/stew/stew-plays-3.png',
];

// Difficulty tiers — each sets the STARTING level so kids who want a
// challenge can skip ahead. All tiers still progress toward the 10-note
// finale, they just start at different rungs of the ladder.
const LEVELS = {
  easy:   { name: 'Easy',   startLevel: 1, description: '3-note start' },
  medium: { name: 'Medium', startLevel: 3, description: '5-note start' },
  hard:   { name: 'Hard',   startLevel: 5, description: '7-note start' },
};

function SimonSaysPage({ score, setScore, gameStats, setGameStats, resetGame }) {
  const navigate = useNavigate();
  const { playKazooNote, playFeedbackSound, initAudioContext } = useAudio();

  const [gameState, setGameState] = useState('ready');
  const [difficulty, setDifficulty] = useState('easy');
  const [level, setLevel] = useState(1);
  const [showingIndex, setShowingIndex] = useState(-1);
  const [playerIndex, setPlayerIndex] = useState(0);
  const [highlightedNote, setHighlightedNote] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [message, setMessage] = useState('Watch and listen!');

  const timeoutRef = useRef(null);
  const bellsRowRef = useRef(null); // Imperative handle to flash kazoos instantly
  const stewFrameRefs = useRef([null, null, null, null]);
  const stewContainerRef = useRef(null); // For head-tilt rotation
  const stewTimerRef = useRef(null);
  const [musicalNotes, setMusicalNotes] = useState([]); // Floating note emojis from Stew's beak
  const noteIdRef = useRef(0);
  const [showConfetti, setShowConfetti] = useState({ on: false, mega: false, key: 0 });
  const currentPattern = PATTERNS[level] || PATTERNS[8];

  // Preload every frame on mount so the first hit doesn't stutter waiting on
  // the disk fetch.
  useEffect(() => {
    STEW_FRAMES.forEach((src) => {
      const i = new Image();
      i.src = src;
    });
  }, []);

  // Plays an ascending kazoo arpeggio Do-Mi-So-HighDo for level-clear celebration.
  const playFanfare = useCallback(() => {
    const ctx = initAudioContext();
    if (!ctx) return;
    const notes = ['C', 'E', 'G', 'High C'];
    notes.forEach((n, i) => setTimeout(() => playKazooNote(n), i * 90));
  }, [initAudioContext, playKazooNote]);

  // Triggers confetti + fanfare. `mega=true` for milestone levels (5 and 8).
  const celebrate = useCallback((mega = false) => {
    setShowConfetti(prev => ({ on: true, mega, key: prev.key + 1 }));
    playFanfare();
    if (mega) {
      // Second wave for extra-big moments
      setTimeout(() => setShowConfetti(prev => ({ on: true, mega: true, key: prev.key + 1 })), 400);
    }
    setTimeout(() => setShowConfetti(prev => ({ ...prev, on: false })), 2000);
  }, [playFanfare]);

  // Show frame `i` by flipping each <img>'s inline `style.display`. We mount
  // all 4 frames simultaneously and toggle visibility (Beat Lab pattern). The
  // *default* visibility lives in CSS (.stew-frame / .stew-frame-default) so
  // React reconciliation NEVER touches `display` — the imperative overrides
  // here survive every re-render, including ones triggered by setHighlighted-
  // Note / setMusicalNotes in the same tick as cycleStew.
  const showStewFrame = useCallback((i) => {
    const refs = stewFrameRefs.current;
    for (let idx = 0; idx < refs.length; idx++) {
      const el = refs[idx];
      if (!el) continue;
      el.style.display = idx === i ? 'block' : 'none';
    }
  }, []);

  const cycleStew = useCallback(() => {
    if (stewTimerRef.current) {
      clearTimeout(stewTimerRef.current);
      stewTimerRef.current = null;
    }
    showStewFrame(1);
    stewTimerRef.current = setTimeout(() => {
      showStewFrame(2);
      stewTimerRef.current = setTimeout(() => {
        showStewFrame(3);
        stewTimerRef.current = setTimeout(() => {
          showStewFrame(0); // back to neutral
          stewTimerRef.current = null;
        }, 110);
      }, 110);
    }, 110);
  }, [showStewFrame]);

  // Tilt Stew based on the note pitch: low notes (C/D/E) → left, high (A/B/HighC) → right.
  // Direct CSS transform via ref so it's instant (no React render delay).
  const tiltStewForNote = useCallback((note) => {
    if (!stewContainerRef.current) return;
    const lowNotes  = ['C', 'D', 'E'];
    const highNotes = ['A', 'B', 'High C'];
    let deg = 0;
    if (lowNotes.includes(note)) deg = -8;
    else if (highNotes.includes(note)) deg = 8;
    stewContainerRef.current.style.transform = `rotate(${deg}deg)`;
  }, []);

  // Float a tiny musical note emoji up from Stew's beak. Auto-cleans after 1.4s.
  const emitFloatingNote = useCallback((noteName) => {
    const id = noteIdRef.current++;
    const symbols = ['♪', '♫', '♬', '♩'];
    const sym = symbols[id % symbols.length];
    const kazoo = KAZOOS.find(k => k.note === noteName);
    const color = kazoo?.color || 'var(--jma-yellow)';
    setMusicalNotes(prev => [...prev, { id, sym, color, drift: (Math.random() - 0.5) * 60 }]);
    setTimeout(() => {
      setMusicalNotes(prev => prev.filter(n => n.id !== id));
    }, 1400);
  }, []);

  // Clean up timeouts
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (stewTimerRef.current) clearTimeout(stewTimerRef.current);
    };
  }, []);

  // Start the game.
  // We AWAIT the audio context resume before transitioning to 'showing' so
  // Stew's first demo note doesn't fire alongside any queued/late sources
  // (the cause of the "first note plays a bunch at once" bug on iOS).
  const startGame = useCallback(async (diffKey) => {
    const ctx = initAudioContext();
    if (ctx && ctx.state === 'suspended') {
      try { await ctx.resume(); } catch (_) {}
    }
    // Small extra tick to let the audio graph settle on slower devices.
    await new Promise((r) => setTimeout(r, 60));
    resetGame();
    const chosen = typeof diffKey === 'string' && LEVELS[diffKey] ? diffKey : difficulty;
    setDifficulty(chosen);
    setLevel(LEVELS[chosen].startLevel);
    setGameState('showing');
    setMessage('Watch and listen!');
    setShowingIndex(0);
  }, [initAudioContext, resetGame, difficulty]);

  // Show pattern to player
  useEffect(() => {
    if (gameState !== 'showing') return;

    if (showingIndex >= currentPattern.length) {
      // Done showing, player's turn
      setGameState('playing');
      setMessage('Your turn! Repeat the pattern!');
      setPlayerIndex(0);
      setHighlightedNote(null);
      return;
    }

    const note = currentPattern[showingIndex];
    setHighlightedNote(note);
    playKazooNote(note);
    cycleStew();
    tiltStewForNote(note);
    emitFloatingNote(note);
    // Imperative visual swap for Stu's demo - bypasses React state delay
    if (bellsRowRef.current) bellsRowRef.current.flashNote(note, 500);

    timeoutRef.current = setTimeout(() => {
      setHighlightedNote(null);
      timeoutRef.current = setTimeout(() => {
        setShowingIndex(prev => prev + 1);
      }, 300);
    }, 500);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [gameState, showingIndex, currentPattern, playKazooNote, cycleStew, tiltStewForNote, emitFloatingNote]);

  // Handle player input
  const handlePlayNote = useCallback((note) => {
    if (gameState !== 'playing') return;

    playKazooNote(note);
    cycleStew();
    tiltStewForNote(note);
    emitFloatingNote(note);
    setHighlightedNote(note);
    setTimeout(() => setHighlightedNote(null), 200);

    const expectedNote = currentPattern[playerIndex];

    if (note === expectedNote) {
      // Correct!
      const newIndex = playerIndex + 1;
      setPlayerIndex(newIndex);
      setScore(prev => prev + 10 * level);

      if (newIndex >= currentPattern.length) {
        // Level complete!
        setGameStats(prev => ({
          ...prev,
          perfect: prev.perfect + 1,
          streak: prev.streak + 1,
          maxStreak: Math.max(prev.maxStreak, prev.streak + 1)
        }));
        
        setFeedback('perfect');
        playFeedbackSound('perfect');
        setMessage('Great job!');
        setGameState('success');

        // Move to next level or finish
        timeoutRef.current = setTimeout(() => {
          // 🎹 Keyboard Scout achievements via Stew Kazoo Says level milestones
          if (level >= 1) earnAchievement('keyboard', 'cadet');
          if (level >= 4) earnAchievementUpTo('keyboard', 'pro');
          if (level >= 8) earnAchievementUpTo('keyboard', 'master');
          if (level >= 8) {
            earnSticker('fit_charlie_grad');
            // Big celebration on beating the final level, then home.
            celebrate(true);
            setMessage('YOU BEAT THE WHOLE GAME!');
            setGameState('finished');
            // Beta feedback: kids expect to bounce back to Stew's own
            // difficulty menu after crushing the whole game, not all the
            // way out to the app home. Loops them tighter into replay.
            timeoutRef.current = setTimeout(() => navigate('/simon-says'), 3200);
          } else {
            // Mega celebration on milestone level 5; regular on every other.
            celebrate(level === 5);
            setLevel(prev => prev + 1);
            // Wait for the level-clear fanfare (4 kazoo notes spaced 90 ms +
            // ~700 ms decay tail) to finish BEFORE Stew starts demoing the
            // new pattern — otherwise the fanfare notes pile on top of the
            // pattern's first note and it sounds like a chord. Extra breathing
            // room so the celebration and the next round don't smush together.
            timeoutRef.current = setTimeout(() => {
              setShowingIndex(0);
              setGameState('showing');
              setMessage('Watch and listen!');
            }, 1400);
          }
          setFeedback(null);
        }, 1500);
      }
    } else {
      // Wrong!
      // Penalty is half the value of a correct hit (correct = +10*level, wrong = -5*level).
      // Score is clamped at 0 so kids can't go negative.
      setScore(prev => Math.max(0, prev - 5 * level));
      setGameStats(prev => ({
        ...prev,
        miss: prev.miss + 1,
        streak: 0
      }));
      
      setFeedback('miss');
      playFeedbackSound('miss');
      setMessage('Oops! Try again!');
      setGameState('fail');

      // Retry same level
      timeoutRef.current = setTimeout(() => {
        setShowingIndex(0);
        setGameState('showing');
        setMessage('Watch and listen!');
        setFeedback(null);
      }, 1500);
    }
  }, [gameState, playerIndex, currentPattern, level, playKazooNote, cycleStew, tiltStewForNote, emitFloatingNote, playFeedbackSound, setScore, setGameStats, navigate, celebrate]);

  // NOTE: Keyboard is handled inside <JellyBellsRow> itself (with imperative
  // visual swap + dedup of key-repeat). Adding another keydown listener here
  // would fire handlePlayNote twice per key, which broke the swap and scoring.

  // Ready screen
  if (gameState === 'ready') {
    return (
      <div 
        className="min-h-screen flex flex-col items-center justify-center jma-safe-center p-4 pt-20 md:pt-24 lg:pt-32 pb-8 relative" 
        data-testid="simon-says-menu"
        style={{
          backgroundImage: 'url(assets/backgrounds/underwater.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      >
        <GameHeader showHomeButton={true} backLink={{ to: '/play', label: 'Play' }} />
        <FullscreenButton />
        <RoomCharacters room="kazoo-room" />

        <motion.h1
          className="text-3xl md:text-5xl font-black mb-4 text-center uppercase"
          style={{
            color: 'var(--jma-dark)',
            fontFamily: "'Fredoka', cursive",
            WebkitTextStroke: 0,
            textShadow: '2px 2px 0 rgba(0,0,0,0.18)',
          }}
          initial={{ y: -30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
        >
          STEW KAZOO SAYS
        </motion.h1>

        <motion.div
          className="game-card p-6 mb-8 max-w-md text-center"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2 }}
        >
          <Eye className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--jma-blue)' }} />
          <h2 className="text-xl font-bold mb-2" style={{ fontFamily: "'Fredoka', cursive" }}>
            How to Play
          </h2>
          <p className="text-base" style={{ color: 'var(--jma-dark)' }}>
            1. Watch Stew play his kazoos<br />
            2. Listen to the melody<br />
            3. Play it back yourself!
          </p>
        </motion.div>

        <motion.button
          data-testid="start-simon-button"
          className="chunky-btn bg-[var(--jma-blue)] text-white px-8 py-4 flex items-center gap-3"
          onClick={() => startGame(difficulty)}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.4, type: 'spring' }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Play className="w-6 h-6" />
          <span className="text-xl font-bold">START!</span>
        </motion.button>

        {/* Difficulty picker — standardized Easy / Medium / Hard tiles
            matching every other game in the app. Sets the starting
            pattern length so kids can jump ahead if they want a challenge. */}
        <div className="mt-6 flex flex-col items-center gap-2 w-full max-w-md">
          <div className="text-[10px] font-black uppercase tracking-wider opacity-60" style={{ color: 'var(--jma-dark)' }}>
            Difficulty
          </div>
          <div className="grid grid-cols-3 gap-2 w-full">
            {Object.entries(LEVELS).map(([key, lvl]) => (
              <button
                key={key}
                data-testid={`simon-difficulty-${key}`}
                onClick={() => setDifficulty(key)}
                className="chunky-btn px-3 py-2 flex flex-col items-center touch-manipulation"
                style={{
                  backgroundColor: difficulty === key ? 'var(--jma-yellow, #FFCC00)' : 'white',
                  color: 'var(--jma-dark)',
                  borderColor: 'var(--jma-dark)',
                }}
              >
                <span className="text-sm font-black">{lvl.name}</span>
                <span className="text-[10px] font-bold opacity-70">{lvl.description}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Stew on the menu - waving */}
        <motion.img
          src="assets/stew/stew-neutral.png"
          alt="Stew"
          className="mt-8 w-32 h-32 md:w-40 md:h-40 object-contain drop-shadow-xl"
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: [0, -10, 0], opacity: 1 }}
          transition={{ y: { repeat: Infinity, duration: 2.4, ease: 'easeInOut' }, opacity: { delay: 0.5 } }}
        />
      </div>
    );
  }

  // Game screen
  return (
    <div 
      className="min-h-screen flex flex-col relative" 
      data-testid="simon-says-playing"
      style={{
        backgroundImage: 'url(assets/backgrounds/underwater.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}
    >
      <GameHeader 
        title={`Level ${level}`}
        score={score}
        streak={gameStats.streak}
        showHomeButton={true}
        backLink={{ to: '/play', label: 'Play' }}
      />
      <RoomCharacters room="kazoo-room" />

      {/* Level-clear confetti */}
      {showConfetti.on && (
        <div className="fixed inset-0 pointer-events-none z-[80]">
          <Confetti key={showConfetti.key} mega={showConfetti.mega} testId="simon-confetti" />
        </div>
      )}

      {/* Progress */}
      <div className="fixed top-16 left-0 right-0 px-4 py-2 z-40 flex justify-center">
        <ProgressBar 
          current={level} 
          total={8}
          color="var(--jma-purple)"
        />
      </div>

      {/* Feedback popup */}
      <AnimatePresence>
        {feedback && (
          <FeedbackPopup feedback={feedback} onComplete={() => setFeedback(null)} />
        )}
      </AnimatePresence>

      <main className="flex-1 flex flex-col items-center justify-center pt-24 pb-8 px-4">
        {/* Message */}
        <motion.div
          key={message}
          className="game-card px-6 py-4 mb-8"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
        >
          <p 
            className="text-xl md:text-2xl font-bold text-center"
            style={{ color: 'var(--jma-dark)', fontFamily: "'Fredoka', cursive" }}
          >
            {message}
          </p>
        </motion.div>

        {/* Pattern progress (during playing) */}
        {gameState === 'playing' && (
          <div className="flex gap-2 mb-6">
            {currentPattern.map((note, idx) => {
              const kazoo = KAZOOS.find(k => k.note === note);
              const isCompleted = idx < playerIndex;
              const isCurrent = idx === playerIndex;
              
              return (
                <motion.div
                  key={idx}
                  className={`w-8 h-8 rounded-full border-3 border-[var(--jma-dark)] ${
                    isCompleted ? '' : 'opacity-30'
                  } ${isCurrent ? 'ring-4 ring-[var(--jma-yellow)]' : ''}`}
                  style={{ backgroundColor: kazoo?.color }}
                  animate={isCurrent ? { scale: [1, 1.1, 1] } : {}}
                  transition={{ repeat: Infinity, duration: 0.5 }}
                />
              );
            })}
          </div>
        )}

        {/* Stew — 4 frames mounted simultaneously, only one visible at a time.
            We use CSS class defaults (`.stew-frame` is `display:none`,
            `.stew-frame-default` overrides to `display:block`) so that
            React's reconciliation NEVER touches `display` on these imgs.
            cycleStew() then flips `style.display` imperatively via the
            stewFrameRefs and those overrides survive every re-render —
            even ones triggered by setState calls fired in the same tick.
            Same proven pattern as the Beat Lab drum kit. */}
        <div
          key="stew-mascot-container"
          className="relative w-32 h-32 md:w-44 md:h-44 mb-2"
        >
          <div
            ref={stewContainerRef}
            data-testid="stew-mascot"
            className="w-full h-full relative"
            style={{ transition: 'transform 0.18s ease-out', transformOrigin: 'center bottom' }}
          >
            {STEW_FRAMES.map((src, idx) => (
              <img
                key={idx}
                ref={(el) => { stewFrameRefs.current[idx] = el; }}
                src={src}
                alt={idx === 0 ? 'Stew' : ''}
                aria-hidden={idx === 0 ? undefined : 'true'}
                draggable={false}
                className={`stew-frame${idx === 0 ? ' stew-frame-default' : ''} absolute inset-0 w-full h-full object-contain drop-shadow-xl pointer-events-none select-none`}
              />
            ))}
          </div>
          {/* Floating musical notes from Stew's beak */}
          <AnimatePresence>
            {musicalNotes.map((mn) => (
              <motion.div
                key={mn.id}
                initial={{ opacity: 0, y: 0, x: 0, scale: 0.5 }}
                animate={{ opacity: [0, 1, 1, 0], y: -90, x: mn.drift, scale: 1.2 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.3, ease: 'easeOut' }}
                className="absolute font-bold pointer-events-none"
                style={{
                  top: '20%', left: '50%', transform: 'translateX(-50%)',
                  fontSize: '2rem',
                  color: mn.color,
                  textShadow: '2px 2px 0 rgba(10,37,64,0.4)',
                  zIndex: 20,
                }}
              >
                {mn.sym}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
        <motion.div
          className="game-board p-4 md:p-8"
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
        >
          <KazoosRow 
            ref={bellsRowRef}
            onPlayNote={handlePlayNote}
            onNoteUp={() => {}}
            highlightedNote={highlightedNote}
          />
        </motion.div>

        {/* Hint for showing phase */}
        {gameState === 'showing' && (
          <motion.p
            className="mt-6 text-lg font-bold opacity-70"
            style={{ color: 'var(--jma-dark)' }}
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
          >
            Stew is playing note {showingIndex + 1} of {currentPattern.length}...
          </motion.p>
        )}
      </main>
    </div>
  );
}

export default SimonSaysPage;
