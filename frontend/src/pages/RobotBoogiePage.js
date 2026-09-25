// Robot Boogie — the Incredibox-style mixer game.
//
// Layout goals (v4, Feb 28 2026 pm — user redesign brief):
//   • **Time Machine is the visual centerpiece** — it lives dead-center
//     between the active band and the character lineup, and it's the
//     device that "zaps" a character into Robot Boogie World.
//   • **All 8 characters ALWAYS visible** in a compact lineup at the
//     bottom of the screen (no pagination, no hidden menus).
//   • **Active performers appear at the top** as significantly larger
//     versions of themselves — they resize dynamically so 1 solo star
//     feels HUGE and a full band of 8 still fits.
//   • Layout is fully responsive. Character positions are *not*
//     anchored to background artwork — the background is decoration
//     only. Flexbox rows + auto-sizing so the exact same hierarchy
//     works on phone, tablet, desktop.
//
// Visual flow: Tap compact character below  →  Time Machine flashes
//              →  a big version of that character joins the top band.
//
// Team pairing (unchanged from v3):
//   Stems are grouped by INSTRUMENT into 6 "teams" — bass (Finn), drum
//   (Chunk), guitar (Charlie), lou (Lou plays drum-1 solo), horns (Jazzy
//   + Jellybone paired), synth (Robot 1 + Robot 2 paired). Paired teams
//   share ONE audible stem at a time but both members dance together
//   when both are toggled on. See TEAMS + TEAM_STEMS + CHAR_TO_TEAM.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence, useAnimationControls } from 'framer-motion';
import { RotateCcw } from 'lucide-react';
import { GameHeader } from '../components/GameUI';

import useRobotBoogieAudio from '../hooks/useRobotBoogieAudio';
import useBeatPulse from '../hooks/useBeatPulse';
import LightningStage from '../components/LightningStage';
import { BACKGROUNDS } from '../components/RobotBoogieBackgrounds';
import { earnSticker } from '../hooks/useStickers';

// ============================================================
// Character config
//
// TEAM PAIRING RULES (per user, Feb 28 2026 — v2):
//   • Bass   → Finn only
//   • Drums  → Chunk only (drum-1-1, drum-2, drum-3)
//   • Guitar → Charlie only
//   • Lou    → **solo team**, plays drum-1 (can play WITH Chunk)
//   • Horns  → Jazzy + Dr Jellybone (shared sound slot; both dance)
//   • Synth  → Robot 1 + Robot 2      (shared sound slot; both dance)
//
// Paired teams (`horns`, `synth`) share ONE audible stem at a time.
// Tapping any team member either (a) starts the team if it was off,
// (b) advances to the next stem in the team's cycle if the team was
// already playing, or (c) turns THAT character off — but if the other
// member is still dancing, the sound keeps playing. Both members
// dance together whenever both are toggled on.
//
// `playingSingle` — used for characters whose only extra "playing" pose
// is a single still (Jazzy). Since her source `jazzy-playing.png` was
// drawn as a torso-up crop with no feet, we reuse her neutral image
// here so her legs remain visible while playing; the wobble animation
// applied by <CharacterSlot> still communicates "she's grooving."
// ============================================================
// Display order in both the active band and the compact lineup —
// this is the ONLY source of truth for character order, per user brief:
// Robot 1, Chunk, Dr Jellybone, Finn, Charlie, Lou, Jazzy, Robot 2.
const CHARACTERS = [
  {
    id: 'robot1',
    stems: ['robot-synth-2'],
    frames: 8,
    playingBase: 'assets/robot-boogie/robot1-dancing/robot1-dancing',
    neutral: 'assets/robot-boogie/robot1-neutral/robot1-neutral-01.png',
    color: '#FF3B30',
  },
  {
    id: 'chunk',
    // Chunk reduced to a single stem (robot-drum-3) per user; Lou keeps
    // drum-1. `robot-drum-1-1` and `robot-drum-2` are temporarily
    // orphaned — the audio hook still loads them, they just stay muted
    // until we assign them to a character later.
    stems: ['robot-drum-3'],
    frames: 8,
    playingBase: 'assets/robot-boogie/chunk-playing/chunk-playing',
    neutral: 'assets/robot-boogie/chunk-neutral.png',
    color: '#FF9500',
  },
  {
    id: 'jellybone',
    stems: ['robot-horns-2', 'robot-horns-3'],
    frames: 8,
    playingBase: 'assets/robot-boogie/jellybone-playing/jellybone-playing',
    neutral: 'assets/robot-boogie/jellybone-neutral.png',
    color: '#9B6DE0',
  },
  {
    id: 'finn',
    stems: ['robot-bass'],
    frames: 8,
    playingBase: 'assets/robot-boogie/finn-playing/finn-playing',
    neutral: 'assets/robot-boogie/finn-neutral.png',
    color: '#4285F4',
  },
  {
    id: 'charlie',
    stems: ['robot-gtr'],
    frames: 8,
    playingBase: 'assets/robot-boogie/charlie-playing/charlie-playing',
    neutral: 'assets/robot-boogie/charlie-neutral/charlie-neutral-01.png',
    color: '#E91E63',
  },
  {
    id: 'lou',
    // Lou moved out of the synth team; he's now the drum-1 solo. He
    // can play at the same time as Chunk — different teams, different
    // stems. robot-synth-1 is temporarily orphaned (no one plays it).
    stems: ['robot-drum-1'],
    frames: 6,
    playingBase: 'assets/robot-boogie/lou-dancing/lou-dancing',
    neutral: 'assets/robot-boogie/lou-neutral.png',
    color: '#34A853',
    // Lou's PNGs are TIGHTLY cropped (250×288) — the OTHERS have ~40 %
    // transparent side padding baked into their sources. Without a
    // scale correction Lou would look almost 2× the visual weight of
    // his neighbors. 0.68 brings him back in line.
    slotScale: 0.45,
  },
  {
    id: 'jazzy',
    stems: ['robot-horns-1'],
    frames: 0,
    // NEW jazzy-playing.png (dropped in Feb 28 pm) has legs + red boots
    // + trumpet up — the artwork itself now covers everything we need
    // for the "playing" state, so no more neutral-reuse workaround.
    playingSingle: 'assets/robot-boogie/jazzy-playing.png',
    neutral: 'assets/robot-boogie/jazzy-neutral.png',
    color: '#FFCC00',
  },
  {
    id: 'robot2',
    stems: ['robot-synth-3'],
    frames: 8,
    playingBase: 'assets/robot-boogie/robot2-dancing/robot2-dancing',
    neutral: 'assets/robot-boogie/robot2-neutral/robot2-neutral-01.png',
    color: '#0FA3B1',
  },
];

// Team → member ids. Historically some characters were paired to
// share a stem cycle (Jazzy+Jellybone on horns, robot1+robot2 on
// synths, Chunk+Lou informal drum share) so 8-char sessions didn't
// feel too crazy. User reversed that on Feb 30 (evening): each of the
// 8 characters should feel significant, i.e. each is its own team
// and can be toggled independently.
const TEAMS = {
  finn:      ['finn'],
  chunk:     ['chunk'],
  charlie:   ['charlie'],
  lou:       ['lou'],
  jazzy:     ['jazzy'],
  jellybone: ['jellybone'],
  robot1:    ['robot1'],
  robot2:    ['robot2'],
};

// Aggregated stem cycle per team. Each tap on ANY team member advances
// the team's index into its cycle. Derived so per-character stem edits
// stay the single source of truth.
const TEAM_STEMS = Object.entries(TEAMS).reduce((acc, [teamId, members]) => {
  acc[teamId] = members.flatMap(
    (memberId) => CHARACTERS.find((c) => c.id === memberId).stems
  );
  return acc;
}, {});

