import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyBjWWnoY_mYzZbL4UZsJqTqbAgo0menSPs",
  authDomain: "zovik-ai-f7331.firebaseapp.com",
  projectId: "zovik-ai-f7331",
  storageBucket: "zovik-ai-f7331.firebasestorage.app",
  messagingSenderId: "783578653341",
  appId: "1:783578653341:web:299b96683ebe126ded2a74",
  measurementId: "G-W7P2D8YHYJ"
};

// Initialize Firebase only if it hasn't been initialized already (important for Next.js)
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const googleProvider = new GoogleAuthProvider();

export { app, auth, db, storage, googleProvider };
