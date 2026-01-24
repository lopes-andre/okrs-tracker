/**
 * Performance Measurement Utilities
 *
 * Lightweight utilities for measuring and monitoring application performance.
 * Use these to establish baselines and detect regressions.
 */

// ============================================================================
// TYPES
// ============================================================================

export interface PerformanceMark {
  name: string;
  startTime: number;
  duration?: number;
}

export interface PerformanceMetric {
  name: string;
  value: number;
  unit: "ms" | "bytes" | "count";
  timestamp: number;
}

// ============================================================================
// TIMING UTILITIES
// ============================================================================

/**
 * Measure the execution time of an async operation
 */
export async function measureAsync<T>(
  name: string,
  operation: () => Promise<T>,
  options: { logResult?: boolean } = {}
): Promise<{ result: T; duration: number }> {
  const start = performance.now();
  const result = await operation();
  const duration = performance.now() - start;

  if (options.logResult !== false && process.env.NODE_ENV === "development") {
    console.log(`[Performance] ${name}: ${duration.toFixed(2)}ms`);
  }

  return { result, duration };
}

/**
 * Measure the execution time of a sync operation
 */
export function measureSync<T>(
  name: string,
  operation: () => T,
  options: { logResult?: boolean } = {}
): { result: T; duration: number } {
  const start = performance.now();
  const result = operation();
  const duration = performance.now() - start;

  if (options.logResult !== false && process.env.NODE_ENV === "development") {
    console.log(`[Performance] ${name}: ${duration.toFixed(2)}ms`);
  }

  return { result, duration };
}

// ============================================================================
// PERFORMANCE MARKS
// ============================================================================

const marks = new Map<string, number>();

/**
 * Start a performance mark
 */
export function markStart(name: string): void {
  marks.set(name, performance.now());

  if (process.env.NODE_ENV === "development") {
    performance.mark(`${name}-start`);
  }
}

/**
 * End a performance mark and return the duration
 */
export function markEnd(name: string): number {
  const start = marks.get(name);
  if (!start) {
    console.warn(`[Performance] No start mark found for: ${name}`);
    return 0;
  }

  const duration = performance.now() - start;
  marks.delete(name);

  if (process.env.NODE_ENV === "development") {
    performance.mark(`${name}-end`);
    performance.measure(name, `${name}-start`, `${name}-end`);
    console.log(`[Performance] ${name}: ${duration.toFixed(2)}ms`);
  }

  return duration;
}

// ============================================================================
// API TIMING
// ============================================================================

/**
 * Wrap a fetch/API call with timing
 */
export async function timedFetch<T>(
  name: string,
  fetchFn: () => Promise<T>
): Promise<T> {
  const { result, duration } = await measureAsync(name, fetchFn);

  // Log slow queries (>500ms) even in production
  if (duration > 500) {
    console.warn(`[Performance] Slow query detected: ${name} took ${duration.toFixed(2)}ms`);
  }

  return result;
}

// ============================================================================
// RENDER TIMING (Client-side only)
// ============================================================================

/**
 * Log when a component renders (use in useEffect)
 * Only logs in development mode
 */
export function logRender(componentName: string): void {
  if (process.env.NODE_ENV === "development" && typeof window !== "undefined") {
    console.log(`[Render] ${componentName} rendered at ${performance.now().toFixed(2)}ms`);
  }
}

/**
 * Create a render timing hook helper
 */
export function createRenderTimer(componentName: string): {
  start: () => void;
  end: () => void;
} {
  let startTime = 0;

  return {
    start: () => {
      startTime = performance.now();
    },
    end: () => {
      if (process.env.NODE_ENV === "development" && startTime > 0) {
        const duration = performance.now() - startTime;
        console.log(`[Render] ${componentName}: ${duration.toFixed(2)}ms`);
      }
    },
  };
}

// ============================================================================
// SLOW OPERATION DETECTION
// ============================================================================

const THRESHOLDS = {
  api: 500,      // 500ms for API calls
  render: 100,   // 100ms for renders
  query: 200,    // 200ms for database queries
} as const;

type ThresholdType = keyof typeof THRESHOLDS;

/**
 * Check if a duration exceeds the threshold for its type
 */
export function isSlowOperation(
  duration: number,
  type: ThresholdType
): boolean {
  return duration > THRESHOLDS[type];
}

/**
 * Get the threshold for a type
 */
export function getThreshold(type: ThresholdType): number {
  return THRESHOLDS[type];
}

// ============================================================================
// MEMORY MONITORING (Client-side only)
// ============================================================================

/**
 * Get current memory usage (if available)
 * Only works in Chrome with performance.memory
 */
export function getMemoryUsage(): { usedJSHeapSize: number; totalJSHeapSize: number } | null {
  if (typeof window === "undefined") return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const perf = performance as any;
  if (perf.memory) {
    return {
      usedJSHeapSize: perf.memory.usedJSHeapSize,
      totalJSHeapSize: perf.memory.totalJSHeapSize,
    };
  }

  return null;
}

// ============================================================================
// BUNDLE SIZE TRACKING
// ============================================================================

/**
 * Record bundle sizes for tracking
 * Values from build output - update manually after builds
 */
export const BUNDLE_BASELINES = {
  // Recorded: 2026-01-24
  shared: 102,           // KB - First Load JS shared by all
  dashboard: 379,        // KB - /plans/[planId]
  analytics: 463,        // KB - /plans/[planId]/analytics
  okrs: 324,            // KB - /plans/[planId]/okrs
  tasks: 309,           // KB - /plans/[planId]/tasks
  settings: 352,        // KB - /plans/[planId]/settings
  reviews: 269,         // KB - /plans/[planId]/reviews
  middleware: 80,       // KB - Middleware
} as const;

/**
 * Check if a bundle size has regressed
 */
export function hasBundleRegression(
  page: keyof typeof BUNDLE_BASELINES,
  currentSize: number,
  thresholdPercent: number = 10
): boolean {
  const baseline = BUNDLE_BASELINES[page];
  const threshold = baseline * (1 + thresholdPercent / 100);
  return currentSize > threshold;
}
