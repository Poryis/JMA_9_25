// Local high score storage utility
const STORAGE_KEY = 'jma_jelly_bells_scores';

function getScores() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveScores(scores) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(scores));
  } catch (e) {
    console.warn('Could not save scores:', e);
  }
}

// Get high score for a specific song + speed combo
export function getHighScore(songId, speed) {
  const scores = getScores();
  const key = `${songId}_${speed}`;
  return scores[key] || null;
}

// Save a score if it's a new high score. Returns true if new record
export function saveHighScore(songId, speed, score, stats) {
  const scores = getScores();
  const key = `${songId}_${speed}`;
  const existing = scores[key];

  if (!existing || score > existing.score) {
    scores[key] = {
      score,
      accuracy: stats.accuracy || 0,
      maxStreak: stats.maxStreak || 0,
      date: new Date().toISOString()
    };
    saveScores(scores);
    return true;
  }
  return false;
}

// Get all high scores sorted by score descending
export function getAllHighScores() {
  const scores = getScores();
  return Object.entries(scores)
    .map(([key, data]) => {
      const parts = key.split('_');
      const speed = parts.pop();
      const songId = parts.join('_');
      return { songId, speed, ...data };
    })
    .sort((a, b) => b.score - a.score);
}

// Get top N scores overall
export function getTopScores(n = 10) {
  return getAllHighScores().slice(0, n);
}

// Simon Says best level
export function getSimonBestLevel() {
  try {
    return parseInt(localStorage.getItem('jma_simon_best') || '0', 10);
  } catch { return 0; }
}

export function saveSimonBestLevel(level) {
  try {
    const best = getSimonBestLevel();
    if (level > best) {
      localStorage.setItem('jma_simon_best', String(level));
      return true;
    }
  } catch {}
  return false;
}

// Ear trainer stats
export function getEarTrainerStats() {
  try {
    const raw = localStorage.getItem('jma_ear_trainer');
    return raw ? JSON.parse(raw) : { totalCorrect: 0, totalAttempts: 0, bestStreak: 0 };
  } catch { return { totalCorrect: 0, totalAttempts: 0, bestStreak: 0 }; }
}

export function saveEarTrainerStats(stats) {
  try {
    const existing = getEarTrainerStats();
    const updated = {
      totalCorrect: existing.totalCorrect + (stats.correct || 0),
      totalAttempts: existing.totalAttempts + (stats.attempts || 0),
      bestStreak: Math.max(existing.bestStreak, stats.streak || 0)
    };
    localStorage.setItem('jma_ear_trainer', JSON.stringify(updated));
  } catch {}
}
