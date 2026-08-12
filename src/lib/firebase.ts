import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

let rawConfig: Record<string, string> = {};
try {
  // @ts-ignore
  rawConfig = import.meta.glob('../../firebase-applet-config.json', { eager: true, import: 'default' })['../../firebase-applet-config.json'] || {};
} catch (e) {
  rawConfig = {};
}

const metaEnv = (import.meta as unknown as { env?: Record<string, string> }).env || {};

const DEFAULT_CONFIG = {
  projectId: "gen-lang-client-0112209964",
  appId: "1:558916521027:web:a6c82f08052cf2710623f9",
  apiKey: "AIzaSyBFvaq1Hsftp77BNs_nHZs41rkPOYPt3aE",
  authDomain: "gen-lang-client-0112209964.firebaseapp.com",
  firestoreDatabaseId: "ai-studio-invoiceproinvoic-772db6db-ff68-428f-a900-8ebce0a51e9d",
  storageBucket: "gen-lang-client-0112209964.firebasestorage.app",
  messagingSenderId: "558916521027"
};

const firebaseConfig = {
  projectId: metaEnv.VITE_FIREBASE_PROJECT_ID || rawConfig?.projectId || DEFAULT_CONFIG.projectId,
  appId: metaEnv.VITE_FIREBASE_APP_ID || rawConfig?.appId || DEFAULT_CONFIG.appId,
  apiKey: metaEnv.VITE_FIREBASE_API_KEY || rawConfig?.apiKey || DEFAULT_CONFIG.apiKey,
  authDomain: metaEnv.VITE_FIREBASE_AUTH_DOMAIN || rawConfig?.authDomain || DEFAULT_CONFIG.authDomain,
  firestoreDatabaseId: metaEnv.VITE_FIREBASE_DATABASE_ID || rawConfig?.firestoreDatabaseId || DEFAULT_CONFIG.firestoreDatabaseId,
  storageBucket: metaEnv.VITE_FIREBASE_STORAGE_BUCKET || rawConfig?.storageBucket || DEFAULT_CONFIG.storageBucket,
  messagingSenderId: metaEnv.VITE_FIREBASE_MESSAGING_SENDER_ID || rawConfig?.messagingSenderId || DEFAULT_CONFIG.messagingSenderId,
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

const dbId = firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)'
  ? firebaseConfig.firestoreDatabaseId
  : undefined;

export const db = initializeFirestore(app, {
  experimentalAutoDetectLongPolling: true,
}, dbId);

export const auth = getAuth(app);
export default app;


