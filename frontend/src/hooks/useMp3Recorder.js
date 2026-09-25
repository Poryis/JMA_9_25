// useMp3Recorder: capture audio from a Web Audio graph node and produce an MP3.
//
// Flow:
//   1. Tap a node (typically the master gain) into a MediaStreamDestinationNode
//   2. Use MediaRecorder to capture into a Blob (browser-native, usually webm/opus)
//   3. On stop: decode the captured Blob into PCM via the same AudioContext
//   4. Pipe PCM into @breezystack/lamejs to encode an MP3 Blob
//   5. Trigger a download
//
// Pure browser/JS - no server, no native deps. Works on GitHub Pages.

import { useCallback, useRef, useState } from 'react';
import lamejs from '@breezystack/lamejs';

const MIME_CANDIDATES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/ogg;codecs=opus',
  'audio/mp4',
];

function pickSupportedMime() {
  if (typeof window === 'undefined' || !window.MediaRecorder) return null;
  for (const m of MIME_CANDIDATES) {
    try { if (MediaRecorder.isTypeSupported(m)) return m; } catch (_) {}
  }
  return '';
}

// Encode an AudioBuffer to MP3 Blob via lamejs.
function audioBufferToMp3(audioBuffer) {
  const sampleRate = audioBuffer.sampleRate;
  const channels = Math.min(2, audioBuffer.numberOfChannels);
  const kbps = 128;
  const encoder = new lamejs.Mp3Encoder(channels, sampleRate, kbps);

  // Convert Float32 [-1,1] → Int16 PCM
  const toInt16 = (f32) => {
    const out = new Int16Array(f32.length);
    for (let i = 0; i < f32.length; i++) {
      let s = Math.max(-1, Math.min(1, f32[i]));
      out[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    return out;
  };

  const left = toInt16(audioBuffer.getChannelData(0));
  const right = channels === 2 ? toInt16(audioBuffer.getChannelData(1)) : null;

  const blockSize = 1152; // standard MP3 frame size
  const mp3Chunks = [];
  for (let i = 0; i < left.length; i += blockSize) {
    const leftChunk = left.subarray(i, i + blockSize);
    const rightChunk = right ? right.subarray(i, i + blockSize) : null;
    const mp3buf = right
      ? encoder.encodeBuffer(leftChunk, rightChunk)
      : encoder.encodeBuffer(leftChunk);
    if (mp3buf.length > 0) mp3Chunks.push(mp3buf);
  }
  const tail = encoder.flush();
  if (tail.length > 0) mp3Chunks.push(tail);

  return new Blob(mp3Chunks, { type: 'audio/mp3' });
}

/**
 * Hook returning recorder controls for an existing audio graph.
 * Pass `getAudioGraph()` from useAudio to get { ctx, masterNode }.
 *
 * Recording auto-stops at MAX_RECORDING_SECONDS (default 60s) to keep file
 * sizes reasonable - especially important for younger kids who might press
 * Record and walk away.
 */
const MAX_RECORDING_SECONDS = 60;

export default function useMp3Recorder(getAudioGraph) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastMp3Url, setLastMp3Url] = useState(null);
  const [secondsLeft, setSecondsLeft] = useState(MAX_RECORDING_SECONDS);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const destRef = useRef(null);
  const mimeRef = useRef('');
  const tickerRef = useRef(null);
  const autoStopRef = useRef(null);

  const start = useCallback(() => {
    const { ctx, masterNode } = getAudioGraph();
    if (!ctx || !masterNode) return;
    if (recorderRef.current) return; // already recording

    // Clean up previous URL
    setLastMp3Url((prev) => { if (prev) URL.revokeObjectURL(prev); return null; });

    // Tap master into a MediaStream destination
    const dest = ctx.createMediaStreamDestination();
    masterNode.connect(dest);
    destRef.current = dest;

    const mime = pickSupportedMime();
    mimeRef.current = mime || '';
    const mr = mime ? new MediaRecorder(dest.stream, { mimeType: mime }) : new MediaRecorder(dest.stream);
    chunksRef.current = [];
    mr.ondataavailable = (e) => { if (e.data && e.data.size > 0) chunksRef.current.push(e.data); };
    mr.start(250);
    recorderRef.current = mr;
    setIsRecording(true);
    setSecondsLeft(MAX_RECORDING_SECONDS);

    // Visual countdown
    tickerRef.current = setInterval(() => {
      setSecondsLeft(prev => Math.max(0, prev - 1));
    }, 1000);
    // Auto-stop at the cap
    autoStopRef.current = setTimeout(() => {
      stop();
    }, MAX_RECORDING_SECONDS * 1000);
  }, [getAudioGraph]); // eslint-disable-line react-hooks/exhaustive-deps

  const stop = useCallback(async () => {
    const mr = recorderRef.current;
    const dest = destRef.current;
    if (!mr) return null;
    if (tickerRef.current) { clearInterval(tickerRef.current); tickerRef.current = null; }
    if (autoStopRef.current) { clearTimeout(autoStopRef.current); autoStopRef.current = null; }
    setIsRecording(false);
    setIsProcessing(true);

    const stopped = new Promise((resolve) => { mr.onstop = () => resolve(); });
    try { mr.stop(); } catch (_) {}
    await stopped;

    // Disconnect tap
    try { const { masterNode } = getAudioGraph(); masterNode?.disconnect(dest); } catch (_) {}
    recorderRef.current = null;
    destRef.current = null;

    try {
      const blob = new Blob(chunksRef.current, { type: mimeRef.current || 'audio/webm' });
      const arrayBuffer = await blob.arrayBuffer();
      const { ctx } = getAudioGraph();
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
      const mp3Blob = audioBufferToMp3(audioBuffer);
      const url = URL.createObjectURL(mp3Blob);
      setLastMp3Url(url);
      return { url, blob: mp3Blob };
    } catch (err) {
      console.warn('MP3 encode failed:', err);
      return null;
    } finally {
      setIsProcessing(false);
    }
  }, [getAudioGraph]);

  const download = useCallback((filename = 'jelly-jam-recording.mp3') => {
    if (!lastMp3Url) return;
    const a = document.createElement('a');
    a.href = lastMp3Url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }, [lastMp3Url]);

  const clear = useCallback(() => {
    setLastMp3Url((prev) => { if (prev) URL.revokeObjectURL(prev); return null; });
  }, []);

  return { isRecording, isProcessing, lastMp3Url, secondsLeft, maxSeconds: MAX_RECORDING_SECONDS, start, stop, download, clear };
}
