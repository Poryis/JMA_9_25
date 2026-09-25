// playerStorage — the future-proofing seam.
//
// PROBLEM: The app currently spreads player progress across ~8 localStorage
// keys (jma_stickers_v1, jma_practice_streak_v1, etc.). When we add cloud
// accounts later, we'll need to (a) bundle all that into ONE blob to send to
// the server and (b) restore it on another device. Different code paths
// reading/writing localStorage directly would make that migration a rewrite.
//
// SOLUTION: This module is the single source of truth for what a "player
// snapshot" looks like. Every piece of progress data has a canonical place
// in the snapshot. Today the underlying storage is localStorage; tomorrow it
// can be a REST API or a Mongo doc. Hooks keep reading/writing localStorage
// directly for now — this module simply ASSEMBLES their data when we need to
// export, AND APPLIES a snapshot when we want to restore.
//
// ==================== CANONICAL PLAYER SNAPSHOT ====================
//
// {
//   schemaVersion: 1,
//   playerId: 'local',                                 // server user.id later
//   displayName: 'Ella',
//   createdAt:  '2026-02-18T...',
//   lastActiveAt: '2026-02-18T...',
//   progress: {
//     achievements: {                                  // sticker earns
//       ach_ear_cadet:   { earnedAt: '...' },
//       ach_rhythm_cadet:{ earnedAt: '...' }
//     },
//     practiceStreak: { count: 5, lastDate: '2026-02-18' },
//     totalPlayMs: 1234567,
//     ranks: { lastSeenRankId: 'apprentice' },
//     bestScores: {
//       sightReading: { cadet: 120, pro: 95 },
//       tempoQuiz: 8
//     }
//   },
//   deviceSettings: {                                  // NOT synced — per-device
//     teacherView: false
//   }
// }
//
// =======================================================================
//
// Backend migration cheatsheet:
//   1. Replace getPlayerSnapshot() body with `await fetch('/api/me')`.
//   2. Replace importPlayerSnapshot() body with `await fetch('/api/me', PUT)`.
//   3. Hooks unchanged — they keep reading from localStorage (which is now
//      treated as an offline cache, refilled on login and synced on change).

export const SCHEMA_VERSION = 1;

// === Legacy keys (kept stable — DO NOT rename without a migration path) ===
const KEYS = {
  player:           'jma_player_v1',
  stickers:         'jma_stickers_v1',
  stickersMigrated: 'jma_stickers_migrated_v2',
  streak:           'jma_practice_streak_v1',
  playTime:         'jma_total_play_ms_v1',
  rankSeen:         'jma_rank_seen_v1',
  sightReadBest:    'jma_sight_reading_best_v1',
  nameThatNoteBest: 'jma_name_that_note_best_v1',
  noteNames:        'jma_note_names_v1',
  tempoQuizBest:    'jma_tempo_quiz_best_v1',
  nameSkipped:      'jma_player_name_skipped_v1',
  teacherView:      'jma_teacher_view_v1',
};

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (raw == null) return fallback;
    // Most stored as JSON; numeric/string keys can return non-JSON strings.
    if (raw === '0' || raw === '1') return raw === '1';
    return JSON.parse(raw);
  } catch { return fallback; }
}

function writeJson(key, value) {
  try {
    if (value === null || value === undefined) {
      localStorage.removeItem(key);
      return;
    }
    localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
  } catch (_) { /* localStorage may be full or disabled */ }
}

