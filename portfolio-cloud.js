/**
 * AetherInk — Portfolio cloud layer (Firestore + Storage)
 * Public pages and admin both use this module.
 */
import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  deleteDoc,
  doc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js";
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject
} from "https://www.gstatic.com/firebasejs/13.1.0/firebase-storage.js";
import { firebaseConfig, isFirebaseConfigReady, ADMIN_EMAIL } from "./firebase-config.js";

let app, auth, db, storage;
let ready = false;

function init() {
  if (ready) return true;
  if (!isFirebaseConfigReady()) return false;
  app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);
  ready = true;
  return true;
}

export function isCloudReady() {
  return init();
}

export function getAuthInstance() {
  init();
  return auth;
}

export async function adminGoogleLogin() {
  if (!init()) throw new Error("Firebase config missing. Fill firebase-config.js");
  const provider = new GoogleAuthProvider();
  const result = await signInWithPopup(auth, provider);
  const email = (result.user.email || "").toLowerCase();
  if (email !== ADMIN_EMAIL.toLowerCase() || ADMIN_EMAIL.includes("MY_ADMIN_EMAIL")) {
    await signOut(auth);
    throw new Error("Unauthorized: sign in with your ADMIN_EMAIL from firebase-config.js");
  }
  return result.user;
}

export function onAdminAuth(callback) {
  if (!init()) {
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(auth, user => {
    if (user && user.email && user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
      callback(user);
    } else {
      callback(null);
    }
  });
}

export async function adminLogout() {
  if (auth) await signOut(auth);
}

/** Fetch portfolio items. category optional. */
export async function fetchPortfolio(category) {
  if (!init()) return [];
  try {
    let q;
    if (category && category !== "all") {
      // Simple equality query (no composite index required if no orderBy)
      q = query(collection(db, "portfolio"), where("category", "==", category));
    } else {
      q = query(collection(db, "portfolio"));
    }
    const snap = await getDocs(q);
    const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    items.sort((a, b) => {
      const at = a.createdAt?.toMillis?.() || a.createdAt?.seconds * 1000 || 0;
      const bt = b.createdAt?.toMillis?.() || b.createdAt?.seconds * 1000 || 0;
      return bt - at;
    });
    return items;
  } catch (err) {
    console.error("fetchPortfolio failed:", err);
    return [];
  }
}

/** Upload file to Storage + create Firestore doc. Requires admin auth. */
export async function uploadPortfolioItem({ title, category, description, file, imageUrl, emoji }) {
  if (!init()) throw new Error("Firebase not configured");
  if (!auth.currentUser) throw new Error("Admin must sign in with Google first");

  let finalUrl = (imageUrl || "").trim();
  let mediaType = "";
  let storagePath = "";

  if (file && file.size) {
    const safeName = file.name.replace(/[^\w.\-]+/g, "_").slice(0, 80);
    storagePath = `portfolio/${category}/${Date.now()}_${safeName}`;
    const storageRef = ref(storage, storagePath);
    await uploadBytes(storageRef, file);
    finalUrl = await getDownloadURL(storageRef);
    mediaType = file.type || "";
  } else if (finalUrl) {
    mediaType = "";
  }

  const data = {
    title: String(title || "").slice(0, 120),
    category: String(category || "logos"),
    description: String(description || "").slice(0, 500),
    imageUrl: finalUrl,
    mediaType,
    storagePath,
    emoji: String(emoji || "").slice(0, 8),
    createdAt: serverTimestamp()
  };

  const docRef = await addDoc(collection(db, "portfolio"), data);
  return { id: docRef.id, ...data };
}

export async function deletePortfolioItem(item) {
  if (!init()) throw new Error("Firebase not configured");
  if (!auth.currentUser) throw new Error("Admin must sign in");

  if (item.storagePath) {
    try {
      await deleteObject(ref(storage, item.storagePath));
    } catch (e) {
      console.warn("Storage delete skipped:", e);
    }
  }
  await deleteDoc(doc(db, "portfolio", item.id));
}

export { ADMIN_EMAIL };
