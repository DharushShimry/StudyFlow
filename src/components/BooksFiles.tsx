import { useState, useRef, useEffect } from 'react';
import type { BookFile } from '../types';
import { FolderOpen, Upload, Trash2, Download, File, FileText, Image, BookOpen, Search, Loader2, AlertCircle, Eye, X, ExternalLink } from 'lucide-react';

const SUBJECTS = ['All', 'Mathematics', 'Science', 'English', 'English Literature', 'Tamil', 'Sinhala', 'History', 'ICT', 'Religion', 'General'];

// localStorage holds ~5MB per origin, and base64 inflates ~33%, so keep files small.
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2 MB

function getFileIcon(type: string) {
  if (type.includes('image')) return <Image size={22} className="text-pink-500"/>;
  if (type.includes('pdf')) return <FileText size={22} className="text-red-500"/>;
  if (type.includes('word') || type.includes('document')) return <FileText size={22} className="text-blue-500"/>;
  if (type.includes('sheet') || type.includes('excel')) return <FileText size={22} className="text-green-500"/>;
  return <File size={22} className="text-slate-500"/>;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function isImage(type: string) {
  return type.startsWith('image/');
}

function isPdf(type: string) {
  return type === 'application/pdf' || type.endsWith('/pdf');
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

interface Props {
  files: BookFile[];
  setFiles: (f: BookFile[] | ((prev: BookFile[]) => BookFile[])) => void;
}

export default function BooksFiles({ files, setFiles }: Props) {
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [assignSubject, setAssignSubject] = useState('General');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [viewing, setViewing] = useState<BookFile | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Close the viewer with Escape
  useEffect(() => {
    if (!viewing) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setViewing(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [viewing]);

  const handleFiles = async (fileList: FileList | null, subject: string) => {
    if (!fileList || fileList.length === 0) return;
    setUploading(true);
    setUploadError(null);
    try {
      const additions: BookFile[] = [];
      const errors: string[] = [];
      for (const file of Array.from(fileList)) {
        if (file.size > MAX_FILE_SIZE) {
          errors.push(`"${file.name}" is too large (max 2 MB for local storage).`);
          continue;
        }
        try {
          const dataUrl = await readAsDataUrl(file);
          additions.push({
            id: Date.now().toString() + Math.random(),
            name: file.name,
            subject,
            type: file.type || 'application/octet-stream',
            size: formatSize(file.size),
            uploadedAt: new Date().toISOString(),
            dataUrl,
          });
        } catch {
          errors.push(`Could not read "${file.name}".`);
        }
      }
      if (additions.length > 0) {
        setFiles(prev => [...prev, ...additions]);
      }
      if (errors.length > 0) {
        setUploadError(errors.join(' '));
      }
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const download = (f: BookFile) => {
    const href = f.url || f.dataUrl;
    if (!href) return;
    const a = document.createElement('a');
    a.href = href;
    a.download = f.name;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.click();
  };

  const remove = (id: string) => {
    setFiles(files.filter(f => f.id !== id));
    setDeleteId(null);
  };

  const filtered = files.filter(f => {
    if (filter !== 'All' && f.subject !== filter) return false;
    if (search && !f.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <FolderOpen className="text-green-500 animate-bounce-gentle" size={26} /> Books & Files
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">{files.length} files — saved locally in your browser</p>
        </div>
        <button onClick={() => fileRef.current?.click()} disabled={uploading} className="flex items-center gap-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-md hover:shadow-lg hover:scale-110 transition-all animate-bounce-gentle disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100" style={{ animationDuration: '3s' }}>
          {uploading ? <Loader2 size={16} className="animate-spin"/> : <Upload size={16} />} {uploading ? 'Uploading...' : 'Upload Files'}
        </button>
        <input ref={fileRef} type="file" multiple className="hidden" onChange={e => handleFiles(e.target.files, assignSubject)} accept="*"/>
      </div>

      {/* Subject for upload */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm p-4 mb-5 flex flex-wrap items-center gap-3 transition-colors duration-300">
        <BookOpen size={16} className="text-green-500"/>
        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Upload to subject:</span>
        <select value={assignSubject} onChange={e => setAssignSubject(e.target.value)} className="border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-300 dark:bg-slate-700 dark:text-slate-200">
          {SUBJECTS.filter(s => s !== 'All').map(s => <option key={s}>{s}</option>)}
        </select>
        <span className="text-xs text-slate-400 dark:text-slate-500 ml-auto">Files are stored locally (max 2 MB each)</span>
      </div>

      {/* Drop Zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files, assignSubject); }}
        className={`border-2 border-dashed rounded-2xl p-8 text-center mb-5 transition-all cursor-pointer ${dragOver ? 'border-green-400 bg-green-50 dark:bg-green-900/20' : 'border-slate-200 dark:border-slate-600 hover:border-green-300 hover:bg-green-50/50 dark:hover:bg-green-900/10'}`}
        onClick={() => fileRef.current?.click()}
      >
        <Upload size={32} className={`mx-auto mb-2 ${dragOver ? 'text-green-500' : 'text-slate-300 dark:text-slate-600'}`}/>
        <p className="text-slate-500 dark:text-slate-300 font-medium text-sm">Drag & drop files here, or click to browse</p>
        <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">PDFs, images, documents — any file type</p>
      </div>

      {/* Upload errors */}
      {uploadError && (
        <div className="mb-5 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/30 rounded-xl p-3 flex items-start gap-2 text-xs text-red-600 dark:text-red-300">
          <AlertCircle size={14} className="flex-shrink-0 mt-0.5"/>
          <span>{uploadError}</span>
        </div>
      )}

      {/* Filter + Search */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500"/>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search files..." className="w-full pl-9 pr-3 py-2 border border-slate-200 dark:border-slate-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-300 dark:bg-slate-700 dark:text-slate-200"/>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {SUBJECTS.map(s => (
            <button key={s} onClick={() => setFilter(s)} className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${filter === s ? 'bg-green-500 text-white shadow' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'}`}>{s}</button>
          ))}
        </div>
      </div>

      {/* Files List */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400 dark:text-slate-500">
          <FolderOpen size={48} className="mx-auto mb-3 opacity-30"/>
          <p className="text-lg font-medium">No files yet</p>
          <p className="text-sm">Upload your books and notes to get started!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(f => (
            <div key={f.id} className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl shadow-sm p-4 flex items-start gap-3 group hover:shadow-xl transition-all duration-300 card-glow">
              <div className="w-10 h-10 bg-slate-50 dark:bg-slate-700 rounded-xl flex items-center justify-center flex-shrink-0">
                {getFileIcon(f.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-slate-800 dark:text-slate-100 text-sm truncate" title={f.name}>{f.name}</div>
                <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{f.subject} · {f.size}</div>
                <div className="text-xs text-slate-400 dark:text-slate-500">{new Date(f.uploadedAt).toLocaleDateString()}</div>
              </div>
              <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {(f.url || f.dataUrl) && (
                  <button onClick={() => setViewing(f)} className="p-1.5 hover:bg-emerald-50 rounded-lg" title="Preview">
                    <Eye size={14} className="text-emerald-600"/>
                  </button>
                )}
                <button onClick={() => download(f)} className="p-1.5 hover:bg-blue-50 rounded-lg" title="Download">
                  <Download size={14} className="text-blue-500"/>
                </button>
                <button onClick={() => setDeleteId(f.id)} className="p-1.5 hover:bg-red-50 rounded-lg" title="Delete">
                  <Trash2 size={14} className="text-red-400"/>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* VIEW MODAL — browser's built-in previewer */}
      {viewing && (() => {
        const href = viewing.url || viewing.dataUrl;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/70 backdrop-blur-sm" onClick={() => setViewing(null)}>
            <div className="glass-modal bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 dark:border-slate-700">
                <div className="font-bold text-slate-800 dark:text-slate-100 text-sm truncate pr-3">{viewing.name}</div>
                <div className="flex items-center gap-1.5">
                  <button onClick={() => download(viewing)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl" title="Download">
                    <Download size={16} className="text-green-600"/>
                  </button>
                  {href && (
                    <a href={href} target="_blank" rel="noopener noreferrer" className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl" title="Open in new tab">
                      <ExternalLink size={16} className="text-blue-500"/>
                    </a>
                  )}
                  <button onClick={() => setViewing(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl" title="Close">
                    <X size={16} className="text-slate-500"/>
                  </button>
                </div>
              </div>
              <div className="relative flex-1 overflow-hidden bg-slate-50 dark:bg-slate-900/50 select-none">
                <div className="absolute inset-0 flex items-center justify-center">
                  {href && isImage(viewing.type) ? (
                    <img
                      src={href}
                      alt={viewing.name}
                      draggable={false}
                      className="max-w-[92%] max-h-[82%] object-contain rounded-xl shadow-lg select-none"
                    />
                  ) : href && isPdf(viewing.type) ? (
                    <iframe
                      src={href}
                      title={viewing.name}
                      className="w-full h-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white"
                    />
                  ) : (
                    <div className="text-center px-6">
                      <File size={48} className="text-slate-300 mx-auto mb-3"/>
                      <p className="text-sm text-slate-400 dark:text-slate-500">No in-app preview for this file type — use Download or open in a new tab.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* DELETE CONFIRM */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 dark:bg-black/60 backdrop-blur-sm">
          <div className="glass-modal bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 max-w-sm w-full text-center">
            <div className="w-14 h-14 bg-red-50 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4"><Trash2 className="text-red-400" size={24}/></div>
            <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-2">Delete File?</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-5">This will remove the file from your storage.</p>
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
