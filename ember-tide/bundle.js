// Ember & Tide runtime loader
// Uses the maintained modular source and guarantees app initialization.
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
    .then(async () => {
      if (domLoaded && !window.app) {
        window.dispatchEvent(new Event('DOMContentLoaded'));
      }

      // ------------------------------------------------------------
      // Online replication hardening
      // ------------------------------------------------------------
      // Firebase RTDB is not a deterministic 60 FPS transport. Packets can
      // arrive in bursts, be delayed, or contain an older snapshot after a
      // restart. The original client immediately lerped every packet, which
      // made the remote player jitter, sink visually into the level, or jump
      // to a stale position. Keep a tiny timestamped snapshot buffer and
      // render the remote player slightly behind the newest packet instead.
      try {
        const { Player } = await import('./src/entities/player.js');

        Player.prototype.applyRemoteState = function (state) {
          if (!state) return;

          const x = Number(state.x);
          const y = Number(state.y);
          if (!Number.isFinite(x) || !Number.isFinite(y)) return;

          const timestamp = Number(state.t) || 0;
          if (timestamp && this.__remoteLastTimestamp && timestamp <= this.__remoteLastTimestamp) {
            return;
          }
          if (timestamp) this.__remoteLastTimestamp = timestamp;

          this.targetX = x;
          this.targetY = y;
          this.targetVx = Number(state.vx) || 0;
          this.targetVy = Number(state.vy) || 0;
          this.targetFacing = state.facing === -1 ? -1 : 1;

          if (!Array.isArray(this.__remoteSnapshots)) this.__remoteSnapshots = [];

          const snapshot = {
            x,
            y,
            vx: this.targetVx,
            vy: this.targetVy,
            facing: this.targetFacing,
            grounded: !!state.isGrounded,
            t: timestamp || Date.now()
          };

          this.__remoteSnapshots.push(snapshot);
          if (this.__remoteSnapshots.length > 8) this.__remoteSnapshots.shift();

          // A death/respawn is an intentional discontinuity. Snap only for
          // those transitions; ordinary movement is always interpolated.
          if (state.isDead && !this.isDead) {
            this.die('remote');
          } else if (!state.isDead && this.isDead) {
            this.x = x;
            this.y = y;
            this.targetX = x;
            this.targetY = y;
            this.__remoteSnapshots.length = 0;
            this.respawn();
          }

          if (state.isVictory) this.isVictory = true;
          this.isGrounded = !!state.isGrounded;
          this.animTime = state.animTime || this.animTime;
          if (state.scaleX !== undefined) this.scaleX = state.scaleX;
          if (state.scaleY !== undefined) this.scaleY = state.scaleY;

          if (!this.__remoteInitialized) {
            this.x = x;
            this.y = y;
            this.__remoteInitialized = true;
          }
        };

        Player.prototype.updateRemote = function (dt) {
          this.animTime += dt;

          if (this.isDead) {
            this.deathTimer -= dt;
            if (this.deathTimer <= 0) this.respawn();
            return;
          }

          if (this.isRespawning) {
            this.respawnTimer -= dt;
            if (this.respawnTimer <= 0) this.isRespawning = false;
          }

          const snapshots = this.__remoteSnapshots || [];
          const renderTime = Date.now() - 90;

          if (snapshots.length >= 2) {
            let older = snapshots[0];
            let newer = snapshots[snapshots.length - 1];

            for (let i = 1; i < snapshots.length; i++) {
              if (snapshots[i].t >= renderTime) {
                newer = snapshots[i];
                older = snapshots[i - 1];
                break;
              }
            }

            const span = Math.max(1, newer.t - older.t);
            const alpha = Math.max(0, Math.min(1, (renderTime - older.t) / span));

            let desiredX = older.x + (newer.x - older.x) * alpha;
            let desiredY = older.y + (newer.y - older.y) * alpha;

            // Short extrapolation during a late packet, never an unlimited
            // prediction that can throw the remote player across the map.
            if (renderTime > newer.t) {
              const extra = Math.min((renderTime - newer.t) / 1000, 0.12);
              desiredX = newer.x + newer.vx * extra;
              desiredY = newer.y + newer.vy * extra;
            }

            const dx = desiredX - this.x;
            const dy = desiredY - this.y;
            const distance = Math.hypot(dx, dy);

            if (distance <= 280) {
              const smoothing = Math.min(1, 14 * dt);
              this.x += dx * smoothing;
              this.y += dy * smoothing;
            } else {
              // Do not chase a suspicious/stale snapshot. The next valid
              // packet will move the player again. This removes map-wide
              // teleports caused by a single bad RTDB update.
            }
          } else if (snapshots.length === 1) {
            const s = snapshots[0];
            const dx = s.x - this.x;
            const dy = s.y - this.y;
            const distance = Math.hypot(dx, dy);
            if (distance <= 280) {
              const smoothing = Math.min(1, 12 * dt);
              this.x += dx * smoothing;
              this.y += dy * smoothing;
            }
          }

          const newest = snapshots[snapshots.length - 1];
          if (newest) {
            this.vx = newest.vx;
            this.vy = newest.vy;
            this.facing = newest.facing;
            this.isGrounded = newest.grounded;
            if (Math.abs(this.vx) > 20) this.walkCycle += dt * 14;
            else this.walkCycle = 0;
          }
        };
      } catch (syncPatchError) {
        console.warn('Online replication hardening could not be installed:', syncPatchError);
      }

      const installMobileInput = () => {
        const app = window.app;
        if (!app || !app.engine || !app.engine.input) return false;
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

      const patchGame = () => {
        const app = window.app;
        const hazards = app && app.engine && app.engine.hazards;
        if (!hazards || hazards.__emberTideTouchPatch) return !!hazards;

        const originalUpdate = hazards.update.bind(hazards);
        hazards.update = function (dt, players) {
          const overlap = (a, b) => a && b &&
            a.x < b.x + b.width && a.x + a.width > b.x &&
            a.y < b.y + b.height && a.y + a.height > b.y;

          const ember = players.find((p) => p && p.type === 'ember' && !p.isDead && !p.isVictory);
          const tide = players.find((p) => p && p.type === 'tide' && !p.isDead && !p.isVictory);
          const touchingTide = !!(ember && tide && overlap(ember.getHitbox(), tide.getHitbox()));

          const originalHazards = this.hazards;
          this.hazards = originalHazards.map((h) => ({
            ...h,
            lethalTo: h.type === 'water' && touchingTide ? ['__never__'] : h.lethalTo
          }));
          originalUpdate(dt, players);
          this.hazards = originalHazards;
        };

        hazards.__emberTideTouchPatch = true;
        return true;
      };

      const timer = setInterval(() => {
        const inputReady = installMobileInput();
        const gameReady = patchGame();
        if (inputReady && gameReady) clearInterval(timer);
      }, 50);
      setTimeout(() => clearInterval(timer), 15000);
    })
    .catch((error) => console.error('Ember & Tide failed to load:', error));
})();
