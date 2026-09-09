// =========================================================
// Ember & Tide - Player Entity (Authentic Elemental Guardians)
// Exact character visual design: Flame Guardian & Water Guardian
// =========================================================

import { PhysicsEngine } from '../physics.js';

export class Player {
  constructor(type, x, y, audio, particles) {
    this.type = type; // 'ember' (fire) or 'tide' (water)
    this.name = type === 'ember' ? 'FireBoy' : 'WaterGirl';
    this.x = x;
    this.y = y;
    this.spawnX = x;
    this.spawnY = y;
    this.audio = audio;
    this.particles = particles;

    // Dimensions matching original proportions
    this.width = 24;
    this.height = 42;

    // Physics parameters
    this.vx = 0;
    this.vy = 0;
    this.speed = 250;
    this.accel = 1900;
    this.friction = 1500;
    this.airFriction = 350;
    this.jumpForce = -520;
    this.gravity = 1400;
    this.maxFallSpeed = 750;

    // State machine
    this.isGrounded = false;
    this.wasGrounded = false;
    this.isDead = false;
    this.deathTimer = 0;
    this.isRespawning = false;
    this.respawnTimer = 0;
    this.isVictory = false;
    this.facing = 1; // 1 = right, -1 = left

    // Polish timings
    this.coyoteTimer = 0;
    this.jumpBufferTimer = 0;
    this.coyoteMax = 0.12;
    this.jumpBufferMax = 0.12;

    // Animation & procedural rendering
    this.animTime = Math.random() * 10;
    this.walkCycle = 0;
    this.scaleX = 1;
    this.scaleY = 1;
    this.blinkTimer = 2 + Math.random() * 3;
    this.isBlinking = false;
    this.stepParticleTimer = 0;

    // Remote replication state (for online mode)
    this.isRemote = false;
    this.displayName = '';
    this.targetX = x;
    this.targetY = y;
    this.targetVx = 0;
    this.targetVy = 0;
    this.targetFacing = 1;

    // Elemental theme colors
    if (this.type === 'ember') {
      this.primaryColor = '#ff3300';
      this.glowColor = '#ff6600';
      this.highlightColor = '#ffea00';
    } else {
      this.primaryColor = '#00b4d8';
      this.glowColor = '#38bdf8';
      this.highlightColor = '#caf0f8';
    }
  }

  setSpawn(x, y) {
    this.spawnX = x;
    this.spawnY = y;
  }

  getHitbox() {
    return {
      x: this.x + 2,
      y: this.y + 2,
      width: this.width - 4,
      height: this.height - 2
    };
  }

  die(cause = 'hazard') {
    if (this.isDead || this.isVictory) return;
    this.isDead = true;
    this.deathTimer = 0.7;
    this.vx = 0;
    this.vy = 0;

    if (this.audio) this.audio.playDeath();

    if (this.particles) {
      if (this.type === 'ember') {
        this.particles.emitFireBurst(this.x + this.width / 2, this.y + this.height / 2, 24);
      } else {
        this.particles.emitWaterSplash(this.x + this.width / 2, this.y + this.height / 2, 24);
      }
    }
  }

  respawn() {
    this.x = this.spawnX;
    this.y = this.spawnY;
    this.vx = 0;
    this.vy = 0;
    this.isDead = false;
    this.isRespawning = true;
    this.respawnTimer = 0.4;
    this.scaleX = 0.3;
    this.scaleY = 1.6;

    if (this.audio) this.audio.playRespawn();

    if (this.particles) {
      this.particles.emitSparkles(this.x + this.width / 2, this.y + this.height / 2, this.highlightColor, 14);
    }
  }

