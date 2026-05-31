import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, initializeFirestore, memoryLocalCache } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getFunctions } from "firebase/functions";

const firebaseConfig = {
  apiKey: "AIzaSyCNTZLmkum8mxxdF33AWsvJveZwVFgOV2g",
  authDomain: "wba99-8c510.firebaseapp.com",
  projectId: "wba99-8c510",
  storageBucket: "wba99-8c510.firebasestorage.app",
  messagingSenderId: "773829744792",
  appId: "1:773829744792:web:026a2baf6e97f70ded58ed",
  measurementId: "G-QJ0F88W8PY",
};

const createFirebaseApp = () => {
  if (getApps().length > 0) {
    return getApp();
  }
  return initializeApp(firebaseConfig);
};

export const firebaseApp = createFirebaseApp();
export const firebaseAuth = getAuth(firebaseApp);

// Use in-memory cache only — avoids corrupted IndexedDB state that persists
// across reloads and triggers the Firestore SDK internal assertion (ca9/b815).
let firebaseDB: ReturnType<typeof getFirestore>;
try {
  firebaseDB = initializeFirestore(firebaseApp, { localCache: memoryLocalCache() });
} catch {
  firebaseDB = getFirestore(firebaseApp);
}
export { firebaseDB };
export const firebaseStorage = getStorage(firebaseApp);
export const firebaseFunctions = getFunctions(firebaseApp, "us-central1");

// Connect to emulators if explicitly requested via URL or localStorage
const useEmulator =
  window.location.search.includes("emulator=true") ||
  localStorage.getItem("use_firebase_emulator") === "true";

if (useEmulator && window.location.hostname === "localhost") {
  const { connectFunctionsEmulator } = await import("firebase/functions");
  const { connectAuthEmulator } = await import("firebase/auth");
  const { connectFirestoreEmulator } = await import("firebase/firestore");
  const { connectStorageEmulator } = await import("firebase/storage");

  try {
    connectFunctionsEmulator(firebaseFunctions, "localhost", 5001);
    connectAuthEmulator(firebaseAuth, "http://localhost:9099");
    connectFirestoreEmulator(firebaseDB, "localhost", 8080);
    connectStorageEmulator(firebaseStorage, "localhost", 9199);
    console.log("Connected to Firebase Emulators");
  } catch (e) {
    console.debug("Firebase emulators already connected or failed to connect");
  }
}
