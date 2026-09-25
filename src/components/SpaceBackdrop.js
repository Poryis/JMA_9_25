// SpaceBackdrop — the JMAtv outer-space scene, factored out so every
// JMAtv page (channel guide, episode player, coming-soon states) shares
// the same sky. Contains the nebula wash, twinkling starfield, ringed
// planet with orbiting moon, and the drifting cartoon satellite.
//
// Renders as a set of absolute-positioned aria-hidden layers inside a
// `relative` parent — safe to drop under any page's main content.

import { motion } from 'framer-motion';
import SatelliteFlyby from './SatelliteFlyby';
import DrJellyboneAstronaut from './DrJellyboneAstronaut';
import ShootingStar from './ShootingStar';

const JMA_DARK = '#0A2540';

function Nebula() {
  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 pointer-events-none"
      style={{
        background: [
          'radial-gradient(ellipse 60% 40% at 22% 30%, rgba(175,82,222,0.35) 0%, transparent 60%)',
          'radial-gradient(ellipse 55% 35% at 78% 70%, rgba(0,168,232,0.30)  0%, transparent 60%)',
          'radial-gradient(ellipse 40% 30% at 50% 15%, rgba(255,204,0,0.10)  0%, transparent 60%)',
        ].join(', '),
      }}
    />
  );
}

