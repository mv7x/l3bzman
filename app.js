// =============================================================
// EMBER & TIDE — Complete Standalone Game Bundle (v3.0)
// Authentic Classic Elemental Platformer Engine
// =============================================================

// ─── PhysicsEngine ───────────────────────────────────────────
class PhysicsEngine {
  static checkAABB(r1, r2) {
    if (!r1 || !r2) return false;
    return r1.x < r2.x + r2.width && r1.x + r1.width > r2.x &&
           r1.y < r2.y + r2.height && r1.y + r1.height > r2.y;
  }
  static checkPointInRect(px, py, rect) {
    return px >= rect.x && px <= rect.x + rect.width && py >= rect.y && py <= rect.y + rect.height;
  }
  static resolvePlayerPhysics(player, platforms, movingPlatforms, dt) {
    player.x += player.vx * dt;
    for (const plat of platforms) {
      if (!plat.solid) continue;
      if (PhysicsEngine.checkAABB(player.getHitbox(), plat)) {
        if (player.vx > 0) { player.x = plat.x - player.width; player.vx = 0; }
        else if (player.vx < 0) { player.x = plat.x + plat.width; player.vx = 0; }
      }
    }
    for (const mp of (movingPlatforms || [])) {
      if (!mp.solid) continue;
      if (PhysicsEngine.checkAABB(player.getHitbox(), mp)) {
        if (player.vx > 0) { player.x = mp.x - player.width; player.vx = 0; }
        else if (player.vx < 0) { player.x = mp.x + mp.width; player.vx = 0; }
      }
    }
    const prevY = player.y;
    player.y += player.vy * dt;
    player.isGrounded = false;
    player.attachedPlatform = null;
    for (const plat of platforms) {
      if (!plat.solid) continue;
      if (PhysicsEngine.checkAABB(player.getHitbox(), plat)) {
        if (player.vy > 0) { player.y = plat.y - player.height; player.vy = 0; player.isGrounded = true; }
        else if (player.vy < 0) { player.y = plat.y + plat.height; player.vy = 0; }
      }
    }
    for (const mp of (movingPlatforms || [])) {
      if (!mp.solid) continue;
      const hb = player.getHitbox();
      if (PhysicsEngine.checkAABB(hb, mp)) {
        if (player.vy > 0 && prevY + player.height <= mp.y + 14) {
          player.y = mp.y - player.height; player.vy = 0; player.isGrounded = true; player.attachedPlatform = mp;
        } else if (player.vy < 0) { player.y = mp.y + mp.height; player.vy = 0; }
      }
    }
    if (player.attachedPlatform && player.isGrounded) {
      player.x += player.attachedPlatform.dx || 0;
      player.y += player.attachedPlatform.dy || 0;
    }
  }
}

