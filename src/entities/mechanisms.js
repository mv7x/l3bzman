// =========================================================
// Ember & Tide - Authentic Puzzle Mechanisms & Interactive Devices
// Pushable Stones, Golden Levers, Crystal Plates & Energy Lifts
// =========================================================

import { PhysicsEngine } from '../physics.js';

export class MechanismManager {
  constructor(audio, particles) {
    this.audio = audio;
    this.particles = particles;

    this.pressurePlates = [];
    this.levers = [];
    this.doors = [];
    this.movingPlatforms = [];
    this.pushBoxes = [];
    this.elementalRunes = [];
    this.dualSwitches = [];
  }

  addPushBox(id, x, y, width = 36, height = 36) {
    this.pushBoxes.push({
      id,
      x, y, width, height,
      vx: 0, vy: 0,
      gravity: 1200,
      isGrounded: false,
      solid: true
    });
  }

  addPressurePlate(id, x, y, width = 36, height = 8, targetIds = [], color = '#a855f7', isLatching = false) {
    this.pressurePlates.push({
      id,
      x, y, width, height,
      targetIds,
      isLatching,
      color, // Violet, Amber, Green, etc.
      isPressed: false,
      pressProgress: 0
    });
  }

  addLever(id, x, y, width = 24, height = 28, targetIds = [], defaultState = false) {
    this.levers.push({
      id,
      x, y, width, height,
      targetIds,
      isOn: defaultState,
      angle: defaultState ? 0.6 : -0.6,
      cooldown: 0
    });
  }

  addDoor(id, x, y, width = 16, height = 64, openDirection = 'up', defaultOpen = false, color = '#fbbf24') {
    this.doors.push({
      id,
      x, y, width, height,
      closedX: x,
      closedY: y,
      openX: x + (openDirection === 'right' ? width : openDirection === 'left' ? -width : 0),
      openY: y + (openDirection === 'down' ? height : openDirection === 'up' ? -height : 0),
      currentX: defaultOpen ? (openDirection === 'right' ? x + width : x) : x,
      currentY: defaultOpen ? (openDirection === 'up' ? y - height : y) : y,
      isOpen: defaultOpen,
      openRatio: defaultOpen ? 1.0 : 0.0,
      solid: !defaultOpen,
      color
    });
  }

  addMovingPlatform(id, x, y, width = 68, height = 14, waypoints = [], speed = 65, color = '#eab308', requiresTrigger = false, triggerId = null) {
    const allWaypoints = [{ x, y }, ...waypoints];
    this.movingPlatforms.push({
      id,
      x, y, width, height,
      waypoints: allWaypoints,
      currentIndex: 0,
      targetIndex: 1 % allWaypoints.length,
      speed,
      color, // e.g. '#eab308' (yellow lift), '#a855f7' (purple lift), '#22c55e' (green lift)
      requiresTrigger,
      triggerId,
      isActive: !requiresTrigger,
      dx: 0,
      dy: 0,
      solid: true
    });
  }

  addElementalRune(id, x, y, width = 32, height = 32, requiredElement = 'ember', targetIds = []) {
    this.elementalRunes.push({
      id,
      x, y, width, height,
      requiredElement,
      targetIds,
      isActive: false,
      chargeTime: 0,
      maxCharge: 0.8
    });
  }

  addDualSwitch(id, x1, y1, x2, y2, targetIds = [], timeLimit = 2.5) {
    this.dualSwitches.push({
      id,
      s1: { x: x1, y: y1, width: 28, height: 28, isHit: false, timer: 0 },
      s2: { x: x2, y: y2, width: 28, height: 28, isHit: false, timer: 0 },
      targetIds,
      timeLimit,
      isResolved: false
    });
  }

