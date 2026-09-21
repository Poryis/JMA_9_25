// Detective Dr. Jellybone — Find the Wrong Note
// A familiar melody plays with exactly ONE wrong note. Kid identifies which
// beat sounded off. Three difficulty tiers, 3-strike lives, sticker rewards.

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Search, Heart, Volume2, Trophy, RotateCcw, ArrowRight, Sparkles } from 'lucide-react';
import { GameHeader } from '../components/GameUI';
import { FullscreenButton } from '../components/FullscreenButton';
import Confetti from '../components/Confetti';
import RoomCharacters from '../components/RoomCharacters';
import { BELLS } from '../components/JellyBells';
import { DETECTIVE_TUNES, SCALE_ORDER } from '../data/detectiveMelodies';
import useAudio from '../hooks/useAudio';
import { earnSticker, earnAchievement, earnAchievementUpTo } from '../hooks/useStickers';
import useNoteNames from '../hooks/useNoteNames';

const BELL_BY_NOTE = Object.fromEntries(BELLS.map(b => [b.note, b]));

const LEVELS = {
  easy:   { name: 'Easy',   description: 'Big mistakes, short tunes', noteMs: 600, swapMin: 3, swapMax: 4, melodyLevel: 'easy',   sticker: 'detective_rookie', mode: 'wrong' },
  medium: { name: 'Medium', description: 'Trickier, medium tunes',    noteMs: 500, swapMin: 2, swapMax: 3, melodyLevel: 'medium', sticker: 'detective_sleuth', mode: 'wrong' },
  hard:   { name: 'Hard',   description: 'Sneaky, long tunes',         noteMs: 420, swapMin: 1, swapMax: 2, melodyLevel: 'hard',   sticker: 'detective_master', mode: 'wrong' },
  restquiz: { name: 'Sneaky Note', description: 'The suspect filled a SILENCE with a note!', noteMs: 480, swapMin: 1, swapMax: 3, melodyLevel: 'easy', sticker: 'detective_rookie', mode: 'extra', timeLimit: 30 },
};

const STARTING_LIVES = 3;
const ROUNDS_PER_RUN = 5;
const BEST_KEY = 'jma_detective_best_v1';
const loadBest = () => { try { return JSON.parse(localStorage.getItem(BEST_KEY) || '{}'); } catch { return {}; } };
const saveBest = (b) => { try { localStorage.setItem(BEST_KEY, JSON.stringify(b)); } catch { /* ignore */ } };

// Pick a random "wrong" note that is `swapSteps` away in the scale from `original`.
function pickWrongNote(original, swapMin, swapMax) {
  const idx = SCALE_ORDER.indexOf(original);
  if (idx < 0) return original;
  const candidates = SCALE_ORDER
    .map((n, i) => ({ n, d: Math.abs(i - idx) }))
    .filter(c => c.n !== original && c.d >= swapMin && c.d <= swapMax)
    .map(c => c.n);
  if (!candidates.length) return SCALE_ORDER.filter(n => n !== original)[0];
  return candidates[Math.floor(Math.random() * candidates.length)];
}

function pickTune(level, options = {}) {
  let pool = DETECTIVE_TUNES.filter(t => t.level === level);
  // In Sneaky-Note mode prefer tunes that actually contain a rest so the
  // gameplay matches the magical-world theme.
  if (options.requireRest) {
    const withRests = pool.filter(t => t.notes.some(n => n == null));
    if (withRests.length) pool = withRests;
  }
  return pool[Math.floor(Math.random() * pool.length)];
}

