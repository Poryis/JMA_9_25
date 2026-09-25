// Stu's Kazoos - same imperative-DOM swap pattern as JellyBells.
// Identical structure to JellyBellsRow but with kazoo art and 'kazoo-X' test ids.
import { useCallback, useEffect, useImperativeHandle, useRef, forwardRef } from 'react';
import useNoteNames from '../hooks/useNoteNames';

export const KAZOOS = [
  { note: 'C',      solfege: 'Do', color: '#FF3B30', image1: 'assets/kazoos/kazoo-C-idle.png',     image2: 'assets/kazoos/kazoo-C-pressed.png',     key: '1' },
  { note: 'D',      solfege: 'Re', color: '#FF9500', image1: 'assets/kazoos/kazoo-D-idle.png',     image2: 'assets/kazoos/kazoo-D-pressed.png',     key: '2' },
  { note: 'E',      solfege: 'Mi', color: '#FFCC00', image1: 'assets/kazoos/kazoo-E-idle.png',     image2: 'assets/kazoos/kazoo-E-pressed.png',     key: '3' },
  { note: 'F',      solfege: 'Fa', color: '#4CD964', image1: 'assets/kazoos/kazoo-F-idle.png',     image2: 'assets/kazoos/kazoo-F-pressed.png',     key: '4' },
  { note: 'G',      solfege: 'So', color: '#4285F4', image1: 'assets/kazoos/kazoo-G-idle.png',     image2: 'assets/kazoos/kazoo-G-pressed.png',     key: '5' },
  { note: 'A',      solfege: 'La', color: '#AF52DE', image1: 'assets/kazoos/kazoo-A-idle.png',     image2: 'assets/kazoos/kazoo-A-pressed.png',     key: '6' },
  { note: 'B',      solfege: 'Ti', color: '#FF2D85', image1: 'assets/kazoos/kazoo-B-idle.png',     image2: 'assets/kazoos/kazoo-B-pressed.png',     key: '7' },
  { note: 'High C', solfege: 'Do', color: '#C71F1F', image1: 'assets/kazoos/kazoo-HighC-idle.png', image2: 'assets/kazoos/kazoo-HighC-pressed.png', key: '8' }
];

const KEY_TO_NOTE = {
  '1': 'C', '2': 'D', '3': 'E', '4': 'F',
  '5': 'G', '6': 'A', '7': 'B', '8': 'High C'
};

function KazooItem({ kazoo, onPlayNote, onNoteUp, highlightedNote, registerRef }) {
  const { nameFor } = useNoteNames();
  const idleRef = useRef(null);
  const pressedRef = useRef(null);

  useEffect(() => {
    if (registerRef) registerRef(kazoo.note, { idleRef, pressedRef });
    return () => { if (registerRef) registerRef(kazoo.note, null); };
  }, [kazoo.note, registerRef]);

  const pressDown = useCallback((e) => {
    if (e && e.preventDefault) e.preventDefault();
    try { e.target.setPointerCapture(e.pointerId); } catch (_) {}
    if (idleRef.current) idleRef.current.style.opacity = '0';
    if (pressedRef.current) {
      pressedRef.current.style.display = 'block';
      pressedRef.current.style.transform = 'scale(0.95)';
    }
    onPlayNote(kazoo.note);
  }, [kazoo, onPlayNote]);

  const pressUp = useCallback(() => {
    if (pressedRef.current) {
      pressedRef.current.style.display = '';
      pressedRef.current.style.transform = '';
    }
    if (idleRef.current) idleRef.current.style.opacity = '';
    if (onNoteUp) onNoteUp(kazoo.note);
  }, [kazoo, onNoteUp]);

  return (
    <div className="bell-container flex flex-col items-center">
      <div
        data-testid={`kazoo-${kazoo.note.replace(' ', '-')}`}
        data-note={kazoo.note}
        className={`bell-instrument relative cursor-pointer select-none ${highlightedNote === kazoo.note ? 'bell-highlight' : ''}`}
        onPointerDown={pressDown}
        onPointerUp={pressUp}
        onPointerLeave={pressUp}
        onPointerCancel={pressUp}
        style={{ touchAction: 'none' }}
      >
        <img
          ref={idleRef}
          src={kazoo.image1}
          alt={`${kazoo.solfege} kazoo`}
          className="instrument-frame-idle w-12 h-28 md:w-16 md:h-40 object-contain pointer-events-none"
          draggable={false}
        />
        <img
          ref={pressedRef}
          src={kazoo.image2}
          alt=""
          aria-hidden="true"
          className="instrument-frame-pressed w-12 h-28 md:w-16 md:h-40 object-contain pointer-events-none absolute top-0 left-0"
          draggable={false}
        />
        <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-white border-2 border-[var(--jma-dark)] flex items-center justify-center text-xs font-bold pointer-events-none"
          style={{ color: kazoo.color }}>{kazoo.key}</div>
      </div>
      <div className="bell-note-label text-center">
        <span style={{ color: kazoo.color }}>{nameFor(kazoo.note, kazoo.solfege)}</span>
      </div>
    </div>
  );
}

const KazoosRow = forwardRef(function KazoosRow({ onPlayNote, onNoteUp, highlightedNote, enableKeyboard = true }, ref) {
  const refsRef = useRef({});
  const timersRef = useRef({});

  const registerRef = useCallback((note, ref) => {
    if (ref) refsRef.current[note] = ref;
    else delete refsRef.current[note];
  }, []);

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
    <div className="bell-row" data-testid="kazoos-row">
      {KAZOOS.map((kazoo) => (
        <KazooItem
          key={kazoo.note}
          kazoo={kazoo}
          onPlayNote={onPlayNote}
          onNoteUp={onNoteUp}
          highlightedNote={highlightedNote}
          registerRef={registerRef}
        />
      ))}
    </div>
  );
});

export { KazoosRow };
export default KazoosRow;
