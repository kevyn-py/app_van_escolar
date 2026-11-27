import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { browserLocalPersistence, connectAuthEmulator, getAuth, setPersistence, type Auth } from "firebase/auth";
import { connectFirestoreEmulator, getFirestore, type Firestore } from "firebase/firestore";

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const useEmulators = process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === "true";

export function isFirebaseConfigured(): boolean {
  return Boolean(config.apiKey && config.projectId && config.appId) || useEmulators;
}

let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let db: Firestore | undefined;

function getFirebaseApp(): FirebaseApp {
  if (app) return app;
  if (!isFirebaseConfigured()) {
    throw new Error("Firebase não configurado. Defina as variáveis NEXT_PUBLIC_FIREBASE_* (veja .env.example).");
  }
  app = getApps().length
    ? getApp()
    : initializeApp(
        useEmulators && !config.apiKey
          ? { apiKey: "demo-key", projectId: config.projectId ?? "demo-van-escolar", appId: "demo-app" }
          : config,
      );
  return app;
}

export function firebaseAuth(): Auth {
  if (auth) return auth;
  auth = getAuth(getFirebaseApp());
  if (useEmulators) connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  // Sessão persistida no navegador até logout explícito (RF-02).
  void setPersistence(auth, browserLocalPersistence);
  return auth;
}

export function firestore(): Firestore {
  if (db) return db;
  db = getFirestore(getFirebaseApp());
  if (useEmulators) connectFirestoreEmulator(db, "127.0.0.1", 8080);
  return db;
}
