// =========================================================
// Ember & Tide - Procedural WebAudio Engine
// Zero-asset dependency sound synthesis and procedural OST
// =========================================================

export class AudioManager {
  constructor(saveManager) {
    this.saveManager = saveManager;
    this.ctx = null;
    this.masterGain = null;
    this.sfxGain = null;
    this.musicGain = null;
    this.isInitialized = false;

    // Music state
    this.isPlayingMusic = false;
    this.musicInterval = null;
    this.currentTrack = 'menu'; // 'menu', 'game_temple', 'game_core'
    this.stepCount = 0;

    // Default volume levels from settings
    this.sfxVolume = saveManager ? saveManager.getSetting('sfxVolume') : 0.8;
    this.musicVolume = saveManager ? saveManager.getSetting('musicVolume') : 0.6;
    this.isMuted = false;
  }

  init() {
    if (this.isInitialized) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(1.0, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.setValueAtTime(this.sfxVolume, this.ctx.currentTime);
      this.sfxGain.connect(this.masterGain);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.setValueAtTime(this.musicVolume, this.ctx.currentTime);
      this.musicGain.connect(this.masterGain);

      this.isInitialized = true;
    } catch (e) {
      console.warn('Web Audio API not supported or blocked:', e);
    }
  }

  ensureContext() {
    if (!this.isInitialized) {
      this.init();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setSfxVolume(val) {
    this.sfxVolume = Math.max(0, Math.min(1, val));
    if (this.sfxGain && this.ctx) {
      this.sfxGain.gain.setTargetAtTime(this.sfxVolume, this.ctx.currentTime, 0.05);
    }
    if (this.saveManager) this.saveManager.setSetting('sfxVolume', this.sfxVolume);
  }

  setMusicVolume(val) {
    this.musicVolume = Math.max(0, Math.min(1, val));
    if (this.musicGain && this.ctx) {
      this.musicGain.gain.setTargetAtTime(this.musicVolume, this.ctx.currentTime, 0.05);
    }
    if (this.saveManager) this.saveManager.setSetting('musicVolume', this.musicVolume);
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.isMuted ? 0 : 1.0, this.ctx.currentTime, 0.05);
    }
    return this.isMuted;
  }

  // ----------------------------------------------------
  // Sound Effects (Synthesized Oscillators)
  // ----------------------------------------------------

  playJump(isEmber = true) {
    this.ensureContext();
    if (!this.ctx || this.isMuted || this.sfxVolume <= 0) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = isEmber ? 'sawtooth' : 'sine';
    const startFreq = isEmber ? 160 : 220;
    const endFreq = isEmber ? 380 : 480;

    osc.frequency.setValueAtTime(startFreq, t);
    osc.frequency.exponentialRampToValueAtTime(endFreq, t + 0.14);

    gain.gain.setValueAtTime(0.18, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.16);
  }

