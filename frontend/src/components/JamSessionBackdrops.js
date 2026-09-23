// JamSessionBackdrops — two prototype backgrounds for the Jam Session
// (/free-play) page. Both share the same "full-bleed, pointer-events:
// none, sits behind all game content" contract as UnderwaterBackdrop
// and RobotBoogieBackgrounds. Registry at the bottom lets FreePlayPage
// auto-cycle between them so the user can preview each without a
// picker UI. Once a favorite is chosen we can drop the other.
//
// Both scenes are drawn as inline SVG (viewBox 0 0 1600 900,
// preserveAspectRatio "slice") plus a small dose of scoped CSS via
// <style>; no external art assets required.

import { useMemo } from 'react';

// ============================================================
// 1. Amphitheater at Dusk — deep purple sky, pink horizon glow,
//    curved silhouette bleachers on both sides, distant silhouette
//    crowd at the base, and two lazy swaying spotlight cones up top.
//    Feels like "the kids are the band about to hit their first
//    note in front of a packed venue."
// ============================================================
export function AmphitheaterDusk() {
  const stars = useMemo(() => {
    const rng = (() => { let s = 8675309; return () => (s = (s * 9301 + 49297) % 233280) / 233280; })();
    return Array.from({ length: 55 }, () => ({
      x: rng() * 1600,
      y: rng() * 340,           // upper 40 % of the sky only
      r: 1.2 + rng() * 2.4,
      delay: (rng() * 4).toFixed(2),
      dur:   (2 + rng() * 3).toFixed(2),
    }));
  }, []);

  // Small silhouette crowd bumps along the horizon line.
  const crowd = useMemo(() => {
    const rng = (() => { let s = 33221; return () => (s = (s * 9301 + 49297) % 233280) / 233280; })();
    const arr = [];
    for (let x = -10; x < 1610; x += 28 + rng() * 10) {
      arr.push({
        x,
        y: 720 + rng() * 12,
        r: 14 + rng() * 8,
      });
    }
    return arr;
  }, []);

  return (
    <>
      {/* Scoped keyframes for the two swaying spotlights. Kept local so
          we don't pollute index.css with page-specific animation names. */}
      <style>{`
        @keyframes jamSpotSwayLeft {
          0%, 100% { transform: rotate(-6deg); }
          50%      { transform: rotate(9deg); }
        }
        @keyframes jamSpotSwayRight {
          0%, 100% { transform: rotate(6deg); }
          50%      { transform: rotate(-9deg); }
        }
        @keyframes jamStarTwinkle {
          0%, 100% { opacity: 0.4; }
          50%      { opacity: 1; }
        }
      `}</style>

      <svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice"
           className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden="true">
        <defs>
          <linearGradient id="jam-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#1B0A3C" />
            <stop offset="55%"  stopColor="#4C1D6E" />
            <stop offset="80%"  stopColor="#E64C8B" />
            <stop offset="100%" stopColor="#FF9A5A" />
          </linearGradient>
          <radialGradient id="jam-horizon-glow" cx="50%" cy="100%" r="60%">
            <stop offset="0%"  stopColor="#FFB166" stopOpacity="0.55" />
            <stop offset="60%" stopColor="#FF6BB0" stopOpacity="0.15" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
        </defs>

        {/* Sky wash */}
        <rect x="0" y="0" width="1600" height="900" fill="url(#jam-sky)" />

        {/* Horizon glow — softens the transition into the ground. */}
        <rect x="0" y="500" width="1600" height="400" fill="url(#jam-horizon-glow)" />

        {/* Stars in the upper sky */}
        {stars.map((s, i) => (
          <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#fff"
                  style={{ animation: `jamStarTwinkle ${s.dur}s ${s.delay}s ease-in-out infinite` }} />
        ))}

        {/* Left bleacher silhouette — big curved wedge sweeping in from
            off-canvas. Solid dark navy so it reads as backlit stands. */}
        <path
          d="M -60 900 L -60 560 Q 220 520 380 620 Q 500 700 480 900 Z"
          fill="#0B0428"
        />
        <path
          d="M -60 780 Q 220 720 380 780 Q 480 810 480 900 L -60 900 Z"
          fill="#170949"
        />

        {/* Right bleacher silhouette — mirror. */}
        <path
          d="M 1660 900 L 1660 560 Q 1380 520 1220 620 Q 1100 700 1120 900 Z"
          fill="#0B0428"
        />
        <path
          d="M 1660 780 Q 1380 720 1220 780 Q 1120 810 1120 900 L 1660 900 Z"
          fill="#170949"
        />

        {/* Silhouette crowd along the horizon line between the stands. */}
        <line x1="0" y1="740" x2="1600" y2="740"
              stroke="#000" strokeWidth={2} opacity={0.35} />
        {crowd.map((h, i) => (
          <g key={i}>
            <path d={`M ${h.x - h.r * 0.9} 900 L ${h.x - h.r} ${h.y + h.r * 0.4} Q ${h.x} ${h.y + h.r * 0.2} ${h.x + h.r} ${h.y + h.r * 0.4} L ${h.x + h.r * 0.9} 900 Z`}
                  fill="#050214" />
            <circle cx={h.x} cy={h.y} r={h.r * 0.7} fill="#050214" />
          </g>
        ))}

        {/* Spotlight cones — swing from ceiling anchors just off-canvas.
            Yellow left, cyan right; big soft opacities so they mix into
            the sky without overwhelming instrument content. */}
        <g style={{ transformOrigin: '260px 60px', animation: 'jamSpotSwayLeft 7s ease-in-out infinite' }}>
          <path d="M 260 60 L 100 640 L 520 640 Z" fill="#FFDA6A" opacity={0.20} />
        </g>
        <g style={{ transformOrigin: '1340px 60px', animation: 'jamSpotSwayRight 8.2s ease-in-out infinite' }}>
          <path d="M 1340 60 L 1500 640 L 1080 640 Z" fill="#7EE7FF" opacity={0.20} />
        </g>
      </svg>
    </>
  );
}

