import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
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
        setAuthError('Sign-in popup was blocked by your browser. Please tap "Continue with Google" again or check your browser popup settings.');
        setSyncState('offline');
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
