// =========================================================
// Ember & Tide - Core Game Engine
// Local 2-Player & Real-Time Online 2-Player Co-Op
// =========================================================

import { InputManager } from './input.js';
import { AudioManager } from './audio.js';
import { SaveManager } from './save.js';
import { ParticleSystem } from './particles.js';
import { Camera } from './camera.js';
import { Renderer } from './renderer.js';
import { Player } from './entities/player.js';
import { HazardManager } from './entities/hazards.js';
import { MechanismManager } from './entities/mechanisms.js';
import { CheckpointManager } from './entities/checkpoint.js';
import { CollectibleManager } from './entities/collectibles.js';
import { PortalGateway } from './entities/portal.js';
import { getLevelById, ALL_LEVELS } from './levels/index.js';

export class GameEngine {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');

    this.saveManager = new SaveManager();
    this.audio = new AudioManager(this.saveManager);
    this.input = new InputManager();
    this.particles = new ParticleSystem();
    this.camera = new Camera(canvas.width, canvas.height);
    this.renderer = new Renderer(canvas);

    // Game state
    this.state = 'MENU'; // 'MENU', 'PLAYING', 'PAUSED', 'LEVEL_COMPLETE'
    this.currentLevelId = 1;
    this.currentLevelData = null;
    this.levelTimer = 0;
    this.deathCount = 0;
    this.isVictoryHandled = false;

    // Multiplayer properties
    this.isOnline = false;
    this.localPlayerRole = 'both'; // 'both' (local), 'ember' (online P1), 'tide' (online P2)
    this.p1Name = 'Ember';
    this.p2Name = 'Tide';
    this.networkClient = null;
    this.netSyncTimer = 0;

    // Entities
    this.ember = null;
    this.tide = null;
    this.hazards = null;
    this.mechanisms = null;
    this.checkpoints = null;
    this.collectibles = null;
    this.portal = null;
    this.platforms = [];

    // Callbacks for UI
    this.onLevelCompleteCallback = null;
    this.onStateChangeCallback = null;

    // Loop
    this.lastTime = 0;
    this.isRunning = false;
    this.animationFrameId = null;

