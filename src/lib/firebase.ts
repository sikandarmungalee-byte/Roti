import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeFirestore, doc, getDocFromServer, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import configJson from '../firebase-applet-config.json';

const metaEnv = (import.meta as unknown as { env?: Record<string, string> }).env || {};

// Prioritize the provisioned firebase-applet-config.json over dummy or unconfigured env vars
const firebaseConfig = {
  projectId: configJson.projectId || metaEnv.VITE_FIREBASE_PROJECT_ID,
  appId: configJson.appId || metaEnv.VITE_FIREBASE_APP_ID,
  apiKey: (configJson.apiKey && configJson.apiKey.startsWith('AIza')) ? configJson.apiKey : (metaEnv.VITE_FIREBASE_API_KEY || configJson.apiKey),
  authDomain: configJson.authDomain || metaEnv.VITE_FIREBASE_AUTH_DOMAIN,
  firestoreDatabaseId: configJson.firestoreDatabaseId || metaEnv.VITE_FIREBASE_DATABASE_ID,
  storageBucket: configJson.storageBucket || metaEnv.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: configJson.messagingSenderId || metaEnv.VITE_FIREBASE_MESSAGING_SENDER_ID,
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

const dbId = firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)'
  ? firebaseConfig.firestoreDatabaseId
  : undefined;

// Enable Firestore with offline persistence and long-polling compatibility
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  }),
  experimentalAutoDetectLongPolling: true,
}, dbId);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export async function testConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log("Connected to Firestore backend successfully!");
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn("Please check your Firebase configuration or network connection.");
    }
    return false;
  }
}

// Initial connection verification
testConnection();

export default app;
