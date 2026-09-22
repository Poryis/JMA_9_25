// RobotBoogieBackgrounds — 5 background scenes for Robot Boogie, drawn
// as inline SVG in the user's flat cartoon art style: NO shading,
// ZERO bevel, thick black strokes, flat fills. Each scene fills the
// stage container (viewBox 0 0 1600 900, preserveAspectRatio slice).
//
// Cycled through via a small "next background" button on the page.
// The scene index is stored in localStorage so a kid's chosen vibe
// sticks between visits.

import { useMemo } from 'react';

// Common shared style: thick black stroke, flat fills only.
const S = 6; // canonical stroke width

// ------------------------------------------------------------
// 0. Deep-navy gradient — plain, lets the characters + lightning
//    do all the storytelling. Now with a slow-drifting starfield so
//    the field of view feels alive.
// ------------------------------------------------------------
export function BgNavy() {
  const stars = useMemo(() => {
    const rng = (() => { let s = 24601; return () => (s = (s * 9301 + 49297) % 233280) / 233280; })();
    return Array.from({ length: 60 }, () => ({
      x: rng() * 1600,
      y: rng() * 900,
      r: 1.5 + rng() * 2.8,
      // Twinkle phase — offset per star so they don't blink in unison.
      delay: (rng() * 4).toFixed(2),
      dur: (2 + rng() * 3).toFixed(2),
    }));
  }, []);
  return (
    <svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice"
         className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden="true">
      <defs>
        <radialGradient id="bg-navy-grad" cx="50%" cy="35%" r="75%">
          <stop offset="0%"  stopColor="#2a2a5a" />
          <stop offset="60%" stopColor="#12123a" />
          <stop offset="100%" stopColor="#050518" />
        </radialGradient>
      </defs>
      <rect x="0" y="0" width="1600" height="900" fill="url(#bg-navy-grad)" />
      {/* Slow-drifting starfield. Two groups moving in opposite
          directions for a subtle parallax feel. */}
      <g style={{ animation: 'jmaBgDriftRight 60s linear infinite' }}>
        {stars.slice(0, 30).map((s, i) => (
          <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#fff"
                  style={{ animation: `jmaBgTwinkle ${s.dur}s ${s.delay}s ease-in-out infinite` }} />
        ))}
      </g>
      <g style={{ animation: 'jmaBgDriftLeft 90s linear infinite' }}>
        {stars.slice(30).map((s, i) => (
          <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#fff"
                  style={{ animation: `jmaBgTwinkle ${s.dur}s ${s.delay}s ease-in-out infinite` }} />
        ))}
      </g>
    </svg>
  );
}

// ------------------------------------------------------------
// 1. Time-Machine Lab — concrete floor, cables snaking toward
//    center, bio-luminescent wall panels. Animated: wall panels
//    blink softly out of phase and a bright current pulse chases
//    down each cable.
// ------------------------------------------------------------
export function BgLab() {
  return (
    <svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice"
         className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden="true">
      {/* Wall */}
      <rect x="0" y="0" width="1600" height="900" fill="#1e2338" />
      {/* Floor slab */}
      <rect x="0" y="620" width="1600" height="280" fill="#3a3350" stroke="#000" strokeWidth={S} />
      {/* Floor line */}
      <line x1="0" y1="620" x2="1600" y2="620" stroke="#000" strokeWidth={S} />
      {/* Wall panels REMOVED — the four bio-lum panels used to sit at
          x=80, 320, 1280, 1440 (two on each side). They read as
          bright cyan "windows" that clashed hard against the newly
          added left+right character rails on the page. Cables and
          top vents kept; the walls now stay plain so the characters
          are the visual focus on the sides. */}
      {/* Vents */}
      {[560, 900].map((x) => (
        <g key={x}>
          <rect x={x} y={80} width={140} height={40} fill="#2a2a3e" stroke="#000" strokeWidth={S} />
          <line x1={x + 20} y1={100} x2={x + 120} y2={100} stroke="#000" strokeWidth={3} />
          <line x1={x + 20} y1={110} x2={x + 120} y2={110} stroke="#000" strokeWidth={3} />
        </g>
      ))}
      {/* Cables snaking toward center from the floor — top cable
          (red) and bottom cable (cyan) each get a bright "current
          pulse" dot that chases along the path forever. */}
      <path id="jma-lab-cable-red" d="M0 780 C 300 780 500 720 800 720 C 1100 720 1300 780 1600 780"
            stroke="#000" strokeWidth={S + 4} fill="none" strokeLinecap="round" />
      <path d="M0 780 C 300 780 500 720 800 720 C 1100 720 1300 780 1600 780"
            stroke="#ff5b5b" strokeWidth={S} fill="none" strokeLinecap="round" />
      <circle r="9" fill="#ffe066" stroke="#000" strokeWidth={3}>
        <animateMotion dur="3.4s" repeatCount="indefinite"
          path="M0 780 C 300 780 500 720 800 720 C 1100 720 1300 780 1600 780" />
      </circle>
      <path d="M0 830 C 400 830 600 800 800 800 C 1000 800 1200 830 1600 830"
            stroke="#000" strokeWidth={S + 4} fill="none" strokeLinecap="round" />
      <path d="M0 830 C 400 830 600 800 800 800 C 1000 800 1200 830 1600 830"
            stroke="#3ec8ff" strokeWidth={S} fill="none" strokeLinecap="round" />
      <circle r="9" fill="#ffffff" stroke="#000" strokeWidth={3}>
        <animateMotion dur="4.6s" repeatCount="indefinite" begin="1s"
          path="M1600 830 C 1200 830 1000 800 800 800 C 600 800 400 830 0 830" />
      </circle>
      {/* Floor tiles hint */}
      {[0, 200, 400, 600, 800, 1000, 1200, 1400].map((x) => (
        <line key={x} x1={x} y1="620" x2={x - 100} y2="900" stroke="#000" strokeWidth={3} opacity="0.55" />
      ))}
    </svg>
  );
}

