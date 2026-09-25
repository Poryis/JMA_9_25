// Who's Got the Rhythm — a rhythm-reading room with three modes:
//   - Parrot Percussion (echo): Stew claps a rhythm; kid hits the snare to copy it.
//   - Beat Finder      (match): Three patterns shown; kid picks the one they hear.
//   - Rhythm Run       (read):  Pattern is shown; kid reads + plays it in time.
//
// Renamed Feb 2026: this room used to be "Stew's Rhythm Academy". The
// original "Who's Got the Rhythm?" falling-notes game is now called
// "Jelly Jukebox" and lives under Play.
//
// All three modes share a steady hi-hat click track so the kid always has a
// beat to lock into — and so audio-identical-without-metronome patterns like
// [rest, ta, ta, ta] vs [ta, ta, ta, rest] become audibly distinguishable
// (the click on the rest beat is no longer masked by a snare).
//
// Notation syllables match Lesson 4 exactly:
//   Whole = Toe-ee--O-ee · Half = Toe-ee · Quarter = Ta · Eighth = Ti

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Volume2, RotateCcw, Sparkles } from 'lucide-react';
import { GameHeader, FeedbackPopup } from '../components/GameUI';
import { FullscreenButton } from '../components/FullscreenButton';
import Confetti from '../components/Confetti';
import RhythmStrip from '../components/RhythmStrip';
import ScrollingRhythmStrip from '../components/ScrollingRhythmStrip';
import StewDrummer from '../components/StewDrummer';
import BeatPulse from '../components/BeatPulse';
import CountInOverlay from '../components/CountInOverlay';
import useAudio from '../hooks/useAudio';
import { earnAchievement, earnAchievementUpTo } from '../hooks/useStickers';
import {
  PATTERNS, TRAIL_PATTERNS, DIFFICULTIES, BEAT_MS as BASE_BEAT_MS, TOLERANCE_MS,
  patternBeats, noteStartTimes, ROUNDS_PER_SESSION,
} from '../data/rhythms';

// Tempo dial values — chill / standard / turbo. Multiplies how FAST the
// click track runs (i.e. inverse of BEAT_MS), so 1.25 = a quarter-note
// every 600 ms = ~100 BPM. Kept tight so the gameplay still feels musical
// at every step.
const TEMPOS = [
  { id: 0.75, label: 'Easy',   description: '60 BPM',  color: '#34A853' },
  { id: 1.0,  label: 'Medium', description: '80 BPM',  color: '#FFCC00' },
  { id: 1.25, label: 'Turbo',  description: '100 BPM', color: '#FF3B30' },
];

// Per-mode card config — each tile mirrors the LearnMenuPage tile aesthetic
// (chunky border + sign nameplate + character peeking + tagline).
const MODES = [
  {
    id: 'copy',
    label: 'Parrot Percussion',
    blurb: 'Stew plays. You play it back.',
    sign: 'PARROT PERCUSSION',
    color: '#4285F4',
    accent: '#1A4FAB',
    bg: 'assets/backgrounds/football-field.png',
    character: 'assets/characters/chunk-marching.png',
    charWidthPct: 40,
    howToPlay: [
      { icon: '👂', text: 'Listen to Stew play the rhythm.' },
      { icon: '🥁', text: 'After the 4-beat count-in, play the same rhythm on the drum.' },
      { icon: '⏰', text: 'Try to tap right on each beat!' },
    ],
  },
  {
    id: 'match',
    label: 'Beat Finder',
    blurb: 'Hear the rhythm. Find the matching beat.',
    sign: 'BEAT FINDER',
    color: '#34A853',
    accent: '#1F7A38',
    bg: 'assets/backgrounds/football-field.png',
    character: 'assets/characters/jazzy-marching.png',
    charWidthPct: 38,
    howToPlay: [
      { icon: '👂', text: 'Listen to the secret rhythm.' },
      { icon: '🎵', text: 'Three rhythm strips will appear.' },
      { icon: '🎯', text: 'Tap the strip that matches what you heard!' },
    ],
  },
  {
    id: 'trail',
    label: 'Rhythm Run',
    blurb: 'Read the rhythm. Play it in time.',
    sign: 'RHYTHM RUN',
    color: '#FF9500',
    accent: '#C26200',
    bg: 'assets/backgrounds/football-field.png',
    character: 'assets/characters/charlie-drum-major.png',
    charWidthPct: 34,
    howToPlay: [
      { icon: '👀', text: 'Watch the notes scroll toward the gold line.' },
      { icon: '🥁', text: 'Tap Stew when each note crosses the line.' },
      { icon: '🔥', text: 'Keep your streak going for bonus points!' },
    ],
  },
];

const MODE_MAP = Object.fromEntries(MODES.map((m) => [m.id, m]));

function randomPattern(level, source = PATTERNS) {
  const pool = source[level] || source.cadet;
  return pool[Math.floor(Math.random() * pool.length)];
}

// Pick 3 distinct patterns at the same difficulty for Twin Beats. With the
// shared click track running, even leading-vs-trailing-rest mirror patterns
// are audibly distinguishable, so we don't need to filter mirror pairs.
function threeDistinctPatterns(level) {
  const pool = [...(PATTERNS[level] || PATTERNS.cadet)];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, 3);
}

