// TempoListeningGame — sub-mode of Ear Quest.
// Plays two short clips (same tune, different BPMs). Kid picks whether the
// SECOND clip is faster or slower than the first.
//
// 10 rounds per run. Difficulty controlled by how close the two tempos are:
//   round 1-3:  ±40 BPM (very obvious)
//   round 4-7:  ±20 BPM
//   round 8-10: ±10 BPM (subtle)
//
// Earns the Rhythm Reader achievement ladder — Cadet on first 5 correct,
// Pro on 8+ correct, Master on 10/10 (since tempo discrimination is the
// foundation of timing/groove).

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, RotateCcw, Volume2, Rabbit, Turtle } from 'lucide-react';
import Confetti from './Confetti';
import useAudio from '../hooks/useAudio';
import { earnAchievement, earnAchievementUpTo } from '../hooks/useStickers';

// Use a short tune kids recognize for the tempo test.
const TUNES = [
  { name: 'Mary Had a Little Lamb', notes: ['E', 'D', 'C', 'D', 'E', 'E', 'E'] },
  { name: 'Hot Cross Buns',          notes: ['E', 'D', 'C', 'E', 'D', 'C'] },
  { name: 'Twinkle (snippet)',       notes: ['C', 'C', 'G', 'G', 'A', 'A', 'G'] },
  { name: 'Row, Row, Row',           notes: ['C', 'C', 'C', 'D', 'E'] },
];

const ROUNDS_PER_RUN = 10;
const BEST_KEY = 'jma_tempo_quiz_best_v1';
const loadBest = () => { try { return JSON.parse(localStorage.getItem(BEST_KEY) || '0'); } catch { return 0; } };
const saveBest = (b) => { try { localStorage.setItem(BEST_KEY, JSON.stringify(b)); } catch { /* ignore */ } };

function tempoDelta(roundIndex) {
  if (roundIndex < 3) return 40;
  if (roundIndex < 7) return 20;
  return 10;
}

