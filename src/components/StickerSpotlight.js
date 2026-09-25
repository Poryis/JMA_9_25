// StickerSpotlight: shows the kid's most recently earned sticker on the home page.
// Tapping it opens the Sticker Book. If nothing earned yet, shows a "play to earn"
// nudge encouraging first-time engagement.

import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import useStickers from '../hooks/useStickers';
import { STICKER_MAP } from '../data/stickers';

export default function StickerSpotlight() {
  const navigate = useNavigate();
  const { earned } = useStickers();

  const newest = useMemo(() => {
    const ids = Object.keys(earned);
    if (ids.length === 0) return null;
    ids.sort((a, b) => {
      const at = new Date(earned[a].earnedAt || 0).getTime();
      const bt = new Date(earned[b].earnedAt || 0).getTime();
      return bt - at;
    });
    return STICKER_MAP[ids[0]];
  }, [earned]);

  const totalEarned = Object.keys(earned).length;

  if (!newest) {
    // Empty state - nudge kids to play and earn their first sticker
    return (
      <motion.button
        data-testid="sticker-spotlight-empty"
        onClick={() => navigate('/sticker-book')}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="mx-auto flex items-center gap-3 game-card px-4 py-3 border-2 border-dashed border-[var(--jma-dark)] hover:scale-105 transition-transform"
      >
        <Sparkles className="w-6 h-6" style={{ color: 'var(--jma-yellow)' }} />
        <span className="font-display text-sm md:text-base" style={{ color: 'var(--jma-dark)' }}>
          Play any game to earn your first sticker!
        </span>
      </motion.button>
    );
  }

  return (
    <motion.button
      data-testid="sticker-spotlight"
      onClick={() => navigate('/sticker-book')}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.4, type: 'spring', stiffness: 200 }}
      className="mx-auto flex items-center gap-3 md:gap-4 game-card px-4 py-3 hover:scale-105 transition-transform"
      style={{ background: 'linear-gradient(135deg, #FFF9E6 0%, #FFE4F0 100%)' }}
    >
      {/* Sparkles + label column */}
      <div className="flex flex-col items-start">
        <div className="flex items-center gap-1">
          <Sparkles className="w-4 h-4" style={{ color: 'var(--jma-yellow)' }} />
          <span className="font-display text-xs md:text-sm uppercase tracking-wide" style={{ color: 'var(--jma-dark)' }}>
            Newest Sticker
          </span>
        </div>
        <span className="font-display text-base md:text-lg leading-tight" style={{ color: 'var(--jma-dark)' }}>
          {newest.name}
        </span>
        <span className="text-xs text-gray-600">{totalEarned} collected &rarr;</span>
      </div>

      {/* Sticker image with gentle bounce */}
      <motion.div
        animate={{ y: [0, -4, 0] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
        className="relative rounded-full p-1.5 border-2 border-[var(--jma-dark)]"
        style={{
          backgroundColor: newest.color || '#fff',
          width: 64, height: 64, minWidth: 64,
          boxShadow: '0 3px 0 0 var(--jma-dark)',
        }}
      >
        <img
          src={newest.icon}
          alt={newest.name}
          className="w-full h-full object-contain"
          draggable={false}
        />
      </motion.div>
    </motion.button>
  );
}