// Clean JMAtv-style mode tile: solid mode-color bg, small badge top-left,
// title + blurb left column, character art right column. Replaces the older
// full-bleed scene cards which felt visually crowded next to the new
// homepage / JMAtv aesthetic.
function ModeTile({ mode, index, onPick }) {
  return (
    <motion.button
      type="button"
      data-testid={`boom-mode-${mode.id}`}
      onClick={() => onPick(mode.id)}
      className="relative w-full text-left rounded-3xl bg-transparent border-0 p-0 cursor-pointer"
      initial={{ y: 40, opacity: 0, scale: 0.95 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      transition={{ delay: 0.12 + index * 0.08, type: 'spring', stiffness: 220 }}
      whileHover={{ y: -4, scale: 1.02 }}
      whileTap={{ scale: 0.97 }}
    >
      <div
        className="relative rounded-3xl overflow-hidden flex flex-col"
        style={{
          border: '5px solid var(--jma-dark)',
          boxShadow: `0 10px 0 0 ${mode.accent}, 0 13px 0 0 var(--jma-dark)`,
          minHeight: 240,
          padding: 'clamp(12px, 2vw, 22px)',
          color: 'white',
          backgroundImage: `url(${mode.bg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        {/* Color tint over the football field so each card still reads its
            mode-color even though every card shares the same scene. */}
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `linear-gradient(180deg, ${mode.color}55 0%, ${mode.accent}88 100%)`,
          }}
        />

        <div className="flex-1 flex items-stretch relative gap-3">
          {/* Text column — NES-cartridge huge title, no sign nameplate,
              no long blurb. */}
          <div className="relative flex-1 min-w-0 flex flex-col justify-end">
            <h2
              className="font-black font-display leading-[0.9] uppercase whitespace-nowrap"
              style={{
                fontSize: 'clamp(11px, 1.6vw, 22px)',
                color: 'white',
                WebkitTextStroke: 'clamp(1.5px, 0.35vw, 3px) var(--jma-dark)',
                paintOrder: 'stroke fill',
                letterSpacing: '0.01em',
              }}
            >
              {mode.label}
            </h2>
          </div>

          {/* Character host column — drum-major-style hero on the football
              field. Fixed share so art never overlaps text. */}
          {mode.character && (
            <div className="relative flex-shrink-0" style={{ width: '35%' }}>
              <img
                src={mode.character}
                alt=""
                aria-hidden="true"
                draggable={false}
                loading="lazy"
                className="absolute object-contain pointer-events-none select-none"
                style={{
                  right: 'clamp(-12px, -1vw, -6px)',
                  bottom: -10,
                  width: '125%',
                  maxHeight: '135%',
                  filter: 'drop-shadow(0 6px 8px rgba(0,0,0,0.45))',
                }}
              />
            </div>
          )}
        </div>
      </div>
    </motion.button>
  );
}

export default function BoomGardenPage() {
  const { playDrumSound, playCountInBeep, initAudioContext } = useAudio();

  const [mode, setMode] = useState(null);
  const [level, setLevel] = useState('cadet');
  const [pattern, setPattern] = useState(null);
  const [matchOptions, setMatchOptions] = useState([]);
  const [matchAnswer, setMatchAnswer] = useState(-1);
  const [phase, setPhase] = useState('idle');       // idle | demo | input | reveal
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const [hitStates, setHitStates] = useState([]);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  // Round tracking for the fixed-length session. ROUNDS_PER_SESSION (5)
  // rounds per visit, then a Session Summary card pops with total score +
  // a "Play another round of 5" button. Kids respond well to a known
  // finish line, and a fixed length is also what unlocks fair scoreboards.
  const [currentRound, setCurrentRound] = useState(1);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [sessionStats, setSessionStats] = useState(null); // { perfects, totalNotes, score } | null
  // Running tally of perfects and total notes across the session — fed
  // into sessionStats when the run ends.
  const sessionTallyRef = useRef({ perfects: 0, totalNotes: 0 });
  const [showCelebration, setShowCelebration] = useState(false);
  // Pre-round How-to-Play modal — pops the first time a kid enters a mode
  // in this session so elementary students aren't dumped straight into the
  // count-in without knowing what they're supposed to do. "Got it!" button
  // kicks off the actual round. Resets on every enterMode call.
  const [showInstructions, setShowInstructions] = useState(false);
  const [feedback, setFeedback] = useState(null);
  // Tempo multiplier: 1 = full speed, 0.75 = chill, 0.5 = practice. Slowing
  // the tempo stretches BEAT_MS proportionally for everything (demo,
  // count-in, expected times, visual playhead) so kids can scale the
  // challenge without losing the musical feel. We re-derive the local
  // `BEAT_MS` from the base import + multiplier so the rest of the
  // component's existing `BEAT_MS` math keeps working unchanged.
  const [tempoMul, setTempoMul] = useState(0.75);
  const BEAT_MS = Math.round(BASE_BEAT_MS / tempoMul);
  // Ref-backed mirror of BEAT_MS so the scheduleMetronome / pattern-audio /
  // visual-playhead useCallbacks read the LATEST tempo on every fire,
  // without us having to bust their identities (and re-bind every parent
  // callback that uses them) every time the dial changes.
  const beatMsRef = useRef(BEAT_MS);
  useEffect(() => { beatMsRef.current = BEAT_MS; }, [BEAT_MS]);
  // Per-tap feedback tier for the big PERFECT! / GREAT! / GOOD! / MISS!
  // popup mid-input. Mirrors Who's Got Rhythm so kids get instant feel for
  // how locked-in their tap was instead of waiting for the round summary.
  const [hitFeedback, setHitFeedback] = useState(null);
  const hitFeedbackTimerRef = useRef(null);
  // Floating "+25" score chips that drift up from Stew when a tap lands.
  // Same visual punch as Who's Got Rhythm's combo numbers.
  const [floatingScores, setFloatingScores] = useState([]); // [{ id, label, color }]
  const floatingScoreIdRef = useRef(0);
  // Streak burst: when the kid hits 3 / 5 / 7 / 10+ perfects-in-a-row,
  // a confetti volley fires from Stew's drum and a "🔥 N IN A ROW!" banner
  // pops in. Cleared automatically after the celebration plays.
  const [streakBurst, setStreakBurst] = useState(null); // { count, mega, key } | null
  const streakBurstTimerRef = useRef(null);
  // Stew physical reaction on a streak burst — quick scale-pop driven via
  // inline CSS scale. Together with the cymbal crash this makes the burst
  // feel like Stew himself caused the explosion.
  const [stewPop, setStewPop] = useState(false);
  const containerScalePopRef = useRef(null);
  // Per-PERFECT mini sparkle bursts — every perfect tap pops a small
  // confetti so perfects feel distinctly punchier than goods, even outside
  // streak milestones.
  const [perfectSparks, setPerfectSparks] = useState([]); // [{ id, key }]
  const perfectSparkIdRef = useRef(0);
  // Victory dance: when a round ends with EVERY non-rest beat scored,
  // Stew breaks into a 4-frame loop dance for ~3 s. Driven from
  // finishCopyRound when correct === total.
  const [victoryDance, setVictoryDance] = useState(false);
  const victoryDanceTimerRef = useRef(null);

  // Refs.
  const timeoutsRef = useRef([]);
  const inputStartRef = useRef(0);
  const expectedStartsRef = useRef([]);
  const patternRef = useRef(null);
  const claimedNotesRef = useRef(new Set());     // indices of notes a tap has been matched to
  const tapResultsRef = useRef({});               // index → 'perfect' | 'miss'
  // Every tap time (relative to inputStartRef) for the active round — used
  // at finishCopyRound to decide whether each REST beat was held cleanly
  // (no tap in its tolerance window = perfect rest) or violated (a tap
  // fell on the rest = no rest reward).
  const tapTimesRef = useRef([]);
  const snareRef = useRef(null);
  // Wall-clock Date.now() of beat-0 of the click track currently running.
  // Drives the BeatPulse visual metronome so it stays in lock-step with the
  // hi-hat without any drift.
  const [metronomeStartMs, setMetronomeStartMs] = useState(0);
  const [metronomeRunning, setMetronomeRunning] = useState(false);
  // ID of the LATEST setMetronomeRunning(false) timer. When a new metronome
  // session starts before the previous one's stop timer fires, the previous
  // timer would clobber the new session's running state — that's exactly
  // what happened when the demo's stop fired ~375 ms into the count-in,
  // killing the rest of the "4 → 3 → 2 → 1 → GO!" overlay. We now cancel
  // the previous stop timer whenever a new metronome session begins.
  const metronomeStopTimerRef = useRef(null);
  // Wall-clock moment the current round's count-in started. The big
  // CountInOverlay reads this to compute which step (4/3/2/1/GO!) to show.
  // We track it separately from `metronomeStartMs` so the overlay can stay
  // mounted ~600 ms INTO the input phase (long enough for "GO!" to bounce
  // out cleanly) without restarting when scheduleMetronome is re-called.
  const [countinStartMs, setCountinStartMs] = useState(0);
  const [showCountIn, setShowCountIn] = useState(false);
  // Round summary shown during reveal.
  const [roundSummary, setRoundSummary] = useState(null); // { correct, total }
  // Round counter — bumps every time a fresh round starts. Used as a React
  // `key` on the strip(s) so they fully remount between rounds (otherwise
  // the framer-motion <motion.div> stays parked at the previous round's
  // `endX` and the new pattern never scrolls into view — the Tap Trail
  // "one-and-done" bug the user reported).
  const [roundKey, setRoundKey] = useState(0);

  const clearTimeouts = useCallback(() => {
    timeoutsRef.current.forEach((t) => clearTimeout(t));
    timeoutsRef.current = [];
  }, []);

  useEffect(() => clearTimeouts, [clearTimeouts]);

  // Schedule a steady hi-hat click on every beat for `beatCount` beats,
  // starting at `startDelayMs` from now. Also flips on the visual BeatPulse
  // metronome so the kid can SEE the tempo in addition to hearing it.
  const scheduleMetronome = useCallback((beatCount, startDelayMs = 0) => {
    initAudioContext();
    const beatMs = beatMsRef.current;
    // Cancel the previous metronome session's stop timer — otherwise the
    // demo's stop (fired ~375 ms after a new count-in session began) would
    // flip metronomeRunning back to false mid-count-in and kill the
    // count-in overlay's number sequence.
    if (metronomeStopTimerRef.current) {
      clearTimeout(metronomeStopTimerRef.current);
      metronomeStopTimerRef.current = null;
    }
    const startWall = Date.now() + startDelayMs;
    setMetronomeStartMs(startWall);
    setMetronomeRunning(true);
    for (let b = 0; b < beatCount; b++) {
      const t = setTimeout(() => playDrumSound('hihat'), startDelayMs + b * beatMs);
      timeoutsRef.current.push(t);
    }
    // Stop the visual pulse a beat after the last audio click so the last
    // beat's flash doesn't get cut off.
    const stopT = setTimeout(() => {
      setMetronomeRunning(false);
      metronomeStopTimerRef.current = null;
    }, startDelayMs + (beatCount + 0.5) * beatMs);
    metronomeStopTimerRef.current = stopT;
    timeoutsRef.current.push(stopT);
    return beatCount * beatMs;
  }, [initAudioContext, playDrumSound]);

  // Schedule a snare hit (with visual flash) on each non-rest note of the
  // pattern, optionally highlighting the corresponding strip block.
  const schedulePatternAudio = useCallback((pat, opts = {}) => {
    const { withHighlight = true, startDelayMs = 0 } = opts;
    const starts = noteStartTimes(pat, beatMsRef.current);
    pat.forEach((key, i) => {
      const t = setTimeout(() => {
        if (withHighlight) setHighlightIndex(i);
        if (key !== 'rest') {
          playDrumSound('snare');
          // Flash the big snare drum if it's visible (Copy Cat / Tap Trail).
          snareRef.current?.flash(120);
        }
      }, startDelayMs + starts[i]);
      timeoutsRef.current.push(t);
    });
  }, [playDrumSound]);

  // Visual-only playhead — same setHighlightIndex schedule as the demo, but
  // no audio. Used during the kid's input phase so the strip block they're
  // SUPPOSED to be tapping is visibly highlighted in real time (matches the
  // demo highlight aesthetic). The kid can SEE where they are even if they
  // haven't tapped yet.
  const scheduleVisualPlayhead = useCallback((pat, startDelayMs = 0) => {
    const starts = noteStartTimes(pat, beatMsRef.current);
    pat.forEach((_, i) => {
      const t = setTimeout(() => setHighlightIndex(i), startDelayMs + starts[i]);
      timeoutsRef.current.push(t);
    });
  }, []);

  // ---- COPY CAT ----
  const finishCopyRound = useCallback(() => {
    clearTimeouts();
    const pat = patternRef.current || [];
    const results = tapResultsRef.current;
    const tol = TOLERANCE_MS[level] ?? TOLERANCE_MS.cadet;
    const expectedStarts = expectedStartsRef.current || [];
    const tapTimes = tapTimesRef.current || [];
    // Post-process REST beats: if no tap landed inside ±tol of the rest's
    // expected time, the kid held the rest cleanly — reward it as a
    // PERFECT. If a tap DID land on the rest, no reward (the rest is just
    // "missed"). User explicitly asked for this so that scores feel
    // consistent — every beat in a pattern, including silences, is worth
    // up to the PERFECT base (25 pts before multipliers).
    const PERFECT_BASE = 25;
    let restBonusPts = 0;
    let restsHeld = 0;
    pat.forEach((k, i) => {
      if (k !== 'rest') return;
      const restCenter = expectedStarts[i];
      if (restCenter === undefined) return;
      const tappedDuring = tapTimes.some((t) => Math.abs(t - restCenter) <= tol);
      if (!tappedDuring) {
        results[i] = 'perfect';
        // Apply the active multiplier exactly like a live PERFECT tap would
        // (so streaks reward you on rests too). Multiplier cap is 1.5,
        // matching the in-game x1.5 chip.
        const mult = streak >= 5 ? 1.5 : 1;
        restBonusPts += Math.round(PERFECT_BASE * mult);
        restsHeld += 1;
      }
      // If tapped during, results[i] stays undefined — strip shows neutral.
    });
    if (restBonusPts > 0) setScore((s) => s + restBonusPts);
    // Fire a "REST! +25" floating chip per held rest, staggered ~140 ms
    // apart so multiple rests in one pattern each get their own visible
    // pop. Inlined here (vs. calling popHitFeedback which is defined later
    // in the file and would cause a TDZ if referenced in this callback's
    // deps array).
    for (let r = 0; r < restsHeld; r++) {
      setTimeout(() => {
        const id = ++floatingScoreIdRef.current;
        setFloatingScores((prev) => [...prev, { id, label: 'REST! +25', color: '#9B6DE0' }]);
        setTimeout(() => {
          setFloatingScores((prev) => prev.filter((f) => f.id !== id));
        }, 1100);
      }, 80 + r * 140);
    }

    // hitStates now includes rests with their held/missed status so the
    // strip shows green tints over correctly-held rests too.
    const hits = pat.map((k, i) => {
      if (k === 'rest') {
        return results[i] === 'perfect' ? 'perfect' : undefined;
      }
      return results[i] || 'miss';
    });

    // Every beat — note OR rest — counts toward the round's "on time" tally
    // now that rests are scored. A pattern of 2 quarters + 2 rests = 4 beats,
    // and a kid who taps the quarters and holds the rests gets 4 of 4.
    const allIndices = pat.map((_, i) => i);
    const correct = allIndices.filter((i) => results[i] === 'perfect').length;
    const total = pat.length;
    sessionTallyRef.current.perfects += correct;
    sessionTallyRef.current.totalNotes += total;
    setHitStates(hits);
    setHighlightIndex(-1);
    setMetronomeRunning(false);
    setPhase('reveal');
    setRoundSummary({ correct, total });
    const allHit = correct >= Math.max(1, Math.ceil(total * 0.8));
    if (allHit) {
      setScore((s) => s + 100);
      setStreak((s) => s + 1);
      setShowCelebration(true);
      setTimeout(() => setShowCelebration(false), 2000);
      setFeedback({ tone: 'great', text: 'Nice rhythm!' });
      // Victory dance: every-beat-perfect → Stew cycles all 4 left frames
      // in tempo for ~3 s. Activates only on a TRULY clean round so kids
      // chase the difference between "good enough" and "nailed it".
      if (correct === total) {
        if (victoryDanceTimerRef.current) clearTimeout(victoryDanceTimerRef.current);
        setVictoryDance(true);
        // Fire snareRef.flash() every beat for 4 beats so Stew physically
        // swings his sticks L → R → L → R during the dance.
        for (let b = 0; b < 4; b++) {
          const t = setTimeout(() => snareRef.current?.flash(120), b * beatMsRef.current);
          timeoutsRef.current.push(t);
        }
        victoryDanceTimerRef.current = setTimeout(() => setVictoryDance(false), 3000);
      }
      try {
        earnAchievement('rhythm', 'cadet');
        if (level === 'pro')    earnAchievementUpTo('rhythm', 'pro');
        if (level === 'master') earnAchievementUpTo('rhythm', 'master');
      } catch (_) { /* ignore */ }
    } else {
      setStreak(0);
      setFeedback({ tone: 'miss', text: 'Almost! Try again.' });
    }
    // Auto-advance after a longer reveal so the kid actually sees the
    // result. The "Play Again" button in the round-summary card lets them
    // skip ahead if they want to move faster. After ROUNDS_PER_SESSION
    // rounds we flip to the Session Summary screen instead of restarting.
    const isLastRound = currentRound >= ROUNDS_PER_SESSION;
    const next = setTimeout(() => {
      setFeedback(null);
      setRoundSummary(null);
      if (isLastRound) {
        setSessionStats({
          perfects: sessionTallyRef.current.perfects,
          totalNotes: sessionTallyRef.current.totalNotes,
          score,
        });
        setSessionComplete(true);
        setPhase('idle');
        return;
      }
      setCurrentRound((r) => r + 1);
      if (mode === 'copy')  startCopy();
      if (mode === 'trail') startTrail();
    }, 3000);
    timeoutsRef.current.push(next);
  }, [clearTimeouts, level, mode, currentRound, score, streak]); // eslint-disable-line react-hooks/exhaustive-deps

  const startCopy = useCallback(() => {
    const pat = randomPattern(level, PATTERNS);
    setPattern(pat);
    patternRef.current = pat;
    setHitStates([]);
    setHighlightIndex(-1);
    tapResultsRef.current = {};
    claimedNotesRef.current = new Set();
    tapTimesRef.current = [];
    setRoundKey((k) => k + 1);
    setPhase('demo');
    initAudioContext();
    clearTimeouts();
    const totalBeats = patternBeats(pat);
    // Demo: click track + snare hits + visual playhead.
    scheduleMetronome(totalBeats, 0);
    schedulePatternAudio(pat, { withHighlight: true, startDelayMs: 0 });
    const demoMs = totalBeats * beatMsRef.current;
    // Count-in immediately follows the demo (no 600ms breath — that gap
    // had Stew disabled but no audio cue, so kids would anticipate "my turn
    // now" and tap into the void). 4 hi-hat ticks at beatMsRef.current spacing form
    // the count-in. Stew is tappable from the moment count-in starts.
    const countInMs = 4 * beatMsRef.current;
    const countIn = setTimeout(() => {
      setPhase('countin');
      setHighlightIndex(-1);
      // Count-in is BEEPS, not hi-hats — pure tones so the kid can tell
      // them apart from the gameplay click track that starts at input.
      // Beat 4 jumps a fifth higher ("ready, ready, ready, GO!").
      for (let b = 0; b < 4; b++) {
        const isLast = b === 3;
        const t = setTimeout(() => playCountInBeep(isLast), b * beatMsRef.current);
        timeoutsRef.current.push(t);
      }
      // Drive the visual count-in overlay timing via metronomeStartMs.
      setMetronomeStartMs(Date.now());
      setMetronomeRunning(true);
      const stopT = setTimeout(() => setMetronomeRunning(false), 4.5 * beatMsRef.current);
      timeoutsRef.current.push(stopT);
      if (metronomeStopTimerRef.current) clearTimeout(metronomeStopTimerRef.current);
      metronomeStopTimerRef.current = stopT;
      setCountinStartMs(Date.now());
      setShowCountIn(true);
      // OPEN THE TAP WINDOW NOW. inputStartRef + expectedStarts get pre-set
      // so an anticipatory tap on the last count-in beat (just BEFORE the
      // official 'input' phase) lands within tolerance of beat 1.
      inputStartRef.current = Date.now();
      expectedStartsRef.current = noteStartTimes(pat, beatMsRef.current).map((t) => t + countInMs);
    }, demoMs);
    timeoutsRef.current.push(countIn);
    // Input opens right after the count-in. inputStartRef / expectedStarts
    // already configured at count-in start — we only flip the phase here.
    const handoff = setTimeout(() => {
      setPhase('input');
      // Click continues UNDERNEATH the kid's tapping.
      scheduleMetronome(totalBeats, 0);
      // Visual playhead matches the click: each block lights up as its
      // beat plays, so the kid SEES where they should be tapping. The
      // claim-based highlight (handleSnareTap → setHighlightIndex on
      // successful tap) overrides this when the kid is on time.
      scheduleVisualPlayhead(pat, 0);
      // Keep the big count-in overlay mounted for an extra 600 ms so the
      // "GO!" badge has time to bounce in and fade out — otherwise the
      // overlay would unmount the same instant beat 1 is expected and the
      // kid would never actually SEE "GO!".
      const goHold = setTimeout(() => setShowCountIn(false), 600);
      timeoutsRef.current.push(goHold);
      const failsafe = setTimeout(finishCopyRound, totalBeats * beatMsRef.current + 1200);
      timeoutsRef.current.push(failsafe);
    }, demoMs + countInMs);
    timeoutsRef.current.push(handoff);
  }, [level, initAudioContext, clearTimeouts, scheduleMetronome, schedulePatternAudio, scheduleVisualPlayhead, finishCopyRound]);

  // Helper: pop a per-tap feedback popup (PERFECT! / GREAT! / GOOD! / MISS!)
  // and a floating score chip (+25 / +15 / +10) that drifts up. Both auto
  // clear themselves. Centralised so handleSnareTap and the auto-miss path
  // can both call it without duplicating timer logic.
  const popHitFeedback = useCallback((tier) => {
    setHitFeedback({ tier, key: Date.now() + Math.random() });
    if (hitFeedbackTimerRef.current) clearTimeout(hitFeedbackTimerRef.current);
    hitFeedbackTimerRef.current = setTimeout(() => setHitFeedback(null), 380);
    const chipMap = {
      perfect: { label: '+25', color: '#4CD964' },
      great:   { label: '+15', color: '#4285F4' },
      good:    { label: '+10', color: '#FFCC00' },
      miss:    { label: 'Miss', color: '#FF3B30' },
      // "REST!" chip — fired by finishCopyRound's rest post-processing
      // when a rest beat was held cleanly. Uses purple to visually distinguish
      // it from tap-earned chips so kids learn "purple = held a silence".
      rest:    { label: 'REST! +25', color: '#9B6DE0' },
    };
    const chip = chipMap[tier] || chipMap.good;
    const id = ++floatingScoreIdRef.current;
    setFloatingScores((prev) => [...prev, { id, label: chip.label, color: chip.color }]);
    setTimeout(() => {
      setFloatingScores((prev) => prev.filter((f) => f.id !== id));
    }, 900);
  }, []);

  // Unified tap handler used by both Copy Cat and Tap Trail. Forward-walking
  // sequential matching: a tap is scored against the FIRST unclaimed non-rest
  // note whose expected time is roughly "now or later" (current beat). Any
  // earlier unclaimed beats are auto-marked as MISS (the kid walked past
  // them). This is how a real teacher judges timing — you mark missed beats
  // and the next note is still the next note, regardless of which beat the
  // kid is on.
  //
  // NOTE: do NOT call `snareRef.current?.flash()` here. The kid tapping Stew
  // already triggers StewDrummer.handleDown → playHit, which animates him.
  // Calling flash() here too would double-tick the L/R alternation counter
  // and cause Stew to look like he's stuck on one side.
  //
  // We accept taps during 'countin' too (NOT only 'input') so that an
  // anticipatory tap during the last count-in beat — which is normal human
  // reaction-time behaviour against a click track — lands within tolerance
  // of beat 1 instead of being silently swallowed.
  const handleSnareTap = useCallback(() => {
    if (phase !== 'input' && phase !== 'countin') return;
    playDrumSound('snare');
    const tapTime = Date.now() - inputStartRef.current;
    // Log every tap, regardless of whether it ends up matched to a non-rest
    // note. finishCopyRound uses this list to decide whether each REST beat
    // was held cleanly (no tap landed in its window → perfect rest reward)
    // or accidentally tapped (tap fell on the rest → no reward).
    tapTimesRef.current.push(tapTime);
    const pat = patternRef.current || [];
    const expectedStarts = expectedStartsRef.current;
    const claimed = claimedNotesRef.current;
    const tol = TOLERANCE_MS[level] ?? TOLERANCE_MS.cadet;
    // Forward walk: scan unclaimed notes in order; auto-miss any whose
    // expected time has already passed by more than `tol`, then score this
    // tap against the first beat that's still "current or upcoming".
    let targetIdx = -1;
    let autoMissed = false;
    for (let i = 0; i < pat.length; i++) {
      if (pat[i] === 'rest' || claimed.has(i)) continue;
      if (expectedStarts[i] >= tapTime - tol) {
        targetIdx = i;
        break;
      }
      // Kid skipped past this beat.
      claimed.add(i);
      tapResultsRef.current[i] = 'miss';
      autoMissed = true;
    }
    if (targetIdx === -1) {
      // All notes have already passed — spurious tail tap. Ignore so we
      // don't double-claim or stutter the round.
      if (autoMissed) {
        popHitFeedback('miss');
        setStreak(0);
      }
      return;
    }
    const diff = Math.abs(tapTime - expectedStarts[targetIdx]);
    if (diff > tol) {
      // Tap is WAY ahead of the next note (very common during count-in or
      // a wildly anticipatory in-input tap). Do NOT claim the note — the kid
      // gets the audio + Stew animation feedback (already triggered above
      // via the kazoo path), and the note is still available for a proper
      // attempt within the tolerance window.
      return;
    }
    claimed.add(targetIdx);
    // Tier the tap by how close to the centre it landed. Mirrors Who's Got
    // Rhythm's instant feel — kids get a louder "PERFECT!" when they nail
    // the centre vs a softer "GOOD!" when they barely scrape the window.
    const tier = diff <= tol * 0.30 ? 'perfect'
              : diff <= tol * 0.60 ? 'great'
              : 'good';
    tapResultsRef.current[targetIdx] = tier === 'good' ? 'perfect' : tier; // round-summary still cares "on time"
    // Streak multiplier: 1× < 3 streak, 1.5× at 3-4, 2× at 5-6, 3× at 7+.
    // Computed BEFORE we bump the streak so the tap that LANDS the
    // threshold uses the previous tier (the multiplier kicks in on the
    // NEXT tap, so the bonus is earned, not handed out). Common pattern
    // in score-attack games.
    const baseDelta = tier === 'perfect' ? 25 : tier === 'great' ? 15 : 10;
    const mult = streak >= 7 ? 3 : streak >= 5 ? 2 : streak >= 3 ? 1.5 : 1;
    const scoreDelta = Math.round(baseDelta * mult);
    setScore((s) => s + scoreDelta);
    setStreak((prev) => {
      const next = prev + 1;
      // 🔥 streak celebration. 3/5/7 = standard fire; 10+ multiples of 5 = mega.
      const isMilestone = next === 3 || next === 5 || next === 7 || (next >= 10 && next % 5 === 0);
      if (isMilestone) {
        if (streakBurstTimerRef.current) clearTimeout(streakBurstTimerRef.current);
        setStreakBurst({ count: next, mega: next >= 7, key: Date.now() });
        streakBurstTimerRef.current = setTimeout(() => setStreakBurst(null), 1500);
        // Cymbal crash + Stew scale-pop on the milestone. Audible 50 ms
        // before the visual, which makes the burst feel physical
        // (audio leads visual is the cinematic trick).
        playDrumSound('crash');
        if (containerScalePopRef.current) clearTimeout(containerScalePopRef.current);
        setStewPop(true);
        containerScalePopRef.current = setTimeout(() => setStewPop(false), 220);
      }
      return next;
    });
    setHighlightIndex(targetIdx);
    popHitFeedback(tier);
    // Per-PERFECT sparkle burst — small confetti so PERFECT taps feel
    // distinctly punchier than goods even outside streak milestones.
    if (tier === 'perfect') {
      const id = ++perfectSparkIdRef.current;
      setPerfectSparks((prev) => [...prev, { id, key: Date.now() + id }]);
      setTimeout(() => setPerfectSparks((prev) => prev.filter((s) => s.id !== id)), 900);
    }
    const allNonRest = pat.map((k, i) => (k === 'rest' ? null : i)).filter((x) => x !== null);
    if (allNonRest.every((i) => claimed.has(i))) {
      const fin = setTimeout(finishCopyRound, 280);
      timeoutsRef.current.push(fin);
    }
  }, [phase, level, playDrumSound, finishCopyRound, popHitFeedback, streak]);

  // ---- TWIN BEATS ----
  const startMatch = useCallback(() => {
    const opts = threeDistinctPatterns(level);
    const answerIdx = Math.floor(Math.random() * opts.length);
    setMatchOptions(opts);
    setMatchAnswer(answerIdx);
    setHitStates([]);
    setHighlightIndex(-1);
    setRoundSummary(null);
    setRoundKey((k) => k + 1);
    setPhase('demo');
    initAudioContext();
    clearTimeouts();
    const pat = opts[answerIdx];
    const totalBeats = patternBeats(pat);
    // Click track + Stew animating along + snare hits (no visual highlight
    // on the strips themselves — kid uses ears).
    scheduleMetronome(totalBeats, 0);
    schedulePatternAudio(pat, { withHighlight: false, startDelayMs: 0 });
    const handoff = setTimeout(() => setPhase('input'), totalBeats * beatMsRef.current + 500);
    timeoutsRef.current.push(handoff);
  }, [level, initAudioContext, clearTimeouts, scheduleMetronome, schedulePatternAudio]);

  const handleMatchPick = useCallback((idx) => {
    if (phase !== 'input') return;
    playDrumSound('snare');
    const correct = idx === matchAnswer;
    setPhase('reveal');
    setRoundSummary({ correct: correct ? 1 : 0, total: 1 });
    sessionTallyRef.current.perfects += correct ? 1 : 0;
    sessionTallyRef.current.totalNotes += 1;
    if (correct) {
      setScore((s) => s + 100);
      setStreak((s) => s + 1);
      setShowCelebration(true);
      setTimeout(() => setShowCelebration(false), 1800);
      setFeedback({ tone: 'great', text: 'Sharp ears!' });
      try {
        earnAchievement('rhythm', 'cadet');
        if (level !== 'cadet') earnAchievementUpTo('rhythm', 'pro');
      } catch (_) { /* ignore */ }
    } else {
      setStreak(0);
      setFeedback({ tone: 'miss', text: `Not quite — option ${matchAnswer + 1} was right!` });
    }
    const isLastRound = currentRound >= ROUNDS_PER_SESSION;
    const next = setTimeout(() => {
      setFeedback(null);
      setRoundSummary(null);
      if (isLastRound) {
        setSessionStats({
          perfects: sessionTallyRef.current.perfects,
          totalNotes: sessionTallyRef.current.totalNotes,
          score: score + (correct ? 100 : 0),
        });
        setSessionComplete(true);
        setPhase('idle');
        return;
      }
      setCurrentRound((r) => r + 1);
      startMatch();
    }, 3000);
    timeoutsRef.current.push(next);
  }, [phase, playDrumSound, matchAnswer, level, startMatch, currentRound, score]);

  const replayMatch = useCallback(() => {
    if (phase !== 'input') return;
    initAudioContext();
    const pat = matchOptions[matchAnswer] || [];
    clearTimeouts();
    const totalBeats = patternBeats(pat);
    scheduleMetronome(totalBeats, 0);
    schedulePatternAudio(pat, { withHighlight: false, startDelayMs: 0 });
  }, [phase, matchOptions, matchAnswer, initAudioContext, clearTimeouts, scheduleMetronome, schedulePatternAudio]);

  // ---- TAP TRAIL ----
  // Scrolling multi-measure reader. The scrolling visual is handled by
  // <ScrollingRhythmStrip/>; here we just sync the click track + input
  // window so the strike line and the audio downbeat agree.
  const startTrail = useCallback(() => {
    const pat = randomPattern(level, TRAIL_PATTERNS);
    setPattern(pat);
    patternRef.current = pat;
    setHitStates([]);
    setHighlightIndex(-1);
    tapResultsRef.current = {};
    claimedNotesRef.current = new Set();
    tapTimesRef.current = [];
    setRoundKey((k) => k + 1);
    initAudioContext();
    clearTimeouts();
    const COUNT_IN_BEATS = 4;
    const countInMs = COUNT_IN_BEATS * beatMsRef.current;
    const totalBeats = patternBeats(pat);
    // Count-in: 4 BEEPS while strip scrolls TO the strike line. Distinct
    // tones (last beat a fifth higher) so kids can't miss when input opens.
    setPhase('countin');
    for (let b = 0; b < COUNT_IN_BEATS; b++) {
      const isLast = b === COUNT_IN_BEATS - 1;
      const t = setTimeout(() => playCountInBeep(isLast), b * beatMsRef.current);
      timeoutsRef.current.push(t);
    }
    setMetronomeStartMs(Date.now());
    setMetronomeRunning(true);
    const beepStop = setTimeout(() => setMetronomeRunning(false), (COUNT_IN_BEATS + 0.5) * beatMsRef.current);
    timeoutsRef.current.push(beepStop);
    if (metronomeStopTimerRef.current) clearTimeout(metronomeStopTimerRef.current);
    metronomeStopTimerRef.current = beepStop;
    setCountinStartMs(Date.now());
    setShowCountIn(true);
    // Open the tap window NOW so anticipatory taps on the last count-in beat
    // (before the strike line) land within tolerance of beat 1. Expected note
    // start times are shifted forward by the count-in length so beat 1's
    // wall-clock target is unchanged.
    inputStartRef.current = Date.now();
    expectedStartsRef.current = noteStartTimes(pat, beatMsRef.current).map((t) => t + countInMs);
    const trailStart = setTimeout(() => {
      setPhase('input');
      // (inputStartRef + expectedStarts already configured)
      scheduleMetronome(totalBeats, 0);
      // Tap Trail already has the scrolling visual reader. Adding the strip
      // highlight here mirrors the demo's playhead so even kids who lose
      // their place on the scroll can see the current beat called out.
      scheduleVisualPlayhead(pat, 0);
      // Hold the count-in overlay 600 ms into input so "GO!" can land.
      const goHold = setTimeout(() => setShowCountIn(false), 600);
      timeoutsRef.current.push(goHold);
      const fin = setTimeout(() => {
        setHighlightIndex(-1);
        finishCopyRound();
      }, totalBeats * beatMsRef.current + 600);
      timeoutsRef.current.push(fin);
    }, countInMs);
    timeoutsRef.current.push(trailStart);
  }, [level, initAudioContext, clearTimeouts, scheduleMetronome, scheduleVisualPlayhead, finishCopyRound]);

  // ---- LIFECYCLE ----
  const enterMode = useCallback((m) => {
    clearTimeouts();
    setMode(m);
    setScore(0);
    setStreak(0);
    setHitStates([]);
    setHighlightIndex(-1);
    setPhase('idle');
    setFeedback(null);
    setShowCountIn(false);
    setCurrentRound(1);
    setSessionComplete(false);
    setSessionStats(null);
    sessionTallyRef.current = { perfects: 0, totalNotes: 0 };
    // Show the How-to-Play overlay BEFORE the demo/count-in. The kid
    // dismisses with "Got it!" → round starts.
    setShowInstructions(true);
  }, [clearTimeouts]);

  // Start a fresh session of N rounds with the SAME mode / level / tempo.
  // Wired to the "Play another 5" button on the Session Summary card.
  const restartSession = useCallback(() => {
    clearTimeouts();
    setScore(0);
    setStreak(0);
    setCurrentRound(1);
    setSessionComplete(false);
    setSessionStats(null);
    sessionTallyRef.current = { perfects: 0, totalNotes: 0 };
    setFeedback(null);
    setRoundSummary(null);
    setShowCountIn(false);
    if (mode === 'copy')  startCopy();
    if (mode === 'match') startMatch();
    if (mode === 'trail') startTrail();
  }, [clearTimeouts, mode, startCopy, startMatch, startTrail]);

  const exitMode = useCallback(() => {
    clearTimeouts();
    setMode(null);
    setPhase('idle');
    setHighlightIndex(-1);
    setFeedback(null);
    setShowCountIn(false);
  }, [clearTimeouts]);

  const startCurrentRound = useCallback(() => {
    clearTimeouts();
    setHitStates([]);
    setHighlightIndex(-1);
    setFeedback(null);
    setShowCountIn(false);
    if (mode === 'copy')  startCopy();
    if (mode === 'match') startMatch();
    if (mode === 'trail') startTrail();
  }, [mode, startCopy, startMatch, startTrail, clearTimeouts]);

  useEffect(() => {
    if (!mode) return;
    // Hold the round start until the kid dismisses the How-to-Play card.
    // Without this gate, the demo + count-in would play UNDER the overlay
    // and the kid would miss the first round entirely.
    if (showInstructions) return;
    startCurrentRound();
  }, [mode, level, showInstructions]); // eslint-disable-line react-hooks/exhaustive-deps

  // ----- TAP-ANYWHERE / KEYBOARD SUPPORT -----
  // Boom Garden's Stew button is small relative to the screen and the kid's
  // attention bounces between the strip, the count-in row, and Stew. Easy to
  // misclick. So during input/countin in Copy Cat or Tap Trail, we treat
  // pointerdown ANYWHERE on the page as a Stew tap (excluding actual buttons
  // — back nav, level picker, summary buttons — and Stew himself, who has
  // his own handler). The Spacebar also triggers a tap. Both feel huge on
  // touch screens too: the kid can just slap the field.
  //
  // SPACEBAR HOLD (Feb 2026): browsers auto-repeat keydown when a key is
  // held, which would fire a stream of `handleSnareTap` calls and drown the
  // kid in false snare hits. We guard with `e.repeat` so ONE press = ONE
  // tap. We also track a `spaceHeld` visual so kids who instinctively hold
  // through a longer note (half/whole) get a soft glow acknowledging the
  // sustain — but scoring is unchanged so they aren't punished if they
  // don't hold "long enough".
  const [spaceHeld, setSpaceHeld] = useState(false);
  useEffect(() => {
    if (mode === 'match') return undefined; // Twin Beats picks strips, not Stew
    if (phase !== 'input' && phase !== 'countin') return undefined;

    const triggerStewTap = () => {
      // Animate Stew + play snare via the same imperative handle the demo uses.
      snareRef.current?.flash(120);
      handleSnareTap();
    };

    const handleAnywhereDown = (e) => {
      const t = e.target;
      // Stew himself fires his own onPointerDown — don't double-fire here.
      if (t.closest && t.closest('[data-testid="boom-stew-drummer"]')) return;
      // Real interactive controls (back to modes, level picker, summary's
      // "play another", replay, mode tabs, etc.) should keep working as
      // they do. Treat anything else as a Stew tap.
      if (t.closest && t.closest('button, a, input, select, textarea, [role="button"]')) return;
      triggerStewTap();
    };

    const handleKeyDown = (e) => {
      // Spacebar / Enter as alt input. Don't preempt typing in inputs.
      if (e.target && e.target.tagName &&
          ['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;
      if (e.code === 'Space' || e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        // AUTO-REPEAT GUARD: without this, holding Space would fire a
        // torrent of taps. One press → one tap, always.
        if (e.repeat) return;
        triggerStewTap();
        if (e.code === 'Space' || e.key === ' ') setSpaceHeld(true);
      }
    };

    const handleKeyUp = (e) => {
      if (e.code === 'Space' || e.key === ' ') setSpaceHeld(false);
    };

    document.addEventListener('pointerdown', handleAnywhereDown);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    return () => {
      document.removeEventListener('pointerdown', handleAnywhereDown);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
      setSpaceHeld(false);
    };
  }, [mode, phase, handleSnareTap]);

  // ---- RENDER ----

  const modeConfig = useMemo(() => (mode ? MODE_MAP[mode] : null), [mode]);

  // Mode picker.
  if (!mode) {
    return (
      <div
        data-testid="boom-garden-page"
        className="min-h-screen flex flex-col relative"
        style={{
          backgroundImage: 'url(assets/backgrounds/football-field.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        {/* Sky tint at the top of the football-field bg so the header
            reads clearly regardless of scene contrast. */}
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 pointer-events-none"
          style={{
            height: '30%',
            background: 'linear-gradient(180deg, rgba(255,247,229,0.75) 0%, transparent 100%)',
          }}
        />
        <GameHeader showHomeButton={true} />
        <FullscreenButton />
        <main className="flex-1 pt-20 md:pt-24 lg:pt-32 pb-6 px-3 md:px-6 max-w-6xl mx-auto w-full flex flex-col relative z-10">
          <div className="text-center mb-4 md:mb-6">
            <h1
              className="font-black font-display leading-none uppercase block"
              style={{
                fontSize: 'clamp(30px, 5.5vw, 56px)',
                color: 'white',
                WebkitTextStroke: 'clamp(2px, 0.45vw, 4px) var(--jma-dark)',
                paintOrder: 'stroke fill',
                textShadow:
                  '3px 3px 0 var(--jma-dark), 6px 6px 20px rgba(10,37,64,0.35)',
                letterSpacing: '0.02em',
              }}
            >
              Who&apos;s Got the Rhythm
            </h1>
            <p
              className="text-sm md:text-base font-black uppercase tracking-widest mt-2 inline-block px-3 py-1 rounded-full"
              style={{
                color: 'white',
                backgroundColor: 'var(--jma-dark)',
                border: '2px solid #FFCC00',
                boxShadow: '0 3px 0 0 rgba(0,0,0,0.35)',
              }}
            >
              Pick your jam
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5 flex-1">
            {MODES.map((m, i) => (
              <ModeTile key={m.id} mode={m} index={i} onPick={enterMode} />
            ))}
          </div>
          {/* Difficulty selector */}
          <div className="mt-5 md:mt-7">
            <div className="text-center text-[10px] md:text-xs uppercase font-black opacity-60 mb-2" style={{ color: 'var(--jma-dark)' }}>
              Difficulty
            </div>
            <div className="flex justify-center gap-2 md:gap-3 flex-wrap">
              {DIFFICULTIES.map((d) => (
                <button
                  key={d.id}
                  data-testid={`boom-level-${d.id}`}
                  type="button"
                  onClick={() => setLevel(d.id)}
                  className="rounded-2xl border-3 px-3 md:px-4 py-2 font-black font-display text-sm md:text-base"
                  style={{
                    backgroundColor: level === d.id ? d.color : 'white',
                    color: level === d.id ? 'white' : 'var(--jma-dark)',
                    borderColor: 'var(--jma-dark)',
                    boxShadow: level === d.id ? '0 4px 0 0 var(--jma-dark)' : '0 2px 0 0 var(--jma-dark)',
                    transform: level === d.id ? 'translateY(-2px)' : 'none',
                    transition: 'transform 0.15s, background-color 0.15s, box-shadow 0.15s',
                  }}
                >
                  {d.label}
                  <div className="text-[9px] md:text-[10px] font-bold opacity-80 mt-0.5">{d.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Tempo dial — Easy (slow) / Medium / Turbo (fast). Stretches the
              underlying BEAT_MS so the entire experience (demo, click
              track, expected timings, visual playhead) scales together.
              Lets struggling 5-year-olds slow it down without changing the
              musical idea, and lets show-offs crank it up to Turbo. */}
          <div className="mt-4 md:mt-5">
            <div className="text-center text-[10px] md:text-xs uppercase font-black opacity-60 mb-2" style={{ color: 'var(--jma-dark)' }}>
              Tempo
            </div>
            <div className="flex justify-center gap-2 md:gap-3 flex-wrap">
              {TEMPOS.map((t) => (
                <button
                  key={t.id}
                  data-testid={`boom-tempo-${t.label.toLowerCase()}`}
                  type="button"
                  onClick={() => setTempoMul(t.id)}
                  className="rounded-2xl border-3 px-3 md:px-4 py-2 font-black font-display text-sm md:text-base"
                  style={{
                    backgroundColor: tempoMul === t.id ? t.color : 'white',
                    color: tempoMul === t.id ? 'white' : 'var(--jma-dark)',
                    borderColor: 'var(--jma-dark)',
                    boxShadow: tempoMul === t.id ? '0 4px 0 0 var(--jma-dark)' : '0 2px 0 0 var(--jma-dark)',
                    transform: tempoMul === t.id ? 'translateY(-2px)' : 'none',
                    transition: 'transform 0.15s, background-color 0.15s, box-shadow 0.15s',
                  }}
                >
                  {t.label}
                  <div className="text-[9px] md:text-[10px] font-bold opacity-80 mt-0.5">{t.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Session-length blurb — sets expectations so the kid knows the
              session has a defined end. */}
          <div className="text-center mt-3 text-[10px] md:text-xs font-bold opacity-70" style={{ color: 'var(--jma-dark)' }}>
            {ROUNDS_PER_SESSION} rounds per session — beat your high score!
          </div>
        </main>
      </div>
    );
  }

  // Play screen.
  return (
    <div
      data-testid={`boom-mode-page-${mode}`}
      className="min-h-screen flex flex-col relative"
      style={{
        backgroundImage: 'url(assets/backgrounds/football-field.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      }}
    >
      {/* Soft tint over the football field so foreground UI stays legible. */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `linear-gradient(180deg, ${modeConfig.color}22 0%, rgba(255,255,255,0.55) 60%, ${modeConfig.color}33 100%)`,
        }}
      />
      <div className="relative z-10 flex flex-col flex-1">
      <GameHeader title="Who's Got the Rhythm" subtitle={modeConfig.label} showHomeButton={true} score={score} streak={streak} />
      <FullscreenButton />
      <main className="flex-1 pt-20 md:pt-24 pb-4 px-3 md:px-6 max-w-4xl mx-auto w-full flex flex-col">
        {/* Back + level row */}
        <div className="flex items-center justify-between mb-3 md:mb-4">
          <button
            data-testid="boom-back-modes"
            type="button"
            onClick={exitMode}
            className="rounded-full border-3 px-3 py-1.5 flex items-center gap-1.5 bg-white text-sm font-black font-display"
            style={{ borderColor: 'var(--jma-dark)', color: 'var(--jma-dark)' }}
          >
            <ArrowLeft className="w-4 h-4" /> Modes
          </button>
          <div className="flex items-center gap-2">
            <span className="text-[10px] md:text-xs uppercase font-black opacity-60" style={{ color: 'var(--jma-dark)' }}>
              Level
            </span>
            {DIFFICULTIES.map((d) => (
              <button
                key={d.id}
                data-testid={`boom-play-level-${d.id}`}
                type="button"
                onClick={() => setLevel(d.id)}
                className="rounded-full border-2 px-2.5 py-1 text-xs font-black font-display"
                style={{
                  backgroundColor: level === d.id ? d.color : 'white',
                  color: level === d.id ? 'white' : 'var(--jma-dark)',
                  borderColor: 'var(--jma-dark)',
                }}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        {/* Phase banner + round counter */}
        <div className="text-center mb-3 md:mb-4 flex items-center justify-center gap-2 md:gap-3 flex-wrap">
          <div
            data-testid="boom-round-counter"
            className="inline-block rounded-full border-3 px-3 py-1.5 font-black font-display text-xs md:text-sm"
            style={{
              borderColor: 'var(--jma-dark)',
              backgroundColor: modeConfig?.color || 'white',
              color: 'white',
              boxShadow: '0 3px 0 0 var(--jma-dark)',
            }}
          >
            Round {Math.min(currentRound, ROUNDS_PER_SESSION)} / {ROUNDS_PER_SESSION}
          </div>
          <div
            className="inline-block rounded-full border-3 px-4 py-1.5 font-black font-display text-sm md:text-base"
            style={{
              borderColor: 'var(--jma-dark)',
              backgroundColor: 'white',
              color: 'var(--jma-dark)',
              boxShadow: '0 3px 0 0 var(--jma-dark)',
            }}
            data-testid="boom-phase-banner"
          >
            {mode === 'copy'  && phase === 'demo'    && 'Listen carefully...'}
            {mode === 'copy'  && phase === 'countin' && 'Count in... 1 · 2 · 3 · 4'}
            {mode === 'copy'  && phase === 'input'   && 'Your turn — play it on the snare!'}
            {mode === 'copy'  && phase === 'reveal'  && 'Round complete'}
            {mode === 'match' && phase === 'demo'    && 'Listen to this rhythm...'}
            {mode === 'match' && phase === 'input'   && 'Pick the strip that matches'}
            {mode === 'match' && phase === 'reveal'  && 'Round complete'}
            {mode === 'trail' && phase === 'countin' && 'Count in... 1 · 2 · 3 · 4'}
            {mode === 'trail' && phase === 'input'   && 'Read & play as each note hits the line'}
            {mode === 'trail' && phase === 'reveal'  && 'Round complete'}
          </div>
        </div>

        {/* Strip(s) */}
        <div className="flex flex-col items-stretch justify-center gap-3 md:gap-4 mb-4">
          {mode === 'copy' && pattern && (
            <RhythmStrip
              key={`copy-${roundKey}`}
              pattern={pattern}
              highlightIndex={highlightIndex}
              hitStates={hitStates}
              height={120}
            />
          )}
          {mode === 'trail' && pattern && (
            <ScrollingRhythmStrip
              key={`trail-${roundKey}`}
              pattern={pattern}
              kickOff={phase === 'countin' || phase === 'input' || phase === 'reveal'}
              height={170}
              beatMs={BEAT_MS}
            />
          )}
          {mode === 'match' && matchOptions.length === 3 && (
            <>
              <div className="flex items-center justify-center gap-2 mb-1">
                <Volume2 className="w-4 h-4" style={{ color: 'var(--jma-dark)' }} />
                <span className="text-xs md:text-sm font-bold" style={{ color: 'var(--jma-dark)' }}>
                  {phase === 'demo' ? 'Listening...' : 'Tap the strip that matches what you heard'}
                </span>
                <button
                  data-testid="boom-match-replay"
                  type="button"
                  onClick={replayMatch}
                  disabled={phase !== 'input'}
                  className="ml-2 rounded-full border-2 px-2.5 py-0.5 text-[11px] font-black font-display flex items-center gap-1 disabled:opacity-40"
                  style={{ borderColor: 'var(--jma-dark)', color: 'var(--jma-dark)', backgroundColor: 'white' }}
                >
                  <RotateCcw className="w-3 h-3" /> Replay
                </button>
              </div>
              {matchOptions.map((p, idx) => (
                <RhythmStrip
                  key={idx}
                  pattern={p}
                  highlightIndex={-1}
                  hitStates={
                    phase === 'reveal'
                      ? p.map(() => (idx === matchAnswer ? 'perfect' : undefined))
                      : null
                  }
                  height={80}
                  testIdPrefix={`match-${idx}-block`}
                  onBlockTap={phase === 'input' ? () => handleMatchPick(idx) : null}
                />
              ))}
            </>
          )}
        </div>

        {/* Visual metronome — bright dot pulses on each beat so kids can SEE
            the tempo, not just hear the click underneath. Active during
            count-in, demo, AND the kid's input window. */}
        {(phase === 'countin' || phase === 'demo' || phase === 'input') && (
          <div className="flex justify-center mb-2">
            <BeatPulse
              running={metronomeRunning}
              startAtMs={metronomeStartMs}
              beatsPerMeasure={4}
              size={18}
              beatMs={BEAT_MS}
            />
          </div>
        )}

        {/* Musical count-in: a row of 4 numbered tiles that light up
            "1 → 2 → 3 → 4" on each click track beat. Lives BELOW the
            rhythm strip so it never covers what the kid has to tap. The
            cool-blue → green → orange → red color sweep is the visual
            "heat building" toward beat 1 of their playing window.
            Wrapped in a min-height container so the row's space is reserved
            even when not visible — otherwise Stew would jump up into the
            empty space the instant input begins, and the kid's intended
            Stew tap would miss. */}
        <div
          className="flex items-center justify-center"
          style={{ minHeight: 'clamp(80px, 14vw, 120px)' }}
        >
          {showCountIn && (
            <CountInOverlay running={true} startAtMs={countinStartMs} beatMs={BEAT_MS} />
          )}
        </div>

        {/* Stew the llama — performs every drum hit (demo + kid's input).
            On Twin Beats he animates during the demo (and stays disabled in
            input since the kid picks a strip, not plays the snare).
            `mt-auto` pushes him down to the bottom of the flex column so
            his feet rest on the football field background instead of
            floating mid-air. */}
        <div
          className="flex justify-center items-end mt-auto pt-4 relative"
          style={{ paddingBottom: 'clamp(48px, 8vw, 96px)' }}
        >
          {/* Multiplier badge — shows live x1.5/x2/x3 over Stew's left
              shoulder when streak ≥ 3. Reinforces the "your streak is
              earning you more" feedback loop. */}
          <AnimatePresence>
            {streak >= 3 && (
              <motion.div
                key={`mult-${streak >= 7 ? '3' : streak >= 5 ? '2' : '1.5'}`}
                data-testid="streak-multiplier"
                initial={{ scale: 0.5, opacity: 0, y: 10 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.5, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 480, damping: 16 }}
                className="absolute rounded-2xl border-3 px-3 py-1 font-black font-display"
                style={{
                  bottom: 'calc(100% + 4px)',
                  left: 'calc(50% - 130px)',
                  background: streak >= 7
                    ? 'linear-gradient(135deg,#FF3B30,#FF9500)'
                    : streak >= 5
                    ? 'linear-gradient(135deg,#FF9500,#FFCC00)'
                    : 'linear-gradient(135deg,#34A853,#4CD964)',
                  borderColor: 'var(--jma-dark)',
                  color: 'white',
                  fontSize: 'clamp(20px, 3vw, 28px)',
                  boxShadow: '0 5px 0 0 var(--jma-dark)',
                  zIndex: 64,
                }}
              >
                ×{streak >= 7 ? '3' : streak >= 5 ? '2' : '1.5'}
              </motion.div>
            )}
          </AnimatePresence>
          {/* Streak arc — 3 chips above Stew that light up one-by-one
              as the kid lands consecutive perfects. Visual goal kids chase. */}
          <div
            data-testid="streak-arc"
            className="absolute flex gap-2 pointer-events-none"
            style={{ bottom: 'calc(100% + 6px)', left: '50%', transform: 'translateX(-50%)', zIndex: 60 }}
          >
            {[0, 1, 2].map((i) => {
              const lit = (streak % 3) > i || (streak >= 3 && i < 3 && streak % 3 === 0);
              // Once any milestone (3,5,7,10..) is reached, the arc is fully lit during the burst.
              const fullyLit = !!streakBurst;
              const on = fullyLit || lit;
              return (
                <motion.div
                  key={i}
                  animate={{ scale: on ? 1.05 : 1 }}
                  transition={{ type: 'spring', stiffness: 520, damping: 18 }}
                  className="rounded-full border-3"
                  style={{
                    width: 18, height: 18,
                    borderColor: 'var(--jma-dark)',
                    backgroundColor: on ? '#FF3B30' : 'rgba(255,255,255,0.45)',
                    boxShadow: on ? '0 0 14px rgba(255,59,48,0.7)' : 'none',
                  }}
                />
              );
            })}
          </div>
          {/* Per-PERFECT sparkle burst — small confetti */}
          {perfectSparks.map((s) => (
            <div
              key={s.key}
              className="pointer-events-none absolute inset-0 flex items-center justify-center"
            >
              <Confetti count={14} size={180} testId={`perfect-sparkle-${s.id}`} />
            </div>
          ))}
          {/* Confetti burst from Stew's drum on a streak milestone. Mega
              variant (more pieces + wider spread) at streaks of 7+. */}
          {streakBurst && (
            <div
              key={streakBurst.key}
              className="pointer-events-none absolute inset-0 flex items-center justify-center"
              data-testid="streak-confetti-wrap"
            >
              <Confetti
                count={streakBurst.mega ? 60 : 36}
                size={streakBurst.mega ? 380 : 280}
                mega={streakBurst.mega}
                testId="streak-confetti"
              />
            </div>
          )}
          {/* "🔥 N IN A ROW!" banner that pops in above Stew, lifts up
              with the confetti, then fades. Different gradient at 7+ so
              kids feel the rarity. */}
          <AnimatePresence>
            {streakBurst && (
              <motion.div
                key={streakBurst.key}
                data-testid="streak-banner"
                initial={{ scale: 0.4, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: -10 }}
                exit={{ scale: 1.2, opacity: 0, y: -60 }}
                transition={{ type: 'spring', stiffness: 480, damping: 16 }}
                className="absolute rounded-2xl border-4 px-5 py-2 font-black font-display whitespace-nowrap"
                style={{
                  bottom: 'calc(100% - 40px)',
                  background: streakBurst.mega
                    ? 'linear-gradient(135deg, #FF3B30 0%, #FF9500 50%, #FFCC00 100%)'
                    : 'linear-gradient(135deg, #FF9500 0%, #FFCC00 100%)',
                  borderColor: 'var(--jma-dark)',
                  color: 'white',
                  fontSize: 'clamp(22px, 4vw, 36px)',
                  boxShadow: '0 8px 0 0 var(--jma-dark), 0 16px 28px rgba(0,0,0,0.32)',
                  zIndex: 65,
                }}
              >
                🔥 {streakBurst.count} IN A ROW!
              </motion.div>
            )}
          </AnimatePresence>
          {/* Floating "+25 / +15 / +10 / Miss" chips that drift up from
              Stew on every scored tap — same instant-feedback vibe as
              Who's Got Rhythm's combo chips. */}
          <AnimatePresence>
            {floatingScores.map((f) => (
              <motion.div
                key={f.id}
                data-testid={`floating-score-${f.id}`}
                initial={{ y: 10, opacity: 0, scale: 0.8 }}
                animate={{ y: -90, opacity: 1, scale: 1 }}
                exit={{ y: -160, opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.85, ease: 'easeOut' }}
                className="absolute bottom-1/2 rounded-2xl border-3 px-3 py-1 font-black font-display text-xl md:text-2xl pointer-events-none"
                style={{
                  backgroundColor: f.color,
                  color: f.color === '#FFCC00' ? 'var(--jma-dark)' : 'white',
                  borderColor: 'var(--jma-dark)',
                  boxShadow: '0 4px 0 0 var(--jma-dark)',
                  textShadow: f.color === '#FFCC00' ? 'none' : '2px 2px 0 rgba(10,37,64,0.45)',
                }}
              >
                {f.label}
              </motion.div>
            ))}
          </AnimatePresence>
          <motion.div
            data-testid="stew-pop-wrap"
            className="relative"
            animate={{ scale: stewPop ? 1.15 : victoryDance ? 1.06 : 1 }}
            transition={{ type: 'spring', stiffness: 480, damping: 14 }}
          >
            {/* Sustain-glow ring: appears while the Spacebar is held.
                Purely cosmetic — scoring is unchanged. Gives kids
                sustaining a longer note (half/whole) a visible "I hear
                you holding it" reward without punishing kids who don't. */}
            <AnimatePresence>
              {spaceHeld && (phase === 'input' || phase === 'countin') && (
                <motion.div
                  key="sustain-ring"
                  data-testid="boom-sustain-ring"
                  initial={{ scale: 0.85, opacity: 0 }}
                  animate={{ scale: [1, 1.08, 1], opacity: 0.9 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  transition={{ scale: { duration: 0.9, repeat: Infinity, ease: 'easeInOut' }, opacity: { duration: 0.18 } }}
                  className="absolute inset-0 pointer-events-none rounded-full"
                  style={{
                    boxShadow: '0 0 0 6px rgba(155, 109, 224, 0.55), 0 0 42px 14px rgba(155, 109, 224, 0.55)',
                    zIndex: 1,
                  }}
                />
              )}
            </AnimatePresence>
            <StewDrummer
              ref={snareRef}
              onTap={handleSnareTap}
              disabled={mode === 'match'}
              hint={
                mode === 'match' && phase === 'demo'    ? 'Listen...' :
                mode === 'match' && phase === 'input'   ? 'Pick a strip ↑' :
                mode === 'match' && phase === 'reveal'  ? 'Round complete' :
                phase === 'input'   ? 'TAP STEW!' :
                phase === 'countin' ? 'Get ready...' :
                phase === 'demo'    ? 'Listening...' :
                victoryDance ? '✨ Encore!' :
                'Round complete'
              }
            />
          </motion.div>
        </div>

        {/* Per-tap PERFECT! / GREAT! / GOOD! / MISS! popup — center of
            screen, lifts from `hitFeedback` state set inside handleSnareTap.
            Same component used by Who's Got Rhythm so the visual language
            is consistent across games. */}
        <AnimatePresence>
          {hitFeedback && (
            <FeedbackPopup
              key={hitFeedback.key}
              feedback={hitFeedback.tier}
              onComplete={() => { /* timer-based clear handles this */ }}
            />
          )}
        </AnimatePresence>

        {/* Round-summary card during reveal — actually CELEBRATES the result
            instead of silently restarting. */}
        <AnimatePresence>
          {phase === 'reveal' && roundSummary && (
            <motion.div
              key="round-summary"
              data-testid="boom-round-summary"
              initial={{ y: 30, opacity: 0, scale: 0.92 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: -10, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 22 }}
              className="fixed left-1/2 -translate-x-1/2 top-24 md:top-28 z-30 rounded-3xl border-4 px-5 py-3 md:px-7 md:py-4 flex flex-col items-center gap-1.5 max-w-[92%]"
              style={{
                borderColor: 'var(--jma-dark)',
                backgroundColor: roundSummary.correct >= Math.ceil(roundSummary.total * 0.8) ? '#34A853' : '#FFCC00',
                color: roundSummary.correct >= Math.ceil(roundSummary.total * 0.8) ? 'white' : 'var(--jma-dark)',
                boxShadow: '0 8px 0 0 var(--jma-dark)',
              }}
            >
              <div className="text-xs md:text-sm uppercase font-black tracking-widest opacity-80">
                Round complete
              </div>
              <div className="text-2xl md:text-3xl font-black font-display leading-none">
                {roundSummary.correct} of {roundSummary.total} on time!
              </div>
              <button
                data-testid="boom-play-again"
                type="button"
                onClick={() => {
                  clearTimeouts();
                  setFeedback(null);
                  setRoundSummary(null);
                  // Manual skip-ahead — same session-end logic the auto
                  // timer uses so the round counter and Session Summary
                  // stay consistent whether the kid waits or taps next.
                  if (currentRound >= ROUNDS_PER_SESSION) {
                    setSessionStats({
                      perfects: sessionTallyRef.current.perfects,
                      totalNotes: sessionTallyRef.current.totalNotes,
                      score,
                    });
                    setSessionComplete(true);
                    setPhase('idle');
                    return;
                  }
                  setCurrentRound((r) => r + 1);
                  if (mode === 'copy')  startCopy();
                  if (mode === 'trail') startTrail();
                  if (mode === 'match') startMatch();
                }}
                className="mt-1 rounded-full border-3 bg-white px-4 py-1 font-black font-display text-sm"
                style={{ borderColor: 'var(--jma-dark)', color: 'var(--jma-dark)', boxShadow: '0 3px 0 0 var(--jma-dark)' }}
              >
                {currentRound >= ROUNDS_PER_SESSION ? 'See session score →' : 'Play another →'}
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Session Summary — pops after ROUNDS_PER_SESSION rounds with the
            total score, accuracy %, and a "Play another 5" button. Modal
            backdrop so nothing else is tappable until the kid picks an
            action. Kids respond well to a celebratory finish line. */}
        <AnimatePresence>
          {sessionComplete && sessionStats && (
            <motion.div
              key="session-summary-backdrop"
              data-testid="boom-session-summary"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center px-4"
              style={{ backgroundColor: 'rgba(10,37,64,0.55)' }}
            >
              <motion.div
                key="session-summary-card"
                initial={{ y: 40, opacity: 0, scale: 0.85 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: -20, opacity: 0, scale: 0.9 }}
                transition={{ type: 'spring', stiffness: 240, damping: 20 }}
                className="rounded-3xl border-4 px-6 py-5 md:px-8 md:py-6 flex flex-col items-center gap-3 max-w-sm w-full bg-white"
                style={{
                  borderColor: 'var(--jma-dark)',
                  boxShadow: '0 10px 0 0 var(--jma-dark)',
                  color: 'var(--jma-dark)',
                }}
              >
                <div className="text-xs uppercase font-black tracking-widest opacity-70">
                  Session Complete!
                </div>
                <div className="text-3xl md:text-4xl font-black font-display leading-none text-center">
                  {ROUNDS_PER_SESSION} rounds done
                </div>
                <div className="flex items-center gap-3 mt-1">
                  <div className="flex flex-col items-center">
                    <span className="text-[10px] uppercase font-black opacity-60">Score</span>
                    <span data-testid="session-final-score" className="text-2xl font-black font-display">{sessionStats.score}</span>
                  </div>
                  <div className="w-px h-8" style={{ backgroundColor: 'var(--jma-dark)', opacity: 0.3 }} />
                  <div className="flex flex-col items-center">
                    <span className="text-[10px] uppercase font-black opacity-60">On Time</span>
                    <span className="text-2xl font-black font-display">
                      {sessionStats.totalNotes > 0
                        ? Math.round((sessionStats.perfects / sessionStats.totalNotes) * 100)
                        : 0}%
                    </span>
                  </div>
                </div>
                <div className="flex flex-col gap-2 w-full mt-2">
                  <button
                    data-testid="boom-session-restart"
                    type="button"
                    onClick={restartSession}
                    className="rounded-full border-3 px-5 py-2 font-black font-display text-base"
                    style={{
                      borderColor: 'var(--jma-dark)',
                      backgroundColor: modeConfig?.color || '#34A853',
                      color: 'white',
                      boxShadow: '0 4px 0 0 var(--jma-dark)',
                    }}
                  >
                    Play another {ROUNDS_PER_SESSION} →
                  </button>
                  <button
                    data-testid="boom-session-modes"
                    type="button"
                    onClick={exitMode}
                    className="rounded-full border-3 bg-white px-5 py-2 font-black font-display text-sm"
                    style={{
                      borderColor: 'var(--jma-dark)',
                      color: 'var(--jma-dark)',
                      boxShadow: '0 3px 0 0 var(--jma-dark)',
                    }}
                  >
                    Back to modes
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* How-to-Play overlay — first thing a kid sees when they enter a
            mode. Big character, three numbered steps, and a "Got it, let's
            go!" CTA. Designed for elementary readers: short sentences,
            chunky emoji bullets, and the mode color as the background so
            the kid stays grounded in WHICH game they're about to play. */}
        <AnimatePresence>
          {showInstructions && modeConfig && (
            <motion.div
              key="how-to-play-backdrop"
              data-testid="boom-how-to-play"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center px-4"
              style={{ backgroundColor: 'rgba(10,37,64,0.65)' }}
            >
              <motion.div
                initial={{ y: 40, opacity: 0, scale: 0.9 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: -20, opacity: 0, scale: 0.9 }}
                transition={{ type: 'spring', stiffness: 240, damping: 20 }}
                className="rounded-3xl border-4 px-6 py-5 md:px-8 md:py-7 flex flex-col items-center gap-4 max-w-md w-full bg-white"
                style={{
                  borderColor: 'var(--jma-dark)',
                  boxShadow: '0 10px 0 0 var(--jma-dark)',
                  color: 'var(--jma-dark)',
                }}
              >
                {/* Mode header chip + character */}
                <div
                  className="rounded-full border-3 px-4 py-1 font-black font-display text-xs uppercase tracking-widest"
                  style={{
                    backgroundColor: modeConfig.color,
                    color: 'white',
                    borderColor: 'var(--jma-dark)',
                    boxShadow: '0 3px 0 0 var(--jma-dark)',
                  }}
                >
                  How to play
                </div>
                <h2 className="text-3xl md:text-4xl font-black font-display leading-none text-center">
                  {modeConfig.label}
                </h2>
                {modeConfig.character && (
                  <img
                    src={modeConfig.character}
                    alt=""
                    draggable={false}
                    className="object-contain pointer-events-none select-none"
                    style={{ maxHeight: 130, filter: 'drop-shadow(0 4px 0 rgba(10,37,64,0.25))' }}
                  />
                )}

                {/* Three numbered steps */}
                <ol className="w-full flex flex-col gap-2">
                  {(modeConfig.howToPlay || []).map((step, i) => (
                    <li
                      key={i}
                      data-testid={`how-to-play-step-${i}`}
                      className="flex items-center gap-3 rounded-2xl border-3 px-3 py-2"
                      style={{
                        borderColor: 'var(--jma-dark)',
                        backgroundColor: '#FFF7E5',
                      }}
                    >
                      <div
                        className="flex-shrink-0 rounded-full border-3 flex items-center justify-center font-black font-display"
                        style={{
                          width: 36, height: 36,
                          borderColor: 'var(--jma-dark)',
                          backgroundColor: modeConfig.color,
                          color: 'white',
                          fontSize: 18,
                        }}
                      >
                        {i + 1}
                      </div>
                      <div className="text-2xl flex-shrink-0" aria-hidden="true">{step.icon}</div>
                      <div className="text-sm md:text-base font-bold leading-snug">{step.text}</div>
                    </li>
                  ))}
                </ol>

                <button
                  data-testid="boom-how-to-play-start"
                  type="button"
                  onClick={() => setShowInstructions(false)}
                  className="mt-1 rounded-full border-3 px-6 py-2.5 font-black font-display text-base md:text-lg w-full"
                  style={{
                    borderColor: 'var(--jma-dark)',
                    backgroundColor: modeConfig.color,
                    color: 'white',
                    boxShadow: '0 4px 0 0 var(--jma-dark)',
                  }}
                >
                  Got it — let&apos;s go! →
                </button>
                <button
                  data-testid="boom-how-to-play-back"
                  type="button"
                  onClick={() => {
                    setShowInstructions(false);
                    exitMode();
                  }}
                  className="text-xs font-bold underline opacity-70 -mt-1"
                  style={{ color: 'var(--jma-dark)' }}
                >
                  ← Back to modes
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Feedback toast */}
        <AnimatePresence>
          {feedback && (
            <motion.div
              key={feedback.text}
              data-testid="boom-feedback"
              initial={{ y: 30, opacity: 0, scale: 0.8 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: -10, opacity: 0 }}
              className="fixed left-1/2 -translate-x-1/2 bottom-6 rounded-2xl border-4 px-4 py-2 font-black font-display z-30"
              style={{
                borderColor: 'var(--jma-dark)',
                backgroundColor: feedback.tone === 'great' ? '#34A853' : '#FF3B30',
                color: 'white',
                boxShadow: '0 6px 0 0 var(--jma-dark)',
              }}
            >
              <div className="flex items-center gap-2">
                {feedback.tone === 'great' && <Sparkles className="w-5 h-5" />}
                <span>{feedback.text}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showCelebration && (
            <motion.div
              className="fixed inset-0 z-40 pointer-events-none flex items-center justify-center"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            >
              <Confetti count={28} size={360} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
      </div>
    </div>
  );
}
