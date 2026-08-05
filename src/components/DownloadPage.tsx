import { useState, useEffect, type ReactNode } from 'react';
import {
  Download, ExternalLink, Globe, ShieldCheck, Sparkles, ChevronRight, FileDown,
  MonitorDown, HardDrive, CheckCircle2, AlertTriangle, Tag, Info, RefreshCw,
  Rocket, ShieldAlert, FileCheck, PackageCheck, FileArchive, BadgeCheck, ShieldQuestion, Copy,
  FolderDown,
} from 'lucide-react';
import pkg from '../../package.json';

const VERSION = pkg.version ?? '1.0.0';

// Release binaries are too large for a git-based Netlify deploy (GitHub caps
// files at 100 MB), so they're published as GitHub Release assets and served
// from there. `/releases/latest/download/<file>` always points at the newest
// release, so future releases work without touching this page.
const GITHUB_RELEASES_PAGE = 'https://github.com/DharushShimry/StudyFlow/releases';
const GITHUB_RELEASES_BASE = `${GITHUB_RELEASES_PAGE}/latest/download`;
// GitHub release assets are served without CORS headers, so the page reads
// asset availability/size from the CORS-enabled releases API instead.
const GITHUB_RELEASES_API = 'https://api.github.com/repos/DharushShimry/StudyFlow/releases/latest';

const INSTALLER_FILE = `StudyFlow_Setup_v${VERSION}.exe`;
const PORTABLE_FILE = 'StudyFlow-Windows.zip';
const INSTALLER_URL =
  import.meta.env.VITE_STUDYFLOW_WINDOWS_INSTALLER_URL ?? `${GITHUB_RELEASES_BASE}/${INSTALLER_FILE}`;
const WEBSITE_URL =
  import.meta.env.VITE_STUDYFLOW_WEBSITE_URL ?? '/site/index.html';
const PORTABLE_URL =
  import.meta.env.VITE_STUDYFLOW_WINDOWS_PORTABLE_URL ?? `${GITHUB_RELEASES_BASE}/${PORTABLE_FILE}`;

const INSTALLER_SHA256 = '97839b569a2f59772abcacfd9e8720f50f4b36ada169c4d32f27abd7f2e4b4a9';
const PORTABLE_SHA256 = '0a495678df0d9347627061a095b616a8b84eb9aeec47599f8253b71bebbad415';

const INSTALLER_SHA_FILE = `${INSTALLER_FILE}.sha256`;
const PORTABLE_SHA_FILE = `${PORTABLE_FILE}.sha256`;
// Checksum files are tiny, so they live in the repo (public/releases/*.sha256)
// and are served same-origin by the hosting — fetching them cross-origin from
// GitHub would be blocked by CORS.
const INSTALLER_SHA_URL = `/releases/${INSTALLER_SHA_FILE}`;
const PORTABLE_SHA_URL = `/releases/${PORTABLE_SHA_FILE}`;
const RELEASE_DATE = 'Aug 4, 2026';

/** True when the page is loaded from inside the packaged desktop app (file://). */
const isInstalledBuild = typeof window !== 'undefined' && window.location.protocol === 'file:';

type FileStatus = 'checking' | 'ready' | 'missing';

interface FileInfo {
  status: FileStatus;
  size?: number;
}

/** GitHub release asset map: filename -> size in bytes. */
type AssetMap = Record<string, number>;

// Module-level cache so revisiting this page doesn't re-hit the GitHub API.
let assetCache: { at: number; assets: AssetMap } | null = null;

async function fetchReleaseAssets(): Promise<AssetMap | null> {
  if (assetCache && Date.now() - assetCache.at < 10 * 60 * 1000) return assetCache.assets;
  try {
    const res = await fetch(GITHUB_RELEASES_API);
    if (!res.ok) return null;
    const data = await res.json();
    const assets: AssetMap = {};
    for (const a of data.assets ?? []) assets[a.name] = a.size;
    assetCache = { at: Date.now(), assets };
    return assets;
  } catch {
    return null;
  }
}