  update(dt, players, platforms) {
    // 1. Update Push Boxes Physics (gravity & platform collision)
    for (const box of this.pushBoxes) {
      box.vy += box.gravity * dt;
      box.y += box.vy * dt;

      // Platform collision for box
      for (const plat of platforms) {
        if (PhysicsEngine.checkAABB(box, plat)) {
          if (box.vy > 0) {
            box.y = plat.y - box.height;
            box.vy = 0;
            box.isGrounded = true;
          }
        }
      }
    }

    // 2. Update Pressure Plates (Triggered by Players OR Push Boxes)
    for (const pp of this.pressurePlates) {
      let isOccupied = false;
      const plateHitbox = { x: pp.x, y: pp.y - 4, width: pp.width, height: pp.height + 4 };

      // Check players
      for (const p of players) {
        if (!p.isDead && PhysicsEngine.checkAABB(p.getHitbox(), plateHitbox)) {
          isOccupied = true;
          break;
        }
      }

      // Check push boxes
      if (!isOccupied) {
        for (const box of this.pushBoxes) {
          if (PhysicsEngine.checkAABB(box, plateHitbox)) {
            isOccupied = true;
            break;
          }
        }
      }

      if (isOccupied && !pp.isPressed) {
        pp.isPressed = true;
        if (this.audio) this.audio.playSwitch(true);
        if (this.particles) this.particles.emitSparkles(pp.x + pp.width / 2, pp.y, pp.color, 8);
        this.triggerTargets(pp.targetIds, true);
      } else if (!isOccupied && pp.isPressed && !pp.isLatching) {
        pp.isPressed = false;
        if (this.audio) this.audio.playSwitch(false);
        this.triggerTargets(pp.targetIds, false);
      }

      const targetRatio = pp.isPressed ? 1 : 0;
      pp.pressProgress += (targetRatio - pp.pressProgress) * 16 * dt;
    }

    // 3. Update Levers (Golden toggle levers)
    for (const lev of this.levers) {
      lev.cooldown = Math.max(0, lev.cooldown - dt);
      const levHitbox = { x: lev.x - 4, y: lev.y - 4, width: lev.width + 8, height: lev.height + 8 };

      for (const p of players) {
        if (p.isDead) continue;
        if (PhysicsEngine.checkAABB(p.getHitbox(), levHitbox) && lev.cooldown <= 0) {
          lev.isOn = !lev.isOn;
          lev.cooldown = 0.5;
          if (this.audio) this.audio.playSwitch(lev.isOn);
          if (this.particles) this.particles.emitSparkles(lev.x + lev.width / 2, lev.y + lev.height / 2, '#fbbf24', 8);
          this.triggerTargets(lev.targetIds, lev.isOn);
          break;
        }
      }

      // Smooth lever arm angle transition
      const targetAngle = lev.isOn ? 0.6 : -0.6;
      lev.angle += (targetAngle - lev.angle) * 12 * dt;
    }

    // 4. Update Sliding Doors
    for (const d of this.doors) {
      const targetRatio = d.isOpen ? 1.0 : 0.0;
      if (Math.abs(d.openRatio - targetRatio) > 0.01) {
        d.openRatio += (targetRatio - d.openRatio) * 6 * dt;
        d.currentX = d.closedX + (d.openX - d.closedX) * d.openRatio;
        d.currentY = d.closedY + (d.openY - d.closedY) * d.openRatio;
        d.solid = d.openRatio < 0.85;
      } else {
        d.openRatio = targetRatio;
        d.solid = !d.isOpen;
      }
    }

    // 5. Update Moving Energy Lifts
    for (const mp of this.movingPlatforms) {
      if (!mp.isActive || mp.waypoints.length < 2) {
        mp.dx = 0;
        mp.dy = 0;
        continue;
      }

      const targetWP = mp.waypoints[mp.targetIndex];
      const distX = targetWP.x - mp.x;
      const distY = targetWP.y - mp.y;
      const dist = Math.hypot(distX, distY);

      if (dist < 2) {
        mp.x = targetWP.x;
        mp.y = targetWP.y;
        mp.currentIndex = mp.targetIndex;
        mp.targetIndex = (mp.targetIndex + 1) % mp.waypoints.length;
        mp.dx = 0;
        mp.dy = 0;
      } else {
        const step = Math.min(dist, mp.speed * dt);
        const moveX = (distX / dist) * step;
        const moveY = (distY / dist) * step;
        mp.x += moveX;
        mp.y += moveY;
        mp.dx = moveX;
        mp.dy = moveY;
      }
    }
  }

  triggerTargets(targetIds, activateState) {
    if (!targetIds || targetIds.length === 0) return;

    for (const id of targetIds) {
      const door = this.doors.find(d => d.id === id);
      if (door) {
        door.isOpen = activateState;
        if (this.audio) this.audio.playDoor();
      }

      const mp = this.movingPlatforms.find(m => m.id === id);
      if (mp && mp.requiresTrigger) {
        mp.isActive = activateState;
      }
    }
  }

