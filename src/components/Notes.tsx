import { useState } from 'react';
import type { Note } from '../types';
import { Plus, Edit2, Trash2, X, Check, BookOpen, Search } from 'lucide-react';

const SUBJECTS = ['All', 'Mathematics', 'Science', 'English', 'English Literature', 'Tamil', 'Sinhala', 'History', 'ICT', 'Religion', 'General'];
const NOTE_COLORS = [
  { id: 'yellow', bg: 'bg-yellow-50 dark:bg-yellow-900/15', border: 'border-yellow-200 dark:border-yellow-700/30', header: 'bg-yellow-100 dark:bg-yellow-900/30', dot: 'bg-yellow-400', text: 'text-yellow-800 dark:text-yellow-200' },
  { id: 'blue',   bg: 'bg-blue-50 dark:bg-blue-900/15',   border: 'border-blue-200 dark:border-blue-700/30',   header: 'bg-blue-100 dark:bg-blue-900/30',   dot: 'bg-blue-400',   text: 'text-blue-800 dark:text-blue-200' },
  { id: 'green',  bg: 'bg-green-50 dark:bg-green-900/15',  border: 'border-green-200 dark:border-green-700/30',  header: 'bg-green-100 dark:bg-green-900/30',  dot: 'bg-green-400',  text: 'text-green-800 dark:text-green-200' },
  { id: 'pink',   bg: 'bg-pink-50 dark:bg-pink-900/15',   border: 'border-pink-200 dark:border-pink-700/30',   header: 'bg-pink-100 dark:bg-pink-900/30',   dot: 'bg-pink-400',   text: 'text-pink-800 dark:text-pink-200' },
  { id: 'purple', bg: 'bg-purple-50 dark:bg-purple-900/15', border: 'border-purple-200 dark:border-purple-700/30', header: 'bg-purple-100 dark:bg-purple-900/30', dot: 'bg-purple-400', text: 'text-purple-800 dark:text-purple-200' },
  { id: 'orange', bg: 'bg-orange-50 dark:bg-orange-900/15', border: 'border-orange-200 dark:border-orange-700/30', header: 'bg-orange-100 dark:bg-orange-900/30', dot: 'bg-orange-400', text: 'text-orange-800 dark:text-orange-200' },
];

const defaultNote: Omit<Note, 'id' | 'createdAt' | 'updatedAt'> = {
  title: '',
  content: '',
  subject: 'General',
  color: 'yellow',
};

interface Props {
  notes: Note[];
  setNotes: (n: Note[]) => void;
}