function useFileInfo(url: string): FileInfo {
  const [info, setInfo] = useState<FileInfo>({ status: 'checking' });

  useEffect(() => {
    let cancelled = false;
    if (isInstalledBuild) {
      // Inside the packaged app the releases aren't bundled — skip the check.
      setInfo({ status: 'missing' });
      return;
    }
    const isGitHubAsset = url.startsWith(GITHUB_RELEASES_BASE);
    const fileName = url.slice(url.lastIndexOf('/') + 1);
    (async () => {
      if (isGitHubAsset) {
        // Cross-origin fetch of GitHub release assets is blocked by CORS, so
        // availability and size come from the releases API (which sends
        // Access-Control-Allow-Origin: *).
        const assets = await fetchReleaseAssets();
        if (cancelled) return;
        if (assets) {
          const size = assets[fileName];
          setInfo(size != null ? { status: 'ready', size } : { status: 'missing' });
          return;
        }
      }
      // Same-origin files (checksums, website) or env-var overrides: HEAD request.
      try {
        const res = await fetch(url, { method: 'HEAD' });
        if (cancelled) return;
        if (res.ok) {
          const len = Number(res.headers.get('Content-Length') ?? 0);
          setInfo({ status: 'ready', size: len > 0 ? len : undefined });
        } else {
          setInfo({ status: 'missing' });
        }
      } catch {
        if (!cancelled) setInfo({ status: 'missing' });
      }
    })();
    return () => { cancelled = true; };
  }, [url]);

  return info;
}

/**
 * Fetches the live checksum for a release file from its .sha256 file (served
 * same-origin from /releases), falling back to the bundled constant when
 * offline or inside the packaged app. The .sha256 files in public/releases are
 * the source of truth — keep them committed so this page shows fresh hashes.
 */
