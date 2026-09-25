// HomeProgressCard — single compact pill with three inline chips:
// [ Rank ] | [ Streak ] | [ Stickers ]
// Matches the mockup where progress is one clean scannable strip instead
// of a chunky card. All three regions tap through to the Sticker Book.
// Streak chip renders even at 0/1 days so the layout is stable (with a
// friendly "New!" state instead of a scary number).

import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Flame, Star } from 'lucide-react';
import useRank from '../hooks/useRank';
import useStickers from '../hooks/useStickers';
import usePracticeStreak from '../hooks/usePracticeStreak';

function Divider() {
  return (
    <div
      aria-hidden="true"
      className="flex-shrink-0 self-center"
      style={{
        width: 2,
        height: 32,
        backgroundColor: 'rgba(10,37,64,0.14)',
        borderRadius: 2,
      }}
    />
  );
}

export default function HomeProgressCard() {
  const navigate = useNavigate();
  const { currentRank, nextRank, progress } = useRank();
  const { count: streakCount } = usePracticeStreak();
  const { earned } = useStickers();

  const totalEarned = Object.keys(earned).length;

  // Streak visuals — always render, but the "New!" tier avoids shaming a
  // kid on their first day.
  const streakTier =
    streakCount >= 14 ? 'gold'
    : streakCount >= 7 ? 'red'
    : streakCount >= 3 ? 'orange'
    : streakCount >= 2 ? 'bronze'
    : 'new';
  const flamePalette = {
    new:    { flame: '#94A3B8', label: 'New!' },
    bronze: { flame: '#CD7F32', label: `${streakCount}-day streak` },
    orange: { flame: '#FF6B35', label: `${streakCount}-day streak` },
    red:    { flame: '#DC2626', label: `${streakCount}-day streak` },
    gold:   { flame: '#F59E0B', label: `${streakCount}-day streak` },
  }[streakTier];

  // "N / target" sticker readout — uses rank progress so the goal feels
  // meaningful (kids can see the next-rank milestone tick up).
  const stickerReadout = nextRank
    ? `${progress.current}/${progress.target}`
    : `${totalEarned}`;

  return (
    <motion.button
      type="button"
      data-testid="home-progress-card"
      onClick={() => navigate('/sticker-book')}
      initial={{ y: -8, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.4, type: 'spring' }}
      whileHover={{ y: -2, scale: 1.005 }}
      whileTap={{ y: 1, scale: 0.995 }}
      className="relative w-full flex items-center gap-2 md:gap-3 px-2 md:px-3 rounded-full bg-white cursor-pointer touch-manipulation"
      style={{
        border: '3px solid var(--jma-dark)',
        boxShadow: '0 4px 0 0 var(--jma-dark)',
        height: 60,
      }}
      aria-label={`${currentRank.title} · ${flamePalette.label} · ${stickerReadout} stickers · open Sticker Book`}
    >
      {/* Chip 1 — Rank */}
      <div className="flex items-center gap-2 md:gap-2.5 flex-1 min-w-0 pl-1">
        <div
          className="rounded-full flex items-center justify-center overflow-hidden flex-shrink-0 border-2 bg-white"
          style={{ width: 40, height: 40, borderColor: currentRank.color }}
        >
          <img
            src={currentRank.icon}
            alt=""
            className="w-full h-full object-contain"
            draggable={false}
          />
        </div>
        <div className="flex flex-col leading-tight min-w-0 text-left">
          <span
            className="text-[9px] md:text-[10px] uppercase tracking-wide font-black"
            style={{ color: currentRank.color }}
          >
            Academy Rank
          </span>
          <span
            className="text-sm md:text-base font-black font-display truncate"
            style={{ color: 'var(--jma-dark)' }}
            data-testid="rank-title"
          >
            {currentRank.title}
          </span>
        </div>
      </div>

      <Divider />

      {/* Chip 2 — Streak */}
      <div
        className="flex items-center gap-2 flex-shrink-0 min-w-0"
        data-testid="home-progress-streak"
      >
        <motion.span
          animate={{ scale: [1, 1.15, 1], rotate: [-4, 4, -4] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
          style={{ display: 'inline-flex' }}
        >
          <Flame
            className="w-6 h-6"
            style={{ color: flamePalette.flame }}
            fill={flamePalette.flame}
          />
        </motion.span>
        <div className="flex flex-col leading-tight text-left">
          <span
            className="text-sm md:text-base font-black font-display leading-none"
            style={{ color: 'var(--jma-dark)' }}
          >
            {flamePalette.label.split(' ')[0]}
          </span>
          <span
            className="text-[9px] md:text-[10px] font-black uppercase tracking-wide"
            style={{ color: 'var(--jma-dark)', opacity: 0.65 }}
          >
            {streakTier === 'new' ? 'streak' : 'day streak'}
          </span>
        </div>
      </div>

      <Divider />

      {/* Chip 3 — Stickers */}
      <div
        className="flex items-center gap-2 flex-shrink-0 min-w-0 pr-1"
        data-testid="home-progress-stickers"
      >
        <Star
          className="w-6 h-6 flex-shrink-0"
          style={{ color: '#F59E0B' }}
          fill="#FFCC00"
          strokeWidth={2}
        />
        <div className="flex flex-col leading-tight text-left">
          <span
            className="text-sm md:text-base font-black font-display leading-none"
            style={{ color: 'var(--jma-dark)' }}
          >
            {stickerReadout}
          </span>
          <span
            className="text-[9px] md:text-[10px] font-black uppercase tracking-wide"
            style={{ color: 'var(--jma-dark)', opacity: 0.65 }}
          >
            Stickers
          </span>
        </div>
      </div>
    </motion.button>
  );
}
