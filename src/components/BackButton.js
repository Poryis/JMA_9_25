// Reusable "back to parent" button used app-wide.
//
// Drops in beside the Home button in the GameHeader. Pill-shaped chip with
// a left arrow + parent-section name (e.g. "← Play", "← Lessons"). Tap
// navigates to the supplied path. Visual language mirrors the in-place
// back chips on JMAtv channel + Stew's Rhythm Academy mode pages so the
// whole app reads as one cohesive pattern.

import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function BackButton({ to, label, testId = 'back-button' }) {
  const navigate = useNavigate();
  return (
    <motion.button
      type="button"
      data-testid={testId}
      onClick={() => navigate(to)}
      aria-label={`Back to ${label}`}
      whileHover={{ x: -3, scale: 1.04 }}
      whileTap={{ scale: 0.95 }}
      className="inline-flex items-center gap-1.5 rounded-full border-2 md:border-3 px-2.5 md:px-3.5 py-1 md:py-1.5 font-black text-[10px] md:text-xs uppercase tracking-wider cursor-pointer pointer-events-auto"
      style={{
        backgroundColor: 'white',
        borderColor: 'var(--jma-dark)',
        color: 'var(--jma-dark)',
        boxShadow: '0 3px 0 0 var(--jma-dark)',
      }}
    >
      <ArrowLeft className="w-3 h-3 md:w-3.5 md:h-3.5" strokeWidth={3} />
      <span>{label}</span>
    </motion.button>
  );
}
