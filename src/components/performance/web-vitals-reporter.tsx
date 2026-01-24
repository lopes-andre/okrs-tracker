"use client";

import { useEffect } from "react";
import { initWebVitals, onWebVital, type WebVitalMetric } from "@/lib/web-vitals";

/**
 * Web Vitals Reporter Component
 *
 * Initializes Web Vitals monitoring and optionally reports to analytics.
 * Add this component to your root layout to enable monitoring.
 *
 * Example:
 *   <WebVitalsReporter />
 *
 * With custom callback:
 *   <WebVitalsReporter onReport={(metric) => analytics.send(metric)} />
 */
interface WebVitalsReporterProps {
  /**
   * Optional callback for custom metric handling (e.g., sending to analytics)
   */
  onReport?: (metric: WebVitalMetric) => void;
  /**
   * Enable debug mode (logs all metrics to console)
   */
  debug?: boolean;
}

export function WebVitalsReporter({ onReport, debug = false }: WebVitalsReporterProps) {
  useEffect(() => {
    // Initialize Web Vitals
    initWebVitals();

    // Register custom callback if provided
    if (onReport) {
      return onWebVital(onReport);
    }

    // In debug mode, log all metrics
    if (debug) {
      return onWebVital((metric) => {
        console.log("[WebVitals Debug]", metric);
      });
    }
  }, [onReport, debug]);

  // This component doesn't render anything
  return null;
}

export default WebVitalsReporter;
