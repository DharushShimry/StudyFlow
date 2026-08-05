export type Page = 'dashboard' | 'class-timetable' | 'school-timetable' | 'notes' | 'books' | 'media' | 'code-runner' | 'ai-tools' | 'arena-agent' | 'pomodoro' | 'calendar' | 'revision-planner' | 'tools' | 'personal' | 'settings' | 'download';

export interface ClassSession {
  id: string;
  subject: string;
  teacher: string;
  type: 'Theory' | 'Paper' | 'Physical' | 'Other';
  days: string[];
  startTime: string;
  endTime: string;
  location?: string;
  color: string;
}

export interface SchoolPeriod {
  id: string;
  subject: string;
  subjectType?: string;
  startTime: string;
  endTime: string;
  day: string;
  period: number;
  color: string;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  subject: string;
  createdAt: string;
  updatedAt: string;
  color: string;
}

export interface BookFile {
  id: string;
  name: string;
  subject: string;
  type: string;
  size: string;
  uploadedAt: string;
  storageId?: string;
  url?: string;
  dataUrl?: string;
}

export interface PomodoroSession {
  id: string;
  date: string;
  focusMinutes: number;
  completedAt: string;
}

export interface RevisionPlan {
  id: string;
  subject: string;
  topic: string;
  dueDate: string; // YYYY-MM-DD
  priority: 'High' | 'Medium' | 'Low';
  completed: boolean;
  createdAt: string;
  updatedAt: string;
  notes?: string;
}

export interface AppSettings {
  accentColor: 'violet' | 'blue' | 'emerald' | 'rose' | 'amber' | 'cyan' | 'purple' | 'orange';
  appName: string;
  gradeInfo: string;
  cardDensity: 'compact' | 'comfortable';
  fontSize: 'small' | 'medium' | 'large';
  borderRadius: 'small' | 'medium' | 'large';
  glassEffect: boolean;
  dashboardWidgets: {
    stats: boolean;
    quickActions: boolean;
    todaySchedule: boolean;
    recentNotes: boolean;
  };
  customSubjects: Array<{ name: string; color: string }>;
}

export interface AppData {
  version: number;
  exportedAt: string;
  classSessions: ClassSession[];
  schoolPeriods: SchoolPeriod[];
  notes: Note[];
  files: BookFile[];
  pomodoroSessions?: PomodoroSession[];
  revisionPlans?: RevisionPlan[];
}
