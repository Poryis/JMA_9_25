// Name That Note — treble-staff note identification, hosted by Finn.
//
// Every round opens with a short STAFF TOUR (a note walks C → High C, each
// stop lights up its name and rings its bell) so kids have a referent.
//
// Modes:  Name It  → a note appears, kid taps its name (letters by default)
//         Place It → kid drags the waiting note to where the named note lives
// Finn drives every step from a speech bubble; misses teach the line/space
// rule ("E is the bottom line"). Earns the Music Scholar ladder at 8/10+.

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Music2, MapPin, Clock, RotateCcw, Play, Volume2, Check, Lightbulb, Star, X } from 'lucide-react';
import { GameHeader } from '../components/GameUI';
import { FullscreenButton } from '../components/FullscreenButton';
import Confetti from '../components/Confetti';
import RoomCharacters from '../components/RoomCharacters';
import SolfegeStaff, { NOTE_Y, STAFF_NOTE_AREA_LEFT } from '../components/SolfegeStaff';
import { BELLS } from '../components/JellyBells';
import useAudio from '../hooks/useAudio';
import { earnAchievement, earnAchievementUpTo, earnSticker } from '../hooks/useStickers';
import { formatNoteName, getNoteNameMode, NOTE_NAME_MODES } from '../hooks/useNoteNames';

const ALL_NOTES = ['C', 'D', 'E', 'F', 'G', 'A', 'B', 'High C'];
const QUESTIONS_PER_ROUND = 10;
const PASS_MARK = 8;
const BELL_BY_NOTE = Object.fromEntries(BELLS.map((b) => [b.note, b]));
const HEAD_Y_NUDGE = 0.6;      // tiny downward nudge so heads sit dead-centre on their line/space
const PARK_Y = 93;             // where the draggable note waits (below the staff)
const STAFF_HEIGHT = 'clamp(220px, 34vh, 320px)';

const LEVELS = {
  cadet:  { name: 'Cadet',  description: 'C D E F G · no timer · hints',   pool: ['C', 'D', 'E', 'F', 'G'], secs: 0,  hints: Infinity },
  pro:    { name: 'Pro',    description: 'All 8 notes · 10s · 3 hints',    pool: ALL_NOTES, secs: 10, hints: 3 },
  master: { name: 'Master', description: 'All 8 notes · 6s · no hints',    pool: ALL_NOTES, secs: 6,  hints: 0 },
};

const MODES = [
  { id: 'name',  label: 'Name It',  blurb: 'See the note. Tap its name.',       Icon: Music2 },
  { id: 'place', label: 'Place It', blurb: 'Read the name. Drag the note home.', Icon: MapPin },
];

// The rule behind each note — shown after a miss so kids learn the WHY.
const WHY = {
  C: 'hangs below the staff on its own little line',
  D: 'sits just under the bottom line',
  E: 'is the bottom line',
  F: 'is the first space',
  G: 'is the second line',
  A: 'is the second space',
  B: 'is the middle line',
  'High C': 'is the third space',
};
const CHEERS = ['Nailed it!', 'Boom!', 'You read that like a pro!', 'Yes yes yes!', 'Sharp eyes!', 'Groovy!'];
const MISSES = ['Close one!', 'Almost!', 'Not quite —', 'Good try!'];

const BEST_KEY = 'jma_name_that_note_best_v1';
const loadBest = () => { try { return JSON.parse(localStorage.getItem(BEST_KEY) || '{}'); } catch { return {}; } };
const saveBest = (b) => { try { localStorage.setItem(BEST_KEY, JSON.stringify(b)); } catch { /* ignore */ } };

function playSfx(src, volume = 0.45) {
  try { const a = new Audio(src); a.volume = volume; a.play().catch(() => {}); } catch { /* ignore */ }
}

function labelFor(note, answerMode) {
  const base = formatNoteName(note, BELL_BY_NOTE[note].solfege, answerMode);
  return note === 'High C' ? `High ${base}` : base;
}

function nearestNote(yPct) {
  let best = ALL_NOTES[0];
  let bestDist = Infinity;
  for (const n of ALL_NOTES) {
    const d = Math.abs(NOTE_Y[n] - yPct);
    if (d < bestDist) { bestDist = d; best = n; }
  }
  return best;
}

// ---------------------------------------------------------------------------
// Small presentational pieces
// ---------------------------------------------------------------------------