function rand(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function buildRound(roundIndex) {
  const tune = rand(TUNES);
  const baseBpm = 90 + Math.floor(Math.random() * 60); // 90–150 BPM base
  const delta = tempoDelta(roundIndex);
  const fasterSecond = Math.random() < 0.5;
  const secondBpm = fasterSecond ? baseBpm + delta : baseBpm - delta;
  return {
    tune,
    firstBpm: baseBpm,
    secondBpm,
    correct: fasterSecond ? 'faster' : 'slower',
  };
}

export default function TempoListeningGame({ onExit }) {
  const { playBellNote, playFeedbackSound, initAudioContext } = useAudio();
  const [gameState, setGameState] = useState('menu'); // menu | listening | guess | reveal | win
  const [round, setRound] = useState(null);
  const [roundNum, setRoundNum] = useState(0);   // 0-indexed
  const [correct, setCorrect] = useState(0);
  const [bestRun, setBestRun] = useState(loadBest);
  const [isNewBest, setIsNewBest] = useState(false);
  const [guess, setGuess] = useState(null);
  const [wasCorrect, setWasCorrect] = useState(null);
  const [whichPlaying, setWhichPlaying] = useState(0); // 0=none, 1=first, 2=second

  const timerRef = useRef(null);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  const playClip = useCallback((notes, bpm, onDone) => {
    const noteMs = Math.round(60_000 / bpm);
    let i = 0;
    const tick = () => {
      if (i >= notes.length) { if (onDone) onDone(); return; }
      try { playBellNote(notes[i]); } catch { /* ignore */ }
      i += 1;
      timerRef.current = setTimeout(tick, noteMs);
    };
    tick();
  }, [playBellNote]);

  const playBothClips = useCallback((r) => {
    setWhichPlaying(1);
    playClip(r.tune.notes, r.firstBpm, () => {
      // Pause between clips
      timerRef.current = setTimeout(() => {
        setWhichPlaying(2);
        playClip(r.tune.notes, r.secondBpm, () => {
          setWhichPlaying(0);
          setGameState('guess');
        });
      }, 900);
    });
  }, [playClip]);

  const startGame = useCallback(() => {
    initAudioContext();
    setRoundNum(0);
    setCorrect(0);
    setIsNewBest(false);
    setGuess(null);
    setWasCorrect(null);
    const r = buildRound(0);
    setRound(r);
    setGameState('listening');
    timerRef.current = setTimeout(() => playBothClips(r), 350);
  }, [initAudioContext, playBothClips]);

  const handleGuess = useCallback((choice) => {
    if (gameState !== 'guess' || !round) return;
    const ok = choice === round.correct;
    setGuess(choice);
    setWasCorrect(ok);
    if (ok) {
      setCorrect((c) => c + 1);
      try { playFeedbackSound('perfect'); } catch { /* ignore */ }
    } else {
      try { playFeedbackSound('miss'); } catch { /* ignore */ }
    }
    setGameState('reveal');
  }, [gameState, round, playFeedbackSound]);

  const advance = useCallback(() => {
    const nextRoundIdx = roundNum + 1;
    if (nextRoundIdx >= ROUNDS_PER_RUN) {
      // Final score
      const finalCorrect = correct;
      if (finalCorrect > bestRun) {
        saveBest(finalCorrect);
        setBestRun(finalCorrect);
        setIsNewBest(true);
      }
      // 🥁 Rhythm Reader achievement ladder
      try {
        if (finalCorrect >= 5)  earnAchievement('rhythm', 'cadet');
        if (finalCorrect >= 8)  earnAchievementUpTo('rhythm', 'pro');
        if (finalCorrect >= 10) earnAchievementUpTo('rhythm', 'master');
      } catch { /* ignore */ }
      setGameState('win');
      return;
    }
    setRoundNum(nextRoundIdx);
    const r = buildRound(nextRoundIdx);
    setRound(r);
    setGuess(null);
    setWasCorrect(null);
    setGameState('listening');
    timerRef.current = setTimeout(() => playBothClips(r), 350);
  }, [roundNum, correct, bestRun, playBothClips]);

  const replayBoth = useCallback(() => {
    if (gameState !== 'guess' || !round) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    setGameState('listening');
    timerRef.current = setTimeout(() => playBothClips(round), 200);
  }, [gameState, round, playBothClips]);

  if (gameState === 'menu') {
    return (
      <motion.div
        data-testid="tempo-quiz-menu"
        className="game-card p-5 max-w-md w-full text-center"
        initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
      >
        <div className="flex items-center justify-center gap-2 mb-2">
          <Rabbit className="w-9 h-9" style={{ color: '#FF6B35' }} />
          <span className="text-3xl">↔</span>
          <Turtle className="w-9 h-9" style={{ color: '#34A853' }} />
        </div>
        <h2 className="text-2xl font-black font-display mb-1" style={{ color: 'var(--jma-dark)' }}>
          Snail or Cheetah?
        </h2>
        <p className="text-sm font-bold mb-3" style={{ color: 'var(--jma-dark)' }}>
          Two tunes! Was the second one a <b>cheetah</b> 🐆 (faster) or a <b>snail</b> 🐌 (slower)?
        </p>
        <p className="text-xs opacity-70 mb-3" style={{ color: 'var(--jma-dark)' }}>
          10 rounds · the differences get sneakier as you go!
        </p>
        {bestRun > 0 && (
          <div className="mb-3 inline-block px-3 py-1 rounded-full font-black text-xs border-2"
            style={{ backgroundColor: 'var(--jma-yellow)', color: 'var(--jma-dark)', borderColor: 'var(--jma-dark)' }}>
            🏆 Best: {bestRun} / {ROUNDS_PER_RUN}
          </div>
        )}
        <div className="flex flex-wrap justify-center gap-2">
          <button
            data-testid="tempo-quiz-start"
            onClick={startGame}
            className="chunky-btn bg-[var(--jma-green)] text-white px-4 py-2 flex items-center gap-2"
          >
            <Play className="w-4 h-4" /> Start the Race!
          </button>
          <button
            data-testid="tempo-quiz-back"
            onClick={onExit}
            className="chunky-btn bg-white text-[var(--jma-dark)] px-4 py-2"
          >
            ← Back
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      data-testid="tempo-quiz-playing"
      className="game-card p-5 max-w-md w-full text-center relative"
      initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
    >
      {/* HUD */}
      <div className="flex flex-wrap items-center justify-center gap-2 mb-3">
        <div className="px-3 py-1 rounded-full font-black text-xs border-2"
          style={{ backgroundColor: 'white', color: 'var(--jma-dark)', borderColor: 'var(--jma-dark)' }}>
          Round {Math.min(roundNum + 1, ROUNDS_PER_RUN)} / {ROUNDS_PER_RUN}
        </div>
        <div data-testid="tempo-quiz-score" className="px-3 py-1 rounded-full font-black text-xs border-2"
          style={{ backgroundColor: 'var(--jma-yellow)', color: 'var(--jma-dark)', borderColor: 'var(--jma-dark)' }}>
          ✅ {correct}
        </div>
      </div>

      {/* Clip indicators */}
      <div className="flex items-center justify-center gap-3 mb-3">
        {[1, 2].map((n) => (
          <motion.div
            key={n}
            data-testid={`tempo-quiz-clip-${n}`}
            className="rounded-full border-3 flex items-center justify-center font-black font-display"
            style={{
              width: 64,
              height: 64,
              backgroundColor: whichPlaying === n ? 'var(--jma-blue)' : 'white',
              color: whichPlaying === n ? 'white' : 'var(--jma-dark)',
              borderColor: 'var(--jma-dark)',
              boxShadow: '0 4px 0 0 var(--jma-dark)',
            }}
            animate={whichPlaying === n ? { scale: [1, 1.08, 1] } : { scale: 1 }}
            transition={{ duration: 0.6, repeat: whichPlaying === n ? Infinity : 0 }}
          >
            #{n}
          </motion.div>
        ))}
      </div>

      <div
        data-testid="tempo-quiz-phase"
        className="inline-block px-3 py-1 rounded-full text-xs font-black border-2 mb-3"
        style={{
          backgroundColor: gameState === 'listening' ? 'var(--jma-blue)' :
                           gameState === 'guess' ? 'var(--jma-yellow)' :
                           wasCorrect ? '#34A853' : '#FF3B30',
          color: gameState === 'listening' || (gameState === 'reveal' && !wasCorrect) ? 'white' :
                 gameState === 'reveal' && wasCorrect ? 'white' : 'var(--jma-dark)',
          borderColor: 'var(--jma-dark)',
        }}
      >
        {gameState === 'listening' && '🎧 Listen carefully...'}
        {gameState === 'guess' && '👇 Was clip #2 a cheetah or a snail?'}
        {gameState === 'reveal' && (wasCorrect
          ? `✅ Yes — #2 was ${round.correct === 'faster' ? 'a CHEETAH 🐆' : 'a SNAIL 🐌'} (${round.firstBpm} → ${round.secondBpm} BPM)`
          : `😅 #2 was actually ${round.correct === 'faster' ? 'a CHEETAH 🐆' : 'a SNAIL 🐌'} (${round.firstBpm} → ${round.secondBpm} BPM)`)}
      </div>

      {/* Choice buttons */}
      <div className="flex flex-wrap justify-center gap-2 mb-3">
        <motion.button
          data-testid="tempo-quiz-faster"
          onClick={() => handleGuess('faster')}
          disabled={gameState !== 'guess'}
          whileHover={gameState === 'guess' ? { scale: 1.05 } : {}}
          whileTap={gameState === 'guess' ? { scale: 0.95 } : {}}
          className="chunky-btn px-5 py-3 flex items-center gap-2 text-base"
          style={{
            backgroundColor: guess === 'faster'
              ? (wasCorrect ? '#34A853' : '#FF3B30')
              : (gameState === 'reveal' && round?.correct === 'faster' ? '#34A853' : '#FF6B35'),
            color: 'white',
            cursor: gameState === 'guess' ? 'pointer' : 'default',
            opacity: gameState === 'guess' ? 1 : 0.85,
          }}
        >
          <Rabbit className="w-5 h-5" /> CHEETAH
        </motion.button>
        <motion.button
          data-testid="tempo-quiz-slower"
          onClick={() => handleGuess('slower')}
          disabled={gameState !== 'guess'}
          whileHover={gameState === 'guess' ? { scale: 1.05 } : {}}
          whileTap={gameState === 'guess' ? { scale: 0.95 } : {}}
          className="chunky-btn px-5 py-3 flex items-center gap-2 text-base"
          style={{
            backgroundColor: guess === 'slower'
              ? (wasCorrect ? '#34A853' : '#FF3B30')
              : (gameState === 'reveal' && round?.correct === 'slower' ? '#34A853' : '#4285F4'),
            color: 'white',
            cursor: gameState === 'guess' ? 'pointer' : 'default',
            opacity: gameState === 'guess' ? 1 : 0.85,
          }}
        >
          <Turtle className="w-5 h-5" /> SNAIL
        </motion.button>
      </div>

      {/* Controls */}
      {gameState === 'guess' && (
        <button
          data-testid="tempo-quiz-replay"
          onClick={replayBoth}
          className="chunky-btn bg-[var(--jma-purple)] text-white px-3 py-1.5 text-sm flex items-center gap-1.5 mx-auto"
        >
          <Volume2 className="w-4 h-4" /> Hear Both Again
        </button>
      )}
      {gameState === 'reveal' && (
        <button
          data-testid="tempo-quiz-next"
          onClick={advance}
          className="chunky-btn bg-[var(--jma-yellow)] text-[var(--jma-dark)] px-4 py-2 mx-auto"
        >
          {roundNum + 1 >= ROUNDS_PER_RUN ? 'See Results' : 'Next Round →'}
        </button>
      )}

      <button
        data-testid="tempo-quiz-exit"
        onClick={onExit}
        className="block mx-auto mt-3 text-xs font-bold opacity-60 hover:opacity-100 underline"
        style={{ color: 'var(--jma-dark)' }}
      >
        Back to Ear Quest
      </button>

      {/* WIN OVERLAY */}
      <AnimatePresence>
        {gameState === 'win' && (
          <motion.div
            data-testid="tempo-quiz-win"
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
                {isNewBest ? 'NEW BEST!' : 'Race Over!'}
              </h2>
              <p className="font-bold mb-3" style={{ color: 'var(--jma-dark)' }}>
                You got <b>{correct} / {ROUNDS_PER_RUN}</b> right!
              </p>
              <p className="text-xs opacity-70 mb-4" style={{ color: 'var(--jma-dark)' }}>
                Best: {Math.max(correct, bestRun)} / {ROUNDS_PER_RUN}
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                <button data-testid="tempo-quiz-win-again" onClick={startGame}
                  className="chunky-btn bg-[var(--jma-green)] text-white px-4 py-2 flex items-center gap-1.5">
                  <RotateCcw className="w-4 h-4" /> Play Again
                </button>
                <button data-testid="tempo-quiz-win-exit" onClick={onExit}
                  className="chunky-btn bg-white text-[var(--jma-dark)] px-4 py-2">
                  Back to Ear Quest
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
