// Shared submenu page used by PlayMenuPage, LearnMenuPage, CreateMenuPage.
//
// Look: NES cartridge art. Header uses the same Finn · Shield · Charlie hero
// row as the home page (branding consistency) instead of a giant word.
// Each tile is dominated by:
//   - Full-bleed background scene (slow Ken Burns pop)
//   - Character hero at the bottom-center (BIG) — never cropped
//   - Title band at the TOP-LEFT, single line, UNIFORM font-size across
//     every tile on the page (page-level fit: pick the smallest size that
//     lets the longest title in the set fit on one line, then apply that
//     size to all tiles so the grid feels consistent).
//
// No taglines, no sign nameplates, no speech bubbles — the title carries
// the tile.

import { motion } from 'framer-motion';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GameHeader } from './GameUI';
import BlimpFlyby from './BlimpFlyby';
import UnderwaterBackdrop, { UNDERWATER_BG_COLOR } from './UnderwaterBackdrop';
import TileDecoration from './TileDecoration';

/**
 * Single-line uppercase title with UNIFORM size across every tile on the
 * page. Uses a viewport-clamped fontSize instead of DOM measurement so
 * every card renders at the same visual weight — no font-loading race,
 * no ResizeObserver loops, no per-tile fit divergence. The clamp is tuned
 * to comfortably fit the longest titles in the app ("DETECTIVE DR.
 * JELLYBONE", "CHARLIE'S SONG STUDIO", "WHO'S GOT THE RHYTHM") in the
 * narrowest tile at every breakpoint we support.
 *
 *   Mobile (viewport ~360px, single-column card ~336px):
 *     2.6vw = 9.4px, clamped up to floor 17 → 17px
 *   Tablet portrait (768px, 2-col card ~370px):
 *     2.6vw = 20px  (fits "DETECTIVE DR. JELLYBONE" single-line)
 *   Desktop (>=1200px, 2-col card ~500px):
 *     2.6vw = 31.2, clamped down to ceiling 30 → 30px
 *
 * The clamp is intentionally sized so the LONGEST title in the app
 * ("DETECTIVE DR. JELLYBONE" @ 23 chars) fits single-line at every
 * supported breakpoint — dropping it any smaller would hurt shorter
 * titles like "BEAT LAB", so we hold the line here.
 */
function TileTitle({ text, testId }) {
  return (
    <h2
      data-testid={testId}
      className="font-black font-display uppercase whitespace-nowrap leading-none"
      style={{
        color: 'white',
        fontSize: 'clamp(17px, 2.6vw, 30px)',
        WebkitTextStroke: '0.09em var(--jma-dark)',
        paintOrder: 'stroke fill',
        textShadow:
          '0 3px 0 rgba(10,37,64,0.7), 0 6px 14px rgba(10,37,64,0.55)',
        letterSpacing: '0.01em',
        margin: 0,
      }}
    >
      {text}
    </h2>
  );
}

