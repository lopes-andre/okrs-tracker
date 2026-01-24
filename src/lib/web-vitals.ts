/**
 * Web Vitals Monitoring
 *
 * Lightweight implementation for collecting Core Web Vitals metrics:
 * - LCP (Largest Contentful Paint): Loading performance
 * - FID (First Input Delay): Interactivity
 * - CLS (Cumulative Layout Shift): Visual stability
 * - FCP (First Contentful Paint): Initial render
 * - TTFB (Time to First Byte): Server response time
 *
 * Usage:
 *   import { initWebVitals } from '@/lib/web-vitals';
 *   initWebVitals(); // Call once in _app or root layout
 */

// ============================================================================
// TYPES
// ============================================================================

export interface WebVitalMetric {
  name: "LCP" | "FID" | "CLS" | "FCP" | "TTFB" | "INP";
  value: number;
  rating: "good" | "needs-improvement" | "poor";
  delta: number;
  id: string;
}

export type WebVitalCallback = (metric: WebVitalMetric) => void;

// Thresholds based on Google's Core Web Vitals
const THRESHOLDS = {
  LCP: { good: 2500, poor: 4000 },      // ms
  FID: { good: 100, poor: 300 },         // ms
  CLS: { good: 0.1, poor: 0.25 },        // score
  FCP: { good: 1800, poor: 3000 },       // ms
  TTFB: { good: 800, poor: 1800 },       // ms
  INP: { good: 200, poor: 500 },         // ms
} as const;

// ============================================================================
// RATING
// ============================================================================

function getRating(name: keyof typeof THRESHOLDS, value: number): "good" | "needs-improvement" | "poor" {
  const threshold = THRESHOLDS[name];
  if (value <= threshold.good) return "good";
  if (value <= threshold.poor) return "needs-improvement";
  return "poor";
}

// ============================================================================
// OBSERVERS
// ============================================================================

let isInitialized = false;
const callbacks: WebVitalCallback[] = [];

function onReport(metric: WebVitalMetric): void {
  // Log in development
  if (process.env.NODE_ENV === "development") {
    const emoji = metric.rating === "good" ? "✅" : metric.rating === "needs-improvement" ? "⚠️" : "❌";
    console.log(`[Web Vitals] ${emoji} ${metric.name}: ${metric.value.toFixed(2)} (${metric.rating})`);
  }

  // Call registered callbacks
  callbacks.forEach((cb) => cb(metric));
}

function observeLCP(): void {
  if (typeof PerformanceObserver === "undefined") return;

  try {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      if (lastEntry) {
        const value = lastEntry.startTime;
        onReport({
          name: "LCP",
          value,
          rating: getRating("LCP", value),
          delta: value,
          id: `lcp-${Date.now()}`,
        });
      }
    });

    observer.observe({ type: "largest-contentful-paint", buffered: true });
  } catch {
    // Observer not supported
  }
}

function observeFID(): void {
  if (typeof PerformanceObserver === "undefined") return;

  try {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const fidEntry = entry as any;
        if (fidEntry.processingStart && fidEntry.startTime) {
          const value = fidEntry.processingStart - fidEntry.startTime;
          onReport({
            name: "FID",
            value,
            rating: getRating("FID", value),
            delta: value,
            id: `fid-${Date.now()}`,
          });
        }
      });
    });

    observer.observe({ type: "first-input", buffered: true });
  } catch {
    // Observer not supported
  }
}

function observeCLS(): void {
  if (typeof PerformanceObserver === "undefined") return;

  let clsValue = 0;

  try {
    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const clsEntry = entry as any;
        if (!clsEntry.hadRecentInput) {
          clsValue += clsEntry.value;
        }
      });
    });

    observer.observe({ type: "layout-shift", buffered: true });

    // Report CLS on page hide
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") {
        onReport({
          name: "CLS",
          value: clsValue,
          rating: getRating("CLS", clsValue),
          delta: clsValue,
          id: `cls-${Date.now()}`,
        });
      }
    });
  } catch {
    // Observer not supported
  }
}

function observeFCP(): void {
  if (typeof PerformanceObserver === "undefined") return;

  try {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const fcpEntry = entries.find((e) => e.name === "first-contentful-paint");
      if (fcpEntry) {
        const value = fcpEntry.startTime;
        onReport({
          name: "FCP",
          value,
          rating: getRating("FCP", value),
          delta: value,
          id: `fcp-${Date.now()}`,
        });
      }
    });

    observer.observe({ type: "paint", buffered: true });
  } catch {
    // Observer not supported
  }
}

function observeTTFB(): void {
  if (typeof performance === "undefined") return;

  // TTFB from Navigation Timing API
  const navigationEntry = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
  if (navigationEntry) {
    const value = navigationEntry.responseStart;
    onReport({
      name: "TTFB",
      value,
      rating: getRating("TTFB", value),
      delta: value,
      id: `ttfb-${Date.now()}`,
    });
  }
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Initialize Web Vitals monitoring
 * Call once in your app's entry point
 */
export function initWebVitals(): void {
  if (typeof window === "undefined" || isInitialized) return;

  isInitialized = true;

  // Wait for page load to complete
  if (document.readyState === "complete") {
    startObserving();
  } else {
    window.addEventListener("load", startObserving);
  }
}

function startObserving(): void {
  observeLCP();
  observeFID();
  observeCLS();
  observeFCP();
  observeTTFB();
}

/**
 * Register a callback to receive Web Vitals metrics
 * Useful for sending to analytics services
 */
export function onWebVital(callback: WebVitalCallback): () => void {
  callbacks.push(callback);

  // Return unsubscribe function
  return () => {
    const index = callbacks.indexOf(callback);
    if (index > -1) {
      callbacks.splice(index, 1);
    }
  };
}

/**
 * Get Web Vitals thresholds for reference
 */
export function getThresholds(): typeof THRESHOLDS {
  return THRESHOLDS;
}

/**
 * Check if a metric value is considered "good"
 */
export function isGoodMetric(name: keyof typeof THRESHOLDS, value: number): boolean {
  return value <= THRESHOLDS[name].good;
}
