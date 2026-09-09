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
    this.levelWidth = 1520;
    this.levelHeight = 900;
    this.renderScale = 0.8;
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
    // Campaign rooms use a fixed single-screen composition.
    // The level data is authored at 1520x900; render it at 80%
    // so the complete room fits inside the 1280x720 playfield.
    this.zoom = 1;
    this.targetZoom = 1;
    this.renderScale = Math.min(
      this.viewportWidth / this.levelWidth,
      this.viewportHeight / this.levelHeight
    );
    // Keep a small, consistent margin so the room never touches
    // the canvas edges and never changes size during gameplay.
    this.renderScale = Math.min(this.renderScale, 0.8);

    this.x = 0;
    this.y = 0;
  }

  shake(intensity = 6, duration = 0.25) {
    this.shakeIntensity = intensity;
    this.shakeDuration = duration;
  }

  update(dt) {
    // Never dynamically zoom based on player distance or death state.
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

    // Scale the authored 1520x900 room down to fit the full
    // 1280x720 viewport, keeping the entire puzzle visible.
    const scale = this.renderScale;
    const scaledWidth = this.levelWidth * scale;
    const scaledHeight = this.levelHeight * scale;
    const offsetX = (this.viewportWidth - scaledWidth) / 2;
    const offsetY = (this.viewportHeight - scaledHeight) / 2;

    ctx.translate(Math.round(offsetX + shakeX), Math.round(offsetY + shakeY));
    ctx.scale(scale, scale);
  }

  restoreTransform(ctx) {
    ctx.restore();
  }
}
