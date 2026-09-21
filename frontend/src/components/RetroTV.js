// Retro CRT TV widget for the homepage.
//
// Renders a small cartoon TV (wooden frame, knobs, rabbit ears, red "ON AIR"
// dot) with a muted, looping Vimeo episode playing on its screen. Tapping
// the TV navigates to /jmatv.
//
// Per the partner's feedback this lives BELOW the 3 main category cards so
// kids see PLAY / LEARN / CREATE first and don't get pulled into passive
// video before exploring the interactive features.

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { pickFeaturedEpisode } from '../data/jmatv';

// CSS-only bubble-letter "JMAtv" wordmark. Uses `Bagel Fat One` — a
// balloon/puffy cartoon display face — with a chunky dark stroke and a
// stacked drop-shadow for an inflated 3D-sticker look. Placeholder until
// the custom PNG is finalized; swap the whole component for an <img>
// when it lands.
function BubbleWordmark() {
  const LETTERS = [
    { char: 'J', color: '#FF3B30', rot: -6 },
    { char: 'M', color: '#FF9500', rot: 4 },
    { char: 'A', color: '#4CD964', rot: -3 },
    { char: 'T', color: '#4285F4', rot: 5, small: true },
    { char: 'V', color: '#AF52DE', rot: -4, small: true },
  ];
  return (
    <motion.div
      data-testid="jmatv-bubble-wordmark"
      className="flex items-end justify-center md:justify-end select-none"
      style={{ lineHeight: 0.9 }}
      animate={{ rotate: [-1.5, 1.5, -1.5], y: [0, -3, 0] }}
      transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      aria-label="JMAtv"
    >
      {LETTERS.map((L, i) => (
        <span
          key={i}
          style={{
            fontFamily: "'Sniglet', 'Fredoka', cursive",
            fontWeight: 800,
            color: L.color,
            fontSize: L.small
              ? 'clamp(30px, 5vw, 56px)'
              : 'clamp(56px, 9vw, 100px)',
            WebkitTextStroke: '0.11em var(--jma-dark)',
            paintOrder: 'stroke fill',
            // Stacked layered shadow for the "puffed sticker" 3D effect:
            // a chunky solid ledge underneath, then a softer diffuse
            // glow further down.
            textShadow: [
              '2px 2px 0 var(--jma-dark)',
              '4px 4px 0 var(--jma-dark)',
              '6px 6px 0 var(--jma-dark)',
              '8px 10px 18px rgba(10,37,64,0.35)',
            ].join(', '),
            transform: `rotate(${L.rot}deg)`,
            display: 'inline-block',
            marginLeft: i === 0 ? 0 : L.small ? '-0.10em' : '-0.12em',
            letterSpacing: '-0.03em',
          }}
        >
          {L.char}
        </span>
      ))}
    </motion.div>
  );
}

