// ShootingStar — a rare bright streak that darts across the JMAtv sky
// every 20–40 seconds as a payoff to the ambient twinkle. Each streak
// picks a random entry corner, angle, and streak length; fades in as
// it starts, fades out as it exits.

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

function makeStreak() {
  // Entry from the top half — either enters top-left going down-right
  // or top-right going down-left so it always feels like it's falling.
  const fromLeft = Math.random() < 0.5;
  const startX = fromLeft ? -8 + Math.random() * 20 : 80 + Math.random() * 20;   // vw
  const startY = 2 + Math.random() * 30;                                          // vh
  const dx     = fromLeft ? 60 + Math.random() * 40 : -60 - Math.random() * 40;   // vw travel
  const dy     = 15 + Math.random() * 25;                                         // vh travel
  const endX   = startX + dx;
  const endY   = startY + dy;
  const angleDeg = Math.atan2(dy, dx) * (180 / Math.PI);
  return {
    id: Date.now() + Math.random(),
    startX, startY, endX, endY, angleDeg,
    duration: 0.9 + Math.random() * 0.5, // fast streak — under 1.5s
  };
}

export default function ShootingStar() {
  const [streak, setStreak] = useState(null);

  useEffect(() => {
    let cancelled = false;
    let timerId;

    const schedule = () => {
      // Rare cadence: 20–40s between streaks.
      const wait = 20000 + Math.random() * 20000;
      timerId = setTimeout(() => {
        if (cancelled) return;
        const s = makeStreak();
        setStreak(s);
        // Clear the streak shortly after its animation duration so
        // the DOM node unmounts and can be re-triggered later.
        setTimeout(() => {
          if (!cancelled) setStreak(null);
          schedule();
        }, s.duration * 1000 + 400);
      }, wait);
    };

    schedule();
    return () => {
      cancelled = true;
      if (timerId) clearTimeout(timerId);
    };
  }, []);

  if (!streak) return null;

  return (
    <motion.div
      key={streak.id}
      aria-hidden="true"
      className="absolute pointer-events-none"
      style={{
        left: 0,
        top: 0,
        width: '18vw',
        maxWidth: 220,
        height: 3,
        transformOrigin: 'left center',
        zIndex: 0,
      }}
      initial={{
        x: `${streak.startX}vw`,
        y: `${streak.startY}vh`,
        rotate: streak.angleDeg,
        opacity: 0,
      }}
      animate={{
        x: `${streak.endX}vw`,
        y: `${streak.endY}vh`,
        rotate: streak.angleDeg,
        opacity: [0, 1, 1, 0],
      }}
      transition={{
        duration: streak.duration,
        ease: 'easeOut',
        opacity: { duration: streak.duration, times: [0, 0.15, 0.75, 1] },
      }}
    >
      {/* Streak tail — bright white core with a fading trail behind */}
      <div
        style={{
          width: '100%',
          height: '100%',
          background:
            'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.35) 35%, rgba(255,231,194,0.9) 80%, #FFFFFF 100%)',
          borderRadius: 999,
          filter: 'drop-shadow(0 0 6px rgba(255,255,255,0.85))',
        }}
      />
      {/* Bright head — small glowing dot at the leading edge */}
      <div
        style={{
          position: 'absolute',
          right: -3,
          top: '50%',
          width: 8,
          height: 8,
          transform: 'translateY(-50%)',
          borderRadius: '50%',
          background: '#FFFFFF',
          boxShadow: '0 0 12px 3px rgba(255,255,255,0.9), 0 0 24px 8px rgba(255,204,0,0.35)',
        }}
      />
    </motion.div>
  );
}
