// RoomCharacters: drops 3-5 friendly characters onto a page as ambient
// inhabitants of that "room". Each character:
//   - bobs/sways with a unique idle animation
//   - cycles through alternate outfits when tapped (using existing assets)
//   - shows a contextual speech bubble on tap
//
// Designed to bring personality to every page without crowding gameplay.
// Positions are absolute % so they hug edges/corners and don't intercept
// the core instrument area.

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Per-character outfit cycles. Default first, then any alternates.
const OUTFITS = {
  charlie: [
    'assets/characters/charlie-polliwog.png',
    'assets/characters/charlie-zoot.png',
    'assets/characters/charlie-punk.png',
    'assets/characters/charlie-surf.png',
    'assets/characters/charlie-disco.png',
    'assets/characters/charlie-drum-major.png',
    'assets/characters/charlie-grad.png',
    'assets/characters/charlie-rundmc.png',
    'assets/characters/charlie-ragu.png',
    'assets/characters/charlie-steampunk.png',
  ],
  finn: [
    'assets/characters/finn-danger.png',
    'assets/characters/finn-disco.png',
    'assets/characters/sharky-hiphop.png',
    'assets/characters/sharky-snorkel.png',
    'assets/characters/sharky-zoot.png',
  ],
  chunk: [
    'assets/characters/chunk.png',
    'assets/characters/chunk-disco.png',
    'assets/characters/chunk-steampunk.png',
  ],
  jazzy: [
    'assets/characters/jazzy.png',
    'assets/characters/jazzy-disco.png',
  ],
  loustew: [
    'assets/characters/llama-lou-stew.png',
    'assets/characters/lou-disco.png',
  ],
  stew: [
    'assets/characters/stew.png',
    'assets/characters/stew-swing.png',
  ],
  doctor: [
    'assets/characters/dr-jellybone.png',
    'assets/characters/dr-jellybone-detective.png',
  ],
};

const NAMES = {
  charlie: 'Charlie',
  finn: 'Finn',
  chunk: 'Chunk',
  jazzy: 'Jazzy',
  loustew: 'Lou & Stew',
  stew: 'Stew',
  doctor: 'Dr. Jellybone',
};

// Per-character display scaling. Some source PNGs are much larger than others
// (Jazzy + Stew especially); these factors keep visual sizes consistent.
const SCALE = {
  charlie: 1.0,
  finn: 1.0,
  chunk: 0.95,
  jazzy: 0.55,
  loustew: 0.85,
  stew: 0.6,
  doctor: 0.7,
};

