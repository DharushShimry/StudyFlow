import type { ClassSession, SchoolPeriod, Note, BookFile, RevisionPlan, Page } from '../types';
import { Calendar, School, BookOpen, FolderOpen, Code2, Sparkles, Target, Clock, TrendingUp, ArrowRight, Calculator } from 'lucide-react';
import ProfileCard from './ProfileCard';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function fmt24to12(t: string) {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, '0')} ${period}`;
}

function fmtShortDate(d: string) {
  const date = new Date(d + 'T00:00:00');
  if (isNaN(date.getTime())) return d;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const QUICK_ACTIONS: { label: string; icon: React.ReactNode; page: Page; color: string }[] = [
  { label: 'Class Timetable', icon: <Calendar size={20}/>, page: 'class-timetable', color: 'from-blue-500 to-indigo-600' },
  { label: 'School Timetable', icon: <School size={20}/>, page: 'school-timetable', color: 'from-indigo-500 to-violet-600' },
  { label: 'My Notes', icon: <BookOpen size={20}/>, page: 'notes', color: 'from-amber-400 to-orange-500' },
  { label: 'Books & Files', icon: <FolderOpen size={20}/>, page: 'books', color: 'from-green-500 to-emerald-600' },
  { label: 'Code Runner', icon: <Code2 size={20}/>, page: 'code-runner', color: 'from-pink-500 to-rose-600' },
  { label: 'AI Tools', icon: <Sparkles size={20}/>, page: 'ai-tools', color: 'from-purple-500 to-violet-600' },
  { label: 'Revision Planner', icon: <Target size={20}/>, page: 'revision-planner', color: 'from-teal-500 to-cyan-600' },
  { label: 'Study Tools', icon: <Calculator size={20}/>, page: 'tools', color: 'from-cyan-500 to-teal-600' },
];

interface Props {
  classSessions: ClassSession[];
  schoolPeriods: SchoolPeriod[];
  notes: Note[];
  files: BookFile[];
  revisionPlans: RevisionPlan[];
  setPage: (p: Page) => void;
}

export default function Dashboard({ classSessions, schoolPeriods, notes, files, revisionPlans, setPage }: Props) {
  const now = new Date();
  const todayName = DAYS[now.getDay()];
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  // Today's class sessions
  const todayClasses = classSessions.filter(s => s.days.includes(todayName))
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  // Today's school periods
  const todaySchool = schoolPeriods.filter(p => p.day === todayName)
    .sort((a, b) => a.period - b.period);

  // Stats
  const totalClasses = classSessions.reduce((acc, s) => acc + s.days.length, 0);
  const subjects = [...new Set(classSessions.map(s => s.subject))].length;

  // Revision due: overdue or due today, not yet completed
  const todayStr = now.toISOString().split('T')[0];
  const dueRevision = revisionPlans
    .filter(p => !p.completed && p.dueDate <= todayStr)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  const SUBJECT_COLOR_KEY: Record<string, string> = {
    'Mathematics': 'blue', 'Science': 'green', 'English': 'pink', 'English Literature': 'purple',
    'Tamil': 'orange', 'Sinhala': 'yellow', 'History': 'amber', 'ICT': 'cyan', 'Religion': 'rose',
  };

  const PRIORITY_STYLES: Record<string, string> = {
    High: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    Medium: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    Low: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  };

  const STAT_COLORS: Record<string, { card: string; dot: string }> = {
    green:  { card: 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-700/30',  dot: 'bg-green-400' },
    blue:   { card: 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-700/30',    dot: 'bg-blue-400' },
    purple: { card: 'bg-purple-50 border-purple-200 dark:bg-purple-900/20 dark:border-purple-700/30',dot: 'bg-purple-400' },
    pink:   { card: 'bg-pink-50 border-pink-200 dark:bg-pink-900/20 dark:border-pink-700/30',    dot: 'bg-pink-400' },
    yellow: { card: 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-700/30',dot: 'bg-yellow-400' },
    amber:  { card: 'bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-700/30',  dot: 'bg-amber-400' },
    orange: { card: 'bg-orange-50 border-orange-200 dark:bg-orange-900/20 dark:border-orange-700/30',dot: 'bg-orange-400' },
    cyan:   { card: 'bg-cyan-50 border-cyan-200 dark:bg-cyan-900/20 dark:border-cyan-700/30',    dot: 'bg-cyan-400' },
    rose:   { card: 'bg-rose-50 border-rose-200 dark:bg-rose-900/20 dark:border-rose-700/30',    dot: 'bg-rose-400' },
    slate:  { card: 'bg-slate-50 border-slate-200 dark:bg-slate-700/30 dark:border-slate-600/30',  dot: 'bg-slate-400' },
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Hero */}
      <div className="hero-gradient animate-gradient-shift rounded-3xl p-6 md:p-8 mb-6 text-white shadow-xl relative overflow-hidden">
        {/* Floating decorative elements */}
        <div className="absolute inset-0 opacity-[0.12]">
          <div className="absolute top-4 left-[15%] w-16 h-16 rounded-full bg-white animate-float-slow"/>
          <div className="absolute top-8 right-[20%] w-10 h-10 rounded-full bg-white animate-float-delayed"/>
          <div className="absolute bottom-8 left-[30%] w-8 h-8 rounded-full bg-white animate-float" style={{ animationDuration: '7s' }}/>
          <div className="absolute top-1/2 right-[10%] w-6 h-6 rounded-full bg-white animate-float" style={{ animationDuration: '5s' }}/>
          <div className="absolute bottom-12 right-[35%] w-12 h-12 rounded-full bg-white animate-float-slow" style={{ animationDelay: '1s' }}/>
        </div>
        {/* Subtle dots pattern */}
        <div className="absolute inset-0 opacity-[0.06]" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '24px 24px' }}/>
        <div className="relative">
          <div className="flex items-center gap-2 text-sm font-medium opacity-80 mb-2">
            <span className="w-2 h-2 rounded-full bg-green-300 animate-pulse"/>
            {dateStr}
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-2">
            Welcome back!{' '}
            <span className="inline-block animate-bounce-gentle" style={{ animationDelay: '0.5s' }}>👋</span>
          </h1>
          <div className="mt-5 flex flex-wrap gap-3">
            <div className="bg-white/15 rounded-2xl px-4 py-2.5 flex items-center gap-2 backdrop-blur-sm hover:bg-white/25 transition-all card-glow">
              <Clock size={16} className="opacity-80"/>
              <span className="font-mono font-bold">{timeStr}</span>
            </div>
            <div className="bg-white/15 rounded-2xl px-4 py-2.5 flex items-center gap-2 backdrop-blur-sm hover:bg-white/25 transition-all card-glow">
              <Calendar size={16} className="opacity-80"/>
              <span className="font-semibold animate-count-up">{todayClasses.length} classes today</span>
            </div>
            <div className="bg-white/15 rounded-2xl px-4 py-2.5 flex items-center gap-2 backdrop-blur-sm hover:bg-white/25 transition-all card-glow">
              <School size={16} className="opacity-80"/>
              <span className="font-semibold">{todaySchool.length} school periods</span>
            </div>
          </div>
        </div>
      </div>

      {/* Personal Profile */}
      <ProfileCard setPage={setPage}/>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Class Sessions/Week', value: totalClasses, icon: <Calendar size={18}/>, color: 'blue', bg: 'bg-gradient-to-br from-blue-400 to-indigo-500', text: 'text-white' },
          { label: 'Subjects', value: subjects, icon: <TrendingUp size={18}/>, color: 'green', bg: 'bg-gradient-to-br from-green-400 to-emerald-500', text: 'text-white' },
          { label: 'Notes Saved', value: notes.length, icon: <BookOpen size={18}/>, color: 'amber', bg: 'bg-gradient-to-br from-amber-400 to-orange-500', text: 'text-white' },
          { label: 'Files Uploaded', value: files.length, icon: <FolderOpen size={18}/>, color: 'purple', bg: 'bg-gradient-to-br from-purple-400 to-violet-500', text: 'text-white' },
        ].map((stat, idx) => (
          <div key={stat.label} className="card-glow bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-4 flex items-center gap-3 transition-all duration-300" style={{ animationDelay: `${idx * 0.1}s` }}>
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center shadow-lg ${stat.bg} ${stat.text} animate-bounce-gentle`} style={{ animationDelay: `${idx * 0.2 + 1}s` }}>
              {stat.icon}
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">{stat.value}</div>
              <div className="text-xs text-slate-400 dark:text-slate-500">{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="mb-6">
        <h2 className="font-bold text-slate-800 dark:text-slate-100 mb-3 flex items-center gap-2">
          <span className="inline-block animate-sparkle">⚡</span> Quick Access
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {QUICK_ACTIONS.map((action, idx) => (
            <button
              key={action.page}
              onClick={() => setPage(action.page)}
              className={`bg-gradient-to-br ${action.color} text-white rounded-2xl p-4 flex flex-col items-center gap-2 shadow-sm hover:shadow-xl hover:scale-110 transition-all duration-300 animate-bounce-gentle`}
              style={{ animationDelay: `${idx * 0.15}s`, animationDuration: '3s' }}
            >
              <span className="animate-bounce-gentle" style={{ animationDelay: `${idx * 0.2}s` }}>{action.icon}</span>
              <span className="text-xs font-semibold text-center leading-tight">{action.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Revision Due */}
      {revisionPlans.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2"><Target size={18} className="text-teal-500"/> Revision Due</h2>
            <button onClick={() => setPage('revision-planner')} className="text-xs text-teal-500 hover:text-teal-700 font-medium flex items-center gap-1 hover:gap-1.5 transition-all">Open planner <ArrowRight size={12}/></button>
          </div>
          {dueRevision.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm p-4 text-center text-slate-400 dark:text-slate-500 text-sm card-glow">
              <div className="text-2xl mb-1 animate-bounce-gentle">🎉</div>
              All caught up — nothing due today!
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {dueRevision.map(p => {
                const sc = STAT_COLORS[SUBJECT_COLOR_KEY[p.subject] || 'slate'] || STAT_COLORS.slate;
                const isOverdue = p.dueDate < todayStr;
                return (
                  <div key={p.id} className={`${sc.card} border rounded-xl p-3 card-glow ${isOverdue ? 'ring-2! ring-red-300! dark:ring-red-800/50!' : ''}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-slate-800 dark:text-slate-100 text-sm truncate">{p.topic}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{p.subject}</div>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${PRIORITY_STYLES[p.priority] || PRIORITY_STYLES.Medium}`}>{p.priority}</span>
                    </div>
                    <div className={`text-xs mt-2 font-medium ${isOverdue ? 'text-red-500 dark:text-red-400' : 'text-slate-400 dark:text-slate-500'}`}>
                      {isOverdue ? `⏰ Overdue ${fmtShortDate(p.dueDate)}` : '📅 Due today'}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Today's Schedule */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* Today's Tuition Classes */}
        <div className="card-glow bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden transition-all duration-300">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-700 bg-gradient-to-r from-blue-50/50 to-indigo-50/50 dark:from-blue-900/10 dark:to-indigo-900/10">
            <h2 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2"><Calendar size={18} className="text-blue-500"/> Today's Classes</h2>
            <button onClick={() => setPage('class-timetable')} className="text-xs text-blue-500 hover:text-blue-700 font-medium flex items-center gap-1 hover:gap-1.5 transition-all">View all <ArrowRight size={12}/></button>
          </div>
          <div className="p-4 space-y-2">
            {todayClasses.length === 0 ? (
              <div className="text-center py-6 text-slate-400 dark:text-slate-500 text-sm">
                <div className="text-2xl mb-1 animate-bounce-gentle">🎉</div>
                No tuition classes today!
              </div>
            ) : todayClasses.map(s => {
              const c = STAT_COLORS[s.color] || STAT_COLORS.slate;
              return (
                <div key={s.id} className={`${c.card} border rounded-xl p-3 flex items-center gap-3 hover:shadow-md transition-all card-glow`}>
                  <div className={`w-3 h-3 rounded-full flex-shrink-0 ${c.dot} glow-dot`}/>
                  <div className="flex-1">
                    <div className="font-semibold text-slate-800 dark:text-slate-100 text-sm">{s.subject}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{s.teacher || s.location || s.type}</div>
                  </div>
                  <div className="text-xs text-slate-600 dark:text-slate-300 font-mono text-right">
                    <div>{fmt24to12(s.startTime)}</div>
                    <div className="text-slate-400 dark:text-slate-500">{fmt24to12(s.endTime)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Today's School Periods */}
        <div className="card-glow bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden transition-all duration-300">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-700 bg-gradient-to-r from-indigo-50/50 to-purple-50/50 dark:from-indigo-900/10 dark:to-purple-900/10">
            <h2 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2"><School size={18} className="text-indigo-500"/> School Periods</h2>
            <button onClick={() => setPage('school-timetable')} className="text-xs text-indigo-500 hover:text-indigo-700 font-medium flex items-center gap-1 hover:gap-1.5 transition-all">View all <ArrowRight size={12}/></button>
          </div>
          <div className="p-4 space-y-2 max-h-80 overflow-y-auto">
            {todaySchool.length === 0 ? (
              <div className="text-center py-6 text-slate-400 dark:text-slate-500 text-sm">
                <div className="text-2xl mb-1 animate-bounce-gentle">🏖️</div>
                No school today!
              </div>
            ) : todaySchool.map(p => {
              const c = STAT_COLORS[p.color] || STAT_COLORS.slate;
              return (
                <div key={p.id} className={`${c.card} border rounded-xl p-3 flex items-center gap-3 hover:shadow-md transition-all card-glow`}>
                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 shadow-sm ${c.dot.replace('bg-', 'bg-').replace('400', '500')} text-white`}>P{p.period}</div>
                  <div className="flex-1">
                    <div className="font-semibold text-slate-800 dark:text-slate-100 text-sm">{p.subject}{p.subjectType && ` (${p.subjectType})`}</div>
                  </div>
                  <div className="text-xs text-slate-600 dark:text-slate-300 font-mono text-right">
                    <div>{p.startTime}</div>
                    <div className="text-slate-400 dark:text-slate-500">{p.endTime}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Recent Notes */}
      {notes.length > 0 && (
        <div className="mt-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2"><BookOpen size={18} className="text-amber-500"/> Recent Notes</h2>
            <button onClick={() => setPage('notes')} className="text-xs text-amber-500 hover:text-amber-700 font-medium flex items-center gap-1 hover:gap-1.5 transition-all">View all <ArrowRight size={12}/></button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {notes.slice(-3).reverse().map((n, idx) => {
              const c = STAT_COLORS[n.color] || STAT_COLORS.yellow;
              return (
                <div key={n.id} className={`${c.card} rounded-2xl p-4 card-glow`} style={{ animationDelay: `${idx * 0.1}s` }}>
                  <div className="font-semibold text-slate-800 dark:text-slate-100 text-sm mb-1">{n.title || 'Untitled'}</div>
                  <div className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2">{n.content}</div>
                  <div className="text-xs text-slate-400 dark:text-slate-500 mt-2 flex items-center gap-1">
                    <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`}/>
                    {n.subject} · {new Date(n.updatedAt).toLocaleDateString()}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