const CHAR_TO_TEAM = Object.entries(TEAMS).reduce((acc, [teamId, members]) => {
  members.forEach((id) => { acc[id] = teamId; });
  return acc;
}, {});

// ============================================================
// Time machine — the visual CENTERPIECE of the page. Sits between the
// active band (top) and the character lineup (bottom). Kids see it as
// the device that zaps a character up into Robot Boogie World.
//
// Reel behavior:
//   • Idle when nothing is playing (single time-machine-idle.png).
//   • Loops the 8-frame reel CONTINUOUSLY while any character is active.
//   • Briefly turbo-flashes when a character is toggled (`flashKey`
//     ticks up on every tap, kicking off a short faster-reel burst).
//   • A tap plays a fun Shield-style flourish animation.
// ============================================================
const TIME_MACHINE_ANIMS = [
  { keyframes: { rotate: [0, -14, 12, -8, 6, 0],  scale: [1, 1.08, 1.10, 1.04, 1.02, 1] }, duration: 0.9 },
  { keyframes: { rotate: [0, 360],                scale: [1, 1.10, 1],                     y: [0, -10, 0] }, duration: 0.95 },
  { keyframes: { rotate: [0, 0],                  scale: [1, 1.35, 0.92, 1.12, 1],         y: [0, -14, 0, -6, 0] }, duration: 0.85 },
  { keyframes: { rotateY: [0, 360],               scale: [1, 1.06, 1],                     y: [0, -8, 0] }, duration: 0.95 },
  { keyframes: { x: [0, -10, 10, -7, 7, -4, 4, 0], rotate: [0, -4, 4, -2, 2, 0, 0, 0],     scale: [1, 1.04, 1.04, 1.04, 1.04, 1.02, 1.02, 1] }, duration: 0.95 },
];

function TimeMachine({ anyActive, flashKey, beatSubscribe, tmRef, triggerStab, startRiser, stopRiser }) {
  const [frame, setFrame] = useState(-1);
  const timerRef = useRef(null);
  const flashTimerRef = useRef(null);
  const tmControls = useAnimationControls();
  const hitsRef = useRef(0);
  const glowRef = useRef(null);

  // Continuous reel while any team plays; idle when silent.
  useEffect(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (anyActive) {
      let i = 0;
      setFrame(0);
      timerRef.current = setInterval(() => {
        i = (i + 1) % 8;
        setFrame(i);
      }, 100);
    } else {
      setFrame(-1);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [anyActive]);

  // Turbo flash on every character toggle — a quick burst of animated
  // scale + brightness so kids visually connect their tap with the
  // Time Machine "zapping" the character into the band.
  useEffect(() => {
    if (flashKey === 0) return;
    tmControls.start({
      scale: [1, 1.18, 1],
      transition: { duration: 0.4, ease: 'easeOut' },
    });
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    // Nothing to clean up beyond the animation controls — the reel
    // interval keeps humming.
  }, [flashKey, tmControls]);

  // Steam puff bursts — one added per tap and auto-removed after ~1s.
  // Uses an array of monotonically-increasing keys instead of state ids
  // because we want the puffs to layer, not replace. Tracked in state
  // so React can render/unmount them.
  const [puffs, setPuffs] = useState([]);
  const puffKeyRef = useRef(0);
  // Trigger a puff whenever flashKey changes (every character toggle).
  useEffect(() => {
    if (flashKey === 0) return;
    const key = ++puffKeyRef.current;
    // Two puffs per zap for a fuller burst.
    setPuffs((prev) => [...prev,
      { key: `${key}-a`, offset: -12 + Math.random() * 24, delay: 0 },
      { key: `${key}-b`, offset: -12 + Math.random() * 24, delay: 120 },
    ]);
    const t = setTimeout(() => {
      setPuffs((prev) => prev.slice(2));
    }, 1100);
    return () => clearTimeout(t);
  }, [flashKey]);

  // Shield-style easter-egg flourish on tap.
  //
  // The Time Machine is also playable as an instrument (added Feb 30
  // evening on user request):
  //   • Tap  → a short synth "stab" percussion hit + Shield flourish
  //   • Hold → a rising synth builds tension; on release, a "drop" kick
  const holdTimerRef = useRef(null);
  const holdedRef = useRef(false);
  const HOLD_THRESHOLD_MS = 220;

  const startHold = () => {
    holdedRef.current = false;
    holdTimerRef.current = setTimeout(() => {
      holdedRef.current = true;
      if (startRiser) startRiser();
    }, HOLD_THRESHOLD_MS);
  };
  const endHold = () => {
    if (holdTimerRef.current) { clearTimeout(holdTimerRef.current); holdTimerRef.current = null; }
    if (holdedRef.current) {
      // Was long enough to fire a riser — resolve with a drop.
      if (stopRiser) stopRiser();
      holdedRef.current = false;
    } else {
      // Short tap → percussion stab + Shield flourish.
      if (triggerStab) triggerStab();
      const anim = TIME_MACHINE_ANIMS[hitsRef.current % TIME_MACHINE_ANIMS.length];
      hitsRef.current += 1;
      tmControls.start({
        ...anim.keyframes,
        transition: { duration: anim.duration, ease: 'easeInOut' },
      });
    }
  };
  const cancelHold = () => {
    if (holdTimerRef.current) { clearTimeout(holdTimerRef.current); holdTimerRef.current = null; }
    if (holdedRef.current && stopRiser) stopRiser();
    holdedRef.current = false;
  };

  // Beat-synced under-glow. Uses the imperative subscriber pattern so
  // the machine's glow pulses on every downbeat without triggering a
  // React re-render.
  useEffect(() => {
    if (!beatSubscribe) return undefined;
    return beatSubscribe(({ pulse }) => {
      const el = glowRef.current;
      if (!el) return;
      // pulse: 1 on the downbeat, easing to 0 by phase ~0.35.
      const strength = 0.35 + pulse * 0.75;
      el.style.opacity = String(strength);
      el.style.transform = `translate(-50%, -50%) scale(${0.92 + pulse * 0.28})`;
    });
  }, [beatSubscribe]);

  return (
    <motion.button
      type="button"
      ref={tmRef}
      data-testid="robot-boogie-time-machine"
      aria-label="Time machine"
      onPointerDown={startHold}
      onPointerUp={endHold}
      onPointerCancel={cancelHold}
      onPointerLeave={cancelHold}
      className="relative select-none bg-transparent border-0 p-0 cursor-pointer flex-shrink-0"
      style={{
        // 20 % bigger than v5 (was clamp(170, 26vw, 320)). Time Machine
        // is the visual anchor of the composition — should read as the
        // heaviest object on the screen.
        width: 'clamp(205px, 31vw, 385px)',
        touchAction: 'manipulation',
        // Soft under-glow ring so it feels alive even at idle.
        filter: anyActive
          ? 'drop-shadow(0 0 32px rgba(255,220,120,0.95))'
          : 'drop-shadow(0 8px 18px rgba(0,0,0,0.55))',
        transition: 'filter 220ms ease-out',
      }}
      animate={tmControls}
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.94 }}
    >
      {/* Beat-driven under-glow — bright warm halo that pulses in time
          with the loop. Positioned BEHIND the machine sprite so it reads
          as light spilling out of the coils. */}
      <div
        ref={glowRef}
        aria-hidden="true"
        className="absolute pointer-events-none rounded-full"
        style={{
          left: '50%',
          top: '58%',
          width: '160%',
          height: '55%',
          background:
            'radial-gradient(closest-side, rgba(255,220,120,0.85) 0%, rgba(255,180,90,0.45) 35%, rgba(255,150,80,0.0) 75%)',
          filter: 'blur(4px)',
          transition: 'transform 90ms ease-out, opacity 90ms ease-out',
          opacity: 0.35,
          transform: 'translate(-50%, -50%) scale(1)',
        }}
      />
      <img
        src="assets/robot-boogie/time-machine-idle.png"
        alt=""
        draggable={false}
        className="w-full h-auto pointer-events-none"
        style={{
          // Always keep the idle image in normal flow so it establishes
          // the button's height — the animation frames are absolutely
          // positioned overlays that would otherwise leave the button
          // at zero height. Just hide its pixels while a frame plays.
          visibility: frame === -1 ? 'visible' : 'hidden',
        }}
      />
      {Array.from({ length: 8 }, (_, i) => (
        <img
          key={i}
          src={`assets/robot-boogie/time-machine/time-machine-${String(i + 1).padStart(2, '0')}.png`}
          alt=""
          draggable={false}
          className="absolute inset-0 w-full h-auto pointer-events-none"
          style={{ display: frame === i ? 'block' : 'none' }}
        />
      ))}
      {/* Steam puffs — small white blobs that rise + fade from the
          machine's top vent on every tap. Purely decorative. */}
      {puffs.map((p) => (
        <span
          key={p.key}
          aria-hidden="true"
          className="absolute pointer-events-none rounded-full"
          style={{
            left: `calc(50% + ${p.offset}px)`,
            top: '8%',
            width: '22%',
            height: '22%',
            transform: 'translate(-50%, 0)',
            background: 'radial-gradient(circle at 40% 40%, rgba(255,255,255,0.95) 0%, rgba(220,220,255,0.55) 45%, rgba(220,220,255,0) 75%)',
            filter: 'blur(2px)',
            animation: `robotBoogiePuff 1s ${p.delay}ms ease-out forwards`,
            opacity: 0,
          }}
        />
      ))}
    </motion.button>
  );
}

