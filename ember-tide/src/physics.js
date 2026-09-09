// =========================================================
// Ember & Tide - Physics & Collision Engine
// Reliable AABB platformer collision with swept axis resolution
// =========================================================

export class PhysicsEngine {
  static checkAABB(rect1, rect2) {
    return (
      rect1.x < rect2.x + rect2.width &&
      rect1.x + rect1.width > rect2.x &&
      rect1.y < rect2.y + rect2.height &&
      rect1.y + rect1.height > rect2.y
    );
  }

  static checkPointInRect(px, py, rect) {
    return (
      px >= rect.x &&
      px <= rect.x + rect.width &&
      py >= rect.y &&
      py <= rect.y + rect.height
    );
  }

  // Resolve one player using separated X/Y movement. The previous position is
  // used to decide whether the collision was actually a landing or ceiling hit;
  // this prevents side contacts from snapping a player to the top of a platform.
  static resolvePlayerPhysics(player, platforms, movingPlatforms, dt) {
    const previousAttachedPlatform = player.attachedPlatform;
    const wasGrounded = !!player.isGrounded;

    // Carry a player that was already standing on a moving platform by that
    // platform's exact frame delta. Do this before resolving the new collision
    // so the platform cannot double-apply its motion.
    if (wasGrounded && previousAttachedPlatform) {
      player.x += previousAttachedPlatform.dx || 0;
      player.y += previousAttachedPlatform.dy || 0;
    }

    const hitboxOffsetX = 2;
    const hitboxOffsetY = 2;
    const hitboxWidth = player.width - 4;
    const hitboxHeight = player.height - 2;
    const epsilon = 0.001;

    const solids = [];
    for (const plat of platforms) {
      if (plat.solid !== false) solids.push(plat);
    }
    for (const mp of movingPlatforms) {
      if (mp.solid !== false) solids.push(mp);
    }

    // -------------------------
    // Horizontal axis
    // -------------------------
    const previousX = player.x;
    player.x += player.vx * dt;

    let currentHitbox = player.getHitbox();
    const previousHitboxX = {
      x: previousX + hitboxOffsetX,
      y: player.y + hitboxOffsetY,
      width: hitboxWidth,
      height: hitboxHeight
    };

    for (const solid of solids) {
      if (!PhysicsEngine.checkAABB(currentHitbox, solid)) continue;

      // Only resolve a horizontal collision if we approached from that side.
      if (player.vx > 0 && previousHitboxX.x + previousHitboxX.width <= solid.x + epsilon) {
        player.x = solid.x - hitboxOffsetX - hitboxWidth;
        player.vx = 0;
      } else if (player.vx < 0 && previousHitboxX.x >= solid.x + solid.width - epsilon) {
        player.x = solid.x + solid.width - hitboxOffsetX;
        player.vx = 0;
      }

      currentHitbox = player.getHitbox();
    }

    // -------------------------
    // Vertical axis
    // -------------------------
    const previousY = player.y;
    const previousBottom = previousY + hitboxOffsetY + hitboxHeight;
    const previousTop = previousY + hitboxOffsetY;

    player.y += player.vy * dt;
    player.isGrounded = false;
    player.attachedPlatform = null;

    currentHitbox = player.getHitbox();

    for (const solid of solids) {
      if (!PhysicsEngine.checkAABB(currentHitbox, solid)) continue;

      if (player.vy > 0 && previousBottom <= solid.y + epsilon) {
        // Falling onto the top surface.
        player.y = solid.y - hitboxOffsetY - hitboxHeight;
        player.vy = 0;
        player.isGrounded = true;
        if (solid.dx !== undefined || solid.dy !== undefined) {
          player.attachedPlatform = solid;
        }
      } else if (player.vy < 0 && previousTop >= solid.y + solid.height - epsilon) {
        // Rising into the underside.
        player.y = solid.y + solid.height - hitboxOffsetY;
        player.vy = 0;
      } else if (player.vy === 0 && wasGrounded && previousAttachedPlatform === solid) {
        // A carried player can remain grounded even when the platform moved only
        // a tiny amount and the current overlap is numerically edge-aligned.
        player.y = solid.y - hitboxOffsetY - hitboxHeight;
        player.isGrounded = true;
        player.attachedPlatform = solid;
      }

      currentHitbox = player.getHitbox();
    }

    // Keep coordinates finite. A bad network or level value must never poison
    // the simulation with NaN/Infinity and send the player somewhere random.
    if (!Number.isFinite(player.x)) player.x = previousX;
    if (!Number.isFinite(player.y)) player.y = previousY;
    if (!Number.isFinite(player.vx)) player.vx = 0;
    if (!Number.isFinite(player.vy)) player.vy = 0;
  }
}