  render(ctx) {
    // 1. Render Pressure Plates (Golden stone base + glowing crystal button)
    for (const pp of this.pressurePlates) {
      ctx.save();
      // Stone base
      ctx.fillStyle = '#2b2318';
      ctx.strokeStyle = '#524330';
      ctx.lineWidth = 1.5;
      ctx.fillRect(pp.x - 3, pp.y + 4, pp.width + 6, pp.height);
      ctx.strokeRect(pp.x - 3, pp.y + 4, pp.width + 6, pp.height);

      // Sinking crystal button
      const sink = pp.pressProgress * 4;
      ctx.shadowColor = pp.color;
      ctx.shadowBlur = pp.isPressed ? 12 : 6;
      ctx.fillStyle = pp.color;
      ctx.beginPath();
      ctx.roundRect(pp.x, pp.y + sink, pp.width, pp.height - sink, [3, 3, 0, 0]);
      ctx.fill();
      ctx.restore();
    }

    // 2. Render Golden Levers
    for (const lev of this.levers) {
      ctx.save();
      const cx = lev.x + lev.width / 2;
      const baseCy = lev.y + lev.height - 4;

      // Stone & Brass Base
      ctx.fillStyle = '#3a2d1d';
      ctx.strokeStyle = '#c99738';
      ctx.lineWidth = 1.5;
      ctx.fillRect(lev.x, lev.y + lev.height - 8, lev.width, 8);
      ctx.strokeRect(lev.x, lev.y + lev.height - 8, lev.width, 8);

      // Tilting Gold Arm
      ctx.translate(cx, baseCy);
      ctx.rotate(lev.angle);

      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, -18);
      ctx.stroke();

      // Golden knob
      ctx.shadowColor = '#fbbf24';
      ctx.shadowBlur = 8;
      ctx.fillStyle = '#ffd166';
      ctx.beginPath();
      ctx.arc(0, -18, 5, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }

    // 3. Render Pushable Box (Silver stone + golden metal corners)
    for (const box of this.pushBoxes) {
      ctx.save();
      // Silver stone body
      const stoneGrad = ctx.createLinearGradient(box.x, box.y, box.x + box.width, box.y + box.height);
      stoneGrad.addColorStop(0, '#e2e8f0');
      stoneGrad.addColorStop(0.5, '#cbd5e1');
      stoneGrad.addColorStop(1, '#94a3b8');

      ctx.fillStyle = stoneGrad;
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 2;
      ctx.fillRect(box.x, box.y, box.width, box.height);
      ctx.strokeRect(box.x, box.y, box.width, box.height);

      // Golden Corner Brackets
      ctx.fillStyle = '#f59e0b';
      const cSize = 7;
      // Top-Left
      ctx.fillRect(box.x, box.y, cSize, 3);
      ctx.fillRect(box.x, box.y, 3, cSize);
      // Top-Right
      ctx.fillRect(box.x + box.width - cSize, box.y, cSize, 3);
      ctx.fillRect(box.x + box.width - 3, box.y, 3, cSize);
      // Bottom-Left
      ctx.fillRect(box.x, box.y + box.height - 3, cSize, 3);
      ctx.fillRect(box.x, box.y + box.height - cSize, 3, cSize);
      // Bottom-Right
      ctx.fillRect(box.x + box.width - cSize, box.y + box.height - 3, cSize, 3);
      ctx.fillRect(box.x + box.width - 3, box.y + box.height - cSize, 3, cSize);
      ctx.restore();
    }

    // 4. Render Moving Energy Lifts
    for (const mp of this.movingPlatforms) {
      ctx.save();
      ctx.shadowColor = mp.color;
      ctx.shadowBlur = 10;

      // Platform body with colored energy core
      ctx.fillStyle = '#1e293b';
      ctx.strokeStyle = mp.color;
      ctx.lineWidth = 2;
      ctx.fillRect(mp.x, mp.y, mp.width, mp.height);
      ctx.strokeRect(mp.x, mp.y, mp.width, mp.height);

      // Glowing energy stripe
      ctx.fillStyle = mp.color;
      ctx.fillRect(mp.x + 4, mp.y + 3, mp.width - 8, mp.height - 6);

      ctx.restore();
    }

    // 5. Render Sliding Wall Doors
    for (const d of this.doors) {
      ctx.save();
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 2;
      ctx.strokeRect(d.closedX, d.closedY, d.width, d.height);

      // Sliding door slab
      ctx.fillStyle = '#334155';
      ctx.fillRect(d.currentX, d.currentY, d.width, d.height);
      ctx.strokeRect(d.currentX, d.currentY, d.width, d.height);

      // Glowing energy rune line
      ctx.fillStyle = d.color || '#fbbf24';
      ctx.shadowColor = d.color || '#fbbf24';
      ctx.shadowBlur = 6;
      ctx.fillRect(d.currentX + 2, d.currentY + d.height * 0.45, d.width - 4, 6);

      ctx.restore();
    }
  }
}
