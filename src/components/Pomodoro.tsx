import { useState, useEffect, useRef, useCallback } from 'react';
import type { PomodoroSession } from '../types';
import { Timer, Play, Pause, RotateCcw, Coffee, TrendingUp } from 'lucide-react';

const FOCUS_MINUTES = 25;
const BREAK_MINUTES = 5;

type TimerState = 'idle' | 'focus' | 'break' | 'paused';

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function playNotification() {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    gain.gain.value = 0.3;
    osc.start();
    setTimeout(() => {
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      setTimeout(() => ctx.close(), 500);
    }, 200);
  } catch { /* audio not available */ }
}

interface Props {
  sessions: PomodoroSession[];
  setSessions: (s: PomodoroSession[] | ((prev: PomodoroSession[]) => PomodoroSession[])) => void;
  addToast?: (type: 'success' | 'error' | 'info', message: string) => void;
}

export default function Pomodoro({ sessions, setSessions, addToast }: Props) {
  const [timerState, setTimerState] = useState<TimerState>('idle');
  const [secondsLeft, setSecondsLeft] = useState(FOCUS_MINUTES * 60);
  const [focusDuration, setFocusDuration] = useState(FOCUS_MINUTES);
  const [breakDuration, setBreakDuration] = useState(BREAK_MINUTES);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Today's stats
  const today = new Date().toISOString().split('T')[0];
  const todaySessions = sessions.filter(s => s.date === today);
  const todayFocusMinutes = todaySessions.reduce((acc, s) => acc + s.focusMinutes, 0);
  const totalSessions = sessions.length;
  const streakDays = calculateStreak(sessions);

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const startTimer = useCallback(() => {
    clearTimer();
    intervalRef.current = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) {
          clearTimer();
          playNotification();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [clearTimer]);

  const startFocus = () => {
    setTimerState('focus');
    setSecondsLeft(focusDuration * 60);
    startTimer();
  };

  const pause = () => {
    clearTimer();
    setTimerState(prev => prev === 'focus' ? 'paused' : prev);
  };

  const resume = () => {
    if (timerState === 'paused') {
      setTimerState('focus');
      startTimer();
    }
  };

  const reset = () => {
    clearTimer();
    setTimerState('idle');
    setSecondsLeft(focusDuration * 60);
  };

  // Handle timer completion
  useEffect(() => {
    if (secondsLeft === 0 && timerState === 'focus') {
      // Save completed session — date is computed at completion time so a
      // session finishing after midnight is credited to the correct day.
      const newSession: PomodoroSession = {
        id: Date.now().toString(),
        date: new Date().toISOString().split('T')[0],
        focusMinutes: focusDuration,
        completedAt: new Date().toISOString(),
      };
      setSessions(prev => [...prev, newSession]);
      addToast?.('success', '🍅 Focus session complete! Time for a break.');
      // Auto-start break
      setTimerState('break');
      setSecondsLeft(breakDuration * 60);
      startTimer();
    } else if (secondsLeft === 0 && timerState === 'break') {
      addToast?.('info', '☕ Break over! Ready to focus again?');
      reset();
    }
  }, [secondsLeft, timerState, focusDuration, breakDuration, startTimer, reset, setSessions, addToast]);

  // Cleanup on unmount
  useEffect(() => {
    return () => clearTimer();
  }, [clearTimer]);

  const isRunning = timerState === 'focus' || timerState === 'break';
  const isPaused = timerState === 'paused';
  const progress = isRunning || isPaused
    ? ((timerState === 'break' ? breakDuration * 60 : focusDuration * 60) - secondsLeft) / (timerState === 'break' ? breakDuration * 60 : focusDuration * 60) * 100
    : 0;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <Timer className="text-rose-500" size={26} /> Pomodoro Timer
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">Stay focused with timed study sessions</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Timer */}
        <div className="lg:col-span-2">
          <div className="card-glow bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-8 text-center transition-colors duration-300">
            {/* Timer display */}
            <div className="relative w-56 h-56 mx-auto mb-6">
              {/* Progress ring with gradient */}
              <svg className="w-56 h-56 -rotate-90" viewBox="0 0 224 224">
                <defs>
                  <linearGradient id="focusGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#f43f5e"/>
                    <stop offset="100%" stopColor="#ec4899"/>
                  </linearGradient>
                  <linearGradient id="breakGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#10b981"/>
                    <stop offset="100%" stopColor="#06b6d4"/>
                  </linearGradient>
                </defs>
                <circle cx="112" cy="112" r="100" fill="none" stroke="currentColor" strokeWidth="6"
                  className="text-slate-100 dark:text-slate-700"/>
                <circle cx="112" cy="112" r="100" fill="none" stroke={`url(#${timerState === 'break' ? 'breakGrad' : 'focusGrad'})`} strokeWidth="6"
                  strokeDasharray={628.32}
                  strokeDashoffset={628.32 - (progress / 100) * 628.32}
                  strokeLinecap="round"
                  className="transition-all duration-1000 ease-linear drop-shadow-lg"
                  style={{ filter: timerState === 'break' ? 'drop-shadow(0 0 8px rgba(16,185,129,0.3))' : 'drop-shadow(0 0 8px rgba(244,63,94,0.3))' }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-5xl font-bold font-mono text-slate-800 dark:text-slate-100 tabular-nums">
                  {formatTime(secondsLeft)}
                </span>
                <span className="text-sm text-slate-400 dark:text-slate-500 mt-1 font-medium uppercase tracking-wider">
                  {timerState === 'break' ? 'Break' : timerState === 'paused' ? 'Paused' : timerState === 'focus' ? 'Focus' : 'Ready'}
                </span>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center gap-3 mb-6">
              {timerState === 'idle' ? (
                <button onClick={startFocus} className="flex items-center gap-2 bg-gradient-to-r from-rose-500 to-pink-600 text-white px-8 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl hover:scale-110 transition-all animate-bounce-gentle" style={{ animationDuration: '3s' }}>
                  <Play size={18} fill="currentColor"/> Start Focus
                </button>
              ) : isPaused ? (
                <button onClick={resume} className="flex items-center gap-2 bg-gradient-to-r from-rose-500 to-pink-600 text-white px-8 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl hover:scale-110 transition-all">
                  <Play size={18} fill="currentColor"/> Resume
                </button>
              ) : isRunning ? (
                <button onClick={pause} className="flex items-center gap-2 bg-gradient-to-r from-amber-400 to-orange-500 text-white px-8 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl hover:scale-110 transition-all">
                  <Pause size={18} fill="currentColor"/> Pause
                </button>
              ) : null}
              <button onClick={reset} className="p-3 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all hover:scale-110" title="Reset">
                <RotateCcw size={18}/>
              </button>
            </div>

            {/* Duration settings (only when idle) */}
            {timerState === 'idle' && (
              <div className="flex items-center justify-center gap-6">
                <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                  <span className="text-rose-500 font-semibold">Focus</span>
                  <input type="number" min={5} max={120} value={focusDuration}
                    onChange={e => {
                      const v = Math.max(5, Math.min(120, Number(e.target.value)));
                      setFocusDuration(v);
                      setSecondsLeft(v * 60);
                    }}
                    className="w-16 text-center border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-1 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-rose-300 dark:bg-slate-700 dark:text-slate-200"/>
                  <span className="text-slate-400">min</span>
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                  <span className="text-green-500 font-semibold">Break</span>
                  <input type="number" min={1} max={30} value={breakDuration}
                    onChange={e => setBreakDuration(Math.max(1, Math.min(30, Number(e.target.value))))}
                    className="w-16 text-center border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-1 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-green-300 dark:bg-slate-700 dark:text-slate-200"/>
                  <span className="text-slate-400">min</span>
                </label>
              </div>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="space-y-4">
          <div className="card-glow bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-5 transition-colors duration-300">
            <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm mb-4 flex items-center gap-2">
              <TrendingUp size={16} className="text-rose-500 animate-bounce-gentle"/> Today's Stats
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-700 last:border-0">
                <span className="text-sm text-slate-500 dark:text-slate-400">Sessions</span>
                <span className="font-bold text-slate-800 dark:text-slate-100">{todaySessions.length}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-700 last:border-0">
                <span className="text-sm text-slate-500 dark:text-slate-400">Focus Time</span>
                <span className="font-bold text-slate-800 dark:text-slate-100">{todayFocusMinutes} min</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-700 last:border-0">
                <span className="text-sm text-slate-500 dark:text-slate-400">Total Sessions</span>
                <span className="font-bold text-slate-800 dark:text-slate-100">{totalSessions}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-slate-500 dark:text-slate-400">🔥 Streak</span>
                <span className="font-bold text-amber-500">{streakDays} days</span>
              </div>
            </div>
          </div>

          {/* Quick tips */}
          <div className="bg-gradient-to-br from-rose-100 via-pink-100 to-purple-100 dark:from-rose-900/30 dark:via-pink-900/30 dark:to-purple-900/30 rounded-2xl border border-rose-200 dark:border-rose-700/40 p-5 card-glow">
            <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm mb-2 flex items-center gap-2">
              <Coffee size={16} className="text-rose-500"/> Tips
            </h3>
            <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-1.5">
              <li>🎯 Focus on one task per session</li>
              <li>📱 Put your phone away during focus time</li>
              <li>💧 Stay hydrated between sessions</li>
              <li>🔄 Take a longer break after 4 sessions</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function calculateStreak(sessions: PomodoroSession[]): number {
  if (sessions.length === 0) return 0;
  const dates = [...new Set(sessions.map(s => s.date))].sort().reverse();
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < dates.length; i++) {
    const date = new Date(dates[i] + 'T00:00:00');
    const expected = new Date(today);
    expected.setDate(expected.getDate() - i);
    if (date.toDateString() === expected.toDateString()) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}
