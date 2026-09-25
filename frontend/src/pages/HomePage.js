// JMA Home — based on the partner's reference image.
// Hero: Finn (cello) - SHIELD - Charlie (guitar) on top, no extra wording.
// Body: three big tappable cards (PLAY · LEARN · CREATE), with the icon as
// the centerpiece and only minimal corner accents.
// Bottom: a single helper pill explaining each section.

import { motion, useAnimationControls } from 'framer-motion';
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import RankBadge from '../components/RankBadge';
import StickerSpotlight from '../components/StickerSpotlight';
import PracticeStreakChip from '../components/PracticeStreakChip';
import NextMissionPanel from '../components/NextMissionPanel';
import RetroTV from '../components/RetroTV';
import BlimpFlyby from '../components/BlimpFlyby';
import HomeProgressCard from '../components/HomeProgressCard';

// Easter-egg animation variants for the shield. Click cycles through them.
const SHIELD_ANIMS = [
  { name: 'wobble',  keyframes: { rotate: [0, -14, 12, -8, 6, 0],         scale: [1, 1.06, 1.08, 1.04, 1.02, 1], y: [0, 0, 0, 0, 0, 0] }, duration: 0.9 },
  { name: 'spin',    keyframes: { rotate: [0, 360],                        scale: [1, 1.1, 1],                 y: [0, -10, 0] },        duration: 0.95 },
  { name: 'pop',     keyframes: { rotate: [0, 0],                          scale: [1, 1.35, 0.9, 1.12, 1],     y: [0, -16, 0, -6, 0] }, duration: 0.85 },
  { name: 'flipx',   keyframes: { rotateY: [0, 360],                       scale: [1, 1.05, 1],                y: [0, -8, 0] },         duration: 0.95 },
  { name: 'shimmy',  keyframes: { x: [0, -10, 10, -7, 7, -4, 4, 0],        rotate: [0, -4, 4, -2, 2, 0, 0, 0], scale: [1, 1.04, 1.04, 1.04, 1.04, 1.02, 1.02, 1] }, duration: 0.95 },
  { name: 'jelly',   keyframes: { scaleX: [1, 1.25, 0.85, 1.12, 0.95, 1],  scaleY: [1, 0.78, 1.22, 0.92, 1.05, 1], y: [0, -4, 4, -2, 0, 0] }, duration: 0.9 },
];

// Floating music notes/stars in the sky strip behind the hero row.
const SKY_DOODLES = [
  { src: 'assets/home/play/note.png',         top: 22, left: 6,   w: 3.0, dur: 3.0, delay: 0.0 },
  { src: 'assets/home/learn/noteaccent.png',  top: 8,  left: 18,  w: 3.4, dur: 2.4, delay: 0.4 },
  { src: 'assets/home/create/note accent.png', top: 18, left: 30, w: 2.8, dur: 3.4, delay: 0.7 },
  { src: 'assets/home/play/note.png',         top: 12, left: 72,  w: 3.0, dur: 2.8, delay: 0.2 },
  { src: 'assets/home/learn/noteaccent1.png', top: 22, left: 82,  w: 3.4, dur: 3.2, delay: 0.5 },
  { src: 'assets/home/create/note accent 2.png', top: 9, left: 92, w: 2.8, dur: 2.6, delay: 0.3 },
];

