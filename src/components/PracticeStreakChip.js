// PracticeStreakChip — shows the kid's current daily-return streak.
// Renders nothing when the streak is 0 or 1 (so it doesn't shame day-one
// kids — only appears once they've actually returned).

import { motion } from 'framer-motion';
import { Flame } from 'lucide-react';
import usePracticeStreak from '../hooks/usePracticeStreak';

export default function PracticeStreakChip() {
  const { count } = usePracticeStreak();
  if (!count || count < 2) return null;

  // Tier styling — bronze at 2, orange at 3+, red at 7+, gold at 14+
  const tier = count >= 14 ? 'gold' : count >= 7 ? 'red' : count >= 3 ? 'orange' : 'bronze';
  const palette = {
    bronze: { bg: '#FFE4B5', flame: '#CD7F32', text: '#5C3A12' },
    orange: { bg: '#FFCC00', flame: '#FF6B35', text: '#5C3A12' },
    red:    { bg: '#FF6B35', flame: '#FFE4B5', text: 'white' },
    gold:   { bg: '#FFD700', flame: '#B91C1C', text: '#5C3A12' },
  }[tier];

  const label = count >= 14 ? 'Two-Week Trooper!' :
                count >= 7  ? 'Weekly Wonder!' :
                count >= 3  ? 'Practice Buddy!' :
                              'Coming back!';

  return (
    <motion.div
      data-testid="practice-streak-chip"
      className="flex items-center gap-1.5 rounded-full border-3 px-3 py-1.5 font-black"
      style={{
        backgroundColor: palette.bg,
        borderColor: 'var(--jma-dark)',
        color: palette.text,
        boxShadow: '0 4px 0 0 var(--jma-dark)',
      }}
      initial={{ y: -8, opacity: 0, scale: 0.85 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      transition={{ delay: 0.55, type: 'spring' }}
    >
      <motion.span
        animate={{ scale: [1, 1.15, 1], rotate: [-6, 6, -6] }}
        transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
        style={{ display: 'inline-flex' }}
      >
        <Flame className="w-4 h-4" style={{ color: palette.flame }} fill={palette.flame} />
      </motion.span>
      <span className="text-sm leading-none" data-testid="practice-streak-count">
        {count}-day streak · {label}
      </span>
    </motion.div>
  );
}
