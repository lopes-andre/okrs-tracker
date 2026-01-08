import { PostgrestError } from "@supabase/supabase-js";

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
}

// Wrapper to handle Supabase errors consistently
export async function handleSupabaseError<T>(
  promise: Promise<{ data: T | null; error: PostgrestError | null }>
): Promise<T> {
  const { data, error } = await promise;

  if (error) {
    throw new ApiError(error);
  }

  if (data === null) {
    throw new Error("No data returned");
  }

  return data;
}

// For queries that can return null (single item fetch)
export async function handleSupabaseQuery<T>(
  promise: Promise<{ data: T | null; error: PostgrestError | null }>
): Promise<T | null> {
  const { data, error } = await promise;

  if (error) {
    throw new ApiError(error);
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

// ============================================================================
// FILTER HELPERS
// ============================================================================

// Build a date range filter for Supabase queries
export function buildDateFilter(
  dateFrom?: string,
  dateTo?: string
): { from: string; to: string } | null {
  if (!dateFrom && !dateTo) return null;

  const now = new Date();
  return {
    from: dateFrom || "1970-01-01",
    to: dateTo || now.toISOString(),
  };
}

// Convert an array to a Supabase "in" filter string
export function toInFilter<T>(values: T | T[] | undefined): T[] | undefined {
  if (!values) return undefined;
  return Array.isArray(values) ? values : [values];
}

// ============================================================================
// SORT HELPERS
// ============================================================================

export type SortDirection = "asc" | "desc";

export interface SortOption {
  column: string;
  ascending: boolean;
  nullsFirst?: boolean;
}

export function parseSortParams(
  sortBy?: string,
  sortOrder?: SortDirection
): SortOption | null {
  if (!sortBy) return null;
  return {
    column: sortBy,
    ascending: sortOrder !== "desc",
  };
}

// ============================================================================
// QUERY HELPERS
// ============================================================================

// Get current quarter (1-4)
export function getCurrentQuarter(): 1 | 2 | 3 | 4 {
  const month = new Date().getMonth();
  return (Math.floor(month / 3) + 1) as 1 | 2 | 3 | 4;
}

// Get quarter date range
export function getQuarterDateRange(year: number, quarter: 1 | 2 | 3 | 4): { start: Date; end: Date } {
  const startMonth = (quarter - 1) * 3;
  const start = new Date(year, startMonth, 1);
  const end = new Date(year, startMonth + 3, 0, 23, 59, 59);
  return { start, end };
}

// Calculate progress percentage
export function calculateProgress(current: number, target: number, start: number = 0): number {
  const range = target - start;
  if (range === 0) return current >= target ? 100 : 0;
  const progress = ((current - start) / range) * 100;
  return Math.min(Math.max(progress, 0), 100);
}

// Calculate pace (where you should be by now)
export function calculatePace(
  startDate: Date,
  endDate: Date,
  targetValue: number,
  startValue: number = 0
): number {
  const now = new Date();
  const totalDuration = endDate.getTime() - startDate.getTime();
  const elapsed = now.getTime() - startDate.getTime();
  
  if (elapsed <= 0) return startValue;
  if (elapsed >= totalDuration) return targetValue;
  
  const progress = elapsed / totalDuration;
  return startValue + (targetValue - startValue) * progress;
}

// ============================================================================
// OPTIMISTIC UPDATE HELPERS
// ============================================================================

export function optimisticUpdate<T extends { id: string }>(
  items: T[],
  id: string,
  updates: Partial<T>
): T[] {
  return items.map((item) =>
    item.id === id ? { ...item, ...updates } : item
  );
}

export function optimisticAdd<T>(items: T[], newItem: T): T[] {
  return [...items, newItem];
}

export function optimisticRemove<T extends { id: string }>(
  items: T[],
  id: string
): T[] {
  return items.filter((item) => item.id !== id);
}
