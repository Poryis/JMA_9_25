// StewDrummer — Stew the llama performs the drums for Boom Garden.
//
// Each hit alternates between his LEFT-stick and RIGHT-stick animations
// (4 frames each, frame 0 = the shared neutral pose). The same animation
// flow runs whether the kid taps Stew himself (input phase) or whether
// `.flash()` is called from the demo (Doc's claps in Copy Cat / metronome
// in Tap Trail).
//
// Visibility pattern: ALL 8 frames are mounted in the DOM at once and
// hidden by default via CSS class `.stew-drum-frame { display: none }`.
// One frame at a time is flipped on via imperative `style.display = 'block'`.
// Because the default visibility lives in CSS (not in inline JSX style),
// React reconciliation NEVER touches `display`, and our imperative overrides
// survive every re-render — even ones triggered by setState calls in the
// same tick as a tap. (This is the same trick the Beat Lab drum kit uses,
// and it eliminates the "Stew animates twice then freezes" regression.)

import { useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import { motion } from 'framer-motion';

const LEFT_FRAMES = [
  'assets/animations/stew-drum/left-1.png',  // neutral
  'assets/animations/stew-drum/left-2.png',
  'assets/animations/stew-drum/left-3.png',
  'assets/animations/stew-drum/left-4.png',
];
const RIGHT_FRAMES = [
  'assets/animations/stew-drum/right-1.png', // neutral (same pose as left-1)
  'assets/animations/stew-drum/right-2.png',
  'assets/animations/stew-drum/right-3.png',
  'assets/animations/stew-drum/right-4.png',
];

// Per-frame hold (ms). 4 frames × 45ms ≈ 180ms total stick travel; feels snappy
// at 80 BPM (750 ms/beat) without bleeding into the next downbeat.
const FRAME_MS = 45;

// All 8 frames in render order. Index 0 (left-1) is the visible default —
// shared neutral pose for both sides.
const ALL_FRAMES = [...LEFT_FRAMES, ...RIGHT_FRAMES];

export const StewDrummer = forwardRef(function StewDrummer({ onTap, disabled, hint }, ref) {
  const frameRefs = useRef([]);
  const containerRef = useRef(null); // for the dataset.hits counter
  const timersRef = useRef([]);

  // Preload every frame so the first hit doesn't stutter waiting on disk.
  useEffect(() => {
    ALL_FRAMES.forEach((src) => {
      const i = new Image();
      i.src = src;
    });
  }, []);

  const clearAnimTimers = () => {
    timersRef.current.forEach((t) => clearTimeout(t));
    timersRef.current = [];
  };

  // Imperatively show ONE frame and hide the other 7. Uses `style.display`
  // directly — the CSS class default is hidden for all but the default neutral
  // (left-1) so React never overwrites this.
  const showFrame = (frameIndex) => {
    const refs = frameRefs.current;
    for (let i = 0; i < refs.length; i++) {
      const el = refs[i];
      if (!el) continue;
      el.style.display = i === frameIndex ? 'block' : 'none';
    }
  };

  // Play one full hit. Alternation counter lives on the container's
  // dataset.hits attribute so it survives any React re-mount or strict-mode
  // double-render. We genuinely flip sides on every successive hit no matter
  // where the call came from (kid tap, demo flash, etc).
  const playHit = () => {
    if (!containerRef.current) return;
    const count = parseInt(containerRef.current.dataset.hits || '0', 10);
    containerRef.current.dataset.hits = String(count + 1);
    const useLeft = count % 2 === 0;
    const offset = useLeft ? 0 : 4; // left frames are 0..3, right are 4..7
    clearAnimTimers();
    showFrame(offset + 1);
    timersRef.current.push(setTimeout(() => showFrame(offset + 2), FRAME_MS));
    timersRef.current.push(setTimeout(() => showFrame(offset + 3), FRAME_MS * 2));
    // Snap back to whichever neutral pose matches the side we just hit so the
    // bounce-back looks smooth rather than teleporting across sides.
    timersRef.current.push(setTimeout(() => showFrame(offset + 0), FRAME_MS * 4));
  };

  useImperativeHandle(ref, () => ({ flash: playHit }), []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDown = (e) => {
    if (disabled) return;
    e.preventDefault();
    try { e.target.setPointerCapture(e.pointerId); } catch (_) { /* noop */ }
    playHit();
    onTap?.();
  };

  // Cleanup on unmount.
  useEffect(() => () => clearAnimTimers(), []);

  return (
    <motion.button
      ref={containerRef}
      type="button"
      data-testid="boom-stew-drummer"
      onPointerDown={handleDown}
      disabled={disabled}
      aria-label="Tap Stew to play the drum"
      className="relative bg-transparent border-0 p-0 select-none block"
      style={{
        width: 'clamp(220px, 42vw, 360px)',
        // Explicit aspect-ratio so the button always has height even when
        // every <img> child is `position: absolute` — otherwise the moment
        // we flip frame 0 to display:none mid-animation, the parent
        // collapses to 0 px high and Stew vanishes.
        aspectRatio: '16 / 9',
        cursor: 'pointer',
        // No opacity dim when disabled — Stew should always look alive and
        // ready (Twin Beats picks strips, not Stew, but he's still part of
        // the band so we keep him at full brightness regardless).
        opacity: 1,
        touchAction: 'none',
        filter: 'drop-shadow(0 10px 12px rgba(0,0,0,0.35))',
      }}
      whileTap={!disabled ? { y: 4 } : undefined}
    >
      {ALL_FRAMES.map((src, idx) => (
        <img
          key={idx}
          ref={(el) => { frameRefs.current[idx] = el; }}
          src={src}
          alt={idx === 0 ? 'Stew on drums' : ''}
          aria-hidden={idx === 0 ? undefined : 'true'}
          draggable={false}
          className={`stew-drum-frame${idx === 0 ? ' stew-drum-frame-default' : ''} absolute inset-0 w-full h-full object-contain pointer-events-none select-none`}
        />
      ))}
      {hint && (
        <div
          className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full border-3 px-3 py-0.5 text-xs font-black font-display whitespace-nowrap"
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

export default StewDrummer;