const CARDS = [
  {
    id: 'play',
    title: 'PLAY',
    path: '/play',
    icon: 'assets/home/play/boombox.png',
    iconAlt: 'Boombox',
    bg: '#FFC83D',
    border: '#0A2540',
    shadow: '#F39C12',
    titleColor: '#0A2540',
    titleStroke: '#FFFFFF',
    iconShift: { x: -4, y: 2, rot: -3 },
    iconWidthPct: 95,
    // Watercolor blobs (behind everything)
    blobs: [
      { color: '#FFB300', top: -10, left: -8,  size: 55, opacity: 0.55 },
      { color: '#FFE082', top: 50,  left: 70,  size: 60, opacity: 0.55 },
      { color: '#FF6B35', top: 70,  left: -12, size: 45, opacity: 0.35 },
    ],
    accents: [
      // BEHIND icon (z:1) — soft/large
      { src: 'assets/home/play/note cluster 1.png', top: 8,  left: 58, w: 38, rot: 8,  anim: 'sway',    dur: 3.2, delay: 0.1, z: 1, opacity: 0.85 },
      { src: 'assets/home/play/drum.png',           top: 62, left: -8, w: 38, rot: -10, anim: 'bob',    dur: 3.0, delay: 0.0, z: 1 },
      { src: 'assets/home/play/key cluster.png',    top: 56, left: 70, w: 30, rot: 12, anim: 'sway',    dur: 2.8, delay: 0.4, z: 1, opacity: 0.95 },
      // IN FRONT of icon (z:20)
      { src: 'assets/home/play/stars.png',          top: -6, left: 70, w: 28, rot: 8,  anim: 'twinkle', dur: 1.6, delay: 0.2, z: 20 },
      { src: 'assets/home/play/star.png',           top: 4,  left: -4, w: 16, rot: -14, anim: 'twinkle',dur: 1.4, delay: 0.5, z: 20 },
      { src: 'assets/home/play/note.png',           top: 32, left: 88, w: 14, rot: 18, anim: 'bob',    dur: 2.4, delay: 0.3, z: 20 },
      { src: 'assets/home/play/accent dot.png',     top: 22, left: 8,  w: 7,  rot: 0,  anim: 'twinkle', dur: 1.8, delay: 0.6, z: 20 },
      { src: 'assets/home/play/note.png',           top: 78, left: 38, w: 11, rot: -22, anim: 'bob',   dur: 2.6, delay: 0.2, z: 20 },
    ],
    sfx: 'assets/audio/sfx-home-play.mp3',
  },
  {
    id: 'learn',
    title: 'LEARN',
    path: '/learn',
    icon: 'assets/home/learn/storybook no accents.png',
    iconAlt: 'Storybook',
    bg: '#C8A8F2',
    border: '#0A2540',
    shadow: '#9B6DE0',
    titleColor: '#0A2540',
    titleStroke: '#FFFFFF',
    // Storybook art has more padding around the subject — boost width AND
    // remove the upward y-shift so it visually centers like the boombox/beat-pad.
    iconShift: { x: 3, y: 0, rot: 2 },
    iconWidthPct: 118,
    blobs: [
      { color: '#7B4FE0', top: -8,  left: 60,  size: 55, opacity: 0.45 },
      { color: '#E6D5FF', top: 35,  left: -15, size: 60, opacity: 0.6 },
      { color: '#BB86FC', top: 70,  left: 65,  size: 50, opacity: 0.4 },
    ],
    accents: [
      // BEHIND
      { src: 'assets/home/learn/starandcircleaccent.png', top: -4,  left: -6, w: 36, rot: -8, anim: 'twinkle', dur: 2.0, delay: 0.1, z: 1 },
      { src: 'assets/home/learn/starandswooshaccent.png', top: 58,  left: 68, w: 40, rot: 12, anim: 'sway',   dur: 2.8, delay: 0.4, z: 1 },
      { src: 'assets/home/learn/accent4.png',             top: 36,  left: 78, w: 26, rot: 14, anim: 'sway',   dur: 3.0, delay: 0.5, z: 1, opacity: 0.9 },
      { src: 'assets/home/learn/accent3.png',             top: 50,  left: -10, w: 24, rot: -20, anim: 'sway', dur: 2.6, delay: 0.2, z: 1, opacity: 0.9 },
      // IN FRONT
      { src: 'assets/home/learn/noteaccent.png',          top: 8,   left: 78, w: 22, rot: 10, anim: 'sway',   dur: 2.4, delay: 0.3, z: 20 },
      { src: 'assets/home/learn/noteaccent1.png',         top: 36,  left: 4,  w: 16, rot: -12, anim: 'bob',   dur: 2.6, delay: 0.5, z: 20 },
      { src: 'assets/home/learn/staraccent.png',          top: 80,  left: 6,  w: 14, rot: -6, anim: 'twinkle',dur: 1.6, delay: 0.6, z: 20 },
      { src: 'assets/home/learn/staraccent.png',          top: 18,  left: 50, w: 9,  rot: 18, anim: 'twinkle',dur: 1.8, delay: 0.2, z: 20 },
    ],
    sfx: 'assets/audio/sfx-home-learn.mp3',
  },
  {
    id: 'create',
    title: 'CREATE',
    path: '/create',
    icon: 'assets/home/create/beat pad.png',
    iconAlt: 'Beat Pad',
    bg: '#7DD3C0',
    border: '#0A2540',
    shadow: '#3FA68B',
    titleColor: '#0A2540',
    titleStroke: '#FFFFFF',
    iconShift: { x: 5, y: -2, rot: -2 },
    iconWidthPct: 95,
    blobs: [
      { color: '#2E9E8B', top: -8,  left: 65,  size: 50, opacity: 0.45 },
      { color: '#B8E8DC', top: 30,  left: -10, size: 55, opacity: 0.6 },
      { color: '#FF8FB1', top: 75,  left: 60,  size: 45, opacity: 0.35 },
    ],
    accents: [
      // BEHIND
      { src: 'assets/home/create/heartbeat 1.png',  top: 56, left: -6,  w: 60, rot: -4, anim: 'pulse',  dur: 1.6, delay: 0.0, z: 1, opacity: 0.85 },
      { src: 'assets/home/create/accent 4.png',     top: 8,  left: 70,  w: 30, rot: 14, anim: 'sway',   dur: 2.8, delay: 0.3, z: 1 },
      { src: 'assets/home/create/accent 1.png',     top: 36, left: 80,  w: 24, rot: -10, anim: 'sway',  dur: 3.0, delay: 0.5, z: 1, opacity: 0.9 },
      { src: 'assets/home/create/dots accent.png',  top: 70, left: 75,  w: 28, rot: 8,  anim: 'twinkle', dur: 1.8, delay: 0.4, z: 1, opacity: 0.85 },
      // IN FRONT
      { src: 'assets/home/create/stars accent.png', top: -4, left: 66,  w: 30, rot: 10, anim: 'twinkle',dur: 1.6, delay: 0.2, z: 20 },
      { src: 'assets/home/create/note accent.png',  top: 4,  left: -2,  w: 22, rot: -16, anim: 'sway',  dur: 2.4, delay: 0.1, z: 20 },
      { src: 'assets/home/create/note accent 2.png',top: 38, left: 6,   w: 14, rot: 16, anim: 'bob',    dur: 2.6, delay: 0.5, z: 20 },
      { src: 'assets/home/create/heartbeat 2.png',  top: 82, left: 30,  w: 18, rot: 0,  anim: 'pulse',  dur: 1.4, delay: 0.3, z: 20, opacity: 0.95 },
    ],
    sfx: 'assets/audio/sfx-home-create.mp3',
  },
];