const CONFETTI_COLORS = ['#FF3B30', '#F2C94C', '#4ac6ff', '#34A853', '#ff3aa8', '#ffe066', '#8A6FDC'];

// ============================================================
// Confetti burst — a small SVG confetti pop that mounts fresh every
// time its `boopKey` prop changes. Each dot picks a random angle and
// distance and fades out along that vector via a per-instance CSS
// keyframe drives its transform. Fires-and-forgets: parent doesn't
// need to unmount it — the animation itself is what "cleans up"
// visually. Rendered inside the CharacterSlot so it inherits the
// character's local coord space.
// ============================================================
function ConfettiBurst({ boopKey, color }) {
  // Deterministic per-boop dots so React doesn't reroll layout mid-run.
  const dots = useMemo(() => {
    if (!boopKey) return [];
    return Array.from({ length: 14 }, (_, i) => {
      const angle = Math.random() * Math.PI * 2;
      const dist  = 60 + Math.random() * 120;
      return {
        dx: (Math.cos(angle) * dist).toFixed(1),
        dy: (Math.sin(angle) * dist).toFixed(1),
        rot: (Math.random() * 720 - 360).toFixed(0),
        color: i % 3 === 0 ? color : CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
        size: (7 + Math.random() * 6).toFixed(1),
        delay: (Math.random() * 60).toFixed(0),
      };
    });
  }, [boopKey, color]);
  if (!boopKey) return null;
  return (
    <div key={boopKey} aria-hidden="true" className="absolute inset-0 pointer-events-none overflow-visible">
      {dots.map((d, i) => (
        <span
          key={i}
          className="absolute"
          style={{
            left: '50%',
            top: '55%',
            width: `${d.size}px`,
            height: `${d.size}px`,
            borderRadius: '2px',
            backgroundColor: d.color,
            border: '1.5px solid rgba(0,0,0,0.7)',
            // CSS custom props feed the keyframe — one animation per
            // dot needs unique end-transform values, so we use CSS
            // custom properties instead of one @keyframes per dot.
            '--dx': `${d.dx}px`,
            '--dy': `${d.dy}px`,
            '--rot': `${d.rot}deg`,
            animation: `confettiFly 900ms ${d.delay}ms ease-out forwards`,
            opacity: 0,
            transform: 'translate(-50%, -50%)',
          }}
        />
      ))}
    </div>
  );
}

// Fun body-flourish animations that fire when the kid boops an active
// character in the top band. Randomly picked per boop so rapid tapping
// keeps feeling fresh. Kept short (≤ 0.6 s) so kids can chain them.
// NOTE: intentionally NO `scale` keys here — the kid may have already
// pinched/wheeled a character to a custom size, and framer-motion
// scale animations would clobber that. We use rotate / y / x only.
const BOOP_ANIMS = [
  { rotate:  [0, 360],                     transition: { duration: 0.55, ease: 'easeInOut' } },
  { rotateY: [0, 360],                     transition: { duration: 0.55, ease: 'easeInOut' } },
  { y:       [0, -30, 0],                  transition: { duration: 0.45, ease: 'easeOut' } },
  { rotate:  [0, -14, 14, -10, 10, -4, 0], transition: { duration: 0.55, ease: 'easeInOut' } },
  { x:       [0, -10, 10, -8, 8, 0],       transition: { duration: 0.45, ease: 'easeInOut' } },
];

