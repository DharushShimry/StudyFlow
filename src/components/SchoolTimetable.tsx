import { useState } from 'react';
import type { SchoolPeriod } from '../types';
import { Plus, Edit2, Trash2, Clock, X, Check, School } from 'lucide-react';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const SHORT_DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
const SUBJECTS = ['Mathematics', 'Science', 'English', 'English Literature', 'Tamil', 'Sinhala', 'History', 'ICT', 'Religion', 'Other'];

const DARK_SCHOOL_CARD: Record<string, string> = {
  blue: 'dark:bg-blue-900/15 dark:border-blue-700/30',
  green: 'dark:bg-green-900/15 dark:border-green-700/30',
  pink: 'dark:bg-pink-900/15 dark:border-pink-700/30',
  purple: 'dark:bg-purple-900/15 dark:border-purple-700/30',
  orange: 'dark:bg-orange-900/15 dark:border-orange-700/30',
  yellow: 'dark:bg-yellow-900/15 dark:border-yellow-700/30',
  amber: 'dark:bg-amber-900/15 dark:border-amber-700/30',
  cyan: 'dark:bg-cyan-900/15 dark:border-cyan-700/30',
  rose: 'dark:bg-rose-900/15 dark:border-rose-700/30',
  slate: 'dark:bg-slate-700/30 dark:border-slate-600/30',
};
const DARK_SCHOOL_HEADER: Record<string, string> = {
  blue: 'dark:text-blue-300', green: 'dark:text-green-300', pink: 'dark:text-pink-300',
  purple: 'dark:text-purple-300', orange: 'dark:text-orange-300', yellow: 'dark:text-yellow-300',
  amber: 'dark:text-amber-300', cyan: 'dark:text-cyan-300', rose: 'dark:text-rose-300', slate: 'dark:text-slate-300',
};

const COLOR_MAP: Record<string, { card: string; header: string; dot: string }> = {
  blue:   { card: 'bg-blue-50 border border-blue-200 ' + (DARK_SCHOOL_CARD.blue || ''),   header: 'text-blue-700 ' + (DARK_SCHOOL_HEADER.blue || ''),   dot: 'bg-blue-400' },
  green:  { card: 'bg-green-50 border border-green-200 ' + (DARK_SCHOOL_CARD.green || ''), header: 'text-green-700 ' + (DARK_SCHOOL_HEADER.green || ''),  dot: 'bg-green-400' },
  pink:   { card: 'bg-pink-50 border border-pink-200 ' + (DARK_SCHOOL_CARD.pink || ''),   header: 'text-pink-700 ' + (DARK_SCHOOL_HEADER.pink || ''),   dot: 'bg-pink-400' },
  purple: { card: 'bg-purple-50 border border-purple-200 ' + (DARK_SCHOOL_CARD.purple || ''), header: 'text-purple-700 ' + (DARK_SCHOOL_HEADER.purple || ''), dot: 'bg-purple-400' },
  orange: { card: 'bg-orange-50 border border-orange-200 ' + (DARK_SCHOOL_CARD.orange || ''), header: 'text-orange-700 ' + (DARK_SCHOOL_HEADER.orange || ''), dot: 'bg-orange-400' },
  yellow: { card: 'bg-yellow-50 border border-yellow-200 ' + (DARK_SCHOOL_CARD.yellow || ''), header: 'text-yellow-700 ' + (DARK_SCHOOL_HEADER.yellow || ''), dot: 'bg-yellow-400' },
  amber:  { card: 'bg-amber-50 border border-amber-200 ' + (DARK_SCHOOL_CARD.amber || ''),  header: 'text-amber-700 ' + (DARK_SCHOOL_HEADER.amber || ''),  dot: 'bg-amber-400' },
  cyan:   { card: 'bg-cyan-50 border border-cyan-200 ' + (DARK_SCHOOL_CARD.cyan || ''),   header: 'text-cyan-700 ' + (DARK_SCHOOL_HEADER.cyan || ''),   dot: 'bg-cyan-400' },
  rose:   { card: 'bg-rose-50 border border-rose-200 ' + (DARK_SCHOOL_CARD.rose || ''),   header: 'text-rose-700 ' + (DARK_SCHOOL_HEADER.rose || ''),   dot: 'bg-rose-400' },
  slate:  { card: 'bg-slate-50 border border-slate-200 ' + (DARK_SCHOOL_CARD.slate || ''), header: 'text-slate-700 ' + (DARK_SCHOOL_HEADER.slate || ''),  dot: 'bg-slate-400' },
};

