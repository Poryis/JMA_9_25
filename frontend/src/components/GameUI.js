import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { Volume2 } from 'lucide-react';
import HarpIcon from './HarpIcon';
import RetroTVIcon from './RetroTVIcon';

// Arcade-cabinet marquee title. Chunky uppercase white letters with a
// thick JMA-dark stroke, sat on a mustard-yellow plate with four red
// "bulb" corner studs — a coach's whistle for the visual language of
// the JMA world. Deliberately not a plain <h1> anymore because kids
// were reading the old white-with-drop-shadow title as a placeholder.
function MarqueeTitle({ text }) {
  // Solid black rounded pill, chunky YELLOW border, navy drop shadow,
  // white sans-caps text. No text-shadow — iOS was rendering the stacked
  // shadows unreliably. Applies globally to every GameHeader across the
  // app. Yellow border matches the "Pick Your Jam" tile-title language
  // so the game headers feel like they belong to the same visual world.
  return (
    <div
      className="inline-flex items-center justify-center px-4 md:px-6 py-1.5 md:py-2 rounded-full"
      style={{
        background: '#000000',
        border: '4px solid var(--jma-yellow)',
        boxShadow: '0 4px 0 0 var(--jma-dark)',
      }}
    >
      <span
        className="font-black font-display uppercase text-sm md:text-lg lg:text-xl leading-none whitespace-nowrap"
        style={{
          color: '#FFFFFF',
          letterSpacing: '0.04em',
        }}
      >
        {text}
      </span>
    </div>
  );
}

// Small companion chip under the marquee. Hidden below 380px viewport
// (very narrow phones) — the marquee alone communicates enough there.
function SubtitleChip({ text }) {
  return (
    <span
      className="hidden min-[380px]:inline-block mt-1.5 rounded-full px-2.5 py-0.5 text-[9px] md:text-[11px] font-black font-display uppercase tracking-widest"
      style={{
        background: 'white',
        color: 'var(--jma-dark)',
        border: '2px solid var(--jma-dark)',
        boxShadow: '0 2px 0 0 var(--jma-dark)',
        letterSpacing: '0.12em',
      }}
    >
      {text}
    </span>
  );
}