// ============================================================
// Character slot — preloads every animation frame at mount so cycling is
// instant, then toggles which frame is displayed via display:none/block.
//
// Top-band CharacterSlots are the "playground" — kids can:
//   • TAP  → boop (fun body-flourish anim + percussion stab sound)
//   • DRAG → move the character anywhere in the stage
//   • WHEEL / pinch → grow or shrink the character
// Toggling a character OFF is done from the bottom lineup tile (kids
// naturally think of that strip as the control panel).
// ============================================================
function CharacterSlot({
  cfg,
  activeStemIndex,
  zapping,
  slotRef,
  beatSubscribe,
  transform,        // { x, y, scale } persisted per-char at page level
  onBoop,           // (id) => void — parent triggers a stab sound + zap flash
  onDrag,           // (id, dx, dy) => void
  onWheel,          // (id, delta) => void
}) {
  const isActive = activeStemIndex >= 0;

  const [animFrame, setAnimFrame] = useState(1);
  useEffect(() => {
    if (!isActive || cfg.frames <= 1) return;
    // 90 ms/frame = ~11 fps. Kid-friendly, matches source art cadence.
    const id = setInterval(() => {
      setAnimFrame((p) => (p % cfg.frames) + 1);
    }, 90);
    return () => clearInterval(id);
  }, [isActive, cfg.frames]);

  // Beat-synced glow — imperatively update the drop-shadow blur radius
  // so the active character pulses in time with the loop. Kept out of
  // React render tree so we don't rerender the sprite stack at 60 fps.
  const glowWrapRef = useRef(null);
  useEffect(() => {
    if (!beatSubscribe || !isActive) return undefined;
    return beatSubscribe(({ pulse }) => {
      const el = glowWrapRef.current;
      if (!el) return;
      // Bigger, brighter halo on the downbeat; smooth ease-out between.
      const blur = 18 + pulse * 22;
      el.style.filter = `drop-shadow(0 0 ${blur.toFixed(1)}px ${cfg.color}dd)`;
    });
  }, [beatSubscribe, isActive, cfg.color]);

  // Boop animation — motion-controls target for the outer button.
  // Triggered on short-tap release. Chained onto our transform so drag
  // position + scale persist across the flourish.
  const boopControls = useAnimationControls();
  const [boopKey, setBoopKey] = useState(0); // Ticks up per boop → drives confetti mount.
  const runBoop = () => {
    // Random pick instead of round-robin — user asked (Feb 30 late)
    // that consecutive boops don't feel predictable.
    const anim = BOOP_ANIMS[Math.floor(Math.random() * BOOP_ANIMS.length)];
    boopControls.start(anim);
    setBoopKey((k) => k + 1);
    if (onBoop) onBoop(cfg.id);
  };

  // Pointer drag / tap / pinch detection (all on the narrow inner hit
  // region, not the full-width button).
  //   • pointerdown → track this pointer; if 1 pointer → drag/tap arm;
  //                   if 2 pointers on the SAME character → enter pinch
  //   • pointermove → drag OR compute pinch delta scale
  //   • pointerup   → if untouched threshold → tap → boop
  //
  // Pinch scales this character only (matches desktop wheel behaviour),
  // not the whole workspace. Two fingers on Charlie scale Charlie, not
  // the band.
  const DRAG_THRESHOLD = 6;
  const pointerStateRef = useRef(null);
  // Map of pointerId → { x, y } for pointers currently touching THIS
  // character's hit-div. Used to detect 2-finger pinch.
  const localPointersRef = useRef(new Map());
  // Active pinch gesture on this character. Null when idle.
  //   { startDist, startScale }
  const pinchRef = useRef(null);

  const handlePointerDown = (e) => {
    if (!isActive) return;
    localPointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch (_) { /* ignore */ }

    // Two-finger pinch on THIS character → scale-mode.
    if (localPointersRef.current.size === 2) {
      const pts = Array.from(localPointersRef.current.values());
      const dx = pts[1].x - pts[0].x;
      const dy = pts[1].y - pts[0].y;
      pinchRef.current = {
        startDist: Math.max(1, Math.hypot(dx, dy)),
        startScale: tScale,
      };
      // Abort any in-progress drag so finger 1 doesn't drag while
      // finger 2 is trying to zoom.
      pointerStateRef.current = null;
      return;
    }

    // Single-finger: arm potential tap / drag.
    pointerStateRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      lastX: e.clientX,
      lastY: e.clientY,
      isDragging: false,
    };
  };

  const handlePointerMove = (e) => {
    if (localPointersRef.current.has(e.pointerId)) {
      localPointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    }
    // Pinch takes priority whenever 2 pointers are down on this char.
    if (localPointersRef.current.size >= 2 && pinchRef.current && onWheel) {
      const pts = Array.from(localPointersRef.current.values()).slice(0, 2);
      const dx = pts[1].x - pts[0].x;
      const dy = pts[1].y - pts[0].y;
      const dist = Math.max(1, Math.hypot(dx, dy));
      const targetScale = pinchRef.current.startScale * (dist / pinchRef.current.startDist);
      // onWheel takes a delta-Y sign (positive → shrink, negative →
      // grow) that the parent turns into a scale delta of ~0.001 per
      // unit. Compute an equivalent delta so scale converges toward
      // targetScale in a few frames — feels responsive without
      // over-driving each frame.
      const scaleDelta = targetScale - tScale;
      // Parent applies stepScale = 1 + (-deltaY * 0.001). To grow by
      // `scaleDelta`, feed deltaY = -scaleDelta * 1000 / tScale.
      const deltaY = -(scaleDelta / Math.max(0.01, tScale)) * 1000;
      onWheel(cfg.id, -deltaY); // onWheel signature: onWheel(id, invertedDeltaY)
      if (e.cancelable) e.preventDefault();
      return;
    }
    // Single-finger drag path
    const st = pointerStateRef.current;
    if (!st || st.pointerId !== e.pointerId) return;
    const dx = e.clientX - st.startX;
    const dy = e.clientY - st.startY;
    if (!st.isDragging && Math.hypot(dx, dy) > DRAG_THRESHOLD) {
      st.isDragging = true;
    }
    if (st.isDragging && onDrag) {
      const stepDx = e.clientX - st.lastX;
      const stepDy = e.clientY - st.lastY;
      st.lastX = e.clientX;
      st.lastY = e.clientY;
      onDrag(cfg.id, stepDx, stepDy);
    }
  };

  const handlePointerUp = (e) => {
    localPointersRef.current.delete(e.pointerId);
    if (localPointersRef.current.size < 2) pinchRef.current = null;
    const st = pointerStateRef.current;
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch (_) { /* ignore */ }
    if (!st || st.pointerId !== e.pointerId) return;
    pointerStateRef.current = null;
    if (!st.isDragging) runBoop();
  };
  // Wheel = scale. deltaY is +positive when scrolling down; invert so
  // scroll-up grows the character (matches "zoom in" intuition).
  const handleWheel = (e) => {
    if (!isActive || !onWheel) return;
    e.preventDefault();
    onWheel(cfg.id, -e.deltaY);
  };

  // Combine per-char persisted transform with the boop flourish.
  const tx = (transform && transform.x) || 0;
  const ty = (transform && transform.y) || 0;
  const tScale = (transform && transform.scale) || 1;

  // Pre-computed list of every playing frame URL for this character.
  // Rendered once as stacked <img> so the browser caches them all up front
  // and cycling to a new frame is a pure display-property flip.
  const frameUrls = useMemo(() => {
    if (!cfg.playingBase || cfg.frames === 0) return [];
    return Array.from({ length: cfg.frames }, (_, i) =>
      `${cfg.playingBase}-${String(i + 1).padStart(2, '0')}.png`
    );
  }, [cfg.playingBase, cfg.frames]);

  return (
    <motion.button
      type="button"
      data-testid={`robot-boogie-char-${cfg.id}`}
      data-active={isActive ? 'true' : 'false'}
      onWheel={handleWheel}
      className="relative flex items-end justify-center cursor-grab active:cursor-grabbing bg-transparent border-0 p-0 select-none focus:outline-none focus-visible:outline-none appearance-none"
      style={{
        width: '100%',
        aspectRatio: '3 / 4',
        touchAction: 'none',
        zIndex: zapping ? 5 : 3,
        outline: 'none',
        WebkitTapHighlightColor: 'transparent',
        // See HIT-TESTING FIX comment below the transformed layer.
        pointerEvents: 'none',
      }}
      animate={boopControls}
    >
      <div
        ref={(node) => {
          // Combined ref: internal glow updates + external lightning aim.
          // We route slotRef to the INNER (scaled) div so that
          // getBoundingClientRect() returns the actual visible rect of
          // the sprite — not the outer un-scaled button. Otherwise
          // scaled characters like Lou get bolts aimed at where their
          // head WOULD be at 1× scale (i.e., way above their actual head).
          glowWrapRef.current = node;
          if (slotRef) {
            if (typeof slotRef === 'function') slotRef(node);
            else slotRef.current = node;
          }
        }}
        className="relative w-full h-full flex items-end justify-center"
        style={{
          filter: isActive
            ? `drop-shadow(0 0 22px ${cfg.color}dd)`
            : 'drop-shadow(0 8px 12px rgba(0,0,0,0.55)) saturate(0.55) brightness(0.75)',
          transition: 'filter 200ms ease-out',
          // Composed transform: (kid drag) × (kid pinch/wheel scale) ×
          // (per-character slot-scale correction, e.g. Lou at 0.45).
          // Order matters: translate first, then scale, so the drag
          // position isn't multiplied by scale.
          transform: `translate3d(${tx}px, ${ty}px, 0) scale(${tScale * (cfg.slotScale || 1)})`,
          transformOrigin: '50% 50%',
        }}
      >
        {/* HIT-TESTING FIX (Feb 2026, refined): a narrow inner hit
            region hosts the actual pointer handlers. ~62% of the slot
            width, centered — matches roughly the visible sprite
            bounds. Sitting INSIDE the transformed layer, so once the
            kid drags the character, the hit region follows the
            character (fixes the "after first drag, wrong character
            moves" bug where the hit-div stayed put while the sprite
            moved). Wrapper + button are pointer-events: none so their
            transparent zones fall through to whichever hit-div is
            actually beneath.

            Also hosts two-finger pinch → scale THIS character (like
            the desktop mouse-wheel does), not the whole workspace. */}
        <div
          data-testid={`robot-boogie-char-hit-${cfg.id}`}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 cursor-grab active:cursor-grabbing"
          style={{
            width: '62%',
            touchAction: 'none',
            pointerEvents: 'auto',
            zIndex: 4,
          }}
          aria-hidden="true"
        />
        {/* Neutral image — shown when the character is off. Always in
            the DOM so the browser has it cached the moment we toggle.
            REVERTED to `object-contain` — object-cover was cropping
            character heads at multi-row counts. Head clipping is a
            hard NO. Horizontal closeness is handled by negative
            margins on the outer wrapper (see the map() in the main
            component), which is a pure X-axis change. */}
        <img
          src={cfg.neutral}
          alt=""
          draggable={false}
          className="max-w-full max-h-full object-contain object-bottom pointer-events-none"
          style={{ display: isActive ? 'none' : 'block' }}
        />

        {/* Single "playing" still (Jazzy). */}
        {cfg.playingSingle && (
          <img
            src={cfg.playingSingle}
            alt=""
            draggable={false}
            className="max-w-full max-h-full object-contain object-bottom pointer-events-none absolute inset-0 m-auto"
            style={{
              display: isActive ? 'block' : 'none',
              animation: isActive ? 'jazzyWobble 0.6s ease-in-out infinite' : 'none',
              transformOrigin: '50% 90%',
            }}
          />
        )}

        {/* All frame images stacked — only the current one is
            display:block. Browser caches them all at first render. */}
        {frameUrls.map((url, i) => (
          <img
            key={url}
            src={url}
            alt=""
            draggable={false}
            className="max-w-full max-h-full object-contain object-bottom pointer-events-none absolute inset-0 m-auto"
            style={{
              display: isActive && animFrame === i + 1 ? 'block' : 'none',
            }}
          />
        ))}

        {/* Confetti burst — spawned every time the kid boops this
            character. Each `boopKey` value spawns a fresh set of ~14
            colored dots that fly out along a random vector and fade
            out via a CSS keyframe. Keyed by boopKey so React unmounts
            the previous burst cleanly when a new boop lands. */}
        <ConfettiBurst boopKey={boopKey} color={cfg.color} />

        {/* Zap-in flash — a bright color bloom the moment the bolt
            hits this character. The actual lightning bolt itself is
            drawn by <LightningStage> at the page level so it can span
            all the way from the Time Machine. */}
        <AnimatePresence>
          {zapping && (
            <motion.div
              key="hit-flash"
              aria-hidden="true"
              className="absolute inset-0 pointer-events-none"
              style={{
                background: `radial-gradient(closest-side, ${cfg.color}88 0%, ${cfg.color}22 40%, transparent 70%)`,
                mixBlendMode: 'screen',
              }}
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1.05 }}
              exit={{ opacity: 0, scale: 1.15 }}
              transition={{ duration: 0.28 }}
            />
          )}
        </AnimatePresence>
      </div>
    </motion.button>
  );
}

