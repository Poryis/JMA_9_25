// RobotBoogieTitle — bespoke sci-fi/robot title just for Robot Boogie.
//
// The rest of JMA uses the default font-display sans title (see GameHeader).
// Robot Boogie is the app's most futuristic experience — Time Machine,
// lightning bolts, robot mixer aesthetic — so it earns a distinct
// treatment: a chrome-metal gradient fill, hairline outline for legibility
// over any background, and a soft cyan glow to hint at the electrical
// theme. Still recognizably JMA (all-caps, bold, kid-friendly weight),
// just clearly different from the other game titles.
import { motion } from 'framer-motion';

export default function RobotBoogieTitle() {
  return (
    <motion.h1
      data-testid="robot-boogie-title"
      initial={{ y: -14, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 220, damping: 18 }}
      className="text-center font-black uppercase select-none pointer-events-auto"
      style={{
        // Wide-tracked, tall letters — reads as a marquee or robot HUD.
        fontFamily: '"Orbitron", "Rajdhani", "Bebas Neue", "Impact", system-ui, sans-serif',
        fontSize: 'clamp(1rem, 3vw, 1.9rem)',
        letterSpacing: '0.08em',
        lineHeight: 1,
        // Chrome gradient text fill — hits the "robot" visual note.
        backgroundImage:
          'linear-gradient(180deg, #FFFFFF 0%, #E9F6FF 35%, #98D6FF 55%, #4FA6E2 75%, #B7EBFF 100%)',
        WebkitBackgroundClip: 'text',
        backgroundClip: 'text',
        color: 'transparent',
        // Hairline outline for legibility over the deep-purple RB stage,
        // plus a soft cyan glow so it hums with the lightning theme.
        WebkitTextStroke: '1px rgba(20,20,50,0.7)',
        filter:
          'drop-shadow(0 2px 0 rgba(0,0,0,0.55)) drop-shadow(0 0 10px rgba(120,200,255,0.55))',
      }}
    >
      Robot Boogie
    </motion.h1>
  );
}
