/* global firebase, FIREBASE_CONFIG */

function hasFirebaseConfig() {
  return typeof window.FIREBASE_CONFIG === "object" && window.FIREBASE_CONFIG && !!window.FIREBASE_CONFIG.projectId;
}

function getSession() {
  try {
    const raw = localStorage.getItem("programTakip.session.v1");
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (!s || (s.role !== "student" && s.role !== "watcher")) return null;
    if (!s.groupCode || typeof s.groupCode !== "string") return null;
    return { role: s.role, groupCode: s.groupCode.trim() };
  } catch {
    return null;
  }
}

function setSession(session) {
  localStorage.setItem("programTakip.session.v1", JSON.stringify(session));
}

function clearSession() {
  localStorage.removeItem("programTakip.session.v1");
}

function ensureFirebase() {
  if (!hasFirebaseConfig()) return { ok: false, reason: "missing_config" };
  if (!window.firebase || !firebase.apps) return { ok: false, reason: "missing_sdk" };
  if (!firebase.apps.length) firebase.initializeApp(window.FIREBASE_CONFIG);
  return { ok: true };
}

function groupRef(db, groupCode) {
  return db.collection("groups").doc(groupCode);
}

function docIdFromRec(rec) {
  // Firestore doc id olacak şekilde (tarih + random) stabil üretelim
  if (rec && rec.id) return rec.id;
  return (crypto.randomUUID && crypto.randomUUID()) || String(Date.now()) + "-" + Math.random().toString(16).slice(2);
}

function sanitizeGroupCode(code) {
  return String(code || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, "")
    .slice(0, 24);
}

window.Sync = {
  ensureFirebase,
  hasFirebaseConfig,
  getSession,
  setSession,
  clearSession,
  sanitizeGroupCode,

  async subscribeNets(session, onChange) {
    const init = ensureFirebase();
    if (!init.ok) return () => {};
    const db = firebase.firestore();
    const ref = groupRef(db, session.groupCode).collection("nets");
    return ref.orderBy("createdAt", "asc").onSnapshot((snap) => {
      const out = [];
      snap.forEach((doc) => out.push({ ...doc.data(), _docId: doc.id }));
      onChange(out);
    });
  },

  async subscribeQuestions(session, onChange) {
    const init = ensureFirebase();
    if (!init.ok) return () => {};
    const db = firebase.firestore();
    const ref = groupRef(db, session.groupCode).collection("questions");
    return ref.orderBy("createdAt", "asc").onSnapshot((snap) => {
      const out = [];
      snap.forEach((doc) => out.push({ ...doc.data(), _docId: doc.id }));
      onChange(out);
    });
  },

  async addNet(session, rec) {
    const init = ensureFirebase();
    if (!init.ok) return { ok: false, reason: init.reason };
    const db = firebase.firestore();
    const ref = groupRef(db, session.groupCode).collection("nets").doc(docIdFromRec(rec));
    const payload = {
      id: rec.id,
      date: rec.date,
      tyt: rec.tyt,
      ayt: rec.ayt,
      createdAt: rec.createdAt || Date.now(),
    };
    await ref.set(payload, { merge: true });
    return { ok: true };
  },

  async deleteNet(session, id) {
    const init = ensureFirebase();
    if (!init.ok) return { ok: false, reason: init.reason };
    const db = firebase.firestore();
    await groupRef(db, session.groupCode).collection("nets").doc(id).delete();
    return { ok: true };
  },

  async addQuestion(session, rec) {
    const init = ensureFirebase();
    if (!init.ok) return { ok: false, reason: init.reason };
    const db = firebase.firestore();
    const ref = groupRef(db, session.groupCode).collection("questions").doc(docIdFromRec(rec));
    const payload = {
      id: rec.id,
      date: rec.date,
      tr: rec.tr || 0,
      mat: rec.mat || 0,
      sos: rec.sos || 0,
      fen: rec.fen || 0,
      count: rec.count || 0,
      createdAt: rec.createdAt || Date.now(),
    };
    await ref.set(payload, { merge: true });
    return { ok: true };
  },

  async deleteQuestion(session, id) {
    const init = ensureFirebase();
    if (!init.ok) return { ok: false, reason: init.reason };
    const db = firebase.firestore();
    await groupRef(db, session.groupCode).collection("questions").doc(id).delete();
    return { ok: true };
  },
};