// ============================================================
// Compact character — the bottom-lineup tile. Small, always-visible,
// tappable. Shows the neutral sprite (never animates) plus a bright
// team-colored ring when this character is "selected" (dancing in the
// top band). This is the ONLY tap target on the page — everything else
// is decoration.
// ============================================================
function CompactChar({ cfg, selected, onClick, zapping, beatSubscribe, bobOffset = 0 }) {
  // Imperative bob — inactive characters lean into the beat but idle
  // characters that aren't dancing still peek up on the downbeat. Uses
  // the beat subscription so we DON'T rerender the tile every frame.
  const spriteRef = useRef(null);
  useEffect(() => {
    if (!beatSubscribe) return undefined;
    return beatSubscribe(({ pulse, phase }) => {
      const el = spriteRef.current;
      if (!el) return;
      // Two-beat sway using phase; combined with per-beat pulse hop.
      const sway = Math.sin((phase + bobOffset) * Math.PI * 2) * 2.2;
      const hop = -pulse * (selected ? 8 : 5);
      el.style.transform = `translate3d(${sway.toFixed(2)}px, ${hop.toFixed(2)}px, 0)`;
    });
  }, [beatSubscribe, bobOffset, selected]);

  return (
    <motion.button
      type="button"
      data-testid={`robot-boogie-char-${cfg.id}`}
      data-active={selected ? 'true' : 'false'}
      onClick={() => onClick(cfg.id)}
      aria-label={cfg.id}
      className="relative flex items-end justify-center cursor-pointer bg-transparent border-0 p-0 select-none flex-shrink-0 focus:outline-none focus-visible:outline-none appearance-none"
      style={{
        // Compact strip: 8 tiles fit on any width via clamp. Aspect
        // keeps their proportions consistent with the top performers.
        width: 'clamp(48px, 10vw, 96px)',
        aspectRatio: '3 / 4',
        touchAction: 'manipulation',
        outline: 'none',
        WebkitTapHighlightColor: 'transparent',
      }}
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.9 }}
    >
      {/* Selection ring / stage puck. Sits BEHIND the sprite so the
          character stands on top of it. */}
      <div
        aria-hidden="true"
        className="absolute pointer-events-none rounded-full"
        style={{
          bottom: '2%',
          left: '10%',
          right: '10%',
          height: '14%',
          background: selected
            ? `radial-gradient(closest-side, ${cfg.color}cc, ${cfg.color}00 70%)`
            : 'radial-gradient(closest-side, rgba(0,0,0,0.45), transparent 70%)',
          transition: 'background 200ms ease-out',
        }}
      />

      <img
        ref={spriteRef}
        src={cfg.neutral}
        alt=""
        draggable={false}
        className="max-w-full max-h-full object-contain object-bottom pointer-events-none relative"
        style={{
          filter: selected
            ? `drop-shadow(0 0 12px ${cfg.color}dd)`
            : 'saturate(0.6) brightness(0.85) drop-shadow(0 4px 6px rgba(0,0,0,0.5))',
          transition: 'filter 200ms ease-out',
          willChange: 'transform',
          // Slot-scale correction (Lou is tightly cropped, others padded).
          ...(cfg.slotScale ? { maxHeight: `${cfg.slotScale * 100}%` } : null),
        }}
      />

      {/* NOTE: the previous "zap flash" rounded-rect halo on activation
          was removed (Feb 30) — user found the momentary orange box
          around the compact tile distracting after clicking. The
          character's own color-matched drop-shadow glow (applied to
          the img filter when `selected`) is enough signal. */}
    </motion.button>
  );
}

// ============================================================
// Main page
// ============================================================
const EMPTY_DANCING = CHARACTERS.reduce((acc, c) => { acc[c.id] = false; return acc; }, {});
const EMPTY_TEAM_STEM = Object.keys(TEAMS).reduce((acc, t) => { acc[t] = null; return acc; }, {});