const ANIMS = {
  bob:     { y: [0, -6, 0] },
  sway:    { rotate: [-5, 5, -5], y: [0, -3, 0] },
  twinkle: { scale: [1, 1.12, 1], opacity: [0.9, 1, 0.9] },
  pulse:   { scale: [1, 1.06, 1] },
};

function Accent({ a }) {
  return (
    <motion.img
      src={a.src} alt="" draggable={false} loading="lazy"
      className="absolute pointer-events-none select-none"
      style={{
        top: `${a.top}%`, left: `${a.left}%`, width: `${a.w}%`,
        filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.22))',
        zIndex: a.z ?? 1,
        opacity: a.opacity ?? 1,
        rotate: `${a.rot || 0}deg`,
      }}
      animate={ANIMS[a.anim] || ANIMS.bob}
      transition={{ duration: a.dur, delay: a.delay, repeat: Infinity, ease: 'easeInOut' }}
    />
  );
}

function Blob({ b }) {
  return (
    <div
      className="absolute pointer-events-none"
      style={{
        top: `${b.top}%`,
        left: `${b.left}%`,
        width: `${b.size}%`,
        aspectRatio: '1 / 1',
        background: `radial-gradient(circle, ${b.color} 0%, ${b.color}00 65%)`,
        opacity: b.opacity ?? 0.5,
        filter: 'blur(8px)',
        zIndex: 0,
        mixBlendMode: 'multiply',
      }}
    />
  );
}

