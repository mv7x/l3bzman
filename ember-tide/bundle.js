// Ember & Tide runtime loader
// Uses the maintained modular source and adds mobile/touch compatibility.
(function () {
  const style = document.createElement('style');
  style.textContent = `
    @media (pointer: coarse), (hover: none) {
      .touch-controls-layer { display: flex !important; }
      .touch-btn { -webkit-tap-highlight-color: transparent; }
    }
  `;
  document.head.appendChild(style);

  import('./src/app.js')
    .then(() => {
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

          // Ember and Tide can touch each other safely. In particular, Ember should
          // not be killed by the water hazard merely because Ember is touching Tide.
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

      if (!patchGame()) {
        const timer = setInterval(() => {
          if (patchGame()) clearInterval(timer);
        }, 50);
        setTimeout(() => clearInterval(timer), 10000);
      }
    })
    .catch((error) => console.error('Ember & Tide failed to load:', error));
})();
