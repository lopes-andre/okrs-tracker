import { PostgrestError } from "@supabase/supabase-js";
import { createModuleLogger } from "./logger";

// ============================================================================
// LOGGER
// ============================================================================

const apiLogger = createModuleLogger("api");

// ============================================================================
// ERROR TYPES AND CATEGORIES
// ============================================================================

/**
 * Error categories for handling different error types
 */
export type ErrorCategory =
  | "validation"     // User input errors
  | "auth"           // Authentication/authorization errors
  | "not_found"      // Resource not found
  | "conflict"       // Duplicate/conflict errors
  | "network"        // Network connectivity issues
  | "timeout"        // Request timeout
  | "rate_limit"     // Rate limiting
  | "server"         // Server-side errors
  | "unknown";       // Unknown errors

/**
 * Error codes that should NOT be retried
 */
const NON_RETRYABLE_CODES = new Set([
  "23505", // unique_violation - duplicate key
  "23503", // foreign_key_violation
  "23502", // not_null_violation
  "42501", // insufficient_privilege
  "PGRST301", // Row-level security violation
  "22P02", // invalid_text_representation
  "PGRST116", // Not found (single row expected)
  "23514", // check_violation
  "42P01", // undefined_table
]);

/**
 * Error codes that indicate network/connectivity issues (should retry)
 */
const NETWORK_ERROR_CODES = new Set([
  "ECONNREFUSED",
  "ECONNRESET",
  "ETIMEDOUT",
  "ENOTFOUND",
  "EAI_AGAIN",
  "NETWORK_ERROR",
]);

// ============================================================================
// API ERROR CLASS
// ============================================================================

export class ApiError extends Error {
  code: string;
  details: string | null;
  hint: string | null;
  category: ErrorCategory;
  isRetryable: boolean;
  statusCode?: number;

  constructor(error: PostgrestError | Error | { message: string; code?: string }) {
    const message = error.message || "An unexpected error occurred.";
    super(message);
    this.name = "ApiError";

    if ("code" in error && error.code) {
      this.code = error.code;
    } else {
      this.code = "UNKNOWN";
    }

    this.details = "details" in error ? (error as PostgrestError).details : null;
    this.hint = "hint" in error ? (error as PostgrestError).hint : null;
    this.category = this.determineCategory();
    this.isRetryable = this.determineRetryable();
  }

  /**
   * Determine error category based on error code
   */
  private determineCategory(): ErrorCategory {
    switch (this.code) {
      case "23505": // unique_violation
        return "conflict";
      case "23503": // foreign_key_violation
      case "23502": // not_null_violation
      case "22P02": // invalid_text_representation
      case "23514": // check_violation
        return "validation";
      case "42501": // insufficient_privilege
      case "PGRST301": // Row-level security violation
        return "auth";
      case "PGRST116": // Not found
        return "not_found";
      case "PGRST103": // Timeout
        return "timeout";
      case "429": // Too many requests
        return "rate_limit";
      default:
        if (NETWORK_ERROR_CODES.has(this.code)) {
          return "network";
        }
        if (this.code.startsWith("5") || this.code.startsWith("P0")) {
          return "server";
        }
        return "unknown";
    }
  }

  /**
   * Determine if error should be retried
   */
  private determineRetryable(): boolean {
    // Network errors and timeouts should be retried
    if (this.category === "network" || this.category === "timeout") {
      return true;
    }
    // Server errors might be transient
    if (this.category === "server") {
      return true;
    }
    // Rate limits should be retried after delay
    if (this.category === "rate_limit") {
      return true;
    }
    // Don't retry validation, auth, or conflict errors
    return !NON_RETRYABLE_CODES.has(this.code);
  }

  // User-friendly error messages
  get userMessage(): string {
    // Handle common Postgres error codes
    switch (this.code) {
      case "23505": // unique_violation
        return "This item already exists.";
      case "23503": // foreign_key_violation
        return "Cannot delete this item because it is referenced by other data.";
      case "23502": // not_null_violation
        return "Required field is missing.";
      case "42501": // insufficient_privilege
        return "You don't have permission to perform this action.";
      case "PGRST301": // Row-level security violation
        return "You don't have access to this resource.";
      case "PGRST116": // Not found
        return "The requested item was not found.";
      case "22P02": // invalid_text_representation
        return "Invalid data format provided.";
      case "PGRST103": // Timeout
        return "The request took too long. Please try again.";
      case "429": // Rate limit
        return "Too many requests. Please wait a moment and try again.";
      default:
        if (this.category === "network") {
          return "Network connection error. Please check your internet connection.";
        }
        if (this.category === "server") {
          return "Server error. We're working to fix this.";
        }
        return this.message || "An unexpected error occurred..";
    }
  }

