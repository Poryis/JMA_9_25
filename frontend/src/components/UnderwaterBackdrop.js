// UnderwaterBackdrop — the home-page underwater sea scene, factored
// out so PLAY / LEARN / CREATE menu pages can share the same living
// backdrop as the lobby. Renders:
//   - fixed underwater PNG layer with slow Ken Burns drift
//   - top vignette so the crop line reads cleanly on tall screens
//   - diagonal god-ray shafts
//   - 18 rising bubbles at random sizes/durations/delays
//
// The Jelly Rocks blimp is NOT part of this component — HomePage and
// SubMenuPage each mount their own <BlimpFlyby /> to keep this
// component visually pure (backdrop only).

const BUBBLES = [
  { left: '3%',  size: 10, dur: 13, delay: 0 },
  { left: '8%',  size: 16, dur: 15, delay: 3 },
  { left: '14%', size: 8,  dur: 11, delay: 6.5 },
  { left: '18%', size: 22, dur: 18, delay: 1.5 },
  { left: '24%', size: 12, dur: 14, delay: 4 },
  { left: '30%', size: 6,  dur: 10, delay: 8 },
  { left: '36%', size: 18, dur: 16, delay: 2 },
  { left: '42%', size: 10, dur: 12, delay: 5.5 },
  { left: '48%', size: 24, dur: 19, delay: 0.5 },
  { left: '54%', size: 8,  dur: 11, delay: 7 },
  { left: '60%', size: 14, dur: 14, delay: 3.5 },
  { left: '66%', size: 20, dur: 17, delay: 1 },
  { left: '72%', size: 10, dur: 13, delay: 6 },
  { left: '78%', size: 6,  dur: 10, delay: 2.5 },
  { left: '84%', size: 16, dur: 15, delay: 4.5 },
  { left: '89%', size: 12, dur: 12, delay: 8.5 },
  { left: '94%', size: 22, dur: 18, delay: 0 },
  { left: '97%', size: 8,  dur: 11, delay: 5 },
];

export default function UnderwaterBackdrop() {
  return (
    <>
      <div
        aria-hidden="true"
        className="fixed inset-0 z-0 home-underwater-bg-layer pointer-events-none"
        style={{
          backgroundImage: `url(${process.env.PUBLIC_URL || ''}/assets/backgrounds/underwater.png)`,
        }}
      />
      <div
        aria-hidden="true"
        className="fixed inset-x-0 top-0 z-0 pointer-events-none"
        style={{
          height: '32vh',
          background:
            'linear-gradient(180deg, rgba(2,36,63,0.55) 0%, rgba(2,36,63,0.15) 60%, transparent 100%)',
        }}
      />
      <div
        aria-hidden="true"
        className="fixed inset-0 z-0 pointer-events-none home-underwater-shafts"
      />
      <div
        aria-hidden="true"
        className="fixed inset-0 z-0 pointer-events-none overflow-hidden"
      >
        {BUBBLES.map((b, i) => {
          // Negative animation-delay = pre-progress the CSS keyframes.
          // Instead of every bubble waiting `b.delay` seconds to rise
          // from the bottom (which leaves ~8s of dead sky at the top on
          // first paint), we seed each one to already be somewhere
          // mid-rise. The `(delay + dur/2) % dur` seed keeps the
          // original per-bubble variation but guarantees a spread of
          // starting positions across the whole vertical column.
          const preRun = ((b.delay + b.dur * 0.5) % b.dur).toFixed(2);
          return (
            <span
              key={i}
              className="home-underwater-bubble"
              style={{
                left: b.left,
                width: b.size,
                height: b.size,
                animationDuration: `${b.dur}s`,
                animationDelay: `-${preRun}s`,
              }}
            />
          );
        })}
      </div>
    </>
  );
}

// The deep-sea navy fallback color — apply this to your page root's
// `style` prop so the top of the page never flashes white while the
// underwater PNG loads.
export const UNDERWATER_BG_COLOR = '#02243F';
