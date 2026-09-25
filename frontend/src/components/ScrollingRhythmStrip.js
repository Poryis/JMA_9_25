// ScrollingRhythmStrip — Tap Trail's reading-in-time view.
//
// Notes scroll right-to-left through a fixed-position "strike line" (a gold
// vertical bar). The kid taps the snare when each note's LEFT EDGE crosses
// the strike line — same musical convention as beat-1-on-the-downbeat.
//
// Animation timing:
//   - During the 4-beat count-in (handled by the parent), the strip is
//     parked +4 beats to the right of the strike line so the kid sees what's
//     coming as they hear the click.
//   - When the input phase begins, the strip animates from +4*beatPx → -totalPx
//     over (4 + totalBeats) * BEAT_MS, linear. Beat 0 hits the strike line at
//     the same instant the kid's input window opens — perfect sync.
//
// No JS animation frame is needed — framer-motion + CSS handles the whole
// scroll, and timing detection lives in the parent (elapsed vs expected).

import { motion } from 'framer-motion';
import { NOTE_DEFS, BEAT_MS as DEFAULT_BEAT_MS, patternBeats, BEATS_PER_MEASURE } from '../data/rhythms';

const STRIKE_PCT = 25;     // strike line lives 25% from the left edge
const COUNT_IN_BEATS = 4;
const BEAT_PX = 90;        // px allocated per beat — quarter = 90px, half = 180px

export default function ScrollingRhythmStrip({ pattern, kickOff, height = 170, beatMs = DEFAULT_BEAT_MS }) {
  const totalBeats = patternBeats(pattern);
  const totalPx = totalBeats * BEAT_PX;
  const startX = COUNT_IN_BEATS * BEAT_PX;       // park position (during count-in)
  const endX = -totalPx;                          // last-note-passed position
  const totalDurationMs = (COUNT_IN_BEATS + totalBeats) * beatMs;

  return (
    <div
      className="relative w-full overflow-hidden rounded-2xl border-4 bg-white/80 backdrop-blur"
      data-testid="scrolling-rhythm-strip"
      style={{
        borderColor: 'var(--jma-dark)',
        height,
        boxShadow: '0 4px 0 0 var(--jma-dark)',
      }}
    >
      {/* Faint "staff line" through the centre — gives the eye a horizon. */}
      <div
        className="absolute left-0 right-0 pointer-events-none"
        style={{
          top: '50%',
          height: 0,
          borderTop: '2px dashed rgba(10,37,64,0.18)',
        }}
      />
      {/* Strike line — the moment of TRUTH. Kids tap when a note's left edge
          touches this gold bar. */}
      <div
        className="absolute top-0 bottom-0 pointer-events-none z-10"
        style={{
          left: `${STRIKE_PCT}%`,
          width: 5,
          background: '#FFD700',
          boxShadow: '0 0 14px 4px rgba(255,215,0,0.55)',
          transform: 'translateX(-2.5px)',
        }}
      />
      {/* Strike-line label */}
      <div
        className="absolute z-10 pointer-events-none rounded-full border-2 px-2 py-0.5 text-[9px] font-black font-display"
        style={{
          left: `calc(${STRIKE_PCT}% + 8px)`,
          top: 6,
          borderColor: 'var(--jma-dark)',
          backgroundColor: '#FFD700',
          color: 'var(--jma-dark)',
          boxShadow: '0 2px 0 0 var(--jma-dark)',
        }}
      >
        TAP HERE
      </div>

      {/* Scrolling note row. Wrapper sits at the strike line; strip translates
          so each note's left edge crosses x=0 at its expected time. */}
      <div
        className="absolute top-1/2 -translate-y-1/2"
        style={{ left: `${STRIKE_PCT}%`, willChange: 'transform' }}
      >
        <motion.div
          className="flex items-center"
          initial={{ x: startX }}
          animate={{ x: kickOff ? endX : startX }}
          transition={{ duration: kickOff ? totalDurationMs / 1000 : 0, ease: 'linear' }}
        >
          {pattern.map((key, i) => {
            const def = NOTE_DEFS[key];
            const w = def.beats * BEAT_PX;
            const isRest = key === 'rest';
            // Cumulative beats up to AND INCLUDING this note. If it lands
            // exactly on a measure boundary AND we're not at the very last
            // note, swap the dashed dotted divider for a SOLID dark barline
            // (still drawn as a border so layout width stays exact and the
            // scroll timing remains perfectly synced to BEAT_PX).
            let cum = 0;
            for (let j = 0; j <= i; j++) cum += NOTE_DEFS[pattern[j]].beats;
            const isBarline =
              i < pattern.length - 1 &&
              Math.abs(cum % BEATS_PER_MEASURE) < 1e-6;
            return (
              <div
                key={i}
                data-testid={`trail-note-${i}`}
                className="flex flex-col items-center justify-center flex-shrink-0 relative"
                style={{
                  width: w,
                  height: height - 24,
                  borderRight: isBarline
                    ? '4px solid rgba(10,37,64,0.85)'
                    : '2px dashed rgba(10,37,64,0.18)',
                }}
              >
                <img
                  src={def.img}
                  alt={isRest ? 'rest' : def.label}
                  draggable={false}
                  className="object-contain pointer-events-none select-none"
                  style={{ maxHeight: '62%', maxWidth: '78%' }}
                />
                <span
                  className="text-xs md:text-sm font-black font-display mt-1 pointer-events-none"
                  style={{
                    color: 'var(--jma-dark)',
                  }}
                >
                  {def.syllable}
                </span>
              </div>
            );
          })}
        </motion.div>
      </div>
    </div>
  );
}

// Expose the constants so the page can keep the audio click track in sync
// with the visual scroll without re-computing them.
ScrollingRhythmStrip.BEAT_PX = BEAT_PX;
ScrollingRhythmStrip.COUNT_IN_BEATS = COUNT_IN_BEATS;
ScrollingRhythmStrip.STRIKE_PCT = STRIKE_PCT;