function Tile({ tile, index, navigate }) {
  const [hovered, setHovered] = useState(false);
  const disabled = tile.disabled;

  const handleClick = () => {
    if (disabled) return;
    if (tile.sfx) {
      try {
        const audio = new Audio(tile.sfx);
        audio.volume = tile.sfx.includes('sfx-dj-scratch') ? 0.85 : 0.42;
        audio.play().catch(() => { /* autoplay rejected — proceed without SFX */ });
        // Cap the preview to ~500 ms so long-form SFX (like an 8-second
        // Robot Boogie synth loop) don't keep playing after the user
        // has navigated away — that was the "audio doesn't stop after
        // leaving the page" bug. Short quick fade-out prevents a click.
        const CAP_MS = 500;
        setTimeout(() => {
          try {
            audio.volume = 0;
            audio.pause();
            audio.removeAttribute('src'); // avoid empty-string src browser warning
            audio.load();
          } catch { /* ignore */ }
        }, CAP_MS);
      } catch { /* ignore */ }
    }
    const delay = tile.sfx ? 220 : 0;
    setTimeout(() => navigate(tile.path), delay);
  };

  // Heroes are BIG now — bump the widthPct authored on each tile with a
  // uniform scale so we don't have to touch every menu file. Cap at 78%
  // so multi-character art (jelly-rap-trio at 52) doesn't run to the edges.
  const HERO_SCALE = 1.45;
  const heroWidthPct = Math.min((tile.charWidthPct || 34) * HERO_SCALE, 78);
  // Reserve the top ~22% for the title band so heroes don't overlap text.
  const heroHeightPct = tile.charHeightPct || 78;

  return (
    <motion.button
      type="button"
      data-testid={`submenu-tile-${tile.id}`}
      onClick={handleClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`relative w-full text-left rounded-3xl border-4 overflow-hidden ${tile.fullWidth ? 'md:col-span-2' : ''} ${disabled ? 'cursor-not-allowed opacity-80' : 'cursor-pointer'}`}
      style={{
        borderColor: 'var(--jma-dark)',
        boxShadow: `0 8px 0 0 var(--jma-dark)`,
        background: tile.color,
        aspectRatio: tile.fullWidth ? '16 / 6' : '4 / 3',
        minHeight: tile.fullWidth ? 180 : 220,
      }}
      initial={{ y: 40, opacity: 0, rotate: index % 2 === 0 ? -1.5 : 1.5 }}
      animate={{ y: 0, opacity: 1, rotate: 0 }}
      transition={{ delay: 0.15 + index * 0.08, type: 'spring', stiffness: 220 }}
      whileHover={disabled ? {} : { y: -6, boxShadow: '0 14px 0 0 var(--jma-dark)', scale: 1.012 }}
      whileTap={disabled ? {} : { y: 3, boxShadow: '0 4px 0 0 var(--jma-dark)', scale: 0.985 }}
    >
      {/* Background scene — slow Ken Burns drift so the world "breathes".
          Staggered per-card so the grid isn't in lockstep. */}
      {tile.bg && (
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url(${tile.bg})`,
            backgroundSize: 'cover',
            backgroundPosition: tile.bgPosition || 'center',
            animation: 'submenuKenBurns 16s ease-in-out infinite',
            animationDelay: `${(index % 4) * 1.7}s`,
            willChange: 'transform',
          }}
        />
      )}

      {/* Top shadow gradient keeps the title band legible on any scene. */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 pointer-events-none"
        style={{
          height: '38%',
          background:
            `linear-gradient(180deg, rgba(10,37,64,0.72) 0%, ${tile.accent || tile.color}55 60%, transparent 100%)`,
        }}
      />

      {/* Diagonal sheen sweep — subtle premium-tile polish. Passes across
          every ~9s with a stagger so cards don't all glint at once. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none overflow-hidden z-[8]"
      >
        <div
          style={{
            position: 'absolute',
            top: '-20%',
            left: 0,
            width: '38%',
            height: '140%',
            background:
              'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.55) 50%, transparent 100%)',
            transform: 'skewX(-18deg) translateX(-160%)',
            animation: 'submenuSheen 9s ease-in-out infinite',
            animationDelay: `${1.2 + (index % 5) * 1.5}s`,
            mixBlendMode: 'overlay',
            willChange: 'transform, opacity',
          }}
        />
      </div>

      {/* Accent-colored sparkle rising from the bottom of the card. One dot,
          slight per-card horizontal offset so it feels handcrafted, not
          templated. Skipped on disabled tiles. */}
      {!disabled && (
        <div
          aria-hidden="true"
          className="absolute pointer-events-none z-[9]"
          style={{
            bottom: '10%',
            left: `${28 + (index % 3) * 22}%`,
            width: 'clamp(8px, 1.2vw, 12px)',
            height: 'clamp(8px, 1.2vw, 12px)',
            borderRadius: '9999px',
            background: `radial-gradient(circle, #FFFFFF 0%, ${tile.accent || tile.color} 60%, transparent 100%)`,
            boxShadow: `0 0 8px 2px ${tile.accent || tile.color}aa`,
            animation: 'submenuSparkle 4.4s ease-out infinite',
            animationDelay: `${0.6 + (index % 4) * 1.1}s`,
            willChange: 'transform, opacity',
          }}
        />
      )}
      {/* Scene-specific CSS decoration — staff lines, clouds, sparkles,
          etc. Sits BEHIND the character but IN FRONT of the bg. Pure CSS,
          no new assets. Configured via `tile.decoration` in each menu
          page's tile array. */}
      <TileDecoration type={tile.decoration} accent={tile.accent || tile.color} />

      {/* Primary character — BIG, bottom-centered so it dominates the
          cartridge without covering the title band up top. Charlie's Song
          Studio has no character; we simply skip rendering.
          NOTE: the framer-motion `animate` on the <img> writes to the same
          `transform` property we'd use for `translateX(-50%)`, so centering
          MUST live on a non-motion wrapper — otherwise motion clobbers it
          and the sprite drifts off to the right (that was the Beat Lab
          "trio cropped in half" bug). */}
      {tile.character && (
        <div
          className="absolute bottom-0 left-1/2 pointer-events-none z-10"
          style={{
            width: `${heroWidthPct}%`,
            height: `${heroHeightPct}%`,
            transform: 'translateX(-50%)',
          }}
        >
          <motion.img
            src={tile.character}
            alt=""
            draggable={false}
            loading="lazy"
            className="w-full h-full select-none"
            style={{
              objectFit: tile.charObjectFit || 'contain',
              objectPosition: tile.charObjectPosition || 'bottom center',
              filter: 'drop-shadow(0 10px 12px rgba(0,0,0,0.55))',
            }}
            animate={hovered ? { y: -8, rotate: -3 } : { y: [0, -6, 0], rotate: 0 }}
            transition={
              hovered
                ? { type: 'spring', stiffness: 240 }
                : { y: { repeat: Infinity, duration: 2.4, ease: 'easeInOut' } }
            }
          />
        </div>
      )}

      {/* Title band — single line, TOP-LEFT anchored, uniform font-size
          across every tile on the page (computed once at the SubMenuPage
          level so JAM SESSION and DETECTIVE DR. JELLYBONE render at the
          same visual weight). */}
      <div
        className="absolute left-3 top-3 md:left-4 md:top-4 z-20"
        style={{ maxWidth: 'calc(100% - 24px)' }}
      >
        <TileTitle
          text={tile.title}
          testId={`submenu-tile-title-${tile.id}`}
        />
        {disabled && (
          <p
            className="mt-1 text-[10px] md:text-xs font-black uppercase tracking-wide inline-block px-2 py-0.5 rounded-full"
            style={{ backgroundColor: 'white', color: 'var(--jma-dark)' }}
          >
            Coming Soon
          </p>
        )}
      </div>

      {/* Enter chip (hover-reveal, desktop only) */}
      {!disabled && (
        <motion.div
          className="absolute bottom-3 left-3 px-2.5 py-1 rounded-full border-2 z-20 hidden md:flex items-center gap-1"
          style={{ backgroundColor: 'white', borderColor: 'var(--jma-dark)' }}
          animate={hovered ? { x: 0, opacity: 1 } : { x: -20, opacity: 0 }}
          transition={{ type: 'spring' }}
        >
          <span className="text-[10px] font-black uppercase tracking-wide" style={{ color: 'var(--jma-dark)' }}>
            Enter →
          </span>
        </motion.div>
      )}
    </motion.button>
  );
}

