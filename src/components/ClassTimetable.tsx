import { useState } from 'react';
import type { ClassSession } from '../types';
import { Plus, Edit2, Trash2, Clock, User, MapPin, X, Check, Calendar } from 'lucide-react';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const SUBJECTS = ['Mathematics', 'Science', 'English', 'English Literature', 'Tamil', 'Sinhala', 'History', 'ICT', 'Religion', 'Other'];
const TYPES = ['Theory', 'Paper', 'Physical', 'Other'];

const DARK_BADGE: Record<string, string> = {
  green: 'dark:bg-green-900/30 dark:text-green-300',
  blue: 'dark:bg-blue-900/30 dark:text-blue-300',
  purple: 'dark:bg-purple-900/30 dark:text-purple-300',
  pink: 'dark:bg-pink-900/30 dark:text-pink-300',
  yellow: 'dark:bg-yellow-900/30 dark:text-yellow-300',
  amber: 'dark:bg-amber-900/30 dark:text-amber-300',
  orange: 'dark:bg-orange-900/30 dark:text-orange-300',
  cyan: 'dark:bg-cyan-900/30 dark:text-cyan-300',
  rose: 'dark:bg-rose-900/30 dark:text-rose-300',
  slate: 'dark:bg-slate-700/50 dark:text-slate-300',
};

const DARK_CARD: Record<string, string> = {
  green: 'dark:bg-green-900/15 dark:border-green-700/30',
  blue: 'dark:bg-blue-900/15 dark:border-blue-700/30',
  purple: 'dark:bg-purple-900/15 dark:border-purple-700/30',
  pink: 'dark:bg-pink-900/15 dark:border-pink-700/30',
  yellow: 'dark:bg-yellow-900/15 dark:border-yellow-700/30',
  amber: 'dark:bg-amber-900/15 dark:border-amber-700/30',
  orange: 'dark:bg-orange-900/15 dark:border-orange-700/30',
  cyan: 'dark:bg-cyan-900/15 dark:border-cyan-700/30',
  rose: 'dark:bg-rose-900/15 dark:border-rose-700/30',
  slate: 'dark:bg-slate-700/30 dark:border-slate-600/30',
};

const COLOR_MAP: Record<string, { card: string; badge: string; dot: string }> = {
  green:  { card: 'bg-green-50 border-l-4 border-green-400 ' + (DARK_CARD.green || ''),  badge: 'bg-green-100 text-green-700 ' + (DARK_BADGE.green || ''),  dot: 'bg-green-400' },
  blue:   { card: 'bg-blue-50 border-l-4 border-blue-400 ' + (DARK_CARD.blue || ''),    badge: 'bg-blue-100 text-blue-700 ' + (DARK_BADGE.blue || ''),    dot: 'bg-blue-400' },
  purple: { card: 'bg-purple-50 border-l-4 border-purple-400 ' + (DARK_CARD.purple || ''),badge: 'bg-purple-100 text-purple-700 ' + (DARK_BADGE.purple || ''),dot: 'bg-purple-400' },
  pink:   { card: 'bg-pink-50 border-l-4 border-pink-400 ' + (DARK_CARD.pink || ''),    badge: 'bg-pink-100 text-pink-700 ' + (DARK_BADGE.pink || ''),    dot: 'bg-pink-400' },
  yellow: { card: 'bg-yellow-50 border-l-4 border-yellow-400 ' + (DARK_CARD.yellow || ''),badge: 'bg-yellow-100 text-yellow-700 ' + (DARK_BADGE.yellow || ''),dot: 'bg-yellow-400' },
  amber:  { card: 'bg-amber-50 border-l-4 border-amber-400 ' + (DARK_CARD.amber || ''),  badge: 'bg-amber-100 text-amber-700 ' + (DARK_BADGE.amber || ''),  dot: 'bg-amber-400' },
  orange: { card: 'bg-orange-50 border-l-4 border-orange-400 ' + (DARK_CARD.orange || ''),badge: 'bg-orange-100 text-orange-700 ' + (DARK_BADGE.orange || ''),dot: 'bg-orange-400' },
  cyan:   { card: 'bg-cyan-50 border-l-4 border-cyan-400 ' + (DARK_CARD.cyan || ''),    badge: 'bg-cyan-100 text-cyan-700 ' + (DARK_BADGE.cyan || ''),    dot: 'bg-cyan-400' },
  rose:   { card: 'bg-rose-50 border-l-4 border-rose-400 ' + (DARK_CARD.rose || ''),    badge: 'bg-rose-100 text-rose-700 ' + (DARK_BADGE.rose || ''),    dot: 'bg-rose-400' },
  slate:  { card: 'bg-slate-50 border-l-4 border-slate-400 ' + (DARK_CARD.slate || ''),  badge: 'bg-slate-100 text-slate-700 ' + (DARK_BADGE.slate || ''),  dot: 'bg-slate-400' },
};

const COLORS = Object.keys(COLOR_MAP);

