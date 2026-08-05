import { useState, useEffect, useRef } from "react";
import {
  Download,
  BookOpen,
  Calendar,
  Brain,
  Clock,
  FileText,
  Music,
  Shield,
  Zap,
  Star,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  Monitor,
  Archive,
  Globe,
  Menu,
  X,
  GraduationCap,
  BarChart3,
  Layers,
  Play,
  Code2,
  Image,
  Bot,
  Rocket,
  FileArchive,
  FileCheck,
  PackageCheck,
  ShieldQuestion,
  Cpu,
  HardDrive,
  BadgeCheck,
  Copy,
  Check,
  Heart,
  Users,
  Quote,
  Lock,
  Wifi,
  TrendingUp,
  FolderDown,
  ListChecks,
  ShieldCheck,
  FileDown,
} from "lucide-react";

/* ── Release constants — binaries live on GitHub Releases (too large for git/Netlify) ── */
const VERSION = "1.0.0";
const RELEASE_DATE = "Aug 4, 2026";
const GITHUB_RELEASES_BASE = "https://github.com/DharushShimry/StudyFlow/releases/latest/download";
const INSTALLER_FILE = `StudyFlow_Setup_v${VERSION}.exe`;
const ZIP_FILE = "StudyFlow-Windows.zip";
const INSTALLER_SHA_FILE = `${INSTALLER_FILE}.sha256`;
const ZIP_SHA_FILE = `${ZIP_FILE}.sha256`;
const INSTALLER_URL = `${GITHUB_RELEASES_BASE}/${INSTALLER_FILE}`;
const ZIP_URL = `${GITHUB_RELEASES_BASE}/${ZIP_FILE}`;
const INSTALLER_SHA_URL = `${GITHUB_RELEASES_BASE}/${INSTALLER_SHA_FILE}`;
const ZIP_SHA_URL = `${GITHUB_RELEASES_BASE}/${ZIP_SHA_FILE}`;
const APP_URL = "../index.html";
const INSTALLER_SHA = "97839b569a2f59772abcacfd9e8720f50f4b36ada169c4d32f27abd7f2e4b4a9";
const ZIP_SHA = "0a495678df0d9347627061a095b616a8b84eb9aeec47599f8253b71bebbad415";

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${bytes} B`;
}

/* Real file sizes from the GitHub releases API (CORS-enabled) — falls back to the known size. */
function useReleaseSizes() {
  const [sizes, setSizes] = useState<Record<string, string>>({});
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("https://api.github.com/repos/DharushShimry/StudyFlow/releases/latest");
        if (!res.ok) return;
        const data = await res.json();
        const map: Record<string, string> = {};
        for (const a of data.assets ?? []) map[a.name] = formatBytes(a.size);
        if (!cancelled) setSizes(map);
      } catch {
        /* keep fallback */
      }
    })();
    return () => { cancelled = true; };
  }, []);
  return sizes;
}

/* ── Tiny hook: observe when element enters viewport ── */
function useInView<T extends HTMLElement = HTMLDivElement>(options = {}) {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) setInView(true);
    }, { threshold: 0.12, ...options });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return { ref, inView };
}

/* ── Animated counter ── */
function Counter({ to, suffix = "" }: { to: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const { ref, inView } = useInView();
  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const step = to / 60;
    const id = setInterval(() => {
      start += step;
      if (start >= to) { setCount(to); clearInterval(id); }
      else setCount(Math.floor(start));
    }, 16);
    return () => clearInterval(id);
  }, [inView, to]);
  return <span ref={ref}>{count}{suffix}</span>;
}

/* ── Copy-to-clipboard button ── */
function CopyButton({ value, label = "Copy" }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch { /* clipboard unavailable */ }
  };
  return (
    <button
      onClick={copy}
      className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-bold text-slate-400 transition-colors hover:border-orange-500/40 hover:text-orange-300"
    >
      {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
      {copied ? "Copied" : label}
    </button>
  );
}

/* ── Feature card ── */
type Feature = {
  icon: React.ReactNode;
  badge: string;
  title: string;
  desc: string;
  color: string;
};

function FeatureCard({ feature, delay }: { feature: Feature; delay: number }) {
  const { ref, inView } = useInView();
  return (
    <div
      ref={ref}
      className="card-hover glass rounded-3xl p-6 flex flex-col gap-4"
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? "translateY(0)" : "translateY(32px)",
        transition: `opacity 0.6s ease ${delay}ms, transform 0.6s ease ${delay}ms`,
      }}
    >
      <div className="flex items-start justify-between">
        <div className={`feature-icon-wrap rounded-2xl p-3 ${feature.color}`}>
          {feature.icon}
        </div>
        <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-slate-400">
          {feature.badge}
        </span>
      </div>
      <div>
        <h3 className="text-base font-bold text-slate-100 mb-2">{feature.title}</h3>
        <p className="text-sm text-slate-400 leading-relaxed">{feature.desc}</p>
      </div>
    </div>
  );
}

/* ── Step item ── */
function Step({ num, title, desc, last }: { num: string; title: string; desc: string; last?: boolean }) {
  const { ref, inView } = useInView();
  return (
    <div
      ref={ref}
      className="flex gap-5"
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? "translateX(0)" : "translateX(-24px)",
        transition: "opacity 0.6s ease, transform 0.6s ease",
      }}
    >
      <div className="flex flex-col items-center">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-white font-black text-sm shrink-0 shadow-lg shadow-orange-500/30">
          {num}
        </div>
        {!last && <div className="w-px flex-1 mt-3 step-line" />}
      </div>
      <div className="pb-8">
        <h4 className="font-bold text-slate-100 mb-1">{title}</h4>
        <p className="text-sm text-slate-400 leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}

/* ── Download card ── */
type DownloadCardProps = {
  icon: React.ReactNode;
  gradient: string;
  title: string;
  file: string;
  href: string;
  sizeFallback: string;
  tag: string;
  desc: string;
};

function DownloadCard({ icon, gradient, title, file, href, sizeFallback, tag, desc }: DownloadCardProps) {
  const { ref, inView } = useInView<HTMLAnchorElement>();
  const sizeLabel = useDownloadInfo(href, sizeFallback);
  return (
    <a
      ref={ref}
      href={href}
      className="download-card glass rounded-3xl p-7 flex flex-col gap-4 group block"
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? "translateY(0)" : "translateY(32px)",
        transition: "opacity 0.6s ease, transform 0.6s ease",
      }}
    >
      <div className="flex items-start justify-between">
        <div className={`rounded-2xl p-3 bg-gradient-to-br ${gradient} text-white shadow-lg`}>
          {icon}
        </div>
        <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-slate-400">
          {tag}
        </span>
      </div>
      <div className="flex-1">
        <h3 className="text-lg font-bold text-slate-100 mb-1 flex items-center gap-2">
          {title}
          <ArrowRight className="w-4 h-4 text-orange-400 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-300" />
        </h3>
        <p className="font-mono text-xs text-slate-500 break-all mb-2">{file}</p>
        <p className="text-sm text-slate-400 leading-relaxed">{desc}</p>
      </div>
      <div className="flex items-center justify-between border-t border-white/10 pt-4">
        <span className="text-xs font-semibold text-emerald-400 inline-flex items-center gap-1.5">
          <BadgeCheck className="w-3.5 h-3.5" /> Ready · {sizeLabel}
        </span>
        <span className="text-xs font-bold text-white bg-gradient-to-r from-orange-500 to-amber-500 px-4 py-2 rounded-xl shadow-lg shadow-orange-500/25 group-hover:shadow-orange-500/50 transition-all">
          Download
        </span>
      </div>
    </a>
  );
}

/* ── File row (all release files table) ── */
type FileRowProps = {
  icon: React.ReactNode;
  chipClass: string;
  name: string;
  meta: string;
  href: string;
  sizeLabel: string;
  badge?: string;
  badgeClass?: string;
  external?: boolean;
};

function FileRow({ icon, chipClass, name, meta, href, sizeLabel, badge, badgeClass, external }: FileRowProps) {
  const { ref, inView } = useInView<HTMLDivElement>();
  return (
    <div
      ref={ref}
      className="file-row flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 py-4"
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? "translateX(0)" : "translateX(24px)",
        transition: "opacity 0.5s ease, transform 0.5s ease",
      }}
    >
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${chipClass} text-white shadow-lg`}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="truncate font-mono text-[13px] font-bold text-slate-100">{name}</span>
          {badge && (
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/5 border border-white/10 ${badgeClass ?? "text-slate-400"}`}>
              {badge}
            </span>
          )}
        </div>
        <div className="mt-0.5 text-xs text-slate-500">{meta}</div>
      </div>
      <span className="shrink-0 text-xs font-semibold text-slate-400 sm:text-right sm:min-w-[64px]">{sizeLabel}</span>
      <a
        href={href}
        className="shrink-0 inline-flex items-center gap-1.5 text-xs font-bold text-white bg-gradient-to-r from-orange-500 to-amber-500 px-4 py-2 rounded-xl shadow-lg shadow-orange-500/25 hover:shadow-orange-500/50 hover:-translate-y-0.5 transition-all"
      >
        {external ? <Globe className="w-3.5 h-3.5" /> : <Download className="w-3.5 h-3.5" />}
        {external ? "Open" : "Download"}
      </a>
    </div>
  );
}

/* ── Testimonial card ── */
type Testimonial = {
  quote: string;
  name: string;
  role: string;
  initials: string;
  color: string;
};

function TestimonialCard({ t, delay }: { t: Testimonial; delay: number }) {
  const { ref, inView } = useInView();
  return (
    <div
      ref={ref}
      className="glass rounded-3xl p-7 card-hover flex flex-col gap-5"
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? "translateY(0)" : "translateY(32px)",
        transition: `opacity 0.6s ease ${delay}ms, transform 0.6s ease ${delay}ms`,
      }}
    >
      <Quote className="w-8 h-8 text-orange-500/30" />
      <p className="text-sm text-slate-300 leading-relaxed flex-1">“{t.quote}”</p>
      <div className="flex items-center gap-1">
        {[...Array(5)].map((_, i) => (
          <Star key={i} className="w-4 h-4 text-amber-400 fill-amber-400" />
        ))}
      </div>
      <div className="flex items-center gap-3 pt-4 border-t border-white/10">
        <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${t.color} flex items-center justify-center text-xs font-black text-white shadow-lg shrink-0`}>
          {t.initials}
        </div>
        <div>
          <div className="text-sm font-bold text-slate-100">{t.name}</div>
          <div className="text-xs text-slate-500">{t.role}</div>
        </div>
      </div>
    </div>
  );
}

