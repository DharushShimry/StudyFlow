import { cn } from '../utils/cn';

interface SkeletonProps {
  className?: string;
  count?: number;
}

export function Skeleton({ className, count = 1 }: SkeletonProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={cn(
            'animate-skeleton rounded-xl bg-slate-200 dark:bg-slate-700',
            className
          )}
        />
      ))}
    </>
  );
}
