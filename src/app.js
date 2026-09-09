// =========================================================
// Ember & Tide - Application Portal & UI Controller
// Router, Online Lobby, Level Select, Modals & Network Sync
// =========================================================

import { GameEngine } from './game.js';
import { ALL_LEVELS } from './levels/index.js';
import { NetworkClient } from './network/client.js';

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

    // Check URL parameters for direct room invites (e.g. ?room=EMBR-72)
    this.checkUrlInvites();

    // Start engine loop
    this.engine.startLoop();
  }

  initElements() {
    // Navigation
    this.navButtons = document.querySelectorAll('.nav-btn[data-page]');
    this.pages = document.querySelectorAll('.page-view');
    this.logoBtn = document.getElementById('nav-logo');

    // Hero buttons
    this.btnHeroOnline = document.getElementById('btn-hero-online');
    this.btnHeroLocal = document.getElementById('btn-hero-local');
    this.btnHeroLevels = document.getElementById('btn-hero-levels');

    // Mode select screen
    this.btnStartLocal = document.getElementById('btn-start-local');
    this.btnStartOnline = document.getElementById('btn-start-online');

    // Quick Game controls
    this.btnQuickPause = document.getElementById('btn-quick-pause');
    this.btnQuickRestart = document.getElementById('btn-quick-restart');
    this.btnQuickMute = document.getElementById('btn-quick-mute');
    this.btnQuickFullscreen = document.getElementById('btn-quick-fullscreen');
    this.gameModeTag = document.getElementById('game-mode-tag');

    // Online Lobby Elements
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

    // Modals
    this.modalPause = document.getElementById('modal-pause');
    this.modalComplete = document.getElementById('modal-complete');
    this.modalPartnerDisconnect = document.getElementById('modal-partner-disconnect');
    this.partnerDisconnectMsg = document.getElementById('partner-disconnect-msg');
    this.modalReset = document.getElementById('modal-reset');

    // Pause Modal Buttons
    this.btnModalResume = document.getElementById('btn-modal-resume');
    this.btnModalRestart = document.getElementById('btn-modal-restart');
    this.btnModalLevels = document.getElementById('btn-modal-levels');

    // Win Modal Buttons
    this.btnModalNext = document.getElementById('btn-modal-next');
    this.btnModalReplay = document.getElementById('btn-modal-replay');
    this.btnModalWinLevels = document.getElementById('btn-modal-win-levels');

    // Partner Disconnect Buttons
    this.btnPartnerWait = document.getElementById('btn-partner-wait');
    this.btnPartnerLeave = document.getElementById('btn-partner-leave');

    // Reset Modal Buttons
    this.btnOpenResetModal = document.getElementById('btn-open-reset-modal');
    this.btnConfirmReset = document.getElementById('btn-confirm-reset');
    this.btnCancelReset = document.getElementById('btn-cancel-reset');
  }

  initRouting() {
    this.navButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const targetPage = btn.getAttribute('data-page');
        this.navigateTo(targetPage);
      });
    });

    if (this.logoBtn) {
      this.logoBtn.addEventListener('click', () => this.navigateTo('home'));
    }

    // Hero CTAs
    if (this.btnHeroOnline) {
      this.btnHeroOnline.addEventListener('click', () => this.navigateTo('online'));
    }

    if (this.btnHeroLocal) {
      this.btnHeroLocal.addEventListener('click', () => {
        this.startLocalGame(1);
      });
    }

    if (this.btnHeroLevels) {
      this.btnHeroLevels.addEventListener('click', () => this.navigateTo('levels'));
    }

    // Mode Select page cards
    if (this.btnStartLocal) {
      this.btnStartLocal.addEventListener('click', () => this.startLocalGame(1));
    }
    if (this.btnStartOnline) {
      this.btnStartOnline.addEventListener('click', () => this.navigateTo('online'));
    }

    // Quick controls in game bar
    if (this.btnQuickPause) {
      this.btnQuickPause.addEventListener('click', () => this.engine.togglePause());
    }

    if (this.btnQuickRestart) {
      this.btnQuickRestart.addEventListener('click', () => this.engine.restartLevel());
    }

    if (this.btnQuickMute) {
      this.btnQuickMute.addEventListener('click', () => {
        const isMuted = this.engine.audio.toggleMute();
        this.btnQuickMute.textContent = isMuted ? '🔇 Muted' : '🔊 Audio';
      });
    }

    if (this.btnQuickFullscreen) {
      this.btnQuickFullscreen.addEventListener('click', () => this.toggleFullscreen());
    }
  }

  navigateTo(pageId) {
    this.currentPage = pageId;

    this.navButtons.forEach(btn => {
      if (btn.getAttribute('data-page') === pageId) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    this.pages.forEach(page => {
      if (page.id === `page-${pageId}`) {
        page.classList.add('active');
      } else {
        page.classList.remove('active');
      }
    });

    // If leaving play page while game is playing, pause
    if (pageId !== 'play' && this.engine.state === 'PLAYING') {
      this.engine.togglePause();
    }

    if (pageId === 'levels') {
      this.initLevelSelectGrid();
    }
  }

  startLocalGame(levelId = 1) {
    this.navigateTo('play');
    if (this.gameModeTag) this.gameModeTag.textContent = '👥 Local Co-Op (1 Keyboard)';
    const storedName = localStorage.getItem('agy_user_name') || localStorage.getItem('ember_tide_player_name') || 'Ember';
    this.engine.startLevel(levelId, false, 'both', storedName, 'Tide', null);
  }

  checkUrlInvites() {
    try {
      const params = new URLSearchParams(window.location.search);
      const inviteCode = params.get('room') || params.get('invite');
      if (inviteCode) {
        this.navigateTo('online');
        if (this.inputJoinCode) {
          this.inputJoinCode.value = inviteCode.trim().toUpperCase();
        }
      }
    } catch (e) {}
  }

  // ----------------------------------------------------
  // Online Multiplayer Lobby Logic
  // ----------------------------------------------------

  initOnlineLobby() {
    // Pre-populate name
    if (this.inputPlayerName) {
      const initial = localStorage.getItem('agy_user_name') || localStorage.getItem('ember_tide_player_name') || this.network.playerName || 'Player';
      this.inputPlayerName.value = initial;
      this.network.setPlayerName(initial);
      
      const onNameChange = (e) => {
        this.network.setPlayerName(e.target.value);
      };
      this.inputPlayerName.addEventListener('input', onNameChange);
      this.inputPlayerName.addEventListener('change', onNameChange);
    }

    // Create Room
    if (this.btnCreateRoom) {
      this.btnCreateRoom.addEventListener('click', async () => {
        this.clearLobbyError();
        const name = this.inputPlayerName.value.trim() || 'Ember';
        try {
          await this.network.createRoom(name);
        } catch (err) {
          this.showLobbyError('Failed to connect to multiplayer server.');
        }
      });
    }

    // Join Room
    if (this.btnJoinRoom) {
      this.btnJoinRoom.addEventListener('click', async () => {
        this.clearLobbyError();
        const code = this.inputJoinCode.value.trim().toUpperCase();
        if (!code) {
          this.showLobbyError('Please enter a valid room code.');
          return;
        }
        const name = this.inputPlayerName.value.trim() || 'Tide';
        try {
          await this.network.joinRoom(code, name);
        } catch (err) {
          this.showLobbyError('Failed to connect to multiplayer server.');
        }
      });
    }

    // Copy Code & Link
    if (this.btnCopyCode) {
      this.btnCopyCode.addEventListener('click', () => {
        if (this.network.roomId) {
          navigator.clipboard.writeText(this.network.roomId);
          this.btnCopyCode.textContent = '✓ Copied!';
          setTimeout(() => { this.btnCopyCode.textContent = '📋 Copy Code'; }, 2000);
        }
      });
    }

    if (this.btnCopyLink) {
      this.btnCopyLink.addEventListener('click', () => {
        if (this.network.roomId) {
          const url = `${window.location.origin}${window.location.pathname}?room=${this.network.roomId}`;
          navigator.clipboard.writeText(url);
          this.btnCopyLink.textContent = '✓ Link Copied!';
          setTimeout(() => { this.btnCopyLink.textContent = '🔗 Copy Invite Link'; }, 2000);
        }
      });
    }

    // Ready Toggle
    if (this.btnToggleReady) {
      this.btnToggleReady.addEventListener('click', () => {
        this.isReadyInLobby = !this.isReadyInLobby;
        this.network.setReady(this.isReadyInLobby);
        this.btnToggleReady.textContent = this.isReadyInLobby ? '✖ CANCEL READY' : '✓ I AM READY';
        this.btnToggleReady.style.background = this.isReadyInLobby ? '#475569' : 'linear-gradient(135deg,#ff4500,#ff6b35,#00a6fb)';
      });
    }

    // Level Picker
    if (this.lobbyLevelSelect) {
      this.lobbyLevelSelect.addEventListener('change', (e) => {
        if (this.network.playerSlot === 'p1') {
          this.network.selectLevel(Number(e.target.value));
        }
      });
    }

    // Leave Room
    if (this.btnLeaveRoom) {
      this.btnLeaveRoom.addEventListener('click', () => {
        this.network.leaveRoom();
        this.showLobbyTabsView();
      });
    }
  }

  showLobbyError(msg) {
    if (this.joinErrorMsg) {
      this.joinErrorMsg.textContent = msg;
      this.joinErrorMsg.style.display = 'block';
    }
  }

  clearLobbyError() {
    if (this.joinErrorMsg) {
      this.joinErrorMsg.style.display = 'none';
      this.joinErrorMsg.textContent = '';
    }
  }

  showLobbyRoomView(roomId) {
    if (this.onlineTabsView) this.onlineTabsView.style.display = 'none';
    if (this.onlineRoomView) this.onlineRoomView.style.display = 'block';
    if (this.displayRoomCode) this.displayRoomCode.textContent = roomId;
    this.isReadyInLobby = false;
    if (this.btnToggleReady) {
      this.btnToggleReady.textContent = '✓ I AM READY';
      this.btnToggleReady.style.background = '';
    }
  }

  showLobbyTabsView() {
    if (this.onlineTabsView) this.onlineTabsView.style.display = 'block';
    if (this.onlineRoomView) this.onlineRoomView.style.display = 'none';
    if (this.countdownOverlay) this.countdownOverlay.style.display = 'none';
    this.clearLobbyError();
  }

  updateLobbyUI(roomData) {
    if (!roomData) return;

    // Player 1 (Ember)
    if (roomData.p1) {
      this.lobbyP1Name.textContent = roomData.p1.name + (this.network.playerSlot === 'p1' ? ' (You)' : '');
      this.lobbyP1Status.textContent = roomData.p1.isConnected ? 'CONNECTED' : 'DISCONNECTED';
      this.lobbyP1Status.className = `player-status-badge ${roomData.p1.isConnected ? 'connected' : 'waiting'}`;
      this.lobbyP1Ready.textContent = roomData.p1.isReady ? 'READY ✓' : 'NOT READY';
      this.lobbyP1Ready.className = `player-ready-indicator ${roomData.p1.isReady ? 'is-ready' : 'not-ready'}`;
      this.lobbyP1Ready.style.display = 'block';
    }

    // Player 2 (Tide)
    if (roomData.p2) {
      this.lobbyP2Name.textContent = roomData.p2.name + (this.network.playerSlot === 'p2' ? ' (You)' : '');
      this.lobbyP2Status.textContent = roomData.p2.isConnected ? 'CONNECTED' : 'DISCONNECTED';
      this.lobbyP2Status.className = `player-status-badge ${roomData.p2.isConnected ? 'connected' : 'waiting'}`;
      this.lobbyP2Ready.textContent = roomData.p2.isReady ? 'READY ✓' : 'NOT READY';
      this.lobbyP2Ready.className = `player-ready-indicator ${roomData.p2.isReady ? 'is-ready' : 'not-ready'}`;
      this.lobbyP2Ready.style.display = 'block';
    } else {
      this.lobbyP2Name.textContent = 'Waiting for Player 2...';
      this.lobbyP2Status.textContent = 'WAITING...';
      this.lobbyP2Status.className = 'player-status-badge waiting';
      this.lobbyP2Ready.style.display = 'none';
    }

    // Level selector enabled for host only
    if (this.lobbyLevelSelect) {
      this.lobbyLevelSelect.value = roomData.currentLevel || 1;
      this.lobbyLevelSelect.disabled = (this.network.playerSlot !== 'p1');
    }
  }

  // ----------------------------------------------------
  // Network Event Listeners
  // ----------------------------------------------------

  initNetworkHooks() {
    this.network.onRoomCreated = (msg) => {
      this.showLobbyRoomView(msg.roomId);
      this.lobbyP1Name.textContent = msg.name + ' (You)';
      this.lobbyP1Status.textContent = 'CONNECTED';
      this.lobbyP1Status.className = 'player-status-badge connected';
      this.lobbyP2Name.textContent = 'Waiting for Player 2...';
      this.lobbyP2Status.textContent = 'WAITING...';
      this.lobbyP2Status.className = 'player-status-badge waiting';
    };

    this.network.onRoomJoined = (msg) => {
      this.showLobbyRoomView(msg.roomId);
      this.updateLobbyUI(msg.roomData);
    };

    this.network.onRoomUpdated = (roomData) => {
      this.updateLobbyUI(roomData);
    };

    this.network.onGameStart = (levelId, roomData) => {
      // Start 3-second animated countdown
      if (this.countdownOverlay) {
        this.countdownOverlay.style.display = 'flex';
        let count = 3;
        this.countdownNumber.textContent = count;

        const timer = setInterval(() => {
          count--;
          if (count > 0) {
            this.countdownNumber.textContent = count;
          } else {
            clearInterval(timer);
            this.countdownOverlay.style.display = 'none';
            this.launchOnlineGame(levelId, roomData);
          }
        }, 1000);
      } else {
        this.launchOnlineGame(levelId, roomData);
      }
    };

    this.network.onRemotePlayerState = (slot, state) => {
      this.engine.applyRemotePlayerState(slot, state);
    };

    this.network.onPuzzleSync = (action, data) => {
      this.engine.applyPuzzleSync(action, data);
    };

    this.network.onShardCollected = (data) => {
      this.engine.applyShardCollected(data);
    };

    this.network.onCheckpointSync = (data) => {
      this.engine.applyCheckpointSync(data);
    };

    this.network.onPlayerDied = (data) => {
      this.engine.applyPlayerDeathSync(data);
    };

    this.network.onRestartSync = (levelId) => {
      const p1 = this.network.playerSlot === 'p1' ? this.network.playerName : 'Partner';
      const p2 = this.network.playerSlot === 'p2' ? this.network.playerName : 'Partner';
      this.engine.startLevel(levelId, true, this.network.role, p1, p2, this.network);
    };

    this.network.onLevelCompleteSync = (data) => {
      if (this.engine.state !== 'LEVEL_COMPLETE') {
        this.engine.handleLevelCompletion();
      }
    };

    this.network.onPlayerDisconnected = (msg) => {
      if (this.engine.isOnline && this.engine.state === 'PLAYING') {
        this.partnerDisconnectMsg.textContent = `${msg.message} Waiting for reconnection (${msg.reconnectWindow || 25}s)...`;
        this.modalPartnerDisconnect.classList.add('active');
      }
    };

    this.network.onError = (errMsg) => {
      this.showLobbyError(errMsg);
    };
  }

  launchOnlineGame(levelId, roomData) {
    this.navigateTo('play');
    const p1Name = (roomData && roomData.p1) ? roomData.p1.name : 'Ember';
    const p2Name = (roomData && roomData.p2) ? roomData.p2.name : 'Tide';

    if (this.gameModeTag) {
      this.gameModeTag.textContent = `🌐 Online (Room: ${this.network.roomId} | You: ${this.network.role === 'ember' ? '🔥 Ember' : '💧 Tide'})`;
    }

    this.engine.startLevel(
      levelId,
      true,
      this.network.role, // 'ember' or 'tide'
      p1Name,
      p2Name,
      this.network
    );
  }

  // ----------------------------------------------------
  // Level Select & Modals
  // ----------------------------------------------------

  initLevelSelectGrid() {
    const grid = document.getElementById('levelsGrid');
    if (!grid) return;
    grid.innerHTML = '';

    ALL_LEVELS.forEach(lvl => {
      const isUnlocked = this.engine.saveManager.isLevelUnlocked(lvl.id);
      const stat = this.engine.saveManager.getLevelStat(lvl.id);

      const card = document.createElement('div');
      card.className = `level-card ${isUnlocked ? '' : 'locked'}`;

      const starsDisplay = isUnlocked && stat.stars > 0
        ? '★'.repeat(stat.stars) + '☆'.repeat(3 - stat.stars)
        : '☆☆☆';

      const bestTimeDisplay = stat.bestTime ? `${stat.bestTime}s` : '--';
      const shardsDisplay = `${stat.shards || 0} / ${stat.maxShards || 3} 💎`;

      card.innerHTML = `
        <div class="level-card-header">
          <span class="level-num-badge">LEVEL ${lvl.id}</span>
          <span class="level-stars">${isUnlocked ? starsDisplay : '🔒 Locked'}</span>
        </div>
        <h3 class="level-title">${lvl.name}</h3>
        <p class="level-desc">${lvl.description}</p>
        <div class="level-stats-row">
          <span>⏱️ Best: ${bestTimeDisplay}</span>
          <span>${shardsDisplay}</span>
        </div>
      `;

      if (isUnlocked) {
        card.addEventListener('click', () => {
          this.startLocalGame(lvl.id);
        });
      }

      grid.appendChild(card);
    });
  }

  initModals() {
    // Pause Modal
    if (this.btnModalResume) {
      this.btnModalResume.addEventListener('click', () => {
        this.modalPause.classList.remove('active');
        this.engine.togglePause();
      });
    }

    if (this.btnModalRestart) {
      this.btnModalRestart.addEventListener('click', () => {
        this.modalPause.classList.remove('active');
        this.engine.restartLevel();
      });
    }

    if (this.btnModalLevels) {
      this.btnModalLevels.addEventListener('click', () => {
        this.modalPause.classList.remove('active');
        this.navigateTo('levels');
      });
    }

    // Win Modal
    if (this.btnModalNext) {
      this.btnModalNext.addEventListener('click', () => {
        this.modalComplete.classList.remove('active');
        const nextId = this.engine.currentLevelId + 1;
        if (nextId <= ALL_LEVELS.length) {
          if (this.engine.isOnline && this.network) {
            this.network.sendRestartRequest(nextId);
          }
          this.engine.startLevel(nextId, this.engine.isOnline, this.engine.localPlayerRole, this.engine.p1Name, this.engine.p2Name, this.network);
        } else {
          this.navigateTo('levels');
        }
      });
    }

    if (this.btnModalReplay) {
      this.btnModalReplay.addEventListener('click', () => {
        this.modalComplete.classList.remove('active');
        this.engine.restartLevel();
      });
    }

    if (this.btnModalWinLevels) {
      this.btnModalWinLevels.addEventListener('click', () => {
        this.modalComplete.classList.remove('active');
        this.navigateTo('levels');
      });
    }

    // Partner Disconnect Modal
    if (this.btnPartnerWait) {
      this.btnPartnerWait.addEventListener('click', () => {
        this.modalPartnerDisconnect.classList.remove('active');
      });
    }

    if (this.btnPartnerLeave) {
      this.btnPartnerLeave.addEventListener('click', () => {
        this.modalPartnerDisconnect.classList.remove('active');
        this.network.leaveRoom();
        this.navigateTo('online');
      });
    }

    // Reset Confirmation Modal
    if (this.btnOpenResetModal) {
      this.btnOpenResetModal.addEventListener('click', () => {
        this.modalReset.classList.add('active');
      });
    }

    if (this.btnCancelReset) {
      this.btnCancelReset.addEventListener('click', () => {
        this.modalReset.classList.remove('active');
      });
    }

    if (this.btnConfirmReset) {
      this.btnConfirmReset.addEventListener('click', () => {
        this.engine.saveManager.resetProgress();
        this.modalReset.classList.remove('active');
        this.initLevelSelectGrid();
        alert('All game progress has been reset.');
      });
    }
  }

  initSettingsUI() {
    const sliderSfx = document.getElementById('slider-sfx');
    const sliderMusic = document.getElementById('slider-music');
    const toggleShake = document.getElementById('toggle-shake');
    const toggleParticles = document.getElementById('toggle-particles');

    if (sliderSfx) {
      sliderSfx.value = this.engine.saveManager.getSetting('sfxVolume') || 0.8;
      sliderSfx.addEventListener('input', (e) => {
        this.engine.audio.setSfxVolume(parseFloat(e.target.value));
      });
    }

    if (sliderMusic) {
      sliderMusic.value = this.engine.saveManager.getSetting('musicVolume') || 0.6;
      sliderMusic.addEventListener('input', (e) => {
        this.engine.audio.setMusicVolume(parseFloat(e.target.value));
      });
    }

    if (toggleShake) {
      toggleShake.checked = this.engine.saveManager.getSetting('screenShake') !== false;
      toggleShake.addEventListener('change', (e) => {
        this.engine.saveManager.setSetting('screenShake', e.target.checked);
      });
    }

    if (toggleParticles) {
      toggleParticles.checked = this.engine.saveManager.getSetting('particles') !== false;
      toggleParticles.addEventListener('change', (e) => {
        this.engine.saveManager.setSetting('particles', e.target.checked);
        this.engine.particles.setEnabled(e.target.checked);
      });
    }
  }

  initTouchControls() {
    const bindTouch = (elemId, action) => {
      const el = document.getElementById(elemId);
      if (!el) return;

      const onPress = (e) => {
        e.preventDefault();
        this.engine.input.setTouchInput(action, true);
      };

      const onRelease = (e) => {
        e.preventDefault();
        this.engine.input.setTouchInput(action, false);
      };

      el.addEventListener('touchstart', onPress, { passive: false });
      el.addEventListener('touchend', onRelease, { passive: false });
      el.addEventListener('touchcancel', onRelease, { passive: false });
      el.addEventListener('mousedown', onPress);
      el.addEventListener('mouseup', onRelease);
      el.addEventListener('mouseleave', onRelease);
    };

    // Ember touch controls
    bindTouch('touch-ember-left', 'emberLeft');
    bindTouch('touch-ember-right', 'emberRight');
    bindTouch('touch-ember-jump', 'emberJump');

    // Tide touch controls
    bindTouch('touch-tide-left', 'tideLeft');
    bindTouch('touch-tide-right', 'tideRight');
    bindTouch('touch-tide-jump', 'tideJump');
  }

  initEngineCallbacks() {
    this.engine.onStateChangeCallback = (state) => {
      if (state === 'PAUSED') {
        this.modalPause.classList.add('active');
      } else if (state === 'PLAYING') {
        this.modalPause.classList.remove('active');
        this.modalComplete.classList.remove('active');
      }
    };

    this.engine.onLevelCompleteCallback = (res) => {
      const starsStr = '★'.repeat(res.stars) + '☆'.repeat(3 - res.stars);
      document.getElementById('complete-stars').textContent = starsStr;
      document.getElementById('complete-level-title').textContent = `Level ${res.levelId}: ${res.levelName}`;
      
      const mins = Math.floor(res.time / 60);
      const secs = (res.time % 60).toFixed(1);
      document.getElementById('complete-time').textContent = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
      document.getElementById('complete-shards').textContent = `${res.shards} / ${res.maxShards}`;
      document.getElementById('complete-deaths').textContent = `${res.deaths}`;

      if (!res.hasNextLevel) {
        this.btnModalNext.textContent = '🎉 FINISH GAME ➔';
      } else {
        this.btnModalNext.textContent = 'NEXT LEVEL ➔';
      }

      this.modalComplete.classList.add('active');
    };
  }

  toggleFullscreen() {
    const wrapper = document.getElementById('canvasWrapper');
    if (!document.fullscreenElement) {
      if (wrapper.requestFullscreen) {
        wrapper.requestFullscreen();
      } else if (wrapper.webkitRequestFullscreen) {
        wrapper.webkitRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  }
}

// Instantiate on load in browser
if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    window.app = new AppController();
  });
}
