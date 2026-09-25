// Note Memory Match — pairs game.
// Kids flip face-down cards; each card plays its bell note when revealed.
// Match same notes to clear them. Three difficulties (4 / 6 / 8 pairs).
// Best time + completion stickers persisted to localStorage.

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Trophy, Clock, RotateCcw, Sparkles, ChevronUp } from 'lucide-react';
import { GameHeader } from '../components/GameUI';
import { FullscreenButton } from '../components/FullscreenButton';
import Confetti from '../components/Confetti';
import RoomCharacters from '../components/RoomCharacters';
import { BELLS } from '../components/JellyBells';
import useAudio from '../hooks/useAudio';
import { earnSticker, earnAchievement, earnAchievementUpTo } from '../hooks/useStickers';
import useNoteNames from '../hooks/useNoteNames';

// All 8 bells (including High C). Note Match uses subsets per difficulty.
// Hard mode = full 8 bells (4 + 4 grid for nice symmetry).
const ALL_BELLS = BELLS;
const NON_HIGH_BELLS = BELLS.filter(b => b.note !== 'High C');

const LEVELS = {
  easy:   { name: 'Easy',   pairs: 4, cols: 4, description: '4 matching pairs',        sticker: 'match_easy',   bellSet: 'low' },
  medium: { name: 'Medium', pairs: 6, cols: 4, description: '6 matching pairs',        sticker: 'match_medium', bellSet: 'low' },
  hard:   { name: 'Hard',   pairs: 8, cols: 4, description: 'All 8 bells (with Hi Do)', sticker: 'match_hard',   bellSet: 'all' },
};

