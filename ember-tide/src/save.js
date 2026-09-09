// =========================================================
// Ember & Tide - Save & Persistence Manager
// Saves level progress, stars, best times, shards, settings
// =========================================================

const SAVE_KEY = 'ember_tide_save_v3';

export class SaveManager {
  constructor() {
    this.data = this.load();
  }

  getDefaultData() {
    return {
      unlockedLevels: [1],
      levelStats: {
        1: { completed: false, bestTime: null, stars: 0, shards: 0, maxShards: 3 },
        2: { completed: false, bestTime: null, stars: 0, shards: 0, maxShards: 3 },
        3: { completed: false, bestTime: null, stars: 0, shards: 0, maxShards: 3 },
        4: { completed: false, bestTime: null, stars: 0, shards: 0, maxShards: 3 },
        5: { completed: false, bestTime: null, stars: 0, shards: 0, maxShards: 4 }
      },
      settings: {
        musicVolume: 0.6,
        sfxVolume: 0.8,
        screenShake: true,
        particles: true,
        highContrast: false,
        touchControls: 'auto' // 'auto' | 'always' | 'never'
      },
      stats: {
        totalDeaths: 0,
        totalPlayTime: 0,
        gamesCompleted: 0
      }
    };
  }

  load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return this.getDefaultData();
      const parsed = JSON.parse(raw);
      const defaults = this.getDefaultData();
      return {
        ...defaults,
        ...parsed,
        levelStats: { ...defaults.levelStats, ...(parsed.levelStats || {}) },
        settings: { ...defaults.settings, ...(parsed.settings || {}) },
        stats: { ...defaults.stats, ...(parsed.stats || {}) }
      };
    } catch (e) {
      console.warn('Failed to load save data from localStorage:', e);
      return this.getDefaultData();
    }
  }

  save() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(this.data));
    } catch (e) {
      console.error('Failed to save to localStorage:', e);
    }
  }

  isLevelUnlocked(levelId) {
    return this.data.unlockedLevels.includes(Number(levelId));
  }

  unlockLevel(levelId) {
    const id = Number(levelId);
    if (!this.data.unlockedLevels.includes(id)) {
      this.data.unlockedLevels.push(id);
      this.save();
    }
  }

  recordLevelComplete(levelId, timeSeconds, starsEarned, shardsCollected, maxShards) {
    const id = Number(levelId);
    if (!this.data.levelStats[id]) {
      this.data.levelStats[id] = { completed: false, bestTime: null, stars: 0, shards: 0, maxShards: maxShards || 3 };
    }

    const stat = this.data.levelStats[id];
    stat.completed = true;
    stat.maxShards = maxShards || stat.maxShards;

    // Best time
    if (stat.bestTime === null || timeSeconds < stat.bestTime) {
      stat.bestTime = Math.round(timeSeconds * 10) / 10;
    }

    // Best stars
    if (starsEarned > stat.stars) {
      stat.stars = starsEarned;
    }

    // Best shards
    if (shardsCollected > stat.shards) {
      stat.shards = shardsCollected;
    }

    // Unlock next level
    if (id < 5) {
      this.unlockLevel(id + 1);
    }

    this.data.stats.gamesCompleted = (this.data.stats.gamesCompleted || 0) + 1;
    this.save();
  }

  recordDeath() {
    this.data.stats.totalDeaths = (this.data.stats.totalDeaths || 0) + 1;
    this.save();
  }

  getLevelStat(levelId) {
    return this.data.levelStats[Number(levelId)] || { completed: false, bestTime: null, stars: 0, shards: 0, maxShards: 3 };
  }

  getTotalStars() {
    return Object.values(this.data.levelStats).reduce((sum, lvl) => sum + (lvl.stars || 0), 0);
  }

  getTotalShards() {
    return Object.values(this.data.levelStats).reduce((sum, lvl) => sum + (lvl.shards || 0), 0);
  }

  getSetting(key) {
    return this.data.settings[key];
  }

  setSetting(key, value) {
    this.data.settings[key] = value;
    this.save();
  }

  resetProgress() {
    this.data = this.getDefaultData();
    this.save();
  }
}
