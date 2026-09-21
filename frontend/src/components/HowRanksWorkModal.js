// HowRanksWorkModal — comic-strip explainer of the JMA progression
// system, hosted by Dr. Jellybone. Copy still swaps between kid and
// teacher/parent audiences (parent = Sticker Book's Teacher View),
// but wrapped in a comic-book presentation: halftone-dotted panels,
// speech bubbles from Dr. J on every step, and a POW! starburst on
// each panel transition.

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { RANKS } from '../data/ranks';

const JMA_DARK = 'var(--jma-dark)';
const DR_J = 'assets/characters/dr-jellybone.png';
const DR_J_GRAD = 'assets/characters/charlie-grad.png';

// ------------------------------------------------------------------
// Speech bubble — pointy tail on the bottom-left, big block-shadow
// border to sell the comic-strip vibe.
// ------------------------------------------------------------------
function SpeechBubble({ children, accent }) {
  return (
    <div
      className="relative rounded-2xl border-[3px] bg-white shadow-[0_4px_0_0_var(--jma-dark)] px-3 py-2 md:px-4 md:py-3"
      style={{ borderColor: JMA_DARK }}
    >
      <div className="text-[13px] md:text-sm font-bold leading-snug" style={{ color: JMA_DARK }}>
        {children}
      </div>
      {/* Tail — two triangles stacked to fake a stroked speech tail. */}
      <svg
        aria-hidden="true"
        viewBox="0 0 20 18"
        style={{
          position: 'absolute',
          left: 14,
          bottom: -14,
          width: 22,
          height: 20,
          overflow: 'visible',
        }}
      >
        <polygon points="2,0 18,0 4,16" fill={JMA_DARK} />
        <polygon points="4,0 16,0 6,12" fill="white" />
      </svg>
      {/* Corner accent chip */}
      <div
        aria-hidden="true"
        className="absolute -top-2 -right-2 w-6 h-6 rounded-full border-[3px] flex items-center justify-center text-white text-[10px] font-black"
        style={{ backgroundColor: accent, borderColor: JMA_DARK }}
      >
        !
      </div>
    </div>
  );
}

// ------------------------------------------------------------------
// Shared visual bits inside each panel
// ------------------------------------------------------------------
function TierChips({ items }) {
  return (
    <div className="flex items-end justify-center gap-2 md:gap-3">
      {items.map((t) => (
        <div
          key={t.label}
          className="flex flex-col items-center rounded-2xl border-[3px] px-2 py-1.5 md:px-3 md:py-2 bg-white shadow-[0_3px_0_0_var(--jma-dark)]"
          style={{ borderColor: JMA_DARK }}
        >
          <div className="w-8 h-8 md:w-9 md:h-9 rounded-full border-2 mb-1" style={{ backgroundColor: t.color, borderColor: JMA_DARK }} />
          <div className="text-[10px] md:text-[11px] font-black font-display uppercase" style={{ color: JMA_DARK }}>
            {t.label}
          </div>
          <div className="text-[9px] font-bold opacity-60">{t.hint}</div>
        </div>
      ))}
    </div>
  );
}

