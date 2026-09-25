import { useState, useCallback, useRef, useEffect, useLayoutEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Music, Circle, Square, Play, RotateCcw, ChevronRight, Headphones, Download, Mic } from 'lucide-react';
import { BELLS, KEY_TO_NOTE } from '../components/JellyBells';
import { GameHeader } from '../components/GameUI';
import RoomCharacters from '../components/RoomCharacters';
import { XylophoneInstrument, PianoInstrument } from '../components/Instruments';
import GuitarInstrument from '../components/GuitarInstrument';
import { FullscreenButton } from '../components/FullscreenButton';
import UnderwaterBackdrop from '../components/UnderwaterBackdrop';
import { earnSticker, earnAchievement, earnAchievementUpTo } from '../hooks/useStickers';
import { SONG_LIBRARY } from '../data/songs';
import useAudio from '../hooks/useAudio';
import useMp3Recorder from '../hooks/useMp3Recorder';

const GUIDED_SONGS = [
  { name: 'Do Re Mi', notes: ['C', 'D', 'E', 'F', 'G', 'A', 'B', 'High C'] },
  { name: 'Hot Cross Buns', notes: ['E', 'D', 'C', 'E', 'D', 'C', 'C', 'C', 'C', 'C', 'D', 'D', 'D', 'D', 'E', 'D', 'C'] },
  { name: 'Mary Had a Lamb', notes: ['E', 'D', 'C', 'D', 'E', 'E', 'E', 'D', 'D', 'D', 'E', 'G', 'G'] },
  { name: 'Ode to Joy', notes: ['E', 'E', 'F', 'G', 'G', 'F', 'E', 'D', 'C', 'C', 'D', 'E', 'E', 'D', 'D'] },
];

const INSTRUMENT_TABS = [
  { id: 'bells', label: 'Jelly Bells' },
  { id: 'xylophone', label: 'Xylophone' },
  { id: 'piano', label: 'Piano' },
  { id: 'guitar', label: 'Guitar' },
  { id: 'drums', label: 'Drums' },
];

const XYLO_AUDIO = { C: 'assets/audio/xylo low c.mp3', D: 'assets/audio/xylo D.mp3', E: 'assets/audio/xylo E.mp3', F: 'assets/audio/xylo F.mp3', G: 'assets/audio/xylo G.mp3', A: 'assets/audio/xylo a.mp3', B: 'assets/audio/xylo b.mp3', 'High C': 'assets/audio/xylo High c.mp3' };
const PIANO_AUDIO = { C: 'assets/audio/C4.mp3', D: 'assets/audio/D4.mp3', E: 'assets/audio/E4.mp3', F: 'assets/audio/F4.mp3', G: 'assets/audio/G4.mp3', A: 'assets/audio/A4.mp3', B: 'assets/audio/B4.mp3', 'High C': 'assets/audio/C5.mp3' };

const DRUM_KEY_MAP = { q: 'hihat', w: 'crash', e: 'ride', a: 'snare', s: 'tom', d: 'lowTom', x: 'kick' };

const DRUM_INFO = {
  hihat:  { label: 'Hi-Hat', key: 'Q', color: '#F1C40F', img1: 'assets/drums/Hi hat 1.png', img2: 'assets/drums/Hi hat 2.png' },
  crash:  { label: 'Crash',  key: 'W', color: '#E67E22', img1: 'assets/drums/Crash 1.png',  img2: 'assets/drums/Crash 2.png'  },
  // Ride's asset files are named opposite the convention used by every
  // other drum: `Ride 1.png` is actually the PLAYED frame and `Ride 2.png`
  // is the REST frame. Swapping img1/img2 here keeps the rest-vs-played
  // logic consistent without renaming the source PNGs.
  ride:   { label: 'Ride',   key: 'E', color: '#E74C3C', img1: 'assets/drums/Ride 2.png',   img2: 'assets/drums/Ride 1.png'   },
  snare:  { label: 'Snare',  key: 'A', color: '#3498DB', img1: 'assets/drums/Snare 1.png',  img2: 'assets/drums/Snare 2.png'  },
  tom:    { label: 'Tom 1',  key: 'S', color: '#9B59B6', img1: 'assets/drums/tOM 1 1.png',  img2: 'assets/drums/tOM 1 2.png'  },
  lowTom: { label: 'Tom 2',  key: 'D', color: '#1ABC9C', img1: 'assets/drums/tOM 2 1.png',  img2: 'assets/drums/tOM 2 2.png'  },
  kick:   { label: 'Kick',   key: 'X', color: '#E74C3C', img1: 'assets/drums/kICK 1.png',   img2: 'assets/drums/kICK 2.png'   },
};

const noteToSolfege = { C: 'Do', D: 'Re', E: 'Mi', F: 'Fa', G: 'So', A: 'La', B: 'Ti', 'High C': 'Do' };

function ParticleBurst({ color }) {
  const x = useRef(Math.random() * (typeof window !== 'undefined' ? window.innerWidth - 60 : 800) + 30);
  const y = useRef(Math.random() * (typeof window !== 'undefined' ? window.innerHeight - 150 : 500) + 50);
  const particles = useRef(Array.from({ length: 5 }, (_, i) => {
    const angle = (i / 5) * Math.PI * 2 + Math.random() * 0.5;
    const dist = 15 + Math.random() * 25;
    return { id: i, tx: Math.cos(angle) * dist, ty: Math.sin(angle) * dist, size: 4 + Math.random() * 6 };
  }));
  return (
    <div className="fixed pointer-events-none z-50" style={{ left: x.current, top: y.current }}>
      {particles.current.map(p => (
        <motion.div key={p.id} className="absolute rounded-full"
          style={{ width: p.size, height: p.size, backgroundColor: color }}
          initial={{ x: 0, y: 0, opacity: 0.7, scale: 1 }}
          animate={{ x: p.tx, y: p.ty, opacity: 0, scale: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }} />
      ))}
    </div>
  );
}

