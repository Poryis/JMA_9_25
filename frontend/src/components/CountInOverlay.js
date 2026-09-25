// CountInOverlay — musical 4-beat count-in display for Boom Garden.
//
// Renders as a horizontal row of 4 big numbered tiles ("1 · 2 · 3 · 4"),
// sized to live just below the rhythm strip without covering it. The tile
// for the current count-in beat pops large + bright + colored; the others
// sit muted. Synced to the click track via a single rAF loop reading
// `startAtMs`.
//
// Why a row of numbers (not a centered "4 → 3 → 2 → 1 → GO!" badge):
// Real music teachers count UP in tempo before the kid plays ("1, 2, 3, 4,
// PLAY"), not down like a movie countdown. The row of tiles also keeps the
// strip visible — kids need to see what they're about to tap.

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { BEAT_MS as DEFAULT_BEAT_MS } from '../data/rhythms';

const BEAT_COUNT = 4;
// Cool → warm gradient so the kid feels the heat building toward beat 4.
const TILE_COLORS = ['#4285F4', '#34A853', '#FF9500', '#FF3B30'];

export default function CountInOverlay({ running, startAtMs, beatMs = DEFAULT_BEAT_MS }) {
  const [activeBeat, setActiveBeat] = useState(-1);

  useEffect(() => {
    if (!running || !startAtMs) {
      setActiveBeat(-1);
      return undefined;
    }
    let raf;
    const tick = () => {
      const elapsed = Date.now() - startAtMs;
      if (elapsed < 0) {
        raf = requestAnimationFrame(tick);
        return;
      }
      // Beat 0 fires at t=0. Beat 3 fires at t=3*beatMs. After
      // 4*beatMs the count-in is over (input starts) but we hold the
      // last-beat highlight for 250 ms so it doesn't disappear before
      // the eye can register beat 4.
      const idx = Math.min(BEAT_COUNT - 1, Math.floor(elapsed / beatMs));
      setActiveBeat(idx);
      if (elapsed < BEAT_COUNT * beatMs + 250) {
        raf = requestAnimationFrame(tick);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [running, startAtMs, beatMs]);

  return (
    <div
      data-testid="count-in-overlay"
      className="pointer-events-none flex items-center justify-center gap-3 md:gap-4 mb-3"
    >
      {Array.from({ length: BEAT_COUNT }).map((_, i) => {
        const isActive = i === activeBeat;
        return (
          <motion.div
            key={i}
            data-testid={`count-in-tile-${i + 1}`}
            animate={{
              scale: isActive ? 1.18 : 1,
              opacity: isActive ? 1 : 0.45,
              y: isActive ? -4 : 0,
            }}
            transition={{
              scale: { type: 'spring', stiffness: 560, damping: 16 },
              opacity: { duration: 0.12 },
              y: { type: 'spring', stiffness: 560, damping: 18 },
            }}
            className="rounded-2xl border-4 flex items-center justify-center font-black font-display select-none"
            style={{
              width: 'clamp(60px, 11vw, 96px)',
              height: 'clamp(60px, 11vw, 96px)',
              backgroundColor: isActive ? TILE_COLORS[i] : '#F4F7FA',
              borderColor: 'var(--jma-dark)',
              color: isActive ? 'white' : 'var(--jma-dark)',
              fontSize: 'clamp(32px, 6vw, 52px)',
              lineHeight: 1,
              boxShadow: isActive
                ? '0 9px 0 0 var(--jma-dark), 0 14px 26px rgba(0,0,0,0.28)'
                : '0 4px 0 0 var(--jma-dark)',
              textShadow: isActive ? '2px 2px 0 rgba(10,37,64,0.35)' : 'none',
            }}
          >
            {i + 1}
          </motion.div>
        );
      })}
    </div>
  );
}