  update(dt, input, platforms, movingPlatforms, boxes = []) {
    this.animTime += dt;

    if (this.isDead) {
      this.deathTimer -= dt;
      if (this.deathTimer <= 0) {
        this.respawn();
      }
      return;
    }

    if (this.isRespawning) {
      this.respawnTimer -= dt;
      if (this.respawnTimer <= 0) {
        this.isRespawning = false;
      }
    }

    if (this.isVictory) {
      this.vx *= 0.8;
      this.vy += this.gravity * dt;
      PhysicsEngine.resolvePlayerPhysics(this, platforms, movingPlatforms, dt);
      return;
    }

    // Blinking logic
    this.blinkTimer -= dt;
    if (this.blinkTimer <= 0) {
      this.isBlinking = !this.isBlinking;
      this.blinkTimer = this.isBlinking ? 0.12 : (2 + Math.random() * 4);
    }

    // Jump Buffering & Coyote Timer
    if (input.jump) {
      this.jumpBufferTimer = this.jumpBufferMax;
    } else {
      this.jumpBufferTimer = Math.max(0, this.jumpBufferTimer - dt);
    }

    if (this.isGrounded) {
      this.coyoteTimer = this.coyoteMax;
    } else {
      this.coyoteTimer = Math.max(0, this.coyoteTimer - dt);
    }

    // 1. Horizontal Input
    let targetVx = 0;
    if (input.left && !input.right) {
      targetVx = -this.speed;
      this.facing = -1;
    } else if (input.right && !input.left) {
      targetVx = this.speed;
      this.facing = 1;
    }

    const currentFriction = this.isGrounded ? this.friction : this.airFriction;
    if (targetVx !== 0) {
      if (Math.sign(this.vx) !== Math.sign(targetVx) && this.vx !== 0) {
        this.vx = 0;
      }
      this.vx += Math.sign(targetVx) * this.accel * dt;
      if (Math.abs(this.vx) > this.speed) {
        this.vx = targetVx;
      }
      this.walkCycle += dt * 14;
    } else {
      if (this.vx > 0) {
        this.vx = Math.max(0, this.vx - currentFriction * dt);
      } else if (this.vx < 0) {
        this.vx = Math.min(0, this.vx + currentFriction * dt);
      }
      this.walkCycle = 0;
    }

    // 2. Jump execution
    if (this.jumpBufferTimer > 0 && this.coyoteTimer > 0) {
      this.vy = this.jumpForce;
      this.jumpBufferTimer = 0;
      this.coyoteTimer = 0;
      this.isGrounded = false;
      this.scaleX = 0.8;
      this.scaleY = 1.25;

      if (this.audio) this.audio.playJump(this.type === 'ember');
      if (this.particles) {
        this.particles.emitDust(this.x + this.width / 2, this.y + this.height, 4);
      }
    }

    // Variable jump height cut
    if (!input.jump && this.vy < -180) {
      this.vy += 1300 * dt;
    }

    // 3. Gravity
    this.vy = Math.min(this.maxFallSpeed, this.vy + this.gravity * dt);

    // 4. Resolve Physics with Platforms, Moving Platforms and Pushable Boxes
    this.wasGrounded = this.isGrounded;
    PhysicsEngine.resolvePlayerPhysics(this, platforms, movingPlatforms, dt);

    // Pushable boxes interaction
    for (const box of boxes) {
      const hb = this.getHitbox();
      if (PhysicsEngine.checkAABB(hb, box)) {
        if (this.vx > 0 && hb.x + hb.width <= box.x + 10) {
          box.x += this.vx * dt * 0.7; // Push box right
        } else if (this.vx < 0 && hb.x >= box.x + box.width - 10) {
          box.x += this.vx * dt * 0.7; // Push box left
        }
      }
    }

    // Landing detection
    if (!this.wasGrounded && this.isGrounded) {
      this.scaleX = 1.3;
      this.scaleY = 0.75;
      if (this.audio) this.audio.playLand();
      if (this.particles) {
        this.particles.emitDust(this.x + this.width / 2, this.y + this.height, 6);
      }
    }

    // Smooth return to normal scale
    this.scaleX += (1 - this.scaleX) * 14 * dt;
    this.scaleY += (1 - this.scaleY) * 14 * dt;

    // Movement particle emissions
    if (this.isGrounded && Math.abs(this.vx) > 30 && this.particles) {
      this.stepParticleTimer += dt;
      if (this.stepParticleTimer > 0.12) {
        this.stepParticleTimer = 0;
        const color = this.type === 'ember' ? '#ff6600' : '#38bdf8';
        this.particles.emit({
          x: this.x + this.width / 2 - this.facing * 6,
          y: this.y + this.height - 2,
          vx: -this.facing * 18 + (Math.random() - 0.5) * 8,
          vy: -12 - Math.random() * 15,
          size: 2.5,
          endSize: 0,
          color,
          life: 0.3,
          glow: true
        });
      }
    }
  }

