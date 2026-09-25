// Loops a saved Beat Lab pattern through useAudio so kids can jam over it.
import { useCallback, useEffect, useRef, useState } from 'react';

export default function useBeatLoopPlayer({ playBellNote, playDrumSound, initAudioContext }) {
  const [playingId, setPlayingId] = useState(null);
  const intervalRef = useRef(null);

  const stop = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
    setPlayingId(null);
  }, []);

  const start = useCallback((beat) => {
    stop();
    if (!beat || !beat.tracks?.length) return;
    initAudioContext();
    const playStep = (step) => {
      beat.tracks.forEach((t) => {
        if (!t.steps[step]) return;
        if (t.type === 'bell') playBellNote(t.note);
        else playDrumSound(t.note);
      });
    };
    let step = 0;
    playStep(0);
    intervalRef.current = setInterval(() => {
      step = (step + 1) % beat.totalSteps;
      playStep(step);
    }, (60 / beat.bpm / 4) * 1000);
    setPlayingId(beat.id);
  }, [stop, initAudioContext, playBellNote, playDrumSound]);

  useEffect(() => stop, [stop]);

  return { start, stop, playingId };
}
