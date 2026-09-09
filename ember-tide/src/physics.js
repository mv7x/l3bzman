// =========================================================
// Ember & Tide - Physics & Collision Engine
// High reliability AABB resolution, platformers & moving bodies
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

  // Resolve player movement against solid level geometry & moving platforms
  static resolvePlayerPhysics(player, platforms, movingPlatforms, dt) {
    // 1. Move horizontally
    player.x += player.vx * dt;
    
    // Check horizontal collision against static platforms
    for (const plat of platforms) {
      if (!plat.solid) continue;
      if (PhysicsEngine.checkAABB(player.getHitbox(), plat)) {
        if (player.vx > 0) {
          player.x = plat.x - player.width;
          player.vx = 0;
        } else if (player.vx < 0) {
          player.x = plat.x + plat.width;
          player.vx = 0;
        }
      }
    }

    // Check horizontal collision against active moving platforms / closed doors
    for (const mp of movingPlatforms) {
      if (!mp.solid) continue;
      if (PhysicsEngine.checkAABB(player.getHitbox(), mp)) {
        if (player.vx > 0) {
          player.x = mp.x - player.width;
          player.vx = 0;
        } else if (player.vx < 0) {
          player.x = mp.x + mp.width;
          player.vx = 0;
        }
      }
    }

    // 2. Move vertically
    const prevY = player.y;
    player.y += player.vy * dt;
    player.isGrounded = false;
    player.attachedPlatform = null;

    // Check vertical collision against static platforms
    for (const plat of platforms) {
      if (!plat.solid) continue;
      if (PhysicsEngine.checkAABB(player.getHitbox(), plat)) {
        if (player.vy > 0) {
          // Landing on floor
          player.y = plat.y - player.height;
          player.vy = 0;
          player.isGrounded = true;
        } else if (player.vy < 0) {
          // Hitting ceiling
          player.y = plat.y + plat.height;
          player.vy = 0;
        }
      }
    }

    // Check vertical collision against moving platforms
    for (const mp of movingPlatforms) {
      if (!mp.solid) continue;
      const hitbox = player.getHitbox();
      
      // Check if landing on top of platform
      if (PhysicsEngine.checkAABB(hitbox, mp)) {
        if (player.vy > 0 && prevY + player.height <= mp.y + 12) {
          player.y = mp.y - player.height;
          player.vy = 0;
          player.isGrounded = true;
          player.attachedPlatform = mp;
        } else if (player.vy < 0) {
          // Hitting underside
          player.y = mp.y + mp.height;
          player.vy = 0;
        }
      }
    }

    // Apply moving platform motion if standing on it
    if (player.attachedPlatform && player.isGrounded) {
      player.x += player.attachedPlatform.dx || 0;
      player.y += player.attachedPlatform.dy || 0;
    }
  }
}
