// =========================================================
// Ember & Tide - Elemental Hazards & Traps
// Authentic Lava basins, Water pools, Green Toxic Sludge & Spikes
// =========================================================

import { PhysicsEngine } from '../physics.js';

export class HazardManager {
  constructor(particles) {
    this.particles = particles;
    this.hazards = [];
    this.animTime = 0;
  }

  addLava(x, y, width, height) {
    this.hazards.push({
      type: 'lava',
      x, y, width, height,
      lethalTo: ['tide'] // Safe for Ember / FireBoy
    });
  }

  addWater(x, y, width, height) {
    this.hazards.push({
      type: 'water',
      x, y, width, height,
      lethalTo: ['ember'] // Safe for Tide / WaterGirl
    });
  }

  addAcid(x, y, width, height) {
    this.hazards.push({
      type: 'acid',
      x, y, width, height,
      lethalTo: ['ember', 'tide'] // Toxic green sludge: lethal to both!
    });
  }

  addSpikes(x, y, width, height, orientation = 'up') {
    this.hazards.push({
      type: 'spikes',
      x, y, width, height,
      orientation,
      lethalTo: ['ember', 'tide']
    });
  }

  addLaser(x, y, width, height, timerCycle = 0, isVertical = false) {
    this.hazards.push({
      type: 'laser',
      x, y, width, height,
      timerCycle,
      isVertical,
      active: true,
      lethalTo: ['ember', 'tide']
    });
  }

  update(dt, players) {
    this.animTime += dt;

    for (const h of this.hazards) {
      if (h.type === 'laser' && h.timerCycle > 0) {
        h.active = (Math.floor(this.animTime / h.timerCycle) % 2 === 0);
      }

      for (const p of players) {
        if (p.isDead || p.isVictory) continue;
        if (h.type === 'laser' && !h.active) continue;

        const hazardHitbox = {
          x: h.x + 4,
          y: h.y + 6,
          width: h.width - 8,
          height: h.height - 6
        };

        if (PhysicsEngine.checkAABB(p.getHitbox(), hazardHitbox)) {
          if (h.lethalTo.includes(p.type)) {
            p.die(h.type);
          }
        }
      }
    }
  }

  render(ctx) {
    const t = this.animTime;

    for (const h of this.hazards) {
      ctx.save();

      if (h.type === 'lava') {
        this.renderLavaBasin(ctx, h, t);
      } else if (h.type === 'water') {
        this.renderWaterBasin(ctx, h, t);
      } else if (h.type === 'acid') {
        this.renderAcidBasin(ctx, h, t);
      } else if (h.type === 'spikes') {
        this.renderSpikes(ctx, h);
      } else if (h.type === 'laser') {
        this.renderLaser(ctx, h, t);
      }

      ctx.restore();
    }
  }

