// =========================================================
// Ember & Tide - Particle Engine
// Flame embers, water splashes, magic auras, dust, sparks
// =========================================================

export class ParticleSystem {
  constructor() {
    this.particles = [];
    this.maxParticles = 350;
    this.enabled = true;
  }

  setEnabled(val) {
    this.enabled = val;
    if (!val) this.particles = [];
  }

  emit(options) {
    if (!this.enabled) return;
    if (this.particles.length >= this.maxParticles) {
      this.particles.shift();
    }

    const p = {
      x: options.x || 0,
      y: options.y || 0,
      vx: options.vx || (Math.random() - 0.5) * 50,
      vy: options.vy || (Math.random() - 0.5) * 50,
      size: options.size || 4,
      endSize: options.endSize !== undefined ? options.endSize : 0,
      color: options.color || '#ff6600',
      endColor: options.endColor || options.color || '#ff6600',
      alpha: options.alpha !== undefined ? options.alpha : 1.0,
      life: options.life || 0.6,
      maxLife: options.life || 0.6,
      gravity: options.gravity || 0,
      shape: options.shape || 'circle', // 'circle', 'square', 'sparkle', 'ring'
      glow: options.glow || false
    };

    this.particles.push(p);
  }

  emitFireBurst(x, y, count = 12) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 40 + Math.random() * 120;
      const colors = ['#ff3b00', '#ff8500', '#ffc107', '#ffffff'];
      this.emit({
        x: x + (Math.random() - 0.5) * 10,
        y: y + (Math.random() - 0.5) * 10,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 30,
        size: 3 + Math.random() * 4,
        endSize: 0.5,
        color: colors[Math.floor(Math.random() * colors.length)],
        life: 0.3 + Math.random() * 0.4,
        gravity: -60, // Rises
        glow: true
      });
    }
  }

  emitWaterSplash(x, y, count = 12) {
    for (let i = 0; i < count; i++) {
      const angle = -Math.PI * 0.15 - Math.random() * Math.PI * 0.7;
      const speed = 50 + Math.random() * 140;
      const colors = ['#00b4d8', '#90e0ef', '#caf0f8', '#0077b6'];
      this.emit({
        x: x + (Math.random() - 0.5) * 10,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 2.5 + Math.random() * 3.5,
        endSize: 1,
        color: colors[Math.floor(Math.random() * colors.length)],
        life: 0.35 + Math.random() * 0.3,
        gravity: 350,
        glow: true
      });
    }
  }

  emitDust(x, y, count = 5) {
    for (let i = 0; i < count; i++) {
      this.emit({
        x: x + (Math.random() - 0.5) * 14,
        y: y + 2,
        vx: (Math.random() - 0.5) * 40,
        vy: -Math.random() * 25,
        size: 2 + Math.random() * 3,
        endSize: 5,
        color: 'rgba(200, 210, 225, 0.4)',
        life: 0.25 + Math.random() * 0.2,
        gravity: -10,
        shape: 'circle'
      });
    }
  }

  emitSparkles(x, y, color = '#ffd700', count = 8) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 20 + Math.random() * 70;
      this.emit({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 2 + Math.random() * 3,
        endSize: 0,
        color,
        life: 0.4 + Math.random() * 0.3,
        shape: 'sparkle',
        glow: true
      });
    }
  }

  emitPortalRays(x, y, color = '#38bdf8') {
    if (Math.random() > 0.4) return;
    const angle = Math.random() * Math.PI * 2;
    const dist = 24 + Math.random() * 16;
    this.emit({
      x: x + Math.cos(angle) * dist,
      y: y + Math.sin(angle) * dist,
      vx: -Math.cos(angle) * 35,
      vy: -Math.sin(angle) * 35,
      size: 2 + Math.random() * 2,
      endSize: 0,
      color,
      life: 0.5,
      glow: true
    });
  }

  update(dt) {
    if (!this.enabled) return;

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += p.gravity * dt;
    }
  }

  render(ctx) {
    if (!this.enabled || this.particles.length === 0) return;

    ctx.save();
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      const progress = 1 - (p.life / p.maxLife);
      const alpha = Math.max(0, p.alpha * (1 - progress));
      const currentSize = Math.max(0.1, p.size + (p.endSize - p.size) * progress);

      ctx.globalAlpha = alpha;

      if (p.glow) {
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 8;
      } else {
        ctx.shadowBlur = 0;
      }

      ctx.fillStyle = p.color;

      if (p.shape === 'sparkle') {
        ctx.beginPath();
        ctx.moveTo(p.x, p.y - currentSize * 1.5);
        ctx.lineTo(p.x + currentSize * 0.5, p.y - currentSize * 0.5);
        ctx.lineTo(p.x + currentSize * 1.5, p.y);
        ctx.lineTo(p.x + currentSize * 0.5, p.y + currentSize * 0.5);
        ctx.lineTo(p.x, p.y + currentSize * 1.5);
        ctx.lineTo(p.x - currentSize * 0.5, p.y + currentSize * 0.5);
        ctx.lineTo(p.x - currentSize * 1.5, p.y);
        ctx.lineTo(p.x - currentSize * 0.5, p.y - currentSize * 0.5);
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, currentSize, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }
}
