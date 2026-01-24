/**
 * Structured Logging Utility
 *
 * Provides consistent, structured logging across the application.
 * - Development: Pretty-printed console output with colors
 * - Production: JSON-structured output ready for log aggregation
 *
 * Usage:
 *   import { logger } from '@/lib/logger';
 *   logger.info('User logged in', { userId: '123' });
 *   logger.error('API failed', { endpoint: '/api/data', statusCode: 500 });
 */

// ============================================================================
// TYPES
// ============================================================================

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogContext {
  [key: string]: unknown;
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

interface LoggerConfig {
  /** Minimum log level to output */
  minLevel: LogLevel;
  /** Include stack traces in error logs */
  includeStack: boolean;
  /** Output as JSON (for production log aggregation) */
  jsonOutput: boolean;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const LOG_COLORS: Record<LogLevel, string> = {
  debug: "\x1b[36m", // Cyan
  info: "\x1b[32m",  // Green
  warn: "\x1b[33m",  // Yellow
  error: "\x1b[31m", // Red
};

const RESET_COLOR = "\x1b[0m";

const isProduction = process.env.NODE_ENV === "production";
const isBrowser = typeof window !== "undefined";

const defaultConfig: LoggerConfig = {
  minLevel: isProduction ? "info" : "debug",
  includeStack: !isProduction,
  jsonOutput: isProduction && !isBrowser,
};

// ============================================================================
// LOGGER IMPLEMENTATION
// ============================================================================

class Logger {
  private config: LoggerConfig;
  private defaultContext: LogContext = {};

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
  }

  /**
   * Set default context that will be included in all log entries
   */
  setDefaultContext(context: LogContext): void {
    this.defaultContext = { ...this.defaultContext, ...context };
  }

  /**
   * Create a child logger with additional default context
   */
  child(context: LogContext): Logger {
    const childLogger = new Logger(this.config);
    childLogger.setDefaultContext({ ...this.defaultContext, ...context });
    return childLogger;
  }

  /**
   * Check if a log level should be output
   */
  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[this.config.minLevel];
  }

  /**
   * Format timestamp for log entry
   */
  private getTimestamp(): string {
    return new Date().toISOString();
  }

  /**
   * Create a structured log entry
   */
  private createEntry(
    level: LogLevel,
    message: string,
    context?: LogContext,
    error?: Error
  ): LogEntry {
    const entry: LogEntry = {
      timestamp: this.getTimestamp(),
      level,
      message,
    };

    const mergedContext = { ...this.defaultContext, ...context };
    if (Object.keys(mergedContext).length > 0) {
      entry.context = mergedContext;
    }

    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
      };
      if (this.config.includeStack && error.stack) {
        entry.error.stack = error.stack;
      }
    }

    return entry;
  }

  /**
   * Output log entry to console
   */
  private output(entry: LogEntry): void {
    if (this.config.jsonOutput) {
      // JSON output for log aggregation
      console.log(JSON.stringify(entry));
      return;
    }

    // Pretty console output for development
    const color = isBrowser ? "" : LOG_COLORS[entry.level];
    const reset = isBrowser ? "" : RESET_COLOR;
    const levelStr = entry.level.toUpperCase().padEnd(5);
    const prefix = `${color}[${levelStr}]${reset}`;

    if (entry.context || entry.error) {
      console.group(`${prefix} ${entry.message}`);
      if (entry.context) {
        console.log("Context:", entry.context);
      }
      if (entry.error) {
        console.log("Error:", entry.error.name, "-", entry.error.message);
        if (entry.error.stack) {
          console.log("Stack:", entry.error.stack);
        }
      }
      console.groupEnd();
    } else {
      console.log(`${prefix} ${entry.message}`);
    }
  }

  /**
   * Log at debug level
   */
  debug(message: string, context?: LogContext): void {
    if (!this.shouldLog("debug")) return;
    const entry = this.createEntry("debug", message, context);
    this.output(entry);
  }

  /**
   * Log at info level
   */
  info(message: string, context?: LogContext): void {
    if (!this.shouldLog("info")) return;
    const entry = this.createEntry("info", message, context);
    this.output(entry);
  }

  /**
   * Log at warn level
   */
  warn(message: string, context?: LogContext, error?: Error): void {
    if (!this.shouldLog("warn")) return;
    const entry = this.createEntry("warn", message, context, error);
    this.output(entry);
  }

  /**
   * Log at error level
   */
  error(message: string, context?: LogContext, error?: Error): void {
    if (!this.shouldLog("error")) return;
    const entry = this.createEntry("error", message, context, error);
    this.output(entry);
  }

  /**
   * Log an error with automatic context extraction
   */
  logError(error: Error, context?: LogContext): void {
    this.error(error.message, context, error);
  }

  /**
   * Time an async operation and log the result
   */
  async time<T>(
    name: string,
    operation: () => Promise<T>,
    context?: LogContext
  ): Promise<T> {
    const start = performance.now();
    try {
      const result = await operation();
      const duration = performance.now() - start;
      this.debug(`${name} completed`, { ...context, durationMs: Math.round(duration) });
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      this.error(`${name} failed`, { ...context, durationMs: Math.round(duration) }, error as Error);
      throw error;
    }
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

/**
 * Default logger instance
 */
export const logger = new Logger();

/**
 * Create a logger with custom configuration
 */
export function createLogger(config?: Partial<LoggerConfig>): Logger {
  return new Logger(config);
}

/**
 * Create a context-specific logger
 * Useful for module-specific logging
 */
export function createModuleLogger(moduleName: string): Logger {
  return logger.child({ module: moduleName });
}