    this.initSettings();
  }

  initSettings() {
    const screenShake = this.saveManager.getSetting('screenShake');
    const particles = this.saveManager.getSetting('particles');
    this.particles.setEnabled(particles !== false);
  }

  startLevel(levelId, isOnline = false, localRole = 'both', p1Name = 'Ember', p2Name = 'Tide', networkClient = null) {
    this.currentLevelId = Number(levelId);
    this.currentLevelData = getLevelById(this.currentLevelId);
    this.levelTimer = 0;
    this.deathCount = 0;
    this.isVictoryHandled = false;

    this.isOnline = isOnline;
    this.localPlayerRole = localRole;
    this.p1Name = p1Name || 'Ember';
    this.p2Name = p2Name || 'Tide';
    this.networkClient = networkClient;
    this.netSyncTimer = 0;

    // Camera bounds
    this.camera.setLevelBounds(this.currentLevelData.width, this.currentLevelData.height);
    this.camera.setViewport(this.canvas.width, this.canvas.height);

    // Setup Platforms
    this.platforms = [...this.currentLevelData.platforms];

    // Setup Players
    this.ember = new Player(
      'ember',
      this.currentLevelData.emberSpawn.x,
      this.currentLevelData.emberSpawn.y,
      this.audio,
      this.particles
    );

    this.tide = new Player(
      'tide',
      this.currentLevelData.tideSpawn.x,
      this.currentLevelData.tideSpawn.y,
      this.audio,
      this.particles
    );

    // Configure role ownership for online play
    if (this.isOnline) {
      this.ember.isRemote = (this.localPlayerRole === 'tide');
      this.tide.isRemote = (this.localPlayerRole === 'ember');
      this.ember.displayName = this.p1Name;
      this.tide.displayName = this.p2Name;
    }

    // Setup Hazards
    this.hazards = new HazardManager(this.particles);
    for (const h of this.currentLevelData.hazards) {
      if (h.type === 'lava') this.hazards.addLava(h.x, h.y, h.width, h.height);
      else if (h.type === 'water') this.hazards.addWater(h.x, h.y, h.width, h.height);
      else if (h.type === 'acid') this.hazards.addAcid(h.x, h.y, h.width, h.height);
      else if (h.type === 'spikes') this.hazards.addSpikes(h.x, h.y, h.width, h.height, h.orientation);
      else if (h.type === 'laser') this.hazards.addLaser(h.x, h.y, h.width, h.height, h.timerCycle, h.isVertical);
    }

    // Setup Mechanisms
    this.mechanisms = new MechanismManager(this.audio, this.particles);
    const m = this.currentLevelData.mechanisms;
    if (m.pushBoxes) {
      m.pushBoxes.forEach(b => this.mechanisms.addPushBox(b.id, b.x, b.y, b.width, b.height));
    }
    if (m.pressurePlates) {
      m.pressurePlates.forEach(pp => this.mechanisms.addPressurePlate(pp.id, pp.x, pp.y, pp.width, pp.height, pp.targetIds, pp.color || '#a855f7', pp.isLatching));
    }
    if (m.levers) {
      m.levers.forEach(lev => this.mechanisms.addLever(lev.id, lev.x, lev.y, lev.width, lev.height, lev.targetIds, lev.defaultState));
    }
    if (m.elementalRunes) {
      m.elementalRunes.forEach(er => this.mechanisms.addElementalRune(er.id, er.x, er.y, er.width, er.height, er.requiredElement, er.targetIds));
    }
    if (m.doors) {
      m.doors.forEach(d => this.mechanisms.addDoor(d.id, d.x, d.y, d.width, d.height, d.openDirection, d.defaultOpen, d.color));
    }
    if (m.movingPlatforms) {
      m.movingPlatforms.forEach(mp => this.mechanisms.addMovingPlatform(mp.id, mp.x, mp.y, mp.width, mp.height, mp.waypoints, mp.speed, mp.color || '#eab308', mp.requiresTrigger, mp.triggerId));
    }
    if (m.dualSwitches) {
      m.dualSwitches.forEach(ds => this.mechanisms.addDualSwitch(ds.id, ds.x1, ds.y1, ds.x2, ds.y2, ds.targetIds, ds.timeLimit));
    }

    // Setup Checkpoints
    this.checkpoints = new CheckpointManager(this.audio, this.particles);
    if (this.currentLevelData.checkpoints) {
      this.currentLevelData.checkpoints.forEach(cp => this.checkpoints.addCheckpoint(cp.id, cp.x, cp.y, cp.width, cp.height));
    }

    // Setup Collectibles
    this.collectibles = new CollectibleManager(this.audio, this.particles);
    if (this.currentLevelData.collectibles) {
      this.currentLevelData.collectibles.forEach(col => this.collectibles.addShard(col.type, col.x, col.y));
    }

    // Setup Portal Gateway
    this.portal = new PortalGateway(
      this.currentLevelData.emberGoal,
      this.currentLevelData.tideGoal,
      this.audio,
      this.particles
    );

    this.state = 'PLAYING';
    this.audio.startMusic(this.currentLevelId === 5 ? 'game_core' : 'game_temple');

    if (this.onStateChangeCallback) {
      this.onStateChangeCallback(this.state);
    }
  }

  restartLevel() {
    if (this.currentLevelId) {
      if (this.isOnline && this.networkClient) {
        this.networkClient.sendRestartRequest(this.currentLevelId);
      }
      this.startLevel(this.currentLevelId, this.isOnline, this.localPlayerRole, this.p1Name, this.p2Name, this.networkClient);
    }
  }

  togglePause() {
    if (this.state === 'PLAYING') {
      this.state = 'PAUSED';
    } else if (this.state === 'PAUSED') {
      this.state = 'PLAYING';
    }
    if (this.onStateChangeCallback) {
      this.onStateChangeCallback(this.state);
    }
  }

  startLoop() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTime = performance.now();

    const loop = (time) => {
      const dt = Math.min((time - this.lastTime) / 1000, 0.1);
      this.lastTime = time;

      this.update(dt);
      this.render();

      if (this.isRunning) {
        this.animationFrameId = requestAnimationFrame(loop);
      }
    };

    this.animationFrameId = requestAnimationFrame(loop);
  }

  stopLoop() {
    this.isRunning = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.audio.stopMusic();
  }

  update(dt) {
    // Check Pause & Restart Inputs
    if (this.input.isJustPressed('pause')) {
      this.togglePause();
    }
    if (this.input.isJustPressed('restart') && this.state === 'PLAYING') {
      this.restartLevel();
    }

    if (this.state !== 'PLAYING') {
      this.input.update();
      return;
    }

    this.levelTimer += dt;

    // Get Inputs
    const emberInput = this.input.getEmberInput();
    const tideInput = this.input.getTideInput();

    // Update Mechanisms with platforms
    this.mechanisms.update(dt, [this.ember, this.tide], this.platforms);

    // Moving colliders (moving platforms + closed doors)
    const movingColliders = [
      ...this.mechanisms.movingPlatforms,
      ...this.mechanisms.doors.filter(d => !d.isOpen)
    ];

    // 1. Update Players based on Local vs Online mode (with push boxes)
    const boxes = this.mechanisms.pushBoxes || [];
    if (!this.isOnline || this.localPlayerRole === 'both') {
      // Local Co-Op mode: both players controlled locally
      this.ember.update(dt, emberInput, this.platforms, movingColliders, boxes);
      this.tide.update(dt, tideInput, this.platforms, movingColliders, boxes);
    } else if (this.localPlayerRole === 'ember') {
      // Online Player 1: local Ember, remote Tide
      this.ember.update(dt, emberInput, this.platforms, movingColliders, boxes);
      this.tide.updateRemote(dt);

      // Transmit Ember state over network (~30 FPS)
      this.netSyncTimer += dt;
      if (this.netSyncTimer >= 0.033 && this.networkClient) {
        this.netSyncTimer = 0;
        this.networkClient.sendPlayerState(this.ember);
      }
    } else if (this.localPlayerRole === 'tide') {
      // Online Player 2: local Tide (allows either Arrows or WASD for ease), remote Ember
      const unifiedTideInput = {
        left: tideInput.left || emberInput.left,
        right: tideInput.right || emberInput.right,
        jump: tideInput.jump || emberInput.jump,
        interact: tideInput.interact || emberInput.interact
      };
      this.tide.update(dt, unifiedTideInput, this.platforms, movingColliders, boxes);
      this.ember.updateRemote(dt);

      // Transmit Tide state over network (~30 FPS)
      this.netSyncTimer += dt;
      if (this.netSyncTimer >= 0.033 && this.networkClient) {
        this.netSyncTimer = 0;
        this.networkClient.sendPlayerState(this.tide);
      }
    }

    // Track deaths & broadcast if online
    const localDied = (this.localPlayerRole === 'ember' && this.ember.deathTimer === 0.7) ||
                      (this.localPlayerRole === 'tide' && this.tide.deathTimer === 0.7) ||
                      (this.localPlayerRole === 'both' && (this.ember.deathTimer === 0.7 || this.tide.deathTimer === 0.7));

    if (localDied) {
      this.deathCount++;
      this.saveManager.recordDeath();
      if (this.saveManager.getSetting('screenShake') !== false) {
        this.camera.shake(8, 0.3);
      }
      if (this.isOnline && this.networkClient) {
        this.networkClient.sendPlayerDied(this.localPlayerRole, 'hazard');
      }
    }

    // Update Hazards
    this.hazards.update(dt, [this.ember, this.tide]);

    // Update Checkpoints
    const prevCpId = this.checkpoints.activeId;
    this.checkpoints.update(dt, [this.ember, this.tide]);
    if (this.isOnline && this.checkpoints.activeId && this.checkpoints.activeId !== prevCpId && this.networkClient) {
      const activeCp = this.checkpoints.checkpoints.find(c => c.id === this.checkpoints.activeId);
      if (activeCp) {
        this.networkClient.sendCheckpointReached(activeCp.id, activeCp.x, activeCp.y);
      }
    }

    // Update Collectibles
    const prevCollected = this.collectibles.collectedCount;
    this.collectibles.update(dt, [this.ember, this.tide]);
    if (this.isOnline && this.collectibles.collectedCount > prevCollected && this.networkClient) {
      const collectedIdx = this.collectibles.items.findIndex(i => i.collected);
      if (collectedIdx !== -1) {
        this.networkClient.sendShardCollected(collectedIdx, this.collectibles.items[collectedIdx].type);
      }
    }

    // Update Particles & Background
    this.particles.update(dt);
    this.renderer.updateBackground(dt);

    // Update Dynamic Camera
    this.camera.update(dt, this.ember, this.tide);

    // Update Portal Gateway and check Level Win
    const isLevelWon = this.portal.update(dt, [this.ember, this.tide]);
    if (isLevelWon && !this.isVictoryHandled) {
      this.isVictoryHandled = true;
      this.handleLevelCompletion();
    }

    this.input.update();
  }

  // ----------------------------------------------------
  // Network Synchronization Hooks
  // ----------------------------------------------------

  applyRemotePlayerState(slot, state) {
    if (slot === 'p1' && this.ember && this.ember.isRemote) {
      this.ember.applyRemoteState(state);
    } else if (slot === 'p2' && this.tide && this.tide.isRemote) {
      this.tide.applyRemoteState(state);
    }
  }

  applyPuzzleSync(action, data) {
    if (!this.mechanisms) return;
    if (action === 'pressure_plate') {
      const pp = this.mechanisms.pressurePlates.find(p => p.id === data.id);
      if (pp) {
        pp.isPressed = data.isPressed;
        this.mechanisms.triggerTargets(pp.targetIds, pp.isPressed);
      }
    } else if (action === 'lever') {
      const lev = this.mechanisms.levers.find(l => l.id === data.id);
      if (lev) {
        lev.isOn = data.isOn;
        this.mechanisms.triggerTargets(lev.targetIds, lev.isOn);
      }
    }
  }

  applyShardCollected(data) {
    if (!this.collectibles) return;
    const item = this.collectibles.items[data.shardIndex];
    if (item && !item.collected) {
      item.collected = true;
      this.collectibles.collectedCount++;
      if (this.audio) this.audio.playShard(data.shardType);
      if (this.particles) {
        const color = data.shardType === 'fire' ? '#ff7800' : '#00b4d8';
        this.particles.emitSparkles(item.x + 10, item.y + 12, color, 14);
      }
    }
  }

  applyCheckpointSync(data) {
    if (!this.checkpoints) return;
    const cp = this.checkpoints.checkpoints.find(c => c.id === data.checkpointId);
    if (cp && !cp.isActivated) {
      cp.isActivated = true;
      this.checkpoints.activeId = cp.id;
      if (this.ember) this.ember.setSpawn(cp.x - 8, cp.y + cp.height - this.ember.height);
      if (this.tide) this.tide.setSpawn(cp.x + 16, cp.y + cp.height - this.tide.height);
      if (this.audio) this.audio.playCheckpoint();
    }
  }

  applyPlayerDeathSync(data) {
    if (data.playerType === 'ember' && this.ember && !this.ember.isDead) {
      this.ember.die(data.cause);
    } else if (data.playerType === 'tide' && this.tide && !this.tide.isDead) {
      this.tide.die(data.cause);
    }
  }

  handleLevelCompletion() {
    this.state = 'LEVEL_COMPLETE';

    let stars = 1;
    const underPar = this.levelTimer <= this.currentLevelData.parTime;
    const noDeaths = this.deathCount === 0;
    const allShards = this.collectibles.collectedCount >= this.collectibles.totalCount;

    if (underPar && noDeaths && allShards) {
      stars = 3;
    } else if (allShards || (underPar && noDeaths) || (noDeaths && this.collectibles.collectedCount > 0)) {
      stars = 2;
    }

    this.saveManager.recordLevelComplete(
      this.currentLevelId,
      this.levelTimer,
      stars,
      this.collectibles.collectedCount,
      this.collectibles.totalCount
    );

    const completeData = {
      levelId: this.currentLevelId,
      levelName: this.currentLevelData.name,
      time: this.levelTimer,
      parTime: this.currentLevelData.parTime,
      stars,
      shards: this.collectibles.collectedCount,
      maxShards: this.collectibles.totalCount,
      deaths: this.deathCount,
      hasNextLevel: this.currentLevelId < ALL_LEVELS.length
    };

    if (this.isOnline && this.networkClient) {
      this.networkClient.sendLevelComplete(completeData);
    }

    if (this.onLevelCompleteCallback) {
      this.onLevelCompleteCallback(completeData);
    }

    if (this.onStateChangeCallback) {
      this.onStateChangeCallback(this.state);
    }
  }

  render() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    if (this.state === 'MENU') return;

    const theme = this.currentLevelData.theme || 'forest';

    // 1. Draw Themed Parallax Brick Background
    this.renderer.renderBackground(this.camera, this.currentLevelData.width, this.currentLevelData.height, theme);

    // 2. World Space Rendering with Camera Transform
    this.camera.applyTransform(ctx);

    // Stone Platforms with Theme
    this.renderer.renderPlatforms(this.platforms, theme);

    // Level hints (e.g. "Use A,W,D TO MOVE WATERGIRL...")
    this.renderer.renderLevelHints(this.currentLevelData.hints, ctx);

    // Hazards (Lava basins, Water basins, Acid pools)
    this.hazards.render(ctx);

    // Mechanisms & Push Boxes
    this.mechanisms.render(ctx);

    // Checkpoints
    this.checkpoints.render(ctx);

    // Collectibles (Faceted Rubies & Sapphires)
    this.collectibles.render(ctx);

    // Goal Gateways (♂ & ♀ stone portals)
    this.portal.render(ctx);

    // Players
    this.ember.render(ctx);
    this.tide.render(ctx);

    // Particles
    this.particles.render(ctx);

    this.camera.restoreTransform(ctx);

    // 3. Screen Space Rendering (Vine-Wrapped Wooden Tablet HUD)
    const ping = this.networkClient ? this.networkClient.pingMs : 0;
    this.renderer.renderHUD(
      this.currentLevelData.name,
      this.levelTimer,
      this.collectibles.collectedCount,
      this.collectibles.totalCount,
      this.ember,
      this.tide,
      this.isOnline,
      this.localPlayerRole,
      this.p1Name,
      this.p2Name,
      ping
    );
  }
}
