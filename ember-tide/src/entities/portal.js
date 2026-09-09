// =========================================================
// Ember & Tide - Authentic Elemental Exit Portals
// Stone arch doorways with Fire (♂) and Water (♀) glowing runes
// =========================================================

import { PhysicsEngine } from '../physics.js';

export class PortalGateway {
  constructor(emberGoal, tideGoal, audio, particles) {
    this.emberGoal = {
      x: emberGoal.x,
      y: emberGoal.y,
      width: emberGoal.width || 42,
      height: emberGoal.height || 62,
      isReached: false,
      symbol: '♂',
      color: '#ff3300'
    };

    this.tideGoal = {
      x: tideGoal.x,
      y: tideGoal.y,
      width: tideGoal.width || 42,
      height: tideGoal.height || 62,
      isReached: false,
      symbol: '♀',
      color: '#00b4d8'
    };

    this.audio = audio;
    this.particles = particles;
    this.isFullyCompleted = false;
    this.animTime = 0;
  }

  update(dt, players) {
    this.animTime += dt;

    let emberInSlot = false;
    let tideInSlot = false;

    for (const p of players) {
      if (p.isDead) continue;

      if (p.type === 'ember') {
        const hb = p.getHitbox();
        if (PhysicsEngine.checkAABB(hb, this.emberGoal)) {
          emberInSlot = true;
          if (this.particles) this.particles.emitPortalRays(this.emberGoal.x + 21, this.emberGoal.y + 31, '#ff6600');
        }
      } else if (p.type === 'tide') {
        const hb = p.getHitbox();
        if (PhysicsEngine.checkAABB(hb, this.tideGoal)) {
          tideInSlot = true;
          if (this.particles) this.particles.emitPortalRays(this.tideGoal.x + 21, this.tideGoal.y + 31, '#38bdf8');
        }
      }
    }

    this.emberGoal.isReached = emberInSlot;
    this.tideGoal.isReached = tideInSlot;

    if (emberInSlot && tideInSlot && !this.isFullyCompleted) {
      this.isFullyCompleted = true;
      if (this.audio) this.audio.playWin();
      if (this.particles) {
        this.particles.emitSparkles(this.emberGoal.x + 21, this.emberGoal.y + 31, '#ff7800', 20);
        this.particles.emitSparkles(this.tideGoal.x + 21, this.tideGoal.y + 31, '#38bdf8', 20);
      }
      for (const p of players) {
        p.isVictory = true;
      }
    }

    return this.isFullyCompleted;
  }

  render(ctx) {
    const t = this.animTime;

    // 1. Render Fire Door (♂)
    this.renderStonePortal(ctx, this.emberGoal, '#ff2200', '#ff4400', '♂', t);

    // 2. Render Water Door (♀)
    this.renderStonePortal(ctx, this.tideGoal, '#00d4ff', '#38bdf8', '♀', t);
  }

  renderStonePortal(ctx, goal, glowColor, runeColor, symbol, t) {
    ctx.save();
    const cx = goal.x + goal.width / 2;
    const cy = goal.y + goal.height / 2;

    // Outer Stone Door Frame
    ctx.fillStyle = '#6b5c3e';
    ctx.strokeStyle = '#1e180d';
    ctx.lineWidth = 2.4;

    ctx.fillRect(goal.x - 5, goal.y - 6, goal.width + 10, goal.height + 6);
    ctx.strokeRect(goal.x - 5, goal.y - 6, goal.width + 10, goal.height + 6);

    // Top stone lintel bevel
    ctx.fillStyle = '#7a6a48';
    ctx.fillRect(goal.x - 7, goal.y - 9, goal.width + 14, 6);
    ctx.strokeRect(goal.x - 7, goal.y - 9, goal.width + 14, 6);

    // Recessed Dark Wooden Door Panel
    const doorGrad = ctx.createLinearGradient(0, goal.y, 0, goal.y + goal.height);
    doorGrad.addColorStop(0, '#382e1e');
    doorGrad.addColorStop(1, '#211a0f');
    ctx.fillStyle = doorGrad;
    ctx.fillRect(goal.x, goal.y, goal.width, goal.height);
    ctx.strokeRect(goal.x, goal.y, goal.width, goal.height);

    // Glowing Elemental Symbol Rune (♂ / ♀)
    const pulse = 10 + Math.sin(t * 5) * 6;
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = goal.isReached ? 24 : pulse;
    ctx.fillStyle = goal.isReached ? '#ffffff' : runeColor;
    ctx.font = 'bold 32px "Tajawal", "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(symbol, cx, cy);

    ctx.shadowBlur = pulse * 1.5;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(symbol, cx, cy);

    ctx.shadowBlur = 0;
    ctx.fillStyle = '#166534';
    ctx.beginPath();
    ctx.arc(goal.x - 5, goal.y + 12, 3.5, 0, Math.PI * 2);
    ctx.arc(goal.x - 3, goal.y + 18, 3.0, 0, Math.PI * 2);
    ctx.arc(goal.x - 5, goal.y + 35, 3.5, 0, Math.PI * 2);
    ctx.arc(goal.x - 4, goal.y + 50, 3.2, 0, Math.PI * 2);
    ctx.arc(goal.x + goal.width + 4, goal.y + 8, 3.5, 0, Math.PI * 2);
    ctx.arc(goal.x + goal.width + 3, goal.y + 24, 3.2, 0, Math.PI * 2);
    ctx.arc(goal.x + goal.width + 5, goal.y + 42, 3.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}
