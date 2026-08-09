(() => {
  const APP_VERSION = 13;

  const TIME_FONTS = [
    "Press Start 2P",
    "VT323",
    "Orbitron",
    "Syne",
    "Courier Prime",
    "Space Mono",
    "Audiowide",
    "Bungee",
    "Silkscreen",
    "Share Tech Mono",
    "Monoton",
    "Pixelify Sans",
  ];

  const boot = document.getElementById("bootScreen");
  const title = document.getElementById("titleScreen");
  const boom = document.getElementById("boomOverlay");
  const desktop = document.getElementById("desktop");
  const timeEl = document.getElementById("bootTime");
  const dateEl = document.getElementById("bootDate");
  const titleTimeEl = document.getElementById("titleTime");
  const titleDateEl = document.getElementById("titleDate");
  const startBtn = document.getElementById("titleStartBtn");
  const powerBtn = document.getElementById("powerBtn");
  const powerMenu = document.getElementById("powerMenu");
  const sleepOverlay = document.getElementById("sleepOverlay");
  const restartOverlay = document.getElementById("restartOverlay");
  const deskIcons = document.getElementById("desktopIcons");
  const windowLayer = document.getElementById("windowLayer");
  const taskClock = document.getElementById("taskbarClock");
  const taskDate = document.getElementById("taskbarDate");
  const stageLegacy = document.querySelector(".stage");

  if (!boot || !desktop) return;

  if (stageLegacy) stageLegacy.classList.add("stage-legacy");

  const deskAudio = new Audio("assets/startup-desktop.mp3");
  deskAudio.preload = "auto";
  const VOLUME_KEY = "archive-master-volume";
  let masterVolume = 0.85;
  let masterMuted = false;
  let volumeBeforeMute = 0.85;

  function loadMasterVolume() {
    try {
      const raw = localStorage.getItem(VOLUME_KEY);
      if (!raw) return;
      const d = JSON.parse(raw);
      if (typeof d.level === "number") masterVolume = Math.max(0, Math.min(1, d.level));
      masterMuted = !!d.muted;
      if (typeof d.volumeBeforeMute === "number") {
        volumeBeforeMute = Math.max(0, Math.min(1, d.volumeBeforeMute));
      }
    } catch (_) {
      /* ignore */
    }
  }

  function saveMasterVolume() {
    trySetLocalStorage(VOLUME_KEY, JSON.stringify({
      level: masterVolume,
      muted: masterMuted,
      volumeBeforeMute: volumeBeforeMute,
    }));
  }

  function effectiveVolume() {
    return masterMuted ? 0 : masterVolume;
  }

  function applyVolumeToAudio(audio) {
    if (!audio) return;
    audio.volume = effectiveVolume();
  }

  function applyVolumeToAllAudio() {
    applyVolumeToAudio(deskAudio);
    applyVolumeToAudio(mailAudio);
    applyVolumeToAudio(musicAudioEl);
  }

  function updateVolumeUi() {
    const slider = document.getElementById("startVolumeSlider");
    const muteBtn = document.getElementById("startVolumeMute");
    const label = document.getElementById("startVolumeLabel");
    const pct = masterMuted ? 0 : Math.round(masterVolume * 100);
    if (slider) slider.value = String(pct);
    if (label) label.textContent = masterMuted ? "Volume (muted)" : `Volume (${pct}%)`;
    if (muteBtn) {
      muteBtn.textContent = masterMuted || masterVolume === 0 ? "🔇" : "🔊";
      muteBtn.setAttribute("aria-pressed", masterMuted ? "true" : "false");
      muteBtn.title = masterMuted ? "Unmute" : "Mute";
    }
  }

  function setMasterVolume(level, opts = {}) {
    masterVolume = Math.max(0, Math.min(1, level));
    if (masterVolume > 0) volumeBeforeMute = masterVolume;
    if (!opts.fromMuteToggle) {
      masterMuted = masterVolume === 0;
    }
    applyVolumeToAllAudio();
    updateVolumeUi();
    saveMasterVolume();
  }

  function toggleMasterMute() {
    if (masterMuted) {
      masterMuted = false;
      masterVolume = volumeBeforeMute > 0 ? volumeBeforeMute : 0.85;
    } else {
      volumeBeforeMute = masterVolume > 0 ? masterVolume : 0.85;
      masterMuted = true;
    }
    applyVolumeToAllAudio();
    updateVolumeUi();
    saveMasterVolume();
  }

  function wireStartVolumeControls() {
    const muteBtn = document.getElementById("startVolumeMute");
    const slider = document.getElementById("startVolumeSlider");
    muteBtn?.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleMasterMute();
    });
    slider?.addEventListener("input", () => {
      const v = Number(slider.value) / 100;
      masterMuted = v === 0;
      setMasterVolume(v);
    });
    updateVolumeUi();
  }

  loadMasterVolume();
  applyVolumeToAudio(deskAudio);

  function playSound(audio) {
    if (!audio) return;
    try {
      applyVolumeToAudio(audio);
      audio.pause();
      audio.currentTime = 0;
      const p = audio.play();
      if (p && typeof p.catch === "function") p.catch(() => {});
    } catch (_) {
      /* ignore autoplay blocks */
    }
  }

  let phase = "boot"; // boot | login | desktop | sleep | restart
  const loginScreen = document.getElementById("loginScreen");
  const loginUsername = document.getElementById("loginUsername");
  const loginPassword = document.getElementById("loginPassword");
  const loginSubmit = document.getElementById("loginSubmit");
  const loginStatus = document.getElementById("loginStatus");
  const taskbarComputer = document.getElementById("taskbarComputer");
  const taskbarVersion = document.getElementById("taskbarVersion");
  const Cloud = () => window.ArchiveCloud;
  let hoverStyleTimer = 0;
  let hoveringTime = false;
  let zTop = 70;
  let factoryResetArmed = false;
  let fileBrowserState = null;
  let paintImportTarget = null;
  const openWindows = new Map();

  function pad(n) {
    return String(n).padStart(2, "0");
  }

  function formatTime(d) {
    let h = d.getHours();
    const m = pad(d.getMinutes());
    const s = pad(d.getSeconds());
    const ampm = h >= 12 ? "PM" : "AM";
    h = h % 12 || 12;
    return `${h}:${m}:${s} ${ampm}`;
  }

  function formatDate(d) {
    return d.toLocaleDateString(undefined, {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  function formatTaskDate(d) {
    return d.toLocaleDateString(undefined, {
      weekday: "short",
      month: "numeric",
      day: "numeric",
      year: "numeric",
    });
  }

  function tickClocks() {
    const now = new Date();
    const t = formatTime(now);
    const d = formatDate(now);
    if (timeEl) timeEl.textContent = t;
    if (dateEl) dateEl.textContent = d;
    if (titleTimeEl) titleTimeEl.textContent = t;
    if (titleDateEl) titleDateEl.textContent = d;
    if (taskDate) taskDate.textContent = formatTaskDate(now);
    if (taskClock) {
      taskClock.textContent = now.toLocaleTimeString(undefined, {
        hour: "numeric",
        minute: "2-digit",
      });
    }
  }

  function randomTimeStyle() {
    if (!timeEl) return;
    const font = TIME_FONTS[Math.floor(Math.random() * TIME_FONTS.length)];
    const weight = Math.random() > 0.45 ? "700" : "400";
    const italic = Math.random() > 0.5;
    const underline = Math.random() > 0.55;
    timeEl.style.fontFamily = `"${font}", monospace`;
    timeEl.style.fontWeight = weight;
    timeEl.style.fontStyle = italic ? "italic" : "normal";
    timeEl.style.textDecoration = underline ? "underline" : "none";
  }

  function startHoverCycle() {
    if (hoverStyleTimer) return;
    randomTimeStyle();
    hoverStyleTimer = window.setInterval(randomTimeStyle, 100);
  }

  function stopHoverCycle() {
    window.clearInterval(hoverStyleTimer);
    hoverStyleTimer = 0;
    if (timeEl) {
      timeEl.style.fontFamily = '"Press Start 2P", monospace';
      timeEl.style.fontWeight = "400";
      timeEl.style.fontStyle = "normal";
      timeEl.style.textDecoration = "none";
    }
  }

  timeEl?.addEventListener("pointerenter", () => {
    hoveringTime = true;
    startHoverCycle();
  });
  timeEl?.addEventListener("pointerleave", () => {
    hoveringTime = false;
    stopHoverCycle();
  });

  function showLoginStatus(msg) {
    if (!loginStatus) return;
    if (!msg) {
      loginStatus.hidden = true;
      loginStatus.textContent = "";
      return;
    }
    loginStatus.hidden = false;
    loginStatus.textContent = msg;
  }

  function updateTaskbarComputer() {
    if (taskbarVersion) taskbarVersion.textContent = `v${APP_VERSION}`;
    if (!taskbarComputer) return;
    const name = Cloud()?.getUsername?.() || "";
    taskbarComputer.textContent = name ? `${name}'s Computer` : "Computer";
  }

  function showLoginScreen() {
    if (!loginScreen) return;
    loginScreen.hidden = false;
    loginScreen.setAttribute("aria-hidden", "false");
    loginScreen.classList.add("is-on");
    document.body.classList.add("login-mode");
    document.body.classList.remove("boot-mode", "desktop-mode", "title-mode");
    showLoginStatus("");
    if (loginUsername) loginUsername.value = "";
    if (loginPassword) loginPassword.value = "";
    window.setTimeout(() => loginUsername?.focus(), 350);
    if (loginSubmit) loginSubmit.disabled = false;
  }

  function hideLoginScreen() {
    if (!loginScreen) return;
    loginScreen.classList.remove("is-on");
    loginScreen.hidden = true;
    loginScreen.setAttribute("aria-hidden", "true");
    document.body.classList.remove("login-mode");
  }

  function goLogin() {
    if (phase !== "boot") return;
    if (!document.getElementById("factoryResetScreen")?.hidden) return;
    phase = "login";
    stopHoverCycle();
    boot.classList.add("is-up");
    document.body.classList.remove("boot-mode", "title-mode");
    title?.classList.remove("is-on");
    title?.setAttribute("aria-hidden", "true");
    boom?.classList.remove("is-on");
    boom?.setAttribute("aria-hidden", "true");
    showLoginScreen();
  }

  function enterDesktop() {
    phase = "desktop";
    hideLoginScreen();
    stopHoverCycle();
    playSound(deskAudio);
    boot.classList.add("is-up");
    document.body.classList.remove("boot-mode", "title-mode", "login-mode");
    document.body.classList.add("desktop-mode");
    desktop.classList.add("is-on");
    desktop.setAttribute("aria-hidden", "false");
    applyDesktopWallpaper();
    title?.classList.remove("is-on");
    title?.setAttribute("aria-hidden", "true");
    boom?.classList.remove("is-on");
    boom?.setAttribute("aria-hidden", "true");
    updateTaskbarComputer();
    ensureBuiltinDesktopShortcuts();
    const pid = Cloud()?.getSession?.();
    const social = window.ArchiveSocial;
    if (pid && social) {
      prepareShareableProfileData(readProfileData())
        .then((shared) => social.publishAccount(pid, Cloud()?.getUsername?.() || "", shared))
        .catch(() => social.publishAccount(pid, Cloud()?.getUsername?.() || "", readProfileData()));
    }
    startSocialNotifications();
    updateProfileChromeIcon();
    Cloud()?.scheduleSave?.();
  }

  async function submitLogin() {
    const username = (loginUsername?.value || "").trim();
    const pw = loginPassword?.value || "";
    if (!username) {
      showLoginStatus("Enter a username.");
      loginUsername?.focus();
      return;
    }
    if (!pw) {
      showLoginStatus("Enter a password.");
      loginPassword?.focus();
      return;
    }
    if (!Cloud()) {
      showLoginStatus("Cloud module missing.");
      return;
    }
    if (loginSubmit) loginSubmit.disabled = true;
    showLoginStatus("Loading…");
    try {
      const result = await Cloud().loadProfile(username, pw);
      Cloud().setSession(result.profileId, result.username, result.passwordHash);
      if (result.isNew && result.passwordHash) {
        await Cloud().createProfileOnLogin(result.profileId, result.username, result.passwordHash);
      }
      Cloud().markJustLoggedIn();
      window.location.reload();
    } catch (err) {
      console.warn(err);
      showLoginStatus(err?.message || "Login failed. Try again.");
      if (loginSubmit) loginSubmit.disabled = false;
    }
  }

  async function doLogout() {
    closeStartMenu();
    powerMenu?.setAttribute("hidden", "");
    const cloud = Cloud();
    if (cloud?.getSession()) {
      try {
        await cloud.saveProfile(cloud.getSession());
      } catch (_) {
        /* ignore */
      }
      cloud.clearSession();
      cloud.clearArchiveLocal();
      cloud.markNeedLogin();
    }
    window.location.reload();
  }

  function goDesktop() {
    goLogin();
  }

  function openFactoryReset() {
    closeStartMenu();
    factoryResetArmed = false;
    const screen = document.getElementById("factoryResetScreen");
    const btn = document.getElementById("factoryResetConfirm");
    const hint = document.getElementById("factoryResetHint");
    const sure = screen?.querySelector(".factory-reset-sure");
    const hasAccount = !!Cloud()?.getSession?.();
    if (!screen) return;
    if (sure) {
      sure.textContent = hasAccount ? "DELETES YOUR ACCOUNT" : "ARE YOU SURE";
    }
    if (hint) {
      hint.textContent = hasAccount
        ? "This account only — others stay on this PC. Click again to confirm."
        : "Click once more to confirm";
    }
    screen.hidden = false;
    screen.setAttribute("aria-hidden", "false");
    btn?.classList.remove("is-armed");
    hint?.classList.remove("is-on");
    if (btn) btn.textContent = "RESET";
  }

  function closeFactoryReset() {
    factoryResetArmed = false;
    const screen = document.getElementById("factoryResetScreen");
    const btn = document.getElementById("factoryResetConfirm");
    const hint = document.getElementById("factoryResetHint");
    if (screen) {
      screen.hidden = true;
      screen.setAttribute("aria-hidden", "true");
    }
    btn?.classList.remove("is-armed");
    hint?.classList.remove("is-on");
    if (btn) btn.textContent = "RESET";
  }

  async function runFactoryReset() {
    closeFactoryReset();
    const cloud = Cloud();
    const pid = cloud?.getSession?.();

    if (pid && cloud?.deleteAccount) {
      try {
        await cloud.deleteAccount(pid);
      } catch (err) {
        console.warn("deleteAccount failed:", err);
      }
      window.location.reload();
      return;
    }

    cloud?.clearSession?.();
    try {
      const keys = [];
      for (let i = 0; i < localStorage.length; i += 1) {
        const k = localStorage.key(i);
        if (k && k.startsWith("archive-")) keys.push(k);
      }
      keys.forEach((k) => localStorage.removeItem(k));
      [
        CONFIG_STORAGE_KEY,
        PAINT_CONFIG_KEY,
        DELETED_APPS_KEY,
        "archive-desktop-shortcuts",
        "archive-bat-icons",
      ].forEach((k) => {
        try {
          localStorage.removeItem(k);
        } catch (_) {
          /* ignore */
        }
      });
    } catch (_) {
      /* ignore */
    }
    window.location.reload();
  }

  function closeStartMenu() {
    const menu = document.getElementById("startMenu");
    const btn = document.getElementById("taskStartBtn");
    const sub = document.getElementById("startPowerSub");
    const powerItem = document.getElementById("startPowerItem");
    if (menu) menu.setAttribute("hidden", "");
    if (sub) sub.setAttribute("hidden", "");
    powerItem?.classList.remove("is-hot");
    btn?.classList.remove("is-open");
    btn?.setAttribute("aria-expanded", "false");
  }

  function openStartMenu() {
    const menu = document.getElementById("startMenu");
    const btn = document.getElementById("taskStartBtn");
    if (!menu || !btn) return;
    menu.removeAttribute("hidden");
    btn.classList.add("is-open");
    btn.setAttribute("aria-expanded", "true");
  }

  function doSleep() {
    closeStartMenu();
    powerMenu?.setAttribute("hidden", "");
    phase = "sleep";
    sleepOverlay?.classList.remove("is-waking");
    sleepOverlay?.classList.add("is-on");
    sleepOverlay?.setAttribute("aria-hidden", "false");
  }

  function wakeFromSleep() {
    if (phase !== "sleep") return;
    sleepOverlay?.classList.add("is-waking");
    window.setTimeout(() => {
      sleepOverlay?.classList.remove("is-on", "is-waking");
      sleepOverlay?.setAttribute("aria-hidden", "true");
      phase = "desktop";
    }, 850);
  }

  function doShutdown() {
    closeStartMenu();
    powerMenu?.setAttribute("hidden", "");
    Cloud()?.scheduleSave?.();
    try {
      window.close();
    } catch (_) {
      /* ignore */
    }
    window.setTimeout(() => {
      document.body.innerHTML = "";
      document.body.style.background = "#000";
      try {
        window.open("", "_self");
        window.close();
      } catch (_) {
        /* ignore */
      }
    }, 50);
  }

  function doRestart() {
    closeStartMenu();
    powerMenu?.setAttribute("hidden", "");
    const cloud = Cloud();
    if (cloud?.getSession()) {
      cloud.saveProfile(cloud.getSession()).finally(() => {
        cloud.markJustLoggedIn();
        phase = "restart";
        restartOverlay?.classList.add("is-on");
        restartOverlay?.setAttribute("aria-hidden", "false");
        window.setTimeout(() => {
          window.location.reload();
        }, 2800);
      });
      return;
    }
    phase = "restart";
    restartOverlay?.classList.add("is-on");
    restartOverlay?.setAttribute("aria-hidden", "false");
    window.setTimeout(() => {
      window.location.reload();
    }, 2800);
  }

  function runPowerAction(act) {
    if (act === "sleep") doSleep();
    else if (act === "logout") doLogout();
    else if (act === "shutdown") doShutdown();
    else if (act === "restart") doRestart();
  }

  powerBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    const open = powerMenu.hasAttribute("hidden");
    if (open) {
      powerMenu.removeAttribute("hidden");
      powerBtn.setAttribute("aria-expanded", "true");
    } else {
      powerMenu.setAttribute("hidden", "");
      powerBtn.setAttribute("aria-expanded", "false");
    }
  });

  powerMenu?.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-power]");
    if (!btn) return;
    runPowerAction(btn.dataset.power);
  });

  document.addEventListener("pointerdown", (e) => {
    if (powerMenu && !powerMenu.hasAttribute("hidden") && !e.target.closest(".power-dock")) {
      powerMenu.setAttribute("hidden", "");
      powerBtn?.setAttribute("aria-expanded", "false");
    }
    if (
      !e.target.closest(".start-menu") &&
      !e.target.closest("#taskStartBtn") &&
      !e.target.closest(".start-btn")
    ) {
      closeStartMenu();
    }
  });

  window.addEventListener("keydown", (e) => {
    if (e.code === "Space" && phase === "boot") {
      e.preventDefault();
      goLogin();
    } else if (e.code === "Space" && phase === "sleep") {
      e.preventDefault();
      wakeFromSleep();
    } else if (e.code === "Escape") {
      if (!document.getElementById("factoryResetScreen")?.hidden) {
        closeFactoryReset();
        return;
      }
      const picker = document.getElementById("iconPickerModal");
      if (picker && !picker.hidden) {
        closeIconPicker();
        return;
      }
      const browser = document.getElementById("fileBrowserModal");
      if (browser && !browser.hidden) {
        closeFileBrowser();
        return;
      }
      const custom = document.getElementById("iconCustomise");
      if (custom && !custom.hidden) {
        closeCustomiseIcon();
        return;
      }
      closeStartMenu();
    }
  });

  startBtn?.addEventListener("click", goLogin);
  loginSubmit?.addEventListener("click", () => submitLogin());
  loginPassword?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      submitLogin();
    }
  });

  // —— Window system ——
  function focusWindow(el) {
    windowLayer?.querySelectorAll(".win95-window").forEach((w) => {
      w.classList.add("is-inactive");
    });
    el.classList.remove("is-inactive", "is-minimized");
    zTop += 1;
    el.style.zIndex = String(zTop);
    syncTaskbarFocus();
  }

  function syncTaskbarFocus() {
    document.querySelectorAll(".taskbar-app-btn").forEach((btn) => {
      const win = openWindows.get(btn.dataset.winId);
      const pressed =
        win && !win.classList.contains("is-inactive") && !win.classList.contains("is-minimized");
      btn.classList.toggle("is-pressed", pressed);
    });
  }

  function addTaskbarButton(win, id, title, icon) {
    const bar = document.getElementById("taskbarApps");
    if (!bar || !win) return;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "taskbar-app-btn";
    btn.dataset.winId = id;
    if (icon) {
      btn.innerHTML = `<img src="${icon}" alt="" width="14" height="14" /><span></span>`;
      btn.querySelector("span").textContent = title;
    } else {
      btn.textContent = title;
    }
    btn.addEventListener("click", () => {
      if (win.classList.contains("is-minimized")) {
        win.classList.remove("is-minimized");
        focusWindow(win);
        return;
      }
      const isFocused = !win.classList.contains("is-inactive");
      if (isFocused) {
        win.classList.add("is-minimized");
        syncTaskbarFocus();
      } else {
        focusWindow(win);
      }
    });
    bar.appendChild(btn);
    win._taskBtn = btn;
    syncTaskbarFocus();
  }

  function removeTaskbarButton(win) {
    if (win?._taskBtn) {
      win._taskBtn.remove();
      delete win._taskBtn;
    }
    syncTaskbarFocus();
  }

  function makeWindow({ id, title: winTitle, width, height, left, top, bodyHTML, bodyClass, onClose, icon }) {
    if (openWindows.has(id)) {
      const existing = openWindows.get(id);
      existing.classList.remove("is-minimized");
      focusWindow(existing);
      return existing;
    }

    const win = document.createElement("div");
    win.className = "win95-window";
    win.dataset.winId = id;
    win.style.width = `${width || 420}px`;
    win.style.height = `${height || 320}px`;
    win.style.left = `${left ?? 80 + openWindows.size * 24}px`;
    win.style.top = `${top ?? 48 + openWindows.size * 28}px`;

    win.innerHTML = `
      <div class="win95-title">
        <span class="win95-title-text"></span>
        <div class="win95-controls">
          <button type="button" class="win95-ctrl" data-act="min" title="Minimize">_</button>
          <button type="button" class="win95-ctrl" data-act="max" title="Maximize">□</button>
          <button type="button" class="win95-ctrl" data-act="close" title="Close">×</button>
        </div>
      </div>
      <div class="win95-body ${bodyClass || ""}"></div>
    `;
    const titleEl = win.querySelector(".win95-title-text");
    if (icon) {
      titleEl.innerHTML = "";
      const img = document.createElement("img");
      img.className = "win95-title-icon";
      img.src = icon;
      img.alt = "";
      titleEl.appendChild(img);
      titleEl.appendChild(document.createTextNode(` ${winTitle}`));
    } else {
      titleEl.textContent = winTitle;
    }
    const body = win.querySelector(".win95-body");
    if (typeof bodyHTML === "string") body.innerHTML = bodyHTML;
    else if (bodyHTML instanceof Node) body.appendChild(bodyHTML);

    const closeWin = () => {
      if (typeof onClose === "function") onClose();
      removeTaskbarButton(win);
      win.remove();
      openWindows.delete(id);
    };
    win._closeWin = closeWin;

    win.querySelector('[data-act="close"]').addEventListener("click", closeWin);
    win.querySelector('[data-act="min"]').addEventListener("click", () => {
      win.classList.add("is-minimized");
      syncTaskbarFocus();
    });
    win.querySelector('[data-act="max"]').addEventListener("click", () => {
      win.classList.toggle("is-max");
    });

    win.addEventListener("pointerdown", () => focusWindow(win));

    const bar = win.querySelector(".win95-title");
    let drag = null;
    bar.addEventListener("pointerdown", (e) => {
      if (e.target.closest(".win95-ctrl")) return;
      if (win.classList.contains("is-max")) return;
      drag = {
        ox: e.clientX - win.offsetLeft,
        oy: e.clientY - win.offsetTop,
      };
      bar.setPointerCapture(e.pointerId);
    });
    bar.addEventListener("pointermove", (e) => {
      if (!drag) return;
      win.style.left = `${Math.max(0, e.clientX - drag.ox)}px`;
      win.style.top = `${Math.max(0, e.clientY - drag.oy)}px`;
    });
    bar.addEventListener("pointerup", () => {
      drag = null;
    });

    // Edge / corner resize
    const MIN_W = 280;
    const MIN_H = 160;
    const edges = ["n", "s", "e", "w", "ne", "nw", "se", "sw"];
    for (const edge of edges) {
      const handle = document.createElement("div");
      handle.className = `win95-resize win95-resize-${edge}`;
      handle.dataset.edge = edge;
      win.appendChild(handle);
    }

    let resize = null;
    win.addEventListener("pointerdown", (e) => {
      const handle = e.target.closest(".win95-resize");
      if (!handle || win.classList.contains("is-max")) return;
      e.preventDefault();
      e.stopPropagation();
      focusWindow(win);
      const rect = win.getBoundingClientRect();
      const layer = windowLayer.getBoundingClientRect();
      resize = {
        edge: handle.dataset.edge,
        startX: e.clientX,
        startY: e.clientY,
        left: rect.left - layer.left,
        top: rect.top - layer.top,
        width: rect.width,
        height: rect.height,
        pointerId: e.pointerId,
      };
      try {
        handle.setPointerCapture(e.pointerId);
      } catch (_) {
        /* ignore */
      }
    });

    win.addEventListener("pointermove", (e) => {
      if (!resize || e.pointerId !== resize.pointerId) return;
      const dx = e.clientX - resize.startX;
      const dy = e.clientY - resize.startY;
      let { left, top, width, height } = resize;
      const edge = resize.edge;

      if (edge.includes("e")) width = resize.width + dx;
      if (edge.includes("s")) height = resize.height + dy;
      if (edge.includes("w")) {
        width = resize.width - dx;
        left = resize.left + dx;
      }
      if (edge.includes("n")) {
        height = resize.height - dy;
        top = resize.top + dy;
      }

      if (width < MIN_W) {
        if (edge.includes("w")) left = resize.left + resize.width - MIN_W;
        width = MIN_W;
      }
      if (height < MIN_H) {
        if (edge.includes("n")) top = resize.top + resize.height - MIN_H;
        height = MIN_H;
      }

      left = Math.max(0, left);
      top = Math.max(0, top);

      win.style.left = `${left}px`;
      win.style.top = `${top}px`;
      win.style.width = `${width}px`;
      win.style.height = `${height}px`;
    });

    const endResize = (e) => {
      if (!resize) return;
      if (e && resize.pointerId != null && e.pointerId !== resize.pointerId) return;
      resize = null;
    };
    win.addEventListener("pointerup", endResize);
    win.addEventListener("pointercancel", endResize);

    windowLayer.appendChild(win);
    openWindows.set(id, win);
    focusWindow(win);
    addTaskbarButton(win, id, winTitle, icon);
    return win;
  }

  function destroyWindow(id) {
    const win = openWindows.get(id);
    if (win?._closeWin) win._closeWin();
  }

  window.archiveTermLog = function archiveTermLog(appId, message) {
    const session = appSessions.get(appId);
    if (!session?.termId) return;
    const win = openWindows.get(session.termId);
    const pre = win?.querySelector("pre.term-body");
    if (!pre) return;

    const lines = Array.isArray(message) ? message : [String(message)];
    let text = pre.textContent || "";
    // Drop blinking cursor marker if present at end
    text = text.replace(/\u00a0?\s*$/, "");
    if (text && !text.endsWith("\n")) text += "\n";
    text += lines.join("\n") + "\n";
    pre.textContent = text;
    const body = pre.parentElement;
    if (body) body.scrollTop = body.scrollHeight;
  };

  const CONFIG_STORAGE_KEY = "archive-textgen-config.ini";
  const PAINT_CONFIG_KEY = "archive-pixelpaint-config.ini";
  const DELETED_APPS_KEY = "archive-deleted-apps";
  const PHOTOS_EXTRA_KEY = "archive-photos-extra";
  const FS_EXTRAS_KEY = "archive-fs-extras";
  const IMG_EXTRAS_KEY = "archive-img-extras";
  const AUDIO_EXTRAS_KEY = "archive-audio-extras";
  const MUSIC_PLAYLIST_KEY = "archive-music-playlist";
  const MUSIC_PLAYLIST_VER_KEY = "archive-music-playlist-ver";
  const MUSIC_PLAYLIST_VER = 7;
  const WALLPAPER_KEY = "archive-desktop-wallpaper";
  const PET_MODE_KEY = "archive-desktop-pet-mode";
  const PROFILE_DATA_KEY = "archive-user-profile";
  const DEFAULT_WALLPAPER = "assets2/desktop-bg.png";
  const BLANK_PROFILE_PIC = "assets/profile-blank.svg";
  const MEMORY_WARN_MB = 700;

  function trySetLocalStorage(key, value) {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (err) {
      if (err?.name === "QuotaExceededError") return false;
      return false;
    }
  }

  function alertStorageFull(what = "save") {
    window.alert(
      `Could not ${what} — storage is full. Delete old photos in My Files or use smaller images.`
    );
  }

  function isGifSrc(src) {
    if (!src) return false;
    return /^data:image\/gif/i.test(src) || /\.gif(\?|$)/i.test(src);
  }

  function isShareableMediaSrc(src) {
    if (!src || typeof src !== "string") return false;
    if (src.startsWith("blob:")) return false;
    return src.startsWith("data:") || /^assets\d?\//.test(src);
  }

  function avatarSrc(src) {
    if (!src || src.startsWith("blob:")) return BLANK_PROFILE_PIC;
    return src;
  }

  function bindAvatarImg(img, src) {
    if (!img) return;
    img.onerror = () => {
      img.onerror = null;
      img.src = BLANK_PROFILE_PIC;
    };
    img.src = avatarSrc(src);
  }

  function blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  async function fetchAsDataUrl(src) {
    const res = await fetch(src);
    if (!res.ok) throw new Error("fetch failed");
    return blobToDataUrl(await res.blob());
  }

  function compressImageDataUrl(dataUrl, maxW = 256, quality = 0.82) {
    if (isGifSrc(dataUrl)) return Promise.resolve(dataUrl);
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const w = img.naturalWidth || img.width || maxW;
        const h = img.naturalHeight || img.height || maxW;
        let tw = w;
        let th = h;
        if (w > maxW) {
          tw = maxW;
          th = Math.max(1, Math.round((h * maxW) / w));
        }
        const canvas = document.createElement("canvas");
        canvas.width = tw;
        canvas.height = th;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, tw, th);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    });
  }

  async function mediaToShareableSrc(src, opts = {}) {
    const { maxWidth = 320, maxBytes = 240000 } = opts;
    if (!src || typeof src !== "string") return "";
    if (/^assets\d?\//.test(src)) return src;
    let dataUrl = src;
    try {
      if (!src.startsWith("data:")) dataUrl = await fetchAsDataUrl(src);
    } catch (_) {
      return src.startsWith("data:") ? src : "";
    }
    if (isGifSrc(dataUrl)) {
      if (dataUrl.length <= maxBytes * 2) return dataUrl;
      return "";
    }
    let width = maxWidth;
    let quality = 0.82;
    let out = await compressImageDataUrl(dataUrl, width, quality);
    while (out.length > maxBytes && width > 64) {
      width = Math.round(width * 0.72);
      quality = Math.max(0.45, quality - 0.12);
      out = await compressImageDataUrl(dataUrl, width, quality);
    }
    if (out.length > maxBytes) {
      out = await compressImageDataUrl(dataUrl, 96, 0.45);
    }
    return out.length <= maxBytes ? out : "";
  }

  async function prepareShareableProfileData(data) {
    const next = { ...data };
    if (next.pictureSrc) {
      const shared = await mediaToShareableSrc(next.pictureSrc, { maxWidth: 256, maxBytes: 180000 });
      next.pictureSrc = shared || next.pictureSrc;
    }
    if (Array.isArray(next.stories)) {
      const stories = [];
      for (const story of next.stories.slice(0, 3)) {
        if (!story?.pictureSrc) {
          stories.push({ ...story, pictureSrc: "" });
          continue;
        }
        const shared = await mediaToShareableSrc(story.pictureSrc, { maxWidth: 480, maxBytes: 280000 });
        stories.push({
          ...story,
          pictureSrc: shared || story.pictureSrc,
        });
      }
      next.stories = stories;
    }
    return next;
  }

  function getProfileIconSrc() {
    const pfp = readProfileData().pictureSrc;
    if (!pfp || pfp.startsWith("blob:")) return "assets/profile-icon.svg";
    return pfp;
  }

  function updateProfileChromeIcon() {
    const icon = getProfileIconSrc();
    const win = openWindows.get("app:profile");
    const titleIcon = win?.querySelector(".win95-title-icon");
    if (titleIcon) titleIcon.src = icon;
    if (win?._taskBtn) {
      const btnIcon = win._taskBtn.querySelector("img");
      if (btnIcon) btnIcon.src = icon;
    }
    renderDesktopIcons();
  }

  let closingPair = false;
  let socialNotifUnsub = null;
  let socialNotifTotal = 0;
  let mailToastTimer = 0;
  let mailAudio = null;
  let pendingUploadPath = null;
  const appSessions = new Map(); // appId -> { termId, appWinId }
  let storagePollTimer = 0;

  const INSTALLABLE_APPS = [
    {
      id: "text-generator",
      name: "Text Generator",
      kind: "Tool",
      parent: "Tools",
      folder: "Text Generator",
      storageKeys: [CONFIG_STORAGE_KEY],
      memMB: 310,
      blurb: "Big letters from small ones.",
    },
    {
      id: "bg-changer",
      name: "Background Changer",
      kind: "Tool",
      parent: "Tools",
      folder: "Background Changer",
      storageKeys: [WALLPAPER_KEY],
      memMB: 40,
      blurb: "Set the desktop wallpaper from your files.",
    },
    {
      id: "desktop-pet",
      name: "Desktop Pet",
      kind: "Tool",
      parent: "Tools",
      folder: "Desktop Pet",
      storageKeys: [PET_MODE_KEY],
      memMB: 35,
      blurb: "A rolling ball pet. Right-click for Movement.",
    },
    {
      id: "profile",
      name: "Profile",
      kind: "Tool",
      parent: "Tools",
      folder: "Profile",
      storageKeys: [PROFILE_DATA_KEY],
      memMB: 25,
      blurb: "Your picture, display name, pronouns, and bio.",
    },
    {
      id: "social-media",
      name: "Social Media",
      kind: "Tool",
      parent: "Tools",
      folder: "Social Media",
      storageKeys: [],
      memMB: 45,
      blurb: "Browse accounts, add friends, and chat.",
    },
    {
      id: "music-player",
      name: "Music Player",
      kind: "Tool",
      parent: "Tools",
      folder: "Music Player",
      storageKeys: [MUSIC_PLAYLIST_KEY],
      memMB: 55,
      blurb: "Play MP3s from My Files. Minimize to keep listening.",
    },
    {
      id: "terminal",
      name: "Terminal",
      kind: "Tool",
      parent: "Tools",
      folder: "Terminal",
      storageKeys: [],
      memMB: 30,
      blurb: "Command line for My Files and apps.",
    },
    {
      id: "wikipedia",
      name: "Wikipedia",
      kind: "Tool",
      parent: "Tools",
      folder: "Wikipedia",
      storageKeys: [],
      memMB: 40,
      blurb: "Browse Wikipedia in a window.",
    },
    {
      id: "lightning",
      name: "Lightning FX",
      kind: "Game",
      parent: "Games",
      folder: "Lightning FX",
      storageKeys: [],
      memMB: 360,
      blurb: "Paint terrain, then strike.",
    },
    {
      id: "pixel-paint",
      name: "Pixel Paint",
      kind: "Game",
      parent: "Games",
      folder: "Pixel Paint",
      storageKeys: [PAINT_CONFIG_KEY],
      memMB: 180,
      blurb: "Draw pixel art. Save / Import.",
    },
  ];

  function deepCloneFs(node) {
    return JSON.parse(JSON.stringify(node));
  }

  function managedApps() {
    const storeOnes = getStoreGames().map((g) => ({
      id: g.id,
      name: g.name,
      kind: "Game",
      parent: "Games",
      folder: g.folder,
      storageKeys: [],
      memMB: 90,
      fromStore: true,
      blurb: g.blurb || "",
    }));
    return [...INSTALLABLE_APPS, ...storeOnes];
  }

  function findManagedApp(appId) {
    return managedApps().find((a) => a.id === appId);
  }

  function readDeletedApps() {
    try {
      const raw = localStorage.getItem(DELETED_APPS_KEY);
      const list = raw ? JSON.parse(raw) : [];
      return Array.isArray(list) ? list : [];
    } catch (_) {
      return [];
    }
  }

  function writeDeletedApps(list) {
    try {
      localStorage.setItem(DELETED_APPS_KEY, JSON.stringify(list));
    } catch (_) {
      /* ignore */
    }
  }

  function closeLinkedSession(appId, exceptId) {
    if (closingPair) return;
    const session = appSessions.get(appId);
    if (!session) return;
    closingPair = true;
    if (session.termId && session.termId !== exceptId) destroyWindow(session.termId);
    if (session.appWinId && session.appWinId !== exceptId) destroyWindow(session.appWinId);
    appSessions.delete(appId);
    closingPair = false;
  }

  function getTextGenConfigEntry() {
    return FS.root.children.Tools?.children?.["Text Generator"]?.children?.["config.ini"];
  }

  function getPaintConfigEntry() {
    return FS.root.children.Games?.children?.["Pixel Paint"]?.children?.["config.ini"];
  }

  function loadPaintConfigBody() {
    try {
      const saved = localStorage.getItem(PAINT_CONFIG_KEY);
      if (saved) {
        const entry = getPaintConfigEntry();
        if (entry) entry.body = saved;
        return saved;
      }
    } catch (_) {
      /* ignore */
    }
    return getPaintConfigEntry()?.body || "";
  }

  function parsePaintConfig(body) {
    let size = 16;
    let gridTransparency = 1;
    let folder = "Photos";
    const text = body || "";
    for (const line of text.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith(";") || trimmed.startsWith("#") || trimmed.startsWith("[")) {
        continue;
      }
      const sizeMatch = trimmed.match(/^size\s*=\s*(\d+)/i);
      if (sizeMatch) {
        size = Math.max(8, Math.min(128, parseInt(sizeMatch[1], 10) || 16));
        continue;
      }
      const gridMatch = trimmed.match(/^grid_transparency\s*=\s*([0-9]*\.?[0-9]+)/i);
      if (gridMatch) {
        const v = parseFloat(gridMatch[1]);
        if (!Number.isNaN(v)) gridTransparency = Math.max(0, Math.min(1, v));
        continue;
      }
      const folderMatch = trimmed.match(/^folder\s*=\s*(.+)$/i);
      if (folderMatch) {
        folder = folderMatch[1].trim().replace(/^["']|["']$/g, "");
      }
    }
    return { size, gridTransparency, folder };
  }

  function paintFolderPath(folderSetting) {
    const raw = String(folderSetting || "Photos").trim();
    if (!raw || /^photos$/i.test(raw) || /^my files[\\/]photos$/i.test(raw)) {
      return ["Photos"];
    }
    const parts = raw
      .replace(/^my files[\\/]?/i, "")
      .split(/[\\/]+/)
      .map((p) => p.trim())
      .filter(Boolean);
    if (!parts.length) return ["Photos"];
    // Ensure the path exists; otherwise fall back to Photos
    if (resolvePath(parts)?.node?.type === "folder") return parts;
    return ["Photos"];
  }

  function loadSavedConfigBody() {
    try {
      const saved = localStorage.getItem(CONFIG_STORAGE_KEY);
      if (saved) {
        const entry = getTextGenConfigEntry();
        if (entry) entry.body = saved;
        return saved;
      }
    } catch (_) {
      /* ignore */
    }
    return getTextGenConfigEntry()?.body || "";
  }

  const FS = {
    root: {
      type: "folder",
      name: "My Files",
      children: {
        Tools: {
          type: "folder",
          name: "Tools",
          children: {
            "Text Generator": {
              type: "folder",
              name: "Text Generator",
              children: {
                "run.bat": { type: "bat", name: "run.bat", app: "text-generator" },
                "readme.txt": {
                  type: "txt",
                  name: "readme.txt",
                  body:
                    "TEXT GENERATOR v1.0\r\n==================\r\n\r\nBig letters built from small ones.\r\nDouble-click run.bat to launch.\r\n\r\n(c) Archive of Things — 1995",
                },
                "config.ini": {
                  type: "ini",
                  name: "config.ini",
                  body:
                    "[display]\r\n" +
                    "text=ARCHIVE\r\n" +
                    "size=3\r\n" +
                    "messiness=0\r\n" +
                    "rainbow=0\r\n" +
                    "flip=0\r\n" +
                    "inkletters=\r\n" +
                    "color=#2a211c\r\n" +
                    "\r\n[fonts]\r\n" +
                    "ink=dm-mono\r\n" +
                    "big=impact\r\n",
                },
                Fonts: {
                  type: "folder",
                  name: "Fonts",
                  children: {
                    "mono.fnt": {
                      type: "file",
                      name: "mono.fnt",
                      body: "; bitmap font stub\r\nCHARSET=ASCII\r\nGLYPHS=95\r\n",
                    },
                    "display.fnt": {
                      type: "file",
                      name: "display.fnt",
                      body: "; display face stub\r\nWEIGHT=800\r\nTRACKING=-0.05\r\n",
                    },
                    legacy: {
                      type: "folder",
                      name: "legacy",
                      children: {
                        "vt323.fnt": {
                          type: "file",
                          name: "vt323.fnt",
                          body: "CRT phosphor face — do not edit\r\n",
                        },
                      },
                    },
                  },
                },
                Samples: {
                  type: "folder",
                  name: "Samples",
                  children: {
                    "archive.txt": { type: "txt", name: "archive.txt", body: "ARCHIVE\r\n" },
                    "hello.txt": { type: "txt", name: "hello.txt", body: "HELLO\r\nWORLD\r\n" },
                    demo: {
                      type: "folder",
                      name: "demo",
                      children: {
                        "rainbow.txt": { type: "txt", name: "rainbow.txt", body: "RAINBOW\r\n" },
                        "textgeneratordemo.bat": {
                          type: "bat",
                          name: "textgeneratordemo.bat",
                          app: "text-generator",
                          profile: "demo",
                        },
                      },
                    },
                  },
                },
                Docs: {
                  type: "folder",
                  name: "Docs",
                  children: {
                    "manual.txt": {
                      type: "txt",
                      name: "manual.txt",
                      body: "MANUAL\r\n------\r\n1. Type text\r\n2. Tweak size / ink / fonts\r\n3. Export by staring proudly\r\n",
                    },
                    "changelog.txt": {
                      type: "txt",
                      name: "changelog.txt",
                      body: "v1.0 — initial archive build\r\nv0.9 — rainbow modes\r\nv0.5 — flip holes\r\n",
                    },
                  },
                },
                Assets: {
                  type: "folder",
                  name: "Assets",
                  children: {
                    "icon.bmp": {
                      type: "img",
                      name: "icon.bmp",
                      src: "assets/start-flag.png",
                      body: "BM (pretend bitmap)\r\n16x16 ARCHIVE glyph\r\n",
                    },
                    "splash.pcx": {
                      type: "file",
                      name: "splash.pcx",
                      body: "PCX stub — title splash art\r\n",
                    },
                  },
                },
              },
            },
            "Background Changer": {
              type: "folder",
              name: "Background Changer",
              children: {
                "run.bat": { type: "bat", name: "run.bat", app: "bg-changer" },
                "readme.txt": {
                  type: "txt",
                  name: "readme.txt",
                  body:
                    "BACKGROUND CHANGER v1.0\r\n======================\r\n\r\nPick any image from My Files as your desktop wallpaper.\r\nDouble-click run.bat to launch.\r\n",
                },
              },
            },
            "Desktop Pet": {
              type: "folder",
              name: "Desktop Pet",
              children: {
                "run.bat": { type: "bat", name: "run.bat", app: "desktop-pet" },
                "readme.txt": {
                  type: "txt",
                  name: "readme.txt",
                  body:
                    "DESKTOP PET v1.0\r\n===============\r\n\r\nA rolling ball that lives on your desktop.\r\nRight-click the ball → Movement → Follow / Wander / Idle.\r\n",
                },
              },
            },
            Profile: {
              type: "folder",
              name: "Profile",
              children: {
                "run.bat": { type: "bat", name: "run.bat", app: "profile" },
                "readme.txt": {
                  type: "txt",
                  name: "readme.txt",
                  body:
                    "PROFILE v1.0\r\n==========\r\n\r\nEdit your picture, display name, pronouns, and description.\r\nDouble-click run.bat to launch.\r\n",
                },
              },
            },
            "Social Media": {
              type: "folder",
              name: "Social Media",
              children: {
                "run.bat": { type: "bat", name: "run.bat", app: "social-media" },
                "readme.txt": {
                  type: "txt",
                  name: "readme.txt",
                  body:
                    "SOCIAL MEDIA v1.0\r\n===============\r\n\r\nBrowse other computers, send friend requests, and chat.\r\nDouble-click run.bat to launch.\r\n",
                },
              },
            },
            "Music Player": {
              type: "folder",
              name: "Music Player",
              children: {
                "run.bat": { type: "bat", name: "run.bat", app: "music-player" },
                "readme.txt": {
                  type: "txt",
                  name: "readme.txt",
                  body:
                    "MUSIC PLAYER v1.0\r\n================\r\n\r\nAdd MP3s from My Files, build a playlist, and play.\r\nMinimize to keep music in the background.\r\n",
                },
              },
            },
            Terminal: {
              type: "folder",
              name: "Terminal",
              children: {
                "run.bat": { type: "bat", name: "run.bat", app: "terminal" },
                "readme.txt": {
                  type: "txt",
                  name: "readme.txt",
                  body:
                    "TERMINAL v1.0\r\n=============\r\n\r\nType help for commands.\r\nDouble-click run.bat to launch.\r\n",
                },
              },
            },
            Wikipedia: {
              type: "folder",
              name: "Wikipedia",
              children: {
                "run.bat": { type: "bat", name: "run.bat", app: "wikipedia" },
                "readme.txt": {
                  type: "txt",
                  name: "readme.txt",
                  body:
                    "WIKIPEDIA v1.0\r\n==============\r\n\r\nBrowse Wikipedia like on the web.\r\nDouble-click run.bat to launch.\r\nUse the address bar to search or open pages.\r\n",
                },
              },
            },
          },
        },
        Music: {
          type: "folder",
          name: "Music",
          children: {
            "Relaxed music": {
              type: "folder",
              name: "Relaxed music",
              children: {
                "Relaxed Scene (3 min).mp3": {
                  type: "audio",
                  name: "Relaxed Scene (3 min).mp3",
                  src: "assets3/music/relaxed-scene-3min.mp3",
                  body: "First 3 minutes of Relaxed Scene\r\n",
                },
                "Girlfriends - New Computers.mp3": {
                  type: "audio",
                  name: "Girlfriends - New Computers.mp3",
                  src: "assets3/music/girlfriends-new-computers.mp3",
                  body: "Girlfriends — New Computers\r\n",
                },
                "atlasaudio-relax-574027.mp3": {
                  type: "audio",
                  name: "atlasaudio-relax-574027.mp3",
                  src: "assets3/music/atlasaudio-relax-574027.mp3",
                  body: "Relax track\r\n",
                },
                "kulakovka-lofi-relax-570489.mp3": {
                  type: "audio",
                  name: "kulakovka-lofi-relax-570489.mp3",
                  src: "assets3/music/kulakovka-lofi-relax-570489.mp3",
                  body: "Lofi relax track\r\n",
                },
                "atlasaudio-relax-511892.mp3": {
                  type: "audio",
                  name: "atlasaudio-relax-511892.mp3",
                  src: "assets3/music/atlasaudio-relax-511892.mp3",
                  body: "Relax track\r\n",
                },
                "Narvent - Memory Reboot.mp3": {
                  type: "audio",
                  name: "Narvent - Memory Reboot.mp3",
                  src: "assets3/music/narvent-memory-reboot.mp3",
                  body: "V-J Narvent — Memory Reboot\r\n",
                },
                "The Caretaker - burning memory.mp3": {
                  type: "audio",
                  name: "The Caretaker - burning memory.mp3",
                  src: "assets3/music/caretaker-burning-memory.mp3",
                  body: "The Caretaker — It's just a burning memory\r\n",
                },
                "meaningful love (instrumental).mp3": {
                  type: "audio",
                  name: "meaningful love (instrumental).mp3",
                  src: "assets3/music/meaningful-love-instrumental.mp3",
                  body: "meaningful love (instrumental)\r\n",
                },
              },
            },
            "Loud/phonk": {
              type: "folder",
              name: "Loud/phonk",
              children: {
                "HOMAGE FUNK.mp3": {
                  type: "audio",
                  name: "HOMAGE FUNK.mp3",
                  src: "assets3/music/homage-funk.mp3",
                  body: "HOMAGE FUNK\r\n",
                },
                "MONTAGEM FEARLESS (Ultra Slowed).mp3": {
                  type: "audio",
                  name: "MONTAGEM FEARLESS (Ultra Slowed).mp3",
                  src: "assets3/music/montagem-fearless-ultra-slowed.mp3",
                  body: "lirvie — MONTAGEM FEARLESS\r\n",
                },
                "BANG BANG BANG! (remix).mp3": {
                  type: "audio",
                  name: "BANG BANG BANG! (remix).mp3",
                  src: "assets3/music/bang-bang-bang-remix.mp3",
                  body: "BANG BANG BANG! remix\r\n",
                },
                "FUNK DE BELEZA SLOWED.mp3": {
                  type: "audio",
                  name: "FUNK DE BELEZA SLOWED.mp3",
                  src: "assets3/music/funk-de-beleza-slowed.mp3",
                  body: "FUNK DE BELEZA SLOWED\r\n",
                },
                "LUNA BALA (Super Slowed).mp3": {
                  type: "audio",
                  name: "LUNA BALA (Super Slowed).mp3",
                  src: "assets3/music/luna-bala-super-slowed.mp3",
                  body: "LUNA BALA Super Slowed\r\n",
                },
                "MONTAGEM BAILÃO (Slowed).mp3": {
                  type: "audio",
                  name: "MONTAGEM BAILÃO (Slowed).mp3",
                  src: "assets4/music/montagem-bailao-slowed.mp3",
                  body: "MONTAGEM BAILÃO Slowed\r\n",
                },
                "LOS VOLTAJE (Slowed).mp3": {
                  type: "audio",
                  name: "LOS VOLTAJE (Slowed).mp3",
                  src: "assets4/music/los-voltaje-slowed.mp3",
                  body: "LOS VOLTAJE Slowed\r\n",
                },
                "EEYUH! x Fluxxwave.mp3": {
                  type: "audio",
                  name: "EEYUH! x Fluxxwave.mp3",
                  src: "assets4/music/eeyuh-fluxxwave.mp3",
                  body: "EEYUH! x Fluxxwave\r\n",
                },
                "CUTE DEPRESSED.mp3": {
                  type: "audio",
                  name: "CUTE DEPRESSED.mp3",
                  src: "assets4/music/cute-depressed.mp3",
                  body: "CUTE DEPRESSED\r\n",
                },
                "GLORY (Slowed).mp3": {
                  type: "audio",
                  name: "GLORY (Slowed).mp3",
                  src: "assets4/music/ogryzek-glory-slowed.mp3",
                  body: "Ogryzek — GLORY Slowed\r\n",
                },
                "BATTLE UNDER A BROKEN SKY.mp3": {
                  type: "audio",
                  name: "BATTLE UNDER A BROKEN SKY.mp3",
                  src: "assets4/music/battle-under-broken-sky.mp3",
                  body: "BATTLE UNDER A BROKEN SKY\r\n",
                },
                "Chess Type Beat (Slowed).mp3": {
                  type: "audio",
                  name: "Chess Type Beat (Slowed).mp3",
                  src: "assets4/music/chess-type-beat-slowed.mp3",
                  body: "Chess type beat slowed\r\n",
                },
                "VERITY HARDTEKK (Ultra Slowed).mp3": {
                  type: "audio",
                  name: "VERITY HARDTEKK (Ultra Slowed).mp3",
                  src: "assets4/music/verity-hardtekk-ultra-slowed.mp3",
                  body: "VERITY HARDTEKK Ultra Slowed\r\n",
                },
              },
            },
            Jackson: {
              type: "folder",
              name: "Jackson",
              children: {
                "Billie Jean (remix).mp3": {
                  type: "audio",
                  name: "Billie Jean (remix).mp3",
                  src: "assets4/music/jackson-billie-jean-remix.mp3",
                  body: "Michael Jackson — Billie Jean remix\r\n",
                },
                "They Don't Care About Us.mp3": {
                  type: "audio",
                  name: "They Don't Care About Us.mp3",
                  src: "assets4/music/jackson-they-dont-care.mp3",
                  body: "Michael Jackson — They Don't Care About Us\r\n",
                },
                "Man in the Mirror.mp3": {
                  type: "audio",
                  name: "Man in the Mirror.mp3",
                  src: "assets4/music/jackson-man-in-the-mirror.mp3",
                  body: "Michael Jackson — Man in the Mirror\r\n",
                },
                "Beat It.mp3": {
                  type: "audio",
                  name: "Beat It.mp3",
                  src: "assets4/music/jackson-beat-it.mp3",
                  body: "Michael Jackson — Beat It\r\n",
                },
              },
            },
          },
        },
        Games: {
          type: "folder",
          name: "Games",
          children: {
            "Lightning FX": {
              type: "folder",
              name: "Lightning FX",
              children: {
                "run.bat": { type: "bat", name: "run.bat", app: "lightning" },
                "readme.txt": {
                  type: "txt",
                  name: "readme.txt",
                  body:
                    "LIGHTNING FX v1.0\r\n=================\r\n\r\nPaint ground / grass, then strike.\r\nDouble-click run.bat to launch.\r\n",
                },
                "controls.txt": {
                  type: "txt",
                  name: "controls.txt",
                  body:
                    "Ground — black paint\r\nGrass — burnable green\r\nStrike — fire bolts\r\nBranches — settings under stage\r\n",
                },
                Levels: {
                  type: "folder",
                  name: "Levels",
                  children: {
                    "flat.map": {
                      type: "file",
                      name: "flat.map",
                      body: "MAP flat_v1\r\nGROUND=1\r\nGRASS=0\r\n",
                    },
                    "hills.map": {
                      type: "file",
                      name: "hills.map",
                      body: "MAP hills_v1\r\nGROUND=1\r\nGRASS=1\r\nPEAKS=3\r\n",
                    },
                  },
                },
                Docs: {
                  type: "folder",
                  name: "Docs",
                  children: {
                    "manual.txt": {
                      type: "txt",
                      name: "manual.txt",
                      body: "1. Paint terrain\r\n2. Strike\r\n3. Watch fire on grass\r\n",
                    },
                  },
                },
                Assets: {
                  type: "folder",
                  name: "Assets",
                  children: {
                    "bolt.ico": {
                      type: "img",
                      name: "bolt.ico",
                      src: "assets2/warning.png",
                      body: "ICON stub — yellow bolt\r\n",
                    },
                  },
                },
              },
            },
            "Pixel Paint": {
              type: "folder",
              name: "Pixel Paint",
              children: {
                "run.bat": { type: "bat", name: "run.bat", app: "pixel-paint" },
                "config.ini": {
                  type: "ini",
                  name: "config.ini",
                  body:
                    "[canvas]\r\n" +
                    "size=16\r\n" +
                    "grid_transparency=1\r\n" +
                    "folder=Photos\r\n",
                },
                "readme.txt": {
                  type: "txt",
                  name: "readme.txt",
                  body:
                    "PIXEL PAINT v1.0\r\n================\r\n\r\nSave As / Import drawings.\r\n",
                },
              },
            },
          },
        },
        Photos: {
          type: "folder",
          name: "Photos",
          children: {
            "readme.txt": {
              type: "txt",
              name: "readme.txt",
              body: "Drop photos here later.\r\nUse Background Changer to set wallpapers from this folder.\r\n",
            },
            "bliss.bmp": {
              type: "img",
              name: "bliss.bmp",
              src: "assets2/desktop-bg.png",
            },
            "boot.bmp": {
              type: "img",
              name: "boot.bmp",
              src: "assets2/boot-bg.png",
            },
            "flag.bmp": {
              type: "img",
              name: "flag.bmp",
              src: "assets/start-flag.png",
            },
            "drive.bmp": {
              type: "img",
              name: "drive.bmp",
              src: "assets/storage-icon.png",
            },
          },
        },
        Help: {
          type: "folder",
          name: "Help",
          children: {
            "Getting Started.txt": {
              type: "txt",
              name: "Getting Started.txt",
              body:
                "GETTING STARTED\r\n===============\r\n\r\n" +
                "1. Press SPACE on the boot screen.\r\n" +
                "2. Log in with your username and password.\r\n" +
                "   New accounts start blank.\r\n" +
                "3. Double-click My Files on the desktop.\r\n" +
                "4. Open Tools, install apps from the App Store,\r\n" +
                "   then double-click run.bat in each folder.\r\n" +
                "5. Read the other documents in this Help folder\r\n" +
                "   for step-by-step guides.\r\n\r\n" +
                "Start menu: Storage, App Store, My Files, volume,\r\n" +
                "and Sign out.\r\n",
            },
            "My Files.txt": {
              type: "txt",
              name: "My Files.txt",
              body:
                "MY FILES\r\n========\r\n\r\n" +
                "Your virtual hard drive. Folders include Tools,\r\n" +
                "Games, Photos, Music, and Help.\r\n\r\n" +
                "Right-click empty space: New Folder, upload files.\r\n" +
                "Drag files from your PC onto a folder window.\r\n" +
                "Double-click folders to open. Double-click run.bat\r\n" +
                "to launch programs.\r\n",
            },
            "App Store.txt": {
              type: "txt",
              name: "App Store.txt",
              body:
                "APP STORE\r\n=========\r\n\r\n" +
                "Start menu -> App Store, or Tools folder.\r\n\r\n" +
                "Click Install to add an app to My Files.\r\n" +
                "Then open its folder and double-click run.bat.\r\n" +
                "Delete removes the app and frees memory.\r\n",
            },
            "Profile.txt": {
              type: "txt",
              name: "Profile.txt",
              body:
                "PROFILE\r\n=======\r\n\r\n" +
                "Tools -> Profile -> run.bat\r\n\r\n" +
                "Set your picture, display name, pronouns, and bio.\r\n" +
                "Add up to 3 story photos with descriptions.\r\n" +
                "Click Save. Your picture shows on Social Media\r\n" +
                "and the Profile desktop icon.\r\n",
            },
            "Social Media.txt": {
              type: "txt",
              name: "Social Media.txt",
              body:
                "SOCIAL MEDIA\r\n============\r\n\r\n" +
                "Explore accounts, send friend requests, and chat.\r\n\r\n" +
                "Click a profile to like, view stories, and comment.\r\n" +
                "Friends tab: accept requests and open chats.\r\n" +
                "Use the paperclip in chat to send photos or GIFs.\r\n" +
                "You'll get a mail popup for messages and accepts.\r\n",
            },
            "Music Player.txt": {
              type: "txt",
              name: "Music Player.txt",
              body:
                "MUSIC PLAYER\r\n============\r\n\r\n" +
                "Upload MP3s to My Files -> Music, or use built-in\r\n" +
                "tracks in Relaxed music, Loud/phonk, and Jackson.\r\n\r\n" +
                "Add songs to your playlist, use Back / Pause / Skip.\r\n" +
                "Minimize the window to keep listening.\r\n",
            },
            "Terminal.txt": {
              type: "txt",
              name: "Terminal.txt",
              body:
                "TERMINAL\r\n========\r\n\r\n" +
                "Tools -> Terminal -> run.bat\r\n\r\n" +
                "Type help for commands: dir, cd, open apps,\r\n" +
                "ver, date, fortune, credits, and more.\r\n" +
                "Example: open wiki, open social, open files\r\n",
            },
            "Wikipedia.txt": {
              type: "txt",
              name: "Wikipedia.txt",
              body:
                "WIKIPEDIA\r\n=========\r\n\r\n" +
                "Tools -> Wikipedia -> run.bat\r\n\r\n" +
                "Browse Wikipedia in a window. Use Home, Back,\r\n" +
                "Forward, and the address bar. Type a page name\r\n" +
                "or URL and click Go. Use -> to open in browser\r\n" +
                "if the page does not load inside the app.\r\n",
            },
            "Text Generator.txt": {
              type: "txt",
              name: "Text Generator.txt",
              body:
                "TEXT GENERATOR\r\n==============\r\n\r\n" +
                "Tools -> Text Generator -> run.bat\r\n\r\n" +
                "Type text and tweak size, fonts, and colors.\r\n" +
                "Edit config.ini in the same folder for defaults.\r\n",
            },
            "Background Changer.txt": {
              type: "txt",
              name: "Background Changer.txt",
              body:
                "BACKGROUND CHANGER\r\n==================\r\n\r\n" +
                "Pick an image or GIF from Photos as wallpaper.\r\n" +
                "Tools -> Background Changer -> Browse.\r\n" +
                "Reset returns the default desktop background.\r\n",
            },
            "Desktop Pet.txt": {
              type: "txt",
              name: "Desktop Pet.txt",
              body:
                "DESKTOP PET\r\n===========\r\n\r\n" +
                "A rolling ball on your desktop.\r\n" +
                "Right-click the pet: Movement -> Follow,\r\n" +
                "Wander, or Idle.\r\n",
            },
            "Uploading Files.txt": {
              type: "txt",
              name: "Uploading Files.txt",
              body:
                "UPLOADING FILES\r\n===============\r\n\r\n" +
                "Drag images, audio, or text from your PC onto\r\n" +
                "a My Files folder window.\r\n\r\n" +
                "Or right-click a folder -> Upload files.\r\n" +
                "Images go to Photos, audio to Music.\r\n" +
                "If save fails, delete old files or use smaller ones.\r\n",
            },
            "Pixel Paint.txt": {
              type: "txt",
              name: "Pixel Paint.txt",
              body:
                "PIXEL PAINT\r\n===========\r\n\r\n" +
                "Games -> Pixel Paint -> run.bat\r\n\r\n" +
                "Draw pixel art. Save As saves to Photos.\r\n" +
                "Import loads an image from My Files.\r\n",
            },
            "Lightning FX.txt": {
              type: "txt",
              name: "Lightning FX.txt",
              body:
                "LIGHTNING FX\r\n============\r\n\r\n" +
                "Games -> Lightning FX -> run.bat\r\n\r\n" +
                "Paint terrain on the canvas, then strike with\r\n" +
                "lightning. Edit config.ini for options.\r\n",
            },
            "Volume and Mail.txt": {
              type: "txt",
              name: "Volume and Mail.txt",
              body:
                "VOLUME AND MAIL\r\n===============\r\n\r\n" +
                "Start menu: speaker icon mutes or unmutes.\r\n" +
                "Slider changes volume for sounds and music.\r\n\r\n" +
                "A You've got mail popup appears for new chat\r\n" +
                "messages and friend request accepts.\r\n",
            },
          },
        },
      },
    },
  };

  const BUILTIN_APP_TEMPLATES = {};
  for (const app of INSTALLABLE_APPS) {
    const node = FS.root.children[app.parent]?.children?.[app.folder];
    if (node) BUILTIN_APP_TEMPLATES[app.id] = deepCloneFs(node);
  }

  function pruneDeletedAppsFromFs() {
    const deleted = new Set(readDeletedApps());
    for (const app of INSTALLABLE_APPS) {
      if (!deleted.has(app.id)) continue;
      const parent = FS.root.children[app.parent];
      if (parent?.children?.[app.folder]) delete parent.children[app.folder];
    }
  }

  function ensureMissingBuiltinApps() {
    for (const app of INSTALLABLE_APPS) {
      const parent = FS.root.children[app.parent];
      const template = BUILTIN_APP_TEMPLATES[app.id];
      if (!parent || !template) continue;
      if (!parent.children) parent.children = {};
      if (!parent.children[app.folder] && !readDeletedApps().includes(app.id)) {
        parent.children[app.folder] = deepCloneFs(template);
      }
    }
  }

  pruneDeletedAppsFromFs();
  loadSavedConfigBody();
  loadPaintConfigBody();
  applyFsExtras();
  applyPhotosExtra();
  applyImgExtras();
  applyAudioExtras();
  ensureMissingBuiltinApps();

  function loadFsExtras() {
    try {
      const raw = localStorage.getItem(FS_EXTRAS_KEY);
      const list = raw ? JSON.parse(raw) : [];
      return Array.isArray(list) ? list : [];
    } catch (_) {
      return [];
    }
  }

  function saveFsExtras(list) {
    if (!trySetLocalStorage(FS_EXTRAS_KEY, JSON.stringify(list))) {
      alertStorageFull("save file");
      return false;
    }
    return true;
  }

  function applyFsExtras() {
    for (const item of loadFsExtras()) {
      if (item.deleted && item.parentPath && item.name) {
        const parent = resolvePath(item.parentPath)?.node;
        if (parent?.children?.[item.name]) delete parent.children[item.name];
        continue;
      }
      if (!item?.parentPath || !item?.entry?.name) continue;
      const parent = resolvePath(item.parentPath)?.node;
      if (!parent || parent.type !== "folder") continue;
      if (!parent.children) parent.children = {};
      const existing = parent.children[item.entry.name];
      if (!existing) {
        parent.children[item.entry.name] = { ...item.entry };
        if (item.entry.type === "folder" && !parent.children[item.entry.name].children) {
          parent.children[item.entry.name].children = {};
        }
        continue;
      }
      if (item.entry.type === "folder" && existing.type === "folder") {
        existing.name = item.entry.name;
        if (!existing.children) existing.children = {};
        continue;
      }
      const keepChildren = existing.type === "folder" ? existing.children : undefined;
      Object.assign(existing, { ...item.entry });
      if (keepChildren && existing.type === "folder") existing.children = keepChildren;
    }
  }

  function pathMatchesOrUnder(itemKey, rootKey) {
    if (!rootKey) return !itemKey || itemKey === rootKey;
    return itemKey === rootKey || itemKey.startsWith(`${rootKey}/`);
  }

  function upsertFsEntry(parentPath, entry) {
    if (!entry?.name || !Array.isArray(parentPath)) return false;
    const extras = loadFsExtras();
    const pk = pathKey(parentPath);
    let found = false;
    for (const item of extras) {
      if (item.deleted) continue;
      if (pathKey(item.parentPath || []) === pk && item.entry?.name === entry.name) {
        item.entry = { ...item.entry, ...entry };
        found = true;
        break;
      }
    }
    if (!found) {
      extras.push({ parentPath: [...parentPath], entry: { ...entry } });
    }
    if (!saveFsExtras(extras)) return false;
    Cloud()?.scheduleSave?.();
    return true;
  }

  function removeMediaExtrasForPath(rootKey) {
    const imgs = loadImgExtras().filter(
      (item) => !pathMatchesOrUnder(pathKey([...(item.parentPath || []), item.name]), rootKey)
    );
    if (imgs.length !== loadImgExtras().length) saveImgExtras(imgs);

    const audio = loadAudioExtras().filter(
      (item) => !pathMatchesOrUnder(pathKey([...(item.parentPath || []), item.name]), rootKey)
    );
    if (audio.length !== loadAudioExtras().length) saveAudioExtras(audio);

    if (rootKey === "Photos" || rootKey.startsWith("Photos/")) {
      const photos = loadPhotosExtra().filter(
        (pic) => !pathMatchesOrUnder(pathKey(["Photos", pic.name]), rootKey)
      );
      if (photos.length !== loadPhotosExtra().length) savePhotosExtra(photos);
    }
  }

  function deleteFsEntry(target) {
    const fullPath = target?.path;
    if (!fullPath?.length) return false;
    const name = fullPath[fullPath.length - 1];
    const parentPath = fullPath.slice(0, -1);
    const parent = resolvePath(parentPath)?.node;
    if (!parent?.children?.[name]) return false;
    if (!window.confirm(`Delete "${name}"?`)) return false;

    const fullKey = pathKey(fullPath);
    const parentKey = pathKey(parentPath);
    delete parent.children[name];

    const extras = loadFsExtras();
    const hadUserEntry = extras.some(
      (item) => !item.deleted && pathKey(item.parentPath || []) === parentKey && item.entry?.name === name
    );
    const nextExtras = extras.filter((item) => {
      if (item.deleted) {
        const ik = pathKey([...(item.parentPath || []), item.name]);
        return !pathMatchesOrUnder(ik, fullKey);
      }
      if (!item.parentPath || !item.entry?.name) return true;
      const ik = pathKey([...item.parentPath, item.entry.name]);
      return !pathMatchesOrUnder(ik, fullKey);
    });
    if (!hadUserEntry) nextExtras.push({ parentPath: [...parentPath], deleted: true, name });
    saveFsExtras(nextExtras);

    removeMediaExtrasForPath(fullKey);

    const icons = loadBatIcons();
    let iconsChanged = false;
    for (const key of Object.keys(icons)) {
      if (pathMatchesOrUnder(key, fullKey)) {
        delete icons[key];
        iconsChanged = true;
      }
    }
    if (iconsChanged) saveBatIcons(icons);

    const before = desktopShortcuts.length;
    desktopShortcuts = desktopShortcuts.filter((sc) => {
      if (!sc.path?.length) return true;
      return !pathMatchesOrUnder(pathKey(sc.path), fullKey);
    });
    if (desktopShortcuts.length !== before) {
      saveDesktopShortcuts(desktopShortcuts);
      renderDesktopIcons();
    }

    for (const id of [...openWindows.keys()]) {
      if (!id.startsWith("folder:")) continue;
      const folderPath = id.slice(7);
      if (folderPath === fullKey || folderPath.startsWith(`${fullKey}/`)) destroyWindow(id);
    }

    refreshOpenFolder(parentPath);
    Cloud()?.scheduleSave?.();
    return true;
  }

  function loadPhotosExtra() {
    try {
      const raw = localStorage.getItem(PHOTOS_EXTRA_KEY);
      const list = raw ? JSON.parse(raw) : [];
      return Array.isArray(list) ? list : [];
    } catch (_) {
      return [];
    }
  }

  function savePhotosExtra(list) {
    if (!trySetLocalStorage(PHOTOS_EXTRA_KEY, JSON.stringify(list))) {
      alertStorageFull("save photo");
      return false;
    }
    return true;
  }

  function applyPhotosExtra() {
    const photos = FS.root.children.Photos;
    if (!photos?.children) return;
    for (const pic of loadPhotosExtra()) {
      if (!pic?.name || !pic?.src) continue;
      photos.children[pic.name] = {
        type: "img",
        name: pic.name,
        src: pic.src,
        body: pic.body || `Pixel Paint drawing\r\n`,
      };
    }
  }

  function uniqueChildName(parent, base, ext) {
    const children = parent.children || {};
    let name = ext ? `${base}${ext}` : base;
    let n = 1;
    while (children[name]) {
      n += 1;
      name = ext ? `${base}${n}${ext}` : `${base} (${n})`;
    }
    return name;
  }

  function addFsExtra(parentPath, entry) {
    const parent = resolvePath(parentPath)?.node;
    if (!parent || parent.type !== "folder") return null;
    if (!parent.children) parent.children = {};
    const toStore = { ...entry };
    if (entry.type === "folder") {
      toStore.children = {};
      entry.children = entry.children || {};
    }
    parent.children[entry.name] = entry;
    const extras = loadFsExtras();
    extras.push({ parentPath: [...parentPath], entry: toStore });
    if (!saveFsExtras(extras)) return null;
    Cloud()?.scheduleSave?.();
    return entry;
  }

  function saveDrawingToPhotos(dataUrl) {
    return saveImageToFolder(["Photos"], dataUrl, "drawing");
  }

  function loadImgExtras() {
    try {
      const raw = localStorage.getItem(IMG_EXTRAS_KEY);
      const list = raw ? JSON.parse(raw) : [];
      return Array.isArray(list) ? list : [];
    } catch (_) {
      return [];
    }
  }

  function saveImgExtras(list) {
    if (!trySetLocalStorage(IMG_EXTRAS_KEY, JSON.stringify(list))) {
      alertStorageFull("save image");
      return false;
    }
    return true;
  }

  function applyImgExtras() {
    for (const item of loadImgExtras()) {
      if (!item?.parentPath || !item?.name || !item?.src) continue;
      const parent = resolvePath(item.parentPath)?.node;
      if (!parent || parent.type !== "folder") continue;
      if (!parent.children) parent.children = {};
      parent.children[item.name] = {
        type: "img",
        name: item.name,
        src: item.src,
        body: item.body || "Saved image\r\n",
      };
    }
  }

  function loadAudioExtras() {
    try {
      const raw = localStorage.getItem(AUDIO_EXTRAS_KEY);
      const list = raw ? JSON.parse(raw) : [];
      return Array.isArray(list) ? list : [];
    } catch (_) {
      return [];
    }
  }

  function saveAudioExtras(list) {
    if (!trySetLocalStorage(AUDIO_EXTRAS_KEY, JSON.stringify(list))) {
      alertStorageFull("save audio");
      return false;
    }
    return true;
  }

  function applyAudioExtras() {
    for (const item of loadAudioExtras()) {
      if (!item?.parentPath || !item?.name || !item?.src) continue;
      const parent = resolvePath(item.parentPath)?.node;
      if (!parent || parent.type !== "folder") continue;
      if (!parent.children) parent.children = {};
      parent.children[item.name] = {
        type: "audio",
        name: item.name,
        src: item.src,
        body: item.body || "Audio track\r\n",
      };
    }
  }

  const STORE_INSTALLED_KEY = "archive-store-installed";
  const STORE_CONFIGS_KEY = "archive-store-configs";
  const STORE_FOLDER_PATHS_KEY = "archive-store-folder-paths";

  function readStoreInstalled() {
    try {
      const raw = localStorage.getItem(STORE_INSTALLED_KEY);
      const list = raw ? JSON.parse(raw) : [];
      return Array.isArray(list) ? list : [];
    } catch (_) {
      return [];
    }
  }

  function writeStoreInstalled(list) {
    try {
      localStorage.setItem(STORE_INSTALLED_KEY, JSON.stringify(list));
    } catch (_) {
      /* ignore */
    }
  }

  function readStoreConfigs() {
    try {
      const raw = localStorage.getItem(STORE_CONFIGS_KEY);
      const map = raw ? JSON.parse(raw) : {};
      return map && typeof map === "object" ? map : {};
    } catch (_) {
      return {};
    }
  }

  function writeStoreConfigs(map) {
    try {
      localStorage.setItem(STORE_CONFIGS_KEY, JSON.stringify(map));
    } catch (_) {
      /* ignore */
    }
  }

  function readStoreFolderPaths() {
    try {
      const raw = localStorage.getItem(STORE_FOLDER_PATHS_KEY);
      const map = raw ? JSON.parse(raw) : {};
      return map && typeof map === "object" ? map : {};
    } catch (_) {
      return {};
    }
  }

  function writeStoreFolderPaths(map) {
    try {
      localStorage.setItem(STORE_FOLDER_PATHS_KEY, JSON.stringify(map));
    } catch (_) {
      /* ignore */
    }
  }

  function getStoreGameFolderName(gameId) {
    const game = getStoreGames().find((g) => g.id === gameId);
    if (!game) return "";
    const paths = readStoreFolderPaths();
    return paths[gameId] || game.folder;
  }

  function findInstalledStoreGameFolder(gameId) {
    const games = FS.root.children.Games?.children;
    if (!games) return "";
    const preferred = getStoreGameFolderName(gameId);
    if (preferred && games[preferred]) return preferred;
    const game = getStoreGames().find((g) => g.id === gameId);
    if (game?.folder && games[game.folder]) return game.folder;
    for (const [name, node] of Object.entries(games)) {
      if (node?.type !== "folder") continue;
      const html = findHtmlInFolder(["Games", name]);
      if (html && game && html.body === game.html) return name;
    }
    return preferred || game?.folder || "";
  }

  function inferStoreGameId(folderPath) {
    const name = String(folderPath[folderPath.length - 1] || "").toLowerCase();
    const key = pathKey(folderPath).toLowerCase();
    for (const game of getStoreGames()) {
      const folder = getStoreGameFolderName(game.id).toLowerCase();
      if (!folder) continue;
      if (name === folder || name === game.id || name.includes(game.id) || folder.includes(name)) {
        return game.id;
      }
      if (key.endsWith(`/${folder}`) || key.endsWith(`/${game.id}`)) return game.id;
    }
    return "";
  }

  function inferAppIdFromFolder(folderPath) {
    const name = String(folderPath[folderPath.length - 1] || "").toLowerCase();
    const key = pathKey(folderPath).toLowerCase();
    for (const app of INSTALLABLE_APPS) {
      const folder = String(app.folder || "").toLowerCase();
      if (!folder) continue;
      if (name === folder || key.endsWith(`/${folder}`)) return app.id;
      if (name.includes(folder) || folder.includes(name)) return app.id;
    }
    if (/lightning|lightn|bolt/i.test(name)) return "lightning";
    if (/pixel\s*paint|pixelpaint/i.test(name)) return "pixel-paint";
    return "";
  }

  function findBatInFolder(folderPath) {
    const node = resolvePath(folderPath)?.node;
    if (!node?.children) return null;
    const bats = Object.values(node.children).filter((e) => e.type === "bat");
    if (!bats.length) return null;
    if (bats.length === 1) return bats[0];
    return (
      bats.find((b) => b.app) ||
      bats.find((b) => /^run/i.test(b.name || "")) ||
      bats[0]
    );
  }

  function storeGameHtmlEntry(gameId) {
    const game = getStoreGames().find((g) => g.id === gameId);
    if (!game) return null;
    return { type: "txt", name: "index.html", body: game.html };
  }

  function resolveBatLaunch(entry, folderPath) {
    const path = Array.isArray(folderPath) ? [...folderPath] : [];
    let appId = entry?.app || "";

    if (appId.startsWith("store:")) {
      const gameId = appId.slice(6);
      const htmlEntry = storeGameHtmlEntry(gameId);
      if (htmlEntry) return { mode: "html", htmlEntry };
    }

    if (!appId) {
      const folderBat = findBatInFolder(path);
      if (folderBat?.app) appId = folderBat.app;
    }
    if (!appId) appId = inferAppIdFromFolder(path);

    if (appId && !appId.startsWith("store:")) {
      return { mode: "app", appId };
    }

    let htmlEntry = null;
    if (entry?.html) {
      htmlEntry = resolvePath([...path, entry.html])?.node || null;
    }
    if (!htmlEntry) htmlEntry = findHtmlInFolder(path);

    const storeGameId = inferStoreGameId(path);
    if (!htmlEntry && storeGameId) {
      htmlEntry = storeGameHtmlEntry(storeGameId);
    }

    if (htmlEntry) return { mode: "html", htmlEntry };

    return { mode: "none" };
  }

  function folderHasLauncher(folderPath) {
    return !!(
      findBatInFolder(folderPath) ||
      findHtmlInFolder(folderPath) ||
      inferAppIdFromFolder(folderPath) ||
      inferStoreGameId(folderPath)
    );
  }

  function storeConfigBody(gameId, fallback) {
    const saved = readStoreConfigs()[gameId];
    return typeof saved === "string" && saved.trim() ? saved : fallback || "";
  }

  function parseSimpleIni(body) {
    const out = {};
    for (const line of String(body || "").split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith(";") || trimmed.startsWith("#") || trimmed.startsWith("[")) {
        continue;
      }
      const eq = trimmed.indexOf("=");
      if (eq < 0) continue;
      const key = trimmed.slice(0, eq).trim().toLowerCase();
      const raw = trimmed.slice(eq + 1).trim();
      const num = Number(raw);
      out[key] = raw !== "" && Number.isFinite(num) ? num : raw;
    }
    return out;
  }

  function injectGameConfig(html, configBody) {
    if (!configBody) return html;
    const cfg = parseSimpleIni(configBody);
    const tag = `<script>window.GAME_CFG=${JSON.stringify(cfg)};</script>`;
    if (/<head[^>]*>/i.test(html)) {
      return html.replace(/<head[^>]*>/i, (m) => `${m}${tag}`);
    }
    return tag + html;
  }

  function getStoreGames() {
    return Array.isArray(window.ARCHIVE_STORE_GAMES) ? window.ARCHIVE_STORE_GAMES : [];
  }

  function isAppInstalled(app) {
    if (!app) return false;
    return !!FS.root.children[app.parent]?.children?.[app.folder];
  }

  function installBuiltinApp(appId, opts = {}) {
    const app = INSTALLABLE_APPS.find((a) => a.id === appId);
    const template = BUILTIN_APP_TEMPLATES[appId];
    if (!app || !template) return false;
    const parent = FS.root.children[app.parent];
    if (!parent) return false;
    if (!parent.children) parent.children = {};
    parent.children[app.folder] = deepCloneFs(template);
    writeDeletedApps(readDeletedApps().filter((id) => id !== appId));
    if (appId === "text-generator") loadSavedConfigBody();
    if (appId === "pixel-paint") loadPaintConfigBody();
    if (!opts.silent) refreshOpenFolder([app.parent]);
    return true;
  }

  function installStoreGame(gameId, opts = {}) {
    const game = getStoreGames().find((g) => g.id === gameId);
    if (!game) return false;
    if (!FS.root.children.Games) {
      FS.root.children.Games = { type: "folder", name: "Games", children: {} };
    }
    const games = FS.root.children.Games;
    if (!games.children) games.children = {};
    const folderName = findInstalledStoreGameFolder(gameId) || game.folder;
    const prevCfg = games.children[folderName]?.children?.["config.ini"]?.body;
    const configBody = storeConfigBody(gameId, prevCfg || game.config);
    const launcherBat = { type: "bat", name: "run.bat", app: `store:${gameId}` };
    const required = {
      "run.bat": launcherBat,
      "config.ini": {
        type: "ini",
        name: "config.ini",
        body: configBody,
      },
      "index.html": {
        type: "txt",
        name: "index.html",
        body: game.html,
      },
      "readme.txt": {
        type: "txt",
        name: "readme.txt",
        body: `${game.name}\r\n\r\nEdit config.ini, then double-click run.bat.\r\n`,
      },
    };

    const existing = games.children[folderName];
    if (existing?.type === "folder") {
      if (!existing.children) existing.children = {};
      existing.name = folderName;
      for (const [fname, node] of Object.entries(required)) {
        if (!existing.children[fname]) existing.children[fname] = { ...node };
        else if (fname === "run.bat" && !existing.children[fname].app) {
          existing.children[fname].app = launcherBat.app;
        }
      }
    } else {
      games.children[folderName] = {
        type: "folder",
        name: folderName,
        children: { ...required },
      };
    }

    const paths = readStoreFolderPaths();
    paths[gameId] = folderName;
    writeStoreFolderPaths(paths);

    const installed = readStoreInstalled();
    if (!installed.includes(gameId)) {
      installed.push(gameId);
      writeStoreInstalled(installed);
    }
    if (!opts.silent) refreshOpenFolder(["Games"]);
    return true;
  }

  function installFromStore(appId, opts = {}) {
    if (INSTALLABLE_APPS.some((a) => a.id === appId)) {
      return installBuiltinApp(appId, opts);
    }
    return installStoreGame(appId, opts);
  }

  function applyStoreInstalled() {
    for (const id of readStoreInstalled()) {
      installStoreGame(id, { silent: true });
    }
  }

  applyStoreInstalled();

  function refreshAppStoreWindow() {
    const win = openWindows.get("app-store");
    const list = win?.querySelector(".app-store-list");
    if (!list) return;
    list.querySelectorAll(".app-store-row").forEach((row) => {
      const id = row.dataset.appId;
      const app = findManagedApp(id);
      const btn = row.querySelector("[data-install]");
      if (!btn || !app) return;
      const isIn = isAppInstalled(app);
      btn.textContent = isIn ? "Installed" : "Install";
      btn.disabled = isIn;
    });
  }

  function openAppStore() {
    closeStartMenu();
    if (openWindows.has("app-store")) {
      const existing = openWindows.get("app-store");
      existing.classList.remove("is-minimized");
      focusWindow(existing);
      refreshAppStoreWindow();
      return;
    }
    const wrap = document.createElement("div");
    wrap.className = "app-store";
    wrap.innerHTML = `
      <p class="app-store-intro">Install into My Files, then open the folder and run.bat</p>
      <div class="app-store-list"></div>
    `;
    const list = wrap.querySelector(".app-store-list");
    for (const app of managedApps()) {
      const row = document.createElement("div");
      row.className = "app-store-row";
      row.dataset.appId = app.id;
      const isIn = isAppInstalled(app);
      row.innerHTML = `
        <div class="app-store-meta">
          <strong></strong>
          <span></span>
        </div>
        <button type="button" class="win95-push" data-install></button>
      `;
      row.querySelector("strong").textContent = app.name;
      row.querySelector("span").textContent = app.blurb || "";
      const btn = row.querySelector("[data-install]");
      btn.textContent = isIn ? "Installed" : "Install";
      btn.disabled = isIn;
      btn.addEventListener("click", () => {
        if (installFromStore(app.id)) {
          btn.textContent = "Installed";
          btn.disabled = true;
          refreshStorageWindow();
        }
      });
      list.appendChild(row);
    }

    makeWindow({
      id: "app-store",
      title: "App Store",
      icon: "assets/store-icon.png",
      width: 420,
      height: 420,
      left: 100,
      top: 60,
      bodyHTML: wrap,
      bodyClass: "app-store-body",
    });
  }

  function saveImageToFolder(parentPath, dataUrl, baseName = "drawing") {
    const parent = resolvePath(parentPath)?.node;
    if (!parent || parent.type !== "folder") return null;
    if (!parent.children) parent.children = {};
    const name = uniqueChildName(parent, baseName, isGifSrc(dataUrl) ? ".gif" : ".bmp");
    const entry = {
      type: "img",
      name,
      src: dataUrl,
      body: "Saved image\r\n",
    };
    const list = loadImgExtras();
    list.push({
      parentPath: [...parentPath],
      name,
      src: dataUrl,
      body: entry.body,
    });
    if (!saveImgExtras(list)) {
      return null;
    }
    if (parentPath.length === 1 && parentPath[0] === "Photos") {
      const photos = loadPhotosExtra();
      photos.push({ name, src: dataUrl, body: entry.body });
      if (!savePhotosExtra(photos)) {
        list.pop();
        saveImgExtras(list);
        return null;
      }
    }
    parent.children[name] = entry;
    Cloud()?.scheduleSave?.();
    return entry;
  }

  async function prepareImageForStorage(dataUrl, opts = {}) {
    const maxBytes = opts.maxBytes || 650000;
    if (!dataUrl || typeof dataUrl !== "string") return "";
    if (isGifSrc(dataUrl)) {
      if (dataUrl.length <= maxBytes * 2) return dataUrl;
      return "";
    }
    return mediaToShareableSrc(dataUrl, { maxWidth: opts.maxWidth || 1280, maxBytes });
  }

  function saveAudioToFolder(parentPath, dataUrl, baseName = "track") {
    const parent = resolvePath(parentPath)?.node;
    if (!parent || parent.type !== "folder") return null;
    if (!parent.children) parent.children = {};
    const name = uniqueChildName(parent, baseName, ".mp3");
    const entry = {
      type: "audio",
      name,
      src: dataUrl,
      body: "Uploaded audio\r\n",
    };
    parent.children[name] = entry;
    const list = loadAudioExtras();
    list.push({
      parentPath: [...parentPath],
      name,
      src: dataUrl,
      body: entry.body,
    });
    if (!saveAudioExtras(list)) return null;
    Cloud()?.scheduleSave?.();
    return entry;
  }

  function getChromeMemoryMB() {
    const mem = performance && performance.memory;
    let heap = 0;
    if (mem && typeof mem.usedJSHeapSize === "number") {
      heap = mem.usedJSHeapSize / (1024 * 1024);
    } else {
      heap = 80 + openWindows.size * 12;
    }
    // Installed programs contribute to the monitored load (deleting frees power)
    const apps = installedApps().reduce((sum, app) => sum + (app.memMB || 0), 0);
    // Open windows / canvases add a little extra (closer to Chrome tab process usage)
    const live = openWindows.size * 6 + document.querySelectorAll("canvas").length * 10;
    return heap + apps + live;
  }

  function getChromeMemoryLimitMB() {
    const mem = performance && performance.memory;
    if (mem && typeof mem.jsHeapSizeLimit === "number" && mem.jsHeapSizeLimit > 0) {
      return Math.max(mem.jsHeapSizeLimit / (1024 * 1024), MEMORY_WARN_MB + 200);
    }
    return 1024;
  }

  function installedApps() {
    return managedApps().filter((app) => isAppInstalled(app));
  }

  function deleteApp(appId) {
    const app = findManagedApp(appId);
    if (!app) return;
    closeLinkedSession(appId);
    const parent = FS.root.children[app.parent];
    if (parent?.children?.[app.folder]) delete parent.children[app.folder];
    for (const key of app.storageKeys || []) {
      try {
        localStorage.removeItem(key);
      } catch (_) {
        /* ignore */
      }
    }
    if (app.fromStore) {
      writeStoreInstalled(readStoreInstalled().filter((id) => id !== appId));
    } else {
      const deleted = readDeletedApps();
      if (!deleted.includes(appId)) {
        deleted.push(appId);
        writeDeletedApps(deleted);
      }
    }
    if (appId === "bg-changer") applyDesktopWallpaper();
    if (appId === "desktop-pet") destroyDesktopPet();
    Cloud()?.scheduleSave?.();
    // Close folder windows so listings stay accurate
    windowLayer?.querySelectorAll(".win95-window").forEach((w) => {
      if (w.dataset.winId?.startsWith("folder:")) w._closeWin?.();
    });
    refreshStorageWindow();
    refreshAppStoreWindow();
  }

  function storageBodyHTML() {
    return `
      <div class="storage-label-row">
        <span>Memory usage</span>
        <span id="storageMemText">—</span>
      </div>
      <div class="storage-bar-track" aria-hidden="true">
        <div class="storage-bar-fill" id="storageBarFill"></div>
      </div>
      <p class="storage-hint">Chrome heap + installed programs.</p>
      <p class="storage-section-title">Installed programs</p>
      <div class="storage-list" id="storageAppList"></div>
    `;
  }

  function refreshStorageWindow() {
    const fill = document.getElementById("storageBarFill");
    const text = document.getElementById("storageMemText");
    const list = document.getElementById("storageAppList");
    if (!fill && !text && !list) return;

    const used = getChromeMemoryMB();
    const limit = getChromeMemoryLimitMB();
    const pct = Math.max(0, Math.min(100, (used / Math.max(limit, 1)) * 100));
    if (fill) {
      fill.style.width = `${pct}%`;
      fill.classList.toggle("is-warn", used >= MEMORY_WARN_MB);
    }
    if (text) {
      text.textContent = `${used.toFixed(0)} MB / ${limit.toFixed(0)} MB`;
    }
    if (list) {
      const apps = installedApps();
      if (!apps.length) {
        list.innerHTML = `<p class="storage-empty">No tools or games installed.</p>`;
      } else {
        list.innerHTML = apps
          .map(
            (app) => `
          <div class="storage-row" data-app="${app.id}">
            <span class="storage-row-kind">${app.kind}</span>
            <span class="storage-row-name">${app.name}</span>
            <button type="button" class="win95-push" data-delete-app="${app.id}">Delete</button>
          </div>`
          )
          .join("");
      }
    }
  }

  function openStorageWindow() {
    closeStartMenu();
    makeWindow({
      id: "storage-monitor",
      title: "Storage",
      width: 380,
      height: 340,
      left: 120,
      top: 70,
      bodyClass: "storage-body",
      bodyHTML: storageBodyHTML(),
      onClose: () => {
        if (storagePollTimer) {
          window.clearInterval(storagePollTimer);
          storagePollTimer = 0;
        }
      },
    });
    const existing = openWindows.get("storage-monitor");
    const body = existing?.querySelector(".win95-body");
    if (body && !body.querySelector("#storageBarFill")) {
      body.className = "win95-body storage-body";
      body.innerHTML = storageBodyHTML();
    }
    refreshStorageWindow();
    if (storagePollTimer) window.clearInterval(storagePollTimer);
    storagePollTimer = window.setInterval(() => {
      refreshStorageWindow();
    }, 1000);
  }

  function resolvePath(parts) {
    let node = FS.root;
    const trail = ["My Files"];
    for (const part of parts) {
      if (!node.children?.[part]) return null;
      node = node.children[part];
      trail.push(part);
    }
    return { node, trail };
  }

  function folderGlyph(entry) {
    if (entry.type === "folder") return "📁";
    if (entry.type === "bat") return "⚙️";
    if (entry.type === "img") return "🖼️";
    if (entry.type === "audio") return "🎵";
    if (entry.type === "txt" || entry.type === "ini") return "📄";
    return "📑";
  }

  function folderGlyphHTML(entry) {
    if (entry.type === "img" && entry.src) {
      return `<img src="${entry.src}" alt="" width="28" height="28" />`;
    }
    if (entry.type === "bat") {
      const key = entry._pathKey;
      const custom = key ? getBatIcon(key) : null;
      if (custom) return `<img src="${custom}" alt="" width="28" height="28" />`;
    }
    return folderGlyph(entry);
  }

  function openTextFile(entry) {
    if (entry.type === "img" && entry.src) {
      openImageViewer(entry);
      return;
    }
    if (entry.type === "ini" && entry.name === "config.ini" && entry === getTextGenConfigEntry()) {
      openConfigEditor(entry);
      return;
    }
    const wrap = document.createElement("div");
    wrap.className = "ini-editor";
    wrap.innerHTML = `
      <textarea class="ini-textarea" spellcheck="false"></textarea>
      <div class="ini-actions">
        <button type="button" class="ini-save">Save</button>
        <span class="ini-status"></span>
      </div>
    `;
    const area = wrap.querySelector(".ini-textarea");
    const status = wrap.querySelector(".ini-status");
    area.value = entry.body || "";
    wrap.querySelector(".ini-save").addEventListener("click", () => {
      entry.body = area.value;
      const parentPath = Array.isArray(entry._folderPath) ? [...entry._folderPath] : [];
      if (!upsertFsEntry(parentPath, entry)) {
        status.textContent = "Save failed — storage full.";
        return;
      }
      if (entry === getPaintConfigEntry() || (entry.name === "config.ini" && /grid_transparency/i.test(entry.body))) {
        try {
          localStorage.setItem(PAINT_CONFIG_KEY, entry.body);
        } catch (_) {
          /* ignore */
        }
        const paintEntry = getPaintConfigEntry();
        if (paintEntry && paintEntry !== entry) paintEntry.body = entry.body;
      }
      // Persist App Store game configs
      for (const g of getStoreGames()) {
        const cfg = FS.root.children.Games?.children?.[g.folder]?.children?.["config.ini"];
        if (cfg === entry) {
          const map = readStoreConfigs();
          map[g.id] = entry.body;
          writeStoreConfigs(map);
          break;
        }
      }
      status.textContent = "Saved.";
      window.setTimeout(() => {
        status.textContent = "";
      }, 1600);
    });
    makeWindow({
      id: `file:${entry.name}:${Math.random().toString(36).slice(2, 7)}`,
      title: `Notepad - ${entry.name}`,
      width: 480,
      height: 340,
      bodyHTML: wrap,
      bodyClass: "ini-body",
    });
  }

  function openImageViewer(entry) {
    const wrap = document.createElement("div");
    wrap.className = "img-viewer";
    wrap.innerHTML = `<img alt="" /><p class="img-viewer-name"></p>`;
    const img = wrap.querySelector("img");
    img.src = entry.src;
    wrap.querySelector(".img-viewer-name").textContent = entry.name;
    makeWindow({
      id: `img:${entry.name}`,
      title: entry.name,
      width: 320,
      height: 300,
      bodyHTML: wrap,
      bodyClass: "img-viewer-body",
    });
  }

  function openConfigEditor(entry) {
    const wrap = document.createElement("div");
    wrap.className = "ini-editor";
    wrap.innerHTML = `
      <textarea class="ini-textarea" spellcheck="false"></textarea>
      <div class="ini-actions">
        <button type="button" class="ini-save">Save</button>
        <span class="ini-status"></span>
      </div>
    `;
    const area = wrap.querySelector(".ini-textarea");
    const status = wrap.querySelector(".ini-status");
    area.value = entry.body || loadSavedConfigBody();

    wrap.querySelector(".ini-save").addEventListener("click", () => {
      entry.body = area.value;
      try {
        localStorage.setItem(CONFIG_STORAGE_KEY, entry.body);
      } catch (_) {
        /* ignore */
      }
      const parentPath = Array.isArray(entry._folderPath)
        ? [...entry._folderPath]
        : ["Tools", "Text Generator"];
      upsertFsEntry(parentPath, entry);
      if (typeof window.applyTextGenConfig === "function") {
        window.applyTextGenConfig(entry.body);
      }
      status.textContent = "Saved — used as Text Generator start settings.";
      window.setTimeout(() => {
        status.textContent = "";
      }, 2200);
    });

    makeWindow({
      id: "file:config.ini",
      title: "Notepad - config.ini",
      width: 480,
      height: 360,
      bodyHTML: wrap,
      bodyClass: "ini-body",
    });
  }

  const DESKTOP_SHORTCUTS_KEY = "archive-desktop-shortcuts";
  const BAT_ICONS_KEY = "archive-bat-icons";
  const GRID_W = 90;
  const GRID_H = 86;
  const GRID_PAD = 10;

  function pathKey(parts) {
    return parts.join("/");
  }

  function loadBatIcons() {
    try {
      const raw = localStorage.getItem(BAT_ICONS_KEY);
      const obj = raw ? JSON.parse(raw) : {};
      return obj && typeof obj === "object" ? obj : {};
    } catch (_) {
      return {};
    }
  }

  function saveBatIcons(map) {
    try {
      localStorage.setItem(BAT_ICONS_KEY, JSON.stringify(map));
    } catch (_) {
      /* ignore */
    }
  }

  function getBatIcon(key) {
    if (key.includes("Profile")) return getProfileIconSrc();
    const custom = loadBatIcons()[key] || null;
    if (custom) return custom;
    if (key.includes("Pixel Paint")) return "assets/paint-icon.png";
    if (key.includes("Social Media")) return "assets/social-media-icon.svg";
    if (key.includes("Music Player")) return "assets/music-player-icon.svg";
    if (key.includes("Terminal")) return "assets/terminal-icon.svg";
    if (key.includes("Wikipedia")) return "assets/wikipedia-icon.svg";
    return null;
  }

  function setBatIcon(key, src) {
    const map = loadBatIcons();
    if (src) map[key] = src;
    else delete map[key];
    saveBatIcons(map);
  }

  function defaultDesktopShortcuts() {
    return [
      {
        id: "files",
        kind: "files",
        label: "My Files",
        col: 0,
        row: 0,
      },
      {
        id: "sc_profile",
        kind: "bat",
        path: ["Tools", "Profile", "run.bat"],
        label: "Profile",
        col: 1,
        row: 0,
      },
      {
        id: "sc_social",
        kind: "bat",
        path: ["Tools", "Social Media", "run.bat"],
        label: "Social Media",
        col: 2,
        row: 0,
      },
    ];
  }

  function ensureBuiltinDesktopShortcuts() {
    const builtins = [
      { id: "sc_profile", path: ["Tools", "Profile", "run.bat"], label: "Profile", col: 1, row: 0 },
      { id: "sc_social", path: ["Tools", "Social Media", "run.bat"], label: "Social Media", col: 2, row: 0 },
    ];
    let changed = false;
    for (const b of builtins) {
      if (!resolvePath(b.path.slice(0, -1))?.node) continue;
      const key = pathKey(b.path);
      const exists = desktopShortcuts.some((s) => s.kind === "bat" && pathKey(s.path || []) === key);
      if (!exists) {
        desktopShortcuts.push({
          id: b.id,
          kind: "bat",
          path: [...b.path],
          label: b.label,
          col: b.col,
          row: b.row,
        });
        changed = true;
      }
    }
    if (changed) {
      saveDesktopShortcuts(desktopShortcuts);
      renderDesktopIcons();
    }
  }

  function loadDesktopShortcuts() {
    try {
      const raw = localStorage.getItem(DESKTOP_SHORTCUTS_KEY);
      if (!raw) return defaultDesktopShortcuts();
      const list = JSON.parse(raw);
      if (!Array.isArray(list) || !list.length) return defaultDesktopShortcuts();
      if (!list.some((s) => s.kind === "files" || s.id === "files")) {
        list.unshift(defaultDesktopShortcuts()[0]);
      }
      return list;
    } catch (_) {
      return defaultDesktopShortcuts();
    }
  }

  function saveDesktopShortcuts(list) {
    try {
      localStorage.setItem(DESKTOP_SHORTCUTS_KEY, JSON.stringify(list));
    } catch (_) {
      /* ignore */
    }
  }

  let desktopShortcuts = loadDesktopShortcuts();
  let deskDrag = null;
  let deskDidDrag = false;
  let ctxTarget = null;
  let customiseTarget = null;
  let customisePendingSrc = null;
  let pickerMode = null; // "icon" when choosing icon image

  function snapCol(x) {
    return Math.max(0, Math.round((x - GRID_PAD) / GRID_W));
  }

  function snapRow(y) {
    return Math.max(0, Math.round((y - GRID_PAD) / GRID_H));
  }

  function cellToPos(col, row) {
    return { left: GRID_PAD + col * GRID_W, top: GRID_PAD + row * GRID_H };
  }

  function nextFreeCell() {
    const used = new Set(desktopShortcuts.map((s) => `${s.col},${s.row}`));
    for (let row = 0; row < 12; row += 1) {
      for (let col = 0; col < 10; col += 1) {
        const key = `${col},${row}`;
        if (!used.has(key)) return { col, row };
      }
    }
    return { col: 0, row: desktopShortcuts.length };
  }

  function resolveShortcutEntry(sc) {
    if (!sc?.path?.length) return null;
    return resolvePath(sc.path)?.node || null;
  }

  function isSocialShortcut(sc) {
    return sc?.id === "sc_social" || (sc?.kind === "bat" && sc?.label === "Social Media");
  }

  function playMailSound() {
    try {
      if (!mailAudio) mailAudio = new Audio("assets/yougotmail.mp3");
      applyVolumeToAudio(mailAudio);
      mailAudio.currentTime = 0;
      mailAudio.play().catch(() => {});
    } catch (_) {
      /* ignore */
    }
  }

  function showMailToast(message) {
    const toast = document.getElementById("mailToast");
    const body = document.getElementById("mailToastBody");
    if (!toast || !body) return;
    body.textContent = message || "You've got mail!";
    toast.hidden = false;
    playMailSound();
    window.clearTimeout(mailToastTimer);
    mailToastTimer = window.setTimeout(() => {
      toast.hidden = true;
    }, 9000);
  }

  function hideMailToast() {
    const toast = document.getElementById("mailToast");
    if (toast) toast.hidden = true;
    window.clearTimeout(mailToastTimer);
  }

  function updateSocialDesktopBadge() {
    const badge = deskIcons?.querySelector("[data-social-badge]");
    if (!badge) return;
    badge.hidden = socialNotifTotal <= 0;
  }

  function startSocialNotifications() {
    if (socialNotifUnsub) {
      socialNotifUnsub();
      socialNotifUnsub = null;
    }
    const Social = window.ArchiveSocial;
    if (!Social?.listenNotifications || !Cloud()?.getSession?.()) {
      socialNotifTotal = 0;
      updateSocialDesktopBadge();
      return;
    }
    socialNotifUnsub = Social.listenNotifications(
      (info) => {
        socialNotifTotal = info?.total || 0;
        updateSocialDesktopBadge();
      },
      (alert) => {
        if (!alert?.text) return;
        showMailToast(alert.text);
      }
    );
  }

  function shortcutGlyphEmoji(sc) {
    if (sc.kind === "files") return "📁";
    if (sc.kind === "bat") return "⚙️";
    if (sc.kind === "folder") return "📁";
    if (sc.kind === "img") return "🖼️";
    return "📑";
  }

  function shortcutIconSrc(sc) {
    if (sc.kind === "bat") {
      if (sc.id === "sc_profile" || sc.label === "Profile") return getProfileIconSrc();
      return getBatIcon(pathKey(sc.path || []));
    }
    if (sc.kind === "img") {
      return resolveShortcutEntry(sc)?.src || null;
    }
    return null;
  }

  function fillDeskIconGlyph(glyph, sc) {
    glyph.textContent = "";
    const src = shortcutIconSrc(sc);
    if (src) {
      const img = document.createElement("img");
      img.alt = "";
      img.src = src;
      if (sc.id === "sc_profile" || sc.label === "Profile") {
        img.onerror = () => {
          img.onerror = null;
          img.src = "assets/profile-icon.svg";
        };
      }
      glyph.appendChild(img);
      return;
    }
    glyph.textContent = shortcutGlyphEmoji(sc);
  }

  function shortcutGlyphHTML(sc) {
    const src = shortcutIconSrc(sc);
    if (src) return `<img src="${src.replace(/"/g, "&quot;")}" alt="" />`;
    return shortcutGlyphEmoji(sc);
  }

  function renderDesktopIcons() {
    if (!deskIcons) return;
    deskIcons.innerHTML = "";
    for (const sc of desktopShortcuts) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "desk-icon";
      btn.dataset.scId = sc.id;
      btn.title = sc.label;
      const pos = cellToPos(sc.col ?? 0, sc.row ?? 0);
      btn.style.left = `${pos.left}px`;
      btn.style.top = `${pos.top}px`;
      btn.innerHTML = `
        <span class="desk-icon-glyph" aria-hidden="true"></span>
        ${isSocialShortcut(sc) ? '<span class="desk-icon-badge" data-social-badge hidden></span>' : ""}
        <span class="desk-icon-label"></span>
      `;
      fillDeskIconGlyph(btn.querySelector(".desk-icon-glyph"), sc);
      btn.querySelector(".desk-icon-label").textContent = sc.label;
      deskIcons.appendChild(btn);
    }
    updateSocialDesktopBadge();
  }

  function openShortcut(sc) {
    if (!sc) return;
    if (sc.kind === "files") {
      openFolderWindow([]);
      return;
    }
    const entry = resolveShortcutEntry(sc);
    if (!entry) return;
    if (entry.type === "folder") openFolderWindow(sc.path);
    else if (entry.type === "bat") {
      entry._folderPath = sc.path.slice(0, -1);
      entry._pathKey = pathKey(sc.path);
      runBat(entry);
    }
    else if (entry.type === "img") openImageViewer(entry);
    else openTextFile(entry);
  }

  function addDesktopShortcutFromPath(parts, entry) {
    if (!entry) return null;
    if (entry.type !== "folder" && entry.type !== "bat" && entry.type !== "img") return null;
    const key = pathKey(parts);
    const existing = desktopShortcuts.find(
      (s) => s.kind === entry.type && pathKey(s.path || []) === key
    );
    if (existing) {
      renderDesktopIcons();
      return existing;
    }
    const cell = nextFreeCell();
    const sc = {
      id: `sc_${Date.now().toString(36)}`,
      kind: entry.type,
      path: [...parts],
      label: entry.name,
      col: cell.col,
      row: cell.row,
    };
    desktopShortcuts.push(sc);
    saveDesktopShortcuts(desktopShortcuts);
    renderDesktopIcons();
    return sc;
  }

  function hideDeskCtx() {
    const ctx = document.getElementById("deskCtx");
    if (ctx) ctx.hidden = true;
    ctxTarget = null;
  }

  function looksLikeHtml(entry) {
    if (!entry) return false;
    const name = (entry.name || "").toLowerCase();
    if (name.endsWith(".html") || name.endsWith(".htm")) return true;
    const body = entry.body || "";
    return /<!DOCTYPE\s+html/i.test(body) || /<html[\s>]/i.test(body) || /<body[\s>]/i.test(body);
  }

  function openInTab(entry, folderPath) {
    if (!entry) return;
    let html = entry.body || "";
    const path =
      folderPath ||
      (Array.isArray(entry._folderPath) ? entry._folderPath : null) ||
      (entry._pathKey
        ? entry._pathKey.split("/").slice(0, -1)
        : null);
    if (path && path.length) {
      const cfg = resolvePath([...path, "config.ini"])?.node;
      if (cfg?.body) html = injectGameConfig(html, cfg.body);
    }
    const wrap = document.createElement("div");
    wrap.className = "html-tab";
    const frame = document.createElement("iframe");
    frame.className = "html-tab-frame";
    frame.title = entry.name || "Tab";
    frame.setAttribute("sandbox", "allow-scripts allow-forms allow-modals allow-popups allow-same-origin");
    // srcdoc runs HTML inside the tab
    frame.srcdoc = html.includes("<html") || html.includes("<!DOCTYPE")
      ? html
      : `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:sans-serif;margin:1rem;}</style></head><body>${html}</body></html>`;
    wrap.appendChild(frame);
    makeWindow({
      id: `tab:${entry.name}:${Math.random().toString(36).slice(2, 7)}`,
      title: entry.name || "Tab",
      icon: "assets/tab-icon.png",
      width: 560,
      height: 420,
      bodyHTML: wrap,
      bodyClass: "html-tab-body",
    });
  }

  function showDeskCtx(x, y, target) {
    const ctx = document.getElementById("deskCtx");
    if (!ctx) return;
    ctxTarget = target;
    const customise = ctx.querySelector('[data-ctx="customise"]');
    const newFolder = ctx.querySelector('[data-ctx="new-folder"]');
    const newDoc = ctx.querySelector('[data-ctx="new-doc"]');
    const newHtml = ctx.querySelector('[data-ctx="new-html"]');
    const newBat = ctx.querySelector('[data-ctx="new-bat"]');
    const uploadFiles = ctx.querySelector('[data-ctx="upload-files"]');
    const openDoc = ctx.querySelector('[data-ctx="open-doc"]');
    const openTab = ctx.querySelector('[data-ctx="open-tab"]');
    const renameBtn = ctx.querySelector('[data-ctx="rename"]');
    const deleteBtn = ctx.querySelector('[data-ctx="delete"]');
    const isBat = target?.kind === "bat";
    const isFolderBg = target?.kind === "folder-bg";
    const isDoc = target?.kind === "doc";
    const isFolder = target?.kind === "folder";
    const isImg = target?.kind === "img";
    const isAudio = target?.kind === "audio";
    const canRename = isBat || isDoc || isFolder || isImg || isAudio;
    const canDelete = canRename;
    const canTab = isDoc && looksLikeHtml(target?.entry);
    if (customise) customise.hidden = !isBat;
    if (newFolder) newFolder.hidden = !isFolderBg;
    if (newDoc) newDoc.hidden = !isFolderBg;
    if (newHtml) newHtml.hidden = !isFolderBg;
    if (newBat) newBat.hidden = !isFolderBg;
    if (uploadFiles) uploadFiles.hidden = !isFolderBg;
    if (openDoc) openDoc.hidden = !isDoc;
    if (openTab) openTab.hidden = !canTab;
    if (renameBtn) renameBtn.hidden = !canRename;
    if (deleteBtn) deleteBtn.hidden = !canDelete;
    if (!isBat && !isFolderBg && !isDoc && !isFolder && !isImg && !isAudio) {
      ctx.hidden = true;
      return;
    }
    ctx.hidden = false;
    ctx.style.left = `${Math.min(x, window.innerWidth - 170)}px`;
    ctx.style.top = `${Math.min(y, window.innerHeight - 140)}px`;
  }

  function renameFsEntry(parentPath, oldName, newName) {
    const parent = resolvePath(parentPath)?.node;
    if (!parent?.children?.[oldName]) return false;
    const clean = String(newName || "")
      .trim()
      .replace(/[\\/:*?"<>|]/g, "");
    if (!clean || clean === oldName) return false;
    if (parent.children[clean]) {
      window.alert(`A file named "${clean}" already exists.`);
      return false;
    }
    const entry = parent.children[oldName];
    delete parent.children[oldName];
    entry.name = clean;
    parent.children[clean] = entry;

    const oldPath = [...parentPath, oldName];
    const newPath = [...parentPath, clean];
    const oldKey = pathKey(oldPath);
    const newKey = pathKey(newPath);

    // bat icons
    const icons = loadBatIcons();
    if (icons[oldKey]) {
      icons[newKey] = icons[oldKey];
      delete icons[oldKey];
      saveBatIcons(icons);
    }

    // desktop shortcuts
    let scChanged = false;
    for (const sc of desktopShortcuts) {
      if (!sc.path?.length) continue;
      if (pathKey(sc.path) === oldKey) {
        sc.path = [...newPath];
        sc.label = clean;
        scChanged = true;
      } else if (sc.path[0] === oldName && parentPath.length === 0) {
        sc.path[0] = clean;
        if (sc.label === oldName) sc.label = clean;
        scChanged = true;
      } else {
        for (let i = 0; i < sc.path.length; i += 1) {
          if (pathKey(sc.path.slice(0, i + 1)) === oldKey) {
            sc.path[i] = clean;
            scChanged = true;
            break;
          }
        }
      }
    }
    if (scChanged) {
      saveDesktopShortcuts(desktopShortcuts);
      renderDesktopIcons();
    }

    // fs extras
    const extras = loadFsExtras();
    let extrasChanged = false;
    for (const item of extras) {
      if (pathKey(item.parentPath || []) === pathKey(parentPath) && item.entry?.name === oldName) {
        item.entry.name = clean;
        extrasChanged = true;
      }
      // rename path segments for nested extras
      if (Array.isArray(item.parentPath)) {
        for (let i = 0; i < item.parentPath.length; i += 1) {
          if (pathKey(item.parentPath.slice(0, i + 1)) === oldKey) {
            item.parentPath[i] = clean;
            extrasChanged = true;
          }
        }
      }
    }
    if (extrasChanged) saveFsExtras(extras);

    // img extras
    const imgs = loadImgExtras();
    let imgsChanged = false;
    for (const item of imgs) {
      if (pathKey(item.parentPath || []) === pathKey(parentPath) && item.name === oldName) {
        item.name = clean;
        imgsChanged = true;
      }
      if (Array.isArray(item.parentPath)) {
        for (let i = 0; i < item.parentPath.length; i += 1) {
          if (pathKey(item.parentPath.slice(0, i + 1)) === oldKey) {
            item.parentPath[i] = clean;
            imgsChanged = true;
          }
        }
      }
    }
    if (imgsChanged) saveImgExtras(imgs);

    // photos extra list
    if (parentPath.length === 1 && parentPath[0] === "Photos") {
      const photos = loadPhotosExtra();
      let pChanged = false;
      for (const pic of photos) {
        if (pic.name === oldName) {
          pic.name = clean;
          pChanged = true;
        }
      }
      if (pChanged) savePhotosExtra(photos);
    }

    if (parentPath.length === 1 && parentPath[0] === "Games") {
      const paths = readStoreFolderPaths();
      let pathsChanged = false;
      for (const gameId of readStoreInstalled()) {
        const current = paths[gameId] || getStoreGames().find((g) => g.id === gameId)?.folder;
        if (current === oldName) {
          paths[gameId] = clean;
          pathsChanged = true;
        }
      }
      if (pathsChanged) writeStoreFolderPaths(paths);
    }

    refreshOpenFolder(parentPath);
    Cloud()?.scheduleSave?.();
    return true;
  }

  function promptRename(target) {
    if (!target?.path?.length) return;
    const oldName = target.path[target.path.length - 1];
    const parentPath = target.path.slice(0, -1);
    const next = window.prompt("Rename to:", oldName);
    if (next == null) return;
    renameFsEntry(parentPath, oldName, next);
  }

  function refreshOpenFolder(pathParts) {
    const id = `folder:${(pathParts || []).join("/") || "root"}`;
    if (openWindows.has(id)) {
      destroyWindow(id);
      openFolderWindow(pathParts || []);
    }
  }

  function createNewFolder(parentPath) {
    const parent = resolvePath(parentPath)?.node;
    if (!parent) return;
    const name = uniqueChildName(parent, "New Folder", "");
    addFsExtra(parentPath, { type: "folder", name, children: {} });
    refreshOpenFolder(parentPath);
  }

  function createNewDocument(parentPath) {
    const parent = resolvePath(parentPath)?.node;
    if (!parent) return;
    const name = uniqueChildName(parent, "New Document", ".txt");
    addFsExtra(parentPath, {
      type: "txt",
      name,
      body: "",
    });
    refreshOpenFolder(parentPath);
    const entry = parent.children[name];
    if (entry) openTextFile(entry);
  }

  // Also allow .html docs from context (same as document, different extension via prompt)
  function createNewHtmlDocument(parentPath) {
    const parent = resolvePath(parentPath)?.node;
    if (!parent) return;
    const name = uniqueChildName(parent, "page", ".html");
    addFsExtra(parentPath, {
      type: "txt",
      name,
      body:
        "<!DOCTYPE html>\n<html>\n<head>\n<meta charset=\"utf-8\" />\n<title>Page</title>\n<style>body{font-family:sans-serif;padding:1rem;}</style>\n</head>\n<body>\n<h1>Hello</h1>\n<p>Edit this document, then right-click → Open in Tab.</p>\n</body>\n</html>\n",
    });
    refreshOpenFolder(parentPath);
    const entry = parent.children[name];
    if (entry) openTextFile(entry);
  }

  function createNewBat(parentPath) {
    const parent = resolvePath(parentPath)?.node;
    if (!parent) return;
    const name = uniqueChildName(parent, "run", ".bat");
    addFsExtra(parentPath, {
      type: "bat",
      name,
    });
    refreshOpenFolder(parentPath);
  }

  function defaultDropPathForFile(file) {
    const name = file.name || "";
    if (file.type.startsWith("image/")) return ["Photos"];
    if (file.type.startsWith("audio/") || /\.(mp3|wav|ogg|m4a|aac|flac)$/i.test(name)) {
      return ["Music"];
    }
    return [];
  }

  function wireFsDropTarget(el, parentPath) {
    if (!el) return;
    const path = [...parentPath];
    const onDrag = (e) => {
      if (![...e.dataTransfer.types].includes("Files")) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
      el.classList.add("is-file-drop");
    };
    el.addEventListener("dragenter", onDrag);
    el.addEventListener("dragover", onDrag);
    el.addEventListener("dragleave", (e) => {
      if (el.contains(e.relatedTarget)) return;
      el.classList.remove("is-file-drop");
    });
    el.addEventListener("drop", (e) => {
      el.classList.remove("is-file-drop");
      const files = [...e.dataTransfer.files];
      if (!files.length) return;
      e.preventDefault();
      e.stopPropagation();
      uploadFilesToFolder(path, files);
    });
  }

  function uploadFilesToFolder(parentPath, fileList) {
    const files = [...fileList];
    if (!files.length) return;
    const refreshPaths = new Set();
    let done = 0;
    const finish = (targetPath) => {
      if (targetPath) refreshPaths.add(pathKey(targetPath));
      done += 1;
      if (done >= files.length) {
        for (const key of refreshPaths) {
          refreshOpenFolder(key ? key.split("/") : []);
        }
      }
    };
    for (const file of files) {
      const targetPath = parentPath.length ? [...parentPath] : defaultDropPathForFile(file);
      const name = file.name || "upload";
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = async () => {
          let dataUrl = reader.result;
          const prepared = await prepareImageForStorage(dataUrl);
          if (!prepared) {
            window.alert(
              isGifSrc(dataUrl)
                ? "That GIF is too large to save. Try a smaller file."
                : "That image is too large to save. Try a smaller file."
            );
            finish(targetPath);
            return;
          }
          dataUrl = prepared;
          const base =
            name
              .replace(/\.[^.]+$/, "")
              .replace(/[\\/:*?"<>|]/g, "")
              .slice(0, 32) || "upload";
          const entry = saveImageToFolder(targetPath, dataUrl, base);
          if (!entry) alertStorageFull("save image");
          finish(targetPath);
        };
        reader.onerror = () => finish(targetPath);
        reader.readAsDataURL(file);
      } else if (
        file.type.startsWith("text/") ||
        /\.(txt|html|htm|ini|md|json|csv|xml|js|css)$/i.test(name)
      ) {
        const reader = new FileReader();
        reader.onload = () => {
          const extMatch = name.match(/(\.[^.]+)$/);
          const ext = extMatch ? extMatch[1].toLowerCase() : ".txt";
          const base =
            name
              .replace(/\.[^.]+$/, "")
              .replace(/[\\/:*?"<>|]/g, "")
              .slice(0, 32) || "upload";
          const parent = resolvePath(targetPath)?.node;
          if (parent) {
            const entryName = uniqueChildName(parent, base, ext);
            addFsExtra(targetPath, {
              type: ext === ".ini" ? "ini" : "txt",
              name: entryName,
              body: String(reader.result || ""),
            });
          }
          finish(targetPath);
        };
        reader.onerror = () => finish(targetPath);
        reader.readAsText(file);
      } else if (file.type.startsWith("audio/") || /\.(mp3|wav|ogg|m4a|aac|flac)$/i.test(name)) {
        const reader = new FileReader();
        reader.onload = () => {
          const base =
            name
              .replace(/\.[^.]+$/, "")
              .replace(/[\\/:*?"<>|]/g, "")
              .slice(0, 32) || "track";
          saveAudioToFolder(targetPath, reader.result, base);
          finish(targetPath);
        };
        reader.onerror = () => finish(targetPath);
        reader.readAsDataURL(file);
      } else {
        window.alert(`"${name}" is not supported. Upload images, audio, or text files.`);
        finish(targetPath);
      }
    }
  }

  function openFolderUpload(parentPath) {
    pendingUploadPath = [...parentPath];
    const input = document.getElementById("fsUploadInput");
    if (!input) return;
    input.value = "";
    input.click();
  }

  function setCustomisePreview(src) {
    const glyph = document.getElementById("iconCustomisePreviewGlyph");
    const img = document.getElementById("iconCustomisePreviewImg");
    if (!glyph || !img) return;
    if (src) {
      img.src = src;
      img.hidden = false;
      glyph.hidden = true;
    } else {
      img.hidden = true;
      glyph.hidden = false;
      glyph.textContent = "⚙️";
    }
  }

  function setModalLock(on) {
    document.body.classList.toggle("modal-lock", !!on);
  }

  function openCustomiseIcon(target) {
    customiseTarget = target;
    customisePendingSrc = target?.iconSrc || getBatIcon(target?.pathKey) || null;
    const modal = document.getElementById("iconCustomise");
    if (!modal) return;
    setCustomisePreview(customisePendingSrc);
    modal.hidden = false;
    modal.setAttribute("aria-hidden", "false");
    setModalLock(true);
    hideDeskCtx();
  }

  function closeCustomiseIcon() {
    const modal = document.getElementById("iconCustomise");
    if (!modal) return;
    modal.hidden = true;
    modal.setAttribute("aria-hidden", "true");
    customiseTarget = null;
    customisePendingSrc = null;
    pickerMode = null;
    closeIconPicker();
    setModalLock(false);
  }

  function closeIconPicker() {
    const modal = document.getElementById("iconPickerModal");
    if (!modal) return;
    modal.hidden = true;
    modal.setAttribute("aria-hidden", "true");
    pickerMode = null;
    const body = document.getElementById("iconPickerBody");
    if (body) body.innerHTML = "";
    // keep customise lock if customise is still open
    const custom = document.getElementById("iconCustomise");
    if (custom && !custom.hidden) setModalLock(true);
    else if (custom?.hidden) setModalLock(false);
  }

  function saveCustomiseIcon() {
    if (!customiseTarget?.pathKey) {
      closeCustomiseIcon();
      return;
    }
    setBatIcon(customiseTarget.pathKey, customisePendingSrc);
    renderDesktopIcons();
    windowLayer?.querySelectorAll(".folder-item[data-path-key]").forEach((el) => {
      if (el.dataset.pathKey !== customiseTarget.pathKey) return;
      const g = el.querySelector(".folder-item-glyph");
      if (!g) return;
      const src = getBatIcon(customiseTarget.pathKey);
      g.innerHTML = src ? `<img src="${src}" alt="" width="28" height="28" />` : "⚙️";
    });
    closeCustomiseIcon();
  }

  function renderIconPicker(pathParts = []) {
    const resolved = resolvePath(pathParts);
    if (!resolved || resolved.node.type !== "folder") return;
    const body = document.getElementById("iconPickerBody");
    const title = document.getElementById("iconPickerTitle");
    if (!body) return;
    if (title) title.textContent = `Choose Icon — ${resolved.trail.join(" \\ ")}`;

    body.innerHTML = `
      <p class="picker-hint">Pick an image from Archive files (no real photos yet — use Assets / Photos stubs).</p>
      <p class="folder-path"></p>
      <div class="folder-grid"></div>
      <div class="icon-picker-footer">
        <button type="button" class="win95-push" id="iconPickerCancelBtn">Cancel</button>
      </div>
    `;
    body.querySelector(".folder-path").textContent = resolved.trail.join(" \\ ");
    const grid = body.querySelector(".folder-grid");
    const entries = Object.values(resolved.node.children || {}).filter(
      (e) => e.type === "folder" || e.type === "img"
    );

    if (pathParts.length) {
      const up = document.createElement("button");
      up.type = "button";
      up.className = "folder-item";
      up.innerHTML = `<span class="folder-item-glyph">⬆️</span><span>..</span>`;
      up.addEventListener("click", () => renderIconPicker(pathParts.slice(0, -1)));
      grid.appendChild(up);
    }

    if (!entries.length && !pathParts.length) {
      grid.innerHTML += `<p class="tool-section-empty">No images in this folder.</p>`;
    }

    for (const entry of entries) {
      const fullPath = [...pathParts, entry.name];
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "folder-item";
      btn.draggable = false;
      btn.innerHTML = `<span class="folder-item-glyph">${folderGlyphHTML(entry)}</span><span></span>`;
      btn.querySelector("span:last-child").textContent = entry.name;
      btn.addEventListener("click", () => {
        if (entry.type === "folder") {
          renderIconPicker(fullPath);
          return;
        }
        if (entry.type === "img" && entry.src) {
          customisePendingSrc = entry.src;
          setCustomisePreview(entry.src);
          closeIconPicker();
        }
      });
      grid.appendChild(btn);
    }

    body.querySelector("#iconPickerCancelBtn")?.addEventListener("click", closeIconPicker);
  }

  function openImagePicker() {
    pickerMode = "icon";
    const modal = document.getElementById("iconPickerModal");
    if (!modal) return;
    modal.hidden = false;
    modal.setAttribute("aria-hidden", "false");
    setModalLock(true);
    renderIconPicker([]);
  }

  function openFolderWindow(pathParts, opts = {}) {
    // Icon picker uses its own modal — never a regular window
    if (opts.picker === "img") {
      openImagePicker();
      if (pathParts?.length) renderIconPicker(pathParts);
      return;
    }
    const resolved = resolvePath(pathParts);
    if (!resolved || resolved.node.type !== "folder") return;
    const id = `folder:${pathParts.join("/") || "root"}`;
    const pathLabel = resolved.trail.join(" \\ ");

    const wrap = document.createElement("div");
    wrap.className = "folder-body-inner";
    wrap.innerHTML = `<p class="folder-path"></p><div class="folder-grid"></div>`;
    wrap.querySelector(".folder-path").textContent = pathLabel;
    const grid = wrap.querySelector(".folder-grid");

    wireFsDropTarget(wrap, [...pathParts]);

    wrap.addEventListener("contextmenu", (e) => {
      if (e.target.closest(".folder-item")) return;
      e.preventDefault();
      showDeskCtx(e.clientX, e.clientY, {
        kind: "folder-bg",
        path: [...pathParts],
      });
    });

    const entries = Object.values(resolved.node.children || {});

    if (!entries.length) {
      grid.innerHTML = `<p class="tool-section-empty">This folder is empty. Drag files from your computer here.</p>`;
    } else {
      for (const entry of entries) {
        const fullPath = [...pathParts, entry.name];
        const key = pathKey(fullPath);
        entry._pathKey = key;
        entry._folderPath = [...pathParts];
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "folder-item";
        btn.dataset.pathKey = key;
        btn.draggable = entry.type === "folder" || entry.type === "bat" || entry.type === "img";
        btn.innerHTML = `<span class="folder-item-glyph">${folderGlyphHTML(entry)}</span><span></span>`;
        btn.querySelector("span:last-child").textContent = entry.name;

        if (btn.draggable) {
          btn.addEventListener("dragstart", (e) => {
            btn.classList.add("is-dragging");
            e.dataTransfer.setData(
              "application/x-archive-item",
              JSON.stringify({ path: fullPath, type: entry.type, name: entry.name })
            );
            e.dataTransfer.effectAllowed = "copy";
          });
          btn.addEventListener("dragend", () => btn.classList.remove("is-dragging"));
        }

        if (entry.type === "bat") {
          btn.addEventListener("contextmenu", (e) => {
            e.preventDefault();
            e.stopPropagation();
            showDeskCtx(e.clientX, e.clientY, {
              kind: "bat",
              pathKey: key,
              path: fullPath,
              iconSrc: getBatIcon(key),
              entry,
            });
          });
        }

        if (entry.type === "txt" || entry.type === "ini" || entry.type === "file") {
          btn.addEventListener("contextmenu", (e) => {
            e.preventDefault();
            e.stopPropagation();
            showDeskCtx(e.clientX, e.clientY, {
              kind: "doc",
              path: fullPath,
              entry,
            });
          });
        }

        if (entry.type === "folder") {
          btn.addEventListener("contextmenu", (e) => {
            e.preventDefault();
            e.stopPropagation();
            showDeskCtx(e.clientX, e.clientY, {
              kind: "folder",
              path: fullPath,
              entry,
            });
          });
        }

        if (entry.type === "img") {
          btn.addEventListener("contextmenu", (e) => {
            e.preventDefault();
            e.stopPropagation();
            showDeskCtx(e.clientX, e.clientY, {
              kind: "img",
              path: fullPath,
              entry,
            });
          });
        }

        if (entry.type === "audio") {
          btn.addEventListener("contextmenu", (e) => {
            e.preventDefault();
            e.stopPropagation();
            showDeskCtx(e.clientX, e.clientY, {
              kind: "audio",
              path: fullPath,
              entry,
            });
          });
        }

        let clicks = 0;
        let clickTimer = 0;
        btn.addEventListener("click", () => {
          grid.querySelectorAll(".folder-item").forEach((b) => b.classList.remove("is-selected"));
          btn.classList.add("is-selected");
          clicks += 1;
          window.clearTimeout(clickTimer);
          clickTimer = window.setTimeout(() => {
            if (clicks >= 2) {
              if (entry.type === "folder") {
                if (folderHasLauncher(fullPath)) {
                  const bat = findBatInFolder(fullPath);
                  const launcher = bat || {
                    type: "bat",
                    name: "run.bat",
                  };
                  launcher._folderPath = [...fullPath];
                  launcher._pathKey = pathKey([...fullPath, launcher.name]);
                  runBat(launcher);
                } else {
                  openFolderWindow(fullPath);
                }
              }
              else if (entry.type === "bat") {
                entry._folderPath = [...pathParts];
                entry._pathKey = key;
                runBat(entry);
              }
              else if (entry.type === "img") openImageViewer(entry);
              else if (entry.type === "audio") {
                openMusicPlayerApp();
                addTrackToPlaylist(entry, fullPath);
                playMusicTrack(musicPlaylist.length - 1);
              }
              else openTextFile(entry);
            }
            clicks = 0;
          }, 280);
        });
        grid.appendChild(btn);
      }
    }

    makeWindow({
      id,
      title: opts.title || resolved.node.name,
      width: 460,
      height: 340,
      bodyHTML: wrap,
      bodyClass: "folder-body",
    });
  }

  const CODEY = [
    "C:\\ARCHIVE> mem /c",
    "  Conventional Memory : 640K OK",
    "C:\\ARCHIVE> dir /s tools",
    "  TEXTGEN.EXE   128,442  03-14-95  4:20p",
    "  LIGHTFX.COM    64,000  06-09-95  11:11a",
    "C:\\ARCHIVE> set PATH=%PATH%;C:\\ARCHIVE\\BIN",
    "loading kernel modules........ OK",
    "init rasterizer v2.1",
    "alloc heap 0x0040F000..0x00A1FF00",
    "seed PRNG with ticks=0x" + Math.floor(Math.random() * 0xffffff).toString(16),
    "mount //archive/things [RW]",
    "decrypt payload stream .... done",
    "compile glyph matrix 512x512",
    "link ferrofluid.dll",
    "spark buffer @ 0x" + Math.floor(Math.random() * 0xffff).toString(16),
    "HVAC: cool",
    "BIOS checksum 00FF — PASS",
    "handshake CRT phosphor.... green",
    "open viewport 800x600 256-color",
    "spawn worker threads: 4",
    "ready.",
  ];

  function runBat(entry) {
    const folderPath = entry._folderPath
      ? [...entry._folderPath]
      : entry._pathKey
        ? entry._pathKey.split("/").slice(0, -1)
        : [];
    const launch = resolveBatLaunch(entry, folderPath);

    if (launch.mode === "html") {
      runHtmlBat(entry, folderPath, launch.htmlEntry);
      return;
    }
    if (launch.mode !== "app") {
      window.alert("Could not launch — no app or game found in this folder.");
      return;
    }

    const appId = launch.appId;
    entry.app = appId;

    if (appId === "terminal") {
      openTerminalApp();
      return;
    }

    if (appId === "wikipedia") {
      openWikipediaApp();
      return;
    }

    const termId = `term:${appId}`;
    // One terminal per app — closing it closes the app
    if (openWindows.has(termId)) {
      focusWindow(openWindows.get(termId));
      return;
    }

    const pre = document.createElement("pre");
    pre.className = "term-body";
    const promptPath =
      appId === "lightning"
        ? "GAMES\\LIGHTNING"
        : appId === "pixel-paint"
          ? "GAMES\\PIXELPAINT"
          : appId === "bg-changer"
            ? "TOOLS\\BGCHANGE"
            : appId === "desktop-pet"
              ? "TOOLS\\DESKTOPPET"
              : appId === "profile"
                ? "TOOLS\\PROFILE"
                : appId === "social-media"
                  ? "TOOLS\\SOCIAL"
                  : appId === "music-player"
                    ? "TOOLS\\MUSIC"
                    : entry.profile === "demo"
                ? "TOOLS\\TEXTGEN\\SAMPLES\\DEMO"
                : "TOOLS\\TEXTGEN";
    const batName = entry.name || "run.bat";
    pre.textContent = `C:\\ARCHIVE\\${promptPath}> ${batName}\n`;

    makeWindow({
      id: termId,
      title: `MS-DOS Prompt - ${batName}`,
      width: 520,
      height: 300,
      bodyHTML: pre,
      onClose: () => {
        closeLinkedSession(appId, termId);
        if (appId === "desktop-pet") destroyDesktopPet();
        if (typeof window.setTextGenProfile === "function" && appId === "text-generator") {
          window.setTextGenProfile("full");
        }
      },
    });

    const session = appSessions.get(appId) || {};
    session.termId = termId;
    appSessions.set(appId, session);

    const win = openWindows.get(termId);
    const body = win.querySelector(".win95-body");
    body.style.background = "#000";
    body.style.padding = "0";

    const lines = [...CODEY].sort(() => Math.random() - 0.5).slice(0, 14);
    lines.push("");
    const launchName =
      appId === "lightning"
        ? "Lightning FX"
        : appId === "pixel-paint"
          ? "Pixel Paint"
          : appId === "bg-changer"
            ? "Background Changer"
            : appId === "desktop-pet"
              ? "Desktop Pet"
              : appId === "profile"
                ? "Profile"
                : appId === "social-media"
                  ? "Social Media"
                  : appId === "music-player"
                    ? "Music Player"
                    : entry.profile === "demo"
                ? "Text Generator (demo)"
                : "Text Generator";
    lines.push(`Launching ${launchName}...`);

    let li = 0;
    const step = () => {
      if (li >= lines.length) {
        pre.innerHTML = `${pre.textContent}<span class="term-cursor"> </span>`;
        window.setTimeout(() => openToolApp(appId, { profile: entry.profile || "full", termId }), 500);
        return;
      }
      pre.textContent += `${lines[li]}\n`;
      li += 1;
      body.scrollTop = body.scrollHeight;
      window.setTimeout(step, 50 + Math.random() * 80);
    };
    window.setTimeout(step, 200);
  }

  function findHtmlInFolder(folderPath) {
    const node = resolvePath(folderPath)?.node;
    if (!node?.children) return null;
    const kids = Object.values(node.children);
    const byName = (n) => kids.find((e) => e.name.toLowerCase() === n);
    return (
      byName("index.html") ||
      byName("game.html") ||
      byName("main.html") ||
      kids.find((e) => /\.html?$/i.test(e.name || "")) ||
      kids.find((e) => looksLikeHtml(e)) ||
      null
    );
  }

  function runHtmlBat(entry, folderPath, presetHtml = null) {
    let htmlEntry = presetHtml;
    if (!htmlEntry && entry.html) {
      htmlEntry = resolvePath([...folderPath, entry.html])?.node || null;
    }
    if (!htmlEntry) htmlEntry = findHtmlInFolder(folderPath);
    if (!htmlEntry) {
      const storeGameId = inferStoreGameId(folderPath);
      if (storeGameId) htmlEntry = storeGameHtmlEntry(storeGameId);
    }
    if (!htmlEntry) {
      window.alert("No HTML file found in this folder to run.");
      return;
    }

    const batName = entry.name || "run.bat";
    const termId = `term:html:${pathKey(folderPath) || "root"}`;
    if (openWindows.has(termId)) {
      focusWindow(openWindows.get(termId));
    } else {
      const pre = document.createElement("pre");
      pre.className = "term-body";
      const label = folderPath.length ? folderPath.join("\\") : "ROOT";
      pre.textContent = `C:\\ARCHIVE\\${label}> ${batName}\nloading ${htmlEntry.name}...\n`;
      makeWindow({
        id: termId,
        title: `MS-DOS Prompt - ${batName}`,
        width: 480,
        height: 220,
        bodyHTML: pre,
      });
      const win = openWindows.get(termId);
      const body = win?.querySelector(".win95-body");
      if (body) {
        body.style.background = "#000";
        body.style.padding = "0";
      }
    }

    window.setTimeout(() => {
      openInTab(htmlEntry, folderPath);
    }, 450);
  }

  function closeFileBrowser() {
    const modal = document.getElementById("fileBrowserModal");
    if (!modal) return;
    modal.hidden = true;
    modal.setAttribute("aria-hidden", "true");
    const body = document.getElementById("fileBrowserBody");
    if (body) body.innerHTML = "";
    fileBrowserState = null;
    const custom = document.getElementById("iconCustomise");
    const picker = document.getElementById("iconPickerModal");
    if ((!custom || custom.hidden) && (!picker || picker.hidden)) {
      setModalLock(false);
    }
  }

  function openFileBrowser(opts) {
    fileBrowserState = {
      mode: opts.mode, // "save-paint" | "import-paint" | "pick-wallpaper" | "pick-profile-photo"
      path: opts.path || [],
      dataUrl: opts.dataUrl || null,
      statusEl: opts.statusEl || null,
      canvas: opts.canvas || null,
      size: opts.size || 16,
      onPick: opts.onPick || null,
      onAdd: opts.onAdd || null,
    };
    const modal = document.getElementById("fileBrowserModal");
    if (!modal) return;
    modal.hidden = false;
    modal.setAttribute("aria-hidden", "false");
    setModalLock(true);
    renderFileBrowser(fileBrowserState.path);
  }

  function renderFileBrowser(pathParts) {
    if (!fileBrowserState) return;
    fileBrowserState.path = pathParts;
    const resolved = resolvePath(pathParts);
    if (!resolved || resolved.node.type !== "folder") return;
    const body = document.getElementById("fileBrowserBody");
    const title = document.getElementById("fileBrowserTitle");
    if (!body) return;
    const mode = fileBrowserState.mode;
    if (title) {
      title.textContent =
        mode === "save-paint"
          ? `Save As — ${resolved.trail.join(" \\ ")}`
          : mode === "pick-wallpaper"
            ? `Wallpaper — ${resolved.trail.join(" \\ ")}`
            : mode === "pick-profile-photo"
              ? `Profile picture — ${resolved.trail.join(" \\ ")}`
              : mode === "pick-chat-media"
                ? `Send photo — ${resolved.trail.join(" \\ ")}`
                : mode === "pick-music"
                ? `Music — ${resolved.trail.join(" \\ ")}`
                : `Import — ${resolved.trail.join(" \\ ")}`;
    }

    const entries = Object.values(resolved.node.children || {});
    const folders = entries.filter((e) => e.type === "folder");
    const images = entries.filter((e) => e.type === "img");
    const audioFiles = entries.filter((e) => e.type === "audio");

    body.innerHTML = `
      <p class="picker-hint">${
        mode === "save-paint"
          ? "Choose a folder, name your drawing, then Save."
          : mode === "pick-wallpaper"
            ? "Pick an image or GIF for your desktop background."
            : mode === "pick-profile-photo"
              ? "Pick an image or GIF for your profile picture."
              : mode === "pick-chat-media"
                ? "Pick a photo or GIF to send in chat."
                : mode === "pick-music"
                ? "Click songs to add to your playlist. Upload MP3s to My Files first."
                : "Pick a saved image to import into Pixel Paint."
      }</p>
      <p class="folder-path"></p>
      <div class="folder-grid"></div>
      ${
        mode === "save-paint"
          ? `<div class="file-browser-save-row">
              <label>Name <input type="text" id="fileBrowserName" value="drawing" maxlength="40" /></label>
              <button type="button" class="win95-push" id="fileBrowserSaveBtn">Save</button>
              <button type="button" class="win95-push" id="fileBrowserCancelBtn">Cancel</button>
            </div>`
          : `<div class="icon-picker-footer">
              <button type="button" class="win95-push" id="fileBrowserCancelBtn">${mode === "pick-music" ? "Done" : "Cancel"}</button>
            </div>`
      }
    `;
    body.querySelector(".folder-path").textContent = resolved.trail.join(" \\ ");
    const grid = body.querySelector(".folder-grid");

    if (pathParts.length) {
      const up = document.createElement("button");
      up.type = "button";
      up.className = "folder-item";
      up.innerHTML = `<span class="folder-item-glyph">⬆️</span><span>..</span>`;
      up.addEventListener("click", () => renderFileBrowser(pathParts.slice(0, -1)));
      grid.appendChild(up);
    }

    for (const entry of folders) {
      const fullPath = [...pathParts, entry.name];
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "folder-item";
      btn.innerHTML = `<span class="folder-item-glyph">📁</span><span></span>`;
      btn.querySelector("span:last-child").textContent = entry.name;
      btn.addEventListener("click", () => renderFileBrowser(fullPath));
      grid.appendChild(btn);
    }

    if (mode === "import-paint" || mode === "pick-wallpaper" || mode === "pick-profile-photo" || mode === "pick-chat-media") {
      for (const entry of images) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "folder-item";
        btn.innerHTML = `<span class="folder-item-glyph">${
          entry.src ? `<img src="${entry.src}" alt="" width="28" height="28" />` : "🖼️"
        }</span><span></span>`;
        btn.querySelector("span:last-child").textContent = entry.name;
        btn.addEventListener("click", () => {
          if (mode === "pick-wallpaper") {
            setDesktopWallpaper(entry.src);
            closeFileBrowser();
          } else if (mode === "pick-profile-photo" || mode === "pick-chat-media") {
            if (fileBrowserState?.onPick) fileBrowserState.onPick(entry.src);
            closeFileBrowser();
          } else {
            importPaintImage(entry.src);
            closeFileBrowser();
          }
        });
        grid.appendChild(btn);
      }
      if (!images.length && !folders.length) {
        grid.innerHTML += `<p class="tool-section-empty">No images here.</p>`;
      }
    }

    if (mode === "pick-music") {
      for (const entry of audioFiles) {
        const fullPath = [...pathParts, entry.name];
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "folder-item";
        btn.innerHTML = `<span class="folder-item-glyph">🎵</span><span></span>`;
        btn.querySelector("span:last-child").textContent = entry.name;
        btn.addEventListener("click", () => {
          if (fileBrowserState?.onAdd) fileBrowserState.onAdd(entry, fullPath);
        });
        grid.appendChild(btn);
      }
      if (!audioFiles.length && !folders.length) {
        grid.innerHTML += `<p class="tool-section-empty">No music here. Upload MP3s or check the Music folder.</p>`;
      }
    }

    body.querySelector("#fileBrowserCancelBtn")?.addEventListener("click", closeFileBrowser);
    body.querySelector("#fileBrowserSaveBtn")?.addEventListener("click", () => {
      const nameInput = body.querySelector("#fileBrowserName");
      let base = (nameInput?.value || "drawing").trim().replace(/[\\/:*?"<>|]/g, "");
      if (!base) base = "drawing";
      if (base.toLowerCase().endsWith(".bmp")) base = base.slice(0, -4);
      const dataUrl = fileBrowserState.dataUrl;
      if (!dataUrl) return;
      const entry = saveImageToFolder(pathParts, dataUrl, base);
      if (entry) {
        if (fileBrowserState.statusEl) {
          fileBrowserState.statusEl.textContent = `Saved to ${resolved.trail.join("\\")}\\${entry.name}`;
        }
        refreshOpenFolder(pathParts);
        closeFileBrowser();
      } else {
        alertStorageFull("save image");
      }
    });
  }

  function getWallpaperSrc() {
    try {
      const saved = localStorage.getItem(WALLPAPER_KEY);
      if (saved) return saved;
    } catch (_) {
      /* ignore */
    }
    return DEFAULT_WALLPAPER;
  }

  function applyDesktopWallpaper() {
    if (!desktop) return;
    const src = getWallpaperSrc();
    const wpEl = document.getElementById("desktopWallpaper");
    const safe = String(src).replace(/\\/g, "/").replace(/"/g, "%22");
    const isGif = isGifSrc(src);
    if (isGif && wpEl) {
      wpEl.src = src;
      wpEl.hidden = false;
      desktop.style.background = "#008080";
    } else {
      if (wpEl) {
        wpEl.hidden = true;
        wpEl.removeAttribute("src");
      }
      desktop.style.background = `#008080 url("${safe}") center / cover no-repeat`;
    }
  }

  function setDesktopWallpaper(src) {
    const next = src || DEFAULT_WALLPAPER;
    if (next === DEFAULT_WALLPAPER) {
      try {
        localStorage.removeItem(WALLPAPER_KEY);
      } catch (_) {
        /* ignore */
      }
    } else if (!trySetLocalStorage(WALLPAPER_KEY, next)) {
      alertStorageFull("save wallpaper");
      return;
    }
    applyDesktopWallpaper();
    refreshBgChangerPreview();
    Cloud()?.scheduleSave?.();
  }

  function refreshBgChangerPreview() {
    const win = openWindows.get("app:bg-changer");
    const img = win?.querySelector("[data-wallpaper-preview]");
    if (img) img.src = getWallpaperSrc();
  }

  function readProfileData() {
    try {
      const raw = localStorage.getItem(PROFILE_DATA_KEY);
      const data = raw ? JSON.parse(raw) : {};
      return data && typeof data === "object" ? data : {};
    } catch (_) {
      return {};
    }
  }

  function writeProfileData(data) {
    if (!trySetLocalStorage(PROFILE_DATA_KEY, JSON.stringify(data))) {
      alertStorageFull("save profile");
      return false;
    }
    const pid = Cloud()?.getSession?.();
    const social = window.ArchiveSocial;
    if (pid && social) {
      prepareShareableProfileData(data)
        .then((shared) => social.publishAccount(pid, Cloud()?.getUsername?.() || "", shared))
        .catch(() => social.publishAccount(pid, Cloud()?.getUsername?.() || "", data));
    }
    updateProfileChromeIcon();
    Cloud()?.scheduleSave?.();
    return true;
  }

  function openProfileApp(opts = {}) {
    const appId = "profile";
    const id = `app:${appId}`;
    const termId = opts.termId || appSessions.get(appId)?.termId;
    const saved = readProfileData();
    let draftPicture = saved.pictureSrc || "";
    let draftStories = Array.isArray(saved.stories) ? [...saved.stories] : [];

    if (openWindows.has(id)) {
      focusWindow(openWindows.get(id));
      const session = appSessions.get(appId) || {};
      session.appWinId = id;
      if (termId) session.termId = termId;
      appSessions.set(appId, session);
      return;
    }

    const username = Cloud()?.getUsername?.() || "User";
    const wrap = document.createElement("div");
    wrap.className = "profile-app";
    wrap.innerHTML = `
      <button type="button" class="profile-avatar-btn" data-profile-avatar title="Choose picture">
        <img class="profile-avatar-img" alt="" hidden />
        <img class="profile-avatar-blank" src="${BLANK_PROFILE_PIC}" alt="" />
      </button>
      <p class="profile-username"></p>
      <label class="profile-field">
        <span>Display name</span>
        <input type="text" data-profile-display maxlength="40" />
      </label>
      <label class="profile-field">
        <span>Pronouns</span>
        <input type="text" data-profile-pronouns maxlength="32" placeholder="e.g. they/them" />
      </label>
      <label class="profile-field">
        <span>Description</span>
        <textarea data-profile-desc rows="4" maxlength="280"></textarea>
      </label>
      <div class="profile-stories-wrap">
        <p class="profile-stories-title">Stories <span class="profile-stories-hint">(up to 3)</span></p>
        <div class="profile-stories" data-profile-stories></div>
      </div>
      <div class="profile-likes-preview" data-profile-likes hidden>
        <img src="assets/like-sprite.svg" alt="" width="16" height="16" />
        <span data-profile-like-count>0</span>
        <span>likes</span>
      </div>
      <div class="profile-actions">
        <button type="button" class="win95-push" data-profile-save>Save</button>
        <button type="button" class="win95-push" data-profile-cancel>Cancel</button>
        <span class="profile-status" data-profile-status></span>
      </div>
    `;

    const avatarBtn = wrap.querySelector("[data-profile-avatar]");
    const avatarImg = wrap.querySelector(".profile-avatar-img");
    const avatarBlank = wrap.querySelector(".profile-avatar-blank");
    const displayInput = wrap.querySelector("[data-profile-display]");
    const pronounsInput = wrap.querySelector("[data-profile-pronouns]");
    const descInput = wrap.querySelector("[data-profile-desc]");
    const statusEl = wrap.querySelector("[data-profile-status]");
    wrap.querySelector(".profile-username").textContent = username;

    function updateAvatar(src) {
      if (src) {
        avatarImg.src = src;
        avatarImg.hidden = false;
        avatarBlank.hidden = true;
      } else {
        avatarImg.removeAttribute("src");
        avatarImg.hidden = true;
        avatarBlank.hidden = false;
      }
    }

    function fillForm(data, picture) {
      displayInput.value = data.displayName || "";
      pronounsInput.value = data.pronouns || "";
      descInput.value = data.description || "";
      draftPicture = picture || "";
      draftStories = Array.isArray(data.stories) ? [...data.stories] : [];
      updateAvatar(draftPicture);
      renderStoriesEditor();
      refreshProfileLikes();
    }

    function renderStoriesEditor() {
      const box = wrap.querySelector("[data-profile-stories]");
      if (!box) return;
      box.innerHTML = "";
      for (const story of draftStories) {
        const card = document.createElement("div");
        card.className = "profile-story-card";
        card.innerHTML = `
          <img alt="" />
          <p></p>
          <button type="button" class="win95-push" data-story-del>Delete</button>
        `;
        card.querySelector("img").src = story.pictureSrc || BLANK_PROFILE_PIC;
        card.querySelector("p").textContent = story.description || "";
        card.querySelector("[data-story-del]").addEventListener("click", () => {
          draftStories = draftStories.filter((s) => s.id !== story.id);
          renderStoriesEditor();
        });
        box.appendChild(card);
      }
      if (draftStories.length < 3) {
        const add = document.createElement("button");
        add.type = "button";
        add.className = "win95-push profile-story-add";
        add.textContent = "Add story photo";
        add.addEventListener("click", () => {
          openFileBrowser({
            mode: "pick-profile-photo",
            path: ["Photos"],
            onPick: async (src) => {
              if (!src) return;
              const desc = window.prompt("Story description:", "") || "";
              const pictureSrc = await mediaToShareableSrc(src, { maxWidth: 480, maxBytes: 280000 });
              if (!pictureSrc) {
                window.alert("Story image too large — try a smaller photo.");
                return;
              }
              draftStories.push({
                id: `story_${Date.now().toString(36)}`,
                pictureSrc,
                description: desc.trim().slice(0, 120),
              });
              renderStoriesEditor();
            },
          });
        });
        box.appendChild(add);
      }
    }

    async function refreshProfileLikes() {
      const row = wrap.querySelector("[data-profile-likes]");
      const countEl = wrap.querySelector("[data-profile-like-count]");
      const pid = Cloud()?.getSession?.();
      if (!row || !countEl || !pid || !window.ArchiveSocial?.getLikeCount) return;
      const count = await window.ArchiveSocial.getLikeCount(pid);
      countEl.textContent = String(count);
      row.hidden = count <= 0;
    }

    fillForm(saved, saved.pictureSrc);

    avatarBtn.addEventListener("click", () => {
      openFileBrowser({
        mode: "pick-profile-photo",
        path: ["Photos"],
        onPick: async (src) => {
          if (!src) return;
          statusEl.textContent = "Processing photo…";
          const prepared = await mediaToShareableSrc(src, { maxWidth: 256, maxBytes: 180000 });
          if (!prepared) {
            statusEl.textContent = "Image too large — try a smaller file.";
            return;
          }
          draftPicture = prepared;
          updateAvatar(draftPicture);
          updateProfileChromeIcon();
          statusEl.textContent = "";
        },
      });
    });

    wrap.querySelector("[data-profile-save]").addEventListener("click", async () => {
      statusEl.textContent = "Saving…";
      const next = {
        displayName: displayInput.value.trim(),
        pronouns: pronounsInput.value.trim(),
        description: descInput.value.trim(),
        pictureSrc: draftPicture || "",
        stories: draftStories.slice(0, 3),
      };
      const shared = await prepareShareableProfileData(next);
      if (!writeProfileData(shared)) {
        statusEl.textContent = "Save failed.";
        return;
      }
      draftPicture = shared.pictureSrc || "";
      draftStories = Array.isArray(shared.stories) ? [...shared.stories] : [];
      fillForm(shared, shared.pictureSrc);
      statusEl.textContent = "Saved.";
      window.setTimeout(() => {
        statusEl.textContent = "";
      }, 1600);
    });

    wrap.querySelector("[data-profile-cancel]").addEventListener("click", () => {
      const current = readProfileData();
      fillForm(current, current.pictureSrc);
      statusEl.textContent = "";
    });

    makeWindow({
      id,
      title: "Profile",
      icon: getProfileIconSrc(),
      width: 340,
      height: 520,
      left: 140,
      top: 64,
      bodyHTML: wrap,
      bodyClass: "profile-app-body",
      onClose: () => {
        closeLinkedSession(appId, id);
      },
    });

    const session = appSessions.get(appId) || {};
    session.appWinId = id;
    if (termId) session.termId = termId;
    appSessions.set(appId, session);
  }

  function openSocialMediaApp(opts = {}) {
    const appId = "social-media";
    const id = `app:${appId}`;
    const termId = opts.termId || appSessions.get(appId)?.termId;
    const Social = () => window.ArchiveSocial;

    if (openWindows.has(id)) {
      focusWindow(openWindows.get(id));
      const session = appSessions.get(appId) || {};
      session.appWinId = id;
      if (termId) session.termId = termId;
      appSessions.set(appId, session);
      return;
    }

    const wrap = document.createElement("div");
    wrap.className = "social-app";
    wrap.innerHTML = `
      <div data-social-main>
        <div class="social-tabs">
          <button type="button" class="social-tab is-active" data-social-tab="explore">Explore</button>
          <button type="button" class="social-tab" data-social-tab="friends">Friends</button>
        </div>
        <div class="social-panel" data-social-panel="explore">
          <div class="social-list" data-social-explore-list></div>
        </div>
        <div class="social-panel" data-social-panel="friends" hidden>
          <p class="social-section-title">Friend requests</p>
          <div class="social-list" data-social-requests></div>
          <p class="social-section-title">Your friends</p>
          <div class="social-list" data-social-friends></div>
        </div>
      </div>
      <div class="social-detail" data-social-detail hidden>
        <button type="button" class="social-back" data-social-back>← Back</button>
        <img class="social-detail-pic" data-social-detail-pic alt="" />
        <h3 class="social-detail-name" data-social-detail-name></h3>
        <p class="social-detail-user" data-social-detail-user></p>
        <p class="social-detail-pronouns" data-social-detail-pronouns></p>
        <p class="social-detail-desc" data-social-detail-desc></p>
        <div class="social-like-row" data-social-like-row>
          <button type="button" class="social-like-btn" data-social-like>
            <img src="assets/like-sprite.svg" alt="" width="18" height="18" />
            <span data-social-like-count>0</span>
          </button>
        </div>
        <div class="social-stories" data-social-stories></div>
        <div class="social-comments-wrap" data-social-comments-wrap>
          <p class="social-section-title">Comments</p>
          <div class="social-comments-list" data-social-comments></div>
          <form class="social-comment-form" data-social-comment-form>
            <input type="text" data-social-comment-input maxlength="500" placeholder="Write a comment…" />
            <button type="submit" class="win95-push">Post</button>
          </form>
        </div>
        <button type="button" class="win95-push social-action" data-social-action>Friend</button>
      </div>
      <div class="social-story-viewer" data-social-story-viewer hidden>
        <button type="button" class="social-story-viewer-close" data-story-viewer-close title="Close">×</button>
        <button type="button" class="social-story-viewer-nav is-prev" data-story-viewer-prev title="Previous">‹</button>
        <img class="social-story-viewer-img" data-story-viewer-img alt="" />
        <button type="button" class="social-story-viewer-nav is-next" data-story-viewer-next title="Next">›</button>
        <p class="social-story-viewer-caption" data-story-viewer-caption></p>
      </div>
      <div class="social-chat" data-social-chat hidden>
        <div class="social-chat-head">
          <button type="button" class="social-back" data-social-chat-back>← Back</button>
          <span data-social-chat-name></span>
        </div>
        <div class="social-chat-messages" data-social-chat-messages></div>
        <form class="social-chat-form" data-social-chat-form>
          <button type="button" class="win95-push" data-social-chat-attach title="Send photo or GIF">📎</button>
          <input type="text" data-social-chat-input maxlength="500" placeholder="Type a message…" />
          <button type="submit" class="win95-push">Send</button>
        </form>
      </div>
    `;

    const mainEl = wrap.querySelector("[data-social-main]");
    const detailEl = wrap.querySelector("[data-social-detail]");
    const chatEl = wrap.querySelector("[data-social-chat]");
    let detailAccount = null;
    let chatFriend = null;
    let chatUnsub = null;
    let commentsUnsub = null;
    let storyViewerList = [];
    let storyViewerIndex = 0;
    let pendingChatImage = "";

    function stopCommentsListen() {
      if (commentsUnsub) {
        commentsUnsub();
        commentsUnsub = null;
      }
    }

    function stopChatListen() {
      if (chatUnsub) {
        chatUnsub();
        chatUnsub = null;
      }
    }

    function showMain() {
      stopChatListen();
      stopCommentsListen();
      closeStoryViewer();
      chatFriend = null;
      detailAccount = null;
      detailEl.hidden = true;
      chatEl.hidden = true;
      mainEl.hidden = false;
    }

    function showDetail() {
      stopChatListen();
      chatFriend = null;
      chatEl.hidden = true;
      mainEl.hidden = true;
      detailEl.hidden = false;
    }

    function showChat(friend) {
      closeStoryViewer();
      pendingChatImage = "";
      chatFriend = friend;
      mainEl.hidden = true;
      detailEl.hidden = true;
      chatEl.hidden = false;
      Social()?.markChatRead?.(friend.id);
      startSocialNotifications();
      const chatLabel = friend.username
        ? `${Social()?.displayLabel(friend)} (@${friend.username})`
        : Social()?.displayLabel(friend) || "Chat";
      wrap.querySelector("[data-social-chat-name]").textContent = chatLabel;
      const chatInput = wrap.querySelector("[data-social-chat-input]");
      if (chatInput) chatInput.placeholder = "Type a message…";
      const msgsEl = wrap.querySelector("[data-social-chat-messages]");
      msgsEl.innerHTML = "";

      stopChatListen();
      if (Social()?.listenMessages) {
        chatUnsub = Social().listenMessages(friend.id, (msgs) => {
          msgsEl.innerHTML = "";
          const me = Social().myId();
          for (const m of msgs) {
            const row = document.createElement("div");
            row.className = "social-msg" + (m.from === me ? " is-me" : "");
            if (m.imageSrc) {
              const im = document.createElement("img");
              im.className = "social-msg-img";
              im.src = m.imageSrc;
              im.alt = m.text || "Shared image";
              row.appendChild(im);
            }
            if (m.text) {
              const txt = document.createElement("span");
              txt.className = "social-msg-text";
              txt.textContent = m.text;
              row.appendChild(txt);
            }
            if (!m.imageSrc && !m.text) row.textContent = "";
            msgsEl.appendChild(row);
          }
          msgsEl.scrollTop = msgsEl.scrollHeight;
        });
      }
    }

    function makeRow(account, opts = {}) {
      const { actionLabel, onRowClick, onActionClick } = opts;
      const row = document.createElement("button");
      row.type = "button";
      row.className = "social-row";
      const img = document.createElement("img");
      img.className = "social-avatar";
      bindAvatarImg(img, account.pictureSrc);
      img.alt = "";
      const textWrap = document.createElement("div");
      textWrap.className = "social-row-text";
      const name = document.createElement("span");
      name.className = "social-row-name";
      name.textContent = Social()?.displayLabel(account) || "User";
      textWrap.appendChild(name);
      if (account.username) {
        const user = document.createElement("span");
        user.className = "social-row-user";
        user.textContent = `@${account.username}`;
        textWrap.appendChild(user);
      }
      row.appendChild(img);
      row.appendChild(textWrap);
      if (actionLabel) {
        const act = document.createElement("span");
        act.className = "social-row-action";
        act.textContent = actionLabel;
        act.addEventListener("click", (e) => {
          e.stopPropagation();
          e.preventDefault();
          onActionClick?.();
        });
        row.appendChild(act);
      }
      row.addEventListener("click", () => onRowClick?.());
      return row;
    }

    async function renderExplore() {
      const listEl = wrap.querySelector("[data-social-explore-list]");
      if (!listEl) return;
      if (!Social()) {
        listEl.innerHTML = "<p class=\"social-empty\">Sign in to use Social Media.</p>";
        return;
      }
      listEl.innerHTML = "<p class=\"social-hint\">Loading…</p>";
      try {
        const accounts = await Social().listAccounts();
        listEl.innerHTML = "";
        if (!accounts.length) {
          listEl.innerHTML = "<p class=\"social-empty\">No other accounts yet.</p>";
          return;
        }
        for (const acc of accounts) {
          const btn = makeRow(acc, { onRowClick: () => openDetail(acc) });
          listEl.appendChild(btn);
        }
      } catch (err) {
        const code = err?.code || "";
        const hint =
          code === "permission-denied"
            ? "Firestore blocked this (deploy firestore.rules in Firebase Console)."
            : "Could not load accounts.";
        listEl.innerHTML = `<p class="social-empty">${hint}</p>`;
        console.warn("Social listAccounts failed:", err);
      }
    }

    async function openDetail(acc) {
      const full = (await Social()?.getAccount?.(acc.id)) || acc;
      detailAccount = full;
      showDetail();
      bindAvatarImg(wrap.querySelector("[data-social-detail-pic]"), full.pictureSrc);
      wrap.querySelector("[data-social-detail-name]").textContent = Social().displayLabel(full);
      wrap.querySelector("[data-social-detail-user]").textContent = full.username || "";
      const pronEl = wrap.querySelector("[data-social-detail-pronouns]");
      const pron = full.pronouns?.trim();
      pronEl.textContent = pron || "";
      pronEl.hidden = !pron;
      wrap.querySelector("[data-social-detail-desc]").textContent =
        full.description?.trim() || "No description yet.";
      renderDetailStories(full.stories);
      startCommentsListen(full.id);
      await refreshDetailLikes();
      await refreshDetailAction();
    }

    function formatSocialTime(ts) {
      if (!ts) return "";
      try {
        return new Date(ts).toLocaleString(undefined, {
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
        });
      } catch (_) {
        return "";
      }
    }

    function renderCommentsList(comments) {
      const listEl = wrap.querySelector("[data-social-comments]");
      const formEl = wrap.querySelector("[data-social-comment-form]");
      if (!listEl) return;
      const signedIn = !!Social()?.myId?.();
      if (formEl) formEl.hidden = !signedIn;
      listEl.innerHTML = "";
      const list = Array.isArray(comments) ? comments : [];
      if (!list.length) {
        listEl.innerHTML = '<p class="social-empty">No comments yet.</p>';
        return;
      }
      const me = Social()?.myId?.();
      for (const c of list) {
        const row = document.createElement("div");
        row.className = "social-comment";
        const head = document.createElement("div");
        head.className = "social-comment-head";
        const img = document.createElement("img");
        img.className = "social-comment-avatar";
        bindAvatarImg(img, c.fromPicture);
        img.alt = "";
        const who = document.createElement("span");
        who.className = "social-comment-who";
        who.textContent = c.from === me ? "You" : c.fromDisplay || c.fromUsername || "User";
        const when = document.createElement("span");
        when.className = "social-comment-when";
        when.textContent = formatSocialTime(c.ts);
        head.appendChild(img);
        head.appendChild(who);
        head.appendChild(when);
        const body = document.createElement("p");
        body.className = "social-comment-text";
        body.textContent = c.text || "";
        row.appendChild(head);
        row.appendChild(body);
        listEl.appendChild(row);
      }
      listEl.scrollTop = listEl.scrollHeight;
    }

    function startCommentsListen(profileId) {
      stopCommentsListen();
      const listEl = wrap.querySelector("[data-social-comments]");
      if (!listEl || !profileId || !Social()?.listenComments) return;
      listEl.innerHTML = '<p class="social-hint">Loading comments…</p>';
      commentsUnsub = Social().listenComments(profileId, renderCommentsList);
    }

    function closeStoryViewer() {
      const viewer = wrap.querySelector("[data-social-story-viewer]");
      if (viewer) viewer.hidden = true;
      storyViewerList = [];
      storyViewerIndex = 0;
    }

    function renderStoryViewer() {
      const viewer = wrap.querySelector("[data-social-story-viewer]");
      const img = wrap.querySelector("[data-story-viewer-img]");
      const caption = wrap.querySelector("[data-story-viewer-caption]");
      const prevBtn = wrap.querySelector("[data-story-viewer-prev]");
      const nextBtn = wrap.querySelector("[data-story-viewer-next]");
      if (!viewer || !img || !storyViewerList.length) return;
      const story = storyViewerList[storyViewerIndex];
      if (!story) return;
      img.src = story.pictureSrc || Social()?.blankAvatar?.() || BLANK_PROFILE_PIC;
      caption.textContent = story.description || "";
      const multi = storyViewerList.length > 1;
      if (prevBtn) prevBtn.hidden = !multi;
      if (nextBtn) nextBtn.hidden = !multi;
      viewer.hidden = false;
    }

    function openStoryViewer(stories, startIndex = 0) {
      const list = Array.isArray(stories) ? stories.filter((s) => s?.pictureSrc) : [];
      if (!list.length) return;
      storyViewerList = list;
      storyViewerIndex = Math.max(0, Math.min(startIndex, list.length - 1));
      renderStoryViewer();
    }

    function renderDetailStories(stories) {
      const box = wrap.querySelector("[data-social-stories]");
      if (!box) return;
      box.innerHTML = "";
      const list = Array.isArray(stories) ? stories : [];
      if (!list.length) return;
      const title = document.createElement("p");
      title.className = "social-section-title";
      title.textContent = "Stories";
      box.appendChild(title);
      for (const story of list) {
        const card = document.createElement("button");
        card.type = "button";
        card.className = "social-story-card is-clickable";
        card.innerHTML = `<img alt="" /><p></p>`;
        card.querySelector("img").src = story.pictureSrc || Social()?.blankAvatar?.() || BLANK_PROFILE_PIC;
        card.querySelector("p").textContent = story.description || "";
        card.title = "Click to view";
        card.addEventListener("click", () => openStoryViewer(list, list.indexOf(story)));
        box.appendChild(card);
      }
    }

    async function refreshDetailLikes() {
      const likeRow = wrap.querySelector("[data-social-like-row]");
      const likeBtn = wrap.querySelector("[data-social-like]");
      const countEl = wrap.querySelector("[data-social-like-count]");
      if (!detailAccount || !likeRow || !likeBtn || !countEl) return;
      const rel = await Social().getRelation(detailAccount.id);
      likeRow.hidden = rel === "self";
      const count = await Social().getLikeCount(detailAccount.id);
      const liked = await Social().hasLiked(detailAccount.id);
      countEl.textContent = String(count);
      likeBtn.classList.toggle("is-liked", liked);
    }

    async function refreshDetailAction() {
      const btn = wrap.querySelector("[data-social-action]");
      if (!detailAccount || !btn) return;
      const rel = await Social().getRelation(detailAccount.id);
      btn.hidden = rel === "self";
      btn.disabled = false;
      if (rel === "friends") {
        btn.textContent = "Chat";
        btn.dataset.mode = "chat";
      } else if (rel === "pending_out") {
        btn.textContent = "Pending…";
        btn.disabled = true;
        btn.dataset.mode = "";
      } else if (rel === "pending_in") {
        btn.textContent = "Accept";
        btn.dataset.mode = "accept";
      } else {
        btn.textContent = "Friend";
        btn.dataset.mode = "friend";
      }
    }

    async function renderFriends() {
      const reqEl = wrap.querySelector("[data-social-requests]");
      const friendsEl = wrap.querySelector("[data-social-friends]");
      if (!reqEl || !friendsEl || !Social()) return;
      reqEl.innerHTML = "<p class=\"social-hint\">Loading…</p>";
      friendsEl.innerHTML = "";
      try {
        const incoming = await Social().listIncomingRequests();
        reqEl.innerHTML = "";
        if (!incoming.length) {
          reqEl.innerHTML = "<p class=\"social-empty\">No pending requests.</p>";
        } else {
          for (const acc of incoming) {
            const row = makeRow(acc, {
              actionLabel: "Accept",
              onRowClick: () => openDetail(acc),
              onActionClick: async () => {
                await Social().acceptFriendRequest(acc.id);
                renderFriends();
                if (detailAccount?.id === acc.id) refreshDetailAction();
              },
            });
            reqEl.appendChild(row);
          }
        }

        const friends = await Social().listFriends();
        friendsEl.innerHTML = "";
        if (!friends.length) {
          friendsEl.innerHTML = "<p class=\"social-empty\">No friends yet — explore accounts and send requests.</p>";
        } else {
          for (const acc of friends) {
            const row = makeRow(acc, {
              actionLabel: "Chat",
              onRowClick: () => showChat(acc),
              onActionClick: () => showChat(acc),
            });
            friendsEl.appendChild(row);
          }
        }
      } catch (_) {
        reqEl.innerHTML = "<p class=\"social-empty\">Could not load friends.</p>";
      }
    }

    wrap.querySelectorAll("[data-social-tab]").forEach((tab) => {
      tab.addEventListener("click", () => {
        const name = tab.getAttribute("data-social-tab");
        wrap.querySelectorAll("[data-social-tab]").forEach((t) => {
          t.classList.toggle("is-active", t === tab);
        });
        wrap.querySelectorAll("[data-social-panel]").forEach((p) => {
          const panelName = p.getAttribute("data-social-panel");
          p.hidden = panelName !== name;
        });
        if (name === "friends") renderFriends();
      });
    });

    wrap.querySelector("[data-social-back]").addEventListener("click", () => {
      showMain();
      renderExplore();
    });

    wrap.querySelector("[data-social-chat-back]").addEventListener("click", () => {
      if (detailAccount) {
        showDetail();
        refreshDetailAction();
      } else {
        showMain();
        renderFriends();
      }
    });

    wrap.querySelector("[data-social-like]").addEventListener("click", async () => {
      if (!detailAccount) return;
      await Social().toggleLike(detailAccount.id);
      await refreshDetailLikes();
    });

    wrap.querySelector("[data-social-comment-form]")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!detailAccount || !Social()?.addComment) return;
      const input = wrap.querySelector("[data-social-comment-input]");
      const text = input?.value || "";
      if (!text.trim()) return;
      await Social().addComment(detailAccount.id, text);
      if (input) input.value = "";
    });

    wrap.querySelector("[data-story-viewer-close]")?.addEventListener("click", closeStoryViewer);
    wrap.querySelector("[data-story-viewer-prev]")?.addEventListener("click", () => {
      if (!storyViewerList.length) return;
      storyViewerIndex = (storyViewerIndex - 1 + storyViewerList.length) % storyViewerList.length;
      renderStoryViewer();
    });
    wrap.querySelector("[data-story-viewer-next]")?.addEventListener("click", () => {
      if (!storyViewerList.length) return;
      storyViewerIndex = (storyViewerIndex + 1) % storyViewerList.length;
      renderStoryViewer();
    });
    wrap.querySelector("[data-social-story-viewer]")?.addEventListener("click", (e) => {
      if (e.target === wrap.querySelector("[data-social-story-viewer]")) closeStoryViewer();
    });

    wrap.querySelector("[data-social-action]").addEventListener("click", async () => {
      if (!detailAccount) return;
      const mode = wrap.querySelector("[data-social-action]").dataset.mode;
      if (mode === "friend") {
        await Social().sendFriendRequest(detailAccount.id);
        await refreshDetailAction();
      } else if (mode === "accept") {
        await Social().acceptFriendRequest(detailAccount.id);
        await refreshDetailAction();
        renderFriends();
      } else if (mode === "chat") {
        showChat(detailAccount);
      }
    });

    wrap.querySelector("[data-social-chat-attach]")?.addEventListener("click", () => {
      openFileBrowser({
        mode: "pick-chat-media",
        path: ["Photos"],
        onPick: async (src) => {
          if (!src) return;
          pendingChatImage = await mediaToShareableSrc(src, { maxWidth: 640, maxBytes: 400000 });
          const input = wrap.querySelector("[data-social-chat-input]");
          if (input) {
            input.placeholder = pendingChatImage ? "Add a caption (optional)…" : "Type a message…";
            input.focus();
          }
        },
      });
    });

    wrap.querySelector("[data-social-chat-form]").addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!chatFriend) return;
      const input = wrap.querySelector("[data-social-chat-input]");
      const text = input.value;
      if (!text.trim() && !pendingChatImage) return;
      await Social().sendMessage(chatFriend.id, text, { imageSrc: pendingChatImage });
      input.value = "";
      pendingChatImage = "";
      input.placeholder = "Type a message…";
    });

    makeWindow({
      id,
      title: "Social Media",
      icon: "assets/social-media-icon.svg",
      width: 380,
      height: 520,
      left: 160,
      top: 56,
      bodyHTML: wrap,
      bodyClass: "social-app-body",
      onClose: () => {
        stopChatListen();
        stopCommentsListen();
        closeStoryViewer();
        closeLinkedSession(appId, id);
      },
    });

    const session = appSessions.get(appId) || {};
    session.appWinId = id;
    if (termId) session.termId = termId;
    appSessions.set(appId, session);

    const pid = Cloud()?.getSession?.();
    if (pid && Social()?.publishAccount) {
      prepareShareableProfileData(readProfileData())
        .then((shared) => Social().publishAccount(pid, Cloud()?.getUsername?.() || "", shared))
        .catch((err) => console.warn("publishAccount failed:", err));
    }
    renderExplore();
    renderFriends();
  }

  let musicAudioEl = null;
  let musicPlaylist = [];
  let musicCurrentIndex = -1;
  let musicLoop = false;
  let musicPlayerUiRefresh = null;
  let musicPlayerWrapEl = null;
  let musicSeekDragging = false;
  let musicPrevClickTimer = 0;
  let musicPrevClickCount = 0;

  function formatMusicTime(sec) {
    if (!Number.isFinite(sec) || sec < 0) return "0:00";
    const total = Math.floor(sec);
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  }

  function updateMusicTransport() {
    if (!musicPlayerWrapEl) return;
    const audio = getMusicAudio();
    const pauseBtn = musicPlayerWrapEl.querySelector("[data-music-pause]");
    const seek = musicPlayerWrapEl.querySelector("[data-music-seek]");
    const timeEl = musicPlayerWrapEl.querySelector("[data-music-time]");
    const fill = musicPlayerWrapEl.querySelector("[data-music-seek-fill]");
    const prevBtn = musicPlayerWrapEl.querySelector("[data-music-prev]");
    const nextBtn = musicPlayerWrapEl.querySelector("[data-music-next]");
    const dur = audio.duration;
    const cur = audio.currentTime;
    const hasTrack = musicCurrentIndex >= 0 && Number.isFinite(dur) && dur > 0;
    if (pauseBtn) {
      pauseBtn.textContent = audio.paused ? "Play" : "Pause";
      pauseBtn.disabled = musicCurrentIndex < 0;
    }
    if (prevBtn) prevBtn.disabled = musicCurrentIndex < 0;
    if (nextBtn) nextBtn.disabled = musicPlaylist.length === 0;
    if (seek && !musicSeekDragging) {
      if (hasTrack) {
        seek.max = String(dur);
        seek.value = String(cur);
        seek.disabled = false;
      } else {
        seek.max = "100";
        seek.value = "0";
        seek.disabled = true;
      }
    }
    if (fill) {
      const pct = hasTrack ? Math.min(100, (cur / dur) * 100) : 0;
      fill.style.width = `${pct}%`;
    }
    if (timeEl) {
      timeEl.textContent = hasTrack
        ? `${formatMusicTime(cur)}/${formatMusicTime(dur)}`
        : "0:00/0:00";
    }
  }

  function skipMusicNext() {
    if (!musicPlaylist.length) return;
    if (musicCurrentIndex < musicPlaylist.length - 1) {
      playMusicTrack(musicCurrentIndex + 1);
    } else if (musicLoop) {
      playMusicTrack(0);
    }
  }

  function skipMusicPrev() {
    if (musicCurrentIndex > 0) {
      playMusicTrack(musicCurrentIndex - 1);
    }
  }

  function readMusicPlaylist() {
    try {
      const ver = localStorage.getItem(MUSIC_PLAYLIST_VER_KEY);
      if (ver !== String(MUSIC_PLAYLIST_VER)) {
        localStorage.setItem(MUSIC_PLAYLIST_VER_KEY, String(MUSIC_PLAYLIST_VER));
        return getBuiltinMusicTracks();
      }
      const raw = localStorage.getItem(MUSIC_PLAYLIST_KEY);
      const list = raw ? JSON.parse(raw) : [];
      if (Array.isArray(list) && list.length) return list;
    } catch (_) {
      /* ignore */
    }
    return getBuiltinMusicTracks();
  }

  function collectMusicTracksFromFolder(folderNode, pathParts) {
    const tracks = [];
    const children = folderNode?.children || {};
    for (const entry of Object.values(children)) {
      if (entry.type === "audio" && entry.src) {
        const folderLabel = pathParts.length > 1 ? pathParts[pathParts.length - 1] : "";
        tracks.push({
          name: entry.name,
          path: [...pathParts, entry.name],
          src: entry.src,
          folder: folderLabel,
        });
      } else if (entry.type === "folder") {
        tracks.push(...collectMusicTracksFromFolder(entry, [...pathParts, entry.name]));
      }
    }
    return tracks;
  }

  function getBuiltinMusicTracks() {
    const music = FS.root.children.Music;
    if (!music) return [];
    return collectMusicTracksFromFolder(music, ["Music"]);
  }

  function musicFolderLabel(track) {
    return track.folder || (track.path?.length >= 2 ? track.path[1] : "") || "Other";
  }

  function writeMusicPlaylist(list) {
    try {
      localStorage.setItem(MUSIC_PLAYLIST_KEY, JSON.stringify(list));
    } catch (_) {
      /* ignore */
    }
  }

  function getMusicAudio() {
    if (!musicAudioEl) {
      musicAudioEl = new Audio();
      musicAudioEl.addEventListener("ended", () => {
        if (musicLoop && musicCurrentIndex >= 0) {
          musicAudioEl.currentTime = 0;
          musicAudioEl.play().catch(() => {});
        } else if (musicCurrentIndex < musicPlaylist.length - 1) {
          playMusicTrack(musicCurrentIndex + 1);
        } else {
          musicCurrentIndex = -1;
          musicPlayerUiRefresh?.();
        }
      });
      musicAudioEl.addEventListener("play", () => {
        musicPlayerUiRefresh?.();
        updateMusicTransport();
      });
      musicAudioEl.addEventListener("pause", () => {
        musicPlayerUiRefresh?.();
        updateMusicTransport();
      });
      musicAudioEl.addEventListener("timeupdate", () => {
        if (!musicSeekDragging) updateMusicTransport();
      });
      musicAudioEl.addEventListener("loadedmetadata", () => updateMusicTransport());
      applyVolumeToAudio(musicAudioEl);
    }
    applyVolumeToAudio(musicAudioEl);
    return musicAudioEl;
  }

  function playMusicTrack(index) {
    if (index < 0 || index >= musicPlaylist.length) return;
    const track = musicPlaylist[index];
    const src = track.src || resolvePath(track.path || [])?.node?.src;
    if (!src) return;
    musicCurrentIndex = index;
    const audio = getMusicAudio();
    audio.src = src;
    applyVolumeToAudio(audio);
    audio.play().catch(() => {});
    musicPlayerUiRefresh?.();
    updateMusicTransport();
  }

  function stopMusicPlayback() {
    if (musicAudioEl) {
      musicAudioEl.pause();
      musicAudioEl.removeAttribute("src");
    }
    musicCurrentIndex = -1;
    musicPlayerUiRefresh?.();
    updateMusicTransport();
  }

  function addTrackToPlaylist(entry, pathParts) {
    if (!entry?.src) return;
    const key = pathKey(pathParts);
    const exists = musicPlaylist.some(
      (t) => t.name === entry.name && pathKey(t.path || []) === key
    );
    if (exists) return;
    musicPlaylist.push({
      name: entry.name,
      path: [...pathParts],
      src: entry.src,
      folder: pathParts.length >= 2 ? pathParts[pathParts.length - 2] : pathParts[0] || "",
    });
    writeMusicPlaylist(musicPlaylist);
    musicPlayerUiRefresh?.();
  }

  function openMusicPlayerApp(opts = {}) {
    const appId = "music-player";
    const id = `app:${appId}`;
    const termId = opts.termId || appSessions.get(appId)?.termId;

    if (openWindows.has(id)) {
      focusWindow(openWindows.get(id));
      const session = appSessions.get(appId) || {};
      session.appWinId = id;
      if (termId) session.termId = termId;
      appSessions.set(appId, session);
      return;
    }

    musicPlaylist = readMusicPlaylist().map((t) => {
      const node = resolvePath(t.path || [])?.node;
      return { ...t, src: node?.src || t.src || "" };
    });

    const wrap = document.createElement("div");
    wrap.className = "music-player";
    musicPlayerWrapEl = wrap;
    wrap.innerHTML = `
      <p class="music-now" data-music-now>Nothing playing</p>
      <div class="music-actions">
        <button type="button" class="win95-push" data-music-add>Add from My Files…</button>
        <button type="button" class="win95-push" data-music-clear>Clear playlist</button>
        <label class="music-loop">
          <input type="checkbox" data-music-loop /> Loop
        </label>
      </div>
      <p class="music-section-title">Playlist</p>
      <div class="music-playlist" data-music-list></div>
      <div class="music-transport">
        <div class="music-transport-btns">
          <button type="button" class="win95-push" data-music-prev title="Restart song — double-click for previous">Back</button>
          <button type="button" class="win95-push" data-music-pause disabled>Pause</button>
          <button type="button" class="win95-push" data-music-next title="Next song">Skip</button>
        </div>
        <div class="music-seek-row">
          <div class="music-seek-track" data-music-seek-wrap>
            <div class="music-seek-fill" data-music-seek-fill></div>
            <input type="range" class="music-seek" data-music-seek min="0" max="100" value="0" step="0.1" disabled />
          </div>
          <span class="music-time" data-music-time>0:00/0:00</span>
        </div>
      </div>
      <p class="music-hint">Upload MP3s to My Files → Music. Minimize to keep playing.</p>
    `;

    function refreshUi() {
      const now = wrap.querySelector("[data-music-now]");
      const list = wrap.querySelector("[data-music-list]");
      const audio = getMusicAudio();
      const current = musicCurrentIndex >= 0 ? musicPlaylist[musicCurrentIndex] : null;
      if (now) {
        now.textContent = current
          ? `Now playing: ${current.name}${audio.paused ? " (paused)" : ""}`
          : "Nothing playing";
      }
      updateMusicTransport();
      if (!list) return;
      list.innerHTML = "";
      if (!musicPlaylist.length) {
        list.innerHTML = "<p class=\"music-empty\">No songs yet.</p>";
        return;
      }
      const groups = new Map();
      musicPlaylist.forEach((track, i) => {
        const label = musicFolderLabel(track);
        if (!groups.has(label)) groups.set(label, []);
        groups.get(label).push({ track, index: i });
      });
      for (const [folderName, items] of groups) {
        const heading = document.createElement("p");
        heading.className = "music-folder-title";
        heading.textContent = folderName;
        list.appendChild(heading);
        for (const { track, index: i } of items) {
          const row = document.createElement("button");
          row.type = "button";
          row.className = "music-track" + (i === musicCurrentIndex ? " is-active" : "");
          row.innerHTML = `<span class="music-track-name"></span><span class="music-track-remove" title="Remove">×</span>`;
          row.querySelector(".music-track-name").textContent = track.name;
          row.querySelector(".music-track-remove").addEventListener("click", (e) => {
            e.stopPropagation();
            musicPlaylist.splice(i, 1);
            writeMusicPlaylist(musicPlaylist);
            if (musicCurrentIndex === i) stopMusicPlayback();
            else if (musicCurrentIndex > i) musicCurrentIndex -= 1;
            refreshUi();
          });
          row.addEventListener("click", () => playMusicTrack(i));
          list.appendChild(row);
        }
      }
    }

    musicPlayerUiRefresh = refreshUi;
    musicLoop = localStorage.getItem("archive-music-loop") === "1";
    const loopInput = wrap.querySelector("[data-music-loop]");
    if (loopInput) loopInput.checked = musicLoop;

    wrap.querySelector("[data-music-pause]").addEventListener("click", () => {
      const audio = getMusicAudio();
      if (musicCurrentIndex < 0 && musicPlaylist.length) {
        playMusicTrack(0);
        return;
      }
      if (audio.paused) audio.play().catch(() => {});
      else audio.pause();
    });

    wrap.querySelector("[data-music-next]").addEventListener("click", () => skipMusicNext());

    wrap.querySelector("[data-music-prev]").addEventListener("click", () => {
      musicPrevClickCount += 1;
      window.clearTimeout(musicPrevClickTimer);
      musicPrevClickTimer = window.setTimeout(() => {
        if (musicPrevClickCount >= 2) {
          skipMusicPrev();
        } else {
          const audio = getMusicAudio();
          if (musicCurrentIndex >= 0 && audio.src) {
            audio.currentTime = 0;
            updateMusicTransport();
          }
        }
        musicPrevClickCount = 0;
      }, 280);
    });

    const seekInput = wrap.querySelector("[data-music-seek]");
    seekInput.addEventListener("pointerdown", () => {
      musicSeekDragging = true;
    });
    seekInput.addEventListener("pointerup", () => {
      musicSeekDragging = false;
    });
    seekInput.addEventListener("input", () => {
      const audio = getMusicAudio();
      if (!Number.isFinite(audio.duration)) return;
      const t = Number(seekInput.value);
      audio.currentTime = t;
      updateMusicTransport();
    });
    seekInput.addEventListener("change", () => {
      musicSeekDragging = false;
      const audio = getMusicAudio();
      if (Number.isFinite(audio.duration)) {
        audio.currentTime = Number(seekInput.value);
      }
      updateMusicTransport();
    });

    wrap.querySelector("[data-music-loop]").addEventListener("change", (e) => {
      musicLoop = e.target.checked;
      localStorage.setItem("archive-music-loop", musicLoop ? "1" : "0");
    });

    wrap.querySelector("[data-music-add]").addEventListener("click", () => {
      openFileBrowser({
        mode: "pick-music",
        path: ["Music"],
        onAdd: (entry, pathParts) => addTrackToPlaylist(entry, pathParts),
      });
    });

    wrap.querySelector("[data-music-clear]").addEventListener("click", () => {
      if (!musicPlaylist.length) return;
      if (!window.confirm("Clear the whole playlist?")) return;
      stopMusicPlayback();
      musicPlaylist = [];
      writeMusicPlaylist(musicPlaylist);
      refreshUi();
    });

    makeWindow({
      id,
      title: "Music Player",
      icon: "assets/music-player-icon.svg",
      width: 340,
      height: 460,
      left: 180,
      top: 72,
      bodyHTML: wrap,
      bodyClass: "music-player-body",
      onClose: () => {
        musicPlayerUiRefresh = null;
        musicPlayerWrapEl = null;
        stopMusicPlayback();
        closeLinkedSession(appId, id);
      },
    });

    const session = appSessions.get(appId) || {};
    session.appWinId = id;
    if (termId) session.termId = termId;
    appSessions.set(appId, session);

    refreshUi();
  }

  function openBgChanger(opts = {}) {
    const appId = "bg-changer";
    const id = `app:${appId}`;
    const termId = opts.termId || appSessions.get(appId)?.termId;

    if (openWindows.has(id)) {
      focusWindow(openWindows.get(id));
      const session = appSessions.get(appId) || {};
      session.appWinId = id;
      if (termId) session.termId = termId;
      appSessions.set(appId, session);
      refreshBgChangerPreview();
      return;
    }

    const wrap = document.createElement("div");
    wrap.className = "bg-changer";
    wrap.innerHTML = `
      <p class="bg-changer-hint">Choose an image or GIF from My Files for your desktop wallpaper.</p>
      <div class="bg-changer-preview-wrap">
        <img data-wallpaper-preview alt="Current wallpaper" />
      </div>
      <div class="bg-changer-actions">
        <button type="button" class="win95-push" data-wallpaper-browse>Browse…</button>
        <button type="button" class="win95-push" data-wallpaper-reset>Reset</button>
      </div>
    `;
    const preview = wrap.querySelector("[data-wallpaper-preview]");
    preview.src = getWallpaperSrc();
    wrap.querySelector("[data-wallpaper-browse]").addEventListener("click", () => {
      openFileBrowser({ mode: "pick-wallpaper", path: ["Photos"] });
    });
    wrap.querySelector("[data-wallpaper-reset]").addEventListener("click", () => {
      setDesktopWallpaper(DEFAULT_WALLPAPER);
    });

    makeWindow({
      id,
      title: "Background Changer",
      width: 360,
      height: 320,
      left: 120,
      top: 70,
      bodyHTML: wrap,
      bodyClass: "bg-changer-body",
      onClose: () => {
        closeLinkedSession(appId, id);
      },
    });

    const session = appSessions.get(appId) || {};
    session.appWinId = id;
    if (termId) session.termId = termId;
    appSessions.set(appId, session);
  }

  let petState = null;

  function readPetMode() {
    try {
      const m = localStorage.getItem(PET_MODE_KEY);
      if (m === "follow" || m === "wander" || m === "idle") return m;
    } catch (_) {
      /* ignore */
    }
    return "follow";
  }

  function writePetMode(mode) {
    try {
      localStorage.setItem(PET_MODE_KEY, mode);
    } catch (_) {
      /* ignore */
    }
    Cloud()?.scheduleSave?.();
  }

  function hidePetCtx() {
    const ctx = document.getElementById("petCtx");
    if (ctx) ctx.hidden = true;
  }

  function showPetCtx(x, y) {
    const ctx = document.getElementById("petCtx");
    if (!ctx) return;
    const mode = petState?.mode || readPetMode();
    ctx.querySelectorAll("[data-pet-move]").forEach((btn) => {
      btn.classList.toggle("is-checked", btn.dataset.petMove === mode);
    });
    ctx.hidden = false;
    ctx.style.left = `${Math.min(x, window.innerWidth - 160)}px`;
    ctx.style.top = `${Math.min(y, window.innerHeight - 120)}px`;
  }

  function destroyDesktopPet() {
    if (!petState) return;
    if (petState.raf) cancelAnimationFrame(petState.raf);
    if (petState.onMove) document.removeEventListener("pointermove", petState.onMove);
    petState.el?.remove();
    petState = null;
    hidePetCtx();
  }

  function spawnDesktopPet() {
    if (petState?.el) return;
    if (!desktop) return;

    const el = document.createElement("div");
    el.className = "desktop-pet";
    el.setAttribute("aria-label", "Desktop pet");
    el.innerHTML = `<div class="desktop-pet-ball" aria-hidden="true"></div>`;
    desktop.appendChild(el);

    const rect = desktop.getBoundingClientRect();
    petState = {
      el,
      ball: el.querySelector(".desktop-pet-ball"),
      mode: readPetMode(),
      x: Math.max(40, rect.width * 0.5),
      y: Math.max(40, rect.height * 0.4),
      vx: 0,
      vy: 0,
      angle: 0,
      mouseX: rect.width * 0.5,
      mouseY: rect.height * 0.4,
      wanderTarget: null,
      wanderUntil: 0,
      raf: 0,
    };

    el.style.left = `${petState.x}px`;
    el.style.top = `${petState.y}px`;

    el.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      e.stopPropagation();
      hideDeskCtx();
      showPetCtx(e.clientX, e.clientY);
    });

    el.addEventListener("pointerdown", (e) => {
      if (e.button === 0) e.stopPropagation();
    });

    const onMove = (e) => {
      if (!petState || !desktop) return;
      const r = desktop.getBoundingClientRect();
      petState.mouseX = e.clientX - r.left;
      petState.mouseY = e.clientY - r.top;
    };
    document.addEventListener("pointermove", onMove);
    petState.onMove = onMove;

    const tick = () => {
      if (!petState) return;
      const desk = desktop.getBoundingClientRect();
      const maxX = Math.max(0, desk.width - 40);
      const maxY = Math.max(0, desk.height - 40 - 36);
      const mode = petState.mode;

      let tx = petState.mouseX;
      let ty = petState.mouseY;

      if (mode === "wander") {
        const now = Date.now();
        const target = petState.wanderTarget;
        const dist = target
          ? Math.hypot(target.x - petState.x, target.y - petState.y)
          : 999;
        if (!target || dist < 12 || now > petState.wanderUntil) {
          petState.wanderTarget = {
            x: 20 + Math.random() * Math.max(20, maxX - 20),
            y: 20 + Math.random() * Math.max(20, maxY - 20),
          };
          petState.wanderUntil = now + 1800 + Math.random() * 2200;
        }
        tx = petState.wanderTarget.x;
        ty = petState.wanderTarget.y;
      }

      if (mode === "idle") {
        petState.vx *= 0.88;
        petState.vy *= 0.88;
        if (Math.abs(petState.vx) < 0.04) petState.vx = 0;
        if (Math.abs(petState.vy) < 0.04) petState.vy = 0;
      } else {
        const dx = tx - (petState.x + 20);
        const dy = ty - (petState.y + 20);
        const d = Math.hypot(dx, dy) || 1;
        // ~30% homing: mostly keep momentum, gently steer
        const home = 0.3;
        const cruise = mode === "follow" ? 4.5 : 2.8;
        const desiredVx = (dx / d) * cruise;
        const desiredVy = (dy / d) * cruise;
        // slow acceleration toward desired velocity
        const accel = mode === "follow" ? 0.045 : 0.032;
        petState.vx += (desiredVx - petState.vx) * home * accel * 8;
        petState.vy += (desiredVy - petState.vy) * home * accel * 8;
        const maxSp = cruise;
        const sp = Math.hypot(petState.vx, petState.vy);
        if (sp > maxSp) {
          petState.vx = (petState.vx / sp) * maxSp;
          petState.vy = (petState.vy / sp) * maxSp;
        }
        if (mode === "follow" && d < 22) {
          petState.vx *= 0.92;
          petState.vy *= 0.92;
        }
      }

      petState.x += petState.vx;
      petState.y += petState.vy;
      petState.x = Math.max(0, Math.min(maxX, petState.x));
      petState.y = Math.max(0, Math.min(maxY, petState.y));

      const rolled = Math.hypot(petState.vx, petState.vy);
      petState.angle += rolled * 0.035;

      petState.el.style.left = `${petState.x}px`;
      petState.el.style.top = `${petState.y}px`;
      if (petState.ball) {
        petState.ball.style.transform = `rotate(${petState.angle}rad)`;
      }

      petState.raf = requestAnimationFrame(tick);
    };
    petState.raf = requestAnimationFrame(tick);
  }

  function setPetMode(mode) {
    if (!petState) return;
    if (mode !== "follow" && mode !== "wander" && mode !== "idle") return;
    petState.mode = mode;
    writePetMode(mode);
    if (mode === "wander") {
      petState.wanderTarget = null;
      petState.wanderUntil = 0;
    }
    hidePetCtx();
  }

  function openDesktopPetApp(opts = {}) {
    const appId = "desktop-pet";
    const id = `app:${appId}`;
    const termId = opts.termId || appSessions.get(appId)?.termId;

    spawnDesktopPet();

    if (openWindows.has(id)) {
      focusWindow(openWindows.get(id));
      const session = appSessions.get(appId) || {};
      session.appWinId = id;
      if (termId) session.termId = termId;
      appSessions.set(appId, session);
      return;
    }

    const wrap = document.createElement("div");
    wrap.className = "desktop-pet-app";
    wrap.innerHTML = `
      <p>Pet is on the desktop.</p>
      <p class="desktop-pet-app-hint">Right-click the ball → Movement → Follow, Wander, or Idle.</p>
    `;

    makeWindow({
      id,
      title: "Desktop Pet",
      width: 320,
      height: 160,
      left: 160,
      top: 100,
      bodyHTML: wrap,
      bodyClass: "desktop-pet-app-body",
      onClose: () => {
        destroyDesktopPet();
        closeLinkedSession(appId, id);
      },
    });

    const session = appSessions.get(appId) || {};
    session.appWinId = id;
    if (termId) session.termId = termId;
    appSessions.set(appId, session);
  }

  function importPaintImage(src) {
    if (!paintImportTarget?.canvas || !src) return;
    const { canvas, ctx, size, status } = paintImportTarget;
    const img = new Image();
    img.onload = () => {
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, size, size);
      ctx.drawImage(img, 0, 0, size, size);
      if (status) status.textContent = "Imported.";
    };
    img.onerror = () => {
      if (status) status.textContent = "Import failed.";
    };
    img.src = src;
  }

  function openPixelPaint(opts = {}) {
    const appId = "pixel-paint";
    const id = `app:${appId}`;
    const termId = opts.termId || appSessions.get(appId)?.termId;

    if (openWindows.has(id)) {
      focusWindow(openWindows.get(id));
      const session = appSessions.get(appId) || {};
      session.appWinId = id;
      if (termId) session.termId = termId;
      appSessions.set(appId, session);
      return;
    }

    const cfg = parsePaintConfig(loadPaintConfigBody());
    const SIZE = cfg.size;
    const GRID_ALPHA = cfg.gridTransparency;
    const defaultFolder = paintFolderPath(cfg.folder);
    const cellPx = Math.max(8, Math.min(20, Math.floor(320 / SIZE)));
    const viewPx = SIZE * cellPx;
    const SCALE = Math.max(8, cellPx);

    const wrap = document.createElement("div");
    wrap.className = "pixel-paint";
    wrap.innerHTML = `
      <div class="pixel-paint-toolbar">
        <label class="pixel-paint-color">
          <span>Color</span>
          <input type="color" value="#000000" data-paint-color />
        </label>
        <button type="button" class="win95-push is-active" data-paint-tool="draw">Draw</button>
        <button type="button" class="win95-push" data-paint-tool="erase">Erase</button>
        <button type="button" class="win95-push" data-paint-clear>Clear</button>
        <button type="button" class="win95-push" data-paint-save>Save As…</button>
        <button type="button" class="win95-push" data-paint-import>Import…</button>
      </div>
      <div class="pixel-paint-stage" style="--cells:${SIZE};--grid-alpha:${GRID_ALPHA};width:${viewPx}px;height:${viewPx}px;">
        <canvas class="pixel-paint-canvas" width="${SIZE}" height="${SIZE}"></canvas>
      </div>
      <p class="pixel-paint-status" data-paint-status>${SIZE}×${SIZE}</p>
    `;

    const canvas = wrap.querySelector(".pixel-paint-canvas");
    const ctx = canvas.getContext("2d", { alpha: true });
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, SIZE, SIZE);

    const colorInput = wrap.querySelector("[data-paint-color]");
    const status = wrap.querySelector("[data-paint-status]");
    let tool = "draw";
    let drawing = false;

    paintImportTarget = { canvas, ctx, size: SIZE, status };

    function exportDataUrl() {
      const out = document.createElement("canvas");
      out.width = SIZE * SCALE;
      out.height = SIZE * SCALE;
      const octx = out.getContext("2d", { alpha: true });
      octx.imageSmoothingEnabled = false;
      octx.clearRect(0, 0, out.width, out.height);
      octx.drawImage(canvas, 0, 0, out.width, out.height);
      return out.toDataURL("image/png");
    }

    function paintAt(e) {
      const rect = canvas.getBoundingClientRect();
      const x = Math.floor(((e.clientX - rect.left) / rect.width) * SIZE);
      const y = Math.floor(((e.clientY - rect.top) / rect.height) * SIZE);
      if (x < 0 || y < 0 || x >= SIZE || y >= SIZE) return;
      if (tool === "erase") {
        ctx.clearRect(x, y, 1, 1);
      } else {
        ctx.fillStyle = colorInput.value;
        ctx.fillRect(x, y, 1, 1);
      }
    }

    canvas.addEventListener("pointerdown", (e) => {
      drawing = true;
      canvas.setPointerCapture(e.pointerId);
      paintAt(e);
    });
    canvas.addEventListener("pointermove", (e) => {
      if (!drawing) return;
      paintAt(e);
    });
    canvas.addEventListener("pointerup", () => {
      drawing = false;
    });
    canvas.addEventListener("pointercancel", () => {
      drawing = false;
    });

    wrap.querySelectorAll("[data-paint-tool]").forEach((btn) => {
      btn.addEventListener("click", () => {
        tool = btn.dataset.paintTool;
        wrap.querySelectorAll("[data-paint-tool]").forEach((b) => b.classList.remove("is-active"));
        btn.classList.add("is-active");
      });
    });

    wrap.querySelector("[data-paint-clear]")?.addEventListener("click", () => {
      ctx.clearRect(0, 0, SIZE, SIZE);
      status.textContent = "Cleared.";
    });

    wrap.querySelector("[data-paint-save]")?.addEventListener("click", () => {
      openFileBrowser({
        mode: "save-paint",
        path: defaultFolder,
        dataUrl: exportDataUrl(),
        statusEl: status,
      });
    });

    wrap.querySelector("[data-paint-import]")?.addEventListener("click", () => {
      openFileBrowser({
        mode: "import-paint",
        path: defaultFolder,
        statusEl: status,
        canvas,
        size: SIZE,
      });
    });

    makeWindow({
      id,
      title: `Pixel Paint (${SIZE}×${SIZE})`,
      icon: "assets/paint-icon.png",
      width: Math.max(400, viewPx + 80),
      height: Math.max(440, viewPx + 160),
      bodyHTML: wrap,
      bodyClass: "pixel-paint-body",
      onClose: () => {
        if (paintImportTarget?.canvas === canvas) paintImportTarget = null;
        closeLinkedSession(appId, id);
      },
    });

    const session = appSessions.get(appId) || {};
    session.appWinId = id;
    if (termId) session.termId = termId;
    appSessions.set(appId, session);
  }

  function termPromptPath(parts) {
    return `C:\\ARCHIVE\\${parts.length ? parts.join("\\") : "MY FILES"}`;
  }

  function termResolvePath(cwd, arg) {
    if (!arg) return [...cwd];
    const clean = arg.replace(/\\/g, "/").trim();
    let parts = clean.startsWith("/") || clean.includes("\\") ? [] : [...cwd];
    const segments = clean.split(/[/\\]/).filter(Boolean);
    for (const seg of segments) {
      if (seg === "..") parts = parts.slice(0, -1);
      else if (seg !== ".") parts.push(seg);
    }
    return parts;
  }

  function runTerminalCommand(line, state) {
    const trimmed = line.trim();
    if (!trimmed) return [];
    const match = trimmed.match(/^(\S+)(?:\s+(.*))?$/);
    const cmd = (match?.[1] || "").toLowerCase();
    const rest = (match?.[2] || "").trim();
    const args = rest ? rest.split(/\s+/) : [];

    const helpLines = [
      "Archive Terminal — commands:",
      "  help, ?        List commands",
      "  clear, cls     Clear the screen",
      "  ver            Show version",
      "  date           Show date",
      "  time           Show time",
      "  whoami         Logged-in username",
      "  mem            Memory usage",
      "  pwd            Print current folder",
      "  cd <path>      Change folder (cd .., cd Tools)",
      "  dir, ls [path] List files in folder",
      "  type <file>    Print a text file",
      "  open files     Open My Files window",
      "  open <app>     Open app (profile, music, social, wiki, store, pet, paint)",
      "  echo <text>    Print text",
      "  fortune        Random tip",
      "  credits        About this system",
    ];

    switch (cmd) {
      case "help":
      case "?":
        return helpLines;
      case "clear":
      case "cls":
        return ["__CLEAR__"];
      case "ver":
        return [`Archive of Things v${APP_VERSION}`, "Copyright (c) Archive Corp 1995."];
      case "date":
        return [new Date().toLocaleDateString()];
      case "time":
        return [new Date().toLocaleTimeString()];
      case "whoami":
        return [Cloud()?.getUsername?.() || "guest"];
      case "mem": {
        const mb = Math.round(getChromeMemoryMB());
        const lim = Math.round(getChromeMemoryLimitMB());
        return [`${mb} MB used of ${lim} MB monitored load`];
      }
      case "pwd":
        return [termPromptPath(state.cwd)];
      case "cd": {
        if (!rest) return [`Current: ${termPromptPath(state.cwd)}`];
        const nextParts = termResolvePath(state.cwd, rest);
        const resolved = resolvePath(nextParts);
        if (!resolved || resolved.node.type !== "folder") return ["Invalid directory."];
        state.cwd = nextParts;
        return [];
      }
      case "dir":
      case "ls": {
        const pathParts = rest ? termResolvePath(state.cwd, rest) : [...state.cwd];
        const resolved = resolvePath(pathParts);
        if (!resolved || resolved.node.type !== "folder") return ["Not a folder."];
        const names = Object.keys(resolved.node.children || {}).sort();
        if (!names.length) return ["(empty)"];
        const rows = names.map((n) => {
          const child = resolved.node.children[n];
          const tag =
            child.type === "folder"
              ? "<DIR>"
              : child.type === "audio"
                ? " AUD"
                : child.type === "img"
                  ? " IMG"
                  : child.type === "bat"
                    ? " BAT"
                    : "    ";
          return `${tag}  ${n}`;
        });
        return [termPromptPath(pathParts), ...rows];
      }
      case "type": {
        if (!rest) return ["Usage: type <filename>"];
        const node = resolvePath([...state.cwd, rest])?.node;
        if (!node) return ["File not found."];
        if (node.type === "txt" || node.type === "ini" || node.type === "file") {
          const body = (node.body || "").replace(/\r\n/g, "\n");
          return body.split("\n").slice(0, 50);
        }
        return [`Cannot display ${node.name} (${node.type}).`];
      }
      case "open": {
        if (!rest) return ["Usage: open files | open <app>"];
        const target = rest.toLowerCase().split(/\s+/)[0];
        if (target === "files") {
          openFolderWindow([]);
          return ["Opened My Files."];
        }
        const apps = {
          profile: () => openProfileApp(),
          music: () => openMusicPlayerApp(),
          player: () => openMusicPlayerApp(),
          social: () => openSocialMediaApp(),
          store: () => openAppStore(),
          storage: () => openStorageWindow(),
          pet: () => openDesktopPetApp(),
          wallpaper: () => openBgChanger(),
          bg: () => openBgChanger(),
          paint: () => openPixelPaint(),
          textgen: () => openToolApp("text-generator"),
          lightning: () => openToolApp("lightning"),
          terminal: () => openTerminalApp(),
          wiki: () => openWikipediaApp(),
          wikipedia: () => openWikipediaApp(),
        };
        if (apps[target]) {
          apps[target]();
          return [`Launching ${rest}...`];
        }
        return ["Unknown app. Try: profile, music, social, wiki, store, pet, paint"];
      }
      case "echo":
        return rest ? [rest] : [""];
      case "fortune": {
        const tips = [
          "The archive remembers everything.",
          "Minimize Music Player to keep listening.",
          "Drag files onto My Files to upload.",
          "Type open music to blast Loud/phonk.",
          "Double-click run.bat to launch tools.",
        ];
        return [tips[Math.floor(Math.random() * tips.length)]];
      }
      case "credits":
        return ["Made by yours truly, Finley — but with AI."];
      default:
        return [`Bad command or file name: ${cmd}`, "Type help for commands."];
    }
  }

  function openTerminalApp(opts = {}) {
    const appId = "terminal";
    const id = `app:${appId}`;
    const termId = opts.termId || appSessions.get(appId)?.termId;

    if (openWindows.has(id)) {
      focusWindow(openWindows.get(id));
      const session = appSessions.get(appId) || {};
      session.appWinId = id;
      if (termId) session.termId = termId;
      appSessions.set(appId, session);
      return;
    }

    const state = { cwd: [] };
    const wrap = document.createElement("div");
    wrap.className = "archive-terminal";
    wrap.innerHTML = `
      <pre class="term-output" data-term-output></pre>
      <form class="term-input-row" data-term-form>
        <span class="term-prompt" data-term-prompt></span>
        <input type="text" class="term-input" data-term-input spellcheck="false" autocomplete="off" aria-label="Command" />
      </form>
    `;
    const output = wrap.querySelector("[data-term-output]");
    const form = wrap.querySelector("[data-term-form]");
    const input = wrap.querySelector("[data-term-input]");
    const promptEl = wrap.querySelector("[data-term-prompt]");

    function updatePrompt() {
      promptEl.textContent = `${termPromptPath(state.cwd)}>`;
    }

    function writeln(lines) {
      if (lines[0] === "__CLEAR__") {
        output.textContent = "";
        return;
      }
      for (const line of lines) {
        output.textContent += `${line}\n`;
      }
      output.scrollTop = output.scrollHeight;
    }

    updatePrompt();
    writeln([
      "Archive Terminal v1.0",
      "Type help for a list of commands.",
      "",
    ]);

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const line = input.value;
      if (!line.trim()) return;
      writeln([`${termPromptPath(state.cwd)}> ${line}`]);
      const result = runTerminalCommand(line, state);
      if (result.length) writeln(result);
      updatePrompt();
      input.focus();
    });

    makeWindow({
      id,
      title: "Terminal",
      icon: "assets/terminal-icon.svg",
      width: 560,
      height: 360,
      left: 100,
      top: 80,
      bodyHTML: wrap,
      bodyClass: "archive-terminal-body",
      onClose: () => closeLinkedSession(appId, id),
    });

    const session = appSessions.get(appId) || {};
    session.appWinId = id;
    if (termId) session.termId = termId;
    appSessions.set(appId, session);

    window.setTimeout(() => input.focus(), 80);
  }

  const WIKI_HOME = "https://en.wikipedia.org/wiki/Main_Page";

  function wikiNavigateUrl(input) {
    const raw = String(input || "").trim();
    if (!raw) return WIKI_HOME;
    if (/^https?:\/\//i.test(raw)) return raw;
    if (raw.includes("wikipedia.org")) return raw.startsWith("http") ? raw : `https://${raw}`;
    const title = raw.replace(/\s+/g, "_");
    if (/^special:/i.test(raw) || /^wiki:/i.test(raw)) {
      return `https://en.wikipedia.org/wiki/${title}`;
    }
    return `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/_/g, " ")).replace(/%20/g, "_")}`;
  }

  function openWikipediaApp(opts = {}) {
    const appId = "wikipedia";
    const id = `app:${appId}`;
    const termId = opts.termId || appSessions.get(appId)?.termId;

    if (openWindows.has(id)) {
      focusWindow(openWindows.get(id));
      const session = appSessions.get(appId) || {};
      session.appWinId = id;
      if (termId) session.termId = termId;
      appSessions.set(appId, session);
      return;
    }

    const wrap = document.createElement("div");
    wrap.className = "wiki-app";
    wrap.innerHTML = `
      <div class="wiki-toolbar">
        <button type="button" class="win95-push" data-wiki-back title="Back">←</button>
        <button type="button" class="win95-push" data-wiki-fwd title="Forward">→</button>
        <button type="button" class="win95-push" data-wiki-home title="Home">Home</button>
        <input type="text" class="wiki-url" data-wiki-url value="${WIKI_HOME}" spellcheck="false" />
        <button type="button" class="win95-push" data-wiki-go>Go</button>
        <button type="button" class="win95-push" data-wiki-external title="Open in browser">↗</button>
      </div>
      <iframe class="wiki-frame" data-wiki-frame title="Wikipedia" src="${WIKI_HOME}"></iframe>
    `;

    const frame = wrap.querySelector("[data-wiki-frame]");
    const urlInput = wrap.querySelector("[data-wiki-url]");

    function navigate(input) {
      const next = wikiNavigateUrl(input);
      if (!frame) return;
      frame.src = next;
      if (urlInput) urlInput.value = next;
    }

    wrap.querySelector("[data-wiki-home]")?.addEventListener("click", () => navigate(WIKI_HOME));
    wrap.querySelector("[data-wiki-go]")?.addEventListener("click", () => navigate(urlInput?.value));
    urlInput?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") navigate(urlInput.value);
    });
    wrap.querySelector("[data-wiki-back]")?.addEventListener("click", () => {
      try {
        frame?.contentWindow?.history?.back();
      } catch (_) {
        /* cross-origin */
      }
    });
    wrap.querySelector("[data-wiki-fwd]")?.addEventListener("click", () => {
      try {
        frame?.contentWindow?.history?.forward();
      } catch (_) {
        /* cross-origin */
      }
    });
    wrap.querySelector("[data-wiki-external]")?.addEventListener("click", () => {
      window.open(frame?.src || WIKI_HOME, "_blank", "noopener,noreferrer");
    });

    makeWindow({
      id,
      title: "Wikipedia",
      icon: "assets/wikipedia-icon.svg",
      width: 900,
      height: 640,
      left: 48,
      top: 36,
      bodyHTML: wrap,
      bodyClass: "wiki-app-body",
      onClose: () => closeLinkedSession(appId, id),
    });

    const session = appSessions.get(appId) || {};
    session.appWinId = id;
    if (termId) session.termId = termId;
    appSessions.set(appId, session);
  }

  function openToolApp(appId, opts = {}) {
    if (appId === "pixel-paint") {
      openPixelPaint(opts);
      return;
    }
    if (appId === "bg-changer") {
      openBgChanger(opts);
      return;
    }
    if (appId === "desktop-pet") {
      openDesktopPetApp(opts);
      return;
    }
    if (appId === "profile") {
      openProfileApp(opts);
      return;
    }
    if (appId === "social-media") {
      openSocialMediaApp(opts);
      return;
    }
    if (appId === "music-player") {
      openMusicPlayerApp(opts);
      return;
    }
    if (appId === "terminal") {
      openTerminalApp(opts);
      return;
    }
    if (appId === "wikipedia") {
      openWikipediaApp(opts);
      return;
    }
    const panel = document.querySelector(`[data-panel="${appId}"]`);
    if (!panel) return;

    const id = `app:${appId}`;
    const profile = opts.profile || "full";
    const termId = opts.termId || appSessions.get(appId)?.termId;

    if (openWindows.has(id)) {
      focusWindow(openWindows.get(id));
      if (typeof window.selectTool === "function") window.selectTool(appId);
      if (appId === "text-generator" && typeof window.setTextGenProfile === "function") {
        window.setTextGenProfile(profile);
      }
      if (appId === "text-generator" && typeof window.applyTextGenConfig === "function") {
        window.applyTextGenConfig(loadSavedConfigBody());
      }
      const session = appSessions.get(appId) || {};
      session.appWinId = id;
      if (termId) session.termId = termId;
      appSessions.set(appId, session);
      return;
    }

    const stash = document.getElementById("toolStash") || panel.parentElement;
    const host = document.createElement("div");
    host.className = "tool-host";
    host.appendChild(panel);
    panel.classList.add("is-active");
    document.querySelectorAll(".tool-panel").forEach((p) => {
      if (p !== panel) p.classList.remove("is-active");
    });

    const titleMap = {
      "text-generator": profile === "demo" ? "Text Generator Demo" : "Text Generator",
      lightning: "Lightning FX",
    };

    makeWindow({
      id,
      title: titleMap[appId] || appId,
      width: Math.min(920, window.innerWidth - 40),
      height: Math.min(640, window.innerHeight - 80),
      left: 36,
      top: 28,
      bodyHTML: host,
      onClose: () => {
        if (stash) stash.appendChild(panel);
        panel.classList.remove("is-active");
        if (typeof window.setTextGenProfile === "function" && appId === "text-generator") {
          window.setTextGenProfile("full");
        }
        closeLinkedSession(appId, id);
      },
    });

    const session = appSessions.get(appId) || {};
    session.appWinId = id;
    if (termId) session.termId = termId;
    appSessions.set(appId, session);

    const win = openWindows.get(id);
    const body = win.querySelector(".win95-body");
    body.style.background = "transparent";
    body.style.padding = "0";
    body.style.overflow = "hidden";
    body.style.display = "flex";
    body.style.flexDirection = "column";
    host.style.flex = "1";
    host.style.height = "100%";

    if (typeof window.selectTool === "function") window.selectTool(appId);
    if (appId === "text-generator") {
      if (typeof window.setTextGenProfile === "function") window.setTextGenProfile(profile);
      if (typeof window.applyTextGenConfig === "function") {
        window.applyTextGenConfig(loadSavedConfigBody());
      }
    }
    if (appId === "lightning") {
      window.setTimeout(() => window.dispatchEvent(new Event("resize")), 80);
    }
  }

  // Desktop icons: select / open / drag / drop / context
  renderDesktopIcons();

  deskIcons?.addEventListener("click", (e) => {
    const icon = e.target.closest(".desk-icon");
    if (!icon) return;
    if (deskDidDrag) {
      deskDidDrag = false;
      return;
    }
    deskIcons.querySelectorAll(".desk-icon").forEach((i) => i.classList.remove("is-selected"));
    icon.classList.add("is-selected");
  });

  deskIcons?.addEventListener("dblclick", (e) => {
    const icon = e.target.closest(".desk-icon");
    if (!icon || deskDidDrag) return;
    const sc = desktopShortcuts.find((s) => s.id === icon.dataset.scId);
    openShortcut(sc);
  });

  deskIcons?.addEventListener("contextmenu", (e) => {
    const icon = e.target.closest(".desk-icon");
    if (!icon) return;
    const sc = desktopShortcuts.find((s) => s.id === icon.dataset.scId);
    if (!sc || sc.kind !== "bat") return;
    e.preventDefault();
    showDeskCtx(e.clientX, e.clientY, {
      kind: "bat",
      pathKey: pathKey(sc.path || []),
      path: sc.path,
      iconSrc: getBatIcon(pathKey(sc.path || [])),
      shortcutId: sc.id,
    });
  });

  deskIcons?.addEventListener("pointerdown", (e) => {
    const icon = e.target.closest(".desk-icon");
    if (!icon || e.button !== 0) return;
    const sc = desktopShortcuts.find((s) => s.id === icon.dataset.scId);
    if (!sc) return;
    deskDidDrag = false;
    deskDrag = {
      id: sc.id,
      icon,
      startX: e.clientX,
      startY: e.clientY,
      origLeft: icon.offsetLeft,
      origTop: icon.offsetTop,
      pointerId: e.pointerId,
    };
    try {
      icon.setPointerCapture(e.pointerId);
    } catch (_) {
      /* ignore */
    }
  });

  deskIcons?.addEventListener("pointermove", (e) => {
    if (!deskDrag || e.pointerId !== deskDrag.pointerId) return;
    const dx = e.clientX - deskDrag.startX;
    const dy = e.clientY - deskDrag.startY;
    if (!deskDidDrag && Math.hypot(dx, dy) < 6) return;
    deskDidDrag = true;
    deskDrag.icon.classList.add("is-dragging");
    const area = deskIcons.getBoundingClientRect();
    let left = deskDrag.origLeft + dx;
    let top = deskDrag.origTop + dy;
    left = Math.max(0, Math.min(left, area.width - 84));
    top = Math.max(0, Math.min(top, area.height - 72));
    deskDrag.icon.style.left = `${left}px`;
    deskDrag.icon.style.top = `${top}px`;
  });

  function endDeskDrag(e) {
    if (!deskDrag || (e && e.pointerId !== deskDrag.pointerId)) return;
    const icon = deskDrag.icon;
    const sc = desktopShortcuts.find((s) => s.id === deskDrag.id);
    icon.classList.remove("is-dragging");
    if (deskDidDrag && sc) {
      const col = snapCol(icon.offsetLeft);
      const row = snapRow(icon.offsetTop);
      sc.col = col;
      sc.row = row;
      saveDesktopShortcuts(desktopShortcuts);
      const pos = cellToPos(col, row);
      icon.style.left = `${pos.left}px`;
      icon.style.top = `${pos.top}px`;
    }
    deskDrag = null;
  }

  deskIcons?.addEventListener("pointerup", endDeskDrag);
  deskIcons?.addEventListener("pointercancel", endDeskDrag);

  deskIcons?.addEventListener("dragover", (e) => {
    if ([...e.dataTransfer.types].includes("Files")) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
      desktop?.classList.add("is-file-drop");
      return;
    }
    if (![...e.dataTransfer.types].includes("application/x-archive-item")) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  });

  deskIcons?.addEventListener("dragleave", (e) => {
    if (desktop?.contains(e.relatedTarget)) return;
    desktop?.classList.remove("is-file-drop");
  });

  deskIcons?.addEventListener("drop", (e) => {
    desktop?.classList.remove("is-file-drop");
    const files = [...e.dataTransfer.files];
    if (files.length) {
      e.preventDefault();
      e.stopPropagation();
      uploadFilesToFolder([], files);
      return;
    }
    e.preventDefault();
    let raw = e.dataTransfer.getData("application/x-archive-item");
    if (!raw) return;
    let data;
    try {
      data = JSON.parse(raw);
    } catch (_) {
      return;
    }
    if (!data?.path?.length) return;
    const resolved = resolvePath(data.path);
    if (!resolved?.node) return;
    const sc = addDesktopShortcutFromPath(data.path, resolved.node);
    if (sc && sc.kind !== "files") {
      const rect = deskIcons.getBoundingClientRect();
      sc.col = snapCol(e.clientX - rect.left - 40);
      sc.row = snapRow(e.clientY - rect.top - 40);
      saveDesktopShortcuts(desktopShortcuts);
      renderDesktopIcons();
    }
  });

  wireFsDropTarget(desktop, []);

  document.getElementById("deskCtx")?.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-ctx]");
    if (!btn || !ctxTarget) return;
    const act = btn.dataset.ctx;
    const target = ctxTarget;
    hideDeskCtx();
    if (act === "customise") openCustomiseIcon(target);
    else if (act === "new-folder" && target.kind === "folder-bg") {
      createNewFolder(target.path || []);
    }     else if (act === "new-doc" && target.kind === "folder-bg") {
      createNewDocument(target.path || []);
    } else if (act === "new-html" && target.kind === "folder-bg") {
      createNewHtmlDocument(target.path || []);
    } else if (act === "new-bat" && target.kind === "folder-bg") {
      createNewBat(target.path || []);
    } else if (act === "upload-files" && target.kind === "folder-bg") {
      openFolderUpload(target.path || []);
    } else if (act === "open-doc" && target.kind === "doc" && target.entry) {
      openTextFile(target.entry);
    } else if (act === "open-tab" && target.kind === "doc" && target.entry) {
      openInTab(target.entry);
    } else if (act === "rename") {
      promptRename(target);
    } else if (act === "delete") {
      deleteFsEntry(target);
    }
  });

  document.addEventListener("pointerdown", (e) => {
    if (!e.target.closest("#deskCtx")) hideDeskCtx();
    if (!e.target.closest("#petCtx") && !e.target.closest(".desktop-pet")) hidePetCtx();
  });

  document.getElementById("petCtx")?.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-pet-move]");
    if (!btn) return;
    e.stopPropagation();
    setPetMode(btn.dataset.petMove);
  });

  document.getElementById("iconCustomiseX")?.addEventListener("click", closeCustomiseIcon);
  document.getElementById("iconCustomiseCancel")?.addEventListener("click", closeCustomiseIcon);
  document.getElementById("iconCustomiseSave")?.addEventListener("click", saveCustomiseIcon);
  document.getElementById("iconChooseFiles")?.addEventListener("click", openImagePicker);
  document.getElementById("iconPickerClose")?.addEventListener("click", closeIconPicker);
  document.getElementById("fileBrowserClose")?.addEventListener("click", closeFileBrowser);

  document.getElementById("fsUploadInput")?.addEventListener("change", (e) => {
    const files = e.target.files;
    if (!files?.length || !pendingUploadPath) return;
    uploadFilesToFolder(pendingUploadPath, files);
    pendingUploadPath = null;
    e.target.value = "";
  });

  document.getElementById("fileBrowserModal")?.addEventListener("pointerdown", (e) => {
    if (e.target.id === "fileBrowserModal") closeFileBrowser();
  });

  document.getElementById("mailToastClose")?.addEventListener("click", hideMailToast);

  document.getElementById("iconPickerModal")?.addEventListener("pointerdown", (e) => {
    if (e.target.id === "iconPickerModal") closeIconPicker();
  });

  document.getElementById("iconCustomise")?.addEventListener("pointerdown", (e) => {
    // block clicks on the dimmed backdrop from reaching the desktop
    if (e.target.id === "iconCustomise") e.stopPropagation();
  });

  document.getElementById("taskStartBtn")?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    const menu = document.getElementById("startMenu");
    if (!menu) return;
    if (menu.hasAttribute("hidden")) openStartMenu();
    else closeStartMenu();
  });

  document.getElementById("taskStartBtn")?.addEventListener("pointerdown", (e) => {
    e.stopPropagation();
  });

  const startMenuEl = document.getElementById("startMenu");
  const startPowerItem = document.getElementById("startPowerItem");
  const startPowerSub = document.getElementById("startPowerSub");
  wireStartVolumeControls();

  function showPowerSub() {
    if (!startPowerSub || !startPowerItem) return;
    startPowerSub.hidden = false;
    startPowerItem.classList.add("is-hot");
  }

  function hidePowerSub() {
    if (!startPowerSub || !startPowerItem) return;
    startPowerSub.hidden = true;
    startPowerItem.classList.remove("is-hot");
  }

  startPowerItem?.addEventListener("pointerenter", showPowerSub);
  startPowerItem?.addEventListener("focus", showPowerSub);
  startMenuEl?.addEventListener("pointerleave", hidePowerSub);

  startMenuEl?.addEventListener("pointerover", (e) => {
    const item = e.target.closest(".start-item");
    if (!item || !startMenuEl.contains(item)) return;
    if (item.id === "startPowerItem") showPowerSub();
    else if (!e.target.closest(".start-submenu")) hidePowerSub();
  });

  startMenuEl?.addEventListener("click", (e) => {
    const power = e.target.closest("[data-power]");
    if (power) {
      e.stopPropagation();
      runPowerAction(power.dataset.power);
      return;
    }
    const storage = e.target.closest('[data-start="storage"]');
    if (storage) {
      e.stopPropagation();
      openStorageWindow();
      return;
    }
    const store = e.target.closest('[data-start="store"]');
    if (store) {
      e.stopPropagation();
      openAppStore();
      return;
    }
    const files = e.target.closest('[data-start="files"]');
    if (files) {
      e.stopPropagation();
      closeStartMenu();
      openFolderWindow([]);
      return;
    }
    const signout = e.target.closest('[data-start="signout"]');
    if (signout) {
      e.stopPropagation();
      doLogout();
      return;
    }
    const factoryReset = e.target.closest('[data-start="factory-reset"]');
    if (factoryReset) {
      e.stopPropagation();
      openFactoryReset();
    }
  });

  document.getElementById("startStorageItem")?.addEventListener("dblclick", (e) => {
    e.stopPropagation();
    openStorageWindow();
  });

  windowLayer?.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-delete-app]");
    if (!btn) return;
    const id = btn.dataset.deleteApp;
    if (!id) return;
    const name =
      btn.closest(".storage-row")?.querySelector(".storage-row-name")?.textContent ||
      "this program";
    if (!window.confirm(`Delete ${name}?\n\nSettings for it will be lost.`)) return;
    deleteApp(id);
  });

  document.getElementById("factoryResetBack")?.addEventListener("click", closeFactoryReset);

  document.getElementById("factoryResetConfirm")?.addEventListener("click", async () => {
    const btn = document.getElementById("factoryResetConfirm");
    const hint = document.getElementById("factoryResetHint");
    if (!factoryResetArmed) {
      factoryResetArmed = true;
      btn?.classList.add("is-armed");
      hint?.classList.add("is-on");
      if (btn) btn.textContent = "CONFIRM";
      return;
    }
    await runFactoryReset();
  });

  document.body.classList.add("boot-mode");
  tickClocks();
  window.setInterval(tickClocks, 1000);

  // After login or restart: enter desktop. Otherwise boot → Space → login.
  {
    const cloud = Cloud();
    if (cloud?.consumeJustLoggedIn?.() && cloud?.getSession()) {
      boot?.classList.add("is-up");
      document.body.classList.remove("boot-mode");
      window.setTimeout(() => enterDesktop(), 0);
    } else if (cloud?.consumeNeedLogin?.()) {
      boot?.classList.add("is-up");
      phase = "login";
      document.body.classList.remove("boot-mode");
      showLoginScreen();
    }
  }

  window.setInterval(() => {
    if (phase === "desktop") Cloud()?.scheduleSave?.();
  }, 20000);

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") Cloud()?.flushSave?.();
  });

  window.addEventListener("pagehide", () => {
    Cloud()?.flushSave?.();
  });
})();
