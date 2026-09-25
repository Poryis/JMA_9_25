// JMAtv home — the channel guide.
//
// Every channel tile IS a fully-rendered retro CRT TV. Each set is
// unique — different frame material, antenna, and knob color — so
// kids tell shows apart at a glance like a rack of arcade cabinets.
// A brass nameplate hangs under each TV with the title + episode
// chip. The outer-space backdrop (nebula, stars, orbiting-moon
// planet, drifting satellite) is shared with every other JMAtv page
// via <SpaceBackdrop />.

import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { GameHeader } from '../components/GameUI';
import MiniCRT from '../components/MiniCRT';
import SpaceBackdrop, { SPACE_BG_STYLE } from '../components/SpaceBackdrop';
import { JMATV_CHANNELS } from '../data/jmatv';

const JMA_DARK = '#0A2540';

// -------- Per-channel CRT theming ----------------------------------
const CRT_STYLES = {
  'fun-facts': {
    frame: 'wood',
    accent: '#FFCC00',
    knobColor: '#FF9500',
    antenna: 'curly',
  },
  'puns-finn-danger': {
    frame: 'metal',
    accent: '#00A8E8',
    knobColor: '#4285F4',
    antenna: 'ball-tips',
  },
  'jma-music-videos': {
    frame: 'painted-red',
    accent: '#FF3B30',
    knobColor: '#FFCC00',
    antenna: 'coathanger',
  },
  'variety-show': {
    frame: 'purple-sparkle',
    accent: '#AF52DE',
    knobColor: '#FFCC00',
    antenna: 'rabbit-ears',
    staticNoise: true,
  },
};

const LESSONS_STYLE = {
  frame: 'chalkboard',
  accent: '#FFE7C2',
  knobColor: '#8B5A2B',
  antenna: 'wobble-ears',
};

// -------- Nameplate --------------------------------------------------
function Nameplate({ title, chip, chipColor }) {
  return (
    <div
      className="relative w-full mt-3 flex flex-col items-center text-center"
      style={{ zIndex: 2 }}
    >
      <div
        className="relative rounded-xl px-3 py-2 w-full max-w-[260px]"
        style={{
          background: 'linear-gradient(180deg, #FFE7A8 0%, #E9B84F 100%)',
          border: `3px solid ${JMA_DARK}`,
          boxShadow: `0 4px 0 0 ${JMA_DARK}`,
        }}
      >
        <h2
          className="font-black font-display uppercase leading-[0.95]"
          style={{
            fontSize: 'clamp(15px, 2vw, 20px)',
            color: JMA_DARK,
            letterSpacing: '0.02em',
          }}
        >
          {title}
        </h2>
        {chip && (
          <span
            className="inline-block mt-1.5 rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wider"
            style={{
              backgroundColor: chipColor,
              color: '#FFFFFF',
              border: `2px solid ${JMA_DARK}`,
            }}
          >
            {chip}
          </span>
        )}
      </div>
    </div>
  );
}

