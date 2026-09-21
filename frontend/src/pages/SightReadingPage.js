// Sight-Reading Sprint — multi-card flow.
//
// Each run is FIVE CARDS in a row. The kid sees a card, hears a demo, plays
// it back on the bells, then the next card slides in. The difficulty ramps
// WITHIN a run (card 1 is easiest, card 5 hardest).
//
// Levels:
//   cadet  → 5 cards · 3→4 notes  · 20s→16s · low bells
//   pro    → 5 cards · 3→5 notes  · 18s→14s · low bells
//   master → 5 cards · 4→5 notes  · 16s→12s · full 8-bell range
//   wizard → 5 cards · 4→6 notes  · 12s→9s  · full 8-bell range (very hard)
//
// Earns the Music Scholar achievement ladder (same domain as video lessons
// — proves notation-reading skill).

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Clock, RotateCcw, Trophy, Play, Volume2, Check } from 'lucide-react';
import { GameHeader } from '../components/GameUI';
import { FullscreenButton } from '../components/FullscreenButton';
import Confetti from '../components/Confetti';
import RoomCharacters from '../components/RoomCharacters';
import SolfegeStaff from '../components/SolfegeStaff';
import { JellyBellsRow } from '../components/JellyBells';
import useAudio from '../hooks/useAudio';
import { earnAchievement, earnAchievementUpTo } from '../hooks/useStickers';

const LOW_NOTES = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const ALL_NOTES = ['C', 'D', 'E', 'F', 'G', 'A', 'B', 'High C'];
const CARDS_PER_RUN = 5;

// Each card spec is [noteCount, secondsToPlay].
const LEVELS = {
  cadet: {
    name: 'Cadet',
    description: '5 cards · 3–4 notes · gentle ramp',
    cardSpecs: [[3, 20], [3, 20], [3, 18], [4, 18], [4, 16]],
    pool: LOW_NOTES,
    tier: 'cadet',
  },
  pro: {
    name: 'Pro',
    description: '5 cards · 3–5 notes · tighter timing',
    cardSpecs: [[3, 18], [3, 18], [4, 16], [4, 14], [5, 14]],
    pool: LOW_NOTES,
    tier: 'pro',
  },
  master: {
    name: 'Master',
    description: '5 cards · 4–5 notes · full 8-bell range',
    cardSpecs: [[4, 16], [4, 14], [5, 14], [5, 12], [5, 12]],
    pool: ALL_NOTES,
    tier: 'master',
  },
  wizard: {
    name: 'Wizard',
    description: '5 cards · 4–6 notes · fast & full range',
    cardSpecs: [[4, 12], [5, 11], [5, 10], [6, 10], [6, 9]],
    pool: ALL_NOTES,
    tier: 'master',
  },
};

const BEST_KEY = 'jma_sight_reading_best_v1';
const loadBest = () => { try { return JSON.parse(localStorage.getItem(BEST_KEY) || '{}'); } catch { return {}; } };
const saveBest = (b) => { try { localStorage.setItem(BEST_KEY, JSON.stringify(b)); } catch { /* ignore */ } };

