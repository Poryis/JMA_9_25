// SatelliteFlyby — outer-space companion to <BlimpFlyby />.
//
// Drifts diagonally across the JMAtv home page's starry sky in random
// laps, gently rocking. Behaves the same as the Jelly Rocks blimb so
// once the user drops a custom PNG at
// `assets/animations/satellite-1.png` (+ optional -2 / -3 frames) it
// swaps in automatically. Until then we render a cartoon SVG placeholder
// so the page ships with the effect working out of the box.

import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';

// If the custom PNG exists it will be used; otherwise the SVG placeholder
// renders. The choice is made at render time via a hidden <img> onError.
const SATELLITE_PNG = 'assets/animations/satellite.png';

function makeLap(direction) {
  const startYvh = 4 + Math.random() * 22;
  const minDelta = 4;
  const maxDelta = 12;
  const sign = Math.random() < 0.5 ? -1 : 1;
  const delta = sign * (minDelta + Math.random() * (maxDelta - minDelta));
  const endYvh = Math.max(2, Math.min(30, startYvh + delta));
  const scale = 0.4 + Math.random() * 0.4;
  // Parallax: smaller satellites drift slower (feel farther away),
  // bigger ones drift faster (feel closer).
  const durationSec = (16 + Math.random() * 6) / scale;
  return {
    direction,
    startYvh,
    endYvh,
    durationSec,
    scale,
  };
}

function SatellitePlaceholder({ className }) {
  // Chunky cartoon satellite matching the JMA outline aesthetic:
  // JMA-dark stroke, yellow body, blue solar panels, red antenna dot.
  return (
    <svg
      viewBox="0 0 220 140"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ width: '100%', height: 'auto', display: 'block' }}
      aria-hidden="true"
      focusable="false"
    >
      {/* Left solar panel */}
      <g stroke="#0A2540" strokeWidth="4">
        <rect x="6" y="52" width="56" height="32" rx="3" fill="#00A8E8" />
        <line x1="20" y1="52" x2="20" y2="84" />
        <line x1="34" y1="52" x2="34" y2="84" />
        <line x1="48" y1="52" x2="48" y2="84" />
      </g>
      {/* Support strut left */}
      <line x1="62" y1="68" x2="80" y2="68" stroke="#0A2540" strokeWidth="4" strokeLinecap="round" />

      {/* Right solar panel */}
      <g stroke="#0A2540" strokeWidth="4">
        <rect x="158" y="52" width="56" height="32" rx="3" fill="#00A8E8" />
        <line x1="172" y1="52" x2="172" y2="84" />
        <line x1="186" y1="52" x2="186" y2="84" />
        <line x1="200" y1="52" x2="200" y2="84" />
      </g>
      {/* Support strut right */}
      <line x1="158" y1="68" x2="140" y2="68" stroke="#0A2540" strokeWidth="4" strokeLinecap="round" />

      {/* Main body */}
      <rect
        x="80" y="46" width="60" height="46" rx="8"
        fill="#FFCC00"
        stroke="#0A2540"
        strokeWidth="4.5"
      />
      {/* Body shine */}
      <path d="M 84 52 L 96 52 L 88 76 L 84 76 Z" fill="#FFFFFF" opacity="0.28" />
      {/* Porthole window */}
      <circle cx="110" cy="70" r="10" fill="#0A2540" stroke="#0A2540" strokeWidth="4" />
      <circle cx="110" cy="70" r="7" fill="#00A8E8" />
      <circle cx="107" cy="67" r="2.4" fill="#FFFFFF" opacity="0.85" />

      {/* Antenna dish */}
      <line x1="110" y1="46" x2="110" y2="26" stroke="#0A2540" strokeWidth="4.5" strokeLinecap="round" />
      <path
        d="M 92 22 Q 110 6 128 22 Z"
        fill="#FFFFFF"
        stroke="#0A2540"
        strokeWidth="4"
        strokeLinejoin="round"
      />
      {/* Signal blip */}
      <circle cx="110" cy="18" r="3.5" fill="#FF3B30" stroke="#0A2540" strokeWidth="2" />

      {/* Signal waves — animated to look like the dish is actually
          transmitting. Small wave pulses first, then both together,
          then nothing, on a 1.5s loop. Keyframes live in index.css. */}
      <g stroke="#FFCC00" strokeWidth="4" fill="none" strokeLinecap="round">
        <path d="M 138 14 Q 146 20 138 26" style={{ animation: 'sat-wave-small 1.5s steps(1) infinite' }} />
        <path d="M 148 8  Q 160 20 148 32" style={{ animation: 'sat-wave-big 1.5s steps(1) infinite' }} />
      </g>

      {/* Little booster flame */}
      <path
        d="M 82 92 Q 86 100 90 92 Q 94 100 98 92"
        fill="#FF9500"
        stroke="#0A2540"
        strokeWidth="3"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function SatelliteFlyby() {
  const [lap, setLap] = useState(() => makeLap(Math.random() < 0.5 ? 1 : -1));
  const [customArtLoaded, setCustomArtLoaded] = useState(false);

  useEffect(() => {
    const img = new Image();
    img.onload = () => setCustomArtLoaded(true);
    img.onerror = () => setCustomArtLoaded(false);
    img.src = SATELLITE_PNG;
  }, []);

  useEffect(() => {
    const id = setTimeout(() => {
      setLap((prev) => makeLap(-prev.direction));
    }, lap.durationSec * 1000);
    return () => clearTimeout(id);
  }, [lap]);

  const { direction, startYvh, endYvh, durationSec, scale } = lap;
  const fromX = direction === 1 ? '-30vw' : '115vw';
  const toX   = direction === 1 ? '115vw' : '-30vw';

  return (
    <motion.div
      aria-hidden="true"
      data-testid="satellite-flyby"
      className="absolute pointer-events-none select-none"
      style={{
        left: 0,
        top: 0,
        width: 'clamp(120px, 20vw, 260px)',
        zIndex: 1,
        opacity: 0.95,
        filter: 'drop-shadow(0 8px 18px rgba(0,0,0,0.5))',
      }}
      key={`${direction}-${startYvh.toFixed(1)}-${endYvh.toFixed(1)}-${scale.toFixed(2)}`}
      initial={{ x: fromX, y: `${startYvh}vh`, rotate: -4 * direction, scale }}
      animate={{
        x: toX,
        y: `${endYvh}vh`,
        rotate: [direction * -4, direction * 4, direction * -4],
        scale,
      }}
      transition={{
        x: { duration: durationSec, ease: 'linear' },
        y: { duration: durationSec, ease: 'easeInOut' },
        rotate: { duration: 7, repeat: Infinity, ease: 'easeInOut' },
        scale: { duration: 0 },
      }}
    >
      <div style={{ transform: `scaleX(${-direction})`, transformOrigin: 'center' }}>
        {customArtLoaded ? (
          <img
            src={SATELLITE_PNG}
            alt=""
            draggable={false}
            className="block w-full h-auto"
          />
        ) : (
          <SatellitePlaceholder />
        )}
      </div>
    </motion.div>
  );
}