function CharacterReaction({ streak }) {
  const reactions = [
    { min: 0, src: 'assets/characters/finn-danger.png', msg: '' },
    { min: 3, src: 'assets/characters/finn-danger.png', msg: 'Nice!' },
    { min: 6, src: 'assets/characters/chunk.png', msg: 'Keep going!' },
    { min: 10, src: 'assets/characters/jazzy.png', msg: 'Amazing!' },
    { min: 15, src: 'assets/characters/dr-jellybone.png', msg: 'SUPERSTAR!' },
  ];
  // Only show the celebratory mascot once the kid is on a real streak.
  // Avoids overlapping the room's permanent Charlie at bottom-right.
  if (streak < 3) return null;
  const reaction = [...reactions].reverse().find(r => streak >= r.min) || reactions[0];
  return (
    <motion.div className="fixed bottom-3 right-3 flex items-end gap-2 z-30 hidden md:flex" key={reaction.msg} initial={{ x: 50, opacity: 0 }} animate={{ x: 0, opacity: 1 }}>
      <motion.div className="bg-white px-3 py-2 rounded-2xl border-3 border-[var(--jma-dark)] shadow-lg mb-8" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring' }}>
        <span className="font-bold text-sm" style={{ color: 'var(--jma-dark)' }}>{reaction.msg}</span>
      </motion.div>
      <motion.img src={reaction.src} alt="character" className="w-20 h-24 object-contain"
        animate={streak >= 5 ? { y: [0, -10, 0], rotate: [-3, 3, -3] } : { y: [0, -5, 0] }}
        transition={{ repeat: Infinity, duration: streak >= 10 ? 0.5 : 1.5, ease: 'easeInOut' }} />
    </motion.div>
  );
}

