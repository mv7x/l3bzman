// Ember & Tide runtime bootstrap + gameplay hardening
(function () {
  const style = document.createElement('style');
  style.textContent = `
    @media (pointer: coarse), (hover: none), (max-width: 1024px) {
      .touch-controls-layer { display: flex !important; pointer-events: none !important; z-index: 100 !important; }
      .touch-dpad, .touch-actions { pointer-events: auto !important; }
      .touch-btn {
        pointer-events: auto !important;
        -webkit-tap-highlight-color: transparent;
        -webkit-touch-callout: none;
        touch-action: none !important;
      }
    }
  `;
  document.head.appendChild(style);

  let domLoaded = document.readyState !== 'loading';
  if (!domLoaded) {
    window.addEventListener('DOMContentLoaded', () => { domLoaded = true; }, { once: true });
  }

  import('./src/app.js')
    .then(() => {
      if (domLoaded && !window.app) {
        window.dispatchEvent(new Event('DOMContentLoaded'));
      }

      const installMobileInput = () => {
        const app = window.app;
        if (!app?.engine?.input) return false;
        const input = app.engine.input;
        if (input.__reliableMobileInputInstalled) return true;

        const bindings = {
          'touch-ember-left': 'emberLeft',
          'touch-ember-right': 'emberRight',
          'touch-ember-jump': 'emberJump',
          'touch-tide-left': 'tideLeft',
          'touch-tide-right': 'tideRight',
          'touch-tide-jump': 'tideJump'
        };

        Object.entries(bindings).forEach(([id, action]) => {
          const button = document.getElementById(id);
          if (!button) return;
          const press = (event) => {
            event.preventDefault();
            event.stopPropagation();
            input.setTouchInput(action, true);
            if (event.pointerId != null && button.setPointerCapture) {
              try { button.setPointerCapture(event.pointerId); } catch (_) {}
            }
          };
          const release = (event) => {
            event.preventDefault();
            event.stopPropagation();
            input.setTouchInput(action, false);
          };
          button.addEventListener('pointerdown', press, { passive: false });
          button.addEventListener('pointerup', release, { passive: false });
          button.addEventListener('pointercancel', release, { passive: false });
          button.addEventListener('lostpointercapture', release, { passive: false });
          button.addEventListener('contextmenu', (event) => event.preventDefault());
        });

        const clearTouch = () => input.resetTouch();
        window.addEventListener('blur', clearTouch);
        document.addEventListener('visibilitychange', () => {
          if (document.hidden) clearTouch();
        });

        input.__reliableMobileInputInstalled = true;
        return true;
      };

      const patchHazards = () => {
        const hazards = window.app?.engine?.hazards;
        if (!hazards || hazards.__emberTideHazardPatch) return !!hazards;

        const originalUpdate = hazards.update.bind(hazards);
        hazards.update = function (dt, players) {
          const overlap = (a, b) => a && b &&
            a.x < b.x + b.width && a.x + a.width > b.x &&
            a.y < b.y + b.height && a.y + a.height > b.y;

          const ember = players.find((p) => p?.type === 'ember' && !p.isDead && !p.isVictory);
          const tide = players.find((p) => p?.type === 'tide' && !p.isDead && !p.isVictory);
          const touchingPlayers = !!(ember && tide && overlap(ember.getHitbox(), tide.getHitbox()));

          // The two characters may physically touch. Only elemental hazards
          // determine death.
          const originalHazards = this.hazards;
          this.hazards = originalHazards.map((h) => ({
            ...h,
            lethalTo: h.type === 'water' && touchingPlayers ? ['__never__'] : h.lethalTo
          }));
          originalUpdate(dt, players);
          this.hazards = originalHazards;
        };
        hazards.__emberTideHazardPatch = true;
        return true;
      };

      const patchOnlineWorld = () => {
        const app = window.app;
        const engine = app?.engine;
        const network = app?.network;
        if (!engine || !network || engine.__emberTideWorldPatch) return !!engine;

        const sanitizePlayer = (player) => {
          if (!player) return;
          if (!Number.isFinite(player.x)) player.x = Number.isFinite(player.spawnX) ? player.spawnX : 0;
          if (!Number.isFinite(player.y)) player.y = Number.isFinite(player.spawnY) ? player.spawnY : 0;
          if (!Number.isFinite(player.vx)) player.vx = 0;
          if (!Number.isFinite(player.vy)) player.vy = 0;
        };

        const applyWorldSnapshot = (data) => {
          if (!data) return;
          const m = engine.mechanisms;
          if (m) {
            (data.pushBoxes || []).forEach((s) => {
              const box = m.pushBoxes.find((b) => b.id === s.id);
              if (!box) return;
              if (Number.isFinite(s.x)) box.x = s.x;
              if (Number.isFinite(s.y)) box.y = s.y;
              box.vy = Number.isFinite(s.vy) ? s.vy : 0;
              box.isGrounded = !!s.isGrounded;
            });
            (data.pressurePlates || []).forEach((s) => {
              const p = m.pressurePlates.find((x) => x.id === s.id);
              if (p) p.isPressed = !!s.isPressed;
            });
            (data.levers || []).forEach((s) => {
              const l = m.levers.find((x) => x.id === s.id);
              if (l) l.isOn = !!s.isOn;
            });
            (data.doors || []).forEach((s) => {
              const d = m.doors.find((x) => x.id === s.id);
              if (!d) return;
              d.isOpen = !!s.isOpen;
              if (Number.isFinite(s.openRatio)) d.openRatio = s.openRatio;
              if (Number.isFinite(s.currentX)) d.currentX = s.currentX;
              if (Number.isFinite(s.currentY)) d.currentY = s.currentY;
              d.solid = !!s.solid;
            });
            (data.movingPlatforms || []).forEach((s) => {
              const p = m.movingPlatforms.find((x) => x.id === s.id);
              if (!p) return;
              if (Number.isFinite(s.x)) p.x = s.x;
              if (Number.isFinite(s.y)) p.y = s.y;
              if (Number.isInteger(s.currentIndex)) p.currentIndex = s.currentIndex;
              if (Number.isInteger(s.targetIndex)) p.targetIndex = s.targetIndex;
              p.isActive = s.isActive !== false;
              p.dx = Number.isFinite(s.dx) ? s.dx : 0;
              p.dy = Number.isFinite(s.dy) ? s.dy : 0;
            });
          }

          if (engine.collectibles && Array.isArray(data.collectibles)) {
            data.collectibles.forEach((s, i) => {
              if (engine.collectibles.items[i]) {
                engine.collectibles.items[i].collected = !!s.collected;
              }
            });
            engine.collectibles.collectedCount = engine.collectibles.items.filter((x) => x.collected).length;
          }
        };

        const originalApplyPuzzleSync = engine.applyPuzzleSync.bind(engine);
        engine.applyPuzzleSync = (action, data) => {
          if (action === 'world_snapshot') {
            applyWorldSnapshot(data);
            return;
          }
          originalApplyPuzzleSync(action, data);
        };

        let lastWorldSignature = '';
        const originalUpdate = engine.update.bind(engine);
        engine.update = function (dt) {
          const beforeCollected = this.collectibles?.items?.map((x) => !!x.collected) || [];
          const originalSendShard = network.sendShardCollected;
          let shardWasSent = false;

          // game.js historically selected the first collected shard rather than
          // the shard that changed this frame. Suppress that bad event and send
          // the actual changed index after the frame completes.
          if (this.isOnline && originalSendShard) {
            network.sendShardCollected = () => { shardWasSent = true; };
          }

          originalUpdate(dt);

          if (this.isOnline && originalSendShard) {
            network.sendShardCollected = originalSendShard;
            if (shardWasSent && this.collectibles?.items) {
              this.collectibles.items.forEach((item, index) => {
                if (item.collected && !beforeCollected[index]) {
                  originalSendShard.call(network, index, item.type);
                }
              });
            }
          }

          sanitizePlayer(this.ember);
          sanitizePlayer(this.tide);

          // Host owns the shared puzzle world. This keeps boxes, switches,
          // doors, moving lifts and collectibles identical on both clients.
          if (this.isOnline && network.playerSlot === 'p1' && this.mechanisms) {
            const m = this.mechanisms;
            const snapshot = {
              pushBoxes: m.pushBoxes.map((b) => ({ id: b.id, x: b.x, y: b.y, vy: b.vy, isGrounded: b.isGrounded })),
              pressurePlates: m.pressurePlates.map((p) => ({ id: p.id, isPressed: p.isPressed })),
              levers: m.levers.map((l) => ({ id: l.id, isOn: l.isOn })),
              doors: m.doors.map((d) => ({ id: d.id, isOpen: d.isOpen, openRatio: d.openRatio, currentX: d.currentX, currentY: d.currentY, solid: d.solid })),
              movingPlatforms: m.movingPlatforms.map((p) => ({ id: p.id, x: p.x, y: p.y, currentIndex: p.currentIndex, targetIndex: p.targetIndex, isActive: p.isActive, dx: p.dx, dy: p.dy })),
              collectibles: this.collectibles?.items?.map((x) => ({ collected: !!x.collected })) || []
            };
            const signature = JSON.stringify(snapshot);
            if (signature !== lastWorldSignature) {
              lastWorldSignature = signature;
              network.sendPuzzleAction('world_snapshot', snapshot);
            }
          }
        };

        engine.__emberTideWorldPatch = true;
        return true;
      };

      const patchRemoteSafety = () => {
        const engine = window.app?.engine;
        if (!engine?.ember || !engine?.tide) return false;

        [engine.ember, engine.tide].forEach((player) => {
          if (player.__emberTideRemoteSafety) return;
          const originalApply = player.applyRemoteState.bind(player);
          player.applyRemoteState = (state) => {
            if (state && !state.isDead && !state.isVictory) {
              const dx = (Number(state.x) || 0) - player.x;
              const dy = (Number(state.y) || 0) - player.y;
              const distance = Math.hypot(dx, dy);
              if (distance > 180) {
                const scale = 180 / distance;
                state = { ...state, x: player.x + dx * scale, y: player.y + dy * scale };
              }
            }
            originalApply(state);
          };
          player.__emberTideRemoteSafety = true;
        });
        return true;
      };

      const timer = setInterval(() => {
        const ready = installMobileInput();
        const hazards = patchHazards();
        const world = patchOnlineWorld();
        const remote = patchRemoteSafety();
        if (ready && hazards && world && remote) clearInterval(timer);
      }, 50);
      setTimeout(() => clearInterval(timer), 20000);
    })
    .catch((error) => console.error('Ember & Tide failed to load:', error));
})();
