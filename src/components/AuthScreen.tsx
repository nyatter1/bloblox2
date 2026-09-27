import React, { useState } from 'react';
import logoImg from '../assets/logo.png';
import { User, Lock, Sparkles, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import {
  UserProfile,
  registerFirebaseUser,
  loginFirebaseUser
} from '../services/firebase';

interface AuthScreenProps {
  onLogin: (user: UserProfile) => void;
}

export const AUTH_STORAGE_KEY = 'boblox_auth_user_v1';

export default function AuthScreen({ onLogin }: AuthScreenProps) {
  const [tab, setTab] = useState<'signup' | 'login'>('signup');

  // Sign up fields
  const [birthMonth, setBirthMonth] = useState('Jan');
  const [birthDay, setBirthDay] = useState('1');
  const [birthYear, setBirthYear] = useState('2008');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | null>(null);

  // Login fields
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanUser = username.trim();
    if (!cleanUser) {
      setError('Please choose a username.');
      return;
    }
    if (cleanUser.length < 3 || cleanUser.length > 20) {
      setError('Username must be between 3 and 20 characters.');
      return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(cleanUser)) {
      setError('Usernames can only contain letters, numbers, and underscores.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);
    try {
      const profile = await registerFirebaseUser(cleanUser, password);
      try {
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(profile));
      } catch {
        // ignore
      }
      onLogin(profile);
    } catch (err: any) {
      console.error('Sign up error:', err);
      if (err.message && err.message.includes('already taken')) {
        setError('This username is already taken. Please choose another or Log In.');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('This username is already registered. Please Log In instead.');
      } else {
        setError(err.message || 'Failed to create account. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanUser = loginUsername.trim();
    if (!cleanUser) {
      setError('Please enter your username.');
      return;
    }
    if (!loginPassword) {
      setError('Please enter your password.');
      return;
    }

    setLoading(true);
    try {
      const profile = await loginFirebaseUser(cleanUser, loginPassword);
      try {
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(profile));
      } catch {
        // ignore
      }
      onLogin(profile);
    } catch (err: any) {
      console.error('Login error:', err);
      // Strict security: fake accounts are rejected!
      if (
        err.code === 'auth/user-not-found' ||
        err.code === 'auth/wrong-password' ||
        err.code === 'auth/invalid-credential' ||
        (err.message && err.message.includes('invalid-credential'))
      ) {
        setError('Invalid username or password. This account does not exist. Please Sign Up if you are new to BoBlox.');
      } else {
        setError(err.message || 'Login failed. Please check your credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const days = Array.from({ length: 31 }, (_, i) => String(i + 1));
  const years = Array.from({ length: 40 }, (_, i) => String(2024 - i));

  return (
    <div className="min-h-screen bg-[#0d0918] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#241344] via-[#100b21] to-[#07050d] text-white flex flex-col justify-between font-sans selection:bg-purple-600 selection:text-white">
      {/* Top Banner Bar */}
      <header className="h-16 px-6 sm:px-12 flex items-center justify-between border-b border-purple-500/15 backdrop-blur-md bg-[#120d24]/60">
        <div className="flex items-center gap-3">
          <img src={logoImg} alt="BoBlox" className="h-8 w-auto object-contain drop-shadow" />
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setTab(tab === 'signup' ? 'login' : 'signup');
              setError(null);
            }}
            className="px-4 py-1.5 rounded-lg border border-purple-500/30 hover:border-purple-400 text-xs font-semibold text-purple-200 hover:text-white transition-all cursor-pointer"
          >
            {tab === 'signup' ? 'Log In' : 'Sign Up'}
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex items-center justify-center p-4 py-10">
        <div className="w-full max-w-md bg-[#150f28]/95 border border-purple-500/25 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl relative overflow-hidden">
          {/* Subtle Glow */}
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />

          {/* Heading */}
          <div className="text-center mb-6">
            <h1 className="text-2xl sm:text-3xl font-display font-extrabold text-white tracking-tight">
              {tab === 'signup' ? 'Sign Up and Start Having Fun!' : 'Log In to BoBlox'}
            </h1>
            <p className="text-xs text-purple-300/70 mt-1">
              {tab === 'signup'
                ? 'Create a free account to customize your avatar and play.'
                : 'Enter your credentials to access your saved character.'}
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-950/70 border border-red-500/40 text-red-200 text-xs flex items-center gap-2 animate-fadeIn">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {tab === 'signup' ? (
            /* ================= SIGN UP FORM ================= */
            <form onSubmit={handleSignUp} className="space-y-4">
              {/* Birthday Row */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-purple-200 uppercase tracking-wider">
                  Birthday
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <select
                    value={birthMonth}
                    onChange={(e) => setBirthMonth(e.target.value)}
                    className="bg-[#1c1437] border border-purple-500/25 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-purple-400 cursor-pointer"
                  >
                    {months.map((m) => (
                      <option key={m} value={m} className="bg-[#1c1437]">
                        {m}
                      </option>
                    ))}
                  </select>

                  <select
                    value={birthDay}
                    onChange={(e) => setBirthDay(e.target.value)}
                    className="bg-[#1c1437] border border-purple-500/25 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-purple-400 cursor-pointer"
                  >
                    {days.map((d) => (
                      <option key={d} value={d} className="bg-[#1c1437]">
                        {d}
                      </option>
                    ))}
                  </select>

                  <select
                    value={birthYear}
                    onChange={(e) => setBirthYear(e.target.value)}
                    className="bg-[#1c1437] border border-purple-500/25 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-purple-400 cursor-pointer"
                  >
                    {years.map((y) => (
                      <option key={y} value={y} className="bg-[#1c1437]">
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Username Field */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-purple-200 uppercase tracking-wider flex items-center justify-between">
                  <span>Username</span>
                  <span className="text-[10px] text-purple-400/70 lowercase font-normal">
                    Don&apos;t use your real name
                  </span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-purple-400/60" />
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter unique username"
                    maxLength={20}
                    className="w-full bg-[#1c1437] border border-purple-500/25 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-purple-300/40 focus:outline-none focus:border-purple-400"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-purple-200 uppercase tracking-wider flex items-center justify-between">
                  <span>Password</span>
                  <span className="text-[10px] text-purple-400/70 lowercase font-normal">
                    At least 6 characters
                  </span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-purple-400/60" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create a password"
                    minLength={6}
                    className="w-full bg-[#1c1437] border border-purple-500/25 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-purple-300/40 focus:outline-none focus:border-purple-400"
                  />
                </div>
              </div>

              {/* Gender selector (Classic Roblox style) */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-purple-200 uppercase tracking-wider">
                  Gender (optional)
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setGender(gender === 'male' ? null : 'male')}
                    className={`py-2 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      gender === 'male'
                        ? 'bg-purple-600/40 border-purple-400 text-white shadow-sm'
                        : 'bg-[#1c1437] border-purple-500/20 text-purple-300 hover:bg-[#231a44]'
                    }`}
                  >
                    <span>Boy</span>
                    {gender === 'male' && <CheckCircle2 className="w-3.5 h-3.5 text-purple-300" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => setGender(gender === 'female' ? null : 'female')}
                    className={`py-2 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      gender === 'female'
                        ? 'bg-purple-600/40 border-purple-400 text-white shadow-sm'
                        : 'bg-[#1c1437] border-purple-500/20 text-purple-300 hover:bg-[#231a44]'
                    }`}
                  >
                    <span>Girl</span>
                    {gender === 'female' && <CheckCircle2 className="w-3.5 h-3.5 text-purple-300" />}
                  </button>
                </div>
              </div>

              {/* Sign Up Submit Button (Authentic Green Button) */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] text-white font-bold text-sm tracking-wide shadow-lg shadow-emerald-950/40 transition-all cursor-pointer flex items-center justify-center gap-2 mt-2"
              >
                <Sparkles className="w-4 h-4 text-emerald-200" />
                <span>{loading ? 'Creating Account...' : 'Sign Up'}</span>
              </button>
            </form>
          ) : (
            /* ================= LOG IN FORM ================= */
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-purple-200 uppercase tracking-wider">
                  Username
                </label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-purple-400/60" />
                  <input
                    type="text"
                    required
                    value={loginUsername}
                    onChange={(e) => setLoginUsername(e.target.value)}
                    placeholder="Enter your username"
                    className="w-full bg-[#1c1437] border border-purple-500/25 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-purple-300/40 focus:outline-none focus:border-purple-400"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-purple-200 uppercase tracking-wider">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-purple-400/60" />
                  <input
                    type="password"
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full bg-[#1c1437] border border-purple-500/25 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-purple-300/40 focus:outline-none focus:border-purple-400"
                  />
                </div>
              </div>

              {/* Log In Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-xl bg-purple-600 hover:bg-purple-500 active:scale-[0.99] text-white font-bold text-sm tracking-wide shadow-lg shadow-purple-950/40 transition-all cursor-pointer flex items-center justify-center gap-2 mt-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                <span>{loading ? 'Authenticating...' : 'Log In'}</span>
              </button>
            </form>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-purple-400/50 border-t border-purple-500/10">
        <span>© 2026 BoBlox Corporation. All rights reserved.</span>
      </footer>
    </div>
  );
}
