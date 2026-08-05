import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import type { PointerEvent as ReactPointerEvent, DragEvent as ReactDragEvent, SyntheticEvent } from 'react';
import {
  Clapperboard, Play, Pause, SkipBack, SkipForward, Square, Volume1, Volume2, VolumeX,
  Maximize, Minimize, Gauge, Repeat, Repeat1, Shuffle, ListMusic, Music, Film, Info,
  PictureInPicture2, Upload, Trash2, X, Loader2, AlertCircle, Plus, Check, Moon, Repeat2, Image as ImageIcon,
  Heart, Search, ArrowUpDown, SlidersHorizontal, GripVertical, GripHorizontal, Camera, Clock, Tv, RectangleHorizontal,
} from 'lucide-react';
import IptvPlayer from './IptvPlayer';
import {
  listMedia, addMedia, getMediaBlob, deleteMedia, clearMedia, updateMedia, genId,
  type MediaItem, type MediaKind,
} from '../services/mediaStore';
import { useToast } from '../contexts/ToastContext';

const VOLUME_KEY = 'ss-media-volume';
const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];

const AUDIO_EXT = new Set(['mp3', 'wav', 'm4a', 'aac', 'flac', 'ogg', 'oga', 'opus', 'weba']);
const VIDEO_EXT = new Set(['mp4', 'webm', 'mkv', 'mov', 'm4v', 'avi', 'ogv', 'ogm']);
const IMAGE_EXT = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'avif', 'svg', 'heic', 'heif']);

const SHORTCUTS: Array<[string, string]> = [
  ['Space', 'Play / Pause'],
  ['← / →', 'Seek ±10 sec'],
  ['Shift + ← / →', 'Seek ±60 sec'],
  ['↑ / ↓', 'Volume up / down'],
  ['M', 'Mute / unmute'],
  ['F', 'Fullscreen'],
  ['C', 'Cinema mode'],
  ['N / P', 'Next / previous track'],
  ['0 – 9', 'Jump to 10% – 90%'],
];

const SLEEP_OPTIONS: Array<{ label: string; minutes: number | 'end' }> = [
  { label: '10 min', minutes: 10 },
  { label: '15 min', minutes: 15 },
  { label: '30 min', minutes: 30 },
  { label: '45 min', minutes: 45 },
  { label: '60 min', minutes: 60 },
  { label: '90 min', minutes: 90 },
  { label: '120 min', minutes: 120 },
  { label: 'End of track', minutes: 'end' },
];

const SORT_KEY = 'ss-media-sort';
const EQ_KEY = 'ss-media-eq';
const CINEMA_KEY = 'ss-media-cinema';
const PREVIEW_H_KEY = 'ss-media-preview-h';

type SortKey = 'list' | 'name' | 'date' | 'duration' | 'kind';

const SORT_OPTIONS: Array<{ value: SortKey; label: string }> = [
  { value: 'list', label: 'Playlist order' },
  { value: 'name', label: 'Name' },
  { value: 'date', label: 'Date added' },
  { value: 'duration', label: 'Duration' },
  { value: 'kind', label: 'Type' },
];

// 9-band equalizer (60 Hz → 16 kHz).
const EQ_BANDS = [60, 170, 310, 600, 1000, 3000, 6000, 12000, 16000];
const EQ_PRESETS: Record<string, number[]> = {
  flat: [0, 0, 0, 0, 0, 0, 0, 0, 0],
  'bass boost': [6, 4, 2, 0.5, 0, 0, 0, 0, 0],
  treble: [0, 0, 0, 0, 0, 1, 3, 5, 6],
  vocal: [-1, 0, 2, 4, 4, 3, 1, 0, -1],
  dance: [6, 4, 1, 0, 1, 3, 5, 3, 0],
  electronic: [5, 3, 0, -1, 2, 0, 3, 5, 4],
  soft: [-2, 0, 1, 2, 3, 2, 1, -1, -3],
};
const EQ_PRESET_LABELS: Array<{ value: string; label: string }> = [
  { value: 'flat', label: 'Flat' },
  { value: 'bass boost', label: 'Bass Boost' },
  { value: 'treble', label: 'Treble' },
  { value: 'vocal', label: 'Vocal' },
  { value: 'dance', label: 'Dance' },
  { value: 'electronic', label: 'Electronic' },
  { value: 'soft', label: 'Soft' },
];

function formatTime(sec: number): string {
  if (!isFinite(sec) || sec < 0) return '0:00';
  const s = Math.floor(sec % 60);
  const m = Math.floor((sec / 60) % 60);
  const h = Math.floor(sec / 3600);
  const ss = s < 10 ? '0' + s : '' + s;
  const mm = h > 0 && m < 10 ? '0' + m : '' + m;
  return h > 0 ? `${h}:${mm}:${ss}` : `${m}:${ss}`;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
}

function extOf(name: string): string {
  return name.split('.').pop()?.toLowerCase() ?? '';
}

function detectKind(type: string, name: string): MediaKind {
  if (type.startsWith('image/')) return 'image';
  if (type.startsWith('audio/')) return 'audio';
  if (type.startsWith('video/')) return 'video';
  const ext = extOf(name);
  if (AUDIO_EXT.has(ext)) return 'audio';
  if (IMAGE_EXT.has(ext)) return 'image';
  return 'video';
}

const CONTROL_BTN =
  'p-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors flex items-center gap-1';