const BEST_TIME_KEY = 'jma_note_match_best_times_v1';
function loadBestTimes() {
  try { return JSON.parse(localStorage.getItem(BEST_TIME_KEY) || '{}'); } catch { return {}; }
}
function saveBestTimes(t) {
  try { localStorage.setItem(BEST_TIME_KEY, JSON.stringify(t)); } catch { /* ignore */ }
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildDeck(pairs, bellSet) {
  const pool = bellSet === 'all' ? ALL_BELLS : NON_HIGH_BELLS;
  const picks = shuffle(pool).slice(0, pairs);
  const deck = [];
  picks.forEach((bell, pairIdx) => {
    deck.push({ id: `${pairIdx}-a`, pairId: pairIdx, bell });
    deck.push({ id: `${pairIdx}-b`, pairId: pairIdx, bell });
  });
  return shuffle(deck);
}

function fmtTime(ms) {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function NoteMatchPage() {
  const { nameFor } = useNoteNames();
  const navigate = useNavigate();
  const { playBellNote, playFeedbackSound, initAudioContext } = useAudio();

  const [gameState, setGameState] = useState('menu'); // menu | playing | win
  const [difficulty, setDifficulty] = useState('easy');
  const [deck, setDeck] = useState([]);
  const [revealed, setRevealed] = useState(new Set());   // card ids currently face-up
  const [matched, setMatched] = useState(new Set());     // card ids permanently solved
  const [moves, setMoves] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [bestTimes, setBestTimes] = useState(loadBestTimes);
  const [isNewBest, setIsNewBest] = useState(false);
  const lockRef = useRef(false);          // prevents tapping a 3rd card mid-resolution
  const firstFlippedRef = useRef(null);   // explicitly tracks the first card flipped of the pair
  const tickRef = useRef(null);

  const level = LEVELS[difficulty];
  const totalPairs = level.pairs;
  const matchedPairs = matched.size / 2;

  // Timer
  useEffect(() => {
    if (gameState !== 'playing') return;
    tickRef.current = setInterval(() => setElapsed(Date.now() - startTime), 250);
    return () => clearInterval(tickRef.current);
  }, [gameState, startTime]);

  const startGame = useCallback((diffOverride) => {
    initAudioContext();
    const diff = typeof diffOverride === 'string' ? diffOverride : difficulty;
    const newDeck = buildDeck(LEVELS[diff].pairs, LEVELS[diff].bellSet);
    setDifficulty(diff);
    setDeck(newDeck);
    setRevealed(new Set());
    setMatched(new Set());
    setMoves(0);
    setStartTime(Date.now());
    setElapsed(0);
    setIsNewBest(false);
    setGameState('playing');
    lockRef.current = false;
    firstFlippedRef.current = null;
  }, [initAudioContext, difficulty]);

  // Win check + persist best time
  useEffect(() => {
    if (gameState !== 'playing') return;
    if (matched.size > 0 && matched.size === deck.length) {
      const finalMs = Date.now() - startTime;
      setElapsed(finalMs);
      // Save best time per difficulty
      const prev = bestTimes[difficulty];
      const isBest = prev == null || finalMs < prev;
      if (isBest) {
        const next = { ...bestTimes, [difficulty]: finalMs };
        saveBestTimes(next);
        setBestTimes(next);
        setIsNewBest(true);
      }
      try { earnSticker(level.sticker); } catch { /* ignore */ }
      // 🎧 Note Detective achievement — completing each tier proves a level
      // of ear/memory skill.
      try {
        if (difficulty === 'easy')   earnAchievement('ear', 'cadet');
        if (difficulty === 'medium') earnAchievementUpTo('ear', 'pro');
        if (difficulty === 'hard')   earnAchievementUpTo('ear', 'master');
      } catch { /* ignore */ }
      playFeedbackSound('perfect');
      setTimeout(() => setGameState('win'), 600);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matched, deck.length, gameState]);

  const handleCardTap = useCallback((card) => {
    if (lockRef.current) return;
    if (matched.has(card.id)) return;
    if (revealed.has(card.id)) return;

    playBellNote(card.bell.note);

    // First flip of the pair: remember the card, reveal it, and return.
    if (firstFlippedRef.current == null) {
      firstFlippedRef.current = card;
      setRevealed((prev) => {
        const next = new Set(prev);
        next.add(card.id);
        return next;
      });
      return;
    }

    // Second flip: compare. Lock the board until resolution completes.
    const firstCard = firstFlippedRef.current;
    firstFlippedRef.current = null;
    lockRef.current = true;
    setMoves((m) => m + 1);
    setRevealed((prev) => {
      const next = new Set(prev);
      next.add(card.id);
      return next;
    });

    if (firstCard.pairId === card.pairId) {
      // Match — promote both to matched, unlock after a short beat.
      setTimeout(() => {
        setMatched((prev) => {
          const next = new Set(prev);
          next.add(firstCard.id);
          next.add(card.id);
          return next;
        });
        try { playBellNote(card.bell.note); } catch { /* ignore */ }
        lockRef.current = false;
      }, 350);
    } else {
      // Mismatch — flip both back, then unlock.
      setTimeout(() => {
        setRevealed((prev) => {
          const next = new Set(prev);
          next.delete(firstCard.id);
          next.delete(card.id);
          return next;
        });
        lockRef.current = false;
      }, 900);
    }
  }, [revealed, matched, playBellNote]);

  // ===== MENU =====
  if (gameState === 'menu') {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center jma-safe-center p-4 pt-20 md:pt-24 lg:pt-32 pb-8 relative"
        data-testid="note-match-menu"
        style={{ backgroundImage: 'url(assets/backgrounds/boat.png)', backgroundSize: 'cover', backgroundPosition: 'center' }}
      >
        <GameHeader showHomeButton={true} backLink={{ to: '/play', label: 'Play' }} />
        <FullscreenButton />
        <RoomCharacters room="note-match" />

        <motion.h1
          className="text-3xl md:text-5xl font-black mb-2 text-center font-display uppercase"
          style={{ color: 'var(--jma-dark)' }}
          initial={{ y: -30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
        >
          NOTE MATCH
        </motion.h1>
        <motion.p
          className="text-base md:text-lg font-bold mb-4 text-center"
          style={{ color: 'var(--jma-dark)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
        >
          Flip the bells. Match the sounds!
        </motion.p>

        <motion.div className="game-card p-5 mb-6 max-w-md text-center" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2 }}>
          <Sparkles className="w-10 h-10 mx-auto mb-2" style={{ color: 'var(--jma-purple)' }} />
          <h2 className="text-xl font-bold mb-2 font-display">How to Play</h2>
          <p className="text-sm md:text-base" style={{ color: 'var(--jma-dark)' }}>
            1. Tap a card to flip it — you'll hear its bell note<br />
            2. Find its matching twin somewhere on the board<br />
            3. Match every pair to win!
          </p>
        </motion.div>

        <div className="grid gap-2 w-full max-w-md mb-2">
          {Object.entries(LEVELS).map(([key, lvl], idx) => (
            <motion.button
              key={key}
              data-testid={`note-match-difficulty-${key}`}
              className={`level-card p-3 text-left flex items-center justify-between ${difficulty === key ? 'ring-4 ring-[var(--jma-purple)]' : ''}`}
              onClick={() => startGame(key)}
              initial={{ x: -40, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.1 * idx }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div>
                <h3 className="text-lg font-bold font-display">{lvl.name}</h3>
                <p className="text-xs opacity-60">{lvl.description}</p>
              </div>
              {bestTimes[key] != null && (
                <div className="text-right">
                  <div className="text-[10px] uppercase font-bold opacity-60">Best</div>
                  <div className="text-sm font-black" style={{ color: 'var(--jma-orange)' }}>
                    {fmtTime(bestTimes[key])}
                  </div>
                </div>
              )}
            </motion.button>
          ))}
        </div>
      </div>
    );
  }

  // ===== PLAYING / WIN — share same board view =====
  return (
    <div
      className="min-h-screen flex flex-col relative"
      data-testid="note-match-playing"
      style={{ backgroundImage: 'url(assets/backgrounds/boat.png)', backgroundSize: 'cover', backgroundPosition: 'center' }}
    >
      <GameHeader title="NOTE MATCH" subtitle={level.name} showHomeButton={true} backLink={{ to: '/play', label: 'Play' }} />
      <RoomCharacters room="note-match" />

      <main className="flex-1 flex flex-col items-center pt-20 md:pt-20 pb-6 px-3">
        {/* HUD chips */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-3">
          <div
            data-testid="note-match-time"
            className="px-3 py-1 rounded-full font-black text-sm border-2 flex items-center gap-1.5"
            style={{ backgroundColor: 'white', color: 'var(--jma-dark)', borderColor: 'var(--jma-dark)' }}
          >
            <Clock className="w-4 h-4" /> {fmtTime(elapsed)}
          </div>
          <div
            data-testid="note-match-moves"
            className="px-3 py-1 rounded-full font-black text-sm border-2"
            style={{ backgroundColor: 'white', color: 'var(--jma-dark)', borderColor: 'var(--jma-dark)' }}
          >
            Moves: {moves}
          </div>
          <div
            data-testid="note-match-progress"
            className="px-3 py-1 rounded-full font-black text-sm border-2"
            style={{
              backgroundColor: matchedPairs === totalPairs ? '#4CD964' : 'var(--jma-yellow)',
              color: 'var(--jma-dark)',
              borderColor: 'var(--jma-dark)',
            }}
          >
            Pairs: {matchedPairs} / {totalPairs}
          </div>
        </div>

        {/* Board */}
        <div
          data-testid="note-match-board"
          className="grid gap-2 md:gap-3 w-full max-w-xl"
          style={{ gridTemplateColumns: `repeat(${level.cols}, minmax(0, 1fr))` }}
        >
          {deck.map((card) => {
            const isRevealed = revealed.has(card.id) || matched.has(card.id);
            const isMatched = matched.has(card.id);
            return (
              <motion.button
                key={card.id}
                data-testid={`note-match-card-${card.id}`}
                onClick={() => handleCardTap(card)}
                disabled={isMatched}
                className="relative aspect-[3/4] rounded-2xl border-4 select-none overflow-hidden"
                style={{
                  borderColor: 'var(--jma-dark)',
                  boxShadow: isMatched
                    ? '0 3px 0 0 var(--jma-dark)'
                    : '0 6px 0 0 var(--jma-dark)',
                  backgroundColor: isRevealed ? '#FFFBEE' : 'var(--jma-dark)',
                  cursor: isMatched ? 'default' : 'pointer',
                  opacity: isMatched ? 0.55 : 1,
                }}
                whileHover={!isMatched && !isRevealed ? { y: -3, boxShadow: '0 8px 0 0 var(--jma-dark)' } : {}}
                whileTap={!isMatched ? { y: 2, boxShadow: '0 3px 0 0 var(--jma-dark)' } : {}}
                initial={{ rotateY: 0 }}
                animate={{ rotateY: isRevealed ? 180 : 0 }}
                transition={{ duration: 0.35 }}
              >
                {/* CARD BACK — JMA shield */}
                {!isRevealed && (
                  <div
                    className="absolute inset-0 flex items-center justify-center"
                    style={{ background: 'radial-gradient(circle at 50% 30%, #2A6DAB 0%, var(--jma-dark) 80%)' }}
                  >
                    <img
                      src="assets/ui/jma-stylized-logo.png"
                      alt=""
                      draggable={false}
                      className="w-3/4 h-3/4 object-contain opacity-90 pointer-events-none"
                      style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))' }}
                    />
                  </div>
                )}

                {/* CARD FACE — bell + solfège */}
                {isRevealed && (
                  <div
                    className="absolute inset-0 flex flex-col items-center justify-center px-1 pb-1"
                    style={{ transform: 'rotateY(180deg)', backgroundColor: '#FFFBEE' }}
                  >
                    <img
                      src={card.bell.image1}
                      alt={card.bell.solfege}
                      draggable={false}
                      className="w-3/4 h-3/4 object-contain pointer-events-none"
                      style={{ filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.18))' }}
                    />
                    <div className="flex items-center gap-0.5 leading-none">
                      <span
                        className="text-sm md:text-base font-black font-display"
                      >
                        {nameFor(card.bell.note, card.bell.solfege)}
                      </span>
                      {card.bell.note === 'High C' && (
                        <ChevronUp
                          className="w-3.5 h-3.5 md:w-4 md:h-4 -ml-0.5"
                          style={{ color: card.bell.color, strokeWidth: 4 }}
                        />
                      )}
                    </div>
                  </div>
                )}

                {/* Match sparkle */}
                {isMatched && (
                  <div className="absolute top-1 right-1 z-10">
                    <Sparkles className="w-4 h-4" style={{ color: '#FFCC00' }} />
                  </div>
                )}
              </motion.button>
            );
          })}
        </div>

        {/* Controls */}
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          <button
            data-testid="note-match-restart-btn"
            onClick={() => startGame(difficulty)}
            className="chunky-btn bg-[var(--jma-yellow)] text-[var(--jma-dark)] px-4 py-2 flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" /> Restart
          </button>
          <button
            data-testid="note-match-back-btn"
            onClick={() => setGameState('menu')}
            className="chunky-btn bg-white text-[var(--jma-dark)] px-4 py-2"
          >
            Change Level
          </button>
        </div>

        {/* WIN OVERLAY */}
        <AnimatePresence>
          {gameState === 'win' && (
            <motion.div
              data-testid="note-match-win"
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
                <h2 className="text-3xl md:text-4xl font-black font-display mb-1" style={{ color: 'var(--jma-dark)' }}>
                  {isNewBest ? 'NEW BEST TIME!' : 'You Did It!'}
                </h2>
                <p className="font-bold mb-4" style={{ color: 'var(--jma-dark)' }}>
                  Matched all {totalPairs} pairs in {fmtTime(elapsed)} · {moves} moves
                </p>
                <div className="flex items-center justify-center gap-2 mb-4">
                  <Trophy className="w-5 h-5" style={{ color: '#FFCC00' }} />
                  <span className="text-sm font-black uppercase" style={{ color: 'var(--jma-dark)' }}>
                    Best: {fmtTime(bestTimes[difficulty] || elapsed)}
                  </span>
                </div>
                <div className="flex flex-wrap justify-center gap-2">
                  <button
                    data-testid="note-match-win-again"
                    onClick={() => startGame(difficulty)}
                    className="chunky-btn bg-[var(--jma-green)] text-white px-4 py-2"
                  >
                    Play Again
                  </button>
                  <button
                    data-testid="note-match-win-menu"
                    onClick={() => setGameState('menu')}
                    className="chunky-btn bg-[var(--jma-yellow)] text-[var(--jma-dark)] px-4 py-2"
                  >
                    Change Level
                  </button>
                  <button
                    data-testid="note-match-win-home"
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