export default function Notes({ notes, setNotes }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<Note, 'id' | 'createdAt' | 'updatedAt'>>(defaultNote);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [viewNote, setViewNote] = useState<Note | null>(null);

  const openAdd = () => {
    setForm(defaultNote);
    setEditId(null);
    setShowForm(true);
  };

  const openEdit = (n: Note) => {
    setForm({ title: n.title, content: n.content, subject: n.subject, color: n.color });
    setEditId(n.id);
    setShowForm(true);
    setViewNote(null);
  };

  const save = () => {
    const now = new Date().toISOString();
    if (editId) {
      setNotes(notes.map(n => n.id === editId ? { ...form, id: editId, createdAt: n.createdAt, updatedAt: now } : n));
    } else {
      setNotes([...notes, { ...form, id: Date.now().toString(), createdAt: now, updatedAt: now }]);
    }
    setShowForm(false);
    setEditId(null);
  };

  const remove = (id: string) => {
    setNotes(notes.filter(n => n.id !== id));
    setDeleteId(null);
    setViewNote(null);
  };

  const filtered = notes.filter(n => {
    if (filter !== 'All' && n.subject !== filter) return false;
    if (search && !n.title.toLowerCase().includes(search.toLowerCase()) && !n.content.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const getColor = (id: string) => NOTE_COLORS.find(c => c.id === id) || NOTE_COLORS[0];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <BookOpen className="text-amber-500 animate-bounce-gentle" size={26} /> My Notes
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">{notes.length} notes saved locally</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 bg-gradient-to-r from-amber-400 to-orange-500 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-md hover:shadow-lg hover:scale-110 transition-all animate-bounce-gentle" style={{ animationDuration: '3s' }}>
          <Plus size={16} /> New Note
        </button>
      </div>

      {/* Filter + Search */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500"/>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search notes..." className="w-full pl-9 pr-3 py-2 border border-slate-200 dark:border-slate-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 dark:bg-slate-700 dark:text-slate-200"/>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {SUBJECTS.map(s => (
            <button key={s} onClick={() => setFilter(s)} className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${filter === s ? 'bg-amber-400 text-white shadow' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'}`}>{s}</button>
          ))}
        </div>
      </div>

      {/* Notes Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-20 text-slate-400 dark:text-slate-500">
          <BookOpen size={48} className="mx-auto mb-3 opacity-30"/>
          <p className="text-lg font-medium">No notes yet</p>
          <p className="text-sm">Click "New Note" to create your first note!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(n => {
            const c = getColor(n.color);
            return (
              <div key={n.id} onClick={() => setViewNote(n)} className={`${c.bg} ${c.border} border rounded-2xl shadow-sm cursor-pointer hover:shadow-xl transition-all duration-300 group flex flex-col overflow-hidden card-glow`}>
                <div className={`${c.header} px-4 py-3 flex items-start justify-between gap-2`}>
                  <span className={`font-semibold text-sm ${c.text} truncate flex-1`}>{n.title || 'Untitled'}</span>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" onClick={e => e.stopPropagation()}>
                    <button onClick={() => openEdit(n)} className="p-1 hover:bg-white/60 rounded-lg"><Edit2 size={12} className="text-slate-600"/></button>
                    <button onClick={() => setDeleteId(n.id)} className="p-1 hover:bg-white/60 rounded-lg"><Trash2 size={12} className="text-red-400"/></button>
                  </div>
                </div>
                <div className="px-4 py-3 flex-1">
                  <p className="text-slate-600 dark:text-slate-300 text-xs leading-relaxed line-clamp-5 whitespace-pre-wrap">{n.content || 'Empty note'}</p>
                </div>
                <div className="px-4 py-2 border-t border-black/5 flex items-center justify-between">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${c.text} ${c.header} font-medium`}>{n.subject}</span>
                  <span className="text-xs text-slate-400 dark:text-slate-500">{new Date(n.updatedAt).toLocaleDateString()}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* VIEW NOTE MODAL */}
      {viewNote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 dark:bg-black/60 backdrop-blur-sm">
          <div className="glass-modal bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700">
              <h2 className="font-bold text-slate-800 dark:text-slate-100 text-lg flex-1 pr-4">{viewNote.title || 'Untitled'}</h2>
              <div className="flex gap-2">
                <button onClick={() => openEdit(viewNote)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl"><Edit2 size={16} className="text-slate-500 dark:text-slate-400"/></button>
                <button onClick={() => setDeleteId(viewNote.id)} className="p-2 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl"><Trash2 size={16} className="text-red-400"/></button>
                <button onClick={() => setViewNote(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl"><X size={16} className="text-slate-500 dark:text-slate-400"/></button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <div className="text-xs text-slate-400 mb-3">{viewNote.subject} · Updated {new Date(viewNote.updatedAt).toLocaleString()}</div>
              <pre className="text-slate-700 dark:text-slate-200 text-sm leading-relaxed whitespace-pre-wrap font-sans">{viewNote.content}</pre>
            </div>
          </div>
        </div>
      )}

      {/* ADD/EDIT MODAL */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 dark:bg-black/60 backdrop-blur-sm">
          <div className="glass-modal bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700">
              <h2 className="font-bold text-slate-800 dark:text-slate-100 text-lg">{editId ? 'Edit Note' : 'New Note'}</h2>
              <button onClick={() => setShowForm(false)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"><X size={18} className="text-slate-500 dark:text-slate-400"/></button>
            </div>
            <div className="p-6 space-y-4 flex-1 overflow-y-auto">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Title</label>
                <input value={form.title} onChange={e => setForm(f => ({...f, title: e.target.value}))} placeholder="Note title..." className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 font-medium dark:bg-slate-700 dark:text-slate-200"/>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Subject</label>
                <select value={form.subject} onChange={e => setForm(f => ({...f, subject: e.target.value}))} className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 dark:bg-slate-700 dark:text-slate-200">
                  {SUBJECTS.filter(s => s !== 'All').map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-xs font-semibold text-slate-600 mb-1">Content</label>
                <textarea value={form.content} onChange={e => setForm(f => ({...f, content: e.target.value}))} placeholder="Write your notes here..." rows={10} className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 resize-none dark:bg-slate-700 dark:text-slate-200"/>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Color</label>
                <div className="flex gap-2">
                  {NOTE_COLORS.map(c => (
                    <button key={c.id} onClick={() => setForm(f => ({...f, color: c.id}))} className={`w-8 h-8 rounded-full ${c.dot} border-2 transition-all ${form.color === c.id ? 'border-slate-700 scale-110' : 'border-transparent'}`}/>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowForm(false)} className="flex-1 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 rounded-xl py-2.5 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-700">Cancel</button>
                <button onClick={save} className="flex-1 bg-gradient-to-r from-amber-400 to-orange-500 text-white rounded-xl py-2.5 text-sm font-semibold shadow hover:shadow-lg flex items-center justify-center gap-2"><Check size={15}/>Save Note</button>
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
            <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-2">Delete Note?</h3>
            <p className="text-slate-500 text-sm mb-5">This action cannot be undone.</p>
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