function LadderList({ formal }) {
  return (
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
              {formal ? r.requirement.label : r.subtitle}
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}

// ------------------------------------------------------------------
// Panel content — kid vs teacher copy, hosted by Dr. J
// ------------------------------------------------------------------
const KID_PANELS = [
  {
    key: 'system',
    portrait: DR_J,
    quote: 'Every music skill has 3 badges — Cadet, Pro, Master. Try different music skills to level up your rank!',
    accent: '#4285F4',
    title: 'How badges become ranks',
    content: (
      <div className="space-y-3">
        <TierChips
          items={[
            { label: 'Cadet',  color: '#CD7F32', hint: 'Getting it' },
            { label: 'Pro',    color: '#94A3B8', hint: 'Rocking it' },
            { label: 'Master', color: '#FFCC00', hint: 'Owning it' },
          ]}
        />
        <div className="rounded-2xl border-[3px] p-2.5 bg-[#FFF8D6]" style={{ borderColor: JMA_DARK }}>
          <div className="text-[11px] md:text-xs font-bold" style={{ color: JMA_DARK }}>
            Different music skills = faster rank-ups.
          </div>
        </div>
      </div>
    ),
  },
  {
    key: 'ladder',
    portrait: DR_J_GRAD,
    quote: 'Seven ranks to climb. Start as a Polliwog and work your way up!',
    accent: '#FFCC00',
    title: 'The ranks',
    content: <LadderList formal={false} />,
  },
];

const TEACHER_PANELS = [
  {
    key: 'system',
    portrait: DR_J,
    quote: 'Each domain has three enamel tiers (Cadet, Pro, Master); ranks reflect breadth of skill across domains.',
    accent: '#4285F4',
    title: 'How badges become ranks',
    content: (
      <div className="space-y-3">
        <TierChips
          items={[
            { label: 'Cadet',  color: '#CD7F32', hint: 'Emerging' },
            { label: 'Pro',    color: '#94A3B8', hint: 'Consistent' },
            { label: 'Master', color: '#FFCC00', hint: 'Fluent' },
          ]}
        />
        <div className="rounded-2xl border-[3px] p-2.5 bg-[#FFF8D6]" style={{ borderColor: JMA_DARK }}>
          <div className="text-[11px] md:text-xs font-black font-display mb-0.5" style={{ color: JMA_DARK }}>
            Example threshold — Performer:
          </div>
          <div className="text-[11px] md:text-xs" style={{ color: JMA_DARK }}>
            Pro badge in <b>3 distinct</b> domains, with Cadet prerequisite satisfied in each.
          </div>
        </div>
      </div>
    ),
  },
  {
    key: 'ladder',
    portrait: DR_J_GRAD,
    quote: 'Seven ranks. Each has a clear requirement, perfect for printed report cards.',
    accent: '#FFCC00',
    title: 'The Rank Ladder',
    content: <LadderList formal={true} />,
  },
];

function getPanels(teacherView) {
  return teacherView ? TEACHER_PANELS : KID_PANELS;
}

// ------------------------------------------------------------------
// The modal itself
// ------------------------------------------------------------------
export default function HowRanksWorkModal({ open, onClose, teacherView = false }) {
  const [step, setStep] = useState(0);
  const audienceLabel = teacherView ? 'For grown-ups' : 'Missions Guide';

  // Reset to the first panel every time the modal reopens.
  useEffect(() => {
    if (open) setStep(0);
  }, [open]);

  if (!open) return null;

  const panels = getPanels(teacherView);
  const panel = panels[step] || panels[0];
  const canPrev = step > 0;
  const canNext = step < panels.length - 1;

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
          className="relative w-full max-w-lg rounded-3xl bg-white border-4 shadow-[0_10px_0_0_var(--jma-dark)] overflow-hidden"
          style={{ borderColor: JMA_DARK }}
          initial={{ y: 30, scale: 0.9, opacity: 0, rotate: -1 }}
          animate={{ y: 0, scale: 1, opacity: 1, rotate: 0 }}
          exit={{ y: 20, scale: 0.95, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 20 }}
        >
          {/* Header — arcade marquee stripe */}
          <div
            className="flex items-center gap-3 px-4 py-3 border-b-4"
            style={{
              background: `linear-gradient(180deg, ${panel.accent} 0%, ${panel.accent}CC 100%)`,
              borderColor: JMA_DARK,
            }}
          >
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-black uppercase tracking-wider text-white opacity-90">
                {audienceLabel} · Issue #{step + 1} of {panels.length}
              </div>
              <div className="text-lg md:text-xl font-black font-display text-white leading-tight truncate">
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

          {/* Comic-strip body — halftone bg, mascot + speech, main content. */}
          <div className="jma-halftone relative">
            <div className="p-4 md:p-5">
              {/* Mascot row — Dr. J on the left, speech bubble to his right. */}
              <div className="flex items-end gap-3 mb-4">
                <div className="flex-shrink-0 w-20 md:w-24">
                  <AnimatePresence mode="wait">
                    <motion.img
                      key={panel.key}
                      src={panel.portrait}
                      alt=""
                      draggable={false}
                      className="w-full h-auto"
                      style={{ filter: 'drop-shadow(0 4px 0 rgba(10,37,64,0.35))' }}
                      initial={{ scale: 0.6, rotate: -12, opacity: 0 }}
                      animate={{ scale: 1, rotate: 0, opacity: 1 }}
                      exit={{ scale: 0.6, rotate: 12, opacity: 0 }}
                      transition={{ type: 'spring', stiffness: 320, damping: 18 }}
                    />
                  </AnimatePresence>
                </div>
                <div className="flex-1 min-w-0 pb-2">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={panel.key + '-bubble'}
                      initial={{ y: 8, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: 8, opacity: 0 }}
                      transition={{ duration: 0.18 }}
                    >
                      <SpeechBubble accent={panel.accent}>{panel.quote}</SpeechBubble>
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>

              {/* Content card — the actual info framed as a comic panel. */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={panel.key + '-content'}
                  className="rounded-2xl bg-white border-[3px] shadow-[0_5px_0_0_var(--jma-dark)] p-3 md:p-4"
                  style={{ borderColor: JMA_DARK }}
                  initial={{ scale: 0.92, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.92, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 22 }}
                >
                  {panel.content}
                </motion.div>
              </AnimatePresence>
            </div>
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
              {panels.map((p, i) => (
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