export default function MediaPlayer() {
  const { addToast } = useToast();

  const [items, setItems] = useState<MediaItem[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [volume, setVolume] = useState(() => {
    try {
      const v = Number(localStorage.getItem(VOLUME_KEY) ?? 1);
      return isFinite(v) && v >= 0 && v <= 1 ? v : 1;
    } catch {
      return 1;
    }
  });
  const [muted, setMuted] = useState(false);
  const [rate, setRate] = useState(1);
  const [repeat, setRepeat] = useState<'off' | 'all' | 'one'>('off');
  const [shuffle, setShuffle] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [seeking, setSeeking] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [showSpeed, setShowSpeed] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [clearConfirm, setClearConfirm] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [analyserReady, setAnalyserReady] = useState(false);

  // Sleep timer (VLC-style)
  const [sleepEndsAt, setSleepEndsAt] = useState<number | null>(null);
  const [sleepRemaining, setSleepRemaining] = useState(0);
  const [sleepEndOfTrack, setSleepEndOfTrack] = useState(false);
  const [showSleep, setShowSleep] = useState(false);

  // A–B repeat loop (VLC-style)
  const [ab, setAb] = useState<{ a: number | null; b: number | null }>({ a: null, b: null });

  // Library / Live TV tabs
  const [tab, setTab] = useState<'library' | 'live'>('library');

  // Cinema (theater) mode — makes the video preview extra tall while playing.
  const [cinema, setCinema] = useState(() => {
    try { return localStorage.getItem(CINEMA_KEY) === '1'; } catch { return false; }
  });

  // Manually resized preview height (px). null = automatic 16:9 widescreen.
  const [previewH, setPreviewH] = useState<number | null>(() => {
    // Widescreen default: a stale dragged preview height (or a stuck cinema
    // mode) from an earlier version made the preview render square — reset once.
    try {
      if (!localStorage.getItem('ss-media-ws')) {
        localStorage.setItem('ss-media-ws', '1');
        localStorage.removeItem(PREVIEW_H_KEY);
        localStorage.removeItem(CINEMA_KEY);
      }
    } catch { /* ignore */ }
    return null;
  });
  const resizeDrag = useRef({ startY: 0, startH: 0, active: false });

  // Playlist tools: search, favourites filter, sorting (persisted)
  const [query, setQuery] = useState('');
  const [favOnly, setFavOnly] = useState(false);
  const [sortBy, setSortBy] = useState<SortKey>(() => {
    try {
      const s = localStorage.getItem(SORT_KEY) as SortKey | null;
      return s && SORT_OPTIONS.some(o => o.value === s) ? s : 'list';
    } catch {
      return 'list';
    }
  });
  const [showSort, setShowSort] = useState(false);
  // Drag-to-reorder tracks items by id so it stays correct under filter/sort.
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  // Equalizer preset (Web Audio)
  const [eqPreset, setEqPreset] = useState<string>(() => {
    try {
      const s = localStorage.getItem(EQ_KEY);
      return s && EQ_PRESETS[s] ? s : 'flat';
    } catch {
      return 'flat';
    }
  });
  const [showEq, setShowEq] = useState(false);

  // Jump-to-time input
  const [editingTime, setEditingTime] = useState(false);
  const [timeInput, setTimeInput] = useState('');

  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const playerRef = useRef<HTMLDivElement>(null);
  const seekBarRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number>(0);
  const freqRef = useRef<Uint8Array<ArrayBuffer>>(new Uint8Array(0));
  const hideTimer = useRef<number>(0);
  const dragDepth = useRef(0);
  const urlsRef = useRef<Record<string, string>>({});
  const eqFiltersRef = useRef<BiquadFilterNode[]>([]);
  const eqPresetRef = useRef(eqPreset);
  const resumePendingRef = useRef<{ id: string; position: number } | null>(null);
  const lastPositionSaveRef = useRef(0);
  const lastPlayCountRef = useRef(0);

  const current = items.find(i => i.id === currentId) ?? null;

  // ---- Playlist tools: search, favourites filter, sorting ----
  const favCount = items.filter(i => i.favorite).length;
  const sortedItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = items.filter(it =>
      (!favOnly || it.favorite) &&
      (!q || it.name.toLowerCase().includes(q)));
    switch (sortBy) {
      case 'name':
        list = [...list].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
        break;
      case 'date':
        list = [...list].sort((a, b) => Date.parse(b.addedAt) - Date.parse(a.addedAt));
        break;
      case 'duration':
        list = [...list].sort((a, b) => (a.duration ?? Infinity) - (b.duration ?? Infinity));
        break;
      case 'kind':
        list = [...list].sort((a, b) => a.kind.localeCompare(b.kind) || a.name.localeCompare(b.name));
        break;
      default: break; // 'list' — keep manual order
    }
    return list;
  }, [items, query, favOnly, sortBy]);

  // Next/previous navigation follows the currently visible (filtered) list when possible.
  const navItems = sortedItems.length > 0 && sortedItems.some(i => i.id === currentId) ? sortedItems : items;

  const getActiveMedia = useCallback((): HTMLMediaElement | null => {
    const cur = items.find(i => i.id === currentId);
    if (!cur) return null;
    return cur.kind === 'video' ? videoRef.current : cur.kind === 'audio' ? audioRef.current : null;
  }, [items, currentId]);

  // ---- Visualizer (Web Audio analyser → canvas bars) ----
  const stopVisualizer = useCallback(() => {
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = 0; }
  }, []);

  const startVisualizer = useCallback(() => {
    const el = audioRef.current;
    if (!el) return;
    if (!audioCtxRef.current) {
      const Ctor = window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return; // No Web Audio support — CSS bars stay visible.
      try {
        const ctx = new Ctor();
        const src = ctx.createMediaElementSource(el);
        const an = ctx.createAnalyser();
        an.fftSize = 256;
        an.smoothingTimeConstant = 0.82;
        src.connect(an);
        // Equalizer chain between the analyser and the speakers.
        const filters = EQ_BANDS.map(freq => {
          const f = ctx.createBiquadFilter();
          f.type = 'peaking';
          f.frequency.value = freq;
          f.Q.value = 1;
          f.gain.value = 0;
          return f;
        });
        an.connect(filters[0]);
        for (let i = 0; i < filters.length - 1; i++) filters[i].connect(filters[i + 1]);
        filters[filters.length - 1].connect(ctx.destination);
        eqFiltersRef.current = filters;
        audioCtxRef.current = ctx;
        analyserRef.current = an;
        freqRef.current = new Uint8Array(an.frequencyBinCount);
        setAnalyserReady(true);
        // Apply the currently selected preset.
        const gains = EQ_PRESETS[eqPresetRef.current] ?? EQ_PRESETS.flat;
        filters.forEach((f, i) => { f.gain.value = gains[i] ?? 0; });
      } catch {
        return;
      }
    }
    audioCtxRef.current.resume().catch(() => {});
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    const draw = () => {
      rafRef.current = requestAnimationFrame(draw);
      const an = analyserRef.current;
      const canvas = canvasRef.current;
      if (!an || !canvas) return;
      an.getByteFrequencyData(freqRef.current);
      const c = canvas.getContext('2d');
      if (!c) return;
      const W = canvas.width;
      const H = canvas.height;
      c.clearRect(0, 0, W, H);
      const bars = 56;
      const gap = 4;
      const bw = (W - gap * (bars - 1)) / bars;
      const data = freqRef.current;
      c.shadowColor = 'rgba(255, 136, 0, 0.45)';
      c.shadowBlur = 10;
      for (let i = 0; i < bars; i++) {
        const v = data[Math.floor((i / bars) * data.length)] / 255;
        const bh = Math.max(4, v * H * 0.94);
        const x = i * (bw + gap);
        const y = H - bh;
        const grad = c.createLinearGradient(0, y, 0, H);
        grad.addColorStop(0, '#ffb347');
        grad.addColorStop(1, '#ff6a00');
        c.fillStyle = grad;
        const r = Math.min(bw / 2, 5);
        c.beginPath();
        c.moveTo(x + r, y);
        c.arcTo(x + bw, y, x + bw, y + bh, r);
        c.arcTo(x + bw, y + bh, x, y + bh, r);
        c.arcTo(x, y + bh, x, y, r);
        c.arcTo(x, y, x + bw, y, r);
        c.closePath();
        c.fill();
      }
      c.shadowBlur = 0;
    };
    draw();
  }, []);

  // ---- Library load / cleanup ----
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const media = await listMedia();
        if (cancelled) return;
        const map: Record<string, string> = {};
        for (const m of media) {
          const blob = await getMediaBlob(m.id);
          if (blob) map[m.id] = URL.createObjectURL(blob);
        }
        if (cancelled) { Object.values(map).forEach(URL.revokeObjectURL); return; }
        // Order by saved playlist position; migrate legacy items on first load.
        const sorted = [...media].sort((a, b) =>
          (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER));
        if (sorted.some(m => m.order === undefined)) {
          sorted.forEach((m, i) => { if (m.order === undefined) updateMedia({ ...m, order: i }).catch(() => {}); });
        }
        setItems(sorted);
        setUrls(map);
        if (sorted.length > 0) setCurrentId(sorted[0].id);
      } catch {
        if (!cancelled) setError('Could not load your media library.');
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => { urlsRef.current = urls; }, [urls]);

  useEffect(() => () => {
    window.clearTimeout(hideTimer.current);
    cancelAnimationFrame(rafRef.current);
    audioCtxRef.current?.close().catch(() => {});
    Object.values(urlsRef.current).forEach(URL.revokeObjectURL);
  }, []);

  // ---- Loading a track into the active media element ----
  useEffect(() => {
    if (!currentId) return;
    const cur = items.find(i => i.id === currentId);
    const url = urls[currentId];
    const active = getActiveMedia();

    if (cur?.kind === 'image') {
      const video = videoRef.current;
      const audio = audioRef.current;
      if (video && !video.paused) video.pause();
      if (audio && !audio.paused) audio.pause();
      stopVisualizer();
      setPlaying(false);
      setLoading(false);
      setCurrentTime(0);
      setDuration(0);
      setBuffered(0);
      return;
    }

    if (!url || !active) return;
    // Only one track at a time: pause whichever element is not the active one.
    const video = videoRef.current;
    const audio = audioRef.current;
    if (video && video !== active && !video.paused) video.pause();
    if (audio && audio !== active && !audio.paused) audio.pause();
    if (active.currentSrc !== url) {
      active.src = url;
      active.load();
      setLoading(true);
    }
    if (playing) {
      const p = active.play();
      if (p) p.catch(() => {});
    }
  }, [currentId, urls, playing, getActiveMedia]);

  // ---- Volume / rate sync ----
  useEffect(() => {
    const el = getActiveMedia();
    if (el) { el.volume = volume; el.muted = muted; }
    try { localStorage.setItem(VOLUME_KEY, String(volume)); } catch { /* ignore */ }
  }, [volume, muted, getActiveMedia]);

  useEffect(() => {
    const el = getActiveMedia();
    if (el) el.playbackRate = rate;
  }, [rate, getActiveMedia]);

  // Suspend the audio graph while a video is active.
  useEffect(() => {
    const cur = items.find(i => i.id === currentId);
    if (cur?.kind === 'video') {
      stopVisualizer();
      audioCtxRef.current?.suspend().catch(() => {});
    }
  }, [currentId, items, stopVisualizer]);

  // ---- Canvas sizing ----
  useEffect(() => {
    const canvas = canvasRef.current;
    const parent = canvas?.parentElement;
    if (!canvas || !parent) return;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(100, Math.round(parent.clientWidth * dpr));
      canvas.height = Math.max(100, Math.round(parent.clientHeight * dpr));
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(parent);
    return () => ro.disconnect();
  }, [currentId, analyserReady]);

  // ---- Fullscreen tracking ----
  useEffect(() => {
    const onFs = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);

  // Show controls when paused; auto-hide handled by poke().
  useEffect(() => {
    if (!playing) { setControlsVisible(true); window.clearTimeout(hideTimer.current); }
  }, [playing]);

  // Close info modal with Escape.
  useEffect(() => {
    if (!showInfo) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowInfo(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showInfo]);

  // Sleep timer countdown — stops playback when the deadline is reached.
  useEffect(() => {
    if (sleepEndsAt === null) { setSleepRemaining(0); return; }
    const tick = () => {
      const rem = sleepEndsAt - Date.now();
      if (rem <= 0) {
        const el = getActiveMedia();
        // Only stop/reset when something is actually playing — otherwise a
        // paused track's position would be silently wiped for no reason.
        if (el && !el.paused) {
          el.pause();
          el.currentTime = 0;
          setCurrentTime(0);
          addToast('info', 'Sleep timer finished — playback stopped');
        }
        setSleepEndsAt(null);
      } else {
        setSleepRemaining(rem);
      }
    };
    tick();
    const iv = window.setInterval(tick, 1000);
    return () => window.clearInterval(iv);
  }, [sleepEndsAt, getActiveMedia, addToast]);

  // A–B points are per-track — clear them when the track changes.
  useEffect(() => { setAb({ a: null, b: null }); }, [currentId]);

  // ---- Actions ----
  const togglePlay = useCallback(() => {
    if (current?.kind === 'image') return;
    const el = getActiveMedia();
    if (!el || !currentId) return;
    if (el.paused) el.play().catch(() => {});
    else el.pause();
  }, [current, currentId, getActiveMedia]);

  const setVolumeValue = useCallback((v: number) => {
    setVolume(Math.min(1, Math.max(0, v)));
    setMuted(false);
  }, []);

  const toggleMute = useCallback(() => setMuted(m => !m), []);

  const toggleFullscreen = useCallback(() => {
    const node = playerRef.current;
    if (!node) return;
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else node.requestFullscreen?.().catch(() => {});
  }, []);

  const togglePip = useCallback(async () => {
    const v = videoRef.current;
    if (!v || current?.kind !== 'video') return;
    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture();
      else if (v.requestPictureInPicture) await v.requestPictureInPicture();
    } catch {
      /* unsupported — ignore */
    }
  }, [current]);

  const playItem = useCallback((id: string) => {
    const item = items.find(i => i.id === id);
    if (item?.kind === 'image') {
      setCurrentId(id);
      setPlaying(false);
      return;
    }
    if (id === currentId) {
      const el = getActiveMedia();
      if (el) el.play().catch(() => {});
      return;
    }
    // Remember a resume point when switching to a partially-watched track.
    // Store the track id too, so a rapid switch before metadata loads can't
    // apply the stale resume point to a different track.
    if (item && item.lastPosition && item.lastPosition > 15) {
      resumePendingRef.current = { id: item.id, position: item.lastPosition };
    }
    setCurrentId(id);
    setPlaying(true);
  }, [items, currentId, getActiveMedia]);

  const goNext = useCallback(() => {
    if (!navItems.length || !currentId) return;
    if (shuffle) {
      let next = Math.floor(Math.random() * navItems.length);
      if (navItems.length > 1 && navItems[next].id === currentId) next = (next + 1) % navItems.length;
      playItem(navItems[next].id);
      return;
    }
    const idx = navItems.findIndex(i => i.id === currentId);
    playItem(navItems[(idx + 1) % navItems.length].id);
  }, [navItems, shuffle, currentId, playItem]);

  const goPrev = useCallback(() => {
    if (!navItems.length || !currentId) return;
    if (shuffle) {
      let next = Math.floor(Math.random() * navItems.length);
      if (navItems.length > 1 && navItems[next].id === currentId) next = (next + 1) % navItems.length;
      playItem(navItems[next].id);
      return;
    }
    const idx = navItems.findIndex(i => i.id === currentId);
    playItem(navItems[(idx - 1 + navItems.length) % navItems.length].id);
  }, [navItems, shuffle, currentId, playItem]);

  const stop = useCallback(() => {
    const el = getActiveMedia();
    if (!el) return;
    el.pause();
    el.currentTime = 0;
    setCurrentTime(0);
  }, [getActiveMedia]);

  const setSleep = (minutes: number | 'end') => {
    setShowSleep(false);
    if (minutes === 'end') {
      setSleepEndsAt(null);
      setSleepEndOfTrack(true);
      addToast('info', 'Sleep timer set — will stop at the end of this track');
    } else {
      setSleepEndOfTrack(false);
      setSleepEndsAt(Date.now() + minutes * 60_000);
      addToast('info', `Sleep timer set for ${minutes} minute${minutes === 1 ? '' : 's'}`);
    }
  };

  const cancelSleep = () => {
    setShowSleep(false);
    setSleepEndsAt(null);
    setSleepEndOfTrack(false);
    addToast('info', 'Sleep timer cancelled');
  };

  const cycleAb = () => {
    const el = getActiveMedia();
    if (!el || !el.duration) return;
    const t = el.currentTime;
    if (ab.a === null) {
      setAb({ a: t, b: null });
      addToast('info', `Point A set at ${formatTime(t)} — play to the loop end, then click A–B again`);
    } else if (ab.b === null) {
      if (t <= ab.a + 0.5) {
        // B must come after A — treat this as moving point A instead.
        setAb({ a: t, b: null });
        addToast('info', 'Point A updated');
        return;
      }
      setAb({ a: ab.a, b: t });
      addToast('success', `A–B loop set: ${formatTime(ab.a)} → ${formatTime(t)}`);
    } else {
      setAb({ a: null, b: null });
      addToast('info', 'A–B loop cleared');
    }
  };

  // Double-click toggles fullscreen, so suppress the play/pause flicker from
  // the two underlying single clicks.
  const lastClickRef = useRef(0);
  const handleVideoClick = () => {
    const now = Date.now();
    if (now - lastClickRef.current < 300) return; // part of a double-click
    lastClickRef.current = now;
    togglePlay();
  };

  // ---- Media element events ----
  const handleLoadedMetadata = (e: SyntheticEvent<HTMLMediaElement>) => {
    const el = e.currentTarget;
    setDuration(el.duration || 0);
    setLoading(false);
    // Resume from a saved position — only when the pending resume point
    // actually belongs to the track that just loaded.
    const pending = resumePendingRef.current;
    if (pending) {
      resumePendingRef.current = null;
      if (pending.id === currentId) {
        const resumeAt = pending.position;
        if (isFinite(el.duration) && el.duration > resumeAt + 15) {
          el.currentTime = resumeAt;
          setCurrentTime(resumeAt);
          addToast('info', `Resumed at ${formatTime(resumeAt)}`);
        }
      }
    }
    if (currentId && isFinite(el.duration) && el.duration > 0) {
      setItems(prev => prev.map(it => it.id === currentId ? { ...it, duration: it.duration || el.duration } : it));
      // Persist the discovered duration so it survives a reload.
      const item = items.find(it => it.id === currentId);
      if (item && !item.duration) {
        updateMedia({ ...item, duration: el.duration }).catch(() => {});
      }
    }
  };

  const handleTimeUpdate = () => {
    const el = getActiveMedia();
    if (!el) return;
    // A–B loop: jump back to A once we reach B.
    if (ab.a !== null && ab.b !== null && el.currentTime >= ab.b) {
      el.currentTime = ab.a;
    }
    const t = el.currentTime;
    setCurrentTime(t);
    setDuration(el.duration || 0);
    // Persist a resume point roughly every 5 s (once the track is underway).
    if (current && t > 5 && el.duration && el.duration - t > 5 &&
        Date.now() - lastPositionSaveRef.current > 5000) {
      lastPositionSaveRef.current = Date.now();
      const updated = { ...current, lastPosition: t };
      setItems(prev => prev.map(it => it.id === current.id ? updated : it));
      updateMedia(updated).catch(() => {});
    }
  };

  const handleProgress = () => {
    const el = getActiveMedia();
    if (!el) return;
    try {
      const b = el.buffered;
      if (b.length > 0) setBuffered(b.end(b.length - 1));
    } catch {
      /* ignore */
    }
  };

  const handleEnded = () => {
    stopVisualizer();
    // The track finished naturally — clear its resume point.
    if (current) {
      const updated = { ...current, lastPosition: 0 };
      setItems(prev => prev.map(it => it.id === current.id ? updated : it));
      updateMedia(updated).catch(() => {});
    }
    // Sleep timer: stop at the end of the current track.
    if (sleepEndOfTrack) {
      const el = getActiveMedia();
      if (el) el.currentTime = 0;
      setSleepEndOfTrack(false);
      setPlaying(false);
      addToast('info', 'Sleep timer: end of track reached — playback stopped');
      return;
    }
    // A–B loop at the natural end of the file.
    if (ab.a !== null && ab.b !== null) {
      const el = getActiveMedia();
      if (el) { el.currentTime = ab.a; el.play().catch(() => {}); }
      return;
    }
    if (repeat === 'one') {
      const el = getActiveMedia();
      if (el) { el.currentTime = 0; el.play().catch(() => {}); }
      return;
    }
    if (!navItems.length || !currentId) { setPlaying(false); return; }
    if (shuffle) {
      let next = Math.floor(Math.random() * navItems.length);
      if (navItems.length > 1 && navItems[next].id === currentId) next = (next + 1) % navItems.length;
      setCurrentId(navItems[next].id);
      return;
    }
    const idx = navItems.findIndex(i => i.id === currentId);
    if (idx < navItems.length - 1) { setCurrentId(navItems[idx + 1].id); return; }
    if (repeat === 'all') { setCurrentId(navItems[0].id); return; }
    const el = getActiveMedia();
    if (el) el.currentTime = 0;
    setPlaying(false);
    setCurrentTime(0);
  };

  const mediaEvents = {
    onPlay: () => {
      setPlaying(true);
      if (current?.kind === 'audio') startVisualizer();
      // Play statistics (throttled to avoid double-counting within 2 s).
      const now = Date.now();
      if (current && now - lastPlayCountRef.current > 2000) {
        lastPlayCountRef.current = now;
        const updated = { ...current, plays: (current.plays ?? 0) + 1, lastPlayedAt: new Date().toISOString() };
        setItems(prev => prev.map(it => it.id === current.id ? updated : it));
        updateMedia(updated).catch(() => {});
      }
    },
    onPause: (e: SyntheticEvent<HTMLMediaElement>) => {
      stopVisualizer();
      // Ignore pauses of the inactive element when switching tracks.
      if (getActiveMedia() === e.currentTarget) setPlaying(false);
    },
    onTimeUpdate: handleTimeUpdate,
    onLoadedMetadata: handleLoadedMetadata,
    onProgress: handleProgress,
    onWaiting: () => setLoading(true),
    onPlaying: () => setLoading(false),
    onEnded: handleEnded,
    onError: () => {
      stopVisualizer();
      setLoading(false);
      setPlaying(false);
      setError(`Could not play "${current?.name ?? 'this file'}" — the format or codec may not be supported by your browser.`);
    },
  };

  // ---- Seek bar ----
  const seekToClientX = (clientX: number) => {
    const bar = seekBarRef.current;
    const el = getActiveMedia();
    if (!bar || !el || !el.duration) return;
    const rect = bar.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    el.currentTime = ratio * el.duration;
    setCurrentTime(el.currentTime);
  };
  const handleSeekDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setSeeking(true);
    seekToClientX(e.clientX);
  };
  const handleSeekMove = (e: ReactPointerEvent<HTMLDivElement>) => { if (seeking) seekToClientX(e.clientX); };
  const handleSeekUp = () => setSeeking(false);

  // ---- Library mutations ----
  const handleAddFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList);
    const added: MediaItem[] = [];
    const newUrls: Record<string, string> = {};
    let firstId: string | null = null;
    let skipped = 0;
    for (const f of files) {
      const kind = detectKind(f.type, f.name);
      if (!f.type.startsWith('audio/') && !f.type.startsWith('video/') && !f.type.startsWith('image/') &&
        !AUDIO_EXT.has(extOf(f.name)) && !VIDEO_EXT.has(extOf(f.name)) && !IMAGE_EXT.has(extOf(f.name))) {
        skipped++;
        continue;
      }
      const id = genId();
      const item: MediaItem = {
        id, name: f.name, type: f.type || 'application/octet-stream', size: f.size,
        addedAt: new Date().toISOString(), kind,
      };
      try {
        await addMedia(item, f); // File is a Blob — store directly.
        newUrls[id] = URL.createObjectURL(f);
        added.push(item);
        if (!firstId) firstId = id;
      } catch {
        skipped++;
      }
    }
    if (added.length > 0) {
      setItems(prev => [...prev, ...added]);
      setUrls(prev => ({ ...prev, ...newUrls }));
      setCurrentId(firstId);
      setPlaying(added[0].kind !== 'image');
      addToast('success', `Added ${added.length} media file${added.length === 1 ? '' : 's'} to your library`);
    }
    if (skipped > 0) addToast('info', `${skipped} file${skipped === 1 ? '' : 's'} skipped — not audio, video, or image files`);
    if (fileRef.current) fileRef.current.value = '';
  };

  const removeItem = async (id: string) => {
    const item = items.find(i => i.id === id);
    try { await deleteMedia(id); } catch { /* ignore */ }
    const url = urls[id];
    if (url) URL.revokeObjectURL(url);
    const remaining = items.filter(i => i.id !== id);
    const nextUrls = { ...urls };
    delete nextUrls[id];
    setUrls(nextUrls);
    if (id === currentId) {
      if (remaining.length > 0) {
        const idx = items.findIndex(i => i.id === id);
        setCurrentId(remaining[Math.min(idx, remaining.length - 1)].id);
      } else {
        setCurrentId(null);
        setPlaying(false);
        setCurrentTime(0);
        setDuration(0);
        setBuffered(0);
      }
    }
    setItems(remaining);
    addToast('info', `Removed "${item?.name ?? 'file'}"`);
  };

  const handleClearAll = async () => {
    try { await clearMedia(); } catch { /* ignore */ }
    Object.values(urls).forEach(URL.revokeObjectURL);
    setItems([]);
    setUrls({});
    setCurrentId(null);
    setPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setBuffered(0);
    setClearConfirm(false);
    stopVisualizer();
    audioCtxRef.current?.suspend().catch(() => {});
    addToast('info', 'Playlist cleared');
  };

  // ---- Drag & drop (library mode only — Live TV has its own drag surface) ----
  const handleDragEnter = (e: React.DragEvent) => {
    if (tab !== 'library') return;
    e.preventDefault();
    dragDepth.current++;
    setDragOver(true);
  };
  const handleDragLeave = (e: React.DragEvent) => {
    if (tab !== 'library') return;
    e.preventDefault();
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setDragOver(false);
  };
  const handleDrop = (e: React.DragEvent) => {
    if (tab !== 'library') return;
    e.preventDefault();
    dragDepth.current = 0;
    setDragOver(false);
    handleAddFiles(e.dataTransfer.files);
  };

  // ---- Favourites ----
  const toggleFavorite = (id: string) => {
    const item = items.find(i => i.id === id);
    if (!item) return;
    const updated = { ...item, favorite: !item.favorite };
    setItems(prev => prev.map(it => it.id === id ? updated : it));
    updateMedia(updated).catch(() => {});
    addToast('info', updated.favorite
      ? `Added "${item.name}" to favourites`
      : `Removed "${item.name}" from favourites`);
  };

  // ---- Playlist reordering (drag & drop) ----
  const handleRowDragStart = (e: ReactDragEvent, id: string) => {
    setDragId(id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
  };
  const handleRowDragOver = (e: ReactDragEvent, id: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (overId !== id) setOverId(id);
  };
  const handleRowDrop = (e: ReactDragEvent, targetId: string) => {
    e.preventDefault();
    const fromId = dragId ?? e.dataTransfer.getData('text/plain');
    setDragId(null);
    setOverId(null);
    if (!fromId || !targetId || fromId === targetId) return;
    const from = items.findIndex(i => i.id === fromId);
    const target = items.findIndex(i => i.id === targetId);
    if (from < 0 || target < 0 || from === target) return;
    const next = [...items];
    const [moved] = next.splice(from, 1);
    if (!moved) return;
    next.splice(target, 0, moved);
    // Persist the new playlist order.
    next.forEach((it, i) => { if (it.order !== i) updateMedia({ ...it, order: i }).catch(() => {}); });
    setItems(next.map((it, i) => ({ ...it, order: i })));
  };
  const handleRowDragEnd = () => { setDragId(null); setOverId(null); };

  // ---- Sorting ----
  const changeSort = (value: SortKey) => { setSortBy(value); setShowSort(false); };
  useEffect(() => { try { localStorage.setItem(SORT_KEY, sortBy); } catch { /* ignore */ } }, [sortBy]);

  // ---- Equalizer ----
  useEffect(() => { eqPresetRef.current = eqPreset; }, [eqPreset]);
  const setEqPresetValue = useCallback((preset: string) => {
    setEqPreset(preset);
    try { localStorage.setItem(EQ_KEY, preset); } catch { /* ignore */ }
    const gains = EQ_PRESETS[preset] ?? EQ_PRESETS.flat;
    const t = audioCtxRef.current?.currentTime ?? 0;
    eqFiltersRef.current.forEach((f, i) => { f.gain.setTargetAtTime(gains[i] ?? 0, t, 0.05); });
  }, []);

  // ---- Video snapshot ----
  const captureSnapshot = () => {
    const v = videoRef.current;
    if (!v || current?.kind !== 'video') return;
    try {
      const canvas = document.createElement('canvas');
      canvas.width = v.videoWidth;
      canvas.height = v.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx || !canvas.width || !canvas.height) { addToast('error', 'No video frame to capture yet'); return; }
      ctx.drawImage(v, 0, 0);
      const base = (current.name || 'snapshot').replace(/\.[^.]+$/, '');
      canvas.toBlob(blob => {
        if (!blob) { addToast('error', 'Could not capture a snapshot'); return; }
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${base}-snapshot.png`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 2000);
      }, 'image/png');
      addToast('success', 'Snapshot saved as PNG');
    } catch {
      addToast('error', 'Could not capture a snapshot');
    }
  };

  // ---- Jump to a specific time ----
  const parseTimeInput = (raw: string): number | null => {
    const s = raw.trim();
    if (!s) return null;
    if (/^\d+(\.\d+)?$/.test(s)) return Math.max(0, Number(s));
    const parts = s.split(':').map(Number);
    if (parts.some(p => !isFinite(p))) return null;
    if (parts.length === 2) return Math.max(0, parts[0] * 60 + parts[1]);
    if (parts.length === 3) return Math.max(0, parts[0] * 3600 + parts[1] * 60 + parts[2]);
    return null;
  };
  const commitTimeInput = () => {
    const el = getActiveMedia();
    setEditingTime(false);
    if (!el || !timeInput) return;
    const t = parseTimeInput(timeInput);
    if (t === null) { addToast('error', 'Enter a time like 1:30 or 90 seconds'); return; }
    el.currentTime = Math.min(t, el.duration || t);
    setCurrentTime(el.currentTime);
  };

  // ---- Tab switching ----
  const openLive = useCallback(() => {
    setTab('live');
    // Close any library overlays so they don't reappear when switching back.
    setClearConfirm(false);
    setShowInfo(false);
    setShowSleep(false);
    setShowSpeed(false);
    setShowEq(false);
    setShowSort(false);
    // Pause any library playback before showing live TV.
    const v = videoRef.current;
    const a = audioRef.current;
    if (v && !v.paused) v.pause();
    if (a && !a.paused) a.pause();
    stopVisualizer();
  }, [stopVisualizer]);

  // ---- Auto-hide controls for video ----
  const poke = () => {
    setControlsVisible(true);
    window.clearTimeout(hideTimer.current);
    if (playing && current?.kind === 'video') {
      hideTimer.current = window.setTimeout(() => setControlsVisible(false), 2600);
    }
  };

  // ---- Keyboard shortcuts ----
  const stateRef = useRef({ volume, duration, showInfo });
  useEffect(() => { stateRef.current = { volume, duration, showInfo }; });
  const toggleCinema = useCallback(() => setCinema(c => !c), []);
  useEffect(() => { try { localStorage.setItem(CINEMA_KEY, cinema ? '1' : '0'); } catch { /* ignore */ } }, [cinema]);

  useEffect(() => {
    try {
      if (previewH !== null) localStorage.setItem(PREVIEW_H_KEY, String(previewH));
      else localStorage.removeItem(PREVIEW_H_KEY);
    } catch { /* ignore */ }
  }, [previewH]);

  // ---- Draggable preview resize ----
  const startResize = (e: ReactPointerEvent<HTMLDivElement>) => {
    const el = playerRef.current;
    if (!el) return;
    e.preventDefault();
    resizeDrag.current = { startY: e.clientY, startH: el.offsetHeight, active: true };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onResizeMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!resizeDrag.current.active) return;
    const delta = e.clientY - resizeDrag.current.startY;
    setPreviewH(Math.min(900, Math.max(240, Math.round(resizeDrag.current.startH + delta))));
  };
  const endResize = (e: ReactPointerEvent<HTMLDivElement>) => {
    resizeDrag.current.active = false;
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* ignore */ }
  };
  const resetPreview = () => {
    setPreviewH(null);
    addToast('info', 'Preview height reset to automatic');
  };
  const actionsRef = useRef({ togglePlay, toggleMute, toggleFullscreen, goNext, goPrev, setVolumeValue, toggleCinema });
  useEffect(() => { actionsRef.current = { togglePlay, toggleMute, toggleFullscreen, goNext, goPrev, setVolumeValue, toggleCinema }; });

  useEffect(() => {
    if (tab !== 'library') return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
      if (stateRef.current.showInfo) return;
      const el = getActiveMedia();
      const a = actionsRef.current;
      switch (e.key) {
        case ' ':
          e.preventDefault();
          a.togglePlay();
          break;
        case 'ArrowRight':
          if (el) el.currentTime = Math.min(el.duration || 0, el.currentTime + (e.shiftKey ? 60 : 10));
          break;
        case 'ArrowLeft':
          if (el) el.currentTime = Math.max(0, el.currentTime - (e.shiftKey ? 60 : 10));
          break;
        case 'ArrowUp':
          e.preventDefault();
          a.setVolumeValue(stateRef.current.volume + 0.05);
          break;
        case 'ArrowDown':
          e.preventDefault();
          a.setVolumeValue(stateRef.current.volume - 0.05);
          break;
        case 'm': case 'M':
          a.toggleMute();
          break;
        case 'f': case 'F':
          a.toggleFullscreen();
          break;
        case 'c': case 'C':
          a.toggleCinema();
          break;
        case 'n': case 'N':
          a.goNext();
          break;
        case 'p': case 'P':
          a.goPrev();
          break;
        default:
          if (e.key >= '0' && e.key <= '9' && el && stateRef.current.duration) {
            el.currentTime = (Number(e.key) / 10) * stateRef.current.duration;
          }
          break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [getActiveMedia, tab]);

  // ---- Derived ----
  const playedPct = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;
  const bufferedPct = duration > 0 ? Math.min(100, (buffered / duration) * 100) : 0;
  const showControls = current?.kind === 'video' ? controlsVisible : true;
  const showChrome = current?.kind === 'image' ? true : showControls;
  const isImage = current?.kind === 'image';

  const cycleRepeat = () => setRepeat(r => (r === 'off' ? 'all' : r === 'all' ? 'one' : 'off'));
  const sleepActive = sleepEndsAt !== null || sleepEndOfTrack;

  return (
    <div
      className="p-6 max-w-[96rem] mx-auto min-h-full flex flex-col"
      onDragEnter={handleDragEnter}
      onDragOver={e => e.preventDefault()}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Clapperboard className="text-orange-500 animate-bounce-gentle" size={26} /> Media Player
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
            {tab === 'live'
              ? 'Watch live TV channels from around the world, powered by the iptv-org community playlist'
              : `${items.length} media file${items.length === 1 ? '' : 's'} — VLC-style player for videos, audio, and image previews, saved locally on this device`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {tab === 'library' && (
            <button
              onClick={() => fileRef.current?.click()}
              className="flex items-center gap-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-md hover:shadow-lg hover:scale-105 transition-all"
            >
              <Plus size={16} /> Add Media
            </button>
          )}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-1 border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setTab('library')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${tab === 'library' ? 'bg-white dark:bg-slate-700 text-orange-600 dark:text-orange-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
            >
              <Clapperboard size={14} /> Library
            </button>
            <button
              onClick={openLive}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${tab === 'live' ? 'bg-white dark:bg-slate-700 text-orange-600 dark:text-orange-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
            >
              <Tv size={14} /> Live TV
            </button>
          </div>
        </div>
        <input
          ref={fileRef}
          type="file"
          multiple
          className="hidden"
          accept="video/*,audio/*,image/*"
          onChange={e => handleAddFiles(e.target.files)}
        />
      </div>

      {/* The library section stays mounted (hidden) so the media elements and
          audio graph survive tab switches; live TV renders alongside. */}
      <div className={`flex flex-col flex-1 ${tab === 'live' ? 'hidden' : ''}`}>

      {/* Errors */}
      {error && (
        <div className="mb-5 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/30 rounded-xl p-3 flex items-start gap-2 text-xs text-red-600 dark:text-red-300 animate-scale-in">
          <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
          <span className="flex-1">{error}</span>
          <button onClick={() => setError(null)} className="p-0.5 hover:bg-red-100 dark:hover:bg-red-900/40 rounded" aria-label="Dismiss">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Player takes the full width (widescreen); the playlist sits below. */}
      <div className="grid grid-cols-1 gap-5 items-start flex-1">
        {/* ===== Player ===== */}
        <div className="flex flex-col min-w-0">
        <div
          ref={playerRef}
          className={`relative w-full bg-black select-none overflow-hidden rounded-2xl shadow-2xl ring-1 ring-black/40 transition-colors duration-300 ${showControls ? '' : 'cursor-none'}`}
          style={previewH !== null
            ? { height: previewH }
            : current?.kind === 'video'
              ? { aspectRatio: cinema ? '4 / 3' : '16 / 9' }
              : { aspectRatio: '16 / 9' }}
          onMouseMove={poke}
          onMouseLeave={() => { if (playing && current?.kind === 'video') setControlsVisible(false); }}
          onDoubleClick={toggleFullscreen}
        >
          {/* Media elements (both stay mounted so the audio graph survives) */}
          <video
            ref={videoRef}
            className={current?.kind === 'video' ? 'w-full h-full object-contain' : 'hidden'}
            playsInline
            preload="metadata"
            onClick={handleVideoClick}
            {...mediaEvents}
          />
          <audio ref={audioRef} className="hidden" preload="metadata" {...mediaEvents} />

          {/* Image preview */}
          {isImage && urls[currentId ?? ''] && (
            <div className="absolute inset-0 bg-slate-950 flex items-center justify-center p-4">
              <img
                src={urls[currentId ?? '']}
                alt={current?.name ?? 'Image preview'}
                className="max-w-full max-h-full object-contain rounded-xl shadow-2xl"
                draggable={false}
                onLoad={() => setLoading(false)}
                onError={() => {
                  setLoading(false);
                  setError(`Could not preview "${current?.name ?? 'this image'}".`);
                }}
              />
            </div>
          )}

          {/* Audio visualizer */}
          {current?.kind === 'audio' && (
            <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-slate-950 to-black">
              {!analyserReady && (
                <div className="absolute inset-0 flex items-end justify-center gap-1.5 px-8 pb-24">
                  {Array.from({ length: 36 }).map((_, i) => (
                    <div
                      key={i}
                      className="eq-bar w-2.5 rounded-t bg-gradient-to-t from-orange-700 to-orange-400"
                      style={{ animationDelay: `${(i % 7) * 0.12}s`, animationDuration: `${0.9 + (i % 5) * 0.15}s` }}
                    />
                  ))}
                </div>
              )}
              <canvas ref={canvasRef} className={analyserReady ? 'absolute inset-0 w-full h-full' : 'hidden'} />
            </div>
          )}

          {/* Empty state */}
          {!current && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6 gap-3">
              <div className="w-20 h-20 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                <Clapperboard size={36} className="text-orange-400" />
              </div>
              <p className="text-white font-semibold">Your media library is empty</p>
              <p className="text-slate-400 text-sm max-w-sm">
                Add videos, music, or images to start your playlist — everything is stored locally on this device.
              </p>
              <button
                onClick={() => fileRef.current?.click()}
                className="flex items-center gap-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white px-5 py-2.5 rounded-xl text-sm font-semibold shadow-lg hover:shadow-xl hover:scale-105 transition-all"
              >
                <Upload size={16} /> Add Media
              </button>
            </div>
          )}

          {/* Buffering spinner */}
          {current && loading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
              <Loader2 size={42} className="text-orange-400 animate-spin" />
            </div>
          )}

          {/* Center play overlay */}
          {current && !isImage && !playing && !loading && (
            <button onClick={togglePlay} className="absolute inset-0 z-10 flex items-center justify-center group">
              <span className="w-16 h-16 rounded-full bg-black/60 border border-white/20 flex items-center justify-center backdrop-blur-sm group-hover:bg-orange-600/80 group-hover:border-orange-400 group-hover:scale-110 transition-all animate-scale-in">
                <Play size={28} className="text-white fill-white ml-0.5" />
              </span>
            </button>
          )}

          {/* Top gradient + now playing */}
          <div className={`absolute inset-x-0 top-0 z-20 px-4 pt-3 pb-8 bg-gradient-to-b from-black/80 to-transparent transition-opacity duration-300 ${showChrome ? 'opacity-100' : 'opacity-0'}`}>
            <div className="text-xs font-semibold text-white truncate">{current?.name}</div>
            {isImage && (
              <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-black/50 px-2 py-1 text-[10px] font-semibold text-orange-200 backdrop-blur-sm">
                <ImageIcon size={11} /> Image preview
              </div>
            )}
          </div>

          {/* Sleep timer chip — always visible while active */}
          {sleepActive && (
            <button
              onClick={cancelSleep}
              className="absolute top-3 right-3 z-30 flex items-center gap-1.5 bg-black/60 border border-white/15 rounded-full px-3 py-1.5 text-[11px] font-semibold text-orange-300 backdrop-blur-sm hover:bg-black/80 transition-colors"
              title="Cancel sleep timer"
            >
              <Moon size={12} />
              {sleepEndsAt !== null ? formatTime(sleepRemaining / 1000) : 'End of track'}
            </button>
          )}

          {/* Control bar */}
          {!isImage && (
          <div className={`absolute inset-x-0 bottom-0 z-20 px-3 pt-10 pb-2.5 bg-gradient-to-t from-black/90 via-black/50 to-transparent transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
            {/* Seek row */}
            <div className="flex items-center gap-2.5 mb-1">
              {editingTime ? (
                <input
                  autoFocus
                  value={timeInput}
                  onChange={e => setTimeInput(e.target.value)}
                  onBlur={commitTimeInput}
                  onKeyDown={e => {
                    if (e.key === 'Enter') commitTimeInput();
                    if (e.key === 'Escape') setEditingTime(false);
                  }}
                  className="w-14 text-[10px] font-mono bg-black/50 border border-orange-400/60 rounded px-1 py-0.5 text-orange-300 tabular-nums text-right outline-none"
                  title="Seek to a time — e.g. 1:30 or 90"
                  aria-label="Jump to time"
                />
              ) : (
                <button
                  onClick={() => { setTimeInput(formatTime(currentTime)); setEditingTime(true); }}
                  title="Jump to a specific time — click to edit"
                  className="text-[10px] font-mono text-slate-300 hover:text-orange-300 tabular-nums w-10 text-right transition-colors"
                >
                  {formatTime(currentTime)}
                </button>
              )}
              <div
                ref={seekBarRef}
                className="relative flex-1 h-4 flex items-center cursor-pointer"
                onPointerDown={handleSeekDown}
                onPointerMove={handleSeekMove}
                onPointerUp={handleSeekUp}
                onPointerLeave={handleSeekUp}
              >
                <div className="w-full h-1.5 rounded-full bg-white/20 relative">
                  <div className="absolute inset-y-0 left-0 rounded-full bg-white/25" style={{ width: `${bufferedPct}%` }} />
                  <div className="absolute inset-y-0 left-0 rounded-full bg-orange-500" style={{ width: `${playedPct}%` }} />
                  <div
                    className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-orange-400 border-2 border-black/40 shadow transition-transform group-hover:scale-125"
                    style={{ left: `calc(${playedPct}% - 7px)` }}
                  />
                  {ab.a !== null && duration > 0 && (
                    <div
                      className="absolute top-1/2 -translate-y-1/2 w-[3px] h-4 rounded bg-amber-400 pointer-events-none"
                      style={{ left: `${(ab.a / duration) * 100}%` }}
                      title={`A: ${formatTime(ab.a)}`}
                    />
                  )}
                  {ab.b !== null && duration > 0 && (
                    <div
                      className="absolute top-1/2 -translate-y-1/2 w-[3px] h-4 rounded bg-emerald-400 pointer-events-none"
                      style={{ left: `${(ab.b / duration) * 100}%` }}
                      title={`B: ${formatTime(ab.b)}`}
                    />
                  )}
                </div>
              </div>
              <span className="text-[10px] font-mono text-slate-300 tabular-nums w-10">{formatTime(duration)}</span>
            </div>

            {/* Buttons row */}
            <div className="flex items-center gap-1">
              <button onClick={() => setShuffle(s => !s)} title={shuffle ? 'Shuffle: on' : 'Shuffle: off'} className={CONTROL_BTN}>
                <Shuffle size={17} className={shuffle ? 'text-orange-400' : ''} />
              </button>
              <button onClick={goPrev} title="Previous (P)" className={CONTROL_BTN}>
                <SkipBack size={17} />
              </button>
              <button
                onClick={togglePlay}
                title={playing ? 'Pause (Space)' : 'Play (Space)'}
                className="p-2.5 rounded-full bg-white/10 hover:bg-orange-500 text-white transition-all mx-0.5"
              >
                {playing ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-0.5" />}
              </button>
              <button onClick={goNext} title="Next (N)" className={CONTROL_BTN}>
                <SkipForward size={17} />
              </button>
              <button onClick={stop} title="Stop" className={CONTROL_BTN}>
                <Square size={15} fill="currentColor" />
              </button>
              <button onClick={cycleRepeat} title={`Repeat: ${repeat}`} className={CONTROL_BTN}>
                {repeat === 'one'
                  ? <Repeat1 size={17} className="text-orange-400" />
                  : <Repeat size={17} className={repeat === 'all' ? 'text-orange-400' : ''} />}
              </button>
              <button
                onClick={cycleAb}
                title={ab.b !== null ? 'A–B loop active — click to clear' : ab.a !== null ? 'Point A set — click here at the loop end to set B' : 'Set an A–B repeat loop'}
                className={`${CONTROL_BTN} ${ab.b !== null ? 'text-orange-400' : ab.a !== null ? 'text-amber-300' : ''}`}
              >
                <Repeat2 size={17} />
                <span className="text-[10px] font-bold">A–B</span>
              </button>
              {current && (
                <button
                  onClick={() => toggleFavorite(current.id)}
                  title={current.favorite ? 'Remove from favourites' : 'Add to favourites'}
                  className={`${CONTROL_BTN} ${current.favorite ? 'text-rose-400' : ''}`}
                >
                  <Heart size={17} className={current.favorite ? 'fill-rose-400 text-rose-400' : ''} />
                </button>
              )}

              <div className="flex-1" />

              {/* Sleep timer */}
              <div className="relative">
                <button onClick={() => setShowSleep(v => !v)} title="Sleep timer" className={`${CONTROL_BTN} ${sleepActive ? 'text-orange-400' : ''}`}>
                  <Moon size={17} />
                  {sleepEndsAt !== null && (
                    <span className="text-[11px] font-bold tabular-nums">{formatTime(sleepRemaining / 1000)}</span>
                  )}
                </button>
                {showSleep && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setShowSleep(false)} />
                    <div className="absolute bottom-full left-0 mb-2 z-40 bg-slate-800/95 backdrop-blur rounded-xl border border-white/10 shadow-xl overflow-hidden min-w-[170px] animate-scale-in">
                      <div className="px-3.5 pt-2.5 pb-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">Sleep timer</div>
                      <div className="grid grid-cols-2 gap-0.5 px-1.5 pb-1.5">
                        {SLEEP_OPTIONS.map(opt => (
                          <button
                            key={opt.label}
                            onClick={() => setSleep(opt.minutes)}
                            className="px-2.5 py-1.5 text-xs text-left text-slate-200 hover:bg-white/10 rounded-lg"
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                      {sleepActive && (
                        <button onClick={cancelSleep} className="w-full px-3.5 py-2 text-xs text-left text-red-300 hover:bg-red-500/20 border-t border-white/10">
                          Cancel sleep timer
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* Speed */}
              <div className="relative">
                <button onClick={() => setShowSpeed(v => !v)} title="Playback speed" className={CONTROL_BTN}>
                  <Gauge size={17} />
                  <span className="text-[11px] font-bold tabular-nums">{rate}x</span>
                </button>
                {showSpeed && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setShowSpeed(false)} />
                    <div className="absolute bottom-full left-0 mb-2 z-40 bg-slate-800/95 backdrop-blur rounded-xl border border-white/10 shadow-xl overflow-hidden min-w-[120px] animate-scale-in">
                      {SPEEDS.map(s => (
                        <button
                          key={s}
                          onClick={() => { setRate(s); setShowSpeed(false); }}
                          className={`w-full px-3.5 py-2 text-xs text-left flex items-center justify-between hover:bg-white/10 ${s === rate ? 'text-orange-400 font-bold' : 'text-slate-200'}`}
                        >
                          {s}x {s === rate && <Check size={13} />}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Equalizer */}
              <div className="relative">
                <button onClick={() => setShowEq(v => !v)} title="Equalizer presets" className={`${CONTROL_BTN} ${eqPreset !== 'flat' ? 'text-orange-400' : ''}`}>
                  <SlidersHorizontal size={17} />
                </button>
                {showEq && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setShowEq(false)} />
                    <div className="absolute bottom-full left-0 mb-2 z-40 bg-slate-800/95 backdrop-blur rounded-xl border border-white/10 shadow-xl overflow-hidden min-w-[150px] animate-scale-in">
                      <div className="px-3.5 pt-2.5 pb-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">Equalizer</div>
                      {EQ_PRESET_LABELS.map(p => (
                        <button
                          key={p.value}
                          onClick={() => { setEqPresetValue(p.value); setShowEq(false); }}
                          className={`w-full px-3.5 py-1.5 text-xs text-left flex items-center justify-between hover:bg-white/10 ${p.value === eqPreset ? 'text-orange-400 font-bold' : 'text-slate-200'}`}
                        >
                          {p.label} {p.value === eqPreset && <Check size={13} />}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Volume */}
              <div className="flex items-center gap-1">
                <button onClick={toggleMute} title={muted ? 'Unmute (M)' : 'Mute (M)'} className={CONTROL_BTN}>
                  {muted || volume === 0 ? <VolumeX size={17} /> : volume < 0.5 ? <Volume1 size={17} /> : <Volume2 size={17} />}
                </button>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={muted ? 0 : volume}
                  onChange={e => setVolumeValue(Number(e.target.value))}
                  className="w-20 h-1.5 accent-orange-500"
                  aria-label="Volume"
                />
              </div>

              <button onClick={() => setShowInfo(true)} title="Media information" className={CONTROL_BTN}>
                <Info size={17} />
              </button>
              {current?.kind === 'video' && (
                <button onClick={captureSnapshot} title="Save a snapshot of this frame (PNG)" className={CONTROL_BTN}>
                  <Camera size={17} />
                </button>
              )}
              {current?.kind === 'video' && (
                <button onClick={togglePip} title="Picture in picture" className={CONTROL_BTN}>
                  <PictureInPicture2 size={17} />
                </button>
              )}
              {current?.kind === 'video' && (
                <button
                  onClick={toggleCinema}
                  title={cinema ? 'Exit cinema mode (C)' : 'Cinema mode — taller preview (C)'}
                  className={`${CONTROL_BTN} ${cinema ? 'text-orange-400' : ''}`}
                >
                  <RectangleHorizontal size={17} />
                </button>
              )}
              <button onClick={toggleFullscreen} title="Fullscreen (F)" className={CONTROL_BTN}>
                {isFullscreen ? <Minimize size={17} /> : <Maximize size={17} />}
              </button>
            </div>
          </div>
          )}
        </div>

          {/* Draggable preview resize handle */}
          <div
            onPointerDown={startResize}
            onPointerMove={onResizeMove}
            onPointerUp={endResize}
            onDoubleClick={resetPreview}
            title={previewH !== null ? 'Drag to resize preview · double-click to reset' : 'Drag up/down to resize the preview height'}
            className="group relative flex items-center justify-center h-5 mt-1 cursor-ns-resize select-none touch-none"
          >
            <div className="absolute inset-x-6 top-1/2 h-1 -translate-y-1/2 rounded-full bg-slate-200 dark:bg-slate-700 group-hover:bg-orange-300 dark:group-hover:bg-orange-500/40 transition-colors" />
            <span className="relative flex items-center justify-center w-8 h-4 rounded-md bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 shadow-sm group-hover:border-orange-400 group-hover:scale-110 transition-all">
              <GripHorizontal size={12} />
            </span>
          </div>
        </div>

        {/* ===== Playlist ===== */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col transition-colors duration-300 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
            <div className="font-bold text-slate-800 dark:text-slate-100 text-sm flex items-center gap-2">
              <ListMusic size={17} className="text-orange-500" />
              Playlist
              <span className="text-[11px] font-semibold bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 rounded-full px-2 py-0.5">
                {items.length}
              </span>
            </div>
            <div className="flex items-center gap-0.5">
              <button
                onClick={() => navItems.length > 0 && playItem(navItems[0].id)}
                title="Play all"
                className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-white hover:bg-orange-500 transition-colors"
              >
                <Play size={15} fill="currentColor" />
              </button>
              <button
                onClick={() => setShuffle(s => !s)}
                title="Shuffle"
                className={`p-1.5 rounded-lg transition-colors ${shuffle ? 'text-orange-500 bg-orange-50 dark:bg-orange-500/10' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
              >
                <Shuffle size={15} />
              </button>
              <button
                onClick={() => items.length > 0 && setClearConfirm(true)}
                title="Clear playlist"
                className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
              >
                <Trash2 size={15} />
              </button>
            </div>
          </div>

          {/* Playlist tools: search, favourites filter, sort */}
          <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-700 flex items-center gap-1.5">
            <div className="relative flex-1">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search playlist…"
                className="w-full bg-slate-100 dark:bg-slate-700/70 border border-transparent focus:border-orange-400 rounded-lg pl-8 pr-7 py-1.5 text-xs text-slate-700 dark:text-slate-200 placeholder:text-slate-400 outline-none transition-colors"
                aria-label="Search playlist"
              />
              {query && (
                <button onClick={() => setQuery('')} className="absolute right-1.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded" aria-label="Clear search">
                  <X size={12} />
                </button>
              )}
            </div>
            <button
              onClick={() => setFavOnly(v => !v)}
              title={favOnly ? 'Showing favourites only — click to show all' : 'Show favourites only'}
              className={`relative p-2 rounded-lg transition-colors ${favOnly ? 'text-rose-500 bg-rose-50 dark:bg-rose-500/10' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
            >
              <Heart size={15} className={favOnly ? 'fill-rose-500' : ''} />
              {favCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[14px] h-[14px] px-0.5 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center">
                  {favCount}
                </span>
              )}
            </button>
            <div className="relative">
              <button onClick={() => setShowSort(v => !v)} title="Sort playlist" className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                <ArrowUpDown size={15} />
              </button>
              {showSort && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setShowSort(false)} />
                  <div className="absolute right-0 top-full mt-1 z-40 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 shadow-xl overflow-hidden min-w-[150px] animate-scale-in">
                    {SORT_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => changeSort(opt.value)}
                        className={`w-full px-3 py-2 text-xs text-left flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700 ${opt.value === sortBy ? 'text-orange-600 dark:text-orange-400 font-bold' : 'text-slate-600 dark:text-slate-300'}`}
                      >
                        {opt.label} {opt.value === sortBy && <Check size={13} />}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto max-h-[600px]">
            {items.length === 0 ? (
              <div className="text-center py-14 px-6">
                <Music size={40} className="mx-auto mb-3 text-slate-300 dark:text-slate-600" />
                <p className="text-slate-400 dark:text-slate-500 text-sm">No media yet</p>
                <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">Add files to build your playlist</p>
              </div>
            ) : sortedItems.length === 0 ? (
              <div className="text-center py-14 px-6">
                <Search size={40} className="mx-auto mb-3 text-slate-300 dark:text-slate-600" />
                <p className="text-slate-400 dark:text-slate-500 text-sm">No matches</p>
                <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">Try a different search or clear the favourites filter</p>
              </div>
            ) : (
              sortedItems.map((item, i) => {
                const active = item.id === currentId;
                return (
                  <div
                    key={item.id}
                    draggable
                    onDragStart={e => handleRowDragStart(e, item.id)}
                    onDragOver={e => handleRowDragOver(e, item.id)}
                    onDrop={e => handleRowDrop(e, item.id)}
                    onDragEnd={handleRowDragEnd}
                    onClick={() => playItem(item.id)}
                    className={`w-full flex items-center gap-2 px-3 py-2.5 cursor-pointer group transition-colors ${active ? 'bg-orange-50 dark:bg-orange-500/10' : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'} ${dragId === item.id ? 'opacity-40' : ''} ${overId === item.id && dragId !== null && dragId !== item.id ? 'ring-2 ring-inset ring-orange-400' : ''}`}
                  >
                    <GripVertical size={13} className="text-slate-300 dark:text-slate-600 flex-shrink-0 cursor-grab active:cursor-grabbing" />
                    <span className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden transition-colors ${active ? 'bg-orange-500 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'}`}>
                      {item.kind === 'image' && urls[item.id]
                        ? <img src={urls[item.id]} alt="" className="w-full h-full object-cover" draggable={false} />
                        : active && playing
                          ? <Pause size={14} fill="currentColor" />
                          : item.kind === 'video'
                            ? <Film size={14} />
                            : <Music size={14} />}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className={`block text-sm truncate ${active ? 'text-orange-600 dark:text-orange-400 font-semibold' : 'text-slate-700 dark:text-slate-300'}`}>
                        {i + 1}. {item.name}
                      </span>
                      <span className="block text-[11px] text-slate-400 truncate">
                        {item.kind === 'image' ? formatSize(item.size) : item.duration ? formatTime(item.duration) : formatSize(item.size)} · {item.kind}
                        {item.lastPosition && item.lastPosition > 15 && (
                          <span className="text-orange-500 font-medium"> · resume {formatTime(item.lastPosition)}</span>
                        )}
                      </span>
                    </span>
                    <button
                      onClick={e => { e.stopPropagation(); toggleFavorite(item.id); }}
                      title={item.favorite ? 'Remove from favourites' : 'Add to favourites'}
                      className={`p-1.5 rounded-lg transition-all ${item.favorite ? 'opacity-100 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30' : 'opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30'}`}
                    >
                      <Heart size={13} className={item.favorite ? 'fill-rose-500 text-rose-500' : ''} />
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); removeItem(item.id); }}
                      title="Remove from playlist"
                      className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-all"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                );
              })
            )}
          </div>

          <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-700 text-[11px] text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
            <Upload size={12} /> Drag & drop media files anywhere to add videos, audio, or images
          </div>
        </div>
      </div>

      {/* Drag overlay */}
      {dragOver && (
        <div className="fixed inset-0 z-50 pointer-events-none">
          <div className="absolute inset-3 rounded-3xl border-4 border-dashed border-orange-400 bg-orange-500/10 flex items-center justify-center">
            <div className="text-center">
              <Upload size={48} className="mx-auto text-orange-400 mb-3" />
              <p className="text-xl font-bold text-orange-300">Drop to add to your media library</p>
            </div>
          </div>
        </div>
      )}

      {/* Clear confirm */}
      {clearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 dark:bg-black/60 backdrop-blur-sm">
          <div className="glass-modal bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 max-w-sm w-full text-center animate-scale-in">
            <div className="w-14 h-14 bg-red-50 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 className="text-red-400" size={24} />
            </div>
            <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-2">Clear Playlist?</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-5">
              This removes all {items.length} media file{items.length === 1 ? '' : 's'} from your library.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setClearConfirm(false)}
                className="flex-1 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 rounded-xl py-2.5 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleClearAll}
                className="flex-1 bg-red-500 text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-red-600"
              >
                Clear All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Media info + shortcuts */}
      {showInfo && current && (

        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => setShowInfo(false)}>
          <div
            className="glass-modal bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-in"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">Media Information</h3>
              <button onClick={() => setShowInfo(false)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg" aria-label="Close">
                <X size={16} className="text-slate-500" />
              </button>
            </div>
            <div className="p-5 space-y-2.5 text-sm">
              <div className="flex gap-2"><span className="text-slate-400 dark:text-slate-500 w-20 flex-shrink-0">File</span><span className="text-slate-700 dark:text-slate-200 truncate">{current.name}</span></div>
              <div className="flex gap-2"><span className="text-slate-400 dark:text-slate-500 w-20 flex-shrink-0">Kind</span><span className="text-slate-700 dark:text-slate-200 capitalize">{current.kind}</span></div>
              <div className="flex gap-2"><span className="text-slate-400 dark:text-slate-500 w-20 flex-shrink-0">Type</span><span className="text-slate-700 dark:text-slate-200">{current.type || '—'}</span></div>
              <div className="flex gap-2"><span className="text-slate-400 dark:text-slate-500 w-20 flex-shrink-0">Size</span><span className="text-slate-700 dark:text-slate-200">{formatSize(current.size)}</span></div>
              <div className="flex gap-2"><span className="text-slate-400 dark:text-slate-500 w-20 flex-shrink-0">Duration</span><span className="text-slate-700 dark:text-slate-200">{duration ? formatTime(duration) : '—'}</span></div>
              <div className="flex gap-2"><span className="text-slate-400 dark:text-slate-500 w-20 flex-shrink-0">Added</span><span className="text-slate-700 dark:text-slate-200">{new Date(current.addedAt).toLocaleString()}</span></div>
              <div className="flex gap-2"><span className="text-slate-400 dark:text-slate-500 w-20 flex-shrink-0">Plays</span><span className="text-slate-700 dark:text-slate-200">{current.plays ?? 0}</span></div>
              <div className="flex gap-2"><span className="text-slate-400 dark:text-slate-500 w-20 flex-shrink-0">Last played</span><span className="text-slate-700 dark:text-slate-200 flex items-center gap-1">
                <Clock size={12} className="text-slate-400" />
                {current.lastPlayedAt ? new Date(current.lastPlayedAt).toLocaleString() : '—'}
              </span></div>
            </div>
            <div className="px-5 pb-5">
              <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-2">Keyboard Shortcuts</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                {SHORTCUTS.map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between gap-2">
                    <span className="font-mono font-semibold text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-500/10 rounded px-1.5 py-0.5">{k}</span>
                    <span className="text-slate-500 dark:text-slate-400 text-right">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
      </div>

      {tab === 'live' && <IptvPlayer />}
    </div>
  );
}
