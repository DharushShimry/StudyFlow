import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { AppSettings } from '../types';

const STORAGE_KEY = 'ss-settings';

const DEFAULT_SUBJECTS = [
  'Mathematics', 'Science', 'English', 'English Literature', 'Tamil',
  'Sinhala', 'History', 'ICT', 'Religion', 'General',
];

const DEFAULT_SETTINGS: AppSettings = {
  accentColor: 'violet',
  appName: 'StudyFlow',
  gradeInfo: 'Grade 11 / O-Level',
  cardDensity: 'comfortable',
  fontSize: 'medium',
  borderRadius: 'medium',
  glassEffect: true,
  dashboardWidgets: {
    stats: true,
    quickActions: true,
    todaySchedule: true,
    recentNotes: true,
  },
  customSubjects: DEFAULT_SUBJECTS.map(s => ({ name: s, color: getDefaultColor(s) })),
};

function getDefaultColor(name: string): string {
  const map: Record<string, string> = {
    'Mathematics': 'blue',
    'Science': 'green',
    'English': 'pink',
    'English Literature': 'purple',
    'Tamil': 'orange',
    'Sinhala': 'yellow',
    'History': 'amber',
    'ICT': 'cyan',
    'Religion': 'rose',
    'General': 'slate',
  };
  return map[name] || 'slate';
}

interface SettingsContextType {
  settings: AppSettings;
  updateSettings: (partial: Partial<AppSettings>) => void;
  updateWidget: (widget: keyof AppSettings['dashboardWidgets'], value: boolean) => void;
  addCustomSubject: (name: string, color?: string) => void;
  removeCustomSubject: (name: string) => void;
  setCustomSubjectColor: (name: string, color: string) => void;
  getSubjectList: () => string[];
  getSubjectColor: (name: string) => string;
  resetSettings: () => void;
}

const SettingsContext = createContext<SettingsContextType | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Migration: upgrade previously stored default grade info
        if (parsed.gradeInfo === 'Grade 10 / O-Level') {
          parsed.gradeInfo = 'Grade 11 / O-Level';
        }
        // Migration: rebrand the old app name so stored settings show StudyFlow
        if (parsed.appName === 'StudySpace') {
          parsed.appName = 'StudyFlow';
        }
        return { ...DEFAULT_SETTINGS, ...parsed, customSubjects: parsed.customSubjects || DEFAULT_SETTINGS.customSubjects };
      }
    } catch { /* ignore */ }
    return DEFAULT_SETTINGS;
  });

  // Sync to localStorage and apply CSS variables
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(settings)); } catch { /* ignore */ }

    const root = document.documentElement;

    // Accent color
    root.setAttribute('data-accent', settings.accentColor);

    // Font size
    const fontSizes = { small: '13px', medium: '14px', large: '16px' };
    root.style.setProperty('--font-size-base', fontSizes[settings.fontSize]);

    // Border radius
    const radii = { small: '0.5rem', medium: '1rem', large: '1.5rem' };
    root.style.setProperty('--radius-lg', radii[settings.borderRadius]);
    root.style.setProperty('--radius-xl', settings.borderRadius === 'large' ? '2rem' : settings.borderRadius === 'small' ? '0.75rem' : '1.25rem');

    // Glass effect
    root.classList.toggle('glass-enabled', settings.glassEffect);

    // Card density
    root.style.setProperty('--card-padding', settings.cardDensity === 'compact' ? '0.75rem' : '1.25rem');
    root.style.setProperty('--card-gap', settings.cardDensity === 'compact' ? '0.5rem' : '0.75rem');

  }, [settings]);

  const updateSettings = useCallback((partial: Partial<AppSettings>) => {
    setSettings(prev => ({ ...prev, ...partial }));
  }, []);

  const updateWidget = useCallback((widget: keyof AppSettings['dashboardWidgets'], value: boolean) => {
    setSettings(prev => ({
      ...prev,
      dashboardWidgets: { ...prev.dashboardWidgets, [widget]: value },
    }));
  }, []);

  const addCustomSubject = useCallback((name: string, color?: string) => {
    setSettings(prev => ({
      ...prev,
      customSubjects: [...prev.customSubjects, { name, color: color || 'slate' }],
    }));
  }, []);

  const removeCustomSubject = useCallback((name: string) => {
    setSettings(prev => ({
      ...prev,
      customSubjects: prev.customSubjects.filter(s => s.name !== name),
    }));
  }, []);

  const setCustomSubjectColor = useCallback((name: string, color: string) => {
    setSettings(prev => ({
      ...prev,
      customSubjects: prev.customSubjects.map(s => s.name === name ? { ...s, color } : s),
    }));
  }, []);

  const resetSettings = useCallback(() => {
    setSettings({
      ...DEFAULT_SETTINGS,
      customSubjects: DEFAULT_SETTINGS.customSubjects.map(s => ({ ...s })),
    });
  }, []);

  const getSubjectList = useCallback(() => {
    return settings.customSubjects.map(s => s.name);
  }, [settings.customSubjects]);

  const getSubjectColor = useCallback((name: string) => {
    return settings.customSubjects.find(s => s.name === name)?.color || 'slate';
  }, [settings.customSubjects]);

  return (
    <SettingsContext.Provider value={{
      settings, updateSettings, updateWidget,
      addCustomSubject, removeCustomSubject, setCustomSubjectColor,
      getSubjectList, getSubjectColor, resetSettings,
    }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings(): SettingsContextType {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}

export { DEFAULT_SETTINGS, DEFAULT_SUBJECTS };