export default function RetroTV() {
  const navigate = useNavigate();
  // Stable per-mount pick so the preview doesn't reshuffle between re-renders.
  const featured = useMemo(() => pickFeaturedEpisode(), []);

  // Muted autoplay + loop. Hidden controls so the kid can't poke the player —
  // it's just ambient. Tapping the TV (not the iframe) handles navigation.
  const previewSrc = featured
    ? `https://player.vimeo.com/video/${featured.vimeoId}?autoplay=1&loop=1&muted=1&background=1&controls=0&app_id=122963&title=0&byline=0&portrait=0&dnt=1`
    : null;

  // The entire card is a single clickable target now (Feb 2026 request):
  // kids shouldn't have to hunt for the specific pixel that opens JMAtv.
  // The inner TV and starburst are non-interactive visuals; the outer
  // <motion.button> handles routing. Hover/tap animations run on the
  // whole card to reinforce the "tap anywhere" affordance.
  const openJMAtv = () => navigate('/jmatv');

  return (
    <motion.button
      type="button"
      data-testid="home-retro-tv"
      onClick={openJMAtv}
      aria-label="Open JMAtv — today's episode"
      className="relative z-10 mt-16 md:mt-24 mb-2 w-full max-w-5xl mx-auto block text-left border-0 bg-transparent p-0 cursor-pointer"
      initial={{ y: 30, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.6, type: 'spring', stiffness: 200 }}
      whileHover={{ y: -4, scale: 1.005 }}
      whileTap={{ scale: 0.995, y: 2 }}
    >
      <div
        className="relative rounded-3xl px-4 md:px-8 pt-12 md:pt-16 pb-6 md:pb-8"
        style={{
          background:
            'linear-gradient(180deg, #FFF9E9 0%, #FFF1CE 100%)',
          border: '4px solid var(--jma-dark)',
          boxShadow: '0 8px 0 0 var(--jma-dark)',
        }}
      >
        {/* Content row */}
        <div className="relative w-full flex flex-col md:flex-row items-center justify-center gap-4 md:gap-8">
          {/* LEFT — animated JMAtv logo + tagline. Two-layer stacked mark
              matches /jmatv page: frame image hue-rotates through the
              spectrum while the JMA letters cycle complementary crayon
              colors on a synced 12s beat.
              On phones (no md), this block stacks ABOVE the TV via
              `order-1` — kids scroll and see the JMAtv brand first,
              then the CRT with "Streaming Now" underneath. */}
          <div className="flex flex-col items-center md:items-end text-center md:text-right flex-shrink-0 md:max-w-[260px] order-1 md:order-1">
            <div
              className="relative"
              style={{
                width: 'clamp(150px, 22vw, 240px)',
                aspectRatio: '1361 / 1156',
              }}
            >
              <img
                src="assets/ui/jmatv-logo-v2-frame.png"
                alt="JMAtv"
                draggable={false}
                className="absolute inset-0 w-full h-full object-contain"
              />
              <div
                aria-hidden="true"
                className="absolute inset-0 jmatv-letters-mask"
                style={{
                  WebkitMaskImage: `url(${process.env.PUBLIC_URL || ''}/assets/ui/jmatv-logo-v2-letters.png)`,
                  maskImage: `url(${process.env.PUBLIC_URL || ''}/assets/ui/jmatv-logo-v2-letters.png)`,
                }}
              />
            </div>
            <p
              className="mt-2 md:mt-3 font-black font-display leading-tight"
              style={{
                color: 'var(--jma-dark)',
                fontSize: 'clamp(15px, 1.6vw, 20px)',
              }}
            >
              Watch today&apos;s episode!
            </p>
            <p
              className="mt-1 text-[11px] md:text-xs font-bold leading-snug"
              style={{ color: 'var(--jma-dark)', opacity: 0.7 }}
            >
              Songs, stories and music adventures with the JMA crew.
            </p>
          </div>

          {/* CENTER — the TV itself. Non-interactive now; the outer card
              is the single click target. On phones (no md), this drops
              BELOW the JMAtv logo via `order-2`. */}
          <div className="flex flex-col items-center order-2 md:order-2">
            <motion.div
              data-testid="home-retro-tv-visual"
              className="relative rounded-3xl"
              style={{ width: 'clamp(220px, 32vw, 320px)' }}
            >
        {/* Rabbit ears — purely decorative. Sit BEHIND the TV body via z-index
            so the ear bases tuck under the wood frame. Flat grey sticks
            without the metallic gradient or ball tips so they match the
            simpler hand-drawn look of the rest of the universe. */}
        <div
          aria-hidden="true"
          className="absolute"
          style={{
            top: '-16%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '52%',
            height: '22%',
            zIndex: 0,
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 0, left: '18%',
              width: 6, height: '100%',
              background: '#6B7280',
              transform: 'rotate(-22deg)',
              transformOrigin: 'bottom center',
              borderRadius: 4,
              boxShadow: '2px 2px 0 rgba(0,0,0,0.25)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              top: 0, right: '18%',
              width: 6, height: '100%',
              background: '#6B7280',
              transform: 'rotate(22deg)',
              transformOrigin: 'bottom center',
              borderRadius: 4,
              boxShadow: '2px 2px 0 rgba(0,0,0,0.25)',
            }}
          />
        </div>

        {/* Wood-grain TV body — uses CSS gradients for "wood grain" without
            shipping an extra texture asset. Outer JMA-dark stroke matches
            the chunky black outline on every other cartoon element in
            this universe. */}
        <div
          className="relative rounded-3xl"
          style={{
            background:
              'repeating-linear-gradient(90deg, #A67B4C 0px, #A67B4C 2px, #C89968 2px, #C89968 5px), linear-gradient(180deg, #C89968, #8B6540)',
            backgroundBlendMode: 'multiply',
            border: '5px solid #000',
            boxShadow:
              '0 10px 0 0 #000, inset 0 0 0 3px #3F2A14, inset 0 0 0 5px rgba(255,255,255,0.08)',
            padding: '14px 14px 10px 14px',
            zIndex: 1,
          }}
        >
          {/* CRT bezel — black inner frame around the screen */}
          <div
            className="relative rounded-xl overflow-hidden"
            style={{
              background: '#0A0A0A',
              border: '3px solid #1F2937',
              boxShadow: 'inset 0 0 12px rgba(0,0,0,0.8)',
              aspectRatio: '4 / 3',
            }}
          >
            {/* The actual video. Wrapped so we can render an overlay above it
                without losing pointer events on the surrounding TV button. */}
            {previewSrc ? (
              <iframe
                key={featured.vimeoId}
                title="JMAtv preview"
                src={previewSrc}
                allow="autoplay; fullscreen; picture-in-picture"
                referrerPolicy="strict-origin-when-cross-origin"
                style={{
                  position: 'absolute',
                  top: '50%', left: '50%',
                  width: '177.77%',   // 16:9 video inside a 4:3 frame, scaled
                  height: '100%',
                  transform: 'translate(-50%, -50%)',
                  border: 0,
                  pointerEvents: 'none',
                }}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <img
                  src="assets/ui/jmatv-logo-v2.png"
                  alt="JMAtv"
                  className="object-contain"
                  style={{ width: '60%', filter: 'drop-shadow(0 0 12px rgba(255,200,0,0.5))' }}
                  draggable={false}
                />
              </div>
            )}

            {/* CRT scanlines overlay — subtle horizontal banding for vintage
                texture. Pure CSS, no asset. */}
            <div
              aria-hidden="true"
              className="absolute inset-0 pointer-events-none"
              style={{
                background: 'repeating-linear-gradient(180deg, rgba(0,0,0,0.18) 0px, rgba(0,0,0,0.18) 1px, transparent 1px, transparent 3px)',
                mixBlendMode: 'multiply',
              }}
            />

            {/* Curved glass reflection — light glint top-left */}
            <div
              aria-hidden="true"
              className="absolute inset-0 pointer-events-none rounded-xl"
              style={{
                background: 'radial-gradient(ellipse at 28% 18%, rgba(255,255,255,0.18) 0%, transparent 40%)',
              }}
            />

            {/* JMAtv logo bug — tiny brand mark in bottom-right of screen so
                kids learn the channel name even before tapping in. */}
            <img
              src="assets/ui/jmatv-logo-v2.png"
              alt=""
              aria-hidden="true"
              draggable={false}
              className="absolute pointer-events-none"
              style={{
                bottom: 6, right: 6,
                width: '22%',
                opacity: 0.92,
                filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.6))',
              }}
            />
          </div>

          {/* TV controls strip below the screen — speaker grille + knobs.
              The "JMAtv" channel label used to live here but reads redundantly
              alongside the JMAtv brand-bug on the CRT itself, so it's been
              removed. Keeping the speaker grille wider absorbs its space. */}
          <div className="flex items-center justify-between mt-2 px-1">
            {/* Speaker grille — widened now that the channel label is gone. */}
            <div
              aria-hidden="true"
              style={{
                width: '72%',
                height: 18,
                borderRadius: 4,
                background:
                  'repeating-linear-gradient(90deg, rgba(0,0,0,0.45) 0 2px, rgba(255,255,255,0.06) 2px 5px)',
                border: '1.5px solid #3F2A14',
              }}
            />
            {/* Knobs */}
            <div className="flex items-center gap-1.5">
              {[0, 1].map((i) => (
                <div
                  key={i}
                  aria-hidden="true"
                  style={{
                    width: 14, height: 14,
                    borderRadius: '50%',
                    background: 'radial-gradient(circle at 35% 35%, #E5C597, #5A3A1A)',
                    border: '1.5px solid #3F2A14',
                    boxShadow: 'inset 0 0 0 2px rgba(255,255,255,0.08)',
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      {/* "Streaming now" pill — moved BELOW the TV (Feb 2026, user request)
          because it was getting visually tangled with the rabbit-ear
          antennas above the TV. Same low-key styling; just relocated. */}
      <div className="flex items-center gap-2 mt-2">
        <span
          aria-hidden="true"
          className="inline-block rounded-full"
          style={{
            width: 10, height: 10,
            backgroundColor: '#FF3B30',
            boxShadow: '0 0 8px rgba(255,59,48,0.7)',
            animation: 'jma-pulse 1.4s ease-in-out infinite',
          }}
        />
        <span
          className="text-[10px] md:text-xs font-black uppercase tracking-widest"
          style={{ color: 'var(--jma-dark)', opacity: 0.75 }}
        >
          Streaming Now
        </span>
      </div>
      </div>

      {/* RIGHT — hand-stuck starburst. Non-interactive visual now; whole
          card is one click target. */}
      <div className="hidden md:flex order-3 flex-shrink-0 items-center justify-center">
        <motion.div
          data-testid="home-retro-tv-cta"
          className="relative flex items-center justify-center"
          style={{ width: 150, height: 150 }}
          animate={{ rotate: [-6, 6, -6] }}
          transition={{ duration: 3.4, repeat: Infinity, ease: 'easeInOut' }}
        >
          <div
            aria-hidden="true"
            className="absolute inset-0"
            style={{
              background: '#FFCC00',
              clipPath:
                'polygon(50% 0%, 60% 15%, 75% 5%, 78% 22%, 95% 20%, 88% 35%, 100% 50%, 88% 65%, 95% 80%, 78% 78%, 75% 95%, 60% 85%, 50% 100%, 40% 85%, 25% 95%, 22% 78%, 5% 80%, 12% 65%, 0% 50%, 12% 35%, 5% 20%, 22% 22%, 25% 5%, 40% 15%)',
              boxShadow: '0 6px 0 rgba(10,37,64,0.35)',
            }}
          />
          <div className="relative flex flex-col items-center gap-1 px-2">
            <div
              className="rounded-full flex items-center justify-center"
              style={{
                width: 44,
                height: 44,
                backgroundColor: 'var(--jma-dark)',
                boxShadow: 'inset 0 -3px 0 rgba(0,0,0,0.35), 0 3px 0 rgba(10,37,64,0.35)',
              }}
            >
              {/* Play triangle */}
              <div
                style={{
                  width: 0,
                  height: 0,
                  marginLeft: 4,
                  borderLeft: '14px solid #FFCC00',
                  borderTop: '10px solid transparent',
                  borderBottom: '10px solid transparent',
                }}
              />
            </div>
            <div
              className="text-sm font-black font-display uppercase leading-none tracking-wider"
              style={{ color: 'var(--jma-dark)' }}
            >
              Press
            </div>
            <div
              className="text-lg font-black font-display uppercase leading-none tracking-wider"
              style={{ color: 'var(--jma-dark)' }}
            >
              Play!
            </div>
          </div>
        </motion.div>
      </div>
      </div>
      </div>
    </motion.button>
  );
}
