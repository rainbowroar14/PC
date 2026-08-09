/* Username + password profiles: Cloud Firestore + local mirror */
(function () {
  const LOCAL_PROFILES_KEY = "archive-profiles-db";
  const SESSION_KEY = "archive-session";
  const SESSION_USER_KEY = "archive-session-user";
  const NEED_LOGIN_KEY = "archive-need-login";
  const JUST_LOGGED_IN_KEY = "archive-just-logged-in";
  const SESSION_HASH_KEY = "archive-session-pwhash";
  const META_KEYS = new Set([LOCAL_PROFILES_KEY]);

  let db = null;
  let firebaseReady = false;
  let saveTimer = 0;

  function configOk() {
    const c = window.ARCHIVE_FIREBASE_CONFIG;
    return !!(
      window.ARCHIVE_FIREBASE_ENABLED &&
      c &&
      c.apiKey &&
      !String(c.apiKey).includes("PASTE_") &&
      !String(c.apiKey).includes("Dummy") &&
      c.projectId &&
      !String(c.projectId).includes("PASTE_")
    );
  }

  function initFirebase() {
    if (!configOk() || typeof firebase === "undefined") {
      if (window.ARCHIVE_FIREBASE_ENABLED) {
        console.warn("Firebase config incomplete — using local profiles only.");
      }
      return;
    }
    try {
      if (!firebase.apps.length) firebase.initializeApp(window.ARCHIVE_FIREBASE_CONFIG);
      db = firebase.firestore();
      firebaseReady = true;
      console.info("Cloud Firestore connected.");
    } catch (err) {
      console.warn("Firebase init failed, using local profiles.", err);
      firebaseReady = false;
      db = null;
    }
  }

  async function digest(text) {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  function normalizeUsername(username) {
    return String(username || "")
      .trim()
      .replace(/[\\/:*?"<>|]/g, "")
      .slice(0, 32);
  }

  async function profileIdForUsername(username) {
    const clean = normalizeUsername(username);
    if (!clean) return "";
    return digest("archive-user:" + clean.toLowerCase());
  }

  async function hashLogin(username, password) {
    const user = normalizeUsername(username);
    const pass = String(password || "");
    return digest(`archive-of-things:${user.toLowerCase()}:${pass}`);
  }

  function collectArchiveData() {
    const data = {};
    try {
      for (let i = 0; i < localStorage.length; i += 1) {
        const k = localStorage.key(i);
        if (!k || !k.startsWith("archive-")) continue;
        if (META_KEYS.has(k)) continue;
        data[k] = localStorage.getItem(k);
      }
    } catch (_) {
      /* ignore */
    }
    return data;
  }

  function clearArchiveLocal() {
    try {
      const keys = [];
      for (let i = 0; i < localStorage.length; i += 1) {
        const k = localStorage.key(i);
        if (k && k.startsWith("archive-") && !META_KEYS.has(k)) keys.push(k);
      }
      keys.forEach((k) => localStorage.removeItem(k));
    } catch (_) {
      /* ignore */
    }
  }

  function applyArchiveData(data) {
    clearArchiveLocal();
    if (!data || typeof data !== "object") return;
    Object.keys(data).forEach((k) => {
      if (!k.startsWith("archive-") || META_KEYS.has(k)) return;
      try {
        localStorage.setItem(k, data[k]);
      } catch (_) {
        /* ignore */
      }
    });
  }

  function readLocalDb() {
    try {
      const raw = localStorage.getItem(LOCAL_PROFILES_KEY);
      const map = raw ? JSON.parse(raw) : {};
      return map && typeof map === "object" ? map : {};
    } catch (_) {
      return {};
    }
  }

  function writeLocalDb(map) {
    try {
      localStorage.setItem(LOCAL_PROFILES_KEY, JSON.stringify(map));
    } catch (_) {
      /* ignore */
    }
  }

  async function fetchProfileRecord(profileId) {
    const local = readLocalDb();
    const localRecord = local[profileId] ?? null;
    let record = null;

    if (firebaseReady && db) {
      try {
        const snap = await db.collection("profiles").doc(profileId).get();
        if (snap.exists) record = snap.data();
      } catch (err) {
        console.warn("Firebase load failed, trying local.", err);
      }
    }

    if (!record) {
      record = localRecord;
    } else if (localRecord) {
      if (!record.passwordHash && localRecord.passwordHash) {
        record.passwordHash = localRecord.passwordHash;
      }
      if (!record.username && localRecord.username) {
        record.username = localRecord.username;
      }
    }

    return record;
  }

  async function loadProfile(username, password) {
    const displayName = normalizeUsername(username);
    if (!displayName) {
      throw new Error("Enter a username.");
    }
    if (!String(password || "").length) {
      throw new Error("Enter a password.");
    }

    const profileId = await profileIdForUsername(displayName);
    const passwordHash = await hashLogin(displayName, password);
    const record = await fetchProfileRecord(profileId);

    if (record) {
      const storedHash = String(record.passwordHash || "");
      if (!storedHash) {
        throw new Error("This account has no password saved. Use a new username to sign up.");
      }
      if (storedHash !== passwordHash) {
        throw new Error("Wrong password for this computer.");
      }
      const data = record.data || null;
      if (data && typeof data === "object") applyArchiveData(data);
      else clearArchiveLocal();
      return {
        profileId,
        username: record.username || displayName,
        isNew: false,
        passwordHash: storedHash,
      };
    }

    clearArchiveLocal();
    return { profileId, username: displayName, isNew: true, passwordHash };
  }

  async function saveProfile(profileId) {
    const id = profileId || sessionStorage.getItem(SESSION_KEY);
    if (!id) return false;

    const username = sessionStorage.getItem(SESSION_USER_KEY) || "";
    const local = readLocalDb();
    const existing = local[id] || {};
    const sessionHash = sessionStorage.getItem(SESSION_HASH_KEY) || "";
    const passwordHash = existing.passwordHash || sessionHash || "";

    const payload = {
      username: username || existing.username || "",
      passwordHash,
      data: collectArchiveData(),
      updatedAt: Date.now(),
    };

    local[id] = payload;
    writeLocalDb(local);

    if (firebaseReady && db) {
      try {
        await db.collection("profiles").doc(id).set(payload, { merge: true });
      } catch (err) {
        console.warn("Firebase save failed; local profile kept.", err);
      }
    }
    return true;
  }

  async function createProfileOnLogin(profileId, username, passwordHash) {
    const payload = {
      username,
      passwordHash,
      data: collectArchiveData(),
      updatedAt: Date.now(),
    };

    const local = readLocalDb();
    local[profileId] = payload;
    writeLocalDb(local);

    if (firebaseReady && db) {
      try {
        await db.collection("profiles").doc(profileId).set(payload);
      } catch (err) {
        console.warn("Firebase create failed; local profile kept.", err);
      }
    }
  }

  function scheduleSave() {
    const id = sessionStorage.getItem(SESSION_KEY);
    if (!id) return;
    if (saveTimer) window.clearTimeout(saveTimer);
    saveTimer = window.setTimeout(() => {
      saveProfile(id);
    }, 400);
  }

  function getSession() {
    return sessionStorage.getItem(SESSION_KEY) || "";
  }

  function getUsername() {
    return sessionStorage.getItem(SESSION_USER_KEY) || "";
  }

  function setSession(profileId, username, passwordHash) {
    sessionStorage.setItem(SESSION_KEY, profileId);
    sessionStorage.setItem(SESSION_USER_KEY, normalizeUsername(username));
    if (passwordHash) sessionStorage.setItem(SESSION_HASH_KEY, passwordHash);
  }

  function clearSession() {
    sessionStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_USER_KEY);
    sessionStorage.removeItem(SESSION_HASH_KEY);
  }

  function markNeedLogin() {
    sessionStorage.setItem(NEED_LOGIN_KEY, "1");
  }

  function consumeNeedLogin() {
    const v = sessionStorage.getItem(NEED_LOGIN_KEY) === "1";
    sessionStorage.removeItem(NEED_LOGIN_KEY);
    return v;
  }

  function markJustLoggedIn() {
    sessionStorage.setItem(JUST_LOGGED_IN_KEY, "1");
  }

  function consumeJustLoggedIn() {
    const v = sessionStorage.getItem(JUST_LOGGED_IN_KEY) === "1";
    sessionStorage.removeItem(JUST_LOGGED_IN_KEY);
    return v;
  }

  initFirebase();

  window.ArchiveCloud = {
    normalizeUsername,
    profileIdForUsername,
    hashLogin,
    loadProfile,
    saveProfile,
    createProfileOnLogin,
    scheduleSave,
    collectArchiveData,
    applyArchiveData,
    clearArchiveLocal,
    getSession,
    getUsername,
    setSession,
    clearSession,
    markNeedLogin,
    consumeNeedLogin,
    markJustLoggedIn,
    consumeJustLoggedIn,
    isFirebaseReady: () => firebaseReady,
  };

  window.addEventListener("beforeunload", () => {
    const id = getSession();
    if (!id) return;
    try {
      const username = getUsername();
      const local = readLocalDb();
      const existing = local[id] || {};
      const sessionHash = sessionStorage.getItem(SESSION_HASH_KEY) || "";
      const payload = {
        username: username || existing.username || "",
        passwordHash: existing.passwordHash || sessionHash || "",
        data: collectArchiveData(),
        updatedAt: Date.now(),
      };
      local[id] = payload;
      writeLocalDb(local);
    } catch (_) {
      /* ignore */
    }
  });
})();