const COLORS = Object.keys(COLOR_MAP);

const SUBJECT_DEFAULT_COLORS: Record<string, string> = {
  'Mathematics': 'blue', 'Science': 'green', 'English': 'pink', 'English Literature': 'purple',
  'Tamil': 'orange', 'Sinhala': 'yellow', 'History': 'amber', 'ICT': 'cyan', 'Religion': 'rose', 'Other': 'slate',
};

const defaultPeriod: Omit<SchoolPeriod, 'id'> = {
  subject: 'Mathematics',
  subjectType: '',
  startTime: '7:45 AM',
  endTime: '8:25 AM',
  day: 'Monday',
  period: 1,
  color: 'blue',
};

interface Props {
  periods: SchoolPeriod[];
  setPeriods: (p: SchoolPeriod[]) => void;
}

export default function SchoolTimetable({ periods, setPeriods }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<SchoolPeriod, 'id'>>(defaultPeriod);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const openAdd = () => {
    setForm(defaultPeriod);
    setEditId(null);
    setShowForm(true);
  };

  const openEdit = (p: SchoolPeriod) => {
    setForm({ subject: p.subject, subjectType: p.subjectType, startTime: p.startTime, endTime: p.endTime, day: p.day, period: p.period, color: p.color });
    setEditId(p.id);
    setShowForm(true);
  };

  const save = () => {
    if (editId) {
      setPeriods(periods.map(p => p.id === editId ? { ...form, id: editId } : p));
    } else {
      setPeriods([...periods, { ...form, id: Date.now().toString() }]);
    }
    setShowForm(false);
    setEditId(null);
  };

  const remove = (id: string) => {
    setPeriods(periods.filter(p => p.id !== id));
    setDeleteId(null);
  };

  // Group by day
  const byDay: Record<string, SchoolPeriod[]> = {};
  DAYS.forEach(d => { byDay[d] = []; });
  periods.forEach(p => { if (byDay[p.day]) byDay[p.day].push(p); });
  DAYS.forEach(d => byDay[d].sort((a, b) => a.period - b.period));

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <School className="text-indigo-500 animate-bounce-gentle" size={26} /> School Timetable
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">Your daily school schedule — fully editable</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-violet-600 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-md hover:shadow-lg hover:scale-110 transition-all animate-bounce-gentle" style={{ animationDuration: '3s' }}>
          <Plus size={16} /> Add Period
        </button>
      </div>

      {/* Grid */}
      <div className="overflow-x-auto rounded-2xl">
        <div className="inline-flex gap-3 min-w-full pb-2">
          {DAYS.map((day, di) => (
            <div key={day} className="flex-shrink-0 w-48">
              {/* Day header */}
              <div className={`rounded-xl px-3 py-2.5 text-center mb-2 font-bold text-sm tracking-wider ${byDay[day].length > 0 ? 'bg-gradient-to-b from-blue-500 to-indigo-600 text-white shadow-sm animate-gradient-shift' : 'bg-slate-100 dark:bg-slate-700/50 text-slate-400 dark:text-slate-500'}`} style={byDay[day].length > 0 ? { backgroundSize: '200% 200%' } : undefined}>
                <div>{SHORT_DAYS[di]}</div>
                <div className="text-xs font-normal opacity-80">{byDay[day].length} period{byDay[day].length !== 1 ? 's' : ''}</div>
              </div>

              <div className="space-y-1.5">
                {byDay[day].length === 0 ? (
                  <div className="bg-slate-50 dark:bg-slate-700/20 border border-dashed border-slate-200 dark:border-slate-600 rounded-xl py-8 text-center text-slate-300 dark:text-slate-600 text-xs">Free</div>
                ) : byDay[day].map(p => {
                  const c = COLOR_MAP[p.color] || COLOR_MAP.slate;
                  return (
                    <div key={p.id} className={`${c.card} rounded-xl p-2.5 group relative`}>
                      <div className="flex items-start justify-between gap-1">
                        <div className="flex-1 min-w-0">
                          <div className={`font-semibold text-xs ${c.header} truncate`}>{p.subject}</div>
                          {p.subjectType &&                          <div className="text-xs text-slate-400 dark:text-slate-500 truncate">{p.subjectType}</div>}
                        </div>
                        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                          <button onClick={() => openEdit(p)} className="p-0.5 hover:bg-white/80 dark:hover:bg-white/10 rounded"><Edit2 size={10} className="text-slate-500 dark:text-slate-400"/></button>
                          <button onClick={() => setDeleteId(p.id)} className="p-0.5 hover:bg-white/80 dark:hover:bg-white/10 rounded"><Trash2 size={10} className="text-red-400"/></button>
                        </div>
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-0.5">
                        <Clock size={9}/>{p.startTime}
                      </div>
                      <div className="text-xs text-slate-400 dark:text-slate-500">{p.endTime}</div>
                      <div className="absolute bottom-1.5 right-1.5 text-xs text-slate-300 dark:text-slate-600 font-medium">P{p.period}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ADD/EDIT MODAL */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 dark:bg-black/60 backdrop-blur-sm">
          <div className="glass-modal bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700">
              <h2 className="font-bold text-slate-800 dark:text-slate-100 text-lg">{editId ? 'Edit Period' : 'Add New Period'}</h2>
              <button onClick={() => setShowForm(false)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"><X size={18} className="text-slate-500 dark:text-slate-400"/></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Subject</label>
                <select value={form.subject} onChange={e => {
                  const s = e.target.value;
                  setForm(f => ({...f, subject: s, color: SUBJECT_DEFAULT_COLORS[s] || 'slate'}));
                }} className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 dark:bg-slate-700 dark:text-slate-200">
                  {SUBJECTS.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Sub-type (e.g. Literature, Library)</label>
                <input value={form.subjectType || ''} onChange={e => setForm(f => ({...f, subjectType: e.target.value}))} placeholder="optional" className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 dark:bg-slate-700 dark:text-slate-200"/>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Day</label>
                <select value={form.day} onChange={e => setForm(f => ({...f, day: e.target.value}))} className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 dark:bg-slate-700 dark:text-slate-200">
                  {DAYS.map(d => <option key={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Period Number</label>
                <input type="number" min={1} max={10} value={form.period} onChange={e => setForm(f => ({...f, period: Math.max(1, Number(e.target.value) || 1)}))} className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 dark:bg-slate-700 dark:text-slate-200"/>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Start Time</label>
                  <input value={form.startTime} onChange={e => setForm(f => ({...f, startTime: e.target.value}))} placeholder="e.g. 7:45 AM" className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 dark:bg-slate-700 dark:text-slate-200"/>
                </div>
                <div>                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">End Time</label>
                  <input value={form.endTime} onChange={e => setForm(f => ({...f, endTime: e.target.value}))} placeholder="e.g. 8:25 AM" className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 dark:bg-slate-700 dark:text-slate-200"/>
                </div>
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
                <button onClick={() => setShowForm(false)} className="flex-1 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 rounded-xl py-2.5 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-700">Cancel</button>
                <button onClick={save} className="flex-1 bg-gradient-to-r from-indigo-500 to-violet-600 text-white rounded-xl py-2.5 text-sm font-semibold shadow hover:shadow-lg flex items-center justify-center gap-2"><Check size={15}/>Save Period</button>
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
            <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-2">Delete Period?</h3>
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