// Predefined "room casts" per page - which characters appear and where.
// Layout positions are { l: leftPct, t: topPct, w: widthPct, anim: 'bob'|'sway'|'peek' }
// We use edges/corners so we never block the play area. Mobile shrinks all chars.
const ROOM_CAST = {
  // Jam Hall (Free Play)
  'jam-hall': [
    { id: 'finn',    pos: { l: 3,  t: 14, w: 7, anim: 'bob' },   line: 'Try them all!' },
    { id: 'jazzy',   pos: { l: 92, t: 16, w: 6, anim: 'sway' },  line: 'Make it groove!' },
    { id: 'chunk',   pos: { l: 4,  t: 78, w: 8, anim: 'bob' },   line: 'Big beats!' },
    { id: 'charlie', pos: { l: 92, t: 78, w: 7, anim: 'sway' },  line: 'Jam Hall is the BEST!' },
  ],
  // Rhythm Arcade — a.k.a. Jelly Jukebox. Everyone in disco outfits so the
  // corner cast reads with the same disco vibe as the game's floor + backdrop.
  // Kids can still tap to cycle through their other outfits.
  'rhythm-arcade': [
    { id: 'finn',    pos: { l: 4,  t: 22, w: 6.5, anim: 'bob' },  line: 'Catch the notes!',   startOutfit: 'assets/characters/finn-disco.png' },
    { id: 'jazzy',   pos: { l: 93, t: 22, w: 6.5, anim: 'sway' }, line: 'Stay on the beat!',  startOutfit: 'assets/characters/jazzy-disco.png' },
    { id: 'charlie', pos: { l: 6,  t: 80, w: 7, anim: 'bob' },    line: 'You got this!',      startOutfit: 'assets/characters/charlie-disco.png' },
  ],
  // Stew Kazoo Says
  'kazoo-room': [
    { id: 'doctor',  pos: { l: 6,  t: 20, w: 7, anim: 'peek' },   line: 'Use your ears!' },
    { id: 'finn',    pos: { l: 92, t: 24, w: 6.5, anim: 'sway' }, line: 'Listen close!' },
    { id: 'loustew', pos: { l: 5,  t: 82, w: 8.5, anim: 'bob' },  line: 'We love kazoos!' },
  ],
  // Ear Quest (Ear Trainer)
  'ear-quest': [
    { id: 'doctor',  pos: { l: 5,  t: 22, w: 7,   anim: 'peek' }, line: 'Name that note!' },
    { id: 'jazzy',   pos: { l: 92, t: 22, w: 6.5, anim: 'sway' }, line: 'Trust your ears.' },
    { id: 'charlie', pos: { l: 5,  t: 80, w: 7,   anim: 'bob' },  line: 'I always close my eyes.' },
  ],
  // Beat Lab (Loop Studio) — the scene is ALREADY packed with the drum kit,
  // turntable, JMA speakers, sequencer grid, and controls bar. Floating
  // peripheral characters here read as visual clutter instead of personality,
  // so we keep this room intentionally empty of the room-cast.
  'beat-lab': [],
  // Note Match — memory pairs game
  'note-match': [
    { id: 'doctor',  pos: { l: 5,  t: 22, w: 7,   anim: 'peek' }, line: 'Watch closely!' },
    { id: 'charlie', pos: { l: 93, t: 22, w: 6.5, anim: 'sway' }, line: 'Find the twins!' },
    { id: 'finn',    pos: { l: 5,  t: 80, w: 7,   anim: 'bob' },  line: 'Trust your memory!' },
  ],
  // Detective Dr. Jellybone — he's the case-file star, so only sidekicks here
  'detective': [
    { id: 'charlie', pos: { l: 93, t: 22, w: 6.5, anim: 'bob' },  line: "Which one's off?" },
    { id: 'finn',    pos: { l: 93, t: 82, w: 7,   anim: 'sway' }, line: 'Crack the case!' },
  ],
  // Name That Note — Finn hosts from the speech bubble; friends watch from the sides
  'name-that-note': [
    { id: 'stew',    pos: { l: 4,  t: 24, w: 7,   anim: 'bob' },  line: 'Every note has a home!' },
    { id: 'charlie', pos: { l: 93, t: 22, w: 6.5, anim: 'sway' }, line: 'Lines and spaces!' },
    { id: 'jazzy',   pos: { l: 93, t: 82, w: 6.5, anim: 'bob' },  line: 'Read it like a pro.' },
  ],
  // Fun Facts Clubhouse handled by its own page
};

const ANIMS = {
  bob:   { y: [0, -6, 0] },
  sway:  { rotate: [-3, 3, -3], y: [0, -3, 0] },
  peek:  { y: [0, -3, 0], rotate: [-2, 2, -2] },
};

