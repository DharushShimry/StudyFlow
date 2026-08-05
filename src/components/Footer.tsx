/**
 * Global footer shown at the end of every page: copyright + credit line.
 */
export default function Footer({ className = '' }: { className?: string }) {
  return (
    <footer className={className}>
      <div className="border-t border-slate-100 dark:border-slate-700/60 pt-4 flex flex-col sm:flex-row items-center justify-center sm:justify-between gap-2">
        <p className="text-xs text-slate-400 dark:text-slate-500">© 2026. All Rights Reserved.</p>
        <p className="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
          Crafted with <span className="text-red-400">❤️</span> by Akeem
        </p>
      </div>
    </footer>
  );
}