// A plain quarter note drawn in CSS (no syllable, no bell colour) so nothing
// but staff position gives the answer away. Lives inside the note-area
// overlay; yPct is staff-relative. Stem up for C–A, down for B / High C.
function NoteHead({ yPct, color = 'var(--jma-dark)', glow = false, ledger = false, badge = null, initialY, chip, chipColor, testId, bounce = false }) {
  const stemUp = yPct > NOTE_Y.B + 1;
  return (
    <motion.div
      data-testid={testId}
      className="absolute pointer-events-none"
      style={{ left: '50%', height: '10%', aspectRatio: '1.35 / 1', x: '-50%', y: '-50%', zIndex: 4 }}
      initial={{ top: `${(initialY ?? yPct) + HEAD_Y_NUDGE}%`, scale: 1 }}
      animate={{ top: `${yPct + HEAD_Y_NUDGE}%`, scale: bounce ? [1, 1.32, 0.86, 1.1, 1] : 1 }}
      transition={bounce
        ? { top: { type: 'spring', stiffness: 300, damping: 11 }, scale: { duration: 0.6, ease: 'easeOut', times: [0, 0.35, 0.6, 0.82, 1] } }
        : { type: 'spring', stiffness: 380, damping: 26 }}
    >
      {ledger && (
        <div className="absolute" style={{ left: '-45%', right: '-45%', top: '50%', height: 2, marginTop: -1, backgroundColor: 'var(--jma-dark)' }} />
      )}
      {bounce && (
        <motion.div
          className="absolute rounded-full pointer-events-none"
          style={{ inset: '-32%', border: '3px solid rgba(255,204,0,0.75)' }}
          animate={{ scale: [1, 1.7], opacity: [0.75, 0] }}
          transition={{ duration: 0.8, repeat: Infinity, ease: 'easeOut' }}
        />
      )}
      <div
        className="absolute inset-0 rounded-full"
        style={{
          backgroundColor: color,
          transform: 'rotate(-18deg)',
          boxShadow: glow ? '0 0 0 4px rgba(255,204,0,0.6), 0 0 18px rgba(255,204,0,0.6)' : 'none',
          transition: 'background-color 0.2s, box-shadow 0.2s',
        }}
      />
      <div
        className="absolute"
        style={{
          width: 3,
          height: '300%',
          backgroundColor: color,
          transition: 'background-color 0.2s',
          ...(stemUp ? { right: 0, bottom: '50%' } : { left: 0, top: '50%' }),
        }}
      />
      {badge && (
        <motion.div
          className="absolute rounded-full flex items-center justify-center border-2"
          style={{ width: 22, height: 22, right: -14, top: -14, backgroundColor: '#FF3B30', borderColor: 'white', zIndex: 6 }}
          initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 500, damping: 18 }}
        >
          <X className="w-3.5 h-3.5 text-white" strokeWidth={4} />
        </motion.div>
      )}
      {chip && (
        <motion.div
          className="absolute px-2.5 py-0.5 rounded-full border-2 font-black font-display text-sm md:text-lg whitespace-nowrap"
          style={{
            left: '100%',
            top: '50%',
            marginLeft: 18,
            y: '-50%',
            backgroundColor: chipColor || 'var(--jma-dark)',
            color: 'white',
            borderColor: 'var(--jma-dark)',
            boxShadow: '0 3px 0 0 var(--jma-dark)',
          }}
          initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 320, damping: 18 }}
        >
          {chip}
        </motion.div>
      )}
    </motion.div>
  );
}

// Sparkle burst around a point (percent coords inside the note area).
function Burst({ yPct, color }) {
  const pieces = Array.from({ length: 12 }, (_, i) => {
    const angle = (i / 12) * Math.PI * 2;
    return { dx: Math.cos(angle) * (55 + (i % 3) * 18), dy: Math.sin(angle) * (55 + (i % 3) * 18), s: 6 + (i % 4) * 3 };
  });
  return (
    <div className="absolute pointer-events-none" style={{ left: '50%', top: `${yPct}%`, zIndex: 8 }}>
      {pieces.map((p, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{ width: p.s, height: p.s, backgroundColor: i % 2 ? color : '#FFCC00', marginLeft: -p.s / 2, marginTop: -p.s / 2 }}
          initial={{ x: 0, y: 0, opacity: 1, scale: 0.4 }}
          animate={{ x: p.dx, y: p.dy, opacity: 0, scale: 1.2 }}
          transition={{ duration: 0.65, ease: 'easeOut' }}
        />
      ))}
    </div>
  );
}

// Chalk-style "+12" that floats up from the note.
function ScorePop({ text, yPct }) {
  return (
    <motion.div
      className="absolute font-black font-display pointer-events-none whitespace-nowrap"
      style={{
        left: '50%', top: `${yPct}%`, zIndex: 9,
        fontSize: 'clamp(22px, 3.2vw, 34px)',
        color: '#FFCC00',
        rotate: -8,
      }}
      initial={{ x: 30, y: -10, opacity: 0, scale: 0.6 }}
      animate={{ x: 60, y: -70, opacity: [0, 1, 1, 0], scale: [0.6, 1.2, 1, 1] }}
      transition={{ duration: 1.1, ease: 'easeOut' }}
    >
      {text}
    </motion.div>
  );
}

// Ghosted letter names on every line/space (Hint).
function HintGhosts({ answerMode }) {
  return (
    <motion.div className="absolute inset-0 pointer-events-none" style={{ zIndex: 3 }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} data-testid="ntn-hint-ghosts">
      {ALL_NOTES.map((n) => (
        <div
          key={n}
          className="absolute font-black font-display text-xs md:text-sm px-1.5 rounded"
          style={{
            left: '3%', top: `${NOTE_Y[n] + HEAD_Y_NUDGE}%`, transform: 'translateY(-50%)',
            color: BELL_BY_NOTE[n].color, backgroundColor: 'rgba(255,255,255,0.85)',
            border: `1.5px dashed ${BELL_BY_NOTE[n].color}`,
          }}
        >
          {labelFor(n, answerMode)}
        </div>
      ))}
    </motion.div>
  );
}

