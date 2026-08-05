import { useState, useRef, useEffect } from 'react';
import { useSettings, DEFAULT_SUBJECTS } from '../contexts/SettingsContext';
import { useTheme } from '../contexts/ThemeContext';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import type { AppSettings } from '../types';
import {
  Settings, Palette, Type, Layout, Eye, BookOpen, Plus, Trash2, Monitor, Sun, Moon, Sparkles, Play,
  User, Camera, KeyRound, Check, Copy, ShieldCheck, Clock, Info,
  Video, Download, Upload, RotateCcw, AlertTriangle, BarChart3, UserX, FileText, FolderOpen, Timer, Target, X,
} from 'lucide-react';
import Avatar from './Avatar';
import {
  useProfile, saveProfile, resizeAvatar, avatarColorFor, AVATAR_GRADIENTS,
  getProfile, clearProfile, type UserProfile,
} from '../services/profileStore';
import { clearUserData, clearUserDatabases, scopedKey } from '../services/userScope';

const ACCENT_COLORS: { id: AppSettings['accentColor']; label: string; gradient: string }[] = [
  { id: 'violet', label: 'Violet', gradient: 'from-violet-500 to-indigo-600' },
  { id: 'blue', label: 'Blue', gradient: 'from-blue-500 to-indigo-600' },
  { id: 'emerald', label: 'Emerald', gradient: 'from-emerald-500 to-teal-600' },
  { id: 'rose', label: 'Rose', gradient: 'from-rose-500 to-pink-600' },
  { id: 'amber', label: 'Amber', gradient: 'from-amber-500 to-orange-600' },
  { id: 'cyan', label: 'Cyan', gradient: 'from-cyan-500 to-blue-600' },
  { id: 'purple', label: 'Purple', gradient: 'from-purple-500 to-violet-600' },
  { id: 'orange', label: 'Orange', gradient: 'from-orange-500 to-amber-600' },
];

const FONT_SIZES = [
  { id: 'small' as const, label: 'Small', desc: '13px — more content' },
  { id: 'medium' as const, label: 'Medium', desc: '14px — balanced' },
  { id: 'large' as const, label: 'Large', desc: '16px — easy reading' },
];

const DENSITIES = [
  { id: 'compact' as const, label: 'Compact', desc: 'Tighter spacing' },
  { id: 'comfortable' as const, label: 'Comfortable', desc: 'Room to breathe' },
];

const RADII = [
  { id: 'small' as const, label: 'Sharp', desc: 'Minimal rounding' },
  { id: 'medium' as const, label: 'Rounded', desc: 'Medium curves' },
  { id: 'large' as const, label: 'Extra Rounded', desc: 'Bold curves' },
];

interface SettingsPageProps {
  onReplayTour?: () => void;
}

