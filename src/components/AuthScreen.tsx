import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Shield, Cloud, Smartphone, Laptop, RefreshCw, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';

interface Props {
  onContinueOffline?: () => void;
  hasLocalData?: boolean;
}

export const AuthScreen: React.FC<Props> = ({ onContinueOffline, hasLocalData = true }) => {
  const { signInWithGoogle, isLoading, authError, clearAuthError } = useAuth();

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 sm:p-6 text-white relative overflow-hidden">
      {/* Background ambient decorative glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-yellow-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-lg w-full z-10 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center p-3.5 bg-yellow-400 text-black rounded-2xl shadow-xl border border-yellow-300 mb-2">
            <Cloud className="w-8 h-8 stroke-[2.5]" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            ROTI BROS
          </h1>
          <p className="text-xs uppercase tracking-widest text-yellow-400 font-extrabold">
            Cloud Invoicing & Dispatch Suite
          </p>
          <p className="text-sm text-slate-400 max-w-sm mx-auto pt-1">
            Sign in to sync your invoices, delivery notes, and clients across all your devices in real-time.
          </p>
        </div>

        {/* Auth Error Banner */}
        {authError && (
          <div className="p-4 bg-rose-950/80 border border-rose-500/50 rounded-xl text-rose-200 text-xs flex items-start justify-between gap-3 animate-fade-in">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{authError}</span>
            </div>
            <button
              onClick={clearAuthError}
              className="text-rose-400 hover:text-white font-bold text-xs"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Main Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-md space-y-6">
          <div className="space-y-4">
            <h2 className="text-base font-bold text-slate-200 flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-400" />
              Secure Multi-Device Synchronization
            </h2>

            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 bg-slate-800/60 rounded-xl border border-slate-700/50">
                <div className="p-2 bg-yellow-400/10 text-yellow-400 rounded-lg shrink-0">
                  <Laptop className="w-4 h-4" />
                </div>
                <div className="text-xs">
                  <p className="font-bold text-slate-200">Cloud-Synced Source of Truth</p>
                  <p className="text-slate-400 mt-0.5">All invoices, quotes, customers, and delivery notes live in your secure cloud account.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-slate-800/60 rounded-xl border border-slate-700/50">
                <div className="p-2 bg-emerald-400/10 text-emerald-400 rounded-lg shrink-0">
                  <Smartphone className="w-4 h-4" />
                </div>
                <div className="text-xs">
                  <p className="font-bold text-slate-200">Access From Any Device</p>
                  <p className="text-slate-400 mt-0.5">Log in on your office PC, laptop, or mobile phone to see changes reflected live.</p>
                </div>
              </div>

              {hasLocalData && (
                <div className="flex items-start gap-3 p-3 bg-blue-950/40 rounded-xl border border-blue-500/30">
                  <div className="p-2 bg-blue-400/10 text-blue-400 rounded-lg shrink-0">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div className="text-xs">
                    <p className="font-bold text-blue-200">Data Preservation Guaranteed</p>
                    <p className="text-blue-300/80 mt-0.5">Your existing local data is ready to be automatically migrated to your cloud account upon sign-in.</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Action Button: Google Sign-in */}
          <div className="space-y-3 pt-2">
            <button
              onClick={signInWithGoogle}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-3 py-3.5 px-4 bg-white hover:bg-slate-100 text-slate-900 rounded-2xl font-bold text-sm shadow-xl active:scale-[0.99] transition disabled:opacity-60 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-slate-700" />
                  <span>Signing in with Google...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Continue with Google</span>
                  <ArrowRight className="w-4 h-4 ml-auto text-slate-500" />
                </>
              )}
            </button>

            {onContinueOffline && (
              <button
                onClick={onContinueOffline}
                className="w-full text-center text-xs text-slate-400 hover:text-slate-200 py-2 transition"
              >
                Or preview in local read-only mode &rarr;
              </button>
            )}
          </div>
        </div>

        {/* Security Footer Notice */}
        <div className="text-center text-slate-500 text-[11px] space-y-1">
          <p>Protected with Firebase Authentication & Firestore Rule Fortress.</p>
          <p>Data is strictly partitioned under your authenticated account UID.</p>
        </div>
      </div>
    </div>
  );
};
