// PlayerNamePrompt — friendly first-visit modal that asks "Who is this?"
// once. Shows whenever no player name exists in localStorage AND we're on the
// home page (we don't want to interrupt a kid mid-game). Skippable.

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import usePlayer from '../hooks/usePlayer';

const SKIPPED_KEY = 'jma_player_name_skipped_v1';

function readSkipped() {
  try { return localStorage.getItem(SKIPPED_KEY) === '1'; } catch { return false; }
}
function markSkipped() {
  try { localStorage.setItem(SKIPPED_KEY, '1'); } catch { /* ignore */ }
}

// Live hash tracker so PlayerNamePrompt (mounted OUTSIDE the router) can
// still react to route changes. Needed so the prompt correctly suppresses
// itself on the parent-facing marketing page.
function useCurrentHash() {
  const [hash, setHash] = useState(() => {
    try { return window.location.hash || ''; } catch { return ''; }
  });
  useEffect(() => {
    const onChange = () => setHash(window.location.hash || '');
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return hash;
}

export default function PlayerNamePrompt() {
  const { player, setDisplayName } = usePlayer();
  const [name, setName] = useState('');
  const [skippedThisSession, setSkippedThisSession] = useState(readSkipped);
  const currentHash = useCurrentHash();

  // Suppress the prompt on the parent-facing landing page — a parent
  // browsing marketing hasn't opted-in to the app yet, so asking for a
  // kid's name is premature and pushy. The prompt fires the moment they
  // click through into the actual app.
  const isMarketingPage = currentHash.startsWith('#/for-parents') || currentHash === '' || currentHash === '#/';

  const shouldShow = !player && !skippedThisSession && !isMarketingPage;

  const submit = (e) => {
    e?.preventDefault();
    if (!name.trim()) return;
    setDisplayName(name);
  };

  const skip = () => {
    markSkipped();
    setSkippedThisSession(true);
  };

  return (
    <AnimatePresence>
      {shouldShow && (
        <motion.div
          data-testid="player-name-prompt"
          className="fixed inset-0 z-[150] flex items-center justify-center p-4"
          style={{
            background: 'radial-gradient(circle at 50% 40%, rgba(10,37,64,0.55) 0%, rgba(10,37,64,0.85) 100%)',
            backdropFilter: 'blur(6px)',
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="bg-white rounded-3xl border-4 p-6 md:p-8 max-w-md w-full text-center"
            style={{ borderColor: 'var(--jma-dark)', boxShadow: '0 10px 0 0 var(--jma-dark)' }}
            initial={{ scale: 0.7, y: 30 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: 'spring', delay: 0.1 }}
          >
            <motion.div
              className="mx-auto rounded-full border-4 flex items-center justify-center mb-3 overflow-hidden"
              style={{
                width: 80,
                height: 80,
                background: 'linear-gradient(135deg, #FFCC00 0%, #FF9500 100%)',
                borderColor: 'var(--jma-dark)',
              }}
              animate={{ rotate: [0, 8, -8, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            >
              <img
                src="assets/ui/logo.png"
                alt="JMA"
                draggable={false}
                style={{
                  width: '78%',
                  height: '78%',
                  objectFit: 'contain',
                  filter: 'drop-shadow(2px 2px 0 rgba(0,0,0,0.35))',
                }}
              />
            </motion.div>

            <h1
              className="text-2xl md:text-3xl font-black font-display mb-1"
              style={{ color: 'var(--jma-dark)' }}
            >
              Welcome to JMA!
            </h1>
            <p className="text-sm md:text-base font-bold mb-4" style={{ color: 'var(--jma-dark)', opacity: 0.85 }}>
              What should we call you? <span className="opacity-60">(So your progress report has a name on it.)</span>
            </p>

            <form onSubmit={submit} className="flex flex-col gap-3">
              <input
                data-testid="player-name-input"
                type="text"
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={30}
                placeholder="Type your name..."
                className="w-full rounded-2xl border-4 px-4 py-3 text-lg font-black font-display text-center"
                style={{
                  borderColor: 'var(--jma-dark)',
                  color: 'var(--jma-dark)',
                  backgroundColor: '#FFFBEE',
                }}
              />
              <button
                data-testid="player-name-submit"
                type="submit"
                disabled={!name.trim()}
                className="chunky-btn px-5 py-3 flex items-center justify-center gap-2 text-base font-black touch-manipulation"
                style={{
                  backgroundColor: name.trim() ? 'var(--jma-green)' : '#aaa',
                  color: 'white',
                  cursor: name.trim() ? 'pointer' : 'not-allowed',
                }}
              >
                Let&apos;s go! <ArrowRight className="w-5 h-5" />
              </button>
            </form>

            <button
              data-testid="player-name-skip"
              onClick={skip}
              className="mt-3 text-xs font-bold underline opacity-60 hover:opacity-100"
              style={{ color: 'var(--jma-dark)' }}
            >
              I&apos;ll add my name later
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