function CharacterImp({ id, pos, line, startOutfit }) {
  const baseOutfits = OUTFITS[id] || OUTFITS.charlie;
  // If a room pins a specific starting outfit (e.g. all-disco in Jelly
  // Jukebox), promote it to index 0 and de-duplicate the rest of the list
  // so tap-cycling still works normally.
  const outfits = startOutfit
    ? [startOutfit, ...baseOutfits.filter((p) => p !== startOutfit)]
    : baseOutfits;
  const [outfitIdx, setOutfitIdx] = useState(0);
  const [bubble, setBubble] = useState(false);
  const bubbleTimer = useRef(null);
  // Stable per-mount randomized duration so the idle animation doesn't
  // flicker on re-renders.
  const idleDuration = useRef(2.2 + Math.random() * 0.8);

  const handleTap = useCallback(() => {
    // Outfit changes IMMEDIATELY so kids see it. The speech bubble is
    // delayed by ~450ms and positioned to the side (not over the head) so
    // the outfit swap reads clearly first.
    setOutfitIdx((n) => (n + 1) % outfits.length);
    if (bubbleTimer.current) clearTimeout(bubbleTimer.current);
    bubbleTimer.current = setTimeout(() => {
      setBubble(true);
      bubbleTimer.current = setTimeout(() => setBubble(false), 1700);
    }, 450);
  }, [outfits.length]);

  useEffect(() => () => { if (bubbleTimer.current) clearTimeout(bubbleTimer.current); }, []);

  return (
    <motion.button
      type="button"
      data-testid={`room-char-${id}`}
      aria-label={`${NAMES[id]} - tap to change outfit`}
      onClick={handleTap}
      className="absolute bg-transparent border-0 p-0 cursor-pointer pointer-events-auto flex items-end justify-center"
      style={{
        left: `${pos.l}%`,
        top: `${pos.t}%`,
        // Fixed-size square container so different outfit aspect ratios don't
        // cause the character to grow/shift on tap. The image scales DOWN
        // inside the box but never up, preserving a stable footprint.
        width: `clamp(48px, ${pos.w}vw, 110px)`,
        height: `clamp(48px, ${pos.w}vw, 110px)`,
        transform: 'translate(-50%, -50%)',
        filter: 'drop-shadow(0 6px 8px rgba(0,0,0,0.45))',
      }}
      initial={{ opacity: 0, scale: 0.6 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.4, type: 'spring', stiffness: 200 }}
      whileTap={{ scale: 0.85, rotate: -6 }}
    >
      <motion.img
        src={outfits[outfitIdx]}
        alt={NAMES[id]}
        draggable={false}
        loading="lazy"
        className="max-w-full max-h-full object-contain select-none"
        style={{ transform: `scale(${SCALE[id] || 1})`, transformOrigin: 'center bottom' }}
        animate={ANIMS[pos.anim] || ANIMS.bob}
        transition={{ duration: idleDuration.current, repeat: Infinity, ease: 'easeInOut' }}
      />
      <AnimatePresence>
        {bubble && (() => {
          // Position bubble to the SIDE of the character (left if char is on
          // the right half of screen, right if on the left half) so it never
          // covers the outfit. Tail flips to point at the character.
          const onLeftHalf = pos.l < 50;
          return (
            <motion.div
              key={`bub-${outfitIdx}`}
              className="absolute top-1/2 px-3 py-1.5 rounded-2xl border-3 pointer-events-none"
              style={{
                ...(onLeftHalf
                  ? { left: '100%', marginLeft: '12px' }
                  : { right: '100%', marginRight: '12px' }),
                transform: 'translateY(-50%)',
                backgroundColor: 'white',
                borderColor: 'var(--jma-dark)',
                boxShadow: '0 3px 0 0 var(--jma-dark)',
                fontSize: '0.75rem',
                fontWeight: 800,
                color: 'var(--jma-dark)',
                width: 'max-content',
                maxWidth: '140px',
                whiteSpace: 'normal',
                textAlign: 'center',
                lineHeight: 1.15,
              }}
              initial={{ opacity: 0, x: onLeftHalf ? -8 : 8, scale: 0.7 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: onLeftHalf ? -8 : 8, scale: 0.7 }}
              transition={{ type: 'spring', stiffness: 320 }}
            >
              {line}
              {/* Side-pointing tail */}
              <span
                className="absolute top-1/2 w-3 h-3 rotate-45"
                style={{
                  ...(onLeftHalf
                    ? { left: '-7px', borderLeft: '3px solid var(--jma-dark)', borderBottom: '3px solid var(--jma-dark)' }
                    : { right: '-7px', borderRight: '3px solid var(--jma-dark)', borderTop: '3px solid var(--jma-dark)' }),
                  transform: 'translateY(-50%) rotate(45deg)',
                  backgroundColor: 'white',
                }}
              />
            </motion.div>
          );
        })()}
      </AnimatePresence>
    </motion.button>
  );
}

/**
 * <RoomCharacters room="jam-hall" />
 * Drops the predefined cast onto the page in absolute positions.
 * Wrap the page in `relative` for these to anchor correctly.
 *
 * Hidden on small phones (<md) where they crowd the play area; the page-level
 * characters (header mascot, in-scene characters) are sufficient on mobile.
 */
export default function RoomCharacters({ room }) {
  const cast = ROOM_CAST[room];
  if (!cast || cast.length === 0) return null;
  return (
    <div className="absolute inset-0 pointer-events-none z-20 hidden md:block" aria-hidden={false}>
      {cast.map((c) => (
        <CharacterImp
          key={c.id}
          id={c.id}
          pos={c.pos}
          line={c.line}
          startOutfit={c.startOutfit}
        />
      ))}
    </div>
  );
}
