import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Image as ImageIcon, PenTool, IdCard, Upload, Download, Trash2, Eye, X,
  FileText, File, HardDrive, ShieldCheck, Loader2, ExternalLink
} from 'lucide-react';
import {
  listItems, addItem, getItemBlob, deleteItem, clearSlot, ensurePersonalSpace, genId,
  type PersonalItem, type PersonalSlot
} from '../services/personalStore';
import { useToast } from '../contexts/ToastContext';

const SECTIONS: {
  slot: PersonalSlot;
  title: string;
  desc: string;
  icon: React.ReactNode;
  gradient: string;
  multiple: boolean;
  hint: string;
}[] = [
  {
    slot: 'logo',
    title: 'Logo',
    desc: 'Your personal logo / emblem',
    icon: <ImageIcon size={22}/>,
    gradient: 'from-amber-400 to-orange-500',
    multiple: false,
    hint: 'SVG or image — e.g. your personal logo',
  },
  {
    slot: 'signature',
    title: 'Signature',
    desc: 'Your handwritten signature',
    icon: <PenTool size={22}/>,
    gradient: 'from-purple-500 to-fuchsia-500',
    multiple: false,
    hint: 'PNG with a transparent background works best',
  },
  {
    slot: 'nic',
    title: 'National Identity Card',
    desc: 'Your NIC — scans or photos',
    icon: <IdCard size={22}/>,
    gradient: 'from-blue-500 to-indigo-600',
    multiple: true,
    hint: 'You can store both sides or a PDF scan',
  },
];

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