  /**
   * Get structured error context for logging
   */
  toLogContext(): Record<string, unknown> {
    return {
      code: this.code,
      category: this.category,
      isRetryable: this.isRetryable,
      details: this.details,
      hint: this.hint,
      userMessage: this.userMessage,
    };
  }
}

// ============================================================================
// NETWORK ERROR DETECTION
// ============================================================================

/**
 * Check if an error is a network-related error
 */
export function isNetworkError(error: unknown): boolean {
  if (error instanceof TypeError && error.message === "Failed to fetch") {
    return true;
  }
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes("network") ||
      message.includes("fetch") ||
      message.includes("connection") ||
      message.includes("timeout") ||
      message.includes("offline")
    );
  }
  return false;
}

/**
 * Create an ApiError from any error type
 */
export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) {
    return error;
  }
  if (error instanceof Error) {
    if (isNetworkError(error)) {
      return new ApiError({ message: error.message, code: "NETWORK_ERROR" });
    }
    return new ApiError({ message: error.message, code: "UNKNOWN" });
  }
  if (typeof error === "string") {
    return new ApiError({ message: error, code: "UNKNOWN" });
  }
  // Handle plain objects with message property
  if (typeof error === "object" && error !== null && "message" in error) {
    const errObj = error as { message: string; code?: string };
    return new ApiError({ message: errObj.message, code: errObj.code || "UNKNOWN" });
  }
  return new ApiError({ message: "An unexpected error occurred.", code: "UNKNOWN" });
}

/**
 * Determine if an error should be retried by React Query
 */
export function shouldRetryError(error: unknown, attemptIndex: number): boolean {
  // Don't retry after 3 attempts
  if (attemptIndex >= 3) {
    return false;
  }

  const apiError = toApiError(error);
  return apiError.isRetryable;
}

// Type for Supabase query results
interface SupabaseQueryResult<T> {
  data: T | null;
  error: PostgrestError | null;
}

// Wrapper to handle Supabase errors consistently
export async function handleSupabaseError<T>(
  query: PromiseLike<SupabaseQueryResult<T>>,
  operationName?: string
): Promise<T> {
  const result = await query;
  const { data, error } = result as SupabaseQueryResult<T>;

  if (error) {
    const apiError = new ApiError(error);
    apiLogger.error(
      `Database operation failed${operationName ? `: ${operationName}` : ""}`,
      apiError.toLogContext(),
      apiError
    );
    throw apiError;
  }

  if (data === null) {
    const noDataError = new Error("No data returned");
    apiLogger.warn("Query returned no data", { operation: operationName });
    throw noDataError;
  }

  return data;
}

// For queries that can return null (single item fetch)
export async function handleSupabaseQuery<T>(
  query: PromiseLike<SupabaseQueryResult<T>>,
  operationName?: string
): Promise<T | null> {
  const result = await query;
  const { data, error } = result as SupabaseQueryResult<T>;

  if (error) {
    const apiError = new ApiError(error);
    apiLogger.error(
      `Database operation failed${operationName ? `: ${operationName}` : ""}`,
      apiError.toLogContext(),
      apiError
    );
    throw apiError;
  }

  return data;
}

// For delete operations that don't return data
export async function handleSupabaseDelete(
  query: PromiseLike<SupabaseQueryResult<unknown>>,
  operationName?: string
): Promise<void> {
  const result = await query;
  const { error } = result as SupabaseQueryResult<unknown>;

  if (error) {
    const apiError = new ApiError(error);
    apiLogger.error(
      `Delete operation failed${operationName ? `: ${operationName}` : ""}`,
      apiError.toLogContext(),
      apiError
    );
    throw apiError;
  }
}

// ============================================================================
// PAGINATION HELPERS
// ============================================================================

export interface PaginatedResult<T> {
  data: T[];
  count: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore: boolean;
}

export function getPaginationRange(page: number, limit: number): { from: number; to: number } {
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  return { from, to };
}

export function createPaginatedResult<T>(
  data: T[],
  count: number,
  page: number,
  limit: number
): PaginatedResult<T> {
  const totalPages = Math.ceil(count / limit);
  return {
    data,
    count,
    page,
    limit,
    totalPages,
    hasMore: page < totalPages,
  };
}

