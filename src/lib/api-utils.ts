import { PostgrestError } from "@supabase/supabase-js";
import { createModuleLogger } from "./logger";

// ============================================================================
// LOGGER
// ============================================================================

const apiLogger = createModuleLogger("api");

// ============================================================================
// ERROR HANDLING
// ============================================================================

export class ApiError extends Error {
  code: string;
  details: string | null;
  hint: string | null;

  constructor(error: PostgrestError) {
    super(error.message);
    this.name = "ApiError";
    this.code = error.code;
    this.details = error.details;
    this.hint = error.hint;
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
      case "22P02": // invalid_text_representation
        return "Invalid data format provided.";
      default:
        return this.message || "An unexpected error occurred.";
    }
  }

  /**
   * Get structured error context for logging
   */
  toLogContext(): Record<string, unknown> {
    return {
      code: this.code,
      details: this.details,
      hint: this.hint,
      userMessage: this.userMessage,
    };
  }
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

