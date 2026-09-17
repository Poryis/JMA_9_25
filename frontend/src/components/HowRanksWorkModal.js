// HowRanksWorkModal — a friendly 3-panel explainer that walks a kid or
// parent through the JMA progression system. Opens from the "?" button
// next to the RankBadge on the Sticker Book page.
//
// Panels:
//   1. Skill tiers (Cadet → Pro → Master) live inside each domain
//   2. Ranks are earned by breadth across domains, not raw sticker count
//   3. The full 7-rank ladder from Polliwog to Maestro

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, Target, Sparkles, Trophy } from 'lucide-react';
import { RANKS } from '../data/ranks';

const JMA_DARK = 'var(--jma-dark)';

const PANELS = [
  {
    key: 'tiers',
    icon: Target,
    accent: '#4285F4',
    title: 'Skill Badges come in 3 tiers',
    body: (
      <>
        <p className="mb-3">
          Every music skill — <b>rhythm, ears, keyboard, beats, songs, scholar</b> — has
          three badges to earn:
        </p>
        <div className="flex items-center justify-center gap-2 md:gap-3 my-4">
          {[
            { label: 'Cadet', color: '#CD7F32', hint: 'Basics' },
            { label: 'Pro',   color: '#94A3B8', hint: 'Solid' },
            { label: 'Master', color: '#FFCC00', hint: 'Owned it' },
          ].map((t) => (
            <div
              key={t.label}
              className="flex flex-col items-center rounded-2xl border-4 px-3 py-2 md:px-4 md:py-3 bg-white shadow-[0_3px_0_0_var(--jma-dark)]"
              style={{ borderColor: JMA_DARK }}
            >
              <div className="w-9 h-9 md:w-10 md:h-10 rounded-full border-2 mb-1" style={{ backgroundColor: t.color, borderColor: JMA_DARK }} />
              <div className="text-[11px] md:text-xs font-black font-display uppercase" style={{ color: JMA_DARK }}>{t.label}</div>
              <div className="text-[10px] font-bold opacity-60">{t.hint}</div>
            </div>
          ))}
        </div>
        <p className="text-sm">
          You have to earn <b>Cadet</b> before <b>Pro</b>, and <b>Pro</b> before <b>Master</b> —
          no skipping steps!
        </p>
      </>
    ),
  },
  {
    key: 'breadth',
    icon: Sparkles,
    accent: '#AF52DE',
    title: 'Ranks are earned by BREADTH',
    body: (
      <>
        <p className="mb-3">
          Your <b>Academy Rank</b> isn't about how many stickers you have — it's about how
          many <b>different</b> music skills you've proven.
        </p>
        <div
          className="rounded-2xl border-4 p-3 md:p-4 bg-[#FFF8D6]"
          style={{ borderColor: JMA_DARK }}
        >
          <div className="text-xs md:text-sm font-black font-display mb-2" style={{ color: JMA_DARK }}>
            Example: to become a <span className="underline">Performer</span> you need…
          </div>
          <ul className="text-xs md:text-sm space-y-1 list-disc pl-5" style={{ color: JMA_DARK }}>
            <li>1 <b>Pro</b> badge in Rhythm</li>
            <li>1 <b>Pro</b> badge in Ear Training</li>
            <li>1 <b>Pro</b> badge in one more skill</li>
          </ul>
        </div>
        <p className="text-sm mt-3">
          Farming one game won't cut it — the ladder wants you to be a well-rounded musician.
        </p>
      </>
    ),
  },
  {
    key: 'ladder',
    icon: Trophy,
    accent: '#FFCC00',
    title: 'The full ladder',
    body: (
      <div>
        <p className="text-sm mb-3">
          Seven ranks — from <b>brand new</b> to <b>faculty</b>. Reaching Maestro means
          proving <b>3 different skills at all 3 tiers.</b>
        </p>
        <ol className="space-y-1.5" data-testid="rank-ladder-list">
          {RANKS.map((r, i) => (
            <li
              key={r.id}
              className="flex items-center gap-2 md:gap-3 rounded-xl border-2 bg-white px-2 py-1.5 md:px-3 md:py-2"
              style={{ borderColor: r.color }}
            >
              <div
                className="w-6 h-6 md:w-7 md:h-7 rounded-full flex-shrink-0 border-2"
                style={{ backgroundColor: r.badgeBg, borderColor: r.color }}
              />
              <div className="flex-1 min-w-0">
                <div className="text-xs md:text-sm font-black font-display leading-tight" style={{ color: JMA_DARK }}>
                  {i + 1}. {r.title}
                </div>
                <div className="text-[10px] md:text-xs font-bold opacity-70 leading-tight truncate">
                  {r.requirement.label}
                </div>
              </div>
            </li>
          ))}
        </ol>
      </div>
    ),
  },
];