// =====================================================================
// EXPORT — gather a complete snapshot the cloud will store later.
// =====================================================================
export function getPlayerSnapshot() {
  const player = readJson(KEYS.player, null);
  const playerId = player?.id || 'local';

  return {
    schemaVersion: SCHEMA_VERSION,
    playerId,
    displayName: player?.displayName || null,
    createdAt:   player?.createdAt   || null,
    lastActiveAt: new Date().toISOString(),
    progress: {
      achievements:   readJson(KEYS.stickers, {}) || {},
      practiceStreak: readJson(KEYS.streak,   { count: 0, lastDate: null }),
      totalPlayMs:    parseInt(localStorage.getItem(KEYS.playTime) || '0', 10) || 0,
      ranks: {
        lastSeenRankId: localStorage.getItem(KEYS.rankSeen) || null,
      },
      bestScores: {
        sightReading: readJson(KEYS.sightReadBest, {}),
        nameThatNote: readJson(KEYS.nameThatNoteBest, {}),
        tempoQuiz:    parseInt(localStorage.getItem(KEYS.tempoQuizBest) || '0', 10) || 0,
      },
    },
    deviceSettings: {
      teacherView: localStorage.getItem(KEYS.teacherView) === '1',
      noteNames:   localStorage.getItem(KEYS.noteNames) || 'solfege',
    },
  };
}

// =====================================================================
// IMPORT — restore a snapshot to local storage. Used for:
//   • Future cloud-sync hydration on login
//   • "Reset to known state" tooling
//   • Sharing a progress JSON between devices manually before accounts ship
// =====================================================================
export function importPlayerSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== 'object') {
    throw new Error('importPlayerSnapshot: snapshot must be an object');
  }
  if (snapshot.schemaVersion && snapshot.schemaVersion > SCHEMA_VERSION) {
    throw new Error(`importPlayerSnapshot: snapshot is from a newer app version (${snapshot.schemaVersion} > ${SCHEMA_VERSION})`);
  }

  const { displayName, createdAt, playerId, progress, deviceSettings } = snapshot;

  if (displayName || playerId) {
    writeJson(KEYS.player, {
      id: playerId || 'local',
      displayName: displayName || null,
      createdAt:   createdAt   || new Date().toISOString(),
    });
  }
  if (progress?.achievements)   writeJson(KEYS.stickers, progress.achievements);
  if (progress?.practiceStreak) writeJson(KEYS.streak,   progress.practiceStreak);
  if (typeof progress?.totalPlayMs === 'number') localStorage.setItem(KEYS.playTime, String(progress.totalPlayMs));
  if (progress?.ranks?.lastSeenRankId) localStorage.setItem(KEYS.rankSeen, progress.ranks.lastSeenRankId);
  if (progress?.bestScores?.sightReading) writeJson(KEYS.sightReadBest, progress.bestScores.sightReading);
  if (progress?.bestScores?.nameThatNote) writeJson(KEYS.nameThatNoteBest, progress.bestScores.nameThatNote);
  if (typeof progress?.bestScores?.tempoQuiz === 'number') localStorage.setItem(KEYS.tempoQuizBest, String(progress.bestScores.tempoQuiz));
  if (deviceSettings && typeof deviceSettings.teacherView === 'boolean') {
    localStorage.setItem(KEYS.teacherView, deviceSettings.teacherView ? '1' : '0');
  }
  if (deviceSettings && ['solfege', 'letters', 'both'].includes(deviceSettings.noteNames)) {
    localStorage.setItem(KEYS.noteNames, deviceSettings.noteNames);
  }
}

// Convenience: download the current snapshot as a JSON file. Useful right now
// for "backing up progress" or moving from one device to another before
// accounts ship.
export function downloadSnapshotJson(filename = 'jma-progress.json') {
  const snapshot = getPlayerSnapshot();
  const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Wipe ALL player progress + identity. Device settings (teacherView, audio
// unlock) are PRESERVED — those are properties of the device, not the player.
// Returns true on success so callers can show a confirmation.
export function resetAllPlayerData() {
  const playerScopedKeys = [
    KEYS.player,
    KEYS.stickers,
    KEYS.stickersMigrated,
    KEYS.streak,
    KEYS.playTime,
    KEYS.rankSeen,
    KEYS.sightReadBest,
    KEYS.nameThatNoteBest,
    KEYS.tempoQuizBest,
    KEYS.nameSkipped,
  ];
  try {
    playerScopedKeys.forEach(k => localStorage.removeItem(k));
    return true;
  } catch (_) {
    return false;
  }
}

// Exported for tests / dev tools.
export const _LEGACY_KEYS = KEYS;
