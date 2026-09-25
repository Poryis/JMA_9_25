// useAudioUnlock — manages a one-time-per-session "audio unlock" gate.
//
// iOS Safari (and Chrome/Firefox to a lesser degree) require a user gesture
// before any AudioContext can play sound. Our pages each create their own
// context lazily on the first interaction, but a kid landing on a page may
// tap a bell as their FIRST gesture and hear silence because:
//   1. The AudioContext is created (suspended state)
//   2. playBellNote is called immediately
//   3. The .resume() promise hasn't completed yet
//   4. The audio buffer never plays
//
// This hook + the AudioUnlockOverlay solve it by intercepting the very first
// gesture at the document level, creating a throwaway AudioContext, resuming
// it, and playing a silent buffer. After that any subsequent AudioContext
// created by useAudio.js starts in 'running' state on the same tab.
//
// SECOND JOB — iOS Ring/Silent switch bypass:
// By default iOS Safari respects the physical mute switch for Web Audio,
// which means kids with their ringer OFF hear nothing. To bypass this we
// start a background HTMLAudioElement playing silent audio in a loop as
// soon as the user gestures. iOS then elevates the tab's audio session to
// AVAudioSessionCategoryPlayback (which ignores the mute switch), and any
// Web Audio output plays regardless of the physical switch position.
//
// Persistence: sessionStorage (not localStorage). Each new tab/session shows
// the overlay once because iOS audio context state doesn't survive a tab close.

import { useCallback, useEffect, useState } from 'react';

const SESSION_KEY = 'jma_audio_unlocked_v1';

function alreadyUnlocked() {
  try { return sessionStorage.getItem(SESSION_KEY) === '1'; } catch { return false; }
}

function markUnlocked() {
  try { sessionStorage.setItem(SESSION_KEY, '1'); } catch { /* ignore */ }
}

// Module-level reference to the silent-audio "session keeper" element. Held
// here so it survives StrictMode double-mounts and route changes without
// getting garbage-collected. This is what makes iOS treat the tab as
// "media playing" and (crucially) makes Web Audio ignore the physical
// Ring/Silent switch on iPhones — otherwise kids have to flip their ringer
// on for the app to make any sound.
let silenceAudioEl = null;
function startSilentAudioLoop() {
  if (silenceAudioEl) return;
  try {
    const el = document.createElement('audio');
    el.src = 'assets/audio/silence.wav';
    el.loop = true;
    el.setAttribute('playsinline', '');
    el.setAttribute('webkit-playsinline', '');
    el.muted = false;   // MUST be unmuted for iOS to elevate the audio session
    el.volume = 0.001;  // effectively inaudible; volume 0 does NOT elevate the session on iOS
    el.preload = 'auto';
    el.style.position = 'absolute';
    el.style.left = '-9999px';
    el.style.width = '0';
    el.style.height = '0';
    document.body.appendChild(el);
    const p = el.play();
    if (p && typeof p.catch === 'function') p.catch(() => { /* autoplay policy — will retry on next gesture */ });
    silenceAudioEl = el;
  } catch (_) {
    /* not fatal — user can still hear audio if their ringer is on */
  }
}

// Performs the iOS audio-unlock dance: create a context, resume it, play a
// silent buffer to fully wake the audio subsystem. We close the context
// afterward because each tab is capped (~6 in Chrome) at simultaneous
// AudioContext instances. ALSO starts the silent-audio loop for the
// ring/silent switch bypass.
async function performUnlock() {
  startSilentAudioLoop();

  let ctx = null;
  try {
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return false;
    ctx = new Ctor();
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }
    const buffer = ctx.createBuffer(1, 1, 22050);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    if (source.start) source.start(0);
    else if (source.noteOn) source.noteOn(0);
    return true;
  } catch (_) {
    return false;
  } finally {
    if (ctx) {
      setTimeout(() => { try { ctx.close(); } catch (_) { /* ignore */ } }, 200);
    }
  }
}

export default function useAudioUnlock() {
  const [needsUnlock, setNeedsUnlock] = useState(() => !alreadyUnlocked());

  const unlock = useCallback(async () => {
    await performUnlock();
    markUnlocked();
    setNeedsUnlock(false);
  }, []);

  // Also auto-dismiss if ANY page-wide gesture happens — e.g. the kid taps a
  // bell directly without going through the overlay. Their first gesture will
  // unlock audio at the system level anyway; we just need to hide our UI and
  // kick the silent-audio loop so the ring-off bypass takes hold.
  useEffect(() => {
    if (!needsUnlock) return;
    const handler = () => {
      startSilentAudioLoop();
      markUnlocked();
      setNeedsUnlock(false);
    };
    document.addEventListener('pointerdown', handler, { once: true, capture: true });
    return () => document.removeEventListener('pointerdown', handler, { capture: true });
  }, [needsUnlock]);

  // If the session was already unlocked in a previous route (e.g. SPA nav or
  // refresh), the silent-audio loop may not be running on this mount. Prime
  // it on the next pointerdown so returning users also get the ringer-off
  // bypass.
  useEffect(() => {
    if (needsUnlock || silenceAudioEl) return;
    const primer = () => startSilentAudioLoop();
    document.addEventListener('pointerdown', primer, { once: true, capture: true });
    return () => document.removeEventListener('pointerdown', primer, { capture: true });
  }, [needsUnlock]);

  return { needsUnlock, unlock };
}
