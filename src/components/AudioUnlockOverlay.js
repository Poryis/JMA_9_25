// AudioUnlockOverlay — friendly first-tap splash that primes iOS audio.
//
// Mounted at App root. Renders only on the FIRST session-visit (until the kid
// has had any pointerdown anywhere in the document). On tap, performs the iOS
// audio-context-resume dance so subsequent bell taps actually play sound.

import { motion, AnimatePresence } from 'framer-motion';
import { Hand } from 'lucide-react';
import useAudioUnlock from '../hooks/useAudioUnlock';

export default function AudioUnlockOverlay() {
  const { needsUnlock, unlock } = useAudioUnlock();

  return (
    <AnimatePresence>
      {needsUnlock && (
        <motion.button
          data-testid="audio-unlock-overlay"
          onClick={unlock}
          className="fixed inset-0 z-[200] flex flex-col items-center justify-center cursor-pointer touch-manipulation border-0"
          style={{
            background: 'radial-gradient(circle at 50% 40%, rgba(10,37,64,0.7) 0%, rgba(10,37,64,0.92) 100%)',
            backdropFilter: 'blur(6px)',
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
          aria-label="Tap anywhere to start the music"
        >
          {/* Pulsing JMA shield ring */}
          <motion.div
            className="rounded-full border-4 flex items-center justify-center mb-6 overflow-hidden"
            style={{
              width: 'clamp(120px, 22vw, 180px)',
              height: 'clamp(120px, 22vw, 180px)',
              background: 'linear-gradient(135deg, #FFCC00 0%, #FF9500 100%)',
              borderColor: '#FFE07A',
              boxShadow: '0 0 0 8px rgba(255,204,0,0.25), 0 0 40px rgba(255,204,0,0.6)',
            }}
            animate={{ scale: [1, 1.08, 1] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
          >
            <img
              src="assets/ui/logo.png"
              alt="JMA"
              draggable={false}
              style={{
                width: '78%',
                height: '78%',
                objectFit: 'contain',
                filter: 'drop-shadow(2px 2px 0 rgba(0,0,0,0.4))',
              }}
            />
          </motion.div>

          <motion.h1
            className="text-3xl md:text-5xl font-black font-display text-center mb-2"
            style={{
              color: 'white',
            }}
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.15 }}
          >
            Tap to Start the Music!
          </motion.h1>

          <motion.p
            className="text-base md:text-lg font-bold text-center px-6 max-w-md"
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            Your device needs one tap so we can play sounds for you.
          </motion.p>

          {/* Friendly hand pointer that bobs */}
          <motion.div
            className="mt-6 flex items-center gap-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.45 }}
          >
            <motion.div
              animate={{ y: [0, 10, 0] }}
              transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}
            >
              <Hand className="w-8 h-8 md:w-10 md:h-10" style={{ color: 'white' }} strokeWidth={2.5} />
            </motion.div>
            <span className="text-sm md:text-base font-black uppercase tracking-wide" style={{ color: 'white' }}>
              Tap anywhere!
            </span>
          </motion.div>
        </motion.button>
      )}
    </AnimatePresence>
  );
}