// ------------------------------------------------------------
// 2. Cosmic dance floor — starfield + big flat nebulae + checker
//    floor in perspective.
// ------------------------------------------------------------
export function BgCosmic() {
  // Deterministic star positions (no per-render Math.random).
  const stars = useMemo(() => {
    const rng = (() => { let s = 12345; return () => (s = (s * 9301 + 49297) % 233280) / 233280; })();
    return Array.from({ length: 90 }, () => ({
      x: rng() * 1600,
      y: rng() * 620,
      r: 2 + rng() * 3,
    }));
  }, []);
  return (
    <svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice"
         className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden="true">
      {/* Space */}
      <rect x="0" y="0" width="1600" height="900" fill="#0a0a24" />
      {/* Big flat nebula blobs — solid color, thick black outline */}
      <ellipse cx="360" cy="220" rx="240" ry="130" fill="#ff5aa8" stroke="#000" strokeWidth={S} />
      <ellipse cx="360" cy="220" rx="140" ry="70"  fill="#ffb1d6" stroke="#000" strokeWidth={S - 1} />
      <ellipse cx="1240" cy="180" rx="200" ry="110" fill="#4ac6ff" stroke="#000" strokeWidth={S} />
      <ellipse cx="1240" cy="180" rx="120" ry="60"  fill="#a8ecff" stroke="#000" strokeWidth={S - 1} />
      <ellipse cx="820"  cy="120" rx="140" ry="60"  fill="#ffe066" stroke="#000" strokeWidth={S} />
      {/* Stars */}
      {stars.map((s, i) => (
        <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#fff" />
      ))}
      {/* Perspective checker floor */}
      <g>
        {/* Floor trapezoid */}
        <path d="M -80 900 L 1680 900 L 1120 560 L 480 560 Z" fill="#141640" stroke="#000" strokeWidth={S} />
        {/* Horizontal lines */}
        {[0, 0.22, 0.44, 0.66, 0.88, 1].map((t) => {
          const y = 560 + t * 340;
          const xl = 480 - t * 560;
          const xr = 1120 + t * 560;
          return <line key={t} x1={xl} y1={y} x2={xr} y2={y} stroke="#4a4ac0" strokeWidth={4} />;
        })}
        {/* Vanishing-point lines */}
        {Array.from({ length: 11 }, (_, i) => {
          const bx = -80 + (i * 1760) / 10;
          return <line key={i} x1={bx} y1={900} x2={800} y2={560} stroke="#4a4ac0" strokeWidth={4} />;
        })}
      </g>
    </svg>
  );
}