function fmt24to12(t: string) {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, '0')} ${period}`;
}

const defaultSession: Omit<ClassSession, 'id'> = {
  subject: 'Mathematics',
  teacher: '',
  type: 'Theory',
  days: [],
  startTime: '19:00',
  endTime: '20:00',
  location: '',
  color: 'blue',
};

interface Props {
  sessions: ClassSession[];
  setSessions: (s: ClassSession[]) => void;
}

export default function ClassTimetable({ sessions, setSessions }: Props) {
  const [viewMode, setViewMode] = useState<'week' | 'subject'>('week');
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<ClassSession, 'id'>>(defaultSession);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const openAdd = () => {
    setForm(defaultSession);
    setEditId(null);
    setShowForm(true);
  };

  const openEdit = (s: ClassSession) => {
    setForm({ subject: s.subject, teacher: s.teacher, type: s.type, days: s.days, startTime: s.startTime, endTime: s.endTime, location: s.location, color: s.color });
    setEditId(s.id);
    setShowForm(true);
  };

  const save = () => {
    if (editId) {
      setSessions(sessions.map(s => s.id === editId ? { ...form, id: editId } : s));
    } else {
      setSessions([...sessions, { ...form, id: Date.now().toString() }]);
    }
    setShowForm(false);
    setEditId(null);
  };

  const remove = (id: string) => {
    setSessions(sessions.filter(s => s.id !== id));
    setDeleteId(null);
  };

  const toggleDay = (day: string) => {
    setForm(f => ({
      ...f,
      days: f.days.includes(day) ? f.days.filter(d => d !== day) : [...f.days, day],
    }));
  };

  // Group sessions by day
  const byDay: Record<string, ClassSession[]> = {};
  DAYS.forEach(d => { byDay[d] = []; });
  sessions.forEach(s => s.days.forEach(d => { if (byDay[d]) byDay[d].push(s); }));
  DAYS.forEach(d => byDay[d].sort((a, b) => a.startTime.localeCompare(b.startTime)));

  // Group by subject
  const bySubject: Record<string, ClassSession[]> = {};
  sessions.forEach(s => { if (!bySubject[s.subject]) bySubject[s.subject] = []; bySubject[s.subject].push(s); });

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Calendar className="text-blue-500 animate-bounce-gentle" size={26} /> Class Timetable
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">Your tuition & extra class schedule — fully editable</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-slate-100 dark:bg-slate-700 rounded-xl p-1 shadow-inner">
            <button onClick={() => setViewMode('week')} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${viewMode === 'week' ? 'bg-white dark:bg-slate-600 shadow text-slate-800 dark:text-slate-100' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}>Week View</button>
            <button onClick={() => setViewMode('subject')} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${viewMode === 'subject' ? 'bg-white dark:bg-slate-600 shadow text-slate-800 dark:text-slate-100' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}>By Subject</button>
          </div>
          <button onClick={openAdd} className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-md hover:shadow-lg hover:scale-110 transition-all animate-bounce-gentle" style={{ animationDuration: '3s' }}>
            <Plus size={16} /> Add Class
          </button>
        </div>
      </div>

      {/* WEEK VIEW */}
      {viewMode === 'week' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {DAYS.map(day => (
            <div key={day} className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden transition-colors duration-300">
              <div className={`px-4 py-3 font-bold text-sm uppercase tracking-wide ${byDay[day].length > 0 ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white animate-gradient-shift' : 'bg-slate-50 dark:bg-slate-700/50 text-slate-400 dark:text-slate-500'}`} style={byDay[day].length > 0 ? { backgroundSize: '200% 200%' } : undefined}>
                {day}
                <span className="ml-2 text-xs font-normal opacity-75">({byDay[day].length} classes)</span>
              </div>
              <div className="p-3 space-y-2 min-h-[80px]">
                {byDay[day].length === 0 ? (
                  <div className="text-slate-300 dark:text-slate-600 text-xs text-center py-4">Free day 🎉</div>
                ) : byDay[day].map(s => {
                  const c = COLOR_MAP[s.color] || COLOR_MAP.slate;
                  return (
                    <div key={s.id + day} className={`${c.card} rounded-xl p-3 group relative`}>
                      <div className="flex items-start justify-between gap-1">
                        <div>
                          <div className="font-semibold text-slate-800 dark:text-slate-100 text-sm">{s.subject}</div>
                          {s.teacher && <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5"><User size={10}/>{s.teacher}</div>}
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => openEdit(s)} className="p-1 hover:bg-white/70 dark:hover:bg-white/10 rounded-lg"><Edit2 size={12} className="text-slate-500 dark:text-slate-400"/></button>
                          <button onClick={() => setDeleteId(s.id)} className="p-1 hover:bg-white/70 dark:hover:bg-white/10 rounded-lg"><Trash2 size={12} className="text-red-400"/></button>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                        <span className="text-xs text-slate-600 dark:text-slate-300 flex items-center gap-0.5"><Clock size={10}/>{fmt24to12(s.startTime)} – {fmt24to12(s.endTime)}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${c.badge}`}>{s.type}</span>
                        {s.location && <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-0.5"><MapPin size={10}/>{s.location}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* SUBJECT VIEW */}
      {viewMode === 'subject' && (
        <div className="space-y-4">
          {Object.entries(bySubject).map(([subj, subSessions]) => {
            const c = COLOR_MAP[subSessions[0]?.color] || COLOR_MAP.slate;
            return (
              <div key={subj} className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden transition-colors duration-300">
                <div className={`px-5 py-3 font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 border-b border-slate-50 dark:border-slate-700`}>
                  <span className={`w-3 h-3 rounded-full ${c.dot}`}/>
                  {subj}
                  <span className="text-xs font-normal text-slate-400">({subSessions.length} sessions)</span>
                </div>
                <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {subSessions.map(s => (
                    <div key={s.id} className={`${c.card} rounded-xl p-3 group`}>
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">{s.days.join(', ')}</div>
                          <div className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1"><Clock size={12}/>{fmt24to12(s.startTime)} – {fmt24to12(s.endTime)}</div>
                          {s.teacher && <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1"><User size={10}/>{s.teacher}</div>}
                          {s.location && <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1"><MapPin size={10}/>{s.location}</div>}
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                          <button onClick={() => openEdit(s)} className="p-1 hover:bg-white/70 dark:hover:bg-white/10 rounded-lg"><Edit2 size={12} className="text-slate-500 dark:text-slate-400"/></button>
                          <button onClick={() => setDeleteId(s.id)} className="p-1 hover:bg-white/70 dark:hover:bg-white/10 rounded-lg"><Trash2 size={12} className="text-red-400"/></button>
                        </div>
                      </div>
                      <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium mt-2 ${c.badge}`}>{s.type}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ADD/EDIT MODAL */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 dark:bg-black/60 backdrop-blur-sm">
          <div className="glass-modal bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700">
              <h2 className="font-bold text-slate-800 dark:text-slate-100 text-lg">{editId ? 'Edit Class' : 'Add New Class'}</h2>
              <button onClick={() => setShowForm(false)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"><X size={18} className="text-slate-500 dark:text-slate-400"/></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Subject</label>
                <select value={form.subject} onChange={e => setForm(f => ({...f, subject: e.target.value}))} className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 dark:bg-slate-700 dark:text-slate-200">
                  {SUBJECTS.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Teacher</label>
                <input value={form.teacher} onChange={e => setForm(f => ({...f, teacher: e.target.value}))} placeholder="e.g. Thuva Mahendra Sir" className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 dark:bg-slate-700 dark:text-slate-200"/>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Class Type</label>
                <div className="flex flex-wrap gap-2">
                  {TYPES.map(t => (
                    <button key={t} onClick={() => setForm(f => ({...f, type: t as ClassSession['type']}))} className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${form.type === t ? 'bg-blue-500 text-white border-blue-500' : 'border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-blue-300 dark:hover:border-blue-500'}`}>{t}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Days</label>
                <div className="flex flex-wrap gap-1.5">
                  {DAYS.map(d => (
                    <button key={d} onClick={() => toggleDay(d)} className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${form.days.includes(d) ? 'bg-indigo-500 text-white border-indigo-500' : 'border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-indigo-300 dark:hover:border-indigo-500'}`}>{d.slice(0,3)}</button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Start Time</label>
                  <input type="time" value={form.startTime} onChange={e => setForm(f => ({...f, startTime: e.target.value}))} className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 dark:bg-slate-700 dark:text-slate-200"/>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">End Time</label>
                  <input type="time" value={form.endTime} onChange={e => setForm(f => ({...f, endTime: e.target.value}))} className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 dark:bg-slate-700 dark:text-slate-200"/>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Location (optional)</label>
                <input value={form.location || ''} onChange={e => setForm(f => ({...f, location: e.target.value}))} placeholder="e.g. MC, Hall A..." className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 dark:bg-slate-700 dark:text-slate-200"/>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Color</label>
                <div className="flex flex-wrap gap-2">
                  {COLORS.map(c => (
                    <button key={c} onClick={() => setForm(f => ({...f, color: c}))} className={`w-7 h-7 rounded-full ${COLOR_MAP[c].dot} border-2 transition-all ${form.color === c ? 'border-slate-700 scale-110' : 'border-transparent'}`}/>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => setShowForm(false)} className="flex-1 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 rounded-xl py-2.5 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition-all">Cancel</button>
                <button onClick={save} className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl py-2.5 text-sm font-semibold shadow hover:shadow-lg transition-all flex items-center justify-center gap-2"><Check size={15}/>Save Class</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRM */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 dark:bg-black/60 backdrop-blur-sm">
          <div className="glass-modal bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 max-w-sm w-full text-center">
            <div className="w-14 h-14 bg-red-50 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4"><Trash2 className="text-red-400" size={24}/></div>
            <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-2">Delete Class?</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-5">This action cannot be undone.</p>
            <div className="flex gap-2">
              <button onClick={() => setDeleteId(null)} className="flex-1 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 rounded-xl py-2.5 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-700">Cancel</button>
              <button onClick={() => remove(deleteId)} className="flex-1 bg-red-500 text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-red-600">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
