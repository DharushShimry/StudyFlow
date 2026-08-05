import React from 'react';
import type { Page } from '../types';
import { useTheme } from '../contexts/ThemeContext';
import { useSettings } from '../contexts/SettingsContext';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import appLogo from '../Media/app-logo.png?url';
import {
  LayoutDashboard, Calendar, School, BookOpen, FolderOpen, Clapperboard, Code2, Sparkles, Bot, X, GraduationCap, Sun, Moon, Timer, LayoutGrid, Target, Calculator, IdCard, Settings, LogOut, Download
} from 'lucide-react';
import Avatar from './Avatar';
import { useProfile } from '../services/profileStore';

interface SidebarProps {
  currentPage: Page;
  setPage: (p: Page) => void;
  mobileOpen: boolean;
  setMobileOpen: (v: boolean) => void;
}

const navItems: { id: Page; label: string; icon: React.ReactNode; color: string; darkColor: string }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} />, color: 'text-violet-600', darkColor: 'dark:text-violet-400' },
  { id: 'class-timetable', label: 'Class Timetable', icon: <Calendar size={18} />, color: 'text-blue-600', darkColor: 'dark:text-blue-400' },
  { id: 'school-timetable', label: 'School Timetable', icon: <School size={18} />, color: 'text-indigo-600', darkColor: 'dark:text-indigo-400' },
  { id: 'notes', label: 'My Notes', icon: <BookOpen size={18} />, color: 'text-amber-600', darkColor: 'dark:text-amber-400' },
  { id: 'books', label: 'Books & Files', icon: <FolderOpen size={18} />, color: 'text-green-600', darkColor: 'dark:text-green-400' },
  { id: 'media', label: 'Media Player', icon: <Clapperboard size={18} />, color: 'text-orange-600', darkColor: 'dark:text-orange-400' },
  { id: 'code-runner', label: 'Code Runner', icon: <Code2 size={18} />, color: 'text-pink-600', darkColor: 'dark:text-pink-400' },
  { id: 'ai-tools', label: 'AI Tools', icon: <Sparkles size={18} />, color: 'text-purple-600', darkColor: 'dark:text-purple-400' },
  { id: 'arena-agent', label: 'AI Agent', icon: <Bot size={18} />, color: 'text-cyan-600', darkColor: 'dark:text-cyan-400' },
  { id: 'pomodoro', label: 'Pomodoro', icon: <Timer size={18} />, color: 'text-rose-600', darkColor: 'dark:text-rose-400' },
  { id: 'calendar', label: 'Calendar', icon: <LayoutGrid size={18} />, color: 'text-violet-600', darkColor: 'dark:text-violet-400' },
  { id: 'revision-planner', label: 'Revision Planner', icon: <Target size={18} />, color: 'text-teal-600', darkColor: 'dark:text-teal-400' },
  { id: 'tools', label: 'Study Tools', icon: <Calculator size={18} />, color: 'text-teal-600', darkColor: 'dark:text-teal-400' },
  { id: 'personal', label: 'Personal', icon: <IdCard size={18} />, color: 'text-rose-600', darkColor: 'dark:text-rose-400' },
  { id: 'download', label: 'Download App', icon: <Download size={18} />, color: 'text-amber-600', darkColor: 'dark:text-amber-400' },
  { id: 'settings', label: 'Settings', icon: <Settings size={18} />, color: 'text-slate-500', darkColor: 'dark:text-slate-400' },
];

export default function Sidebar({ currentPage, setPage, mobileOpen, setMobileOpen }: SidebarProps) {
  const { theme, toggleTheme } = useTheme();
  const { settings } = useSettings();
  const { currentUser, logout } = useAuth();
  const { addToast } = useToast();

  const profile = useProfile(currentUser ?? '');
  const displayName = profile.displayName || currentUser || '';

  // Personalized tagline: the original owner keeps "Akeem's Learning Zone",
  // every other account sees "<username>'s Learning Zone".
  const isOwner = currentUser && currentUser.trim().toLowerCase() === 'ahamed_akeem';
  const taglineName = isOwner ? 'Akeem' : (displayName.trim() || settings.appName);
  const tagline = `${taglineName}'s Learning Zone`;

  const nav = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-100 dark:border-slate-700">
        <div className="w-12 h-12 rounded-xl overflow-hidden shadow-lg flex-shrink-0 flex items-center justify-center bg-white dark:bg-slate-700" style={{ boxShadow: '0 4px 12px -1px rgba(0,0,0,0.2)' }}>
          <img src={appLogo} alt={`${settings.appName} logo`} className="w-full h-full object-contain" />
        </div>
        <div>
          <div className="font-bold text-slate-800 dark:text-slate-100 text-sm leading-tight">
            <span className="gradient-text">{settings.appName}</span>
          </div>
          <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 leading-tight">{tagline}</div>
          <div className="text-[10px] text-slate-400 dark:text-slate-500">Learn • Focus • Grow</div>
        </div>
        <button
          onClick={() => setMobileOpen(false)}
          className="ml-auto md:hidden text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
        >
          <X size={18} />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map(item => (
          <button
            key={item.id}
            onClick={() => { setPage(item.id); setMobileOpen(false); }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200
              ${currentPage === item.id
              ? 'nav-active text-violet-700 dark:text-violet-300 shadow-sm border scale-[1.02]'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50 hover:text-slate-900 dark:hover:text-slate-200 hover:scale-[1.02]'
              }`}
          >
            <span className={`${currentPage === item.id ? 'text-accent-icon animate-bounce-gentle' : `${item.color} ${item.darkColor}`} transition-transform duration-200`}>
              {item.icon}
            </span>
            {item.label}
            {currentPage === item.id && (
              <span className="ml-auto w-1.5 h-1.5 rounded-full accent-dot glow-dot" />
            )}
          </button>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-slate-100 dark:border-slate-700 space-y-2">
        {/* Current user */}
        {currentUser && (
          <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-700/40 border border-slate-100 dark:border-slate-600/50">
            <Avatar
              name={displayName || currentUser || '?'}
              src={profile.avatar}
              color={profile.avatarColor}
              className="w-8 h-8 rounded-lg"
              textClass="text-[11px]"
            />
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">{displayName || currentUser}</div>
              <div className="text-[10px] text-slate-400 dark:text-slate-500 truncate">{profile.bio ? profile.bio : 'Signed in'}</div>
            </div>
            <button
              onClick={() => { logout(); addToast('info', 'Signed out. See you soon! 👋'); }}
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-all"
              title="Log out"
              aria-label="Log out"
            >
              <LogOut size={14}/>
            </button>
          </div>
        )}

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all border-0"
        >
          {theme === 'dark' ? <Sun size={16} className="text-amber-400"/> : <Moon size={16} className="text-slate-500"/>}
          {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
        </button>

        <div className="flex items-center gap-2.5 bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 rounded-xl p-3 border border-green-200 dark:border-green-700/40 card-glow">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center">
            <GraduationCap size={14} className="text-white" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">{settings.appName}</div>
            <div className="text-xs text-slate-400 dark:text-slate-500">All data saved locally</div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-56 flex-shrink-0 bg-white dark:bg-slate-800 border-r border-slate-100 dark:border-slate-700 h-screen sticky top-0 shadow-sm transition-colors duration-300">
        {nav}
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/30 dark:bg-black/50 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-64 h-full bg-white dark:bg-slate-800 shadow-2xl">
            {nav}
          </aside>
        </div>
      )}
    </>
  );
}
