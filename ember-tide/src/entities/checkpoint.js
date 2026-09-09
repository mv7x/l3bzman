// =========================================================
// Ember & Tide - Checkpoint Shrines
// Saves progress in longer levels upon activation
// =========================================================

import { PhysicsEngine } from '../physics.js';

export class CheckpointManager {
  constructor(audio, particles) {
    this.audio = audio;
    this.particles = particles;
    this.checkpoints = [];
    this.activeId = null;
    this.animTime = 0;
  }

  addCheckpoint(id, x, y, width = 32, height = 48) {
    this.checkpoints.push({
      id,
      x, y, width, height,
      isActivated: false
    });
  }

  update(dt, players) {
    this.animTime += dt;

    for (const cp of this.checkpoints) {
      if (cp.isActivated) continue;

      const hitbox = { x: cp.x - 6, y: cp.y, width: cp.width + 12, height: cp.height };
      let touched = false;

      for (const p of players) {
        if (!p.isDead && PhysicsEngine.checkAABB(p.getHitbox(), hitbox)) {
          touched = true;
          break;
        }
      }

      if (touched) {
        cp.isActivated = true;
        this.activeId = cp.id;

        // Update spawn locations for both players
        for (const p of players) {
          p.setSpawn(cp.x + (p.type === 'ember' ? -8 : 16), cp.y + cp.height - p.height);
        }

        if (this.audio) this.audio.playCheckpoint();
        if (this.particles) {
          this.particles.emitSparkles(cp.x + cp.width / 2, cp.y + 12, '#38bdf8', 16);
          this.particles.emitSparkles(cp.x + cp.width / 2, cp.y + 12, '#ff7800', 16);
        }
      }
    }
  }

  render(ctx) {
    const t = this.animTime;

    for (const cp of this.checkpoints) {
      ctx.save();
      // Stone Obelisk Base
      ctx.fillStyle = '#1e293b';
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 2;

      ctx.fillRect(cp.x + 4, cp.y + 16, cp.width - 8, cp.height - 16);
      ctx.strokeRect(cp.x + 4, cp.y + 16, cp.width - 8, cp.height - 16);

      // Glowing Crystal Orb
      const orbY = cp.y + 10 + Math.sin(t * 3) * 2;
      const orbX = cp.x + cp.width / 2;

      if (cp.isActivated) {
        // Dual Elemental Glow
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 12;
        ctx.fillStyle = '#ff7800';
        ctx.beginPath();
        ctx.arc(orbX - 3, orbY, 5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.arc(orbX + 3, orbY, 5, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Dormant crystal
        ctx.fillStyle = '#64748b';
        ctx.beginPath();
        ctx.arc(orbX, orbY, 6, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
  }
}