export default function RobotBoogiePage() {
  const {
    setStemActive, muteAll, getAudioClock,
    triggerStab, startRiser, stopRiser, setPlaybackRate,
  } = useRobotBoogieAudio();
  // Beat phase offset locked to 0.5 — this hits what the user hears as
  // the on-beat given how the audio's startTime + loop-duration meshes
  // with the visual clock. Kept as a constant here for clarity.
  const beatOffset = 0.5;
  const { subscribe: beatSubscribe } = useBeatPulse(getAudioClock, beatOffset);

  // Background scene — auto-cycles every 35s through the curated scenes
  // in the app's flat art style. No UI to pick; kids just enjoy the
  // changing vibe. Starting index randomized so identical sessions don't
  // always begin the same way. The `% BACKGROUNDS.length` guard on the
  // lookup below is defensive against HMR-preserved state after the
  // registry shrinks (e.g. we recently dropped BgArcade because its
  // marquee bulbs clashed with the arcade-style header — a stale
  // bgIndex=2 would otherwise crash with "reading 'Comp' of undefined").
  const [bgIndex, setBgIndex] = useState(() => Math.floor(Math.random() * BACKGROUNDS.length));
  useEffect(() => {
    const id = setInterval(() => {
      setBgIndex((i) => (i + 1) % BACKGROUNDS.length);
    }, 35000);
    return () => clearInterval(id);
  }, []);
  const BgComp = (BACKGROUNDS[bgIndex % BACKGROUNDS.length] || BACKGROUNDS[0]).Comp;

  // Per-character: is this character currently DANCING? Dancing is
  // independent per character — both members of a paired team can dance
  // at the same time. See TEAM PAIRING RULES in the CHARACTERS comment.
  const [dancing, setDancing] = useState(() => ({ ...EMPTY_DANCING }));

  // Per-team: index into TEAM_STEMS[teamId] for the ONE stem the team
  // is currently playing (or null if the team is silent). Every tap on
  // ANY team member advances this index by one; when the last dancer
  // leaves the team, the index goes back to null.
  const [teamStemIndex, setTeamStemIndex] = useState(() => ({ ...EMPTY_TEAM_STEM }));

  // Track which character was most recently zapped (for the LightningBolt
  // overlay on the character slot).
  const [zappingId, setZappingId] = useState(null);

  // Ticks up every time a character is toggled — used by TimeMachine to
  // fire its "zap" burst animation without needing to know which char
  // was tapped.
  const [flashKey, setFlashKey] = useState(0);

  // Per-character transforms applied to the top-band CharacterSlot.
  // Kids can drag active characters around the stage and wheel/pinch
  // to grow/shrink them. Values live at the page level so they PERSIST
  // across activate/deactivate (a character kept in the same spot the
  // kid parked them) and are wiped by Reset. Not persisted to storage
  // — start fresh every session.
  const [charTransforms, setCharTransforms] = useState({});
  const handleCharDrag = useCallback((charId, dx, dy) => {
    setCharTransforms((prev) => {
      const cur = prev[charId] || { x: 0, y: 0, scale: 1 };
      // Clamp drag so characters can't leave the visible stage area.
      // Y clamp tightened Feb 2026 (from ±140 → ±60) because the active-
      // band container isn't tall enough to accommodate a big vertical
      // drag range — kids were dragging heads or feet outside the band
      // and getting them visually clipped by neighboring UI. ±60 gives
      // meaningful "wander" room while keeping the whole character on
      // the stage. The band's overflow: visible ensures a tiny overshoot
      // during the drag frame doesn't clip either.
      const nx = Math.max(-360, Math.min(360, cur.x + dx));
      const ny = Math.max(-60, Math.min(60, cur.y + dy));
      return { ...prev, [charId]: { ...cur, x: nx, y: ny } };
    });
  }, []);
  const handleCharWheel = useCallback((charId, deltaSigned) => {
    // deltaSigned is +up (grow) / -down (shrink); ~120 units per notch
    // is browser default so a ~10% step feels right.
    const step = deltaSigned > 0 ? 1.08 : 1 / 1.08;
    setCharTransforms((prev) => {
      const cur = prev[charId] || { x: 0, y: 0, scale: 1 };
      const nextScale = Math.max(0.5, Math.min(1.6, cur.scale * step));
      return { ...prev, [charId]: { ...cur, scale: nextScale } };
    });
  }, []);
  const handleCharBoop = useCallback(() => {
    // Boop = fun body flourish + a stab sound + a Time Machine flash.
    if (triggerStab) triggerStab();
    setFlashKey((k) => k + 1);
  }, [triggerStab]);

  const handleCharacterClick = useCallback((charId) => {
    const teamId = CHAR_TO_TEAM[charId];
    const cycle = TEAM_STEMS[teamId];
    const wasDancing = dancing[charId];
    const curIdx = teamStemIndex[teamId];

    // Team members OTHER than the tapped one that are still dancing
    // AFTER this tap. Used to decide whether the sound keeps playing
    // when the tapped char turns off.
    const otherMembersStillDancing = TEAMS[teamId]
      .filter((id) => id !== charId)
      .some((id) => dancing[id]);

    if (!wasDancing) {
      // Turning THIS character ON.
      setDancing((prev) => ({ ...prev, [charId]: true }));

      // Advance the team's stem cycle. If nobody was playing, start at
      // index 0; otherwise advance by one (wrapping around).
      const nextIdx = curIdx === null ? 0 : (curIdx + 1) % cycle.length;
      if (curIdx !== null) setStemActive(cycle[curIdx], false);
      setStemActive(cycle[nextIdx], true);
      setTeamStemIndex((prev) => ({ ...prev, [teamId]: nextIdx }));

      setZappingId(charId);
      setTimeout(() => setZappingId(null), 360);

      // Sticker awards — first time each Club Member joins the jam,
      // and once for having the whole 8-piece band dancing at once.
      earnSticker(`boogie_${charId}`);
      // Count dancers AFTER this activation (dancing state above is
      // async; do the arithmetic here directly).
      const willBeDancingCount = Object.values(dancing).filter(Boolean).length + 1;
      if (willBeDancingCount === CHARACTERS.length) {
        earnSticker('boogie_full_band');
      }
    } else {
      // Turning THIS character OFF.
      setDancing((prev) => ({ ...prev, [charId]: false }));

      if (!otherMembersStillDancing) {
        // Last dancer in the team just left → silence the team.
        if (curIdx !== null) setStemActive(cycle[curIdx], false);
        setTeamStemIndex((prev) => ({ ...prev, [teamId]: null }));
      }
      // Else: leave the current stem playing — the other dancer keeps
      // holding the groove.
    }

    // Every tap — on or off — kicks off the Time Machine's flash burst
    // so kids visually connect their action with the centerpiece.
    setFlashKey((k) => k + 1);
  }, [dancing, teamStemIndex, setStemActive]);

  // Silly-speed slider — continuous 0.9 → 1.2 (user narrowed the
  // extremes on Feb 30 late-night; the previous 0.8/1.5 range was
  // too warpy at the ends). Changes ramp over 80 ms so scrubbing
  // doesn't click.
  const SPEED_MIN = 0.9;
  const SPEED_MAX = 1.2;
  const [speed, setSpeed] = useState(1.0);
  const handleSpeedChange = useCallback((e) => {
    const rate = Math.max(SPEED_MIN, Math.min(SPEED_MAX, parseFloat(e.target.value)));
    setSpeed(rate);
    if (setPlaybackRate) setPlaybackRate(rate);
  }, [setPlaybackRate]);

  const handleReset = useCallback(() => {
    muteAll();
    setDancing({ ...EMPTY_DANCING });
    setTeamStemIndex({ ...EMPTY_TEAM_STEM });
    // Also wipe any drag/scale kids applied so they start fresh.
    setCharTransforms({});
    // Reset tempo back to normal — kids often scrub the slider and
    // Reset should be a true clean slate.
    setSpeed(1.0);
    if (setPlaybackRate) setPlaybackRate(1.0);
  }, [muteAll, setPlaybackRate]);

  const activeCount = useMemo(
    () => Object.values(teamStemIndex).filter((v) => v !== null).length,
    [teamStemIndex]
  );
  const totalTeams = Object.keys(TEAMS).length;

  const activeChars = useMemo(
    () => CHARACTERS.filter((c) => dancing[c.id]),
    [dancing]
  );

  // Refs used by <LightningStage> to compute bolt endpoints. `stageRef`
  // is the containing DOM node whose local coord space the SVG uses;
  // `timeMachineRef` is the source (bolt origin); `charSlotRefsRef`
  // holds a Map<charId, RefObject<HTMLElement>> for each active char's
  // rendered slot so we can aim the bolt at their chest.
  const stageRef = useRef(null);
  const timeMachineRef = useRef(null);
  const charSlotRefsRef = useRef(new Map());
  // Get or create a persistent ref for a given char id.
  const getSlotRef = useCallback((id) => {
    const map = charSlotRefsRef.current;
    if (!map.has(id)) {
      map.set(id, { current: null });
    }
    return map.get(id);
  }, []);

  // Color lookup for lightning bolts (matches each char's team color).
  const charColors = useMemo(() => {
    const m = {};
    CHARACTERS.forEach((c) => { m[c.id] = c.color; });
    return m;
  }, []);

  // Background world-pulse — pulses the vignette + starfield brightness
  // on every downbeat. Imperative to keep the render tree quiet.
  const worldPulseRef = useRef(null);
  const floorTilePulseRef = useRef(null);
  useEffect(() => {
    if (!beatSubscribe) return undefined;
    return beatSubscribe(({ pulse, beat }) => {
      const w = worldPulseRef.current;
      if (w) {
        w.style.opacity = String(0.20 + pulse * 0.35);
      }
      const f = floorTilePulseRef.current;
      if (f) {
        // Alternate hue on every other beat for a disco-floor flicker.
        // Guard against beat === -1 (audio not yet playing).
        const isOdd = beat > 0 && beat % 2 === 1;
        f.style.background = isOdd
          ? `radial-gradient(ellipse at 50% 78%, rgba(120,220,255,${0.08 + pulse * 0.30}) 0%, transparent 55%)`
          : `radial-gradient(ellipse at 50% 78%, rgba(255,180,90,${0.08 + pulse * 0.30}) 0%, transparent 55%)`;
      }
    });
  }, [beatSubscribe]);

  return (
    <div
      data-testid="robot-boogie-page"
      className="relative overflow-hidden flex flex-col"
      style={{
        // Fallback base — the actual scene is drawn as inline SVG by
        // <BgComp /> below so we can keep it consistent with the app's
        // flat-cartoon art style and switch scenes at runtime.
        background: '#050518',
        // Lock the whole page to the visible viewport so the character
        // lineup at the bottom never falls off-screen. `100dvh` is the
        // iOS-safe "dynamic viewport" unit that excludes Safari's
        // collapsing address bar — 100vh alone would make the layout
        // exceed the reachable area on iPhone. Fallback to 100vh for
        // older browsers.
        height: '100vh',
        // eslint-disable-next-line no-dupe-keys
        height: '100dvh',
        minHeight: '100vh',
        maxHeight: '100dvh',
      }}
    >
      {/* Background scene (flat SVG, matches app art style) */}
      <BgComp />

      {/* Vignette so the characters read against any background */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at 50% 40%, transparent 40%, rgba(0,0,0,0.55) 100%)',
        }}
      />

      {/* Beat-driven world pulse — brightens the whole scene on the
          downbeat. Sits above the vignette so it can raise ambient
          light without washing out characters. Imperatively updated.
          Muted opacity + soft-light blend so the dark stage stays
          moody. */}
      <div
        ref={worldPulseRef}
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at 50% 45%, rgba(255,220,120,0.35) 0%, rgba(180,120,255,0.15) 40%, transparent 75%)',
          mixBlendMode: 'soft-light',
          opacity: 0.28,
          transition: 'opacity 90ms ease-out',
        }}
      />

      {/* Title restored — the marquee-lights background was the conflict,
          not the arcade header itself. That bg has been dropped from
          the cycle registry so lab + navy are the only two left. */}
      <GameHeader title="ROBOT BOOGIE" showHomeButton={true} />

      {/* Reset chip + speed slider row. Positioned below the fixed
          GameHeader — pt-20 on mobile (the "Back" button pill is ~76px
          tall on phones and the pt-14 we had before caused the title,
          reset, and speed slider to visually stack on narrow screens).
          flex-wrap so if a very narrow viewport still can't fit both
          chips on one line they stack cleanly instead of overlapping. */}
      <div className="relative z-10 flex items-center justify-center flex-wrap gap-2 md:gap-3 pt-20 md:pt-16 pb-0">
        <button
          type="button"
          data-testid="robot-boogie-reset"
          onClick={handleReset}
          className="px-3 py-1.5 rounded-full font-black text-xs uppercase tracking-wider flex items-center gap-1.5 border-2 cursor-pointer"
          style={{
            backgroundColor: '#FF3B30',
            color: 'white',
            borderColor: 'var(--jma-dark)',
            boxShadow: '0 3px 0 0 var(--jma-dark)',
          }}
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reset
        </button>
        <div
          data-testid="robot-boogie-speed-wrap"
          className="flex items-center gap-2 px-3 py-1.5 rounded-full border-2"
          style={{
            backgroundColor: '#F2C94C',
            borderColor: 'var(--jma-dark)',
            boxShadow: '0 3px 0 0 var(--jma-dark)',
          }}
        >
          <span aria-hidden="true" className="text-xs font-black text-[color:var(--jma-dark)]">🐢</span>
          <input
            data-testid="robot-boogie-speed"
            type="range"
            min={SPEED_MIN}
            max={SPEED_MAX}
            step="0.05"
            value={speed}
            onChange={handleSpeedChange}
            aria-label={`Speed ${speed.toFixed(2)}x`}
            className="rb-speed-slider"
          />
          <span aria-hidden="true" className="text-xs font-black text-[color:var(--jma-dark)]">🐇</span>
        </div>
      </div>

      {/* ==== MAIN STAGE ==== 
          Three vertically stacked zones — active band up top, Time
          Machine in the middle, tappable lineup at the bottom. All
          three sit inside a max-width column so the composition stays
          coherent on ultra-wide screens.

          `min-h-0` is critical: it lets this flex-1 child actually
          shrink INSIDE the height-locked outer page. Without it, the
          child clings to its natural content size and pushes the
          lineup off-screen on shorter phones. */}
      <div ref={stageRef}
           className="relative z-10 flex-1 min-h-0 flex flex-col items-center w-full mx-auto px-2 md:px-4 pb-2"
           style={{ maxWidth: '1200px' }}>

        {/* Lightning bolts — drawn OVER the entire stage from the Time
            Machine "mouth" up to every active character. Sits above
            most artwork but below tappable buttons via pointer-events:
            none. Character z-index still wins for taps. */}
        <LightningStage
          stageRef={stageRef}
          sourceRef={timeMachineRef}
          charRefsRef={charSlotRefsRef}
          activeIds={activeChars.map((c) => c.id)}
          zappingId={zappingId}
          charColors={charColors}
          beatSubscribe={beatSubscribe}
          measureEpoch={JSON.stringify(charTransforms)}
        />
        {/* ---- Active band (top) ----
            Flex-wrap so we get a second row automatically once there
            are 5+ dancers. Zero horizontal gap between dancers by
            design — the transparent whitespace inside each character's
            3:4 slot already gives plenty of breathing room.

            overflow: visible (not hidden) so a kid dragging a character
            up or down a few pixels doesn't get their head / feet clipped
            at the container edge. Drag-clamp bounds in
            handleCharDrag() keep them from wandering too far anyway. */}
        <div
          data-testid="robot-boogie-active-band"
          className="w-full flex-1 min-h-0 flex flex-wrap items-end justify-center content-center gap-0 pt-2 pb-0"
          style={{
            // Active band takes ONLY whatever vertical space is left
            // after the Time Machine + lineup have claimed theirs
            // (both are flex-shrink-0 below). `flex-1 min-h-0` lets
            // this zone shrink freely so the waiting-area lineup at
            // the bottom is guaranteed to stay on-screen — even on
            // short phones or landscape orientation.
            // No hard minHeight — characters gracefully overflow-hide
            // if the viewport is genuinely too small, but the LINEUP
            // never disappears. This was the whole point of the fix.
            overflow: 'hidden',
          }}
        >
          {activeChars.length === 0 ? (
            <motion.div
              key="empty-hint"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center self-center pointer-events-none w-full"
              style={{ color: 'white' }}
            >
              <div
                className="font-black uppercase tracking-widest text-sm md:text-base"
                style={{ opacity: 0.85 }}
              >
                Tap a Club Member below
              </div>
              <div
                className="font-bold text-xs md:text-sm"
                style={{ opacity: 0.65, marginTop: '4px' }}
              >
                The Time Machine will zap them onto the stage ⚡
              </div>
            </motion.div>
          ) : (
            <AnimatePresence mode="popLayout" initial={false}>
              {activeChars.map((cfg) => {
                const n = activeChars.length;
                // Widths + negative horizontal margins do the "closer
                // together" work: each wrapper is BIGGER than we want
                // it to render, with a negative margin on each side
                // that pulls neighboring wrappers into overlap. The
                // sprites' baked-in transparent side-padding then
                // overlaps invisibly, so characters visually touch.
                // The wrap math (which uses margin-box aka outer size)
                // stays correct because outer = width + 2 × margin.
                //
                // n=4 fixed (Feb 30 pm): keep in a SINGLE row so the
                // 2×2 wrap doesn't push the Time Machine down into the
                // bottom lineup on 1280×800.
                //
                //   n | widthPct |  maxW | negMarginPx | outer = wrap size
                //   1 |   55%    | 440px |      0      |   440
                //   2 |   50%    | 440px |    -30      |   380
                //   3 |   36%    | 380px |    -25      |   330
                //   4 |   28%    | 340px |    -22      |   296   (4×296=1184<1200 ✓)
                //  5-6|   24%    | 260px |    -22      |   216   (3-per-row wrap, height ~347px)
                //  7-8|   20%    | 220px |    -20      |   180   (4-per-row wrap, height ~293px)
                let widthPct, maxW, negPx;
                if (n === 1)      { widthPct = '55%'; maxW = '440px'; negPx = 0; }
                else if (n === 2) { widthPct = '50%'; maxW = '440px'; negPx = 30; }
                else if (n === 3) { widthPct = '36%'; maxW = '380px'; negPx = 25; }
                else if (n === 4) { widthPct = '28%'; maxW = '340px'; negPx = 22; }
                else if (n <= 6)  { widthPct = '24%'; maxW = '260px'; negPx = 22; }
                else               { widthPct = '20%'; maxW = '220px'; negPx = 20; }

                return (
                  <motion.div
                    key={cfg.id}
                    layout
                    initial={{ opacity: 0, y: 60, scale: 0.6 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 40, scale: 0.6 }}
                    transition={{ type: 'spring', stiffness: 260, damping: 24 }}
                    className="min-w-0 flex-shrink-0"
                    style={{
                      width: widthPct,
                      maxWidth: maxW,
                      marginLeft: `-${negPx}px`,
                      marginRight: `-${negPx}px`,
                      // Wrapper is pointer-events: none so its overlapping
                      // side-margins don't swallow taps meant for a
                      // neighboring character. The narrow inner hit-div
                      // inside CharacterSlot is the sole pointer target.
                      pointerEvents: 'none',
                    }}
                  >
                    <CharacterSlot
                      cfg={cfg}
                      activeStemIndex={0}
                      zapping={zappingId === cfg.id}
                      slotRef={getSlotRef(cfg.id)}
                      beatSubscribe={beatSubscribe}
                      transform={charTransforms[cfg.id]}
                      onBoop={handleCharBoop}
                      onDrag={handleCharDrag}
                      onWheel={handleCharWheel}
                    />
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
        </div>

        {/* ---- Time Machine (centerpiece) ----
            Sits on a glowing "dais" — an elliptical stage puck that
            reads as a raised pedestal. Also anchors the SVG lightning
            bolts that shoot up from the machine "mouth".
            `flex-shrink-0` guarantees the machine keeps its natural
            size no matter how many characters wrap in the active band
            — it never gets squeezed out of view. */}
        <div
          className="w-full flex justify-center items-center py-0 relative flex-shrink-0"
          data-testid="robot-boogie-time-machine-zone"
        >
          {/* Pedestal / dais under the machine — an elliptical stage
              puck that reads as a raised lab platform. Also serves as
              the visual "floor" the machine stands on. */}
          <div
            aria-hidden="true"
            className="absolute pointer-events-none"
            style={{
              bottom: '2%',
              width: 'clamp(255px, 41vw, 500px)',
              height: '32px',
              background:
                'radial-gradient(ellipse at 50% 50%, rgba(255,220,120,0.45) 0%, rgba(120,80,180,0.35) 40%, rgba(0,0,0,0.0) 75%)',
              filter: 'blur(2px)',
            }}
          />
          {/* Soft halo behind the machine so it reads as the anchor of
              the composition. Scales with the machine itself. */}
          <div
            aria-hidden="true"
            className="absolute pointer-events-none"
            style={{
              width: 'clamp(265px, 43vw, 520px)',
              aspectRatio: '2 / 1',
              background:
                'radial-gradient(ellipse at center, rgba(255,220,120,0.28) 0%, rgba(255,220,120,0.10) 40%, transparent 70%)',
              filter: 'blur(6px)',
            }}
          />
          <TimeMachine
            anyActive={activeCount > 0}
            flashKey={flashKey}
            tmRef={timeMachineRef}
            beatSubscribe={beatSubscribe}
            triggerStab={triggerStab}
            startRiser={startRiser}
            stopRiser={stopRiser}
          />
        </div>

        {/* ---- Character lineup (bottom, always 8) ----
            Sits on a beat-driven "disco floor" — a soft ellipse behind
            the whole strip that flickers hue on every other beat.
            `flex-shrink-0` guarantees the "waiting area" ALWAYS stays
            visible at the bottom of the viewport regardless of how
            many characters are on stage or how tall the viewport is. */}
        <div className="relative w-full flex-shrink-0">
          <div
            ref={floorTilePulseRef}
            aria-hidden="true"
            className="absolute inset-x-0 pointer-events-none"
            style={{
              bottom: '-6px',
              top: '30%',
              transition: 'background 90ms ease-out',
            }}
          />
          <div
            data-testid="robot-boogie-lineup"
            className="relative w-full flex justify-center items-end gap-0 md:gap-1 pt-0 pb-2"
          >
            {CHARACTERS.map((cfg, i) => (
              <CompactChar
                key={cfg.id}
                cfg={cfg}
                selected={!!dancing[cfg.id]}
                onClick={handleCharacterClick}
                zapping={zappingId === cfg.id}
                beatSubscribe={beatSubscribe}
                bobOffset={i * 0.11}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
