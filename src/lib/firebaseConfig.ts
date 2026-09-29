// Firebase Configuration for Roti Bros InvoicePro
// Supports Vercel environment variables or built-in defaults

const metaEnv = (import.meta as unknown as { env?: Record<string, string> }).env || {};

export const firebaseConfig = {
  projectId: 
    metaEnv.VITE_FIREBASE_PROJECT_ID || 
    "gen-lang-client-0112209964",
  appId: 
    metaEnv.VITE_FIREBASE_APP_ID || 
    "1:558916521027:web:a6c82f08052cf2710618f6",
  apiKey: 
    (metaEnv.VITE_FIREBASE_API_KEY && metaEnv.VITE_FIREBASE_API_KEY.startsWith('AIza')) 
      ? metaEnv.VITE_FIREBASE_API_KEY 
      : "AIzaSyBFvaq1Hsftp77BNs_nHZs41rkPOYPt3aE",
  authDomain: 
    metaEnv.VITE_FIREBASE_AUTH_DOMAIN || 
    "gen-lang-client-0112209964.firebaseapp.com",
  firestoreDatabaseId: 
    metaEnv.VITE_FIREBASE_DATABASE_ID || 
    "ai-studio-invoiceproinvoic-772db6db-ff68-428f-a900-8ebce0a51e9d",
  storageBucket: 
    metaEnv.VITE_FIREBASE_STORAGE_BUCKET || 
    "gen-lang-client-0112209964.firebasestorage.app",
  messagingSenderId: 
    metaEnv.VITE_FIREBASE_MESSAGING_SENDER_ID || 
    "558916521027",
};

export default firebaseConfig;
