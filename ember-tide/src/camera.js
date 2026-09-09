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

    this.lerpSpeed = 5.0;
    this.shakeIntensity = 0;
    this.shakeDuration = 0;

    // Death camera lock: remember the exact zoom before a death and keep it
    // unchanged through the death + respawn animation. This prevents the
    // camera from interpreting the temporary player movement as a request to zoom.
    this.deathZoomLocked = false;
    this.deathZoom = 1.0;
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

    const someoneDying = ember.isDead || tide.isDead || ember.isRespawning || tide.isRespawning;

    // Capture the current zoom exactly once when the first character dies.
    // Never recalculate zoom while either character is in the death/respawn state.
    if (someoneDying && !this.deathZoomLocked) {
      this.deathZoomLocked = true;
      this.deathZoom = this.zoom;
    } else if (!someoneDying) {
      this.deathZoomLocked = false;
    }

    // Standard screen-sized levels stay at 1:1.
    if (this.levelWidth <= this.viewportWidth && this.levelHeight <= this.viewportHeight) {
      this.targetZoom = 1.0;
      this.zoom = 1.0;
      this.x = 0;
      this.y = 0;
      this.updateShake(dt);
      return;
    }

    // During death/respawn, freeze ONLY the zoom. Camera position can still
    // smoothly follow the remaining player without changing the scale.
    if (this.deathZoomLocked) {
      this.targetZoom = this.deathZoom;
      this.zoom = this.deathZoom;
    }

    // Keep dead/respawning players at their last/normal position for framing;
    // do not replace them with spawn coordinates, which can cause a sudden
    // distance jump and was the source of the visible zoom-out effect.
    const ex = ember.x;
    const ey = ember.y;
    const tx = tide.x;
    const ty = tide.y;

    const targetCenterX = (ex + ember.width / 2 + tx + tide.width / 2) / 2;
    const targetCenterY = (ey + ember.height / 2 + ty + tide.height / 2) / 2;

    // Only calculate dynamic zoom during normal gameplay.
    if (!this.deathZoomLocked) {
      const dx = Math.abs((ex + ember.width / 2) - (tx + tide.width / 2));
      const dy = Math.abs((ey + ember.height / 2) - (ty + tide.height / 2));
      const maxSpan = Math.max(
        dx / (this.viewportWidth * 0.7),
        dy / (this.viewportHeight * 0.7)
      );

      this.targetZoom = maxSpan > 1.0 ? Math.max(this.minZoom, 1.0 / maxSpan) : 1.0;
      this.zoom += (this.targetZoom - this.zoom) * 3.0 * dt;
    }

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

    this.updateShake(dt);
  }

  updateShake(dt) {
    if (this.shakeDuration > 0) {
      this.shakeDuration -= dt;
      if (this.shakeDuration <= 0) {
        this.shakeIntensity = 0;
      }
    }
  }

  applyTransform(ctx) {
    ctx.save();

    let shakeX = 0;
    let shakeY = 0;
    if (this.shakeIntensity > 0) {
      shakeX = (Math.random() - 0.5) * this.shakeIntensity * 2;
      shakeY = (Math.random() - 0.5) * this.shakeIntensity * 2;
    }

    ctx.translate(this.viewportWidth / 2, this.viewportHeight / 2);
    ctx.scale(this.zoom, this.zoom);
    ctx.translate(-this.viewportWidth / 2, -this.viewportHeight / 2);
    ctx.translate(-Math.round(this.x + shakeX), -Math.round(this.y + shakeY));
  }

  restoreTransform(ctx) {
    ctx.restore();
  }
}
