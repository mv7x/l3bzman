// =========================================================
// Ember & Tide - Level & World Graphics Renderer
// Authentic Temple Masonry, Lush Green Ivy, Themed Backgrounds & HUD
// =========================================================

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.bgDust = [];
    this.vines = [];
    this.initAtmosphericEffects();
  }

  initAtmosphericEffects() {
    for (let i = 0; i < 35; i++) {
      this.bgDust.push({
        x: Math.random() * 1600,
        y: Math.random() * 1000,
        size: 1.5 + Math.random() * 2.5,
        speed: 8 + Math.random() * 16,
        alpha: 0.2 + Math.random() * 0.5,
        color: Math.random() > 0.5 ? '#fff3b0' : '#a7f3d0'
      });
    }
  }

  updateBackground(dt) {
    for (const d of this.bgDust) {
      d.y -= d.speed * dt;
      if (d.y < 0) {
        d.y = 1000;
        d.x = Math.random() * 1600;
      }
    }
  }

  // Render authentic textured stone brick background matching level theme
  renderBackground(camera, levelWidth, levelHeight, theme = 'forest') {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    ctx.save();

    // 1. Theme Color Palettes
    let baseColor = '#1f2411';
    let brickColor1 = '#282f16';
    let brickColor2 = '#1a1f0d';
    let groutColor = '#101407';

    if (theme === 'silver') {
      baseColor = '#1e293b';
      brickColor1 = '#334155';
      brickColor2 = '#233044';
      groutColor = '#0f172a';
    } else if (theme === 'desert') {
      baseColor = '#3d2e14';
      brickColor1 = '#4a381a';
      brickColor2 = '#33240d';
      groutColor = '#1f1405';
    } else if (theme === 'forge') {
      baseColor = '#241b17';
      brickColor1 = '#33231d';
      brickColor2 = '#1f1511';
      groutColor = '#0f0907';
    } else if (theme === 'core') {
      baseColor = '#130d1e';
      brickColor1 = '#201533';
      brickColor2 = '#110b1a';
      groutColor = '#08040d';
    }

    // Base Wall
    ctx.fillStyle = baseColor;
    ctx.fillRect(0, 0, w, h);

    // 2. Parallax Ancient Stone Brick Grid
    const brickW = 64;
    const brickH = 28;
    const startX = -((camera.x * 0.3) % (brickW * 2));
    const startY = -((camera.y * 0.3) % (brickH * 2));

    ctx.lineWidth = 1.5;
    ctx.strokeStyle = groutColor;

    for (let y = startY - brickH; y < h + brickH * 2; y += brickH) {
      const rowIdx = Math.floor(y / brickH);
      const rowOffset = (rowIdx % 2 === 0) ? 0 : brickW / 2;

      for (let x = startX + rowOffset - brickW; x < w + brickW * 2; x += brickW) {
        ctx.fillStyle = ((Math.abs(rowIdx + Math.floor(x / brickW))) % 3 === 0) ? brickColor1 : brickColor2;
        ctx.fillRect(x, y, brickW, brickH);
        ctx.strokeRect(x, y, brickW, brickH);
      }
    }

    // 3. Leafy Ivy & Vines Overgrowth (for forest/ruins theme)
    if (theme === 'forest') {
      ctx.fillStyle = 'rgba(46, 117, 34, 0.45)';
      for (let x = -100; x < levelWidth + 200; x += 140) {
        const parX = x - camera.x * 0.25;
        // Hanging ivy tendrils
        ctx.beginPath();
        ctx.arc(parX, 120, 18, 0, Math.PI * 2);
        ctx.arc(parX + 10, 140, 14, 0, Math.PI * 2);
        ctx.arc(parX - 8, 160, 10, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 4. Floating ambient magical motes
    for (const d of this.bgDust) {
      ctx.fillStyle = d.color;
      ctx.globalAlpha = d.alpha;
      ctx.beginPath();
      ctx.arc(d.x - camera.x * 0.3, d.y - camera.y * 0.3, d.size, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  // Render solid stone platforms with detailed brick masonry & lush ivy tops
  renderPlatforms(platforms, theme = 'forest') {
    const ctx = this.ctx;

    for (const plat of platforms) {
      ctx.save();

      let topLedgeColor = '#4d7c0f'; // Grassy moss
      let stoneColor1 = '#473d2a';
      let stoneColor2 = '#332b1d';
      let borderColor = '#1f190e';

      if (theme === 'silver') {
        topLedgeColor = '#94a3b8';
        stoneColor1 = '#475569';
        stoneColor2 = '#334155';
        borderColor = '#1e293b';
      } else if (theme === 'desert') {
        topLedgeColor = '#d97706';
        stoneColor1 = '#785526';
        stoneColor2 = '#543b19';
        borderColor = '#2b1b08';
      } else if (theme === 'forge') {
        topLedgeColor = '#dc2626';
        stoneColor1 = '#4a2b22';
        stoneColor2 = '#2d1813';
        borderColor = '#170a07';
      }

      // Stone Block Base
      const stoneGrad = ctx.createLinearGradient(plat.x, plat.y, plat.x, plat.y + plat.height);
      stoneGrad.addColorStop(0, stoneColor1);
      stoneGrad.addColorStop(1, stoneColor2);
      ctx.fillStyle = stoneGrad;
      ctx.fillRect(plat.x, plat.y, plat.width, plat.height);

      // Brick pattern seams
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(plat.x, plat.y, plat.width, plat.height);

      const subBrickW = 32;
      for (let bx = plat.x + subBrickW; bx < plat.x + plat.width; bx += subBrickW) {
        ctx.beginPath();
        ctx.moveTo(bx, plat.y);
        ctx.lineTo(bx, plat.y + plat.height);
        ctx.stroke();
      }

      // Top Grassy Ivy/Moss Ledge
      ctx.fillStyle = topLedgeColor;
      ctx.fillRect(plat.x, plat.y, plat.width, 4);

      // Hanging ivy leaves along top edges (for Forest theme)
      if (theme === 'forest' && plat.width >= 40) {
        ctx.fillStyle = '#65a30d';
        for (let ix = plat.x + 6; ix < plat.x + plat.width - 6; ix += 14) {
          ctx.beginPath();
          ctx.arc(ix, plat.y + 4, 3, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      ctx.restore();
    }
  }

  // Render on-screen hint text matching reference image (e.g. "Use A,W,D TO MOVE WATERGIRL...")
  renderLevelHints(hints, ctx) {
    if (!hints || hints.length === 0) return;

    ctx.save();
    ctx.shadowBlur = 4;
    ctx.shadowColor = '#000000';

    for (const h of hints) {
      ctx.font = 'bold 15px Georgia, serif';
      ctx.textAlign = 'center';

      if (h.type === 'fire') {
        ctx.fillStyle = '#ff7800';
      } else if (h.type === 'water') {
        ctx.fillStyle = '#38bdf8';
      } else {
        ctx.fillStyle = '#f59e0b';
      }

      ctx.fillText(h.text, h.x, h.y);
    }
    ctx.restore();
  }

  // Render authentic Vine-Wrapped Timer Tablet & Speaker Icon
  renderHUD(levelName, timeSeconds, collectedShards, totalShards, ember, tide, isOnline = false, localRole = 'both', p1Name = 'FireBoy', p2Name = 'WaterGirl', pingMs = 0) {
    const ctx = this.ctx;
    const w = this.canvas.width;

    ctx.save();

    // 1. Center Top Wooden & Leafy Timer Tablet
    const mins = Math.floor(timeSeconds / 60);
    const secs = Math.floor(timeSeconds % 60);
    const timeFormatted = `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;

    // Wooden Sign Base
    ctx.fillStyle = '#4a3219';
    ctx.strokeStyle = '#2b1b0c';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(w / 2 - 75, 4, 150, 36, [0, 0, 16, 16]);
    ctx.fill();
    ctx.stroke();

    // Leaves curling on top of sign
    ctx.fillStyle = '#65a30d';
    ctx.beginPath();
    ctx.arc(w / 2 - 60, 8, 8, 0, Math.PI * 2);
    ctx.arc(w / 2 + 60, 8, 8, 0, Math.PI * 2);
    ctx.arc(w / 2 - 30, 4, 6, 0, Math.PI * 2);
    ctx.arc(w / 2 + 30, 4, 6, 0, Math.PI * 2);
    ctx.fill();

    // Golden Digits
    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 20px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(timeFormatted, w / 2, 23);

    // 2. Top-Right Audio Speaker Icon
    ctx.fillStyle = '#f59e0b';
    ctx.font = '20px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('🔊', w - 16, 26);

    // 3. Player Quick Status Pills
    const p1Label = `🔥 ${p1Name || 'FireBoy'} ${ember.isDead ? '💀' : '✓'}`;
    const p1IsLocal = localRole === 'ember' || localRole === 'both';
    ctx.fillStyle = ember.isDead ? 'rgba(239, 68, 68, 0.85)' : 'rgba(217, 38, 38, 0.85)';
    ctx.beginPath();
    ctx.roundRect(16, 10, 140, 32, 8);
    ctx.fill();
    if (p1IsLocal && isOnline) {
      ctx.strokeStyle = '#ffea00';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(16, 10, 140, 32);
    }
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px Tajawal, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(p1Label + (p1IsLocal && isOnline ? ' (YOU)' : ''), 86, 27);

    const p2Label = `💧 ${p2Name || 'WaterGirl'} ${tide.isDead ? '💀' : '✓'}`;
    const p2IsLocal = localRole === 'tide' || localRole === 'both';
    ctx.fillStyle = tide.isDead ? 'rgba(239, 68, 68, 0.85)' : 'rgba(2, 132, 199, 0.85)';
    ctx.beginPath();
    ctx.roundRect(164, 10, 140, 32, 8);
    ctx.fill();
    if (p2IsLocal && isOnline) {
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(164, 10, 140, 32);
    }
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px Tajawal, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(p2Label + (p2IsLocal && isOnline ? ' (YOU)' : ''), 234, 27);

    // Gems counter
    ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
    ctx.beginPath();
    ctx.roundRect(w - 180, 10, 110, 32, 8);
    ctx.fill();
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 13px Tajawal, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`💎 ${collectedShards}/${totalShards}`, w - 125, 27);

    // Online Ping Badge
    if (isOnline) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
      ctx.beginPath();
      ctx.roundRect(w / 2 - 60, this.canvas.height - 28, 120, 22, 6);
      ctx.fill();

      ctx.fillStyle = pingMs < 100 ? '#10b981' : '#f59e0b';
      ctx.font = 'bold 11px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`🟢 Online ${pingMs || 20}ms`, w / 2, this.canvas.height - 16);
    }

    ctx.restore();
  }
}