// ------------------------------------------------------------
// 3. Retro arcade — dark room, a big neon "STAGE" sign,
//    two floor spotlights. Animated: marquee bulbs chase, and
//    the two spotlights sway side-to-side lazily.
// ------------------------------------------------------------
export function BgArcade() {
  return (
    <svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice"
         className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden="true">
      {/* Back wall */}
      <rect x="0" y="0" width="1600" height="900" fill="#1a1230" />
      {/* Floor */}
      <rect x="0" y="640" width="1600" height="260" fill="#2a1e42" stroke="#000" strokeWidth={S} />
      {/* Neon sign frame (no text — user prefers just the empty
          lit-up marquee, feels more like a real venue). */}
      <g transform="translate(560, 60)">
        <rect x="0" y="0" width="480" height="180" rx="24" fill="#12102a" stroke="#000" strokeWidth={S} />
        <rect x="14" y="14" width="452" height="152" rx="16" fill="none" stroke="#ff3aa8" strokeWidth={5} />
        {/* Bulbs along the frame — chase animation staggered per bulb. */}
        {Array.from({ length: 12 }, (_, i) => (
          <circle key={`t${i}`} cx={30 + i * 39} cy={-8} r={7} fill="#ffe066" stroke="#000" strokeWidth={3}
                  style={{ animation: `jmaBgBulbBlink 1.2s ${(i * 0.1).toFixed(2)}s ease-in-out infinite` }} />
        ))}
        {Array.from({ length: 12 }, (_, i) => (
          <circle key={`b${i}`} cx={30 + i * 39} cy={188} r={7} fill="#ffe066" stroke="#000" strokeWidth={3}
                  style={{ animation: `jmaBgBulbBlink 1.2s ${(0.6 + i * 0.1).toFixed(2)}s ease-in-out infinite` }} />
        ))}
      </g>
      {/* Left spotlight — swings from its ceiling anchor. */}
      <g style={{ transformOrigin: '340px 100px', animation: 'jmaBgSpotSwayLeft 6s ease-in-out infinite' }}>
        <path d="M 340 100 L 200 640 L 480 640 Z" fill="#ffe066" opacity="0.35" />
        <path d="M 340 100 L 200 640 L 480 640 Z" fill="none" stroke="#000" strokeWidth={S - 2} />
      </g>
      {/* Right spotlight — swings the other way (out of phase). */}
      <g style={{ transformOrigin: '1260px 100px', animation: 'jmaBgSpotSwayRight 7.4s ease-in-out infinite' }}>
        <path d="M 1260 100 L 1120 640 L 1400 640 Z" fill="#4ac6ff" opacity="0.35" />
        <path d="M 1260 100 L 1120 640 L 1400 640 Z" fill="none" stroke="#000" strokeWidth={S - 2} />
      </g>
      {/* Spotlight fixtures on the ceiling — fixed. */}
      {[340, 1260].map((x) => (
        <g key={x}>
          <rect x={x - 30} y={40} width={60} height={40} fill="#3a3040" stroke="#000" strokeWidth={S} />
          <circle cx={x} cy={100} r={16} fill="#ffe066" stroke="#000" strokeWidth={S - 2} />
        </g>
      ))}
      {/* Floor perspective lines */}
      {[0, 320, 640, 960, 1280, 1600].map((x) => (
        <line key={x} x1={x} y1={640} x2={800 + (x - 800) * 2.2} y2={900}
              stroke="#000" strokeWidth={3} opacity="0.4" />
      ))}
    </svg>
  );
}