export default function SettingsPage({ onReplayTour }: SettingsPageProps) {
  const { settings, updateSettings, updateWidget, addCustomSubject, removeCustomSubject, setCustomSubjectColor, resetSettings } = useSettings();
  const { theme, toggleTheme } = useTheme();
  const { addToast } = useToast();
  const { currentUser, users, changePassword, deleteAccount } = useAuth();

  const [newSubject, setNewSubject] = useState('');
  const [activeTab, setActiveTab] = useState<'profile' | 'appearance' | 'dashboard' | 'subjects'>('profile');

  // ---- Profile state ----
  const profile = useProfile(currentUser ?? '');
  const [uploading, setUploading] = useState(false);
  const [displayName, setDisplayName] = useState(profile.displayName ?? '');
  const [bio, setBio] = useState(profile.bio ?? '');
  const [pwCurrent, setPwCurrent] = useState('');
  const [pwNew, setPwNew] = useState('');
  const [pwConfirm, setPwConfirm] = useState('');
  const avatarFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDisplayName(profile.displayName ?? '');
    setBio(profile.bio ?? '');
  }, [profile.displayName, profile.bio]);

  const account = users.find(u => u.username === currentUser);
  const memberSince = account?.createdAt ? new Date(account.createdAt) : null;
  const fallbackColor = profile.avatarColor || avatarColorFor(currentUser ?? '');
  const profileStorageKb = Math.max(1, Math.round(JSON.stringify(profile).length / 1024));

  const handleAvatarFile = async (file: File | undefined) => {
    if (!file || !currentUser) return;
    if (!file.type.startsWith('image/')) { addToast?.('error', 'Please choose an image file.'); return; }
    if (file.size > 8 * 1024 * 1024) { addToast?.('error', 'Image is too large — max 8 MB.'); return; }
    setUploading(true);
    try {
      const dataUrl = await resizeAvatar(file, 256);
      saveProfile({ avatar: dataUrl }, currentUser);
      addToast?.('success', 'Profile picture updated!');
    } catch {
      addToast?.('error', 'Could not use that image — try another one.');
    } finally {
      setUploading(false);
      if (avatarFileRef.current) avatarFileRef.current.value = '';
    }
  };

  const handleRemoveAvatar = () => {
    if (!currentUser) return;
    saveProfile({ avatar: undefined }, currentUser);
    addToast?.('info', 'Profile picture removed.');
  };

  const handlePickColor = (id: string) => {
    if (!currentUser) return;
    // The colour is only a fallback — never remove an uploaded picture.
    saveProfile({ avatarColor: id }, currentUser);
  };

  const saveAbout = () => {
    if (!currentUser) return;
    const next = { displayName: displayName.trim(), bio: bio.trim() };
    if (next.displayName === (profile.displayName ?? '') && next.bio === (profile.bio ?? '')) return;
    saveProfile(next, currentUser);
    addToast?.('success', 'Profile saved!');
  };

  const handleCopyUsername = () => {
    if (!currentUser) return;
    navigator.clipboard?.writeText(currentUser).catch(() => {});
    addToast?.('info', 'Username copied to clipboard.');
  };

  const handleChangePassword = () => {
    if (!currentUser) return;
    if (pwNew !== pwConfirm) { addToast?.('error', 'New passwords do not match.'); return; }
    const res = changePassword(currentUser, pwCurrent, pwNew);
    if (!res.ok) { addToast?.('error', res.error ?? 'Could not change password.'); return; }
    addToast?.('success', 'Password updated!');
    setPwCurrent(''); setPwNew(''); setPwConfirm('');
  };

  // ---- Camera selfie capture ----
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const cameraVideoRef = useRef<HTMLVideoElement>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const cameraOpenRef = useRef(false);

  // Always release the camera when leaving this page.
  useEffect(() => () => {
    cameraStreamRef.current?.getTracks().forEach(t => t.stop());
    cameraStreamRef.current = null;
    cameraOpenRef.current = false;
  }, []);

  useEffect(() => {
    if (!cameraOpen) return;
    const video = cameraVideoRef.current;
    const stream = cameraStreamRef.current;
    if (video && stream) {
      video.srcObject = stream;
      video.play().catch(() => {});
    }
  }, [cameraOpen]);

  const openCamera = async () => {
    if (!currentUser) return;
    setCameraError(null);
    cameraOpenRef.current = true;
    setCameraOpen(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
      // If the modal was closed while the permission prompt was showing, drop the stream.
      if (!cameraOpenRef.current) {
        stream.getTracks().forEach(t => t.stop());
        return;
      }
      cameraStreamRef.current = stream;
      const video = cameraVideoRef.current;
      if (video) { video.srcObject = stream; video.play().catch(() => {}); }
    } catch {
      setCameraError('Camera not available — check your permissions or use a file upload instead.');
    }
  };

  const closeCamera = () => {
    cameraOpenRef.current = false;
    cameraStreamRef.current?.getTracks().forEach(t => t.stop());
    cameraStreamRef.current = null;
    setCameraOpen(false);
  };

  const captureSelfie = () => {
    const video = cameraVideoRef.current;
    if (!video || !currentUser) return;
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    if (!vw || !vh) { addToast?.('error', 'No camera frame yet — try again.'); return; }
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const side = Math.min(vw, vh);
    ctx.drawImage(video, (vw - side) / 2, (vh - side) / 2, side, side, 0, 0, size, size);
    let dataUrl = canvas.toDataURL('image/webp', 0.85);
    if (!dataUrl.startsWith('data:image/webp')) dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    saveProfile({ avatar: dataUrl }, currentUser);
    closeCamera();
    addToast?.('success', 'Profile picture updated from camera!');
  };

  // ---- Profile backup (export / import) ----
  const importFileRef = useRef<HTMLInputElement>(null);
  const exportProfile = () => {
    if (!currentUser) return;
    const payload = {
      app: 'StudyFlow',
      version: 1,
      exportedAt: new Date().toISOString(),
      username: currentUser,
      profile: getProfile(currentUser),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `studyflow-profile-${currentUser}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    addToast?.('success', 'Profile exported');
  };

  const handleImportProfile = async (file: File | undefined) => {
    if (!file || !currentUser) return;
    try {
      const parsed = JSON.parse(await file.text());
      const p = parsed?.profile && typeof parsed.profile === 'object' ? parsed.profile : parsed;
      if (!p || typeof p !== 'object') throw new Error('invalid');
      const next: Partial<UserProfile> = {};
      if (typeof p.avatar === 'string' && p.avatar.startsWith('data:image') && p.avatar.length <= 400_000) next.avatar = p.avatar;
      if (typeof p.displayName === 'string') next.displayName = p.displayName.slice(0, 60);
      if (typeof p.bio === 'string') next.bio = p.bio.slice(0, 160);
      if (typeof p.avatarColor === 'string') next.avatarColor = p.avatarColor;
      saveProfile(next, currentUser);
      addToast?.('success', 'Profile imported');
    } catch {
      addToast?.('error', 'That file is not a valid StudyFlow profile backup.');
    } finally {
      if (importFileRef.current) importFileRef.current.value = '';
    }
  };

  // ---- Delete account ----
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleting, setDeleting] = useState(false);

  const handleDeleteAccount = async () => {
    if (!currentUser) return;
    if (deleteConfirm.trim() !== currentUser) {
      addToast?.('error', 'Type your username exactly to confirm.');
      return;
    }
    setDeleting(true);
    try {
      const res = deleteAccount(currentUser);
      if (!res.ok) {
        addToast?.('error', res.error ?? 'Could not delete the account.');
        setDeleting(false);
        return;
      }
      clearUserData(currentUser);
      clearProfile(currentUser);
      await clearUserDatabases(currentUser);
      setDeleteOpen(false);
      setDeleteConfirm('');
      addToast?.('info', `Account "${currentUser}" deleted — all local data removed.`);
    } finally {
      setDeleting(false);
    }
  };

  // ---- Reset all settings ----
  const handleResetSettings = () => {
    resetSettings();
    addToast?.('info', 'All settings reset to defaults');
  };

  // ---- At-a-glance insights ----
  const readCount = (name: string): number => {
    try {
      const raw = localStorage.getItem(scopedKey(name, currentUser ?? ''));
      if (!raw) return 0;
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.length : 0;
    } catch {
      return 0;
    }
  };
  const insights = currentUser
    ? [
        { label: 'Subjects', value: settings.customSubjects.length, icon: <BookOpen size={15}/> },
        { label: 'Notes', value: readCount('notes'), icon: <FileText size={15}/> },
        { label: 'Files', value: readCount('files'), icon: <FolderOpen size={15}/> },
        { label: 'Pomodoro', value: readCount('pomodoro-sessions'), icon: <Timer size={15}/> },
        { label: 'Revision plans', value: readCount('revision-plans'), icon: <Target size={15}/> },
        { label: 'Schedules', value: readCount('class-sessions') + readCount('school-periods'), icon: <Layout size={15}/> },
      ]
    : [];

  const handleAddSubject = () => {
    const name = newSubject.trim();
    if (!name) return;
    if (settings.customSubjects.some(s => s.name === name)) {
      addToast?.('error', 'Subject already exists!');
      return;
    }
    addCustomSubject(name);
    setNewSubject('');
    addToast?.('success', `Added "${name}" to subjects`);
  };

  const handleRemoveSubject = (name: string) => {
    if (DEFAULT_SUBJECTS.includes(name)) {
      addToast?.('error', 'Cannot remove default subjects');
      return;
    }
    removeCustomSubject(name);
    addToast?.('info', `Removed "${name}"`);
  };

  const tabs = [
    { id: 'profile' as const, label: 'Profile', icon: <User size={16}/> },
    { id: 'appearance' as const, label: 'Appearance', icon: <Palette size={16}/> },
    { id: 'dashboard' as const, label: 'Dashboard', icon: <Layout size={16}/> },
    { id: 'subjects' as const, label: 'Subjects', icon: <BookOpen size={16}/> },
  ];

  const COLOR_DOTS: Record<string, string> = {
    blue: 'bg-blue-400', green: 'bg-green-400', pink: 'bg-pink-400',
    purple: 'bg-purple-400', orange: 'bg-orange-400', yellow: 'bg-yellow-400',
    amber: 'bg-amber-400', cyan: 'bg-cyan-400', rose: 'bg-rose-400',
    slate: 'bg-slate-400', red: 'bg-red-400', teal: 'bg-teal-400',
    indigo: 'bg-indigo-400', lime: 'bg-lime-400', sky: 'bg-sky-400',
    emerald: 'bg-emerald-400',
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <Settings className="text-slate-500" size={26} /> Settings
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">Make StudyFlow truly yours</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              activeTab === tab.id
                ? 'btn-accent text-white shadow'
                : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-violet-300'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div className="space-y-6">
          {/* Profile Picture */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-5 transition-colors duration-300">
            <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm mb-1 flex items-center gap-2">
              <User size={16}/> Profile Picture
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">
              Your avatar appears in the sidebar, the top bar and across the app. It is stored privately on this device only.
            </p>
            <div className="flex flex-wrap items-center gap-6">
              <div className="relative group">
                <Avatar
                  name={displayName || currentUser || '?'}
                  src={profile.avatar}
                  color={fallbackColor}
                  className="w-24 h-24 rounded-2xl ring-4 ring-slate-100 dark:ring-slate-700 shadow-lg"
                  textClass="text-3xl"
                />
                <button
                  onClick={() => avatarFileRef.current?.click()}
                  className="absolute inset-0 flex items-center justify-center gap-1 rounded-2xl bg-black/55 text-white text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Camera size={15}/> Change
                </button>
              </div>
              <div className="space-y-4 flex-1 min-w-[220px]">
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => avatarFileRef.current?.click()}
                    disabled={uploading}
                    className="btn-accent flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-50 hover:shadow-lg transition-all"
                  >
                    <Camera size={15}/> {uploading ? 'Processing…' : 'Upload Picture'}
                  </button>
                  <button
                    onClick={openCamera}
                    disabled={!('mediaDevices' in navigator)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all disabled:opacity-40"
                    title="Take a picture with your camera"
                  >
                    <Video size={15}/> Use camera
                  </button>
                  {profile.avatar && (
                    <button
                      onClick={handleRemoveAvatar}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold border border-red-200 dark:border-red-800/50 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
                    >
                      <Trash2 size={15}/> Remove
                    </button>
                  )}
                </div>
                <input
                  ref={avatarFileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={e => handleAvatarFile(e.target.files?.[0])}
                />
                <div>
                  <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">
                    Fallback colour (shown when no picture)
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {AVATAR_GRADIENTS.map(g => {
                      const selected = !profile.avatar && fallbackColor === g.id;
                      return (
                        <button
                          key={g.id}
                          onClick={() => handlePickColor(g.id)}
                          title={g.id}
                          className={`w-8 h-8 rounded-full bg-gradient-to-br ${g.gradient} flex items-center justify-center transition-all ${
                            selected ? 'ring-2 ring-offset-2 ring-slate-700 dark:ring-slate-200 scale-110' : 'hover:scale-110'
                          }`}
                        >
                          {selected && <Check size={14} className="text-white"/>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* About You */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-5 transition-colors duration-300">
            <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm mb-1 flex items-center gap-2">
              <User size={16}/> About You
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              A display name and a short bio make your space feel personal.
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Display Name</label>
                <input
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  onBlur={saveAbout}
                  onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                  placeholder={currentUser ?? 'Your username'}
                  className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 ring-accent dark:bg-slate-700 dark:text-slate-200"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Bio / Tagline</label>
                <textarea
                  value={bio}
                  onChange={e => setBio(e.target.value)}
                  onBlur={saveAbout}
                  rows={2}
                  placeholder="e.g. Chasing that A* — one pomodoro at a time"
                  className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 ring-accent dark:bg-slate-700 dark:text-slate-200 resize-none"
                />
              </div>
              <button onClick={saveAbout} className="btn-accent flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold hover:shadow-lg transition-all">
                <Check size={15}/> Save profile
              </button>
            </div>
          </div>

          {/* Profile Backup */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-5 transition-colors duration-300">
            <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm mb-1 flex items-center gap-2">
              <Download size={16}/> Profile Backup
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Export your profile (picture, display name, bio) to a file — handy for moving to another device.
            </p>
            <div className="flex flex-wrap gap-2">
              <button onClick={exportProfile} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all">
                <Download size={15}/> Export profile
              </button>
              <button onClick={() => importFileRef.current?.click()} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all">
                <Upload size={15}/> Import profile
              </button>
              <input
                ref={importFileRef}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={e => handleImportProfile(e.target.files?.[0])}
              />
            </div>
          </div>

          {/* Account */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-5 transition-colors duration-300">
            <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm mb-1 flex items-center gap-2">
              <ShieldCheck size={16}/> Account
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Your account lives on this device. Your username is permanent and can't be changed.
            </p>
            <div className="space-y-2.5 text-sm">
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-700/40 border border-slate-100 dark:border-slate-600/50">
                <div>
                  <div className="text-xs text-slate-400">Username</div>
                  <div className="font-semibold text-slate-800 dark:text-slate-100">{currentUser ?? '—'}</div>
                </div>
                <button onClick={handleCopyUsername} className="flex items-center gap-1 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-violet-600 dark:hover:text-violet-400 transition-colors">
                  <Copy size={13}/> Copy
                </button>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-700/40 border border-slate-100 dark:border-slate-600/50">
                <div>
                  <div className="text-xs text-slate-400">Member since</div>
                  <div className="font-semibold text-slate-800 dark:text-slate-100">
                    {memberSince ? memberSince.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '—'}
                  </div>
                </div>
                <Clock size={15} className="text-slate-400"/>
              </div>
            </div>

            <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-700">
              <h4 className="text-xs font-bold text-slate-600 dark:text-slate-300 mb-1 flex items-center gap-2">
                <KeyRound size={13}/> Change Password
              </h4>
              <p className="text-xs text-slate-400 dark:text-slate-500 mb-3">Keep your reserved username safe with a new password.</p>
              <div className="space-y-3">
                <input
                  type="password"
                  value={pwCurrent}
                  onChange={e => setPwCurrent(e.target.value)}
                  placeholder="Current password"
                  autoComplete="current-password"
                  className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 ring-accent dark:bg-slate-700 dark:text-slate-200"
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="password"
                    value={pwNew}
                    onChange={e => setPwNew(e.target.value)}
                    placeholder="New password (min 4 chars)"
                    autoComplete="new-password"
                    className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 ring-accent dark:bg-slate-700 dark:text-slate-200"
                  />
                  <input
                    type="password"
                    value={pwConfirm}
                    onChange={e => setPwConfirm(e.target.value)}
                    placeholder="Confirm new password"
                    autoComplete="new-password"
                    onKeyDown={e => { if (e.key === 'Enter') handleChangePassword(); }}
                    className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 ring-accent dark:bg-slate-700 dark:text-slate-200"
                  />
                </div>
                <button
                  onClick={handleChangePassword}
                  disabled={!pwCurrent || !pwNew || !pwConfirm}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-800 disabled:opacity-40 hover:scale-[1.02] transition-all"
                >
                  <KeyRound size={15}/> Update password
                </button>
              </div>
            </div>
          </div>

          {/* At a glance */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-5 transition-colors duration-300">
            <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm mb-1 flex items-center gap-2">
              <BarChart3 size={16}/> At a glance
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Everything saved so far under your username on this device.</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {insights.map(item => (
                <div key={item.label} className="rounded-xl bg-slate-50 dark:bg-slate-700/40 border border-slate-100 dark:border-slate-600/50 p-3 text-center">
                  <div className="text-2xl font-bold text-slate-800 dark:text-slate-100 tabular-nums">{item.value}</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-center gap-1 mt-0.5">
                    <span className="text-orange-500">{item.icon}</span> {item.label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Danger zone */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-red-100 dark:border-red-800/40 p-5 transition-colors duration-300">
            <h3 className="font-bold text-red-600 dark:text-red-400 text-sm mb-1 flex items-center gap-2">
              <UserX size={16}/> Delete Account
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Permanently remove <span className="font-semibold text-slate-700 dark:text-slate-300">{currentUser ?? 'your username'}</span> and every piece of data saved under it on this device. This cannot be undone.
            </p>
            <button
              onClick={() => setDeleteOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold bg-red-500 text-white hover:bg-red-600 hover:shadow-lg transition-all"
            >
              <Trash2 size={15}/> Delete account
            </button>
          </div>

          {/* Storage */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-5 transition-colors duration-300">
            <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm mb-1 flex items-center gap-2">
              <Info size={16}/> Storage
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Your profile uses about <span className="font-semibold text-slate-700 dark:text-slate-200">{profileStorageKb} KB</span> of local storage. Media files are kept in IndexedDB, which can hold much more.
            </p>
          </div>
        </div>
      )}

      {/* Appearance Tab */}
      {activeTab === 'appearance' && (
        <div className="space-y-6">
          {/* Accent Color */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-5 transition-colors duration-300">
            <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm mb-1 flex items-center gap-2">
              <Palette size={16}/> Accent Color
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Changes the app's primary color scheme</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {ACCENT_COLORS.map(accent => (
                <button key={accent.id} onClick={() => updateSettings({ accentColor: accent.id })}
                  className={`relative flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${
                    settings.accentColor === accent.id
                      ? 'border-slate-700 dark:border-slate-300 bg-slate-50 dark:bg-slate-700'
                      : 'border-transparent hover:border-slate-200 dark:hover:border-slate-600'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${accent.gradient} shadow-sm`}/>
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{accent.label}</span>
                  {settings.accentColor === accent.id && (
                    <span className="absolute top-1 right-1 w-3 h-3 rounded-full bg-green-400 border-2 border-white dark:border-slate-800"/>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Theme Toggle */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-5 transition-colors duration-300">
            <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm mb-1 flex items-center gap-2">
              <Monitor size={16}/> Theme
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Toggle between light and dark mode</p>
            <button onClick={toggleTheme}
              className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all w-full"
            >
              {theme === 'dark' ? (
                <Sun size={20} className="text-amber-400"/>
              ) : (
                <Moon size={20} className="text-slate-500"/>
              )}
              <div className="text-left">
                <div className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
                </div>
                <div className="text-xs text-slate-400">Currently active</div>
              </div>
              <span className="ml-auto text-xs text-slate-400">{theme === 'dark' ? '🌙' : '☀️'}</span>
            </button>
          </div>

          {/* Font Size */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-5 transition-colors duration-300">
            <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm mb-1 flex items-center gap-2">
              <Type size={16}/> Font Size
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Adjust text size throughout the app</p>
            <div className="grid grid-cols-3 gap-3">
              {FONT_SIZES.map(fs => (
                <button key={fs.id} onClick={() => updateSettings({ fontSize: fs.id })}
                  className={`p-3 rounded-xl border-2 text-center transition-all ${
                    settings.fontSize === fs.id
                      ? 'border-slate-700 dark:border-slate-300 bg-slate-50 dark:bg-slate-700'
                      : 'border-transparent hover:border-slate-200 dark:hover:border-slate-600'
                  }`}
                >
                  <div className="text-lg font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {fs.id === 'small' ? 'Aa' : fs.id === 'large' ? 'Aa' : 'Aa'}
                  </div>
                  <div className="text-xs font-medium text-slate-600 dark:text-slate-400">{fs.label}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{fs.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Border Radius */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-5 transition-colors duration-300">
            <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm mb-1 flex items-center gap-2">
              <Layout size={16}/> Border Radius
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">How rounded should cards and buttons be?</p>
            <div className="grid grid-cols-3 gap-3">
              {RADII.map(r => (
                <button key={r.id} onClick={() => updateSettings({ borderRadius: r.id })}
                  className={`p-3 rounded-xl border-2 text-center transition-all ${
                    settings.borderRadius === r.id
                      ? 'border-slate-700 dark:border-slate-300 bg-slate-50 dark:bg-slate-700'
                      : 'border-transparent hover:border-slate-200 dark:hover:border-slate-600'
                  }`}
                >
                  <div className={`h-8 w-16 mx-auto mb-2 bg-gradient-to-r from-violet-400 to-indigo-400 ${
                    r.id === 'small' ? 'rounded-md' : r.id === 'large' ? 'rounded-2xl' : 'rounded-xl'
                  }`}/>
                  <div className="text-xs font-medium text-slate-600 dark:text-slate-400">{r.label}</div>
                  <div className="text-xs text-slate-400">{r.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Card Density */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-5 transition-colors duration-300">
            <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm mb-1 flex items-center gap-2">
              <Layout size={16}/> Card Density
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Control spacing inside cards</p>
            <div className="grid grid-cols-2 gap-3">
              {DENSITIES.map(d => (
                <button key={d.id} onClick={() => updateSettings({ cardDensity: d.id })}
                  className={`p-4 rounded-xl border-2 text-center transition-all ${
                    settings.cardDensity === d.id
                      ? 'border-slate-700 dark:border-slate-300 bg-slate-50 dark:bg-slate-700'
                      : 'border-transparent hover:border-slate-200 dark:hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center gap-1 justify-center mb-2">
                    {[1,2,3].map(i => (
                      <div key={i} className={`rounded bg-slate-300 dark:bg-slate-600 ${
                        d.id === 'compact' ? 'h-3 w-6' : 'h-4 w-8'
                      }`}/>
                    ))}
                  </div>
                  <div className="text-sm font-medium text-slate-700 dark:text-slate-300">{d.label}</div>
                  <div className="text-xs text-slate-400">{d.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Glass Effect */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-5 transition-colors duration-300">
            <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm mb-1 flex items-center gap-2">
              <Eye size={16}/> Liquid Glass Effect
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Frosted glass style for modals, menus, and cards</p>
            <div className="flex items-center gap-4">
              <button onClick={() => updateSettings({ glassEffect: true })}
                className={`flex-1 p-4 rounded-xl border-2 text-center transition-all ${
                  settings.glassEffect
                    ? 'border-slate-700 dark:border-slate-300 bg-slate-50 dark:bg-slate-700'
                    : 'border-transparent hover:border-slate-200 dark:hover:border-slate-600'
                }`}
              >
                <div className="text-2xl mb-1">🪟</div>
                <div className="text-sm font-medium text-slate-700 dark:text-slate-300">On</div>
                <div className="text-xs text-slate-400">Glass effect active</div>
              </button>
              <button onClick={() => updateSettings({ glassEffect: false })}
                className={`flex-1 p-4 rounded-xl border-2 text-center transition-all ${
                  !settings.glassEffect
                    ? 'border-slate-700 dark:border-slate-300 bg-slate-50 dark:bg-slate-700'
                    : 'border-transparent hover:border-slate-200 dark:hover:border-slate-600'
                }`}
              >
                <div className="text-2xl mb-1">🗂️</div>
                <div className="text-sm font-medium text-slate-700 dark:text-slate-300">Off</div>
                <div className="text-xs text-slate-400">Solid backgrounds</div>
              </button>
            </div>
          </div>

          {/* Welcome Tour */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-5 transition-colors duration-300">
            <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm mb-1 flex items-center gap-2">
              <Sparkles size={16}/> Welcome Tour
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Replay the quick tour explaining your fresh dashboard and how your data stays private to your account</p>
            <button
              onClick={() => { onReplayTour?.(); addToast?.('info', 'Welcome tour is showing!'); }}
              className="btn-accent flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all"
            >
              <Play size={15}/> Replay Welcome Tour
            </button>
          </div>

          {/* App Info */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-5 transition-colors duration-300">
            <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm mb-1 flex items-center gap-2">
              <Settings size={16}/> App Info
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Personalize your study hub</p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">App Name</label>
                <input value={settings.appName} onChange={e => updateSettings({ appName: e.target.value })}
                  className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 ring-accent dark:bg-slate-700 dark:text-slate-200"/>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Grade / Class Info</label>
                <input value={settings.gradeInfo} onChange={e => updateSettings({ gradeInfo: e.target.value })}
                  className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 ring-accent dark:bg-slate-700 dark:text-slate-200"/>
              </div>
            </div>
          </div>

          {/* Reset Settings */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-5 transition-colors duration-300">
            <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm mb-1 flex items-center gap-2">
              <RotateCcw size={16}/> Reset Settings
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Restore appearance, dashboard and subject settings to their defaults.</p>
            <button
              onClick={handleResetSettings}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"
            >
              <RotateCcw size={15}/> Reset all settings
            </button>
          </div>
        </div>
      )}

      {/* Dashboard Tab */}
      {activeTab === 'dashboard' && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-5 transition-colors duration-300">
          <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm mb-1 flex items-center gap-2">
            <Layout size={16}/> Dashboard Widgets
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Show or hide sections on your Dashboard</p>
          <div className="space-y-3">
            {[
              { id: 'stats' as const, label: 'Statistics Cards', desc: 'Class sessions, subjects, notes, files count' },
              { id: 'quickActions' as const, label: 'Quick Access', desc: 'Shortcut buttons to all pages' },
              { id: 'todaySchedule' as const, label: "Today's Schedule", desc: 'Tuition classes and school periods for today' },
              { id: 'recentNotes' as const, label: 'Recent Notes', desc: 'Show the last 3 notes you created' },
            ].map(widget => (
              <div key={widget.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                <div>
                  <div className="text-sm font-medium text-slate-700 dark:text-slate-300">{widget.label}</div>
                  <div className="text-xs text-slate-400">{widget.desc}</div>
                </div>
                <button onClick={() => updateWidget(widget.id, !settings.dashboardWidgets[widget.id])}
                  className={`relative w-11 h-6 rounded-full transition-all ${
                    settings.dashboardWidgets[widget.id] ? 'bg-violet-500' : 'bg-slate-300 dark:bg-slate-600'
                  }`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${
                    settings.dashboardWidgets[widget.id] ? 'translate-x-5' : ''
                  }`}/>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Subjects Tab */}
      {activeTab === 'subjects' && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-5 transition-colors duration-300">
          <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm mb-1 flex items-center gap-2">
            <BookOpen size={16}/> Subjects & Colors
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Add custom subjects and assign colors</p>

          {/* Add subject */}
          <div className="flex gap-2 mb-4">
            <input value={newSubject} onChange={e => setNewSubject(e.target.value)}
              placeholder="New subject name..."
              className="flex-1 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 ring-accent dark:bg-slate-700 dark:text-slate-200"
              onKeyDown={e => { if (e.key === 'Enter') handleAddSubject(); }}
            />
            <button onClick={handleAddSubject} disabled={!newSubject.trim()}
              className="btn-accent flex items-center gap-1 px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-50 hover:shadow-lg transition-all"
            >
              <Plus size={15}/> Add
            </button>
          </div>

          {/* Subject list */}
          <div className="space-y-1.5 max-h-96 overflow-y-auto">
            {settings.customSubjects.map(subj => {
              const allColors = Object.keys(COLOR_DOTS);
              return (
                <div key={subj.name} className="flex items-center gap-2 p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors group">
                  <div className="flex gap-1">
                    {allColors.map(color => (
                      <button key={color} onClick={() => setCustomSubjectColor(subj.name, color)}
                        className={`w-5 h-5 rounded-full ${COLOR_DOTS[color]} border-2 transition-all ${
                          subj.color === color ? 'border-slate-700 dark:border-slate-200 scale-110' : 'border-transparent'
                        }`}
                        title={color}
                      />
                    ))}
                  </div>
                  <span className="flex-1 text-sm font-medium text-slate-700 dark:text-slate-300 ml-2">{subj.name}</span>
                  <button onClick={() => handleRemoveSubject(subj.name)}
                    className="p-1 opacity-0 group-hover:opacity-100 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-all"
                  >
                    <Trash2 size={14} className="text-red-400"/>
                  </button>
                </div>
              );
            })}
          </div>
          <div className="mt-3 text-xs text-slate-400 dark:text-slate-500">
            {settings.customSubjects.length} subjects · Default subjects cannot be removed
          </div>
        </div>
      )}

      {/* Camera capture modal */}
      {cameraOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={closeCamera}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm flex items-center gap-2">
                <Camera size={16}/> Take a picture
              </h3>
              <button onClick={closeCamera} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg" aria-label="Close">
                <X size={16} className="text-slate-500"/>
              </button>
            </div>
            <div className="p-4">
              {cameraError ? (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/30 rounded-xl p-3 flex items-start gap-2 text-xs text-red-600 dark:text-red-300">
                  <AlertTriangle size={14} className="flex-shrink-0 mt-0.5"/>
                  <span>{cameraError}</span>
                </div>
              ) : (
                <>
                  <div className="relative aspect-square rounded-xl overflow-hidden bg-black">
                    <video ref={cameraVideoRef} className="absolute inset-0 w-full h-full object-cover" playsInline muted />
                  </div>
                  <button
                    onClick={captureSelfie}
                    className="mt-4 w-full flex items-center justify-center gap-2 btn-accent py-2.5 rounded-xl text-sm font-bold shadow-lg hover:shadow-xl hover:scale-[1.01] transition-all"
                  >
                    <Camera size={16}/> Capture
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete account modal */}
      {deleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 dark:bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 max-w-sm w-full animate-scale-in">
            <div className="w-14 h-14 bg-red-50 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="text-red-400" size={24}/>
            </div>
            <h3 className="font-bold text-slate-800 dark:text-slate-100 text-center mb-2">Delete account?</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 text-center mb-4">
              This permanently removes <span className="font-semibold text-slate-700 dark:text-slate-300">{currentUser}</span> and all its data on this device. Type your username to confirm.
            </p>
            <input
              value={deleteConfirm}
              onChange={e => setDeleteConfirm(e.target.value)}
              placeholder={currentUser ?? ''}
              className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 ring-red-300 dark:bg-slate-700 dark:text-slate-200"
            />
            <div className="flex gap-2">
              <button
                onClick={() => { setDeleteOpen(false); setDeleteConfirm(''); }}
                className="flex-1 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 rounded-xl py-2.5 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleting || deleteConfirm.trim() !== currentUser}
                className="flex-1 bg-red-500 text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-red-600 disabled:opacity-40"
              >
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
