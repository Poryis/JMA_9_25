// Charlie's Song Studio — guided melody composition.
// Kids pick a mood, tap piano keys to fill a 16-slot grid (auto-advancing
// cursor), then press Play to hear their song over a mood-matched drum loop.

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Play, Trash2, Save, ArrowLeft, BookOpen, Music, Drum, Piano, Dices } from 'lucide-react';
import { GameHeader } from '../components/GameUI';
import { FullscreenButton } from '../components/FullscreenButton';
import Confetti from '../components/Confetti';
import usePianoAudio from '../hooks/usePianoAudio';
import { PIANO_KEYS, MOODS, TOTAL_SLOTS, SLOTS_PER_ROW } from '../data/songStudio';
import useNoteNames, { formatNoteName } from '../hooks/useNoteNames';
import { earnSticker, earnAchievement, earnAchievementUpTo } from '../hooks/useStickers';

const SONGS_KEY = 'jma_songs_v1';
const REST = 'REST'; // sentinel value for a rest slot — renders the seahorse PNG and plays nothing
const SEAHORSE_REST_SRC = 'assets/ui/seahorse-rest.png';
const loadSongs = () => { try { return JSON.parse(localStorage.getItem(SONGS_KEY) || '[]'); } catch { return []; } };
const saveSongs = (s) => { try { localStorage.setItem(SONGS_KEY, JSON.stringify(s)); } catch { /* ignore */ } };

// Adjective + noun namer for default song names.
const ADJ = ['Sunny', 'Sparkly', 'Bouncy', 'Dreamy', 'Wiggly', 'Happy', 'Cool', 'Silly', 'Magic', 'Wild', 'Sweet', 'Cosmic'];
const NOUN = ['Song', 'Tune', 'Jam', 'Melody', 'Groove', 'Anthem', 'Riff', 'Beat'];
const randomName = () => `${ADJ[Math.floor(Math.random() * ADJ.length)]} ${NOUN[Math.floor(Math.random() * NOUN.length)]}`;

function ColoredKey({ keyDef, scaleHighlighted, isTonic, onTap, playingNow }) {
  const dim = !scaleHighlighted;
  return (
    <motion.button
      data-testid={`piano-key-${keyDef.id}`}
      onClick={() => onTap(keyDef)}
      className="relative flex flex-col items-center justify-end rounded-b-xl border-2 md:border-3 select-none"
      style={{
        width: 'clamp(34px, 7.5vw, 64px)',
        height: 'clamp(70px, 13vh, 150px)',
        backgroundColor: dim ? 'rgba(255,255,255,0.55)' : keyDef.color,
        borderColor: 'var(--jma-dark)',
        boxShadow: '0 3px 0 0 var(--jma-dark)',
        opacity: dim ? 0.55 : 1,
        filter: playingNow ? 'brightness(1.35)' : 'none',
        transform: playingNow ? 'translateY(3px)' : 'translateY(0)',
        transition: 'transform 0.1s, filter 0.1s',
      }}
      whileTap={{ y: 4, boxShadow: '0 1px 0 0 var(--jma-dark)' }}
    >
      {/* Tonic indicator (small "home" dot) */}
      {isTonic && (
        <div
          className="absolute top-0.5 right-0.5 md:top-1 md:right-1 w-2 h-2 md:w-3 md:h-3 rounded-full"
          style={{ backgroundColor: 'var(--jma-dark)', border: '1.5px solid white' }}
          title="Home note"
        />
      )}
      {/* Octave indicator at the top */}
      <div className="absolute top-1 left-1 md:top-1.5 md:left-1.5 text-[8px] md:text-[9px] font-black opacity-50" style={{ color: 'var(--jma-dark)' }}>
        {keyDef.octave}
      </div>
      <span
        className="mb-1 md:mb-2 text-[10px] md:text-sm font-black font-display leading-none"
      >
        {formatNoteName(keyDef.pitch, keyDef.solfege)}
      </span>
    </motion.button>
  );
}

