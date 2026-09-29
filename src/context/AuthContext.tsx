import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, signInWithPopup, signInWithRedirect, getRedirectResult, signOut, onAuthStateChanged } from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';

export type SyncState = 'synced' | 'syncing' | 'offline' | 'error';

interface AuthContextType {
  currentUser: User | null;
  isLoading: boolean;
  syncState: SyncState;
  setSyncState: (state: SyncState) => void;
  lastSyncedAt: Date | null;
  setLastSyncedAt: (date: Date | null) => void;
  signInWithGoogle: () => Promise<void>;
  signOutUser: () => Promise<void>;
  authError: string | null;
  clearAuthError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [syncState, setSyncState] = useState<SyncState>('syncing');
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    // Check for redirect result when returning from redirect auth flow
    getRedirectResult(auth)
      .then((result) => {
        if (result?.user) {
          setCurrentUser(result.user);
          setSyncState('synced');
          setLastSyncedAt(new Date());
        }
      })
      .catch((err) => {
        console.warn('Redirect auth check notice:', err);
      });

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setIsLoading(false);
      if (user) {
        setSyncState('synced');
        setLastSyncedAt(new Date());
      } else {
        setSyncState('offline');
      }
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    try {
      setAuthError(null);
      setIsLoading(true);
      setSyncState('syncing');
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      const isCancellation =
        err?.code === 'auth/popup-closed-by-user' ||
        err?.code === 'auth/cancelled-popup-request';

      if (isCancellation) {
        console.info('Google sign-in popup was dismissed by user.');
        setSyncState(currentUser ? 'synced' : 'offline');
        return;
      }

      if (err?.code === 'auth/popup-blocked') {
        console.warn('Popup blocked, attempting redirect sign-in flow...');
        try {
          await signInWithRedirect(auth, googleProvider);
          return;
        } catch (redirectErr: any) {
          setAuthError('Sign-in popup was blocked by your browser. Please allow popups for this site and tap Continue with Google.');
          setSyncState('offline');
          return;
        }
      }

      if (err?.code === 'auth/unauthorized-domain') {
        const domain = window.location.hostname;
        const msg = `This domain (${domain}) is not authorized in Firebase Console yet. Please add "${domain}" under Firebase Console -> Authentication -> Settings -> Authorized Domains.`;
        console.error(msg);
        setAuthError(msg);
        setSyncState('error');
        return;
      }

      console.error('Firebase Auth sign in error:', err);
      setAuthError(err?.message || 'Failed to authenticate with Google. Please retry.');
      setSyncState('error');
    } finally {
      setIsLoading(false);
    }
  };

  const signOutUser = async () => {
    try {
      setAuthError(null);
      await signOut(auth);
      setCurrentUser(null);
      setSyncState('offline');
    } catch (err: any) {
      console.error('Firebase Auth sign out error:', err);
      setAuthError(err?.message || 'Failed to sign out.');
    }
  };

  const clearAuthError = () => setAuthError(null);

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isLoading,
        syncState,
        setSyncState,
        lastSyncedAt,
        setLastSyncedAt,
        signInWithGoogle,
        signOutUser,
        authError,
        clearAuthError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
