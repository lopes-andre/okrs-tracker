/**
 * Error Reporting Utility
 *
 * Centralized error reporting for the application.
 * - Collects error context and metadata
 * - Logs to structured logger
 * - Prepared for future external service integration (e.g., Sentry, LogRocket)
 *
 * Usage:
 *   import { reportError, ErrorReporter } from '@/lib/error-reporter';
 *
 *   // Simple usage
 *   reportError(error, { component: 'TaskList' });
 *
 *   // With React Error Boundary
 *   <ErrorBoundary onError={handleComponentError}>
 */

import { createModuleLogger, LogContext } from "./logger";

// ============================================================================
// TYPES
// ============================================================================

export interface ErrorContext extends LogContext {
  /** Component or module where error occurred */
  component?: string;
  /** User action that triggered the error */
  action?: string;
  /** Additional user context (never include PII) */
  userId?: string;
  /** Current route/page */
  route?: string;
  /** Request/operation ID for tracing */
  traceId?: string;
}

export interface ReportedError {
  id: string;
  timestamp: string;
  error: {
    name: string;
    message: string;
    stack?: string;
  };
  context: ErrorContext;
  browser?: {
    userAgent: string;
    url: string;
  };
}

type ErrorHandler = (error: ReportedError) => void | Promise<void>;

// ============================================================================
// ERROR REPORTER
// ============================================================================

const errorLogger = createModuleLogger("error-reporter");

// Error handlers for external services
const errorHandlers: ErrorHandler[] = [];

// Recent errors for deduplication (simple in-memory cache)
const recentErrors = new Map<string, number>();
const DEDUPE_WINDOW_MS = 5000; // 5 seconds

/**
 * Generate a unique ID for the error
 */
