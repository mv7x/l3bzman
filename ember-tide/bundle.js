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

          const filteredPlayers = players.map((p) => {
            if (p && p.type === 'ember' && !p.isDead && !p.isVictory) {
              const tide = players.find((other) => other && other.type === 'tide' && !other.isDead && !other.isVictory);
              if (tide && overlap(p.getHitbox(), tide.getHitbox())) {
                return { ...p, __touchingTide: true };
              }
            }
            return p;
          });

          // Temporarily ignore water damage for Ember while Ember is directly touching Tide.
          const originalHazards = this.hazards;
          this.hazards = originalHazards.map((h) => ({
            ...h,
            lethalTo: h.type === 'water' ? ['__never__'] : h.lethalTo
          }));
          originalUpdate(dt, filteredPlayers);
          this.hazards = originalHazards;

          // Apply the normal water rule when Ember is not touching Tide.
          for (const h of originalHazards) {
            if (h.type !== 'water') continue;
            const ember = players.find((p) => p && p.type === 'ember' && !p.isDead && !p.isVictory);
            const tide = players.find((p) => p && p.type === 'tide' && !p.isDead && !p.isVictory);
            if (!ember || !tide || overlap(ember.getHitbox(), tide.getHitbox())) continue;
            const hazardHitbox = { x: h.x + 4, y: h.y + 6, width: h.width - 8, height: h.height - 6 };
            if (overlap(ember.getHitbox(), hazardHitbox)) ember.die(h.type);
          }
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
