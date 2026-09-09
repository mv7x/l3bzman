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
    this.renderScale = 1;
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
    this.zoom = 1;
    this.targetZoom = 1;
    this.renderScale = Math.min(
      this.viewportWidth / this.levelWidth,
      this.viewportHeight / this.levelHeight
    );
    this.x = 0;
    this.y = 0;
  }

  shake(intensity = 6, duration = 0.25) {
    this.shakeIntensity = intensity;
    this.shakeDuration = duration;
  }

  update(dt) {
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
