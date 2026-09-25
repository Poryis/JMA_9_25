// Vimeo lesson player.
// Approach: React owns the iframe lifecycle. We update the iframe `src` when the
// lesson changes; the iframe naturally reloads. After each successful load
// (`onLoad`) we (re-)initialize the @vimeo/player SDK so we can listen for the
// `ended` event and trigger fullscreen.

import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import Player from '@vimeo/player';
import { CheckCircle2, ArrowRight, RotateCcw, Maximize2 } from 'lucide-react';
import { GameHeader } from '../components/GameUI';
import { LESSONS, getLesson } from '../data/lessons';
import { useLessonsProgress } from '../hooks/useLessonsProgress';

export default function LessonPlayerPage() {
  const { num } = useParams();
  const navigate = useNavigate();
  const lesson = getLesson(num);
  const lessonNum = Number(num);
  const { isUnlocked, isWatched, markWatched } = useLessonsProgress();
  const [completed, setCompleted] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const iframeRef = useRef(null);
  const playerRef = useRef(null);

  const allowed = lesson && isUnlocked(lessonNum);

  // Tear down the existing Vimeo Player (if any) safely.
  const destroyPlayer = useCallback(() => {
    const p = playerRef.current;
    playerRef.current = null;
    if (!p) return;
    try { p.destroy(); } catch { /* ignore */ }
  }, []);

  // Initialize the player against the current iframe. Called from onLoad.
  const initPlayer = useCallback(() => {
    const el = iframeRef.current;
    if (!el || !el.isConnected) return;
    destroyPlayer();
    let player;
    try { player = new Player(el); } catch { return; }
    playerRef.current = player;

    const onEnded = () => {
      markWatched(lessonNum);
      setCompleted(true);
    };
    // Trigger early-unlock when ≤ 30s remain so kids don't have to sit through
    // end credits. We capture duration once, then watch currentTime.
    let unlockedEarly = false;
    let trackedDuration = 0;
    const onLoaded = ({ duration } = {}) => {
      if (typeof duration === 'number' && duration > 0) trackedDuration = duration;
    };
    const onTimeUpdate = ({ seconds } = {}) => {
      if (unlockedEarly) return;
      if (!trackedDuration || trackedDuration <= 30) return;
      if (seconds >= trackedDuration - 30) {
        unlockedEarly = true;
        markWatched(lessonNum);
        setCompleted(true);
      }
    };

    try { player.on('ended', onEnded); } catch { /* ignore */ }
    try { player.on('loaded', onLoaded); } catch { /* ignore */ }
    try { player.on('timeupdate', onTimeUpdate); } catch { /* ignore */ }
    try {
      player.getDuration().then((d) => { if (typeof d === 'number' && d > 0) trackedDuration = d; }).catch(() => {});
    } catch { /* ignore */ }
    try {
      player.ready().catch(() => setLoadError(true));
    } catch { /* ignore */ }
  }, [destroyPlayer, lessonNum, markWatched]);

  // Reflect persisted watched state when the lesson changes.
  useEffect(() => {
    setCompleted(allowed && isWatched(lessonNum));
    setLoadError(false);
  }, [allowed, isWatched, lessonNum]);

  // Cleanup on unmount.
  useEffect(() => {
    return destroyPlayer;
  }, [destroyPlayer]);

  // Fullscreen handler — uses the SDK first, then falls back to the iframe's
  // native fullscreen API. All promise rejections are swallowed.
  const handleFullscreen = () => {
    const el = iframeRef.current;

    const tryNative = () => {
      if (!el || !el.isConnected) return;
      const req = el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen;
      if (!req) return;
      try {
        const r = req.call(el);
        if (r && typeof r.catch === 'function') r.catch(() => {});
      } catch { /* ignore */ }
    };

    const player = playerRef.current;
    if (!player) { tryNative(); return; }
    try {
      const r = player.requestFullscreen();
      if (r && typeof r.catch === 'function') r.catch(tryNative);
    } catch {
      tryNative();
    }
  };

  if (!lesson) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white px-6 text-center">
        <div>
          <h1 className="text-2xl font-black mb-3">Lesson not found</h1>
          <button
            className="mt-2 px-4 py-2 rounded-full bg-yellow-400 text-gray-900 font-black"
            onClick={() => navigate('/lessons')}
            data-testid="lesson-not-found-back"
          >
            Back to Lessons
          </button>
        </div>
      </div>
    );
  }

  if (!allowed) {
    return (
      <div
        data-testid="lesson-locked-screen"
        className="min-h-screen flex flex-col items-center justify-center px-6 text-center relative pt-16"
        style={{
          backgroundImage: 'url(assets/backgrounds/chalkboard.png)',
          backgroundSize: 'cover',
        }}
      >
        <GameHeader showHomeButton={true} backLink={{ to: '/lessons', label: 'Lessons' }} />
        <motion.div
          className="bg-white rounded-3xl border-4 p-6 max-w-md w-full"
          style={{ borderColor: 'var(--jma-dark)', boxShadow: '0 8px 0 0 var(--jma-dark)' }}
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
        >
          <h1 className="text-2xl md:text-3xl font-black font-display mb-2" style={{ color: 'var(--jma-dark)' }}>
            🔒 Lesson {lesson.num} is locked
          </h1>
          <p className="text-sm font-bold mb-4" style={{ color: 'var(--jma-dark)' }}>
            Watch Lesson {lesson.num - 1} all the way to the end to unlock this one!
          </p>
          <button
            className="px-5 py-2.5 rounded-full bg-yellow-400 font-black border-3"
            style={{ color: 'var(--jma-dark)', borderColor: 'var(--jma-dark)', boxShadow: '0 4px 0 0 var(--jma-dark)' }}
            onClick={() => navigate('/lessons')}
            data-testid="lesson-locked-back"
          >
            Back to Lessons
          </button>
        </motion.div>
      </div>
    );
  }

  const nextLesson = LESSONS.find((l) => l.num === lessonNum + 1);
  const iframeSrc = `https://player.vimeo.com/video/${lesson.vimeoId}?app_id=122963&title=0&byline=0&portrait=0&dnt=1`;

  return (
    <div
      data-testid="lesson-player-page"
      className="min-h-screen flex flex-col items-center px-3 sm:px-6 pt-16 md:pt-20 pb-8 relative"
      style={{
        backgroundImage: 'url(assets/backgrounds/chalkboard.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <GameHeader showHomeButton={true} backLink={{ to: '/lessons', label: 'Lessons' }} />

      <motion.div
        className="relative z-10 text-center mb-4"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
      >
        <h1
          className="text-3xl md:text-5xl font-black font-display"
        >
          {lesson.title}
        </h1>
        <p
          className="mt-1 text-sm md:text-base font-bold"
        >
          {lesson.subtitle}
        </p>
      </motion.div>

      {/* Vimeo player wrapper using the 56.25% padding-bottom responsive pattern. */}
      <motion.div
        data-testid="lesson-player-frame"
        className="relative z-10 w-full max-w-4xl rounded-2xl border-4 overflow-hidden"
        style={{
          borderColor: 'var(--jma-dark)',
          boxShadow: '0 10px 0 0 var(--jma-dark)',
          backgroundColor: '#000',
        }}
        initial={{ scale: 0.96, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0 }}>
          <iframe
            key={lesson.vimeoId}
            ref={iframeRef}
            title={lesson.title}
            src={iframeSrc}
            allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
            onLoad={() => { setLoadError(false); initPlayer(); }}
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 0 }}
          />

          {loadError && (
            <div
              data-testid="lesson-load-error"
              className="absolute inset-0 flex flex-col items-center justify-center text-center px-6"
              style={{ backgroundColor: 'rgba(10,37,64,0.96)', color: 'white' }}
            >
              <div className="text-5xl mb-2">📡</div>
              <h3 className="text-xl md:text-2xl font-black font-display mb-1">Hmm, we can't reach this video</h3>
              <p className="text-sm md:text-base font-bold opacity-90 max-w-md">
                Check your internet connection and try again.
              </p>
              <button
                onClick={() => { setLoadError(false); window.location.reload(); }}
                className="mt-4 px-4 py-2 rounded-full font-black border-3"
                style={{
                  backgroundColor: '#FFCC00',
                  color: 'var(--jma-dark)',
                  borderColor: 'white',
                  boxShadow: '0 4px 0 0 rgba(0,0,0,0.4)',
                }}
                data-testid="lesson-retry-btn"
              >
                Try Again
              </button>
            </div>
          )}
        </div>
      </motion.div>

      {completed && (
        <motion.div
          data-testid="lesson-completed-banner"
          className="relative z-10 mt-5 w-full max-w-2xl bg-white rounded-2xl border-4 p-4 flex flex-col sm:flex-row items-center justify-between gap-3"
          style={{ borderColor: 'var(--jma-dark)', boxShadow: '0 6px 0 0 var(--jma-dark)' }}
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-6 h-6" style={{ color: '#34A853' }} />
            <span className="font-black text-base md:text-lg" style={{ color: 'var(--jma-dark)' }}>
              {nextLesson ? `Great job! Lesson ${nextLesson.num} is unlocked!` : 'You finished every lesson! 🎉'}
            </span>
          </div>
          {nextLesson ? (
            <button
              data-testid="lesson-next-btn"
              onClick={() => navigate(`/lessons/${nextLesson.num}`)}
              className="px-4 py-2 rounded-full font-black border-3 flex items-center gap-1.5"
              style={{
                backgroundColor: '#FFCC00',
                color: 'var(--jma-dark)',
                borderColor: 'var(--jma-dark)',
                boxShadow: '0 4px 0 0 var(--jma-dark)',
              }}
            >
              Next Lesson <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              data-testid="lesson-finish-btn"
              onClick={() => navigate('/lessons')}
              className="px-4 py-2 rounded-full font-black border-3"
              style={{
                backgroundColor: '#34A853',
                color: 'white',
                borderColor: 'var(--jma-dark)',
                boxShadow: '0 4px 0 0 var(--jma-dark)',
              }}
            >
              Back to Lessons
            </button>
          )}
        </motion.div>
      )}

      <div className="relative z-10 mt-4 flex flex-wrap items-center justify-center gap-3">
        <button
          data-testid="lesson-back-btn"
          onClick={() => navigate('/lessons')}
          className="px-3 py-1.5 rounded-full font-bold text-sm border-2"
          style={{ backgroundColor: 'white', color: 'var(--jma-dark)', borderColor: 'var(--jma-dark)' }}
        >
          ← All Lessons
        </button>
        <button
          data-testid="lesson-fullscreen-btn"
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
        {!completed && (
          <span
            className="text-xs md:text-sm font-bold flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Finish the video to unlock the next lesson
          </span>
        )}
      </div>
    </div>
  );
}