// ------------------------------------------------------------
// 4. Concert stage — brick wall, rigging bars, big curtains left/right,
//    fog puddle at bottom.
// ------------------------------------------------------------
export function BgConcert() {
  return (
    <svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice"
         className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden="true">
      {/* Brick wall */}
      <rect x="0" y="0" width="1600" height="900" fill="#5a2a1e" />
      {/* Brick pattern — flat rectangles with thick outline */}
      {Array.from({ length: 10 }, (_, row) => (
        Array.from({ length: 12 }, (_, col) => {
          const offset = row % 2 === 0 ? 0 : 70;
          const x = -70 + col * 140 + offset;
          const y = row * 74;
          return (
            <rect key={`${row}-${col}`} x={x} y={y} width={130} height={64}
                  fill={row % 2 === 0 ? '#6a3626' : '#4a2418'}
                  stroke="#000" strokeWidth={4} />
          );
        })
      )).flat()}
      {/* Left curtain */}
      <path d="M 0 0 L 260 0 L 240 900 L 0 900 Z" fill="#8a1128" stroke="#000" strokeWidth={S} />
      {[40, 100, 160, 220].map((x, i) => (
        <path key={i} d={`M ${x} 0 Q ${x + 20} 450 ${x - 5} 900`} stroke="#000" strokeWidth={4} fill="none" />
      ))}
      {/* Right curtain */}
      <path d="M 1600 0 L 1340 0 L 1360 900 L 1600 900 Z" fill="#8a1128" stroke="#000" strokeWidth={S} />
      {[1380, 1440, 1500, 1560].map((x, i) => (
        <path key={i} d={`M ${x} 0 Q ${x + 20} 450 ${x - 5} 900`} stroke="#000" strokeWidth={4} fill="none" />
      ))}
      {/* Rigging bar with lights */}
      <rect x="260" y="60" width="1080" height="18" fill="#141416" stroke="#000" strokeWidth={S} />
      {[340, 480, 620, 760, 900, 1040, 1180, 1320].map((x, i) => (
        <g key={i}>
          <rect x={x - 24} y={78} width={48} height={36} fill="#141416" stroke="#000" strokeWidth={S - 2} />
          <circle cx={x} cy={118} r={12} fill={i % 2 === 0 ? '#ffe066' : '#4ac6ff'} stroke="#000" strokeWidth={4} />
        </g>
      ))}
      {/* Fog puddle at bottom */}
      <path d="M 0 800 Q 200 740 400 780 T 800 770 T 1200 780 T 1600 780 L 1600 900 L 0 900 Z"
            fill="#e8dff5" opacity="0.35" stroke="#000" strokeWidth={S - 2} />
    </svg>
  );
}

// ------------------------------------------------------------
// 5. Silhouette crowd — plain dark stage with a bobbing silhouette
//    crowd at the very bottom.
// ------------------------------------------------------------
export function BgCrowd() {
  // Deterministic head positions
  const heads = useMemo(() => {
    const rng = (() => { let s = 4711; return () => (s = (s * 9301 + 49297) % 233280) / 233280; })();
    const arr = [];
    for (let x = -20; x < 1620; x += 34 + rng() * 8) {
      arr.push({
        x,
        y: 780 + rng() * 30,
        r: 22 + rng() * 10,
        armUp: rng() < 0.35,
      });
    }
    return arr;
  }, []);
  return (
    <svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice"
         className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden="true">
      <defs>
        <radialGradient id="bg-crowd-grad" cx="50%" cy="30%" r="80%">
          <stop offset="0%"  stopColor="#3a2a5a" />
          <stop offset="60%" stopColor="#1a1030" />
          <stop offset="100%" stopColor="#080416" />
        </radialGradient>
      </defs>
      <rect x="0" y="0" width="1600" height="900" fill="url(#bg-crowd-grad)" />
      {/* A distant floor line to ground the composition */}
      <line x1="0" y1="740" x2="1600" y2="740" stroke="#000" strokeWidth={S - 2} opacity="0.45" />
      {/* Silhouette crowd — flat black shapes, no faces */}
      {heads.map((h, i) => (
        <g key={i}>
          {/* Body */}
          <path d={`M ${h.x - h.r * 0.9} 900 L ${h.x - h.r} ${h.y + h.r * 0.4} Q ${h.x} ${h.y + h.r * 0.2} ${h.x + h.r} ${h.y + h.r * 0.4} L ${h.x + h.r * 0.9} 900 Z`}
                fill="#000" />
          {/* Head */}
          <circle cx={h.x} cy={h.y} r={h.r * 0.7} fill="#000" />
          {/* Optional raised arm */}
          {h.armUp && (
            <path d={`M ${h.x + h.r * 0.6} ${h.y + h.r * 0.2} L ${h.x + h.r * 1.2} ${h.y - h.r * 1.4}`}
                  stroke="#000" strokeWidth={h.r * 0.4} strokeLinecap="round" />
          )}
        </g>
      ))}
    </svg>
  );
}

// ------------------------------------------------------------
// Exported registry — used by the page to auto-cycle through them.
// Cycle is now just Lab + Navy. The Retro Arcade scene (with the neon
// marquee frame + chasing bulbs) clashed with the ARCADE-STYLE header
// marquee at the top of the page — two flashing marquees stacked on
// each other reads as visual noise, not fun. BgArcade is kept in the
// file (still exported for reference) but pulled out of BACKGROUNDS.
// ------------------------------------------------------------
export const BACKGROUNDS = [
  { id: 'lab',     label: 'Time-Machine Lab',      Comp: BgLab },
  { id: 'navy',    label: 'Deep Navy',             Comp: BgNavy },
];
