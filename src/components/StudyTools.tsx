import { useState, useMemo } from 'react';
import {
  Calculator as CalcIcon, ArrowLeftRight, GraduationCap, Percent, CalendarDays, SquareFunction,
  Delete, Equal, Divide, Plus, Minus, X, History, Copy, Info, Check, Eraser,
  Ruler, Weight, Thermometer, Database, Gauge, Zap, TrendingUp, RefreshCw,
} from 'lucide-react';

/* ── Shared input/button styles ── */
const inputCls =
  'w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2.5 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-300 dark:focus:ring-indigo-500 transition-colors';
const selectCls = inputCls + ' cursor-pointer';
const labelCls = 'block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5';
const cardCls =
  'card-glow bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm';
const resultCls =
  'rounded-2xl bg-gradient-to-r from-indigo-50 to-violet-50 dark:from-indigo-900/20 dark:to-violet-900/20 border border-indigo-100 dark:border-indigo-800/40 p-4';

function ToolHeader({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-3 mb-4">
      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 text-white flex items-center justify-center shadow-lg flex-shrink-0">
        {icon}
      </div>
      <div>
        <h3 className="font-bold text-slate-800 dark:text-slate-100">{title}</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}

function CopyResult({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* ignore */ }
  };
  return (
    <button
      onClick={copy}
      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-[11px] font-semibold text-slate-500 dark:text-slate-300 hover:border-indigo-400 hover:text-indigo-500 transition-colors"
    >
      {copied ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

/* ═══════════════ CALCULATOR ═══════════════ */
function Calculator() {
  const [expr, setExpr] = useState('0');
  const [history, setHistory] = useState<Array<{ expr: string; result: string }>>([]);
  const [sci, setSci] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const evaluate = (raw: string): string => {
    try {
      // Whitelist guard: only digits, operators, parens and π may reach eval.
      if (!/^[\d+\-*/().π×÷\s]+$/.test(raw)) return 'Error';
      const cleaned = raw.replace(/×/g, '*').replace(/÷/g, '/').replace(/π/g, '(Math.PI)');
      // eslint-disable-next-line no-new-func
      const value = new Function(`"use strict"; return (${cleaned});`)();
      if (typeof value !== 'number' || !isFinite(value)) return 'Error';
      return String(Math.round(value * 1e10) / 1e10);
    } catch {
      return 'Error';
    }
  };

  const append = (token: string) => {
    setError(null);
    setExpr(prev => {
      const base = prev === '0' && /[0-9.]/.test(token) ? '' : prev;
      return base + token;
    });
  };

  const pressFunction = (fn: string) => {
    setError(null);
    setExpr(prev => {
      const n = parseFloat(prev);
      if (isNaN(n)) return prev;
      const out = fn === 'sqrt' ? Math.sqrt(n) : fn === 'square' ? n * n : fn === 'sin' ? Math.sin(n * Math.PI / 180)
        : fn === 'cos' ? Math.cos(n * Math.PI / 180) : fn === 'tan' ? Math.tan(n * Math.PI / 180)
        : fn === 'ln' ? Math.log(n) : fn === 'log' ? Math.log10(n) : fn === 'fact' ? factorial(n) : n;
      return isFinite(out) ? String(Math.round(out * 1e10) / 1e10) : 'Error';
    });
  };

  const factorial = (n: number): number => (n < 0 || n > 170 || n % 1 !== 0) ? NaN : n <= 1 ? 1 : n * factorial(n - 1);

  const equals = () => {
    if (expr === '0' || expr === '' || /[+\-×÷/(]$/.test(expr)) return;
    const result = evaluate(expr);
    if (result !== 'Error') setHistory(h => [{ expr, result }, ...h].slice(0, 12));
    setExpr(result);
    setError(null);
  };

  const clear = () => { setExpr('0'); setError(null); };
  const backspace = () => setExpr(prev => (prev.length <= 1 ? '0' : prev.slice(0, -1)));

  const key = (label: string, onClick: () => void, cls = '') => (
    <button
      key={label}
      onClick={onClick}
      className={`h-12 rounded-xl text-sm font-bold transition-all hover:scale-[1.04] active:scale-95 ${cls}`}
    >
      {label}
    </button>
  );

  const sciKeys = ['sin', 'cos', 'tan', 'ln', 'log', '√', 'x²', 'π', '(', ')', 'x!'];

  return (
    <div>
      <ToolHeader
        icon={<CalcIcon size={20} />}
        title="Calculator"
        desc="Basic & scientific calculator. Results are kept in history below — tap an entry to reuse it."
      />
      <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          {/* Display */}
          <div className={`${resultCls} mb-3`}>
            <div className="text-right font-mono text-2xl sm:text-3xl font-bold text-slate-800 dark:text-slate-100 break-all min-h-[2.5rem] leading-tight">
              {expr}
            </div>
            {error && <div className="text-right text-xs text-red-500 mt-1">{error}</div>}
          </div>

          {/* Function row */}
          {sci && (
            <div className="grid grid-cols-6 gap-1.5 mb-2">
              {sciKeys.map(k => key(k, () => {
                if (k === '√') pressFunction('sqrt');
                else if (k === 'x²') pressFunction('square');
                else if (k === 'x!') pressFunction('fact');
                else if (k === 'π') append('π');
                else if (k === '(' || k === ')') append(k);
                else pressFunction(k);
              }, 'bg-violet-50 dark:bg-violet-500/15 text-violet-700 dark:text-violet-300 border border-violet-100 dark:border-violet-500/25'))}
            </div>
          )}

          {/* Keypad */}
          <div className="grid grid-cols-4 gap-1.5">
            <button onClick={clear} className="h-12 rounded-xl text-sm font-bold bg-red-50 dark:bg-red-500/15 text-red-600 dark:text-red-300 border border-red-100 dark:border-red-500/25 hover:scale-[1.04] active:scale-95 transition-all">C</button>
            <button onClick={backspace} className="h-12 rounded-xl text-sm font-bold bg-red-50 dark:bg-red-500/15 text-red-600 dark:text-red-300 border border-red-100 dark:border-red-500/25 hover:scale-[1.04] active:scale-95 transition-all"><Delete size={16} className="mx-auto" /></button>
            <button onClick={() => setSci(s => !s)} className="h-12 rounded-xl text-sm font-bold bg-violet-50 dark:bg-violet-500/15 text-violet-700 dark:text-violet-300 border border-violet-100 dark:border-violet-500/25 hover:scale-[1.04] active:scale-95 transition-all">ƒ(x)</button>
            <button onClick={() => append('÷')} className="h-12 rounded-xl text-sm font-bold bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-500/25 hover:scale-[1.04] active:scale-95 transition-all"><Divide size={16} className="mx-auto" /></button>
            {['7', '8', '9'].map(d => key(d, () => append(d), 'bg-slate-50 dark:bg-slate-700/60 text-slate-800 dark:text-slate-100 border border-slate-100 dark:border-slate-600/40'))}
            <button onClick={() => append('×')} className="h-12 rounded-xl text-sm font-bold bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-500/25 hover:scale-[1.04] active:scale-95 transition-all"><X size={16} className="mx-auto" /></button>
            {['4', '5', '6'].map(d => key(d, () => append(d), 'bg-slate-50 dark:bg-slate-700/60 text-slate-800 dark:text-slate-100 border border-slate-100 dark:border-slate-600/40'))}
            <button onClick={() => append('-')} className="h-12 rounded-xl text-sm font-bold bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-500/25 hover:scale-[1.04] active:scale-95 transition-all"><Minus size={16} className="mx-auto" /></button>
            {['1', '2', '3'].map(d => key(d, () => append(d), 'bg-slate-50 dark:bg-slate-700/60 text-slate-800 dark:text-slate-100 border border-slate-100 dark:border-slate-600/40'))}
            <button onClick={() => append('+')} className="h-12 rounded-xl text-sm font-bold bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-500/25 hover:scale-[1.04] active:scale-95 transition-all"><Plus size={16} className="mx-auto" /></button>
            {/* '%' appends /100 — e.g. '50 %' evaluates to 0.5 */}
            {['0', '.', '%'].map(d => key(d, () => append(d === '%' ? '/100' : d), 'bg-slate-50 dark:bg-slate-700/60 text-slate-800 dark:text-slate-100 border border-slate-100 dark:border-slate-600/40'))}
            <button onClick={equals} className="h-12 rounded-xl text-sm font-bold btn-accent hover:scale-[1.04] active:scale-95 transition-all shadow-lg"><Equal size={18} className="mx-auto" /></button>
          </div>

          <div className="flex items-center gap-2 mt-3 text-[11px] text-slate-400 dark:text-slate-500">
            <Info size={12} /> Angles for sin/cos/tan are in degrees. Results are rounded to 10 decimal places.
          </div>
        </div>

        {/* History */}
        <div className={`${cardCls} p-4`}>
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
              <History size={15} className="text-indigo-500" /> History
            </div>
            {history.length > 0 && (
              <button onClick={() => setHistory([])} className="text-[11px] text-slate-400 hover:text-red-500 flex items-center gap-1 font-medium transition-colors">
                <Eraser size={12} /> Clear
              </button>
            )}
          </div>
          {history.length === 0 ? (
            <div className="text-center py-8 text-slate-400 dark:text-slate-500 text-sm">
              <div className="text-2xl mb-1">🧮</div>
              No calculations yet
            </div>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {history.map((h, i) => (
                <button
                  key={i}
                  onClick={() => setExpr(h.result)}
                  className="w-full text-left rounded-xl border border-slate-100 dark:border-slate-600/40 bg-slate-50 dark:bg-slate-700/40 px-3 py-2 hover:border-indigo-300 dark:hover:border-indigo-500/50 transition-colors"
                >
                  <div className="text-[11px] text-slate-400 dark:text-slate-500 font-mono truncate">{h.expr} =</div>
                  <div className="text-sm font-bold text-slate-700 dark:text-slate-200 font-mono truncate">{h.result}</div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════ UNIT CONVERTER ═══════════════ */
type Unit = { id: string; label: string; toBase?: number };
type UnitCategory = {
  id: string;
  label: string;
  icon: React.ReactNode;
  units: Unit[];
  toBase: (v: number, u: string) => number;
  fromBase: (v: number, u: string) => number;
};

const LENGTH_UNITS: Unit[] = [
  { id: 'mm', label: 'Millimeters (mm)', toBase: 0.001 }, { id: 'cm', label: 'Centimeters (cm)', toBase: 0.01 },
  { id: 'm', label: 'Meters (m)', toBase: 1 }, { id: 'km', label: 'Kilometers (km)', toBase: 1000 },
  { id: 'in', label: 'Inches (in)', toBase: 0.0254 }, { id: 'ft', label: 'Feet (ft)', toBase: 0.3048 },
  { id: 'yd', label: 'Yards (yd)', toBase: 0.9144 }, { id: 'mi', label: 'Miles (mi)', toBase: 1609.344 },
];
const WEIGHT_UNITS: Unit[] = [
  { id: 'mg', label: 'Milligrams (mg)', toBase: 0.000001 }, { id: 'g', label: 'Grams (g)', toBase: 0.001 },
  { id: 'kg', label: 'Kilograms (kg)', toBase: 1 }, { id: 't', label: 'Tonnes (t)', toBase: 1000 },
  { id: 'oz', label: 'Ounces (oz)', toBase: 0.028349523125 }, { id: 'lb', label: 'Pounds (lb)', toBase: 0.45359237 },
];
const TEMPERATURE_UNITS: Unit[] = [
  { id: 'c', label: 'Celsius (°C)' }, { id: 'f', label: 'Fahrenheit (°F)' }, { id: 'k', label: 'Kelvin (K)' },
];
const DATA_UNITS: Unit[] = [
  { id: 'b', label: 'Bytes (B)', toBase: 1 }, { id: 'kb', label: 'Kilobytes (KB)', toBase: 1024 },
  { id: 'mb', label: 'Megabytes (MB)', toBase: 1024 ** 2 }, { id: 'gb', label: 'Gigabytes (GB)', toBase: 1024 ** 3 },
  { id: 'tb', label: 'Terabytes (TB)', toBase: 1024 ** 4 },
];
const SPEED_UNITS: Unit[] = [
  { id: 'ms', label: 'Meters/second (m/s)', toBase: 1 }, { id: 'kmh', label: 'Kilometers/hour (km/h)', toBase: 1 / 3.6 },
  { id: 'mph', label: 'Miles/hour (mph)', toBase: 0.44704 }, { id: 'kn', label: 'Knots (kn)', toBase: 0.514444 },
];
const TIME_UNITS: Unit[] = [
  { id: 's', label: 'Seconds (s)', toBase: 1 }, { id: 'min', label: 'Minutes (min)', toBase: 60 },
  { id: 'h', label: 'Hours (h)', toBase: 3600 }, { id: 'd', label: 'Days (d)', toBase: 86400 },
  { id: 'w', label: 'Weeks (w)', toBase: 604800 },
];
const unitFactor = (units: Unit[]) => (v: number, u: string) => v * (units.find(x => x.id === u)?.toBase ?? 1);
const unitFromFactor = (units: Unit[]) => (v: number, u: string) => v / (units.find(x => x.id === u)?.toBase ?? 1);

const CONVERTER_CATEGORIES: UnitCategory[] = [
  { id: 'length', label: 'Length', icon: <Ruler size={16} />, units: LENGTH_UNITS, toBase: unitFactor(LENGTH_UNITS), fromBase: unitFromFactor(LENGTH_UNITS) },
  { id: 'weight', label: 'Weight', icon: <Weight size={16} />, units: WEIGHT_UNITS, toBase: unitFactor(WEIGHT_UNITS), fromBase: unitFromFactor(WEIGHT_UNITS) },
  { id: 'temperature', label: 'Temperature', icon: <Thermometer size={16} />, units: TEMPERATURE_UNITS, toBase: (v, u) => u === 'c' ? v : u === 'f' ? (v - 32) * 5 / 9 : v - 273.15, fromBase: (v, u) => u === 'c' ? v : u === 'f' ? v * 9 / 5 + 32 : v + 273.15 },
  { id: 'data', label: 'Data', icon: <Database size={16} />, units: DATA_UNITS, toBase: unitFactor(DATA_UNITS), fromBase: unitFromFactor(DATA_UNITS) },
  { id: 'speed', label: 'Speed', icon: <Gauge size={16} />, units: SPEED_UNITS, toBase: unitFactor(SPEED_UNITS), fromBase: unitFromFactor(SPEED_UNITS) },
  { id: 'time', label: 'Time', icon: <Zap size={16} />, units: TIME_UNITS, toBase: unitFactor(TIME_UNITS), fromBase: unitFromFactor(TIME_UNITS) },
];

function UnitConverter() {
  const [category, setCategory] = useState(CONVERTER_CATEGORIES[0]);
  const [value, setValue] = useState('1');
  const [from, setFrom] = useState('m');
  const [to, setTo] = useState('km');

  const switchCategory = (c: UnitCategory) => {
    setCategory(c);
    setFrom(c.units[0].id);
    setTo(c.units[1]?.id ?? c.units[0].id);
  };

  const num = parseFloat(value);
  const result = useMemo(() => {
    if (isNaN(num)) return null;
    const base = category.toBase(num, from);
    const out = category.fromBase(base, to);
    return Math.round(out * 1e10) / 1e10;
  }, [num, category, from, to]);

  const fmt = (n: number) => {
    if (Math.abs(n) >= 1e12 || (Math.abs(n) < 1e-6 && n !== 0)) return n.toExponential(6);
    return n.toLocaleString(undefined, { maximumFractionDigits: 10 });
  };

  return (
    <div>
      <ToolHeader icon={<ArrowLeftRight size={20} />} title="Unit Converter" desc="Convert length, weight, temperature, data, speed and time instantly." />
      <div className="flex flex-wrap gap-2 mb-5">
        {CONVERTER_CATEGORIES.map(c => (
          <button
            key={c.id}
            onClick={() => switchCategory(c)}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-all ${category.id === c.id ? 'btn-accent shadow-lg' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'}`}
          >
            {c.icon} {c.label}
          </button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-[1fr_auto_1fr] items-end">
        <div>
          <label className={labelCls}>Value</label>
          <input type="number" value={value} onChange={e => setValue(e.target.value)} className={inputCls} placeholder="0" />
        </div>
        <div className="hidden sm:flex justify-center pb-2">
          <button
            onClick={() => { setFrom(to); setTo(from); }}
            className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 flex items-center justify-center hover:rotate-180 transition-transform duration-300 shadow"
            title="Swap units"
          >
            <ArrowLeftRight size={16} />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>From</label>
            <select value={from} onChange={e => setFrom(e.target.value)} className={selectCls}>
              {category.units.map(u => <option key={u.id} value={u.id}>{u.label}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>To</label>
            <select value={to} onChange={e => setTo(e.target.value)} className={selectCls}>
              {category.units.map(u => <option key={u.id} value={u.id}>{u.label}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className={`${resultCls} mt-5 flex flex-wrap items-center justify-between gap-3`}>
        <div>
          <div className="text-xs text-slate-500 dark:text-slate-400">{fmt(num)} {category.units.find(u => u.id === from)?.label} equals</div>
          <div className="text-2xl font-black text-slate-800 dark:text-slate-100 font-mono break-all">
            {result !== null ? fmt(result) : '—'} <span className="text-base font-bold text-indigo-600 dark:text-indigo-300">{category.units.find(u => u.id === to)?.label}</span>
          </div>
        </div>
        {result !== null && <CopyResult text={String(result)} />}
      </div>

      <button
        onClick={() => { setFrom(category.units[0].id); setTo(category.units[1]?.id ?? category.units[0].id); }}
        className="mt-3 text-xs font-medium text-indigo-500 hover:text-indigo-700 flex items-center gap-1 transition-colors"
      >
        <RefreshCw size={12} /> Reset units
      </button>
    </div>
  );
}

/* ═══════════════ PERCENTAGE CALCULATOR ═══════════════ */
function PercentageCalculator() {
  const [mode, setMode] = useState<'pctOf' | 'pctIs' | 'pctChange'>('pctOf');
  const [a, setA] = useState('10');
  const [b, setB] = useState('200');
  const [c, setC] = useState('');

  const na = parseFloat(a), nb = parseFloat(b), nc = parseFloat(c);
  const result = useMemo(() => {
    if (mode === 'pctOf' && !isNaN(na) && !isNaN(nb)) return { value: (na / 100) * nb, label: `${a}% of ${b}` };
    if (mode === 'pctIs' && !isNaN(na) && !isNaN(nb) && nb !== 0) return { value: (na / nb) * 100, label: `${a} as a percentage of ${b}` };
    if (mode === 'pctChange' && !isNaN(na) && !isNaN(nc) && na !== 0) return { value: ((nc - na) / na) * 100, label: `Change from ${a} to ${c}` };
    return null;
  }, [mode, a, b, c, na, nb, nc]);

  const fmt = (n: number) => `${Math.round(n * 10000) / 10000}%`;

  return (
    <div>
      <ToolHeader icon={<Percent size={20} />} title="Percentage Calculator" desc="Three quick modes for the questions students ask most." />
      <div className="flex flex-wrap gap-2 mb-5">
        {([['pctOf', 'What is X% of Y?'], ['pctIs', 'X is what % of Y?'], ['pctChange', 'Change from X to Y']] as const).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setMode(id)}
            className={`rounded-xl px-3.5 py-2 text-xs font-bold transition-all ${mode === id ? 'btn-accent shadow-lg' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'}`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-3 max-w-2xl">
        {mode === 'pctOf' && (<>
          <div><label className={labelCls}>Percentage (X%)</label><input type="number" value={a} onChange={e => setA(e.target.value)} className={inputCls} /></div>
          <div><label className={labelCls}>Of value (Y)</label><input type="number" value={b} onChange={e => setB(e.target.value)} className={inputCls} /></div>
        </>)}
        {mode === 'pctIs' && (<>
          <div><label className={labelCls}>First value (X)</label><input type="number" value={a} onChange={e => setA(e.target.value)} className={inputCls} /></div>
          <div><label className={labelCls}>Second value (Y)</label><input type="number" value={b} onChange={e => setB(e.target.value)} className={inputCls} /></div>
        </>)}
        {mode === 'pctChange' && (<>
          <div><label className={labelCls}>Original (X)</label><input type="number" value={a} onChange={e => setA(e.target.value)} className={inputCls} /></div>
          <div><label className={labelCls}>New value (Y)</label><input type="number" value={c} onChange={e => setC(e.target.value)} className={inputCls} /></div>
        </>)}
      </div>

      <div className={`${resultCls} mt-5 flex flex-wrap items-center justify-between gap-3 max-w-2xl`}>
        <div>
          <div className="text-xs text-slate-500 dark:text-slate-400">{result?.label ?? 'Enter the values above'}</div>
          <div className="text-2xl font-black text-slate-800 dark:text-slate-100">{result ? fmt(result.value) : '—'}</div>
        </div>
        {result && <CopyResult text={fmt(result.value)} />}
      </div>
    </div>
  );
}

/* ═══════════════ GPA CALCULATOR ═══════════════ */
const GRADE_POINTS: Record<string, number> = {
  'A+': 4.0, 'A': 4.0, 'A-': 3.7, 'B+': 3.3, 'B': 3.0, 'B-': 2.7,
  'C+': 2.3, 'C': 2.0, 'C-': 1.7, 'D+': 1.3, 'D': 1.0, 'F': 0.0,
};

type Course = { id: number; name: string; credits: string; grade: string };

function GPACalculator() {
  const [courses, setCourses] = useState<Course[]>([{ id: 1, name: 'Mathematics', credits: '3', grade: 'A' }]);

  const update = (id: number, patch: Partial<Course>) =>
    setCourses(cs => cs.map(c => (c.id === id ? { ...c, ...patch } : c)));
  const remove = (id: number) => setCourses(cs => cs.filter(c => c.id !== id));
  const add = () => setCourses(cs => [...cs, { id: Date.now(), name: '', credits: '3', grade: 'B' }]);

  const totalCredits = courses.reduce((s, c) => s + (parseFloat(c.credits) || 0), 0);
  const totalPoints = courses.reduce((s, c) => s + (parseFloat(c.credits) || 0) * (GRADE_POINTS[c.grade] ?? 0), 0);
  const gpa = totalCredits > 0 ? totalPoints / totalCredits : 0;

  const gpaColor = gpa >= 3.5 ? 'text-emerald-600 dark:text-emerald-400' : gpa >= 2.5 ? 'text-amber-600 dark:text-amber-400' : gpa > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400';
  const remark = gpa >= 3.5 ? 'Excellent — keep it up! 🎉' : gpa >= 3.0 ? 'Great work! 💪' : gpa >= 2.5 ? 'Good — room to improve 📈' : gpa > 0 ? 'Keep pushing, you got this! 🌱' : '—';

  return (
    <div>
      <ToolHeader icon={<GraduationCap size={20} />} title="GPA Calculator" desc="Add your courses, credits and letter grades to compute your weighted GPA (4.0 scale)." />
      <div className="space-y-2.5 mb-5">
        {courses.map(c => (
          <div key={c.id} className="grid grid-cols-[1fr_80px_110px_36px] sm:grid-cols-[1fr_90px_120px_36px] gap-2 items-center">
            <input value={c.name} onChange={e => update(c.id, { name: e.target.value })} placeholder="Course name" className={inputCls} />
            <input type="number" min="0" step="0.5" value={c.credits} onChange={e => update(c.id, { credits: e.target.value })} placeholder="Credits" className={inputCls} />
            <select value={c.grade} onChange={e => update(c.id, { grade: e.target.value })} className={selectCls}>
              {Object.keys(GRADE_POINTS).map(g => <option key={g} value={g}>{g} ({GRADE_POINTS[g].toFixed(1)})</option>)}
            </select>
            <button onClick={() => remove(c.id)} className="h-10 w-9 rounded-xl bg-red-50 dark:bg-red-500/15 text-red-500 hover:bg-red-100 dark:hover:bg-red-500/25 flex items-center justify-center transition-colors" title="Remove course">
              <X size={14} />
            </button>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        <button onClick={add} className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-4 py-2.5 text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
          <Plus size={14} /> Add course
        </button>
      </div>

      <div className={`${resultCls} flex flex-wrap items-center justify-between gap-4`}>
        <div className="flex items-center gap-6">
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Your GPA (4.0 scale)</div>
            <div className={`text-4xl font-black ${gpaColor}`}>{gpa.toFixed(2)}</div>
            <div className="text-xs font-medium mt-1">{remark}</div>
          </div>
          <div className="border-l border-indigo-200 dark:border-indigo-800/40 pl-6">
            <div className="text-xs text-slate-500 dark:text-slate-400">Percentage estimate</div>
            <div className="text-2xl font-black text-slate-800 dark:text-slate-100">{(gpa / 4 * 100).toFixed(1)}%</div>
            <div className="text-xs text-slate-400 dark:text-slate-500 mt-1">{totalCredits} credits · {courses.length} course{courses.length === 1 ? '' : 's'}</div>
          </div>
        </div>
        <CopyResult text={`GPA: ${gpa.toFixed(2)} / 4.0 (${(gpa / 4 * 100).toFixed(1)}%)`} />
      </div>

      <details className="mt-4 group">
        <summary className="cursor-pointer text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-indigo-500 transition-colors">Grade point scale</summary>
        <div className="mt-2 grid grid-cols-4 sm:grid-cols-6 gap-1.5 max-w-2xl">
          {Object.entries(GRADE_POINTS).map(([g, p]) => (
            <div key={g} className="rounded-lg bg-slate-50 dark:bg-slate-700/40 border border-slate-100 dark:border-slate-600/40 px-2 py-1.5 text-center">
              <div className="text-xs font-bold text-slate-700 dark:text-slate-200">{g}</div>
              <div className="text-[10px] text-slate-400">{p.toFixed(1)}</div>
            </div>
          ))}
        </div>
      </details>
    </div>
  );
}

/* ═══════════════ DATE CALCULATOR ═══════════════ */
function DateCalculator() {
  const today = new Date().toISOString().split('T')[0];
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [base, setBase] = useState(today);
  const [days, setDays] = useState('7');

  const daysBetween = useMemo(() => {
    const a = new Date(from + 'T00:00:00').getTime();
    const b = new Date(to + 'T00:00:00').getTime();
    if (isNaN(a) || isNaN(b)) return null;
    return Math.round((b - a) / 86400000);
  }, [from, to]);

  const added = useMemo(() => {
    const n = parseInt(days, 10);
    if (isNaN(n) || !base) return null;
    const d = new Date(base + 'T00:00:00');
    d.setDate(d.getDate() + n);
    return d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  }, [base, days]);

  const fmt = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <div>
      <ToolHeader icon={<CalendarDays size={20} />} title="Date Calculator" desc="Days between two dates, or add/subtract days from a date." />
      <div className="grid gap-5 lg:grid-cols-2">
        <div className={`${cardCls} p-5`}>
          <div className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-4 flex items-center gap-2"><CalendarDays size={15} className="text-indigo-500" /> Days between dates</div>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div><label className={labelCls}>Start date</label><input type="date" value={from} onChange={e => setFrom(e.target.value)} className={inputCls} /></div>
            <div><label className={labelCls}>End date</label><input type="date" value={to} onChange={e => setTo(e.target.value)} className={inputCls} /></div>
          </div>
          <div className={`${resultCls}`}>
            <div className="text-xs text-slate-500 dark:text-slate-400">{fmt(from)} → {fmt(to)}</div>
            <div className="text-3xl font-black text-slate-800 dark:text-slate-100">
              {daysBetween === null ? '—' : Math.abs(daysBetween)} <span className="text-sm font-bold text-indigo-600 dark:text-indigo-300">days</span>
            </div>
            {daysBetween !== null && (
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                ≈ {(Math.abs(daysBetween) / 7).toFixed(1)} weeks · {(Math.abs(daysBetween) / 30.44).toFixed(1)} months{daysBetween !== 0 && ` · ${daysBetween > 0 ? 'in the future' : 'in the past'}`}
              </div>
            )}
          </div>
        </div>

        <div className={`${cardCls} p-5`}>
          <div className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-4 flex items-center gap-2"><TrendingUp size={15} className="text-emerald-500" /> Add / subtract days</div>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div><label className={labelCls}>Date</label><input type="date" value={base} onChange={e => setBase(e.target.value)} className={inputCls} /></div>
            <div><label className={labelCls}>Days (+/-)</label><input type="number" value={days} onChange={e => setDays(e.target.value)} className={inputCls} /></div>
          </div>
          <div className={`${resultCls}`}>
            <div className="text-xs text-slate-500 dark:text-slate-400">{fmt(base)} {parseInt(days, 10) >= 0 ? 'plus' : 'minus'} {Math.abs(parseInt(days, 10) || 0)} days</div>
            <div className="text-2xl font-black text-slate-800 dark:text-slate-100">{added ?? '—'}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════ QUADRATIC SOLVER ═══════════════ */
function QuadraticSolver() {
  const [a, setA] = useState('1');
  const [b, setB] = useState('-5');
  const [c, setC] = useState('6');

  const na = parseFloat(a), nb = parseFloat(b), nc = parseFloat(c);
  const solved = useMemo(() => {
    if ([na, nb, nc].some(n => isNaN(n))) return null;
    if (na === 0) {
      if (nb === 0) return { kind: 'none' as const, disc: null as number | null, vertex: null as { x: number; y: number } | null, degenerate: nc === 0 };
      return { kind: 'linear' as const, root: -nc / nb, disc: null as number | null, vertex: null as { x: number; y: number } | null };
    }
    const disc = nb * nb - 4 * na * nc;
    const vertex = { x: -nb / (2 * na), y: -(disc) / (4 * na) };
    if (disc < 0) {
      const real = -nb / (2 * na);
      const imag = Math.sqrt(-disc) / (2 * na);
      return { kind: 'complex' as const, root: null as number | null, disc, vertex, complex: `${real.toFixed(4)} ± ${imag.toFixed(4)}i` };
    }
    const sq = Math.sqrt(disc);
    return { kind: 'real' as const, root: null as number | null, disc, vertex, roots: [(-nb + sq) / (2 * na), (-nb - sq) / (2 * na)] };
  }, [na, nb, nc]);

  return (
    <div>
      <ToolHeader icon={<SquareFunction size={20} />} title="Quadratic Solver" desc="Solve ax² + bx + c = 0 — real or complex roots, plus the vertex." />
      <div className="grid gap-3 sm:grid-cols-3 max-w-xl mb-5">
        <div><label className={labelCls}>a</label><input type="number" value={a} onChange={e => setA(e.target.value)} className={inputCls} /></div>
        <div><label className={labelCls}>b</label><input type="number" value={b} onChange={e => setB(e.target.value)} className={inputCls} /></div>
        <div><label className={labelCls}>c</label><input type="number" value={c} onChange={e => setC(e.target.value)} className={inputCls} /></div>
      </div>

      {solved && (
        <div className={`${resultCls} max-w-xl`}>
          <div className="font-mono text-lg font-bold text-slate-800 dark:text-slate-100 mb-3">{a}x² {nb >= 0 ? '+' : '−'} {Math.abs(nb)}x {nc >= 0 ? '+' : '−'} {Math.abs(nc)} = 0</div>
          {solved.kind === 'none' && <div className="text-sm text-slate-600 dark:text-slate-300">{solved.degenerate ? 'Every value of x satisfies the equation (identity).' : 'No solution — the equation is a contradiction.'}</div>}
          {solved.kind === 'linear' && <div className="text-sm text-slate-600 dark:text-slate-300">Linear equation — root x = <span className="font-bold">{solved.root.toFixed(4)}</span></div>}
          {solved.kind === 'real' && (
            <div className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
              <div className="flex gap-2"><span className="font-bold text-indigo-600 dark:text-indigo-300">x₁ =</span> {solved.roots![0].toFixed(4)}</div>
              <div className="flex gap-2"><span className="font-bold text-indigo-600 dark:text-indigo-300">x₂ =</span> {solved.roots![1].toFixed(4)}</div>
            </div>
          )}
          {solved.kind === 'complex' && <div className="text-sm text-slate-600 dark:text-slate-300">Complex roots: <span className="font-bold">{solved.complex}</span></div>}
          <div className="mt-3 pt-3 border-t border-indigo-200/60 dark:border-indigo-800/40 grid grid-cols-2 gap-2 text-sm text-slate-600 dark:text-slate-300">
            <div>Discriminant (Δ): <span className={`font-bold ${solved.disc! < 0 ? 'text-rose-500' : solved.disc === 0 ? 'text-amber-500' : 'text-emerald-500'}`}>{solved.disc!.toFixed(4)}</span></div>
            {solved.vertex && <div>Vertex: <span className="font-bold">({solved.vertex.x.toFixed(4)}, {solved.vertex.y.toFixed(4)})</span></div>}
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════ MAIN PAGE ═══════════════ */
const TOOLS = [
  { id: 'calculator', label: 'Calculator', icon: <CalcIcon size={16} />, desc: 'Basic & scientific calculator with history' },
  { id: 'converter', label: 'Unit Converter', icon: <ArrowLeftRight size={16} />, desc: 'Length, weight, temperature, data, speed & time' },
  { id: 'gpa', label: 'GPA Calculator', icon: <GraduationCap size={16} />, desc: 'Weighted GPA & percentage from your grades' },
  { id: 'percent', label: 'Percentage', icon: <Percent size={16} />, desc: 'Percent-of, percent-is and percent-change' },
  { id: 'date', label: 'Date Calculator', icon: <CalendarDays size={16} />, desc: 'Days between dates and date arithmetic' },
  { id: 'quadratic', label: 'Quadratic Solver', icon: <SquareFunction size={16} />, desc: 'Real & complex roots with the vertex' },
] as const;

type ToolId = typeof TOOLS[number]['id'];

export default function StudyTools() {
  const [active, setActive] = useState<ToolId>('calculator');

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="hero-gradient animate-gradient-shift rounded-3xl p-6 md:p-8 mb-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.12]">
          <div className="absolute top-4 left-[15%] w-14 h-14 rounded-full bg-white animate-float-slow" />
          <div className="absolute top-8 right-[20%] w-10 h-10 rounded-full bg-white animate-float-delayed" />
          <div className="absolute bottom-8 left-[30%] w-8 h-8 rounded-full bg-white animate-float" style={{ animationDuration: '7s' }} />
          <div className="absolute bottom-12 right-[30%] w-12 h-12 rounded-full bg-white animate-float-slow" style={{ animationDelay: '1s' }} />
        </div>
        <div className="relative flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg animate-bounce-gentle">
            <CalcIcon size={26} />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Study Tools</h1>
            <p className="text-sm opacity-80 mt-0.5">Everything you need for quick calculations — all offline, all local.</p>
          </div>
        </div>
      </div>

      {/* Tool tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-5 scrollbar-hide">
        {TOOLS.map(t => (
          <button
            key={t.id}
            onClick={() => setActive(t.id)}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold whitespace-nowrap transition-all ${active === t.id ? 'btn-accent shadow-lg scale-[1.03]' : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Active tool card */}
      <div className={`${cardCls} p-5 md:p-6`}>
        {active === 'calculator' && <Calculator />}
        {active === 'converter' && <UnitConverter />}
        {active === 'gpa' && <GPACalculator />}
        {active === 'percent' && <PercentageCalculator />}
        {active === 'date' && <DateCalculator />}
        {active === 'quadratic' && <QuadraticSolver />}
      </div>
    </div>
  );
}