  applyRemoteState(state) {
    if (!state) return;
    this.targetX = state.x;
    this.targetY = state.y;
    this.targetVx = state.vx || 0;
    this.targetVy = state.vy || 0;
    this.targetFacing = state.facing || 1;
    this.isGrounded = !!state.isGrounded;
    this.animTime = state.animTime || this.animTime;

    if (state.scaleX !== undefined) this.scaleX = state.scaleX;
    if (state.scaleY !== undefined) this.scaleY = state.scaleY;

    if (state.isDead && !this.isDead) {
      this.die('remote');
    } else if (!state.isDead && this.isDead) {
      this.respawn();
    }
    if (state.isVictory) {
      this.isVictory = true;
    }
  }

  updateRemote(dt) {
    this.animTime += dt;

    if (this.isDead) {
      this.deathTimer -= dt;
      if (this.deathTimer <= 0) {
        this.respawn();
      }
      return;
    }

    if (this.isRespawning) {
      this.respawnTimer -= dt;
      if (this.respawnTimer <= 0) {
        this.isRespawning = false;
      }
    }

    const lerpFactor = Math.min(1.0, 18 * dt);
    this.x += (this.targetX - this.x) * lerpFactor;
    this.y += (this.targetY - this.y) * lerpFactor;
    this.vx = this.targetVx;
    this.vy = this.targetVy;
    this.facing = this.targetFacing;

    if (Math.abs(this.vx) > 20) {
      this.walkCycle += dt * 14;
    } else {
      this.walkCycle = 0;
    }
  }

  render(ctx) {
    if (this.isDead) return;
    ctx.save();
    const cx = this.x + this.width / 2;
    const feetY = this.y + this.height;

    if (this.displayName) {
      ctx.save(); ctx.shadowBlur = 0; ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      const tagText = `${this.type === 'ember' ? '🔥' : '💧'} ${this.displayName}`;
      ctx.font = 'bold 11px Tajawal, sans-serif';
      const textWidth = ctx.measureText(tagText).width;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(cx - textWidth / 2 - 6, this.y - 18, textWidth + 12, 16, 6);
      else ctx.rect(cx - textWidth / 2 - 6, this.y - 18, textWidth + 12, 16);
      ctx.fill();
      ctx.fillStyle = this.type === 'ember' ? '#ffea00' : '#38bdf8'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(tagText, cx, this.y - 10); ctx.restore();
    }

    ctx.translate(cx, feetY);
    ctx.scale(this.facing * this.scaleX * 1.15, this.scaleY * 1.15);
    if (this.type === 'ember') this.renderFireCharacter(ctx);
    else this.renderWaterCharacter(ctx);
    ctx.restore();
  }

