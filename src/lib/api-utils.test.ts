/**
 * API Utilities Unit Tests
 *
 * Tests for error handling utilities, pagination helpers, and query wrappers.
 * These utilities are used throughout the features API layer.
 */

import { describe, it, expect } from "vitest";
import {
  ApiError,
  handleSupabaseError,
  handleSupabaseQuery,
  getPaginationRange,
  createPaginatedResult,
  type PaginatedResult,
} from "./api-utils";
import type { PostgrestError } from "@supabase/supabase-js";

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Create a mock Supabase query result
 */
function createMockQuery<T>(data: T | null, error: PostgrestError | null) {
  return Promise.resolve({ data, error });
}

/**
 * Create a mock Postgrest error
 */
function createPostgrestError(
  code: string,
  message: string,
  details: string | null = null,
  hint: string | null = null
): PostgrestError {
  return {
    code,
    message,
    details,
    hint,
  };
}

// ============================================================================
// API ERROR TESTS
// ============================================================================

describe("ApiError", () => {
  describe("constructor", () => {
    it("should set error properties from PostgrestError", () => {
      const pgError = createPostgrestError("23505", "duplicate key", "id exists", "use upsert");
      const apiError = new ApiError(pgError);

      expect(apiError.name).toBe("ApiError");
      expect(apiError.message).toBe("duplicate key");
      expect(apiError.code).toBe("23505");
      expect(apiError.details).toBe("id exists");
      expect(apiError.hint).toBe("use upsert");
    });

    it("should handle null details and hint", () => {
      const pgError = createPostgrestError("PGRST301", "RLS violation", null, null);
      const apiError = new ApiError(pgError);

      expect(apiError.details).toBeNull();
      expect(apiError.hint).toBeNull();
    });
  });

  describe("userMessage", () => {
    it("should return user-friendly message for unique_violation (23505)", () => {
      const pgError = createPostgrestError("23505", "unique_violation");
      const apiError = new ApiError(pgError);

      expect(apiError.userMessage).toBe("This item already exists.");
    });

    it("should return user-friendly message for foreign_key_violation (23503)", () => {
      const pgError = createPostgrestError("23503", "fk_violation");
      const apiError = new ApiError(pgError);

      expect(apiError.userMessage).toBe("Cannot delete this item because it is referenced by other data.");
    });

    it("should return user-friendly message for not_null_violation (23502)", () => {
      const pgError = createPostgrestError("23502", "null value in column");
      const apiError = new ApiError(pgError);

      expect(apiError.userMessage).toBe("Required field is missing.");
    });

    it("should return user-friendly message for insufficient_privilege (42501)", () => {
      const pgError = createPostgrestError("42501", "permission denied");
      const apiError = new ApiError(pgError);

      expect(apiError.userMessage).toBe("You don't have permission to perform this action.");
    });

    it("should return user-friendly message for RLS violation (PGRST301)", () => {
      const pgError = createPostgrestError("PGRST301", "new row violates rls");
      const apiError = new ApiError(pgError);

      expect(apiError.userMessage).toBe("You don't have access to this resource.");
    });

    it("should return user-friendly message for invalid_text_representation (22P02)", () => {
      const pgError = createPostgrestError("22P02", "invalid input syntax");
      const apiError = new ApiError(pgError);

      expect(apiError.userMessage).toBe("Invalid data format provided.");
    });

    it("should return original message for unknown error codes", () => {
      const pgError = createPostgrestError("UNKNOWN", "Something went wrong");
      const apiError = new ApiError(pgError);

      expect(apiError.userMessage).toBe("Something went wrong");
    });

    it("should return default message for empty original message", () => {
      const pgError = createPostgrestError("UNKNOWN", "");
      const apiError = new ApiError(pgError);

      expect(apiError.userMessage).toBe("An unexpected error occurred.");
    });
  });

  describe("error inheritance", () => {
    it("should be an instance of Error", () => {
      const pgError = createPostgrestError("23505", "test");
      const apiError = new ApiError(pgError);

      expect(apiError).toBeInstanceOf(Error);
      expect(apiError).toBeInstanceOf(ApiError);
    });

    it("should have a stack trace", () => {
      const pgError = createPostgrestError("23505", "test");
      const apiError = new ApiError(pgError);

      expect(apiError.stack).toBeDefined();
    });
  });
});

// ============================================================================
// HANDLE SUPABASE ERROR TESTS
// ============================================================================

