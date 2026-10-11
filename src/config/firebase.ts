// src/config/firebase.ts
// Production Firebase Configuration for Free Cloud Internet-Wide Multi-Device Synchronization

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';

const STORAGE_KEY_FIREBASE_CONFIG = 'rrbm_custom_firebase_config_2026';

export interface FirebaseConfigParams {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId: string;
  appId: string;
}

// 1. Fallback credentials populated from Vite build-time environment variables (.env / .env.production)
const DEFAULT_FIREBASE_CONFIG: FirebaseConfigParams = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || ''
};

export function getActiveFirebaseConfig(): FirebaseConfigParams {
  if (typeof window === 'undefined') return DEFAULT_FIREBASE_CONFIG;

  const stored = localStorage.getItem(STORAGE_KEY_FIREBASE_CONFIG);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (parsed.projectId && parsed.apiKey) {
        return parsed;
      }
    } catch {}
  }

  return DEFAULT_FIREBASE_CONFIG;
}

export function saveCustomFirebaseConfig(config: FirebaseConfigParams): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY_FIREBASE_CONFIG, JSON.stringify(config));
}

export function clearCustomFirebaseConfig(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY_FIREBASE_CONFIG);
}

export function isFirebaseConfigured(): boolean {
  const config = getActiveFirebaseConfig();
  return Boolean(config.projectId && config.apiKey && config.appId);
}

let appInstance: FirebaseApp | null = null;
let firestoreInstance: Firestore | null = null;
let authInstance: Auth | null = null;

export function getFirebaseServices(): { app: FirebaseApp | null; db: Firestore | null; auth: Auth | null } {
  if (!isFirebaseConfigured()) {
    return { app: null, db: null, auth: null };
  }

  try {
    const config = getActiveFirebaseConfig();
    if (!getApps().length) {
      appInstance = initializeApp(config);
    } else {
      appInstance = getApp();
    }

    if (!firestoreInstance && appInstance) {
      firestoreInstance = getFirestore(appInstance);
    }

    if (!authInstance && appInstance) {
      authInstance = getAuth(appInstance);
    }

    return { app: appInstance, db: firestoreInstance, auth: authInstance };
  } catch (err) {
    console.warn('[Firebase] Initialization error:', err);
    return { app: null, db: null, auth: null };
  }
}
