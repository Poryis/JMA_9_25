// AchievementBadge — soft, round medal style.
//
// Visual story:
//   • Round so it doesn't compete with the chunky rectangular UI elsewhere
//   • Domain color provides the personality (matches rank ladder)
//   • Tier indicated by a thin ring + small text label below (bronze/silver/gold)
//   • Locked: pale grey + small padlock icon, never desaturated metallic noise
//
// Sizes: 'sm' (sticker-book cell), 'md' (modals/toasts), 'lg' (hero blocks).

import { motion } from 'framer-motion';
import { Lock } from 'lucide-react';
import { DOMAIN_MAP, TIER_MAP } from '../data/achievements';

const SIZES = {
  sm: { box: 76,  iconImg: 44, ring: 4, labelFs: 9,  nameFs: 10 },
  md: { box: 118, iconImg: 70, ring: 5, labelFs: 11, nameFs: 11 },
  lg: { box: 168, iconImg: 100, ring: 7, labelFs: 13, nameFs: 12 },
};

export default function AchievementBadge({
  domain,
  tier,
  earned = false,
  size = 'md',
  showName = true,
  onClick,
  testId,
}) {
  const dom = DOMAIN_MAP[domain];
  const tr  = TIER_MAP[tier];
  const dims = SIZES[size] || SIZES.md;
  if (!dom || !tr) return null;

  const interactive = !!onClick;
  const isLocked = !earned;

  // Tier ring colors — softer than the previous metallic gradients
  const ringColor = isLocked ? '#CFD4DA' : tr.frame;
  const ringHighlight = isLocked ? '#E6E9EC' : tr.frameHi;
  // Domain tint for the disc
  const discBg = isLocked
    ? '#F1F3F5'
    : `radial-gradient(circle at 35% 30%, white 0%, ${dom.color}1A 60%, ${dom.color}33 100%)`;

  return (
    <motion.button
      data-testid={testId}
      onClick={onClick}
      whileHover={interactive ? { scale: 1.05, y: -2 } : undefined}
      whileTap={interactive ? { scale: 0.96 } : undefined}
      className="relative flex flex-col items-center select-none focus:outline-none bg-transparent border-0 p-0"
      style={{
        width: dims.box,
        cursor: interactive ? 'pointer' : 'default',
      }}
    >
      {/* The medal: round disc + a thin colored tier ring */}
      <div
        className="relative rounded-full flex items-center justify-center"
        style={{
          width: dims.box,
          height: dims.box,
          padding: dims.ring,
          background: `linear-gradient(160deg, ${ringHighlight} 0%, ${ringColor} 70%, ${isLocked ? '#A8AEB6' : ringColor} 100%)`,
          boxShadow: isLocked
            ? 'inset 0 1px 2px rgba(255,255,255,0.5), 0 2px 4px rgba(10,37,64,0.08)'
            : `inset 0 1px 2px rgba(255,255,255,0.6), 0 4px 10px ${ringColor}55, 0 1px 0 rgba(10,37,64,0.08)`,
        }}
      >
        <div
          className="rounded-full flex items-center justify-center relative overflow-hidden"
          style={{
            width: '100%',
            height: '100%',
            background: discBg,
          }}
        >
          <img
            src={dom.icon}
            alt={dom.label}
            draggable={false}
            style={{
              width: dims.iconImg,
              height: dims.iconImg,
              objectFit: 'contain',
              opacity: isLocked ? 0.32 : 1,
              filter: isLocked ? 'grayscale(0.7) brightness(0.95)' : 'none',
            }}
          />
          {isLocked && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Lock
                style={{
                  width: dims.iconImg * 0.35,
                  height: dims.iconImg * 0.35,
                  color: '#6B7280',
                  filter: 'drop-shadow(0 1px 0 rgba(255,255,255,0.85))',
                }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Tier label — small + soft, no chunky banner */}
      <div
        className="mt-1 font-black font-display uppercase tracking-wider leading-none"
        style={{
          fontSize: dims.labelFs,
          color: isLocked ? '#9AA0A6' : ringColor,
          letterSpacing: '0.08em',
        }}
      >
        {tr.ribbon}
      </div>

      {showName && (
        <div
          className="text-center mt-0.5 font-bold leading-tight"
          style={{
            fontSize: dims.nameFs,
            color: isLocked ? '#9AA0A6' : 'var(--jma-dark)',
            opacity: isLocked ? 0.65 : 0.9,
            maxWidth: dims.box * 1.1,
          }}
        >
          {dom.label}
        </div>
      )}
    </motion.button>
  );
}
