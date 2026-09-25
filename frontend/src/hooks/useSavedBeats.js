// Saved Beat Lab patterns (localStorage) so kids can jam over them in Jam Session.
const KEY = 'jma_saved_beats_v1';
const MAX_BEATS = 8;

export function loadSavedBeats() {
  try {
    const raw = localStorage.getItem(KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch (_) {
    return [];
  }
}

export function saveBeat({ name, bpm, totalSteps, tracks }) {
  const beats = loadSavedBeats();
  const beat = { id: `b${Date.now()}`, name, bpm, totalSteps, tracks, createdAt: Date.now() };
  const next = [beat, ...beats].slice(0, MAX_BEATS);
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch (_) {}
  return beat;
}

export function deleteSavedBeat(id) {
  const next = loadSavedBeats().filter(b => b.id !== id);
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch (_) {}
  return next;
}

export function renameSavedBeat(id, name) {
  const next = loadSavedBeats().map(b => (b.id === id ? { ...b, name } : b));
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch (_) {}
  return next;
}
