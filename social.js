/* Social accounts, friends, and chat — Cloud Firestore */
(function () {
  function db() {
    const cloud = window.ArchiveCloud;
    if (!cloud?.isFirebaseReady?.()) return null;
    try {
      if (!firebase.apps.length) return null;
      return firebase.firestore();
    } catch (_) {
      return null;
    }
  }

  function myId() {
    return window.ArchiveCloud?.getSession?.() || "";
  }

  function pairId(a, b) {
    return [a, b].sort().join("_");
  }

  function chatId(a, b) {
    return pairId(a, b);
  }

  function blankAvatar() {
    return "assets/profile-blank.svg";
  }

  function displayLabel(account) {
    if (!account) return "User";
    return account.displayName?.trim() || account.username || "User";
  }

  async function publishAccount(profileId, username, profileData) {
    const fire = db();
    if (!fire || !profileId) return false;
    const data = profileData || {};
    await fire
      .collection("accounts")
      .doc(profileId)
      .set(
        {
          username: username || "",
          displayName: data.displayName || username || "",
          pictureSrc: data.pictureSrc || "",
          pronouns: data.pronouns || "",
          description: data.description || "",
          stories: Array.isArray(data.stories) ? data.stories.slice(0, 3) : [],
          updatedAt: Date.now(),
        },
        { merge: true }
      );
    return true;
  }

  function profileDataFromBlob(blob) {
    let profileData = {};
    try {
      const raw = blob?.data?.["archive-user-profile"];
      if (typeof raw === "string") profileData = JSON.parse(raw);
    } catch (_) {
      /* ignore */
    }
    return profileData;
  }

  /** Copy public fields from profiles into accounts (existing users before Social Media). */
  async function bootstrapAccountsFromProfiles() {
    const fire = db();
    if (!fire) return;
    const profilesSnap = await fire.collection("profiles").get();
    if (profilesSnap.empty) return;
    const batch = fire.batch();
    let n = 0;
    profilesSnap.forEach((doc) => {
      const d = doc.data() || {};
      const pd = profileDataFromBlob(d);
      batch.set(
        fire.collection("accounts").doc(doc.id),
        {
          username: d.username || "",
          displayName: pd.displayName || d.username || "",
          pictureSrc: pd.pictureSrc || "",
          pronouns: pd.pronouns || "",
          description: pd.description || "",
          stories: Array.isArray(pd.stories) ? pd.stories.slice(0, 3) : [],
          updatedAt: Date.now(),
        },
        { merge: true }
      );
      n += 1;
    });
    if (n) await batch.commit();
  }

  async function listAccounts() {
    const fire = db();
    const id = myId();
    if (!fire) return [];
    let snap = await fire.collection("accounts").get();
    if (snap.empty) {
      await bootstrapAccountsFromProfiles();
      snap = await fire.collection("accounts").get();
    }
    const list = [];
    snap.forEach((doc) => {
      if (doc.id === id) return;
      const d = doc.data() || {};
      list.push({ id: doc.id, ...d });
    });
    list.sort((a, b) => displayLabel(a).localeCompare(displayLabel(b)));
    return list;
  }

  async function getAccount(profileId) {
    const fire = db();
    if (!fire || !profileId) return null;
    const snap = await fire.collection("accounts").doc(profileId).get();
    if (!snap.exists) return null;
    return { id: profileId, ...snap.data() };
  }

  async function getLink(otherId) {
    const me = myId();
    const fire = db();
    if (!fire || !me || !otherId) return null;
    const snap = await fire.collection("friendLinks").doc(pairId(me, otherId)).get();
    if (!snap.exists) return null;
    return snap.data();
  }

  async function getRelation(otherId) {
    const me = myId();
    if (!me || !otherId || me === otherId) return "self";
    const link = await getLink(otherId);
    if (!link) return "none";
    if (link.status === "accepted") return "friends";
    if (link.status === "pending") {
      return link.requester === me ? "pending_out" : "pending_in";
    }
    return "none";
  }

  async function sendFriendRequest(otherId) {
    const me = myId();
    const fire = db();
    if (!fire || !me || !otherId || me === otherId) return false;
    const rel = await getRelation(otherId);
    if (rel !== "none") return false;
    const meAcc = await getAccount(me);
    const otherAcc = await getAccount(otherId);
    await fire
      .collection("friendLinks")
      .doc(pairId(me, otherId))
      .set({
        from: me,
        to: otherId,
        requester: me,
        fromUsername: meAcc?.username || "",
        fromDisplay: displayLabel(meAcc),
        fromPicture: meAcc?.pictureSrc || "",
        toUsername: otherAcc?.username || "",
        toDisplay: displayLabel(otherAcc),
        toPicture: otherAcc?.pictureSrc || "",
        status: "pending",
        updatedAt: Date.now(),
      });
    return true;
  }

  async function acceptFriendRequest(otherId) {
    const me = myId();
    const fire = db();
    if (!fire || !me || !otherId) return false;
    const ref = fire.collection("friendLinks").doc(pairId(me, otherId));
    const snap = await ref.get();
    if (!snap.exists || snap.data()?.status !== "pending" || snap.data()?.requester === me) {
      return false;
    }
    const other = await getAccount(otherId);
    await ref.set(
      {
        status: "accepted",
        updatedAt: Date.now(),
        fromUsername: other?.username || snap.data()?.fromUsername || "",
        fromDisplay: displayLabel(other),
        fromPicture: other?.pictureSrc || snap.data()?.fromPicture || "",
      },
      { merge: true }
    );
    return true;
  }

  async function listIncomingRequests() {
    const fire = db();
    const me = myId();
    if (!fire || !me) return [];
    const snap = await fire.collection("friendLinks").where("to", "==", me).where("status", "==", "pending").get();
    const list = [];
    snap.forEach((doc) => {
      const d = doc.data() || {};
      if (d.requester === me) return;
      list.push({
        id: d.from,
        username: d.fromUsername,
        displayName: d.fromDisplay,
        pictureSrc: d.fromPicture,
      });
    });
    return list;
  }

  async function listFriends() {
    const fire = db();
    const me = myId();
    if (!fire || !me) return [];
    const friends = [];

    const outSnap = await fire
      .collection("friendLinks")
      .where("from", "==", me)
      .where("status", "==", "accepted")
      .get();
    outSnap.forEach((doc) => {
      const d = doc.data() || {};
      friends.push({
        id: d.to,
        username: d.toUsername || "",
        displayName: d.toDisplay || d.toUsername || "User",
        pictureSrc: d.toPicture || "",
      });
    });

    const inSnap = await fire
      .collection("friendLinks")
      .where("to", "==", me)
      .where("status", "==", "accepted")
      .get();
    inSnap.forEach((doc) => {
      const d = doc.data() || {};
      friends.push({
        id: d.from,
        username: d.fromUsername || "",
        displayName: d.fromDisplay || d.fromUsername || "User",
        pictureSrc: d.fromPicture || "",
      });
    });

    const seen = new Set();
    return friends.filter((f) => {
      if (seen.has(f.id)) return false;
      seen.add(f.id);
      return true;
    });
  }

  async function sendMessage(otherId, text) {
    const fire = db();
    const me = myId();
    const msg = String(text || "").trim();
    if (!fire || !me || !otherId || !msg) return false;
    const cid = chatId(me, otherId);
    await fire.collection("chats").doc(cid).collection("messages").add({
      from: me,
      text: msg.slice(0, 500),
      ts: Date.now(),
    });
    await fire.collection("chats").doc(cid).set({ updatedAt: Date.now() }, { merge: true });
    return true;
  }

  async function fetchMessages(otherId, limit = 80) {
    const fire = db();
    const me = myId();
    if (!fire || !me || !otherId) return [];
    const cid = chatId(me, otherId);
    const snap = await fire
      .collection("chats")
      .doc(cid)
      .collection("messages")
      .orderBy("ts", "asc")
      .limitToLast(limit)
      .get();
    const list = [];
    snap.forEach((doc) => list.push({ id: doc.id, ...doc.data() }));
    return list;
  }

  function listenMessages(otherId, onChange) {
    const fire = db();
    const me = myId();
    if (!fire || !me || !otherId) return () => {};
    const cid = chatId(me, otherId);
    return fire
      .collection("chats")
      .doc(cid)
      .collection("messages")
      .orderBy("ts", "asc")
      .limitToLast(80)
      .onSnapshot((snap) => {
        const list = [];
        snap.forEach((doc) => list.push({ id: doc.id, ...doc.data() }));
        onChange(list);
      });
  }

  const READ_KEY = "archive-social-read";

  function readChatReadMap() {
    try {
      const raw = localStorage.getItem(READ_KEY);
      const map = raw ? JSON.parse(raw) : {};
      return map && typeof map === "object" ? map : {};
    } catch (_) {
      return {};
    }
  }

  function writeChatReadMap(map) {
    try {
      localStorage.setItem(READ_KEY, JSON.stringify(map));
    } catch (_) {
      /* ignore */
    }
  }

  function getChatReadAt(otherId) {
    const me = myId();
    if (!me || !otherId) return 0;
    const map = readChatReadMap();
    return map[chatId(me, otherId)] || 0;
  }

  function markChatRead(otherId) {
    const me = myId();
    if (!me || !otherId) return;
    const map = readChatReadMap();
    map[chatId(me, otherId)] = Date.now();
    writeChatReadMap(map);
  }

  async function getLikeCount(profileId) {
    const fire = db();
    if (!fire || !profileId) return 0;
    const snap = await fire.collection("accounts").doc(profileId).get();
    if (!snap.exists) return 0;
    return snap.data()?.likeCount || 0;
  }

  async function hasLiked(profileId) {
    const me = myId();
    const fire = db();
    if (!fire || !me || !profileId) return false;
    const snap = await fire.collection("accounts").doc(profileId).collection("likes").doc(me).get();
    return snap.exists;
  }

  async function toggleLike(profileId) {
    const me = myId();
    const fire = db();
    if (!fire || !me || !profileId || me === profileId) return null;
    const likeRef = fire.collection("accounts").doc(profileId).collection("likes").doc(me);
    const accRef = fire.collection("accounts").doc(profileId);
    const snap = await likeRef.get();
    if (snap.exists) {
      await likeRef.delete();
      await accRef.set({ likeCount: firebase.firestore.FieldValue.increment(-1) }, { merge: true });
      return false;
    }
    await likeRef.set({ ts: Date.now() });
    await accRef.set({ likeCount: firebase.firestore.FieldValue.increment(1) }, { merge: true });
    return true;
  }

  function listenNotifications(onChange) {
    const fire = db();
    const me = myId();
    if (!fire || !me) return () => {};
    const state = { friendRequests: 0, unreadMessages: 0 };
    const chatUnsubs = new Map();
    const chatUnread = new Map();
    let friendsUnsub = null;

    function emit() {
      onChange({
        friendRequests: state.friendRequests,
        unreadMessages: state.unreadMessages,
        total: state.friendRequests + state.unreadMessages,
      });
    }

    function recountMessages() {
      let total = 0;
      for (const n of chatUnread.values()) total += n;
      state.unreadMessages = total;
      emit();
    }

    const reqUnsub = fire
      .collection("friendLinks")
      .where("to", "==", me)
      .where("status", "==", "pending")
      .onSnapshot(
        (snap) => {
          let n = 0;
          snap.forEach((doc) => {
            if (doc.data()?.requester !== me) n += 1;
          });
          state.friendRequests = n;
          emit();
        },
        () => {
          state.friendRequests = 0;
          emit();
        }
      );

    function attachChatListeners(friends) {
      for (const [id, unsub] of chatUnsubs) {
        if (!friends.some((f) => f.id === id)) {
          unsub();
          chatUnsubs.delete(id);
          chatUnread.delete(id);
        }
      }
      for (const friend of friends) {
        if (chatUnsubs.has(friend.id)) continue;
        const cid = chatId(me, friend.id);
        const unsub = fire
          .collection("chats")
          .doc(cid)
          .collection("messages")
          .orderBy("ts", "desc")
          .limit(1)
          .onSnapshot((snap) => {
            const doc = snap.docs[0];
            const msg = doc?.data();
            const unread =
              msg && msg.from !== me && (msg.ts || 0) > getChatReadAt(friend.id) ? 1 : 0;
            chatUnread.set(friend.id, unread);
            recountMessages();
          });
        chatUnsubs.set(friend.id, unsub);
      }
      recountMessages();
    }

    friendsUnsub = () => {
      for (const u of friendLinkUnsubs) u();
      friendLinkUnsubs.length = 0;
    };
    const friendLinkUnsubs = [];
    const refreshFriendChats = () => {
      listFriends()
        .then((friends) => attachChatListeners(friends))
        .catch(() => {});
    };
    refreshFriendChats();
    friendLinkUnsubs.push(
      fire
        .collection("friendLinks")
        .where("from", "==", me)
        .where("status", "==", "accepted")
        .onSnapshot(() => refreshFriendChats(), () => {})
    );
    friendLinkUnsubs.push(
      fire
        .collection("friendLinks")
        .where("to", "==", me)
        .where("status", "==", "accepted")
        .onSnapshot(() => refreshFriendChats(), () => {})
    );

    return () => {
      reqUnsub();
      friendsUnsub();
      for (const unsub of chatUnsubs.values()) unsub();
      chatUnsubs.clear();
      chatUnread.clear();
    };
  }

  window.ArchiveSocial = {
    blankAvatar,
    displayLabel,
    publishAccount,
    listAccounts,
    getAccount,
    getRelation,
    sendFriendRequest,
    acceptFriendRequest,
    listIncomingRequests,
    listFriends,
    sendMessage,
    fetchMessages,
    listenMessages,
    markChatRead,
    getLikeCount,
    hasLiked,
    toggleLike,
    listenNotifications,
    myId,
  };
})();