  renderFireCharacter(ctx) {
    const t = this.animTime * 8;
    const f1 = Math.sin(t) * 1.0;
    const f2 = Math.cos(t * 1.1) * 1.2;
    const f3 = Math.sin(t * 1.4) * 0.9;

    ctx.shadowColor = '#ff5500';
    ctx.shadowBlur = 10;

    // ─── 1. Flame Head ───
    const headGrad = ctx.createRadialGradient(0, -30, 2, 0, -32, 18);
    headGrad.addColorStop(0, '#fff59d');
    headGrad.addColorStop(0.25, '#ffb300');
    headGrad.addColorStop(0.65, '#f4511e');
    headGrad.addColorStop(1, '#b71c1c');

    ctx.fillStyle = headGrad;
    ctx.beginPath();
    ctx.moveTo(-10, -22);
    ctx.quadraticCurveTo(-14, -30 + f1, -12, -37 + f2);
    ctx.lineTo(-8, -34 + f1);
    ctx.quadraticCurveTo(-10, -43 + f3, -5, -45 + f1);
    ctx.lineTo(-2, -40 + f2);
    ctx.quadraticCurveTo(0, -50 + f1, 3, -47 + f2);
    ctx.lineTo(5, -40 + f3);
    ctx.quadraticCurveTo(11, -43 + f2, 9, -36 + f1);
    ctx.lineTo(8, -32 + f3);
    ctx.quadraticCurveTo(14, -30 - f3, 11, -22);
    ctx.quadraticCurveTo(8, -15, 0, -14.5);
    ctx.quadraticCurveTo(-8, -15, -10, -22);
    ctx.closePath();
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#1a0400';
    ctx.lineWidth = 1.6;
    ctx.lineJoin = 'round';
    ctx.stroke();

    const coreGrad = ctx.createRadialGradient(0, -28, 1, 0, -28, 7);
    coreGrad.addColorStop(0, 'rgba(255, 255, 220, 0.55)');
    coreGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = coreGrad;
    ctx.beginPath();
    ctx.arc(0, -28, 7, 0, Math.PI * 2);
    ctx.fill();

    // ─── 2. Classic Expressive Eyes ───
    if (!this.isBlinking) {
      ctx.strokeStyle = '#2b0600';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(-7.5, -31.5); ctx.lineTo(-2.2, -30.0);
      ctx.moveTo(2.2, -30.0); ctx.lineTo(7.5, -31.5);
      ctx.stroke();

      ctx.fillStyle = '#ffea00';
      ctx.strokeStyle = '#1a0400';
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.ellipse(-4.6, -25.5, 3.2, 3.6, -0.08, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#110200';
      ctx.beginPath();
      ctx.arc(-3.8, -25.5, 1.8, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(-4.4, -26.6, 0.8, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffea00';
      ctx.strokeStyle = '#1a0400';
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.ellipse(4.6, -25.5, 3.2, 3.6, 0.08, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#110200';
      ctx.beginPath();
      ctx.arc(5.4, -25.5, 1.8, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(4.8, -26.6, 0.8, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.strokeStyle = '#1a0400';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(-7.5, -25.5); ctx.lineTo(-1.8, -25.5);
      ctx.moveTo(1.8, -25.5); ctx.lineTo(7.5, -25.5);
      ctx.stroke();
    }

    ctx.strokeStyle = '#1a0400';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0.6, -19.5, 3.2, 0.15 * Math.PI, 0.85 * Math.PI, false);
    ctx.stroke();

    const legSwing = (this.isGrounded && Math.abs(this.vx) > 10) ? Math.sin(this.walkCycle) * 5 : 0;
    const armSwing = Math.sin(this.walkCycle) * 4.5;

    const bodyGrad = ctx.createLinearGradient(0, -15, 0, -6);
    bodyGrad.addColorStop(0, '#f4511e');
    bodyGrad.addColorStop(1, '#c62828');
    ctx.fillStyle = bodyGrad;
    ctx.strokeStyle = '#1a0400';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(-4, -15, 8, 8, 2.5);
    else ctx.rect(-4, -15, 8, 8);
    ctx.fill();
    ctx.stroke();

    ctx.lineWidth = 2.6;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#1a0400';
    ctx.beginPath();
    ctx.moveTo(-3, -13); ctx.lineTo(-6.5, -8 - armSwing);
    ctx.moveTo(3, -13); ctx.lineTo(6.5, -8 + armSwing);
    ctx.stroke();
    ctx.strokeStyle = '#ff5722';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(-3, -13); ctx.lineTo(-6.5, -8 - armSwing);
    ctx.moveTo(3, -13); ctx.lineTo(6.5, -8 + armSwing);
    ctx.stroke();

    ctx.strokeStyle = '#1a0400';
    ctx.lineWidth = 3.0;
    ctx.beginPath();
    ctx.moveTo(-2.2, -7); ctx.lineTo(-3.2 - legSwing, 0);
    ctx.moveTo(2.2, -7); ctx.lineTo(3.2 + legSwing, 0);
    ctx.stroke();
    ctx.strokeStyle = '#d32f2f';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(-2.2, -7); ctx.lineTo(-3.2 - legSwing, 0);
    ctx.moveTo(2.2, -7); ctx.lineTo(3.2 + legSwing, 0);
    ctx.stroke();
  }

  renderWaterCharacter(ctx) {
    const t = this.animTime * 7;
    const w1 = Math.sin(t) * 0.9;
    const w2 = Math.cos(t * 1.1) * 0.9;

    ctx.shadowColor = '#00d4ff';
    ctx.shadowBlur = 10;

    const headGrad = ctx.createRadialGradient(0, -29, 2, 0, -31, 18);
    headGrad.addColorStop(0, '#ffffff');
    headGrad.addColorStop(0.3, '#7dd3fc');
    headGrad.addColorStop(0.7, '#0284c7');
    headGrad.addColorStop(1, '#034570');

    ctx.fillStyle = headGrad;
    ctx.beginPath();
    ctx.moveTo(-10, -22);
    ctx.quadraticCurveTo(-14, -20 + w1, -12, -15 + w1);
    ctx.quadraticCurveTo(-9, -16, -7.5, -21);
    ctx.quadraticCurveTo(-13, -29, -10, -36);
    ctx.quadraticCurveTo(-7, -43, -3, -46 + w1);
    ctx.quadraticCurveTo(0, -50 + w1, 3, -46 + w2);
    ctx.quadraticCurveTo(8, -41, 10.5, -33);
    ctx.quadraticCurveTo(13, -25, 11, -22);
    ctx.quadraticCurveTo(8, -15, 0, -14.5);
    ctx.quadraticCurveTo(-8, -15, -10, -22);
    ctx.closePath();
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#011e33';
    ctx.lineWidth = 1.6;
    ctx.lineJoin = 'round';
    ctx.stroke();

    ctx.fillStyle = '#bae6fd';
    ctx.beginPath();
    ctx.arc(0, -44 + w1, 3.0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#011e33';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.beginPath();
    ctx.ellipse(-3.0, -34, 3.5, 1.4, -0.25, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(56, 189, 248, 0.45)';
    ctx.beginPath();
    ctx.arc(-5.5, -20, 1.8, 0, Math.PI * 2);
    ctx.arc(5.5, -20, 1.8, 0, Math.PI * 2);
    ctx.fill();

    if (!this.isBlinking) {
      ctx.strokeStyle = '#02385c';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(-4.6, -30.0, 3.0, 1.15 * Math.PI, 1.85 * Math.PI);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(4.6, -30.0, 3.0, 1.15 * Math.PI, 1.85 * Math.PI);
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#011e33';
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.ellipse(-4.6, -25.5, 3.2, 3.6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#0284c7';
      ctx.beginPath();
      ctx.arc(-4.4, -25.5, 2.0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#011627';
      ctx.beginPath();
      ctx.arc(-4.2, -25.5, 1.3, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(-4.8, -26.6, 0.8, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#011e33';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(-4.6, -25.5, 3.2, 1.15 * Math.PI, 1.85 * Math.PI);
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#011e33';
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.ellipse(4.6, -25.5, 3.2, 3.6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#0284c7';
      ctx.beginPath();
      ctx.arc(4.8, -25.5, 2.0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#011627';
      ctx.beginPath();
      ctx.arc(5.0, -25.5, 1.3, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(4.4, -26.6, 0.8, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#011e33';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(4.6, -25.5, 3.2, 1.15 * Math.PI, 1.85 * Math.PI);
      ctx.stroke();
    } else {
      ctx.strokeStyle = '#011e33';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(-7.5, -25.5); ctx.lineTo(-1.8, -25.5);
      ctx.moveTo(1.8, -25.5); ctx.lineTo(7.5, -25.5);
      ctx.stroke();
    }

    ctx.strokeStyle = '#011e33';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0.5, -19.5, 3.0, 0.15 * Math.PI, 0.85 * Math.PI, false);
    ctx.stroke();

    const legSwing = (this.isGrounded && Math.abs(this.vx) > 10) ? Math.sin(this.walkCycle) * 5 : 0;
    const armSwing = Math.sin(this.walkCycle) * 4.5;

    const bodyGrad = ctx.createLinearGradient(0, -15, 0, -6);
    bodyGrad.addColorStop(0, '#0284c7');
    bodyGrad.addColorStop(1, '#03588f');
    ctx.fillStyle = bodyGrad;
    ctx.strokeStyle = '#011e33';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(-4, -15, 8, 8, 2.5);
    else ctx.rect(-4, -15, 8, 8);
    ctx.fill();
    ctx.stroke();

    ctx.lineWidth = 2.6;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#011e33';
    ctx.beginPath();
    ctx.moveTo(-3, -13); ctx.lineTo(-6.5, -8 - armSwing);
    ctx.moveTo(3, -13); ctx.lineTo(6.5, -8 + armSwing);
    ctx.stroke();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(-3, -13); ctx.lineTo(-6.5, -8 - armSwing);
    ctx.moveTo(3, -13); ctx.lineTo(6.5, -8 + armSwing);
    ctx.stroke();

    ctx.strokeStyle = '#011e33';
    ctx.lineWidth = 3.0;
    ctx.beginPath();
    ctx.moveTo(-2.2, -7); ctx.lineTo(-3.2 - legSwing, 0);
    ctx.moveTo(2.2, -7); ctx.lineTo(3.2 + legSwing, 0);
    ctx.stroke();
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(-2.2, -7); ctx.lineTo(-3.2 - legSwing, 0);
    ctx.moveTo(2.2, -7); ctx.lineTo(3.2 + legSwing, 0);
    ctx.stroke();
  }
}
