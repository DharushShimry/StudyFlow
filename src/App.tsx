import { useState, useEffect, useCallback } from 'react';
import type { Page, ClassSession, SchoolPeriod, Note, BookFile, PomodoroSession, RevisionPlan } from './types';
import { useAuth } from './contexts/AuthContext';
import { scopedKey, migrateLegacyData } from './services/userScope';
import { useTheme } from './contexts/ThemeContext';
import { useToast } from './contexts/ToastContext';
import { useSettings } from './contexts/SettingsContext';
import Sidebar from './components/Sidebar';
import Footer from './components/Footer';
import Dashboard from './components/Dashboard';
import ClassTimetable from './components/ClassTimetable';
import SchoolTimetable from './components/SchoolTimetable';
import Notes from './components/Notes';
import BooksFiles from './components/BooksFiles';
import MediaPlayer from './components/MediaPlayer';
import CodeRunner from './components/CodeRunner';
import AITools from './components/AITools';
import ArenaAgent from './components/ArenaAgent';
import Pomodoro from './components/Pomodoro';
import CalendarView from './components/CalendarView';
import RevisionPlanner from './components/RevisionPlanner';
import PersonalSpace from './components/PersonalSpace';
import DataExportImport from './components/DataExportImport';
import SettingsPage from './components/SettingsPage';
import DownloadPage from './components/DownloadPage';
import StudyTools from './components/StudyTools';
import WelcomeTour from './components/WelcomeTour';
import Avatar from './components/Avatar';
import { useProfile } from './services/profileStore';
import { Menu, CheckCircle, Sun, Moon, Download } from 'lucide-react';

const PAGE_TITLES: Record<Page, string> = {
  'dashboard': 'Dashboard',
  'class-timetable': 'Class Schedule',
  'school-timetable': 'School Schedule',
  'notes': 'My Notes',
  'books': 'Books & Files',
  'media': 'Media Player',
  'code-runner': 'Code Runner',
  'ai-tools': 'AI Tools',
  'arena-agent': 'AI Agent',
  'pomodoro': 'Pomodoro Timer',
  'calendar': 'Calendar View',
  'revision-planner': 'Revision Planner',
  'tools': 'Study Tools',
  'personal': 'Personal Space',
  'settings': 'Settings',
  'download': 'Download App',
};

type Doc = { id: string };

/**
 * A state list persisted to localStorage, with a setter that accepts both full
 * arrays and functional updates (fixing stale-closure batch bugs).
 */
function useLocalList<T extends Doc>(
  user: string,
  name: string,
  initial: T[] = [],
): [T[], (next: T[] | ((prev: T[]) => T[])) => void] {
  const key = scopedKey(name, user);
  const [items, setItems] = useState<T[]>(() => {
    // One-time migration of legacy shared data into this user's namespace,
    // run before reading so the original owner keeps their existing data.
    migrateLegacyData(user);
    try {
      const stored = localStorage.getItem(key);
      return stored ? (JSON.parse(stored) as T[]) : initial;
    } catch {
      return initial;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(items));
    } catch {
      // Storage full or unavailable — keep in-memory state
    }
  }, [key, items]);

  const setItemsSafe = useCallback((nextOrFn: T[] | ((prev: T[]) => T[])) => {
    setItems(prev => {
      const next = typeof nextOrFn === 'function' ? (nextOrFn as (prev: T[]) => T[])(prev) : nextOrFn;
      return next;
    });
  }, []);

  return [items, setItemsSafe];
}