/**
 * Header hero row — Finn · Shield logo · Charlie. Mirrors the home page so
 * the sub-worlds feel like the same brand universe. Replaces the earlier
 * giant "PLAY / LEARN / CREATE" word treatment (the section subtitle pill
 * carries that context now).
 */
function HeaderHero({ subtitle }) {
  const navigate = useNavigate();
  return (
    <motion.div
      className="relative z-10 text-center mb-5 md:mb-7 w-full flex flex-col items-center"
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
    >
      <div className="flex items-center justify-center gap-2 sm:gap-4 md:gap-6 w-full">
        <motion.img
          src="assets/characters/finn-danger.png"
          alt="Finn"
          data-testid="submenu-hero-finn"
          className="object-contain drop-shadow-lg cursor-pointer"
          style={{ width: 'clamp(35px, 5.5vw, 70px)', height: 'auto' }}
          initial={{ x: -40, opacity: 0 }}
          animate={{ x: 0, opacity: 1, y: [0, -6, 0] }}
          transition={{
            x: { delay: 0.15, type: 'spring' },
            opacity: { delay: 0.15 },
            y: { repeat: Infinity, duration: 2.4, ease: 'easeInOut' },
          }}
          whileHover={{ scale: 1.08, rotate: -4 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => navigate('/fun-facts')}
        />

        <motion.img
          src="assets/ui/logo.png"
          alt="Jelly of the Month Club Music Academy"
          data-testid="submenu-hero-logo"
          className="object-contain cursor-pointer"
          style={{
            width: 'clamp(70px, 12.1vw, 154px)',
            height: 'auto',
            filter: 'drop-shadow(0 6px 10px rgba(0,0,0,0.18))',
          }}
          initial={{ y: -20, opacity: 0, rotate: -4 }}
          animate={{ y: 0, opacity: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 200 }}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          onClick={() => navigate('/')}
        />

        <motion.img
          src="assets/characters/charlie.png"
          alt="Charlie"
          data-testid="submenu-hero-charlie"
          className="object-contain drop-shadow-lg cursor-pointer"
          style={{ width: 'clamp(44px, 7.7vw, 92px)', height: 'auto' }}
          initial={{ x: 40, opacity: 0 }}
          animate={{ x: 0, opacity: 1, y: [0, -6, 0] }}
          transition={{
            x: { delay: 0.2, type: 'spring' },
            opacity: { delay: 0.2 },
            y: { repeat: Infinity, duration: 2.6, ease: 'easeInOut', delay: 0.4 },
          }}
          whileHover={{ scale: 1.08, rotate: 4 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => navigate('/fun-facts')}
        />
      </div>

      {subtitle && (
        <p
          className="mt-3 text-sm md:text-base font-bold uppercase tracking-wider inline-block px-3 py-1 rounded-full"
          style={{
            color: 'white',
            backgroundColor: 'var(--jma-dark)',
            boxShadow: '0 3px 0 0 rgba(0,0,0,0.35)',
          }}
        >
          {subtitle}
        </p>
      )}
    </motion.div>
  );
}

/**
 * <SubMenuPage
 *   sectionTitle="PLAY"          // kept for a11y; not rendered as giant text anymore
 *   sectionSubtitle="Pick a game!"
 *   bgGradient="..."
 *   tiles={[...]}
 * />
 */
export default function SubMenuPage({ sectionTitle, sectionSubtitle, bgGradient, tiles, testId }) {
  const navigate = useNavigate();
  return (
    <div
      data-testid={testId}
      className="min-h-screen flex flex-col items-center px-3 sm:px-6 pt-16 md:pt-20 pb-8 relative overflow-x-hidden"
      style={{ backgroundColor: UNDERWATER_BG_COLOR }}
      aria-label={sectionTitle}
    >
      {/* Shared underwater backdrop — matches the HomePage lobby so
          Play / Learn / Create feel like the same underwater world.
          The legacy `bgGradient` prop is ignored now that every sub-menu
          inherits the sea theme. */}
      <UnderwaterBackdrop />

      {/* Lou blimp — same drifting sky presence used on the home page so the
          three sub-worlds feel contiguous with the lobby. Sits behind
          everything else. */}
      <BlimpFlyby />

      <GameHeader showHomeButton={true} />

      <HeaderHero subtitle={sectionSubtitle} />

      <div className="relative z-10 w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
        {tiles.map((tile, idx) => (
          <Tile key={tile.id} tile={tile} index={idx} navigate={navigate} />
        ))}
      </div>
    </div>
  );
}