export default function PersonalSpace() {
  const [items, setItems] = useState<Record<PersonalSlot, (PersonalItem & { url: string })[]>>({
    logo: [],
    signature: [],
    nic: [],
  });
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [viewing, setViewing] = useState<{ item: PersonalItem; url: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ item: PersonalItem; slot: PersonalSlot } | null>(null);
  const [dragging, setDragging] = useState<PersonalSlot | null>(null);
  const fileRefs = useRef<Record<PersonalSlot, HTMLInputElement | null>>({ logo: null, signature: null, nic: null });
  const urlsRef = useRef<string[]>([]);
  const { addToast } = useToast();

  const refresh = useCallback(async () => {
    // Revoke previously created object URLs before creating new ones
    urlsRef.current.forEach(url => URL.revokeObjectURL(url));
    urlsRef.current = [];

    const all = await listItems();
    const withUrls = await Promise.all(
      all.map(async (item) => {
        const blob = await getItemBlob(item.id);
        if (!blob) return null;
        const url = URL.createObjectURL(blob);
        urlsRef.current.push(url);
        return { ...item, url };
      })
    );
    const grouped: Record<PersonalSlot, (PersonalItem & { url: string })[]> = { logo: [], signature: [], nic: [] };
    for (const item of withUrls) {
      if (item) grouped[item.slot].push(item);
    }
    setItems(grouped);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        await ensurePersonalSpace();
        if (!cancelled) await refresh();
      } catch {
        addToast('error', 'Could not load your personal space.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      // Revoke all object URLs on unmount to avoid leaks
      urlsRef.current.forEach(url => URL.revokeObjectURL(url));
      urlsRef.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFiles = async (slot: PersonalSlot, files: FileList | File[] | null) => {
    if (!files || files.length === 0) return;
    setSeeding(true);
    try {
      const section = SECTIONS.find(s => s.slot === slot)!;
      if (!section.multiple) {
        await clearSlot(slot);
      }
      for (const file of Array.from(files)) {
        await addItem(
          { id: genId(), slot, name: file.name, type: file.type || 'application/octet-stream', size: file.size, uploadedAt: new Date().toISOString() },
          file
        );
      }
      await refresh();
      addToast('success', `${section.title} saved!`);
    } catch {
      addToast('error', `Could not save to ${slot}.`);
    } finally {
      setSeeding(false);
      if (fileRefs.current[slot]) fileRefs.current[slot].value = '';
    }
  };

  const download = (item: PersonalItem) => {
    getItemBlob(item.id).then(blob => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = item.name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    });
  };

  const remove = async (target: { item: PersonalItem; slot: PersonalSlot }) => {
    try {
      await deleteItem(target.item.id);
      await refresh();
      addToast('info', `"${target.item.name}" removed.`);
    } catch {
      addToast('error', 'Could not delete that file.');
    } finally {
      setDeleteTarget(null);
    }
  };

  // Close the viewer with Escape
  useEffect(() => {
    if (!viewing) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setViewing(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [viewing]);

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-center py-32 text-slate-400 dark:text-slate-500 gap-2">
          <Loader2 size={20} className="animate-spin"/> Loading your personal space…
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <IdCard className="text-rose-500 animate-bounce-gentle" size={26} /> Personal Space
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">Your logo, signature and identity documents — kept private on this device</p>
        </div>
      </div>

      {/* Privacy notice */}
      <div className="bg-gradient-to-r from-rose-50 to-amber-50 dark:from-rose-900/20 dark:to-amber-900/20 border border-rose-100 dark:border-rose-800/30 rounded-2xl p-4 mb-6 flex items-start gap-3">
        <ShieldCheck size={18} className="text-rose-500 flex-shrink-0 mt-0.5"/>
        <p className="text-xs text-rose-700 dark:text-rose-300 leading-relaxed">
          <strong>Private by design:</strong> personal documents are stored in your browser's IndexedDB database on this device only — never uploaded to any server or included in JSON backups. Cleared when you clear browser site data.
        </p>
      </div>

      {/* Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {SECTIONS.map((section) => {
          const slotItems = items[section.slot];
          return (
            <div key={section.slot} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden transition-colors duration-300 card-glow">
              {/* Section header */}
              <div className={`bg-gradient-to-r ${section.gradient} px-5 py-4 text-white`}>
                <div className="flex items-center gap-3">
                  <span className="animate-bounce-gentle">{section.icon}</span>
                  <div>
                    <div className="font-bold">{section.title}</div>
                    <div className="text-xs opacity-80">{section.desc}</div>
                  </div>
                </div>
              </div>

              <div className="p-4">
                {/* Drop zone / empty state */}
                <div
                  onDragOver={e => { e.preventDefault(); setDragging(section.slot); }}
                  onDragLeave={() => setDragging(null)}
                  onDrop={e => { e.preventDefault(); setDragging(null); handleFiles(section.slot, e.dataTransfer.files); }}
                  onClick={() => fileRefs.current[section.slot]?.click()}
                  className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all mb-3 ${dragging === section.slot ? 'border-rose-400 bg-rose-50 dark:bg-rose-900/20' : 'border-slate-200 dark:border-slate-600 hover:border-rose-300 dark:hover:border-rose-500/60 hover:bg-slate-50 dark:hover:bg-slate-700/30'}`}
                >
                  <input
                    ref={el => { fileRefs.current[section.slot] = el; }}
                    type="file"
                    multiple={section.multiple}
                    className="hidden"
                    onChange={e => handleFiles(section.slot, e.target.files)}
                    accept={section.slot === 'nic' ? 'image/*,application/pdf' : 'image/*,.svg,image/svg+xml'}
                  />
                  <Upload size={24} className={`mx-auto mb-1.5 ${dragging === section.slot ? 'text-rose-500' : 'text-slate-300 dark:text-slate-600'}`}/>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-300">{section.hint}</p>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">Click or drag & drop {section.multiple ? 'files' : 'a file'} here</p>
                </div>

                {/* File list */}
                {slotItems.length > 0 ? (
                  <div className="space-y-2">
                    {slotItems.map(item => (
                      <div key={item.id} className="flex items-center gap-3 bg-slate-50 dark:bg-slate-700/40 rounded-xl p-2.5 border border-slate-100 dark:border-slate-600/50 group">
                        {isImage(item.type) ? (
                          <img src={item.url} alt={item.name} className="w-11 h-11 rounded-lg object-contain bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 flex-shrink-0"/>
                        ) : isPdf(item.type) ? (
                          <div className="w-11 h-11 rounded-lg bg-red-50 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
                            <FileText size={20} className="text-red-500"/>
                          </div>
                        ) : (
                          <div className="w-11 h-11 rounded-lg bg-slate-100 dark:bg-slate-600 flex items-center justify-center flex-shrink-0">
                            <File size={20} className="text-slate-500 dark:text-slate-300"/>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">{item.name}</div>
                          <div className="text-[11px] text-slate-400 dark:text-slate-500">{formatSize(item.size)} · {new Date(item.uploadedAt).toLocaleDateString()}</div>
                        </div>
                        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => setViewing({ item, url: item.url })} className="p-1.5 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg" title="View">
                            <Eye size={14} className="text-blue-500"/>
                          </button>
                          <button onClick={() => download(item)} className="p-1.5 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-lg" title="Download">
                            <Download size={14} className="text-green-600"/>
                          </button>
                          <button onClick={() => setDeleteTarget({ item, slot: section.slot })} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg" title="Delete">
                            <Trash2 size={14} className="text-red-400"/>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-slate-300 dark:text-slate-600 text-xs">
                    <HardDrive size={28} className="mx-auto mb-1.5 opacity-40"/>
                    No {section.title.toLowerCase()} saved yet
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Seeding overlay */}
      {seeding && (
        <div className="fixed inset-0 z-50 bg-black/30 dark:bg-black/50 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl px-8 py-6 flex items-center gap-3">
            <Loader2 size={22} className="animate-spin text-rose-500"/>
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Saving your personal files…</span>
          </div>
        </div>
      )}

      {/* VIEW MODAL */}
      {viewing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/70 backdrop-blur-sm" onClick={() => setViewing(null)}>
          <div className="glass-modal bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 dark:border-slate-700">
              <div className="font-bold text-slate-800 dark:text-slate-100 text-sm truncate pr-3">{viewing.item.name}</div>
              <div className="flex items-center gap-1.5">
                <button onClick={() => download(viewing.item)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl" title="Download">
                  <Download size={16} className="text-green-600"/>
                </button>
                <a href={viewing.url} target="_blank" rel="noopener noreferrer" className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl" title="Open in new tab">
                  <ExternalLink size={16} className="text-blue-500"/>
                </a>
                <button onClick={() => setViewing(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl" title="Close">
                  <X size={16} className="text-slate-500"/>
                </button>
              </div>
            </div>
            <div className="relative flex-1 overflow-hidden bg-slate-50 dark:bg-slate-900/50 select-none">
              <div className="absolute inset-0 flex items-center justify-center">
                {isImage(viewing.item.type) ? (
                  <img
                    src={viewing.url}
                    alt={viewing.item.name}
                    draggable={false}
                    className="max-w-[92%] max-h-[82%] object-contain rounded-xl shadow-lg select-none"
                  />
                ) : isPdf(viewing.item.type) ? (
                  <iframe
                    src={viewing.url}
                    title={viewing.item.name}
                    className="w-full h-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white"
                  />
                ) : (
                  <File size={48} className="text-slate-300"/>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRM */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 dark:bg-black/60 backdrop-blur-sm">
          <div className="glass-modal bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 max-w-sm w-full text-center">
            <div className="w-14 h-14 bg-red-50 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4"><Trash2 className="text-red-400" size={24}/></div>
            <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-2">Delete "{deleteTarget.item.name}"?</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-5">This will remove it from your personal space on this device.</p>
            <div className="flex gap-2">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 rounded-xl py-2.5 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-700">Cancel</button>
              <button onClick={() => remove(deleteTarget)} className="flex-1 bg-red-500 text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-red-600">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
