// TileDecoration — CSS-only scene-appropriate overlay that lives BEHIND
// the character sprite but IN FRONT of the background image on each
// SubMenuPage tile. No new assets; all art is drawn with divs/spans and
// keyframe animations.
//
// Adding a new decoration:
//   1. Add a new `case` below returning JSX.
//   2. If needed, add a matching @keyframes block to index.css.
//   3. Set `decoration: 'your-key'` on the tile config in the menu file.

const noteChars = ['♪', '♫', '♩', '♬'];

export default function TileDecoration({ type, accent }) {
  if (!type) return null;

  const wrapProps = {
    'aria-hidden': true,
    className: 'absolute inset-0 pointer-events-none z-[5] overflow-hidden',
  };

  switch (type) {
    // ------------------------------------------------------------------
    case 'staff':
    case 'notes-crazy': {
      // Full-tile note storm — bigger, denser, mixed sizes / colors /
      // rotations. Used on the Name That Note chalkboard tile. Some
      // notes just rise, others tumble (rise + spin) so the field feels
      // lively without being uniform.
      const chalkColors = ['rgba(255,255,255,0.95)', 'rgba(255,235,140,0.9)', 'rgba(180,230,255,0.9)'];
      const spots = [
        { left: '4%',  size: 26, dur: 5.8, delay: 0,   anim: 'tile-note-tumble', c: 0 },
        { left: '14%', size: 34, dur: 7.2, delay: 1.4, anim: 'tile-note-rise',   c: 1 },
        { left: '24%', size: 20, dur: 5.0, delay: 2.5, anim: 'tile-note-tumble', c: 0 },
        { left: '34%', size: 38, dur: 6.6, delay: 0.6, anim: 'tile-note-rise',   c: 2 },
        { left: '44%', size: 22, dur: 4.9, delay: 3.2, anim: 'tile-note-tumble', c: 0 },
        { left: '56%', size: 30, dur: 6.4, delay: 1.9, anim: 'tile-note-rise',   c: 1 },
        { left: '66%', size: 24, dur: 5.4, delay: 0.9, anim: 'tile-note-tumble', c: 0 },
        { left: '76%', size: 36, dur: 6.9, delay: 2.6, anim: 'tile-note-rise',   c: 2 },
        { left: '86%', size: 20, dur: 5.2, delay: 1.2, anim: 'tile-note-tumble', c: 0 },
        { left: '94%', size: 28, dur: 6.2, delay: 3.6, anim: 'tile-note-rise',   c: 1 },
      ];
      return (
        <div {...wrapProps}>
          {spots.map((n, i) => (
            <span
              key={i}
              className="absolute font-black"
              style={{
                left: n.left,
                bottom: 8,
                fontSize: n.size,
                color: chalkColors[n.c],
                textShadow: '0 2px 0 rgba(10,37,64,0.45), 0 0 10px rgba(255,255,255,0.35)',
                animation: `${n.anim} ${n.dur}s ease-in ${n.delay}s infinite`,
              }}
            >
              {noteChars[i % noteChars.length]}
            </span>
          ))}
        </div>
      );
    }

    // ------------------------------------------------------------------
    case 'clouds': {
      // Fluffy cartoon clouds drifting through the WINDOW area of the
      // clubhouse.png background, plus a stationary user-provided sun.
      // Each cloud is a multi-lobe SVG shape (four overlapping puffs)
      // so they read as pillowy and cartoon-y instead of flat blobs.
      const clouds = [
        { top: 8,  size: 24, dur: 32, delay: 0 },
        { top: 35, size: 30, dur: 44, delay: 12 },
        { top: 18, size: 20, dur: 28, delay: 22 },
      ];
      return (
        <>
          {/* Cartoon sun — user-provided PNG pinned inside the window,
              gently rotating in place so it doesn't feel static. */}
          <img
            src="assets/ui/sun.png"
            alt=""
            aria-hidden="true"
            draggable={false}
            style={{
              position: 'absolute',
              top: '22%',
              right: '11%',
              width: 44,
              height: 44,
              objectFit: 'contain',
              zIndex: 5,
              pointerEvents: 'none',
              transformOrigin: 'center',
              animation: 'tile-sun-spin 6s ease-in-out infinite',
              filter: 'drop-shadow(0 1px 0 rgba(10,37,64,0.35))',
            }}
          />
          {/* Cloud drift crop — widened on both sides so clouds appear
              from further off-window-left and vanish further right. */}
          <div
            aria-hidden="true"
            className="absolute pointer-events-none z-[5] overflow-hidden"
            style={{
              top: '28%',
              left: '63%',
              width: '30%',
              height: '15%',
            }}
          >
            {clouds.map((c, i) => (
              <div
                key={i}
                className="absolute"
                style={{
                  top: c.top + '%',
                  left: 0,
                  width: c.size * 1.8,
                  height: c.size,
                  animation: `tile-cloud-drift ${c.dur}s linear ${c.delay}s infinite`,
                }}
              >
                <svg
                  viewBox="0 0 100 60"
                  style={{ width: '100%', height: '100%', overflow: 'hidden' }}
                  preserveAspectRatio="none"
                >
                  {/* Chunky multi-lobe cloud silhouette — four overlapping
                      puffs on top of a flat base give it a pillowy read. */}
                  <path
                    d="M 12 46
                       Q 4 46 6 36
                       Q 2 26 14 24
                       Q 16 10 30 14
                       Q 38 4 52 12
                       Q 62 4 74 14
                       Q 90 12 90 28
                       Q 100 34 92 44
                       Q 88 52 76 48
                       Q 60 54 46 48
                       Q 30 54 20 48
                       Q 12 50 12 46 Z"
                    fill="#FFFFFF"
                    stroke="var(--jma-dark)"
                    strokeWidth="2.2"
                    strokeLinejoin="round"
                  />
                  {/* Inner highlight puffs — subtle warm-white gradient
                      dot on the top-left of each lobe to sell volume. */}
                  <ellipse cx="28" cy="22" rx="6" ry="3" fill="rgba(255,255,255,0.9)" />
                  <ellipse cx="58" cy="18" rx="6" ry="3" fill="rgba(255,255,255,0.9)" />
                </svg>
              </div>
            ))}
          </div>
        </>
      );
    }

    // ------------------------------------------------------------------
    case 'notes': {
      // Music notes rising from below and fading out near the top. Best
      // for Jam Session / Jukebox / Beat Lab-style music tiles.
      const spots = [
        { left: '14%', size: 22, dur: 5.2, delay: 0 },
        { left: '30%', size: 28, dur: 6.6, delay: 1.4 },
        { left: '52%', size: 18, dur: 4.6, delay: 2.5 },
        { left: '70%', size: 26, dur: 6, delay: 0.7 },
        { left: '86%', size: 20, dur: 5.4, delay: 3.2 },
      ];
      return (
        <div {...wrapProps}>
          {spots.map((n, i) => (
            <span
              key={i}
              className="absolute font-black"
              style={{
                left: n.left,
                bottom: 8,
                fontSize: n.size,
                color: 'white',
                textShadow: '0 2px 0 var(--jma-dark), 0 0 8px rgba(255,255,255,0.4)',
                animation: `tile-note-rise ${n.dur}s ease-in ${n.delay}s infinite`,
              }}
            >
              {noteChars[i % noteChars.length]}
            </span>
          ))}
        </div>
      );
    }

    // ------------------------------------------------------------------
    case 'sparkles': {
      // Twinkling star field. Detective / Robot Boogie / clue-style
      // tiles. Twenty small stars scattered.
      const stars = [];
      for (let i = 0; i < 14; i++) {
        stars.push({
          top: `${8 + ((i * 37) % 68)}%`,
          left: `${(i * 47 + 9) % 92 + 3}%`,
          size: 4 + ((i * 13) % 8),
          dur: 1.4 + ((i * 0.13) % 1.6),
          delay: (i * 0.29) % 2.4,
        });
      }
      return (
        <div {...wrapProps}>
          {stars.map((s, i) => (
            <span
              key={i}
              className="absolute rounded-full"
              style={{
                top: s.top,
                left: s.left,
                width: s.size,
                height: s.size,
                background: `radial-gradient(circle, #FFFFFF 0%, ${accent || '#FFCC00'} 55%, transparent 100%)`,
                boxShadow: `0 0 8px ${accent || '#FFCC00'}88`,
                animation: `tile-twinkle ${s.dur}s ease-in-out ${s.delay}s infinite`,
              }}
            />
          ))}
        </div>
      );
    }

    // ------------------------------------------------------------------
    case 'spotlight': {
      // Sweeping stage spotlight cone from the top. Music 101 curtain.
      return (
        <div {...wrapProps}>
          <div
            className="absolute"
            style={{
              top: -20,
              left: '50%',
              width: 240,
              height: 260,
              marginLeft: -120,
              transformOrigin: '50% 0%',
              background:
                'conic-gradient(from 260deg at 50% 0%, transparent 0deg, rgba(255,220,120,0.35) 40deg, rgba(255,220,120,0.55) 50deg, rgba(255,220,120,0.35) 60deg, transparent 100deg)',
              filter: 'blur(6px)',
              animation: 'tile-spotlight-sweep 5s ease-in-out infinite',
              mixBlendMode: 'screen',
            }}
          />
        </div>
      );
    }

    default:
      return null;
  }
}
