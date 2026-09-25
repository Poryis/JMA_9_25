// Big tappable snare drum — replaces the generic "TAP" button on Boom Garden.
// Uses the actual snare PNG frames from `/assets/drums/` so it visually belongs
// to the JMA world. Direct-DOM frame swap on press (zero React render delay,
// same pattern used everywhere else in the app).

import { useRef, useImperativeHandle, forwardRef } from 'react';
import { motion } from 'framer-motion';

const SNARE_IDLE    = 'assets/drums/Snare 1.png';
const SNARE_PRESSED = 'assets/drums/Snare 2.png';

export const BigSnare = forwardRef(function BigSnare({ onTap, disabled, hint }, ref) {
  const idleRef = useRef(null);
  const pressedRef = useRef(null);
  const timerRef = useRef(null);

  // Imperative flash — used by the demo playback so the snare visually
  // pulses while Doc claps the rhythm.
  useImperativeHandle(ref, () => ({
    flash: (ms = 130) => {
      if (idleRef.current)    idleRef.current.style.opacity = '0';
      if (pressedRef.current) {
        pressedRef.current.style.display = 'block';
        pressedRef.current.style.transform = 'scale(0.94)';
      }
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        if (pressedRef.current) {
          pressedRef.current.style.display = 'none';
          pressedRef.current.style.transform = '';
        }
        if (idleRef.current) idleRef.current.style.opacity = '';
      }, ms);
    },
  }));

  const handleDown = (e) => {
    if (disabled) return;
    e.preventDefault();
    try { e.target.setPointerCapture(e.pointerId); } catch (_) { /* noop */ }
    if (idleRef.current)    idleRef.current.style.opacity = '0';
    if (pressedRef.current) {
      pressedRef.current.style.display = 'block';
      pressedRef.current.style.transform = 'scale(0.94)';
    }
    onTap?.();
  };
  const handleUp = () => {
    if (pressedRef.current) {
      pressedRef.current.style.display = 'none';
      pressedRef.current.style.transform = '';
    }
    if (idleRef.current) idleRef.current.style.opacity = '';
  };

  return (
    <motion.button
      type="button"
      data-testid="boom-snare-btn"
      onPointerDown={handleDown}
      onPointerUp={handleUp}
      onPointerLeave={handleUp}
      onPointerCancel={handleUp}
      disabled={disabled}
      aria-label="Tap the snare drum"
      className="relative bg-transparent border-0 p-0 select-none"
      style={{
        width: 'clamp(150px, 32vw, 240px)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.55 : 1,
        touchAction: 'none',
        filter: 'drop-shadow(0 8px 8px rgba(0,0,0,0.35))',
      }}
      whileTap={!disabled ? { y: 6 } : undefined}
    >
      <img
        ref={idleRef}
        src={SNARE_IDLE}
        alt="Snare drum"
        draggable={false}
        className="w-full h-auto object-contain pointer-events-none select-none"
      />
      <img
        ref={pressedRef}
        src={SNARE_PRESSED}
        alt=""
        aria-hidden="true"
        draggable={false}
        className="absolute inset-0 w-full h-auto object-contain pointer-events-none select-none"
        style={{ display: 'none' }}
      />
      {hint && (
        <div
          className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full border-3 px-3 py-0.5 text-xs font-black font-display whitespace-nowrap"
          style={{
            borderColor: 'var(--jma-dark)',
            backgroundColor: 'white',
            color: 'var(--jma-dark)',
            boxShadow: '0 3px 0 0 var(--jma-dark)',
          }}
        >
          {hint}
        </div>
      )}
    </motion.button>
  );
});

export default BigSnare;