// Finn + speech bubble. mood: idle | cheer | shrug | party
function FinnBubble({ text, mood }) {
  const anim = {
    idle:  { y: [0, -4, 0], rotate: 0, scale: 1 },
    cheer: { y: [0, -22, 0, -10, 0], rotate: [0, -6, 6, 0], scale: [1, 1.12, 1] },
    shrug: { y: 0, rotate: [0, -10, 8, -4, 0], scale: [1, 0.96, 1] },
    party: { y: [0, -26, 0, -26, 0], rotate: [0, -12, 12, -12, 0], scale: [1, 1.15, 1, 1.15, 1] },
  }[mood] || {};
  const dur = { idle: 2.2, cheer: 0.7, shrug: 0.6, party: 1.2 }[mood] || 1;
  return (
    <div className="flex items-center gap-2 md:gap-3 w-full max-w-2xl mb-2" data-testid="ntn-finn-row">
      <motion.img
        key={mood === 'party' ? 'disco' : 'danger'}
        src={mood === 'party' ? 'assets/characters/finn-disco.png' : 'assets/characters/finn-danger.png'}
        alt="Finn"
        draggable={false}
        className="flex-shrink-0 select-none"
        style={{ height: 'clamp(64px, 11vh, 96px)', filter: 'drop-shadow(0 5px 4px rgba(0,0,0,0.35))' }}
        animate={anim}
        transition={{ duration: dur, repeat: mood === 'idle' ? Infinity : 0, ease: 'easeInOut' }}
      />
      <div className="relative flex-1 min-w-0">
        <div
          className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-[9px] w-0 h-0"
          style={{ borderTop: '10px solid transparent', borderBottom: '10px solid transparent', borderRight: '11px solid var(--jma-dark)' }}
        />
        <AnimatePresence mode="wait">
          <motion.div
            key={text}
            data-testid="ntn-bubble"
            className="rounded-2xl border-3 px-3 py-2 font-black text-sm md:text-base leading-snug"
            style={{ backgroundColor: 'white', borderColor: 'var(--jma-dark)', color: 'var(--jma-dark)', boxShadow: '0 4px 0 0 var(--jma-dark)' }}
            initial={{ opacity: 0, y: 6, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
          >
            {text}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function NameThatNotePage() {
  const navigate = useNavigate();
  const { playBellNote, playFeedbackSound, initAudioContext } = useAudio();

  const [gameState, setGameState] = useState('menu'); // menu | tour | playing | round-complete
  const [mode, setMode] = useState('name');
  const [difficulty, setDifficulty] = useState('cadet');
  const [answerMode, setAnswerMode] = useState(() => (getNoteNameMode() === 'solfege' ? 'letters' : getNoteNameMode()));

  const [tourIndex, setTourIndex] = useState(0);
  const [qIndex, setQIndex] = useState(0);
  const [target, setTarget] = useState('C');
  const [picked, setPicked] = useState(null);       // answered note | 'timeout' | null
  const [reveal, setReveal] = useState(false);       // show correct spot after a miss
  const [locked, setLocked] = useState(false);
  const [results, setResults] = useState([]);
  const [missed, setMissed] = useState([]);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [secsLeft, setSecsLeft] = useState(0);
  const [hintsLeft, setHintsLeft] = useState(Infinity);
  const [hintOn, setHintOn] = useState(false);
  const [bestRecords, setBestRecords] = useState(loadBest);
  const [isNewBest, setIsNewBest] = useState(false);

  // juice
  const [finnMood, setFinnMood] = useState('idle');
  const [bubble, setBubble] = useState('');
  const [burst, setBurst] = useState(null);       // { key, yPct, color }
  const [pop, setPop] = useState(null);           // { key, text, yPct }
  const [shakeKey, setShakeKey] = useState(0);
  const [wobbleKey, setWobbleKey] = useState(0);

  // Place It drag
  const [dragY, setDragY] = useState(PARK_Y);     // continuous while dragging
  const [candidate, setCandidate] = useState(null);
  const [dragging, setDragging] = useState(false);

  const tickRef = useRef(null);
  const timerRef = useRef(null);
  const tourRef = useRef(null);
  const moodRef = useRef(null);
  const hintRef = useRef(null);
  const dragRef = useRef(false);
  const staffBoxRef = useRef(null);
  const prevTargetRef = useRef(null);

  const clearTimers = useCallback(() => {
    for (const r of [tickRef, tourRef]) if (r.current) { clearInterval(r.current); r.current = null; }
    for (const r of [timerRef, moodRef, hintRef]) if (r.current) { clearTimeout(r.current); r.current = null; }
  }, []);
  useEffect(() => clearTimers, [clearTimers]);

  const bestKey = `${mode}-${difficulty}`;
  const level = LEVELS[difficulty];
  const isTour = gameState === 'tour';
  const tourNote = ALL_NOTES[tourIndex];

  const setMoodFor = useCallback((m, ms) => {
    setFinnMood(m);
    if (moodRef.current) clearTimeout(moodRef.current);
    moodRef.current = setTimeout(() => setFinnMood('idle'), ms);
  }, []);

  const promptFor = useCallback((m, n, am) => (
    m === 'name' ? 'What note is this? Tap its name!' : `Drag the note to where ${labelFor(n, am)} lives, then tap Check!`
  ), []);

  // ---------- round flow ----------
  const nextQuestion = useCallback((diff, m) => {
    const pool = LEVELS[diff].pool;
    let n = pool[Math.floor(Math.random() * pool.length)];
    while (pool.length > 1 && n === prevTargetRef.current) n = pool[Math.floor(Math.random() * pool.length)];
    prevTargetRef.current = n;
    setTarget(n);
    setPicked(null);
    setReveal(false);
    setLocked(false);
    setCandidate(null);
    setDragY(PARK_Y);
    setBubble(promptFor(m, n, answerMode));
    const secs = LEVELS[diff].secs;
    setSecsLeft(secs);
    if (secs > 0) {
      tickRef.current = setInterval(() => {
        setSecsLeft((s) => {
          if (s <= 1) { clearInterval(tickRef.current); tickRef.current = null; return 0; }
          return s - 1;
        });
      }, 1000);
    }
    if (m === 'name') timerRef.current = setTimeout(() => { try { playBellNote(n); } catch { /* ignore */ } }, 200);
    // Place It: ring the note we want placed so the ear reinforces where it should go.
    else timerRef.current = setTimeout(() => { try { playBellNote(n); } catch { /* ignore */ } }, 350);
  }, [playBellNote, promptFor, answerMode]);

  const startRound = useCallback((diffOverride, modeOverride) => {
    initAudioContext();
    clearTimers();
    const diff = diffOverride || difficulty;
    const m = modeOverride || mode;
    setDifficulty(diff);
    setMode(m);
    setQIndex(0);
    setResults([]);
    setMissed([]);
    setScore(0);
    setStreak(0);
    setIsNewBest(false);
    setHintsLeft(LEVELS[diff].hints);
    setHintOn(false);
    setFinnMood('idle');
    prevTargetRef.current = null;
    setGameState('tour');
    setTourIndex(0);
    setBubble(`This is ${labelFor(ALL_NOTES[0], answerMode)} — it ${WHY[ALL_NOTES[0]]}!`);
    setMoodFor('cheer', 500);
    timerRef.current = setTimeout(() => { try { playBellNote(ALL_NOTES[0]); } catch { /* ignore */ } }, 250);
    let i = 0;
    tourRef.current = setInterval(() => {
      i += 1;
      if (i >= ALL_NOTES.length) {
        clearInterval(tourRef.current); tourRef.current = null;
        setBubble("Got it? Let's go!");
        setMoodFor('party', 900);
        timerRef.current = setTimeout(() => { setGameState('playing'); nextQuestion(diff, m); }, 900);
        return;
      }
      setTourIndex(i);
      const tn = ALL_NOTES[i];
      setBubble(`This is ${labelFor(tn, answerMode)} — it ${WHY[tn]}!`);
      setMoodFor('cheer', 400);
      try { playBellNote(tn); } catch { /* ignore */ }
    }, 900);
  }, [initAudioContext, clearTimers, difficulty, mode, nextQuestion, playBellNote, answerMode, setMoodFor]);

  const skipTour = useCallback(() => {
    clearTimers();
    setGameState('playing');
    nextQuestion(difficulty, mode);
  }, [clearTimers, nextQuestion, difficulty, mode]);

  const finishRound = useCallback((finalResults, finalScore) => {
    const correct = finalResults.filter((r) => r === 'correct').length;
    if (correct >= PASS_MARK) {
      try {
        if (difficulty === 'cadet')  earnAchievement('scholar', 'cadet');
        if (difficulty === 'pro')    earnAchievementUpTo('scholar', 'pro');
        if (difficulty === 'master') earnAchievementUpTo('scholar', 'master');
      } catch { /* ignore */ }
    }
    // Perfect-round flair — one collectible per mode so both modes reward mastery.
    if (correct >= QUESTIONS_PER_ROUND) {
      try { earnSticker(mode === 'place' ? 'ntn_place_ace' : 'ntn_staff_star'); } catch { /* ignore */ }
    }
    const prevBest = bestRecords[bestKey] || 0;
    if (finalScore > prevBest) {
      const next = { ...bestRecords, [bestKey]: finalScore };
      saveBest(next);
      setBestRecords(next);
      setIsNewBest(true);
    }
    playSfx('assets/audio/sfx-piano-flourish.mp3', 0.5);
    setFinnMood(correct >= PASS_MARK ? 'party' : 'idle');
    setGameState('round-complete');
  }, [difficulty, mode, bestRecords, bestKey]);

  const answer = useCallback((note) => {
    if (locked || gameState !== 'playing') return;
    setLocked(true);
    setHintOn(false);
    if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null; }
    const isCorrect = note === target;
    setPicked(note);
    if (note !== 'timeout') { try { playBellNote(note); } catch { /* ignore */ } }

    const nextStreak = isCorrect ? streak + 1 : 0;
    const gained = isCorrect ? 10 + secsLeft * 2 + (streak >= 2 ? 5 : 0) : 0;
    const nextScore = score + gained;
    const nextResults = [...results, isCorrect ? 'correct' : note === 'timeout' ? 'timeout' : 'wrong'];
    setScore(nextScore);
    setResults(nextResults);
    setStreak(nextStreak);
    if (!isCorrect) setMissed((m) => (m.includes(target) ? m : [...m, target]));

    const name = labelFor(target, answerMode);
    if (isCorrect) {
      try { playFeedbackSound('perfect'); } catch { /* ignore */ }
      playSfx('assets/audio/sfx-twinkle.mp3', 0.35);
      setBurst({ key: Date.now(), yPct: NOTE_Y[target] + HEAD_Y_NUDGE, color: BELL_BY_NOTE[target].color });
      setPop({ key: Date.now(), text: `+${gained}`, yPct: NOTE_Y[target] });
      setWobbleKey((k) => k + 1);
      if (nextStreak >= 3) {
        playSfx('assets/audio/sfx-drum-fill.mp3', 0.4);
        setMoodFor('party', 900);
        setBubble(`🔥 ${nextStreak} in a row! That's ${name}!`);
      } else {
        setMoodFor('cheer', 700);
        setBubble(`${CHEERS[Math.floor(Math.random() * CHEERS.length)]} That's ${name}!`);
      }
    } else {
      try { playFeedbackSound('miss'); } catch { /* ignore */ }
      setShakeKey((k) => k + 1);
      setMoodFor('shrug', 600);
      const lead = note === 'timeout' ? "Time's up!" : MISSES[Math.floor(Math.random() * MISSES.length)];
      setBubble(`${lead} ${name} ${WHY[target]}.`);
      timerRef.current = setTimeout(() => setReveal(true), 600);
    }

    setTimeout(() => {
      if (qIndex + 1 >= QUESTIONS_PER_ROUND) finishRound(nextResults, nextScore);
      else { setQIndex(qIndex + 1); nextQuestion(difficulty, mode); }
    }, isCorrect ? 1000 : 2300);
  }, [locked, gameState, target, secsLeft, streak, score, results, qIndex, difficulty, mode, answerMode,
      playBellNote, playFeedbackSound, finishRound, nextQuestion, setMoodFor]);

  useEffect(() => {
    if (gameState !== 'playing' || level.secs <= 0 || secsLeft !== 0 || locked) return;
    // Place It: if the kid has already parked the note somewhere, judge THAT
    // placement (right spot still counts!) instead of a blanket timeout miss.
    if (mode === 'place' && candidate != null) answer(candidate);
    else answer('timeout');
  }, [secsLeft, gameState, level.secs, locked, mode, candidate, answer]);

  const useHint = () => {
    if (hintsLeft <= 0 || locked || isTour) return;
    if (hintsLeft !== Infinity) setHintsLeft((h) => h - 1);
    setHintOn(true);
    playSfx('assets/audio/sfx-bell-chime.mp3', 0.3);
    if (hintRef.current) clearTimeout(hintRef.current);
    hintRef.current = setTimeout(() => setHintOn(false), 2200);
  };

  // ---------- Place It drag ----------
  const yFromPointer = (e) => {
    const rect = staffBoxRef.current?.getBoundingClientRect();
    if (!rect) return null;
    return Math.max(30, Math.min(PARK_Y, ((e.clientY - rect.top) / rect.height) * 100));
  };
  const onStaffDown = (e) => {
    if (locked || mode !== 'place' || isTour) return;
    dragRef.current = true;
    setDragging(true);
    e.currentTarget.setPointerCapture?.(e.pointerId);
    const y = yFromPointer(e);
    if (y != null) setDragY(y);
  };
  const onStaffMove = (e) => {
    if (!dragRef.current) return;
    const y = yFromPointer(e);
    if (y != null) setDragY(y);
  };
  const onStaffUp = () => {
    if (!dragRef.current) return;
    dragRef.current = false;
    setDragging(false);
    setDragY((y) => {
      if (y > NOTE_Y.C + 5) { setCandidate(null); return PARK_Y; }
      const n = nearestNote(y);
      setCandidate(n);
      return NOTE_Y[n];
    });
  };

  // ---------- what to draw on the staff ----------
  const targetName = labelFor(target, answerMode);
  const isRight = picked != null && picked === target;
  const isWrong = picked != null && picked !== target;

  // ===== MENU =====
  if (gameState === 'menu') {
    return (
      <div
        data-testid="name-that-note-menu"
        className="min-h-screen flex flex-col items-center justify-center jma-safe-center p-4 pt-20 md:pt-24 lg:pt-32 pb-8 relative"
        style={{ backgroundImage: 'url(assets/backgrounds/chalkboard.png)', backgroundSize: 'cover', backgroundPosition: 'center' }}
      >
        <GameHeader showHomeButton={true} />
        <FullscreenButton />
        <RoomCharacters room="name-that-note" />

        <motion.h1
          className="text-3xl md:text-5xl font-black mb-1 text-center font-display uppercase"
          initial={{ y: -30, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        >
          NAME THAT NOTE
        </motion.h1>
        <motion.p
          className="text-sm md:text-lg font-bold mb-4 text-center"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}
        >
          Finn&apos;s staff school — learn where every note lives.
        </motion.p>

        <div className="grid grid-cols-2 gap-2 w-full max-w-md mb-3">
          {MODES.map((m) => (
            <button
              key={m.id}
              data-testid={`ntn-mode-${m.id}`}
              type="button"
              onClick={() => setMode(m.id)}
              className="rounded-2xl border-3 p-3 text-left"
              style={{
                borderColor: 'var(--jma-dark)',
                backgroundColor: mode === m.id ? '#FFCC00' : 'white',
                boxShadow: mode === m.id ? '0 5px 0 0 var(--jma-dark)' : '0 3px 0 0 var(--jma-dark)',
                color: 'var(--jma-dark)',
              }}
            >
              <div className="flex items-center gap-1.5 font-black font-display text-base md:text-lg">
                <m.Icon className="w-4 h-4" /> {m.label}
              </div>
              <div className="text-[11px] md:text-xs opacity-70 font-bold leading-tight mt-0.5">{m.blurb}</div>
            </button>
          ))}
        </div>

        <div className="game-card px-3 py-2 mb-3 w-full max-w-md flex flex-wrap items-center justify-between gap-2">
          <span className="text-[11px] md:text-xs font-black uppercase tracking-wide opacity-70" style={{ color: 'var(--jma-dark)' }}>
            Answer with
          </span>
          <div className="flex gap-1">
            {NOTE_NAME_MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                data-testid={`ntn-answer-mode-${m.id}`}
                onClick={() => setAnswerMode(m.id)}
                className="rounded-full border-2 px-2.5 py-1 text-[11px] md:text-xs font-black"
                style={{
                  borderColor: 'var(--jma-dark)',
                  backgroundColor: answerMode === m.id ? 'var(--jma-dark)' : 'white',
                  color: answerMode === m.id ? 'white' : 'var(--jma-dark)',
                }}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-2 w-full max-w-md">
          {Object.entries(LEVELS).map(([key, lvl], idx) => (
            <motion.button
              key={key}
              data-testid={`ntn-difficulty-${key}`}
              className={`level-card p-3 text-left flex items-center justify-between ${difficulty === key ? 'ring-4 ring-[#FFCC00]' : ''}`}
              onClick={() => startRound(key, mode)}
              initial={{ x: -40, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.1 * idx }}
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            >
              <div>
                <h3 className="text-lg font-bold font-display">{lvl.name}</h3>
                <p className="text-xs opacity-60">{lvl.description} · {QUESTIONS_PER_ROUND} notes</p>
              </div>
              {bestRecords[`${mode}-${key}`] != null && (
                <div className="text-right">
                  <div className="text-[10px] uppercase font-bold opacity-60">Best</div>
                  <div className="text-sm font-black" style={{ color: 'var(--jma-orange)' }}>{bestRecords[`${mode}-${key}`]} pts</div>
                </div>
              )}
            </motion.button>
          ))}
        </div>
      </div>
    );
  }

  // ===== PLAYING / TOUR / ROUND COMPLETE =====
  const correctCount = results.filter((r) => r === 'correct').length;
  const modeMeta = MODES.find((m) => m.id === mode);
  const stars = correctCount >= QUESTIONS_PER_ROUND ? 3 : correctCount >= PASS_MARK ? 2 : correctCount >= 5 ? 1 : 0;

  return (
    <div
      data-testid="name-that-note-playing"
      className="min-h-screen flex flex-col relative"
      style={{ backgroundImage: 'url(assets/backgrounds/chalkboard.png)', backgroundSize: 'cover', backgroundPosition: 'center' }}
    >
      <GameHeader title={modeMeta.label} subtitle={level.name} showHomeButton={true} />
      <RoomCharacters room="name-that-note" />

      <main className="flex-1 flex flex-col items-center pt-20 md:pt-24 pb-6 px-3">
        {/* Progress dots */}
        <div className="flex items-center justify-center gap-1.5 mb-2" data-testid="ntn-progress-dots">
          {Array.from({ length: QUESTIONS_PER_ROUND }).map((_, i) => {
            const r = results[i];
            const color = r === 'correct' ? '#34A853' : r ? '#FF3B30' : i === qIndex && !isTour ? '#FFCC00' : 'rgba(255,255,255,0.45)';
            return (
              <motion.div
                key={i}
                className="rounded-full border-2 flex items-center justify-center"
                style={{ width: 18, height: 18, backgroundColor: color, borderColor: 'var(--jma-dark)' }}
                animate={r && i === results.length - 1 ? { scale: [1, 1.5, 1] } : { scale: 1 }}
                transition={{ duration: 0.35 }}
              >
                {r === 'correct' && <Check className="w-2.5 h-2.5 text-white" strokeWidth={4} />}
              </motion.div>
            );
          })}
        </div>

        {/* HUD */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-2">
          <div data-testid="ntn-question" className="px-3 py-1 rounded-full font-black text-sm border-2" style={{ backgroundColor: 'white', color: 'var(--jma-dark)', borderColor: 'var(--jma-dark)' }}>
            Note {Math.min(qIndex + 1, QUESTIONS_PER_ROUND)} / {QUESTIONS_PER_ROUND}
          </div>
          {level.secs > 0 && !isTour && (
            <div data-testid="ntn-time" className="px-3 py-1 rounded-full font-black text-sm border-2 flex items-center gap-1.5"
              style={{ backgroundColor: secsLeft <= 3 && !locked ? '#FF3B30' : 'white', color: secsLeft <= 3 && !locked ? 'white' : 'var(--jma-dark)', borderColor: 'var(--jma-dark)' }}>
              <Clock className="w-4 h-4" /> {secsLeft}s
            </div>
          )}
          <motion.div key={score} data-testid="ntn-score" className="px-3 py-1 rounded-full font-black text-sm border-2"
            style={{ backgroundColor: 'var(--jma-yellow)', color: 'var(--jma-dark)', borderColor: 'var(--jma-dark)' }}
            initial={{ scale: 1 }} animate={{ scale: [1, 1.25, 1] }} transition={{ duration: 0.3 }}>
            {score} pts
          </motion.div>
          {streak >= 2 && (
            <motion.div data-testid="ntn-streak" className="px-3 py-1 rounded-full font-black text-sm border-2" style={{ backgroundColor: 'var(--jma-orange)', color: 'white', borderColor: 'var(--jma-dark)' }}
              initial={{ scale: 0 }} animate={{ scale: 1 }}>
              🔥 {streak}
            </motion.div>
          )}
        </div>

        {/* Finn drives every step */}
        <FinnBubble text={bubble} mood={finnMood} />

        {/* Staff stage */}
        <motion.div
          key={`shake-${shakeKey}-w-${wobbleKey}`}
          className="w-full max-w-2xl mx-auto"
          animate={shakeKey && !isRight ? { x: [0, -10, 10, -7, 7, -3, 0] } : wobbleKey ? { rotate: [0, -1.2, 1.2, 0], scale: [1, 1.015, 1] } : {}}
          transition={{ duration: 0.45 }}
        >
          <div ref={staffBoxRef} className="relative w-full">
            <SolfegeStaff sequence={[]} height={STAFF_HEIGHT} />

            {/* Note area overlay: heads, chips, hints, bursts live here */}
            <div className="absolute inset-y-0 right-2 pointer-events-none" style={{ left: STAFF_NOTE_AREA_LEFT, zIndex: 3 }}>
              <AnimatePresence>{hintOn && <HintGhosts answerMode={answerMode} />}</AnimatePresence>

              {isTour && (
                <NoteHead
                  yPct={NOTE_Y[tourNote]} glow ledger={tourNote === 'C'} bounce
                  chip={labelFor(tourNote, answerMode)} chipColor={BELL_BY_NOTE[tourNote].color}
                  testId="ntn-tour-note"
                />
              )}

              {!isTour && mode === 'name' && (
                <NoteHead
                  yPct={NOTE_Y[target]}
                  color={isRight ? '#34A853' : isWrong ? '#FF3B30' : 'var(--jma-dark)'}
                  glow={picked == null}
                  ledger={target === 'C'}
                  chip={picked != null && (isRight || reveal) ? targetName : null}
                  chipColor={isRight ? '#34A853' : BELL_BY_NOTE[target].color}
                  testId="ntn-target-note"
                />
              )}

              {!isTour && mode === 'place' && (
                <>
                  {/* the kid's note — waits below the staff until dragged */}
                  <NoteHead
                    yPct={dragY}
                    color={isRight ? '#34A853' : isWrong && picked !== 'timeout' ? '#FF3B30' : 'var(--jma-dark)'}
                    glow={!locked && (dragging || candidate == null)}
                    ledger={!dragging && candidate === 'C'}
                    badge={isWrong && picked !== 'timeout'}
                    chip={picked == null && candidate == null && !dragging ? '👆 Drag me!' : isRight ? targetName : null}
                    chipColor={isRight ? '#34A853' : undefined}
                    testId="ntn-drag-note"
                  />
                  {/* correct answer glides in after a miss */}
                  {isWrong && reveal && (
                    <NoteHead
                      yPct={NOTE_Y[target]} initialY={PARK_Y} color="#34A853" ledger={target === 'C'}
                      chip={targetName} chipColor="#34A853" testId="ntn-reveal-note"
                    />
                  )}
                </>
              )}

              <AnimatePresence>
                {burst && <Burst key={burst.key} yPct={burst.yPct} color={burst.color} />}
              </AnimatePresence>
              <AnimatePresence>
                {pop && <ScorePop key={pop.key} text={pop.text} yPct={pop.yPct} />}
              </AnimatePresence>
            </div>

            {/* Drag pad (Place It) */}
            {mode === 'place' && !locked && !isTour && (
              <div
                data-testid="ntn-staff-dragpad"
                className="absolute inset-0 z-20 cursor-grab active:cursor-grabbing rounded-2xl"
                style={{ touchAction: 'none' }}
                onPointerDown={onStaffDown}
                onPointerMove={onStaffMove}
                onPointerUp={onStaffUp}
                onPointerCancel={onStaffUp}
              />
            )}
          </div>
        </motion.div>

        {/* Answers / actions */}
        {isTour ? (
          <div className="mt-4 flex items-center justify-center">
            <button data-testid="ntn-skip-tour-btn" onClick={skipTour} className="chunky-btn bg-[var(--jma-green)] text-white px-5 py-2 flex items-center gap-1.5 text-base">
              <Play className="w-4 h-4" /> Start!
            </button>
          </div>
        ) : mode === 'name' ? (
          <div className="mt-4 w-full max-w-2xl grid grid-cols-4 md:grid-cols-8 gap-2" data-testid="ntn-answers">
            {level.pool.map((note) => {
              const bell = BELL_BY_NOTE[note];
              const isPick = picked === note;
              const isAnswer = picked != null && note === target;
              return (
                <motion.button
                  key={note}
                  type="button"
                  data-testid={`ntn-answer-${note.replace(' ', '-')}`}
                  onClick={() => answer(note)}
                  disabled={locked}
                  whileTap={{ scale: 0.92 }}
                  animate={isPick && !isAnswer ? { x: [0, -6, 6, -4, 4, 0] } : isAnswer ? { scale: [1, 1.12, 1] } : {}}
                  transition={{ duration: 0.4 }}
                  className="relative rounded-2xl border-3 py-3 md:py-4 font-black font-display text-base md:text-xl leading-none"
                  style={{
                    borderColor: 'var(--jma-dark)',
                    backgroundColor: isAnswer ? '#34A853' : isPick ? '#FF3B30' : 'white',
                    color: isAnswer || isPick ? 'white' : bell.color,
                    boxShadow: '0 4px 0 0 var(--jma-dark)',
                    opacity: locked && !isPick && !isAnswer ? 0.5 : 1,
                  }}
                >
                  {labelFor(note, answerMode)}
                  {isPick && !isAnswer && (
                    <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-white border-2 flex items-center justify-center" style={{ borderColor: '#FF3B30' }}>
                      <X className="w-3 h-3" style={{ color: '#FF3B30' }} strokeWidth={4} />
                    </span>
                  )}
                </motion.button>
              );
            })}
          </div>
        ) : (
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <button data-testid="ntn-hear-btn" onClick={() => { try { playBellNote(target); } catch { /* ignore */ } }} className="chunky-btn bg-[var(--jma-blue)] text-white px-4 py-2 flex items-center gap-1.5">
              <Volume2 className="w-4 h-4" /> Hear {targetName}
            </button>
            <motion.button
              data-testid="ntn-check-btn"
              onClick={() => candidate && answer(candidate)}
              disabled={!candidate || locked}
              animate={candidate && !locked ? { scale: [1, 1.06, 1] } : { scale: 1 }}
              transition={{ duration: 0.9, repeat: candidate && !locked ? Infinity : 0 }}
              className="chunky-btn text-white px-6 py-2 flex items-center gap-1.5 text-base"
              style={{ backgroundColor: candidate && !locked ? '#34A853' : '#9CA3AF', opacity: candidate && !locked ? 1 : 0.6 }}
            >
              <Check className="w-4 h-4" strokeWidth={3} /> Check
            </motion.button>
          </div>
        )}

        <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
          {!isTour && level.hints > 0 && (
            <button
              data-testid="ntn-hint-btn"
              onClick={useHint}
              disabled={hintsLeft <= 0 || locked}
              className="chunky-btn bg-white text-[var(--jma-dark)] px-4 py-2 flex items-center gap-1.5"
              style={{ opacity: hintsLeft <= 0 || locked ? 0.5 : 1 }}
            >
              <Lightbulb className="w-4 h-4" style={{ color: 'var(--jma-orange)' }} /> Hint{hintsLeft !== Infinity ? ` (${hintsLeft})` : ''}
            </button>
          )}
          <button data-testid="ntn-restart-btn" onClick={() => startRound(difficulty, mode)} className="chunky-btn bg-[var(--jma-yellow)] text-[var(--jma-dark)] px-4 py-2 flex items-center gap-2">
            <RotateCcw className="w-4 h-4" /> Restart
          </button>
          <button data-testid="ntn-menu-btn" onClick={() => { clearTimers(); setGameState('menu'); }} className="chunky-btn bg-white text-[var(--jma-dark)] px-4 py-2">
            Change Mode
          </button>
        </div>

        {/* ROUND COMPLETE */}
        <AnimatePresence>
          {gameState === 'round-complete' && (
            <motion.div
              data-testid="ntn-round-complete"
              className="fixed inset-0 z-40 flex items-center justify-center p-4"
              style={{ backgroundColor: 'rgba(10,37,64,0.55)', backdropFilter: 'blur(4px)' }}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            >
              {stars >= 2 && <Confetti count={48} size={420} mega={stars === 3 || isNewBest} />}
              <motion.div
                className="bg-white rounded-3xl border-4 p-5 md:p-6 max-w-md w-full text-center relative"
                style={{ borderColor: 'var(--jma-dark)', boxShadow: '0 10px 0 0 var(--jma-dark)' }}
                initial={{ scale: 0.6, y: 30 }} animate={{ scale: 1, y: 0 }}
              >
                <motion.img
                  src={stars >= 2 ? 'assets/characters/finn-disco.png' : 'assets/characters/finn-danger.png'}
                  alt="Finn"
                  className="mx-auto -mt-16 md:-mt-20 mb-1 select-none"
                  style={{ height: 'clamp(90px, 16vh, 130px)', filter: 'drop-shadow(0 6px 6px rgba(0,0,0,0.35))' }}
                  animate={stars >= 2 ? { y: [0, -18, 0], rotate: [0, -8, 8, 0] } : { y: [0, -5, 0] }}
                  transition={{ duration: stars >= 2 ? 0.8 : 2, repeat: Infinity, ease: 'easeInOut' }}
                />
                <div className="flex items-center justify-center gap-1 mb-1" data-testid="ntn-stars">
                  {[0, 1, 2].map((i) => (
                    <motion.div key={i} initial={{ scale: 0, rotate: -30 }} animate={{ scale: 1, rotate: 0 }} transition={{ delay: 0.25 + i * 0.18, type: 'spring', stiffness: 400, damping: 14 }}>
                      <Star className="w-9 h-9 md:w-11 md:h-11" style={{ color: i < stars ? '#FFCC00' : '#D1D5DB', fill: i < stars ? '#FFCC00' : '#E5E7EB' }} strokeWidth={2.2} />
                    </motion.div>
                  ))}
                </div>
                <h2 className="text-2xl md:text-3xl font-black font-display mb-1" style={{ color: 'var(--jma-dark)' }}>
                  {isNewBest ? 'NEW BEST!' : stars === 3 ? 'Perfect Staff!' : stars === 2 ? 'Staff Star!' : 'Keep Practicing!'}
                </h2>
                <p className="font-bold mb-2" style={{ color: 'var(--jma-dark)' }} data-testid="ntn-final-line">
                  {correctCount} / {QUESTIONS_PER_ROUND} notes · <span className="font-black">{score} pts</span>
                  <span className="opacity-60"> · best {bestRecords[bestKey] || score}</span>
                </p>
                {missed.length > 0 ? (
                  <div className="rounded-xl border-2 px-3 py-2 mb-3 text-sm font-bold" style={{ borderColor: 'var(--jma-dark)', backgroundColor: '#FFF8E1', color: 'var(--jma-dark)' }} data-testid="ntn-missed">
                    Practice these: {missed.map((n) => (
                      <span key={n} className="inline-block px-2 py-0.5 rounded-full text-white font-black mx-0.5" style={{ backgroundColor: BELL_BY_NOTE[n].color }}>
                        {labelFor(n, answerMode)}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm font-bold mb-3 opacity-70" style={{ color: 'var(--jma-dark)' }}>You know every note on that staff. Finn is impressed.</p>
                )}
                <div className="flex flex-wrap justify-center gap-2">
                  <button data-testid="ntn-win-again" onClick={() => startRound(difficulty, mode)} className="chunky-btn bg-[var(--jma-green)] text-white px-4 py-2 flex items-center gap-1.5">
                    <Play className="w-4 h-4" /> Play Again
                  </button>
                  <button data-testid="ntn-win-menu" onClick={() => setGameState('menu')} className="chunky-btn bg-[var(--jma-yellow)] text-[var(--jma-dark)] px-4 py-2">
                    Change Mode
                  </button>
                  <button data-testid="ntn-win-home" onClick={() => navigate('/home')} className="chunky-btn bg-white text-[var(--jma-dark)] px-4 py-2">
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