// Build a round. `notes` may contain `null` rests — those preserve rhythm but
// are NOT corruptable and don't get clickable slots. Slots are indexed only
// across the non-rest entries.
//
// Two modes:
//   'wrong' — one existing note is swapped to a wrong pitch. Kid finds the off note.
//   'extra' — an EXTRA note is inserted between two existing notes.
//             Kid finds the slot that shouldn't be there (Rest Quiz).
function buildRound(levelKey) {
  const lvl = LEVELS[levelKey];
  const tune = pickTune(lvl.melodyLevel, { requireRest: lvl.mode === 'extra' });

  // Map each note index to its slot number (or -1 for rests).
  const slotMap = [];
  let s = 0;
  tune.notes.forEach((n) => {
    if (n == null) { slotMap.push(-1); }
    else { slotMap.push(s); s += 1; }
  });

  // Non-rest indices into tune.notes
  const noteIndices = tune.notes.map((n, i) => (n == null ? -1 : i)).filter(i => i >= 0);
  // Avoid the very first note as the wrong one so kids have a reference.
  const corruptable = noteIndices.slice(1);

  if (lvl.mode === 'extra') {
    // SNEAKY-NOTE mode: the suspect FILLS a rest in the song with a note.
    // Kids learn that rests (silences) are part of music — the suspect tried
    // to "cover" a silence by playing through it.
    //
    // 1. Find all rest indices in the tune (positions where notes[i] === null).
    // 2. If the tune has no rest, pick any insertable spot and treat it as one.
    //    (Fallback for tunes without rests — should be rare given our library.)
    // 3. Replace the rest with a randomly chosen scale note that differs from
    //    its previous AND next non-null neighbors (so the kid can't confuse
    //    the new note with a repeat).
    const restIndices = [];
    tune.notes.forEach((n, i) => { if (n == null) restIndices.push(i); });

    let restIdx;
    let usingFallback = false;
    if (restIndices.length > 0) {
      restIdx = restIndices[Math.floor(Math.random() * restIndices.length)];
    } else {
      // Fallback: insert after a random non-first note (treat as a fake rest)
      const insertable = noteIndices.slice(1);
      restIdx = insertable[Math.floor(Math.random() * insertable.length)];
      usingFallback = true;
    }

    // Find neighbors that surround this position (skipping over other rests)
    let prevNote = null;
    for (let i = restIdx - 1; i >= 0; i--) {
      if (tune.notes[i] != null) { prevNote = tune.notes[i]; break; }
    }
    let nextNote = null;
    for (let i = restIdx + 1; i < tune.notes.length; i++) {
      if (tune.notes[i] != null) { nextNote = tune.notes[i]; break; }
    }
    const candidates = SCALE_ORDER.filter(n => n !== prevNote && n !== nextNote);
    const extraNote = candidates[Math.floor(Math.random() * candidates.length)];

    // Build the "corrupted" sequence:
    //   - Real-rest path: replace the rest at restIdx with the extra note (length unchanged)
    //   - Fallback path:  splice the extra note in AFTER restIdx (length +1)
    const corrupted = [];
    const corruptedSlotMap = [];
    let newS = 0;
    let newCorrectSlot = -1;

    if (!usingFallback) {
      // Walk the original; at restIdx swap null → extraNote
      tune.notes.forEach((n, i) => {
        if (i === restIdx) {
          corrupted.push(extraNote);
          corruptedSlotMap.push(newS);
          newCorrectSlot = newS;
          newS += 1;
        } else {
          corrupted.push(n);
          if (n == null) corruptedSlotMap.push(-1);
          else { corruptedSlotMap.push(newS); newS += 1; }
        }
      });
    } else {
      // Splice the extra note in AFTER restIdx
      tune.notes.forEach((n, i) => {
        corrupted.push(n);
        if (n == null) corruptedSlotMap.push(-1);
        else { corruptedSlotMap.push(newS); newS += 1; }
        if (i === restIdx) {
          corrupted.push(extraNote);
          corruptedSlotMap.push(newS);
          newCorrectSlot = newS;
          newS += 1;
        }
      });
    }

    return {
      tune,
      corruptIdx: -1,                   // not used in extra mode
      correctSlot: newCorrectSlot,
      original: null,
      wrong: extraNote,
      corrupted,
      slotMap,                          // original tune.notes layout
      corruptedSlotMap,                 // corrupted layout
      totalSlots: newS,
      mode: 'extra',
      restWasReal: !usingFallback,      // true → the suspect covered a real rest
    };
  }

  const corruptIdx = corruptable[Math.floor(Math.random() * corruptable.length)];
  const original = tune.notes[corruptIdx];
  const wrong = pickWrongNote(original, lvl.swapMin, lvl.swapMax);
  const corrupted = tune.notes.map((n, i) => (i === corruptIdx ? wrong : n));

  return {
    tune,
    corruptIdx,        // index into tune.notes (with rests)
    correctSlot: slotMap[corruptIdx], // index into the slot row (without rests)
    original,
    wrong,
    corrupted,
    slotMap,
    corruptedSlotMap: slotMap,         // identical in wrong-note mode
    totalSlots: s,
    mode: 'wrong',
  };
}

