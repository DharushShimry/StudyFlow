import { useState } from 'react';
import { Bot, ExternalLink, RefreshCw, Sparkles } from 'lucide-react';

// notrack.ai/chat refuses iframe embedding (403 "Automated access is not
// allowed... Use https://notrack.ai/ instead"), so we embed the main domain,
// which hosts the same inline chat UI and allows framing.
const NOTRACK_CHAT_URL = 'https://notrack.ai/';

export default function ArenaAgent() {
  const [frameKey, setFrameKey] = useState(0);

  const reload = () => setFrameKey(k => k + 1);

  return (
    <div className="p-6 max-w-[96rem] mx-auto min-h-full flex flex-col">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Bot className="text-cyan-500 animate-bounce-gentle" size={26} /> AI Agent
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
            Your own AI study assistant — chat right here, no extra tabs needed
          </p>
        </div>

        <a
          href={NOTRACK_CHAT_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-xs font-semibold text-white bg-gradient-to-r from-cyan-500 to-sky-600 px-4 py-2 rounded-xl shadow hover:shadow-lg hover:scale-[1.03] transition-all"
        >
          <ExternalLink size={14}/> Open in new tab
        </a>
      </div>

      {/* Iframe panel — flexes to fill the whole window width & height (widescreen) */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden transition-colors duration-300 flex flex-col flex-1 min-h-[480px]">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/40 flex-shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 flex-shrink-0"/>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 truncate">
              notrack.ai
            </span>
            <span className="hidden sm:flex items-center gap-1 text-[10px] text-slate-400 px-2 py-0.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"/>
              Connected
            </span>
          </div>
          <button
            onClick={reload}
            className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 px-2 py-1 rounded-lg hover:bg-white dark:hover:bg-slate-600/50 transition-all"
          >
            <RefreshCw size={12}/> Reload
          </button>
        </div>

        <iframe
          key={frameKey}
          src={NOTRACK_CHAT_URL}
          title="AI Agent Chat"
          referrerPolicy="no-referrer"
          className="w-full flex-1 min-h-0 bg-white border-0"
        />
      </div>

      {/* Info footer */}
      <div className="mt-4 bg-gradient-to-r from-cyan-50 to-sky-50 dark:from-cyan-900/20 dark:to-sky-900/20 border border-cyan-100 dark:border-cyan-800/40 rounded-xl p-4 text-xs text-slate-600 dark:text-slate-300 flex flex-wrap items-center gap-3 flex-shrink-0">
        <span className="flex items-center gap-1"><Sparkles size={12} className="text-cyan-500"/> AI Agent</span>
        <span className="text-slate-300 dark:text-slate-500">·</span>
        <span>Embedded via notrack.ai</span>
        <span className="text-slate-300 dark:text-slate-500">·</span>
        <span>Use the Reload button if the chat ever hangs</span>
      </div>
    </div>
  );
}
