import { cn } from "@/lib/utils";

// A shimmering placeholder. Pair with Tailwind size classes:
//   <Skeleton className="h-4 w-32" />
//   <Skeleton circle className="h-9 w-9" />
type SkeletonProps = {
  className?: string;
  circle?: boolean;
};

export function Skeleton({ className, circle }: SkeletonProps) {
  return (
    <span
      aria-hidden="true"
      className={cn("block skeleton", circle && "skeleton-circle", className)}
    />
  );
}

// Several stacked text lines — the last one shortened, like real prose.
export function SkeletonText({
  lines = 3,
  className,
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2", className)} aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <span
          key={i}
          className={cn(
            "block skeleton skeleton-line",
            i === lines - 1 ? "w-2/3" : "w-full",
          )}
        />
      ))}
    </div>
  );
}

// A skeleton shaped like a table — header bar + N rows.
export function SkeletonTable({
  rows = 6,
  columns = 4,
}: {
  rows?: number;
  columns?: number;
}) {
  return (
    <div className="overflow-hidden" aria-hidden="true">
      <div className="flex gap-4 border-b border-surface-border px-4 py-3">
        {Array.from({ length: columns }).map((_, i) => (
          <span key={i} className="skeleton skeleton-line h-3 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-4 border-b border-gray-100 px-4 py-3.5">
          {Array.from({ length: columns }).map((_, c) => (
            <span
              key={c}
              className={cn(
                "skeleton skeleton-line h-3.5 flex-1",
                c === 0 && "max-w-[40%]",
              )}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