function rand(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function buildSequence(length, pool) {
  const out = [];
  while (out.length < length) {
    const n = rand(pool);
    if (out.length > 0 && out[out.length - 1] === n) continue; // no immediate repeats
    out.push(n);
  }
  return out;
}

export default function SightReadingPage() {
  const navigate = useNavigate();
  const { playBellNote, playFeedbackSound, initAudioContext } = useAudio();
  const bellsRowRef = useRef(null);

  // gameState: menu | demo | playing | card-transition | run-complete
  const [gameState, setGameState] = useState('menu');
  const [difficulty, setDifficulty] = useState('cadet');

  // Per-card runtime state
  const [cardIndex, setCardIndex] = useState(0);
  const [sequence, setSequence] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [wrongAt, setWrongAt] = useState(-1);
  const [doneIndices, setDoneIndices] = useState(new Set());
  const [secsLeft, setSecsLeft] = useState(0);

  // Per-run aggregate state (resets on startRun)
  const [runScore, setRunScore] = useState(0);
  // cardResults: array of 'complete' | 'timeout' (filled as cards finish)
  const [cardResults, setCardResults] = useState([]);

  const [bestRecords, setBestRecords] = useState(loadBest);
  const [isNewBest, setIsNewBest] = useState(false);

  const tickRef = useRef(null);
  const demoTimerRef = useRef(null);
  const transitionTimerRef = useRef(null);

  useEffect(() => () => {
    if (tickRef.current) clearInterval(tickRef.current);
    if (demoTimerRef.current) clearTimeout(demoTimerRef.current);
    if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
  }, []);

  const stopAllTimers = useCallback(() => {
    if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null; }
    if (demoTimerRef.current) { clearTimeout(demoTimerRef.current); demoTimerRef.current = null; }
    if (transitionTimerRef.current) { clearTimeout(transitionTimerRef.current); transitionTimerRef.current = null; }
  }, []);

  // ---------------- Card lifecycle ----------------

  // Play the new card: auto-demo through the notes, then enter playing state
  // and start the per-card countdown timer.
  const playDemoAndStart = useCallback((seq, secs) => {
    let i = 0;
    const tick = () => {
      if (i >= seq.length) {
        setGameState('playing');
        setSecsLeft(secs);
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
        return;
      }
      const note = seq[i];
      try { bellsRowRef.current?.flashNote(note, 380); } catch { /* ignore */ }
      try { playBellNote(note); } catch { /* ignore */ }
      i += 1;
      demoTimerRef.current = setTimeout(tick, 520);
    };
    tick();
  }, [playBellNote]);

  // Build & start a specific card index. Used at run start AND after transitions.
  const beginCard = useCallback((diff, idx) => {
    const lvl = LEVELS[diff];
    const [length, secs] = lvl.cardSpecs[idx];
    const seq = buildSequence(length, lvl.pool);
    setSequence(seq);
    setCurrentIndex(0);
    setDoneIndices(new Set());
    setWrongAt(-1);
    setSecsLeft(secs);
    setGameState('demo');
    demoTimerRef.current = setTimeout(() => playDemoAndStart(seq, secs), 450);
  }, [playDemoAndStart]);

  // Finish a card (complete or timeout). Advances to the next card, or ends
  // the run after the 5th.
  const finishCard = useCallback((result, cardBonusScore) => {
    stopAllTimers();
    setRunScore((s) => s + cardBonusScore);
    setCardResults((prev) => [...prev, result]);
    const nextIdx = cardIndex + 1;

    if (nextIdx >= CARDS_PER_RUN) {
      // Run complete — show win modal. Update best.
      const total = runScore + cardBonusScore;
      const prevBest = bestRecords[difficulty] || 0;
      if (total > prevBest) {
        const next = { ...bestRecords, [difficulty]: total };
        saveBest(next);
        setBestRecords(next);
        setIsNewBest(true);
      }
      // Achievement ladder — earned per difficulty completion (any cards
      // completed counts, since the run finishes regardless of timeouts).
      try {
        if (difficulty === 'cadet')  earnAchievement('scholar', 'cadet');
        if (difficulty === 'pro')    earnAchievementUpTo('scholar', 'pro');
        if (difficulty === 'master') earnAchievementUpTo('scholar', 'master');
        if (difficulty === 'wizard') earnAchievementUpTo('scholar', 'master');
      } catch { /* ignore */ }
      try { playFeedbackSound('perfect'); } catch { /* ignore */ }
      setGameState('run-complete');
      return;
    }

    // Otherwise slide to next card after a brief breath.
    setGameState('card-transition');
    transitionTimerRef.current = setTimeout(() => {
      setCardIndex(nextIdx);
      beginCard(difficulty, nextIdx);
    }, 800);
  }, [stopAllTimers, cardIndex, runScore, bestRecords, difficulty, playFeedbackSound, beginCard]);

  // Auto-finish card on timeout
  useEffect(() => {
    if (gameState !== 'playing') return;
    if (secsLeft !== 0) return;
    finishCard('timeout', 0);
  }, [secsLeft, gameState, finishCard]);

  // ---------------- User interaction ----------------

  const handleBellTap = useCallback((note) => {
    // Audio first so kids always hear feedback, regardless of game state.
    try { playBellNote(note); } catch { /* ignore */ }
    if (gameState !== 'playing') return;
    if (currentIndex >= sequence.length) return;

    const target = sequence[currentIndex];
    if (note === target) {
      const nextIdx = currentIndex + 1;
      setDoneIndices((prev) => { const n = new Set(prev); n.add(currentIndex); return n; });
      setCurrentIndex(nextIdx);
      if (nextIdx >= sequence.length) {
        // Card complete! Score = 10 per note + 5 per second remaining + 30 complete bonus.
        const cardScore = sequence.length * 10 + secsLeft * 5 + 30;
        finishCard('complete', cardScore);
      }
    } else {
      setWrongAt(currentIndex);
      try { playFeedbackSound('miss'); } catch { /* ignore */ }
      setTimeout(() => setWrongAt(-1), 500);
    }
  }, [gameState, currentIndex, sequence, secsLeft, finishCard, playBellNote, playFeedbackSound]);

  // ---------------- Run lifecycle ----------------

  const startRun = useCallback((diffOverride) => {
    initAudioContext();
    stopAllTimers();
    const diff = typeof diffOverride === 'string' ? diffOverride : difficulty;
    setDifficulty(diff);
    setCardIndex(0);
    setRunScore(0);
    setCardResults([]);
    setIsNewBest(false);
    beginCard(diff, 0);
  }, [initAudioContext, stopAllTimers, difficulty, beginCard]);

  // Replay the current card's demo (kid wants to hear it again).
  const replayDemo = useCallback(() => {
    if (gameState !== 'playing') return;
    stopAllTimers();
    setGameState('demo');
    setCurrentIndex(0);
    setDoneIndices(new Set());
    const [, secs] = LEVELS[difficulty].cardSpecs[cardIndex];
    demoTimerRef.current = setTimeout(() => playDemoAndStart(sequence, secs), 250);
  }, [gameState, stopAllTimers, sequence, cardIndex, difficulty, playDemoAndStart]);

  // ---------------- Rendering ----------------

  // ===== MENU =====
  if (gameState === 'menu') {
    return (
      <div
        data-testid="sight-reading-menu"
        className="min-h-screen flex flex-col items-center justify-center jma-safe-center p-4 pt-20 md:pt-24 lg:pt-32 pb-8 relative"
        style={{
          backgroundImage: 'url(assets/backgrounds/clubhouse.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <GameHeader showHomeButton={true} backLink={{ to: '/play', label: 'Play' }} />
        <FullscreenButton />
        <RoomCharacters room="sight-reading" />

        <motion.h1
          className="text-3xl md:text-5xl font-black mb-2 text-center font-display uppercase"
          style={{ color: 'white', textShadow: '3px 3px 0 var(--jma-dark), 5px 5px 0 rgba(0,0,0,0.5)' }}
          initial={{ y: -30, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        >
          SIGHT-READING SPRINT
        </motion.h1>
        <motion.p
          className="text-base md:text-lg font-bold mb-4 text-center"
          style={{ color: '#FFE9C4', textShadow: '1px 1px 0 rgba(0,0,0,0.55)' }}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}
        >
          Read each card. Play it back fast. <b>5 cards per run.</b>
        </motion.p>

        <motion.div className="game-card p-5 mb-4 max-w-md text-center" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2 }}>
          <BookOpen className="w-10 h-10 mx-auto mb-2" style={{ color: '#34A853' }} />
          <h2 className="text-xl font-bold mb-2 font-display">How to Play</h2>
          <p className="text-sm md:text-base" style={{ color: 'var(--jma-dark)' }}>
            1. Each card has 3–6 notes on the staff<br />
            2. You&apos;ll hear them once<br />
            3. Tap the bells in order before time runs out<br />
            4. Finish all 5 cards to win the run!<br />
            <span className="opacity-70">💡 You can also press C D E F G A B keys on a keyboard.</span>
          </p>
        </motion.div>

        <div className="grid gap-2 w-full max-w-md mb-2">
          {Object.entries(LEVELS).map(([key, lvl], idx) => (
            <motion.button
              key={key}
              data-testid={`sight-reading-difficulty-${key}`}
              className={`level-card p-3 text-left flex items-center justify-between ${difficulty === key ? 'ring-4 ring-[#34A853]' : ''}`}
              onClick={() => startRun(key)}
              initial={{ x: -40, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.1 * idx }}
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            >
              <div>
                <h3 className="text-lg font-bold font-display flex items-center gap-2">
                  {lvl.name}
                  {key === 'wizard' && (
                    <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full"
                      style={{ background: 'linear-gradient(135deg,#AF52DE,#FF3B30)', color: 'white' }}>
                      ⚡ VERY HARD
                    </span>
                  )}
                </h3>
                <p className="text-xs opacity-60">{lvl.description}</p>
              </div>
              {bestRecords[key] != null && (
                <div className="text-right">
                  <div className="text-[10px] uppercase font-bold opacity-60">Best</div>
                  <div className="text-sm font-black" style={{ color: 'var(--jma-orange)' }}>
                    {bestRecords[key]} pts
                  </div>
                </div>
              )}
            </motion.button>
          ))}
        </div>
      </div>
    );
  }

  // ===== ACTIVE RUN (demo / playing / card-transition / run-complete) =====
  const level = LEVELS[difficulty];
  const cardLabel = `Card ${Math.min(cardIndex + 1, CARDS_PER_RUN)} / ${CARDS_PER_RUN}`;

  return (
    <div
      data-testid="sight-reading-playing"
      className="min-h-screen flex flex-col relative"
      style={{
        backgroundImage: 'url(assets/backgrounds/clubhouse.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <GameHeader title="SIGHT-READING SPRINT" subtitle={level.name} showHomeButton={true} backLink={{ to: '/play', label: 'Play' }} />
      <RoomCharacters room="sight-reading" />

      <main className="flex-1 flex flex-col items-center pt-20 md:pt-20 pb-6 px-3">
        {/* Progress dots — one per card in the run */}
        <div className="flex items-center justify-center gap-2 mb-3" data-testid="card-progress-dots">
          {Array.from({ length: CARDS_PER_RUN }).map((_, i) => {
            const result = cardResults[i];
            const isCurrent = i === cardIndex && gameState !== 'run-complete';
            const isDone = i < cardIndex || (gameState === 'run-complete');
            const color = result === 'complete' ? '#34A853'
                        : result === 'timeout'  ? '#FF9500'
                        : isCurrent              ? '#FFCC00'
                        : isDone                 ? '#34A853'
                        : 'rgba(255,255,255,0.45)';
            return (
              <motion.div
                key={i}
                data-testid={`card-dot-${i}`}
                className="rounded-full border-2 flex items-center justify-center"
                style={{
                  width: 22, height: 22,
                  backgroundColor: color,
                  borderColor: 'var(--jma-dark)',
                  boxShadow: isCurrent ? '0 0 0 4px rgba(255,204,0,0.45)' : 'none',
                }}
                animate={isCurrent ? { scale: [1, 1.15, 1] } : { scale: 1 }}
                transition={isCurrent ? { duration: 0.9, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.2 }}
              >
                {result === 'complete' && <Check className="w-3 h-3 text-white" strokeWidth={4} />}
              </motion.div>
            );
          })}
        </div>

        {/* HUD */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-3">
          <div
            data-testid="sight-reading-card-label"
            className="px-3 py-1 rounded-full font-black text-sm border-2"
            style={{ backgroundColor: 'white', color: 'var(--jma-dark)', borderColor: 'var(--jma-dark)' }}
          >
            {cardLabel}
          </div>
          <div
            data-testid="sight-reading-time"
            className="px-3 py-1 rounded-full font-black text-sm border-2 flex items-center gap-1.5"
            style={{
              backgroundColor: gameState === 'playing' && secsLeft <= 5 ? '#FF3B30' : 'white',
              color: gameState === 'playing' && secsLeft <= 5 ? 'white' : 'var(--jma-dark)',
              borderColor: 'var(--jma-dark)',
            }}
          >
            <Clock className="w-4 h-4" /> {secsLeft}s
          </div>
          <div
            data-testid="sight-reading-score"
            className="px-3 py-1 rounded-full font-black text-sm border-2"
            style={{ backgroundColor: 'var(--jma-yellow)', color: 'var(--jma-dark)', borderColor: 'var(--jma-dark)' }}
          >
            {runScore} pts
          </div>
        </div>

        {/* Phase banner */}
        <div
          data-testid="sight-reading-phase"
          className="inline-block px-3 py-1 rounded-full text-xs md:text-sm font-black border-2 mb-3"
          style={{
            backgroundColor: gameState === 'demo' ? '#34A853'
                            : gameState === 'card-transition' ? 'var(--jma-purple)'
                            : 'var(--jma-yellow)',
            color: gameState === 'demo' || gameState === 'card-transition' ? 'white' : 'var(--jma-dark)',
            borderColor: 'var(--jma-dark)',
          }}
        >
          {gameState === 'demo' && '🎧 Listen — the staff is playing for you'}
          {gameState === 'playing' && '🎹 Now you! Tap the bells in order'}
          {gameState === 'card-transition' && '✨ Next card coming up...'}
          {gameState === 'run-complete' && '🎉 Run complete!'}
        </div>

        {/* Staff — slides in/out between cards. The key only changes when
            cardIndex changes (not on every gameState transition), so we get
            exactly ONE swipe per card change, not two. */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`card-${cardIndex}`}
            initial={{ x: 80, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -80, opacity: 0 }}
            transition={{ duration: 0.35 }}
            className="w-full"
          >
            <SolfegeStaff
              sequence={sequence}
              currentIndex={gameState === 'playing' ? currentIndex : -1}
              wrongAt={wrongAt}
              doneIndices={doneIndices}
            />
          </motion.div>
        </AnimatePresence>

        {/* Replay during playing */}
        {gameState === 'playing' && (
          <button
            data-testid="sight-reading-replay-btn"
            onClick={replayDemo}
            className="mt-3 chunky-btn bg-[var(--jma-blue)] text-white px-3 py-1.5 text-sm flex items-center gap-1.5"
          >
            <Volume2 className="w-4 h-4" /> Hear Again
          </button>
        )}

        {/* Bells — keyboard ENABLED so C D E F G A B keys work too */}
        <div className="mt-5 w-full">
          <JellyBellsRow
            ref={bellsRowRef}
            onPlayNote={handleBellTap}
            onNoteUp={() => {}}
            showNotation={false}
            enableKeyboard={true}
          />
        </div>

        {/* Bottom controls */}
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          <button
            data-testid="sight-reading-restart-btn"
            onClick={() => startRun(difficulty)}
            className="chunky-btn bg-[var(--jma-yellow)] text-[var(--jma-dark)] px-4 py-2 flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" /> Restart
          </button>
          <button
            data-testid="sight-reading-back-btn"
            onClick={() => { stopAllTimers(); setGameState('menu'); }}
            className="chunky-btn bg-white text-[var(--jma-dark)] px-4 py-2"
          >
            Change Level
          </button>
        </div>

        {/* RUN COMPLETE OVERLAY */}
        <AnimatePresence>
          {gameState === 'run-complete' && (
            <motion.div
              data-testid="sight-reading-run-complete"
              className="fixed inset-0 z-40 flex items-center justify-center p-4"
              style={{ backgroundColor: 'rgba(10,37,64,0.55)', backdropFilter: 'blur(4px)' }}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            >
              <Confetti count={48} size={420} mega={isNewBest} />
              <motion.div
                className="bg-white rounded-3xl border-4 p-6 max-w-md w-full text-center"
                style={{ borderColor: 'var(--jma-dark)', boxShadow: '0 10px 0 0 var(--jma-dark)' }}
                initial={{ scale: 0.6, y: 30 }} animate={{ scale: 1, y: 0 }}
              >
                <div className="text-5xl mb-2">{isNewBest ? '🏆' : '🎉'}</div>
                <h2 className="text-2xl md:text-3xl font-black font-display mb-1" style={{ color: 'var(--jma-dark)' }}>
                  {isNewBest ? 'NEW BEST!' : 'Run Complete!'}
                </h2>
                <p className="font-bold mb-3" style={{ color: 'var(--jma-dark)' }}>
                  {cardResults.filter(r => r === 'complete').length} / {CARDS_PER_RUN} cards perfect ·
                  <span className="font-black ml-1">{runScore} pts</span>
                </p>
                <div className="flex items-center justify-center gap-1 mb-3">
                  {cardResults.map((r, i) => (
                    <div
                      key={i}
                      className="w-6 h-6 rounded-full border-2 flex items-center justify-center"
                      style={{
                        backgroundColor: r === 'complete' ? '#34A853' : '#FF9500',
                        borderColor: 'var(--jma-dark)',
                      }}
                    >
                      {r === 'complete' && <Check className="w-3 h-3 text-white" strokeWidth={4} />}
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-center gap-2 mb-3">
                  <Trophy className="w-5 h-5" style={{ color: '#FFCC00' }} />
                  <span className="text-sm font-black uppercase" style={{ color: 'var(--jma-dark)' }}>
                    Best: {bestRecords[difficulty] || runScore} pts
                  </span>
                </div>
                <div className="flex flex-wrap justify-center gap-2 mt-3">
                  <button
                    data-testid="sight-reading-win-again"
                    onClick={() => startRun(difficulty)}
                    className="chunky-btn bg-[var(--jma-green)] text-white px-4 py-2 flex items-center gap-1.5"
                  >
                    <Play className="w-4 h-4" /> Play Again
                  </button>
                  <button
                    data-testid="sight-reading-win-menu"
                    onClick={() => setGameState('menu')}
                    className="chunky-btn bg-[var(--jma-yellow)] text-[var(--jma-dark)] px-4 py-2"
                  >
                    Change Level
                  </button>
                  <button
                    data-testid="sight-reading-win-home"
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
