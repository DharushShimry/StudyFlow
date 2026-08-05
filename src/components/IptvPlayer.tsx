import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import type { SyntheticEvent } from 'react';
import Hls from 'hls.js';
import {
  Tv, Play, Pause, Square, Volume1, Volume2, VolumeX, Maximize, Minimize,
  PictureInPicture2, Camera, Heart, Search, RefreshCw, Radio, History, Loader2,
  AlertCircle, X, MonitorPlay, PlugZap,
} from 'lucide-react';
import {
  PLAYLIST_URLS, getPlaylist, refreshPlaylist, getCountries, getCategories,
  type IptvChannel, type IptvCountry, type IptvCategory,
} from '../services/iptv';
import { useToast } from '../contexts/ToastContext';
import { currentUserName } from '../services/userScope';

const VOLUME_KEY = 'ss-iptv-volume';
const PAGE_SIZE = 80;

const CONTROL_BTN =
  'p-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors flex items-center gap-1';

function hostOf(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return ''; }
}

function channelKey(user: string): string {
  return `ss-iptv-favs-${user || 'default'}`;
}
function recentKey(user: string): string {
  return `ss-iptv-recents-${user || 'default'}`;
}

function loadList<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default function IptvPlayer() {
  const { addToast } = useToast();

  const [countries, setCountries] = useState<IptvCountry[]>([]);
  const [categories, setCategories] = useState<IptvCategory[]>([]);

  // Playlist state
  const [channels, setChannels] = useState<IptvChannel[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [progress, setProgress] = useState<{ loaded: number; total: number } | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const [listError, setListError] = useState<string | null>(null);

  // Filters
  const [query, setQuery] = useState('');
  const [country, setCountry] = useState('');
  const [category, setCategory] = useState('');
  const [favOnly, setFavOnly] = useState(false);
  const [visible, setVisible] = useState(PAGE_SIZE);

  // Player state
  const [current, setCurrent] = useState<IptvChannel | null>(null);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [playError, setPlayError] = useState<string | null>(null);
  const [volume, setVolume] = useState(() => {
    const v = Number(localStorage.getItem(VOLUME_KEY) ?? 1);
    return isFinite(v) && v >= 0 && v <= 1 ? v : 1;
  });
  const [muted, setMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const [favorites, setFavorites] = useState<IptvChannel[]>(() => loadList<IptvChannel>(channelKey(currentUserName())));
  const [recents, setRecents] = useState<IptvChannel[]>(() => loadList<IptvChannel>(recentKey(currentUserName())));

  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const firstListRun = useRef(true);
  const loadSeqRef = useRef(0);

  // ---- Load metadata (countries + categories) once ----
  useEffect(() => {
    let cancelled = false;
    getCountries()
      .then(list => { if (!cancelled) setCountries(list.sort((a, b) => a.name.localeCompare(b.name))); })
      .catch(() => { if (!cancelled) setCountries([]); });
    getCategories()
      .then(list => { if (!cancelled) setCategories(list.sort((a, b) => a.name.localeCompare(b.name))); })
      .catch(() => { if (!cancelled) setCategories([]); });
    return () => { cancelled = true; };
  }, []);

  // ---- Persist favourites / recents per user ----
  useEffect(() => {
    try { localStorage.setItem(channelKey(currentUserName()), JSON.stringify(favorites)); } catch { /* ignore */ }
  }, [favorites]);
  useEffect(() => {
    try { localStorage.setItem(recentKey(currentUserName()), JSON.stringify(recents)); } catch { /* ignore */ }
  }, [recents]);

  // ---- Load the channel playlist for the current country / category ----
  const loadPlaylist = useCallback(async (countryCode: string, categoryId: string, force = false) => {
    // Sequence guard: only the newest request may apply its result.
    const seq = ++loadSeqRef.current;
    setListLoading(true);
    setListError(null);
    setProgress(null);
    const url = countryCode
      ? PLAYLIST_URLS.country(countryCode)
      : categoryId
        ? PLAYLIST_URLS.category(categoryId)
        : PLAYLIST_URLS.all;
    const onProgress = (loaded: number, total: number) => setProgress({ loaded, total });
    try {
      const res = force
        ? await refreshPlaylist(url, onProgress)
        : await getPlaylist(url, { onProgress });
      if (seq !== loadSeqRef.current) return; // a newer request superseded this one
      setChannels(res.channels);
      setFromCache(res.cached);
      setVisible(PAGE_SIZE);
    } catch {
      if (seq !== loadSeqRef.current) return;
      setChannels([]);
      setListError('Could not load the channel list. Check your internet connection and try again.');
    } finally {
      if (seq === loadSeqRef.current) {
        setListLoading(false);
        setProgress(null);
      }
    }
  }, []);

  // Country change → reload. Category is honoured as a client-side filter when a country is set.
  useEffect(() => { loadPlaylist(country, category); }, [country, loadPlaylist]);
  // Category change (no country) → fetch the category playlist instead.
  useEffect(() => {
    if (firstListRun.current) { firstListRun.current = false; return; }
    if (!country) loadPlaylist('', category);
  }, [category, country, loadPlaylist]);

  // ---- hls.js / native playback ----
  useEffect(() => {
    const video = videoRef.current;
    hlsRef.current?.destroy();
    hlsRef.current = null;
    if (!video) return;
    video.pause();
    video.removeAttribute('src');
    video.load();
    setLoading(false);
    setPlayError(null);
    if (!current) { setPlaying(false); return; }

    setLoading(true);
    const url = current.url;
    const isHls = /\.m3u8($|\?)/i.test(url);
    let cancelled = false;
    let fatalRetries = 0;

    if (isHls && Hls.isSupported()) {
      const hls = new Hls({ enableWorker: true, backBufferLength: 90 });
      hlsRef.current = hls;
      hls.on(Hls.Events.MANIFEST_PARSED, () => { if (!cancelled) video.play().catch(() => {}); });
      hls.on(Hls.Events.ERROR, (_evt, data) => {
        if (!data.fatal || cancelled) return;
        if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
          if (fatalRetries < 3) { fatalRetries++; hls.startLoad(); }
          else setPlayError('This channel could not be played — it may be offline or geo-blocked.');
        } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
          if (fatalRetries < 3) { fatalRetries++; hls.recoverMediaError(); }
          else setPlayError('This channel could not be played — the stream may be using an unsupported format.');
        } else {
          setPlayError('This channel could not be played — it may be offline or geo-blocked.');
        }
      });
      hls.loadSource(url);
      hls.attachMedia(video);
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Safari / iOS native HLS
      video.src = url;
      video.play().catch(() => {});
    } else {
      video.src = url;
      video.play().catch(() => {});
    }

    return () => {
      cancelled = true;
      hlsRef.current?.destroy();
      hlsRef.current = null;
    };
  }, [current]);

  // ---- Volume sync ----
  useEffect(() => {
    const v = videoRef.current;
    if (v) { v.volume = volume; v.muted = muted; }
    localStorage.setItem(VOLUME_KEY, String(volume));
  }, [volume, muted]);

  // ---- Fullscreen tracking ----
  useEffect(() => {
    const onFs = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);

  // ---- Cleanup hls on unmount ----
  useEffect(() => () => { hlsRef.current?.destroy(); hlsRef.current = null; }, []);

  // ---- Derived list ----
  const categoryName = categories.find(c => c.id === category)?.name ?? '';
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = channels;
    // Client-side category filter applies when a country (or the full index) is loaded.
    if (categoryName && list.length > 0) {
      const catLower = categoryName.toLowerCase();
      list = list.filter(c => c.category.toLowerCase() === catLower);
    }
    if (q) list = list.filter(c => c.name.toLowerCase().includes(q));
    if (favOnly) {
      const favUrls = new Set(favorites.map(f => f.url));
      list = list.filter(c => favUrls.has(c.url));
    }
    return list;
  }, [channels, categoryName, query, favOnly, favorites]);

  const shown = filtered.slice(0, visible);
  const totalBytes = (n: number) =>
    n >= 1024 * 1024 ? `${(n / (1024 * 1024)).toFixed(1)} MB` : `${Math.round(n / 1024)} KB`;

  // ---- Actions ----
  const playChannel = (ch: IptvChannel) => {
    setCurrent(ch);
    setPlayError(null);
    setRecents(prev => [ch, ...prev.filter(r => r.url !== ch.url)].slice(0, 6));
  };

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v || !current) return;
    if (v.paused) v.play().catch(() => {});
    else v.pause();
  };

  const stop = () => {
    const v = videoRef.current;
    if (v) v.pause();
    setPlaying(false);
  };

  const setVolumeValue = (v: number) => { setVolume(Math.min(1, Math.max(0, v))); setMuted(false); };

  const toggleFullscreen = () => {
    const node = playerRef.current;
    if (!node) return;
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else node.requestFullscreen?.().catch(() => {});
  };

  const togglePip = async () => {
    const v = videoRef.current;
    if (!v) return;
    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture();
      else if (v.requestPictureInPicture) await v.requestPictureInPicture();
    } catch { /* unsupported */ }
  };

  const captureSnapshot = () => {
    const v = videoRef.current;
    if (!v || !current) return;
    try {
      const canvas = document.createElement('canvas');
      canvas.width = v.videoWidth;
      canvas.height = v.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx || !canvas.width || !canvas.height) { addToast('error', 'No video frame to capture yet'); return; }
      ctx.drawImage(v, 0, 0);
      canvas.toBlob(blob => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${current.name.replace(/[^\w\- ]+/g, '').trim() || 'channel'}-snapshot.png`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 2000);
      }, 'image/png');
      addToast('success', 'Snapshot saved as PNG');
    } catch { addToast('error', 'Could not capture a snapshot'); }
  };

  const toggleFavorite = (ch: IptvChannel) => {
    const exists = favorites.some(f => f.url === ch.url);
    setFavorites(exists ? favorites.filter(f => f.url !== ch.url) : [...favorites, ch]);
    addToast('info', exists ? `Removed "${ch.name}" from favourites` : `Added "${ch.name}" to favourites`);
  };

  const isFav = (ch: IptvChannel) => favorites.some(f => f.url === ch.url);
  const isCurrent = (ch: IptvChannel) => current?.url === ch.url;

  const mediaEvents = {
    onPlay: () => setPlaying(true),
    onPause: () => setPlaying(false),
    onWaiting: () => setLoading(true),
    onPlaying: () => { setLoading(false); setPlayError(null); },
    onStalled: () => setLoading(true),
    onError: (e: SyntheticEvent<HTMLVideoElement>) => {
      setLoading(false);
      if (e.currentTarget.error && !playError) {
        setPlayError('This channel could not be played — it may be offline, geo-blocked, or use an unsupported stream format.');
      }
    },
  };

  const fmtCount = (n: number) => `${n.toLocaleString()} channel${n === 1 ? '' : 's'}`;

  return (
    <div className="flex flex-col min-h-full">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-2.5 text-sm text-slate-500 dark:text-slate-400">
          <span className="flex items-center gap-1.5 text-xs font-semibold text-red-500 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-full px-2.5 py-1">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            LIVE
          </span>
          <span>
            {listLoading ? 'Loading channels…' : fmtCount(channels.length)} from{' '}
            <a href="https://github.com/iptv-org/iptv" target="_blank" rel="noreferrer" className="text-orange-500 hover:underline font-medium">
              iptv-org
            </a>
          </span>
          {fromCache && (
            <span className="text-[10px] font-semibold bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 rounded-full px-2 py-0.5" title="Showing the cached channel list from this device">
              Cached
            </span>
          )}
        </div>
        <button
          onClick={() => loadPlaylist(country, category, true)}
          disabled={listLoading}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-orange-500 disabled:opacity-50 transition-colors"
        >
          <RefreshCw size={14} className={listLoading ? 'animate-spin' : ''} /> Refresh channels
        </button>
      </div>

      {/* Playlist fetch progress */}
      {progress && (
        <div className="mb-4">
          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mb-1">
            <span className="flex items-center gap-1.5"><Loader2 size={12} className="animate-spin text-orange-500" /> Downloading channel list…</span>
            <span className="tabular-nums">{totalBytes(progress.loaded)}{progress.total > 0 && ` / ${totalBytes(progress.total)}`}</span>
          </div>
          <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-orange-500 to-amber-500 rounded-full transition-[width] duration-200"
              style={{ width: `${progress.total > 0 ? Math.round((progress.loaded / progress.total) * 100) : 20}%` }}
            />
          </div>
        </div>
      )}

      {listError && (
        <div className="mb-5 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/30 rounded-xl p-3 flex items-start gap-2 text-xs text-red-600 dark:text-red-300 animate-scale-in">
          <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
          <span className="flex-1">{listError}</span>
          <button onClick={() => setListError(null)} className="p-0.5 hover:bg-red-100 dark:hover:bg-red-900/40 rounded" aria-label="Dismiss">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Live player spans the full width (widescreen); channels sit below. */}
      <div className="grid grid-cols-1 gap-5 items-start flex-1">
        {/* ===== Live player ===== */}
        <div
          ref={playerRef}
          className="relative w-full bg-black aspect-video rounded-2xl overflow-hidden shadow-2xl ring-1 ring-black/40 select-none"
        >
          <video ref={videoRef} className="w-full h-full object-contain" playsInline {...mediaEvents} />

          {/* Placeholder */}
          {!current && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6 gap-3 bg-gradient-to-b from-slate-900 via-slate-950 to-black">
              <div className="w-20 h-20 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                <Tv size={36} className="text-orange-400" />
              </div>
              <p className="text-white font-semibold">Pick a channel to start watching</p>
              <p className="text-slate-400 text-sm max-w-sm">
                Browse live TV from around the world. Streams are community-provided and some may be offline or geo-blocked.
              </p>
            </div>
          )}

          {/* Buffering */}
          {current && loading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
              <Loader2 size={42} className="text-orange-400 animate-spin" />
            </div>
          )}

          {/* Play error */}
          {current && playError && (
            <div className="absolute inset-0 z-10 flex items-center justify-center p-6 bg-black/70">
              <div className="text-center max-w-md">
                <AlertCircle size={36} className="mx-auto mb-3 text-red-400" />
                <p className="text-white text-sm font-semibold mb-1">Stream unavailable</p>
                <p className="text-slate-300 text-xs">{playError}</p>
              </div>
            </div>
          )}

          {/* Paused overlay */}
          {current && !playing && !loading && !playError && (
            <button onClick={togglePlay} className="absolute inset-0 z-10 flex items-center justify-center group">
              <span className="w-16 h-16 rounded-full bg-black/60 border border-white/20 flex items-center justify-center backdrop-blur-sm group-hover:bg-orange-600/80 group-hover:border-orange-400 group-hover:scale-110 transition-all animate-scale-in">
                <Play size={28} className="text-white fill-white ml-0.5" />
              </span>
            </button>
          )}

          {/* Top gradient + now playing */}
          <div className="absolute inset-x-0 top-0 z-20 px-4 pt-3 pb-8 bg-gradient-to-b from-black/80 to-transparent">
            <div className="flex items-center gap-2">
              {current ? (
                <>
                  <span className="flex items-center gap-1.5 text-[10px] font-bold text-red-400 bg-red-500/15 border border-red-500/30 rounded-full px-2 py-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" /> LIVE
                  </span>
                  <span className="text-xs font-semibold text-white truncate">{current.name}</span>
                </>
              ) : (
                <span className="text-xs font-semibold text-slate-300">No channel selected</span>
              )}
            </div>
          </div>

          {/* Control bar */}
          <div className="absolute inset-x-0 bottom-0 z-20 px-3 pt-10 pb-2.5 bg-gradient-to-t from-black/90 via-black/50 to-transparent">
            <div className="flex items-center gap-1">
              <button
                onClick={togglePlay}
                disabled={!current}
                title={playing ? 'Pause' : 'Play'}
                className="p-2.5 rounded-full bg-white/10 hover:bg-orange-500 disabled:opacity-40 disabled:hover:bg-white/10 text-white transition-all mx-0.5"
              >
                {playing ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-0.5" />}
              </button>
              <button onClick={stop} disabled={!current} title="Stop" className={`${CONTROL_BTN} disabled:opacity-40`}>
                <Square size={15} fill="currentColor" />
              </button>

              {current && (
                <button
                  onClick={() => toggleFavorite(current)}
                  title={isFav(current) ? 'Remove from favourites' : 'Add to favourites'}
                  className={`${CONTROL_BTN} ${isFav(current) ? 'text-rose-400' : ''}`}
                >
                  <Heart size={17} className={isFav(current) ? 'fill-rose-400 text-rose-400' : ''} />
                </button>
              )}

              <div className="flex-1" />

              <div className="flex items-center gap-1">
                <button onClick={() => setMuted(m => !m)} title={muted ? 'Unmute' : 'Mute'} className={CONTROL_BTN}>
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

              {current && (
                <button onClick={captureSnapshot} title="Save a snapshot of this frame" className={CONTROL_BTN}>
                  <Camera size={17} />
                </button>
              )}
              {current && (
                <button onClick={togglePip} title="Picture in picture" className={CONTROL_BTN}>
                  <PictureInPicture2 size={17} />
                </button>
              )}
              <button onClick={toggleFullscreen} title="Fullscreen" className={CONTROL_BTN}>
                {isFullscreen ? <Minimize size={17} /> : <Maximize size={17} />}
              </button>
            </div>
          </div>
        </div>

        {/* ===== Channel browser ===== */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col transition-colors duration-300 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
            <div className="font-bold text-slate-800 dark:text-slate-100 text-sm flex items-center gap-2">
              <Radio size={17} className="text-orange-500" />
              Channels
              <span className="text-[11px] font-semibold bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 rounded-full px-2 py-0.5">
                {filtered.length.toLocaleString()}
              </span>
            </div>
            <button
              onClick={() => setFavOnly(v => !v)}
              title={favOnly ? 'Showing favourites only — click to show all' : 'Show favourites only'}
              className={`relative p-2 rounded-lg transition-colors ${favOnly ? 'text-rose-500 bg-rose-50 dark:bg-rose-500/10' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
            >
              <Heart size={15} className={favOnly ? 'fill-rose-500' : ''} />
              {favorites.length > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[14px] h-[14px] px-0.5 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center">
                  {favorites.length}
                </span>
              )}
            </button>
          </div>

          {/* Filters */}
          <div className="px-3 pt-2.5 pb-2 border-b border-slate-100 dark:border-slate-700 space-y-2">
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search channels…"
                className="w-full bg-slate-100 dark:bg-slate-700/70 border border-transparent focus:border-orange-400 rounded-lg pl-8 pr-7 py-1.5 text-xs text-slate-700 dark:text-slate-200 placeholder:text-slate-400 outline-none transition-colors"
                aria-label="Search channels"
              />
              {query && (
                <button onClick={() => setQuery('')} className="absolute right-1.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded" aria-label="Clear search">
                  <X size={12} />
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <select
                value={country}
                onChange={e => setCountry(e.target.value)}
                className="flex-1 min-w-0 bg-slate-100 dark:bg-slate-700/70 border border-transparent rounded-lg px-2 py-1.5 text-xs text-slate-700 dark:text-slate-200 outline-none focus:border-orange-400 transition-colors"
                aria-label="Country"
              >
                <option value="">🌍 All countries</option>
                {countries.map(c => (
                  <option key={c.code} value={c.code}>{c.flag} {c.name}</option>
                ))}
              </select>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="flex-1 min-w-0 bg-slate-100 dark:bg-slate-700/70 border border-transparent rounded-lg px-2 py-1.5 text-xs text-slate-700 dark:text-slate-200 outline-none focus:border-orange-400 transition-colors"
                aria-label="Category"
              >
                <option value="">🗂 All categories</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Recents */}
          {recents.length > 0 && !favOnly && (
            <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-700">
              <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500 flex items-center gap-1 mb-1.5">
                <History size={11} /> Recently watched
              </div>
              <div className="flex gap-1.5 overflow-x-auto pb-0.5">
                {recents.map(ch => (
                  <button
                    key={ch.url}
                    onClick={() => playChannel(ch)}
                    title={ch.name}
                    className={`flex-shrink-0 max-w-[130px] flex items-center gap-1.5 pl-1.5 pr-2 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                      isCurrent(ch)
                        ? 'bg-orange-500/10 text-orange-600 dark:text-orange-400'
                        : 'bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 hover:bg-orange-50 dark:hover:bg-orange-500/10'
                    }`}
                  >
                    <span className="w-4 h-4 rounded flex-shrink-0 overflow-hidden bg-slate-200 dark:bg-slate-600 relative">
                      {ch.logo && <img src={ch.logo} alt="" className="absolute inset-0 w-full h-full object-contain" onError={e => { e.currentTarget.remove(); }} loading="lazy" />}
                    </span>
                    <span className="truncate">{ch.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Channel list */}
          <div className="flex-1 overflow-y-auto max-h-[520px]">
            {listLoading && channels.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
                <Loader2 size={30} className="animate-spin text-orange-500" />
                <p className="text-sm">Fetching channels…</p>
              </div>
            ) : listError && channels.length === 0 ? (
              <div className="text-center py-14 px-6">
                <PlugZap size={40} className="mx-auto mb-3 text-slate-300 dark:text-slate-600" />
                <p className="text-slate-400 dark:text-slate-500 text-sm">Could not load channels</p>
                <button onClick={() => loadPlaylist(country, category, true)} className="mt-3 text-xs font-semibold text-orange-500 hover:underline">
                  Try again
                </button>
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-14 px-6">
                <Search size={40} className="mx-auto mb-3 text-slate-300 dark:text-slate-600" />
                <p className="text-slate-400 dark:text-slate-500 text-sm">No channels match</p>
                <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">Try a different search or filter</p>
              </div>
            ) : (
              <>
                {shown.map(ch => {
                  const active = isCurrent(ch);
                  return (
                    <div
                      key={ch.id}
                      onClick={() => playChannel(ch)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 cursor-pointer group transition-colors ${active ? 'bg-orange-50 dark:bg-orange-500/10' : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}
                    >
                      <span className="relative w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden bg-slate-100 dark:bg-slate-700">
                        <Tv size={14} className="text-slate-400 dark:text-slate-500" />
                        {ch.logo && (
                          <img
                            src={ch.logo}
                            alt=""
                            loading="lazy"
                            className="absolute inset-0 w-full h-full object-contain bg-white/80 dark:bg-slate-800/80"
                            onError={e => { e.currentTarget.remove(); }}
                            draggable={false}
                          />
                        )}
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className={`block text-sm truncate ${active ? 'text-orange-600 dark:text-orange-400 font-semibold' : 'text-slate-700 dark:text-slate-300'}`}>
                          {ch.name}
                        </span>
                        <span className="block text-[11px] text-slate-400 truncate">
                          {ch.category || 'Stream'} · {hostOf(ch.url) || 'live'}
                        </span>
                      </span>
                      {active && (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-red-500">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" /> LIVE
                        </span>
                      )}
                      <button
                        onClick={e => { e.stopPropagation(); toggleFavorite(ch); }}
                        title={isFav(ch) ? 'Remove from favourites' : 'Add to favourites'}
                        className={`p-1.5 rounded-lg transition-all ${isFav(ch) ? 'opacity-100 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30' : 'opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30'}`}
                      >
                        <Heart size={13} className={isFav(ch) ? 'fill-rose-500 text-rose-500' : ''} />
                      </button>
                    </div>
                  );
                })}
                {filtered.length > visible && (
                  <div className="px-3 py-3">
                    <button
                      onClick={() => setVisible(v => v + PAGE_SIZE)}
                      className="w-full py-2 rounded-xl border border-dashed border-slate-200 dark:border-slate-600 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:border-orange-400 hover:text-orange-500 transition-colors"
                    >
                      Show {Math.min(PAGE_SIZE, filtered.length - visible).toLocaleString()} more · {fmtCount(filtered.length - visible)} remaining
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-700 text-[11px] text-slate-400 dark:text-slate-500">
            <MonitorPlay size={12} className="inline mr-1 -mt-0.5" />
            Live streams need an internet connection. HLS streams play via hls.js; channels using unsupported formats may not start.
          </div>
        </div>
      </div>
    </div>
  );
}