export default function SongStudioPage() {
  const { nameFor } = useNoteNames();
  const navigate = useNavigate();
  const { preload, preloadLoop, playPianoNote, playLoop, initContext, now } = usePianoAudio();

  const [view, setView] = useState('compose');       // compose | gallery
  const [moodId, setMoodId] = useState('happy');
  const [slots, setSlots] = useState(() => Array(TOTAL_SLOTS).fill(null));
  const [cursor, setCursor] = useState(0);            // next slot to auto-fill
  const [isPlaying, setIsPlaying] = useState(false);
  const [playingSlot, setPlayingSlot] = useState(-1);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [pendingName, setPendingName] = useState('');
  const [showCelebration, setShowCelebration] = useState(false);
  const [songs, setSongs] = useState(loadSongs);
  // Accompaniment toggles — kids can solo their melody by switching these off
  const [drumsOn, setDrumsOn] = useState(true);
  const [chordsOn, setChordsOn] = useState(true);

  const drumSourceRef = useRef(null);   // Web Audio source for current drum loop
  const scheduledSourcesRef = useRef([]); // every melody+chord source scheduled for the current playSong
  const playTimeoutsRef = useRef([]);
  const cancelPlayRef = useRef(false);

  const mood = MOODS[moodId];

  // Preload piano buffers on first interaction
  const ensureLoaded = useCallback(() => {
    initContext();
    preload();
  }, [initContext, preload]);

  // Tap a piano key → play it + auto-advance the cursor
  const handleKeyTap = useCallback((keyDef) => {
    ensureLoaded();
    playPianoNote(keyDef.id);
    setSlots((prev) => {
      const next = [...prev];
      const idx = cursor < TOTAL_SLOTS ? cursor : prev.findIndex((s) => s == null);
      if (idx < 0) return prev; // grid is full
      next[idx] = keyDef.id;
      return next;
    });
    setCursor((c) => Math.min(c + 1, TOTAL_SLOTS));
  }, [ensureLoaded, playPianoNote, cursor]);

  // Tap the rest button → mark current slot as an explicit rest (silent),
  // advance the cursor. Stored as the sentinel string REST so it survives
  // saves and renders the seahorse during composition + playback.
  const handleRestTap = useCallback(() => {
    setSlots((prev) => {
      const next = [...prev];
      const idx = cursor < TOTAL_SLOTS ? cursor : prev.findIndex((s) => s == null);
      if (idx < 0) return prev; // grid is full
      next[idx] = REST;
      return next;
    });
    setCursor((c) => Math.min(c + 1, TOTAL_SLOTS));
  }, [cursor]);

  // Tap a slot — clears it (and moves the cursor there)
  const handleSlotTap = useCallback((slotIdx) => {
    setSlots((prev) => {
      const next = [...prev];
      next[slotIdx] = null;
      return next;
    });
    setCursor(slotIdx);
  }, []);

  const clearAll = useCallback(() => {
    setSlots(Array(TOTAL_SLOTS).fill(null));
    setCursor(0);
  }, []);

  // Surprise Me! — auto-fills the 16 slots with a random melody using the
  // active mood's scale notes (in the high octave the kid can play) plus a
  // GUARANTEED 6–11 seahorse rests scattered throughout.
  const surpriseMe = useCallback(() => {
    ensureLoaded();
    // 1. Pick how many rests (6–11 inclusive)
    const numRests = 6 + Math.floor(Math.random() * 6);   // 6..11
    const numNotes = TOTAL_SLOTS - numRests;
    // 2. Candidate note pool: only mood-scale notes from the displayed (high-octave) keys
    const scaleNotes = PIANO_KEYS
      .filter((k) => mood.scaleNotes.includes(k.pitch))
      .map((k) => k.id);
    if (scaleNotes.length === 0) return;
    // 3. Build numNotes random scale notes + numRests REST sentinels
    const items = [];
    for (let i = 0; i < numNotes; i++) {
      items.push(scaleNotes[Math.floor(Math.random() * scaleNotes.length)]);
    }
    for (let i = 0; i < numRests; i++) items.push(REST);
    // 4. Fisher-Yates shuffle so rests are scattered, not clumped at the end
    for (let i = items.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [items[i], items[j]] = [items[j], items[i]];
    }
    setSlots(items);
    setCursor(TOTAL_SLOTS);
  }, [ensureLoaded, mood.scaleNotes]);

  // Stop any running playback
  const stopPlayback = useCallback(() => {
    cancelPlayRef.current = true;
    playTimeoutsRef.current.forEach((t) => clearTimeout(t));
    playTimeoutsRef.current = [];
    if (drumSourceRef.current) {
      try { drumSourceRef.current.stop(); } catch { /* ignore */ }
      drumSourceRef.current = null;
    }
    // Cut every scheduled melody/chord source — including ones that haven't
    // started yet (Web Audio honours .stop() on future-scheduled sources too).
    scheduledSourcesRef.current.forEach((s) => {
      try { s.stop(); } catch { /* ignore */ }
    });
    scheduledSourcesRef.current = [];
    setIsPlaying(false);
    setPlayingSlot(-1);
  }, []);

  useEffect(() => stopPlayback, [stopPlayback]);

  // Play the composed song. Drum loop + chord triads + melody notes all share
  // a single AudioContext start anchor, so they stay sample-accurate-aligned
  // regardless of OS audio startup latency.
  const playSong = useCallback(async () => {
    ensureLoaded();
    stopPlayback();
    cancelPlayRef.current = false;
    setIsPlaying(true);

    // Pre-decode the drum loop (cached after first decode) so it's ready to
    // start at the exact AudioContext timestamp we pick below.
    let drumBuf = null;
    if (mood.drumLoop && drumsOn) {
      drumBuf = await preloadLoop(mood.drumLoop);
    }
    if (cancelPlayRef.current) return;

    const beatSec = 60 / mood.bpm;
    const REPEATS = 2;
    const totalBeats = TOTAL_SLOTS * REPEATS;

    // Small lookahead so every source.start() falls in the future — required
    // for Web Audio to honour the precise schedule.
    const LOOKAHEAD_SEC = 0.12;
    const ctxStart = now() + LOOKAHEAD_SEC;
    const wallStartMs = Date.now() + LOOKAHEAD_SEC * 1000;

    // Kick off the drum loop on the shared anchor
    if (drumBuf) {
      drumSourceRef.current = playLoop(drumBuf, 0.45, ctxStart);
    }

    // Schedule every chord triad + melody note via AudioContext time
    for (let beat = 0; beat < totalBeats; beat++) {
      const slotIdx = beat % TOTAL_SLOTS;
      const measureIdx = Math.floor(slotIdx / SLOTS_PER_ROW);
      const measureBeat = slotIdx % SLOTS_PER_ROW;
      const noteId = slots[slotIdx];
      const tCtx = ctxStart + beat * beatSec;

      if (chordsOn && measureBeat === 0 && mood.chordProgression) {
        const chord = mood.chordProgression[measureIdx];
        if (chord) chord.notes.forEach((n) => {
          const src = playPianoNote(n, 0.35, tCtx);
          if (src) scheduledSourcesRef.current.push(src);
        });
      }
      // Only play the melody note if it's an actual pitch (rests stay silent)
      if (noteId && noteId !== REST) {
        const src = playPianoNote(noteId, 0.85, tCtx);
        if (src) scheduledSourcesRef.current.push(src);
      }

      // Visual playhead — best-effort, lit at wall-clock time matching the
      // scheduled audio. A few ms of jitter is fine for the UI.
      const visualMs = wallStartMs + beat * beatSec * 1000 - Date.now();
      const vt = setTimeout(() => {
        if (cancelPlayRef.current) return;
        setPlayingSlot(slotIdx);
      }, Math.max(0, visualMs));
      playTimeoutsRef.current.push(vt);
    }

    // End-of-song cleanup
    const endMs = wallStartMs + totalBeats * beatSec * 1000 + 200 - Date.now();
    const end = setTimeout(() => {
      if (cancelPlayRef.current) return;
      stopPlayback();
    }, Math.max(0, endMs));
    playTimeoutsRef.current.push(end);
  }, [ensureLoaded, stopPlayback, mood, slots, playPianoNote, playLoop, preloadLoop, now, drumsOn, chordsOn]);

  // Save the current song to localStorage
  const handleSave = useCallback(() => {
    if (slots.every((s) => s == null)) return;
    setPendingName(randomName());
    setShowSaveModal(true);
  }, [slots]);

  const confirmSave = useCallback(() => {
    const name = pendingName.trim() || randomName();
    const newSong = {
      id: `song_${Date.now()}`,
      name,
      moodId,
      slots: [...slots],
      bpm: mood.bpm,
      createdAt: new Date().toISOString(),
    };
    const next = [newSong, ...songs];
    saveSongs(next);
    setSongs(next);
    setShowSaveModal(false);
    setShowCelebration(true);
    // ✍️ Song Creator achievements
    try {
      // Cadet: first saved song
      earnAchievement('song', 'cadet');
      // Pro: saved at least 1 song in each of the 3 moods
      const moodsUsed = new Set(next.map((s) => s.moodId));
      if (moodsUsed.size >= 3) earnAchievementUpTo('song', 'pro');
      // Master: fully filled song (all 16 slots — any non-null counts)
      const fullCount = newSong.slots.filter((s) => s != null).length;
      if (fullCount >= newSong.slots.length) earnAchievementUpTo('song', 'master');
    } catch { /* ignore */ }
    setTimeout(() => setShowCelebration(false), 2200);
  }, [pendingName, moodId, slots, mood.bpm, songs]);

  // Load a saved song
  const loadSong = useCallback((song) => {
    stopPlayback();
    setMoodId(song.moodId);
    setSlots(song.slots);
    setCursor(song.slots.findIndex((s) => s == null) >= 0 ? song.slots.findIndex((s) => s == null) : TOTAL_SLOTS);
    setView('compose');
  }, [stopPlayback]);

  const deleteSong = useCallback((id) => {
    const next = songs.filter((s) => s.id !== id);
    saveSongs(next);
    setSongs(next);
  }, [songs]);

  const filledCount = slots.filter((s) => s != null).length;
  const noteCount = slots.filter((s) => s != null && s !== REST).length;
  const restCount = slots.filter((s) => s === REST).length;
  const isFull = filledCount === TOTAL_SLOTS;

  return (
    <div
      data-testid="song-studio-page"
      className="min-h-screen flex flex-col relative"
      style={{
        backgroundImage: 'url(assets/backgrounds/recording-studio.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      }}
    >
      {/* Mood-color tint overlay — kept gentle so the studio reads cleanly */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `linear-gradient(180deg, ${mood.color}33 0%, rgba(255,255,255,0.18) 35%, rgba(255,255,255,0.55) 100%)`,
          transition: 'background 0.4s ease',
        }}
      />
      <GameHeader title="Charlie's Song Studio" showHomeButton={true} backLink={{ to: '/create', label: 'Create' }} />
      <FullscreenButton />

      <main className="relative z-10 flex-1 flex flex-col items-center pt-20 md:pt-20 pb-3 md:pb-6 px-2 md:px-3 max-w-4xl mx-auto w-full">

        {/* Unified frosted "studio console" — calms the busy bg by grouping
            all the controls inside one cohesive surface */}
        <div
          className="w-full rounded-2xl md:rounded-3xl border-3 p-2 md:p-4"
          style={{
            backgroundColor: 'rgba(255, 252, 247, 0.86)',
            backdropFilter: 'blur(14px)',
            WebkitBackdropFilter: 'blur(14px)',
            borderColor: 'var(--jma-dark)',
            boxShadow: '0 10px 0 0 var(--jma-dark), 0 18px 30px rgba(10,37,64,0.18)',
          }}
        >

        {/* MOOD PICKER — single compact row so it never eats vertical space */}
        <div className="w-full mb-2 md:mb-3">
          <div className="grid grid-cols-3 gap-1.5 md:gap-2">
            {Object.values(MOODS).map((m) => (
              <button
                key={m.id}
                data-testid={`mood-${m.id}`}
                onClick={() => { setMoodId(m.id); stopPlayback(); }}
                className="rounded-xl md:rounded-2xl border-2 md:border-3 px-1.5 py-1 md:py-1.5 text-center flex items-center justify-center gap-1.5 md:gap-2"
                style={{
                  borderColor: 'var(--jma-dark)',
                  backgroundColor: moodId === m.id ? m.color : 'white',
                  color: 'var(--jma-dark)',
                  boxShadow: moodId === m.id ? '0 4px 0 0 var(--jma-dark)' : '0 2px 0 0 var(--jma-dark)',
                  transform: moodId === m.id ? 'translateY(-1px)' : 'translateY(0)',
                  transition: 'transform 0.12s, background-color 0.2s, box-shadow 0.12s',
                }}
              >
                <div className="text-xl md:text-2xl leading-none">{m.emoji}</div>
                <div className="text-left leading-tight">
                  <div className="text-xs md:text-sm font-black font-display leading-tight">{m.name}</div>
                  <div className="hidden lg:block text-[10px] opacity-60 leading-tight">{m.description}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* CONSOLE BODY — md+: Charlie | grid | controls, piano under the
            first two. Slot size is viewport-height driven (--slot) so the
            whole studio fits on one screen without scrolling. */}
        <div
          className="w-full grid grid-cols-1 md:grid-cols-[auto_minmax(0,1fr)_auto] gap-2 md:gap-x-3 md:gap-y-2 items-center"
          style={{ '--slot': 'clamp(40px, 8.5vh, 72px)' }}
        >
          <motion.img
            src={mood.charlie}
            alt="Charlie"
            draggable={false}
            className="hidden sm:block object-contain pointer-events-none select-none flex-shrink-0 mx-auto md:col-start-1 md:row-start-1"
            style={{ width: 'clamp(70px, 16vh, 150px)', filter: 'drop-shadow(0 6px 6px rgba(0,0,0,0.35))' }}
            animate={isPlaying ? { y: [0, -8, 0], rotate: [-3, 3, -3] } : { y: [0, -4, 0] }}
            transition={{ repeat: Infinity, duration: isPlaying ? 0.6 : 2.4, ease: 'easeInOut' }}
          />
          <div className="min-w-0 w-fit mx-auto md:col-start-2 md:row-start-1">
            <div className="flex items-center justify-between gap-2 mb-0.5 md:mb-1">
              <div className="text-[9px] md:text-[10px] uppercase font-black opacity-60 truncate" style={{ color: 'var(--jma-dark)' }}>
                {noteCount} {noteCount === 1 ? 'note' : 'notes'}
                {restCount > 0 && ` + ${restCount} ${restCount === 1 ? 'rest' : 'rests'}`}
                {' · '}{mood.bpm} BPM · plays 2×
              </div>
              <div className="flex items-center gap-1 text-[9px] md:text-[10px] opacity-70 flex-shrink-0" style={{ color: 'var(--jma-dark)' }}>
                <span className="font-black uppercase hidden sm:inline">Chords:</span>
                <span className="font-black">
                  {mood.chordProgression.map((c) => c.label).join(' · ')}
                </span>
              </div>
            </div>
            <div
              className="text-[9px] md:text-xs text-center mb-1 md:mb-1.5 font-bold rounded-md px-2 py-0.5 md:py-1"
              style={{
                color: 'var(--jma-dark)',
                backgroundColor: `${mood.color}33`,
                border: `1.5px dashed ${mood.accent}`,
              }}
              data-testid="song-studio-rests-tip"
            >
              💡 Leave a beat empty, or tap the 🐠 for a rest!
            </div>
            <div
              className="rounded-xl md:rounded-2xl border-2 md:border-3 p-1.5 md:p-2"
              style={{
                borderColor: 'var(--jma-dark)',
                backgroundColor: 'rgba(255,255,255,0.85)',
                boxShadow: '0 3px 0 0 var(--jma-dark)',
              }}
            >
              {/* 4 measure rows, each with a chord label + 4 slots */}
              {[0, 1, 2, 3].map((measureIdx) => {
                const chord = mood.chordProgression[measureIdx];
                return (
                  <div key={measureIdx} className="flex items-center gap-1 md:gap-2 mb-1 last:mb-0">
                    <div
                      className="flex-shrink-0 w-8 md:w-12 rounded-md text-center py-0.5 md:py-1 border-2"
                      style={{
                        borderColor: 'var(--jma-dark)',
                        backgroundColor: mood.accent,
                        color: 'white',
                      }}
                    >
                      <div className="text-[8px] md:text-[9px] uppercase font-black opacity-80 leading-none">M{measureIdx + 1}</div>
                      <div className="text-[11px] md:text-sm font-black font-display leading-tight">{chord.label}</div>
                    </div>
                    <div className="grid gap-1.5 md:gap-2" style={{ gridTemplateColumns: `repeat(${SLOTS_PER_ROW}, var(--slot))` }}>
                      {[0, 1, 2, 3].map((beatIdx) => {
                        const i = measureIdx * SLOTS_PER_ROW + beatIdx;
                        const noteId = slots[i];
                        const isRest = noteId === REST;
                        const key = noteId && !isRest ? PIANO_KEYS.find((k) => k.id === noteId) : null;
                        const isCursor = i === cursor && !isPlaying;
                        const isLit = playingSlot === i;
                        return (
                          <button
                            key={i}
                            data-testid={`slot-${i}`}
                            onClick={() => handleSlotTap(i)}
                            className="rounded-lg border-2 flex flex-col items-center justify-center overflow-hidden"
                            style={{
                              width: 'var(--slot)',
                              height: 'var(--slot)',
                              borderColor: 'var(--jma-dark)',
                              backgroundColor: isRest
                                ? (isLit ? '#FFE0EF' : '#FFF5FA')
                                : (isLit ? (key ? key.color : '#FFCC00') : (key ? key.color : 'white')),
                              borderStyle: noteId ? 'solid' : 'dashed',
                              boxShadow: isCursor ? `0 0 0 3px ${mood.accent}` : 'none',
                              transform: isLit ? 'scale(1.08)' : 'scale(1)',
                              transition: 'transform 0.1s, background-color 0.15s',
                            }}
                          >
                            {isRest ? (
                              <img
                                src={SEAHORSE_REST_SRC}
                                alt="rest"
                                draggable={false}
                                className="w-full h-full object-contain p-1 select-none pointer-events-none"
                              />
                            ) : key ? (
                              <>
                                <span className="text-[10px] md:text-xs font-black font-display leading-none" style={{ color: 'var(--jma-dark)' }}>
                                  {nameFor(key.pitch, key.solfege)}
                                </span>
                                <span className="text-[8px] opacity-60 leading-none mt-0.5" style={{ color: 'var(--jma-dark)' }}>
                                  {key.octave}
                                </span>
                              </>
                            ) : (
                              <span className="text-[10px] opacity-30 font-bold" style={{ color: 'var(--jma-dark)' }}>{i + 1}</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        {/* PIANO KEYBOARD + REST BUTTON */}
        <div
          className="w-full overflow-x-auto pb-1.5 md:pb-2 md:col-start-1 md:col-span-2 md:row-start-2"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          <div className="flex justify-center items-end gap-1 md:gap-1.5 px-1 md:px-2 min-w-max">
            {PIANO_KEYS.map((k) => {
              const inScale = mood.scaleNotes.includes(k.pitch);
              const isTonic = k.pitch === mood.tonic;
              return (
                <ColoredKey
                  key={k.id}
                  keyDef={k}
                  scaleHighlighted={inScale}
                  isTonic={isTonic}
                  onTap={handleKeyTap}
                  playingNow={false}
                />
              );
            })}
            {/* Seahorse REST button — sits flush with the keys */}
            <motion.button
              data-testid="rest-button"
              onClick={handleRestTap}
              aria-label="Add a rest"
              className="relative flex flex-col items-center justify-center rounded-b-xl border-2 md:border-3 select-none ml-1.5 md:ml-3"
              style={{
                width: 'clamp(34px, 7.5vw, 64px)',
                height: 'clamp(70px, 13vh, 150px)',
                backgroundColor: 'rgba(255, 245, 250, 1)',
                borderColor: 'var(--jma-dark)',
                boxShadow: '0 3px 0 0 var(--jma-dark)',
              }}
              whileTap={{ y: 4, boxShadow: '0 1px 0 0 var(--jma-dark)' }}
            >
              <img
                src={SEAHORSE_REST_SRC}
                alt="rest"
                draggable={false}
                className="w-full h-[78%] object-contain pointer-events-none select-none px-1"
              />
              <span
                className="mb-1 md:mb-1.5 text-[9px] md:text-xs font-black font-display leading-none"
              >
                Rest
              </span>
            </motion.button>
          </div>
        </div>

        {/* ACCOMPANIMENT TOGGLES + CONTROLS — one wrap row on phones, a
            stacked side rail next to the grid on tablets/desktop */}
        <div className="flex items-center justify-center gap-1.5 md:gap-2 flex-wrap md:flex-col md:items-stretch md:w-44 md:col-start-3 md:row-start-1 md:row-span-2 md:[&>button]:w-full md:[&>button]:justify-center">
          <button
            data-testid="toggle-chords"
            onClick={() => setChordsOn((v) => !v)}
            aria-pressed={chordsOn}
            className="rounded-full border-2 px-2.5 md:px-3 py-1 md:py-1.5 flex items-center gap-1 md:gap-1.5 text-[11px] md:text-sm font-black font-display"
            style={{
              borderColor: 'var(--jma-dark)',
              backgroundColor: chordsOn ? mood.accent : 'white',
              color: chordsOn ? 'white' : 'var(--jma-dark)',
              boxShadow: chordsOn ? '0 3px 0 0 var(--jma-dark)' : '0 2px 0 0 var(--jma-dark)',
              transition: 'background-color 0.15s, box-shadow 0.12s, transform 0.12s',
              transform: chordsOn ? 'translateY(-1px)' : 'translateY(0)',
            }}
          >
            <Piano className="w-3.5 h-3.5 md:w-4 md:h-4" />
            Chords {chordsOn ? 'ON' : 'OFF'}
          </button>
          <button
            data-testid="toggle-drums"
            onClick={() => setDrumsOn((v) => !v)}
            aria-pressed={drumsOn}
            disabled={!mood.drumLoop}
            className="rounded-full border-2 px-2.5 md:px-3 py-1 md:py-1.5 flex items-center gap-1 md:gap-1.5 text-[11px] md:text-sm font-black font-display disabled:opacity-40"
            style={{
              borderColor: 'var(--jma-dark)',
              backgroundColor: drumsOn && mood.drumLoop ? mood.accent : 'white',
              color: drumsOn && mood.drumLoop ? 'white' : 'var(--jma-dark)',
              boxShadow: drumsOn && mood.drumLoop ? '0 3px 0 0 var(--jma-dark)' : '0 2px 0 0 var(--jma-dark)',
              transition: 'background-color 0.15s, box-shadow 0.12s, transform 0.12s',
              transform: drumsOn && mood.drumLoop ? 'translateY(-1px)' : 'translateY(0)',
              cursor: mood.drumLoop ? 'pointer' : 'not-allowed',
            }}
            title={mood.drumLoop ? '' : 'No drum loop for this mood'}
          >
            <Drum className="w-3.5 h-3.5 md:w-4 md:h-4" />
            Drums {mood.drumLoop ? (drumsOn ? 'ON' : 'OFF') : '—'}
          </button>
          <div aria-hidden="true" className="hidden md:block h-0.5 w-full rounded-full my-1 opacity-15" style={{ backgroundColor: 'var(--jma-dark)' }} />
          <button
            data-testid="song-play-btn"
            onClick={isPlaying ? stopPlayback : playSong}
            disabled={filledCount === 0}
            className="chunky-btn px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-base flex items-center gap-1.5 md:gap-2"
            style={{
              backgroundColor: filledCount === 0 ? '#9CA3AF' : '#34A853',
              color: 'white',
              opacity: filledCount === 0 ? 0.6 : 1,
              cursor: filledCount === 0 ? 'not-allowed' : 'pointer',
            }}
          >
            <Play className="w-3.5 h-3.5 md:w-4 md:h-4" /> {isPlaying ? 'Stop' : 'Play My Song'}
          </button>
          <button
            data-testid="song-save-btn"
            onClick={handleSave}
            disabled={filledCount === 0}
            className="chunky-btn px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-base flex items-center gap-1.5 md:gap-2"
            style={{
              backgroundColor: filledCount === 0 ? '#9CA3AF' : '#FFCC00',
              color: 'var(--jma-dark)',
              opacity: filledCount === 0 ? 0.6 : 1,
              cursor: filledCount === 0 ? 'not-allowed' : 'pointer',
            }}
          >
            <Save className="w-3.5 h-3.5 md:w-4 md:h-4" /> Save
          </button>
          <button
            data-testid="song-clear-btn"
            onClick={clearAll}
            className="chunky-btn bg-white text-[var(--jma-dark)] px-2.5 md:px-3 py-1.5 md:py-2 flex items-center gap-1 md:gap-1.5 text-[11px] md:text-sm border-2"
            style={{ borderColor: 'var(--jma-dark)' }}
          >
            <Trash2 className="w-3.5 h-3.5 md:w-4 md:h-4" /> Clear
          </button>
          <button
            data-testid="song-surprise-btn"
            onClick={surpriseMe}
            className="chunky-btn px-2.5 md:px-3 py-1.5 md:py-2 flex items-center gap-1 md:gap-1.5 text-[11px] md:text-sm"
            style={{
              backgroundColor: mood.accent,
              color: 'white',
              border: '2px solid var(--jma-dark)',
            }}
          >
            <Dices className="w-3.5 h-3.5 md:w-4 md:h-4" /> Surprise Me!
          </button>
          <button
            data-testid="song-gallery-btn"
            onClick={() => setView('gallery')}
            className="chunky-btn bg-white text-[var(--jma-dark)] px-2.5 md:px-3 py-1.5 md:py-2 flex items-center gap-1 md:gap-1.5 text-[11px] md:text-sm border-2"
            style={{ borderColor: 'var(--jma-dark)' }}
          >
            <BookOpen className="w-3.5 h-3.5 md:w-4 md:h-4" /> Songs ({songs.length})
          </button>
        </div>
        </div>{/* /console-body */}

        </div>{/* /studio-console */}

        {/* SAVE MODAL */}
        <AnimatePresence>
          {showSaveModal && (
            <motion.div
              className="fixed inset-0 z-40 flex items-center justify-center p-4"
              style={{ backgroundColor: 'rgba(10,37,64,0.55)', backdropFilter: 'blur(4px)' }}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            >
              <motion.div
                data-testid="song-save-modal"
                className="bg-white rounded-3xl border-4 p-6 max-w-md w-full"
                style={{ borderColor: 'var(--jma-dark)', boxShadow: '0 8px 0 0 var(--jma-dark)' }}
                initial={{ scale: 0.7 }} animate={{ scale: 1 }}
              >
                <h2 className="text-2xl font-black font-display mb-1 text-center" style={{ color: 'var(--jma-dark)' }}>
                  💾 Name your song!
                </h2>
                <p className="text-sm text-center mb-3 opacity-70" style={{ color: 'var(--jma-dark)' }}>
                  Then we&apos;ll add it to your gallery.
                </p>
                <input
                  data-testid="song-name-input"
                  value={pendingName}
                  onChange={(e) => setPendingName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border-3 font-bold text-center"
                  style={{ borderColor: 'var(--jma-dark)' }}
                  maxLength={28}
                  autoFocus
                />
                <div className="flex justify-center gap-2 mt-4">
                  <button
                    onClick={() => setShowSaveModal(false)}
                    className="chunky-btn bg-white text-[var(--jma-dark)] px-4 py-2 border-2"
                    style={{ borderColor: 'var(--jma-dark)' }}
                  >
                    Cancel
                  </button>
                  <button
                    data-testid="song-confirm-save"
                    onClick={confirmSave}
                    className="chunky-btn bg-[#34A853] text-white px-4 py-2"
                  >
                    Save it!
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* GALLERY MODAL */}
        <AnimatePresence>
          {view === 'gallery' && (
            <motion.div
              className="fixed inset-0 z-40 flex items-center justify-center p-4"
              style={{ backgroundColor: 'rgba(10,37,64,0.55)', backdropFilter: 'blur(4px)' }}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            >
              <motion.div
                data-testid="song-gallery-modal"
                className="bg-white rounded-3xl border-4 p-5 max-w-md w-full max-h-[80vh] overflow-y-auto"
                style={{ borderColor: 'var(--jma-dark)', boxShadow: '0 8px 0 0 var(--jma-dark)' }}
                initial={{ y: 30 }} animate={{ y: 0 }}
              >
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-xl font-black font-display flex items-center gap-2" style={{ color: 'var(--jma-dark)' }}>
                    <Music className="w-5 h-5" /> My Songs
                  </h2>
                  <button
                    onClick={() => setView('compose')}
                    className="text-sm font-bold px-3 py-1 rounded-full border-2"
                    style={{ borderColor: 'var(--jma-dark)' }}
                  >
                    <ArrowLeft className="w-4 h-4 inline -mt-0.5" /> Back
                  </button>
                </div>
                {songs.length === 0 ? (
                  <p className="text-center py-6 opacity-70 font-bold" style={{ color: 'var(--jma-dark)' }}>
                    No songs yet. Compose and save one to fill this gallery!
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {songs.map((song) => {
                      const m = MOODS[song.moodId] || MOODS.happy;
                      return (
                        <li
                          key={song.id}
                          data-testid={`song-${song.id}`}
                          className="rounded-xl border-3 p-2 flex items-center gap-2"
                          style={{ borderColor: 'var(--jma-dark)', backgroundColor: `${m.color}22` }}
                        >
                          <div className="text-2xl">{m.emoji}</div>
                          <div className="flex-1 min-w-0">
                            <div className="font-black font-display text-sm truncate" style={{ color: 'var(--jma-dark)' }}>
                              {song.name}
                            </div>
                            <div className="text-[10px] opacity-60" style={{ color: 'var(--jma-dark)' }}>
                              {m.name} · {song.bpm} BPM · {song.slots.filter((s) => s != null && s !== REST).length} notes
                            </div>
                          </div>
                          <button
                            onClick={() => loadSong(song)}
                            className="chunky-btn bg-[#34A853] text-white px-3 py-1.5 text-xs flex items-center gap-1"
                          >
                            <Play className="w-3 h-3" /> Open
                          </button>
                          <button
                            onClick={() => deleteSong(song.id)}
                            className="text-red-600 hover:text-red-800 p-1"
                            aria-label="Delete song"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* CELEBRATION */}
        <AnimatePresence>
          {showCelebration && (
            <motion.div
              className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            >
              <Confetti count={36} size={420} />
              <motion.div
                initial={{ scale: 0, y: 30 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0 }}
                className="bg-[#FFCC00] rounded-3xl border-4 px-6 py-4 text-center"
                style={{ borderColor: 'var(--jma-dark)', boxShadow: '0 8px 0 0 var(--jma-dark)' }}
              >
                <div className="text-4xl mb-1">🎵</div>
                <div className="text-xl font-black font-display" style={{ color: 'var(--jma-dark)' }}>
                  Song saved!
                </div>
                <div className="text-xs font-bold opacity-70 mt-1" style={{ color: 'var(--jma-dark)' }}>
                  + Songwriter sticker
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