  renderLavaBasin(ctx, h, t) {
    // 1. Curved Stone Basin Base
    ctx.fillStyle = '#261b11';
    ctx.beginPath();
    ctx.roundRect(h.x - 2, h.y + 2, h.width + 4, h.height, [0, 0, 14, 14]);
    ctx.fill();

    // 2. Glowing Molten Lava Liquid
    ctx.shadowColor = '#ff4500';
    ctx.shadowBlur = 12;

    const lavaGrad = ctx.createLinearGradient(0, h.y, 0, h.y + h.height);
    lavaGrad.addColorStop(0, '#fff066');
    lavaGrad.addColorStop(0.25, '#ff7700');
    lavaGrad.addColorStop(0.8, '#d90429');
    lavaGrad.addColorStop(1, '#6b0500');

    ctx.fillStyle = lavaGrad;
    ctx.beginPath();
    ctx.moveTo(h.x, h.y + 5);

    // Dynamic wave surface
    const segments = Math.ceil(h.width / 14);
    for (let i = 0; i <= segments; i++) {
      const sx = h.x + (i * 14);
      const sy = h.y + 5 + Math.sin(t * 5 + i * 0.9) * 2.5;
      ctx.lineTo(sx, sy);
    }
    ctx.lineTo(h.x + h.width, h.y + h.height - 2);
    ctx.quadraticCurveTo(h.x + h.width / 2, h.y + h.height + 4, h.x, h.y + h.height - 2);
    ctx.closePath();
    ctx.fill();

    // Glowing yellow wave crest
    ctx.shadowBlur = 4;
    ctx.fillStyle = '#fff475';
    for (let i = 0; i < h.width / 20; i++) {
      const bx = h.x + 8 + i * 20 + Math.sin(t * 3 + i) * 3;
      const by = h.y + 6 + Math.cos(t * 4 + i) * 2;
      ctx.beginPath();
      ctx.arc(bx, by, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  renderWaterBasin(ctx, h, t) {
    // 1. Curved Stone Basin Base
    ctx.fillStyle = '#112233';
    ctx.beginPath();
    ctx.roundRect(h.x - 2, h.y + 2, h.width + 4, h.height, [0, 0, 14, 14]);
    ctx.fill();

    // 2. Glistening Blue Water Liquid
    ctx.shadowColor = '#00b4d8';
    ctx.shadowBlur = 10;

    const waterGrad = ctx.createLinearGradient(0, h.y, 0, h.y + h.height);
    waterGrad.addColorStop(0, '#caf0f8');
    waterGrad.addColorStop(0.3, '#0096c7');
    waterGrad.addColorStop(0.85, '#03045e');
    waterGrad.addColorStop(1, '#011627');

    ctx.fillStyle = waterGrad;
    ctx.beginPath();
    ctx.moveTo(h.x, h.y + 5);

    // Fluid wave surface
    const segments = Math.ceil(h.width / 14);
    for (let i = 0; i <= segments; i++) {
      const sx = h.x + (i * 14);
      const sy = h.y + 5 + Math.sin(t * 4 + i * 0.8) * 2.2;
      ctx.lineTo(sx, sy);
    }
    ctx.lineTo(h.x + h.width, h.y + h.height - 2);
    ctx.quadraticCurveTo(h.x + h.width / 2, h.y + h.height + 4, h.x, h.y + h.height - 2);
    ctx.closePath();
    ctx.fill();

    // Shimmering white highlights
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    for (let i = 0; i < h.width / 24; i++) {
      const bx = h.x + 10 + i * 24 + Math.cos(t * 3 + i) * 3;
      const by = h.y + 6 + Math.sin(t * 3.5 + i) * 1.5;
      ctx.beginPath();
      ctx.arc(bx, by, 1.8, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  renderAcidBasin(ctx, h, t) {
    // 1. Curved Stone Basin Base
    ctx.fillStyle = '#112211';
    ctx.beginPath();
    ctx.roundRect(h.x - 2, h.y + 2, h.width + 4, h.height, [0, 0, 14, 14]);
    ctx.fill();

    // 2. Toxic Green Goo
    ctx.shadowColor = '#38b000';
    ctx.shadowBlur = 12;

    const acidGrad = ctx.createLinearGradient(0, h.y, 0, h.y + h.height);
    acidGrad.addColorStop(0, '#ccff33');
    acidGrad.addColorStop(0.3, '#38b000');
    acidGrad.addColorStop(0.85, '#004b23');
    acidGrad.addColorStop(1, '#002914');

    ctx.fillStyle = acidGrad;
    ctx.beginPath();
    ctx.moveTo(h.x, h.y + 5);

    const segments = Math.ceil(h.width / 14);
    for (let i = 0; i <= segments; i++) {
      const sx = h.x + (i * 14);
      const sy = h.y + 5 + Math.sin(t * 4.5 + i * 0.9) * 2;
      ctx.lineTo(sx, sy);
    }
    ctx.lineTo(h.x + h.width, h.y + h.height - 2);
    ctx.quadraticCurveTo(h.x + h.width / 2, h.y + h.height + 4, h.x, h.y + h.height - 2);
    ctx.closePath();
    ctx.fill();

    // Bubbling toxic pods
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < h.width / 20; i++) {
      const bx = h.x + 8 + i * 20 + Math.sin(t * 2 + i) * 2;
      const by = h.y + 6 + Math.cos(t * 3.5 + i) * 1.8;
      ctx.beginPath();
      ctx.arc(bx, by, 1.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  renderSpikes(ctx, h) {
    ctx.fillStyle = '#475569';
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1.2;

    const spikeWidth = 14;
    const count = Math.floor(h.width / spikeWidth);

    for (let i = 0; i < count; i++) {
      const sx = h.x + i * spikeWidth;
      ctx.beginPath();
      if (h.orientation === 'up') {
        ctx.moveTo(sx, h.y + h.height);
        ctx.lineTo(sx + spikeWidth / 2, h.y + 2);
        ctx.lineTo(sx + spikeWidth, h.y + h.height);
      } else {
        ctx.moveTo(sx, h.y);
        ctx.lineTo(sx + spikeWidth / 2, h.y + h.height - 2);
        ctx.lineTo(sx + spikeWidth, h.y);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Gleaming metallic tip
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(sx + spikeWidth / 2, h.orientation === 'up' ? h.y + 3 : h.y + h.height - 3, 1.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#475569';
    }
  }

  renderLaser(ctx, h, t) {
    if (!h.active) return;
    ctx.shadowColor = '#ef4444';
    ctx.shadowBlur = 14;
    ctx.fillStyle = '#f87171';
    ctx.fillRect(h.x, h.y, h.width, h.height);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(h.x + h.width * 0.3, h.y, h.width * 0.4, h.height);
  }
}
