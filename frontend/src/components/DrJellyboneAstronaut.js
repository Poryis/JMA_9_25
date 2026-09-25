// DrJellyboneAstronaut — Dr. Jellybone drifting through the JMAtv sky
// wearing a proper enclosed astronaut helmet.
//
// The helmet is split into TWO SVG layers so it reads as a real 3D
// enclosure, not a floating decal:
//   1. HelmetBackShell — sits BEHIND the Jellybone PNG. It provides the
//      dome silhouette + neck collar that peek out around his head,
//      plus the oxygen tube and backpack tank.
//   2. HelmetFrontVisor — sits IN FRONT of the Jellybone PNG. It's the
//      transparent glass visor with rim, tint, glints, plus the side
//      communicator box and antenna with a blinking red tip.
//
// The sprite is a 3-frame idle cycle. The helmet layers are anchored
// with percentages to the sprite bounding box so they scale with the
// character regardless of drift scale.

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

const FRAMES = [
  'assets/characters/dr-jellybone-astro-1.png',
  'assets/characters/dr-jellybone-astro-2.png',
  'assets/characters/dr-jellybone-astro-3.png',
];

const RIM = '#0A2540';        // JMAtv dark navy — helmet + hardware color
const RIM_LIGHT = '#1E3A5F';  // Slightly lighter navy for depth
const GLASS = 'rgba(200,230,255,0.14)';
const GLASS_TINT = 'rgba(140,200,255,0.08)';

function makeLap(direction) {
  const startYvh = 6 + Math.random() * 28;
  const sign = Math.random() < 0.5 ? -1 : 1;
  const delta = sign * (4 + Math.random() * 10);
  const endYvh = Math.max(2, Math.min(38, startYvh + delta));
  // Parallax: smaller sprites drift slower (feel farther away),
  // bigger ones drift faster (feel closer). Duration is inversely
  // proportional to scale so a 0.32 scale takes ~2x longer than 0.55.
  const scale = 0.32 + Math.random() * 0.23;
  const durationSec = (18 + Math.random() * 6) / scale;
  return {
    direction,
    startYvh,
    endYvh,
    durationSec,
    scale,
  };
}

// Helmet dimensions relative to the sprite bounding box.
// Sprite is ~300x600 (tall). Head bulb sits roughly y=2%..y=42%, x=15%..80%.
// Helmet needs to cover that head region with a little room to spare.
const HELMET = {
  left: '1.5%',
  top: '-4%',
  width: '91%',
  aspectRatio: '1 / 1', // roughly square helmet dome
};

// Back layer: dome silhouette peeking around head, neck collar,
// oxygen tube snaking down, and life-support backpack tank.
function HelmetBackShell() {
  return (
    <div aria-hidden="true" className="absolute pointer-events-none" style={{ inset: 0, zIndex: 0 }}>
      {/* Backpack tank — anchored behind the tentacle mass */}
      <svg
        viewBox="0 0 100 100"
        style={{
          position: 'absolute',
          left: '55%',
          top: '40%',
          width: '30%',
          aspectRatio: '1 / 1.4',
          overflow: 'visible',
        }}
      >
        {/* Tank body */}
        <rect x="30" y="10" width="40" height="70" rx="10"
          fill={RIM_LIGHT} stroke={RIM} strokeWidth="3" />
        {/* Tank cap */}
        <rect x="36" y="4" width="28" height="10" rx="4"
          fill={RIM} />
        {/* Tank highlight stripe */}
        <rect x="36" y="22" width="4" height="52" rx="2"
          fill="rgba(255,255,255,0.35)" />
        {/* Valve/gauge */}
        <circle cx="50" cy="88" r="6" fill={RIM} stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" />
        <circle cx="50" cy="88" r="2" fill="#F8D000" />
      </svg>

      {/* Oxygen tube — curves from backpack up to helmet collar */}
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        style={{
          position: 'absolute',
          left: '38%',
          top: '30%',
          width: '38%',
          height: '25%',
          overflow: 'visible',
        }}
      >
        <path
          d="M 88 90 Q 60 80 40 45 Q 30 20 12 12"
          fill="none"
          stroke={RIM}
          strokeWidth="7"
          strokeLinecap="round"
        />
        <path
          d="M 88 90 Q 60 80 40 45 Q 30 20 12 12"
          fill="none"
          stroke={RIM_LIGHT}
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeDasharray="6 6"
          opacity="0.7"
        />
      </svg>

      {/* Dome BACK silhouette — sits behind head so rim peeks around it.
          Slightly larger than the visor in front so we get a visible
          enclosure ring. */}
      <div className="absolute" style={{ ...HELMET }}>
        <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
          {/* Outer helmet shell — solid dark, cut off at the bottom
              where the collar meets */}
          <path
            d="M 6 55
               A 44 46 0 0 1 94 55
               L 94 68
               L 6 68 Z"
            fill={RIM}
          />
          {/* Inner lining ring — lighter navy for depth */}
          <path
            d="M 10 55
               A 40 42 0 0 1 90 55
               L 90 65
               L 10 65 Z"
            fill={RIM_LIGHT}
          />

          {/* Neck collar — thick ring under the head that reads as
              the seal between helmet + suit */}
          <ellipse cx="50" cy="72" rx="34" ry="8" fill={RIM} />
          <ellipse cx="50" cy="72" rx="30" ry="5" fill={RIM_LIGHT} />
          <ellipse cx="50" cy="72" rx="30" ry="5"
            fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1" />
        </svg>
      </div>
    </div>
  );
}

