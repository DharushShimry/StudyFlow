import { useState } from 'react';
import type { RevisionPlan } from '../types';
import {
  Target, Plus, Edit2, Trash2, X, Check, Search, Flag, Calendar, AlertCircle,
  CheckCircle2, Circle, Flame, ListTodo, TrendingUp
} from 'lucide-react';

const SUBJECTS = ['Mathematics', 'Science', 'English', 'English Literature', 'Tamil', 'Sinhala', 'History', 'ICT', 'Religion', 'General'];
const PRIORITIES = ['High', 'Medium', 'Low'] as const;
type Priority = (typeof PRIORITIES)[number];

const SUBJECT_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  'Mathematics': { bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-700 dark:text-blue-300', dot: 'bg-blue-500' },
  'Science': { bg: 'bg-green-50 dark:bg-green-900/20', text: 'text-green-700 dark:text-green-300', dot: 'bg-green-500' },
  'English': { bg: 'bg-pink-50 dark:bg-pink-900/20', text: 'text-pink-700 dark:text-pink-300', dot: 'bg-pink-500' },
  'English Literature': { bg: 'bg-purple-50 dark:bg-purple-900/20', text: 'text-purple-700 dark:text-purple-300', dot: 'bg-purple-500' },
  'Tamil': { bg: 'bg-orange-50 dark:bg-orange-900/20', text: 'text-orange-700 dark:text-orange-300', dot: 'bg-orange-500' },
  'Sinhala': { bg: 'bg-yellow-50 dark:bg-yellow-900/20', text: 'text-yellow-700 dark:text-yellow-300', dot: 'bg-yellow-500' },
  'History': { bg: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-700 dark:text-amber-300', dot: 'bg-amber-500' },
  'ICT': { bg: 'bg-cyan-50 dark:bg-cyan-900/20', text: 'text-cyan-700 dark:text-cyan-300', dot: 'bg-cyan-500' },
  'Religion': { bg: 'bg-rose-50 dark:bg-rose-900/20', text: 'text-rose-700 dark:text-rose-300', dot: 'bg-rose-500' },
  'General': { bg: 'bg-slate-50 dark:bg-slate-800/40', text: 'text-slate-700 dark:text-slate-300', dot: 'bg-slate-500' },
};

const PRIORITY_STYLES: Record<Priority, { badge: string; flag: string; label: string }> = {
  High: { badge: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300', flag: 'text-red-500', label: 'High' },
  Medium: { badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300', flag: 'text-amber-500', label: 'Medium' },
  Low: { badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300', flag: 'text-emerald-500', label: 'Low' },
};

type Filter = 'all' | 'pending' | 'done' | 'overdue';

const defaultPlan: Omit<RevisionPlan, 'id' | 'createdAt' | 'updatedAt'> = {
  subject: 'Mathematics',
  topic: '',
  dueDate: new Date().toISOString().split('T')[0],
  priority: 'Medium',
  completed: false,
  notes: '',
};

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

function fmtDate(d: string) {
  const date = new Date(d + 'T00:00:00');
  if (isNaN(date.getTime())) return d;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

interface Props {
  plans: RevisionPlan[];
  setPlans: (p: RevisionPlan[] | ((prev: RevisionPlan[]) => RevisionPlan[])) => void;
  addToast?: (type: 'success' | 'error' | 'info', message: string) => void;
}

export default function RevisionPlanner({ plans, setPlans, addToast }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<RevisionPlan, 'id' | 'createdAt' | 'updatedAt'>>(defaultPlan);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');

  const today = todayStr();

  // Stats
  const total = plans.length;
  const done = plans.filter(p => p.completed).length;
  const pending = total - done;
  const overdue = plans.filter(p => !p.completed && p.dueDate < today).length;
  const progress = total === 0 ? 0 : Math.round((done / total) * 100);

  const openAdd = () => {
    setForm({ ...defaultPlan, dueDate: today });
    setEditId(null);
    setShowForm(true);
  };

  const openEdit = (p: RevisionPlan) => {
    setForm({ subject: p.subject, topic: p.topic, dueDate: p.dueDate, priority: p.priority, completed: p.completed, notes: p.notes || '' });
    setEditId(p.id);
    setShowForm(true);
  };

  const save = () => {
    if (!form.topic.trim()) return;
    const now = new Date().toISOString();
    if (editId) {
      setPlans(prev => prev.map(p => p.id === editId ? { ...p, ...form, id: editId, updatedAt: now } : p));
      addToast?.('success', 'Revision updated!');
    } else {
      setPlans(prev => [...prev, { ...form, id: Date.now().toString(), createdAt: now, updatedAt: now }]);
      addToast?.('success', 'Revision added to your plan!');
    }
    setShowForm(false);
    setEditId(null);
  };

  const toggle = (p: RevisionPlan) => {
    setPlans(prev => prev.map(x => x.id === p.id ? { ...x, completed: !x.completed, updatedAt: new Date().toISOString() } : x));
  };

  const remove = (id: string) => {
    setPlans(prev => prev.filter(p => p.id !== id));
    setDeleteId(null);
    addToast?.('info', 'Revision removed.');
  };

  const filtered = plans.filter(p => {
    if (filter === 'pending' && p.completed) return false;
    if (filter === 'done' && !p.completed) return false;
    if (filter === 'overdue' && (p.completed || p.dueDate >= today)) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!p.topic.toLowerCase().includes(q) && !p.subject.toLowerCase().includes(q)) return false;
    }
    return true;
  }).sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    if (a.dueDate !== b.dueDate) return a.dueDate < b.dueDate ? -1 : 1;
    const rank = { High: 0, Medium: 1, Low: 2 };
    return rank[a.priority] - rank[b.priority];
  });

  const FILTERS: { id: Filter; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'pending', label: 'Pending' },
    { id: 'done', label: 'Completed' },
    { id: 'overdue', label: `Overdue${overdue > 0 ? ` (${overdue})` : ''}` },
  ];

  const STATS = [
    { label: 'Total topics', value: total, icon: <ListTodo size={18}/>, grad: 'from-slate-500 to-slate-600' },
    { label: 'Completed', value: done, icon: <CheckCircle2 size={18}/>, grad: 'from-emerald-400 to-green-600' },
    { label: 'Pending', value: pending, icon: <Circle size={18}/>, grad: 'from-amber-400 to-orange-500' },
    { label: 'Overdue', value: overdue, icon: <AlertCircle size={18}/>, grad: 'from-red-400 to-rose-600' },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Target className="text-teal-500 animate-bounce-gentle" size={26} /> Revision Planner
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">Plan your exam revision topics and track progress</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 bg-gradient-to-r from-teal-500 to-cyan-600 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-md hover:shadow-lg hover:scale-110 transition-all animate-bounce-gentle" style={{ animationDuration: '3s' }}>
          <Plus size={16} /> Add Topic
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {STATS.map((s, idx) => (
          <div key={s.label} className="card-glow bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-4 flex items-center gap-3 transition-all duration-300" style={{ animationDelay: `${idx * 0.08}s` }}>
            <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${s.grad} flex items-center justify-center text-white shadow-lg animate-bounce-gentle`} style={{ animationDelay: `${idx * 0.15 + 1}s` }}>
              {s.icon}
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">{s.value}</div>
              <div className="text-xs text-slate-400 dark:text-slate-500">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm p-5 mb-6 transition-colors duration-300">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
            <TrendingUp size={16} className="text-teal-500"/> Overall Progress
          </span>
          <span className="text-sm font-bold text-teal-600 dark:text-teal-400">{progress}%</span>
        </div>
        <div className="h-3 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-teal-400 to-cyan-500 rounded-full transition-all duration-700 animate-gradient-shift" style={{ width: `${progress}%`, backgroundSize: '200% 200%' }}/>
        </div>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
          {done} of {total} topics revised{done === total && total > 0 ? ' — all done! 🎉' : done > 0 ? ' — keep going! 🔥' : ' — add your first topic to begin'}
        </p>
      </div>

      {/* Filter + Search */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500"/>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search topics or subjects..." className="w-full pl-9 pr-3 py-2 border border-slate-200 dark:border-slate-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-300 dark:bg-slate-700 dark:text-slate-200"/>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map(f => (
            <button key={f.id} onClick={() => setFilter(f.id)} className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${filter === f.id ? 'bg-teal-500 text-white shadow' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'}`}>{f.label}</button>
          ))}
        </div>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400 dark:text-slate-500">
          <Target size={48} className="mx-auto mb-3 opacity-30"/>
          <p className="text-lg font-medium">{plans.length === 0 ? 'No revision topics yet' : 'No topics match your filter'}</p>
          <p className="text-sm">{plans.length === 0 ? 'Click "Add Topic" to plan what you need to revise!' : 'Try a different filter or search.'}</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((p, idx) => {
            const sc = SUBJECT_COLORS[p.subject] || SUBJECT_COLORS['General'];
            const pr = PRIORITY_STYLES[p.priority];
            const isOverdue = !p.completed && p.dueDate < today;
            return (
              <div key={p.id} className={`group bg-white dark:bg-slate-800 border rounded-2xl shadow-sm p-4 flex items-start gap-3 transition-all duration-300 card-glow ${p.completed ? 'border-emerald-200 dark:border-emerald-700/30 opacity-75' : isOverdue ? 'border-red-200 dark:border-red-800/40' : 'border-slate-100 dark:border-slate-700'}`} style={{ animationDelay: `${idx * 0.04}s` }}>
                {/* Toggle */}
                <button
                  onClick={() => toggle(p)}
                  className={`mt-0.5 flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center border-2 transition-all hover:scale-110 ${p.completed ? 'bg-gradient-to-br from-emerald-400 to-green-600 border-transparent text-white shadow' : 'border-slate-300 dark:border-slate-600 hover:border-teal-400'}`}
                  title={p.completed ? 'Mark as pending' : 'Mark as completed'}
                >
                  {p.completed && <Check size={13} strokeWidth={3}/>}
                </button>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`text-sm font-semibold ${p.completed ? 'text-slate-400 dark:text-slate-500 line-through' : 'text-slate-800 dark:text-slate-100'}`}>{p.topic}</span>
                    {isOverdue && (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 px-2 py-0.5 rounded-full uppercase tracking-wide">
                        <Flame size={10}/> Overdue
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mt-1.5">
                    <span className={`inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full ${sc.bg} ${sc.text} font-medium`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`}/>{p.subject}
                    </span>
                    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${pr.badge}`}>
                      <Flag size={10}/>{pr.label}
                    </span>
                    <span className={`inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 ${isOverdue ? 'text-red-500 dark:text-red-400 font-medium' : ''}`}>
                      <Calendar size={11}/>Due {fmtDate(p.dueDate)}
                    </span>
                    {p.notes && <span className="text-xs text-slate-400 dark:text-slate-500 truncate max-w-[180px]">— {p.notes}</span>}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                  <button onClick={() => openEdit(p)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors" title="Edit">
                    <Edit2 size={14} className="text-slate-500 dark:text-slate-400"/>
                  </button>
                  <button onClick={() => setDeleteId(p.id)} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors" title="Delete">
                    <Trash2 size={14} className="text-red-400"/>
                  </button>
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
              <h2 className="font-bold text-slate-800 dark:text-slate-100 text-lg">{editId ? 'Edit Topic' : 'Add Revision Topic'}</h2>
              <button onClick={() => setShowForm(false)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"><X size={18} className="text-slate-500 dark:text-slate-400"/></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Subject</label>
                <select value={form.subject} onChange={e => setForm(f => ({...f, subject: e.target.value}))} className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-300 dark:bg-slate-700 dark:text-slate-200">
                  {SUBJECTS.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Topic / What to revise</label>
                <input
                  value={form.topic}
                  onChange={e => setForm(f => ({...f, topic: e.target.value}))}
                  placeholder="e.g. Photosynthesis, Quadratic equations, WWII..."
                  className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-300 dark:bg-slate-700 dark:text-slate-200"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Due Date</label>
                  <input
                    type="date"
                    value={form.dueDate}
                    onChange={e => setForm(f => ({...f, dueDate: e.target.value}))}
                    className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-300 dark:bg-slate-700 dark:text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Priority</label>
                  <div className="flex gap-1.5 pt-0.5">
                    {PRIORITIES.map(pr => (
                      <button key={pr} onClick={() => setForm(f => ({...f, priority: pr}))} className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-medium border transition-all ${form.priority === pr ? PRIORITY_STYLES[pr].badge + ' border-transparent scale-105 shadow' : 'border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:border-teal-300'}`}>
                        {pr}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Notes (optional)</label>
                <input
                  value={form.notes || ''}
                  onChange={e => setForm(f => ({...f, notes: e.target.value}))}
                  placeholder="e.g. Focus on definitions and past paper questions"
                  className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-300 dark:bg-slate-700 dark:text-slate-200"
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={() => setShowForm(false)} className="flex-1 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 rounded-xl py-2.5 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-700">Cancel</button>
                <button onClick={save} disabled={!form.topic.trim()} className={`flex-1 rounded-xl py-2.5 text-sm font-semibold shadow flex items-center justify-center gap-2 transition-all ${form.topic.trim() ? 'bg-gradient-to-r from-teal-500 to-cyan-600 text-white hover:shadow-lg' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}>
                  <Check size={15}/>{editId ? 'Save Changes' : 'Add Topic'}
                </button>
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
            <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-2">Delete Topic?</h3>
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