describe("handleSupabaseError", () => {
  describe("successful queries", () => {
    it("should return data when query succeeds", async () => {
      const data = { id: "123", name: "Test" };
      const query = createMockQuery(data, null);

      const result = await handleSupabaseError(query);

      expect(result).toEqual(data);
    });

    it("should return array data when query succeeds", async () => {
      const data = [{ id: "1" }, { id: "2" }];
      const query = createMockQuery(data, null);

      const result = await handleSupabaseError(query);

      expect(result).toEqual(data);
    });

    it("should return empty array when query returns empty array", async () => {
      const data: never[] = [];
      const query = createMockQuery(data, null);

      const result = await handleSupabaseError(query);

      expect(result).toEqual([]);
    });
  });

  describe("error handling", () => {
    it("should throw ApiError when query has error", async () => {
      const error = createPostgrestError("23505", "duplicate key");
      const query = createMockQuery(null, error);

      await expect(handleSupabaseError(query)).rejects.toThrow(ApiError);
    });

    it("should throw ApiError with correct properties", async () => {
      const error = createPostgrestError("23505", "duplicate key", "id conflict", null);
      const query = createMockQuery(null, error);

      try {
        await handleSupabaseError(query);
        expect.fail("Should have thrown");
      } catch (e) {
        const apiError = e as ApiError;
        expect(apiError.code).toBe("23505");
        expect(apiError.message).toBe("duplicate key");
        expect(apiError.details).toBe("id conflict");
      }
    });

    it("should throw Error when data is null", async () => {
      const query = createMockQuery(null, null);

      await expect(handleSupabaseError(query)).rejects.toThrow("No data returned");
    });
  });

  describe("type safety", () => {
    it("should infer correct return type from query", async () => {
      interface Task {
        id: string;
        title: string;
      }

      const data: Task = { id: "1", title: "Test Task" };
      const query = createMockQuery(data, null);

      const result = await handleSupabaseError<Task>(query);

      expect(result.id).toBe("1");
      expect(result.title).toBe("Test Task");
    });
  });
});

// ============================================================================
// HANDLE SUPABASE QUERY TESTS
// ============================================================================

describe("handleSupabaseQuery", () => {
  describe("successful queries", () => {
    it("should return data when query succeeds", async () => {
      const data = { id: "123", name: "Test" };
      const query = createMockQuery(data, null);

      const result = await handleSupabaseQuery(query);

      expect(result).toEqual(data);
    });

    it("should return null when data is null (no error)", async () => {
      const query = createMockQuery(null, null);

      const result = await handleSupabaseQuery(query);

      expect(result).toBeNull();
    });
  });

  describe("error handling", () => {
    it("should throw ApiError when query has error", async () => {
      const error = createPostgrestError("42501", "permission denied");
      const query = createMockQuery(null, error);

      await expect(handleSupabaseQuery(query)).rejects.toThrow(ApiError);
    });
  });

  describe("nullable return type", () => {
    it("should allow null in return type for single item fetches", async () => {
      interface Item {
        id: string;
      }

      // Case 1: Item found
      const foundQuery = createMockQuery<Item>({ id: "1" }, null);
      const found = await handleSupabaseQuery(foundQuery);
      expect(found).not.toBeNull();

      // Case 2: Item not found
      const notFoundQuery = createMockQuery<Item>(null, null);
      const notFound = await handleSupabaseQuery(notFoundQuery);
      expect(notFound).toBeNull();
    });
  });
});

// ============================================================================
// PAGINATION HELPER TESTS
// ============================================================================

describe("getPaginationRange", () => {
  describe("basic pagination", () => {
    it("should return correct range for page 1", () => {
      const { from, to } = getPaginationRange(1, 10);

      expect(from).toBe(0);
      expect(to).toBe(9);
    });

    it("should return correct range for page 2", () => {
      const { from, to } = getPaginationRange(2, 10);

      expect(from).toBe(10);
      expect(to).toBe(19);
    });

    it("should return correct range for page 3", () => {
      const { from, to } = getPaginationRange(3, 10);

      expect(from).toBe(20);
      expect(to).toBe(29);
    });
  });

  describe("different page sizes", () => {
    it("should handle page size of 5", () => {
      const { from, to } = getPaginationRange(2, 5);

      expect(from).toBe(5);
      expect(to).toBe(9);
    });

    it("should handle page size of 20", () => {
      const { from, to } = getPaginationRange(1, 20);

      expect(from).toBe(0);
      expect(to).toBe(19);
    });

    it("should handle page size of 1", () => {
      const { from, to } = getPaginationRange(5, 1);

      expect(from).toBe(4);
      expect(to).toBe(4);
    });
  });

  describe("edge cases", () => {
    it("should handle large page numbers", () => {
      const { from, to } = getPaginationRange(100, 10);

      expect(from).toBe(990);
      expect(to).toBe(999);
    });

    it("should handle page 0 (invalid but calculable)", () => {
      const { from, to } = getPaginationRange(0, 10);

      expect(from).toBe(-10);
      expect(to).toBe(-1);
    });
  });
});

