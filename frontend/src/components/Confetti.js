// Confetti: lightweight burst of colored shapes that animate outward & fade.
// Pure CSS via Framer Motion — no library dependency, works on GH Pages.
import { useMemo } from 'react';
import { motion } from 'framer-motion';

const COLORS = ['#FF3B30', '#FF9500', '#FFCC00', '#4CD964', '#4285F4', '#AF52DE', '#FF2D85'];
const SHAPES = ['square', 'circle', 'tri'];

/**
 * @param {number} count - number of confetti pieces
 * @param {number} size - approximate spread radius in px
 * @param {boolean} mega - if true, doubles the count and spread for big celebrations
 */
export default function Confetti({ count = 36, size = 320, mega = false, testId = 'confetti' }) {
  const pieces = useMemo(() => {
    const n = mega ? count * 2 : count;
    const r = mega ? size * 1.4 : size;
    return Array.from({ length: n }).map((_, i) => {
      const angle = Math.random() * Math.PI * 2;
      const distance = r * (0.4 + Math.random() * 0.6);
      const x = Math.cos(angle) * distance;
      const y = Math.sin(angle) * distance - r * 0.2; // slight upward bias
      return {
        id: i,
        x,
        y,
        rotate: Math.random() * 720 - 360,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        shape: SHAPES[Math.floor(Math.random() * SHAPES.length)],
        size: 8 + Math.random() * 10,
        duration: 0.9 + Math.random() * 0.7,
      };
    });
  }, [count, size, mega]);

  return (
    <div data-testid={testId} className="absolute inset-0 pointer-events-none flex items-center justify-center" style={{ zIndex: 60 }}>
      {pieces.map((p) => (
        <motion.div
          key={p.id}
          initial={{ x: 0, y: 0, scale: 0, rotate: 0, opacity: 1 }}
          animate={{ x: p.x, y: p.y, scale: 1, rotate: p.rotate, opacity: 0 }}
          transition={{ duration: p.duration, ease: 'easeOut' }}
          className="absolute"
          style={{
            width: p.size,
            height: p.size,
            backgroundColor: p.shape !== 'tri' ? p.color : 'transparent',
            borderRadius: p.shape === 'circle' ? '50%' : (p.shape === 'square' ? '2px' : 0),
            ...(p.shape === 'tri' ? {
              width: 0, height: 0,
              backgroundColor: 'transparent',
              borderLeft: `${p.size / 2}px solid transparent`,
              borderRight: `${p.size / 2}px solid transparent`,
              borderBottom: `${p.size}px solid ${p.color}`,
            } : {}),
          }}
        />
      ))}
    </div>
  );
}
