import { useState, useRef } from 'react';
import type { AppData, ClassSession, SchoolPeriod, Note, BookFile, PomodoroSession, RevisionPlan } from '../types';
import { Download, Upload, X, Check, AlertCircle, FileDown, FileUp } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  onImport: (data: {
    classSessions: ClassSession[];
    schoolPeriods: SchoolPeriod[];
    notes: Note[];
    files: BookFile[];
    pomodoroSessions?: PomodoroSession[];
    revisionPlans?: RevisionPlan[];
  }) => void;
  addToast?: (type: 'success' | 'error' | 'info', message: string) => void;
  classSessions?: ClassSession[];
  schoolPeriods?: SchoolPeriod[];
  notes?: Note[];
  files?: BookFile[];
  pomodoroSessions?: PomodoroSession[];
  revisionPlans?: RevisionPlan[];
}

export default function DataExportImport({ open, onClose, onImport, addToast, classSessions = [], schoolPeriods = [], notes = [], files = [], pomodoroSessions = [], revisionPlans = [] }: Props) {
  const [importError, setImportError] = useState<string | null>(null);
  const [preview, setPreview] = useState<AppData | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

  const handleExport = () => {
    try {
      const data: AppData = {
        version: 1,
        exportedAt: new Date().toISOString(),
        classSessions,
        schoolPeriods,
        notes,
        files,
        pomodoroSessions: pomodoroSessions.length > 0 ? pomodoroSessions : undefined,
        revisionPlans: revisionPlans.length > 0 ? revisionPlans : undefined,
      };

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `studyflow-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      addToast?.('success', 'Data exported successfully!');
      onClose();
    } catch {
      addToast?.('error', 'Failed to export data.');
    }
  };

  const handleFileSelect = (file: File | null) => {
    setImportError(null);
    setPreview(null);
    if (!file) return;

    const reader = new FileReader();
    reader.onload = e => {
      try {
        const text = e.target?.result as string;
        const data = JSON.parse(text) as AppData;
        if (!data.version || !Array.isArray(data.classSessions)) {
          setImportError('Invalid backup file format.');
          return;
        }
        setPreview(data);
      } catch {
        setImportError('Could not read file. Make sure it\'s a valid JSON backup.');
      }
    };
    reader.readAsText(file);
  };

  const handleImport = () => {
    if (!preview) return;
    try {
      onImport({
        classSessions: preview.classSessions,
        schoolPeriods: preview.schoolPeriods,
        notes: preview.notes,
        files: preview.files,
        pomodoroSessions: preview.pomodoroSessions,
        revisionPlans: preview.revisionPlans,
      });
      addToast?.('success', `Data restored! ${preview.notes.length} notes, ${preview.files.length} files, and schedules imported.`);
      onClose();
    } catch {
      addToast?.('error', 'Failed to import data.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 dark:bg-black/60 backdrop-blur-sm">
      <div className="glass-modal bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700">
          <h2 className="font-bold text-slate-800 dark:text-slate-100 text-lg">Data Backup & Restore</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">
            <X size={18} className="text-slate-500 dark:text-slate-400"/>
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Export */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl p-5 border border-blue-100 dark:border-blue-800/30">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center flex-shrink-0">
                <FileDown size={20} className="text-blue-600 dark:text-blue-400"/>
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm mb-1">Export Your Data</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                  Download all your notes, schedules, and files as a single JSON backup file.
                </p>
                <button onClick={handleExport} className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:shadow-lg transition-all">
                  <Download size={15}/> Download Backup
                </button>
              </div>
            </div>
          </div>

          {/* Import */}
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-2xl p-5 border border-green-100 dark:border-green-800/30">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/40 flex items-center justify-center flex-shrink-0">
                <FileUp size={20} className="text-green-600 dark:text-green-400"/>
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm mb-1">Restore from Backup</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                  Upload a previously exported backup file to restore your data.
                </p>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={e => handleFileSelect(e.target.files?.[0] || null)}
                />
                <button
                  onClick={() => fileRef.current?.click()}
                  className="flex items-center gap-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:shadow-lg transition-all"
                >
                  <Upload size={15}/> Choose Backup File
                </button>
              </div>
            </div>

            {/* Preview */}
            {importError && (
              <div className="mt-3 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/30 rounded-xl p-3 flex items-start gap-2">
                <AlertCircle size={14} className="text-red-400 mt-0.5 flex-shrink-0"/>
                <p className="text-xs text-red-600 dark:text-red-300">{importError}</p>
              </div>
            )}

            {preview && (
              <div className="mt-3 bg-white dark:bg-slate-700/50 rounded-xl p-3 border border-green-200 dark:border-green-700/30">
                <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400 font-medium mb-2">
                  <Check size={12}/> Valid backup found
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-300">
                  <span>📚 Classes: {preview.classSessions.length}</span>
                  <span>🏫 Periods: {preview.schoolPeriods.length}</span>
                  <span>📝 Notes: {preview.notes.length}</span>
                  <span>📁 Files: {preview.files.length}</span>
                  {preview.pomodoroSessions && <span>🍅 Pomodoros: {preview.pomodoroSessions.length}</span>}
                  {preview.revisionPlans && <span>🎯 Plans: {preview.revisionPlans.length}</span>}
                </div>
                <div className="text-xs text-slate-400 dark:text-slate-500 mt-2">
                  Exported: {new Date(preview.exportedAt).toLocaleDateString()}
                </div>
                <button
                  onClick={handleImport}
                  className="mt-3 w-full flex items-center justify-center gap-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white py-2 rounded-xl text-sm font-semibold hover:shadow-lg transition-all"
                >
                  <Upload size={15}/> Restore This Backup
                </button>
              </div>
            )}
          </div>

          {/* Warning */}
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/30 rounded-xl p-3 text-xs text-amber-700 dark:text-amber-300 flex items-start gap-2">
            <AlertCircle size={14} className="flex-shrink-0 mt-0.5"/>
            <span>Importing a backup will <strong>replace all current data</strong>. Make sure to export your current data first if you want to keep it.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