export default function HowRanksWorkModal({ open, onClose }) {
  const [step, setStep] = useState(0);

  if (!open) return null;

  const panel = PANELS[step];
  const Icon = panel.icon;
  const canPrev = step > 0;
  const canNext = step < PANELS.length - 1;

  return (
    <AnimatePresence>
      <motion.div
        data-testid="how-ranks-modal"
        className="fixed inset-0 z-[80] flex items-center justify-center p-3 md:p-6"
        style={{ backgroundColor: 'rgba(10,37,64,0.55)' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-md rounded-3xl bg-white border-4 shadow-[0_8px_0_0_var(--jma-dark)] overflow-hidden"
          style={{ borderColor: JMA_DARK }}
          initial={{ y: 30, scale: 0.95, opacity: 0 }}
          animate={{ y: 0, scale: 1, opacity: 1 }}
          exit={{ y: 20, scale: 0.95, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 22 }}
        >
          {/* Header */}
          <div
            className="flex items-center gap-3 px-4 py-3 border-b-4"
            style={{ backgroundColor: panel.accent, borderColor: JMA_DARK }}
          >
            <div
              className="w-9 h-9 rounded-full bg-white border-2 flex items-center justify-center flex-shrink-0"
              style={{ borderColor: JMA_DARK }}
            >
              <Icon className="w-5 h-5" style={{ color: JMA_DARK }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-black uppercase tracking-wider text-white opacity-80">
                How ranks work · {step + 1}/{PANELS.length}
              </div>
              <div className="text-base md:text-lg font-black font-display text-white leading-tight truncate">
                {panel.title}
              </div>
            </div>
            <button
              data-testid="how-ranks-close"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white border-2 flex items-center justify-center touch-manipulation"
              style={{ borderColor: JMA_DARK }}
              aria-label="Close"
            >
              <X className="w-4 h-4" style={{ color: JMA_DARK }} />
            </button>
          </div>

          {/* Body */}
          <div className="px-4 py-4 md:px-5 md:py-5 text-[13px] md:text-sm" style={{ color: JMA_DARK }}>
            {panel.body}
          </div>

          {/* Footer nav */}
          <div className="flex items-center justify-between gap-2 px-4 py-3 bg-[#F5F7FB] border-t-2" style={{ borderColor: JMA_DARK }}>
            <button
              data-testid="how-ranks-prev"
              onClick={() => canPrev && setStep((s) => s - 1)}
              disabled={!canPrev}
              className="chunky-btn px-3 py-1.5 flex items-center gap-1 text-xs font-bold touch-manipulation disabled:opacity-40"
              style={{ backgroundColor: 'white', color: JMA_DARK, borderColor: JMA_DARK }}
            >
              <ChevronLeft className="w-4 h-4" /> Back
            </button>
            <div className="flex gap-1.5">
              {PANELS.map((p, i) => (
                <button
                  key={p.key}
                  onClick={() => setStep(i)}
                  aria-label={`Go to panel ${i + 1}`}
                  className="w-2.5 h-2.5 rounded-full border touch-manipulation"
                  style={{
                    backgroundColor: i === step ? JMA_DARK : 'white',
                    borderColor: JMA_DARK,
                  }}
                />
              ))}
            </div>
            {canNext ? (
              <button
                data-testid="how-ranks-next"
                onClick={() => setStep((s) => s + 1)}
                className="chunky-btn px-3 py-1.5 flex items-center gap-1 text-xs font-bold touch-manipulation"
                style={{ backgroundColor: 'var(--jma-yellow, #FFCC00)', color: JMA_DARK, borderColor: JMA_DARK }}
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                data-testid="how-ranks-done"
                onClick={onClose}
                className="chunky-btn px-3 py-1.5 text-xs font-bold touch-manipulation"
                style={{ backgroundColor: '#4CD964', color: 'white', borderColor: JMA_DARK }}
              >
                Got it!
              </button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
