(() => {
  const canvas = document.getElementById("ferro");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  const buffer = document.createElement("canvas");
  const bctx = buffer.getContext("2d", { willReadFrequently: true });

  const QUALITY = {
    low: { count: 12, core: 3, spine: 0, scale: 3, baseR: 44, label: "Low" },
    medium: { count: 28, core: 8, spine: 6, scale: 2, baseR: 46, label: "Medium" },
    high: { count: 56, core: 12, spine: 14, scale: 1.5, baseR: 48, label: "High" },
    ultra: { count: 110, core: 18, spine: 36, scale: 1.15, baseR: 50, label: "Ultra" },
  };

  const MAGNET_RANGE = 420;
  const GRAVITY = 0.35;
  const FLOOR_PAD = 28;
  const WALL_PAD = 28;

  const BOX_SIZES = {
    none: 0,
    small: 140,
    medium: 220,
    big: 320,
  };

  let quality = "medium";
  let pullStrength = 100;
  let boxSize = "none";
  let box = null; // { cx, cy, half }
  let width = 0;
  let height = 0;
  let homeX = 0;
  let homeY = 0;
  let anchorX = 0;
  let anchorY = 0;
  let mouseX = -9999;
  let mouseY = -9999;
  let particles = [];
  let bound = true;
  let rebinding = false;
  let pullSmoothed = 0;

  const menu = document.createElement("div");
  menu.className = "ferro-menu";
  menu.hidden = true;
  menu.innerHTML = `
    <button type="button" data-action="unbind">Unbind</button>
    <button type="button" data-action="rebind">Bring back</button>
    <div class="ferro-menu-item has-submenu" data-submenu="box">
      <button type="button" class="ferro-menu-parent">
        <span>Box</span>
        <span class="ferro-menu-arrow" aria-hidden="true">▸</span>
      </button>
      <div class="ferro-submenu" role="menu">
        <button type="button" data-box="none">Unbox</button>
        <button type="button" data-box="small">Small box</button>
        <button type="button" data-box="medium">Medium box</button>
        <button type="button" data-box="big">Big box</button>
      </div>
    </div>
    <div class="ferro-menu-sep"></div>
    <p class="ferro-menu-label">Pull <em id="ferroPullValue">100%</em></p>
    <label class="ferro-menu-slider">
      <input id="ferroPullSlider" type="range" min="0" max="500" value="100" />
    </label>
    <div class="ferro-menu-sep"></div>
    <p class="ferro-menu-label">Quality</p>
    <button type="button" data-quality="low">Low</button>
    <button type="button" data-quality="medium">Medium</button>
    <button type="button" data-quality="high">High</button>
    <button type="button" data-quality="ultra">Ultra</button>
  `;
  document.body.appendChild(menu);

  const unbindBtn = menu.querySelector('[data-action="unbind"]');
  const rebindBtn = menu.querySelector('[data-action="rebind"]');
  const qualityBtns = menu.querySelectorAll("[data-quality]");
  const boxBtns = menu.querySelectorAll("[data-box]");
  const boxSubmenuItem = menu.querySelector('[data-submenu="box"]');
  const pullSlider = menu.querySelector("#ferroPullSlider");
  const pullValue = menu.querySelector("#ferroPullValue");

  function settings() {
    return QUALITY[quality];
  }

  function blobCenter() {
    let sx = 0;
    let sy = 0;
    for (const p of particles) {
      sx += p.x;
      sy += p.y;
    }
    const n = particles.length || 1;
    return { x: sx / n, y: sy / n };
  }

  function isOverBlob(x, y) {
    const c = blobCenter();
    return Math.hypot(x - c.x, y - c.y) < settings().baseR * 1.35;
  }

  function hideMenu() {
    menu.hidden = true;
    menu.querySelectorAll(".has-submenu.is-open").forEach((el) => {
      el.classList.remove("is-open");
    });
  }

  function syncQualityButtons() {
    qualityBtns.forEach((btn) => {
      btn.classList.toggle("is-active", btn.dataset.quality === quality);
    });
  }

  function syncBoxButtons() {
    boxBtns.forEach((btn) => {
      btn.classList.toggle("is-active", btn.dataset.box === boxSize);
    });
  }

  function placeBoxAroundBlob(sizeKey) {
    boxSize = sizeKey;
    const half = BOX_SIZES[sizeKey] / 2;
    if (!half) {
      box = null;
      return;
    }
    const c = blobCenter();
    box = {
      cx: c.x,
      cy: c.y,
      half,
    };
    // Keep box on screen
    box.cx = Math.min(width - half - 8, Math.max(half + 8, box.cx));
    box.cy = Math.min(height - half - 8, Math.max(half + 8, box.cy));
  }

  function containInBox(p, spread) {
    if (!box) return;
    const minX = box.cx - box.half + p.r;
    const maxX = box.cx + box.half - p.r;
    const minY = box.cy - box.half + p.r;
    const maxY = box.cy + box.half - p.r;
    if (p.x < minX) {
      p.x = minX;
      smearOnWall(p, 1, 0, spread);
    } else if (p.x > maxX) {
      p.x = maxX;
      smearOnWall(p, -1, 0, spread);
    }
    if (p.y < minY) {
      p.y = minY;
      smearOnWall(p, 0, 1, spread);
    } else if (p.y > maxY) {
      p.y = maxY;
      smearOnWall(p, 0, -1, spread);
    }
  }

  // Wall normal points into free space. When pull fights the wall, smear sideways.
  function smearOnWall(p, nx, ny, spread) {
    if (!spread || !spread.active) {
      if (nx) p.vx *= -0.45;
      if (ny) p.vy *= -0.45;
      return;
    }
    const into = -(spread.dirX * nx + spread.dirY * ny);
    if (into < 0.12) {
      if (nx) p.vx *= -0.45;
      if (ny) p.vy *= -0.4;
      return;
    }

    const tx = -ny;
    const ty = nx;
    let side = p.hx * tx + p.hy * ty;
    if (Math.abs(side) < 0.35) {
      side = (p.x - spread.cx) * tx + (p.y - spread.cy) * ty;
    }
    if (Math.abs(side) < 0.08) side = (p.r * 10) % 2 === 0 ? 1 : -1;

    const blocked = nx ? Math.abs(p.vx) : Math.abs(p.vy);
    const force = into * spread.pull * (1.4 + Math.min(3, Math.abs(side) * 0.05)) + blocked * 0.85;
    const s = Math.sign(side);

    if (nx) p.vx = 0;
    if (ny) p.vy = 0;
    p.vx += tx * s * force;
    p.vy += ty * s * force;
    // Fan farther from the contact point along the wall.
    p.x += tx * s * into * spread.pull * 0.55;
    p.y += ty * s * into * spread.pull * 0.55;
  }

  function drawBox() {
    if (!box) return;
    const x = box.cx - box.half;
    const y = box.cy - box.half;
    const s = box.half * 2;
    ctx.save();
    ctx.strokeStyle = "rgba(18, 21, 26, 0.75)";
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 0.5, y + 0.5, s - 1, s - 1);
    ctx.fillStyle = "rgba(18, 21, 26, 0.04)";
    ctx.fillRect(x, y, s, s);
    ctx.restore();
  }

  function showMenu(x, y) {
    unbindBtn.hidden = !bound || rebinding;
    rebindBtn.hidden = bound && !rebinding;
    syncQualityButtons();
    syncBoxButtons();
    pullSlider.value = String(pullStrength);
    pullValue.textContent = `${pullStrength}%`;
    menu.hidden = false;
    const pad = 8;
    const mw = menu.offsetWidth || 160;
    const mh = menu.offsetHeight || 280;
    let left = Math.min(x, width - mw - pad);
    // Leave room for submenu on the right when possible
    if (left > width - mw - 150) left = Math.max(pad, width - mw - 150);
    menu.style.left = `${left}px`;
    menu.style.top = `${Math.min(y, height - mh - pad)}px`;
    menu.classList.toggle("submenu-left", left + mw + 140 > width);
  }

  function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    homeX = width - 72;
    homeY = height - 72;
    if (bound && !rebinding) {
      anchorX = homeX;
      anchorY = homeY;
    }
    if (!particles.length) seedParticles();
    else if (bound && !rebinding) {
      for (const p of particles) {
        p.x = anchorX + p.hx;
        p.y = anchorY + p.hy;
        p.vx = 0;
        p.vy = 0;
      }
    }
  }

  function seedParticles(keepPlace = false) {
    const cfg = settings();
    const center = keepPlace && particles.length ? blobCenter() : null;
    const ax = center ? center.x : bound && !rebinding ? homeX : anchorX || homeX;
    const ay = center ? center.y : bound && !rebinding ? homeY : anchorY || homeY;

    particles = [];
    anchorX = ax;
    anchorY = ay;

    const bodyCount = Math.max(cfg.core, cfg.count - cfg.spine);
    for (let i = 0; i < bodyCount; i++) {
      const angle = (i / bodyCount) * Math.PI * 2;
      const inCore = i < cfg.core;
      const ring = inCore
        ? (i / Math.max(1, cfg.core)) * 0.22
        : 0.28 + ((i - cfg.core) / Math.max(1, bodyCount - cfg.core)) * 0.55;
      const dist = ring * cfg.baseR * 0.75;
      const hx = Math.cos(angle) * dist;
      const hy = Math.sin(angle) * dist;
      const sizeScale = cfg.count > 80 ? 0.62 : cfg.count > 40 ? 0.78 : cfg.count < 18 ? 1.15 : 1;
      particles.push({
        hx,
        hy,
        x: ax + hx,
        y: ay + hy,
        vx: 0,
        vy: 0,
        r: (inCore ? 16 : 9 + (i % 4)) * sizeScale,
        spine: false,
        spineT: 0,
      });
    }

    for (let i = 0; i < cfg.spine; i++) {
      const t = (i + 1) / (cfg.spine + 1);
      const sizeScale = cfg.count > 80 ? 0.55 : 0.7;
      particles.push({
        hx: 0,
        hy: 0,
        x: ax,
        y: ay,
        vx: 0,
        vy: 0,
        r: (8 + (i % 3)) * sizeScale,
        spine: true,
        spineT: t,
      });
    }
  }

  function setQuality(next) {
    if (!QUALITY[next] || next === quality) {
      hideMenu();
      return;
    }
    quality = next;
    seedParticles(true);
    syncQualityButtons();
    hideMenu();
  }

  function magnetStrength(dist) {
    const baseR = settings().baseR;
    const dead = baseR * 1.15;
    if (dist >= MAGNET_RANGE || dist < dead) return 0;

    const proximity = (MAGNET_RANGE - dist) / (MAGNET_RANGE - dead);
    const u = Math.min(1, Math.max(0, proximity));
    return u * u * (0.35 + 0.65 * u);
  }

  function step() {
    const cfg = settings();
    const c = blobCenter();
    if (bound && !rebinding) {
      if (box) {
        anchorX = box.cx;
        anchorY = box.cy;
      } else {
        anchorX = homeX;
        anchorY = homeY;
      }
    }

    const dxm = mouseX - c.x;
    const dym = mouseY - c.y;
    const mouseDist = Math.hypot(dxm, dym);
    const dead = cfg.baseR * 1.15;
    const pullTarget = magnetStrength(mouseDist);
    pullSmoothed += (pullTarget - pullSmoothed) * 0.12;
    if (pullSmoothed < 0.003) pullSmoothed = 0;

    const pull = pullSmoothed * (pullStrength / 100);
    const active = pull > 0.008;
    const dirX = mouseDist > 0.001 ? dxm / mouseDist : 0;
    const dirY = mouseDist > 0.001 ? dym / mouseDist : 0;

    if (rebinding) {
      const targetX = box ? box.cx : homeX;
      const targetY = box ? box.cy : homeY;
      anchorX += (targetX - anchorX) * 0.022;
      anchorY += (targetY - anchorY) * 0.022;
      if (Math.hypot(targetX - anchorX, targetY - anchorY) < 1.2) {
        anchorX = targetX;
        anchorY = targetY;
        rebinding = false;
        bound = true;
        for (const p of particles) {
          p.vx = 0;
          p.vy = 0;
        }
      }
    }

    const fieldDepth = Math.max(0, Math.min(mouseDist, MAGNET_RANGE) - dead);
    const reach = fieldDepth * 0.7 * pull;

    for (const p of particles) {
      const restX = p.spine
        ? anchorX + (active ? dirX * reach * p.spineT * 0.15 : 0)
        : anchorX + p.hx;
      const restY = p.spine
        ? anchorY + (active ? dirY * reach * p.spineT * 0.15 : 0)
        : anchorY + p.hy;

      if (bound || rebinding) {
        const returnEase = active ? 0.02 : 0.03;
        let fx = (restX - p.x) * returnEase;
        let fy = (restY - p.y) * returnEase;

        if (active) {
          if (p.spine) {
            const targetX = c.x + dirX * reach * p.spineT;
            const targetY = c.y + dirY * reach * p.spineT;
            const follow = 0.04 + 0.06 * pull;
            fx += (targetX - p.x) * follow;
            fy += (targetY - p.y) * follow;
          } else {
            const radial = Math.hypot(p.hx, p.hy) || 1;
            const facing = (p.hx * dirX + p.hy * dirY) / radial;
            const side = Math.abs((-p.hy * dirX + p.hx * dirY) / radial);
            if (facing > 0.55 && side < 0.28) {
              const stretch = facing * (1 - side * 2.2) * pull * (3.5 + p.r * 0.06);
              fx += dirX * stretch;
              fy += dirY * stretch;
              const along = (p.x - c.x) * dirX + (p.y - c.y) * dirY;
              const axisX = c.x + dirX * along;
              const axisY = c.y + dirY * along;
              fx += (axisX - p.x) * 0.05 * pull;
              fy += (axisY - p.y) * 0.05 * pull;
            }
          }
        }

        p.vx = (p.vx + fx) * 0.93;
        p.vy = (p.vy + fy) * 0.93;
        p.vx = Math.max(-3.5, Math.min(3.5, p.vx));
        p.vy = Math.max(-3.5, Math.min(3.5, p.vy));
        p.x += p.vx;
        p.y += p.vy;

        if (!active && !rebinding) {
          const homeRestX = p.spine ? anchorX : anchorX + p.hx;
          const homeRestY = p.spine ? anchorY : anchorY + p.hy;
          p.x += (homeRestX - p.x) * 0.04;
          p.y += (homeRestY - p.y) * 0.04;
          p.vx *= 0.75;
          p.vy *= 0.75;
          if (Math.hypot(homeRestX - p.x, homeRestY - p.y) < 0.35) {
            p.x = homeRestX;
            p.y = homeRestY;
            p.vx = 0;
            p.vy = 0;
          }
        }
      } else {
        p.vy += GRAVITY * 0.5;

        if (active) {
          if (p.spine) {
            const targetX = c.x + dirX * reach * p.spineT;
            const targetY = c.y + dirY * reach * p.spineT;
            const follow = 0.035 + 0.05 * pull;
            p.vx += (targetX - p.x) * follow;
            p.vy += (targetY - p.y) * follow;
          } else {
            const radial = Math.hypot(p.hx, p.hy) || 1;
            const facing = (p.hx * dirX + p.hy * dirY) / radial;
            const side = Math.abs((-p.hy * dirX + p.hx * dirY) / radial);
            if (facing > 0.55 && side < 0.28) {
              const stretch = facing * (1 - side * 2.2) * pull * 4;
              p.vx += dirX * stretch;
              p.vy += dirY * stretch;
              const along = (p.x - c.x) * dirX + (p.y - c.y) * dirY;
              const axisX = c.x + dirX * along;
              const axisY = c.y + dirY * along;
              p.vx += (axisX - p.x) * 0.04 * pull;
              p.vy += (axisY - p.y) * 0.04 * pull;
            }
          }
        }

        p.vx += (c.x + (p.spine ? 0 : p.hx * 0.35) - p.x) * (active ? 0.006 : 0.01);
        p.vy += (c.y + (p.spine ? 0 : p.hy * 0.35) - p.y) * (active ? 0.006 : 0.01);

        p.vx *= 0.99;
        p.vy *= 0.99;
        p.vx = Math.max(-8, Math.min(8, p.vx));
        p.vy = Math.max(-10, Math.min(10, p.vy));
        p.x += p.vx;
        p.y += p.vy;

        const floor = height - FLOOR_PAD;
        const left = WALL_PAD;
        const right = width - WALL_PAD;
        const wallSpread = { active, pull, dirX, dirY, cx: c.x, cy: c.y };
        if (p.y > floor - p.r) {
          p.y = floor - p.r;
          smearOnWall(p, 0, -1, wallSpread);
          if (!active) p.vx *= 0.9;
        }
        if (p.x < left + p.r) {
          p.x = left + p.r;
          smearOnWall(p, 1, 0, wallSpread);
        }
        if (p.x > right - p.r) {
          p.x = right - p.r;
          smearOnWall(p, -1, 0, wallSpread);
        }
        if (p.y < WALL_PAD + p.r) {
          p.y = WALL_PAD + p.r;
          smearOnWall(p, 0, 1, wallSpread);
        }
      }
    }

    if (active) {
      const spines = particles.filter((p) => p.spine).sort((a, b) => a.spineT - b.spineT);
      for (let i = 0; i < spines.length - 1; i++) {
        const a = spines[i];
        const b = spines[i + 1];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const d = Math.hypot(dx, dy) || 1;
        const ideal = (a.r + b.r) * 0.92;
        const pullIn = ((d - ideal) / d) * 0.22;
        a.x += dx * pullIn;
        a.y += dy * pullIn;
        b.x -= dx * pullIn;
        b.y -= dy * pullIn;
      }
      if (spines.length) {
        const tip = spines[0];
        const bodyHit = c.x + dirX * cfg.baseR * 0.55;
        const bodyHitY = c.y + dirY * cfg.baseR * 0.55;
        tip.x += (bodyHit - tip.x) * 0.15;
        tip.y += (bodyHitY - tip.y) * 0.15;
      }
    }

    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const a = particles[i];
        const b = particles[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const d = Math.hypot(dx, dy) || 1;
        const min = (a.r + b.r) * (active ? 0.42 : 0.55);
        if (d < min) {
          const push = ((min - d) / d) * (active ? 0.035 : 0.05);
          a.x -= dx * push;
          a.y -= dy * push;
          b.x += dx * push;
          b.y += dy * push;
        }
      }
    }

    const wallSpread = { active, pull, dirX, dirY, cx: c.x, cy: c.y };
    for (const p of particles) {
      containInBox(p, wallSpread);
    }

    // Extra flatten pass: if the whole blob is pressed into a barrier, fan it out.
    if (active && pull > 0.15) {
      smearBlobAgainstBarriers(c, pull, dirX, dirY);
      for (const p of particles) {
        containInBox(p, wallSpread);
      }
    }

    if (!bound && !rebinding) {
      const next = blobCenter();
      anchorX = next.x;
      anchorY = next.y;
    }
  }

  function smearBlobAgainstBarriers(c, pull, dirX, dirY) {
    let nx = 0;
    let ny = 0;
    if (box) {
      const edge = box.half - settings().baseR * 0.35;
      if (c.x <= box.cx - edge && dirX < -0.2) nx = 1;
      else if (c.x >= box.cx + edge && dirX > 0.2) nx = -1;
      if (c.y <= box.cy - edge && dirY < -0.2) ny = 1;
      else if (c.y >= box.cy + edge && dirY > 0.2) ny = -1;
    } else if (!bound) {
      if (c.x < WALL_PAD + settings().baseR * 1.1 && dirX < -0.2) nx = 1;
      else if (c.x > width - WALL_PAD - settings().baseR * 1.1 && dirX > 0.2) nx = -1;
      if (c.y < WALL_PAD + settings().baseR * 1.1 && dirY < -0.2) ny = 1;
      else if (c.y > height - FLOOR_PAD - settings().baseR * 1.1 && dirY > 0.2) ny = -1;
    } else {
      return;
    }
    if (!nx && !ny) return;

    // Prefer the dominant wall normal for tangent.
    const useNx = Math.abs(nx) >= Math.abs(ny) ? nx : 0;
    const useNy = useNx ? 0 : ny;
    const txx = -useNy;
    const tyy = useNx;

    for (const p of particles) {
      let side = p.hx * txx + p.hy * tyy;
      if (Math.abs(side) < 0.4) side = (p.x - c.x) * txx + (p.y - c.y) * tyy;
      if (Math.abs(side) < 0.1) side = p.r > 10 ? 1 : -1;
      const s = Math.sign(side);
      const fan = pull * (0.7 + Math.min(2.8, Math.abs(side) * 0.06));
      p.vx += txx * s * fan;
      p.vy += tyy * s * fan;
      p.x += txx * s * fan * 0.35;
      p.y += tyy * s * fan * 0.35;
    }
  }

  function renderMetaball() {
    const cfg = settings();
    const scale = cfg.scale;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const p of particles) {
      minX = Math.min(minX, p.x - p.r * 2.2);
      minY = Math.min(minY, p.y - p.r * 2.2);
      maxX = Math.max(maxX, p.x + p.r * 2.2);
      maxY = Math.max(maxY, p.y + p.r * 2.2);
    }

    minX = Math.max(0, Math.floor(minX));
    minY = Math.max(0, Math.floor(minY));
    maxX = Math.min(width, Math.ceil(maxX));
    maxY = Math.min(height, Math.ceil(maxY));

    const bw = Math.max(1, Math.ceil((maxX - minX) / scale));
    const bh = Math.max(1, Math.ceil((maxY - minY) / scale));
    buffer.width = bw;
    buffer.height = bh;
    bctx.clearRect(0, 0, bw, bh);

    for (const p of particles) {
      const x = (p.x - minX) / scale;
      const y = (p.y - minY) / scale;
      const r = (p.r * 1.65) / scale;
      const g = bctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, "rgba(0,0,0,1)");
      g.addColorStop(0.55, "rgba(0,0,0,0.55)");
      g.addColorStop(1, "rgba(0,0,0,0)");
      bctx.fillStyle = g;
      bctx.beginPath();
      bctx.arc(x, y, r, 0, Math.PI * 2);
      bctx.fill();
    }

    const img = bctx.getImageData(0, 0, bw, bh);
    const data = img.data;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] > 85) {
        data[i] = 0;
        data[i + 1] = 0;
        data[i + 2] = 0;
        data[i + 3] = 255;
      } else {
        data[i + 3] = 0;
      }
    }
    bctx.putImageData(img, 0, 0);

    ctx.clearRect(0, 0, width, height);
    drawBox();
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(buffer, minX, minY, maxX - minX, maxY - minY);
  }

  function frame() {
    step();
    renderMetaball();
    requestAnimationFrame(frame);
  }

  unbindBtn.addEventListener("click", () => {
    bound = false;
    rebinding = false;
    hideMenu();
  });

  rebindBtn.addEventListener("click", () => {
    const c = blobCenter();
    anchorX = c.x;
    anchorY = c.y;
    rebinding = true;
    bound = false;
    hideMenu();
  });

  qualityBtns.forEach((btn) => {
    btn.addEventListener("click", () => setQuality(btn.dataset.quality));
  });

  boxBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      placeBoxAroundBlob(btn.dataset.box);
      syncBoxButtons();
      hideMenu();
    });
  });

  boxSubmenuItem.addEventListener("pointerenter", () => {
    boxSubmenuItem.classList.add("is-open");
  });

  boxSubmenuItem.addEventListener("pointerleave", () => {
    boxSubmenuItem.classList.remove("is-open");
  });

  pullSlider.addEventListener("input", () => {
    pullStrength = Number(pullSlider.value);
    pullValue.textContent = `${pullStrength}%`;
  });

  pullSlider.addEventListener("pointerdown", (event) => {
    event.stopPropagation();
  });

  window.addEventListener("contextmenu", (event) => {
    if (!isOverBlob(event.clientX, event.clientY)) return;
    event.preventDefault();
    showMenu(event.clientX, event.clientY);
  });

  window.addEventListener("pointerdown", (event) => {
    if (!menu.hidden && !menu.contains(event.target)) hideMenu();
  });

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") hideMenu();
  });

  window.addEventListener("pointermove", (event) => {
    mouseX = event.clientX;
    mouseY = event.clientY;
  });

  window.addEventListener("pointerleave", () => {
    mouseX = -9999;
    mouseY = -9999;
  });

  window.addEventListener("resize", resize);
  resize();
  requestAnimationFrame(frame);
})();