function GameHeader({ title, subtitle, score, streak, showHomeButton = true, backTo = null, onBack: onBackOverride = null }) {
  const navigate = useNavigate();
  const location = useLocation();

  // Scroll-aware back button — when the kid has scrolled past the top,
  // the chunky harp/CRT shield collapses out of the way and only the
  // small "BACK" text pill (grown a touch for easy tapping) remains.
  // Back at scroll y=0 the full shield reappears. Threshold intentionally
  // small (24px) so the collapse fires early — the whole point is to
  // stop the shield from blocking game content the moment the user
  // starts to interact below the fold.
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    const check = () => setCollapsed((window.scrollY || 0) > 24);
    check();
    window.addEventListener('scroll', check, { passive: true });
    return () => window.removeEventListener('scroll', check);
  }, []);

  // The harp button acts as a "Back" button. By default we use browser
  // history (navigate(-1)) which works for most flows, but pages can
  // pass an explicit `backTo` route to force back to a specific parent
  // — critical inside JMAtv where history can point at a sibling video
  // rather than the channel menu.
  const isOnHome = location.pathname === '/';
  const renderBackButton = showHomeButton && !isOnHome;
  const handleBack = () => {
    // Custom onBack overrides default navigation — used by games that
    // want "back" to return to their in-page menu (e.g. difficulty
    // picker) instead of exiting the whole route. Dr. Jellybone uses
    // this so mid-game "back" drops kids to the difficulty screen
    // instead of jumping all the way out to /play.
    if (typeof onBackOverride === 'function') { onBackOverride(); return; }
    if (backTo) navigate(backTo);
    else navigate(-1);
  };

  // When the user is inside JMAtv routes, swap the harp for a tiny
  // cartoon CRT so the back-button reads as "back to the TV world"
  // instead of the generic Academy shield. Every other route keeps the
  // harp so the shield stays the strong Academy brand anchor.
  const insideJMAtv = location.pathname.startsWith('/jmatv');
  const BackIcon = insideJMAtv ? RetroTVIcon : HarpIcon;

  return (
    <header className="fixed top-0 left-0 right-0 z-50 px-2 md:px-4 py-1 md:py-3 pointer-events-none">
      <div className="max-w-7xl mx-auto flex items-start justify-between gap-2">
        {renderBackButton && (
          <div className="flex flex-row md:flex-col items-end md:items-center gap-1.5 md:gap-1.5 flex-shrink-0">
            <motion.button
              data-testid="back-button"
              aria-label="Back"
              onClick={handleBack}
              className="group flex flex-col items-center bg-transparent border-0 p-0 cursor-pointer pointer-events-auto"
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95, y: 2 }}
            >
              {/* Harp / CRT shield — collapses out on scroll so it stops
                  blocking game content below the fold. Framer animates
                  height + opacity + scale together for a smooth tuck. */}
              <AnimatePresence initial={false}>
                {!collapsed && (
                  <motion.div
                    key="back-shield"
                    initial={{ opacity: 0, height: 0, scale: 0.6 }}
                    animate={{ opacity: 1, height: 'auto', scale: 1 }}
                    exit={{ opacity: 0, height: 0, scale: 0.6 }}
                    transition={{ type: 'spring', stiffness: 320, damping: 26 }}
                    style={{ overflow: 'hidden' }}
                  >
                    <div
                      className="rounded-xl md:rounded-2xl border-2 md:border-3 border-[var(--jma-dark)] shadow-[0_3px_0_0_var(--jma-dark)] md:shadow-[0_4px_0_0_var(--jma-dark)] group-hover:shadow-[0_6px_0_0_var(--jma-dark)] transition-shadow w-10 h-10 md:w-12 md:h-12 lg:w-16 lg:h-16 overflow-hidden"
                      style={{
                        backgroundColor: 'var(--jma-dark)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 0,
                      }}
                    >
                      <div style={{ width: '118%', height: '118%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <BackIcon />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              <motion.span
                className="font-black uppercase tracking-wide rounded-full"
                animate={{
                  // Slightly larger + rounder pill when the shield is
                  // hidden so the label stays tap-friendly on its own.
                  paddingLeft: collapsed ? 14 : 10,
                  paddingRight: collapsed ? 14 : 10,
                  paddingTop: collapsed ? 5 : 1,
                  paddingBottom: collapsed ? 5 : 1,
                  marginTop: collapsed ? 0 : 4,
                }}
                transition={{ type: 'spring', stiffness: 320, damping: 26 }}
                style={{
                  color: 'white',
                  backgroundColor: 'var(--jma-dark)',
                  fontSize: collapsed ? 15 : 13,
                  lineHeight: 1,
                  boxShadow: collapsed ? '0 3px 0 0 rgba(0,0,0,0.35)' : 'none',
                }}
              >
                Back
              </motion.span>
            </motion.button>
          </div>
        )}

        {/* Title. Accepts a plain string (default Arcade Marquee) OR a
            ReactNode (per-game custom treatment — Robot Boogie uses
            this for its chrome/futurist title). Optional `subtitle`
            prop renders a small chip under the marquee.
            Same scroll-collapse dance as the harp back button — once
            the kid scrolls past the top the title tucks up and out of
            the way so it stops covering game content. It springs back
            when scroll returns to y=0. */}
        <AnimatePresence initial={false}>
          {title && !collapsed && (
            typeof title === 'string' ? (
              <motion.div
                key="header-title-string"
                className="flex flex-col items-center pointer-events-auto pt-1 md:pt-0 min-w-0 flex-shrink"
                initial={{ y: -20, opacity: 0, scale: 0.85 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: -24, opacity: 0, scale: 0.85 }}
                transition={{ type: 'spring', stiffness: 320, damping: 26 }}
              >
                <MarqueeTitle text={title} />
                {subtitle && <SubtitleChip text={subtitle} />}
              </motion.div>
            ) : (
              <motion.div
                key="header-title-node"
                className="pointer-events-auto pt-1 md:pt-0"
                initial={{ y: -20, opacity: 0, scale: 0.85 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: -24, opacity: 0, scale: 0.85 }}
                transition={{ type: 'spring', stiffness: 320, damping: 26 }}
              >
                {title}
              </motion.div>
            )
          )}
        </AnimatePresence>

        {/* Score display */}
        <div className="flex items-center gap-3 pointer-events-auto">
          {streak > 0 && (
            <motion.div
              className="game-card px-3 py-2 flex items-center gap-2"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
            >
              <span className="text-lg font-bold streak-fire">
                {streak}x
              </span>
            </motion.div>
          )}
          
          {score !== undefined && (
            <div className="game-card px-4 py-2">
              <span className="text-xl font-bold" style={{ color: 'var(--jma-dark)' }}>
                {score.toLocaleString()}
              </span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

function CharacterMascot({ character, position = 'left', message }) {
  const characterImages = {
    finn: 'assets/characters/finn-danger.png',
    charlie: 'assets/characters/charlie-polliwog.png',
    chunk: 'assets/characters/chunk.png',
    jazzy: 'assets/characters/jazzy.png',
    // Legacy aliases
    shark: 'assets/characters/finn-danger.png',
    catfish: 'assets/characters/charlie-polliwog.png'
  };

  return (
    <motion.div
      className={position === 'left' ? 'mascot-left' : 'mascot-right'}
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.5, type: 'spring' }}
    >
      <motion.img
        src={characterImages[character]}
        alt={character}
        className="w-full h-auto floating"
        animate={{ y: [0, -10, 0] }}
        transition={{ repeat: Infinity, duration: 2 }}
      />
      {message && (
        <motion.div
          className="absolute -top-16 left-1/2 -translate-x-1/2 bg-white px-4 py-2 rounded-xl border-3 border-[var(--jma-dark)] whitespace-nowrap"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 1 }}
        >
          <span className="font-bold text-sm">{message}</span>
        </motion.div>
      )}
    </motion.div>
  );
}

function FeedbackPopup({ feedback, onComplete }) {
  const feedbackStyles = {
    perfect: { color: '#4CD964', text: 'PERFECT!' },
    great: { color: '#4285F4', text: 'GREAT!' },
    good: { color: '#FFCC00', text: 'GOOD!' },
    miss: { color: '#FF3B30', text: 'MISS!' }
  };

  const style = feedbackStyles[feedback] || feedbackStyles.good;

  return (
    <motion.div
      className="feedback-overlay"
      style={{ color: style.color }}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 2, opacity: 0 }}
      transition={{ duration: 0.3 }}
      onAnimationComplete={onComplete}
    >
      {style.text}
    </motion.div>
  );
}

function NotationDisplay({ currentNote, rhythm }) {
  return (
    <div className="notation-display flex items-center gap-4">
      <Volume2 className="w-5 h-5" />
      <div className="flex items-center gap-2">
        <span className="font-bold">Note:</span>
        <span className="text-xl font-bold" style={{ color: 'var(--jma-blue)' }}>
          {currentNote || '-'}
        </span>
      </div>
      {rhythm && (
        <div className="flex items-center gap-2">
          <span className="font-bold">Rhythm:</span>
          <span className="text-xl">{rhythm}</span>
        </div>
      )}
    </div>
  );
}

function ProgressBar({ current, total, color = 'var(--jma-green)' }) {
  const percentage = (current / total) * 100;
  
  return (
    <div className="progress-bar-container w-full max-w-md">
      <div 
        className="progress-bar-fill"
        style={{ 
          width: `${percentage}%`,
          backgroundColor: color
        }}
      />
    </div>
  );
}

export { GameHeader, CharacterMascot, FeedbackPopup, NotationDisplay, ProgressBar };
