import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';

export interface UserAccount {
  username: string;
  passwordHash: string;
  createdAt: string;
}

interface AuthContextType {
  currentUser: string | null;
  users: UserAccount[];
  isNewUser: boolean;
  register: (username: string, password: string) => { ok: boolean; error?: string };
  login: (username: string, password: string) => { ok: boolean; error?: string };
  logout: () => void;
  isUsernameTaken: (username: string) => boolean;
  dismissWelcome: () => void;
  changePassword: (username: string, currentPassword: string, newPassword: string) => { ok: boolean; error?: string };
  deleteAccount: (username: string) => { ok: boolean; error?: string };
}

const AuthContext = createContext<AuthContextType | null>(null);

const USERS_KEY = 'ss-users';
const SESSION_KEY = 'ss-session';
// Per-user flag marking that this account was just created and still owes the
// user a welcome tour. Persisted so a refresh right after registering still
// shows the tour (removed once dismissed).
const welcomeKey = (name: string) => `ss:welcome-pending:${normalize(name)}`;

function normalize(name: string): string {
  return name.trim().toLowerCase();
}

// The app's original creator account, seeded on a fresh browser so it always
// works after the app is published publicly. Credentials were provided by the
// owner explicitly. All accounts (including this one) are stored locally in
// this browser only — this is a convenience seed, not real security.
const OWNER_USERNAME = 'Ahamed_Akeem';
const OWNER_PASSWORD = 'Akeem201022';

/** Lightweight deterministic hash for local storage. NOT for production security. */
function hashPassword(password: string): string {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < password.length; i++) {
    const ch = password.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (h2 >>> 0).toString(16).padStart(8, '0') + (h1 >>> 0).toString(16).padStart(8, '0');
}

function readUsers(): UserAccount[] {
  try {
    const stored = localStorage.getItem(USERS_KEY);
    if (stored) return JSON.parse(stored) as UserAccount[];
  } catch {
    return [];
  }
  // Fresh browser (e.g. right after publishing): seed the owner account so the
  // original creator can always sign in. New visitors can still register.
  return [
    {
      username: OWNER_USERNAME,
      passwordHash: hashPassword(OWNER_PASSWORD),
      createdAt: '2026-01-01T00:00:00.000Z',
    },
  ];
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<UserAccount[]>(readUsers);
  const [currentUser, setCurrentUser] = useState<string | null>(() => {
    try {
      return localStorage.getItem(SESSION_KEY);
    } catch {
      return null;
    }
  });
  // True while the current account still has a pending welcome tour (i.e. it
  // was just created and hasn't dismissed the tour yet). Persisted per user so
  // a page refresh right after registering still shows it.
  const [isNewUser, setIsNewUser] = useState<boolean>(() => {
    try {
      const u = localStorage.getItem(SESSION_KEY);
      return u ? localStorage.getItem(welcomeKey(u)) === '1' : false;
    } catch {
      return false;
    }
  });

  // Persist registered users
  useEffect(() => {
    try {
      localStorage.setItem(USERS_KEY, JSON.stringify(users));
    } catch { /* ignore */ }
  }, [users]);

  // Persist session
  useEffect(() => {
    try {
      if (currentUser) {
        localStorage.setItem(SESSION_KEY, currentUser);
      } else {
        localStorage.removeItem(SESSION_KEY);
      }
    } catch { /* ignore */ }
  }, [currentUser]);

  const isUsernameTaken = useCallback((username: string): boolean => {
    const key = normalize(username);
    return users.some(u => normalize(u.username) === key && key.length > 0);
  }, [users]);

  const register = useCallback((username: string, password: string): { ok: boolean; error?: string } => {
    const name = username.trim();
    if (name.length < 3) {
      return { ok: false, error: 'Username must be at least 3 characters.' };
    }
    if (!/^[a-zA-Z0-9._-]+$/.test(name)) {
      return { ok: false, error: 'Username may only contain letters, numbers, dots, dashes and underscores.' };
    }
    if (isUsernameTaken(name)) {
      return { ok: false, error: 'That username is already reserved. Try another one.' };
    }
    if (password.length < 4) {
      return { ok: false, error: 'Password must be at least 4 characters.' };
    }
    const account: UserAccount = {
      username: name,
      passwordHash: hashPassword(password),
      createdAt: new Date().toISOString(),
    };
    setUsers(prev => [...prev, account]);
    setCurrentUser(name);
    try { localStorage.setItem(welcomeKey(name), '1'); } catch { /* ignore */ }
    setIsNewUser(true);
    return { ok: true };
  }, [isUsernameTaken]);

  const login = useCallback((username: string, password: string): { ok: boolean; error?: string } => {
    const key = normalize(username);
    const account = users.find(u => normalize(u.username) === key);
    if (!account) {
      return { ok: false, error: 'No account found with that username. Reserve it first!' };
    }
    if (account.passwordHash !== hashPassword(password)) {
      return { ok: false, error: 'Incorrect password. Please try again.' };
    }
    setCurrentUser(account.username);
    // Re-check the persisted flag: a user who registered earlier (and never
    // dismissed the tour) should still see it on their next login.
    try {
      setIsNewUser(localStorage.getItem(welcomeKey(account.username)) === '1');
    } catch {
      setIsNewUser(false);
    }
    return { ok: true };
  }, [users]);

  const logout = useCallback(() => {
    setCurrentUser(null);
    setIsNewUser(false);
  }, []);

  const changePassword = useCallback((username: string, currentPassword: string, newPassword: string): { ok: boolean; error?: string } => {
    const key = normalize(username);
    const idx = users.findIndex(u => normalize(u.username) === key);
    if (idx < 0) {
      return { ok: false, error: 'Account not found.' };
    }
    if (users[idx].passwordHash !== hashPassword(currentPassword)) {
      return { ok: false, error: 'Current password is incorrect.' };
    }
    if (newPassword.length < 4) {
      return { ok: false, error: 'New password must be at least 4 characters.' };
    }
    setUsers(prev => prev.map((u, i) => (i === idx ? { ...u, passwordHash: hashPassword(newPassword) } : u)));
    return { ok: true };
  }, [users]);

  const deleteAccount = useCallback((username: string): { ok: boolean; error?: string } => {
    const key = normalize(username);
    if (!users.some(u => normalize(u.username) === key)) {
      return { ok: false, error: 'Account not found.' };
    }
    setUsers(prev => prev.filter(u => normalize(u.username) !== key));
    // If the deleted account is the signed-in one, end the session.
    if (normalize(currentUser ?? '') === key) {
      setCurrentUser(null);
      setIsNewUser(false);
    }
    return { ok: true };
  }, [users, currentUser]);

  const dismissWelcome = useCallback(() => {
    try {
      const u = localStorage.getItem(SESSION_KEY);
      if (u) localStorage.removeItem(welcomeKey(u));
    } catch { /* ignore */ }
    setIsNewUser(false);
  }, []);

  return (
    <AuthContext.Provider value={{ currentUser, users, isNewUser, register, login, logout, isUsernameTaken, dismissWelcome, changePassword, deleteAccount }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
