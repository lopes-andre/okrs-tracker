"use client";

import { ReactNode } from "react";
import { AlertTriangle, RefreshCw, Loader2 } from "lucide-react";
import { Button } from "./button";
import { Skeleton, SkeletonCard } from "./skeleton";
import { formatErrorMessage } from "@/lib/toast-utils";
import { cn } from "@/lib/utils";

interface QueryStateProps {
  /** Whether data is currently loading */
  isLoading: boolean;
  /** Error from the query, if any */
  error: unknown;
  /** The data (used to check if empty) */
  data: unknown;
  /** Content to render when data is available */
  children: ReactNode;
  /** Loading skeleton type */
  loadingType?: "skeleton" | "spinner" | "card" | "custom";
  /** Custom loading component */
  loadingComponent?: ReactNode;
  /** Number of skeleton items to show */
  skeletonCount?: number;
  /** Callback to retry the failed query */
  onRetry?: () => void;
  /** Custom empty state message */
  emptyMessage?: string;
  /** Custom empty state component */
  emptyComponent?: ReactNode;
  /** Show empty state when data is empty array */
  showEmpty?: boolean;
  /** Compact error display */
  compact?: boolean;
  /** Additional class names */
  className?: string;
}

/**
 * Wrapper component that handles loading, error, and empty states for queries.
 * Provides consistent UX across all data-fetching components.
 */
export function QueryState({
  isLoading,
  error,
  data,
  children,
  loadingType = "skeleton",
  loadingComponent,
  skeletonCount = 3,
  onRetry,
  emptyMessage = "No data available.",
  emptyComponent,
  showEmpty = true,
  compact = false,
  className,
}: QueryStateProps) {
  // Loading state
  if (isLoading) {
    if (loadingComponent) {
      return <>{loadingComponent}</>;
    }

    if (loadingType === "spinner") {
      return (
        <div className={cn("flex justify-center py-8", className)}>
          <Loader2 className="h-8 w-8 animate-spin text-text-muted" />
        </div>
      );
    }

    if (loadingType === "card") {
      return (
        <div className={cn("space-y-4", className)}>
          {Array.from({ length: skeletonCount }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      );
    }

    // Default skeleton
    return (
      <div className={cn("space-y-3", className)}>
        {Array.from({ length: skeletonCount }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  // Error state
  if (error) {
    const { description } = formatErrorMessage(error);

    if (compact) {
      return (
        <div className={cn("p-4 rounded-card border border-status-danger/30 bg-status-danger/5", className)}>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm text-status-danger">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{description}</span>
            </div>
            {onRetry && (
              <Button onClick={onRetry} variant="ghost" size="sm">
                <RefreshCw className="w-3 h-3 mr-1" />
                Retry
              </Button>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className={cn("p-6 rounded-card border border-status-danger/30 bg-status-danger/5", className)}>
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-full bg-status-danger/10 flex-shrink-0">
            <AlertTriangle className="w-5 h-5 text-status-danger" />
          </div>
          <div className="flex-1">
            <h3 className="font-medium text-status-danger mb-1">Failed to load</h3>
            <p className="text-sm text-text-muted mb-4">{description}</p>
            {onRetry && (
              <Button onClick={onRetry} size="sm">
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Empty state
  if (showEmpty && data !== undefined) {
    const isEmpty = Array.isArray(data) ? data.length === 0 : !data;
    if (isEmpty) {
      if (emptyComponent) {
        return <>{emptyComponent}</>;
      }
      return (
        <div className={cn("py-8 text-center text-text-muted", className)}>
          {emptyMessage}
        </div>
      );
    }
  }

  // Success state - render children
  return <>{children}</>;
}

/**
 * Simple loading spinner component.
 */
export function LoadingSpinner({ className, size = "md" }: { className?: string; size?: "sm" | "md" | "lg" }) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-6 w-6",
    lg: "h-8 w-8",
  };

  return (
    <Loader2 className={cn("animate-spin text-text-muted", sizeClasses[size], className)} />
  );
}

/**
 * Full-page loading overlay for critical operations.
 */
export function LoadingOverlay({ message }: { message?: string }) {
  return (
    <div className="fixed inset-0 bg-bg-0/80 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="text-center">
        <LoadingSpinner size="lg" className="mx-auto mb-4" />
        {message && (
          <p className="text-sm text-text-muted">{message}</p>
        )}
      </div>
    </div>
  );
}
