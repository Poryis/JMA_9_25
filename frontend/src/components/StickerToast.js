// Global "You earned a sticker!" toast that listens to useStickers anywhere
// in the app.
//
// Two render modes, driven by the batched payload from useStickers:
//   1) Single earn  → compact card with the sticker icon + name. Shown in
//      the TOP-RIGHT corner so it doesn't sit on top of gameplay.
//   2) Batched earn → "🎉 N New Stickers!" pill with a row of up to 4 mini
//      icons. Prevents the firehose of 3-4 popups in a heartbeat that early
//      exploration used to produce.
//
// In both modes the toast auto-dismisses after 2.5 s (down from 3.2 s) and
// is tap-to-dismiss anywhere on the card.

import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import useStickers from '../hooks/useStickers';
import useRank from '../hooks/useRank';
import { STICKER_MAP } from '../data/stickers';
import { ALL_ACHIEVEMENT_IDS } from '../data/achievements';

const MAX_ICONS_IN_BATCH = 4;

export default function StickerToast() {
  const { toast, dismissToast } = useStickers();
  const { currentRank, nextRank, progress } = useRank();
  const navigate = useNavigate();

  // Track rank-id across renders so we can detect the exact frame in which
  // an earn caused a rank crossing. On that frame the RankUpCelebration
  // owns the visual moment — the toast is suppressed to prevent competing
  // overlays. useRef init to null means we NEVER report a change on mount.
  const prevRankIdRef = useRef(null);
  const rankJustChanged =
    prevRankIdRef.current !== null && prevRankIdRef.current !== currentRank.id;
  useEffect(() => {
    prevRankIdRef.current = currentRank.id;
  }, [currentRank.id]);

  const ids = toast?.ids || [];
  const primary = toast?.primary;
  const isBatch = ids.length > 1;
  const accent = primary?.color || '#FFCC00';

  // Is the primary sticker in this toast an achievement badge (rank-driving)?
  // Only achievements get rank-progress copy; collection stickers stay flair.
  const isAchievement = !!primary && ALL_ACHIEVEMENT_IDS.includes(primary.id);

  // Dynamic progress line — only computed for single-achievement toasts
  // where the rank did NOT just change. Everything is sourced from live
  // rank state so the copy is literally true at this moment.
  let progressLine = null;
  if (isAchievement && !isBatch && !rankJustChanged) {
    if (!nextRank) {
      progressLine = 'You reached Maestro!';
    } else {
      const remaining = Math.max(0, progress.target - progress.current);
      if (remaining > 0) {
        progressLine = `${progress.current} of ${progress.target} toward ${nextRank.title}`;
      }
    }
  }

  // Coordination gate: if this earn also triggered a rank-up, the toast
  // yields the moment entirely to RankUpCelebration.
  const suppressForRankUp = isAchievement && rankJustChanged;

  const handleTap = () => {
    dismissToast();
    navigate('/sticker-book');
  };

  return (
    <AnimatePresence>
      {toast && !suppressForRankUp && (
        <motion.div
          key={ids.join('-')}
          data-testid="sticker-toast"
          className="fixed top-4 right-4 z-[100] flex items-center gap-2.5 bg-white rounded-2xl border-3 px-3 py-2 cursor-pointer max-w-[280px]"
          style={{ borderColor: accent, boxShadow: `0 5px 0 0 ${accent}` }}
          initial={{ x: 60, opacity: 0, scale: 0.85 }}
          animate={{ x: 0, opacity: 1, scale: 1 }}
          exit={{ x: 60, opacity: 0, scale: 0.85 }}
          transition={{ type: 'spring', stiffness: 320, damping: 22 }}
          onClick={handleTap}
          role="button"
          aria-label={isBatch ? `${ids.length} new stickers earned` : `New sticker: ${primary?.name}`}
        >
        {isBatch ? (
          <>
            <div
              className="flex items-center gap-0.5 flex-shrink-0"
              data-testid="sticker-toast-batch-icons"
            >
              {ids.slice(0, MAX_ICONS_IN_BATCH).map((id, i) => {
                const meta = STICKER_MAP[id];
                if (!meta) return null;
                return (
                  <motion.div
                    key={id}
                    initial={{ scale: 0, rotate: -20 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ delay: 0.08 * i, type: 'spring', stiffness: 360, damping: 16 }}
                    className="rounded-full border-2 flex-shrink-0"
                    style={{
                      width: 36, height: 36,
                      backgroundColor: meta.color || '#fff',
                      borderColor: 'var(--jma-dark)',
                      marginLeft: i === 0 ? 0 : -10,
                      zIndex: MAX_ICONS_IN_BATCH - i,
                    }}
                  >
                    <img
                      src={meta.icon}
                      alt=""
                      className="w-full h-full object-contain p-0.5"
                      draggable={false}
                    />
                  </motion.div>
                );
              })}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1" style={{ color: accent }}>
                <Sparkles className="inline w-3 h-3" /> New Stickers!
              </span>
              <span className="text-base font-black leading-tight font-display" style={{ color: 'var(--jma-dark)' }}>
                {ids.length} unlocked
              </span>
              <span className="text-[10px] font-bold opacity-60 truncate" style={{ color: 'var(--jma-dark)' }}>
                Tap to view →
              </span>
            </div>
          </>
        ) : (
          <>
            <motion.div
              animate={{ rotate: [0, -8, 8, -8, 0] }}
              transition={{ repeat: Infinity, duration: 1.4 }}
              className="rounded-full border-2 flex-shrink-0"
              style={{
                width: 40, height: 40,
                backgroundColor: primary.color || '#fff',
                borderColor: 'var(--jma-dark)',
              }}
            >
              <img
                src={primary.icon}
                alt={primary.name}
                className="w-full h-full object-contain p-0.5"
                draggable={false}
              />
            </motion.div>
            <div className="flex flex-col min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1" style={{ color: accent }}>
                <Sparkles className="inline w-3 h-3" /> {isAchievement ? 'New Badge!' : 'New Sticker!'}
              </span>
              <span className="text-sm font-black leading-tight font-display truncate" style={{ color: 'var(--jma-dark)' }}>
                {primary.name}
              </span>
              {progressLine && (
                <span
                  data-testid="sticker-toast-progress"
                  className="text-[10px] font-bold opacity-70 truncate"
                  style={{ color: 'var(--jma-dark)' }}
                >
                  {progressLine}
                </span>
              )}
            </div>
          </>
        )}
      </motion.div>
      )}
    </AnimatePresence>
  );
}
