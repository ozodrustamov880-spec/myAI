import React, { useState } from 'react';
import { X, User, Mail, Lock, ShieldCheck, Check, Sparkles, ArrowRight } from 'lucide-react';
import { UserProfile } from '../../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: UserProfile) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
}) => {
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [tier, setTier] = useState<'Free Tier' | 'Developer Pro' | 'Enterprise'>('Developer Pro');
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'forgot') {
      setStatusMsg(`Password reset instructions dispatched to ${email || 'your email'}.`);
      return;
    }

    const newUser: UserProfile = {
      id: 'usr-' + Date.now(),
      name: name.trim() || email.split('@')[0] || 'AI Studio Developer',
      email: email.trim() || 'developer@google.dev',
      avatarUrl: `https://api.dicebear.com/7.x/identicon/svg?seed=${email || 'studio'}`,
      tier: tier,
      apiKeyCount: 2,
    };

    localStorage.setItem('ais_user_session', JSON.stringify(newUser));
    onLoginSuccess(newUser);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs select-none">
      <div className="max-w-md w-full bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[var(--border-color)] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[var(--text-primary)]">
                {mode === 'login'
                  ? 'Sign In to AI Studio'
                  : mode === 'register'
                  ? 'Create Developer Account'
                  : 'Reset Password'}
              </h2>
              <p className="text-[11px] text-[var(--text-tertiary)]">
                Access your projects, custom prompts, and API keys
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[var(--bg-surface-variant)] text-[var(--text-tertiary)]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {statusMsg && (
            <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 text-xs">
              {statusMsg}
            </div>
          )}

          {mode === 'register' && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[var(--text-secondary)]">Full Name</label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Alex Turing"
                  className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-blue-500 rounded-xl pl-9 pr-3 py-2 text-xs text-[var(--text-primary)] outline-none"
                />
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[var(--text-secondary)]">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="developer@example.com"
                className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-blue-500 rounded-xl pl-9 pr-3 py-2 text-xs text-[var(--text-primary)] outline-none"
              />
            </div>
          </div>

          {mode !== 'forgot' && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-[var(--text-secondary)]">Password</label>
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={() => setMode('forgot')}
                    className="text-[11px] text-blue-500 hover:underline"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-blue-500 rounded-xl pl-9 pr-3 py-2 text-xs text-[var(--text-primary)] outline-none"
                />
              </div>
            </div>
          )}

          {mode === 'register' && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[var(--text-secondary)]">Developer Plan</label>
              <div className="grid grid-cols-3 gap-2 text-xs">
                {(['Free Tier', 'Developer Pro', 'Enterprise'] as const).map((t) => (
                  <button
                    type="button"
                    key={t}
                    onClick={() => setTier(t)}
                    className={`p-2 rounded-lg border text-center transition-all ${
                      tier === t
                        ? 'border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-400 font-semibold'
                        : 'border-[var(--border-color)] text-[var(--text-secondary)]'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          )}

          <button
            type="submit"
            className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/20 transition-all active:scale-98"
          >
            <span>
              {mode === 'login'
                ? 'Sign In'
                : mode === 'register'
                ? 'Create Account'
                : 'Send Reset Link'}
            </span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>

          {/* Switch mode */}
          <div className="text-center pt-2 text-xs text-[var(--text-tertiary)]">
            {mode === 'login' ? (
              <span>
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => setMode('register')}
                  className="text-blue-500 hover:underline font-medium"
                >
                  Register
                </button>
              </span>
            ) : (
              <span>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className="text-blue-500 hover:underline font-medium"
                >
                  Sign In
                </button>
              </span>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
