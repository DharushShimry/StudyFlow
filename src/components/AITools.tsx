import { useState } from 'react';
import { Sparkles, Brain, BookOpen, Calculator, FlaskConical, Languages, Copy, Check, RotateCcw, Key, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { generateWithGemini, hasApiKey, setApiKey, clearApiKey } from '../services/gemini';

const TOOLS = [
  { id: 'essay', label: 'Essay Outline', icon: <BookOpen size={18}/>, color: 'from-purple-500 to-violet-600', desc: 'Generate essay outlines and ideas' },
  { id: 'quiz', label: 'Quiz Generator', icon: <Brain size={18}/>, color: 'from-blue-500 to-indigo-600', desc: 'Create practice questions' },
  { id: 'math', label: 'Math Solver', icon: <Calculator size={18}/>, color: 'from-green-500 to-emerald-600', desc: 'Step-by-step math explanations' },
  { id: 'science', label: 'Science Helper', icon: <FlaskConical size={18}/>, color: 'from-cyan-500 to-sky-600', desc: 'Science concepts explained simply' },
  { id: 'translate', label: 'Translator', icon: <Languages size={18}/>, color: 'from-orange-500 to-amber-600', desc: 'English ↔ Sinhala / Tamil notes' },
  { id: 'summary', label: 'Summarizer', icon: <Sparkles size={18}/>, color: 'from-pink-500 to-rose-600', desc: 'Summarize long notes instantly' },
];

export default function AITools() {
  const [activeTool, setActiveTool] = useState('essay');
  const [input, setInput] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // API key state
  const [showKeyInput, setShowKeyInput] = useState(!hasApiKey());
  const [keyInput, setKeyInput] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [keySaved, setKeySaved] = useState(false);

  const handleSaveKey = () => {
    const trimmed = keyInput.trim();
    if (trimmed) {
      setApiKey(trimmed);
      setShowKeyInput(false);
      setKeyInput('');
      setKeySaved(true);
      setTimeout(() => setKeySaved(false), 3000);
    }
  };

  const handleRemoveKey = () => {
    clearApiKey();
    setShowKeyInput(true);
  };

  const run = async () => {
    if (!input.trim()) return;
    if (!hasApiKey()) {
      setShowKeyInput(true);
      return;
    }
    setLoading(true);
    setResult('');
    setError(null);
    try {
      const text = await generateWithGemini(activeTool, input);
      setResult(text);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const copy = () => {
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const reset = () => {
    setInput('');
    setResult('');
    setError(null);
  };

  const tool = TOOLS.find(t => t.id === activeTool)!;

  const PLACEHOLDERS: Record<string, string> = {
    essay: 'e.g. The importance of education in Sri Lanka',
    quiz: 'e.g. Photosynthesis, World War II, Quadratic equations...',
    math: 'e.g. Find the roots of x² + 5x + 6 = 0',
    science: 'e.g. How does photosynthesis work?',
    translate: 'Type text to translate into Sinhala or Tamil...',
    summary: 'Paste your long notes or textbook paragraph here...',
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Sparkles className="text-purple-500 animate-bounce-gentle" size={26} /> AI Study Tools
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">Powered by Google Gemini — real AI responses, your own API key</p>
        </div>

        {/* API Key Status */}
        <div className="flex items-center gap-2">
          {hasApiKey() ? (
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 text-xs text-green-600 font-medium bg-green-50 px-3 py-1.5 rounded-full">
                <Key size={12}/> API Key Set
              </span>
              <button
                onClick={handleRemoveKey}
                className="text-xs text-slate-400 hover:text-red-500 px-2 py-1 rounded-lg hover:bg-red-50 transition-all"
              >
                Remove
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowKeyInput(true)}
              className="flex items-center gap-1.5 text-xs text-amber-600 font-medium bg-amber-50 px-3 py-1.5 rounded-full hover:bg-amber-100 transition-all"
            >
              <Key size={12}/> Set API Key
            </button>
          )}
        </div>
      </div>

      {/* API Key Input Panel */}
      {showKeyInput && (
        <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-100 rounded-2xl p-5 mb-6">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center flex-shrink-0">
              <Key size={20} className="text-purple-600"/>
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-slate-800 text-sm mb-1">Connect to Google Gemini</h3>
              <p className="text-xs text-slate-500 mb-3">
                Enter your Gemini API key to get real AI responses. Your key is stored locally in your browser and never sent anywhere except to Google.
              </p>
              <div className="flex gap-2 mb-2">
                <div className="relative flex-1">
                  <input
                    type={showKey ? 'text' : 'password'}
                    value={keyInput}
                    onChange={e => setKeyInput(e.target.value)}
                    placeholder="Paste your Gemini API key here..."
                    className="w-full border border-purple-200 rounded-xl px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 bg-white"
                    onKeyDown={e => { if (e.key === 'Enter') handleSaveKey(); }}
                  />
                  <button
                    onClick={() => setShowKey(v => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showKey ? <EyeOff size={16}/> : <Eye size={16}/>}
                  </button>
                </div>
                <button
                  onClick={handleSaveKey}
                  disabled={!keyInput.trim()}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${keyInput.trim() ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow hover:shadow-lg' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
                >
                  Save
                </button>
              </div>
              <a
                href="https://aistudio.google.com/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-purple-600 hover:underline inline-flex items-center gap-1"
              >
                Get a free API key from Google AI Studio →
              </a>
            </div>
          </div>
          {keySaved && (
            <div className="mt-3 text-xs text-green-600 font-medium flex items-center gap-1 bg-green-50 px-3 py-2 rounded-xl">
              <Check size={14}/> API key saved! You can now use all AI tools.
            </div>
          )}
        </div>
      )}

      {/* Tool selector */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {TOOLS.map(t => (
          <button
            key={t.id}
            onClick={() => { setActiveTool(t.id); setResult(''); setInput(''); setError(null); }}
            className={`flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-all text-center ${activeTool === t.id ? 'border-transparent bg-gradient-to-br ' + t.color + ' text-white shadow-lg scale-105' : 'border-slate-100 bg-white text-slate-600 hover:border-slate-200 hover:shadow-sm'}`}
          >
            <span>{t.icon}</span>
            <span className="text-xs font-semibold leading-tight">{t.label}</span>
          </button>
        ))}
      </div>

      {/* Active tool */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden transition-colors duration-300">
        <div className={`bg-gradient-to-r ${tool.color} px-5 py-4`}>
          <div className="flex items-center gap-3 text-white">
            <span>{tool.icon}</span>
            <div>
              <div className="font-bold">{tool.label}</div>
              <div className="text-xs opacity-80">{tool.desc}</div>
            </div>
          </div>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Your Input</label>
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder={PLACEHOLDERS[activeTool]}
              rows={activeTool === 'summary' || activeTool === 'translate' ? 6 : 3}
              className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 resize-none dark:bg-slate-700 dark:text-slate-200"
            />
          </div>

          <div className="flex gap-2">
            <button onClick={run} disabled={!input.trim() || loading} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white shadow transition-all ${!input.trim() || loading ? 'opacity-50 cursor-not-allowed bg-slate-400' : 'bg-gradient-to-r ' + tool.color + ' hover:shadow-lg hover:scale-[1.02]'}`}>
              {loading ? (
                <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Generating...</>
              ) : (
                <><Sparkles size={15}/> Generate with Gemini</>
              )}
            </button>
            <button onClick={reset} className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm font-semibold flex items-center gap-1">
              <RotateCcw size={14}/>Clear
            </button>
          </div>

          {/* Error display */}
          {error && (
            <div className="bg-red-50 border border-red-100 rounded-2xl p-4 flex items-start gap-3">
              <AlertCircle size={18} className="text-red-400 flex-shrink-0 mt-0.5"/>
              <div className="flex-1">
                <p className="text-sm font-medium text-red-700 mb-0.5">Error</p>
                <p className="text-xs text-red-600">{error}</p>
              </div>
            </div>
          )}

          {/* Result */}
          {result && (
            <div className="card-glow bg-slate-50 dark:bg-slate-700/50 rounded-2xl border border-slate-100 dark:border-slate-600 p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-600 flex items-center gap-1"><Sparkles size={12} className="text-purple-500"/>Gemini Response</span>
                <button onClick={copy} className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 px-2 py-1 hover:bg-white rounded-lg transition-all">
                  {copied ? <Check size={12}/> : <Copy size={12}/>} {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <pre className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-wrap font-sans">{result}</pre>
            </div>
          )}

          {/* Empty state when no key and no result */}
          {!hasApiKey() && !result && !error && (
            <div className="text-center py-8 text-slate-400">
              <Key size={32} className="mx-auto mb-2 opacity-30"/>
              <p className="text-sm font-medium">Connect your API key to get started</p>
              <p className="text-xs mt-1">Set your Gemini API key above to enable all AI tools</p>
            </div>
          )}
        </div>
      </div>

      {/* Info footer */}
      <div className="mt-4 bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-100 rounded-xl p-4 text-xs text-slate-600 flex flex-wrap items-center gap-3">
        <span className="flex items-center gap-1"><Sparkles size={12} className="text-purple-500"/> Powered by <strong>Google Gemini 3.6 Flash</strong></span>
        <span className="text-slate-300">·</span>
        <span className="flex items-center gap-1"><Key size={12}/> Your API key is stored locally</span>
        <span className="text-slate-300">·</span>
        <span>Free tier: 60 requests/minute</span>
      </div>
    </div>
  );
}
