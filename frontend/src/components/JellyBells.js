import { useCallback, useEffect, useImperativeHandle, useRef, forwardRef } from 'react';
import useNoteNames from '../hooks/useNoteNames';

export const BELLS = [
  { note: 'C', solfege: 'Do', color: '#FF3B30', image1: 'assets/bells/C 1.png', image2: 'assets/bells/C 2.png', key: '1' },
  { note: 'D', solfege: 'Re', color: '#FF9500', image1: 'assets/bells/D 1.png', image2: 'assets/bells/D 2.png', key: '2' },
  { note: 'E', solfege: 'Mi', color: '#FFCC00', image1: 'assets/bells/E 1.png', image2: 'assets/bells/E 2.png', key: '3' },
  { note: 'F', solfege: 'Fa', color: '#4CD964', image1: 'assets/bells/F 1.png', image2: 'assets/bells/F 2.png', key: '4' },
  { note: 'G', solfege: 'So', color: '#34A853', image1: 'assets/bells/G 1.png', image2: 'assets/bells/G 2.png', key: '5' },
  { note: 'A', solfege: 'La', color: '#4285F4', image1: 'assets/bells/A 1.png', image2: 'assets/bells/A 2.png', key: '6' },
  { note: 'B', solfege: 'Ti', color: '#AF52DE', image1: 'assets/bells/B 1.png', image2: 'assets/bells/B 2.png', key: '7' },
  { note: 'High C', solfege: 'Do', color: '#FF2D55', image1: 'assets/bells/C 1.png', image2: 'assets/bells/C 2.png', key: '8' }
];

const KEY_TO_NOTE = {
  '1': 'C', '2': 'D', '3': 'E', '4': 'F',
  '5': 'G', '6': 'A', '7': 'B', '8': 'High C'
};

// IMPORTANT: All visual swaps use imperative DOM writes (imgRef.current.src = ...).
// Image JSX src prop is CONSTANT (bell.image1) so React never overrides our imperative changes.
// Dual-frame approach: both idle and pressed frames rendered; toggled via opacity + display.
// pointer capture prevents spurious pointerleave from breaking the swap.
function BellItem({ bell, onPlayNote, onNoteUp, highlightedNote, showNotation, registerRef }) {
  const { nameFor, mode: nameMode } = useNoteNames();
  const idleRef = useRef(null);
  const pressedRef = useRef(null);

  useEffect(() => {
    if (registerRef) registerRef(bell.note, { idleRef, pressedRef });
    return () => { if (registerRef) registerRef(bell.note, null); };
  }, [bell.note, registerRef]);

  const pressDown = useCallback((e) => {
    if (e && e.preventDefault) e.preventDefault();
    try { e.target.setPointerCapture(e.pointerId); } catch (_) {}
    if (idleRef.current) idleRef.current.style.opacity = '0';
    if (pressedRef.current) {
      pressedRef.current.style.display = 'block';
      pressedRef.current.style.transform = 'scale(0.95)';
    }
    onPlayNote(bell.note);
  }, [bell, onPlayNote]);

  const pressUp = useCallback(() => {
    if (pressedRef.current) {
      pressedRef.current.style.display = '';
      pressedRef.current.style.transform = '';
    }
    if (idleRef.current) idleRef.current.style.opacity = '';
    if (onNoteUp) onNoteUp(bell.note);
  }, [bell, onNoteUp]);

  return (
    <div className="bell-container flex flex-col items-center">
      <div
        data-testid={`bell-${bell.note.replace(' ', '-')}`}
        data-note={bell.note}
        className={`bell-instrument relative cursor-pointer select-none ${highlightedNote === bell.note ? 'bell-highlight' : ''}`}
        onPointerDown={pressDown}
        onPointerUp={pressUp}
        onPointerLeave={pressUp}
        onPointerCancel={pressUp}
        style={{ touchAction: 'none' }}
      >
        <img
          ref={idleRef}
          src={bell.image1}
          alt={`${bell.solfege} bell`}
          className="instrument-frame-idle w-24 h-28 md:w-32 md:h-36 object-contain pointer-events-none"
          draggable={false}
        />
        <img
          ref={pressedRef}
          src={bell.image2}
          alt=""
          aria-hidden="true"
          className="instrument-frame-pressed w-24 h-28 md:w-32 md:h-36 object-contain pointer-events-none absolute top-0 left-0"
          draggable={false}
        />
        <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-white border-2 border-[var(--jma-dark)] flex items-center justify-center text-xs font-bold pointer-events-none"
          style={{ color: bell.color }}>{bell.key}</div>
      </div>
      <div className="bell-note-label text-center">
        <span style={{ color: bell.color }}>{nameFor(bell.note, bell.solfege)}</span>
        {showNotation && nameMode === 'solfege' && <span className="block text-xs opacity-70">({bell.note})</span>}
      </div>
    </div>
  );
}