function generateErrorId(): string {
  return `err_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Create a fingerprint for error deduplication
 */
function createErrorFingerprint(error: Error, context?: ErrorContext): string {
  return `${error.name}:${error.message}:${context?.component || "unknown"}`;
}

/**
 * Check if error was recently reported (deduplication)
 */
function wasRecentlyReported(fingerprint: string): boolean {
  const lastReported = recentErrors.get(fingerprint);
  if (!lastReported) return false;

  if (Date.now() - lastReported < DEDUPE_WINDOW_MS) {
    return true;
  }

  recentErrors.delete(fingerprint);
  return false;
}

/**
 * Clean up old fingerprints from cache
 */
function cleanupRecentErrors(): void {
  const now = Date.now();
  for (const [fingerprint, timestamp] of recentErrors.entries()) {
    if (now - timestamp > DEDUPE_WINDOW_MS) {
      recentErrors.delete(fingerprint);
    }
  }
}

/**
 * Get browser context if available
 */
function getBrowserContext(): ReportedError["browser"] | undefined {
  if (typeof window === "undefined") return undefined;

  return {
    userAgent: navigator.userAgent,
    url: window.location.href,
  };
}

/**
 * Report an error to the centralized error system
 *
 * @param error - The error to report
 * @param context - Additional context about where/why the error occurred
 * @returns The error ID for reference
 */
export function reportError(error: Error, context?: ErrorContext): string {
  const fingerprint = createErrorFingerprint(error, context);

  // Deduplicate rapid-fire errors
  if (wasRecentlyReported(fingerprint)) {
    errorLogger.debug("Skipping duplicate error", { fingerprint });
    return "";
  }

  recentErrors.set(fingerprint, Date.now());

  // Periodic cleanup
  if (recentErrors.size > 100) {
    cleanupRecentErrors();
  }

  const reportedError: ReportedError = {
    id: generateErrorId(),
    timestamp: new Date().toISOString(),
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
    },
    context: context || {},
    browser: getBrowserContext(),
  };

  // Log to structured logger
  errorLogger.error("Error reported", reportedError.context, error);

  // Call registered handlers (for external services)
  errorHandlers.forEach((handler) => {
    try {
      handler(reportedError);
    } catch (handlerError) {
      errorLogger.warn("Error handler failed", {}, handlerError as Error);
    }
  });

  return reportedError.id;
}

/**
 * Register an error handler for external services
 *
 * Example:
 *   registerErrorHandler((error) => {
 *     Sentry.captureException(error);
 *   });
 */
export function registerErrorHandler(handler: ErrorHandler): () => void {
  errorHandlers.push(handler);

  // Return unsubscribe function
  return () => {
    const index = errorHandlers.indexOf(handler);
    if (index > -1) {
      errorHandlers.splice(index, 1);
    }
  };
}

// ============================================================================
// REACT INTEGRATION
// ============================================================================

/**
 * Handler for React ErrorBoundary components
 *
 * Usage:
 *   <ErrorBoundary onError={handleComponentError}>
 */
export function handleComponentError(
  error: Error,
  errorInfo: React.ErrorInfo
): void {
  reportError(error, {
    component: "ErrorBoundary",
    action: "component_crash",
    componentStack: errorInfo.componentStack || undefined,
  });
}

/**
 * Create a component-specific error handler
 *
 * Usage:
 *   const handleError = createComponentErrorHandler('TaskDialog');
 *   try { ... } catch (e) { handleError(e as Error, 'save_task'); }
 */
export function createComponentErrorHandler(
  componentName: string
): (error: Error, action?: string) => string {
  return (error: Error, action?: string) => {
    return reportError(error, {
      component: componentName,
      action,
    });
  };
}

// ============================================================================
// API INTEGRATION
// ============================================================================

/**
 * Handler for API errors
 *
 * Usage:
 *   catch (error) { handleApiError(error, '/api/tasks', 'GET'); }
 */
export function handleApiError(
  error: Error,
  endpoint: string,
  method?: string,
  additionalContext?: LogContext
): string {
  return reportError(error, {
    component: "API",
    action: `${method || "CALL"} ${endpoint}`,
    endpoint,
    method,
    ...additionalContext,
  });
}

// ============================================================================
// GLOBAL ERROR HANDLERS
// ============================================================================

/**
 * Set up global error handlers for uncaught errors
 * Call once during app initialization
 */
export function setupGlobalErrorHandlers(): void {
  if (typeof window === "undefined") return;

  // Uncaught errors
  window.addEventListener("error", (event) => {
    reportError(event.error || new Error(event.message), {
      component: "global",
      action: "uncaught_error",
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    });
  });

  // Unhandled promise rejections
  window.addEventListener("unhandledrejection", (event) => {
    const error =
      event.reason instanceof Error
        ? event.reason
        : new Error(String(event.reason));

    reportError(error, {
      component: "global",
      action: "unhandled_rejection",
    });
  });

  errorLogger.info("Global error handlers initialized");
}

// ============================================================================
// ERROR REPORTER CLASS (for advanced usage)
// ============================================================================

/**
 * ErrorReporter class for more control over error reporting
 *
 * Usage:
 *   const reporter = new ErrorReporter({ component: 'TaskList' });
 *   reporter.report(error, { action: 'delete_task' });
 */
export class ErrorReporter {
  private defaultContext: ErrorContext;

  constructor(defaultContext: ErrorContext = {}) {
    this.defaultContext = defaultContext;
  }

  /**
   * Report an error with the default context
   */
  report(error: Error, additionalContext?: ErrorContext): string {
    return reportError(error, {
      ...this.defaultContext,
      ...additionalContext,
    });
  }

  /**
   * Create a child reporter with additional context
   */
  child(context: ErrorContext): ErrorReporter {
    return new ErrorReporter({
      ...this.defaultContext,
      ...context,
    });
  }

  /**
   * Wrap an async function to automatically report errors
   */
  async wrap<T>(
    operation: () => Promise<T>,
    action: string
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      this.report(error as Error, { action });
      throw error;
    }
  }
}
