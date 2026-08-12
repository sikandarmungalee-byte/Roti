import React, { useState, useEffect } from 'react';
import { Lock, ShieldCheck, KeyRound, AlertCircle, ArrowRight, Delete } from 'lucide-react';

interface Props {
  onUnlock: () => void;
  requiredPin?: string;
}

export const LockScreen: React.FC<Props> = ({ onUnlock, requiredPin = '8271' }) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        handleDigit(e.key);
      } else if (e.key === 'Backspace') {
        handleBackspace();
      } else if (e.key === 'Enter') {
        handleCheckPin();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pin]);

  const handleDigit = (digit: string) => {
    if (pin.length < 4) {
      const nextPin = pin + digit;
      setPin(nextPin);
      setError(false);
      setErrorMessage('');

      if (nextPin.length === 4) {
        verifyPin(nextPin);
      }
    }
  };

  const handleBackspace = () => {
    setPin(prev => prev.slice(0, -1));
    setError(false);
    setErrorMessage('');
  };

  const handleClear = () => {
    setPin('');
    setError(false);
    setErrorMessage('');
  };

  const verifyPin = (inputPin: string) => {
    if (inputPin === requiredPin) {
      setError(false);
      onUnlock();
    } else {
      setError(true);
      setErrorMessage('Access Denied. Incorrect PIN.');
      setTimeout(() => {
        setPin('');
      }, 600);
    }
  };

  const handleCheckPin = () => {
    if (pin.length === 4) {
      verifyPin(pin);
    } else {
      setError(true);
      setErrorMessage('Please enter all 4 digits');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 flex items-center justify-center p-4 select-none">
      <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 text-center shadow-2xl relative overflow-hidden">
        
        {/* Decorative ambient glow */}
        <div className="absolute -top-12 -left-12 w-32 h-32 bg-yellow-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-12 -right-12 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Lock Icon */}
        <div className="w-16 h-16 bg-yellow-400 text-slate-950 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-lg shadow-yellow-500/20 transform transition hover:scale-105">
          <Lock className="w-8 h-8 stroke-[2.5]" />
        </div>

        <h2 className="text-xl font-extrabold text-white mb-1 tracking-tight">
          System Access Locked
        </h2>
        <p className="text-xs text-slate-400 mb-6 font-medium">
          Enter your 4-digit security PIN to proceed
        </p>

        {/* PIN Display Dots */}
        <div className={`flex justify-center items-center gap-3 mb-6 ${error ? 'animate-bounce' : ''}`}>
          {[0, 1, 2, 3].map(i => {
            const filled = pin.length > i;
            return (
              <div
                key={i}
                className={`w-12 h-14 rounded-xl border-2 flex items-center justify-center font-mono font-bold text-xl transition-all ${
                  error
                    ? 'border-red-500 bg-red-950/30 text-red-400'
                    : filled
                    ? 'border-yellow-400 bg-yellow-400/10 text-yellow-400 shadow-sm shadow-yellow-400/20'
                    : 'border-slate-700 bg-slate-800/50 text-slate-500'
                }`}
              >
                {filled ? '•' : ''}
              </div>
            );
          })}
        </div>

        {/* Error Message */}
        {error && (
          <div className="flex items-center justify-center gap-1.5 text-xs text-red-400 font-bold mb-4 bg-red-950/50 border border-red-800/60 py-2 px-3 rounded-lg">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-2.5 mb-6">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
            <button
              key={num}
              onClick={() => handleDigit(num)}
              className="h-13 bg-slate-800/80 hover:bg-slate-700 active:bg-yellow-400 active:text-slate-950 text-white font-mono text-lg font-bold rounded-xl border border-slate-700/60 transition flex items-center justify-center shadow-xs"
            >
              {num}
            </button>
          ))}
          <button
            onClick={handleClear}
            className="h-13 bg-slate-800/40 hover:bg-slate-800 text-slate-400 hover:text-white font-sans text-xs font-bold rounded-xl border border-slate-800 transition flex items-center justify-center uppercase tracking-wider"
          >
            Clear
          </button>
          <button
            onClick={() => handleDigit('0')}
            className="h-13 bg-slate-800/80 hover:bg-slate-700 active:bg-yellow-400 active:text-slate-950 text-white font-mono text-lg font-bold rounded-xl border border-slate-700/60 transition flex items-center justify-center shadow-xs"
          >
            0
          </button>
          <button
            onClick={handleBackspace}
            className="h-13 bg-slate-800/40 hover:bg-slate-800 text-slate-400 hover:text-red-400 font-sans text-xs font-bold rounded-xl border border-slate-800 transition flex items-center justify-center"
            title="Backspace"
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>

        {/* Footer info */}
        <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500 font-mono">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-yellow-500" />
            Protected
          </span>
          <span>Security Lock Active</span>
        </div>

      </div>
    </div>
  );
};