  playLand() {
    this.ensureContext();
    if (!this.ctx || this.isMuted || this.sfxVolume <= 0) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.exponentialRampToValueAtTime(45, t + 0.09);

    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.1);
  }

  playShard(element = 'fire') {
    this.ensureContext();
    if (!this.ctx || this.isMuted || this.sfxVolume <= 0) return;
    const t = this.ctx.currentTime;
    const freqs = element === 'fire' ? [523.25, 659.25, 783.99, 1046.50] : [587.33, 739.99, 880.00, 1174.66];
    
    freqs.forEach((f, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, t + i * 0.04);

      gain.gain.setValueAtTime(0, t + i * 0.04);
      gain.gain.linearRampToValueAtTime(0.12, t + i * 0.04 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.04 + 0.35);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(t + i * 0.04);
      osc.stop(t + i * 0.04 + 0.36);
    });
  }

  playSwitch(isPressed = true) {
    this.ensureContext();
    if (!this.ctx || this.isMuted || this.sfxVolume <= 0) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(isPressed ? 320 : 240, t);
    osc.frequency.exponentialRampToValueAtTime(isPressed ? 640 : 160, t + 0.08);

    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.1);
  }

  playRune() {
    this.ensureContext();
    if (!this.ctx || this.isMuted || this.sfxVolume <= 0) return;
    const t = this.ctx.currentTime;
    [440, 554.37, 659.25, 880].forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.08, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5 + idx * 0.1);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + 0.6 + idx * 0.1);
    });
  }

  playDoor() {
    this.ensureContext();
    if (!this.ctx || this.isMuted || this.sfxVolume <= 0) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(90, t);
    osc.frequency.linearRampToValueAtTime(140, t + 0.3);

    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.35);
  }

  playDeath() {
    this.ensureContext();
    if (!this.ctx || this.isMuted || this.sfxVolume <= 0) return;
    const t = this.ctx.currentTime;
    
    // Low rumble + sizzle sweep
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(300, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.45);

    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.48);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.48);
  }

  playRespawn() {
    this.ensureContext();
    if (!this.ctx || this.isMuted || this.sfxVolume <= 0) return;
    const t = this.ctx.currentTime;
    [261.63, 329.63, 392.00, 523.25].forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t + idx * 0.05);

      gain.gain.setValueAtTime(0, t + idx * 0.05);
      gain.gain.linearRampToValueAtTime(0.12, t + idx * 0.05 + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.05 + 0.25);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(t + idx * 0.05);
      osc.stop(t + idx * 0.05 + 0.26);
    });
  }

  playCheckpoint() {
    this.ensureContext();
    if (!this.ctx || this.isMuted || this.sfxVolume <= 0) return;
    const t = this.ctx.currentTime;
    [349.23, 440.00, 523.25, 698.46].forEach((f, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, t + i * 0.06);

      gain.gain.setValueAtTime(0, t + i * 0.06);
      gain.gain.linearRampToValueAtTime(0.15, t + i * 0.06 + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.06 + 0.4);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(t + i * 0.06);
      osc.stop(t + i * 0.06 + 0.41);
    });
  }

  playWin() {
    this.ensureContext();
    if (!this.ctx || this.isMuted || this.sfxVolume <= 0) return;
    const t = this.ctx.currentTime;
    const fanfare = [
      { f: 523.25, d: 0.12, time: 0 },
      { f: 659.25, d: 0.12, time: 0.12 },
      { f: 783.99, d: 0.12, time: 0.24 },
      { f: 1046.50, d: 0.4, time: 0.36 },
      { f: 880.00, d: 0.15, time: 0.8 },
      { f: 1046.50, d: 0.6, time: 0.95 }
    ];

    fanfare.forEach(item => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(item.f, t + item.time);

      gain.gain.setValueAtTime(0, t + item.time);
      gain.gain.linearRampToValueAtTime(0.2, t + item.time + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + item.time + item.d);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(t + item.time);
      osc.stop(t + item.time + item.d + 0.05);
    });
  }

  playClick() {
    this.ensureContext();
    if (!this.ctx || this.isMuted || this.sfxVolume <= 0) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, t);
    osc.frequency.exponentialRampToValueAtTime(400, t + 0.04);
    gain.gain.setValueAtTime(0.1, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.05);
  }

  // ----------------------------------------------------
  // Dynamic Procedural Background Music
  // ----------------------------------------------------

  startMusic(track = 'game_temple') {
    this.ensureContext();
    this.currentTrack = track;
    if (this.isPlayingMusic) return;
    this.isPlayingMusic = true;
    this.stepCount = 0;

    // Run music sequencer loop
    const stepDuration = 220; // ms per 16th note (~136 BPM)
    this.musicInterval = setInterval(() => {
      if (!this.isPlayingMusic || !this.ctx || this.isMuted || this.musicVolume <= 0) return;
      this.playMusicStep(this.stepCount);
      this.stepCount = (this.stepCount + 1) % 64;
    }, stepDuration);
  }

  stopMusic() {
    this.isPlayingMusic = false;
    if (this.musicInterval) {
      clearInterval(this.musicInterval);
      this.musicInterval = null;
    }
  }

  playMusicStep(step) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;

    // Mystical Scale (D minor / Aeolian: D, E, F, G, A, Bb, C)
    const dMinorScale = [146.83, 164.81, 174.61, 196.00, 220.00, 233.08, 261.63, 293.66, 329.63, 349.23, 392.00, 440.00];
    const bassNotes = [73.42, 73.42, 87.31, 65.41]; // D, D, F, C

    // 1. Bassline (Every 4 steps)
    if (step % 4 === 0) {
      const chordIdx = Math.floor(step / 16) % 4;
      const bassFreq = bassNotes[chordIdx];
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(bassFreq, t);

      gain.gain.setValueAtTime(0.12 * this.musicVolume, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

      osc.connect(gain);
      gain.connect(this.musicGain);

      osc.start(t);
      osc.stop(t + 0.42);
    }

    // 2. Ambient Arpeggio (Every 2 steps)
    if (step % 2 === 0) {
      const arpPatterns = [0, 4, 7, 9, 7, 4, 2, 5];
      const arpNote = dMinorScale[arpPatterns[(step / 2) % arpPatterns.length]];
      
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(arpNote * 2, t);

      gain.gain.setValueAtTime(0.035 * this.musicVolume, t);
      gain.gain.exponentialRampToValueAtTime(0.0005, t + 0.28);

      osc.connect(gain);
      gain.connect(this.musicGain);

      osc.start(t);
      osc.stop(t + 0.3);
    }

    // 3. Subtle Pad Sweep on phrase change (every 16 steps)
    if (step % 16 === 0) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(293.66, t); // D4
      osc.frequency.linearRampToValueAtTime(349.23, t + 2.0); // F4

      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.04 * this.musicVolume, t + 0.5);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 2.5);

      osc.connect(gain);
      gain.connect(this.musicGain);

      osc.start(t);
      osc.stop(t + 2.6);
    }
  }
}
