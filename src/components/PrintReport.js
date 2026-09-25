// PrintReport — one-page student progress summary, designed for paper.
//
// The component is rendered inside a portal-style overlay only when the
// "Print Report" button is clicked. The print stylesheet in index.css
// guarantees only this block prints — everything else is hidden by
// `body * { visibility: hidden }` and the report flips itself back to
// visible. After printing the user can dismiss the overlay.
//
// Pulls live data from the same hooks the in-app UI uses:
//   - useStickers       → which achievements are earned
//   - useRank           → current/next rank + progress
//   - usePracticeStreak → streak count
//   - usePlayTime       → total active play time
//   - usePlayer         → student name

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Printer } from 'lucide-react';
import { ACHIEVEMENT_DOMAINS, ACHIEVEMENT_TIERS, achievementId } from '../data/achievements';
import useStickers from '../hooks/useStickers';
import useRank from '../hooks/useRank';
import { formatPlayTime } from '../hooks/usePlayTime';
import { getPlayerSnapshot } from '../lib/playerStorage';

function todayFormatted() {
  const d = new Date();
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

// Latest earnedAt across all stickers → "last active" approximation.
function lastActiveFrom(achievements) {
  const dates = Object.values(achievements || {})
    .map(e => e?.earnedAt)
    .filter(Boolean)
    .map(d => new Date(d).getTime())
    .filter(t => !Number.isNaN(t));
  if (!dates.length) return null;
  return new Date(Math.max(...dates));
}

function daysAgo(dateObj) {
  if (!dateObj) return '—';
  const diff = Date.now() - dateObj.getTime();
  const days = Math.floor(diff / 86400000);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  return `${days} days ago`;
}

export default function PrintReport({ open, onClose }) {
  const { earned } = useStickers();
  const { currentRank, nextRank, progress, achievementCount } = useRank();

  // Build the canonical snapshot at every render. The print report is the
  // first consumer of `getPlayerSnapshot()` — when accounts ship later, this
  // same shape is what the backend will round-trip with us.
  const snapshot = getPlayerSnapshot();
  const [editableName, setEditableName] = useState(() => snapshot.displayName || '');

  const streakCount = snapshot.progress.practiceStreak?.count || 0;
  const playTimeMs = snapshot.progress.totalPlayMs;
  const lastActive = lastActiveFrom(snapshot.progress.achievements);
  const totalAchievements = ACHIEVEMENT_DOMAINS.length * ACHIEVEMENT_TIERS.length;

  // Per-domain tier breakdown
  const domainRows = ACHIEVEMENT_DOMAINS.map((dom) => {
    const tiers = ACHIEVEMENT_TIERS.map((t) => ({
      ...t,
      earned: !!earned[achievementId(dom.id, t.id)],
    }));
    return { ...dom, tiers, anyEarned: tiers.some(t => t.earned) };
  });

  const print = () => window.print();

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          data-testid="print-report-modal"
          className="fixed inset-0 z-[180] flex items-center justify-center p-2 md:p-6 overflow-auto"
          style={{
            background: 'rgba(10,37,64,0.55)',
            backdropFilter: 'blur(4px)',
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="jma-print-report bg-white rounded-2xl border-4 shadow-2xl max-w-2xl w-full p-6 md:p-8 relative"
            style={{ borderColor: 'var(--jma-dark)', boxShadow: '0 10px 0 0 var(--jma-dark)' }}
            initial={{ scale: 0.85, y: 30 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0 }}
          >
            {/* Top action bar — visible in app, hidden in print */}
            <div className="no-print absolute top-3 right-3 flex items-center gap-2">
              <button
                data-testid="print-report-print-btn"
                onClick={print}
                className="chunky-btn flex items-center gap-1 text-xs md:text-sm font-black px-3 py-1.5"
                style={{ backgroundColor: 'var(--jma-blue)', color: 'white' }}
              >
                <Printer className="w-4 h-4" /> Print
              </button>
              <button
                data-testid="print-report-close"
                onClick={onClose}
                className="chunky-btn flex items-center justify-center text-xs font-black w-9 h-9"
                style={{ backgroundColor: 'white', color: 'var(--jma-dark)' }}
                aria-label="Close report"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Report content — what actually prints */}
            <header className="border-b-2 border-[var(--jma-dark)] pb-3 mb-4 pr-24">
              <div className="text-[10px] uppercase tracking-widest font-black opacity-60" style={{ color: 'var(--jma-dark)' }}>
                Jelly of the Month Club Music Academy
              </div>
              <h1 className="text-2xl md:text-3xl font-black font-display" style={{ color: 'var(--jma-dark)' }}>
                Student Progress Report
              </h1>
              <div className="mt-2 flex items-baseline gap-3 flex-wrap text-sm" style={{ color: 'var(--jma-dark)' }}>
                <span className="font-bold">Student:</span>
                <input
                  data-testid="print-report-name"
                  type="text"
                  value={editableName}
                  onChange={(e) => setEditableName(e.target.value)}
                  placeholder="Type student name..."
                  className="font-black border-b-2 border-[var(--jma-dark)] bg-transparent px-1 py-0.5 outline-none min-w-[140px] flex-1 max-w-[260px]"
                  style={{ color: 'var(--jma-dark)' }}
                />
                <span className="font-bold ml-auto">Date:</span>
                <span className="font-black" data-testid="print-report-date">{todayFormatted()}</span>
              </div>
            </header>

            {/* Top stats row */}
            <section className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5" data-testid="print-report-stats">
              <Stat label="Current Rank"     value={currentRank.title} hint={nextRank ? `Next: ${nextRank.title}` : 'Top rank!'} />
              <Stat label="Badges Earned"    value={`${achievementCount} / ${totalAchievements}`} hint={nextRank ? progress.hint : 'All earned!'} />
              <Stat label="Practice Streak"  value={`${streakCount} day${streakCount === 1 ? '' : 's'}`} hint={streakCount > 0 ? 'In a row' : 'Start today!'} />
              <Stat label="Total Play Time"  value={formatPlayTime(playTimeMs)} hint={`Last active: ${daysAgo(lastActive)}`} />
            </section>

            {/* Skills demonstrated */}
            <section>
              <h2 className="text-lg font-black font-display mb-2 pb-1 border-b-2" style={{ color: 'var(--jma-dark)', borderColor: 'var(--jma-dark)' }}>
                Skills Demonstrated
              </h2>
              <div className="space-y-2">
                {domainRows.map((dom) => (
                  <div
                    key={dom.id}
                    data-testid={`print-report-domain-${dom.id}`}
                    className="flex items-start gap-3 p-2 rounded-lg border"
                    style={{
                      borderColor: dom.anyEarned ? dom.color : 'rgba(10,37,64,0.2)',
                      backgroundColor: dom.anyEarned ? `${dom.color}10` : 'transparent',
                    }}
                  >
                    <div className="flex-shrink-0 mt-0.5 w-9 h-9 rounded-full border-2 overflow-hidden"
                      style={{ borderColor: dom.color, backgroundColor: `${dom.color}25` }}>
                      <img src={dom.icon} alt="" className="w-full h-full object-contain" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="font-black font-display text-sm md:text-base" style={{ color: 'var(--jma-dark)' }}>
                          {dom.label}
                        </div>
                        <div className="flex gap-1 text-[10px] md:text-xs font-black">
                          {dom.tiers.map((t) => (
                            <span
                              key={t.id}
                              className="px-1.5 py-0.5 rounded-full border-2"
                              style={{
                                backgroundColor: t.earned ? '#34A853' : 'white',
                                color: t.earned ? 'white' : 'rgba(10,37,64,0.45)',
                                borderColor: t.earned ? '#34A853' : 'rgba(10,37,64,0.3)',
                              }}
                            >
                              {t.earned ? '✓ ' : ''}{t.ribbon || t.id.toUpperCase()}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="text-[10px] md:text-xs mt-0.5 leading-snug" style={{ color: 'var(--jma-dark)', opacity: 0.85 }}>
                        {dom.teacherDescription}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <footer className="mt-5 pt-2 text-[10px] text-center opacity-50" style={{ color: 'var(--jma-dark)' }}>
              JMA Music Academy · Each badge represents specific, demonstrated musical competency.
            </footer>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Stat({ label, value, hint }) {
  return (
    <div className="rounded-lg border-2 p-2"
      style={{ borderColor: 'rgba(10,37,64,0.3)' }}>
      <div className="text-[9px] uppercase tracking-wide font-black opacity-60" style={{ color: 'var(--jma-dark)' }}>
        {label}
      </div>
      <div className="font-black font-display text-base md:text-lg leading-tight" style={{ color: 'var(--jma-dark)' }}>
        {value}
      </div>
      {hint && (
        <div className="text-[10px] font-bold mt-0.5 leading-tight" style={{ color: 'var(--jma-dark)', opacity: 0.7 }}>
          {hint}
        </div>
      )}
    </div>
  );
}
