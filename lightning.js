(() => {
  const panel = document.getElementById("panel-lightning");
  const stage = document.getElementById("lightningStage");
  const brushSizeInput = document.getElementById("lightningBrushSize");
  const brushSizeValue = document.getElementById("lightningBrushSizeValue");
  const paintBtn = document.getElementById("lightningPaintBtn");
  const grassBtn = document.getElementById("lightningGrassBtn");
  const eraseBtn = document.getElementById("lightningEraseBtn");
  const strikeBtn = document.getElementById("lightningStrikeBtn");
  const clearBtn = document.getElementById("lightningClearBtn");
  const colorInput = document.getElementById("lightningColor");
  const hint = document.getElementById("lightningHint");
  const limbsInput = document.getElementById("lightningLimbs");
  const limbsValue = document.getElementById("lightningLimbsValue");
  const branchesInput = document.getElementById("lightningBranches");
  const branchesValue = document.getElementById("lightningBranchesValue");
  const branchLimbsInput = document.getElementById("lightningBranchLimbs");
  const branchLimbsValue = document.getElementById("lightningBranchLimbsValue");

  if (!panel || !stage) return;

  const ctx = stage.getContext("2d");
  const ground = document.createElement("canvas");
  const gctx = ground.getContext("2d", { willReadFrequently: true });

  const SKY_TOP = 0.18;
  const SIDE_WALL = 28;
  const INCH_PX = 96;
  const LIMB_DELAY_MS = 10;
  const BOLT_HOLD_MS = 380;
  const FLASH_MS = 280;
  const FIRE_STEP_MS = 45;
  const FIRE_RESTART_MS = 400;
  const GROUND_COLOR = "#000000";
  const GRASS_COLOR = "#2f9e44";

  let width = 0;
  let height = 0;
  let brushSize = 14;
  let limbsPerInch = 6;
  let branchesOut = 3;
  let branchLimbs = 4;
  let boltColor = "#3d6cff";
  let mode = "paint"; // paint | grass | erase | strike
  let painting = false;
  let lastX = 0;
  let lastY = 0;
  let bolt = null;
  let fires = [];
  let raf = 0;

  function syncToolButtons() {
    paintBtn?.classList.toggle("is-active", mode === "paint");
    grassBtn?.classList.toggle("is-active", mode === "grass");
    eraseBtn?.classList.toggle("is-active", mode === "erase");
    strikeBtn?.classList.toggle("is-active", mode === "strike");
    stage.style.cursor = mode === "strike" ? "cell" : "crosshair";
  }

  function termLog(lines) {
    if (typeof window.archiveTermLog === "function") {
      window.archiveTermLog("lightning", lines);
    }
  }

  function termPatch(key, value, extra) {
    const v = typeof value === "string" ? `"${String(value).replace(/"/g, '\\"')}"` : String(value);
    termLog([
      `> patch fx.${key} = ${v}`,
      `  rebake plasma field...`,
      `  ok  // ${extra || "lightning hot-reload"}`,
    ]);
  }

  function setMode(next) {
    mode = next;
    syncToolButtons();
    termPatch("tool", next, "input bind");
    if (!hint) return;
    if (mode === "strike") {
      hint.textContent = "Click to strike. Limbs trickle in; grass burns after impact.";
    } else if (mode === "erase") {
      hint.textContent = "Erase ground and grass.";
    } else if (mode === "grass") {
      hint.textContent = "Paint grass. Lightning can ignite it into a fire trickle.";
    } else {
      hint.textContent = "Paint black ground. Use Grass for burnable cover.";
    }
  }

  function bindSlider(input, valueEl, apply, min, max, key, extra) {
    if (!input) return;
    let ready = false;
    const sync = () => {
      const n = Math.max(min, Math.min(max, Number(input.value) || min));
      input.value = String(n);
      if (valueEl) valueEl.textContent = String(n);
      apply(n);
      if (ready && key) termPatch(key, n, extra);
    };
    input.addEventListener("input", sync);
    sync();
    ready = true;
  }

  function hexToRgb(hex) {
    const h = hex.replace("#", "");
    const n = h.length === 3
      ? h.split("").map((c) => c + c).join("")
      : h;
    return {
      r: parseInt(n.slice(0, 2), 16),
      g: parseInt(n.slice(2, 4), 16),
      b: parseInt(n.slice(4, 6), 16),
    };
  }

  function resize() {
    const wrap = stage.parentElement;
    if (!wrap) return;

    const rect = wrap.getBoundingClientRect();
    const w = Math.max(1, Math.floor(rect.width));
    const h = Math.max(1, Math.floor(rect.height));
    if (w < 2 || h < 2) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const prevW = width;
    const prevH = height;

    width = w;
    height = h;
    stage.width = Math.floor(w * dpr);
    stage.height = Math.floor(h * dpr);
    stage.style.width = "100%";
    stage.style.height = "100%";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const prev = document.createElement("canvas");
    const hadGround = ground.width > 0 && ground.height > 0;
    if (hadGround) {
      prev.width = ground.width;
      prev.height = ground.height;
      prev.getContext("2d").drawImage(ground, 0, 0);
    }

    ground.width = w;
    ground.height = h;
    gctx.setTransform(1, 0, 0, 1, 0, 0);
    gctx.clearRect(0, 0, w, h);

    if (hadGround && prevW > 0 && prevH > 0) {
      gctx.drawImage(prev, 0, 0, w, h);
    }

    paint();
  }

  function setBrushSize(n) {
    brushSize = Math.max(1, Math.min(80, Number(n) || 1));
    if (brushSizeInput) brushSizeInput.value = String(brushSize);
    if (brushSizeValue) brushSizeValue.textContent = String(brushSize);
  }

  function pointerPos(event) {
    const rect = stage.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * width,
      y: ((event.clientY - rect.top) / rect.height) * height,
    };
  }

  function brushStyle() {
    if (mode === "erase") return null;
    return mode === "grass" ? GRASS_COLOR : GROUND_COLOR;
  }

  function strokeGround(x0, y0, x1, y1) {
    gctx.save();
    gctx.lineCap = "round";
    gctx.lineJoin = "round";
    gctx.lineWidth = brushSize;
    if (mode === "erase") {
      gctx.globalCompositeOperation = "destination-out";
      gctx.strokeStyle = "rgba(0,0,0,1)";
    } else {
      gctx.globalCompositeOperation = "source-over";
      gctx.strokeStyle = brushStyle();
    }
    gctx.beginPath();
    gctx.moveTo(x0, y0);
    gctx.lineTo(x1, y1);
    gctx.stroke();
    gctx.restore();
  }

  function stampGround(x, y) {
    gctx.save();
    if (mode === "erase") {
      gctx.globalCompositeOperation = "destination-out";
      gctx.fillStyle = "rgba(0,0,0,1)";
    } else {
      gctx.globalCompositeOperation = "source-over";
      gctx.fillStyle = brushStyle();
    }
    gctx.beginPath();
    gctx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
    gctx.fill();
    gctx.restore();
  }

  function pixelIndex(x, y, w) {
    return (y * w + x) * 4;
  }

  function isPainted(data, x, y, w) {
    if (x < 0 || y < 0 || x >= w || y >= height) return false;
    return data[pixelIndex(x, y, w) + 3] > 40;
  }

  function isGrassAt(data, x, y, w) {
    if (!isPainted(data, x, y, w)) return false;
    const i = pixelIndex(x, y, w);
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    return g > r + 18 && g > b + 18 && g > 70;
  }

  function isValidStrikePixel(x, y, data, w) {
    if (x < SIDE_WALL || x >= width - SIDE_WALL) return false;
    if (y < height * SKY_TOP) return false;
    return isPainted(data, x, y, w);
  }

  function findClosestGround(fromX, fromY) {
    const img = gctx.getImageData(0, 0, width, height);
    const data = img.data;
    const w = width;
    let bestX = -1;
    let bestY = -1;
    let bestD = Infinity;

    const step = Math.max(2, Math.floor(brushSize / 3));
    for (let y = Math.floor(height * SKY_TOP); y < height; y += step) {
      for (let x = SIDE_WALL; x < width - SIDE_WALL; x += step) {
        if (!isValidStrikePixel(x, y, data, w)) continue;
        const d = (x - fromX) * (x - fromX) + (y - fromY) * (y - fromY);
        if (d < bestD) {
          bestD = d;
          bestX = x;
          bestY = y;
        }
      }
    }

    if (bestX < 0) return null;

    const x0 = Math.max(SIDE_WALL, bestX - step * 2);
    const x1 = Math.min(width - SIDE_WALL - 1, bestX + step * 2);
    const y0 = Math.max(Math.floor(height * SKY_TOP), bestY - step * 2);
    const y1 = Math.min(height - 1, bestY + step * 2);
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        if (!isValidStrikePixel(x, y, data, w)) continue;
        const d = (x - fromX) * (x - fromX) + (y - fromY) * (y - fromY);
        if (d < bestD) {
          bestD = d;
          bestX = x;
          bestY = y;
        }
      }
    }

    return {
      x: bestX,
      y: bestY,
      grass: isGrassAt(data, bestX, bestY, w),
    };
  }

  function rand(a, b) {
    return a + Math.random() * (b - a);
  }

  function clampAngleDelta(from, to, maxDelta) {
    let d = to - from;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    return from + Math.max(-maxDelta, Math.min(maxDelta, d));
  }

  function distPointSeg(px, py, ax, ay, bx, by) {
    const abx = bx - ax;
    const aby = by - ay;
    const len2 = abx * abx + aby * aby || 1;
    let t = ((px - ax) * abx + (py - ay) * aby) / len2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(px - (ax + abx * t), py - (ay + aby * t));
  }

  function branchHitsOccupied(branch, occupied, minDist) {
    if (branch.length < 2) return true;
    for (let i = 1; i < branch.length; i++) {
      const a = branch[i - 1];
      const b = branch[i];
      const mx = (a.x + b.x) * 0.5;
      const my = (a.y + b.y) * 0.5;
      const checkPts =
        i === 1
          ? [{ x: b.x, y: b.y }, { x: mx * 0.35 + b.x * 0.65, y: my * 0.35 + b.y * 0.65 }]
          : [{ x: a.x, y: a.y }, { x: mx, y: my }, { x: b.x, y: b.y }];
      for (const other of occupied) {
        for (const p of checkPts) {
          for (let j = 0; j < other.length - 1; j++) {
            if (distPointSeg(p.x, p.y, other[j].x, other[j].y, other[j + 1].x, other[j + 1].y) < minDist) {
              return true;
            }
          }
        }
      }
    }
    return false;
  }

  function clampToStage(x, y) {
    return {
      x: Math.max(2, Math.min(width - 2, x)),
      y: Math.max(2, Math.min(height - 2, y)),
    };
  }

  const TURN45 = Math.PI / 4;

  function buildLimbPath(x0, y0, x1, y1, segments, sway) {
    const segs = Math.max(1, segments);
    if (segs === 1) return [{ x: x0, y: y0 }, { x: x1, y: y1 }];

    const pts = [{ x: x0, y: y0 }];
    let x = x0;
    let y = y0;
    let angle = Math.atan2(y1 - y0, x1 - x0) + rand(-TURN45, TURN45);

    for (let i = 1; i < segs; i++) {
      const t = i / segs;
      const remain = Math.max(1, segs - i);
      const pull = 0.12 + 0.88 * Math.pow(t, 1.05);
      const toEnd = Math.atan2(y1 - y, x1 - x);
      const desired = Math.atan2(
        Math.sin(angle) * (1 - pull) + Math.sin(toEnd) * pull,
        Math.cos(angle) * (1 - pull) + Math.cos(toEnd) * pull
      );
      angle = clampAngleDelta(angle, desired + rand(-0.2, 0.2), TURN45);

      const step = (Math.hypot(x1 - x0, y1 - y0) / segs) * rand(0.6, 1.35) + sway * 0.06;
      x += Math.cos(angle) * step;
      y += Math.sin(angle) * step;

      const leash = sway * (1.35 - t) + 16;
      const alongX = x0 + (x1 - x0) * t;
      const alongY = y0 + (y1 - y0) * t;
      const odx = x - alongX;
      const ody = y - alongY;
      const od = Math.hypot(odx, ody);
      if (od > leash) {
        x = alongX + (odx / od) * leash;
        y = alongY + (ody / od) * leash;
        if (pts.length) {
          const prev = pts[pts.length - 1];
          angle = Math.atan2(y - prev.y, x - prev.x);
        }
      }
      if (remain <= 2) {
        const snap = Math.atan2(y1 - y, x1 - x);
        angle = clampAngleDelta(angle, snap, TURN45);
        const left = Math.hypot(x1 - x, y1 - y);
        x += Math.cos(angle) * ((left / remain) * 0.55);
        y += Math.sin(angle) * ((left / remain) * 0.55);
      }
      const c = clampToStage(x, y);
      x = c.x;
      y = c.y;
      pts.push({ x, y });
    }
    pts.push({ x: x1, y: y1 });
    return pts;
  }

  function buildBranchPath(ox, oy, parentAngle, limbs, stepLen, occupied, minClear) {
    const maxTries = 40;
    for (let attempt = 0; attempt < maxTries; attempt++) {
      const pts = [{ x: ox, y: oy }];
      let x = ox;
      let y = oy;
      const side = attempt % 2 === 0 ? 1 : -1;
      let angle = parentAngle + side * rand(0.2, TURN45);
      if (attempt > 8) angle = parentAngle + rand(-TURN45, TURN45);

      let ok = true;
      for (let i = 0; i < limbs; i++) {
        if (i > 0) angle += rand(-TURN45, TURN45);
        const len = stepLen * rand(0.75, 1.3);
        let nx = x + Math.cos(angle) * len;
        let ny = y + Math.sin(angle) * len;
        const c = clampToStage(nx, ny);
        if (Math.hypot(c.x - x, c.y - y) < len * 0.25) {
          ok = false;
          break;
        }
        nx = c.x;
        ny = c.y;
        angle = Math.atan2(ny - y, nx - x);
        pts.push({ x: nx, y: ny });
        x = nx;
        y = ny;
      }

      if (!ok || pts.length < 2) continue;
      if (!branchHitsOccupied(pts, occupied, minClear)) return pts;
    }
    return null;
  }

  function buildBolt(x0, y0, x1, y1) {
    const dist = Math.hypot(x1 - x0, y1 - y0) || 1;
    const inches = Math.max(0.25, dist / INCH_PX);
    const mainLimbs = Math.max(
      branchesOut > 0 ? Math.max(3, branchesOut + 1) : 1,
      Math.round(inches * Math.max(1, limbsPerInch))
    );
    const sway = Math.min(70, 14 + inches * 7);

    const main = buildLimbPath(x0, y0, x1, y1, mainLimbs, sway);
    const paths = [main];
    const occupied = [main];
    const forkAt = []; // branch path index → main joint index

    if (branchesOut > 0 && branchLimbs > 0 && main.length >= 2) {
      const minClear = 7;
      const stepLen = Math.max(18, (dist / Math.max(4, mainLimbs)) * 1.35);
      const usedIdx = new Set();

      for (let b = 0; b < branchesOut; b++) {
        let idx;
        if (main.length <= 2) {
          idx = 0;
        } else {
          const t = (b + 1) / (branchesOut + 1);
          idx = Math.max(1, Math.min(main.length - 2, Math.round(t * (main.length - 1))));
          let guard = 0;
          while (usedIdx.has(idx) && guard < main.length) {
            idx = 1 + (idx % (main.length - 2));
            guard += 1;
          }
        }
        usedIdx.add(idx);

        const origin = main[idx];
        const prev = main[Math.max(0, idx - 1)];
        const next = main[Math.min(main.length - 1, idx + 1)];
        const parentAngle = Math.atan2(next.y - prev.y, next.x - prev.x);
        const branch = buildBranchPath(
          origin.x,
          origin.y,
          parentAngle,
          Math.max(1, branchLimbs),
          stepLen,
          occupied,
          minClear
        );
        if (!branch) continue;
        forkAt.push(idx);
        paths.push(branch);
        occupied.push(branch);
      }
    }

    return { paths, forkAt };
  }

  // Ordered limb segments for the 0.05s trickle reveal.
  function buildSegmentQueue(paths, forkAt) {
    const segs = [];
    const main = paths[0];
    for (let i = 1; i < main.length; i++) {
      segs.push({
        a: main[i - 1],
        b: main[i],
        index: segs.length,
        isMain: true,
      });
    }

    // Branches start trickling after their fork limb on the main bolt appears.
    for (let p = 1; p < paths.length; p++) {
      const path = paths[p];
      const forkJoint = forkAt[p - 1] ?? 1;
      const startIndex = Math.max(0, forkJoint); // after this many main limbs
      for (let i = 1; i < path.length; i++) {
        segs.push({
          a: path[i - 1],
          b: path[i],
          index: startIndex + (i - 1),
          isMain: false,
          // keep stable secondary order for same-time ties
          tie: p * 100 + i,
        });
      }
    }

    // Normalize indices into a sequential trickle order (by index, then tie)
    segs.sort((a, b) => a.index - b.index || (a.tie || 0) - (b.tie || 0));
    segs.forEach((s, i) => {
      s.order = i;
    });
    return segs;
  }

  function eraseDisk(x, y, r) {
    gctx.save();
    gctx.globalCompositeOperation = "destination-out";
    gctx.beginPath();
    gctx.arc(x, y, r, 0, Math.PI * 2);
    gctx.fill();
    gctx.restore();
  }

  function startFireAt(x, y) {
    const ix = Math.round(x);
    const iy = Math.round(y);
    const key = `${ix},${iy}`;
    for (const f of fires) {
      if (f.seen?.has(key) && (f.alive || f.dormant)) return;
    }
    fires.push({
      born: performance.now(),
      lastStep: performance.now(),
      lastRestartCheck: performance.now(),
      tips: [{ x: ix, y: iy }],
      trail: [{ x: ix, y: iy }],
      seen: new Set([key]),
      alive: true,
      dormant: false,
    });
  }

  function grassNear(data, x, y, w, radius = 4) {
    const ix = Math.round(x);
    const iy = Math.round(y);
    for (let oy = -radius; oy <= radius; oy++) {
      for (let ox = -radius; ox <= radius; ox++) {
        if (isGrassAt(data, ix + ox, iy + oy, w)) {
          return { x: ix + ox, y: iy + oy };
        }
      }
    }
    return null;
  }

  function tryIgniteFromBoltPoint(x, y) {
    const img = gctx.getImageData(0, 0, width, height);
    const hit = grassNear(img.data, x, y, width, 5);
    if (hit) startFireAt(hit.x, hit.y);
  }

  function findGrassSpreadOptions(tip, data, w, fire) {
    const dirs = [
      [1, 0], [-1, 0], [0, 1], [0, -1],
      [1, 1], [1, -1], [-1, 1], [-1, -1],
    ];
    const options = [];
    for (const [dx, dy] of dirs) {
      const nx = tip.x + dx * 3;
      const ny = tip.y + dy * 3;
      const key = `${nx},${ny}`;
      if (fire.seen.has(key)) continue;
      if (nx < 1 || ny < 1 || nx >= width - 1 || ny >= height - 1) continue;
      let grass = false;
      for (let oy = -2; oy <= 2 && !grass; oy++) {
        for (let ox = -2; ox <= 2; ox++) {
          if (isGrassAt(data, nx + ox, ny + oy, w)) {
            grass = true;
            break;
          }
        }
      }
      if (!grass) continue;
      options.push({ x: nx, y: ny, key });
    }
    return options;
  }

  function stepFires(now) {
    if (!fires.length) return;
    const img = gctx.getImageData(0, 0, width, height);
    const data = img.data;
    const w = width;

    for (const fire of fires) {
      // Dormant fires: every 0.4s, 1/3 chance to start up again
      if (fire.dormant) {
        if (now - fire.lastRestartCheck < FIRE_RESTART_MS) continue;
        fire.lastRestartCheck = now;
        if (Math.random() > 1 / 3) continue;

        const sparks = [];
        const seeds = fire.trail.slice(-24);
        for (const seed of seeds) {
          const nearby = grassNear(data, seed.x, seed.y, w, 6);
          if (!nearby) continue;
          const options = findGrassSpreadOptions(nearby, data, w, fire);
          if (!options.length) {
            // Still grass under the ember — pop tip back there
            sparks.push({ x: nearby.x, y: nearby.y });
            continue;
          }
          const pick = options[Math.floor(Math.random() * options.length)];
          fire.seen.add(pick.key);
          sparks.push({ x: pick.x, y: pick.y });
          fire.trail.push({ x: pick.x, y: pick.y });
        }
        if (!sparks.length) {
          fire.restartFails = (fire.restartFails || 0) + 1;
          if (fire.restartFails >= 10) fire.dormant = false; // give up
          continue;
        }
        fire.restartFails = 0;
        fire.tips = sparks;
        fire.alive = true;
        fire.dormant = false;
        fire.lastStep = now;
        continue;
      }

      if (!fire.alive) continue;
      if (now - fire.lastStep < FIRE_STEP_MS) continue;
      fire.lastStep = now;

      const nextTips = [];
      for (const tip of fire.tips) {
        eraseDisk(tip.x, tip.y, 3.5);

        const options = findGrassSpreadOptions(tip, data, w, fire);
        if (!options.length) continue;
        const picks = options.sort(() => Math.random() - 0.5).slice(0, Math.min(2, options.length));
        for (const p of picks) {
          fire.seen.add(p.key);
          fire.trail.push({ x: p.x, y: p.y });
          nextTips.push({ x: p.x, y: p.y });
          eraseDisk(p.x, p.y, 2.2);
        }
      }

      fire.tips = nextTips;
      if (!fire.tips.length) {
        // Burned out — wait for possible restart
        fire.alive = false;
        fire.dormant = true;
        fire.lastRestartCheck = now;
      }
      if (fire.trail.length > 240) fire.trail.splice(0, fire.trail.length - 240);
    }

    fires = fires.filter((f) => {
      if (f.alive || f.dormant) return true;
      return now - f.born < 1200;
    });
  }

  function strikeAt(x, y) {
    const target = findClosestGround(x, y);
    if (!target) {
      if (hint) hint.textContent = "Paint some ground or grass first.";
      termLog([
        `> strike @ (${Math.round(x)},${Math.round(y)})`,
        `  ERR  no target surface`,
      ]);
      return;
    }
    const built = buildBolt(x, y, target.x, target.y);
    const segments = buildSegmentQueue(built.paths, built.forkAt);
    const now = performance.now();
    bolt = {
      segments,
      born: now,
      color: boltColor,
      hit: target,
      ignitedOrders: new Set(),
      totalLimbs: segments.length,
    };
    termLog([
      `> strike.dispatch(${Math.round(x)}, ${Math.round(y)})`,
      `  target=(${target.x},${target.y}) grass=${target.grass ? 1 : 0}`,
      `  limbs=${segments.length} color=${boltColor}`,
      `  ok  // bolt queued`,
    ]);
    ensureLoop();
  }

  function drawSegment(a, b, rgb, widthMain, alpha) {
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.lineWidth = widthMain;
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},${alpha})`;
    ctx.stroke();
  }

  function paint() {
    const now = performance.now();
    stepFires(now);

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(ground, 0, 0);

    // Rainbow flash through every hue on strike
    if (bolt) {
      const age = now - bolt.born;
      if (age < FLASH_MS) {
        const hue = (age / FLASH_MS) * 360;
        ctx.fillStyle = `hsla(${hue}, 100%, 55%, ${0.55 * (1 - age / FLASH_MS)})`;
        ctx.fillRect(0, 0, width, height);
      }
    }

    // Fire tips only — no connected trail lines
    for (const fire of fires) {
      if (!fire.tips.length && !fire.trail.length) continue;
      ctx.save();
      ctx.shadowColor = "rgba(255, 120, 20, 0.85)";
      ctx.shadowBlur = 10;
      const drawFlame = (tip, size) => {
        const g = ctx.createRadialGradient(tip.x, tip.y, 0, tip.x, tip.y, size);
        g.addColorStop(0, "rgba(255,255,200,0.95)");
        g.addColorStop(0.4, "rgba(255,140,30,0.8)");
        g.addColorStop(1, "rgba(255,60,0,0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(tip.x, tip.y, size, 0, Math.PI * 2);
        ctx.fill();
      };
      // Recent burned spots as separate embers (not linked)
      const embers = fire.trail.slice(-18);
      for (const e of embers) {
        drawFlame(e, 4.5);
      }
      for (const tip of fire.tips) {
        drawFlame(tip, 9);
      }
      ctx.restore();
    }

    if (bolt) {
      const age = now - bolt.born;
      const visibleCount = Math.floor(age / LIMB_DELAY_MS);
      const fadeStart = bolt.totalLimbs * LIMB_DELAY_MS + BOLT_HOLD_MS;
      let fade = 1;
      if (age > fadeStart) {
        fade = Math.max(0, 1 - (age - fadeStart) / 280);
      }
      if (fade <= 0) {
        bolt = null;
      } else {
        // Ignite grass wherever a limb (main or branch) just landed
        for (const seg of bolt.segments) {
          if (seg.order >= visibleCount) break;
          if (bolt.ignitedOrders.has(seg.order)) continue;
          bolt.ignitedOrders.add(seg.order);
          tryIgniteFromBoltPoint(seg.b.x, seg.b.y);
        }

        const rgb = hexToRgb(bolt.color);
        ctx.save();
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.shadowColor = `rgba(${rgb.r},${rgb.g},${rgb.b},0.8)`;
        ctx.shadowBlur = 12 * fade;

        for (const seg of bolt.segments) {
          if (seg.order >= visibleCount) break;
          const isMain = seg.isMain;
          drawSegment(seg.a, seg.b, rgb, (isMain ? 3.4 : 2) * fade + 0.6, 0.45 * fade);
          ctx.shadowBlur = 5 * fade;
          drawSegment(seg.a, seg.b, rgb, isMain ? 1.35 : 0.95, 0.95 * fade);
        }
        ctx.restore();
      }
    }
  }

  function needsLoop() {
    return !!(bolt || fires.some((f) => f.alive || f.dormant));
  }

  function ensureLoop() {
    cancelAnimationFrame(raf);
    const tick = () => {
      paint();
      if (needsLoop()) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
  }

  function onPointerDown(event) {
    if (event.button !== 0) return;
    const { x, y } = pointerPos(event);

    if (mode === "strike") {
      strikeAt(x, y);
      paint();
      return;
    }

    painting = true;
    lastX = x;
    lastY = y;
    stage.setPointerCapture(event.pointerId);
    stampGround(x, y);
    paint();
  }

  function onPointerMove(event) {
    if (!painting || mode === "strike") return;
    const { x, y } = pointerPos(event);
    strokeGround(lastX, lastY, x, y);
    lastX = x;
    lastY = y;
    paint();
  }

  function onPointerUp(event) {
    if (!painting) return;
    painting = false;
    try {
      stage.releasePointerCapture(event.pointerId);
    } catch (_) {
      /* ignore */
    }
  }

  brushSizeInput?.addEventListener("input", () => {
    setBrushSize(brushSizeInput.value);
    termPatch("brush", brushSize, "stroke radius");
  });
  colorInput?.addEventListener("input", () => {
    boltColor = colorInput.value || "#3d6cff";
    termPatch("boltColor", boltColor, "palette write");
  });
  paintBtn?.addEventListener("click", () => setMode("paint"));
  grassBtn?.addEventListener("click", () => setMode("grass"));
  eraseBtn?.addEventListener("click", () => setMode("erase"));
  strikeBtn?.addEventListener("click", () => setMode("strike"));
  clearBtn?.addEventListener("click", () => {
    gctx.clearRect(0, 0, width, height);
    bolt = null;
    fires = [];
    paint();
    termLog([`> clear.stage()`, `  ok  // terrain wiped`]);
  });

  bindSlider(limbsInput, limbsValue, (n) => {
    limbsPerInch = n;
  }, 0, 25, "limbsPerInch", "segment density");
  bindSlider(branchesInput, branchesValue, (n) => {
    branchesOut = n;
  }, 0, 20, "branchesOut", "fork count");
  bindSlider(branchLimbsInput, branchLimbsValue, (n) => {
    branchLimbs = n;
  }, 1, 25, "branchLimbs", "fork depth");

  if (colorInput) boltColor = colorInput.value || boltColor;

  stage.addEventListener("pointerdown", onPointerDown);
  stage.addEventListener("pointermove", onPointerMove);
  stage.addEventListener("pointerup", onPointerUp);
  stage.addEventListener("pointercancel", onPointerUp);
  stage.addEventListener("contextmenu", (e) => e.preventDefault());

  window.addEventListener("resize", () => {
    if (panel.classList.contains("is-active")) resize();
  });

  const wrap = stage.parentElement;
  if (wrap && typeof ResizeObserver !== "undefined") {
    new ResizeObserver(() => {
      if (panel.classList.contains("is-active")) resize();
    }).observe(wrap);
  }

  const observer = new MutationObserver(() => {
    if (panel.classList.contains("is-active")) {
      requestAnimationFrame(resize);
    }
  });
  observer.observe(panel, { attributes: true, attributeFilter: ["class"] });

  setBrushSize(brushSizeInput?.value || 14);
  // Don't spam terminal on boot tool bind
  mode = "paint";
  syncToolButtons();
  if (hint) hint.textContent = "Paint black ground. Use Grass for burnable cover.";
  if (panel.classList.contains("is-active")) resize();
})();