// ============================================================================
// BellCircle: 8 bells evenly spaced around a TRUE circle (square container).
// Each bell is rotated so its top points OUTWARD from the center.
// All bells are the same size, equidistant from the center and each other.
// ============================================================================
function BellCircle({ onDown, onUp, nextGuidedNote, registerRef }) {
  const n = BELLS.length;
  return (
    <div
      className="relative mx-auto"
      style={{
        // Bell circle size:
        //   Mobile portrait (vmin = width): 92vmin gives a notably larger circle.
        //   Desktop / tablet:               the 720px cap dominates so size stays unchanged.
        width: 'min(80vh, 92vmin, 720px)',
        aspectRatio: '1 / 1',
      }}
      data-testid="jelly-bells-row"
    >
      {/* Center medallion */}
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none flex items-center justify-center"
        style={{ width: '28%', height: '28%' }}
      >
        <div className="w-full h-full rounded-full border-4 border-[var(--jma-dark)] bg-white/70 backdrop-blur-sm flex items-center justify-center shadow-[0_6px_0_0_var(--jma-dark)]">
          <img src="assets/ui/logo.png" alt="" className="w-[70%] h-[70%] object-contain" draggable={false} />
        </div>
      </div>
      {/* Decorative ring path - true circle */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
        <circle cx="50" cy="50" r="38" stroke="rgba(10,37,64,0.12)" strokeWidth="0.6" strokeDasharray="1.2 2" fill="none" />
      </svg>
      {BELLS.map((bell, i) => {
        // Distribute 8 bells evenly around 360deg, starting at 12 o'clock.
        // math convention: angle 90 = top. Going clockwise: subtract i * 45deg.
        const angle = 90 - (i * (360 / n));
        const rad = (angle * Math.PI) / 180;
        const radius = 38; // percentage of container
        const x = 50 + radius * Math.cos(rad);
        const y = 50 - radius * Math.sin(rad);
        // Each bell's top should point OUTWARD from center.
        // CSS rotation (clockwise from 12) = 90 - angle (math)
        const bellRotation = 90 - angle;
        return (
          <div
            key={bell.note}
            className="absolute flex flex-col items-center"
            style={{
              left: `${x}%`,
              top: `${y}%`,
              transform: 'translate(-50%, -50%)',
              zIndex: 10 + i,
            }}
          >
            <PlayableBell
              bell={bell}
              onDown={onDown}
              onUp={onUp}
              isHighlighted={nextGuidedNote === bell.note}
              registerRef={registerRef}
              rotation={bellRotation}
            />
          </div>
        );
      })}
    </div>
  );
}
// ============================================================================
// PlayableBell: Both frames rendered in DOM. Pressed frame is hidden via CSS
// class `.instrument-frame-pressed` (NOT JSX style) so React can't clobber.
// On press: imperative style.display='block' + scale(0.95) shows & shrinks
// the pressed frame; idle frame is hidden via style.display='none'.
// On release: inline styles are cleared so CSS rule reasserts default state.
// `rotation` prop rotates both frames together, label stays upright.
function PlayableBell({ bell, onDown, onUp, isHighlighted, registerRef, rotation = 0 }) {
  const idleRef = useRef(null);
  const pressedRef = useRef(null);

  useEffect(() => {
    if (registerRef) registerRef(bell.note, { idleRef, pressedRef });
    return () => { if (registerRef) registerRef(bell.note, null); };
  }, [bell.note, registerRef]);

  const doDown = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    // Pointer capture locks subsequent events to this element even if
    // layout shifts, preventing spurious pointerleave from breaking swap.
    try { e.target.setPointerCapture(e.pointerId); } catch (_) {}
    if (idleRef.current) idleRef.current.style.opacity = '0';
    if (pressedRef.current) {
      pressedRef.current.style.display = 'block';
      pressedRef.current.style.transform = 'scale(0.95)';
    }
    onDown(bell.note);
  };
  const doUp = () => {
    if (pressedRef.current) {
      pressedRef.current.style.display = '';
      pressedRef.current.style.transform = '';
    }
    if (idleRef.current) idleRef.current.style.opacity = '';
    onUp(bell.note);
  };

  return (
    <div className="bell-container flex flex-col items-center">
      <div
        data-testid={`bell-${bell.note.replace(' ', '-')}`}
        className={`bell-instrument relative cursor-pointer select-none flex items-center justify-center w-14 h-14 sm:w-24 sm:h-24 md:w-36 md:h-36 lg:w-44 lg:h-44 ${isHighlighted ? 'bell-highlight' : ''}`}
        onPointerDown={doDown}
        onPointerUp={doUp}
        onPointerLeave={doUp}
        onPointerCancel={doUp}
        style={{
          touchAction: 'none',
          transform: rotation ? `rotate(${rotation}deg)` : undefined,
          transformOrigin: 'center center',
        }}
      >
        <img
          ref={idleRef}
          src={bell.image1}
          alt={bell.solfege}
          className="instrument-frame-idle w-full h-full object-contain pointer-events-none"
          draggable={false}
        />
        <img
          ref={pressedRef}
          src={bell.image2}
          alt=""
          aria-hidden="true"
          className="instrument-frame-pressed w-full h-full object-contain pointer-events-none absolute inset-0"
          draggable={false}
        />
        {/* Keyboard-hint badge: hidden on mobile/tablet (touch-first), shown on
            desktop only. Pinned to the bottom-center of the bell (which is the
            INSIDE of the bell circle since each bell's top points outward),
            with a counter-rotation so the digit stays upright. */}
        <div
          className="hidden md:flex absolute -bottom-1 left-1/2 w-7 h-7 rounded-full bg-white border-2 border-[var(--jma-dark)] items-center justify-center text-sm font-bold pointer-events-none"
          style={{
            color: bell.color,
            transform: `translateX(-50%) rotate(${-rotation}deg)`,
            transformOrigin: 'center center',
          }}
        >
          {bell.key}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Drum piece using the same CSS-class swap pattern.
function PlayableDrumPiece({ drumId, info, onDown, onUp, style, registerRef }) {
  const idleRef = useRef(null);
  const pressedRef = useRef(null);

  useEffect(() => {
    if (registerRef) registerRef(drumId, { idleRef, pressedRef });
    return () => { if (registerRef) registerRef(drumId, null); };
  }, [drumId, registerRef]);

  const doDown = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    try { e.target.setPointerCapture(e.pointerId); } catch (_) {}
    if (idleRef.current) idleRef.current.style.opacity = '0';
    if (pressedRef.current) {
      pressedRef.current.style.display = 'block';
      pressedRef.current.style.transform = 'scale(0.95)';
    }
    onDown(drumId);
  };
  const doUp = () => {
    if (pressedRef.current) {
      pressedRef.current.style.display = '';
      pressedRef.current.style.transform = '';
    }
    if (idleRef.current) idleRef.current.style.opacity = '';
    onUp(drumId);
  };

  const { badgeLeft, badgeBottom, ...imgStyle } = style || {};

  return (
    <>
      <img
        ref={idleRef}
        src={info.img1}
        alt={info.label}
        className="instrument-frame-idle absolute object-contain cursor-pointer"
        style={{ ...imgStyle, touchAction: 'none' }}
        onPointerDown={doDown}
        onPointerUp={doUp}
        onPointerLeave={doUp}
        onPointerCancel={doUp}
        draggable={false}
      />
      <img
        ref={pressedRef}
        src={info.img2}
        alt=""
        aria-hidden="true"
        className="instrument-frame-pressed absolute object-contain pointer-events-none"
        style={{ ...imgStyle, touchAction: 'none' }}
        draggable={false}
      />
      <div className="absolute text-xs font-bold bg-white/80 rounded-full w-6 h-6 flex items-center justify-center border border-[var(--jma-dark)] pointer-events-none"
        style={{ left: badgeLeft, bottom: badgeBottom, zIndex: 10, color: info.color }}>{info.key}</div>
    </>
  );
}

// ============================================================================
// ResponsiveScaler: scales children down uniformly to fit the available width.
// Requires explicit nativeWidth/Height to reserve vertical space correctly.
// Never scales up past 1 (so on wide screens the instrument stays at native size).
function ResponsiveScaler({ children, nativeWidth, nativeHeight }) {
  const wrapRef = useRef(null);
  const [scale, setScale] = useState(1);
  useLayoutEffect(() => {
    const compute = () => {
      if (!wrapRef.current) return;
      const availW = wrapRef.current.getBoundingClientRect().width;
      setScale(Math.min(1, availW / nativeWidth));
    };
    compute();
    window.addEventListener('resize', compute);
    return () => window.removeEventListener('resize', compute);
  }, [nativeWidth]);
  return (
    <div ref={wrapRef} className="w-full flex justify-center" style={{ height: `${nativeHeight * scale}px` }}>
      <div style={{ width: `${nativeWidth}px`, height: `${nativeHeight}px`, transform: `scale(${scale})`, transformOrigin: 'top center' }}>
        {children}
      </div>
    </div>
  );
}

function DrumKitPlayable({ onDrumDown, onDrumUp, registerDrumRef }) {
  // Drum kit scale - sized to fit game board
  const S = 1.65;
  const px = (n) => `${Math.round(n * S)}px`;
  const cymS = 1.1;
  // Shift the whole kit RIGHT by this many unscaled px
  const RIGHT_SHIFT = 80;
  const L = (n) => px(n + RIGHT_SHIFT);
  // Toms group: move together up and slightly right
  const TOMS_DX = 15;
  const TOMS_DY = -8;  // nudged up 10 from +2 — final resting spot on the kick

  // Native kit dimensions (before responsive scaling)
  const NATIVE_W = Math.round((500 + RIGHT_SHIFT + 30) * S); // ~1007px
  const NATIVE_H = Math.round(340 * S);                      // ~561px

  // Responsive scaling: measure wrapper width and scale kit to fit
  const wrapRef = useRef(null);
  const [scale, setScale] = useState(1);
  useLayoutEffect(() => {
    const compute = () => {
      const w = wrapRef.current?.getBoundingClientRect().width || NATIVE_W;
      setScale(Math.min(1, w / NATIVE_W));
    };
    compute();
    window.addEventListener('resize', compute);
    return () => window.removeEventListener('resize', compute);
  }, [NATIVE_W]);

  return (
    <div ref={wrapRef} className="w-full flex justify-center" style={{ height: `${NATIVE_H * scale}px` }}>
      <div style={{ width: `${NATIVE_W}px`, height: `${NATIVE_H}px`, transform: `scale(${scale})`, transformOrigin: 'top center', position: 'relative' }}>
      <div className="relative mx-auto" style={{ width: px(500 + RIGHT_SHIFT + 30), height: px(340), transform: 'translateX(-30px)' }}>
      <PlayableDrumPiece drumId="crash"  info={DRUM_INFO.crash}  onDown={onDrumDown} onUp={onDrumUp} registerRef={registerDrumRef}
        style={{ left: L(90),  bottom: px(150), height: `${Math.round(130 * S * cymS)}px`, zIndex: 1, badgeLeft: L(145), badgeBottom: px(148) }} />
      <PlayableDrumPiece drumId="ride"   info={DRUM_INFO.ride}   onDown={onDrumDown} onUp={onDrumUp} registerRef={registerDrumRef}
        style={{ left: L(325), bottom: px(120), height: `${Math.round(160 * S * cymS)}px`, zIndex: 1, badgeLeft: L(400), badgeBottom: px(118) }} />
      <PlayableDrumPiece drumId="hihat"  info={DRUM_INFO.hihat}  onDown={onDrumDown} onUp={onDrumUp} registerRef={registerDrumRef}
        style={{ left: L(0),   bottom: px(25),  height: px(210), zIndex: 3, badgeLeft: L(30),  badgeBottom: px(23)  }} />
      <PlayableDrumPiece drumId="kick"   info={DRUM_INFO.kick}   onDown={onDrumDown} onUp={onDrumUp} registerRef={registerDrumRef}
        style={{ left: L(155), bottom: px(0),   width: px(185),  zIndex: 4, badgeLeft: L(240), badgeBottom: px(-2)  }} />
      {/* Toms group: moved way up and slightly right, sit on top of kick */}
      <PlayableDrumPiece drumId="lowTom" info={DRUM_INFO.lowTom} onDown={onDrumDown} onUp={onDrumUp} registerRef={registerDrumRef}
        style={{ left: L(140 + TOMS_DX), bottom: px(155 + TOMS_DY * -1), width: px(90), zIndex: 5, badgeLeft: L(178 + TOMS_DX), badgeBottom: px(153 + TOMS_DY * -1) }} />
      <img src="assets/drums/toms-base.png" alt="Toms base" className="absolute object-contain pointer-events-none"
        style={{ left: L(215 + TOMS_DX), bottom: px(143 + TOMS_DY * -1), width: px(50), zIndex: 6 }} />
      <PlayableDrumPiece drumId="tom"    info={DRUM_INFO.tom}    onDown={onDrumDown} onUp={onDrumUp} registerRef={registerDrumRef}
        style={{ left: L(252 + TOMS_DX), bottom: px(158 + TOMS_DY * -1), width: px(78), zIndex: 7, badgeLeft: L(284 + TOMS_DX), badgeBottom: px(156 + TOMS_DY * -1) }} />
      <PlayableDrumPiece drumId="snare"  info={DRUM_INFO.snare}  onDown={onDrumDown} onUp={onDrumUp} registerRef={registerDrumRef}
        style={{ left: L(85),  bottom: px(12),  width: px(99),   zIndex: 8, badgeLeft: L(123), badgeBottom: px(10)  }} />
    </div>
      </div>
    </div>
  );
}

// ============================================================================
// JamAlongControls: tiny dropdown to pick a JMA Original backing track to jam to.
// Plays the song while the kid plays any instrument on top.
// ============================================================================
function JamAlongControls({ jamTrackId, onPick, audioRef, getAudioGraph }) {
  const [open, setOpen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const sourceWiredRef = useRef(false);
  // Jam Along: all JMA Originals that aren't drum-mode variants for the rhythm
  // game. Includes the new pure drum loops (`jamOnly`). All audio is now in
  // C-diatonic-friendly keys (C major / A minor) so it works with our scale.
  const jamSongs = SONG_LIBRARY.filter(s =>
    s.category === 'JMA Originals' && !s.instrumentMode
  );

  // Pipe the <audio> element through the Web Audio master gain so the backing
  // track is captured by the MP3 recorder. Once wired (first time), the audio
  // element is tied to the AudioContext until page unmount.
  const wireSourceIfNeeded = useCallback(() => {
    if (sourceWiredRef.current) return;
    const el = audioRef.current;
    if (!el || !getAudioGraph) return;
    try {
      const { ctx, masterNode } = getAudioGraph();
      const src = ctx.createMediaElementSource(el);
      src.connect(masterNode);
      sourceWiredRef.current = true;
    } catch (_) { /* element may already be wired or context unavailable */ }
  }, [audioRef, getAudioGraph]);

  // Sync isPlaying with the audio element
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnded = () => setIsPlaying(false);
    a.addEventListener('play', onPlay);
    a.addEventListener('pause', onPause);
    a.addEventListener('ended', onEnded);
    return () => {
      a.removeEventListener('play', onPlay);
      a.removeEventListener('pause', onPause);
      a.removeEventListener('ended', onEnded);
    };
  }, [audioRef, jamTrackId]);

  const handlePick = (id) => {
    wireSourceIfNeeded();
    onPick(id);
    setOpen(false);
    setTimeout(() => {
      const a = audioRef.current;
      if (a) {
        a.currentTime = 0;
        a.volume = 0.55;
        a.play().catch(() => {});
      }
    }, 50);
  };

  const handleStop = () => {
    const a = audioRef.current;
    if (a) { a.pause(); a.currentTime = 0; }
    onPick(null);
  };

  const current = jamSongs.find(s => s.id === jamTrackId);

  return (
    <div className="relative">
      {!current ? (
        <button
          data-testid="jam-along-toggle"
          className="chunky-btn bg-[var(--jma-yellow)] text-[var(--jma-dark)] px-2 py-0.5 md:py-1 flex items-center gap-1 text-[10px] md:text-xs font-bold touch-manipulation"
          onClick={() => setOpen(o => !o)}
        >
          <Headphones className="w-3 h-3" /> Play a Song
        </button>
      ) : (
        <div className="flex items-center gap-1">
          <button
            data-testid="jam-along-stop"
            className="chunky-btn bg-[var(--jma-red)] text-white px-2 py-0.5 md:py-1 flex items-center gap-1 text-[10px] md:text-xs font-bold touch-manipulation"
            onClick={handleStop}
          >
            <Square className="w-3 h-3 fill-current" /> Stop
          </button>
          <span className="text-xs font-bold max-w-[120px] truncate" style={{ color: 'var(--jma-dark)' }}>
            {isPlaying ? '🎶 ' : ''}{current.name}
          </span>
        </div>
      )}
      {open && !current && (
        <div
          data-testid="jam-along-menu"
          className="absolute top-full left-0 mt-1 z-50 bg-white border-2 border-[var(--jma-dark)] rounded-xl shadow-[0_4px_0_0_var(--jma-dark)] p-2 min-w-[180px]"
        >
          <p className="text-[10px] font-bold uppercase tracking-wide opacity-60 mb-1 px-1">Pick a track</p>
          {jamSongs.map(s => (
            <button
              key={s.id}
              data-testid={`jam-pick-${s.id}`}
              onClick={() => handlePick(s.id)}
              className="block w-full text-left px-2 py-1.5 rounded-lg text-sm font-bold hover:bg-[var(--jma-yellow)]/30 touch-manipulation"
              style={{ color: 'var(--jma-dark)' }}
            >
              {s.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function FreePlayPage() {
  const { playBellNote, playDrumSound, initAudioContext, getAudioGraph } = useAudio();
  const recorder = useMp3Recorder(getAudioGraph);

  const [particles, setParticles] = useState([]);
  const [streak, setStreak] = useState(0);
  const [activeTab, setActiveTab] = useState('drums');

  const [isRecording, setIsRecording] = useState(false);
  const [recording, setRecording] = useState([]);
  const [isPlayingBack, setIsPlayingBack] = useState(false);
  const recordStartRef = useRef(null);
  const playbackTimeouts = useRef([]);

  const [guidedMode, setGuidedMode] = useState(false);
  const [guidedSongIdx, setGuidedSongIdx] = useState(0);
  const [guidedStep, setGuidedStep] = useState(0);

  // Jam-along: play a JMA Original backing track while jamming on any instrument
  const [jamTrackId, setJamTrackId] = useState(null);
  const jamAudioRef = useRef(null);
  // Stop jam-along audio when this page unmounts
  useEffect(() => {
    return () => {
      // eslint-disable-next-line react-hooks/exhaustive-deps
      const a = jamAudioRef.current;
      if (a) { try { a.pause(); } catch (_) {} }
    };
  }, []);

  // Refs for imperative image swaps (keyboard access)
  const bellRefsRef = useRef({});
  const drumRefsRef = useRef({});
  const xyloRef = useRef(null);
  const pianoRef = useRef(null);

  const registerBellRef = useCallback((note, ref) => {
    if (ref) bellRefsRef.current[note] = ref;
    else delete bellRefsRef.current[note];
  }, []);
  const registerDrumRef = useCallback((id, ref) => {
    if (ref) drumRefsRef.current[id] = ref;
    else delete drumRefsRef.current[id];
  }, []);

  const audioCtxRef = useRef(null);
  const extraBuffersRef = useRef({});
  const loadedModesRef = useRef(new Set(['bells']));

  const getAudioCtx = useCallback(() => {
    if (!audioCtxRef.current) audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtxRef.current.state === 'suspended') audioCtxRef.current.resume();
    return audioCtxRef.current;
  }, []);

  const preloadMode = useCallback(async (mode) => {
    if (loadedModesRef.current.has(mode)) return;
    const ctx = getAudioCtx();
    const files = mode === 'xylophone' ? XYLO_AUDIO : PIANO_AUDIO;
    await Promise.all(Object.entries(files).map(async ([note, url]) => {
      try { const r = await fetch(url); const b = await r.arrayBuffer(); extraBuffersRef.current[`${mode}_${note}`] = await ctx.decodeAudioData(b); } catch {}
    }));
    loadedModesRef.current.add(mode);
  }, [getAudioCtx]);

  useEffect(() => { if (activeTab !== 'bells' && activeTab !== 'drums') preloadMode(activeTab); }, [activeTab, preloadMode]);

  const playModeSound = useCallback((note) => {
    const mode = activeTab === 'drums' ? 'bells' : activeTab;
    if (mode === 'bells') { playBellNote(note); return; }
    const ctx = getAudioCtx();
    const buffer = extraBuffersRef.current[`${mode}_${note}`];
    if (buffer) { const s = ctx.createBufferSource(); const g = ctx.createGain(); s.buffer = buffer; g.gain.setValueAtTime(0.8, ctx.currentTime); s.connect(g); g.connect(ctx.destination); s.start(0); }
  }, [activeTab, playBellNote, getAudioCtx]);

  const spawnParticles = useCallback((color) => {
    const id = Date.now() + Math.random();
    setParticles(prev => [...prev, { id, color }]);
    setTimeout(() => setParticles(prev => prev.filter(p => p.id !== id)), 600);
  }, []);

  // Bell down: play sound + track state (visual swap already happened in PlayableBell handler)
  const onBellDown = useCallback((note) => {
    initAudioContext();
    playModeSound(note);
    setStreak(prev => prev + 1);
    spawnParticles(BELLS.find(b => b.note === note)?.color || '#FFD700');
    if (isRecording) setRecording(prev => [...prev, { note, type: 'bell', time: Date.now() - recordStartRef.current }]);
    if (guidedMode) {
      const song = GUIDED_SONGS[guidedSongIdx];
      if (song && note === song.notes[guidedStep]) setGuidedStep(prev => prev + 1 >= song.notes.length ? 0 : prev + 1);
    }
    // Stickers: first note + per-bell + instrument tab
    earnSticker('ach_first_note');
    const bellStickerMap = { 'C': 'bell_C', 'D': 'bell_D', 'E': 'bell_E', 'F': 'bell_F', 'G': 'bell_G', 'A': 'bell_A', 'B': 'bell_B', 'High C': 'bell_HC' };
    if (bellStickerMap[note]) earnSticker(bellStickerMap[note]);
    const tabStickerMap = { 'bells': 'inst_bells', 'xylophone': 'inst_xylo', 'piano': 'inst_piano' };
    if (tabStickerMap[activeTab]) earnSticker(tabStickerMap[activeTab]);
    // Outfit stickers tied to instrument tabs
    if (activeTab === 'xylophone') earnSticker('fit_charlie_zoot');
    if (activeTab === 'piano') earnSticker('fit_sharky_zoot');
    // One-Kid Band: played all 4 instruments
    try {
      const played = JSON.parse(localStorage.getItem('jma_instruments_played_v1') || '[]');
      if (!played.includes(activeTab)) {
        played.push(activeTab);
        localStorage.setItem('jma_instruments_played_v1', JSON.stringify(played));
      }
      const hasAll = ['bells', 'xylophone', 'piano', 'drums'].every(t => played.includes(t));
      if (hasAll) earnSticker('ach_one_kid_band');
    } catch (_) {}
    // 🎹 Keyboard Scout Cadet — playing all 8 bells in any tab.
    try {
      const bellsHit = JSON.parse(localStorage.getItem('jma_bells_played_v1') || '[]');
      if (note && !bellsHit.includes(note)) {
        bellsHit.push(note);
        localStorage.setItem('jma_bells_played_v1', JSON.stringify(bellsHit));
      }
      if (bellsHit.length >= 8) earnAchievement('keyboard', 'cadet');
    } catch (_) {}
  }, [initAudioContext, playModeSound, isRecording, guidedMode, guidedSongIdx, guidedStep, spawnParticles, activeTab]);

  const onBellUp = useCallback(() => {}, []);

  const onDrumDown = useCallback((drumId) => {
    initAudioContext();
    playDrumSound(drumId);
    // Crash auto-fires the kick with it — real drummers almost always
    // hit crash + kick together on a downbeat accent, and kids never
    // remember to double-tap. This makes any crash feel "big" without
    // requiring two-handed coordination.
    if (drumId === 'crash') {
      playDrumSound('kick');
      if (isRecording) setRecording(prev => [...prev, { note: 'kick', type: 'drum', time: Date.now() - recordStartRef.current }]);
    }
    setStreak(prev => prev + 1);
    spawnParticles(DRUM_INFO[drumId]?.color || '#E74C3C');
    if (isRecording) setRecording(prev => [...prev, { note: drumId, type: 'drum', time: Date.now() - recordStartRef.current }]);
    // Stickers
    earnSticker('ach_first_note');
    earnSticker('inst_drums');
    earnSticker('fit_charlie_drum_major');
    try {
      const played = JSON.parse(localStorage.getItem('jma_instruments_played_v1') || '[]');
      if (!played.includes('drums')) {
        played.push('drums');
        localStorage.setItem('jma_instruments_played_v1', JSON.stringify(played));
      }
      const hasAll = ['bells', 'xylophone', 'piano', 'drums'].every(t => played.includes(t));
      if (hasAll) earnSticker('ach_one_kid_band');
    } catch (_) {}
  }, [initAudioContext, playDrumSound, isRecording, spawnParticles]);

  const onDrumUp = useCallback(() => {}, []);

  // Keyboard: imperatively toggle pre-rendered frames via refs (idle + pressed)
  useEffect(() => {
    const pressedBells = new Set();
    const pressedDrums = new Set();

    const showPressed = (refs) => {
      if (!refs) return;
      if (refs.idleRef && refs.idleRef.current) refs.idleRef.current.style.opacity = '0';
      if (refs.pressedRef && refs.pressedRef.current) {
        refs.pressedRef.current.style.display = 'block';
        refs.pressedRef.current.style.transform = 'scale(0.95)';
      }
    };
    const showIdle = (refs) => {
      if (!refs) return;
      if (refs.pressedRef && refs.pressedRef.current) {
        refs.pressedRef.current.style.display = '';
        refs.pressedRef.current.style.transform = '';
      }
      if (refs.idleRef && refs.idleRef.current) refs.idleRef.current.style.opacity = '';
    };

    const down = (e) => {
      const key = e.key.toLowerCase();
      const bellNote = KEY_TO_NOTE[e.key];
      if (bellNote && !pressedBells.has(bellNote)) {
        pressedBells.add(bellNote);
        if (activeTab === 'bells') showPressed(bellRefsRef.current[bellNote]);
        else if (activeTab === 'xylophone' && xyloRef.current) xyloRef.current.press(bellNote);
        else if (activeTab === 'piano' && pianoRef.current) pianoRef.current.press(bellNote);
        onBellDown(bellNote);
        return;
      }
      const drumId = DRUM_KEY_MAP[key];
      if (drumId && !pressedDrums.has(drumId)) {
        pressedDrums.add(drumId);
        if (activeTab === 'drums') showPressed(drumRefsRef.current[drumId]);
        onDrumDown(drumId);
      }
    };
    const up = (e) => {
      const key = e.key.toLowerCase();
      const bellNote = KEY_TO_NOTE[e.key];
      if (bellNote) {
        pressedBells.delete(bellNote);
        if (activeTab === 'bells') showIdle(bellRefsRef.current[bellNote]);
        else if (activeTab === 'xylophone' && xyloRef.current) xyloRef.current.release(bellNote);
        else if (activeTab === 'piano' && pianoRef.current) pianoRef.current.release(bellNote);
        onBellUp(bellNote);
      }
      const drumId = DRUM_KEY_MAP[key];
      if (drumId) {
        pressedDrums.delete(drumId);
        if (activeTab === 'drums') showIdle(drumRefsRef.current[drumId]);
        onDrumUp(drumId);
      }
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, [onBellDown, onBellUp, onDrumDown, onDrumUp, activeTab]);

  useEffect(() => { const t = setTimeout(() => setStreak(0), 3000); return () => clearTimeout(t); }, [streak]);

  const startRecording = useCallback(() => { setRecording([]); setIsRecording(true); recordStartRef.current = Date.now(); }, []);
  const stopRecording = useCallback(() => setIsRecording(false), []);

  // Helper to briefly flash the pressed frame for playback (toggles both refs)
  const flashBell = useCallback((note, ms = 120) => {
    const refs = bellRefsRef.current[note];
    if (!refs) return;
    if (refs.idleRef && refs.idleRef.current) refs.idleRef.current.style.opacity = '0';
    if (refs.pressedRef && refs.pressedRef.current) {
      refs.pressedRef.current.style.display = 'block';
      refs.pressedRef.current.style.transform = 'scale(0.95)';
    }
    setTimeout(() => {
      if (refs.pressedRef && refs.pressedRef.current) {
        refs.pressedRef.current.style.display = '';
        refs.pressedRef.current.style.transform = '';
      }
      if (refs.idleRef && refs.idleRef.current) refs.idleRef.current.style.opacity = '';
    }, ms);
  }, []);
  const flashDrum = useCallback((drumId, ms = 120) => {
    const refs = drumRefsRef.current[drumId];
    if (!refs) return;
    if (refs.idleRef && refs.idleRef.current) refs.idleRef.current.style.opacity = '0';
    if (refs.pressedRef && refs.pressedRef.current) {
      refs.pressedRef.current.style.display = 'block';
      refs.pressedRef.current.style.transform = 'scale(0.95)';
    }
    setTimeout(() => {
      if (refs.pressedRef && refs.pressedRef.current) {
        refs.pressedRef.current.style.display = '';
        refs.pressedRef.current.style.transform = '';
      }
      if (refs.idleRef && refs.idleRef.current) refs.idleRef.current.style.opacity = '';
    }, ms);
  }, []);

  const playBack = useCallback(() => {
    if (recording.length === 0 || isPlayingBack) return;
    setIsPlayingBack(true);
    // Steampunk Chunk: played back a recording of 10+ notes
    if (recording.length >= 10) earnSticker('fit_chunk_steampunk');
    playbackTimeouts.current.forEach(t => clearTimeout(t));
    playbackTimeouts.current = [];
    recording.forEach(({ note, type, time }) => {
      playbackTimeouts.current.push(setTimeout(() => {
        if (type === 'drum') { flashDrum(note); onDrumDown(note); }
        else { flashBell(note); onBellDown(note); }
      }, time));
    });
    playbackTimeouts.current.push(setTimeout(() => setIsPlayingBack(false), (recording[recording.length - 1]?.time || 0) + 500));
  }, [recording, isPlayingBack, onBellDown, onDrumDown, flashBell, flashDrum]);

  const currentGuidedSong = GUIDED_SONGS[guidedSongIdx];
  const nextGuidedNote = guidedMode && currentGuidedSong ? currentGuidedSong.notes[guidedStep] : null;
  const isDrumTab = activeTab === 'drums';

  return (
    <div className="min-h-screen flex flex-col relative" data-testid="free-play-page">
      {/* Underwater backdrop (same as HomePage / sub-menus) — button
          borders on the toolbar chips got lost against the JMAtv space
          scene, and the sea has the added bonus of the rising bubbles
          reading like "musical notes floating up." `deep` shifts the
          image up so the sandy floor rolls off the bottom — content
          reads as floating in the water column, not sitting on the
          seabed. */}
      <UnderwaterBackdrop deep />

      <GameHeader title="Jam Session" showHomeButton={true} backLink={{ to: '/create', label: 'Create' }} />
      <FullscreenButton />
      <AnimatePresence>{particles.map(p => <ParticleBurst key={p.id} color={p.color} />)}</AnimatePresence>
      <CharacterReaction streak={streak} />
      <RoomCharacters room="jam-hall" />

      {/* Mobile vertically centers content (was justify-start which left empty space
          below the circle on phones, making it feel "bunched up" at the top).
          Desktop keeps justify-start so the layout doesn't drift around. */}
      <main className="flex-1 flex flex-col items-center justify-center md:justify-start pt-16 md:pt-24 pb-2 px-2">
        {/* Toolbar row — wrapped in a chunky opaque card so the tab pills,
            Play-a-Song button, and Record button always stand out against
            whatever backdrop is behind (underwater sea, space, whatever).
            Before: the white tab pills disappeared into the light-blue
            water; the Play/Record chips lost their dark border too. */}
        <div className="flex flex-wrap items-center justify-center gap-1 md:gap-2 mb-2 md:mb-2 rounded-2xl px-2 py-1 md:px-3 md:py-1.5 relative"
          style={{
            backgroundColor: 'rgba(255,249,230,0.95)',
            border: '3px solid var(--jma-dark)',
            boxShadow: '0 4px 0 0 var(--jma-dark)',
            zIndex: 20,
          }}>
          {/* Inner wrapper is shadow-free — the outer yellow toolbar
              already contains everything. Was `.game-card` before, which
              stacked its own 8px navy shadow underneath and made the
              pills look like they were leaking out the toolbar's bottom. */}
          <div className="flex items-center gap-1">
            {INSTRUMENT_TABS.map(tab => (
              <button key={tab.id} data-testid={`sound-mode-${tab.id}`}
                className={`px-2 py-1 md:px-3 md:py-1.5 rounded-lg text-[10px] md:text-xs font-bold border-2 transition-all touch-manipulation ${activeTab === tab.id ? 'bg-[var(--jma-dark)] text-white border-[var(--jma-dark)]' : 'bg-white border-gray-300'}`}
                onClick={() => setActiveTab(tab.id)}>{tab.label}</button>
            ))}
          </div>
          {/* "Learn a Song" removed from Jam Hall to declutter the top
              toolbar on mobile. Guided mode is still wired up under the hood
              if it's ever re-introduced. */}
          <JamAlongControls
            jamTrackId={jamTrackId}
            onPick={(id) => setJamTrackId(id)}
            audioRef={jamAudioRef}
            getAudioGraph={getAudioGraph}
          />
          {/* Unified "Capture this Jam" — starts BOTH the in-app note loop
              and the audio MP3 recorder in lockstep. After stopping, an inline
              panel offers two clear choices: listen back here, or save the
              MP3 to take home. The kid can do both or either. */}
          <div className="flex items-center gap-1 flex-wrap">
            {!isRecording && !recorder.isRecording ? (
              <button
                data-testid="capture-jam-btn"
                className="chunky-btn text-white px-2 py-0.5 md:py-1 flex items-center gap-1 text-[10px] md:text-xs font-bold touch-manipulation"
                style={{ backgroundColor: '#AF52DE' }}
                onClick={() => {
                  initAudioContext();
                  // Clear any previous loop + MP3 so the new capture is fresh
                  startRecording();
                  recorder.start();
                }}
                disabled={recorder.isProcessing}
              >
                <Mic className="w-3 h-3" /> Record
              </button>
            ) : (
              <button
                data-testid="capture-stop-btn"
                className="chunky-btn bg-[var(--jma-dark)] text-white px-2 py-0.5 md:py-1 flex items-center gap-1 text-[10px] md:text-xs font-bold animate-pulse touch-manipulation"
                onClick={async () => {
                  stopRecording();
                  try { await recorder.stop(); } catch { /* ignore */ }
                }}
              >
                <Square className="w-3 h-3 fill-current" /> Stop · {recorder.secondsLeft}s
              </button>
            )}
            {recorder.isProcessing && (
              <span className="text-[10px] md:text-xs font-bold opacity-70" style={{ color: 'var(--jma-dark)' }}>
                cooking your jam...
              </span>
            )}
            {/* Choice panel — appears only when we have something the kid can do */}
            {!isRecording && !recorder.isRecording && !recorder.isProcessing && (recording.length > 0 || recorder.lastMp3Url) && (
              <>
                {recording.length > 0 && (
                  <button
                    data-testid="capture-listen-btn"
                    className="chunky-btn bg-[var(--jma-green)] text-white px-2 py-0.5 md:py-1 flex items-center gap-1 text-[10px] md:text-xs font-bold touch-manipulation"
                    onClick={playBack}
                    disabled={isPlayingBack}
                  >
                    <Play className="w-3 h-3" /> {isPlayingBack ? 'Playing...' : 'Playback'}
                  </button>
                )}
                {recorder.lastMp3Url && (
                  <button
                    data-testid="capture-save-btn"
                    className="chunky-btn bg-[var(--jma-yellow)] text-[var(--jma-dark)] px-2 py-0.5 md:py-1 flex items-center gap-1 text-[10px] md:text-xs font-bold touch-manipulation"
                    onClick={() => recorder.download(`my-jam-${Date.now()}.mp3`)}
                  >
                    <Download className="w-3 h-3" /> Save
                  </button>
                )}
              </>
            )}
          </div>
          <audio
            ref={jamAudioRef}
            src={jamTrackId ? (SONG_LIBRARY.find(s => s.id === jamTrackId)?.audioUrl || '') : ''}
            preload="auto"
            data-testid="jam-along-audio"
          />
        </div>

        {guidedMode && !isDrumTab && (
          <motion.div className="game-card px-3 py-1 mb-2 flex items-center gap-3" initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
            <button onClick={() => { setGuidedSongIdx(i => Math.max(0, i - 1)); setGuidedStep(0); }}><ChevronRight className="w-4 h-4 rotate-180" /></button>
            <div className="text-center">
              <p className="text-sm font-bold font-display" style={{ color: 'var(--jma-dark)' }}>{currentGuidedSong?.name}</p>
              <p className="text-xs opacity-60">Note {guidedStep + 1} of {currentGuidedSong?.notes.length}</p>
            </div>
            <button onClick={() => { setGuidedSongIdx(i => Math.min(GUIDED_SONGS.length - 1, i + 1)); setGuidedStep(0); }}><ChevronRight className="w-4 h-4" /></button>
            <button onClick={() => setGuidedStep(0)}><RotateCcw className="w-4 h-4" /></button>
          </motion.div>
        )}

        {/* Note feedback (NotationDisplay + played-notes pills) removed
            to give the Jelly Bells circle more breathing room on the page. */}

        {isDrumTab ? (
          <motion.div className="w-full max-w-[1200px] flex items-center justify-center px-2"
            initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
            <DrumKitPlayable onDrumDown={onDrumDown} onDrumUp={onDrumUp} registerDrumRef={registerDrumRef} />
          </motion.div>
        ) : (
          <>
            <motion.div className="w-full max-w-[1400px] flex items-center justify-center px-2 mt-6 md:mt-2" initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
              {activeTab === 'bells' && <BellCircle onDown={onBellDown} onUp={onBellUp} nextGuidedNote={nextGuidedNote} registerRef={registerBellRef} />}
              {activeTab === 'xylophone' && (
                <ResponsiveScaler nativeWidth={840} nativeHeight={440}>
                  <XylophoneInstrument ref={xyloRef} onPlayNote={onBellDown} onNoteUp={onBellUp} highlightedNote={nextGuidedNote} />
                </ResponsiveScaler>
              )}
              {activeTab === 'piano' && (
                <ResponsiveScaler nativeWidth={900} nativeHeight={380}>
                  <PianoInstrument ref={pianoRef} onPlayNote={onBellDown} onNoteUp={onBellUp} highlightedNote={nextGuidedNote} />
                </ResponsiveScaler>
              )}
              {activeTab === 'guitar' && (
                <GuitarInstrument
                  initAudioContext={initAudioContext}
                  getAudioGraph={getAudioGraph}
                  onPlay={() => {
                    // Reuse the same particle/streak feedback the bells
                    // use so the guitar plugs into the rest of Jam Hall.
                    // A neutral "chord" note keeps the guided-song hook
                    // and sticker awards untouched (guitar doesn't have
                    // a per-note guided-song mapping yet).
                    if (isRecording) setRecording(prev => [...prev, { note: 'guitar', type: 'guitar', time: Date.now() - recordStartRef.current }]);
                    spawnParticles('#E74C3C');
                  }}
                />
              )}
            </motion.div>
          </>
        )}

        <motion.div className="mt-2 max-w-md text-center game-card px-3 py-1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
          <p className="text-xs font-medium" style={{ color: 'var(--jma-dark)' }}>
            <span className="font-bold">Controls:</span>{' '}
            {isDrumTab ? 'Q=Hi-Hat  W=Crash  E=Ride  A=Snare  S=Tom1  D=Tom2  X=Kick' : 'Bells: keys 1-8 | Drums always: Q W E A S D X'}
          </p>
        </motion.div>

        {isRecording && (
          <motion.div className="mt-2 flex items-center gap-2" animate={{ opacity: [1, 0.5, 1] }} transition={{ repeat: Infinity, duration: 1 }}>
            <div className="w-3 h-3 rounded-full bg-[var(--jma-red)]" />
            <span className="text-sm font-bold" style={{ color: 'var(--jma-red)' }}>Recording... ({recording.length})</span>
          </motion.div>
        )}
      </main>
    </div>
  );
}

export default FreePlayPage;
