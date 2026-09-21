// JMAtv episode player.
//
// Vimeo embed inside a chunky cartoon CRT TV frame (wood veneer, rabbit
// ears, JMAtv channel bug). Plays the picked episode and surfaces an "Up
// Next" carousel of other episodes from the same channel below the screen.
//
// Pulls the same @vimeo/player SDK setup as LessonPlayerPage, minus the
// progression-gating (JMAtv content is freely browseable per the user's
// "just option 4" pick — no earn-to-watch gating).

import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Player from '@vimeo/player';
import { Maximize2, ChevronRight, Volume2 } from 'lucide-react';
import { GameHeader } from '../components/GameUI';
import SpaceBackdrop, { SPACE_BG_STYLE } from '../components/SpaceBackdrop';
import { getChannel, getEpisode } from '../data/jmatv';
import { earnSticker } from '../hooks/useStickers';

export default function JMAtvPlayerPage() {
  const navigate = useNavigate();
  const { channelId, episodeIndex } = useParams();
  const channel = getChannel(channelId);
  const episode = getEpisode(channelId, episodeIndex);

  const iframeRef = useRef(null);
  const playerRef = useRef(null);
  const [loadError, setLoadError] = useState(false);
  // iOS Safari blocks audible autoplay without a user gesture, so we
  // start every episode muted (autoplay=1 + muted=1 works everywhere)
  // and surface a tap-to-unmute overlay when we detect the player is
  // actually muted after mount. One tap flips the mute + kicks play,
  // which counts as the user gesture iOS wants.
  const [needsUnmute, setNeedsUnmute] = useState(false);

  // Sticker hook — kid watches their first JMAtv episode, drop the sticker
  // (defined in data/stickers.js). Falls through silently if the sticker ID
  // doesn't exist so this won't crash existing builds.
  useEffect(() => {
    if (!episode) return;
    try { earnSticker('jmatv-first-watch'); } catch { /* no-op */ }
  }, [episode]);

  const destroyPlayer = useCallback(() => {
    const p = playerRef.current;
    playerRef.current = null;
    if (!p) return;
    try { p.destroy(); } catch { /* ignore */ }
  }, []);

  const initPlayer = useCallback(() => {
    const el = iframeRef.current;
    if (!el || !el.isConnected) return;
    destroyPlayer();
    let player;
    try { player = new Player(el); } catch { return; }
    playerRef.current = player;
    try {
      player.ready()
        .then(async () => {
          // Ask the player whether it's currently muted (iOS Safari
          // almost always is on autoplay). If so, show the overlay.
          try {
            const muted = await player.getMuted();
            setNeedsUnmute(!!muted);
          } catch { /* no-op */ }
        })
        .catch(() => setLoadError(true));
    } catch { /* ignore */ }
  }, [destroyPlayer]);

  const handleUnmute = useCallback(async () => {
    const player = playerRef.current;
    setNeedsUnmute(false);
    if (!player) return;
    try {
      await player.setMuted(false);
      // Some browsers pause on setMuted — kick it back into gear.
      await player.setVolume(1);
      await player.play();
    } catch { /* no-op */ }
  }, []);

  useEffect(() => () => destroyPlayer(), [destroyPlayer]);

  const handleFullscreen = () => {
    const player = playerRef.current;
    const el = iframeRef.current;
    const native = () => {
      if (!el) return;
      const req = el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen;
      if (!req) return;
      try {
        const r = req.call(el);
        if (r && typeof r.catch === 'function') r.catch(() => {});
      } catch { /* ignore */ }
    };
    if (!player) { native(); return; }
    try {
      const r = player.requestFullscreen();
      if (r && typeof r.catch === 'function') r.catch(native);
    } catch { native(); }
  };

  if (!channel || !episode) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white px-6 text-center">
        <div>
          <h1 className="text-2xl font-black mb-3">Episode not found</h1>
          <button
            data-testid="jmatv-episode-notfound-back"
            className="mt-2 px-4 py-2 rounded-full bg-yellow-400 text-gray-900 font-black"
            onClick={() => navigate('/jmatv')}
          >
            Back to JMAtv
          </button>
        </div>
      </div>
    );
  }

  const iframeSrc = `https://player.vimeo.com/video/${episode.vimeoId}?app_id=122963&autoplay=1&muted=1&title=0&byline=0&portrait=0&dnt=1`;
  const otherEpisodes = channel.episodes
    .map((ep, idx) => ({ ...ep, index: idx }))
    .filter((ep) => ep.index !== episode.index);

  return (
    <div
      data-testid={`jmatv-player-page-${channel.id}-${episode.index}`}
      className="min-h-screen flex flex-col items-center px-3 sm:px-6 pt-24 md:pt-28 pb-10 relative overflow-x-hidden"
      style={SPACE_BG_STYLE}
    >
      <SpaceBackdrop />

      <GameHeader showHomeButton={true} backTo={`/jmatv/${channel.id}`} />

      {/* Episode title */}
      <motion.div
        className="relative z-10 w-full max-w-4xl text-center mb-3"
        initial={{ y: -16, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
      >
        <h1
          className="font-black font-display leading-none"
          style={{
            fontSize: 'clamp(20px, 3vw, 32px)',
            color: 'white',
            textShadow: `2px 2px 0 ${channel.accent}, 3px 3px 0 #0A2540`,
          }}
        >
          {episode.title}
        </h1>
      </motion.div>

      {/* CRT-styled player frame — bigger sibling of the home RetroTV. */}
      <motion.div
        data-testid="jmatv-player-frame"
        className="relative z-10 w-full max-w-4xl"
        initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        <div
          className="relative rounded-3xl"
          style={{
            background:
              'repeating-linear-gradient(90deg, #8B5A2B 0px, #8B5A2B 2px, #A0673A 2px, #A0673A 5px), linear-gradient(180deg, #A0673A, #6B4423)',
            backgroundBlendMode: 'multiply',
            border: '6px solid #000',
            boxShadow:
              '0 14px 0 0 #000, inset 0 0 0 4px #3F2A14, inset 0 0 0 7px rgba(255,255,255,0.08)',
            padding: 'clamp(12px, 2vw, 22px)',
          }}
        >
          <div
            className="relative rounded-xl overflow-hidden"
            style={{
              background: '#000',
              border: '4px solid #1F2937',
              boxShadow: 'inset 0 0 18px rgba(0,0,0,0.8)',
              paddingBottom: '56.25%',
              height: 0,
            }}
          >
            <iframe
              key={episode.vimeoId}
              ref={iframeRef}
              title={episode.title}
              src={iframeSrc}
              allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
              onLoad={() => { setLoadError(false); initPlayer(); }}
              style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 0 }}
            />

            {/* JMAtv channel bug top-right of screen */}
            <img
              src="assets/ui/jmatv-logo-v2.png"
              alt=""
              aria-hidden="true"
              draggable={false}
              className="absolute pointer-events-none"
              style={{
                top: 10, right: 10,
                width: 'clamp(40px, 6vw, 64px)',
                opacity: 0.88,
                filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.7))',
                zIndex: 5,
              }}
            />

            {/* Scanlines */}
            <div
              aria-hidden="true"
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  'repeating-linear-gradient(180deg, rgba(0,0,0,0.10) 0px, rgba(0,0,0,0.10) 1px, transparent 1px, transparent 4px)',
                mixBlendMode: 'multiply',
              }}
            />

            {/* Tap-to-unmute overlay — iOS Safari (and desktop Safari
                on strict autoplay policies) mutes autoplayed video by
                default. We start muted so the video actually plays,
                then invite the kid to tap once for sound. */}
            <AnimatePresence>
              {needsUnmute && !loadError && (
                <motion.button
                  key="unmute-overlay"
                  data-testid="jmatv-player-unmute"
                  type="button"
                  onClick={handleUnmute}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer"
                  style={{
                    background:
                      'radial-gradient(ellipse at center, rgba(10,37,64,0.55) 0%, rgba(10,37,64,0.85) 100%)',
                    color: 'white',
                    zIndex: 6,
                    border: 0,
                  }}
                  aria-label="Tap to unmute video"
                >
                  <motion.div
                    initial={{ scale: 0.85, y: 8 }}
                    animate={{ scale: 1, y: 0 }}
                    transition={{ type: 'spring', stiffness: 240, damping: 18 }}
                    className="flex flex-col items-center gap-2 md:gap-3"
                  >
                    <div
                      className="w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center border-4"
                      style={{
                        backgroundColor: '#FFCC00',
                        borderColor: 'white',
                        boxShadow: '0 6px 0 0 rgba(0,0,0,0.5), 0 0 24px rgba(255,204,0,0.55)',
                      }}
                    >
                      <Volume2 className="w-8 h-8 md:w-10 md:h-10" style={{ color: 'var(--jma-dark)' }} />
                    </div>
                    <div
                      className="text-base md:text-xl font-black font-display uppercase tracking-wider"
                      style={{ textShadow: '2px 2px 0 rgba(0,0,0,0.6)' }}
                    >
                      Tap for sound
                    </div>
                  </motion.div>
                </motion.button>
              )}
            </AnimatePresence>

            {loadError && (
              <div
                data-testid="jmatv-player-error"
                className="absolute inset-0 flex flex-col items-center justify-center text-center px-6"
                style={{ backgroundColor: 'rgba(10,37,64,0.96)', color: 'white' }}
              >
                <div className="text-5xl mb-2">📡</div>
                <h3 className="text-xl md:text-2xl font-black font-display mb-1">Hmm, we can&apos;t reach this video</h3>
                <p className="text-sm md:text-base font-bold opacity-90 max-w-md">
                  Check your internet connection and try again.
                </p>
                <button
                  onClick={() => window.location.reload()}
                  className="mt-4 px-4 py-2 rounded-full font-black border-3"
                  style={{
                    backgroundColor: '#FFCC00',
                    color: 'var(--jma-dark)',
                    borderColor: 'white',
                    boxShadow: '0 4px 0 0 rgba(0,0,0,0.4)',
                  }}
                  data-testid="jmatv-player-retry"
                >
                  Try Again
                </button>
              </div>
            )}
          </div>

          {/* TV controls strip */}
          <div className="flex items-center justify-between mt-3 px-1">
            <div
              aria-hidden="true"
              style={{
                width: '40%',
                height: 18,
                borderRadius: 5,
                background:
                  'repeating-linear-gradient(90deg, rgba(0,0,0,0.45) 0 2px, rgba(255,255,255,0.06) 2px 5px)',
                border: '1.5px solid #3F2A14',
              }}
            />
            <span
              className="text-[11px] font-black tracking-[0.18em] uppercase"
              style={{ color: '#FFE7C2', textShadow: '1px 1px 0 #3F2A14' }}
            >
              JMAtv
            </span>
            <div className="flex items-center gap-1.5">
              {[0, 1].map((i) => (
                <div
                  key={i}
                  aria-hidden="true"
                  style={{
                    width: 16, height: 16,
                    borderRadius: '50%',
                    background: 'radial-gradient(circle at 35% 35%, #E5C597, #5A3A1A)',
                    border: '2px solid #3F2A14',
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Action row — fullscreen + back. */}
      <div className="relative z-10 mt-4 flex flex-wrap items-center justify-center gap-3">
        <button
          data-testid="jmatv-player-fullscreen"
          onClick={handleFullscreen}
          className="px-3 py-1.5 rounded-full font-black text-sm border-2 flex items-center gap-1.5"
          style={{
            backgroundColor: '#FFCC00',
            color: 'var(--jma-dark)',
            borderColor: 'var(--jma-dark)',
            boxShadow: '0 3px 0 0 var(--jma-dark)',
          }}
        >
          <Maximize2 className="w-4 h-4" /> Fullscreen
        </button>
      </div>

      {/* Up Next carousel */}
      {otherEpisodes.length > 0 && (
        <div className="relative z-10 mt-8 w-full max-w-4xl">
          <h3
            className="text-sm md:text-base font-black uppercase tracking-[0.18em] mb-3"
            style={{ color: '#FFE7C2' }}
          >
            Up Next on {channel.title}
          </h3>
          <div
            className="jmatv-upnext-scroller flex gap-3 md:gap-4 pb-4"
            style={{
              // overflow-x: scroll (not auto) forces the bar to ALWAYS render
              // even on systems that hide auto scrollbars by default — the
              // custom retro styling below is the whole point so we want it
              // visible all the time.
              overflowX: 'scroll',
              scrollSnapType: 'x mandatory',
              '--jmatv-scroll-accent': channel.accent,
              '--jmatv-scroll-fill': channel.color,
            }}
          >
            {otherEpisodes.map((ep) => {
              const poster = `https://vumbnail.com/${ep.vimeoId}.jpg`;
              return (
                <button
                  key={ep.index}
                  type="button"
                  data-testid={`jmatv-up-next-${ep.index}`}
                  onClick={() => navigate(`/jmatv/${channel.id}/${ep.index}`)}
                  className="relative rounded-xl bg-transparent border-0 p-0 cursor-pointer flex-shrink-0"
                  style={{ width: 'clamp(160px, 22vw, 220px)', scrollSnapAlign: 'start' }}
                >
                  <div
                    className="relative rounded-xl overflow-hidden"
                    style={{
                      border: '3px solid #0A2540',
                      boxShadow: `0 5px 0 0 ${channel.accent}`,
                      aspectRatio: '16 / 9',
                      background: '#000',
                    }}
                  >
                    <img
                      src={poster}
                      alt={ep.title}
                      draggable={false}
                      loading="lazy"
                      className="absolute inset-0 w-full h-full object-cover"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                    <div
                      aria-hidden="true"
                      className="absolute inset-0 pointer-events-none"
                      style={{ background: `linear-gradient(180deg, transparent 50%, ${channel.accent}E0 100%)` }}
                    />
                    <div className="absolute bottom-1 left-0 right-0 px-2 flex items-center justify-between">
                      <span
                        className="font-black font-display text-xs md:text-sm text-white truncate"
                        style={{ textShadow: '1px 1px 0 rgba(0,0,0,0.7)' }}
                      >
                        {ep.title}
                      </span>
                      <ChevronRight className="w-4 h-4 text-white flex-shrink-0" />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Custom retro scrollbar — channel-tinted, chunky, with a soft
              dark track that matches the JMAtv vibe. Firefox uses
              scrollbar-* props; Chromium uses ::-webkit-* pseudo-elements.
              Both branches share the same colors via CSS vars set inline. */}
          <style>{`
            .jmatv-upnext-scroller {
              scrollbar-width: thin;
              scrollbar-color: var(--jmatv-scroll-fill) rgba(255,231,194,0.12);
            }
            .jmatv-upnext-scroller::-webkit-scrollbar {
              height: 12px;
            }
            .jmatv-upnext-scroller::-webkit-scrollbar-track {
              background:
                linear-gradient(180deg, rgba(0,0,0,0.55), rgba(0,0,0,0.3)),
                repeating-linear-gradient(90deg, rgba(255,231,194,0.06) 0 2px, transparent 2px 5px);
              border-radius: 999px;
              border: 1.5px solid rgba(255,231,194,0.18);
            }
            .jmatv-upnext-scroller::-webkit-scrollbar-thumb {
              background:
                linear-gradient(180deg, var(--jmatv-scroll-fill), var(--jmatv-scroll-accent));
              border-radius: 999px;
              border: 2px solid rgba(10,37,64,0.85);
              box-shadow:
                inset 0 1px 0 rgba(255,255,255,0.35),
                inset 0 -2px 0 rgba(0,0,0,0.25);
            }
            .jmatv-upnext-scroller::-webkit-scrollbar-thumb:hover {
              filter: brightness(1.15);
            }
            .jmatv-upnext-scroller::-webkit-scrollbar-thumb:active {
              filter: brightness(0.95);
            }
          `}</style>
        </div>
      )}
    </div>
  );
}
