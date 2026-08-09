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
      return true;
    } catch (err) {
      if (err?.name === "QuotaExceededError") {
        console.warn("Profile storage full — could not save locally.");
      }
      return false;
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
    if (!writeLocalDb(local)) {
      console.warn("Local profile save failed — storage may be full.");
      return false;
    }

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
      saveTimer = 0;
      saveProfile(id);
    }, 400);
  }

  function flushSave() {
    const id = getSession();
    if (!id) return Promise.resolve(false);
    if (saveTimer) {
      window.clearTimeout(saveTimer);
      saveTimer = 0;
    }
    return saveProfile(id);
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

  async function deleteSubcollection(ref) {
    if (!firebaseReady || !db || !ref) return;
    const snap = await ref.limit(400).get();
    if (snap.empty) return;
    const batch = db.batch();
    snap.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
    if (snap.size >= 400) await deleteSubcollection(ref);
  }

  async function deleteCloudAccount(profileId) {
    if (!firebaseReady || !db || !profileId) return;

    try {
      await db.collection("profiles").doc(profileId).delete();
    } catch (err) {
      console.warn("profiles delete failed:", err);
    }

    try {
      const accRef = db.collection("accounts").doc(profileId);
      await deleteSubcollection(accRef.collection("likes"));
      await deleteSubcollection(accRef.collection("comments"));
      await accRef.delete();
    } catch (err) {
      console.warn("accounts delete failed:", err);
    }

    try {
      const linkSnaps = await Promise.all([
        db.collection("friendLinks").where("from", "==", profileId).get(),
        db.collection("friendLinks").where("to", "==", profileId).get(),
      ]);
      const linkIds = new Set();
      for (const snap of linkSnaps) {
        snap.forEach((doc) => linkIds.add(doc.id));
      }
      for (const linkId of linkIds) {
        try {
          await db.collection("friendLinks").doc(linkId).delete();
          const chatRef = db.collection("chats").doc(linkId);
          await deleteSubcollection(chatRef.collection("messages"));
          await chatRef.delete();
        } catch (err) {
          console.warn("friend/chat delete failed:", linkId, err);
        }
      }
    } catch (err) {
      console.warn("friendLinks delete failed:", err);
    }

    try {
      const likesSnap = await db.collectionGroup("likes").get();
      const likeBatch = db.batch();
      let likeOps = 0;
      likesSnap.forEach((doc) => {
        if (doc.id !== profileId) return;
        likeBatch.delete(doc.ref);
        likeOps += 1;
      });
      if (likeOps) await likeBatch.commit();
    } catch (err) {
      console.warn("likes cleanup failed:", err);
    }

    try {
      const commentSnap = await db.collectionGroup("comments").where("from", "==", profileId).get();
      if (!commentSnap.empty) {
        const batch = db.batch();
        commentSnap.forEach((doc) => batch.delete(doc.ref));
        await batch.commit();
      }
    } catch (err) {
      console.warn("comments cleanup failed:", err);
    }
  }

  async function deleteAccount(profileId) {
    const id = profileId || getSession();
    if (!id) return false;

    const local = readLocalDb();
    if (local[id]) {
      delete local[id];
      writeLocalDb(local);
    }

    await deleteCloudAccount(id);

    clearSession();
    clearArchiveLocal();
    return true;
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
    flushSave,
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
    deleteAccount,
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