// ─── SaveManager ─────────────────────────────────────────────
class SaveManager {
  constructor(playerName = '') {
    this.playerName = playerName || localStorage.getItem('agy_user_name') || localStorage.getItem('ember_tide_player_name') || '';
    this.data = this.load();
    this._db = null;
    this.initCloud();
  }
  initCloud() {
    try {
      if (typeof firebase !== 'undefined') {
        this._db = firebase.database();
        if (this.playerName) this.loadCloudProgress(this.playerName);
      }
    } catch(e){}
  }
  setPlayerName(name) {
    this.playerName = (name || '').trim();
    this.data = this.load();
    if (this.playerName && this._db) this.loadCloudProgress(this.playerName);
  }
  getStorageKey() {
    if (!this.playerName) return 'ember_tide_save_v3';
    const safe = this.playerName.replace(/[.#$\[\]\/]/g, '_').trim();
    return `ember_tide_save_user_${safe}`;
  }
  getDefaultData() {
    return {
      unlockedLevels: [1],
      levelStats: {
        1: { completed: false, bestTime: null, stars: 0, shards: 0, maxShards: 8 },
        2: { completed: false, bestTime: null, stars: 0, shards: 0, maxShards: 4 },
        3: { completed: false, bestTime: null, stars: 0, shards: 0, maxShards: 5 },
        4: { completed: false, bestTime: null, stars: 0, shards: 0, maxShards: 4 },
        5: { completed: false, bestTime: null, stars: 0, shards: 0, maxShards: 5 }
      },
      settings: { musicVolume: 0.6, sfxVolume: 0.8, screenShake: true, particles: true },
      stats: { totalDeaths: 0, totalPlayTime: 0, gamesCompleted: 0 },
      lastRoom: null
    };
  }
  load() {
    try {
      const k = this.getStorageKey();
      let raw = localStorage.getItem(k);
      if (!raw && k !== 'ember_tide_save_v3') raw = localStorage.getItem('ember_tide_save_v3');
      if (!raw) return this.getDefaultData();
      const p = JSON.parse(raw), d = this.getDefaultData();
      return { ...d, ...p, levelStats: { ...d.levelStats, ...(p.levelStats || {}) }, settings: { ...d.settings, ...(p.settings || {}) }, stats: { ...d.stats, ...(p.stats || {}) } };
    } catch(e) { return this.getDefaultData(); }
  }
  save() {
    try {
      const k = this.getStorageKey();
      localStorage.setItem(k, JSON.stringify(this.data));
      localStorage.setItem('ember_tide_save_v3', JSON.stringify(this.data));
      this.saveCloudProgress();
    } catch(e){}
  }
  async loadCloudProgress(username) {
    if (!this._db || !username) return;
    try {
      const safe = username.replace(/[.#$\[\]\/]/g, '_').trim();
      const snap = await this._db.ref(`et_users/${safe}`).once('value');
      if (snap.exists()) {
        const cloud = snap.val();
        if (cloud.unlockedLevels && Array.isArray(cloud.unlockedLevels)) {
          cloud.unlockedLevels.forEach(lvl => {
            if (!this.data.unlockedLevels.includes(lvl)) this.data.unlockedLevels.push(lvl);
          });
        }
        if (cloud.lastRoom) this.data.lastRoom = cloud.lastRoom;
        if (cloud.levelStats) {
          this.data.levelStats = { ...this.data.levelStats, ...cloud.levelStats };
        }
        const k = this.getStorageKey();
        localStorage.setItem(k, JSON.stringify(this.data));
        if (window.app && window.app.onProgressUpdated) window.app.onProgressUpdated();
      }
    } catch(e){}
  }
  saveCloudProgress() {
    if (!this._db || !this.playerName) return;
    try {
      const safe = this.playerName.replace(/[.#$\[\]\/]/g, '_').trim();
      const maxLvl = Math.max(...(this.data.unlockedLevels || [1]));
      this._db.ref(`et_users/${safe}`).update({
        username: this.playerName,
        unlockedLevels: this.data.unlockedLevels,
        maxLevel: maxLvl,
        lastRoom: this.data.lastRoom || null,
        levelStats: this.data.levelStats,
        updatedAt: Date.now()
      }).catch(()=>{});
    } catch(e){}
  }
  setLastRoom(code, level) {
    this.data.lastRoom = { code, level, updatedAt: Date.now() };
    this.save();
  }
  getLastRoom() { return this.data.lastRoom; }
  isLevelUnlocked(id) { return this.data.unlockedLevels.includes(Number(id)); }
  unlockLevel(id) {
    const n = Number(id);
    if (!this.data.unlockedLevels.includes(n)) {
      this.data.unlockedLevels.push(n);
      this.save();
      if (window.app && window.app.onProgressUpdated) window.app.onProgressUpdated();
    }
  }
  recordLevelComplete(id, t, stars, shards, maxShards) {
    const n = Number(id);
    if (!this.data.levelStats[n]) this.data.levelStats[n] = { completed: false, bestTime: null, stars: 0, shards: 0, maxShards: maxShards || 3 };
    const s = this.data.levelStats[n];
    s.completed = true; s.maxShards = maxShards || s.maxShards;
    if (s.bestTime === null || t < s.bestTime) s.bestTime = Math.round(t * 10) / 10;
    if (stars > s.stars) s.stars = stars;
    if (shards > s.shards) s.shards = shards;
    if (n < 5) this.unlockLevel(n + 1);
    this.data.stats.gamesCompleted = (this.data.stats.gamesCompleted || 0) + 1;
    this.save();
    if (window.app && window.app.onProgressUpdated) window.app.onProgressUpdated();
  }
  recordDeath() { this.data.stats.totalDeaths = (this.data.stats.totalDeaths || 0) + 1; this.save(); }
  getLevelStat(id) { return this.data.levelStats[Number(id)] || { completed: false, bestTime: null, stars: 0, shards: 0, maxShards: 3 }; }
  getSetting(k) { return this.data.settings[k]; }
  setSetting(k, v) { this.data.settings[k] = v; this.save(); }
  resetProgress() { this.data = this.getDefaultData(); this.save(); if (window.app && window.app.onProgressUpdated) window.app.onProgressUpdated(); }
}

// ─── AudioManager ────────────────────────────────────────────
class AudioManager {
  constructor(saveManager) {
    this.saveManager = saveManager; this.ctx = null; this.masterGain = null;
    this.sfxGain = null; this.musicGain = null; this.isInitialized = false;
    this.isPlayingMusic = false; this.musicInterval = null; this.stepCount = 0;
    this.sfxVolume = saveManager ? saveManager.getSetting('sfxVolume') : 0.8;
    this.musicVolume = saveManager ? saveManager.getSetting('musicVolume') : 0.6;
    this.isMuted = false;
  }
  init() {
    if (this.isInitialized) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.masterGain = this.ctx.createGain(); this.masterGain.gain.setValueAtTime(1, this.ctx.currentTime); this.masterGain.connect(this.ctx.destination);
      this.sfxGain = this.ctx.createGain(); this.sfxGain.gain.setValueAtTime(this.sfxVolume, this.ctx.currentTime); this.sfxGain.connect(this.masterGain);
      this.musicGain = this.ctx.createGain(); this.musicGain.gain.setValueAtTime(this.musicVolume, this.ctx.currentTime); this.musicGain.connect(this.masterGain);
      this.isInitialized = true;
    } catch(e){}
  }
  ensureContext() { if (!this.isInitialized) this.init(); if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); }
  setSfxVolume(v) { this.sfxVolume = Math.max(0, Math.min(1, v)); if (this.sfxGain && this.ctx) this.sfxGain.gain.setTargetAtTime(this.sfxVolume, this.ctx.currentTime, 0.05); }
  setMusicVolume(v) { this.musicVolume = Math.max(0, Math.min(1, v)); if (this.musicGain && this.ctx) this.musicGain.gain.setTargetAtTime(this.musicVolume, this.ctx.currentTime, 0.05); }
  toggleMute() { this.isMuted = !this.isMuted; if (this.masterGain && this.ctx) this.masterGain.gain.setTargetAtTime(this.isMuted ? 0 : 1, this.ctx.currentTime, 0.05); return this.isMuted; }
  _play(freq, type, dur, vol) {
    this.ensureContext(); if (!this.ctx || this.isMuted) return;
    try {
      const t = this.ctx.currentTime, osc = this.ctx.createOscillator(), g = this.ctx.createGain();
      osc.type = type; osc.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      osc.connect(g); g.connect(this.sfxGain); osc.start(t); osc.stop(t + dur + 0.01);
    } catch(e){}
  }
  playJump(isEmber = true) {
    this.ensureContext(); if (!this.ctx || this.isMuted) return;
    try {
      const t = this.ctx.currentTime, osc = this.ctx.createOscillator(), g = this.ctx.createGain();
      osc.type = isEmber ? 'sawtooth' : 'sine'; osc.frequency.setValueAtTime(isEmber ? 160 : 220, t); osc.frequency.exponentialRampToValueAtTime(isEmber ? 380 : 480, t + 0.14);
      g.gain.setValueAtTime(0.18, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
      osc.connect(g); g.connect(this.sfxGain); osc.start(t); osc.stop(t + 0.16);
    } catch(e){}
  }
  playLand() { this._play(140, 'triangle', 0.1, 0.2); }
  playShard(el = 'fire') {
    this.ensureContext(); if (!this.ctx || this.isMuted) return;
    try {
      const t = this.ctx.currentTime, freqs = el === 'fire' ? [523, 659, 784, 1047] : [587, 740, 880, 1175];
      freqs.forEach((f, i) => {
        const osc = this.ctx.createOscillator(), g = this.ctx.createGain();
        osc.type = 'sine'; osc.frequency.setValueAtTime(f, t + i * 0.04);
        g.gain.setValueAtTime(0, t + i * 0.04); g.gain.linearRampToValueAtTime(0.12, t + i * 0.04 + 0.02); g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.04 + 0.35);
        osc.connect(g); g.connect(this.sfxGain); osc.start(t + i * 0.04); osc.stop(t + i * 0.04 + 0.36);
      });
    } catch(e){}
  }
  playSwitch(p = true) { this._play(p ? 320 : 240, 'triangle', 0.1, 0.25); }
  playDoor() { this._play(90, 'sawtooth', 0.35, 0.12); }
  playDeath() { this._play(220, 'sawtooth', 0.5, 0.35); }
  playRespawn() {
    this.ensureContext(); if (!this.ctx || this.isMuted) return;
    try {
      const t = this.ctx.currentTime;
      [262, 330, 392, 523].forEach((f, i) => {
        const osc = this.ctx.createOscillator(), g = this.ctx.createGain();
        osc.type = 'triangle'; osc.frequency.setValueAtTime(f, t + i * 0.05);
        g.gain.setValueAtTime(0, t + i * 0.05); g.gain.linearRampToValueAtTime(0.12, t + i * 0.05 + 0.04); g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.05 + 0.25);
        osc.connect(g); g.connect(this.sfxGain); osc.start(t + i * 0.05); osc.stop(t + i * 0.05 + 0.26);
      });
    } catch(e){}
  }
  playCheckpoint() {
    this.ensureContext(); if (!this.ctx || this.isMuted) return;
    try {
      const t = this.ctx.currentTime;
      [349, 440, 523, 698].forEach((f, i) => {
        const osc = this.ctx.createOscillator(), g = this.ctx.createGain();
        osc.type = 'sine'; osc.frequency.setValueAtTime(f, t + i * 0.06);
        g.gain.setValueAtTime(0, t + i * 0.06); g.gain.linearRampToValueAtTime(0.15, t + i * 0.06 + 0.03); g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.06 + 0.4);
        osc.connect(g); g.connect(this.sfxGain); osc.start(t + i * 0.06); osc.stop(t + i * 0.06 + 0.41);
      });
    } catch(e){}
  }
  playWin() {
    this.ensureContext(); if (!this.ctx || this.isMuted) return;
    try {
      const t = this.ctx.currentTime;
      [{ f: 523, d: 0.12, s: 0 }, { f: 659, d: 0.12, s: 0.12 }, { f: 784, d: 0.12, s: 0.24 }, { f: 1047, d: 0.4, s: 0.36 }, { f: 880, d: 0.15, s: 0.8 }, { f: 1047, d: 0.6, s: 0.95 }].forEach(({ f, d, s }) => {
        const osc = this.ctx.createOscillator(), g = this.ctx.createGain();
        osc.type = 'triangle'; osc.frequency.setValueAtTime(f, t + s);
        g.gain.setValueAtTime(0, t + s); g.gain.linearRampToValueAtTime(0.2, t + s + 0.02); g.gain.exponentialRampToValueAtTime(0.001, t + s + d);
        osc.connect(g); g.connect(this.sfxGain); osc.start(t + s); osc.stop(t + s + d + 0.05);
      });
    } catch(e){}
  }
  startMusic() {
    this.ensureContext();
    if (this.isPlayingMusic) return;
    this.isPlayingMusic = true; this.stepCount = 0;
    this.musicInterval = setInterval(() => {
      if (!this.isPlayingMusic || !this.ctx || this.isMuted || this.musicVolume <= 0) return;
      this.playMusicStep(this.stepCount);
      this.stepCount = (this.stepCount + 1) % 64;
    }, 220);
  }
  stopMusic() { this.isPlayingMusic = false; if (this.musicInterval) { clearInterval(this.musicInterval); this.musicInterval = null; } }
  playMusicStep(step) {
    if (!this.ctx) return;
    try {
      const t = this.ctx.currentTime, scale = [147, 165, 175, 196, 220, 233, 262, 294, 330, 349, 392, 440], bass = [73, 73, 87, 65];
      if (step % 4 === 0) {
        const osc = this.ctx.createOscillator(), g = this.ctx.createGain();
        osc.type = 'triangle'; osc.frequency.setValueAtTime(bass[Math.floor(step / 16) % 4], t);
        g.gain.setValueAtTime(0.12 * this.musicVolume, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
        osc.connect(g); g.connect(this.musicGain); osc.start(t); osc.stop(t + 0.42);
      }
      if (step % 2 === 0) {
        const pats = [0, 4, 7, 9, 7, 4, 2, 5], note = scale[pats[(step / 2) % pats.length]];
        const osc = this.ctx.createOscillator(), g = this.ctx.createGain();
        osc.type = 'sine'; osc.frequency.setValueAtTime(note * 2, t);
        g.gain.setValueAtTime(0.035 * this.musicVolume, t); g.gain.exponentialRampToValueAtTime(0.0005, t + 0.28);
        osc.connect(g); g.connect(this.musicGain); osc.start(t); osc.stop(t + 0.3);
      }
    } catch(e){}
  }
}

// ─── InputManager ────────────────────────────────────────────
class InputManager {
  constructor() {
    this.keys = {}; this.prevKeys = {};
    this.bindings = {
      emberLeft: ['KeyA', 'a', 'A', 'ش'],
      emberRight: ['KeyD', 'd', 'D', 'ي'],
      emberJump: ['KeyW', 'w', 'W', 'Space', ' ', 'ص'],
      emberInteract: ['KeyS', 's', 'S', 'س'],
      tideLeft: ['ArrowLeft'],
      tideRight: ['ArrowRight'],
      tideJump: ['ArrowUp'],
      tideInteract: ['ArrowDown'],
      pause: ['Escape', 'KeyP', 'p', 'P', 'ح'],
      restart: ['KeyR', 'r', 'R', 'ق']
    };
    this.touchState = { emberLeft: false, emberRight: false, emberJump: false, tideLeft: false, tideRight: false, tideJump: false };
    this.initEventListeners();
  }
  initEventListeners() {
    const gameCodes = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'KeyW', 'KeyA', 'KeyS', 'KeyD'];
    window.addEventListener('keydown', e => {
      if (gameCodes.includes(e.code) || e.key === ' ') {
        const tag = (document.activeElement && document.activeElement.tagName) || '';
        if (tag !== 'INPUT' && tag !== 'TEXTAREA') e.preventDefault();
      }
      if (e.code) this.keys[e.code] = true;
      if (e.key) { this.keys[e.key] = true; this.keys[e.key.toLowerCase()] = true; this.keys[e.key.toUpperCase()] = true; }
    });
    window.addEventListener('keyup', e => {
      if (e.code) this.keys[e.code] = false;
      if (e.key) { this.keys[e.key] = false; this.keys[e.key.toLowerCase()] = false; this.keys[e.key.toUpperCase()] = false; }
    });
    window.addEventListener('blur', () => { this.keys = {}; this.prevKeys = {}; });
  }
  update() { this.prevKeys = { ...this.keys }; }
  isDown(a) {
    if (this.touchState[a]) return true;
    return (this.bindings[a] || []).some(k => !!this.keys[k]);
  }
  isJustPressed(a) {
    return (this.bindings[a] || []).some(k => !!this.keys[k] && !this.prevKeys[k]);
  }
  getEmberInput() { return { left: this.isDown('emberLeft'), right: this.isDown('emberRight'), jump: this.isDown('emberJump'), interact: this.isDown('emberInteract') }; }
  getTideInput() { return { left: this.isDown('tideLeft'), right: this.isDown('tideRight'), jump: this.isDown('tideJump'), interact: this.isDown('tideInteract') }; }
  setTouchInput(a, v) { if (a in this.touchState) this.touchState[a] = v; }
}

// ─── ParticleSystem ──────────────────────────────────────────
class ParticleSystem {
  constructor() { this.particles = []; this.maxParticles = 350; this.enabled = true; }
  setEnabled(v) { this.enabled = v; if (!v) this.particles = []; }
  emit(o) {
    if (!this.enabled) return;
    if (this.particles.length >= this.maxParticles) this.particles.shift();
    this.particles.push({ x: o.x || 0, y: o.y || 0, vx: o.vx || (Math.random() - 0.5) * 50, vy: o.vy || (Math.random() - 0.5) * 50, size: o.size || 4, endSize: o.endSize !== undefined ? o.endSize : 0, color: o.color || '#ff6600', alpha: o.alpha !== undefined ? o.alpha : 1, life: o.life || 0.6, maxLife: o.life || 0.6, gravity: o.gravity || 0, shape: o.shape || 'circle', glow: o.glow || false });
  }
  emitFireBurst(x, y, count = 16) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2, s = 40 + Math.random() * 120, c = ['#ff3b00', '#ff8500', '#ffc107', '#fff'][Math.floor(Math.random() * 4)];
      this.emit({ x: x + (Math.random() - 0.5) * 10, y: y + (Math.random() - 0.5) * 10, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 30, size: 3 + Math.random() * 4, endSize: 0.5, color: c, life: 0.4 + Math.random() * 0.4, gravity: -60, glow: true });
    }
  }
  emitWaterSplash(x, y, count = 16) {
    for (let i = 0; i < count; i++) {
      const a = -Math.PI * 0.15 - Math.random() * Math.PI * 0.7, s = 50 + Math.random() * 140, c = ['#00b4d8', '#90e0ef', '#caf0f8', '#0077b6'][Math.floor(Math.random() * 4)];
      this.emit({ x: x + (Math.random() - 0.5) * 10, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, size: 2.5 + Math.random() * 3.5, endSize: 1, color: c, life: 0.45 + Math.random() * 0.3, gravity: 350, glow: true });
    }
  }
  emitDust(x, y, count = 5) {
    for (let i = 0; i < count; i++) this.emit({ x: x + (Math.random() - 0.5) * 14, y: y + 2, vx: (Math.random() - 0.5) * 40, vy: -Math.random() * 25, size: 2 + Math.random() * 3, endSize: 5, color: 'rgba(200,210,225,0.4)', life: 0.25 + Math.random() * 0.2, gravity: -10 });
  }
  emitSparkles(x, y, color = '#ffd700', count = 8) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2, s = 20 + Math.random() * 70;
      this.emit({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, size: 2 + Math.random() * 3, endSize: 0, color, life: 0.4 + Math.random() * 0.3, shape: 'sparkle', glow: true });
    }
  }
  emitPortalRays(x, y, color = '#38bdf8') {
    if (Math.random() > 0.4) return;
    const a = Math.random() * Math.PI * 2, d = 24 + Math.random() * 16;
    this.emit({ x: x + Math.cos(a) * d, y: y + Math.sin(a) * d, vx: -Math.cos(a) * 35, vy: -Math.sin(a) * 35, size: 2 + Math.random() * 2, endSize: 0, color, life: 0.5, glow: true });
  }
  update(dt) {
    if (!this.enabled) return;
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]; p.life -= dt;
      if (p.life <= 0) { this.particles.splice(i, 1); continue; }
      p.x += p.vx * dt; p.y += p.vy * dt; p.vy += p.gravity * dt;
    }
  }
  render(ctx) {
    if (!this.enabled || this.particles.length === 0) return;
    ctx.save();
    for (const p of this.particles) {
      const prog = 1 - (p.life / p.maxLife), alpha = Math.max(0, p.alpha * (1 - prog)), sz = Math.max(0.1, p.size + (p.endSize - p.size) * prog);
      ctx.globalAlpha = alpha;
      if (p.glow) { ctx.shadowColor = p.color; ctx.shadowBlur = 8; } else { ctx.shadowBlur = 0; }
      ctx.fillStyle = p.color;
      if (p.shape === 'sparkle') {
        ctx.beginPath(); ctx.moveTo(p.x, p.y - sz * 1.5); ctx.lineTo(p.x + sz * 0.5, p.y - sz * 0.5); ctx.lineTo(p.x + sz * 1.5, p.y); ctx.lineTo(p.x + sz * 0.5, p.y + sz * 0.5); ctx.lineTo(p.x, p.y + sz * 1.5); ctx.lineTo(p.x - sz * 0.5, p.y + sz * 0.5); ctx.lineTo(p.x - sz * 1.5, p.y); ctx.lineTo(p.x - sz * 0.5, p.y - sz * 0.5); ctx.closePath(); ctx.fill();
      } else {
        ctx.beginPath(); ctx.arc(p.x, p.y, sz, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.restore();
  }
}

// ─── Camera ──────────────────────────────────────────────────
class Camera {
  constructor(vw = 1280, vh = 720) {
    this.viewportWidth = vw; this.viewportHeight = vh;
    this.x = 0; this.y = 0; this.zoom = 1.0; this.targetZoom = 1.0;
    this.minZoom = 0.85; this.maxZoom = 1.0; this.levelWidth = 1280; this.levelHeight = 720;
    this.lerpSpeed = 4.0; this.shakeIntensity = 0; this.shakeDuration = 0;
  }
  setLevelBounds(w, h) { this.levelWidth = w; this.levelHeight = h; }
  setViewport(w, h) { this.viewportWidth = w; this.viewportHeight = h; }
  shake(i = 6, d = 0.25) { this.shakeIntensity = i; this.shakeDuration = d; }
  update(dt, ember, tide) {
    if (this.shakeDuration > 0) {
      this.shakeDuration -= dt;
      if (this.shakeDuration <= 0) this.shakeIntensity = 0;
    }
    if (!ember || !tide) return;
    // Standard viewport level: keep locked steadily
    if (this.levelWidth <= this.viewportWidth && this.levelHeight <= this.viewportHeight) {
      this.targetZoom = 1.0; this.zoom = 1.0; this.x = 0; this.y = 0;
      return;
    }
    // Larger level: follow both players smoothly
    const ex = ember.x, ey = ember.y, tx = tide.x, ty = tide.y;
    const targetCenterX = (ex + ember.width / 2 + tx + tide.width / 2) / 2;
    const targetCenterY = (ey + ember.height / 2 + ty + tide.height / 2) / 2;
    const dx = Math.abs((ex + ember.width / 2) - (tx + tide.width / 2));
    const dy = Math.abs((ey + ember.height / 2) - (ty + tide.height / 2));
    const maxSpan = Math.max(dx / (this.viewportWidth * 0.75), dy / (this.viewportHeight * 0.75));
    this.targetZoom = maxSpan > 1.0 ? Math.max(this.minZoom, 1.0 / maxSpan) : 1.0;
    this.zoom += (this.targetZoom - this.zoom) * 2.0 * dt;
    const worldViewW = this.viewportWidth / this.zoom;
    const worldViewH = this.viewportHeight / this.zoom;
    let desiredX = targetCenterX - worldViewW / 2;
    let desiredY = targetCenterY - worldViewH / 2;
    if (this.levelWidth > worldViewW) { desiredX = Math.max(0, Math.min(this.levelWidth - worldViewW, desiredX)); } else { desiredX = (this.levelWidth - worldViewW) / 2; }
    if (this.levelHeight > worldViewH) { desiredY = Math.max(0, Math.min(this.levelHeight - worldViewH, desiredY)); } else { desiredY = (this.levelHeight - worldViewH) / 2; }
    this.x += (desiredX - this.x) * this.lerpSpeed * dt;
    this.y += (desiredY - this.y) * this.lerpSpeed * dt;
  }
  applyTransform(ctx) {
    ctx.save();
    let sx = 0, sy = 0;
    if (this.shakeIntensity > 0) { sx = (Math.random() - 0.5) * this.shakeIntensity * 2; sy = (Math.random() - 0.5) * this.shakeIntensity * 2; }
    ctx.translate(this.viewportWidth / 2, this.viewportHeight / 2);
    ctx.scale(this.zoom, this.zoom);
    ctx.translate(-this.viewportWidth / 2, -this.viewportHeight / 2);
    ctx.translate(-Math.round(this.x + sx), -Math.round(this.y + sy));
  }
  restoreTransform(ctx) { ctx.restore(); }
}

// ─── Player ──────────────────────────────────────────────────
class Player {
  constructor(type, x, y, audio, particles) {
    this.type = type;
    this.x = x; this.y = y; this.spawnX = x; this.spawnY = y;
    this.audio = audio; this.particles = particles;
    this.width = 24; this.height = 42;
    this.vx = 0; this.vy = 0;
    this.speed = 250; this.accel = 1900; this.friction = 1500; this.airFriction = 350;
    this.jumpForce = -520; this.gravity = 1400; this.maxFallSpeed = 750;
    this.isGrounded = false; this.wasGrounded = false; this.isDead = false;
    this.deathTimer = 0; this.isRespawning = false; this.respawnTimer = 0;
    this.isVictory = false; this.facing = 1;
    this.coyoteTimer = 0; this.jumpBufferTimer = 0; this.coyoteMax = 0.12; this.jumpBufferMax = 0.12;
    this.animTime = Math.random() * 10; this.walkCycle = 0;
    this.scaleX = 1; this.scaleY = 1;
    this.blinkTimer = 2 + Math.random() * 3; this.isBlinking = false;
    this.stepParticleTimer = 0;
    this.isRemote = false; this.displayName = '';
    this.targetX = x; this.targetY = y; this.targetVx = 0; this.targetVy = 0; this.targetFacing = 1;
    if (this.type === 'ember') { this.primaryColor = '#ff3300'; this.glowColor = '#ff6600'; this.highlightColor = '#ffea00'; }
    else { this.primaryColor = '#00b4d8'; this.glowColor = '#38bdf8'; this.highlightColor = '#caf0f8'; }
  }
  setSpawn(x, y) { this.spawnX = x; this.spawnY = y; }
  getHitbox() { return { x: this.x + 2, y: this.y + 2, width: this.width - 4, height: this.height - 2 }; }
  die(cause = 'hazard') {
    if (this.isDead || this.isVictory) return;
    this.isDead = true;
    this.vx = 0; this.vy = 0;
    if (this.audio) this.audio.playDeath();
    if (this.particles) {
      if (this.type === 'ember') this.particles.emitFireBurst(this.x + this.width / 2, this.y + this.height / 2, 24);
      else this.particles.emitWaterSplash(this.x + this.width / 2, this.y + this.height / 2, 24);
    }
  }
  update(dt, input, platforms, movingPlatforms, boxes = []) {
    this.animTime += dt;
    if (this.isDead) return;
    if (this.isVictory) { this.vx *= 0.8; this.vy += this.gravity * dt; PhysicsEngine.resolvePlayerPhysics(this, platforms, movingPlatforms, dt); return; }
    this.blinkTimer -= dt;
    if (this.blinkTimer <= 0) { this.isBlinking = !this.isBlinking; this.blinkTimer = this.isBlinking ? 0.12 : (2 + Math.random() * 4); }
    if (input.jump) { this.jumpBufferTimer = this.jumpBufferMax; } else { this.jumpBufferTimer = Math.max(0, this.jumpBufferTimer - dt); }
    if (this.isGrounded) { this.coyoteTimer = this.coyoteMax; } else { this.coyoteTimer = Math.max(0, this.coyoteTimer - dt); }
    let targetVx = 0;
    if (input.left && !input.right) { targetVx = -this.speed; this.facing = -1; }
    else if (input.right && !input.left) { targetVx = this.speed; this.facing = 1; }
    const currentFriction = this.isGrounded ? this.friction : this.airFriction;
    if (targetVx !== 0) {
      if (Math.sign(this.vx) !== Math.sign(targetVx) && this.vx !== 0) this.vx = 0;
      this.vx += Math.sign(targetVx) * this.accel * dt;
      if (Math.abs(this.vx) > this.speed) this.vx = targetVx;
      this.walkCycle += dt * 14;
    } else {
      if (this.vx > 0) this.vx = Math.max(0, this.vx - currentFriction * dt);
      else if (this.vx < 0) this.vx = Math.min(0, this.vx + currentFriction * dt);
      this.walkCycle = 0;
    }
    if (this.jumpBufferTimer > 0 && this.coyoteTimer > 0) {
      this.vy = this.jumpForce; this.jumpBufferTimer = 0; this.coyoteTimer = 0; this.isGrounded = false;
      this.scaleX = 0.8; this.scaleY = 1.25;
      if (this.audio) this.audio.playJump(this.type === 'ember');
      if (this.particles) this.particles.emitDust(this.x + this.width / 2, this.y + this.height, 4);
    }
    if (!input.jump && this.vy < -180) this.vy += 1300 * dt;
    this.vy = Math.min(this.maxFallSpeed, this.vy + this.gravity * dt);
    this.wasGrounded = this.isGrounded;
    PhysicsEngine.resolvePlayerPhysics(this, platforms, movingPlatforms, dt);
    for (const box of boxes) {
      const hb = this.getHitbox();
      if (PhysicsEngine.checkAABB(hb, box)) {
        if (this.vx > 0 && hb.x + hb.width <= box.x + 10) box.x += this.vx * dt * 0.7;
        else if (this.vx < 0 && hb.x >= box.x + box.width - 10) box.x += this.vx * dt * 0.7;
      }
    }
    if (!this.wasGrounded && this.isGrounded) {
      this.scaleX = 1.3; this.scaleY = 0.75;
      if (this.audio) this.audio.playLand();
      if (this.particles) this.particles.emitDust(this.x + this.width / 2, this.y + this.height, 6);
    }
    this.scaleX += (1 - this.scaleX) * 14 * dt;
    this.scaleY += (1 - this.scaleY) * 14 * dt;
    if (this.isGrounded && Math.abs(this.vx) > 30 && this.particles) {
      this.stepParticleTimer += dt;
      if (this.stepParticleTimer > 0.12) {
        this.stepParticleTimer = 0;
        const color = this.type === 'ember' ? '#ff6600' : '#38bdf8';
        this.particles.emit({ x: this.x + this.width / 2 - this.facing * 6, y: this.y + this.height - 2, vx: -this.facing * 18 + (Math.random() - 0.5) * 8, vy: -12 - Math.random() * 15, size: 2.5, endSize: 0, color, life: 0.3, glow: true });
      }
    }
  }
  applyRemoteState(state) {
    if (!state) return;
    this.targetX = state.x; this.targetY = state.y; this.targetVx = state.vx || 0; this.targetVy = state.vy || 0; this.targetFacing = state.facing || 1;
    this.isGrounded = !!state.isGrounded; this.animTime = state.animTime || this.animTime;
    if (state.scaleX !== undefined) this.scaleX = state.scaleX;
    if (state.scaleY !== undefined) this.scaleY = state.scaleY;
    if (state.isDead && !this.isDead) this.die('remote');
    if (state.isVictory) this.isVictory = true;
  }
  updateRemote(dt) {
    this.animTime += dt;
    if (this.isDead) return;
    const lerpFactor = Math.min(1.0, 18 * dt);
    this.x += (this.targetX - this.x) * lerpFactor; this.y += (this.targetY - this.y) * lerpFactor;
    this.vx = this.targetVx; this.vy = this.targetVy; this.facing = this.targetFacing;
    if (Math.abs(this.vx) > 20) this.walkCycle += dt * 14; else this.walkCycle = 0;
  }
  render(ctx) {
    if (this.isDead) return;
    ctx.save();
    const cx = this.x + this.width / 2;
    const feetY = this.y + this.height; // Exact ground contact point

    if (this.displayName) {
      ctx.save(); ctx.shadowBlur = 0; ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      const tagText = `${this.type === 'ember' ? '🔥' : '💧'} ${this.displayName}`;
      ctx.font = 'bold 11px Tajawal, sans-serif';
      const textWidth = ctx.measureText(tagText).width;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(cx - textWidth / 2 - 6, this.y - 18, textWidth + 12, 16, 6);
      else ctx.rect(cx - textWidth / 2 - 6, this.y - 18, textWidth + 12, 16);
      ctx.fill();
      ctx.fillStyle = this.type === 'ember' ? '#ffea00' : '#38bdf8'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(tagText, cx, this.y - 10); ctx.restore();
    }

    ctx.translate(cx, feetY);
    ctx.scale(this.facing * this.scaleX * 1.15, this.scaleY * 1.15);
    if (this.type === 'ember') this.renderFireCharacter(ctx);
    else this.renderWaterCharacter(ctx);
    ctx.restore();
  }

  renderFireCharacter(ctx) {
    const t = this.animTime * 8;
    const f1 = Math.sin(t) * 1.0;
    const f2 = Math.cos(t * 1.1) * 1.2;
    const f3 = Math.sin(t * 1.4) * 0.9;

    // Glowing aura
    ctx.shadowColor = '#ff5500';
    ctx.shadowBlur = 10;

    // ─── 1. Flame Head ───
    const headGrad = ctx.createRadialGradient(0, -30, 2, 0, -32, 18);
    headGrad.addColorStop(0, '#fff59d');
    headGrad.addColorStop(0.25, '#ffb300');
    headGrad.addColorStop(0.65, '#f4511e');
    headGrad.addColorStop(1, '#b71c1c');

    ctx.fillStyle = headGrad;
    ctx.beginPath();
    // Left jaw
    ctx.moveTo(-10, -22);
    // Left flame tips
    ctx.quadraticCurveTo(-14, -30 + f1, -12, -37 + f2);
    ctx.lineTo(-8, -34 + f1);
    // Center-left spike
    ctx.quadraticCurveTo(-10, -43 + f3, -5, -45 + f1);
    ctx.lineTo(-2, -40 + f2);
    // Main tall center flame
    ctx.quadraticCurveTo(0, -50 + f1, 3, -47 + f2);
    ctx.lineTo(5, -40 + f3);
    // Center-right spike
    ctx.quadraticCurveTo(11, -43 + f2, 9, -36 + f1);
    ctx.lineTo(8, -32 + f3);
    // Right flame curve
    ctx.quadraticCurveTo(14, -30 - f3, 11, -22);
    // Rounded chin
    ctx.quadraticCurveTo(8, -15, 0, -14.5);
    ctx.quadraticCurveTo(-8, -15, -10, -22);
    ctx.closePath();
    ctx.fill();

    // Crisp outline
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#1a0400';
    ctx.lineWidth = 1.6;
    ctx.lineJoin = 'round';
    ctx.stroke();

    // Warm core highlight
    const coreGrad = ctx.createRadialGradient(0, -28, 1, 0, -28, 7);
    coreGrad.addColorStop(0, 'rgba(255, 255, 220, 0.55)');
    coreGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = coreGrad;
    ctx.beginPath();
    ctx.arc(0, -28, 7, 0, Math.PI * 2);
    ctx.fill();

    // ─── 2. Classic Expressive Eyes ───
    if (!this.isBlinking) {
      // Slanted confident eyebrows
      ctx.strokeStyle = '#2b0600';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(-7.5, -31.5); ctx.lineTo(-2.2, -30.0);
      ctx.moveTo(2.2, -30.0); ctx.lineTo(7.5, -31.5);
      ctx.stroke();

      // Left Eye (Clean stylized oval)
      ctx.fillStyle = '#ffea00';
      ctx.strokeStyle = '#1a0400';
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.ellipse(-4.6, -25.5, 3.2, 3.6, -0.08, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Pupil
      ctx.fillStyle = '#110200';
      ctx.beginPath();
      ctx.arc(-3.8, -25.5, 1.8, 0, Math.PI * 2);
      ctx.fill();

      // Specular shine
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(-4.4, -26.6, 0.8, 0, Math.PI * 2);
      ctx.fill();

      // Right Eye
      ctx.fillStyle = '#ffea00';
      ctx.strokeStyle = '#1a0400';
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.ellipse(4.6, -25.5, 3.2, 3.6, 0.08, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Pupil
      ctx.fillStyle = '#110200';
      ctx.beginPath();
      ctx.arc(5.4, -25.5, 1.8, 0, Math.PI * 2);
      ctx.fill();

      // Specular shine
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(4.8, -26.6, 0.8, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.strokeStyle = '#1a0400';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(-7.5, -25.5); ctx.lineTo(-1.8, -25.5);
      ctx.moveTo(1.8, -25.5); ctx.lineTo(7.5, -25.5);
      ctx.stroke();
    }

    // ─── 3. Cheerful Smirk ───
    ctx.strokeStyle = '#1a0400';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0.6, -19.5, 3.2, 0.15 * Math.PI, 0.85 * Math.PI, false);
    ctx.stroke();

    // ─── 4. Torso & Limbs (Grounded precisely at y = 0) ───
    const legSwing = (this.isGrounded && Math.abs(this.vx) > 10) ? Math.sin(this.walkCycle) * 5 : 0;
    const armSwing = Math.sin(this.walkCycle) * 4.5;

    // Torso
    const bodyGrad = ctx.createLinearGradient(0, -15, 0, -6);
    bodyGrad.addColorStop(0, '#f4511e');
    bodyGrad.addColorStop(1, '#c62828');
    ctx.fillStyle = bodyGrad;
    ctx.strokeStyle = '#1a0400';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(-4, -15, 8, 8, 2.5);
    else ctx.rect(-4, -15, 8, 8);
    ctx.fill();
    ctx.stroke();

    // Arms
    ctx.lineWidth = 2.6;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#1a0400';
    ctx.beginPath();
    ctx.moveTo(-3, -13); ctx.lineTo(-6.5, -8 - armSwing);
    ctx.moveTo(3, -13); ctx.lineTo(6.5, -8 + armSwing);
    ctx.stroke();
    ctx.strokeStyle = '#ff5722';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(-3, -13); ctx.lineTo(-6.5, -8 - armSwing);
    ctx.moveTo(3, -13); ctx.lineTo(6.5, -8 + armSwing);
    ctx.stroke();

    // Legs (feet precisely touching y = 0)
    ctx.strokeStyle = '#1a0400';
    ctx.lineWidth = 3.0;
    ctx.beginPath();
    ctx.moveTo(-2.2, -7); ctx.lineTo(-3.2 - legSwing, 0);
    ctx.moveTo(2.2, -7); ctx.lineTo(3.2 + legSwing, 0);
    ctx.stroke();
    ctx.strokeStyle = '#d32f2f';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(-2.2, -7); ctx.lineTo(-3.2 - legSwing, 0);
    ctx.moveTo(2.2, -7); ctx.lineTo(3.2 + legSwing, 0);
    ctx.stroke();
  }

  renderWaterCharacter(ctx) {
    const t = this.animTime * 7;
    const w1 = Math.sin(t) * 0.9;
    const w2 = Math.cos(t * 1.1) * 0.9;

    // Glowing cyan aura
    ctx.shadowColor = '#00d4ff';
    ctx.shadowBlur = 10;

    // ─── 1. Water Drop Head & Hair ───
    const headGrad = ctx.createRadialGradient(0, -29, 2, 0, -31, 18);
    headGrad.addColorStop(0, '#ffffff');
    headGrad.addColorStop(0.3, '#7dd3fc');
    headGrad.addColorStop(0.7, '#0284c7');
    headGrad.addColorStop(1, '#034570');

    ctx.fillStyle = headGrad;
    ctx.beginPath();
    // Left side ponytail droplet swooping down
    ctx.moveTo(-10, -22);
    ctx.quadraticCurveTo(-14, -20 + w1, -12, -15 + w1);
    ctx.quadraticCurveTo(-9, -16, -7.5, -21);
    ctx.quadraticCurveTo(-13, -29, -10, -36);
    // Smooth topknot bun & droplet tip
    ctx.quadraticCurveTo(-7, -43, -3, -46 + w1);
    ctx.quadraticCurveTo(0, -50 + w1, 3, -46 + w2);
    ctx.quadraticCurveTo(8, -41, 10.5, -33);
    // Right cheek curve
    ctx.quadraticCurveTo(13, -25, 11, -22);
    // Rounded chin
    ctx.quadraticCurveTo(8, -15, 0, -14.5);
    ctx.quadraticCurveTo(-8, -15, -10, -22);
    ctx.closePath();
    ctx.fill();

    // Crisp outline
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#011e33';
    ctx.lineWidth = 1.6;
    ctx.lineJoin = 'round';
    ctx.stroke();

    // Topknot bun highlight
    ctx.fillStyle = '#bae6fd';
    ctx.beginPath();
    ctx.arc(0, -44 + w1, 3.0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#011e33';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Sleek curved water hair gleam
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.beginPath();
    ctx.ellipse(-3.0, -34, 3.5, 1.4, -0.25, 0, Math.PI * 2);
    ctx.fill();

    // Soft blush on cheeks
    ctx.fillStyle = 'rgba(56, 189, 248, 0.45)';
    ctx.beginPath();
    ctx.arc(-5.5, -20, 1.8, 0, Math.PI * 2);
    ctx.arc(5.5, -20, 1.8, 0, Math.PI * 2);
    ctx.fill();

    // ─── 2. Cute Arched Anime Eyes ───
    if (!this.isBlinking) {
      // Curved upper water eyebrows
      ctx.strokeStyle = '#02385c';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(-4.6, -30.0, 3.0, 1.15 * Math.PI, 1.85 * Math.PI);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(4.6, -30.0, 3.0, 1.15 * Math.PI, 1.85 * Math.PI);
      ctx.stroke();

      // Left Eye
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#011e33';
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.ellipse(-4.6, -25.5, 3.2, 3.6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Aqua iris
      ctx.fillStyle = '#0284c7';
      ctx.beginPath();
      ctx.arc(-4.4, -25.5, 2.0, 0, Math.PI * 2);
      ctx.fill();

      // Dark pupil
      ctx.fillStyle = '#011627';
      ctx.beginPath();
      ctx.arc(-4.2, -25.5, 1.3, 0, Math.PI * 2);
      ctx.fill();

      // Sparkle dot
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(-4.8, -26.6, 0.8, 0, Math.PI * 2);
      ctx.fill();

      // Upper lash flick
      ctx.strokeStyle = '#011e33';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(-4.6, -25.5, 3.2, 1.15 * Math.PI, 1.85 * Math.PI);
      ctx.stroke();

      // Right Eye
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#011e33';
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.ellipse(4.6, -25.5, 3.2, 3.6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Aqua iris
      ctx.fillStyle = '#0284c7';
      ctx.beginPath();
      ctx.arc(4.8, -25.5, 2.0, 0, Math.PI * 2);
      ctx.fill();

      // Dark pupil
      ctx.fillStyle = '#011627';
      ctx.beginPath();
      ctx.arc(5.0, -25.5, 1.3, 0, Math.PI * 2);
      ctx.fill();

      // Sparkle dot
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(4.4, -26.6, 0.8, 0, Math.PI * 2);
      ctx.fill();

      // Upper lash flick
      ctx.strokeStyle = '#011e33';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(4.6, -25.5, 3.2, 1.15 * Math.PI, 1.85 * Math.PI);
      ctx.stroke();
    } else {
      ctx.strokeStyle = '#011e33';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(-7.5, -25.5); ctx.lineTo(-1.8, -25.5);
      ctx.moveTo(1.8, -25.5); ctx.lineTo(7.5, -25.5);
      ctx.stroke();
    }

    // ─── 3. Sweet Smile ───
    ctx.strokeStyle = '#011e33';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0.5, -19.5, 3.0, 0.15 * Math.PI, 0.85 * Math.PI, false);
    ctx.stroke();

    // ─── 4. Torso & Limbs (Grounded precisely at y = 0) ───
    const legSwing = (this.isGrounded && Math.abs(this.vx) > 10) ? Math.sin(this.walkCycle) * 5 : 0;
    const armSwing = Math.sin(this.walkCycle) * 4.5;

    // Torso
    const bodyGrad = ctx.createLinearGradient(0, -15, 0, -6);
    bodyGrad.addColorStop(0, '#0284c7');
    bodyGrad.addColorStop(1, '#03588f');
    ctx.fillStyle = bodyGrad;
    ctx.strokeStyle = '#011e33';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(-4, -15, 8, 8, 2.5);
    else ctx.rect(-4, -15, 8, 8);
    ctx.fill();
    ctx.stroke();

    // Arms
    ctx.lineWidth = 2.6;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#011e33';
    ctx.beginPath();
    ctx.moveTo(-3, -13); ctx.lineTo(-6.5, -8 - armSwing);
    ctx.moveTo(3, -13); ctx.lineTo(6.5, -8 + armSwing);
    ctx.stroke();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(-3, -13); ctx.lineTo(-6.5, -8 - armSwing);
    ctx.moveTo(3, -13); ctx.lineTo(6.5, -8 + armSwing);
    ctx.stroke();

    // Legs (feet precisely touching y = 0)
    ctx.strokeStyle = '#011e33';
    ctx.lineWidth = 3.0;
    ctx.beginPath();
    ctx.moveTo(-2.2, -7); ctx.lineTo(-3.2 - legSwing, 0);
    ctx.moveTo(2.2, -7); ctx.lineTo(3.2 + legSwing, 0);
    ctx.stroke();
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(-2.2, -7); ctx.lineTo(-3.2 - legSwing, 0);
    ctx.moveTo(2.2, -7); ctx.lineTo(3.2 + legSwing, 0);
    ctx.stroke();
  }
}

// ─── HazardManager ───────────────────────────────────────────
class HazardManager {
  constructor(particles) { this.particles = particles; this.hazards = []; this.animTime = 0; }
  addLava(x, y, width, height) { this.hazards.push({ type: 'lava', x, y, width, height, lethalTo: ['tide'] }); }
  addWater(x, y, width, height) { this.hazards.push({ type: 'water', x, y, width, height, lethalTo: ['ember'] }); }
  addAcid(x, y, width, height) { this.hazards.push({ type: 'acid', x, y, width, height, lethalTo: ['ember', 'tide'] }); }
  addSpikes(x, y, width, height, orientation = 'up') { this.hazards.push({ type: 'spikes', x, y, width, height, orientation, lethalTo: ['ember', 'tide'] }); }
  addLaser(x, y, width, height, timerCycle = 0, isVertical = false) { this.hazards.push({ type: 'laser', x, y, width, height, timerCycle, isVertical, active: true, lethalTo: ['ember', 'tide'] }); }
  update(dt, players) {
    this.animTime += dt;
    for (const h of this.hazards) {
      if (h.type === 'laser' && h.timerCycle > 0) h.active = (Math.floor(this.animTime / h.timerCycle) % 2 === 0);
      for (const p of players) {
        if (p.isDead || p.isVictory) continue;
        if (h.type === 'laser' && !h.active) continue;
        const hazardHitbox = { x: h.x + 4, y: h.y + 6, width: h.width - 8, height: h.height - 6 };
        if (PhysicsEngine.checkAABB(p.getHitbox(), hazardHitbox) && h.lethalTo.includes(p.type)) p.die(h.type);
      }
    }
  }
  render(ctx) {
    const t = this.animTime;
    for (const h of this.hazards) {
      ctx.save();
      if (h.type === 'lava') this.renderLavaBasin(ctx, h, t);
      else if (h.type === 'water') this.renderWaterBasin(ctx, h, t);
      else if (h.type === 'acid') this.renderAcidBasin(ctx, h, t);
      else if (h.type === 'spikes') this.renderSpikes(ctx, h);
      else if (h.type === 'laser') this.renderLaser(ctx, h, t);
      ctx.restore();
    }
  }
  renderLavaBasin(ctx, h, t) {
    ctx.fillStyle = '#1c130b';
    ctx.strokeStyle = '#0d0804';
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    ctx.moveTo(h.x - 3, h.y);
    ctx.lineTo(h.x + h.width + 3, h.y);
    ctx.lineTo(h.x + h.width - 2, h.y + h.height + 4);
    ctx.lineTo(h.x + 2, h.y + h.height + 4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.shadowColor = '#ff3300';
    ctx.shadowBlur = 12;

    const lavaGrad = ctx.createLinearGradient(0, h.y, 0, h.y + h.height);
    lavaGrad.addColorStop(0, '#ffcc00');
    lavaGrad.addColorStop(0.3, '#ff3b00');
    lavaGrad.addColorStop(0.85, '#cc0000');
    lavaGrad.addColorStop(1, '#660000');

    ctx.fillStyle = lavaGrad;
    ctx.beginPath();
    ctx.moveTo(h.x, h.y + 2);

    const segs = Math.ceil(h.width / 16);
    for (let i = 0; i <= segs; i++) {
      const sx = h.x + (i * 16);
      const sy = h.y + 2 + Math.sin(t * 5 + i * 1.1) * 2.5;
      ctx.lineTo(sx, sy);
    }
    ctx.lineTo(h.x + h.width - 2, h.y + h.height);
    ctx.lineTo(h.x + 2, h.y + h.height);
    ctx.closePath();
    ctx.fill();

    ctx.shadowBlur = 4;
    ctx.strokeStyle = '#ffe600';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    for (let i = 0; i <= segs; i++) {
      const sx = h.x + (i * 16);
      const sy = h.y + 2 + Math.sin(t * 5 + i * 1.1) * 2.5;
      if (i === 0) ctx.moveTo(sx, sy);
      else ctx.lineTo(sx, sy);
    }
    ctx.stroke();

    ctx.fillStyle = '#2d6a4f';
    ctx.beginPath();
    ctx.arc(h.x - 2, h.y + 4, 3, 0, Math.PI * 2);
    ctx.arc(h.x + 3, h.y + 7, 2.5, 0, Math.PI * 2);
    ctx.arc(h.x + h.width + 1, h.y + 3, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  renderWaterBasin(ctx, h, t) {
    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = '#020617';
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    ctx.moveTo(h.x - 3, h.y);
    ctx.lineTo(h.x + h.width + 3, h.y);
    ctx.lineTo(h.x + h.width - 2, h.y + h.height + 4);
    ctx.lineTo(h.x + 2, h.y + h.height + 4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.shadowColor = '#00b4d8';
    ctx.shadowBlur = 10;

    const waterGrad = ctx.createLinearGradient(0, h.y, 0, h.y + h.height);
    waterGrad.addColorStop(0, '#caf0f8');
    waterGrad.addColorStop(0.3, '#00b4d8');
    waterGrad.addColorStop(0.85, '#0077b6');
    waterGrad.addColorStop(1, '#03045e');

    ctx.fillStyle = waterGrad;
    ctx.beginPath();
    ctx.moveTo(h.x, h.y + 2);

    const segs = Math.ceil(h.width / 16);
    for (let i = 0; i <= segs; i++) {
      const sx = h.x + (i * 16);
      const sy = h.y + 2 + Math.sin(t * 4 + i * 0.9) * 2.2;
      ctx.lineTo(sx, sy);
    }
    ctx.lineTo(h.x + h.width - 2, h.y + h.height);
    ctx.lineTo(h.x + 2, h.y + h.height);
    ctx.closePath();
    ctx.fill();

    ctx.shadowBlur = 4;
    ctx.strokeStyle = '#e0f8ff';
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    for (let i = 0; i <= segs; i++) {
      const sx = h.x + (i * 16);
      const sy = h.y + 2 + Math.sin(t * 4 + i * 0.9) * 2.2;
      if (i === 0) ctx.moveTo(sx, sy);
      else ctx.lineTo(sx, sy);
    }
    ctx.stroke();

    ctx.fillStyle = '#2d6a4f';
    ctx.beginPath();
    ctx.arc(h.x - 2, h.y + 4, 3, 0, Math.PI * 2);
    ctx.arc(h.x + h.width + 1, h.y + 3, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  renderAcidBasin(ctx, h, t) {
    ctx.fillStyle = '#112211';
    ctx.strokeStyle = '#051205';
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    ctx.moveTo(h.x - 3, h.y);
    ctx.lineTo(h.x + h.width + 3, h.y);
    ctx.lineTo(h.x + h.width - 2, h.y + h.height + 4);
    ctx.lineTo(h.x + 2, h.y + h.height + 4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.shadowColor = '#38b000';
    ctx.shadowBlur = 12;
    const acidGrad = ctx.createLinearGradient(0, h.y, 0, h.y + h.height);
    acidGrad.addColorStop(0, '#ccff33');
    acidGrad.addColorStop(0.3, '#38b000');
    acidGrad.addColorStop(0.85, '#004b23');
    acidGrad.addColorStop(1, '#002914');
    ctx.fillStyle = acidGrad;
    ctx.beginPath();
    ctx.moveTo(h.x, h.y + 2);
    const segs = Math.ceil(h.width / 14);
    for (let i = 0; i <= segs; i++) {
      const sx = h.x + (i * 14);
      const sy = h.y + 2 + Math.sin(t * 4.5 + i * 0.9) * 2;
      ctx.lineTo(sx, sy);
    }
    ctx.lineTo(h.x + h.width - 2, h.y + h.height);
    ctx.lineTo(h.x + 2, h.y + h.height);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#d9ff00';
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    for (let i = 0; i <= segs; i++) {
      const sx = h.x + (i * 14);
      const sy = h.y + 2 + Math.sin(t * 4.5 + i * 0.9) * 2;
      if (i === 0) ctx.moveTo(sx, sy); else ctx.lineTo(sx, sy);
    }
    ctx.stroke();
  }
  renderSpikes(ctx, h) {
    ctx.fillStyle = '#475569'; ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1.2;
    const spikeWidth = 14, count = Math.floor(h.width / spikeWidth);
    for (let i = 0; i < count; i++) {
      const sx = h.x + i * spikeWidth;
      ctx.beginPath();
      if (h.orientation === 'up') { ctx.moveTo(sx, h.y + h.height); ctx.lineTo(sx + spikeWidth / 2, h.y + 2); ctx.lineTo(sx + spikeWidth, h.y + h.height); }
      else { ctx.moveTo(sx, h.y); ctx.lineTo(sx + spikeWidth / 2, h.y + h.height - 2); ctx.lineTo(sx + spikeWidth, h.y); }
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(sx + spikeWidth / 2, h.orientation === 'up' ? h.y + 3 : h.y + h.height - 3, 1.2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#475569';
    }
  }
  renderLaser(ctx, h, t) {
    if (!h.active) return;
    ctx.shadowColor = '#ef4444'; ctx.shadowBlur = 14; ctx.fillStyle = '#f87171'; ctx.fillRect(h.x, h.y, h.width, h.height);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(h.x + h.width * 0.3, h.y, h.width * 0.4, h.height);
  }
}

// ─── MechanismManager ────────────────────────────────────────
class MechanismManager {
  constructor(audio, particles) {
    this.audio = audio; this.particles = particles;
    this.pressurePlates = []; this.levers = []; this.doors = [];
    this.movingPlatforms = []; this.pushBoxes = []; this.elementalRunes = []; this.dualSwitches = [];
  }
  addPushBox(id, x, y, width = 36, height = 36) { this.pushBoxes.push({ id, x, y, width, height, vx: 0, vy: 0, gravity: 1200, isGrounded: false, solid: true }); }
  addPressurePlate(id, x, y, width = 36, height = 8, targetIds = [], color = '#a855f7', isLatching = false) { this.pressurePlates.push({ id, x, y, width, height, targetIds, isLatching, color, isPressed: false, pressProgress: 0 }); }
  addLever(id, x, y, width = 24, height = 28, targetIds = [], defaultState = false) { this.levers.push({ id, x, y, width, height, targetIds, isOn: defaultState, angle: defaultState ? 0.6 : -0.6, cooldown: 0 }); }
  addDoor(id, x, y, width = 16, height = 64, openDirection = 'up', defaultOpen = false, color = '#fbbf24') {
    this.doors.push({ id, x, y, width, height, closedX: x, closedY: y, openX: x + (openDirection === 'right' ? width : openDirection === 'left' ? -width : 0), openY: y + (openDirection === 'down' ? height : openDirection === 'up' ? -height : 0), currentX: defaultOpen ? (openDirection === 'right' ? x + width : x) : x, currentY: defaultOpen ? (openDirection === 'up' ? y - height : y) : y, isOpen: defaultOpen, openRatio: defaultOpen ? 1.0 : 0.0, solid: !defaultOpen, color });
  }
  addMovingPlatform(id, x, y, width = 68, height = 14, waypoints = [], speed = 65, color = '#eab308', requiresTrigger = false, triggerId = null) {
    const allWaypoints = [{ x, y }, ...waypoints];
    this.movingPlatforms.push({ id, x, y, width, height, waypoints: allWaypoints, currentIndex: 0, targetIndex: 1 % allWaypoints.length, speed, color, requiresTrigger, triggerId, isActive: !requiresTrigger, dx: 0, dy: 0, solid: true });
  }
  addElementalRune(id, x, y, width = 32, height = 32, requiredElement = 'ember', targetIds = []) { this.elementalRunes.push({ id, x, y, width, height, requiredElement, targetIds, isActive: false, chargeTime: 0, maxCharge: 0.8 }); }
  addDualSwitch(id, x1, y1, x2, y2, targetIds = [], timeLimit = 2.5) { this.dualSwitches.push({ id, s1: { x: x1, y: y1, width: 28, height: 28, isHit: false, timer: 0 }, s2: { x: x2, y: y2, width: 28, height: 28, isHit: false, timer: 0 }, targetIds, timeLimit, isResolved: false }); }
  update(dt, players, platforms) {
    for (const box of this.pushBoxes) {
      box.vy += box.gravity * dt; box.y += box.vy * dt;
      for (const plat of platforms) { if (PhysicsEngine.checkAABB(box, plat) && box.vy > 0) { box.y = plat.y - box.height; box.vy = 0; box.isGrounded = true; } }
    }
    for (const pp of this.pressurePlates) {
      let isOccupied = false;
      const plateHitbox = { x: pp.x, y: pp.y - 4, width: pp.width, height: pp.height + 4 };
      for (const p of players) { if (!p.isDead && PhysicsEngine.checkAABB(p.getHitbox(), plateHitbox)) { isOccupied = true; break; } }
      if (!isOccupied) { for (const box of this.pushBoxes) { if (PhysicsEngine.checkAABB(box, plateHitbox)) { isOccupied = true; break; } } }
      if (isOccupied && !pp.isPressed) { pp.isPressed = true; if (this.audio) this.audio.playSwitch(true); if (this.particles) this.particles.emitSparkles(pp.x + pp.width / 2, pp.y, pp.color, 8); this.triggerTargets(pp.targetIds, true); }
      else if (!isOccupied && pp.isPressed && !pp.isLatching) { pp.isPressed = false; if (this.audio) this.audio.playSwitch(false); this.triggerTargets(pp.targetIds, false); }
      pp.pressProgress += ((pp.isPressed ? 1 : 0) - pp.pressProgress) * 16 * dt;
    }
    for (const lev of this.levers) {
      lev.cooldown = Math.max(0, lev.cooldown - dt);
      const levHitbox = { x: lev.x - 4, y: lev.y - 4, width: lev.width + 8, height: lev.height + 8 };
      for (const p of players) {
        if (p.isDead) continue;
        if (PhysicsEngine.checkAABB(p.getHitbox(), levHitbox) && lev.cooldown <= 0) {
          lev.isOn = !lev.isOn; lev.cooldown = 0.5;
          if (this.audio) this.audio.playSwitch(lev.isOn);
          if (this.particles) this.particles.emitSparkles(lev.x + lev.width / 2, lev.y + lev.height / 2, '#fbbf24', 8);
          this.triggerTargets(lev.targetIds, lev.isOn); break;
        }
      }
      lev.angle += ((lev.isOn ? 0.6 : -0.6) - lev.angle) * 12 * dt;
    }
    for (const d of this.doors) {
      const targetRatio = d.isOpen ? 1.0 : 0.0;
      if (Math.abs(d.openRatio - targetRatio) > 0.01) {
        d.openRatio += (targetRatio - d.openRatio) * 6 * dt;
        d.currentX = d.closedX + (d.openX - d.closedX) * d.openRatio;
        d.currentY = d.closedY + (d.openY - d.closedY) * d.openRatio;
        d.solid = d.openRatio < 0.85;
      } else { d.openRatio = targetRatio; d.solid = !d.isOpen; }
    }
    for (const mp of this.movingPlatforms) {
      if (!mp.isActive || mp.waypoints.length < 2) { mp.dx = 0; mp.dy = 0; continue; }
      const targetWP = mp.waypoints[mp.targetIndex];
      const distX = targetWP.x - mp.x, distY = targetWP.y - mp.y, dist = Math.hypot(distX, distY);
      if (dist < 2) { mp.x = targetWP.x; mp.y = targetWP.y; mp.currentIndex = mp.targetIndex; mp.targetIndex = (mp.targetIndex + 1) % mp.waypoints.length; mp.dx = 0; mp.dy = 0; }
      else { const step = Math.min(dist, mp.speed * dt); mp.x += (distX / dist) * step; mp.y += (distY / dist) * step; mp.dx = (distX / dist) * step; mp.dy = (distY / dist) * step; }
    }
  }
  triggerTargets(targetIds, activateState) {
    if (!targetIds || targetIds.length === 0) return;
    for (const id of targetIds) {
      const door = this.doors.find(d => d.id === id); if (door) { door.isOpen = activateState; if (this.audio) this.audio.playDoor(); }
      const mp = this.movingPlatforms.find(m => m.id === id); if (mp && mp.requiresTrigger) mp.isActive = activateState;
    }
  }
  render(ctx) {
    for (const pp of this.pressurePlates) {
      ctx.save(); ctx.fillStyle = '#2b2318'; ctx.strokeStyle = '#524330'; ctx.lineWidth = 1.5;
      ctx.fillRect(pp.x - 3, pp.y + 4, pp.width + 6, pp.height); ctx.strokeRect(pp.x - 3, pp.y + 4, pp.width + 6, pp.height);
      const sink = pp.pressProgress * 4; ctx.shadowColor = pp.color; ctx.shadowBlur = pp.isPressed ? 12 : 6; ctx.fillStyle = pp.color;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(pp.x, pp.y + sink, pp.width, pp.height - sink, [3, 3, 0, 0]); else ctx.rect(pp.x, pp.y + sink, pp.width, pp.height - sink);
      ctx.fill(); ctx.restore();
    }
    for (const lev of this.levers) {
      ctx.save();
      const cx = lev.x + lev.width / 2;
      const baseCy = lev.y + lev.height - 4;

      ctx.fillStyle = '#e5a50a';
      ctx.strokeStyle = '#1e1405';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(lev.x - 4, lev.y + lev.height);
      ctx.lineTo(lev.x + lev.width + 4, lev.y + lev.height);
      ctx.lineTo(lev.x + lev.width, lev.y + lev.height - 10);
      ctx.lineTo(lev.x, lev.y + lev.height - 10);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#fff475';
      ctx.shadowColor = '#fbbf24';
      ctx.shadowBlur = 8;
      ctx.fillRect(lev.x + 2, lev.y + lev.height - 7, lev.width - 4, 4);

      ctx.translate(cx, baseCy - 2);
      ctx.rotate(lev.angle);

      ctx.strokeStyle = '#1e1405';
      ctx.lineWidth = 5.0;
      ctx.beginPath();
      ctx.moveTo(0, 0); ctx.lineTo(0, -18);
      ctx.stroke();

      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 3.6;
      ctx.beginPath();
      ctx.moveTo(0, 0); ctx.lineTo(0, -18);
      ctx.stroke();

      ctx.fillStyle = '#ffd166';
      ctx.strokeStyle = '#1e1405';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(0, -18, 5.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#84cc16';
      ctx.beginPath();
      ctx.arc(0, -18, 2.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
      ctx.save();
      ctx.fillStyle = '#15803d';
      ctx.beginPath();
      ctx.arc(lev.x - 4, lev.y + lev.height - 6, 3.5, 0, Math.PI * 2);
      ctx.arc(lev.x + lev.width + 3, lev.y + lev.height - 5, 4, 0, Math.PI * 2);
      ctx.arc(lev.x + 2, lev.y + lev.height - 9, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    for (const box of this.pushBoxes) {
      ctx.save();
      const stoneGrad = ctx.createLinearGradient(box.x, box.y, box.x + box.width, box.y + box.height);
      stoneGrad.addColorStop(0, '#e2e8f0'); stoneGrad.addColorStop(0.5, '#cbd5e1'); stoneGrad.addColorStop(1, '#94a3b8');
      ctx.fillStyle = stoneGrad; ctx.strokeStyle = '#475569'; ctx.lineWidth = 2;
      ctx.fillRect(box.x, box.y, box.width, box.height); ctx.strokeRect(box.x, box.y, box.width, box.height);
      ctx.fillStyle = '#f59e0b'; const cSize = 7;
      ctx.fillRect(box.x, box.y, cSize, 3); ctx.fillRect(box.x, box.y, 3, cSize);
      ctx.fillRect(box.x + box.width - cSize, box.y, cSize, 3); ctx.fillRect(box.x + box.width - 3, box.y, 3, cSize);
      ctx.fillRect(box.x, box.y + box.height - 3, cSize, 3); ctx.fillRect(box.x, box.y + box.height - cSize, 3, cSize);
      ctx.fillRect(box.x + box.width - cSize, box.y + box.height - 3, cSize, 3); ctx.fillRect(box.x + box.width - 3, box.y + box.height - cSize, 3, cSize);
      ctx.restore();
    }
    for (const mp of this.movingPlatforms) {
      ctx.save(); ctx.shadowColor = mp.color; ctx.shadowBlur = 10;
      ctx.fillStyle = '#1e293b'; ctx.strokeStyle = mp.color; ctx.lineWidth = 2;
      ctx.fillRect(mp.x, mp.y, mp.width, mp.height); ctx.strokeRect(mp.x, mp.y, mp.width, mp.height);
      ctx.fillStyle = mp.color; ctx.fillRect(mp.x + 4, mp.y + 3, mp.width - 8, mp.height - 6); ctx.restore();
    }
    for (const d of this.doors) {
      ctx.save(); ctx.strokeStyle = '#475569'; ctx.lineWidth = 2;
      ctx.strokeRect(d.closedX, d.closedY, d.width, d.height);
      ctx.fillStyle = '#334155'; ctx.fillRect(d.currentX, d.currentY, d.width, d.height); ctx.strokeRect(d.currentX, d.currentY, d.width, d.height);
      ctx.fillStyle = d.color || '#fbbf24'; ctx.shadowColor = d.color || '#fbbf24'; ctx.shadowBlur = 6;
      ctx.fillRect(d.currentX + 2, d.currentY + d.height * 0.45, d.width - 4, 6); ctx.restore();
    }
  }
}

// ─── CheckpointManager ───────────────────────────────────────
class CheckpointManager {
  constructor(audio, particles) { this.audio = audio; this.particles = particles; this.checkpoints = []; this.activeId = null; this.animTime = 0; }
  addCheckpoint(id, x, y, width = 32, height = 48) { this.checkpoints.push({ id, x, y, width, height, isActivated: false }); }
  update(dt, players) {
    this.animTime += dt;
    for (const cp of this.checkpoints) {
      if (cp.isActivated) continue;
      const hitbox = { x: cp.x - 6, y: cp.y, width: cp.width + 12, height: cp.height };
      let touched = false;
      for (const p of players) { if (!p.isDead && PhysicsEngine.checkAABB(p.getHitbox(), hitbox)) { touched = true; break; } }
      if (touched) {
        cp.isActivated = true; this.activeId = cp.id;
        for (const p of players) p.setSpawn(cp.x + (p.type === 'ember' ? -8 : 16), cp.y + cp.height - p.height);
        if (this.audio) this.audio.playCheckpoint();
        if (this.particles) { this.particles.emitSparkles(cp.x + cp.width / 2, cp.y + 12, '#38bdf8', 16); this.particles.emitSparkles(cp.x + cp.width / 2, cp.y + 12, '#ff7800', 16); }
      }
    }
  }
  render(ctx) {
    const t = this.animTime;
    for (const cp of this.checkpoints) {
      ctx.save();
      ctx.fillStyle = '#1e293b'; ctx.strokeStyle = '#475569'; ctx.lineWidth = 2;
      ctx.fillRect(cp.x + 4, cp.y + 16, cp.width - 8, cp.height - 16); ctx.strokeRect(cp.x + 4, cp.y + 16, cp.width - 8, cp.height - 16);
      const orbY = cp.y + 10 + Math.sin(t * 3) * 2, orbX = cp.x + cp.width / 2;
      if (cp.isActivated) {
        ctx.shadowColor = '#38bdf8'; ctx.shadowBlur = 12;
        ctx.fillStyle = '#ff7800'; ctx.beginPath(); ctx.arc(orbX - 3, orbY, 5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#38bdf8'; ctx.beginPath(); ctx.arc(orbX + 3, orbY, 5, 0, Math.PI * 2); ctx.fill();
      } else {
        ctx.fillStyle = '#64748b'; ctx.beginPath(); ctx.arc(orbX, orbY, 6, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }
  }
}

// ─── CollectibleManager ──────────────────────────────────────
class CollectibleManager {
  constructor(audio, particles) { this.audio = audio; this.particles = particles; this.items = []; this.totalCount = 0; this.collectedCount = 0; this.animTime = 0; }
  addShard(type, x, y) { this.items.push({ type, x, y, width: 22, height: 24, collected: false, pulseOffset: Math.random() * Math.PI * 2 }); this.totalCount++; }
  update(dt, players) {
    this.animTime += dt;
    for (const item of this.items) {
      if (item.collected) continue;
      const hitbox = { x: item.x - 2, y: item.y - 2, width: item.width + 4, height: item.height + 4 };
      for (const p of players) {
        if (p.isDead) continue;
        let canCollect = (item.type === 'fire' && p.type === 'ember') || (item.type === 'water' && p.type === 'tide') || item.type === 'universal';
        if (canCollect && PhysicsEngine.checkAABB(p.getHitbox(), hitbox)) {
          item.collected = true; this.collectedCount++;
          if (this.audio) this.audio.playShard(item.type);
          if (this.particles) { const color = item.type === 'fire' ? '#ff0033' : '#00d4ff'; this.particles.emitSparkles(item.x + item.width / 2, item.y + item.height / 2, color, 14); }
          break;
        }
      }
    }
  }
  render(ctx) {
    const t = this.animTime;
    for (const item of this.items) {
      if (item.collected) continue;
      ctx.save();
      const cx = item.x + item.width / 2, cy = item.y + item.height / 2;
      const isFire = item.type === 'fire';
      const glowColor = isFire ? '#ff0033' : '#00d4ff';

      ctx.shadowColor = glowColor;
      ctx.shadowBlur = 10;

      const w = 22, h = 20;

      ctx.beginPath();
      ctx.moveTo(cx - w * 0.35, cy - h * 0.45);
      ctx.lineTo(cx + w * 0.35, cy - h * 0.45);
      ctx.lineTo(cx + w * 0.5, cy - h * 0.1);
      ctx.lineTo(cx, cy + h * 0.5);
      ctx.lineTo(cx - w * 0.5, cy - h * 0.1);
      ctx.closePath();

      ctx.fillStyle = isFire ? '#e60026' : '#00b4d8';
      ctx.fill();

      ctx.shadowBlur = 0;
      ctx.strokeStyle = '#110000';
      ctx.lineWidth = 1.8;
      ctx.stroke();

      ctx.fillStyle = isFire ? '#ff6680' : '#90e0ef';
      ctx.beginPath();
      ctx.moveTo(cx - w * 0.25, cy - h * 0.4);
      ctx.lineTo(cx + w * 0.25, cy - h * 0.4);
      ctx.lineTo(cx + w * 0.15, cy - h * 0.1);
      ctx.lineTo(cx - w * 0.15, cy - h * 0.1);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = isFire ? '#ff99aa' : '#caf0f8';
      ctx.beginPath();
      ctx.moveTo(cx - w * 0.35, cy - h * 0.45);
      ctx.lineTo(cx - w * 0.25, cy - h * 0.4);
      ctx.lineTo(cx - w * 0.15, cy - h * 0.1);
      ctx.lineTo(cx - w * 0.5, cy - h * 0.1);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = '#110000';
      ctx.lineWidth = 1.0;
      ctx.beginPath();
      ctx.moveTo(cx - w * 0.15, cy - h * 0.1); ctx.lineTo(cx, cy + h * 0.5);
      ctx.moveTo(cx + w * 0.15, cy - h * 0.1); ctx.lineTo(cx, cy + h * 0.5);
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(cx - 3, cy - 4, 1.3, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  }
}

// ─── PortalGateway ───────────────────────────────────────────
class PortalGateway {
  constructor(emberGoal, tideGoal, audio, particles) {
    this.emberGoal = { x: emberGoal.x, y: emberGoal.y, width: emberGoal.width || 46, height: emberGoal.height || 64, isReached: false, symbol: '♂', color: '#ff2200' };
    this.tideGoal = { x: tideGoal.x, y: tideGoal.y, width: tideGoal.width || 46, height: tideGoal.height || 64, isReached: false, symbol: '♀', color: '#00d4ff' };
    this.audio = audio; this.particles = particles; this.isFullyCompleted = false; this.animTime = 0;
  }
  update(dt, players) {
    this.animTime += dt;
    let emberInSlot = false, tideInSlot = false;
    for (const p of players) {
      if (p.isDead) continue;
      if (p.type === 'ember' && PhysicsEngine.checkAABB(p.getHitbox(), this.emberGoal)) { emberInSlot = true; if (this.particles) this.particles.emitPortalRays(this.emberGoal.x + 23, this.emberGoal.y + 32, '#ff3300'); }
      else if (p.type === 'tide' && PhysicsEngine.checkAABB(p.getHitbox(), this.tideGoal)) { tideInSlot = true; if (this.particles) this.particles.emitPortalRays(this.tideGoal.x + 23, this.tideGoal.y + 32, '#00d4ff'); }
    }
    this.emberGoal.isReached = emberInSlot; this.tideGoal.isReached = tideInSlot;
    if (emberInSlot && tideInSlot && !this.isFullyCompleted) {
      this.isFullyCompleted = true;
      if (this.audio) this.audio.playWin();
      if (this.particles) { this.particles.emitSparkles(this.emberGoal.x + 23, this.emberGoal.y + 32, '#ff3300', 20); this.particles.emitSparkles(this.tideGoal.x + 23, this.tideGoal.y + 32, '#00d4ff', 20); }
      for (const p of players) p.isVictory = true;
    }
    return this.isFullyCompleted;
  }
  render(ctx) {
    const t = this.animTime;
    this.renderStonePortal(ctx, this.emberGoal, '#ff2200', '#ff4400', '♂', t);
    this.renderStonePortal(ctx, this.tideGoal, '#00d4ff', '#38bdf8', '♀', t);
  }
  renderStonePortal(ctx, goal, glowColor, runeColor, symbol, t) {
    ctx.save();
    const cx = goal.x + goal.width / 2, cy = goal.y + goal.height / 2;

    // Stone Frame base
    ctx.fillStyle = '#4a3f2c';
    ctx.strokeStyle = '#18120a';
    ctx.lineWidth = 2.4;
    ctx.fillRect(goal.x - 6, goal.y - 8, goal.width + 12, goal.height + 8);
    ctx.strokeRect(goal.x - 6, goal.y - 8, goal.width + 12, goal.height + 8);

    // Ornate lintel top with carved trims
    ctx.fillStyle = '#63543b';
    ctx.fillRect(goal.x - 8, goal.y - 12, goal.width + 16, 8);
    ctx.strokeRect(goal.x - 8, goal.y - 12, goal.width + 16, 8);

    // Dark deep inner sanctum door
    const doorGrad = ctx.createLinearGradient(0, goal.y, 0, goal.y + goal.height);
    doorGrad.addColorStop(0, goal.isReached ? '#2d1f0f' : '#221a0f');
    doorGrad.addColorStop(1, goal.isReached ? '#180f05' : '#110b05');
    ctx.fillStyle = doorGrad;
    ctx.fillRect(goal.x, goal.y, goal.width, goal.height);
    ctx.strokeRect(goal.x, goal.y, goal.width, goal.height);

    // Inner door carved bevel panels
    ctx.strokeStyle = goal.isReached ? glowColor : 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1.2;
    ctx.strokeRect(goal.x + 3, goal.y + 3, goal.width - 6, goal.height - 6);

    // Door reached: divine vertical beams of light
    if (goal.isReached) {
      const beamGrad = ctx.createLinearGradient(cx, goal.y, cx, goal.y + goal.height);
      beamGrad.addColorStop(0, glowColor);
      beamGrad.addColorStop(0.5, 'rgba(255,255,255,0.8)');
      beamGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = beamGrad;
      ctx.fillRect(goal.x + 2, goal.y, goal.width - 4, goal.height);
    }

    // Brilliant pulsating neon glow for ♂ and ♀ symbols
    const pulse = 12 + Math.sin(t * 6) * 8;
    const isMale = symbol === '♂';

    // Glowing halo behind symbol
    const rad = 18 + Math.sin(t * 5) * 4;
    const haloGrad = ctx.createRadialGradient(cx, cy, 2, cx, cy, rad);
    haloGrad.addColorStop(0, goal.isReached ? 'rgba(255,255,255,0.9)' : (isMale ? 'rgba(255, 60, 0, 0.45)' : 'rgba(0, 200, 255, 0.45)'));
    haloGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = haloGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, rad, 0, Math.PI * 2);
    ctx.fill();

    // Outer glow pass
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = goal.isReached ? 28 : pulse * 1.6;
    ctx.fillStyle = goal.isReached ? '#ffffff' : runeColor;
    ctx.font = '900 36px "Tajawal", "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(symbol, cx, cy);

    // Inner hot-core white shine pass
    ctx.shadowBlur = pulse * 0.8;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(symbol, cx, cy);

    // Top arch glowing elemental gemstone
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 10;
    ctx.fillStyle = runeColor;
    ctx.beginPath();
    ctx.arc(cx, goal.y - 8, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.0;
    ctx.stroke();

    // Moss / temple vines on stone borders
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#1e3a1e';
    ctx.beginPath();
    ctx.arc(goal.x - 5, goal.y + 12, 3.5, 0, Math.PI * 2);
    ctx.arc(goal.x - 3, goal.y + 20, 3.0, 0, Math.PI * 2);
    ctx.arc(goal.x - 5, goal.y + 38, 3.5, 0, Math.PI * 2);
    ctx.arc(goal.x + goal.width + 4, goal.y + 10, 3.5, 0, Math.PI * 2);
    ctx.arc(goal.x + goal.width + 3, goal.y + 28, 3.2, 0, Math.PI * 2);
    ctx.arc(goal.x + goal.width + 5, goal.y + 46, 3.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

// ─── Renderer ────────────────────────────────────────────────
class Renderer {
  constructor(canvas) { this.canvas = canvas; this.ctx = canvas.getContext('2d'); this.bgDust = []; this.initAtmosphericEffects(); }
  initAtmosphericEffects() { for (let i = 0; i < 35; i++) { this.bgDust.push({ x: Math.random() * 1600, y: Math.random() * 1000, size: 1.5 + Math.random() * 2.5, speed: 8 + Math.random() * 16, alpha: 0.2 + Math.random() * 0.5, color: Math.random() > 0.5 ? '#fff3b0' : '#a7f3d0' }); } }
  updateBackground(dt) { for (const d of this.bgDust) { d.y -= d.speed * dt; if (d.y < 0) { d.y = 1000; d.x = Math.random() * 1600; } } }
  renderBackground(camera, lw, lh, theme = 'forest') {
    const ctx = this.ctx, w = this.canvas.width, h = this.canvas.height;
    ctx.save();
    let base = '#1f2411', b1 = '#282f16', b2 = '#1a1f0d', grout = '#101407';
    if (theme === 'silver') { base = '#1e293b'; b1 = '#334155'; b2 = '#233044'; grout = '#0f172a'; }
    else if (theme === 'desert') { base = '#3d2e14'; b1 = '#4a381a'; b2 = '#33240d'; grout = '#1f1405'; }
    else if (theme === 'forge') { base = '#241b17'; b1 = '#33231d'; b2 = '#1f1511'; grout = '#0f0907'; }
    else if (theme === 'core') { base = '#130d1e'; b1 = '#201533'; b2 = '#110b1a'; grout = '#08040d'; }
    ctx.fillStyle = base; ctx.fillRect(0, 0, w, h);
    const bw = 64, bh = 28, sx = -((camera.x * 0.3) % (bw * 2)), sy = -((camera.y * 0.3) % (bh * 2));
    ctx.lineWidth = 1.5; ctx.strokeStyle = grout;
    for (let y = sy - bh; y < h + bh * 2; y += bh) {
      const ri = Math.floor(y / bh), ro = (ri % 2 === 0) ? 0 : bw / 2;
      for (let x = sx + ro - bw; x < w + bw * 2; x += bw) {
        ctx.fillStyle = ((Math.abs(ri + Math.floor(x / bw))) % 3 === 0) ? b1 : b2;
        ctx.fillRect(x, y, bw, bh); ctx.strokeRect(x, y, bw, bh);
      }
    }
    if (theme === 'forest') {
      ctx.fillStyle = 'rgba(46, 117, 34, 0.45)';
      for (let x = -100; x < lw + 200; x += 140) { const px = x - camera.x * 0.25; ctx.beginPath(); ctx.arc(px, 120, 18, 0, Math.PI * 2); ctx.arc(px + 10, 140, 14, 0, Math.PI * 2); ctx.arc(px - 8, 160, 10, 0, Math.PI * 2); ctx.fill(); }
    }
    for (const d of this.bgDust) { ctx.fillStyle = d.color; ctx.globalAlpha = d.alpha; ctx.beginPath(); ctx.arc(d.x - camera.x * 0.3, d.y - camera.y * 0.3, d.size, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
  }
  renderPlatforms(platforms, theme = 'forest') {
    const ctx = this.ctx;
    for (const plat of platforms) {
      ctx.save();
      let top = '#4d7c0f', s1 = '#473d2a', s2 = '#332b1d', border = '#1f190e';
      if (theme === 'silver') { top = '#94a3b8'; s1 = '#475569'; s2 = '#334155'; border = '#1e293b'; }
      else if (theme === 'desert') { top = '#d97706'; s1 = '#785526'; s2 = '#543b19'; border = '#2b1b08'; }
      else if (theme === 'forge') { top = '#dc2626'; s1 = '#4a2b22'; s2 = '#2d1813'; border = '#170a07'; }
      const g = ctx.createLinearGradient(plat.x, plat.y, plat.x, plat.y + plat.height);
      g.addColorStop(0, s1); g.addColorStop(1, s2);
      ctx.fillStyle = g; ctx.fillRect(plat.x, plat.y, plat.width, plat.height);
      ctx.strokeStyle = border; ctx.lineWidth = 1.5; ctx.strokeRect(plat.x, plat.y, plat.width, plat.height);
      for (let bx = plat.x + 32; bx < plat.x + plat.width; bx += 32) { ctx.beginPath(); ctx.moveTo(bx, plat.y); ctx.lineTo(bx, plat.y + plat.height); ctx.stroke(); }
      ctx.fillStyle = top; ctx.fillRect(plat.x, plat.y, plat.width, 4);
      if (theme === 'forest' && plat.width >= 40) {
        ctx.fillStyle = '#65a30d';
        for (let ix = plat.x + 6; ix < plat.x + plat.width - 6; ix += 14) { ctx.beginPath(); ctx.arc(ix, plat.y + 4, 3, 0, Math.PI * 2); ctx.fill(); }
      }
      ctx.restore();
    }
  }
  renderLevelHints(hints, ctx) {
    if (!hints || hints.length === 0) return;
    ctx.save(); ctx.shadowBlur = 4; ctx.shadowColor = '#000';
    for (const h of hints) { ctx.font = 'bold 15px Georgia, serif'; ctx.textAlign = 'center'; ctx.fillStyle = h.type === 'fire' ? '#ff7800' : h.type === 'water' ? '#38bdf8' : '#f59e0b'; ctx.fillText(h.text, h.x, h.y); }
    ctx.restore();
  }
  renderHUD(levelName, timeSeconds, collected, total, ember, tide, isOnline = false, localRole = 'both', p1Name = 'Ember', p2Name = 'Tide', pingMs = 0) {
    const ctx = this.ctx, w = this.canvas.width;
    ctx.save();
    const mins = Math.floor(timeSeconds / 60), secs = Math.floor(timeSeconds % 60), tf = `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
    ctx.fillStyle = '#4a3219'; ctx.strokeStyle = '#2b1b0c'; ctx.lineWidth = 2.5;
    ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(w / 2 - 75, 4, 150, 36, [0, 0, 16, 16]); else ctx.rect(w / 2 - 75, 4, 150, 36); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#65a30d'; ctx.beginPath(); ctx.arc(w / 2 - 60, 8, 8, 0, Math.PI * 2); ctx.arc(w / 2 + 60, 8, 8, 0, Math.PI * 2); ctx.arc(w / 2 - 30, 4, 6, 0, Math.PI * 2); ctx.arc(w / 2 + 30, 4, 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fbbf24'; ctx.font = 'bold 20px Georgia, serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(tf, w / 2, 23);
    ctx.fillStyle = (ember && ember.isDead) ? 'rgba(239, 68, 68, 0.85)' : 'rgba(217, 38, 38, 0.85)';
    ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(16, 10, 140, 32, 8); else ctx.rect(16, 10, 140, 32); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = 'bold 12px Tajawal, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(`🔥 ${p1Name || 'Ember'} ${ember && ember.isDead ? '💀' : '✓'}${(localRole === 'ember' || localRole === 'both') && isOnline ? ' (YOU)' : ''}`, 86, 27);
    ctx.fillStyle = (tide && tide.isDead) ? 'rgba(239, 68, 68, 0.85)' : 'rgba(2, 132, 199, 0.85)';
    ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(164, 10, 140, 32, 8); else ctx.rect(164, 10, 140, 32); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.fillText(`💧 ${p2Name || 'Tide'} ${tide && tide.isDead ? '💀' : '✓'}${(localRole === 'tide' || localRole === 'both') && isOnline ? ' (YOU)' : ''}`, 234, 27);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
    ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(w - 180, 10, 110, 32, 8); else ctx.rect(w - 180, 10, 110, 32); ctx.fill();
    ctx.fillStyle = '#38bdf8'; ctx.font = 'bold 13px Tajawal, sans-serif'; ctx.fillText(`💎 ${collected}/${total}`, w - 125, 27);
    if (isOnline) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
      ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(w / 2 - 60, this.canvas.height - 28, 120, 22, 6); else ctx.rect(w / 2 - 60, this.canvas.height - 28, 120, 22); ctx.fill();
      ctx.fillStyle = pingMs < 100 ? '#10b981' : '#f59e0b'; ctx.font = 'bold 11px monospace';
      ctx.fillText(`🟢 Online ${pingMs || 20}ms`, w / 2, this.canvas.height - 16);
    }
    ctx.restore();
  }
}

// ─── Level Data ──────────────────────────────────────────────
const level1 = {
  id: 1, name: "The Forest Temple", nameAr: "معبد الغابة", theme: "forest",
  description: "Navigate the mossy ruins, push the stone block, and reach the exit doors together.",
  parTime: 45, width: 1280, height: 720,
  emberSpawn: { x: 70, y: 640 }, tideSpawn: { x: 190, y: 550 },
  platforms: [
    { x: 0, y: 0, width: 32, height: 720, solid: true }, { x: 1248, y: 0, width: 32, height: 720, solid: true }, { x: 0, y: 0, width: 1280, height: 32, solid: true },
    { x: 0, y: 680, width: 560, height: 40, solid: true }, { x: 920, y: 680, width: 360, height: 40, solid: true },
    { x: 560, y: 704, width: 360, height: 16, solid: true },
    { x: 140, y: 600, width: 280, height: 20, solid: true }, { x: 440, y: 540, width: 320, height: 20, solid: true },
    { x: 760, y: 560, width: 160, height: 20, solid: true },
    { x: 160, y: 440, width: 440, height: 20, solid: true }, { x: 620, y: 460, width: 380, height: 20, solid: true }, { x: 1020, y: 480, width: 228, height: 20, solid: true },
    { x: 300, y: 280, width: 340, height: 20, solid: true }, { x: 660, y: 310, width: 380, height: 20, solid: true }, { x: 1060, y: 330, width: 188, height: 20, solid: true },
    { x: 860, y: 170, width: 388, height: 20, solid: true }, { x: 32, y: 190, width: 240, height: 20, solid: true }, { x: 320, y: 180, width: 340, height: 20, solid: true }
  ],
  hazards: [
    { type: 'lava', x: 560, y: 684, width: 180, height: 24 }, { type: 'water', x: 740, y: 684, width: 180, height: 24 }, { type: 'acid', x: 760, y: 544, width: 160, height: 20 }
  ],
  mechanisms: {
    pushBoxes: [{ id: 'box_silver', x: 600, y: 240, width: 36, height: 36 }],
    pressurePlates: [
      { id: 'plate_tier2', x: 340, y: 432, width: 34, height: 8, targetIds: ['lift_yellow'], color: '#a855f7', isLatching: false },
      { id: 'plate_tier3', x: 920, y: 302, width: 34, height: 8, targetIds: ['lift_purple'], color: '#a855f7', isLatching: false }
    ],
    levers: [{ id: 'lev_tier1', x: 320, y: 574, width: 24, height: 26, targetIds: ['lift_yellow'], defaultState: false }],
    doors: [],
    movingPlatforms: [
      { id: 'lift_yellow', x: 40, y: 440, width: 110, height: 14, waypoints: [{ x: 40, y: 600 }], speed: 70, color: '#eab308', requiresTrigger: true },
      { id: 'lift_purple', x: 1060, y: 330, width: 110, height: 14, waypoints: [{ x: 1060, y: 170 }], speed: 70, color: '#a855f7', requiresTrigger: true }
    ],
    elementalRunes: [], dualSwitches: []
  },
  checkpoints: [],
  collectibles: [
    { type: 'fire', x: 340, y: 90 }, { type: 'fire', x: 580, y: 150 }, { type: 'water', x: 710, y: 150 }, { type: 'water', x: 80, y: 160 },
    { type: 'fire', x: 230, y: 400 }, { type: 'water', x: 730, y: 420 }, { type: 'fire', x: 630, y: 640 }, { type: 'water', x: 870, y: 640 }
  ],
  emberGoal: { x: 980, y: 108, width: 42, height: 62 }, tideGoal: { x: 1060, y: 108, width: 42, height: 62 },
  hints: [
    { text: "Use A, W, D TO MOVE WATERGIRL...", x: 280, y: 520, type: 'water' },
    { text: "...Use ◀ ▲ ▶ TO MOVE FIREBOY", x: 260, y: 640, type: 'fire' },
    { text: "...NEVER MIX FIRE & WATER !", x: 800, y: 640, type: 'gold' }
  ]
};

const level2 = {
  id: 2, name: "Subterranean Forge", nameAr: "المصنع المغمور", theme: "forge",
  description: "Navigate the active forge machinery and coordinate hydraulic elevators.",
  parTime: 55, width: 1360, height: 720,
  emberSpawn: { x: 70, y: 580 }, tideSpawn: { x: 120, y: 580 },
  platforms: [
    { x: 0, y: 0, width: 32, height: 720, solid: true }, { x: 1328, y: 0, width: 32, height: 720, solid: true }, { x: 0, y: 0, width: 1360, height: 32, solid: true },
    { x: 0, y: 640, width: 240, height: 80, solid: true }, { x: 420, y: 640, width: 180, height: 80, solid: true }, { x: 780, y: 640, width: 200, height: 80, solid: true }, { x: 1160, y: 640, width: 200, height: 80, solid: true },
    { x: 240, y: 676, width: 180, height: 44, solid: true }, { x: 600, y: 676, width: 180, height: 44, solid: true }, { x: 980, y: 676, width: 180, height: 44, solid: true },
    { x: 160, y: 480, width: 200, height: 24, solid: true }, { x: 500, y: 460, width: 360, height: 24, solid: true }, { x: 1000, y: 460, width: 220, height: 24, solid: true },
    { x: 80, y: 300, width: 280, height: 24, solid: true }, { x: 560, y: 260, width: 240, height: 24, solid: true }, { x: 980, y: 240, width: 348, height: 24, solid: true },
    { x: 1060, y: 120, width: 268, height: 24, solid: true }
  ],
  hazards: [
    { type: 'lava', x: 240, y: 654, width: 180, height: 26 }, { type: 'water', x: 600, y: 654, width: 180, height: 26 }, { type: 'acid', x: 980, y: 654, width: 180, height: 26 }, { type: 'spikes', x: 620, y: 440, width: 60, height: 20, orientation: 'up' }
  ],
  mechanisms: {
    pushBoxes: [],
    pressurePlates: [{ id: 'plate_high', x: 120, y: 292, width: 36, height: 8, targetIds: ['door_mid'], color: '#ef4444', isLatching: true }],
    levers: [{ id: 'lev_acid', x: 920, y: 604, width: 24, height: 28, targetIds: ['plat_acid_ferry'], defaultState: false }],
    doors: [{ id: 'door_mid', x: 560, y: 180, width: 16, height: 80, openDirection: 'up', defaultOpen: false, color: '#ef4444' }],
    movingPlatforms: [
      { id: 'plat_lava', x: 250, y: 560, width: 70, height: 16, waypoints: [{ x: 390, y: 560 }], speed: 60, color: '#f59e0b', requiresTrigger: false },
      { id: 'plat_acid_ferry', x: 1000, y: 580, width: 70, height: 16, waypoints: [{ x: 1140, y: 580 }], speed: 75, color: '#22c55e', requiresTrigger: true },
      { id: 'plat_goal_lift', x: 920, y: 400, width: 70, height: 16, waypoints: [{ x: 920, y: 200 }], speed: 70, color: '#38bdf8', requiresTrigger: false }
    ],
    elementalRunes: [], dualSwitches: []
  },
  checkpoints: [],
  collectibles: [{ type: 'fire', x: 320, y: 510 }, { type: 'water', x: 690, y: 590 }, { type: 'fire', x: 680, y: 210 }, { type: 'water', x: 1120, y: 200 }],
  emberGoal: { x: 1180, y: 58, width: 42, height: 62 }, tideGoal: { x: 1250, y: 58, width: 42, height: 62 },
  hints: []
};

const level3 = {
  id: 3, name: "Silver Crystal Palace", nameAr: "قصر البلور الفضي", theme: "silver",
  description: "Ascend the gleaming silver towers and synchronize crystal switches.",
  parTime: 65, width: 1280, height: 900,
  emberSpawn: { x: 80, y: 760 }, tideSpawn: { x: 130, y: 760 },
  platforms: [
    { x: 0, y: 0, width: 32, height: 900, solid: true }, { x: 1248, y: 0, width: 32, height: 900, solid: true }, { x: 0, y: 0, width: 1280, height: 32, solid: true },
    { x: 0, y: 820, width: 440, height: 80, solid: true }, { x: 600, y: 820, width: 680, height: 80, solid: true },
    { x: 440, y: 856, width: 160, height: 44, solid: true },
    { x: 120, y: 640, width: 320, height: 24, solid: true }, { x: 580, y: 640, width: 560, height: 24, solid: true },
    { x: 60, y: 460, width: 480, height: 24, solid: true }, { x: 700, y: 460, width: 480, height: 24, solid: true },
    { x: 180, y: 280, width: 360, height: 24, solid: true }, { x: 740, y: 280, width: 360, height: 24, solid: true },
    { x: 440, y: 140, width: 400, height: 24, solid: true }
  ],
  hazards: [
    { type: 'lava', x: 440, y: 834, width: 80, height: 26 }, { type: 'water', x: 520, y: 834, width: 80, height: 26 },
    { type: 'spikes', x: 260, y: 440, width: 72, height: 20, orientation: 'up' }, { type: 'spikes', x: 880, y: 440, width: 72, height: 20, orientation: 'up' }
  ],
  mechanisms: {
    pushBoxes: [{ id: 'box_silver_f2', x: 200, y: 600, width: 36, height: 36 }],
    pressurePlates: [{ id: 'plate_f2', x: 340, y: 632, width: 36, height: 8, targetIds: ['door_lift_f2'], color: '#38bdf8', isLatching: false }],
    levers: [{ id: 'lev_summit', x: 220, y: 244, width: 24, height: 28, targetIds: ['door_summit'], defaultState: false }],
    doors: [
      { id: 'door_lift_f2', x: 580, y: 560, width: 16, height: 80, openDirection: 'up', defaultOpen: false, color: '#38bdf8' },
      { id: 'door_summit', x: 440, y: 60, width: 16, height: 80, openDirection: 'up', defaultOpen: false, color: '#f59e0b' }
    ],
    movingPlatforms: [
      { id: 'lift_bottom', x: 480, y: 800, width: 80, height: 16, waypoints: [{ x: 480, y: 640 }], speed: 70, color: '#38bdf8', requiresTrigger: false },
      { id: 'lift_left', x: 60, y: 440, width: 70, height: 16, waypoints: [{ x: 60, y: 280 }], speed: 85, color: '#a855f7', requiresTrigger: true },
      { id: 'lift_right', x: 1140, y: 440, width: 70, height: 16, waypoints: [{ x: 1140, y: 280 }], speed: 85, color: '#eab308', requiresTrigger: true }
    ],
    elementalRunes: [],
    dualSwitches: [{ id: 'dual_f4', x1: 440, y1: 252, x2: 800, y2: 252, targetIds: ['door_summit'], timeLimit: 2.5 }]
  },
  checkpoints: [],
  collectibles: [
    { type: 'fire', x: 460, y: 780 }, { type: 'water', x: 540, y: 780 }, { type: 'fire', x: 100, y: 420 }, { type: 'water', x: 1180, y: 420 }, { type: 'universal', x: 640, y: 90 }
  ],
  emberGoal: { x: 570, y: 78, width: 42, height: 62 }, tideGoal: { x: 650, y: 78, width: 42, height: 62 },
  hints: []
};

const level4 = {
  id: 4, name: "Sandstone Labyrinth", nameAr: "متاهة الرمال الذهبية", theme: "desert",
  description: "Split your paths across the ancient golden dunes and coordinate reciprocal switches.",
  parTime: 75, width: 1440, height: 720,
  emberSpawn: { x: 70, y: 580 }, tideSpawn: { x: 120, y: 580 },
  platforms: [
    { x: 0, y: 0, width: 32, height: 720, solid: true }, { x: 1408, y: 0, width: 32, height: 720, solid: true }, { x: 0, y: 0, width: 1440, height: 32, solid: true },
    { x: 0, y: 640, width: 220, height: 80, solid: true }, { x: 380, y: 640, width: 180, height: 80, solid: true }, { x: 720, y: 640, width: 220, height: 80, solid: true }, { x: 1100, y: 640, width: 340, height: 80, solid: true },
    { x: 220, y: 676, width: 160, height: 44, solid: true }, { x: 560, y: 676, width: 160, height: 44, solid: true }, { x: 940, y: 676, width: 160, height: 44, solid: true },
    { x: 180, y: 460, width: 380, height: 24, solid: true }, { x: 680, y: 460, width: 440, height: 24, solid: true },
    { x: 420, y: 460, width: 120, height: 24, solid: true },
    { x: 80, y: 280, width: 340, height: 24, solid: true }, { x: 540, y: 260, width: 320, height: 24, solid: true }, { x: 960, y: 280, width: 448, height: 24, solid: true },
    { x: 1140, y: 140, width: 268, height: 24, solid: true }
  ],
  hazards: [
    { type: 'lava', x: 220, y: 654, width: 160, height: 26 }, { type: 'lava', x: 560, y: 654, width: 160, height: 26 },
    { type: 'water', x: 940, y: 654, width: 160, height: 26 }, { type: 'water', x: 420, y: 440, width: 120, height: 20 },
    { type: 'spikes', x: 760, y: 440, width: 60, height: 20, orientation: 'up' }, { type: 'spikes', x: 240, y: 260, width: 60, height: 20, orientation: 'up' }
  ],
  mechanisms: {
    pushBoxes: [{ id: 'box_desert_1', x: 260, y: 420, width: 36, height: 36 }],
    pressurePlates: [
      { id: 'plate_recip_ember', x: 440, y: 632, width: 36, height: 8, targetIds: ['door_upper_tide'], color: '#f59e0b', isLatching: false },
      { id: 'plate_recip_tide', x: 620, y: 252, width: 36, height: 8, targetIds: ['door_lower_ember'], color: '#38bdf8', isLatching: false }
    ],
    levers: [
      { id: 'lev_mid_ferry', x: 740, y: 604, width: 24, height: 28, targetIds: ['plat_twin_ferry'], defaultState: false },
      { id: 'lev_goal_gate', x: 1040, y: 244, width: 24, height: 28, targetIds: ['door_goal_final'], defaultState: false }
    ],
    doors: [
      { id: 'door_upper_tide', x: 540, y: 180, width: 16, height: 80, openDirection: 'up', defaultOpen: false, color: '#f59e0b' },
      { id: 'door_lower_ember', x: 720, y: 560, width: 16, height: 80, openDirection: 'up', defaultOpen: false, color: '#38bdf8' },
      { id: 'door_goal_final', x: 1140, y: 60, width: 16, height: 80, openDirection: 'up', defaultOpen: false, color: '#10b981' }
    ],
    movingPlatforms: [
      { id: 'plat_twin_ferry', x: 570, y: 580, width: 70, height: 16, waypoints: [{ x: 700, y: 580 }], speed: 70, color: '#f59e0b', requiresTrigger: true },
      { id: 'lift_right_ascent', x: 1020, y: 500, width: 70, height: 16, waypoints: [{ x: 1020, y: 280 }], speed: 80, color: '#38bdf8', requiresTrigger: false }
    ],
    elementalRunes: [],
    dualSwitches: [{ id: 'dual_twin_end', x1: 960, y1: 252, x2: 1300, y2: 252, targetIds: ['door_goal_final'], timeLimit: 3.0 }]
  },
  checkpoints: [],
  collectibles: [{ type: 'fire', x: 300, y: 600 }, { type: 'water', x: 480, y: 400 }, { type: 'fire', x: 800, y: 420 }, { type: 'water', x: 1240, y: 230 }],
  emberGoal: { x: 1200, y: 78, width: 42, height: 62 }, tideGoal: { x: 1280, y: 78, width: 42, height: 62 },
  hints: []
};

const level5 = {
  id: 5, name: "The Molten Core", nameAr: "القلب العنصري الأسطوري", theme: "core",
  description: "The deepest sanctuary of the temple. Combine all elemental abilities to restore equilibrium.",
  parTime: 90, width: 1520, height: 900,
  emberSpawn: { x: 70, y: 760 }, tideSpawn: { x: 120, y: 760 },
  platforms: [
    { x: 0, y: 0, width: 32, height: 900, solid: true }, { x: 1488, y: 0, width: 32, height: 900, solid: true }, { x: 0, y: 0, width: 1520, height: 32, solid: true },
    { x: 0, y: 820, width: 260, height: 80, solid: true }, { x: 440, y: 820, width: 220, height: 80, solid: true }, { x: 840, y: 820, width: 260, height: 80, solid: true }, { x: 1260, y: 820, width: 260, height: 80, solid: true },
    { x: 260, y: 856, width: 180, height: 44, solid: true }, { x: 660, y: 856, width: 180, height: 44, solid: true }, { x: 1100, y: 856, width: 160, height: 44, solid: true },
    { x: 140, y: 640, width: 340, height: 24, solid: true }, { x: 600, y: 640, width: 380, height: 24, solid: true }, { x: 1100, y: 640, width: 388, height: 24, solid: true },
    { x: 300, y: 636, width: 100, height: 24, solid: true },
    { x: 60, y: 460, width: 380, height: 24, solid: true }, { x: 560, y: 460, width: 440, height: 24, solid: true }, { x: 1120, y: 460, width: 368, height: 24, solid: true },
    { x: 800, y: 456, width: 100, height: 24, solid: true },
    { x: 180, y: 280, width: 380, height: 24, solid: true }, { x: 660, y: 260, width: 360, height: 24, solid: true }, { x: 1140, y: 280, width: 348, height: 24, solid: true },
    { x: 560, y: 120, width: 440, height: 24, solid: true }
  ],
  hazards: [
    { type: 'lava', x: 260, y: 834, width: 180, height: 26 }, { type: 'lava', x: 660, y: 834, width: 180, height: 26 }, { type: 'water', x: 1100, y: 834, width: 160, height: 26 },
    { type: 'acid', x: 300, y: 620, width: 100, height: 20 }, { type: 'acid', x: 800, y: 440, width: 100, height: 20 },
    { type: 'spikes', x: 700, y: 620, width: 60, height: 20, orientation: 'up' }, { type: 'spikes', x: 300, y: 260, width: 60, height: 20, orientation: 'up' }
  ],
  mechanisms: {
    pushBoxes: [{ id: 'box_core_1', x: 180, y: 600, width: 36, height: 36 }],
    pressurePlates: [
      { id: 'plate_core_1', x: 200, y: 632, width: 36, height: 8, targetIds: ['door_core_t2'], color: '#ef4444', isLatching: false },
      { id: 'plate_core_2', x: 1380, y: 632, width: 36, height: 8, targetIds: ['lift_core_center'], color: '#38bdf8', isLatching: true }
    ],
    levers: [
      { id: 'lev_core_main', x: 100, y: 424, width: 24, height: 28, targetIds: ['door_core_t3'], defaultState: false },
      { id: 'lev_sanctuary', x: 1400, y: 244, width: 24, height: 28, targetIds: ['door_sanctuary_left'], defaultState: false }
    ],
    doors: [
      { id: 'door_core_t2', x: 600, y: 560, width: 16, height: 80, openDirection: 'up', defaultOpen: false, color: '#ef4444' },
      { id: 'door_core_t3', x: 560, y: 380, width: 16, height: 80, openDirection: 'up', defaultOpen: false, color: '#fbbf24' },
      { id: 'door_sanctuary_left', x: 560, y: 40, width: 16, height: 80, openDirection: 'up', defaultOpen: false, color: '#a855f7' }
    ],
    movingPlatforms: [
      { id: 'lift_core_center', x: 480, y: 760, width: 80, height: 16, waypoints: [{ x: 480, y: 460 }], speed: 80, color: '#38bdf8', requiresTrigger: true },
      { id: 'lift_core_left', x: 60, y: 440, width: 70, height: 16, waypoints: [{ x: 60, y: 280 }], speed: 75, color: '#eab308', requiresTrigger: false },
      { id: 'lift_core_right', x: 1400, y: 440, width: 70, height: 16, waypoints: [{ x: 1400, y: 280 }], speed: 75, color: '#a855f7', requiresTrigger: false },
      { id: 'lift_core_summit', x: 740, y: 260, width: 80, height: 16, waypoints: [{ x: 740, y: 120 }], speed: 70, color: '#22c55e', requiresTrigger: false }
    ],
    elementalRunes: [],
    dualSwitches: [{ id: 'dual_core_apex', x1: 700, y1: 228, x2: 920, y2: 228, targetIds: ['door_sanctuary_left'], timeLimit: 2.5 }]
  },
  checkpoints: [],
  collectibles: [
    { type: 'fire', x: 340, y: 780 }, { type: 'water', x: 1180, y: 780 }, { type: 'fire', x: 260, y: 210 }, { type: 'water', x: 980, y: 210 }, { type: 'universal', x: 780, y: 70 }
  ],
  emberGoal: { x: 710, y: 58, width: 42, height: 62 }, tideGoal: { x: 800, y: 58, width: 42, height: 62 },
  hints: []
};

const ALL_LEVELS = [level1, level2, level3, level4, level5];
function getLevelById(id) { const numId = Number(id); return ALL_LEVELS.find(lvl => lvl.id === numId) || level1; }

// ─── NetworkClient (Firebase Compat SDK) ─────────────────────
class NetworkClient {
  constructor() {
    this.status = 'disconnected';
    this.roomId = null; this.playerSlot = null; this.role = null;
    this.playerName = localStorage.getItem('agy_user_name') || localStorage.getItem('ember_tide_player_name') || 'Player';
    this.pingMs = 20; this.lastStateSendTime = 0;
    this.onStatusChange = null; this.onPingUpdate = null; this.onRoomCreated = null; this.onRoomJoined = null;
    this.onRoomUpdated = null; this.onGameStart = null; this.onRemotePlayerState = null; this.onPuzzleSync = null;
    this.onShardCollected = null; this.onCheckpointSync = null; this.onPlayerDied = null; this.onRestartSync = null;
    this.onLevelCompleteSync = null; this.onPlayerDisconnected = null; this.onError = null;
    this._db = null; this._listeners = [];
    this._initFirebase();
  }
  _initFirebase() {
    try {
      const cfg = { apiKey: "AIzaSyCDBUnS_KZ3qNiQw5HX0p-uKK9akPOnCI8", authDomain: "tgame-6a455.firebaseapp.com", databaseURL: "https://tgame-6a455-default-rtdb.firebaseio.com", projectId: "tgame-6a455", storageBucket: "tgame-6a455.firebasestorage.app", messagingSenderId: "480514009504", appId: "1:480514009504:web:af022d72d9705ee1725cc5" };
      if (typeof firebase !== 'undefined') {
        try { firebase.app(); } catch(e) { firebase.initializeApp(cfg); }
        this._db = firebase.database();
      }
    } catch(e) {}
  }
  setPlayerName(name) { this.playerName = (name || 'Player').substring(0, 16).trim(); try { localStorage.setItem('agy_user_name', this.playerName); localStorage.setItem('ember_tide_player_name', this.playerName); } catch(e) {} }
  generateRoomCode() { return Math.floor(1000 + Math.random() * 9000).toString(); }
  setStatus(st) { this.status = st; if (this.onStatusChange) this.onStatusChange(st); }
  async createRoom(name, requestedLevel = 1) {
    if (!this._db) { if (this.onError) this.onError('Firebase not available.'); throw new Error('No Firebase'); }
    if (name) this.setPlayerName(name);
    this.setStatus('connecting');
    const code = this.generateRoomCode(); this.roomId = code; this.playerSlot = 'p1'; this.role = 'ember';
    const initialData = { roomId: code, status: 'waiting', createdAt: Date.now(), lastAction: Date.now(), currentLevel: requestedLevel || 1, p1: { name: this.playerName, role: 'ember', isReady: false, isConnected: true }, p2: null, p1_state: null, p2_state: null, lastEvent: null };
    try {
      await this._db.ref(`et_rooms/${code}`).set(initialData);
      this._db.ref(`et_rooms/${code}/p1/isConnected`).onDisconnect().set(false);
      this.setStatus('connected'); this.listenToRoom(code);
      if (this.onRoomCreated) this.onRoomCreated({ roomId: code, playerSlot: 'p1', role: 'ember', name: this.playerName });
    } catch(err) { this.setStatus('disconnected'); if (this.onError) this.onError('Failed to create room.'); throw err; }
  }
  async joinRoom(code, name) {
    if (!this._db) { if (this.onError) this.onError('Firebase not available.'); throw new Error('No Firebase'); }
    if (name) this.setPlayerName(name);
    const normalizedCode = (code || '').trim().toUpperCase(); this.setStatus('connecting');
    try {
      const snap = await this._db.ref(`et_rooms/${normalizedCode}`).once('value');
      if (!snap.exists()) { this.setStatus('disconnected'); const err = 'Room not found.'; if (this.onError) this.onError(err); throw new Error(err); }
      const roomData = snap.val();
      if (roomData.p2 && roomData.p2.isConnected) { this.setStatus('disconnected'); const err = 'Room is full.'; if (this.onError) this.onError(err); throw new Error(err); }
      this.roomId = normalizedCode; this.playerSlot = 'p2'; this.role = 'tide';
      const p2Data = { name: this.playerName, role: 'tide', isReady: false, isConnected: true };
      await this._db.ref(`et_rooms/${normalizedCode}`).update({ p2: p2Data, lastAction: Date.now() });
      this._db.ref(`et_rooms/${normalizedCode}/p2/isConnected`).onDisconnect().set(false);
      this.setStatus('connected'); this.listenToRoom(normalizedCode);
      if (this.onRoomJoined) this.onRoomJoined({ roomId: normalizedCode, playerSlot: 'p2', role: 'tide', name: this.playerName, roomData: { ...roomData, p2: p2Data } });
    } catch(err) { this.setStatus('disconnected'); if (this.onError) this.onError(err.message || 'Failed to join room.'); throw err; }
  }
  listenToRoom(roomId) {
    this.cleanupListeners();
    const roomRef = this._db.ref(`et_rooms/${roomId}`);
    const roomCb = roomRef.on('value', snap => {
      if (!snap.exists()) { if (this.onError) this.onError('Room closed.'); this.leaveRoom(); return; }
      const data = snap.val();
      if (data.status === 'playing' && this.onGameStart) this.onGameStart(data.currentLevel || 1, data);
      const partnerSlot = this.playerSlot === 'p1' ? 'p2' : 'p1';
      const partner = data[partnerSlot];
      if (partner && partner.isConnected === false && this.onPlayerDisconnected) this.onPlayerDisconnected({ message: `${partner.name || 'Partner'} lost connection.`, reconnectWindow: 25 });
      if (this.onRoomUpdated) this.onRoomUpdated(data);
    });
    this._listeners.push({ ref: roomRef, cb: roomCb });
    const remoteKey = this.playerSlot === 'p1' ? 'p2_state' : 'p1_state';
    const remoteSlot = this.playerSlot === 'p1' ? 'p2' : 'p1';
    const remoteRef = this._db.ref(`et_rooms/${roomId}/${remoteKey}`);
    const remoteCb = remoteRef.on('value', snap => { if (snap.exists() && this.onRemotePlayerState) this.onRemotePlayerState(remoteSlot, snap.val()); });
    this._listeners.push({ ref: remoteRef, cb: remoteCb });
    const eventsRef = this._db.ref(`et_rooms/${roomId}/lastEvent`);
    const eventsCb = eventsRef.on('value', snap => {
      if (!snap.exists()) return;
      const evt = snap.val();
      if (evt.sender === this.playerSlot) return;
      if (evt.type === 'puzzle_action' && this.onPuzzleSync) this.onPuzzleSync(evt.action, evt.data);
      else if (evt.type === 'collect_shard' && this.onShardCollected) this.onShardCollected(evt);
      else if (evt.type === 'checkpoint_sync' && this.onCheckpointSync) this.onCheckpointSync(evt);
      else if (evt.type === 'player_died' && this.onPlayerDied) this.onPlayerDied(evt);
      else if (evt.type === 'restart_level' && this.onRestartSync) this.onRestartSync(evt.levelId);
      else if (evt.type === 'complete_level' && this.onLevelCompleteSync) this.onLevelCompleteSync(evt);
    });
    this._listeners.push({ ref: eventsRef, cb: eventsCb });
  }
  cleanupListeners() { this._listeners.forEach(item => { try { item.ref.off('value', item.cb); } catch(e) {} }); this._listeners = []; }
  async setReady(isReady) {
    if (!this._db || !this.roomId || !this.playerSlot) return;
    try {
      await this._db.ref(`et_rooms/${this.roomId}/${this.playerSlot}`).update({ isReady: !!isReady });
      const snap = await this._db.ref(`et_rooms/${this.roomId}`).once('value');
      if (snap.exists()) { const d = snap.val(); if (d.p1 && d.p1.isReady && d.p2 && d.p2.isReady && d.status !== 'playing') await this._db.ref(`et_rooms/${this.roomId}`).update({ status: 'playing', lastAction: Date.now() }); }
    } catch(e) {}
  }
  async selectLevel(levelId) { if (!this._db || !this.roomId || this.playerSlot !== 'p1') return; try { await this._db.ref(`et_rooms/${this.roomId}`).update({ currentLevel: Number(levelId) }); } catch(e) {} }
  sendPlayerState(player) {
    if (!this._db || !this.roomId || !this.playerSlot) return;
    const now = Date.now(); if (now - this.lastStateSendTime < 30) return; this.lastStateSendTime = now;
    const stateKey = this.playerSlot === 'p1' ? 'p1_state' : 'p2_state';
    this._db.ref(`et_rooms/${this.roomId}/${stateKey}`).set({ x: Math.round(player.x * 10) / 10, y: Math.round(player.y * 10) / 10, vx: Math.round(player.vx), vy: Math.round(player.vy), facing: player.facing, scaleX: Math.round(player.scaleX * 100) / 100, scaleY: Math.round(player.scaleY * 100) / 100, isGrounded: player.isGrounded, isDead: player.isDead, isVictory: player.isVictory, animTime: Math.round(player.animTime * 10) / 10, t: now }).catch(() => {});
  }
  _sendEvent(data) { if (!this._db || !this.roomId) return; this._db.ref(`et_rooms/${this.roomId}/lastEvent`).set({ ...data, sender: this.playerSlot, t: Date.now() }).catch(() => {}); }
  sendPuzzleAction(action, data) { this._sendEvent({ type: 'puzzle_action', action, data }); }
  sendShardCollected(shardIndex, shardType) { this._sendEvent({ type: 'collect_shard', shardIndex, shardType }); }
  sendCheckpointReached(checkpointId, x, y) { this._sendEvent({ type: 'checkpoint_sync', checkpointId, x, y }); }
  sendPlayerDied(playerType, cause) { this._sendEvent({ type: 'player_died', playerType, cause }); }
  sendRestartRequest(levelId) { this._sendEvent({ type: 'restart_level', levelId }); }
  sendLevelComplete(data) { this._sendEvent({ type: 'complete_level', ...data }); }
  async leaveRoom() {
    if (this._db && this.roomId && this.playerSlot) {
      try {
        if (this.playerSlot === 'p1') this._db.ref(`et_rooms/${this.roomId}`).remove().catch(() => {});
        else this._db.ref(`et_rooms/${this.roomId}`).update({ p2: null, lastAction: Date.now() }).catch(() => {});
      } catch(e) {}
    }
    this.cleanupListeners(); this.roomId = null; this.playerSlot = null; this.role = null; this.setStatus('disconnected');
  }
}

// ─── GameEngine ──────────────────────────────────────────────
class GameEngine {
  constructor(canvas) {
    this.canvas = canvas; this.ctx = canvas.getContext('2d');
    this.saveManager = new SaveManager();
    this.audio = new AudioManager(this.saveManager);
    this.input = new InputManager();
    this.particles = new ParticleSystem();
    this.camera = new Camera(canvas.width, canvas.height);
    this.renderer = new Renderer(canvas);
    this.state = 'MENU';
    this.currentLevelId = 1; this.currentLevelData = null;
    this.levelTimer = 0; this.deathCount = 0; this.isVictoryHandled = false;
    this.isOnline = false; this.localPlayerRole = 'both';
    this.p1Name = 'Ember'; this.p2Name = 'Tide';
    this.networkClient = null; this.netSyncTimer = 0;
    this.ember = null; this.tide = null;
    this.hazards = null; this.mechanisms = null; this.checkpoints = null; this.collectibles = null; this.portal = null;
    this.platforms = [];
    this.deathTriggerTimer = 0;
    this.onLevelCompleteCallback = null;
    this.onGameOverCallback = null;
    this.onStateChangeCallback = null;
    this.lastTime = 0; this.isRunning = false; this.animationFrameId = null;
    const particles = this.saveManager.getSetting('particles');
    this.particles.setEnabled(particles !== false);
  }
  startLevel(levelId, isOnline = false, localRole = 'both', p1Name = 'Ember', p2Name = 'Tide', networkClient = null) {
    this.currentLevelId = Number(levelId);
    this.currentLevelData = getLevelById(this.currentLevelId);
    this.levelTimer = 0; this.deathCount = 0; this.isVictoryHandled = false;
    this.deathTriggerTimer = 0;
    this.isOnline = isOnline; this.localPlayerRole = localRole;
    this.p1Name = p1Name || 'Ember'; this.p2Name = p2Name || 'Tide';
    this.networkClient = networkClient; this.netSyncTimer = 0;
    this.camera.setLevelBounds(this.currentLevelData.width, this.currentLevelData.height);
    this.camera.setViewport(this.canvas.width, this.canvas.height);
    this.platforms = [...this.currentLevelData.platforms];
    this.ember = new Player('ember', this.currentLevelData.emberSpawn.x, this.currentLevelData.emberSpawn.y, this.audio, this.particles);
    this.tide = new Player('tide', this.currentLevelData.tideSpawn.x, this.currentLevelData.tideSpawn.y, this.audio, this.particles);
    if (this.isOnline) { this.ember.isRemote = (this.localPlayerRole === 'tide'); this.tide.isRemote = (this.localPlayerRole === 'ember'); this.ember.displayName = this.p1Name; this.tide.displayName = this.p2Name; }
    this.hazards = new HazardManager(this.particles);
    for (const h of this.currentLevelData.hazards) {
      if (h.type === 'lava') this.hazards.addLava(h.x, h.y, h.width, h.height);
      else if (h.type === 'water') this.hazards.addWater(h.x, h.y, h.width, h.height);
      else if (h.type === 'acid') this.hazards.addAcid(h.x, h.y, h.width, h.height);
      else if (h.type === 'spikes') this.hazards.addSpikes(h.x, h.y, h.width, h.height, h.orientation);
      else if (h.type === 'laser') this.hazards.addLaser(h.x, h.y, h.width, h.height, h.timerCycle, h.isVertical);
    }
    this.mechanisms = new MechanismManager(this.audio, this.particles);
    const m = this.currentLevelData.mechanisms;
    if (m.pushBoxes) m.pushBoxes.forEach(b => this.mechanisms.addPushBox(b.id, b.x, b.y, b.width, b.height));
    if (m.pressurePlates) m.pressurePlates.forEach(pp => this.mechanisms.addPressurePlate(pp.id, pp.x, pp.y, pp.width, pp.height, pp.targetIds, pp.color || '#a855f7', pp.isLatching));
    if (m.levers) m.levers.forEach(lev => this.mechanisms.addLever(lev.id, lev.x, lev.y, lev.width, lev.height, lev.targetIds, lev.defaultState));
    if (m.elementalRunes) m.elementalRunes.forEach(er => this.mechanisms.addElementalRune(er.id, er.x, er.y, er.width, er.height, er.requiredElement, er.targetIds));
    if (m.doors) m.doors.forEach(d => this.mechanisms.addDoor(d.id, d.x, d.y, d.width, d.height, d.openDirection, d.defaultOpen, d.color));
    if (m.movingPlatforms) m.movingPlatforms.forEach(mp => this.mechanisms.addMovingPlatform(mp.id, mp.x, mp.y, mp.width, mp.height, mp.waypoints, mp.speed, mp.color || '#eab308', mp.requiresTrigger, mp.triggerId));
    if (m.dualSwitches) m.dualSwitches.forEach(ds => this.mechanisms.addDualSwitch(ds.id, ds.x1, ds.y1, ds.x2, ds.y2, ds.targetIds, ds.timeLimit));
    this.checkpoints = new CheckpointManager(this.audio, this.particles);
    if (this.currentLevelData.checkpoints) this.currentLevelData.checkpoints.forEach(cp => this.checkpoints.addCheckpoint(cp.id, cp.x, cp.y, cp.width, cp.height));
    this.collectibles = new CollectibleManager(this.audio, this.particles);
    if (this.currentLevelData.collectibles) this.currentLevelData.collectibles.forEach(col => this.collectibles.addShard(col.type, col.x, col.y));
    this.portal = new PortalGateway(this.currentLevelData.emberGoal, this.currentLevelData.tideGoal, this.audio, this.particles);
    this.state = 'PLAYING';
    this.audio.startMusic();
    if (this.onStateChangeCallback) this.onStateChangeCallback(this.state);
  }
  restartLevel() {
    if (this.currentLevelId) {
      if (this.isOnline && this.networkClient) this.networkClient.sendRestartRequest(this.currentLevelId);
      this.startLevel(this.currentLevelId, this.isOnline, this.localPlayerRole, this.p1Name, this.p2Name, this.networkClient);
    }
  }
  togglePause() {
    if (this.state === 'PLAYING') this.state = 'PAUSED';
    else if (this.state === 'PAUSED') this.state = 'PLAYING';
    if (this.onStateChangeCallback) this.onStateChangeCallback(this.state);
  }
  startLoop() {
    if (this.isRunning) return;
    this.isRunning = true; this.lastTime = performance.now();
    const loop = (time) => {
      const dt = Math.min((time - this.lastTime) / 1000, 0.1);
      this.lastTime = time;
      this.update(dt); this.render();
      if (this.isRunning) this.animationFrameId = requestAnimationFrame(loop);
    };
    this.animationFrameId = requestAnimationFrame(loop);
  }
  stopLoop() { this.isRunning = false; if (this.animationFrameId) { cancelAnimationFrame(this.animationFrameId); this.animationFrameId = null; } this.audio.stopMusic(); }
  update(dt) {
    if (this.input.isJustPressed('pause') && this.state !== 'GAME_OVER') this.togglePause();
    if (this.input.isJustPressed('restart')) this.restartLevel();
    if (this.state !== 'PLAYING') {
      this.particles.update(dt);
      this.input.update();
      return;
    }
    this.levelTimer += dt;
    const emberInput = this.input.getEmberInput();
    const tideInput = this.input.getTideInput();
    this.mechanisms.update(dt, [this.ember, this.tide], this.platforms);
    const movingColliders = [...this.mechanisms.movingPlatforms, ...this.mechanisms.doors.filter(d => !d.isOpen)];
    const boxes = this.mechanisms.pushBoxes || [];
    if (!this.isOnline || this.localPlayerRole === 'both') {
      this.ember.update(dt, emberInput, this.platforms, movingColliders, boxes);
      this.tide.update(dt, tideInput, this.platforms, movingColliders, boxes);
    } else if (this.localPlayerRole === 'ember') {
      this.ember.update(dt, emberInput, this.platforms, movingColliders, boxes);
      this.tide.updateRemote(dt);
      this.netSyncTimer += dt;
      if (this.netSyncTimer >= 0.033 && this.networkClient) { this.netSyncTimer = 0; this.networkClient.sendPlayerState(this.ember); }
    } else if (this.localPlayerRole === 'tide') {
      const unifiedTideInput = { left: tideInput.left || emberInput.left, right: tideInput.right || emberInput.right, jump: tideInput.jump || emberInput.jump, interact: tideInput.interact || emberInput.interact };
      this.tide.update(dt, unifiedTideInput, this.platforms, movingColliders, boxes);
      this.ember.updateRemote(dt);
      this.netSyncTimer += dt;
      if (this.netSyncTimer >= 0.033 && this.networkClient) { this.netSyncTimer = 0; this.networkClient.sendPlayerState(this.tide); }
    }

    this.hazards.update(dt, [this.ember, this.tide]);

    // Check Death Condition & Trigger Retry Screen
    if (this.ember.isDead || this.tide.isDead) {
      if (this.deathTriggerTimer === 0) {
        this.deathCount++;
        this.saveManager.recordDeath();
        if (this.saveManager.getSetting('screenShake') !== false) this.camera.shake(6, 0.2);
        if (this.isOnline && this.networkClient) {
          const deadRole = this.ember.isDead ? 'ember' : 'tide';
          this.networkClient.sendPlayerDied(deadRole, 'hazard');
        }
      }
      this.deathTriggerTimer += dt;
      if (this.deathTriggerTimer >= 0.5) {
        this.state = 'GAME_OVER';
        if (this.onGameOverCallback) {
          const whoDied = this.ember.isDead ? 'FireBoy 🔥' : 'WaterGirl 💧';
          this.onGameOverCallback(whoDied);
        }
      }
    }

    const prevCpId = this.checkpoints.activeId;
    this.checkpoints.update(dt, [this.ember, this.tide]);
    if (this.isOnline && this.checkpoints.activeId && this.checkpoints.activeId !== prevCpId && this.networkClient) {
      const activeCp = this.checkpoints.checkpoints.find(c => c.id === this.checkpoints.activeId);
      if (activeCp) this.networkClient.sendCheckpointReached(activeCp.id, activeCp.x, activeCp.y);
    }
    const prevCollected = this.collectibles.collectedCount;
    this.collectibles.update(dt, [this.ember, this.tide]);
    if (this.isOnline && this.collectibles.collectedCount > prevCollected && this.networkClient) {
      const collectedIdx = this.collectibles.items.findIndex(i => i.collected);
      if (collectedIdx !== -1) this.networkClient.sendShardCollected(collectedIdx, this.collectibles.items[collectedIdx].type);
    }
    this.particles.update(dt);
    this.renderer.updateBackground(dt);
    this.camera.update(dt, this.ember, this.tide);
    const isLevelWon = this.portal.update(dt, [this.ember, this.tide]);
    if (isLevelWon && !this.isVictoryHandled) { this.isVictoryHandled = true; this.handleLevelCompletion(); }
    this.input.update();
  }
  applyRemotePlayerState(slot, state) {
    if (slot === 'p1' && this.ember && this.ember.isRemote) this.ember.applyRemoteState(state);
    else if (slot === 'p2' && this.tide && this.tide.isRemote) this.tide.applyRemoteState(state);
  }
  applyPuzzleSync(action, data) {
    if (!this.mechanisms) return;
    if (action === 'pressure_plate') { const pp = this.mechanisms.pressurePlates.find(p => p.id === data.id); if (pp) { pp.isPressed = data.isPressed; this.mechanisms.triggerTargets(pp.targetIds, pp.isPressed); } }
    else if (action === 'lever') { const lev = this.mechanisms.levers.find(l => l.id === data.id); if (lev) { lev.isOn = data.isOn; this.mechanisms.triggerTargets(lev.targetIds, lev.isOn); } }
  }
  applyShardCollected(data) {
    if (!this.collectibles) return;
    const item = this.collectibles.items[data.shardIndex];
    if (item && !item.collected) { item.collected = true; this.collectibles.collectedCount++; if (this.audio) this.audio.playShard(data.shardType); if (this.particles) { const color = data.shardType === 'fire' ? '#ff0033' : '#00d4ff'; this.particles.emitSparkles(item.x + 10, item.y + 12, color, 14); } }
  }
  applyCheckpointSync(data) {
    if (!this.checkpoints) return;
    const cp = this.checkpoints.checkpoints.find(c => c.id === data.checkpointId);
    if (cp && !cp.isActivated) { cp.isActivated = true; this.checkpoints.activeId = cp.id; if (this.ember) this.ember.setSpawn(cp.x - 8, cp.y + cp.height - this.ember.height); if (this.tide) this.tide.setSpawn(cp.x + 16, cp.y + cp.height - this.tide.height); if (this.audio) this.audio.playCheckpoint(); }
  }
  applyPlayerDeathSync(data) {
    if (data.playerType === 'ember' && this.ember && !this.ember.isDead) this.ember.die(data.cause);
    else if (data.playerType === 'tide' && this.tide && !this.tide.isDead) this.tide.die(data.cause);
  }
  handleLevelCompletion() {
    this.state = 'LEVEL_COMPLETE';
    let stars = 1;
    const underPar = this.levelTimer <= this.currentLevelData.parTime;
    const noDeaths = this.deathCount === 0;
    const allShards = this.collectibles.collectedCount >= this.collectibles.totalCount;
    if (underPar && noDeaths && allShards) stars = 3;
    else if (allShards || (underPar && noDeaths) || (noDeaths && this.collectibles.collectedCount > 0)) stars = 2;
    this.saveManager.recordLevelComplete(this.currentLevelId, this.levelTimer, stars, this.collectibles.collectedCount, this.collectibles.totalCount);
    const completeData = { levelId: this.currentLevelId, levelName: this.currentLevelData.name, time: this.levelTimer, parTime: this.currentLevelData.parTime, stars, shards: this.collectibles.collectedCount, maxShards: this.collectibles.totalCount, deaths: this.deathCount, hasNextLevel: this.currentLevelId < ALL_LEVELS.length };
    if (this.isOnline && this.networkClient) this.networkClient.sendLevelComplete(completeData);
    if (this.onLevelCompleteCallback) this.onLevelCompleteCallback(completeData);
    if (this.onStateChangeCallback) this.onStateChangeCallback(this.state);
  }
  render() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    if (this.state === 'MENU') return;
    const theme = this.currentLevelData.theme || 'forest';
    this.renderer.renderBackground(this.camera, this.currentLevelData.width, this.currentLevelData.height, theme);
    this.camera.applyTransform(ctx);
    this.renderer.renderPlatforms(this.platforms, theme);
    this.renderer.renderLevelHints(this.currentLevelData.hints, ctx);
    this.hazards.render(ctx);
    this.mechanisms.render(ctx);
    this.checkpoints.render(ctx);
    this.collectibles.render(ctx);
    this.portal.render(ctx);
    this.ember.render(ctx);
    this.tide.render(ctx);
    this.particles.render(ctx);
    this.camera.restoreTransform(ctx);
    const ping = this.networkClient ? this.networkClient.pingMs : 0;
    this.renderer.renderHUD(this.currentLevelData.name, this.levelTimer, this.collectibles.collectedCount, this.collectibles.totalCount, this.ember, this.tide, this.isOnline, this.localPlayerRole, this.p1Name, this.p2Name, ping);
  }
}

// ─── AppController ───────────────────────────────────────────
class AppController {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.engine = new GameEngine(this.canvas);
    this.network = new NetworkClient();
    this.currentPage = 'home';
    this.isReadyInLobby = false;
    this.initElements();
    this.initRouting();
    this.initLevelSelectGrid();
    this.initModals();
    this.initSettingsUI();
    this.initTouchControls();
    this.initOnlineLobby();
    this.initNetworkHooks();
    this.initEngineCallbacks();
    this.checkUrlInvites();
    this.engine.startLoop();
  }
  initElements() {
    this.navButtons = document.querySelectorAll('.nav-btn[data-page]');
    this.pages = document.querySelectorAll('.page-view');
    this.logoBtn = document.getElementById('nav-logo');
    this.btnHeroOnline = document.getElementById('btn-hero-online');
    this.btnHeroLocal = document.getElementById('btn-hero-local');
    this.btnHeroLevels = document.getElementById('btn-hero-levels');
    this.btnStartLocal = document.getElementById('btn-start-local');
    this.btnStartOnline = document.getElementById('btn-start-online');
    this.btnQuickPause = document.getElementById('btn-quick-pause');
    this.btnQuickRestart = document.getElementById('btn-quick-restart');
    this.btnQuickMute = document.getElementById('btn-quick-mute');
    this.btnQuickFullscreen = document.getElementById('btn-quick-fullscreen');
    this.gameModeTag = document.getElementById('game-mode-tag');
    this.inputPlayerName = document.getElementById('player-display-name');
    this.onlineTabsView = document.getElementById('online-tabs-view');
    this.onlineRoomView = document.getElementById('online-room-view');
    this.btnCreateRoom = document.getElementById('btn-create-room');
    this.btnJoinRoom = document.getElementById('btn-join-room');
    this.inputJoinCode = document.getElementById('input-join-code');
    this.joinErrorMsg = document.getElementById('join-error-msg');
    this.displayRoomCode = document.getElementById('display-room-code');
    this.btnCopyCode = document.getElementById('btn-copy-code');
    this.btnCopyLink = document.getElementById('btn-copy-link');
    this.lobbyP1Name = document.getElementById('lobby-p1-name');
    this.lobbyP1Status = document.getElementById('lobby-p1-status');
    this.lobbyP1Ready = document.getElementById('lobby-p1-ready');
    this.lobbyP2Name = document.getElementById('lobby-p2-name');
    this.lobbyP2Status = document.getElementById('lobby-p2-status');
    this.lobbyP2Ready = document.getElementById('lobby-p2-ready');
    this.lobbyLevelPicker = document.getElementById('host-level-picker');
    this.lobbyLevelSelect = document.getElementById('lobby-level-select');
    this.btnToggleReady = document.getElementById('btn-toggle-ready');
    this.btnLeaveRoom = document.getElementById('btn-leave-room');
    this.countdownOverlay = document.getElementById('lobby-countdown-overlay');
    this.countdownNumber = document.getElementById('countdown-number');
    this.modalPause = document.getElementById('modal-pause');
    this.modalComplete = document.getElementById('modal-complete');
    this.modalGameOver = document.getElementById('modal-gameover');
    this.modalPartnerDisconnect = document.getElementById('modal-partner-disconnect');
    this.partnerDisconnectMsg = document.getElementById('partner-disconnect-msg');
    this.modalReset = document.getElementById('modal-reset');
    this.btnModalResume = document.getElementById('btn-modal-resume');
    this.btnModalRestart = document.getElementById('btn-modal-restart');
    this.btnModalLevels = document.getElementById('btn-modal-levels');
    this.btnModalNext = document.getElementById('btn-modal-next');
    this.btnModalReplay = document.getElementById('btn-modal-replay');
    this.btnModalWinLevels = document.getElementById('btn-modal-win-levels');
    this.btnModalRetry = document.getElementById('btn-modal-retry');
    this.btnModalFailLevels = document.getElementById('btn-modal-fail-levels');
    this.btnPartnerWait = document.getElementById('btn-partner-wait');
    this.btnPartnerLeave = document.getElementById('btn-partner-leave');
    this.btnOpenResetModal = document.getElementById('btn-open-reset-modal');
    this.btnConfirmReset = document.getElementById('btn-confirm-reset');
    this.btnCancelReset = document.getElementById('btn-cancel-reset');
  }
  initRouting() {
    this.navButtons.forEach(b => b.addEventListener('click', () => this.navigateTo(b.getAttribute('data-page'))));
    if (this.logoBtn) this.logoBtn.addEventListener('click', () => this.navigateTo('home'));
    if (this.btnHeroOnline) this.btnHeroOnline.addEventListener('click', () => this.navigateTo('online'));
    if (this.btnHeroLocal) this.btnHeroLocal.addEventListener('click', () => this.startLocalGame(1));
    if (this.btnHeroLevels) this.btnHeroLevels.addEventListener('click', () => this.navigateTo('levels'));
    if (this.btnStartLocal) this.btnStartLocal.addEventListener('click', () => this.startLocalGame(1));
    if (this.btnStartOnline) this.btnStartOnline.addEventListener('click', () => this.navigateTo('online'));
    const cardLocal = document.getElementById('card-mode-local');
    if (cardLocal) cardLocal.addEventListener('click', () => this.startLocalGame(1));
    const cardOnline = document.getElementById('card-mode-online');
    if (cardOnline) cardOnline.addEventListener('click', () => this.navigateTo('online'));
    if (this.btnQuickPause) this.btnQuickPause.addEventListener('click', () => this.engine.togglePause());
    if (this.btnQuickRestart) this.btnQuickRestart.addEventListener('click', () => this.engine.restartLevel());
    if (this.btnQuickMute) this.btnQuickMute.addEventListener('click', () => { const m = this.engine.audio.toggleMute(); this.btnQuickMute.textContent = m ? '🔇 Muted' : '🔊 Audio'; });
    if (this.btnQuickFullscreen) this.btnQuickFullscreen.addEventListener('click', () => this.toggleFullscreen());
  }
  navigateTo(id) {
    this.currentPage = id;
    this.navButtons.forEach(b => b.getAttribute('data-page') === id ? b.classList.add('active') : b.classList.remove('active'));
    this.pages.forEach(p => p.id === `page-${id}` ? p.classList.add('active') : p.classList.remove('active'));
    if (id !== 'play' && this.engine.state === 'PLAYING') this.engine.togglePause();
    if (id === 'levels') this.initLevelSelectGrid();
    if (id === 'online') { this.populateLobbyLevels(); this.updateSavedRoomBanner(); }
  }
  startLocalGame(levelId = 1) {
    if (!this.engine.saveManager.isLevelUnlocked(levelId)) return;
    this.navigateTo('play');
    if (this.gameModeTag) this.gameModeTag.textContent = '👥 Local Co-Op (1 Keyboard)';
    const n = localStorage.getItem('agy_user_name') || localStorage.getItem('ember_tide_player_name') || 'Ember';
    this.engine.startLevel(levelId, false, 'both', n, 'Tide', null);
  }
  checkUrlInvites() {
    try {
      const p = new URLSearchParams(window.location.search), c = p.get('room') || p.get('invite');
      if (c) { this.navigateTo('online'); if (this.inputJoinCode) this.inputJoinCode.value = c.trim().toUpperCase(); }
    } catch(e) {}
  }
  populateLobbyLevels() {
    if (!this.lobbyLevelSelect) return;
    const currentVal = Number(this.lobbyLevelSelect.value) || 1;
    this.lobbyLevelSelect.innerHTML = '';
    ALL_LEVELS.forEach(lvl => {
      const isUnlocked = this.engine.saveManager.isLevelUnlocked(lvl.id);
      const opt = document.createElement('option');
      opt.value = lvl.id;
      opt.textContent = isUnlocked ? `Level ${lvl.id}: ${lvl.name}` : `Level ${lvl.id}: ${lvl.name} (🔒 Locked)`;
      opt.disabled = !isUnlocked;
      this.lobbyLevelSelect.appendChild(opt);
    });
    if (this.engine.saveManager.isLevelUnlocked(currentVal)) {
      this.lobbyLevelSelect.value = currentVal;
    } else {
      this.lobbyLevelSelect.value = 1;
    }
  }
  updateSavedRoomBanner() {
    const banner = document.getElementById('saved-room-banner');
    if (!banner) return;
    const name = this.engine.saveManager.playerName || this.network.playerName || '';
    if (!name) { banner.style.display = 'none'; return; }
    banner.style.display = 'block';
    const nameDisp = document.getElementById('saved-player-name-disp');
    if (nameDisp) nameDisp.textContent = name;
    const maxUnlocked = Math.max(...(this.engine.saveManager.data.unlockedLevels || [1]));
    const maxBadge = document.getElementById('saved-max-level-badge');
    if (maxBadge) maxBadge.textContent = `أعلى مستوى: ${maxUnlocked}`;
    const lastRoom = this.engine.saveManager.getLastRoom();
    const codeDisp = document.getElementById('saved-room-code-disp');
    const lvlDisp = document.getElementById('saved-room-level-disp');
    if (lastRoom && lastRoom.code) {
      if (codeDisp) codeDisp.textContent = lastRoom.code;
      if (lvlDisp) lvlDisp.textContent = lastRoom.level || 1;
    } else {
      if (codeDisp) codeDisp.textContent = 'لا توجد';
      if (lvlDisp) lvlDisp.textContent = maxUnlocked;
    }
  }
  onProgressUpdated() {
    this.initLevelSelectGrid();
    this.populateLobbyLevels();
    this.updateSavedRoomBanner();
  }
  initOnlineLobby() {
    if (this.inputPlayerName) {
      const init = localStorage.getItem('agy_user_name') || this.network.playerName || 'Player';
      this.inputPlayerName.value = init;
      this.network.setPlayerName(init);
      this.engine.saveManager.setPlayerName(init);
      const onChg = e => {
        const val = e.target.value;
        this.network.setPlayerName(val);
        this.engine.saveManager.setPlayerName(val);
        this.populateLobbyLevels();
        this.updateSavedRoomBanner();
      };
      this.inputPlayerName.addEventListener('input', onChg);
      this.inputPlayerName.addEventListener('change', onChg);
    }
    if (this.btnCreateRoom) {
      this.btnCreateRoom.addEventListener('click', async () => {
        this.clearLobbyError();
        try {
          const selLvl = this.lobbyLevelSelect ? Number(this.lobbyLevelSelect.value) || 1 : 1;
          await this.network.createRoom(this.inputPlayerName.value.trim() || 'Ember', selLvl);
        } catch(e) {
          this.showLobbyError('Failed to connect.');
        }
      });
    }
    const btnResumeSaved = document.getElementById('btn-resume-saved-room');
    if (btnResumeSaved) {
      btnResumeSaved.addEventListener('click', async () => {
        this.clearLobbyError();
        const lastRoom = this.engine.saveManager.getLastRoom();
        const selLvl = (lastRoom && lastRoom.level) ? lastRoom.level : Math.max(...(this.engine.saveManager.data.unlockedLevels || [1]));
        try {
          await this.network.createRoom(this.inputPlayerName.value.trim() || 'Ember', selLvl);
        } catch(e) {
          this.showLobbyError('Failed to create room.');
        }
      });
    }
    if (this.btnJoinRoom) {
      this.btnJoinRoom.addEventListener('click', async () => {
        this.clearLobbyError();
        const code = this.inputJoinCode.value.trim().toUpperCase();
        if (!code) { this.showLobbyError('Enter a room code.'); return; }
        try {
          await this.network.joinRoom(code, this.inputPlayerName.value.trim() || 'Tide');
        } catch(e) {
          this.showLobbyError('Failed to join room.');
        }
      });
    }
    if (this.btnCopyCode) {
      this.btnCopyCode.addEventListener('click', () => {
        if (this.network.roomId) {
          navigator.clipboard && navigator.clipboard.writeText(this.network.roomId);
          this.btnCopyCode.textContent = '✓ Copied!';
          setTimeout(() => this.btnCopyCode.textContent = '📋 Copy Code', 2000);
        }
      });
    }
    if (this.btnCopyLink) {
      this.btnCopyLink.addEventListener('click', () => {
        if (this.network.roomId) {
          navigator.clipboard && navigator.clipboard.writeText(`${location.origin}${location.pathname}?room=${this.network.roomId}`);
          this.btnCopyLink.textContent = '✓ Link Copied!';
          setTimeout(() => this.btnCopyLink.textContent = '🔗 Copy Invite Link', 2000);
        }
      });
    }
    if (this.btnToggleReady) {
      this.btnToggleReady.addEventListener('click', () => {
        this.isReadyInLobby = !this.isReadyInLobby;
        this.network.setReady(this.isReadyInLobby);
        this.btnToggleReady.textContent = this.isReadyInLobby ? '✖ CANCEL READY' : '✓ I AM READY';
        this.btnToggleReady.style.background = this.isReadyInLobby ? '#475569' : '';
      });
    }
    if (this.lobbyLevelSelect) {
      this.lobbyLevelSelect.addEventListener('change', e => {
        if (this.network.playerSlot === 'p1') this.network.selectLevel(Number(e.target.value));
      });
    }
    if (this.btnLeaveRoom) {
      this.btnLeaveRoom.addEventListener('click', () => {
        this.network.leaveRoom();
        this.showLobbyTabsView();
      });
    }
  }
  showLobbyError(msg) { if (this.joinErrorMsg) { this.joinErrorMsg.textContent = msg; this.joinErrorMsg.style.display = 'block'; } }
  clearLobbyError() { if (this.joinErrorMsg) { this.joinErrorMsg.style.display = 'none'; this.joinErrorMsg.textContent = ''; } }
  showLobbyRoomView(rid) {
    if (this.onlineTabsView) this.onlineTabsView.style.display = 'none';
    if (this.onlineRoomView) this.onlineRoomView.style.display = 'block';
    if (this.displayRoomCode) this.displayRoomCode.textContent = rid;
    this.isReadyInLobby = false;
    if (this.btnToggleReady) { this.btnToggleReady.textContent = '✓ I AM READY'; this.btnToggleReady.style.background = ''; }
  }
  showLobbyTabsView() {
    if (this.onlineTabsView) this.onlineTabsView.style.display = 'block';
    if (this.onlineRoomView) this.onlineRoomView.style.display = 'none';
    if (this.countdownOverlay) this.countdownOverlay.style.display = 'none';
    this.clearLobbyError();
    this.populateLobbyLevels();
    this.updateSavedRoomBanner();
  }
  updateLobbyUI(d) {
    if (!d) return;
    if (d.p1) {
      this.lobbyP1Name.textContent = d.p1.name + (this.network.playerSlot === 'p1' ? ' (You)' : '');
      this.lobbyP1Status.textContent = d.p1.isConnected ? 'CONNECTED' : 'DISCONNECTED';
      this.lobbyP1Status.className = `player-status-badge ${d.p1.isConnected ? 'connected' : 'waiting'}`;
      this.lobbyP1Ready.textContent = d.p1.isReady ? 'READY ✓' : 'NOT READY';
      this.lobbyP1Ready.className = `player-ready-indicator ${d.p1.isReady ? 'is-ready' : 'not-ready'}`;
      this.lobbyP1Ready.style.display = 'block';
    }
    if (d.p2) {
      this.lobbyP2Name.textContent = d.p2.name + (this.network.playerSlot === 'p2' ? ' (You)' : '');
      this.lobbyP2Status.textContent = d.p2.isConnected ? 'CONNECTED' : 'DISCONNECTED';
      this.lobbyP2Status.className = `player-status-badge ${d.p2.isConnected ? 'connected' : 'waiting'}`;
      this.lobbyP2Ready.textContent = d.p2.isReady ? 'READY ✓' : 'NOT READY';
      this.lobbyP2Ready.className = `player-ready-indicator ${d.p2.isReady ? 'is-ready' : 'not-ready'}`;
      this.lobbyP2Ready.style.display = 'block';
    } else {
      this.lobbyP2Name.textContent = 'Waiting for Player 2...';
      this.lobbyP2Status.textContent = 'WAITING...';
      this.lobbyP2Status.className = 'player-status-badge waiting';
      this.lobbyP2Ready.style.display = 'none';
    }
    if (this.lobbyLevelSelect) {
      if (this.network.playerSlot === 'p1') {
        this.populateLobbyLevels();
        this.lobbyLevelSelect.value = d.currentLevel || 1;
        this.lobbyLevelSelect.disabled = false;
      } else {
        const lvl = getLevelById(d.currentLevel || 1);
        this.lobbyLevelSelect.innerHTML = `<option value="${lvl.id}" selected>Level ${lvl.id}: ${lvl.name}</option>`;
        this.lobbyLevelSelect.disabled = true;
      }
    }
  }
  initNetworkHooks() {
    this.network.onRoomCreated = msg => {
      this.showLobbyRoomView(msg.roomId);
      this.lobbyP1Name.textContent = msg.name + ' (You)';
      this.lobbyP1Status.textContent = 'CONNECTED';
      this.lobbyP1Status.className = 'player-status-badge connected';
      this.lobbyP2Name.textContent = 'Waiting for Player 2...';
      this.lobbyP2Status.textContent = 'WAITING...';
      this.lobbyP2Status.className = 'player-status-badge waiting';
      const selLvl = this.lobbyLevelSelect ? Number(this.lobbyLevelSelect.value) || 1 : 1;
      this.engine.saveManager.setLastRoom(msg.roomId, selLvl);
    };
    this.network.onRoomJoined = msg => {
      this.showLobbyRoomView(msg.roomId);
      this.updateLobbyUI(msg.roomData);
      const lvl = (msg.roomData && msg.roomData.currentLevel) || 1;
      this.engine.saveManager.setLastRoom(msg.roomId, lvl);
    };
    this.network.onRoomUpdated = d => this.updateLobbyUI(d);
    this.network.onGameStart = (levelId, roomData) => {
      if (this.countdownOverlay) {
        this.countdownOverlay.style.display = 'flex';
        let count = 3; this.countdownNumber.textContent = count;
        const ti = setInterval(() => { count--; if (count > 0) this.countdownNumber.textContent = count; else { clearInterval(ti); this.countdownOverlay.style.display = 'none'; this.launchOnlineGame(levelId, roomData); } }, 1000);
      } else this.launchOnlineGame(levelId, roomData);
    };
    this.network.onRemotePlayerState = (slot, state) => this.engine.applyRemotePlayerState(slot, state);
    this.network.onPuzzleSync = (action, data) => this.engine.applyPuzzleSync(action, data);
    this.network.onShardCollected = data => this.engine.applyShardCollected(data);
    this.network.onCheckpointSync = data => this.engine.applyCheckpointSync(data);
    this.network.onPlayerDied = data => this.engine.applyPlayerDeathSync(data);
    this.network.onRestartSync = levelId => this.engine.startLevel(levelId, true, this.network.role, this.network.playerSlot === 'p1' ? this.network.playerName : 'Partner', this.network.playerSlot === 'p2' ? this.network.playerName : 'Partner', this.network);
    this.network.onLevelCompleteSync = () => { if (this.engine.state !== 'LEVEL_COMPLETE') this.engine.handleLevelCompletion(); };
    this.network.onPlayerDisconnected = msg => {
      if (this.engine.isOnline && this.engine.state === 'PLAYING') { this.partnerDisconnectMsg.textContent = `${msg.message} Waiting (${msg.reconnectWindow || 25}s)...`; this.modalPartnerDisconnect.classList.add('active'); }
    };
    this.network.onError = err => this.showLobbyError(err);
  }
  launchOnlineGame(levelId, roomData) {
    this.navigateTo('play');
    const p1 = roomData && roomData.p1 ? roomData.p1.name : 'Ember';
    const p2 = roomData && roomData.p2 ? roomData.p2.name : 'Tide';
    if (this.gameModeTag) this.gameModeTag.textContent = `🌐 Online (Room: ${this.network.roomId} | You: ${this.network.role === 'ember' ? '🔥 Ember' : '💧 Tide'})`;
    this.engine.startLevel(levelId, true, this.network.role, p1, p2, this.network);
  }
  initLevelSelectGrid() {
    const grid = document.getElementById('levelsGrid');
    if (!grid) return;
    grid.innerHTML = '';
    ALL_LEVELS.forEach(lvl => {
      const unlocked = this.engine.saveManager.isLevelUnlocked(lvl.id), stat = this.engine.saveManager.getLevelStat(lvl.id);
      const card = document.createElement('div');
      card.className = `level-card ${unlocked ? '' : 'locked'}`;
      if (!unlocked) card.style.opacity = '0.5';
      const stars = unlocked && stat.stars > 0 ? '★'.repeat(stat.stars) + '☆'.repeat(3 - stat.stars) : '☆☆☆';
      card.innerHTML = `<div class="level-card-header"><span class="level-num-badge">LEVEL ${lvl.id}</span><span class="level-stars">${unlocked ? stars : '🔒 Locked'}</span></div><h3 class="level-title">${lvl.name}</h3><p class="level-desc">${lvl.description}</p><div class="level-stats-row"><span>⏱️ Best: ${stat.bestTime ? stat.bestTime + 's' : '--'}</span><span>${stat.shards || 0}/${stat.maxShards || 3} 💎</span></div>`;
      if (unlocked) {
        card.style.cursor = 'pointer';
        card.addEventListener('click', () => this.startLocalGame(lvl.id));
      } else {
        card.style.cursor = 'not-allowed';
      }
      grid.appendChild(card);
    });
  }
  initModals() {
    if (this.btnModalResume) this.btnModalResume.addEventListener('click', () => { if (this.modalPause) this.modalPause.classList.remove('active'); this.engine.togglePause(); this.navigateTo('play'); });
    const btnExitHub = document.getElementById('btn-modal-exit-hub');
    if (btnExitHub) btnExitHub.addEventListener('click', () => { if (this.modalPause) this.modalPause.classList.remove('active'); this.navigateTo('home'); });
    if (this.btnModalRestart) this.btnModalRestart.addEventListener('click', () => { if (this.modalPause) this.modalPause.classList.remove('active'); this.engine.restartLevel(); this.navigateTo('play'); });
    if (this.btnModalLevels) this.btnModalLevels.addEventListener('click', () => { if (this.modalPause) this.modalPause.classList.remove('active'); this.navigateTo('levels'); });
    if (this.btnModalNext) {
      this.btnModalNext.addEventListener('click', () => {
        if (this.modalComplete) this.modalComplete.classList.remove('active');
        const next = this.engine.currentLevelId + 1;
        if (next <= ALL_LEVELS.length && this.engine.saveManager.isLevelUnlocked(next)) {
          if (this.engine.isOnline && this.network) this.network.sendRestartRequest(next);
          this.engine.startLevel(next, this.engine.isOnline, this.engine.localPlayerRole, this.engine.p1Name, this.engine.p2Name, this.network);
          this.navigateTo('play');
        } else this.navigateTo('levels');
      });
    }
    if (this.btnModalReplay) this.btnModalReplay.addEventListener('click', () => { if (this.modalComplete) this.modalComplete.classList.remove('active'); this.engine.restartLevel(); this.navigateTo('play'); });
    if (this.btnModalWinLevels) this.btnModalWinLevels.addEventListener('click', () => { if (this.modalComplete) this.modalComplete.classList.remove('active'); this.navigateTo('levels'); });
    if (this.btnModalRetry) this.btnModalRetry.addEventListener('click', () => { if (this.modalGameOver) this.modalGameOver.classList.remove('active'); this.engine.restartLevel(); this.navigateTo('play'); });
    if (this.btnModalFailLevels) this.btnModalFailLevels.addEventListener('click', () => { if (this.modalGameOver) this.modalGameOver.classList.remove('active'); this.navigateTo('levels'); });
    if (this.btnPartnerWait) this.btnPartnerWait.addEventListener('click', () => { if (this.modalPartnerDisconnect) this.modalPartnerDisconnect.classList.remove('active'); });
    if (this.btnPartnerLeave) this.btnPartnerLeave.addEventListener('click', () => { if (this.modalPartnerDisconnect) this.modalPartnerDisconnect.classList.remove('active'); this.network.leaveRoom(); this.navigateTo('online'); });
    if (this.btnOpenResetModal) this.btnOpenResetModal.addEventListener('click', () => { if (this.modalReset) this.modalReset.classList.add('active'); });
    if (this.btnCancelReset) this.btnCancelReset.addEventListener('click', () => { if (this.modalReset) this.modalReset.classList.remove('active'); });
    if (this.btnConfirmReset) { this.btnConfirmReset.addEventListener('click', () => { this.engine.saveManager.resetProgress(); if (this.modalReset) this.modalReset.classList.remove('active'); this.initLevelSelectGrid(); }); }
  }
  initSettingsUI() {
    const ss = document.getElementById('slider-sfx'), sm = document.getElementById('slider-music'), ts = document.getElementById('toggle-shake'), tp = document.getElementById('toggle-particles');
    if (ss) { ss.value = this.engine.saveManager.getSetting('sfxVolume') || 0.8; ss.addEventListener('input', e => this.engine.audio.setSfxVolume(parseFloat(e.target.value))); }
    if (sm) { sm.value = this.engine.saveManager.getSetting('musicVolume') || 0.6; sm.addEventListener('input', e => this.engine.audio.setMusicVolume(parseFloat(e.target.value))); }
    if (ts) { ts.checked = this.engine.saveManager.getSetting('screenShake') !== false; ts.addEventListener('change', e => this.engine.saveManager.setSetting('screenShake', e.target.checked)); }
    if (tp) { tp.checked = this.engine.saveManager.getSetting('particles') !== false; tp.addEventListener('change', e => { this.engine.saveManager.setSetting('particles', e.target.checked); this.engine.particles.setEnabled(e.target.checked); }); }
  }
  initTouchControls() {
    const bind = (id, action) => {
      const el = document.getElementById(id); if (!el) return;
      const p = e => { e.preventDefault(); this.engine.input.setTouchInput(action, true); };
      const r = e => { e.preventDefault(); this.engine.input.setTouchInput(action, false); };
      el.addEventListener('touchstart', p, { passive: false }); el.addEventListener('touchend', r, { passive: false }); el.addEventListener('touchcancel', r, { passive: false });
      el.addEventListener('mousedown', p); el.addEventListener('mouseup', r); el.addEventListener('mouseleave', r);
    };
    bind('touch-ember-left', 'emberLeft'); bind('touch-ember-right', 'emberRight'); bind('touch-ember-jump', 'emberJump');
    bind('touch-tide-left', 'tideLeft'); bind('touch-tide-right', 'tideRight'); bind('touch-tide-jump', 'tideJump');
  }
  initEngineCallbacks() {
    this.engine.onStateChangeCallback = s => {
      if (s === 'PAUSED' && this.modalPause) this.modalPause.classList.add('active');
      else if (s === 'PLAYING') {
        if (this.modalPause) this.modalPause.classList.remove('active');
        if (this.modalComplete) this.modalComplete.classList.remove('active');
        if (this.modalGameOver) this.modalGameOver.classList.remove('active');
      }
    };
    this.engine.onGameOverCallback = whoDied => {
      const desc = document.getElementById('gameover-desc');
      if (desc) desc.textContent = `${whoDied} perished in the hazards.`;
      if (this.modalGameOver) this.modalGameOver.classList.add('active');
    };
    this.engine.onLevelCompleteCallback = res => {
      const ss = '★'.repeat(res.stars) + '☆'.repeat(3 - res.stars);
      document.getElementById('complete-stars').textContent = ss;
      document.getElementById('complete-level-title').textContent = `Level ${res.levelId}: ${res.levelName}`;
      const mi = Math.floor(res.time / 60), se = (res.time % 60).toFixed(1);
      document.getElementById('complete-time').textContent = `${mi}:${se < 10 ? '0' : ''}${se}`;
      document.getElementById('complete-shards').textContent = `${res.shards}/${res.maxShards}`;
      document.getElementById('complete-deaths').textContent = res.deaths;
      this.btnModalNext.textContent = res.hasNextLevel ? 'NEXT LEVEL ➔' : '🎉 FINISH GAME ➔';
      if (this.modalComplete) this.modalComplete.classList.add('active');
    };
  }
  toggleFullscreen() {
    const w = document.getElementById('canvasWrapper');
    if (!document.fullscreenElement) { if (w.requestFullscreen) w.requestFullscreen(); else if (w.webkitRequestFullscreen) w.webkitRequestFullscreen(); }
    else { if (document.exitFullscreen) document.exitFullscreen(); }
  }
}

// ─── Bootstrap ───────────────────────────────────────────────
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => { window.app = new AppController(); });
} else {
  window.app = new AppController();
}
