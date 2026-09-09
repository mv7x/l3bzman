// =========================================================
// Ember & Tide - Fixed Gameplay Camera
// Forest Temple-style single-screen framing
// =========================================================

export class Camera {
  constructor(viewportWidth = 1280, viewportHeight = 720) {
    this.viewportWidth = viewportWidth;
    this.viewportHeight = viewportHeight;
    this.x = 0;
    this.y = 0;
    this.zoom = 1;
    this.targetZoom = 1;
    this.levelWidth = 1280;
    this.levelHeight = 720;
    this.shakeIntensity = 0;
    this.shakeDuration = 0;
  }

  setLevelBounds(width, height) {
    this.levelWidth = width;
    this.levelHeight = height;
    this.fitLevel();
  }

  setViewport(w, h) {
    this.viewportWidth = w;
    this.viewportHeight = h;
    this.fitLevel();
  }

  fitLevel() {
    // Campaign levels are designed as single-screen puzzle rooms.
    // Never dynamically zoom based on player distance or death state.
    this.zoom = 1;
    this.targetZoom = 1;
    this.x = Math.max(0, (this.levelWidth - this.viewportWidth) / 2);
    this.y = Math.max(0, (this.levelHeight - this.viewportHeight) / 2);
  }

  shake(intensity = 6, duration = 0.25) {
    this.shakeIntensity = intensity;
    this.shakeDuration = duration;
  }

  update(dt) {
    // Intentionally no player-distance zooming.
    // Deaths, respawns and player separation must not resize the playfield.
    this.zoom = 1;
    this.targetZoom = 1;

    if (this.shakeDuration > 0) {
      this.shakeDuration -= dt;
      if (this.shakeDuration <= 0) {
        this.shakeDuration = 0;
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

    ctx.translate(-Math.round(this.x + shakeX), -Math.round(this.y + shakeY));
  }

  restoreTransform(ctx) {
    ctx.restore();
  }
}
