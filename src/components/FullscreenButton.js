import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Maximize, Minimize } from 'lucide-react';

export function FullscreenButton() {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleChange);
    return () => document.removeEventListener('fullscreenchange', handleChange);
  }, []);

  const toggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (e) {
      console.warn('Fullscreen not supported:', e);
    }
  }, []);

  return (
    <motion.button
      data-testid="fullscreen-button"
      className="fixed bottom-3 right-3 md:bottom-4 md:right-4 z-50 chunky-btn bg-white p-1 md:p-2"
      onClick={toggleFullscreen}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
    >
      {isFullscreen ? (
        <Minimize className="w-3.5 h-3.5 md:w-5 md:h-5" style={{ color: 'var(--jma-dark)' }} />
      ) : (
        <Maximize className="w-3.5 h-3.5 md:w-5 md:h-5" style={{ color: 'var(--jma-dark)' }} />
      )}
    </motion.button>
  );
}

export default FullscreenButton;
