// Ember & Tide runtime loader
// Uses the maintained modular source and adds mobile/touch compatibility.
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

  // app.js uses DOMContentLoaded, but it is loaded through dynamic import.
  // The import can finish after DOMContentLoaded has already fired, which
  // previously left window.app uninitialized and made ALL game controls dead.
  let domContentLoadedFired = false;
  document.addEventListener('DOMContentLoaded', () => {
    domContentLoadedFired = true;
  }, { once: true });

  import('./src/app.js')
    .then(() => {
      // If app.js registered its DOMContentLoaded handler too late, replay
      // the event once so the AppController is created exactly once.
      if (domContentLoadedFired && !window.app) {
        document.dispatchEvent(new Event('DOMContentLoaded'));
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