function Starfield() {
  return (
    <>
      {/* Layer A: main starfield — dense, mid-brightness stars pulsing
          on a ~5s cycle (slow so it reads as ambient twinkle). */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: [
            'radial-gradient(1.5px 1.5px at 12% 18%, #FFFFFF 60%, transparent 61%)',
            'radial-gradient(1px   1px   at 28% 42%, #FFE7C2 60%, transparent 61%)',
            'radial-gradient(2px   2px   at 46% 12%, #FFFFFF 60%, transparent 61%)',
            'radial-gradient(1px   1px   at 58% 68%, #FFFFFF 60%, transparent 61%)',
            'radial-gradient(1.5px 1.5px at 72% 24%, #FFCC00 60%, transparent 61%)',
            'radial-gradient(1px   1px   at 84% 54%, #FFFFFF 60%, transparent 61%)',
            'radial-gradient(2px   2px   at 92% 82%, #FFFFFF 60%, transparent 61%)',
            'radial-gradient(1px   1px   at 6%  74%, #FFE7C2 60%, transparent 61%)',
            'radial-gradient(1.5px 1.5px at 22% 88%, #FFFFFF 60%, transparent 61%)',
            'radial-gradient(1px   1px   at 38% 32%, #FFFFFF 60%, transparent 61%)',
            'radial-gradient(1px   1px   at 66% 92%, #FFFFFF 60%, transparent 61%)',
            'radial-gradient(1.5px 1.5px at 80% 8%,  #FFCC00 60%, transparent 61%)',
          ].join(', '),
          animation: 'jma-star-twinkle-a 5s ease-in-out infinite',
        }}
      />
      {/* Layer B: sparser, brighter feature stars twinkling on an
          offset cycle so the field never pulses uniformly. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: [
            'radial-gradient(2.5px 2.5px at 18% 8%,  #FFFFFF 55%, transparent 60%)',
            'radial-gradient(2px   2px   at 34% 60%, #FFFFFF 55%, transparent 60%)',
            'radial-gradient(2.5px 2.5px at 52% 38%, #FFE7C2 55%, transparent 60%)',
            'radial-gradient(2px   2px   at 68% 82%, #FFFFFF 55%, transparent 60%)',
            'radial-gradient(2.5px 2.5px at 88% 14%, #FFCC00 55%, transparent 60%)',
            'radial-gradient(2px   2px   at 10% 52%, #FFFFFF 55%, transparent 60%)',
            'radial-gradient(2.5px 2.5px at 44% 96%, #FFFFFF 55%, transparent 60%)',
            'radial-gradient(2px   2px   at 76% 40%, #FFE7C2 55%, transparent 60%)',
          ].join(', '),
          animation: 'jma-star-twinkle-b 3.2s ease-in-out infinite',
          animationDelay: '-1.1s',
        }}
      />
    </>
  );
}

function DistantPlanet() {
  return (
    <motion.div
      aria-hidden="true"
      className="absolute pointer-events-none"
      style={{
        right: '3%',
        top: '9%',
        width: 'clamp(84px, 11vw, 160px)',
        aspectRatio: '1 / 1',
        zIndex: 0,
        filter: 'drop-shadow(0 0 24px rgba(255,149,0,0.35))',
      }}
      animate={{ y: [0, -6, 0] }}
      transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
    >
      <svg viewBox="0 0 200 200" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
        <defs>
          <radialGradient id="spaceBackdropPlanetShade" cx="35%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#FFE0A8" />
            <stop offset="45%" stopColor="#FF9500" />
            <stop offset="100%" stopColor="#8A2B00" />
          </radialGradient>
        </defs>

        {/* Rotating ring — BEHIND the body */}
        <g>
          <motion.ellipse
            cx="100" cy="100" rx="94" ry="26"
            fill="none"
            stroke="#FFE7C2"
            strokeWidth="10"
            transform="rotate(-14 100 100)"
            animate={{ rotate: [-14, -8, -14] }}
            transition={{ duration: 24, repeat: Infinity, ease: 'linear' }}
          />
          <ellipse cx="100" cy="100" rx="94" ry="26" fill="none" stroke={JMA_DARK} strokeWidth="4" transform="rotate(-14 100 100)" />
        </g>

        <circle cx="100" cy="100" r="58" fill="url(#spaceBackdropPlanetShade)" stroke={JMA_DARK} strokeWidth="5" />
        <path d="M 100 42 A 58 58 0 0 1 100 158 A 44 58 0 0 0 100 42 Z" fill="rgba(0,0,0,0.28)" />
        <path d="M 62 92 Q 100 82 138 92" fill="none" stroke="rgba(0,0,0,0.28)" strokeWidth="3" />
        <path d="M 66 110 Q 100 118 134 110" fill="none" stroke="rgba(0,0,0,0.22)" strokeWidth="3" />

        {/* Ring in FRONT of body */}
        <path d="M 6 100 A 94 26 0 0 0 194 100" fill="none" stroke="#FFE7C2" strokeWidth="10" transform="rotate(-14 100 100)" />
        <path d="M 6 100 A 94 26 0 0 0 194 100" fill="none" stroke={JMA_DARK} strokeWidth="4" transform="rotate(-14 100 100)" />
      </svg>

      <motion.div
        style={{ position: 'absolute', inset: 0, transformOrigin: '50% 50%' }}
        animate={{ rotate: 360 }}
        transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
      >
        <div
          style={{
            position: 'absolute',
            left: '92%',
            top: '46%',
            width: 20,
            height: 20,
            borderRadius: '50%',
            background: 'radial-gradient(circle at 35% 30%, #FFFFFF 0%, #C0C0C0 60%, #808080 100%)',
            border: `3px solid ${JMA_DARK}`,
            boxShadow: '2px 2px 0 rgba(0,0,0,0.3)',
          }}
        />
      </motion.div>
    </motion.div>
  );
}

export default function SpaceBackdrop() {
  return (
    <>
      <Nebula />
      <Starfield />
      <DistantPlanet />
      <ShootingStar />
      <SatelliteFlyby />
      <DrJellyboneAstronaut />
    </>
  );
}

// Base gradient style — apply to the page's own root div's `style` prop
// so the space bg fills the viewport underneath the layers above.
export const SPACE_BG_STYLE = {
  background:
    'radial-gradient(ellipse at 50% 0%, #1B2554 0%, #0A1030 55%, #050816 100%)',
};
