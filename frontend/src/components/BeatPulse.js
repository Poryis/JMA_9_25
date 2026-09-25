// BeatPulse — visual metronome. 4 dots in a row, one bright at a time,
// cycling through the beats so kids SEE the tempo even if they're tuning
// out the hi-hat click underneath. The 1st dot is the downbeat (always
// extra-emphasized).
//
// The parent drives `running` (start/stop) and `startAtMs`, the wall-clock
// `Date.now()` of beat 0. The component itself does the timing via a single
// rAF loop, so it stays in lockstep with the metronome scheduling no
// matter how React's render loop is feeling that day.

import { useEffect, useRef } from 'react';
import { BEAT_MS as DEFAULT_BEAT_MS } from '../data/rhythms';

export default function BeatPulse({ running, startAtMs, beatsPerMeasure = 4, size = 22, beatMs = DEFAULT_BEAT_MS }) {
  const dotRefs = useRef([]);
  const rafRef = useRef(null);
  const lastBeatRef = useRef(-1);

  useEffect(() => {
    if (!running || !startAtMs) {
      // Reset every dot to its idle look.
      dotRefs.current.forEach((el) => {
        if (el) { el.style.transform = 'scale(1)'; el.style.opacity = '0.35'; }
      });
      lastBeatRef.current = -1;
      return undefined;
    }
    const tick = () => {
      const elapsed = Date.now() - startAtMs;
      if (elapsed < 0) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }
      const currentBeat = Math.floor(elapsed / beatMs);
      const phase = (elapsed % beatMs) / beatMs; // 0..1 within the beat
      // Pulse the current beat dot — bright + pop in the first 35% of the beat.
      const activeIdx = currentBeat % beatsPerMeasure;
      if (currentBeat !== lastBeatRef.current) {
        lastBeatRef.current = currentBeat;
      }
      dotRefs.current.forEach((el, i) => {
        if (!el) return;
        if (i === activeIdx && phase < 0.55) {
          // Fast attack, slow decay so the pop is felt.
          const intensity = 1 - phase / 0.55; // 1.0 → 0.0
          el.style.transform = `scale(${1 + intensity * 0.5})`;
          el.style.opacity = String(0.5 + intensity * 0.5);
        } else {
          el.style.transform = 'scale(1)';
          el.style.opacity = '0.35';
        }
      });
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [running, startAtMs, beatsPerMeasure, beatMs]);

  return (
    <div className="flex items-center justify-center gap-2 md:gap-3" data-testid="beat-pulse">
      {Array.from({ length: beatsPerMeasure }).map((_, i) => (
        <div
          key={i}
          ref={(el) => { dotRefs.current[i] = el; }}
          className="rounded-full border-3"
          style={{
            width: size,
            height: size,
            borderColor: 'var(--jma-dark)',
            backgroundColor: i === 0 ? '#FFD700' : '#FF9500',
            boxShadow: '0 3px 0 0 var(--jma-dark)',
            opacity: 0.35,
            transformOrigin: 'center',
            transition: 'transform 80ms ease-out, opacity 80ms ease-out',
            willChange: 'transform, opacity',
          }}
        />
      ))}
    </div>
  );
}
