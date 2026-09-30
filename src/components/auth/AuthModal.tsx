import React, { useState } from 'react';
import { accountService } from '../../services/AccountService.ts';
import { UserProfile } from '../../types/account.ts';
import { X, LogIn, UserPlus, Lock, User, AlertCircle } from 'lucide-react';

interface AuthModalProps {
  initialMode?: 'login' | 'signup';
  onClose: () => void;
  onSuccess: (user: UserProfile) => void;
}

export default function AuthModal({
  initialMode = 'login',
  onClose,
  onSuccess,
}: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'signup'>(initialMode);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const resetForm = (newMode: 'login' | 'signup') => {
    setMode(newMode);
    setError(null);
    setUsername('');
    setPassword('');
    setConfirmPassword('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === 'signup') {
        const res = await accountService.signUp({
          username,
          password,
          confirmPassword,
        });
        if (res.success && res.user) {
          onSuccess(res.user);
          onClose();
        } else {
          setError(res.error || 'Failed to create account');
        }
      } else {
        const res = await accountService.logIn({
          username,
          password,
        });
        if (res.success && res.user) {
          onSuccess(res.user);
          onClose();
        } else {
          setError(res.error || 'Failed to log in');
        }
      }
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 select-none">
      <div className="bg-[#181a20] border border-neutral-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-neutral-800/80 bg-[#1e2027]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-purple-600/30">
              {mode === 'login' ? <LogIn className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                {mode === 'login' ? 'Log In to Rovix' : 'Create an Account'}
              </h2>
              <p className="text-[11px] text-neutral-400">
                {mode === 'login' ? 'Enter your credentials to continue' : 'Join thousands of creators & players'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 bg-[#141619]">
          {error && (
            <div className="p-3 bg-red-950/70 border border-red-800/80 rounded-xl text-red-300 text-xs flex items-center gap-2.5 animate-shake">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-400" />
              <span className="font-medium">{error}</span>
            </div>
          )}

          {/* Username Field */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-neutral-500" />
              <span>Username</span>
            </label>
            <input
              type="text"
              autoFocus
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              className="w-full px-3.5 py-2.5 bg-[#20232a] border border-neutral-700/80 rounded-xl text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-purple-500 transition-colors"
            />
          </div>

          {/* Password Field */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-neutral-500" />
              <span>Password</span>
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="w-full px-3.5 py-2.5 bg-[#20232a] border border-neutral-700/80 rounded-xl text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-purple-500 transition-colors"
            />
          </div>

          {/* Confirm Password Field (Signup only) */}
          {mode === 'signup' && (
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-neutral-500" />
                <span>Confirm Password</span>
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
                className="w-full px-3.5 py-2.5 bg-[#20232a] border border-neutral-700/80 rounded-xl text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-purple-500 transition-colors"
              />
            </div>
          )}

          {/* Primary Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-xl text-sm shadow-xl shadow-purple-600/30 transition-all cursor-pointer disabled:opacity-50"
          >
            {loading
              ? 'Please wait...'
              : mode === 'signup'
              ? 'CREATE ACCOUNT'
              : 'LOG IN'}
          </button>

          {/* Switch Mode Footer */}
          <div className="pt-3 border-t border-neutral-800 text-center">
            {mode === 'signup' ? (
              <p className="text-xs text-neutral-400">
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => resetForm('login')}
                  className="font-bold text-purple-400 hover:text-purple-300 underline ml-1 cursor-pointer"
                >
                  LOG IN
                </button>
              </p>
            ) : (
              <p className="text-xs text-neutral-400">
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => resetForm('signup')}
                  className="font-bold text-purple-400 hover:text-purple-300 underline ml-1 cursor-pointer"
                >
                  SIGN UP
                </button>
              </p>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
