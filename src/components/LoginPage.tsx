import { useState, useEffect, type FormEvent } from 'react';
import { User, Lock, Eye, EyeOff, LogIn, ShieldCheck, Sun, Moon, AlertCircle, CheckCircle2 } from 'lucide-react';
import appLogo from '../Media/app-logo.png?url';
import { useAuth } from '../contexts/AuthContext';
import Footer from './Footer';
import { useTheme } from '../contexts/ThemeContext';
import { useSettings } from '../contexts/SettingsContext';
import { useToast } from '../contexts/ToastContext';

type Mode = 'login' | 'register';

export default function LoginPage() {
  const { login, register, isUsernameTaken, users } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { settings } = useSettings();
  const { addToast } = useToast();

  const [mode, setMode] = useState<Mode>(users.length === 0 ? 'register' : 'login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Keep the browser tab title consistent even before logging in
  useEffect(() => {
    document.title = settings.appName;
  }, [settings.appName]);

  const nameValid = username.trim().length >= 3 && /^[a-zA-Z0-9._-]+$/.test(username.trim());
  const available = mode === 'register' && username.trim().length >= 3 && nameValid && !isUsernameTaken(username);

  const switchMode = (m: Mode) => {
    setMode(m);
    setError(null);
    setPassword('');
    setConfirm('');
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (mode === 'login') {
      const res = login(username, password);
      if (!res.ok) {
        setError(res.error || 'Login failed.');
        return;
      }
      addToast('success', `Welcome back, ${username.trim()}! 👋`);
    } else {
      if (password !== confirm) {
        setError('Passwords do not match.');
        return;
      }
      const res = register(username, password);
      if (!res.ok) {
        setError(res.error || 'Could not reserve that username.');
        return;
      }
      addToast('success', `Username "${username.trim()}" reserved — welcome to StudyFlow! 🎉`);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
      {/* Decorative background */}
      <div className="absolute inset-0 opacity-[0.08] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, #6366f1 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
      <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-gradient-to-br from-violet-400/30 to-indigo-500/30 blur-3xl animate-float-slow" />
      <div className="absolute -bottom-40 -right-32 w-[28rem] h-[28rem] rounded-full bg-gradient-to-br from-teal-400/20 to-cyan-500/25 blur-3xl animate-float" />

      {/* Theme toggle */}        <button
          onClick={toggleTheme}
          className="absolute top-5 right-5 p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md hover:scale-105 transition-all"
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
        {theme === 'dark' ? <Sun size={18} className="text-amber-400"/> : <Moon size={18} className="text-slate-500"/>}
      </button>

      {/* Card */}
      <div className="relative w-full max-w-md">
        <div className="glass-modal bg-white dark:bg-slate-800 rounded-3xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="hero-gradient animate-gradient-shift p-8 pb-9 text-white relative overflow-hidden">
            <div className="absolute inset-0 opacity-[0.12]">
              <div className="absolute top-3 left-[20%] w-10 h-10 rounded-full bg-white animate-float-slow"/>
              <div className="absolute bottom-4 right-[15%] w-8 h-8 rounded-full bg-white animate-float" style={{ animationDuration: '5s' }}/>
            </div>
            <div className="relative flex flex-col items-center text-center">
              <div className="w-[4.5rem] h-[4.5rem] rounded-2xl overflow-hidden ring-2 ring-white/30 shadow-lg mb-4 flex items-center justify-center bg-white">
                <img src={appLogo} alt={`${settings.appName} logo`} className="w-full h-full object-contain"/>
              </div>
              <h1 className="text-2xl font-bold tracking-tight">{settings.appName}</h1>
              <p className="text-xs opacity-70 mt-3 flex items-center gap-1.5">
                <ShieldCheck size={13}/> Usernames are reserved — once taken, they're yours
              </p>
            </div>
          </div>

          {/* Mode tabs */}
          <div className="px-8 pt-6">
            <div className="flex bg-slate-100 dark:bg-slate-700 rounded-xl p-1 shadow-inner">
              <button
                onClick={() => switchMode('login')}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${mode === 'login' ? 'bg-white dark:bg-slate-600 shadow text-slate-800 dark:text-slate-100' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
              >
                Log In
              </button>
              <button
                onClick={() => switchMode('register')}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${mode === 'register' ? 'bg-white dark:bg-slate-600 shadow text-slate-800 dark:text-slate-100' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
              >
                Reserve Username
              </button>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-8 pt-6 space-y-4">
            {/* Username */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Username</label>
              <div className="relative">
                <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"/>
                <input
                  value={username}
                  onChange={e => { setUsername(e.target.value); setError(null); }}
                  placeholder={mode === 'register' ? 'Pick a username to reserve' : 'Your username'}
                  autoComplete="username"
                  className="w-full pl-10 pr-10 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 dark:bg-slate-700 dark:text-slate-200"
                />
                {mode === 'register' && username.trim().length >= 3 && (
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2">
                    {isUsernameTaken(username) ? (
                      <AlertCircle size={16} className="text-red-400"/>
                    ) : nameValid ? (
                      <CheckCircle2 size={16} className="text-green-500"/>
                    ) : (
                      <AlertCircle size={16} className="text-amber-400"/>
                    )}
                  </span>
                )}
              </div>
              {mode === 'register' && username.trim().length >= 3 && (
                <p className={`text-xs mt-1.5 ${available ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
                  {isUsernameTaken(username)
                    ? '✗ This username is already reserved.'
                    : nameValid
                      ? '✓ This username is available to reserve!'
                      : 'Letters, numbers, dots, dashes and underscores only.'}
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"/>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder={mode === 'register' ? 'Create a password (min 4 characters)' : 'Your password'}
                  autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                  className="w-full pl-10 pr-10 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 dark:bg-slate-700 dark:text-slate-200"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16}/> : <Eye size={16}/>}
                </button>
              </div>
            </div>

            {/* Confirm password (register only) */}
            {mode === 'register' && (
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Confirm Password</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"/>
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    placeholder="Re-enter your password"
                    autoComplete="new-password"
                    className="w-full pl-10 pr-10 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 dark:bg-slate-700 dark:text-slate-200"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(v => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    aria-label={showConfirm ? 'Hide confirm password' : 'Show confirm password'}
                  >
                    {showConfirm ? <EyeOff size={16}/> : <Eye size={16}/>}
                  </button>
                </div>
              </div>
            )}

            {/* Messages */}
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/30 rounded-xl p-3 flex items-start gap-2 text-xs text-red-600 dark:text-red-300 animate-scale-in">
                <AlertCircle size={14} className="flex-shrink-0 mt-0.5"/>
                <span>{error}</span>
              </div>
            )}
            {/* Submit */}
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 btn-accent py-3 rounded-xl text-sm font-bold shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all"
            >
              <LogIn size={16}/>
              {mode === 'login' ? 'Log In' : 'Reserve Username & Enter'}
            </button>

            {mode === 'register' && (
              <p className="text-[11px] text-center text-slate-400 dark:text-slate-500 leading-relaxed">
                Passwords need at least 4 characters. Reserved usernames are stored on this device. {users.length > 0 ? `${users.length} username${users.length === 1 ? '' : 's'} already reserved.` : 'Be the first to reserve a username!'}
              </p>
            )}
          </form>
        </div>

        <p className="text-center text-xs text-slate-400 dark:text-slate-500 mt-5">
          {settings.appName} · All data saved locally on this device
        </p>

        {/* Footer */}
        <Footer className="mt-6" />
      </div>
    </div>
  );
}
