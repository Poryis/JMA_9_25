// JMAtv channel page — episode grid for a single channel.
//
// Each episode card shows the auto-pulled Vimeo poster thumbnail (via
// vumbnail.com which fetches the Vimeo thumbnail without an API key) and
// the episode title. Tap → /jmatv/:channelId/:index for the player.
//
// Locked channels (comingSoon=true) get redirected to the JMAtv home
// because their episode list is empty.

import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Play } from 'lucide-react';
import { GameHeader } from '../components/GameUI';
import SpaceBackdrop, { SPACE_BG_STYLE } from '../components/SpaceBackdrop';
import { getChannel } from '../data/jmatv';

function EpisodeCard({ episode, index, channel, onClick }) {
  // Vumbnail returns the Vimeo poster JPEG given just the numeric ID.
  // No CORS, no API key — perfect for static hosting.
  const poster = `https://vumbnail.com/${episode.vimeoId}.jpg`;
  return (
    <motion.button
      type="button"
      data-testid={`jmatv-episode-${channel.id}-${index}`}
      onClick={onClick}
      initial={{ y: 24, opacity: 0, scale: 0.95 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      transition={{ delay: 0.06 * index, type: 'spring', stiffness: 240 }}
      whileHover={{ y: -3, scale: 1.03 }}
      whileTap={{ scale: 0.96 }}
      className="relative rounded-2xl bg-transparent border-0 p-0 cursor-pointer text-left w-full"
    >
      <div
        className="relative rounded-2xl overflow-hidden"
        style={{
          border: '4px solid #0A2540',
          boxShadow: `0 8px 0 0 ${channel.accent}, 0 10px 0 0 #0A2540`,
          aspectRatio: '16 / 9',
          background: '#000',
        }}
      >
        <img
          src={poster}
          alt={episode.title}
          draggable={false}
          loading="lazy"
          className="absolute inset-0 w-full h-full object-cover"
          onError={(e) => {
            // Vimeo's vumbnail can lag for brand-new videos. Hide the broken
            // image and fall back to a solid channel-colored card.
            e.target.style.display = 'none';
          }}
        />
        {/* Channel-color overlay tint */}
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{ background: `linear-gradient(180deg, transparent 40%, ${channel.accent}E6 100%)` }}
        />
        {/* Big play icon */}
        <div
          aria-hidden="true"
          className="absolute inset-0 flex items-center justify-center"
        >
          <div
            className="rounded-full flex items-center justify-center"
            style={{
              width: 'clamp(48px, 8vw, 72px)',
              height: 'clamp(48px, 8vw, 72px)',
              backgroundColor: 'rgba(255,255,255,0.92)',
              boxShadow: '0 4px 0 0 rgba(0,0,0,0.4)',
              color: channel.accent,
            }}
          >
            <Play className="w-6 h-6 md:w-9 md:h-9" fill="currentColor" style={{ marginLeft: 3 }} />
          </div>
        </div>
        {/* Title bar */}
        <div className="absolute bottom-0 left-0 right-0 px-2.5 py-1.5">
          <h3
            className="font-black font-display leading-tight text-sm md:text-base text-white"
          >
            {episode.title}
          </h3>
        </div>
      </div>
    </motion.button>
  );
}

export default function JMAtvChannelPage() {
  const navigate = useNavigate();
  const { channelId } = useParams();
  const channel = getChannel(channelId);

  if (!channel) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white px-6 text-center">
        <div>
          <h1 className="text-2xl font-black mb-3">Not found</h1>
          <button
            data-testid="jmatv-channel-notfound-back"
            className="mt-2 px-4 py-2 rounded-full bg-yellow-400 text-gray-900 font-black"
            onClick={() => navigate('/jmatv')}
          >
            Back to JMAtv
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      data-testid={`jmatv-channel-page-${channel.id}`}
      className="min-h-screen flex flex-col items-center px-3 sm:px-6 pt-16 md:pt-20 pb-10 relative overflow-x-hidden"
      style={SPACE_BG_STYLE}
    >
      <SpaceBackdrop />

      <GameHeader showHomeButton={true} backTo="/jmatv" />

      <motion.div
        className="relative z-10 mt-2 mb-5 text-center"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
      >
        <h1
          className="font-black font-display"
          style={{
            fontSize: 'clamp(28px, 4.6vw, 48px)',
            color: 'white',
          }}
        >
          {channel.title}
        </h1>
        <p className="text-sm md:text-base font-bold mt-1" style={{ color: '#FFE7C2' }}>
          {channel.tagline}
        </p>
      </motion.div>

      {channel.episodes.length === 0 ? (
        <motion.div
          data-testid="jmatv-channel-empty"
          className="relative z-10 max-w-md mx-auto text-center bg-white/10 backdrop-blur rounded-2xl px-6 py-8"
          style={{ border: '2px dashed rgba(255,255,255,0.4)' }}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        >
          <h3 className="text-xl md:text-2xl font-black font-display text-white mb-2">
            Coming soon!
          </h3>
          <p className="text-sm font-bold" style={{ color: '#FFE7C2' }}>
            Fresh episodes are on the way. Check the other shows in the meantime.
          </p>
        </motion.div>
      ) : (
        <div className="relative z-10 w-full max-w-5xl grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-5">
          {channel.episodes.map((ep, i) => (
            <EpisodeCard
              key={`${channel.id}-${i}`}
              episode={ep}
              index={i}
              channel={channel}
              onClick={() => navigate(`/jmatv/${channel.id}/${i}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
