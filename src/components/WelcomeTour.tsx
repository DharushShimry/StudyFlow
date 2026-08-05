import { useState, useCallback, useEffect } from 'react';
import { Sparkles, LayoutDashboard, ShieldCheck, Rocket, ArrowRight, ArrowLeft, X, CalendarDays, NotebookPen, FolderOpen, BarChart3 } from 'lucide-react';

interface WelcomeTourProps {
  username: string;
  onClose: () => void;
}

interface TourStep {
  icon: typeof Sparkles;
  title: string;
  body: string;
  chips: string[];
}

const STEPS: TourStep[] = [
  {
    icon: Sparkles,
    title: 'Welcome to StudyFlow!',
    body: 'Your very own account is ready. This is your personal space — what you build here stays yours.',
    chips: ['Username reserved', 'Fresh account', 'Ready to go'],
  },
  {
    icon: LayoutDashboard,
    title: 'You start with a fresh dashboard',
    body: 'New accounts begin completely empty — no one else\'s timetables, notes or files. Everything you see here is yours to build from scratch.',
    chips: ['Clean slate', 'No shared data', 'All yours'],
  },
  {
    icon: ShieldCheck,
    title: 'Your data is private to your account',
    body: 'Everything you add — class schedules, notes, books, revision plans — is saved under your account only. Other users who log in on their own device get their own separate space.',
    chips: ['Per-account storage', 'Private by design', 'No cross-user data'],
  },
  {
    icon: Rocket,
    title: 'Ready to make it yours?',
    body: 'Add your class & school timetables, jot down notes, upload books and documents, plan revisions, and explore the AI tools. Start with whatever matters most to you!',
    chips: ['Add timetables', 'Write notes', 'Upload files'],
  },
];

export default function WelcomeTour({ username, onClose }: WelcomeTourProps) {
  const [step, setStep] = useState(0);
  const last = step === STEPS.length - 1;

  const goNext = useCallback(() => {
    setStep(s => (s === STEPS.length - 1 ? s : s + 1));
  }, []);

  const goBack = useCallback(() => {
    setStep(s => (s === 0 ? s : s - 1));
  }, []);

  // Escape / Enter shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') goNext();
      if (e.key === 'ArrowLeft') goBack();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, goNext, goBack]);

  const current = STEPS[step];
  const Icon = current.icon;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm animate-scale-in"
        onClick={onClose}
      />

      {/* Card */}
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-800 rounded-3xl shadow-2xl overflow-hidden animate-scale-in">
        {/* Header */}
        <div className="hero-gradient animate-gradient-shift p-7 pb-6 text-white relative overflow-hidden">
          <div className="absolute inset-0 opacity-[0.12]">
            <div className="absolute top-3 right-[15%] w-10 h-10 rounded-full bg-white animate-float-slow"/>
            <div className="absolute bottom-4 left-[12%] w-8 h-8 rounded-full bg-white animate-float" style={{ animationDuration: '5s' }}/>
          </div>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
            title="Close (Esc)"
            aria-label="Close welcome tour"
          >
            <X size={16}/>
          </button>
          <div className="relative flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center ring-1 ring-white/25 shadow-lg animate-bounce-gentle">
              <Icon size={24}/>
            </div>
            <div>
              <p className="text-xs font-medium opacity-80 tracking-wide uppercase">
                Step {step + 1} of {STEPS.length}
              </p>
              <h2 className="text-xl font-bold tracking-tight">{current.title}</h2>
              {step === 0 && username && (
                <p className="text-xs opacity-80 mt-1 font-medium">@{username}</p>
              )}
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-7 pt-6">
          <div key={step} className="animate-page-in">
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed min-h-[4.5rem]">
              {current.body}
            </p>

            {/* Feature chips */}
            <div className="flex flex-wrap gap-2 mt-4">
              {current.chips.map(chip => (
                <span
                  key={chip}
                  className="text-xs font-medium px-2.5 py-1 rounded-full bg-accent-light border border-accent-light text-accent"
                >
                  {chip}
                </span>
              ))}
            </div>

            {/* Quick feature preview on last step */}
            {last && (
              <div className="grid grid-cols-2 gap-2 mt-5">
                {[
                  { icon: CalendarDays, label: 'Timetables' },
                  { icon: NotebookPen, label: 'Notes' },
                  { icon: FolderOpen, label: 'Books & Files' },
                  { icon: BarChart3, label: 'Revision Planner' },
                ].map(({ icon: Fi, label }) => (
                  <div key={label} className="flex items-center gap-2 bg-slate-50 dark:bg-slate-700/50 border border-slate-100 dark:border-slate-600 rounded-xl px-3 py-2.5">
                    <Fi size={16} className="text-accent flex-shrink-0"/>
                    <span className="text-xs font-medium text-slate-700 dark:text-slate-200">{label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-7 pb-7 flex items-center justify-between gap-3">
          {/* Progress dots */}
          <div className="flex items-center gap-1.5">
            {STEPS.map((_, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                aria-label={`Go to step ${i + 1}`}
                className={`h-1.5 rounded-full transition-all duration-300 ${i === step ? 'w-6 bg-accent' : 'w-1.5 bg-slate-300 dark:bg-slate-600 hover:bg-slate-400'}`}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            {step > 0 && (
              <button
                onClick={goBack}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                <ArrowLeft size={15}/> Back
              </button>
            )}
            <button
              onClick={last ? onClose : goNext}
              className="btn-accent flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all"
            >
              {last ? (
                <>Let's go! <Sparkles size={15}/></>
              ) : (
                <>Next <ArrowRight size={15}/></>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