function useSha256(url: string, fallback: string): string {
  const [hash, setHash] = useState(fallback);
  useEffect(() => {
    let cancelled = false;
    if (isInstalledBuild) return;
    (async () => {
      try {
        const res = await fetch(url);
        if (cancelled) return;
        if (res.ok) {
          const m = /^([0-9a-f]{64})/i.exec((await res.text()).trim());
          if (m) setHash(m[1]);
        }
      } catch {
        /* keep the fallback */
      }
    })();
    return () => { cancelled = true; };
  }, [url, fallback]);
  return hash;
}

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${bytes} B`;
}

function StatusBadge({ info }: { info: FileInfo }) {
  if (info.status === 'checking') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 dark:bg-slate-700 px-2.5 py-1 text-[11px] font-semibold text-slate-500 dark:text-slate-300">
        <RefreshCw size={11} className="animate-spin" /> Checking…
      </span>
    );
  }
  if (info.status === 'ready') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 dark:bg-green-900/30 px-2.5 py-1 text-[11px] font-semibold text-green-600 dark:text-green-400">
        <CheckCircle2 size={11} /> Ready to download{info.size ? ` · ${formatBytes(info.size)}` : ''}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 dark:bg-amber-900/30 px-2.5 py-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
      <AlertTriangle size={11} /> Not reachable from this build
    </span>
  );
}

function FileRow({
  icon,
  chipClass,
  name,
  meta,
  href,
  sizeLabel,
  disabled,
  badge,
  badgeClass,
}: {
  icon: ReactNode;
  chipClass: string;
  name: string;
  meta: string;
  href: string;
  sizeLabel?: string;
  disabled?: boolean;
  badge?: string;
  badgeClass?: string;
}) {
  return (
    <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:gap-4">
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-white shadow-lg ${chipClass}`}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="truncate font-mono text-sm font-semibold text-slate-800 dark:text-slate-100">{name}</span>
          {badge && (
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${badgeClass ?? 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-300'}`}>
              {badge}
            </span>
          )}
        </div>
        <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{meta}</div>
      </div>
      {sizeLabel && <span className="shrink-0 text-xs font-semibold text-slate-500 dark:text-slate-400">{sizeLabel}</span>}
      <a
        href={href}
        className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-slate-950 px-3.5 py-2 text-xs font-semibold text-white transition-transform hover:-translate-y-0.5 dark:bg-white dark:text-slate-900 ${disabled ? 'pointer-events-none opacity-40' : ''}`}
      >
        <Download size={13} /> Download
      </a>
    </div>
  );
}

function HashRow({ label, value, file }: { label: ReactNode; value: string; file: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch { /* clipboard unavailable */ }
  };
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-200">
          {label}
        </div>
        <button
          onClick={copy}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-2.5 py-1 text-[11px] font-semibold text-slate-500 dark:text-slate-300 transition-colors hover:border-orange-400 hover:text-orange-500"
        >
          {copied ? <BadgeCheck size={11} className="text-green-500" /> : <Copy size={11} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <div className="mt-1.5 break-all font-mono text-[11px] leading-5 text-slate-500 dark:text-slate-400">{value}</div>
      <div className="mt-1 text-[10px] text-slate-400 dark:text-slate-500">{file}</div>
    </div>
  );
}

export default function DownloadPage() {
  const installerInfo = useFileInfo(INSTALLER_URL);
  const portableInfo = useFileInfo(PORTABLE_URL);
  const siteInfo = useFileInfo(WEBSITE_URL);
  const installerShaInfo = useFileInfo(INSTALLER_SHA_URL);
  const portableShaInfo = useFileInfo(PORTABLE_SHA_URL);
  const installerSha = useSha256(INSTALLER_SHA_URL, INSTALLER_SHA256);
  const portableSha = useSha256(PORTABLE_SHA_URL, PORTABLE_SHA256);

  const cards = [
    {
      title: 'Windows Installer',
      description: 'Recommended. Runs the packaged desktop app and installs it with a Start Menu shortcut, desktop icon and uninstaller.',
      href: INSTALLER_URL,
      button: 'Download Installer',
      accent: 'from-orange-500 to-amber-500',
      icon: MonitorDown,
      info: installerInfo,
      disabled: !isInstalledBuild && installerInfo.status !== 'ready',
      hideBadge: false,
    },
    {
      title: 'Portable App',
      description: 'A zip you extract and run anywhere — no installation needed. Great for USB drives and single-run sessions.',
      href: PORTABLE_URL,
      button: 'Download ZIP',
      accent: 'from-sky-500 to-cyan-500',
      icon: FileDown,
      info: portableInfo,
      disabled: !isInstalledBuild && portableInfo.status !== 'ready',
      hideBadge: false,
    },
    {
      title: 'Explore Website',
      description: 'Open the public site to see the features, learn how it works, and share the app with friends.',
      href: WEBSITE_URL,
      button: 'Open Website',
      accent: 'from-violet-500 to-fuchsia-500',
      icon: Globe,
      info: siteInfo,
      disabled: false,
      hideBadge: true, // website card has no download status badge
    },
  ];

  const steps = [
    'Download the Windows installer (or the portable zip) from the cards above.',
    'Run the installer and follow the setup prompts — or unzip the portable build.',
    'Open StudyFlow from the Start Menu, desktop shortcut, or the extracted folder.',
    'Your data stays on the device: notes, schedules, files and media are all stored locally.',
  ];

  const requirements = [
    { label: 'OS', value: 'Windows 10 or Windows 11 (64-bit)' },
    { label: 'RAM', value: '2 GB or more' },
    { label: 'Disk', value: `~${installerInfo.size ? formatBytes(Math.round(installerInfo.size * 2.5)) : '200'} MB free` },
    { label: 'Internet', value: 'Only needed for live TV and AI features' },
  ];

  const releaseNotes = [
    'Full desktop app — single-instance, maximised, dev tools disabled',
    'Windows installer (Inno Setup) with Start Menu shortcut, desktop icon and uninstaller',
    'Portable ZIP build — extract anywhere, run without installing',
    'Everything is stored locally: notes, timetables, files, media, profile and backups',
    'AI study helpers, revision planner, Pomodoro timer, media player & live TV included',
  ];

  return (
    <div className="px-6 py-8 max-w-7xl mx-auto">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-700 bg-slate-950 text-white shadow-2xl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(249,115,22,0.35),transparent_30%),radial-gradient(circle_at_top_right,rgba(59,130,246,0.22),transparent_28%),linear-gradient(135deg,#0f172a_0%,#111827_48%,#020617_100%)]" />
        <div className="absolute inset-0 opacity-30 bg-[linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[size:38px_38px]" />
        <div className="relative grid gap-8 lg:grid-cols-[1.2fr_0.8fr] p-8 lg:p-10">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold text-orange-200 backdrop-blur-sm">
              <Sparkles size={12} />
              Windows desktop build · v{VERSION}
            </div>
            <div className="space-y-4 max-w-2xl">
              <h1 className="text-4xl sm:text-5xl font-black tracking-tight leading-tight">
                Download StudyFlow for Windows
              </h1>
              <p className="text-base sm:text-lg text-slate-300 leading-7 max-w-xl">
                A polished desktop app — with a full Windows installer, a portable build, and everything saved locally on your device.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <a
                href={INSTALLER_URL}
                className={`inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-orange-950/30 transition-transform hover:-translate-y-0.5 ${!isInstalledBuild && installerInfo.status !== 'ready' ? 'opacity-50 pointer-events-none' : ''}`}
              >
                <Download size={16} />
                Download Installer
                {installerInfo.status === 'ready' && installerInfo.size && (
                  <span className="rounded-full bg-black/25 px-2 py-0.5 text-[11px] font-semibold">.exe · {formatBytes(installerInfo.size)}</span>
                )}
              </a>
              <a
                href={PORTABLE_URL}
                className={`inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/8 px-5 py-3 text-sm font-semibold text-white backdrop-blur-sm transition-transform hover:-translate-y-0.5 hover:bg-white/12 ${!isInstalledBuild && portableInfo.status !== 'ready' ? 'opacity-50 pointer-events-none' : ''}`}
              >
                <FileDown size={16} />
                Portable ZIP
                {portableInfo.status === 'ready' && portableInfo.size && (
                  <span className="rounded-full bg-black/25 px-2 py-0.5 text-[11px] font-semibold">.zip · {formatBytes(portableInfo.size)}</span>
                )}
              </a>
              <a
                href={WEBSITE_URL}
                className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/8 px-5 py-3 text-sm font-semibold text-white backdrop-blur-sm transition-transform hover:-translate-y-0.5 hover:bg-white/12"
              >
                <Globe size={16} />
                Open Website
                <ExternalLink size={14} />
              </a>
            </div>

            {isInstalledBuild && (
              <div className="flex items-start gap-3 rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm text-amber-100">
                <ShieldAlert size={18} className="mt-0.5 shrink-0 text-amber-300" />
                <p className="leading-6">
                  You're running the <span className="font-semibold">installed desktop build</span> — updates aren't
                  pushed automatically. Download the latest{' '}
                  <code className="rounded bg-black/30 px-1.5 py-0.5 font-mono text-[12px]">{INSTALLER_FILE}</code> or{' '}
                  <code className="rounded bg-black/30 px-1.5 py-0.5 font-mono text-[12px]">{PORTABLE_FILE}</code>{' '}
                  from{' '}
                  <a
                    href={GITHUB_RELEASES_PAGE}
                    target="_blank"
                    rel="noreferrer"
                    className="font-semibold underline decoration-amber-400/50 underline-offset-2 hover:text-amber-50"
                  >
                    the GitHub releases page
                  </a>{' '}
                  and run it over this install — your local data is preserved.
                </p>
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-amber-400 text-white shadow-lg shadow-orange-950/30">
                <ShieldCheck size={22} />
              </div>
              <div>
                <div className="text-sm font-bold">Release status</div>
                <div className="text-xs text-slate-300">v{VERSION} · Windows x64</div>
              </div>
            </div>
            <div className="mt-5 space-y-3">
              <div className="rounded-2xl bg-black/20 p-4">
                <div className="text-xs uppercase tracking-[0.2em] text-slate-400 flex items-center gap-1">
                  <MonitorDown size={11} /> Installer
                </div>
                <div className="mt-1 break-all text-sm text-slate-100">{INSTALLER_FILE}</div>
                <div className="mt-2"><StatusBadge info={installerInfo} /></div>
              </div>
              <div className="rounded-2xl bg-black/20 p-4">
                <div className="text-xs uppercase tracking-[0.2em] text-slate-400 flex items-center gap-1">
                  <FileDown size={11} /> Portable
                </div>
                <div className="mt-1 break-all text-sm text-slate-100">{PORTABLE_FILE}</div>
                <div className="mt-2"><StatusBadge info={portableInfo} /></div>
              </div>
              <div className="rounded-2xl bg-black/20 p-4">
                <div className="text-xs uppercase tracking-[0.2em] text-slate-400 flex items-center gap-1">
                  <Globe size={11} /> Website
                </div>
                <div className="mt-1 break-all text-sm text-slate-100">{WEBSITE_URL}</div>
                <div className="mt-2"><StatusBadge info={siteInfo} /></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Download cards */}
      <section className="mt-8 grid gap-4 md:grid-cols-3">
        {cards.map(card => {
          const Icon = card.icon;
          return (
            <article
              key={card.title}
              className="rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-sm transition-transform hover:-translate-y-1"
            >
              <div className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${card.accent} text-white shadow-lg`}>
                <Icon size={22} />
              </div>
              {!card.hideBadge && <div className="mt-3"><StatusBadge info={card.info} /></div>}
              <h2 className="mt-3 text-lg font-bold text-slate-900 dark:text-slate-100">{card.title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">{card.description}</p>
              <a
                href={card.href}
                className={`mt-4 inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5 dark:bg-white dark:text-slate-900 ${card.disabled ? 'opacity-40 pointer-events-none' : ''}`}
              >
                {card.button}
                <ChevronRight size={14} />
              </a>
            </article>
          );
        })}
      </section>

      {/* Download files — every release artifact */}
      <section className="mt-8">
        <div className="rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <FolderDown size={18} className="text-orange-500" /> Download files
            </h2>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-50 dark:bg-orange-500/15 px-3 py-1 text-[11px] font-semibold text-orange-600 dark:text-orange-300">
              <Tag size={11} /> v{VERSION} · {RELEASE_DATE}
            </span>
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
            Every file from the latest release, ready to grab. Download a{' '}
            <code className="rounded bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 font-mono text-[11px]">.sha256</code>{' '}
            checksum file alongside any binary and verify it before running.
          </p>

          <div className="mt-2 divide-y divide-slate-100 dark:divide-slate-700/60">
            <FileRow
              icon={<MonitorDown size={18} />}
              chipClass="bg-gradient-to-br from-orange-500 to-amber-500"
              name={INSTALLER_FILE}
              meta="Windows installer — Start Menu shortcut, desktop icon and uninstaller"
              href={INSTALLER_URL}
              sizeLabel={installerInfo.status === 'ready' && installerInfo.size ? formatBytes(installerInfo.size) : undefined}
              disabled={!isInstalledBuild && installerInfo.status !== 'ready'}
              badge="Recommended"
              badgeClass="bg-orange-100 text-orange-600 dark:bg-orange-500/15 dark:text-orange-300"
            />
            <FileRow
              icon={<FileArchive size={18} />}
              chipClass="bg-gradient-to-br from-sky-500 to-cyan-500"
              name={PORTABLE_FILE}
              meta="Portable ZIP — extract anywhere, no installation needed"
              href={PORTABLE_URL}
              sizeLabel={portableInfo.status === 'ready' && portableInfo.size ? formatBytes(portableInfo.size) : undefined}
              disabled={!isInstalledBuild && portableInfo.status !== 'ready'}
              badge="No install"
              badgeClass="bg-sky-100 text-sky-600 dark:bg-sky-500/15 dark:text-sky-300"
            />
            <FileRow
              icon={<ShieldCheck size={18} />}
              chipClass="bg-gradient-to-br from-emerald-500 to-teal-500"
              name={INSTALLER_SHA_FILE}
              meta="SHA-256 checksum for the installer — verify before you run"
              href={INSTALLER_SHA_URL}
              sizeLabel={installerShaInfo.status === 'ready' && installerShaInfo.size ? formatBytes(installerShaInfo.size) : undefined}
              disabled={!isInstalledBuild && installerShaInfo.status !== 'ready'}
            />
            <FileRow
              icon={<ShieldCheck size={18} />}
              chipClass="bg-gradient-to-br from-emerald-500 to-teal-500"
              name={PORTABLE_SHA_FILE}
              meta="SHA-256 checksum for the portable ZIP — verify before you run"
              href={PORTABLE_SHA_URL}
              sizeLabel={portableShaInfo.status === 'ready' && portableShaInfo.size ? formatBytes(portableShaInfo.size) : undefined}
              disabled={!isInstalledBuild && portableShaInfo.status !== 'ready'}
            />
            <FileRow
              icon={<Globe size={18} />}
              chipClass="bg-gradient-to-br from-violet-500 to-fuchsia-500"
              name="index.html"
              meta="The marketing website — run StudyFlow in your browser instead"
              href={WEBSITE_URL}
              sizeLabel="Instant"
              badge="Web app"
              badgeClass="bg-violet-100 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300"
            />
          </div>
        </div>
      </section>

      {/* Release notes + Verify download */}
      <section className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Rocket size={18} className="text-orange-500" /> What's new in v{VERSION}
          </h2>
          <div className="mt-4 flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-50 dark:bg-orange-500/15 px-3 py-1 text-[11px] font-bold text-orange-600 dark:text-orange-300">
              <Tag size={11} /> v{VERSION} — first public release
            </span>
          </div>
          <ul className="mt-4 space-y-3">
            {releaseNotes.map(note => (
              <li key={note} className="flex gap-3 text-sm leading-6 text-slate-600 dark:text-slate-400">
                <CheckCircle2 size={16} className="mt-1 shrink-0 text-green-500" />
                {note}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <FileCheck size={18} className="text-sky-500" /> Verify your download
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
            Compare the SHA-256 checksum of the file you downloaded to keep your copy authentic and untampered.
          </p>
          <div className="mt-4 space-y-3">
            <HashRow label={<><PackageCheck size={12} className="text-orange-500" /> Installer SHA-256</>} value={installerSha} file={INSTALLER_FILE} />
            <HashRow label={<><FileArchive size={12} className="text-sky-500" /> Portable SHA-256</>} value={portableSha} file={PORTABLE_FILE} />
          </div>
          <p className="mt-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 p-3.5 text-xs leading-5 text-slate-500 dark:text-slate-400">
            <span className="font-semibold text-slate-700 dark:text-slate-200">Verify on Windows:</span> run{' '}
            <code className="rounded bg-slate-200 dark:bg-slate-700 px-1 py-0.5 font-mono text-[11px]">certutil -hashfile &lt;file&gt; SHA256</code>{' '}
            and compare the output.
          </p>
        </div>
      </section>

      {/* Requirements + Install steps */}
      <section className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">System requirements</h2>
          <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {requirements.map(req => (
              <div key={req.label} className="flex items-start gap-3 rounded-2xl bg-slate-50 dark:bg-slate-700/40 border border-slate-100 dark:border-slate-600/50 p-3.5">
                <HardDrive size={16} className="mt-0.5 text-orange-500 flex-shrink-0" />
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{req.label}</div>
                  <div className="text-sm font-medium text-slate-700 dark:text-slate-200">{req.value}</div>
                </div>
              </div>
            ))}
          </div>

          <h2 className="mt-8 text-xl font-bold text-slate-900 dark:text-slate-100">How to install</h2>
          <div className="mt-5 space-y-4">
            {steps.map((step, index) => (
              <div key={step} className="flex gap-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-100 text-sm font-bold text-orange-700 dark:bg-orange-500/15 dark:text-orange-300">
                  {index + 1}
                </div>
                <p className="pt-1 text-sm leading-6 text-slate-600 dark:text-slate-400">{step}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-6 shadow-sm">
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">What you get</h2>
            <ul className="mt-5 space-y-3 text-sm text-slate-600 dark:text-slate-400">
              <li className="flex gap-3"><span className="mt-1 h-2 w-2 rounded-full bg-orange-500" />Track classes and school schedules</li>
              <li className="flex gap-3"><span className="mt-1 h-2 w-2 rounded-full bg-orange-500" />Take notes and manage books and files</li>
              <li className="flex gap-3"><span className="mt-1 h-2 w-2 rounded-full bg-orange-500" />Media player with live TV and local storage</li>
              <li className="flex gap-3"><span className="mt-1 h-2 w-2 rounded-full bg-orange-500" />Pomodoro timer, revision planner and AI helpers</li>
            </ul>

            <div className="mt-6 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400 flex items-center gap-1.5">
                <Info size={12} /> Privacy
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
                Everything — accounts, notes, files and media — is stored locally on the device. Nothing leaves your machine except optional AI and live-TV requests.
              </p>
            </div>

            <div className="mt-4 rounded-2xl border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-600 dark:text-amber-300 flex items-center gap-1.5">
                <ShieldQuestion size={12} /> SmartScreen notice
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
                The installer isn't code-signed yet, so Windows SmartScreen may show an "unknown publisher" prompt. Click{' '}
                <span className="font-semibold text-slate-700 dark:text-slate-200">More info → Run anyway</span>. Verify the
                SHA-256 checksum above before installing.
              </p>
            </div>
          </div>

        </div>
      </section>

      {/* Version footer */}
      <p className="mt-8 flex items-center justify-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
        <Tag size={12} /> StudyFlow v{VERSION} · Desktop build · Windows x64 · All data stored locally
      </p>
    </div>
  );
}
