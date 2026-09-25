// Jelly Rocks (a.k.a. "Lou") blimp — 3-frame animation that drifts
// diagonally across the sky. Used on the home page AND on the Play /
// Learn / Create submenu pages so the world feels contiguous.
//
// Renders absolutely-positioned, aria-hidden, pointer-events: none —
// safe to drop anywhere inside a `relative` container that has an
// overflow-x-hidden parent.

import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';

const BLIMP_FRAMES = [
  'assets/animations/jelly-rocks-blimp-1.png',
  'assets/animations/jelly-rocks-blimp-2.png',
  'assets/animations/jelly-rocks-blimp-3.png',
];

// Generates a random lap. Guarantees a meaningful diagonal by enforcing a
// minimum |endY - startY| delta so the path isn't accidentally near-flat.
function makeLap(direction) {
  const startYvh = 2 + Math.random() * 14;
  const minDelta = 6;
  const maxDelta = 14;
  const sign = Math.random() < 0.5 ? -1 : 1;
  const delta = sign * (minDelta + Math.random() * (maxDelta - minDelta));
  const endYvh = Math.max(1, Math.min(20, startYvh + delta));
  return {
    direction,
    startYvh,
    endYvh,
    durationSec: 22 + Math.random() * 12,
    scale: 0.4 + Math.random() * 0.5,
  };
}

export default function BlimpFlyby() {
  const [frame, setFrame] = useState(0);
  const [lap, setLap] = useState(() => makeLap(1));

  useEffect(() => {
    const id = setInterval(() => setFrame((f) => (f + 1) % BLIMP_FRAMES.length), 220);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const id = setTimeout(() => {
      setLap((prev) => makeLap(-prev.direction));
    }, lap.durationSec * 1000);
    return () => clearTimeout(id);
  }, [lap]);

  const { direction, startYvh, endYvh, durationSec, scale } = lap;
  const fromX = direction === 1 ? '-35vw' : '115vw';
  const toX   = direction === 1 ? '115vw' : '-35vw';

  return (
    <motion.div
      aria-hidden="true"
      data-testid="blimp-flyby"
      className="absolute pointer-events-none select-none"
      style={{
        left: 0,
        top: 0,
        width: 'clamp(112px, 18vw, 256px)',
        zIndex: 0,
        opacity: 0.92,
      }}
      key={`${direction}-${startYvh.toFixed(1)}-${endYvh.toFixed(1)}-${scale.toFixed(2)}`}
      initial={{ x: fromX, y: `${startYvh}vh`, rotate: -3 * direction, scale }}
      animate={{
        x: toX,
        y: `${endYvh}vh`,
        rotate: [direction * -3, direction * 3, direction * -3],
        scale,
      }}
      transition={{
        x: { duration: durationSec, ease: 'linear' },
        y: { duration: durationSec, ease: 'easeInOut' },
        rotate: { duration: 6, repeat: Infinity, ease: 'easeInOut' },
        scale: { duration: 0 },
      }}
    >
      <div
        style={{
          transform: `scaleX(${-direction})`,
          transformOrigin: 'center',
        }}
      >
        {BLIMP_FRAMES.map((src, i) => (
          <img
            key={i}
            src={src}
            alt=""
            draggable={false}
            loading="lazy"
            className="absolute inset-0 w-full h-auto"
            style={{
              display: i === frame ? 'block' : 'none',
              filter: 'drop-shadow(0 8px 14px rgba(10,37,64,0.18))',
            }}
          />
        ))}
        <img
          src={BLIMP_FRAMES[0]}
          alt=""
          aria-hidden="true"
          className="block w-full h-auto invisible"
        />
      </div>
    </motion.div>
  );
}