describe("createPaginatedResult", () => {
  describe("basic pagination", () => {
    it("should create correct paginated result for first page", () => {
      const data = [{ id: "1" }, { id: "2" }];
      const result = createPaginatedResult(data, 50, 1, 10);

      expect(result.data).toEqual(data);
      expect(result.count).toBe(50);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.totalPages).toBe(5);
      expect(result.hasMore).toBe(true);
    });

    it("should create correct paginated result for last page", () => {
      const data = [{ id: "1" }];
      const result = createPaginatedResult(data, 21, 3, 10);

      expect(result.page).toBe(3);
      expect(result.totalPages).toBe(3);
      expect(result.hasMore).toBe(false);
    });

    it("should create correct paginated result for middle page", () => {
      const data = Array(10).fill({ id: "x" });
      const result = createPaginatedResult(data, 100, 5, 10);

      expect(result.page).toBe(5);
      expect(result.totalPages).toBe(10);
      expect(result.hasMore).toBe(true);
    });
  });

  describe("totalPages calculation", () => {
    it("should round up for partial pages", () => {
      const data = [{ id: "1" }];
      const result = createPaginatedResult(data, 15, 1, 10);

      expect(result.totalPages).toBe(2); // ceil(15/10) = 2
    });

    it("should handle exact page count", () => {
      const data = [{ id: "1" }];
      const result = createPaginatedResult(data, 30, 1, 10);

      expect(result.totalPages).toBe(3); // ceil(30/10) = 3
    });

    it("should handle single page", () => {
      const data = [{ id: "1" }, { id: "2" }];
      const result = createPaginatedResult(data, 2, 1, 10);

      expect(result.totalPages).toBe(1);
      expect(result.hasMore).toBe(false);
    });
  });

  describe("hasMore logic", () => {
    it("should return true when page < totalPages", () => {
      const result = createPaginatedResult([], 100, 5, 10);
      expect(result.hasMore).toBe(true);
    });

    it("should return false when page === totalPages", () => {
      const result = createPaginatedResult([], 100, 10, 10);
      expect(result.hasMore).toBe(false);
    });

    it("should return false when page > totalPages", () => {
      const result = createPaginatedResult([], 100, 15, 10);
      expect(result.hasMore).toBe(false);
    });
  });

  describe("edge cases", () => {
    it("should handle empty data", () => {
      const result = createPaginatedResult([], 0, 1, 10);

      expect(result.data).toEqual([]);
      expect(result.count).toBe(0);
      expect(result.totalPages).toBe(0);
      expect(result.hasMore).toBe(false);
    });

    it("should handle count of 1", () => {
      const result = createPaginatedResult([{ id: "1" }], 1, 1, 10);

      expect(result.count).toBe(1);
      expect(result.totalPages).toBe(1);
      expect(result.hasMore).toBe(false);
    });

    it("should preserve data order", () => {
      const data = [{ id: "a" }, { id: "b" }, { id: "c" }];
      const result = createPaginatedResult(data, 3, 1, 10);

      expect(result.data[0].id).toBe("a");
      expect(result.data[1].id).toBe("b");
      expect(result.data[2].id).toBe("c");
    });
  });

  describe("type safety", () => {
    it("should preserve generic type in result", () => {
      interface Task {
        id: string;
        title: string;
      }

      const data: Task[] = [{ id: "1", title: "Task 1" }];
      const result: PaginatedResult<Task> = createPaginatedResult(data, 1, 1, 10);

      expect(result.data[0].title).toBe("Task 1");
    });
  });
});

// ============================================================================
// INTEGRATION SCENARIOS
// ============================================================================

describe("Integration Scenarios", () => {
  describe("paginated query workflow", () => {
    it("should correctly handle pagination + error handling", async () => {
      // Simulate a paginated API call
      const page = 2;
      const limit = 10;
      const { from, to } = getPaginationRange(page, limit);

      // Verify range
      expect(from).toBe(10);
      expect(to).toBe(19);

      // Simulate successful query
      const data = Array(10)
        .fill(null)
        .map((_, i) => ({ id: String(10 + i) }));
      const query = createMockQuery({ data, count: 45 }, null);
      const queryResult = await handleSupabaseQuery(query);

      expect(queryResult).not.toBeNull();

      // Create paginated result
      const result = createPaginatedResult(
        queryResult!.data,
        queryResult!.count,
        page,
        limit
      );

      expect(result.page).toBe(2);
      expect(result.totalPages).toBe(5);
      expect(result.hasMore).toBe(true);
    });
  });

  describe("error recovery workflow", () => {
    it("should allow catching and handling ApiError", async () => {
      const error = createPostgrestError("23505", "duplicate");
      const query = createMockQuery(null, error);

      let caught = false;
      let userMessage = "";

      try {
        await handleSupabaseError(query);
      } catch (e) {
        if (e instanceof ApiError) {
          caught = true;
          userMessage = e.userMessage;
        }
      }

      expect(caught).toBe(true);
      expect(userMessage).toBe("This item already exists.");
    });
  });
});
