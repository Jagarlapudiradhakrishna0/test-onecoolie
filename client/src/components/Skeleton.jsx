/* ============================================================
   SKELETON COMPONENT — Restrained Monochromatic Shimmer
   ============================================================ */

export default function Skeleton({ className = '' }) {
  return (
    <div
      className={`animate-pulse bg-zinc-100 dark:bg-zinc-800 rounded-lg ${className}`}
    />
  );
}

export function CardSkeleton() {
  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 space-y-4">
      <Skeleton className="h-4 w-28" />
      <Skeleton className="h-6 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
    </div>
  );
}

export function BookingSkeleton() {
  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 flex items-center gap-4">
      <Skeleton className="w-1.5 h-12 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-3 w-32" />
      </div>
      <Skeleton className="h-9 w-24 rounded-xl" />
    </div>
  );
}