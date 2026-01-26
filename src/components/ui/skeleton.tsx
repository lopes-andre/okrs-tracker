import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
}

/**
 * Skeleton loading placeholder component.
 * Shows a pulsing animation to indicate content is loading.
 */
export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-bg-2",
        className
      )}
    />
  );
}

/**
 * Text skeleton that mimics a line of text.
 */
export function SkeletonText({ className }: SkeletonProps) {
  return <Skeleton className={cn("h-4 w-full", className)} />;
}

/**
 * Circle skeleton for avatars or icons.
 */
export function SkeletonCircle({ className }: SkeletonProps) {
  return <Skeleton className={cn("h-10 w-10 rounded-full", className)} />;
}

/**
 * Card skeleton with header and content placeholders.
 */
export function SkeletonCard({ className }: SkeletonProps) {
  return (
    <div className={cn("p-4 rounded-card border bg-bg-0 space-y-3", className)}>
      <Skeleton className="h-5 w-3/4" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
    </div>
  );
}

/**
 * Row skeleton for list items.
 */
export function SkeletonRow({ className }: SkeletonProps) {
  return (
    <div className={cn("flex items-center gap-3 p-3", className)}>
      <SkeletonCircle className="h-8 w-8" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-3 w-1/3" />
      </div>
    </div>
  );
}

/**
 * Table skeleton with rows.
 */
export function SkeletonTable({ rows = 5, className }: SkeletonProps & { rows?: number }) {
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex gap-4 pb-2 border-b">
        <Skeleton className="h-4 w-1/4" />
        <Skeleton className="h-4 w-1/4" />
        <Skeleton className="h-4 w-1/4" />
        <Skeleton className="h-4 w-1/4" />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 py-2">
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-4 w-1/4" />
        </div>
      ))}
    </div>
  );
}
