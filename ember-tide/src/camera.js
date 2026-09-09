// =========================================================
// Ember & Tide - Dynamic Dual-Character Tracking Camera
// Keeps both Ember & Tide in frame with smooth zoom & lerp
// =========================================================

export class Camera {
  constructor(viewportWidth = 1280, viewportHeight = 720) {
    this.viewportWidth = viewportWidth;
    this.viewportHeight = viewportHeight;

    this.x = 0;
    this.y = 0;
    this.targetX = 0;
    this.targetY = 0;

    this.zoom = 1.0;
    this.targetZoom = 1.0;
    this.minZoom = 0.72;
    this.maxZoom = 1.1;

    this.levelWidth = 1280;
    this.levelHeight = 720;

    this.lerpSpeed = 5.0; // Smooth camera damping
    this.shakeIntensity = 0;
    this.shakeDuration = 0;
  }

  setLevelBounds(width, height) {
    this.levelWidth = width;
    this.levelHeight = height;
  }

  setViewport(w, h) {
    this.viewportWidth = w;
    this.viewportHeight = h;
  }

  shake(intensity = 6, duration = 0.25) {
    this.shakeIntensity = intensity;
    this.shakeDuration = duration;
  }

  update(dt, ember, tide) {
    if (!ember || !tide) return;

    // For standard screen-sized levels (like level 1: 1280x720):
    // Lock the camera steadily at zoom 1.0 so the entire puzzle arena is visible
    // and NEVER shrinks, zooms, or jerks when a character dies!
    if (this.levelWidth <= this.viewportWidth && this.levelHeight <= this.viewportHeight) {
      this.targetZoom = 1.0;
      this.zoom = 1.0;
      this.x = 0;
      this.y = 0;
      if (this.shakeDuration > 0) {
        this.shakeDuration -= dt;
        if (this.shakeDuration <= 0) this.shakeIntensity = 0;
      }
      return;
    }

    // For larger levels: track both players smoothly (use spawn position if dying)
    const ex = ember.isDead ? ember.spawnX : ember.x;
    const ey = ember.isDead ? ember.spawnY : ember.y;
    const tx = tide.isDead ? tide.spawnX : tide.x;
    const ty = tide.isDead ? tide.spawnY : tide.y;

    const targetCenterX = (ex + ember.width / 2 + tx + tide.width / 2) / 2;
    const targetCenterY = (ey + ember.height / 2 + ty + tide.height / 2) / 2;

    const dx = Math.abs((ex + ember.width / 2) - (tx + tide.width / 2));
    const dy = Math.abs((ey + ember.height / 2) - (ty + tide.height / 2));
    const maxSpan = Math.max(dx / (this.viewportWidth * 0.7), dy / (this.viewportHeight * 0.7));

    this.targetZoom = maxSpan > 1.0 ? Math.max(this.minZoom, 1.0 / maxSpan) : 1.0;
    this.zoom += (this.targetZoom - this.zoom) * 3.0 * dt;

    const worldViewW = this.viewportWidth / this.zoom;
    const worldViewH = this.viewportHeight / this.zoom;

    let desiredX = targetCenterX - worldViewW / 2;
    let desiredY = targetCenterY - worldViewH / 2;

    if (this.levelWidth > worldViewW) {
      desiredX = Math.max(0, Math.min(this.levelWidth - worldViewW, desiredX));
    } else {
      desiredX = (this.levelWidth - worldViewW) / 2;
    }

    if (this.levelHeight > worldViewH) {
      desiredY = Math.max(0, Math.min(this.levelHeight - worldViewH, desiredY));
    } else {
      desiredY = (this.levelHeight - worldViewH) / 2;
    }

    this.x += (desiredX - this.x) * this.lerpSpeed * dt;
    this.y += (desiredY - this.y) * this.lerpSpeed * dt;

    if (this.shakeDuration > 0) {
      this.shakeDuration -= dt;
      if (this.shakeDuration <= 0) {
        this.shakeIntensity = 0;
      }
    }
  }

  applyTransform(ctx) {
    ctx.save();

    // Apply shake offset
    let shakeX = 0;
    let shakeY = 0;
    if (this.shakeIntensity > 0) {
      shakeX = (Math.random() - 0.5) * this.shakeIntensity * 2;
      shakeY = (Math.random() - 0.5) * this.shakeIntensity * 2;
    }

    // Center zoom on viewport
    ctx.translate(this.viewportWidth / 2, this.viewportHeight / 2);
    ctx.scale(this.zoom, this.zoom);
    ctx.translate(-this.viewportWidth / 2, -this.viewportHeight / 2);

    // Camera offset
    ctx.translate(-Math.round(this.x + shakeX), -Math.round(this.y + shakeY));
  }

  restoreTransform(ctx) {
    ctx.restore();
  }
}
