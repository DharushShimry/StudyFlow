import { useState, useRef, useEffect, type PointerEvent as ReactPointerEvent } from 'react';
import { Code2, Play, RotateCcw, Copy, Check, ChevronDown, GripHorizontal } from 'lucide-react';

const LANGUAGES = [
  { id: 'html', label: 'HTML / CSS / JS', mode: 'html' },
  { id: 'javascript', label: 'JavaScript', mode: 'js' },
  { id: 'css', label: 'CSS Preview', mode: 'css' },
];

const STARTER_CODE: Record<string, string> = {
  html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>My Page</title>
  <style>
    body { font-family: sans-serif; padding: 20px; background: #f0f4ff; }
    h1 { color: #4f46e5; }
    button { background: #4f46e5; color: white; padding: 8px 16px; border: none; border-radius: 8px; cursor: pointer; }
  </style>
</head>
<body>
  <h1>Hello, StudyFlow! 🎓</h1>
  <p>Edit this code and click <strong>Run</strong> to see the result.</p>
  <button onclick="alert('Nice work!')">Click Me</button>
</body>
</html>`,
  javascript: `// JavaScript Playground
const numbers = [1, 2, 3, 4, 5];
const doubled = numbers.map(n => n * 2);
console.log('Original:', numbers);
console.log('Doubled:', doubled);

// Try some math
function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n-1) + fibonacci(n-2);
}
for (let i = 0; i <= 10; i++) {
  console.log(\`F(\${i}) = \${fibonacci(i)}\`);
}`,
  css: `<!DOCTYPE html>
<html>
<head>
<style>
  body { margin: 0; display: flex; align-items: center; justify-content: center; min-height: 100vh; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
  .card { background: white; border-radius: 20px; padding: 40px; box-shadow: 0 20px 60px rgba(0,0,0,0.2); text-align: center; }
  h2 { background: linear-gradient(to right, #667eea, #764ba2); -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-size: 2rem; margin-bottom: 10px; }
  p { color: #666; }
  .btn { display: inline-block; margin-top: 15px; padding: 10px 24px; background: linear-gradient(to right, #667eea, #764ba2); color: white; border-radius: 30px; text-decoration: none; font-weight: bold; transition: transform 0.2s; }
  .btn:hover { transform: scale(1.05); }
</style>
</head>
<body>
  <div class="card">
    <h2>CSS Playground ✨</h2>
    <p>Edit the CSS above to see live changes!</p>
    <a class="btn" href="#">Styled Button</a>
  </div>
</body>
</html>`,
};

// Editor/output height bounds for the draggable divider.
const MIN_EDITOR_H = 300;
const MAX_EDITOR_H = 1000;
const DEFAULT_EDITOR_H = 540;

const EXAMPLES = [
  { label: '🌈 Gradient Box', lang: 'html', code: `<style>
  body { margin: 0; display: flex; height: 100vh; align-items: center; justify-content: center; background: #1a1a2e; }
  .box { width: 200px; height: 200px; border-radius: 20px; background: linear-gradient(45deg, #f093fb, #f5576c, #4facfe, #00f2fe); background-size: 300%; animation: gradient 3s ease infinite; }
  @keyframes gradient { 0%, 100% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } }
</style>
<div class="box"></div>` },
  { label: '⏰ Live Clock', lang: 'html', code: `<style>
  body { margin: 0; display: flex; height: 100vh; align-items: center; justify-content: center; background: #0f0c29; }
  #clock { font-size: 4rem; color: #fff; font-family: monospace; text-shadow: 0 0 20px #7c3aed; }
</style>
<div id="clock"></div>
<script>
  function tick() { document.getElementById('clock').textContent = new Date().toLocaleTimeString(); }
  tick(); setInterval(tick, 1000);
</script>` },
  { label: '🎲 Dice Roller', lang: 'html', code: `<style>
  body { font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; background: #1e3a5f; color: white; }
  .dice { font-size: 6rem; cursor: pointer; transition: transform 0.3s; user-select: none; }
  .dice:hover { transform: rotate(20deg) scale(1.1); }
  button { margin-top: 20px; padding: 12px 30px; background: #3b82f6; border: none; color: white; border-radius: 10px; font-size: 1rem; cursor: pointer; border-radius: 30px; }
  button:hover { background: #2563eb; }
</style>
<div class="dice" id="d" onclick="roll()">🎲</div>
<p id="res" style="font-size:1.5rem;margin:10px 0"></p>
<button onclick="roll()">Roll Dice!</button>
<script>
  const faces = ['⚀','⚁','⚂','⚃','⚄','⚅'];
  function roll() {
    const n = Math.floor(Math.random()*6);
    document.getElementById('d').textContent = faces[n];
    document.getElementById('res').textContent = 'You rolled: ' + (n+1);
  }
</script>` },
  { label: '📊 Simple Chart', lang: 'html', code: `<style>
  body { font-family: sans-serif; padding: 20px; background: #f8fafc; }
  h2 { color: #1e293b; }
  .bar-wrap { display: flex; flex-direction: column; gap: 10px; margin-top: 20px; }
  .bar-row { display: flex; align-items: center; gap: 10px; }
  .bar-label { width: 100px; font-size: 14px; color: #475569; text-align: right; }
  .bar { height: 30px; border-radius: 6px; display: flex; align-items: center; padding-left: 10px; color: white; font-size: 13px; font-weight: bold; transition: width 1s ease; }
</style>
<h2>📊 My Subject Scores</h2>
<div class="bar-wrap">
  <div class="bar-row"><div class="bar-label">Math</div><div class="bar" style="width:82%;background:#3b82f6">82%</div></div>
  <div class="bar-row"><div class="bar-label">Science</div><div class="bar" style="width:75%;background:#10b981">75%</div></div>
  <div class="bar-row"><div class="bar-label">English</div><div class="bar" style="width:90%;background:#8b5cf6">90%</div></div>
  <div class="bar-row"><div class="bar-label">History</div><div class="bar" style="width:68%;background:#f59e0b">68%</div></div>
  <div class="bar-row"><div class="bar-label">Tamil</div><div class="bar" style="width:85%;background:#ef4444">85%</div></div>
</div>` },
];

export default function CodeRunner() {
  const [lang, setLang] = useState('html');
  const [code, setCode] = useState(STARTER_CODE['html']);
  const [output, setOutput] = useState<string | null>(null);
  const [jsLogs, setJsLogs] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const [showExamples, setShowExamples] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Editor + output height — adjustable via the draggable divider below the panes.
  // null = automatic 16:9 widescreen; a number = fixed height in px (user-dragged).
  const [editorH, setEditorH] = useState<number | null>(() => {
    // Widescreen default: stale drag heights from earlier versions could make
    // the panes render square — one-time reset back to automatic full-width 16:9.
    try {
      if (!localStorage.getItem('ss-coderunner-ws')) {
        localStorage.setItem('ss-coderunner-ws', '1');
        localStorage.removeItem('ss-coderunner-h');
      }
    } catch { /* ignore */ }
    return null;
  });
  const editorAreaRef = useRef<HTMLTextAreaElement>(null);
  const resizeDrag = useRef({ startY: 0, startH: 0, active: false });

  useEffect(() => {
    try { localStorage.setItem('ss-coderunner-h', editorH === null ? 'auto' : String(editorH)); } catch { /* ignore */ }
  }, [editorH]);

  const startResize = (e: ReactPointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    // In auto (16:9) mode, lock onto the currently rendered height first.
    const base = editorH ?? editorAreaRef.current?.offsetHeight ?? DEFAULT_EDITOR_H;
    resizeDrag.current = { startY: e.clientY, startH: base, active: true };
    if (editorH === null) setEditorH(base);
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onResizeMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!resizeDrag.current.active) return;
    const delta = e.clientY - resizeDrag.current.startY;
    setEditorH(Math.min(MAX_EDITOR_H, Math.max(MIN_EDITOR_H, Math.round(resizeDrag.current.startH + delta))));
  };
  const endResize = (e: ReactPointerEvent<HTMLDivElement>) => {
    resizeDrag.current.active = false;
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* ignore */ }
  };
  const resetEditorHeight = () => setEditorH(null); // back to automatic 16:9 widescreen
  const stepHeight = (delta: number) => {
    setEditorH(h => {
      const base = h ?? editorAreaRef.current?.offsetHeight ?? DEFAULT_EDITOR_H;
      return Math.min(MAX_EDITOR_H, Math.max(MIN_EDITOR_H, Math.round(base + delta)));
    });
  };

  const runCode = () => {
    if (lang === 'html' || lang === 'css') {
      setOutput(code);
      setJsLogs([]);
    } else if (lang === 'javascript') {
      const logs: string[] = [];
      // Formats console args the way DevTools would: plain strings stay
      // unquoted, objects/arrays are pretty-printed, edge values handled.
      const fmt = (v: unknown): string => {
        if (typeof v === 'string') return v;
        if (typeof v === 'undefined') return 'undefined';
        if (typeof v === 'number') return Number.isNaN(v) ? 'NaN' : String(v);
        if (typeof v === 'function') return String(v);
        if (typeof v === 'symbol') return String(v);
        try {
          const s = JSON.stringify(v, null, 2);
          return s === undefined ? String(v) : s;
        } catch {
          return String(v);
        }
      };
      const fakeConsole = {
        log: (...args: unknown[]) => logs.push(args.map(fmt).join(' ')),
        error: (...args: unknown[]) => logs.push('❌ ' + args.map(fmt).join(' ')),
        warn: (...args: unknown[]) => logs.push('⚠️ ' + args.map(fmt).join(' ')),
      };
      try {
        const fn = new Function('console', code);
        fn(fakeConsole);
        setJsLogs(logs);
        setOutput(null);
      } catch (e: unknown) {
        setJsLogs(['❌ Error: ' + (e instanceof Error ? e.message : String(e))]);
        setOutput(null);
      }
    }
  };

  const reset = () => {
    setCode(STARTER_CODE[lang]);
    setOutput(null);
    setJsLogs([]);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      // Clipboard API unavailable (e.g. inside the packaged desktop app) —
      // fall back to a hidden textarea + execCommand.
      try {
        const ta = document.createElement('textarea');
        ta.value = code;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        const ok = document.execCommand('copy');
        document.body.removeChild(ta);
        if (!ok) return; // execCommand reported failure — leave the button as-is
      } catch {
        return; // clipboard truly unavailable — leave the button as-is
      }
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const loadExample = (ex: typeof EXAMPLES[0]) => {
    setLang(ex.lang);
    setCode(ex.code);
    setOutput(null);
    setJsLogs([]);
    setShowExamples(false);
  };

  const changeLang = (l: string) => {
    // Re-clicking the active tab must NOT wipe the user's edits.
    if (l === lang) return;
    setLang(l);
    setCode(STARTER_CODE[l]);
    setOutput(null);
    setJsLogs([]);
  };

  return (
    <div className="p-6 max-w-[96rem] mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Code2 className="text-pink-500" size={26} /> Code Runner
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">Write and run HTML, CSS & JavaScript instantly</p>
        </div>
        <div className="relative">
          <button onClick={() => setShowExamples(v => !v)} className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 px-4 py-2 rounded-xl text-sm font-semibold hover:border-pink-300 dark:hover:border-pink-500 transition-all">
            Examples <ChevronDown size={15}/>
          </button>
          {showExamples && (
            <div className="absolute right-0 top-full mt-1 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-100 dark:border-slate-700 z-20 min-w-[200px]">
              {EXAMPLES.map(ex => (
                <button key={ex.label} onClick={() => loadExample(ex)} className="w-full text-left px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 first:rounded-t-xl last:rounded-b-xl">
                  {ex.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Language tabs */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {LANGUAGES.map(l => (            <button key={l.id} onClick={() => changeLang(l.id)} className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${lang === l.id ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow' : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-pink-300 dark:hover:border-pink-500'}`}>
            {l.label}
          </button>
        ))}
      </div>

      {/* Editor + Preview — stacked full-width widescreen panes */}
      <div className="grid grid-cols-1 gap-4">
        {/* Editor */}
        <div className="bg-slate-900 rounded-2xl overflow-hidden shadow-xl">
          <div className="flex items-center justify-between px-4 py-2.5 bg-slate-800 border-b border-slate-700">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500"/>
              <div className="w-3 h-3 rounded-full bg-yellow-500"/>
              <div className="w-3 h-3 rounded-full bg-green-500"/>
            </div>
            <span className="text-slate-400 text-xs font-mono">{lang === 'javascript' ? 'script.js' : lang === 'css' ? 'style.css' : 'index.html'}</span>
            <div className="flex gap-1.5">
              <button onClick={copy} className="flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-colors px-2 py-1 rounded">
                {copied ? <Check size={12}/> : <Copy size={12}/>} {copied ? 'Copied!' : 'Copy'}
              </button>
              <button onClick={reset} className="text-xs text-slate-400 hover:text-white transition-colors px-2 py-1 rounded flex items-center gap-1"><RotateCcw size={12}/>Reset</button>
            </div>
          </div>
          <textarea
            ref={editorAreaRef}
            value={code}
            onChange={e => setCode(e.target.value)}
            className="w-full bg-slate-900 text-green-300 font-mono text-sm p-4 resize-none focus:outline-none"
            spellCheck={false}
            style={{ tabSize: 2, minHeight: editorH ?? MIN_EDITOR_H, aspectRatio: editorH === null ? '16 / 9' : undefined }}
            onKeyDown={e => {
              if (e.key === 'Tab') {
                e.preventDefault();
                const s = e.currentTarget.selectionStart;
                const end = e.currentTarget.selectionEnd;
                const v = code;
                setCode(v.substring(0, s) + '  ' + v.substring(end));
                setTimeout(() => { e.currentTarget.selectionStart = e.currentTarget.selectionEnd = s + 2; }, 0);
              }
            }}
          />
          <div className="px-4 pb-4">
            <button onClick={runCode} className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-pink-500 to-rose-500 text-white py-2.5 rounded-xl font-semibold text-sm hover:shadow-lg hover:scale-[1.02] transition-all">
              <Play size={16} fill="currentColor"/> Run Code
            </button>
          </div>
        </div>

        {/* Output */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 overflow-hidden flex flex-col">
          <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-700 border-b border-slate-100 dark:border-slate-600 flex items-center gap-2">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-slate-200"/>
              <div className="w-3 h-3 rounded-full bg-slate-200"/>
              <div className="w-3 h-3 rounded-full bg-slate-200"/>
            </div>
            <span className="text-slate-400 text-xs">Preview / Output</span>
          </div>

          {lang === 'javascript' ? (
            <div className="p-4 bg-slate-950 font-mono text-sm overflow-auto whitespace-pre-wrap" style={{ minHeight: editorH ?? MIN_EDITOR_H, aspectRatio: editorH === null ? '16 / 9' : undefined }}>
              {jsLogs.length === 0 ? (
                <p className="text-slate-500 text-xs mt-2">▶ Click "Run Code" to see console output</p>
              ) : jsLogs.map((log, i) => (
                <div key={i} className={`mb-1 ${log.startsWith('❌') ? 'text-red-400' : log.startsWith('⚠️') ? 'text-yellow-400' : 'text-green-400'}`}>
                  <span className="text-slate-600 mr-2">{i + 1} &gt;</span>{log}
                </div>
              ))}
            </div>
          ) : output ? (
            <iframe
              ref={iframeRef}
              srcDoc={output}
              className="w-full border-0"
              style={{ minHeight: editorH ?? MIN_EDITOR_H, aspectRatio: editorH === null ? '16 / 9' : undefined }}
              sandbox="allow-scripts allow-same-origin allow-modals"
              title="Preview"
            />
          ) : (
            <div className="flex items-center justify-center text-slate-300 flex-col gap-3" style={{ minHeight: editorH ?? MIN_EDITOR_H, aspectRatio: editorH === null ? '16 / 9' : undefined }}>
              <Play size={40} className="opacity-20"/>
              <p className="text-sm">Click "Run Code" to see the preview</p>
            </div>
          )}
        </div>
      </div>

      {/* Draggable height divider */}
      <div
        role="separator"
        aria-orientation="horizontal"
        aria-label="Resize editor and output height"
        aria-valuemin={MIN_EDITOR_H}
        aria-valuemax={MAX_EDITOR_H}
        aria-valuenow={editorH ?? DEFAULT_EDITOR_H}
        tabIndex={0}
        title={editorH === null ? 'Automatic 16:9 widescreen — drag to resize' : 'Drag to resize · double-click to return to 16:9 widescreen'}
        className="group mt-1 flex cursor-row-resize touch-none select-none items-center justify-center gap-1.5 rounded-xl py-1.5 outline-none transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 focus-visible:ring-2 focus-visible:ring-pink-400/60"
        onPointerDown={startResize}
        onPointerMove={onResizeMove}
        onPointerUp={endResize}
        onPointerCancel={endResize}
        onDoubleClick={resetEditorHeight}
        onKeyDown={e => {
          // Match the drag direction: pulling the divider down makes it taller.
          if (e.key === 'ArrowUp') { e.preventDefault(); stepHeight(-20); }
          else if (e.key === 'ArrowDown') { e.preventDefault(); stepHeight(20); }
          else if (e.key === 'Home') { e.preventDefault(); setEditorH(MIN_EDITOR_H); }
          else if (e.key === 'End') { e.preventDefault(); setEditorH(MAX_EDITOR_H); }
        }}
      >
        <GripHorizontal size={15} className="text-slate-400 dark:text-slate-500 transition-colors group-hover:text-pink-500" />
        <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500 transition-colors group-hover:text-pink-500">
          {editorH === null ? 'Widescreen 16:9 · drag to resize' : 'Drag to resize · double-click for 16:9'}
        </span>
      </div>
    </div>
  );
}