// Front layer: transparent visor glass, rim highlight, glints,
// side comm box, and antenna with blinking red tip.
function HelmetFrontVisor() {
  return (
    <div aria-hidden="true" className="absolute pointer-events-none" style={{ inset: 0, zIndex: 3 }}>
      <div className="absolute" style={{ ...HELMET }}>
        <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
          {/* Glass visor — mostly transparent so fedora + shades show
              through. Two overlapping fills for a subtle blue tint. */}
          <circle cx="50" cy="48" r="42" fill={GLASS_TINT} />
          <circle cx="50" cy="48" r="42" fill={GLASS} />

          {/* Rim ring — thick dark outline that visibly frames the head */}
          <circle
            cx="50" cy="48" r="42"
            fill="none"
            stroke={RIM}
            strokeWidth="4"
          />
          {/* Inner rim highlight — thin white ring inside the dark rim
              to sell "polished glass edge" */}
          <circle
            cx="50" cy="48" r="38"
            fill="none"
            stroke="rgba(255,255,255,0.35)"
            strokeWidth="1.5"
          />

          {/* Glass glints — big sweeping highlight top-left + small
              spec top-right */}
          <path
            d="M 18 32 Q 26 16 44 14"
            fill="none"
            stroke="rgba(255,255,255,0.75)"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <circle cx="70" cy="22" r="3" fill="rgba(255,255,255,0.6)" />

          {/* Side communicator box — NASA-style */}
          <g>
            <rect x="82" y="42" width="12" height="16" rx="2"
              fill={RIM} stroke="rgba(255,255,255,0.35)" strokeWidth="1" />
            {/* Speaker grille dots */}
            <circle cx="86" cy="46" r="1" fill="rgba(255,255,255,0.55)" />
            <circle cx="90" cy="46" r="1" fill="rgba(255,255,255,0.55)" />
            <circle cx="86" cy="50" r="1" fill="rgba(255,255,255,0.55)" />
            <circle cx="90" cy="50" r="1" fill="rgba(255,255,255,0.55)" />
            {/* Little green power LED */}
            <circle cx="88" cy="55" r="1.4" fill="#4ADE80" />
          </g>

          {/* Antenna — thin dark rod poking up from the top of the
              dome, capped by a blinking red bulb */}
          <line
            x1="50" y1="7" x2="50" y2="-6"
            stroke={RIM} strokeWidth="2.5" strokeLinecap="round"
          />
          <circle cx="50" cy="-8" r="3.2" fill="#EF4444">
            <animate
              attributeName="opacity"
              values="1;0.25;1"
              dur="1.4s"
              repeatCount="indefinite"
            />
          </circle>
          {/* Soft red halo around the antenna tip */}
          <circle cx="50" cy="-8" r="5" fill="#EF4444" opacity="0.25">
            <animate
              attributeName="opacity"
              values="0.4;0.05;0.4"
              dur="1.4s"
              repeatCount="indefinite"
            />
          </circle>
        </svg>
      </div>
    </div>
  );
}

export default function DrJellyboneAstronaut() {
  // Start with a random direction so the astronaut and satellite don't
  // always enter from the same side of the sky at the same instant.
  // Also hold off the first lap by 4–12s so their timing decouples too.
  const [lap, setLap] = useState(null);
  const [frameIdx, setFrameIdx] = useState(0);

  // Kick off the first lap after a random delay, then hand off to the
  // usual re-lap effect below.
  useEffect(() => {
    const delayMs = 4000 + Math.random() * 8000;
    const id = setTimeout(() => {
      setLap(makeLap(Math.random() < 0.5 ? 1 : -1));
    }, delayMs);
    return () => clearTimeout(id);
  }, []);

  // 3-frame idle cycle — swap every 480ms so his tentacles feel alive.
  useEffect(() => {
    const id = setInterval(() => {
      setFrameIdx((i) => (i + 1) % FRAMES.length);
    }, 480);
    return () => clearInterval(id);
  }, []);

  // Reset lap when duration ends — direction flips so the next entrance
  // comes from the opposite side of the sky.
  useEffect(() => {
    if (!lap) return;
    const id = setTimeout(() => {
      setLap((prev) => makeLap(-prev.direction));
    }, lap.durationSec * 1000);
    return () => clearTimeout(id);
  }, [lap]);

  if (!lap) return null;
  const { direction, startYvh, endYvh, durationSec, scale } = lap;
  const fromX = direction === 1 ? '-25vw' : '110vw';
  const toX   = direction === 1 ? '110vw' : '-25vw';

  return (
    <motion.div
      aria-hidden="true"
      data-testid="dr-jellybone-astro"
      className="absolute pointer-events-none select-none"
      style={{
        left: 0,
        top: 0,
        width: 'clamp(110px, 16vw, 220px)',
        zIndex: 1,
        opacity: 0.95,
        filter: 'drop-shadow(0 8px 22px rgba(0,0,0,0.55))',
      }}
      key={`${direction}-${startYvh.toFixed(1)}-${endYvh.toFixed(1)}-${scale.toFixed(2)}`}
      initial={{ x: fromX, y: `${startYvh}vh`, rotate: -6 * direction, scale }}
      animate={{
        x: toX,
        y: `${endYvh}vh`,
        rotate: [direction * -6, direction * 6, direction * -6],
        scale,
      }}
      transition={{
        x: { duration: durationSec, ease: 'linear' },
        y: { duration: durationSec, ease: 'easeInOut' },
        rotate: { duration: 6, repeat: Infinity, ease: 'easeInOut' },
        scale: { duration: 0 },
      }}
    >
      <div className="relative" style={{ transform: `scaleX(${direction})`, transformOrigin: 'center' }}>
        <HelmetBackShell />
        <img
          src={FRAMES[frameIdx]}
          alt=""
          draggable={false}
          className="block w-full h-auto relative"
          style={{ zIndex: 1 }}
        />
        <HelmetFrontVisor />
      </div>
    </motion.div>
  );
}