export default function DetectivePage() {
  const { nameFor } = useNoteNames();
  const nameOf = (note) => { const b = BELL_BY_NOTE[note]; return b ? nameFor(b.note, b.solfege) : note; };
  const navigate = useNavigate();
  const { playBellNote, initAudioContext, playFeedbackSound } = useAudio();

  const [gameState, setGameState] = useState('menu'); // menu | playing | gameover | win
  const [difficulty, setDifficulty] = useState('easy');
  const [round, setRound] = useState(null);          // current round data
  const [roundNum, setRoundNum] = useState(1);
  const [lives, setLives] = useState(STARTING_LIVES);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [bestRecords, setBestRecords] = useState(loadBest);

  const [playbackIdx, setPlaybackIdx] = useState(-1); // index of currently-lit slot (or -1)
  const [phase, setPhase] = useState('listen_original'); // listen_original | gap | listen_corrupted | guess | reveal
  const [guessSlot, setGuessSlot] = useState(null);
  const [isCorrect, setIsCorrect] = useState(null);
  // Rest Quiz only — countdown for the guess phase
  const [secsLeft, setSecsLeft] = useState(0);

  const playbackTimerRef = useRef(null);
  const cancelPlaybackRef = useRef(false);
  const tickRef = useRef(null);

  // ------- Cleanup playback on unmount -------
  useEffect(() => () => {
    cancelPlaybackRef.current = true;
    if (playbackTimerRef.current) clearTimeout(playbackTimerRef.current);
    if (tickRef.current) clearInterval(tickRef.current);
  }, []);

  // ------- Rest Quiz timeout — auto-reveal as a miss when the clock hits 0 -------
  useEffect(() => {
    if (round?.mode !== 'extra') return;
    if (phase !== 'guess') return;
    if (secsLeft !== 0) return;
    // Force the round to fail
    if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null; }
    setIsCorrect(false);
    setLives((l) => l - 1);
    setStreak(0);
    setPhase('reveal');
    try { playFeedbackSound('miss'); } catch { /* ignore */ }
  }, [secsLeft, phase, round, playFeedbackSound]);

  // ------- Playback driver. `mode` = 'original' | 'corrupted' -------
  // Plays each note of the sequence at `noteMs` intervals, lighting up the
  // corresponding slot. `null` entries are rests (silent, slot-less).
  // In extra-note mode the corrupted sequence has an extra entry; we use the
  // `corruptedSlotMap` so the lit-slot index matches the rendered chip row.
  const playSequence = useCallback((roundData, mode, onDone) => {
    if (!roundData) return;
    const seq = mode === 'corrupted' ? roundData.corrupted : roundData.tune.notes;
    const sMap = mode === 'corrupted'
      ? (roundData.corruptedSlotMap || roundData.slotMap)
      : roundData.slotMap;
    const lvl = LEVELS[difficulty];
    const noteMs = lvl.noteMs;

    cancelPlaybackRef.current = false;
    setPlaybackIdx(-1);

    let i = 0;
    const tick = () => {
      if (cancelPlaybackRef.current) return;
      if (i >= seq.length) {
        setPlaybackIdx(-1);
        if (onDone) onDone();
        return;
      }
      const note = seq[i];
      const slotIdx = sMap[i];
      if (note != null) {
        setPlaybackIdx(slotIdx);
        playBellNote(note);
      } else {
        // Rest — clear the lit slot during silence
        setPlaybackIdx(-1);
      }
      i += 1;
      playbackTimerRef.current = setTimeout(tick, noteMs);
    };
    tick();
  }, [difficulty, playBellNote]);

  // Two-pass playback: original → gap → corrupted → guess phase.
  // In Rest Quiz (extra-note) mode we also start a 30s countdown when the
  // guess phase opens. Running out of time costs a life and reveals.
  const playRound = useCallback((roundData) => {
    if (!roundData) return;
    setPhase('listen_original');
    playSequence(roundData, 'original', () => {
      // Brief pause between original and corrupted versions
      setPhase('gap');
      playbackTimerRef.current = setTimeout(() => {
        setPhase('listen_corrupted');
        playSequence(roundData, 'corrupted', () => {
          setPhase('guess');
          // Start Rest Quiz timer
          if (LEVELS[difficulty].timeLimit) {
            setSecsLeft(LEVELS[difficulty].timeLimit);
            if (tickRef.current) clearInterval(tickRef.current);
            tickRef.current = setInterval(() => {
              setSecsLeft((s) => {
                if (s <= 1) {
                  clearInterval(tickRef.current);
                  tickRef.current = null;
                  return 0;
                }
                return s - 1;
              });
            }, 1000);
          }
        });
      }, 700);
    });
  }, [playSequence, difficulty]);

  // ------- Round / game lifecycle -------
  const startGame = useCallback((diffOverride) => {
    initAudioContext();
    cancelPlaybackRef.current = true;
    if (playbackTimerRef.current) clearTimeout(playbackTimerRef.current);
    if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null; }
    const diff = typeof diffOverride === 'string' ? diffOverride : difficulty;
    setDifficulty(diff);
    setLives(STARTING_LIVES);
    setScore(0);
    setStreak(0);
    setBestStreak(0);
    setRoundNum(1);
    setGuessSlot(null);
    setIsCorrect(null);
    setSecsLeft(LEVELS[diff].timeLimit || 0);
    const r = buildRound(diff);
    setRound(r);
    setGameState('playing');
    setTimeout(() => playRound(r), 350);
  }, [initAudioContext, difficulty, playRound]);

  const handleGuess = useCallback((slotNum) => {
    if (round == null || guessSlot != null) return;
    // Allow guess during the corrupted playback — but only for the currently-lit slot.
    // Tapping the lit chip immediately ends playback and submits the guess.
    if (phase === 'listen_corrupted') {
      if (slotNum !== playbackIdx) return;
      cancelPlaybackRef.current = true;
      if (playbackTimerRef.current) clearTimeout(playbackTimerRef.current);
    } else if (phase !== 'guess') {
      return;
    }
    const correct = slotNum === round.correctSlot;
    setGuessSlot(slotNum);
    setIsCorrect(correct);
    setPhase('reveal');
    // Stop the Rest Quiz timer if it's running
    if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null; }

    if (correct) {
      const bonus = 20 + Math.max(0, (round.totalSlots - 5)) * 2;
      const newStreak = streak + 1;
      const streakBonus = newStreak >= 3 ? 10 : 0;
      const total = bonus + streakBonus;
      setScore((s) => s + total);
      setStreak(newStreak);
      setBestStreak((b) => Math.max(b, newStreak));
      try { earnSticker('fit_doctor_detective'); } catch { /* ignore */ }
      // 🎧 Note Detective achievement — Cadet on first correct guess ever
      try { earnAchievement('ear', 'cadet'); } catch { /* ignore */ }
      playFeedbackSound('perfect');
    } else {
      setLives((l) => l - 1);
      setStreak(0);
      playFeedbackSound('error');
    }
  }, [phase, round, guessSlot, streak, playFeedbackSound, playbackIdx]);

  // Auto-advance from reveal to next round (or game over)
  const advance = useCallback(() => {
    if (lives <= 0) {
      const lvl = LEVELS[difficulty];
      const prev = bestRecords[difficulty] || { score: 0, streak: 0 };
      const next = { ...bestRecords, [difficulty]: { score: Math.max(prev.score, score), streak: Math.max(prev.streak, bestStreak) } };
      saveBest(next);
      setBestRecords(next);
      if (score > 0) {
        try { earnSticker(lvl.sticker); } catch { /* ignore */ }
      }
      setGameState('gameover');
      return;
    }
    if (roundNum >= ROUNDS_PER_RUN) {
      const lvl = LEVELS[difficulty];
      const prev = bestRecords[difficulty] || { score: 0, streak: 0 };
      const next = { ...bestRecords, [difficulty]: { score: Math.max(prev.score, score), streak: Math.max(prev.streak, bestStreak) } };
      saveBest(next);
      setBestRecords(next);
      try { earnSticker(lvl.sticker); } catch { /* ignore */ }
      // 🎧 Note Detective achievement — completing the run on each difficulty
      // proves a tier of pitch-reading skill.
      try {
        if (difficulty === 'easy')     earnAchievement('ear', 'cadet');
        if (difficulty === 'medium')   earnAchievementUpTo('ear', 'pro');
        if (difficulty === 'hard')     earnAchievementUpTo('ear', 'master');
        if (difficulty === 'restquiz') earnAchievement('ear', 'cadet');
      } catch { /* ignore */ }
      if (bestStreak >= ROUNDS_PER_RUN) {
        try { earnSticker('detective_perfect'); } catch { /* ignore */ }
      }
      setGameState('win');
      return;
    }
    const r = buildRound(difficulty);
    setRound(r);
    setRoundNum((n) => n + 1);
    setGuessSlot(null);
    setIsCorrect(null);
    setSecsLeft(LEVELS[difficulty].timeLimit || 0);
    setTimeout(() => playRound(r), 350);
  }, [lives, roundNum, difficulty, bestRecords, score, bestStreak, playRound]);

  // Re-listen handlers during guess phase
  const replayOriginal = useCallback(() => {
    if (!round || phase === 'listen_original' || phase === 'listen_corrupted') return;
    cancelPlaybackRef.current = true;
    if (playbackTimerRef.current) clearTimeout(playbackTimerRef.current);
    setPhase('listen_original');
    playSequence(round, 'original', () => setPhase('guess'));
  }, [round, phase, playSequence]);

  const replayCorrupted = useCallback(() => {
    if (!round || phase === 'listen_original' || phase === 'listen_corrupted') return;
    cancelPlaybackRef.current = true;
    if (playbackTimerRef.current) clearTimeout(playbackTimerRef.current);
    setPhase('listen_corrupted');
    playSequence(round, 'corrupted', () => setPhase('guess'));
  }, [round, phase, playSequence]);

  // ===== MENU =====
  if (gameState === 'menu') {
    return (
      <div
        data-testid="detective-menu"
        className="min-h-screen flex flex-col items-center justify-center jma-safe-center p-4 pt-20 md:pt-24 lg:pt-32 pb-8 relative"
        style={{
          backgroundImage: 'url(assets/backgrounds/detective-room.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <GameHeader showHomeButton={true} backLink={{ to: '/play', label: 'Play' }} />
        <FullscreenButton />
        <RoomCharacters room="detective" />

        <motion.div className="text-center mb-3" initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
          <h1
            className="text-3xl md:text-5xl font-black font-display uppercase"
            style={{ color: 'white', textShadow: '3px 3px 0 var(--jma-dark), 5px 5px 0 rgba(0,0,0,0.5)' }}
          >
            DETECTIVE<br className="md:hidden" /> DR. JELLYBONE
          </h1>
          <p className="text-sm md:text-base font-bold mt-1" style={{ color: '#FFE9C4', textShadow: '1px 1px 0 rgba(0,0,0,0.6)' }}>
            Find the wrong note!
          </p>
        </motion.div>

        <motion.div
          className="game-card p-5 mb-4 max-w-md text-center relative overflow-visible"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.15 }}
        >
          {/* Detective Dr. Jellybone illustration */}
          <motion.img
            src="assets/characters/dr-jellybone-detective.png"
            alt="Detective Dr. Jellybone"
            className="absolute -top-12 -right-6 md:-top-16 md:-right-10 pointer-events-none select-none z-10"
            style={{ width: 'clamp(80px, 16vw, 130px)', filter: 'drop-shadow(0 6px 6px rgba(0,0,0,0.4))' }}
            animate={{ y: [0, -5, 0], rotate: [-3, 3, -3] }}
            transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
            draggable={false}
          />

          <Sparkles className="w-9 h-9 mx-auto mb-1" style={{ color: 'var(--jma-purple)' }} />
          <h2 className="text-xl font-bold mb-2 font-display">How to Play</h2>
          <p className="text-sm md:text-base" style={{ color: 'var(--jma-dark)' }}>
            1. Listen to the <span className="font-black text-[var(--jma-green)]">ORIGINAL</span> tune<br />
            2. Then hear the <span className="font-black text-[var(--jma-red)]">SUSPECT</span> — one note is off!<br />
            3. Tap the wrong note as you hear it, or wait until the end<br />
            4. Three strikes and the case closes!
          </p>
        </motion.div>

        <div className="grid gap-2 w-full max-w-md">
          {/* Main difficulty picks — standard Easy / Medium / Hard */}
          {Object.entries(LEVELS).filter(([k]) => k !== 'restquiz').map(([key, lvl], idx) => {
            const best = bestRecords[key];
            return (
              <motion.button
                key={key}
                data-testid={`detective-difficulty-${key}`}
                className={`level-card p-3 text-left flex items-center justify-between ${difficulty === key ? 'ring-4 ring-[var(--jma-purple)]' : ''}`}
                onClick={() => startGame(key)}
                initial={{ x: -40, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.08 * idx }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div>
                  <h3 className="text-lg font-bold font-display">{lvl.name}</h3>
                  <p className="text-xs opacity-60">{lvl.description}</p>
                </div>
                {best && best.score > 0 && (
                  <div className="text-right">
                    <div className="text-[10px] uppercase font-bold opacity-60">Best</div>
                    <div className="text-sm font-black" style={{ color: 'var(--jma-orange)' }}>
                      {best.score} pts
                    </div>
                  </div>
                )}
              </motion.button>
            );
          })}

          {/* --- BONUS MODE section — Sneaky Note is a different game
               mechanic (find the ADDED note in a rest), not a harder
               difficulty. Separate visual treatment so kids don't
               confuse it for "extra-hard mode." ------------------- */}
          {LEVELS.restquiz && (() => {
            const lvl = LEVELS.restquiz;
            const best = bestRecords.restquiz;
            const accent = '#AF52DE';
            return (
              <>
                <div className="flex items-center gap-2 mt-2 mb-1">
                  <div className="flex-1 h-[2px] rounded-full" style={{ background: 'rgba(10,37,64,0.15)' }} />
                  <div
                    className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: accent, color: 'white', border: '2px solid var(--jma-dark)' }}
                  >
                    Bonus Mode
                  </div>
                  <div className="flex-1 h-[2px] rounded-full" style={{ background: 'rgba(10,37,64,0.15)' }} />
                </div>
                <motion.button
                  data-testid="detective-difficulty-restquiz"
                  className={`level-card p-4 text-left flex items-center gap-3 ${difficulty === 'restquiz' ? 'ring-4 ring-[var(--jma-purple)]' : ''}`}
                  style={{
                    background: `linear-gradient(135deg, ${accent}18 0%, ${accent}33 100%)`,
                    borderColor: accent,
                    borderWidth: 4,
                    boxShadow: `0 6px 0 0 ${accent}`,
                  }}
                  onClick={() => startGame('restquiz')}
                  initial={{ y: 16, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.32 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div
                    className="w-12 h-12 rounded-full flex-shrink-0 flex items-center justify-center border-2"
                    style={{ backgroundColor: 'white', borderColor: accent }}
                  >
                    <Search className="w-6 h-6" style={{ color: accent }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-black font-display" style={{ color: 'var(--jma-dark)' }}>
                      {lvl.name}
                    </h3>
                    <p className="text-xs font-bold" style={{ color: 'var(--jma-dark)' }}>
                      {lvl.description}
                    </p>
                  </div>
                  {best && best.score > 0 && (
                    <div className="text-right flex-shrink-0">
                      <div className="text-[10px] uppercase font-bold opacity-60">Best</div>
                      <div className="text-sm font-black" style={{ color: 'var(--jma-orange)' }}>
                        {best.score} pts
                      </div>
                    </div>
                  )}
                </motion.button>
              </>
            );
          })()}
        </div>
      </div>
    );
  }

  // ===== PLAYING / WIN / GAMEOVER =====
  const tune = round?.tune;
  return (
    <div
      data-testid="detective-playing"
      className="min-h-screen flex flex-col relative"
      style={{
        backgroundImage: 'url(assets/backgrounds/detective-room.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <GameHeader title="DR. JELLYBONE" subtitle={LEVELS[difficulty].name} showHomeButton={true} backLink={{ to: '/play', label: 'Play' }} />
      <RoomCharacters room="detective" />

      <main className="flex-1 flex flex-col items-center pt-20 md:pt-24 pb-6 px-3">
        {/* HUD */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-3">
          <div
            data-testid="detective-round"
            className="px-3 py-1 rounded-full font-black text-sm border-2"
            style={{ backgroundColor: 'white', color: 'var(--jma-dark)', borderColor: 'var(--jma-dark)' }}
          >
            Case {roundNum} / {ROUNDS_PER_RUN}
          </div>
          <div
            data-testid="detective-score"
            className="px-3 py-1 rounded-full font-black text-sm border-2"
            style={{ backgroundColor: 'var(--jma-yellow)', color: 'var(--jma-dark)', borderColor: 'var(--jma-dark)' }}
          >
            {score} pts
          </div>
          {streak >= 2 && (
            <div
              data-testid="detective-streak"
              className="px-3 py-1 rounded-full font-black text-sm border-2 flex items-center gap-1"
              style={{ backgroundColor: 'var(--jma-orange)', color: 'white', borderColor: 'var(--jma-dark)' }}
            >
              🔥 {streak}
            </div>
          )}
          <div data-testid="detective-lives" className="flex items-center gap-1">
            {Array.from({ length: STARTING_LIVES }).map((_, i) => (
              <Heart
                key={i}
                className="w-6 h-6"
                style={{
                  color: i < lives ? '#FF3B30' : 'rgba(255,255,255,0.35)',
                  fill: i < lives ? '#FF3B30' : 'transparent',
                  strokeWidth: 2.5,
                }}
              />
            ))}
          </div>
        </div>

        {/* Tune card */}
        <motion.div
          key={tune?.id + String(roundNum)}
          className="game-card p-4 md:p-5 mb-4 max-w-2xl w-full text-center relative"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
        >
          {/* Detective Dr. Jellybone peeks at the case file */}
          <motion.img
            src="assets/characters/dr-jellybone-detective.png"
            alt="Detective Dr. Jellybone"
            className="absolute -top-16 -left-2 md:-top-20 md:-left-6 pointer-events-none select-none"
            style={{ width: 'clamp(70px, 14vw, 130px)', filter: 'drop-shadow(0 6px 6px rgba(0,0,0,0.4))' }}
            animate={{ y: [0, -4, 0], rotate: [-2, 2, -2] }}
            transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
            draggable={false}
          />

          <div className="text-xs uppercase font-black opacity-60" style={{ color: 'var(--jma-dark)' }}>
            Case file
          </div>
          <h2 className="text-xl md:text-2xl font-black font-display mb-1" style={{ color: 'var(--jma-dark)' }}>
            {tune?.name || '...'}
          </h2>

          {/* Phase label */}
          <div
            data-testid="detective-phase-label"
            className="inline-block px-3 py-1 rounded-full text-xs md:text-sm font-black border-2 mt-1"
            style={{
              backgroundColor:
                phase === 'listen_original' ? '#34A853' :
                phase === 'gap' ? 'rgba(255,255,255,0.85)' :
                phase === 'listen_corrupted' ? '#FF3B30' :
                phase === 'guess' ? 'var(--jma-yellow)' :
                'rgba(255,255,255,0.85)',
              color:
                phase === 'listen_original' || phase === 'listen_corrupted' ? 'white' : 'var(--jma-dark)',
              borderColor: 'var(--jma-dark)',
            }}
          >
            {phase === 'listen_original' && '🎵 Listen to the ORIGINAL tune'}
            {phase === 'gap' && '🤔 Now find what changed...'}
            {phase === 'listen_corrupted' && (round?.mode === 'extra' ? '🔍 The suspect added a note where there should be silence — tap it!' : '🔍 Tap the wrong note the moment you hear it!')}
            {phase === 'guess' && (round?.mode === 'extra' ? '👇 Which note covered up the silence?' : '👇 Tap the note that sounded wrong')}
            {phase === 'reveal' && (isCorrect ? '🔍 Case solved!' : '😅 Try the next case!')}
          </div>

          {/* Rest Quiz timer pill — only in extra mode while guessing */}
          {round?.mode === 'extra' && (phase === 'guess' || phase === 'listen_corrupted') && (
            <div
              data-testid="detective-timer"
              className="inline-block ml-2 px-3 py-1 rounded-full text-xs md:text-sm font-black border-2 mt-1"
              style={{
                backgroundColor: secsLeft <= 5 ? '#FF3B30' : 'white',
                color: secsLeft <= 5 ? 'white' : 'var(--jma-dark)',
                borderColor: 'var(--jma-dark)',
              }}
            >
              ⏱ {secsLeft}s
            </div>
          )}

          {/* Beat slots — rests are skipped, slots are numbered only across real notes.
              In extra-note mode (Rest Quiz) the chips render from the CORRUPTED sequence
              so the extra note shows up as a chip the kid can pick. We also hide rest
              dots in Rest Quiz mode — the inserted extra chip shifts the line by one,
              and the leftover rest dots from the original tune just look out of place. */}
          <div className="flex flex-wrap items-center justify-center gap-2 md:gap-2.5 mt-3">
            {round && (round.mode === 'extra' ? round.corrupted : tune?.notes)?.map((note, i) => {
              if (note == null) {
                // Hide rest placeholders entirely in Rest Quiz mode for a cleaner row
                if (round.mode === 'extra') return null;
                // Rest — show a subtle dash, not a clickable slot
                return (
                  <div
                    key={`rest-${i}`}
                    className="flex items-center justify-center"
                    style={{
                      width: 'clamp(20px, 4vw, 28px)',
                      height: 'clamp(60px, 12vw, 86px)',
                      color: 'rgba(10,37,64,0.4)',
                      fontWeight: 900,
                      fontSize: '1.2rem',
                    }}
                    aria-hidden="true"
                  >
                    •
                  </div>
                );
              }
              const sMap = round.mode === 'extra' ? round.corruptedSlotMap : round.slotMap;
              const slotNum = sMap[i];
              const bell = BELL_BY_NOTE[note];
              const isLit = playbackIdx === slotNum;
              const isGuessed = guessSlot === slotNum;
              const isAnswer = phase === 'reveal' && slotNum === round.correctSlot;
              const showAnswer = phase === 'reveal';
              const isWrongGuess = isGuessed && !isCorrect;
              const isCorrectAnswer = isAnswer && isCorrect && isGuessed;
              // A chip is tappable when:
              //   - It's the guess phase (any chip), OR
              //   - It's the corrupted playback phase AND this is the currently-lit chip
              //     (kids can buzz in the instant they hear the wrong note)
              const isTappable =
                phase === 'guess' || (phase === 'listen_corrupted' && isLit);
              // State-driven palette: lit (during playback) glows in the bell's color,
              // reveal-state goes hard green/red. Rest of the time the chip sits as a
              // cream "evidence card" pinned to the corkboard.
              const fillColor = isCorrectAnswer
                ? '#34A853'
                : isAnswer
                  ? '#FF3B30'
                  : isWrongGuess
                    ? '#FF3B30'
                    : isLit
                      ? (bell ? bell.color : '#FFCC00')
                      : '#FFF7E1';
              const labelColor = isCorrectAnswer || isAnswer || isWrongGuess || isLit
                ? 'white'
                : 'var(--jma-dark)';
              // Slight hand-pinned rotation per slot (deterministic, not random per render)
              const tilt = ((slotNum * 37) % 7) - 3; // -3..+3 deg

              return (
                <motion.button
                  key={`slot-${i}`}
                  data-testid={`detective-slot-${slotNum}`}
                  onClick={() => handleGuess(slotNum)}
                  disabled={!isTappable}
                  className="relative rounded-lg border-3 flex flex-col items-center justify-between overflow-hidden"
                  style={{
                    width: 'clamp(46px, 9vw, 64px)',
                    height: 'clamp(60px, 12vw, 86px)',
                    borderColor: 'var(--jma-dark)',
                    background: `linear-gradient(180deg, ${fillColor} 0%, ${fillColor} 55%, rgba(0,0,0,0.06) 100%)`,
                    boxShadow: isLit
                      ? `0 0 0 3px ${bell ? bell.color : '#FFCC00'}66, 0 6px 0 0 var(--jma-dark), 0 14px 22px rgba(0,0,0,0.28)`
                      : '0 4px 0 0 var(--jma-dark), 0 8px 14px rgba(0,0,0,0.18)',
                    cursor: isTappable ? 'pointer' : 'default',
                    transform: `rotate(${tilt}deg) scale(${isLit ? 1.14 : 1})`,
                    transformOrigin: 'center',
                    transition: 'transform 0.14s cubic-bezier(0.34, 1.56, 0.64, 1), background 0.18s, box-shadow 0.18s',
                  }}
                  whileHover={isTappable ? { y: -4, scale: isLit ? 1.18 : 1.05, rotate: 0 } : {}}
                  whileTap={isTappable ? { y: 1, scale: isLit ? 1.08 : 0.98 } : {}}
                >
                  {/* Top tape strip — pinned-to-corkboard feel */}
                  <div
                    className="absolute top-0 left-0 right-0 flex items-center justify-center"
                    style={{
                      height: '14px',
                      background: 'linear-gradient(180deg, rgba(255,255,255,0.35) 0%, transparent 100%)',
                      borderBottom: '1px dashed rgba(10,37,64,0.18)',
                    }}
                  />
                  {/* Numbered evidence-tag badge */}
                  <span
                    className="mt-1.5 inline-flex items-center justify-center rounded-full border-2 text-[10px] md:text-xs font-black font-display leading-none"
                    style={{
                      width: '18px',
                      height: '18px',
                      backgroundColor: 'rgba(255,255,255,0.92)',
                      borderColor: 'var(--jma-dark)',
                      color: 'var(--jma-dark)',
                    }}
                  >
                    {slotNum + 1}
                  </span>
                  {/* Centered eighth-note glyph (or solfege when revealing the answer) */}
                  <div className="flex-1 flex items-center justify-center w-full">
                    {showAnswer && isAnswer && bell ? (
                      <span
                        className="text-xs md:text-sm font-black font-display"
                        style={{ color: labelColor, textShadow: '1px 1px 0 rgba(0,0,0,0.18)' }}
                      >
                        {nameFor(bell.note, bell.solfege)}{note === 'High C' ? '↑' : ''}
                      </span>
                    ) : (
                      <svg
                        viewBox="0 0 24 24"
                        width="16"
                        height="16"
                        fill="none"
                        stroke={labelColor}
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        style={{ opacity: isLit || isAnswer || isWrongGuess ? 1 : 0.6 }}
                        aria-hidden="true"
                      >
                        <circle cx="6" cy="18" r="3" />
                        <path d="M9 18V4l10-1v13" />
                        <circle cx="16" cy="17" r="3" />
                      </svg>
                    )}
                  </div>
                </motion.button>
              );
            })}
          </div>

          {/* Reveal info */}
          {phase === 'reveal' && round && (
            <motion.div
              data-testid="detective-reveal"
              className="mt-3"
              initial={{ y: 8, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
            >
              <div
                className="inline-block px-3 py-1.5 rounded-full font-black text-xs md:text-sm border-2"
                style={{
                  backgroundColor: isCorrect ? '#34A853' : '#FF3B30',
                  color: 'white',
                  borderColor: 'var(--jma-dark)',
                  boxShadow: '0 3px 0 0 var(--jma-dark)',
                }}
              >
                {round.mode === 'extra'
                  ? (isCorrect
                      ? `🔍 Slot ${round.correctSlot + 1} (${nameOf(round.wrong)}) covered up a silence — that spot should have been a REST!`
                      : `Slot ${round.correctSlot + 1} (${nameOf(round.wrong)}) was hiding a silence. The song has a rest there!`)
                  : (isCorrect
                      ? `🔍 Beat ${round.correctSlot + 1} was the wrong one — should be ${nameOf(round.original)}`
                      : `Beat ${round.correctSlot + 1} was off! Should be ${nameOf(round.original)}`)
                }
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                <button
                  data-testid="detective-next-btn"
                  onClick={advance}
                  className="chunky-btn bg-[var(--jma-yellow)] text-[var(--jma-dark)] px-4 py-2 flex items-center gap-2"
                >
                  {lives <= 0 || roundNum >= ROUNDS_PER_RUN ? 'See Results' : 'Next Case'} <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}

          {/* Replay buttons during guess phase */}
          {phase === 'guess' && (
            <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
              <button
                data-testid="detective-replay-original-btn"
                onClick={replayOriginal}
                className="chunky-btn bg-[var(--jma-green)] text-white px-3 py-1.5 text-sm flex items-center gap-1.5"
              >
                <Volume2 className="w-4 h-4" /> Hear Original
              </button>
              <button
                data-testid="detective-replay-suspect-btn"
                onClick={replayCorrupted}
                className="chunky-btn bg-[var(--jma-red)] text-white px-3 py-1.5 text-sm flex items-center gap-1.5"
              >
                <Search className="w-4 h-4" /> Hear Suspect
              </button>
            </div>
          )}

          {(phase === 'listen_original' || phase === 'listen_corrupted' || phase === 'gap') && (
            <p className="mt-3 text-sm font-bold opacity-70" style={{ color: 'var(--jma-dark)' }}>
              🎧 Listen carefully...
            </p>
          )}
        </motion.div>

        {/* Bottom controls */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          <button
            data-testid="detective-back-btn"
            onClick={() => setGameState('menu')}
            className="chunky-btn bg-white text-[var(--jma-dark)] px-3 py-1.5 text-sm"
          >
            Change Level
          </button>
        </div>

        {/* GAME OVER / WIN modal */}
        <AnimatePresence>
          {(gameState === 'gameover' || gameState === 'win') && (
            <motion.div
              data-testid={gameState === 'win' ? 'detective-win' : 'detective-gameover'}
              className="fixed inset-0 z-40 flex items-center justify-center p-4"
              style={{ backgroundColor: 'rgba(10,37,64,0.55)', backdropFilter: 'blur(4px)' }}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            >
              {gameState === 'win' && <Confetti count={48} size={420} mega={bestStreak >= ROUNDS_PER_RUN} />}
              <motion.div
                className="bg-white rounded-3xl border-4 p-6 max-w-md w-full text-center"
                style={{ borderColor: 'var(--jma-dark)', boxShadow: '0 10px 0 0 var(--jma-dark)' }}
                initial={{ scale: 0.6, y: 30 }} animate={{ scale: 1, y: 0 }}
              >
                <div className="text-5xl mb-2">{gameState === 'win' ? '🏆' : '🔍'}</div>
                <h2 className="text-2xl md:text-3xl font-black font-display mb-1" style={{ color: 'var(--jma-dark)' }}>
                  {gameState === 'win' ? 'Case File Closed!' : 'Case Re-opened'}
                </h2>
                <p className="font-bold mb-3" style={{ color: 'var(--jma-dark)' }}>
                  {gameState === 'win'
                    ? `You solved all ${ROUNDS_PER_RUN} cases!`
                    : 'Three strikes — the wrong notes got away!'}
                </p>
                <div className="grid grid-cols-2 gap-2 mb-4 text-sm">
                  <div className="bg-[var(--jma-yellow)] rounded-xl border-3 p-2" style={{ borderColor: 'var(--jma-dark)' }}>
                    <div className="text-[10px] uppercase font-black opacity-70">Score</div>
                    <div className="text-xl font-black">{score}</div>
                  </div>
                  <div className="bg-[var(--jma-orange)] rounded-xl border-3 p-2" style={{ borderColor: 'var(--jma-dark)', color: 'white' }}>
                    <div className="text-[10px] uppercase font-black opacity-80">Best Streak</div>
                    <div className="text-xl font-black">🔥 {bestStreak}</div>
                  </div>
                </div>
                <div className="flex items-center justify-center gap-2 mb-4">
                  <Trophy className="w-5 h-5" style={{ color: '#FFCC00' }} />
                  <span className="text-sm font-black uppercase" style={{ color: 'var(--jma-dark)' }}>
                    Best Score: {(bestRecords[difficulty]?.score) || score}
                  </span>
                </div>
                <div className="flex flex-wrap justify-center gap-2">
                  <button
                    data-testid="detective-modal-again"
                    onClick={() => startGame(difficulty)}
                    className="chunky-btn bg-[var(--jma-green)] text-white px-4 py-2 flex items-center gap-1.5"
                  >
                    <RotateCcw className="w-4 h-4" /> Play Again
                  </button>
                  <button
                    data-testid="detective-modal-menu"
                    onClick={() => setGameState('menu')}
                    className="chunky-btn bg-[var(--jma-yellow)] text-[var(--jma-dark)] px-4 py-2"
                  >
                    Change Level
                  </button>
                  <button
                    data-testid="detective-modal-home"
                    onClick={() => navigate('/')}
                    className="chunky-btn bg-white text-[var(--jma-dark)] px-4 py-2"
                  >
                    Home
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
