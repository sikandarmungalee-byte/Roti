import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeFirestore, doc, getDocFromServer, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { firebaseConfig } from './firebaseConfig';

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
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

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
