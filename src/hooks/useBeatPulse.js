// useBeatPulse — drives beat-synced visual effects from the Web Audio
// clock exposed by `useRobotBoogieAudio.getAudioClock`.
//
// Instead of setState-ing on every RAF (which would rerender the entire
// Robot Boogie tree at 60 fps), the hook writes the current beat phase
// into a shared ref. Consumers register imperative subscribers via
// `subscribe(cb)` that get called every frame with
//   { beat, phase, beatFrac, pulse }
//   • beat      : integer beat index (0-based, monotonically increasing)
//   • phase     : 0..1 progress within the current beat
//   • beatFrac  : 0..1 progress within the current LOOP (whole-song bar)
//   • pulse     : 0..1 easing that spikes to 1 on the downbeat and falls
//
// Loop authoring: the Robot Boogie stems are 8 s at ~120 BPM which
// means 16 beats per loop (4 bars × 4/4). Earlier versions used 8 and
// visibly pulsed on the "and of 1" — off-beat, which the user caught.
// A `phaseOffset` accepted at call-time lets us shift what counts as
// the downbeat without redeploying, so we can offer a "downbeat vs
// off-beat" toggle in the UI without touching this file.

import { useEffect, useRef } from 'react';

const BEATS_PER_LOOP = 16;

// phaseOffset: [0..1) fraction of a beat to subtract from the audio
// clock before deriving beat/phase/pulse. Use 0 for downbeat, 0.5 for
// the "and", etc.
export default function useBeatPulse(getAudioClock, phaseOffset = 0) {
  // Ref-based subscription registry. Zero rerenders per frame.
  const subsRef = useRef(new Set());
  const rafRef = useRef(0);
  const lastBeatRef = useRef(-1);
  // Keep phaseOffset in a ref so we can tweak it from the outside
  // without re-running the RAF loop or dropping subscribers.
  const offsetRef = useRef(phaseOffset);
  useEffect(() => { offsetRef.current = phaseOffset; }, [phaseOffset]);

  useEffect(() => {
    let mounted = true;

    const tick = () => {
      if (!mounted) return;
      const clock = getAudioClock ? getAudioClock() : null;
      if (clock) {
        const { audioTime, startTime, loopDuration } = clock;
        const beatDuration = loopDuration / BEATS_PER_LOOP;
        const elapsed = Math.max(0, audioTime - startTime) - offsetRef.current * beatDuration;
        const beat = Math.floor(elapsed / beatDuration);
        const phase = ((elapsed / beatDuration) % 1 + 1) % 1; // 0..1
        const beatFrac = ((elapsed % loopDuration) / loopDuration + 1) % 1;
        // Downbeat spike: 1 at phase 0, easing out to 0 by phase ~0.35.
        const pulse = phase < 0.35 ? Math.pow(1 - phase / 0.35, 2) : 0;

        const payload = { beat, phase, beatFrac, pulse };
        subsRef.current.forEach((cb) => {
          try { cb(payload); } catch (_) { /* ignore consumer errors */ }
        });
        lastBeatRef.current = beat;
      } else {
        // Silent — send a "resting" payload so subscribers can revert.
        const payload = { beat: -1, phase: 0, beatFrac: 0, pulse: 0 };
        subsRef.current.forEach((cb) => {
          try { cb(payload); } catch (_) { /* ignore */ }
        });
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      mounted = false;
      cancelAnimationFrame(rafRef.current);
    };
  }, [getAudioClock]);

  return {
    subscribe: (cb) => {
      subsRef.current.add(cb);
      return () => subsRef.current.delete(cb);
    },
  };
}
