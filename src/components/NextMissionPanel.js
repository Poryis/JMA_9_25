// NextMissionPanel — slim "do this next" pill on the homepage.
//
// Compact horizontal strip (~60px tall) that echoes HomeProgressCard's
// shape so the two Home banners feel like siblings. Domain-colored,
// clickable, hidden when the kid has completed every achievement.

import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Target, ChevronRight, PartyPopper } from 'lucide-react';
import useNextMission from '../hooks/useNextMission';

export default function NextMissionPanel() {
  const navigate = useNavigate();
  const { mission, complete } = useNextMission();

  if (complete) {
    return (
      <motion.div
        data-testid="next-mission-complete"
        className="w-full flex items-center gap-2.5 rounded-full border-3 px-3 md:px-4"
        style={{
          borderColor: 'var(--jma-dark)',
          borderWidth: 3,
          background: 'linear-gradient(135deg, #FFE07A 0%, #FFCC00 100%)',
          boxShadow: '0 4px 0 0 var(--jma-dark)',
          height: 56,
        }}
        initial={{ scale: 0.95, opacity: 0, y: 6 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ delay: 0.55, type: 'spring' }}
      >
        <PartyPopper className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--jma-dark)' }} />
        <div className="flex flex-col leading-tight flex-1 min-w-0 text-left">
          <span
            className="text-[9px] md:text-[10px] uppercase tracking-wide font-black opacity-70"
            style={{ color: 'var(--jma-dark)' }}
          >
            All Missions Complete
          </span>
          <span
            className="text-sm md:text-base font-black font-display truncate"
            style={{ color: 'var(--jma-dark)' }}
          >
            You&apos;re a true Maestro! Keep jamming.
          </span>
        </div>
      </motion.div>
    );
  }

  if (!mission) return null;

  const { domain, tier, instruction, cta, route } = mission;

  return (
    <motion.button
      data-testid="next-mission-panel"
      onClick={() => navigate(route)}
      className="w-full flex items-center gap-2.5 rounded-full border-3 px-3 md:px-4 text-left cursor-pointer touch-manipulation"
      style={{
        borderColor: 'var(--jma-dark)',
        borderWidth: 3,
        background: 'white',
        boxShadow: `0 4px 0 0 var(--jma-dark), inset 0 0 0 3px ${domain.color}`,
        height: 56,
      }}
      initial={{ scale: 0.95, opacity: 0, y: 6 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      transition={{ delay: 0.55, type: 'spring' }}
      whileHover={{ y: -2, scale: 1.005 }}
      whileTap={{ y: 1, scale: 0.995 }}
    >
      {/* Domain avatar */}
      <div
        className="flex-shrink-0 rounded-full flex items-center justify-center overflow-hidden bg-white border-2"
        style={{
          width: 40,
          height: 40,
          borderColor: domain.color,
        }}
      >
        <img
          src={domain.icon}
          alt=""
          className="w-full h-full object-contain"
          draggable={false}
        />
      </div>

      {/* Text — single-line focus */}
      <div className="flex flex-col leading-tight flex-1 min-w-0">
        <span
          className="text-[9px] md:text-[10px] uppercase tracking-wide font-black flex items-center gap-1"
          style={{ color: domain.color }}
        >
          <Target className="w-3 h-3" />
          Next Mission
          <span
            className="text-[8px] md:text-[9px] font-black px-1.5 py-0.5 rounded-full ml-1"
            style={{
              backgroundColor: tier.frame,
              color: tier.ribbonBg,
              border: `1.5px solid ${tier.ribbonBg}`,
              lineHeight: 1,
            }}
            data-testid="next-mission-tier"
          >
            {tier.ribbon}
          </span>
        </span>
        <span
          className="text-sm md:text-base font-black font-display truncate"
          style={{ color: 'var(--jma-dark)' }}
          data-testid="next-mission-instruction"
        >
          {instruction}
        </span>
      </div>

      {/* GO chip */}
      <div
        className="flex-shrink-0 flex items-center gap-1 text-xs md:text-sm font-black rounded-full px-2.5 md:px-3 py-1"
        style={{
          backgroundColor: domain.color,
          color: 'white',
          boxShadow: '0 2px 0 0 var(--jma-dark)',
        }}
        data-testid="next-mission-go"
      >
        <span className="hidden sm:inline">{cta}</span>
        <span className="sm:hidden">GO</span>
        <ChevronRight className="w-3.5 h-3.5" />
      </div>
    </motion.button>
  );
}