export default function App() {
  const { currentUser, isNewUser, dismissWelcome } = useAuth();
  const user = currentUser ?? '';

  const [page, setPage] = useState<Page>('dashboard');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [saved, setSaved] = useState(false);

  // ---- Per-user localStorage-backed lists (each account gets its own data) ----
  const [classSessions, setClassSessions] = useLocalList<ClassSession>(user, 'class-sessions');
  const [schoolPeriods, setSchoolPeriods] = useLocalList<SchoolPeriod>(user, 'school-periods');
  const [notes, setNotes] = useLocalList<Note>(user, 'notes');
  const [files, setFiles] = useLocalList<BookFile>(user, 'files');
  const [pomodoroSessions, setPomodoroSessions] = useLocalList<PomodoroSession>(user, 'pomodoro-sessions');
  const [revisionPlans, setRevisionPlans] = useLocalList<RevisionPlan>(user, 'revision-plans');

  const [showExport, setShowExport] = useState(false);
  // Manual "Replay welcome tour" trigger from Settings
  const [replayTour, setReplayTour] = useState(false);

  const { theme, toggleTheme } = useTheme();
  const { addToast } = useToast();
  const { settings } = useSettings();
  const profile = useProfile(user);
  const displayName = profile.displayName || user || '';

  // Set document title from settings
  useEffect(() => {
    document.title = settings.appName;
  }, [settings.appName]);

  // Show "saved" indicator briefly on any data change
  const showSaved = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleSetSessions = (s: ClassSession[]) => { setClassSessions(s); showSaved(); addToast('success', 'Class schedule saved!'); };
  const handleSetPeriods = (p: SchoolPeriod[]) => { setSchoolPeriods(p); showSaved(); addToast('success', 'School schedule saved!'); };
  const handleSetNotes = (n: Note[]) => { setNotes(n); showSaved(); addToast('success', 'Notes saved!'); };
  const handleSetFiles = (f: BookFile[] | ((prev: BookFile[]) => BookFile[])) => { setFiles(f); showSaved(); addToast('success', 'Files saved!'); };
  const handleSetPomodoro = (s: PomodoroSession[] | ((prev: PomodoroSession[]) => PomodoroSession[])) => { setPomodoroSessions(s); };
  const handleSetRevisionPlans = (r: RevisionPlan[] | ((prev: RevisionPlan[]) => RevisionPlan[])) => { setRevisionPlans(r); showSaved(); addToast('success', 'Revision plan saved!'); };

  const handleImportData = (data: {
    classSessions: ClassSession[];
    schoolPeriods: SchoolPeriod[];
    notes: Note[];
    files: BookFile[];
    pomodoroSessions?: PomodoroSession[];
    revisionPlans?: RevisionPlan[];
  }) => {
    setClassSessions(data.classSessions);
    setSchoolPeriods(data.schoolPeriods);
    setNotes(data.notes);
    setFiles(data.files);
    if (data.pomodoroSessions) setPomodoroSessions(data.pomodoroSessions);
    if (data.revisionPlans) setRevisionPlans(data.revisionPlans);
  };

  // Track page for transition trigger
  const [prevPage, setPrevPage] = useState(page);
  const [animKey, setAnimKey] = useState(0);
  useEffect(() => {
    if (prevPage !== page) {
      setAnimKey(k => k + 1);
      setPrevPage(page);
    }
  }, [page, prevPage]);

  // Clock for header
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900 overflow-hidden transition-colors duration-300">
      <Sidebar currentPage={page} setPage={setPage} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen}/>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="h-14 bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700 flex items-center px-4 gap-3 flex-shrink-0 shadow-sm z-10 transition-colors duration-300">
          <button className="md:hidden p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg" onClick={() => setMobileOpen(true)}>
            <Menu size={20} className="text-slate-600 dark:text-slate-300"/>
          </button>
          <div className="flex-1">
            <h2 className="font-bold text-slate-800 dark:text-slate-100 text-sm leading-tight">{PAGE_TITLES[page]}</h2>
            <p className="text-xs text-slate-400 dark:text-slate-500 hidden sm:block">
              {time.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Export/Import */}
            <button
              onClick={() => setShowExport(true)}
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              title="Backup & Restore"
            >
              <Download size={16} className="text-slate-500 dark:text-slate-400"/>
            </button>

            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? (
                <Sun size={16} className="text-amber-400"/>
              ) : (
                <Moon size={16} className="text-slate-500"/>
              )}
            </button>

            {/* Current user avatar — click to open profile settings */}
            {user && (
              <button
                onClick={() => setPage('settings')}
                className="hidden sm:flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg pl-1 pr-2.5 py-1 transition-colors"
                title="Open profile settings"
              >
                <Avatar
                  name={displayName || user}
                  src={profile.avatar}
                  color={profile.avatarColor}
                  className="w-7 h-7 rounded-lg"
                  textClass="text-[10px]"
                />
                <span className="text-xs font-medium text-slate-600 dark:text-slate-300 max-w-[110px] truncate">{displayName || user}</span>
              </button>
            )}

            {saved && (
              <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400 font-medium bg-green-50 dark:bg-green-900/30 px-2.5 py-1 rounded-full animate-pulse">
                <CheckCircle size={12}/> Saved
              </span>
            )}
            <span className="hidden sm:flex items-center gap-1 text-xs text-green-600 dark:text-green-400 font-medium bg-green-50 dark:bg-green-900/30 px-2.5 py-1 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500"/>
              Saved locally
            </span>
            <div className="text-xs font-mono text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-700 px-2.5 py-1 rounded-lg">
              {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        </header>

        {/* Page content with transition */}
        <main className="flex-1 overflow-y-auto" key={animKey}>
          <div className="animate-page-in min-h-full flex flex-col">
            {page === 'dashboard' && (
              <Dashboard
                classSessions={classSessions}
                schoolPeriods={schoolPeriods}
                notes={notes}
                files={files}
                revisionPlans={revisionPlans}
                setPage={setPage}
              />
            )}
            {page === 'class-timetable' && (
              <ClassTimetable sessions={classSessions} setSessions={handleSetSessions}/>
            )}
            {page === 'school-timetable' && (
              <SchoolTimetable periods={schoolPeriods} setPeriods={handleSetPeriods}/>
            )}
            {page === 'notes' && (
              <Notes notes={notes} setNotes={handleSetNotes}/>
            )}
            {page === 'books' && (
              <BooksFiles files={files} setFiles={handleSetFiles}/>
            )}
            {page === 'media' && (
              <MediaPlayer/>
            )}
            {page === 'code-runner' && (
              <CodeRunner/>
            )}
            {page === 'ai-tools' && (
              <AITools/>
            )}
            {page === 'arena-agent' && (
              <ArenaAgent/>
            )}
            {page === 'pomodoro' && (
              <Pomodoro sessions={pomodoroSessions} setSessions={handleSetPomodoro} addToast={addToast}/>
            )}
            {page === 'calendar' && (
              <CalendarView classSessions={classSessions} schoolPeriods={schoolPeriods}/>
            )}
            {page === 'revision-planner' && (
              <RevisionPlanner plans={revisionPlans} setPlans={handleSetRevisionPlans} addToast={addToast}/>
            )}
            {page === 'tools' && (
              <StudyTools />
            )}
            {page === 'personal' && (
              <PersonalSpace/>
            )}
            {page === 'settings' && (
              <SettingsPage onReplayTour={() => setReplayTour(true)}/>
            )}
            {page === 'download' && (
              <DownloadPage />
            )}

            {/* Global footer — shown at the end of every page */}
            <Footer className="mt-auto px-4 pt-8 pb-6" />
          </div>
        </main>
      </div>
      {/* Data Export/Import Modal */}
      <DataExportImport
        open={showExport}
        onClose={() => setShowExport(false)}
        onImport={handleImportData}
        addToast={addToast}
        classSessions={classSessions}
        schoolPeriods={schoolPeriods}
        notes={notes}
        files={files}
        pomodoroSessions={pomodoroSessions}
        revisionPlans={revisionPlans}
      />

      {/* Welcome tour — auto-shown for brand-new accounts, or replayed manually from Settings */}
      {(isNewUser || replayTour) && (
        <WelcomeTour
          username={user}
          onClose={() => { dismissWelcome(); setReplayTour(false); }}
        />
      )}
    </div>
  );
}
