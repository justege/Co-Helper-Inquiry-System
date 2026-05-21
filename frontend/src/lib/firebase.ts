import { initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";

const {
  VITE_FIREBASE_API_KEY,
  VITE_FIREBASE_AUTH_DOMAIN,
  VITE_FIREBASE_PROJECT_ID,
  VITE_FIREBASE_STORAGE_BUCKET,
  VITE_FIREBASE_MESSAGING_SENDER_ID,
  VITE_FIREBASE_APP_ID,
} = import.meta.env;

/**
 * True when all required Firebase env vars are present.
 * The app renders a setup banner instead of crashing when this is false.
 */
export const firebaseConfigured =
  Boolean(VITE_FIREBASE_API_KEY) &&
  VITE_FIREBASE_API_KEY !== "your-api-key";

let app: FirebaseApp | null = null;
let auth: Auth | null = null;

if (firebaseConfigured) {
  app = initializeApp({
    apiKey: VITE_FIREBASE_API_KEY,
    authDomain: VITE_FIREBASE_AUTH_DOMAIN,
    projectId: VITE_FIREBASE_PROJECT_ID,
    storageBucket: VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: VITE_FIREBASE_APP_ID,
  });
  auth = getAuth(app);
}

export { app, auth };