// -------- Channel tile -----------------------------------------------
function ChannelTile({ channel, index, onClick }) {
  const epCount = channel.episodes.length;
  const isLocked = channel.comingSoon || epCount === 0;
  const previewId = !isLocked ? channel.episodes[0].vimeoId : null;
  const style = CRT_STYLES[channel.id] || { frame: 'wood', accent: '#FFCC00', antenna: 'rabbit-ears' };

  return (
    <motion.button
      type="button"
      data-testid={`jmatv-channel-${channel.id}`}
      onClick={onClick}
      disabled={isLocked}
      initial={{ y: 30, opacity: 0, scale: 0.95 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      transition={{ delay: 0.1 * index, type: 'spring', stiffness: 220 }}
      whileHover={isLocked ? undefined : { y: -6, scale: 1.03 }}
      whileTap={isLocked ? undefined : { scale: 0.97 }}
      className={`relative bg-transparent border-0 p-0 w-full flex flex-col items-center ${isLocked ? 'cursor-not-allowed opacity-90' : 'cursor-pointer'}`}
    >
      <div className="w-full max-w-[280px] mx-auto pt-6">
        <MiniCRT
          vimeoId={previewId}
          fallbackLabel={isLocked ? 'Off Air' : null}
          theme={{ frame: style.frame, accent: style.accent, knobColor: style.knobColor }}
          antenna={style.antenna}
          staticNoise={style.staticNoise && !previewId}
        />
      </div>
      <Nameplate
        title={channel.title}
        chip={isLocked ? 'Coming Soon' : `${epCount} episode${epCount === 1 ? '' : 's'}`}
        chipColor={isLocked ? '#6B7280' : style.accent}
      />
    </motion.button>
  );
}

function LessonsTile({ index, onClick }) {
  return (
    <motion.button
      type="button"
      data-testid="jmatv-channel-lessons"
      onClick={onClick}
      initial={{ y: 30, opacity: 0, scale: 0.95 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      transition={{ delay: 0.1 * index, type: 'spring', stiffness: 220 }}
      whileHover={{ y: -6, scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      className="relative bg-transparent border-0 p-0 w-full flex flex-col items-center cursor-pointer"
    >
      <div className="w-full max-w-[280px] mx-auto pt-6">
        <MiniCRT
          vimeoId={null}
          fallbackLabel="Class in Session"
          theme={{ frame: LESSONS_STYLE.frame, accent: LESSONS_STYLE.accent, knobColor: LESSONS_STYLE.knobColor }}
          antenna={LESSONS_STYLE.antenna}
        />
      </div>
      <Nameplate title="MUSIC LESSONS" chip="Music 101" chipColor="#34A853" />
    </motion.button>
  );
}

export default function JMAtvHomePage() {
  const navigate = useNavigate();
  return (
    <div
      data-testid="jmatv-home"
      className="min-h-screen flex flex-col items-center px-3 sm:px-6 pt-16 md:pt-20 pb-10 relative overflow-x-hidden"
      style={SPACE_BG_STYLE}
    >
      <SpaceBackdrop />

      <GameHeader showHomeButton={true} backTo="/" />

      <motion.div
        className="relative z-10 mt-2 mb-6 md:mb-8 text-center"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
      >
        <div
          className="relative mx-auto"
          style={{ width: 'clamp(160px, 24vw, 280px)', aspectRatio: '1361 / 1156' }}
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
        <p className="text-sm md:text-base font-bold mt-2" style={{ color: '#FFE7C2' }}>
          Pick something. Hit play. Hang out.
        </p>
      </motion.div>

      {/* Olympic-rings layout on desktop: 6-col grid where each tile
          spans 2 cols. Top row fills cols 1-2 / 3-4 / 5-6. Bottom row
          is offset to cols 2-3 / 4-5 so it centers under the top row
          while every TV stays the same size. Falls back to a normal
          1/2-col stack on smaller screens.

          Tile order: [Music Videos, Music Lessons, Puns w/ Finn]
          across the top; [Fun Facts, Variety Show] centered below.
          Lessons is a special outbound tile (jumps to /lessons), the
          rest are JMATV_CHANNELS in their data-file order. */}
      <div className="relative z-10 w-full max-w-5xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-14 sm:gap-10 md:gap-8">
        {/* Top row: music vids, LESSONS, puns */}
        <div className="lg:col-span-2 lg:col-start-1">
          <ChannelTile
            channel={JMATV_CHANNELS[0]}
            index={0}
            onClick={() => navigate(`/jmatv/${JMATV_CHANNELS[0].id}`)}
          />
        </div>
        <div className="lg:col-span-2 lg:col-start-3">
          <LessonsTile index={1} onClick={() => navigate('/lessons')} />
        </div>
        <div className="lg:col-span-2 lg:col-start-5">
          <ChannelTile
            channel={JMATV_CHANNELS[1]}
            index={2}
            onClick={() => navigate(`/jmatv/${JMATV_CHANNELS[1].id}`)}
          />
        </div>
        {/* Bottom row: fun facts, variety show (centered) */}
        {JMATV_CHANNELS.slice(2).map((ch, i) => (
          <div key={ch.id} className={`lg:col-span-2 ${i === 0 ? 'lg:col-start-2' : 'lg:col-start-4'}`}>
            <ChannelTile
              channel={ch}
              index={3 + i}
              onClick={() => navigate(`/jmatv/${ch.id}`)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
