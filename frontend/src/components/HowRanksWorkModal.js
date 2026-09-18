// HowRanksWorkModal — 3-panel explainer of the JMA progression system.
// Same skeleton for both audiences; copy swaps based on the parent
// page's Teacher View toggle so the "?" button feels contextual: kids
// see plain, playful language; grown-ups see the pedagogical rationale.

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, Target, Sparkles, Trophy } from 'lucide-react';
import { RANKS } from '../data/ranks';

const JMA_DARK = 'var(--jma-dark)';

// ---- Shared panel visuals (icon + accent color) --------------------
const PANEL_META = [
  { key: 'tiers',   icon: Target,    accent: '#4285F4' },
  { key: 'breadth', icon: Sparkles,  accent: '#AF52DE' },
  { key: 'ladder',  icon: Trophy,    accent: '#FFCC00' },
];

// ---- Kid-facing copy ----------------------------------------------
function KidPanel1() {
  return (
    <>
      <p className="mb-3">
        Every music skill has <b>3 badges</b> to earn — like levels in a game.
      </p>
      <div className="flex items-center justify-center gap-2 md:gap-3 my-4">
        {[
          { label: 'Cadet',  color: '#CD7F32', hint: 'Getting it' },
          { label: 'Pro',    color: '#94A3B8', hint: 'Rocking it' },
          { label: 'Master', color: '#FFCC00', hint: 'Owning it' },
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
        You gotta earn them in order — <b>Cadet</b>, then <b>Pro</b>, then <b>Master</b>. No skipping!
      </p>
    </>
  );
}

function KidPanel2() {
  return (
    <>
      <p className="mb-3">
        Ranks aren't about how many stickers you have. They're about how many <b>different</b> kinds of music you're good at!
      </p>
      <div className="rounded-2xl border-4 p-3 md:p-4 bg-[#FFF8D6]" style={{ borderColor: JMA_DARK }}>
        <div className="text-xs md:text-sm font-black font-display mb-2" style={{ color: JMA_DARK }}>
          Playing the same game over and over? That won't level you up.
        </div>
        <div className="text-xs md:text-sm" style={{ color: JMA_DARK }}>
          Try <b>lots of different games</b> and your rank goes up faster.
        </div>
      </div>
    </>
  );
}

function KidPanel3() {
  return (
    <div>
      <p className="text-sm mb-3">
        <b>Just starting out → running the show.</b> Seven ranks to climb!
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
                {r.subtitle}
              </div>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

// ---- Teacher / parent copy -----------------------------------------
function TeacherPanel1() {
  return (
    <>
      <p className="mb-3">
        Each of the <b>six music domains</b> — rhythm, ear training, keyboard, beat-making, songwriting,
        music scholar — has three enamel badges representing competency tiers.
      </p>
      <div className="flex items-center justify-center gap-2 md:gap-3 my-4">
        {[
          { label: 'Cadet',  color: '#CD7F32', hint: 'Emerging' },
          { label: 'Pro',    color: '#94A3B8', hint: 'Consistent' },
          { label: 'Master', color: '#FFCC00', hint: 'Fluent' },
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
        Advancement within a domain is gated: <b>Pro</b> requires <b>Cadet</b>; <b>Master</b> requires <b>Pro</b>.
      </p>
    </>
  );
}

function TeacherPanel2() {
  return (
    <>
      <p className="mb-3">
        The <b>Academy Rank</b> reflects <b>breadth of demonstrated skill</b> — not sticker volume.
        Advancement requires competency across multiple domains, preventing single-game grinding.
      </p>
      <div className="rounded-2xl border-4 p-3 md:p-4 bg-[#FFF8D6]" style={{ borderColor: JMA_DARK }}>
        <div className="text-xs md:text-sm font-black font-display mb-2" style={{ color: JMA_DARK }}>
          Example threshold — <span className="underline">Performer</span>:
        </div>
        <ul className="text-xs md:text-sm space-y-1 list-disc pl-5" style={{ color: JMA_DARK }}>
          <li>Pro-tier badge in <b>3 distinct</b> music domains</li>
          <li>Cadet prerequisite already satisfied in each</li>
        </ul>
      </div>
      <p className="text-sm mt-3 opacity-80">
        Reaching Maestro requires nine separate skill proofs (3 domains × 3 tiers).
      </p>
    </>
  );
}

function TeacherPanel3() {
  return (
    <div>
      <p className="text-sm mb-3">
        <b>Seven-rank ladder.</b> Each rank surfaces a specific requirement so progress is legible to students and printable for reports.
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
  );
}

// ---- Panel selection -----------------------------------------------
function getPanels(teacherView) {
  if (teacherView) {
    return [
      { ...PANEL_META[0], title: 'Skill Badges: Cadet · Pro · Master', body: <TeacherPanel1 /> },
      { ...PANEL_META[1], title: 'Ranks reward breadth',                body: <TeacherPanel2 /> },
      { ...PANEL_META[2], title: 'The Rank Ladder',                     body: <TeacherPanel3 /> },
    ];
  }
  return [
    { ...PANEL_META[0], title: 'Badges have 3 levels',      body: <KidPanel1 /> },
    { ...PANEL_META[1], title: 'Try lots of stuff!',        body: <KidPanel2 /> },
    { ...PANEL_META[2], title: 'The ranks',                 body: <KidPanel3 /> },
  ];
}

export default function HowRanksWorkModal({ open, onClose, teacherView = false }) {
  const [step, setStep] = useState(0);

  if (!open) return null;

  const panels = getPanels(teacherView);
  const panel = panels[step] || panels[0];
  const Icon = panel.icon;
  const canPrev = step > 0;
  const canNext = step < panels.length - 1;

  const audienceLabel = teacherView ? 'For grown-ups' : 'How ranks work';

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
                {audienceLabel} · {step + 1}/{panels.length}
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
