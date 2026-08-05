import type { ClassSession, SchoolPeriod } from '../types';
import { Calendar as CalendarIcon, Clock, User, MapPin } from 'lucide-react';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const SHORT_DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

const COLOR_BG: Record<string, string> = {
  green: 'bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700',
  blue: 'bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700',
  purple: 'bg-purple-100 dark:bg-purple-900/30 border-purple-300 dark:border-purple-700',
  pink: 'bg-pink-100 dark:bg-pink-900/30 border-pink-300 dark:border-pink-700',
  yellow: 'bg-yellow-100 dark:bg-yellow-900/30 border-yellow-300 dark:border-yellow-700',
  amber: 'bg-amber-100 dark:bg-amber-900/30 border-amber-300 dark:border-amber-700',
  orange: 'bg-orange-100 dark:bg-orange-900/30 border-orange-300 dark:border-orange-700',
  cyan: 'bg-cyan-100 dark:bg-cyan-900/30 border-cyan-300 dark:border-cyan-700',
  rose: 'bg-rose-100 dark:bg-rose-900/30 border-rose-300 dark:border-rose-700',
  slate: 'bg-slate-100 dark:bg-slate-700/30 border-slate-300 dark:border-slate-600',
};

const TEXT_COLOR: Record<string, string> = {
  green: 'text-green-700 dark:text-green-300',
  blue: 'text-blue-700 dark:text-blue-300',
  purple: 'text-purple-700 dark:text-purple-300',
  pink: 'text-pink-700 dark:text-pink-300',
  yellow: 'text-yellow-700 dark:text-yellow-300',
  amber: 'text-amber-700 dark:text-amber-300',
  orange: 'text-orange-700 dark:text-orange-300',
  cyan: 'text-cyan-700 dark:text-cyan-300',
  rose: 'text-rose-700 dark:text-rose-300',
  slate: 'text-slate-700 dark:text-slate-300',
};

function fmt24to12(t: string) {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  if (isNaN(h)) return t; // already in 12-hour format
  const period = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, '0')} ${period}`;
}

interface Props {
  classSessions: ClassSession[];
  schoolPeriods: SchoolPeriod[];
}

export default function CalendarView({ classSessions, schoolPeriods }: Props) {
  // Get current week dates
  const now = new Date();
  const currentDay = now.getDay(); // 0=Sun
  const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay;
  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset);

  const weekDates = DAYS.map((_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });

  // Build schedule data per day
  const scheduleByDay = DAYS.map((day, di) => {
    const classes = classSessions
      .filter(s => s.days.includes(day))
      .sort((a, b) => a.startTime.localeCompare(b.startTime));

    const periods = schoolPeriods
      .filter(p => p.day === day)
      .sort((a, b) => a.period - b.period);

    return { day, date: weekDates[di], classes, periods };
  });

  const totalClasses = classSessions.reduce((acc, s) => acc + s.days.length, 0);
  const totalPeriods = schoolPeriods.length;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <CalendarIcon className="text-violet-500 animate-bounce-gentle" size={26} /> Combined Calendar
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
            Week of {monday.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
            {' — '}
            {weekDates[6].toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 font-medium bg-blue-50 dark:bg-blue-900/30 px-3 py-1.5 rounded-full">
            <span className="w-2 h-2 rounded-full bg-blue-500"/> {totalClasses} classes
          </span>
          <span className="flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400 font-medium bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1.5 rounded-full">
            <span className="w-2 h-2 rounded-full bg-indigo-500"/> {totalPeriods} periods
          </span>
        </div>
      </div>

      {/* Week Grid */}
      <div className="overflow-x-auto rounded-2xl">
        <div className="inline-flex gap-3 min-w-full">
          {scheduleByDay.map(({ day, date, classes, periods }) => {
            const isToday = date.toDateString() === now.toDateString();
            const hasItems = classes.length > 0 || periods.length > 0;

            return (
              <div key={day} className="flex-shrink-0 w-64">
                {/* Day header */}
                <div className={`rounded-xl px-4 py-3 mb-2 text-center transition-all duration-300 ${
                  isToday
                    ? 'btn-accent text-white shadow-lg animate-gradient-shift card-glow'
                    : hasItems
                      ? 'bg-gradient-to-br from-slate-100 to-slate-50 dark:from-slate-700 dark:to-slate-600 text-slate-700 dark:text-slate-300'
                      : 'bg-slate-50 dark:bg-slate-800/50 text-slate-400 dark:text-slate-500'
                }`} style={isToday ? { backgroundSize: '200% 200%' } : undefined}>
                  <div className="font-bold text-sm tracking-wider">{SHORT_DAYS[DAYS.indexOf(day)]}</div>
                  <div className="text-xs opacity-80 mt-0.5">{date.getDate()}</div>
                </div>

                {/* Content */}
                <div className="space-y-2 min-h-[200px]">
                  {/* School periods */}
                  {periods.map(p => {
                    const bg = COLOR_BG[p.color] || COLOR_BG.slate;
                    const text = TEXT_COLOR[p.color] || TEXT_COLOR.slate;
                    return (
                      <div key={p.id} className={`${bg} border rounded-xl p-2.5 group`}>
                        <div className="flex items-start justify-between gap-1">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 flex-shrink-0"/>
                              <span className={`font-semibold text-xs ${text} truncate`}>{p.subject}</span>
                            </div>
                            {p.subjectType && (
                              <div className="text-xs text-slate-500 dark:text-slate-400 ml-3 truncate">{p.subjectType}</div>
                            )}
                          </div>
                          <span className="text-xs text-slate-400 dark:text-slate-500 font-medium flex-shrink-0">P{p.period}</span>
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 ml-3 flex items-center gap-1">
                          <Clock size={9}/>{p.startTime} – {p.endTime}
                        </div>
                      </div>
                    );
                  })}

                  {/* Tuition classes */}
                  {classes.map(s => {
                    const bg = COLOR_BG[s.color] || COLOR_BG.slate;
                    const text = TEXT_COLOR[s.color] || TEXT_COLOR.slate;
                    return (
                      <div key={s.id} className={`${bg} border rounded-xl p-2.5 group`}>
                        <div className="flex items-start justify-between gap-1">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0"/>
                              <span className={`font-semibold text-xs ${text} truncate`}>{s.subject}</span>
                            </div>
                            {s.teacher && (
                              <div className="text-xs text-slate-500 dark:text-slate-400 ml-3 flex items-center gap-1 mt-0.5">
                                <User size={9}/>{s.teacher}
                              </div>
                            )}
                          </div>
                          <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${bg} ${text}`}>
                            {s.type}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 ml-3 flex items-center gap-2 flex-wrap">
                          <span className="flex items-center gap-1"><Clock size={9}/>{fmt24to12(s.startTime)} – {fmt24to12(s.endTime)}</span>
                          {s.location && <span className="flex items-center gap-1"><MapPin size={9}/>{s.location}</span>}
                        </div>
                      </div>
                    );
                  })}

                  {!hasItems && (
                    <div className="text-center py-8 text-slate-300 dark:text-slate-600 text-xs">
                      No activities
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-6 flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 px-5 py-3 transition-colors duration-300">
        <span className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300">
          <CalendarIcon size={14}/> Legend
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-indigo-400"/> School Period
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-400"/> Tuition Class
        </span>
        <span className="text-slate-300 dark:text-slate-600">|</span>
        <span className="text-slate-400 dark:text-slate-500">
          Showing all {totalClasses} class sessions and {totalPeriods} school periods
        </span>
      </div>
    </div>
  );
}