/* ── FAQ item ── */
function FaqItem({ q, a, open, onToggle }: { q: string; a: string; open: boolean; onToggle: () => void }) {
  return (
    <div className={`glass rounded-2xl overflow-hidden transition-colors ${open ? "border-orange-500/30" : ""}`}>
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left"
      >
        <span className="font-bold text-slate-100 text-sm sm:text-base">{q}</span>
        <span
          className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center border transition-all duration-300 ${open ? "bg-orange-500 border-orange-500 text-white rotate-180" : "border-white/15 text-slate-400"}`}
        >
          <ChevronDown className="w-4 h-4" />
        </span>
      </button>
      <div
        className="grid transition-all duration-300 ease-out"
        style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden">
          <p className="px-6 pb-5 text-sm text-slate-400 leading-relaxed">{a}</p>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════
   MAIN APP
════════════════════════════════════════════ */
export default function App() {
  const [navOpen, setNavOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [showSticky, setShowSticky] = useState(false);
  const [showTop, setShowTop] = useState(false);
  const [progress, setProgress] = useState(0);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 40);
      setShowSticky(window.scrollY > 640);
      setShowTop(window.scrollY > 900);
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(max > 0 ? Math.min(100, (window.scrollY / max) * 100) : 0);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const releaseSizes = useReleaseSizes();
  const installerSizeLabel = releaseSizes[INSTALLER_FILE] ?? "244.7 MB";
  const zipSizeLabel = releaseSizes[ZIP_FILE] ?? "273.2 MB";

  const features: Feature[] = [
    {
      icon: <Calendar className="w-5 h-5 text-orange-400" />,
      badge: "Plan your day",
      title: "Timetables & Planning",
      desc: "Keep class and school schedules in one place. Jump into the dashboard for a quick daily overview with reminders.",
      color: "bg-orange-500/10 border-orange-500/20",
    },
    {
      icon: <FileText className="w-5 h-5 text-sky-400" />,
      badge: "Study smarter",
      title: "Notes & Books",
      desc: "Take rich notes, manage your study books, and organise your academic files in a clean, distraction-free editor.",
      color: "bg-sky-500/10 border-sky-500/20",
    },
    {
      icon: <Clock className="w-5 h-5 text-violet-400" />,
      badge: "Stay focused",
      title: "Pomodoro Focus Timer",
      desc: "Built-in Pomodoro timer keeps you locked in during sessions and tells you exactly when to rest.",
      color: "bg-violet-500/10 border-violet-500/20",
    },
    {
      icon: <Brain className="w-5 h-5 text-emerald-400" />,
      badge: "AI-powered",
      title: "AI Study Helpers",
      desc: "Smart revision suggestions, quiz generation, and AI-powered summaries that adapt to your learning pace.",
      color: "bg-emerald-500/10 border-emerald-500/20",
    },
    {
      icon: <Music className="w-5 h-5 text-pink-400" />,
      badge: "Media library",
      title: "Media Player & Files",
      desc: "Preview images, play study music, and manage all your study media without leaving the app.",
      color: "bg-pink-500/10 border-pink-500/20",
    },
    {
      icon: <Shield className="w-5 h-5 text-amber-400" />,
      badge: "100% private",
      title: "Fully Local & Private",
      desc: "Every byte of your study data stays on your device. No sign-up, no cloud sync, no tracking — ever.",
      color: "bg-amber-500/10 border-amber-500/20",
    },
    {
      icon: <BarChart3 className="w-5 h-5 text-cyan-400" />,
      badge: "Track progress",
      title: "Revision Planner",
      desc: "Integrated calendar and revision planner with spaced-repetition logic to help you ace your exams.",
      color: "bg-cyan-500/10 border-cyan-500/20",
    },
    {
      icon: <Layers className="w-5 h-5 text-indigo-400" />,
      badge: "All-in-one",
      title: "Unified Dashboard",
      desc: "Everything in a single, beautiful window. Switch between tools without losing context or your flow.",
      color: "bg-indigo-500/10 border-indigo-500/20",
    },
    {
      icon: <Bot className="w-5 h-5 text-rose-400" />,
      badge: "Smart tools",
      title: "Flashcard Generator",
      desc: "Paste your notes and watch AI turn them into bite-sized flashcards, ready for rapid-fire revision.",
      color: "bg-rose-500/10 border-rose-500/20",
    },
  ];

  const navLinks = [
    { label: "Features", href: "#features" },
    { label: "Download", href: "#download" },
    { label: "How it Works", href: "#how" },
    { label: "Reviews", href: "#reviews" },
    { label: "FAQ", href: "#faq" },
  ];

  const faqs = [
    { q: "Is StudyFlow really free?", a: "Yes — free forever. No subscriptions, no accounts, no hidden costs. Everything runs locally on your device." },
    { q: "Do I need internet after installing?", a: "No. Notes, timetables, files, media and backups all live on your device. Internet is only needed for the optional AI helpers and live TV." },
    { q: "Why does Windows show an unknown publisher warning?", a: "The installer is not code-signed yet, so SmartScreen may warn you. Click \"More info\" → \"Run anyway\", and verify the SHA-256 checksum on this page first." },
    { q: "What's the difference between the installer and the ZIP?", a: "The installer adds a Start Menu shortcut, desktop icon and an uninstaller. The ZIP is fully portable — extract it anywhere and run it, no installation." },
    { q: "Will I lose my data when updating?", a: "No — all data is stored locally under your Windows profile and preserved on upgrade. You can also export a full backup from Settings anytime." },
    { q: "Is there a Mac or Linux version?", a: "Not yet — this release targets Windows 10 and 11 (64-bit). The web app works in any modern browser, and more platforms are on the roadmap." },
    { q: "How do I update StudyFlow?", a: "New builds are published on this page. Just download the latest installer and run it over your current version — your local data is always preserved." },
  ];

  const requirements = [
    { icon: <Monitor className="w-4 h-4 text-orange-400" />, label: "OS", value: "Windows 10 / 11 · 64-bit" },
    { icon: <Cpu className="w-4 h-4 text-sky-400" />, label: "CPU", value: "1.6 GHz or faster" },
    { icon: <HardDrive className="w-4 h-4 text-emerald-400" />, label: "Storage", value: "~200 MB free" },
    { icon: <Shield className="w-4 h-4 text-violet-400" />, label: "Privacy", value: "100% local & offline" },
  ];

  const releaseNotes = [
    "Full desktop app — single-instance, maximised, dev tools disabled",
    "Windows installer (Inno Setup) with Start Menu shortcut, desktop icon and uninstaller",
    "Portable ZIP build — extract anywhere, run without installing",
    "AI study helpers, revision planner, Pomodoro timer, media player & live TV included",
    "All data stored locally: notes, timetables, files, media, profile and backups",
  ];

  const stats = [
    { icon: <Layers className="w-5 h-5 text-orange-400" />, value: 9, suffix: "+", label: "Built-in tools" },
    { icon: <Lock className="w-5 h-5 text-emerald-400" />, value: 100, suffix: "%", label: "Local & private" },
    { icon: <Users className="w-5 h-5 text-sky-400" />, value: 0, suffix: " accounts", label: "Never required" },
    { icon: <Wifi className="w-5 h-5 text-violet-400" />, value: 24, suffix: "/7", label: "Works offline" },
  ];

  const compareRows = [
    { feature: "Price", others: "Monthly subscriptions", flow: "Free forever" },
    { feature: "Your data", others: "Cloud servers & trackers", flow: "100% on your device" },
    { feature: "Account required", others: "Almost always", flow: "Never" },
    { feature: "Works offline", others: "Rarely", flow: "Fully offline" },
    { feature: "Study tools", others: "One or two apps", flow: "9 tools in one window" },
    { feature: "Setup time", others: "Sign-up + configuration", flow: "Install & go" },
  ];

  const testimonials: Testimonial[] = [
    {
      quote: "The revision planner alone replaced my whole paper system. Timetable, notes, Pomodoro — it's all in one window now.",
      name: "Amina K.",
      role: "Medical student",
      initials: "AK",
      color: "from-orange-500 to-amber-500",
    },
    {
      quote: "I study in the library where there's barely any signal. Everything works offline, no account, no ads. Perfect.",
      name: "Daniel R.",
      role: "Engineering student",
      initials: "DR",
      color: "from-sky-500 to-cyan-500",
    },
    {
      quote: "The AI flashcard generator turned my messy notes into revision cards in seconds. My focus sessions have never been better.",
      name: "Sofia M.",
      role: "Law student",
      initials: "SM",
      color: "from-violet-500 to-fuchsia-500",
    },
  ];

  return (
    <div className="relative min-h-screen overflow-x-hidden" style={{ background: "#020617" }}>

      {/* ── Scroll progress bar ── */}
      <div className="fixed top-0 left-0 right-0 z-[100] h-[3px] pointer-events-none">
        <div
          className="h-full bg-gradient-to-r from-orange-500 via-amber-400 to-sky-500"
          style={{ width: `${progress}%`, transition: "width 0.1s linear" }}
        />
      </div>

      {/* ── Ambient background blobs ── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div
          className="blob absolute w-[700px] h-[700px] -top-48 -left-48 opacity-20 pulse-glow"
          style={{ background: "radial-gradient(circle, rgba(249,115,22,0.6) 0%, transparent 70%)" }}
        />
        <div
          className="blob absolute w-[600px] h-[600px] top-1/3 -right-32 opacity-15 pulse-glow"
          style={{ background: "radial-gradient(circle, rgba(56,189,248,0.5) 0%, transparent 70%)", animationDelay: "1s" }}
        />
        <div
          className="blob absolute w-[500px] h-[500px] bottom-0 left-1/3 opacity-10 pulse-glow"
          style={{ background: "radial-gradient(circle, rgba(129,140,248,0.5) 0%, transparent 70%)", animationDelay: "2s" }}
        />
        {/* grid overlay */}
        <div className="grid-bg absolute inset-0 opacity-100" />
      </div>

      {/* ══════════════════════ NAVBAR ══════════════════════ */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
        style={{
          background: scrolled ? "rgba(2,6,23,0.9)" : "transparent",
          backdropFilter: scrolled ? "blur(20px)" : "none",
          borderBottom: scrolled ? "1px solid rgba(148,163,184,0.1)" : "1px solid transparent",
        }}
      >
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <a href="#" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-lg shadow-orange-500/30 group-hover:shadow-orange-500/50 transition-shadow">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <span className="font-black text-lg tracking-tight text-white">Study<span className="gradient-text">Flow</span></span>
          </a>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-7">
            {navLinks.map((l) => (
              <a key={l.label} href={l.href} className="nav-link">{l.label}</a>
            ))}
          </div>

          {/* CTA */}
          <div className="hidden md:flex items-center gap-3">
            <a href="../index.html" className="btn-secondary rounded-xl px-4 py-2 text-sm font-semibold flex items-center gap-2">
              <Globe className="w-4 h-4" /> Open App
            </a>
            <a href={INSTALLER_URL} className="btn-primary rounded-xl px-4 py-2 text-sm font-bold flex items-center gap-2">
              <Download className="w-4 h-4" /> Download Installer
            </a>
          </div>

          {/* Mobile toggle */}
          <button
            className="md:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition"
            onClick={() => setNavOpen(!navOpen)}
          >
            {navOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile menu */}
        <div
          className="md:hidden overflow-hidden transition-all duration-300"
          style={{ maxHeight: navOpen ? "360px" : "0" }}
        >
          <div className="glass-strong border-t border-white/10 px-6 py-4 flex flex-col gap-3">
            {navLinks.map((l) => (
              <a key={l.label} href={l.href} className="text-slate-300 font-medium py-2 border-b border-white/5" onClick={() => setNavOpen(false)}>
                {l.label}
              </a>
            ))}
            <div className="flex gap-3 pt-2">
              <a href="../index.html" className="btn-secondary rounded-xl px-4 py-2.5 text-sm font-semibold flex-1 text-center">Open App</a>
              <a href={INSTALLER_URL} className="btn-primary rounded-xl px-4 py-2.5 text-sm font-bold flex-1 text-center">Download Installer</a>
            </div>
          </div>
        </div>
      </nav>

      {/* ══════════════════════ HERO ══════════════════════ */}
      <section className="relative z-10 pt-32 pb-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col items-center text-center">

            {/* Eyebrow pill */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold text-orange-300 bg-orange-500/10 border border-orange-500/25 mb-8 float-animation">
              <Sparkles className="w-3.5 h-3.5" />
              Windows App — v{VERSION}
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse ml-1" />
            </div>

            {/* Headline */}
            <h1 className="text-6xl sm:text-7xl lg:text-8xl font-black tracking-tight leading-none mb-6">
              <span className="text-white">Study</span>
              <span className="gradient-text">Flow</span>
            </h1>
            <p className="text-xl sm:text-2xl font-semibold text-slate-300 mb-4 tracking-tight shimmer-text">
              Your All-in-One Study Hub
            </p>
            <p className="max-w-2xl text-slate-400 text-base sm:text-lg leading-relaxed mb-10">
              A focused study hub for schedules, notes, files, media, revision planning, and AI tools.
              Download the Windows app or explore the product site before installing.
            </p>

            {/* CTA buttons */}
            <div className="flex flex-wrap gap-4 justify-center mb-10">
              <a
                href={INSTALLER_URL}
                className="btn-primary rounded-2xl px-7 py-4 font-black text-lg flex items-center gap-3 shadow-2xl shadow-orange-500/25"
              >
                <Monitor className="w-5 h-5" />
                Download Installer
                <span className="text-xs font-semibold bg-white/20 px-2 py-0.5 rounded-full">.exe · {installerSizeLabel}</span>
              </a>
              <a
                href={ZIP_URL}
                className="btn-secondary rounded-2xl px-7 py-4 font-bold text-lg flex items-center gap-3"
              >
                <Archive className="w-5 h-5" />
                Download ZIP
                <span className="text-xs font-semibold bg-white/10 border border-white/15 px-2 py-0.5 rounded-full">{zipSizeLabel}</span>
              </a>
              <a
                href={APP_URL}
                className="btn-secondary rounded-2xl px-7 py-4 font-bold text-lg flex items-center gap-3"
              >
                <Globe className="w-5 h-5" />
                Open Web App
              </a>
            </div>

            <p className="text-xs text-slate-500 mb-2 font-mono">
              Latest release: <span className="text-emerald-400">v{VERSION}</span> · {INSTALLER_FILE} · {RELEASE_DATE}
            </p>

            {/* Social proof stats */}
            <div className="grid grid-cols-3 gap-6 sm:gap-10 w-full max-w-lg">
              {[
                { value: 9, suffix: "+", label: "Built-in Tools" },
                { value: 100, suffix: "%", label: "Local & Private" },
                { value: 0, suffix: " cost", label: "Forever Free" },
              ].map((s) => (
                <div key={s.label} className="stat-card rounded-2xl py-4 px-3 text-center">
                  <div className="text-2xl sm:text-3xl font-black gradient-text">
                    <Counter to={s.value} suffix={s.suffix} />
                  </div>
                  <div className="text-xs text-slate-500 mt-1 font-medium">{s.label}</div>
                </div>
              ))}
            </div>

            {/* App window mockup (decorative) */}
            <div aria-hidden="true" className="relative w-full max-w-3xl mx-auto mt-20">
              <div className="absolute -inset-8 bg-gradient-to-r from-orange-500/25 via-amber-500/10 to-sky-500/25 blur-3xl rounded-[48px] opacity-60" />
              <div className="relative app-window rounded-3xl border border-white/10 bg-[#0b1220]/90 backdrop-blur-xl overflow-hidden shadow-2xl shadow-black/70">
                {/* titlebar */}
                <div className="flex items-center gap-2 px-5 py-3.5 border-b border-white/8 bg-white/5">
                  <span className="w-3 h-3 rounded-full bg-[#ff5f57]" />
                  <span className="w-3 h-3 rounded-full bg-[#febc2e]" />
                  <span className="w-3 h-3 rounded-full bg-[#28c840]" />
                  <span className="ml-3 text-[11px] font-semibold text-slate-400">StudyFlow — Dashboard</span>
                  <span className="ml-auto text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full hidden sm:inline-flex items-center gap-1">
                    <Zap className="w-3 h-3" /> v{VERSION}
                  </span>
                </div>
                <div className="grid grid-cols-[170px_1fr]">
                  {/* sidebar */}
                  <div className="border-r border-white/8 p-3 space-y-1.5 hidden sm:block">
                    {["Dashboard", "Timetable", "Notes", "Media", "Pomodoro", "AI Tools", "Settings"].map((item, i) => (
                      <div
                        key={item}
                        className={`flex items-center gap-2 rounded-lg px-2.5 py-2 text-[11px] font-semibold ${i === 0 ? "bg-orange-500/20 text-orange-300" : "text-slate-500"}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${i === 0 ? "bg-orange-400" : "bg-slate-600"}`} />
                        {item}
                      </div>
                    ))}
                  </div>
                  {/* content */}
                  <div className="p-4 sm:p-5 space-y-3">
                    <div className="h-5 w-2/5 rounded-lg bg-gradient-to-r from-orange-500/80 to-amber-500/40" />
                    <div className="grid grid-cols-3 gap-3">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="rounded-xl border border-white/8 bg-white/5 p-3 space-y-2">
                          <div className="h-3 w-3/4 rounded bg-white/15" />
                          <div className="h-2 w-1/2 rounded bg-white/10" />
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {[...Array(2)].map((_, i) => (
                        <div key={i} className="rounded-xl border border-white/8 bg-white/5 p-3 h-16 space-y-2">
                          <div className="h-2 w-2/3 rounded bg-white/10" />
                          <div className="h-2 w-1/3 rounded bg-white/5" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              {/* floating chips */}
              <div className="absolute -left-8 top-20 hidden lg:flex items-center gap-2 glass rounded-2xl px-4 py-2.5 float-animation-2 shadow-xl z-10">
                <Brain className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold text-slate-200">AI Revision Scheduler</span>
              </div>
              <div className="absolute -right-8 bottom-24 hidden lg:flex items-center gap-2 glass rounded-2xl px-4 py-2.5 float-animation-3 shadow-xl z-10">
                <Clock className="w-4 h-4 text-orange-400" />
                <span className="text-xs font-bold text-slate-200">25:00 · Focus Mode</span>
              </div>
              <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 glass-strong rounded-full px-5 py-2.5 flex items-center gap-2 shadow-xl z-10 whitespace-nowrap">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold text-slate-200">100% local · no account needed</span>
              </div>
            </div>

            {/* Scroll indicator */}
            <a href="#features" className="mt-16 flex flex-col items-center gap-2 text-slate-600 hover:text-slate-400 transition-colors group">
              <span className="text-xs font-medium tracking-widest uppercase">Explore</span>
              <ChevronDown className="w-5 h-5 animate-bounce group-hover:text-orange-400 transition-colors" />
            </a>
          </div>
        </div>
      </section>

      {/* ══════════════════════ FLOATING FEATURE PILLS ══════════════════════ */}
      <section className="relative z-10 py-4 overflow-hidden">
        <div className="flex gap-4 animate-scroll-x" style={{ display: "flex", gap: "12px", padding: "8px 0" }}>
          {[
            { icon: <Calendar className="w-3.5 h-3.5" />, text: "Timetable Manager" },
            { icon: <BookOpen className="w-3.5 h-3.5" />, text: "Note Taking" },
            { icon: <Clock className="w-3.5 h-3.5" />, text: "Pomodoro Timer" },
            { icon: <Brain className="w-3.5 h-3.5" />, text: "AI Helpers" },
            { icon: <Music className="w-3.5 h-3.5" />, text: "Media Player" },
            { icon: <Image className="w-3.5 h-3.5" />, text: "Image Preview" },
            { icon: <BarChart3 className="w-3.5 h-3.5" />, text: "Revision Planner" },
            { icon: <Shield className="w-3.5 h-3.5" />, text: "100% Private" },
            { icon: <Zap className="w-3.5 h-3.5" />, text: "Fast & Lightweight" },
            { icon: <Code2 className="w-3.5 h-3.5" />, text: "Open Source" },
            { icon: <Star className="w-3.5 h-3.5" />, text: "Flashcard Generator" },
            { icon: <Play className="w-3.5 h-3.5" />, text: "Focus Mode" },
          ].concat([
            { icon: <Calendar className="w-3.5 h-3.5" />, text: "Timetable Manager" },
            { icon: <BookOpen className="w-3.5 h-3.5" />, text: "Note Taking" },
            { icon: <Clock className="w-3.5 h-3.5" />, text: "Pomodoro Timer" },
            { icon: <Brain className="w-3.5 h-3.5" />, text: "AI Helpers" },
          ]).map((item, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap shrink-0"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "#94a3b8",
              }}
            >
              <span className="text-orange-400">{item.icon}</span>
              {item.text}
            </span>
          ))}
        </div>
      </section>

      {/* ══════════════════════ FEATURES GRID ══════════════════════ */}
      <section id="features" className="relative z-10 py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <span className="inline-block text-xs font-bold text-orange-400 uppercase tracking-widest mb-4 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20">
              Everything You Need
            </span>
            <h2 className="text-4xl sm:text-5xl font-black text-white tracking-tight mb-4">
              Built for serious <span className="gradient-text">students</span>
            </h2>
            <p className="text-slate-400 text-lg max-w-xl mx-auto leading-relaxed">
              Nine purpose-built tools in a single window. No subscriptions, no distractions.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f, i) => (
              <FeatureCard key={f.title} feature={f} delay={i * 80} />
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════ STATS BAND ══════════════════════ */}
      <section className="relative z-10 py-8 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="glass gradient-border rounded-[40px] p-8 sm:p-12">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
              {stats.map((s) => (
                <div key={s.label} className="flex flex-col items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5 border border-white/10">
                    {s.icon}
                  </div>
                  <div>
                    <div className="text-2xl sm:text-3xl font-black gradient-text">
                      <Counter to={s.value} suffix={s.suffix} />
                    </div>
                    <div className="text-xs text-slate-500 mt-1 font-medium">{s.label}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════ DOWNLOAD HUB ══════════════════════ */}
      <section id="download" className="relative z-10 py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <span className="inline-block text-xs font-bold text-orange-400 uppercase tracking-widest mb-4 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20">
              <Download className="w-3.5 h-3.5 inline -mt-0.5 mr-1" /> Latest Release
            </span>
            <h2 className="text-4xl sm:text-5xl font-black text-white tracking-tight mb-4">
              Grab your <span className="gradient-text">download</span>
            </h2>
            <p className="text-slate-400 text-lg max-w-xl mx-auto leading-relaxed">
              v{VERSION} for Windows x64 — installer or portable build, with verified checksums below.
            </p>
          </div>

          {/* Download cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <DownloadCard
              icon={<Rocket className="w-6 h-6" />}
              gradient="from-orange-500 to-amber-500"
              title="Windows Installer"
              file={INSTALLER_FILE}
              href={INSTALLER_URL}
              sizeFallback="73.6 MB"
              tag="Recommended"
              desc="Installs StudyFlow with Start Menu & desktop shortcuts plus an uninstaller. Best for everyday use."
            />
            <DownloadCard
              icon={<FileArchive className="w-6 h-6" />}
              gradient="from-sky-500 to-cyan-500"
              title="Portable ZIP"
              file={ZIP_FILE}
              href={ZIP_URL}
              sizeFallback="98.4 MB"
              tag="No install"
              desc="Extract and run from any folder or USB drive. Nothing is written to your system."
            />
            <DownloadCard
              icon={<Globe className="w-6 h-6" />}
              gradient="from-violet-500 to-fuchsia-500"
              title="Web App"
              file="index.html"
              href={APP_URL}
              sizeFallback="Instant"
              tag="In browser"
              desc="Run StudyFlow right in your browser — no download needed. Great for a quick look."
            />
          </div>

          {/* All release files */}
          <div className="glass gradient-border rounded-3xl p-7 sm:p-9 mb-6">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
              <h3 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                <FolderDown className="w-5 h-5 text-orange-400" /> All release files
              </h3>
              <span className="text-xs font-bold text-orange-300 bg-orange-500/10 border border-orange-500/25 px-3 py-1.5 rounded-full">
                v{VERSION} · {RELEASE_DATE}
              </span>
            </div>
            <p className="text-sm text-slate-400 mb-2 max-w-2xl">
              Every artifact from the latest release. Download the installer or ZIP, then verify it against the checksum file next to it.
            </p>
            <div className="divide-y divide-white/5">
              <FileRow
                icon={<Rocket className="w-5 h-5" />}
                chipClass="from-orange-500 to-amber-500"
                name={INSTALLER_FILE}
                meta="Windows installer — Start Menu shortcut, desktop icon and uninstaller"
                href={INSTALLER_URL}
                sizeLabel={installerSizeLabel}
                badge="Recommended"
                badgeClass="text-orange-300"
              />
              <FileRow
                icon={<FileArchive className="w-5 h-5" />}
                chipClass="from-sky-500 to-cyan-500"
                name={ZIP_FILE}
                meta="Portable ZIP — extract anywhere, no installation needed"
                href={ZIP_URL}
                sizeLabel={zipSizeLabel}
                badge="No install"
                badgeClass="text-sky-300"
              />
              <FileRow
                icon={<ShieldCheck className="w-5 h-5" />}
                chipClass="from-emerald-500 to-teal-500"
                name={INSTALLER_SHA_FILE}
                meta="SHA-256 checksum for the installer — verify before running"
                href={INSTALLER_SHA_URL}
                sizeLabel="Checksum"
              />
              <FileRow
                icon={<ShieldCheck className="w-5 h-5" />}
                chipClass="from-emerald-500 to-teal-500"
                name={ZIP_SHA_FILE}
                meta="SHA-256 checksum for the portable ZIP — verify before running"
                href={ZIP_SHA_URL}
                sizeLabel="Checksum"
              />
              <FileRow
                icon={<Globe className="w-5 h-5" />}
                chipClass="from-violet-500 to-fuchsia-500"
                name="site/index.html"
                meta="The marketing website — run StudyFlow in your browser instead"
                href={APP_URL}
                sizeLabel="Instant"
                external
              />
            </div>
          </div>

          {/* System requirements */}
          <div className="glass rounded-3xl p-7 sm:p-9 mb-6">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
              <h3 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                <Monitor className="w-5 h-5 text-orange-400" /> System requirements
              </h3>
              <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 px-3 py-1.5 rounded-full inline-flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5" /> Runs on most Windows PCs
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {requirements.map((req) => (
                <div key={req.label} className="flex items-start gap-3 rounded-2xl bg-white/5 border border-white/10 p-4">
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/5 border border-white/10">
                    {req.icon}
                  </span>
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{req.label}</div>
                    <div className="text-sm font-semibold text-slate-200">{req.value}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Release notes + checksums */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="glass rounded-3xl p-7 sm:p-9 card-hover">
              <h3 className="text-xl font-bold text-slate-100 mb-1 flex items-center gap-2">
                <Rocket className="w-5 h-5 text-orange-400" /> What's new in v{VERSION}
              </h3>
              <p className="text-xs font-bold text-orange-400/80 mb-5">First public release · {RELEASE_DATE}</p>
              <ul className="space-y-3">
                {releaseNotes.map((note) => (
                  <li key={note} className="flex items-start gap-3 text-sm text-slate-400 leading-relaxed">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    {note}
                  </li>
                ))}
              </ul>
            </div>

            <div className="glass rounded-3xl p-7 sm:p-9 card-hover">
              <h3 className="text-xl font-bold text-slate-100 mb-1 flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-emerald-400" /> Verify your download
              </h3>
              <p className="text-sm text-slate-400 leading-relaxed mb-6">
                Compare the SHA-256 checksum after downloading to confirm your copy is authentic and untampered.
              </p>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-xs font-bold text-slate-300 inline-flex items-center gap-1.5">
                      <PackageCheck className="w-3.5 h-3.5 text-orange-400" /> {INSTALLER_FILE}
                    </span>
                    <CopyButton value={INSTALLER_SHA} />
                  </div>
                  <code className="block w-full rounded-xl bg-black/40 border border-white/10 px-4 py-3 font-mono text-[11px] text-slate-400 break-all">{INSTALLER_SHA}</code>
                  <a href={INSTALLER_SHA_URL} className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-orange-300 hover:text-orange-200 transition-colors">
                    <FileDown className="w-3.5 h-3.5" /> Download {INSTALLER_SHA_FILE}
                  </a>
                </div>
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-xs font-bold text-slate-300 inline-flex items-center gap-1.5">
                      <PackageCheck className="w-3.5 h-3.5 text-sky-400" /> {ZIP_FILE}
                    </span>
                    <CopyButton value={ZIP_SHA} />
                  </div>
                  <code className="block w-full rounded-xl bg-black/40 border border-white/10 px-4 py-3 font-mono text-[11px] text-slate-400 break-all">{ZIP_SHA}</code>
                  <a href={ZIP_SHA_URL} className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-sky-300 hover:text-sky-200 transition-colors">
                    <FileDown className="w-3.5 h-3.5" /> Download {ZIP_SHA_FILE}
                  </a>
                </div>
              </div>
              <p className="mt-5 text-xs text-slate-500 leading-5">
                Windows:{" "}
                <code className="px-1.5 py-0.5 rounded-lg bg-white/10 text-slate-300 font-mono text-[11px]">
                  certutil -hashfile &lt;file&gt; SHA256
                </code>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════ WHY STUDYFLOW (COMPARE) ══════════════════════ */}
      <section id="why" className="relative z-10 py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <span className="inline-block text-xs font-bold text-emerald-400 uppercase tracking-widest mb-4 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
              <ListChecks className="w-3.5 h-3.5 inline -mt-0.5 mr-1" /> No catch
            </span>
            <h2 className="text-4xl sm:text-5xl font-black text-white tracking-tight mb-4">
              StudyFlow vs. <span className="gradient-text">the rest</span>
            </h2>
            <p className="text-slate-400 text-lg max-w-xl mx-auto leading-relaxed">
              Most study apps charge monthly and keep your notes on their servers. StudyFlow is the opposite.
            </p>
          </div>

          <div className="glass rounded-[32px] overflow-hidden">
            <div className="grid grid-cols-[1.2fr_1fr_1fr] gap-3 px-6 sm:px-8 py-5 border-b border-white/10 text-[10px] sm:text-xs font-bold uppercase tracking-widest">
              <div className="text-slate-500">Feature</div>
              <div className="text-slate-500 text-center">Typical study apps</div>
              <div className="text-orange-400 text-center">StudyFlow</div>
            </div>
            {compareRows.map((row, i) => (
              <div
                key={row.feature}
                className={`grid grid-cols-[1.2fr_1fr_1fr] items-center gap-3 px-6 sm:px-8 py-4 ${i !== compareRows.length - 1 ? "border-b border-white/5" : ""}`}
              >
                <div className="font-bold text-slate-200 text-sm">{row.feature}</div>
                <div className="text-center">
                  <span className="inline-flex items-center gap-1.5 text-xs sm:text-sm text-slate-500">
                    <X className="w-3.5 h-3.5 text-rose-400/70 shrink-0" /> {row.others}
                  </span>
                </div>
                <div className="text-center">
                  <span className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-emerald-400">
                    <CheckCircle2 className="w-4 h-4 shrink-0" /> {row.flow}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════ TESTIMONIALS ══════════════════════ */}
      <section id="reviews" className="relative z-10 py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <span className="inline-block text-xs font-bold text-pink-400 uppercase tracking-widest mb-4 px-3 py-1 rounded-full bg-pink-500/10 border border-pink-500/20">
              <Heart className="w-3.5 h-3.5 inline -mt-0.5 mr-1" /> Loved by students
            </span>
            <h2 className="text-4xl sm:text-5xl font-black text-white tracking-tight mb-4">
              Students <span className="gradient-text">love</span> it
            </h2>
            <p className="text-slate-400 text-lg max-w-xl mx-auto leading-relaxed">
              From the classroom to the library — here's what students say.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <TestimonialCard key={t.name} t={t} delay={i * 100} />
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════ HOW IT WORKS + WHAT YOU GET ══════════════════════ */}
      <section id="how" className="relative z-10 py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">

            {/* How it works */}
            <div>
              <span className="inline-block text-xs font-bold text-sky-400 uppercase tracking-widest mb-4 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/20">
                Get Started in Minutes
              </span>
              <h2 className="text-4xl font-black text-white tracking-tight mb-10">
                How it <span className="gradient-text-blue">works</span>
              </h2>
              <div className="space-y-0">
                <Step num="1" title="Download the installer" desc={`Grab ${INSTALLER_FILE} or the portable ZIP from this page. No account needed.`} />
                <Step num="2" title="Run & install" desc="Double-click the installer. StudyFlow will install silently in seconds and appear on your desktop." />
                <Step num="3" title="Open StudyFlow" desc="Launch the app and see your dashboard immediately. Everything is local — no login, no setup wizard." />
                <Step num="4" title="Start studying" desc="Add your timetable, open the Pomodoro timer, and let the AI helpers accelerate your revision." last />
              </div>
            </div>

            {/* What you get */}
            <div id="whatyouget">
              <span className="inline-block text-xs font-bold text-emerald-400 uppercase tracking-widest mb-4 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                Included in Every Download
              </span>
              <h2 className="text-4xl font-black text-white tracking-tight mb-8">
                What you <span className="gradient-text">get</span>
              </h2>

              <div className="glass rounded-3xl p-7 mb-5 card-hover">
                <h3 className="font-bold text-slate-100 mb-5 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-orange-400" /> For Students
                </h3>
                <ul className="space-y-3">
                  {[
                    "Class and school timetable management",
                    "Notes, books, files, and media player support",
                    "Image previews in the media library",
                    "Revision planning, calendar, and AI helpers",
                    "Pomodoro timer with session tracking",
                    "Flashcard generator from your own notes",
                    "Distraction-free focus mode",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-3 text-sm text-slate-400">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="glass rounded-3xl p-7 card-hover">
                <h3 className="font-bold text-slate-100 mb-4 flex items-center gap-2">
                  <Code2 className="w-4 h-4 text-sky-400" /> For Deployers
                </h3>
                <p className="text-sm text-slate-400 leading-relaxed mb-4">
                  Place your release files at the paths below and keep this landing page at{" "}
                  <code className="px-1.5 py-0.5 rounded-lg bg-white/10 text-slate-200 font-mono text-xs">/site/index.html</code>.
                </p>
                <div className="rounded-xl bg-black/40 border border-white/10 p-4 font-mono text-xs text-slate-400 space-y-1">
                  <p><span className="text-orange-400">/releases/</span><span className="text-emerald-400">{INSTALLER_FILE}</span></p>
                  <p><span className="text-orange-400">/releases/</span><span className="text-sky-400">{ZIP_FILE}</span></p>
                  <p><span className="text-orange-400">/releases/</span><span className="text-teal-400">{INSTALLER_SHA_FILE}</span></p>
                  <p><span className="text-orange-400">/releases/</span><span className="text-teal-400">{ZIP_SHA_FILE}</span></p>
                  <p><span className="text-orange-400">/site/</span><span className="text-violet-400">index.html</span></p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════ VERSION HISTORY ══════════════════════ */}
      <section id="releases" className="relative z-10 py-24 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-14">
            <span className="inline-block text-xs font-bold text-sky-400 uppercase tracking-widest mb-4 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/20">
              <TrendingUp className="w-3.5 h-3.5 inline -mt-0.5 mr-1" /> Changelog
            </span>
            <h2 className="text-4xl sm:text-5xl font-black text-white tracking-tight mb-4">
              Release <span className="gradient-text-blue">history</span>
            </h2>
            <p className="text-slate-400 text-lg max-w-xl mx-auto leading-relaxed">
              Every version of StudyFlow ships from this page.
            </p>
          </div>

          <div className="relative pl-8 sm:pl-10">
            <div className="absolute left-[15px] sm:left-[19px] top-2 bottom-2 w-px timeline-line" />

            {/* v1.0.0 */}
            <div className="relative mb-10">
              <span className="absolute -left-8 sm:-left-10 top-1.5 w-[30px] h-[30px] sm:w-[38px] sm:h-[38px] rounded-full bg-gradient-to-br from-orange-500 to-amber-500 border-4 border-[#020617] shadow-lg shadow-orange-500/30 flex items-center justify-center">
                <Rocket className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
              </span>
              <div className="glass rounded-3xl p-7 card-hover">
                <div className="flex flex-wrap items-center gap-3 mb-1">
                  <span className="text-lg font-black text-slate-100">v{VERSION}</span>
                  <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 px-2.5 py-1 rounded-full uppercase tracking-widest pulse-soft">Latest</span>
                </div>
                <p className="text-xs text-slate-500 mb-4">First public release · {RELEASE_DATE}</p>
                <ul className="space-y-2.5">
                  {releaseNotes.map((note) => (
                    <li key={note} className="flex items-start gap-3 text-sm text-slate-400 leading-relaxed">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      {note}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* What's next */}
            <div className="relative">
              <span className="absolute -left-8 sm:-left-10 top-1.5 w-[30px] h-[30px] sm:w-[38px] sm:h-[38px] rounded-full bg-gradient-to-br from-sky-500 to-indigo-500 border-4 border-[#020617] shadow-lg shadow-sky-500/30 flex items-center justify-center">
                <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
              </span>
              <div className="glass rounded-3xl p-7 border border-dashed border-white/15">
                <div className="text-base font-bold text-slate-100 mb-1">What's next</div>
                <p className="text-sm text-slate-400 leading-relaxed">
                  New versions land right here as they're built. Updating never touches your data — everything you've created stays on your device.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════ FAQ ══════════════════════ */}
      <section id="faq" className="relative z-10 py-24 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-14">
            <span className="inline-block text-xs font-bold text-violet-400 uppercase tracking-widest mb-4 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20">
              <ShieldQuestion className="w-3.5 h-3.5 inline -mt-0.5 mr-1" /> Good to know
            </span>
            <h2 className="text-4xl sm:text-5xl font-black text-white tracking-tight mb-4">
              Frequently asked <span className="gradient-text-blue">questions</span>
            </h2>
            <p className="text-slate-400 text-lg max-w-xl mx-auto leading-relaxed">
              Everything students ask before installing StudyFlow.
            </p>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <FaqItem
                key={faq.q}
                q={faq.q}
                a={faq.a}
                open={openFaq === i}
                onToggle={() => setOpenFaq(openFaq === i ? null : i)}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════ FINAL CTA ══════════════════════ */}
      <section id="cta" className="relative z-10 py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <div
            className="relative rounded-[40px] overflow-hidden"
            style={{
              background: "linear-gradient(135deg, rgba(249,115,22,0.15) 0%, rgba(15,23,42,0.95) 50%, rgba(56,189,248,0.1) 100%)",
              border: "1px solid rgba(249,115,22,0.25)",
            }}
          >
            {/* inner grid bg */}
            <div className="grid-bg absolute inset-0 opacity-30" />
            {/* aurora orb */}
            <div
              className="aurora absolute w-72 h-72 -top-24 -right-16 opacity-25 pointer-events-none"
              style={{ background: "radial-gradient(circle, rgba(56,189,248,0.55) 0%, transparent 70%)" }}
            />
            <div className="relative z-10 p-10 sm:p-16 text-center">
              <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-orange-500/40 float-animation">
                <Download className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-4xl sm:text-5xl font-black text-white tracking-tight mb-4">
                Ready to <span className="gradient-text">download?</span>
              </h2>
              <p className="text-slate-400 text-lg mb-10 max-w-xl mx-auto leading-relaxed">
                Free forever. No sign-up. No cloud. Just open the installer and start studying smarter today.
              </p>

              <div className="flex flex-wrap gap-4 justify-center mb-10">
                <a
                  href={INSTALLER_URL}
                  className="btn-primary rounded-2xl px-8 py-4 font-black text-lg flex items-center gap-3 shadow-2xl shadow-orange-500/30"
                >
                  <Monitor className="w-5 h-5" />
                  Download Installer
                  <ArrowRight className="w-4 h-4" />
                </a>
                <a
                  href={ZIP_URL}
                  className="btn-secondary rounded-2xl px-8 py-4 font-bold text-lg flex items-center gap-3"
                >
                  <Archive className="w-5 h-5" />
                  Download ZIP
                </a>
              </div>

              {/* platform badges */}
              <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-slate-500">
                {[
                  { icon: "🪟", text: "Windows 10 / 11" },
                  { icon: "⚡", text: "Desktop Build" },
                  { icon: "🔒", text: "No telemetry" },
                  { icon: "💾", text: `${installerSizeLabel} installer` },
                  { icon: "✅", text: "Verified SHA-256" },
                ].map((b) => (
                  <span key={b.text} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
                    <span>{b.icon}</span> {b.text}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════ FOOTER ══════════════════════ */}
      <footer className="relative z-10 border-t border-white/8 pt-14 pb-10 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-12">
            {/* Brand */}
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center">
                  <GraduationCap className="w-4 h-4 text-white" />
                </div>
                <span className="font-black text-white">Study<span className="gradient-text">Flow</span></span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed max-w-[220px]">
                Your all-in-one study hub. Free forever, 100% local, no account needed.
              </p>
            </div>

            {/* Product */}
            <div>
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-widest mb-4">Product</h4>
              <ul className="space-y-2.5">
                <li><a href="#features" className="text-xs text-slate-500 hover:text-orange-300 transition-colors">Features</a></li>
                <li><a href="#download" className="text-xs text-slate-500 hover:text-orange-300 transition-colors">Download</a></li>
                <li><a href="#how" className="text-xs text-slate-500 hover:text-orange-300 transition-colors">How it works</a></li>
                <li><a href="#reviews" className="text-xs text-slate-500 hover:text-orange-300 transition-colors">Reviews</a></li>
              </ul>
            </div>

            {/* Resources */}
            <div>
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-widest mb-4">Resources</h4>
              <ul className="space-y-2.5">
                <li>
                  <a href={APP_URL} className="text-xs text-slate-500 hover:text-orange-300 transition-colors inline-flex items-center gap-1.5">
                    <Globe className="w-3 h-3" /> Open web app
                  </a>
                </li>
                <li><a href="#download" className="text-xs text-slate-500 hover:text-orange-300 transition-colors">System requirements</a></li>
                <li><a href="#download" className="text-xs text-slate-500 hover:text-orange-300 transition-colors">Verify checksums</a></li>
                <li><a href="#releases" className="text-xs text-slate-500 hover:text-orange-300 transition-colors">Release history</a></li>
              </ul>
            </div>

            {/* Trust */}
            <div>
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-widest mb-4">Trust</h4>
              <ul className="space-y-2.5">
                <li className="text-xs text-slate-500 inline-flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> No telemetry
                </li>
                <li className="text-xs text-slate-500 inline-flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-emerald-400" /> 100% local data
                </li>
                <li className="text-xs text-slate-500 inline-flex items-center gap-1.5">
                  <BadgeCheck className="w-3.5 h-3.5 text-emerald-400" /> Verified SHA-256
                </li>
                <li><a href="#faq" className="text-xs text-slate-500 hover:text-orange-300 transition-colors">FAQ</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-white/8 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-center sm:text-left">
              <p className="text-xs text-slate-600">© 2026. All Rights Reserved.</p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-5">
              <span className="text-xs text-slate-600">StudyFlow v{VERSION}</span>
              <span className="text-xs text-slate-600">Crafted with <span className="text-red-400">❤️</span> by Akeem</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Back to top */}
      <button
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        aria-label="Back to top"
        className={`fixed bottom-6 right-6 z-50 w-11 h-11 rounded-full glass-strong flex items-center justify-center text-slate-300 hover:text-white hover:border-orange-500/40 transition-all duration-300 shadow-xl ${showTop ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"}`}
      >
        <ChevronUp className="w-5 h-5" />
      </button>

      {/* Sticky mobile download bar */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-50 md:hidden transition-transform duration-300 ${showSticky ? "translate-y-0" : "translate-y-full"}`}
      >
        <div className="glass-strong border-t border-white/10 px-4 py-3 flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold text-white truncate">Download StudyFlow v{VERSION}</div>
            <div className="text-[11px] text-slate-400 truncate">{INSTALLER_FILE}</div>
          </div>
          <a
            href={INSTALLER_URL}
            className="btn-primary rounded-xl px-5 py-2.5 text-sm font-bold inline-flex items-center gap-2 shrink-0"
          >
            <Download className="w-4 h-4" /> Get it
          </a>
        </div>
      </div>

      {/* Inline style for scrolling ticker */}
      <style>{`
        @keyframes scroll-x {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        .animate-scroll-x {
          animation: scroll-x 28s linear infinite;
          width: max-content;
        }
        .animate-scroll-x:hover { animation-play-state: paused; }
      `}</style>
    </div>
  );
}
