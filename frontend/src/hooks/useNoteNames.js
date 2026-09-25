// Global "Note Names" display setting: Solfège (Do Re Mi), Letters (C D E),
// or Both (Do · C). Teacher/parent-facing, lives behind Sticker Book → Teacher
// View → Manage Progress. Persisted on the device like everything else.

import { useEffect, useState } from 'react';

export const NOTE_NAME_KEY = 'jma_note_names_v1';
const EVT = 'jma-note-names';

export const NOTE_NAME_MODES = [
  { id: 'solfege', label: 'Do Re Mi', blurb: 'Solfège syllables (Kodály / early elementary)' },
  { id: 'letters', label: 'C D E',    blurb: 'Letter names (band & piano prep)' },
  { id: 'both',    label: 'Both',     blurb: 'Do · C — bridge from syllables to letters' },
];

export function getNoteNameMode() {
  try {
    const v = localStorage.getItem(NOTE_NAME_KEY);
    return NOTE_NAME_MODES.some((m) => m.id === v) ? v : 'solfege';
  } catch {
    return 'solfege';
  }
}

export function setNoteNameMode(mode) {
  try { localStorage.setItem(NOTE_NAME_KEY, mode); } catch { /* ignore */ }
  window.dispatchEvent(new Event(EVT));
}

// 'High C' → 'C'; everything else is already a letter.
export function letterOf(note) {
  return note === 'High C' ? 'C' : note;
}

export function formatNoteName(note, solfege, mode = getNoteNameMode()) {
  const letter = letterOf(note);
  if (mode === 'letters') return letter;
  if (mode === 'both') return `${solfege} · ${letter}`;
  return solfege;
}

export default function useNoteNames() {
  const [mode, setMode] = useState(getNoteNameMode);
  useEffect(() => {
    const sync = () => setMode(getNoteNameMode());
    window.addEventListener(EVT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(EVT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);
  return {
    mode,
    setMode: setNoteNameMode,
    nameFor: (note, solfege) => formatNoteName(note, solfege, mode),
  };
}
