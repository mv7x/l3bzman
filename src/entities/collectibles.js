// =========================================================
// Ember & Tide - Collectibles (Faceted Elemental Diamonds)
// Red Rubies (FireBoy), Blue Sapphires (WaterGirl)
// =========================================================

import { PhysicsEngine } from '../physics.js';

export class CollectibleManager {
  constructor(audio, particles) {
    this.audio = audio;
    this.particles = particles;
    this.items = [];
    this.totalCount = 0;
    this.collectedCount = 0;
    this.animTime = 0;
  }

  addShard(type, x, y) {
    this.items.push({
      type, // 'fire' (red ruby), 'water' (blue sapphire), 'universal'
      x, y,
      width: 22,
      height: 24,
      collected: false,
      pulseOffset: Math.random() * Math.PI * 2
    });
    this.totalCount++;
  }

  update(dt, players) {
    this.animTime += dt;

    for (const item of this.items) {
      if (item.collected) continue;

      const hitbox = {
        x: item.x - 2,
        y: item.y - 2,
        width: item.width + 4,
        height: item.height + 4
      };

      for (const p of players) {
        if (p.isDead) continue;

        let canCollect = false;
        if (item.type === 'fire' && p.type === 'ember') canCollect = true;
        else if (item.type === 'water' && p.type === 'tide') canCollect = true;
        else if (item.type === 'universal') canCollect = true;

        if (canCollect && PhysicsEngine.checkAABB(p.getHitbox(), hitbox)) {
          item.collected = true;
          this.collectedCount++;

          if (this.audio) this.audio.playShard(item.type);
          if (this.particles) {
            const color = item.type === 'fire' ? '#ff2200' : item.type === 'water' ? '#00b4d8' : '#ffd700';
            this.particles.emitSparkles(item.x + item.width / 2, item.y + item.height / 2, color, 14);
          }
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
      const cx = item.x + item.width / 2;
      const cy = item.y + item.height / 2;

      const isFire = item.type === 'fire';
      const mainColor = isFire ? '#e60000' : '#0096c7';
      const highlightColor = isFire ? '#ff7777' : '#90e0ef';
      const glowColor = isFire ? '#ff2200' : '#00b4d8';

      ctx.shadowColor = glowColor;
      ctx.shadowBlur = 8;

      const w = item.width;
      const h = item.height;

      // Draw 8-point Faceted Diamond Shape
      ctx.fillStyle = mainColor;
      ctx.beginPath();
      ctx.moveTo(cx, cy - h / 2); // Top apex
      ctx.lineTo(cx + w * 0.45, cy - h * 0.2); // Top right
      ctx.lineTo(cx + w * 0.5, cy + h * 0.1); // Mid right
      ctx.lineTo(cx, cy + h / 2); // Bottom point
      ctx.lineTo(cx - w * 0.5, cy + h * 0.1); // Mid left
      ctx.lineTo(cx - w * 0.45, cy - h * 0.2); // Top left
      ctx.closePath();
      ctx.fill();

      // Top Table Facet
      ctx.fillStyle = highlightColor;
      ctx.beginPath();
      ctx.moveTo(cx, cy - h * 0.4);
      ctx.lineTo(cx + w * 0.25, cy - h * 0.15);
      ctx.lineTo(cx, cy);
      ctx.lineTo(cx - w * 0.25, cy - h * 0.15);
      ctx.closePath();
      ctx.fill();

      // Center Specular Glimmer
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(cx - 2, cy - 4, 1.5, 0, Math.PI * 2);
      ctx.fill();

      // Outline
      ctx.strokeStyle = isFire ? '#660000' : '#03045e';
      ctx.lineWidth = 1.2;
      ctx.stroke();

      ctx.restore();
    }
  }
}