const JellyBellsRow = forwardRef(function JellyBellsRow({ onPlayNote, onNoteUp, highlightedNote, showNotation = true, enableKeyboard = true }, ref) {
  // Parent-held map of img refs by note for keyboard-triggered swaps
  const refsRef = useRef({});
  const timersRef = useRef({});

  const registerRef = useCallback((note, ref) => {
    if (ref) refsRef.current[note] = ref;
    else delete refsRef.current[note];
  }, []);

  // Imperative API for parent pages (Simon Says, Ear Trainer) to flash a bell
  useImperativeHandle(ref, () => ({
    flashNote: (note, ms = 400) => {
      const refs = refsRef.current[note];
      if (!refs) return;
      if (refs.idleRef?.current) refs.idleRef.current.style.opacity = '0';
      if (refs.pressedRef?.current) {
        refs.pressedRef.current.style.display = 'block';
        refs.pressedRef.current.style.transform = 'scale(0.95)';
      }
      clearTimeout(timersRef.current[note]);
      timersRef.current[note] = setTimeout(() => {
        if (refs.pressedRef?.current) {
          refs.pressedRef.current.style.display = '';
          refs.pressedRef.current.style.transform = '';
        }
        if (refs.idleRef?.current) refs.idleRef.current.style.opacity = '';
      }, ms);
    },
  }));

  useEffect(() => {
    const timers = timersRef.current;
    return () => Object.values(timers).forEach(t => clearTimeout(t));
  }, []);

  useEffect(() => {
    if (!enableKeyboard) return;
    const pressedKeys = new Set();
    const onKeyDown = (e) => {
      const note = KEY_TO_NOTE[e.key];
      if (!note || pressedKeys.has(note)) return;
      pressedKeys.add(note);
      const refs = refsRef.current[note];
      if (refs?.idleRef?.current) refs.idleRef.current.style.opacity = '0';
      if (refs?.pressedRef?.current) {
        refs.pressedRef.current.style.display = 'block';
        refs.pressedRef.current.style.transform = 'scale(0.95)';
      }
      onPlayNote(note);
    };
    const onKeyUp = (e) => {
      const note = KEY_TO_NOTE[e.key];
      if (!note) return;
      pressedKeys.delete(note);
      const refs = refsRef.current[note];
      if (refs?.pressedRef?.current) {
        refs.pressedRef.current.style.display = '';
        refs.pressedRef.current.style.transform = '';
      }
      if (refs?.idleRef?.current) refs.idleRef.current.style.opacity = '';
      if (onNoteUp) onNoteUp(note);
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => { window.removeEventListener('keydown', onKeyDown); window.removeEventListener('keyup', onKeyUp); };
  }, [enableKeyboard, onPlayNote, onNoteUp]);

  return (
    <div className="bell-row" data-testid="jelly-bells-row">
      {BELLS.map((bell) => (
        <BellItem
          key={bell.note}
          bell={bell}
          onPlayNote={onPlayNote}
          onNoteUp={onNoteUp}
          highlightedNote={highlightedNote}
          showNotation={showNotation}
          registerRef={registerRef}
        />
      ))}
    </div>
  );
});

export { JellyBellsRow, KEY_TO_NOTE };
export default JellyBellsRow;
