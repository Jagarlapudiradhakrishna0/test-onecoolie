/* ============================================================
   SKELETON COMPONENT — Restrained Monochromatic Shimmer
   ============================================================ */

import TrainLoader from './TrainLoader';

export default function Skeleton({ className = '' }) {
  return (
    <div
      className={`bg-zinc-200/80 dark:bg-zinc-800/80 animate-pulse rounded-xl ${className}`}
    />
  );
}

export function CardSkeleton() {
  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 space-y-4">
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-8 w-2/3" />
      <div className="space-y-2 pt-2">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-4/5" />
      </div>
    </div>
  );
}

export function BookingSkeleton() {
  return (
    <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-3xl p-6 shadow-2xs">
      <TrainLoader fullScreen={false} size="sm" text="Loading Trip Records..." subtext="" />
    </div>
  );
}

export { TrainLoader };