// ============================================================
// 2. Music-Note Sky Balloons — sky-blue gradient with music-note
//    glyphs rising from below. Direct port of the underwater-bubble
//    negative-delay trick so the sky is already full of notes at
//    first paint, not empty for the first several seconds.
// ============================================================
const NOTE_GLYPHS = ['\u2669', '\u266A', '\u266B', '\u266C', '\u266D']; // ♩ ♪ ♫ ♬ ♭

// Deterministic set so hot-reloads don't reshuffle. Position, size,
// duration, and starting glyph are all seeded from the index.
const NOTES = Array.from({ length: 20 }, (_, i) => {
  // Simple deterministic PRNG so ids 0..19 always produce the same
  // config across mounts (no useMemo needed on the component).
  const rng = (() => { let s = i * 8121 + 28411; return () => (s = (s * 9301 + 49297) % 233280) / 233280; })();
  return {
    left:  `${(rng() * 96 + 2).toFixed(2)}%`,
    size:  22 + Math.floor(rng() * 22),   // font-size 22–44px
    dur:   10 + rng() * 10,               // 10–20s rise
    delay: rng() * 9,                     // 0–9s baseline (used negatively)
    hue:   Math.floor(rng() * 360),
    glyph: NOTE_GLYPHS[Math.floor(rng() * NOTE_GLYPHS.length)],
    tilt:  (rng() * 24 - 12).toFixed(1),
  };
});

export function MusicNoteSky() {
  return (
    <>
      {/* Scoped keyframes — mirror the UnderwaterBackdrop rise curve
          (opacity fades in early, out late, translateY -110vh top) but
          add a gentle side-to-side wobble on the way up so the notes
          feel like helium balloons drifting rather than beelining. */}
      <style>{`
        @keyframes jamNoteRise {
          0%   { transform: translate3d(0, 0, 0) rotate(0deg); opacity: 0; }
          8%   { opacity: 0.85; }
          50%  { transform: translate3d(24px, -55vh, 0) rotate(6deg); }
          90%  { opacity: 0.85; }
          100% { transform: translate3d(-14px, -110vh, 0) rotate(-6deg); opacity: 0; }
        }
        .jam-note-balloon {
          position: absolute;
          bottom: -60px;
          font-family: system-ui, -apple-system, "Segoe UI Symbol", sans-serif;
          font-weight: 900;
          line-height: 1;
          animation-name: jamNoteRise;
          animation-timing-function: ease-in-out;
          animation-iteration-count: infinite;
          text-shadow: 0 2px 0 rgba(0,0,0,0.25), 0 0 10px rgba(255,255,255,0.35);
          user-select: none;
          pointer-events: none;
          will-change: transform, opacity;
        }
      `}</style>

      {/* Sky-blue wash — layered gradient so it reads like a real
          afternoon sky (deeper blue up top, softer near the ground). */}
      <div
        className="absolute inset-0 pointer-events-none"
        aria-hidden="true"
        style={{
          background:
            'linear-gradient(180deg, #62C7FF 0%, #A6E0FF 55%, #FFF1CC 100%)',
        }}
      />

      {/* Rising notes. Pre-progressed via negative animation-delay so
          the sky is full at t=0. Same `(delay + dur/2) % dur` seed as
          the ocean bubbles keeps per-note variation. */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        {NOTES.map((n, i) => {
          const preRun = ((n.delay + n.dur * 0.5) % n.dur).toFixed(2);
          return (
            <span
              key={i}
              className="jam-note-balloon"
              style={{
                left: n.left,
                fontSize: `${n.size}px`,
                color: `hsl(${n.hue}, 85%, 42%)`,
                transform: `rotate(${n.tilt}deg)`,
                animationDuration: `${n.dur}s`,
                animationDelay: `-${preRun}s`,
              }}
            >
              {n.glyph}
            </span>
          );
        })}
      </div>
    </>
  );
}

// ============================================================
// Registry — FreePlayPage cycles through these on a slow timer so both
// prototypes get airtime without a picker UI. Once a favorite is
// chosen we can drop the other and delete this list.
// ============================================================
export const JAM_BACKDROPS = [
  { id: 'amphitheater', label: 'Amphitheater at Dusk', Comp: AmphitheaterDusk },
  { id: 'note-sky',     label: 'Music-Note Sky',       Comp: MusicNoteSky },
];