function PrimaryCard({ card, index, navigate }) {
  const [hovered, setHovered] = useState(false);

  const handleClick = () => {
    if (card.sfx) {
      try {
        const audio = new Audio(card.sfx);
        // Soft tap-sfx so home-card clicks don't blast — kids tap these a lot
        audio.volume = 0.42;
        audio.play().catch(() => { /* autoplay rejected — proceed without SFX */ });
      } catch { /* ignore */ }
    }
    const delay = card.sfx ? 240 : 0;
    setTimeout(() => navigate(card.path), delay);
  };

  return (
    <motion.button
      type="button"
      data-testid={`home-card-${card.id}`}
      onClick={handleClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="relative rounded-[26px] cursor-pointer w-full bg-transparent border-0 p-0"
      initial={{ y: 50, opacity: 0, scale: 0.92 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      transition={{ delay: 0.18 + index * 0.1, type: 'spring', stiffness: 220 }}
      whileHover={{ y: -6 }}
      whileTap={{ scale: 0.97 }}
    >
      <div
        className="relative rounded-[26px] flex flex-col items-center justify-end overflow-hidden"
        style={{
          background: card.bg,
          border: `5px solid ${card.border}`,
          boxShadow: `0 10px 0 0 ${card.shadow}, 0 13px 0 0 ${card.border}`,
          aspectRatio: '1 / 1.05',
          padding: 'clamp(12px, 2.2vw, 22px)',
        }}
      >
        {/* Watercolor blobs (deepest layer) */}
        {(card.blobs || []).map((b, i) => <Blob key={`b-${i}`} b={b} />)}

        {/* Subtle inner radial highlight */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(circle at 50% 30%, rgba(255,255,255,0.32) 0%, transparent 50%)', zIndex: 0 }}
        />

        {/* Decorative accents — z controls in-front vs behind icon */}
        {card.accents.map((a, i) => <Accent key={`a-${i}`} a={a} />)}

        {/* HUGE primary icon (off-center, per-card sized via iconWidthPct) */}
        <motion.img
          src={card.icon}
          alt={card.iconAlt}
          draggable={false}
          loading="eager"
          className="relative object-contain select-none"
          style={{
            width: `min(${card.iconWidthPct || 100}%, ${Math.round((card.iconWidthPct || 100) * 5.6)}px)`,
            height: 'auto',
            maxHeight: '88%',
            marginBottom: 'clamp(2px, 1vw, 10px)',
            filter: 'drop-shadow(0 12px 12px rgba(0,0,0,0.28))',
            zIndex: 10,
            transform: `translate(${card.iconShift?.x || 0}%, ${card.iconShift?.y || 0}%) rotate(${card.iconShift?.rot || 0}deg)`,
          }}
          animate={hovered
            ? { scale: 1.06, y: -6, rotate: (card.iconShift?.rot || 0) - 2 }
            : { y: [0, -6, 0], rotate: card.iconShift?.rot || 0 }
          }
          transition={
            hovered
              ? { type: 'spring', stiffness: 240 }
              : { y: { repeat: Infinity, duration: 2.6, ease: 'easeInOut', delay: index * 0.2 } }
          }
        />

        {/* Title */}
        <h2
          className="relative font-black font-display leading-none text-center"
          style={{
            fontSize: 'clamp(28px, 5.2vw, 56px)',
            color: card.titleColor,
            WebkitTextStroke: `clamp(2px, 0.4vw, 4px) ${card.titleStroke}`,
            paintOrder: 'stroke fill',
            letterSpacing: '0.02em',
            zIndex: 30,
          }}
        >
          {card.title}
        </h2>
      </div>
    </motion.button>
  );
}

function HomePage() {
  const navigate = useNavigate();
  const shieldControls = useAnimationControls();
  const shieldHitsRef = useRef(0);

  // Shield intro: tilt-in spring on first paint. After that, clicks replace
  // the animation with one of SHIELD_ANIMS for the easter-egg flourish.
  useEffect(() => {
    shieldControls.start({
      y: 0,
      opacity: 1,
      rotate: 0,
      scale: 1,
      transition: { type: 'spring', stiffness: 200 },
    });
  }, [shieldControls]);

  const triggerShieldEasterEgg = () => {
    // Cycle deterministically through the animations so kids get variety
    // every tap without repeating the same one back-to-back.
    const idx = shieldHitsRef.current % SHIELD_ANIMS.length;
    shieldHitsRef.current += 1;
    const anim = SHIELD_ANIMS[idx];
    shieldControls.start({
      ...anim.keyframes,
      transition: { duration: anim.duration, ease: 'easeInOut' },
    });
  };

  return (
    <div
      data-testid="home-page"
      className="min-h-screen w-full flex flex-col items-center px-3 sm:px-6 pt-4 pb-6 relative overflow-x-hidden"
      style={{
        // Fallback color underneath the underwater layer so the top of
        // the page never flashes white during initial paint / while the
        // PNG is loading. Deep-sea navy.
        backgroundColor: '#02243F',
      }}
    >
      {/* Underwater backdrop — locked to the VIEWPORT (position: fixed)
          instead of the whole page height, so we always see the full
          composed underwater scene and never zoom it to fill a very
          tall document. Ken Burns is deliberately gentle (1.0 → 1.03). */}
      <div
        aria-hidden="true"
        className="fixed inset-0 z-0 home-underwater-bg-layer pointer-events-none"
        style={{
          backgroundImage: `url(${process.env.PUBLIC_URL || ''}/assets/backgrounds/underwater.png)`,
        }}
      />
      {/* Top vignette — softens the crop line on ultrawide desktops
          where the top of the underwater PNG would otherwise look cut. */}
      <div
        aria-hidden="true"
        className="fixed inset-x-0 top-0 z-0 pointer-events-none"
        style={{
          height: '32vh',
          background:
            'linear-gradient(180deg, rgba(2,36,63,0.55) 0%, rgba(2,36,63,0.15) 60%, transparent 100%)',
        }}
      />
      {/* Diagonal god-ray shafts — barely-there striped screen overlay. */}
      <div
        aria-hidden="true"
        className="fixed inset-0 z-0 pointer-events-none home-underwater-shafts"
      />
      {/* Rising bubbles — CSS-only. 18 bubbles at varied sizes, positions,
          durations, and delays so the loop reads as random. */}
      <div
        aria-hidden="true"
        className="fixed inset-0 z-0 pointer-events-none overflow-hidden"
      >
        {[
          { left: '3%',  size: 10, dur: 13, delay: 0 },
          { left: '8%',  size: 16, dur: 15, delay: 3 },
          { left: '14%', size: 8,  dur: 11, delay: 6.5 },
          { left: '18%', size: 22, dur: 18, delay: 1.5 },
          { left: '24%', size: 12, dur: 14, delay: 4 },
          { left: '30%', size: 6,  dur: 10, delay: 8 },
          { left: '36%', size: 18, dur: 16, delay: 2 },
          { left: '42%', size: 10, dur: 12, delay: 5.5 },
          { left: '48%', size: 24, dur: 19, delay: 0.5 },
          { left: '54%', size: 8,  dur: 11, delay: 7 },
          { left: '60%', size: 14, dur: 14, delay: 3.5 },
          { left: '66%', size: 20, dur: 17, delay: 1 },
          { left: '72%', size: 10, dur: 13, delay: 6 },
          { left: '78%', size: 6,  dur: 10, delay: 2.5 },
          { left: '84%', size: 16, dur: 15, delay: 4.5 },
          { left: '89%', size: 12, dur: 12, delay: 8.5 },
          { left: '94%', size: 22, dur: 18, delay: 0 },
          { left: '97%', size: 8,  dur: 11, delay: 5 },
        ].map((b, i) => {
          // Negative animation-delay = pre-progress the CSS keyframes.
          // Instead of every bubble waiting `b.delay` seconds to rise
          // from the bottom (which left ~8s of dead sky at the top on
          // first paint), we seed each one already mid-rise. The
          // `(delay + dur/2) % dur` seed keeps the original per-bubble
          // variation but spreads starting positions across the whole
          // vertical column so the ocean feels alive from t=0.
          const preRun = ((b.delay + b.dur * 0.5) % b.dur).toFixed(2);
          return (
            <span
              key={i}
              className="home-underwater-bubble"
              style={{
                left: b.left,
                width: b.size,
                height: b.size,
                animationDuration: `${b.dur}s`,
                animationDelay: `-${preRun}s`,
              }}
            />
          );
        })}
      </div>
      {/* Drifting Jelly Rocks blimp — behind everything */}
      <BlimpFlyby />

      {/* Tiny "For Grown-Ups" link — top-right, low visual weight. Lets a
          parent OR teacher on the kid Home reach the marketing/pitch page
          without hunting for it. Called "Grown-Ups" instead of "Parents"
          so it doesn't feel weird in a classroom context. Deliberately
          small so kids don't tap it. */}
      <button
        type="button"
        data-testid="home-for-parents-link"
        onClick={() => navigate('/for-parents')}
        className="absolute top-3 right-3 md:top-4 md:right-6 z-20 text-[10px] md:text-xs font-black uppercase tracking-wider px-3 py-1.5 rounded-full transition-transform hover:scale-105 active:scale-95"
        style={{
          backgroundColor: 'rgba(255,255,255,0.7)',
          color: '#5A2989',
          border: '1.5px solid rgba(90,41,137,0.25)',
          backdropFilter: 'blur(4px)',
        }}
      >
        For Grown-Ups
      </button>

      {/* Sky doodles — float behind the hero */}
      {SKY_DOODLES.map((d, i) => (
        <motion.img
          key={i}
          src={d.src} alt="" draggable={false} loading="lazy"
          className="absolute pointer-events-none select-none opacity-75"
          style={{ top: `${d.top}%`, left: `${d.left}%`, width: `${d.w}%`, zIndex: 0 }}
          animate={{ y: [0, -12, 0], rotate: [-5, 5, -5] }}
          transition={{ duration: d.dur, delay: d.delay, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}

      {/* HERO ROW — Finn · Shield · Charlie */}
      <div className="relative z-10 flex items-center justify-center gap-2 sm:gap-4 md:gap-8 mt-2 mb-2 w-full">
        <motion.img
          src="assets/characters/finn-danger.png"
          alt="Finn"
          data-testid="home-finn"
          className="object-contain drop-shadow-lg cursor-pointer"
          style={{ width: 'clamp(61px, 11vw, 131px)', height: 'auto' }}
          initial={{ x: -50, opacity: 0 }}
          animate={{ x: 0, opacity: 1, y: [0, -8, 0] }}
          transition={{
            x: { delay: 0.2, type: 'spring' },
            opacity: { delay: 0.2 },
            y: { repeat: Infinity, duration: 2.4, ease: 'easeInOut' },
          }}
          whileHover={{ scale: 1.08, rotate: -4 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => navigate('/fun-facts')}
        />

        <motion.img
          src="assets/ui/logo.png"
          alt="Jelly of the Month Club Music Academy"
          data-testid="jma-logo"
          className="object-contain cursor-pointer"
          style={{
            width: 'clamp(120px, 22vw, 280px)',
            height: 'auto',
            filter: 'drop-shadow(0 6px 10px rgba(0,0,0,0.18))',
            transformOrigin: 'center',
          }}
          initial={{ y: -30, opacity: 0, rotate: -4 }}
          animate={shieldControls}
          onClick={triggerShieldEasterEgg}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
        />

        <motion.img
          src="assets/characters/charlie.png"
          alt="Charlie"
          data-testid="home-charlie"
          className="object-contain drop-shadow-lg cursor-pointer"
          style={{ width: 'clamp(80px, 14vw, 170px)', height: 'auto' }}
          initial={{ x: 50, opacity: 0 }}
          animate={{ x: 0, opacity: 1, y: [0, -8, 0] }}
          transition={{
            x: { delay: 0.3, type: 'spring' },
            opacity: { delay: 0.3 },
            y: { repeat: Infinity, duration: 2.6, ease: 'easeInOut', delay: 0.4 },
          }}
          whileHover={{ scale: 1.08, rotate: 4 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => navigate('/fun-facts')}
        />
      </div>

      {/* Progress strip — rank + streak + stickers in one clean pill.
          PracticeStreakChip is folded INSIDE HomeProgressCard now, so
          the Home page only carries the single-row banner + Next Mission
          + the three big destination cards. */}
      <div className="relative z-10 mb-3 md:mb-4 w-full max-w-4xl">
        <HomeProgressCard />
      </div>

      {/* Next Mission — single recommended action driven off the rank engine.
          Sits BETWEEN the rank row and the 3 main category cards because
          it's the most important kid-facing signal: "do this one thing next."
          Hidden when the kid has earned every achievement. */}
      <div className="relative z-10 mb-4 md:mb-5 w-full max-w-4xl px-2">
        <NextMissionPanel />
      </div>

      {/* THREE PRIMARY CARDS */}
      <div className="relative z-10 w-full max-w-6xl grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6 px-1">
        {CARDS.map((card, idx) => (
          <PrimaryCard key={card.id} card={card} index={idx} navigate={navigate} />
        ))}
      </div>

      {/* JMAtv retro CRT — small, deliberately placed BELOW the 3 main
          category cards so kids don't bypass the interactive features.
          Per the partner's "TV-first cannibalization" concern, this lives
          in the periphery; option 4 from the placement discussion. */}
      <RetroTV />
    </div>
  );
}

export default HomePage;
