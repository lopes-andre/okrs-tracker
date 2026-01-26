/**
 * Supabase Client Mock
 *
 * A mock implementation of the Supabase client for unit testing.
 * Allows you to define expected query results and track what queries were made.
 *
 * Usage:
 *   const { mockSupabase, setMockData, getMockCalls } = createMockSupabase();
 *   vi.mock("@/lib/supabase/untyped-client", () => ({
 *     createUntypedClient: () => mockSupabase,
 *   }));
 *
 *   setMockData("plans", [createPlan()]);
 *   const result = await getPlans();
 *   expect(getMockCalls("plans")).toHaveLength(1);
 */

import { vi } from "vitest";

// ============================================================================
// TYPES
// ============================================================================

interface MockQueryState {
  table: string;
  filters: Array<{ column: string; value: unknown; operator: string }>;
  selects: string[];
  orders: Array<{ column: string; ascending: boolean }>;
  limits: { from?: number; to?: number; count?: number };
  single: boolean;
}

interface MockCallRecord {
  table: string;
  method: string;
  args: unknown[];
  timestamp: number;
}

// ============================================================================
// MOCK SUPABASE FACTORY
// ============================================================================

export function createMockSupabase() {
  // Storage for mock data by table
  const mockData: Record<string, unknown[]> = {};

  // Storage for mock errors by table
  const mockErrors: Record<string, Error | null> = {};

  // Storage for RPC results
  const mockRpcResults: Record<string, unknown> = {};

  // Storage for RPC errors
  const mockRpcErrors: Record<string, Error | null> = {};

  // Record of all calls made
  const mockCalls: MockCallRecord[] = [];

  // Helper to set mock data for a table
  function setMockData(table: string, data: unknown[]) {
    mockData[table] = data;
  }

  // Helper to set mock error for a table
  function setMockError(table: string, error: Error | null) {
    mockErrors[table] = error;
  }

  // Helper to set mock RPC result
  function setMockRpcResult(fnName: string, result: unknown) {
    mockRpcResults[fnName] = result;
  }

  // Helper to set mock RPC error
  function setMockRpcError(fnName: string, error: Error | null) {
    mockRpcErrors[fnName] = error;
  }

  // Helper to get all calls for a table
  function getMockCalls(table?: string) {
    if (table) {
      return mockCalls.filter((c) => c.table === table);
    }
    return mockCalls;
  }

  // Helper to clear all mock data and calls
  function clearMocks() {
    Object.keys(mockData).forEach((key) => delete mockData[key]);
    Object.keys(mockErrors).forEach((key) => delete mockErrors[key]);
    Object.keys(mockRpcResults).forEach((key) => delete mockRpcResults[key]);
    Object.keys(mockRpcErrors).forEach((key) => delete mockRpcErrors[key]);
    mockCalls.length = 0;
  }

  // Create query builder that tracks calls and returns mock data
  function createQueryBuilder(table: string): MockQueryBuilder {
    const state: MockQueryState = {
      table,
      filters: [],
      selects: [],
      orders: [],
      limits: {},
      single: false,
    };

    const recordCall = (method: string, args: unknown[]) => {
      mockCalls.push({
        table,
        method,
        args,
        timestamp: Date.now(),
      });
    };

    const executeQuery = async () => {
      const error = mockErrors[table];
      if (error) {
        return { data: null, error, count: null };
      }

      let data = mockData[table] || [];

      // Apply filters
      state.filters.forEach((filter) => {
        data = data.filter((item) => {
          const record = item as Record<string, unknown>;
          const value = record[filter.column];

          switch (filter.operator) {
            case "eq":
              return value === filter.value;
            case "neq":
              return value !== filter.value;
            case "gt":
              return (value as number) > (filter.value as number);
            case "gte":
              return (value as number) >= (filter.value as number);
            case "lt":
              return (value as number) < (filter.value as number);
            case "lte":
              return (value as number) <= (filter.value as number);
            case "in":
              return (filter.value as unknown[]).includes(value);
            case "is":
              return value === filter.value;
            case "ilike":
              return String(value)
                .toLowerCase()
                .includes(String(filter.value).toLowerCase().replace(/%/g, ""));
            default:
              return true;
          }
        });
      });

      // Apply ordering
      if (state.orders.length > 0) {
        data = [...data].sort((a, b) => {
          for (const order of state.orders) {
            const aVal = (a as Record<string, unknown>)[order.column] as string | number | null;
            const bVal = (b as Record<string, unknown>)[order.column] as string | number | null;
            if (aVal == null && bVal == null) continue;
            if (aVal == null) return order.ascending ? 1 : -1;
            if (bVal == null) return order.ascending ? -1 : 1;
            if (aVal < bVal) return order.ascending ? -1 : 1;
            if (aVal > bVal) return order.ascending ? 1 : -1;
          }
          return 0;
        });
      }

      // Apply limits
      if (state.limits.from !== undefined && state.limits.to !== undefined) {
        data = data.slice(state.limits.from, state.limits.to + 1);
      } else if (state.limits.count !== undefined) {
        data = data.slice(0, state.limits.count);
      }

      // Return single or array
      if (state.single) {
        return {
          data: data.length > 0 ? data[0] : null,
          error: null,
          count: data.length,
        };
      }

      return { data, error: null, count: data.length };
    };

    const builder: MockQueryBuilder = {
      select: (columns = "*") => {
        recordCall("select", [columns]);
        state.selects = columns === "*" ? [] : columns.split(",").map((c) => c.trim());
        return builder;
      },
      insert: (values) => {
        recordCall("insert", [values]);
        // Add to mock data
        const toInsert = Array.isArray(values) ? values : [values];
        mockData[table] = [...(mockData[table] || []), ...toInsert];
        return builder;
      },
      update: (values: Record<string, unknown>) => {
        recordCall("update", [values]);
        // Update matching items in mock data
        if (mockData[table]) {
          mockData[table] = mockData[table].map((item) => {
            const record = item as Record<string, unknown>;
            const matches = state.filters.every((filter) => {
              const value = record[filter.column];
              return filter.operator === "eq" && value === filter.value;
            });
            if (matches) {
              return { ...record, ...values };
            }
            return item;
          });
        }
        return builder;
      },
      upsert: (values) => {
        recordCall("upsert", [values]);
        const toUpsert = Array.isArray(values) ? values : [values];
        mockData[table] = [...(mockData[table] || []), ...toUpsert];
        return builder;
      },
      delete: () => {
        recordCall("delete", []);
        // Remove matching items from mock data
        if (mockData[table]) {
          mockData[table] = mockData[table].filter((item) => {
            const record = item as Record<string, unknown>;
            return !state.filters.every((filter) => {
              const value = record[filter.column];
              return filter.operator === "eq" && value === filter.value;
            });
          });
        }
        return builder;
      },
      eq: (column, value) => {
        recordCall("eq", [column, value]);
        state.filters.push({ column, value, operator: "eq" });
        return builder;
      },
      neq: (column, value) => {
        recordCall("neq", [column, value]);
        state.filters.push({ column, value, operator: "neq" });
        return builder;
      },
      gt: (column, value) => {
        recordCall("gt", [column, value]);
        state.filters.push({ column, value, operator: "gt" });
        return builder;
      },
      gte: (column, value) => {
        recordCall("gte", [column, value]);
        state.filters.push({ column, value, operator: "gte" });
        return builder;
      },
      lt: (column, value) => {
        recordCall("lt", [column, value]);
        state.filters.push({ column, value, operator: "lt" });
        return builder;
      },
      lte: (column, value) => {
        recordCall("lte", [column, value]);
        state.filters.push({ column, value, operator: "lte" });
        return builder;
      },
      in: (column, values) => {
        recordCall("in", [column, values]);
        state.filters.push({ column, value: values, operator: "in" });
        return builder;
      },
      is: (column, value) => {
        recordCall("is", [column, value]);
        state.filters.push({ column, value, operator: "is" });
        return builder;
      },
      ilike: (column, pattern) => {
        recordCall("ilike", [column, pattern]);
        state.filters.push({ column, value: pattern, operator: "ilike" });
        return builder;
      },
      order: (column, options = { ascending: true }) => {
        recordCall("order", [column, options]);
        state.orders.push({ column, ascending: options.ascending ?? true });
        return builder;
      },
      limit: (count) => {
        recordCall("limit", [count]);
        state.limits.count = count;
        return builder;
      },
      range: (from, to) => {
        recordCall("range", [from, to]);
        state.limits.from = from;
        state.limits.to = to;
        return builder;
      },
      single: () => {
        recordCall("single", []);
        state.single = true;
        return builder;
      },
      maybeSingle: () => {
        recordCall("maybeSingle", []);
        state.single = true;
        return builder;
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      then: (resolve: any) => {
        return executeQuery().then(resolve);
      },
    };

    return builder;
  }

  // The mock Supabase client
  const mockSupabase = {
    from: (table: string) => createQueryBuilder(table),
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: "test-user-id", email: "test@example.com" } },
        error: null,
      }),
      getSession: vi.fn().mockResolvedValue({
        data: { session: { user: { id: "test-user-id" } } },
        error: null,
      }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
    storage: {
      from: vi.fn().mockReturnValue({
        upload: vi.fn().mockResolvedValue({ data: { path: "test/path" }, error: null }),
        download: vi.fn().mockResolvedValue({ data: new Blob(), error: null }),
        remove: vi.fn().mockResolvedValue({ data: [], error: null }),
        list: vi.fn().mockResolvedValue({ data: [], error: null }),
        getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: "https://example.com/file" } }),
      }),
    },
    rpc: vi.fn().mockImplementation((fnName: string) => {
      return {
        then: (resolve: (result: { data: unknown; error: Error | null }) => void) => {
          const error = mockRpcErrors[fnName];
          if (error) {
            resolve({ data: null, error });
          } else {
            const data = mockRpcResults[fnName] ?? null;
            resolve({ data, error: null });
          }
        },
      };
    }),
  };

  return {
    mockSupabase,
    setMockData,
    setMockError,
    setMockRpcResult,
    setMockRpcError,
    getMockCalls,
    clearMocks,
  };
}

// ============================================================================
// QUERY BUILDER INTERFACE
// ============================================================================

interface MockQueryBuilder {
  select: (columns?: string) => MockQueryBuilder;
  insert: (values: unknown) => MockQueryBuilder;
  update: (values: Record<string, unknown>) => MockQueryBuilder;
  upsert: (values: unknown) => MockQueryBuilder;
  delete: () => MockQueryBuilder;
  eq: (column: string, value: unknown) => MockQueryBuilder;
  neq: (column: string, value: unknown) => MockQueryBuilder;
  gt: (column: string, value: unknown) => MockQueryBuilder;
  gte: (column: string, value: unknown) => MockQueryBuilder;
  lt: (column: string, value: unknown) => MockQueryBuilder;
  lte: (column: string, value: unknown) => MockQueryBuilder;
  in: (column: string, values: unknown[]) => MockQueryBuilder;
  is: (column: string, value: unknown) => MockQueryBuilder;
  ilike: (column: string, pattern: string) => MockQueryBuilder;
  order: (column: string, options?: { ascending?: boolean }) => MockQueryBuilder;
  limit: (count: number) => MockQueryBuilder;
  range: (from: number, to: number) => MockQueryBuilder;
  single: () => MockQueryBuilder;
  maybeSingle: () => MockQueryBuilder;
  then: <T>(
    resolve: (result: { data: T | null; error: Error | null; count: number | null }) => void
  ) => Promise<void>;
}

// ============================================================================
// MOCK USAGE EXAMPLE
// ============================================================================

/**
 * To use this mock in tests, you need to use vi.hoisted() and vi.mock() at the
 * top level of your test file. Example:
 *
 * ```typescript
 * import { createMockSupabase } from "@/test/mocks/supabase";
 *
 * const { mockRef } = vi.hoisted(() => ({
 *   mockRef: { current: null as ReturnType<typeof createMockSupabase> | null },
 * }));
 *
 * vi.mock("@/lib/supabase/untyped-client", () => ({
 *   createUntypedClient: () => mockRef.current?.mockSupabase,
 * }));
 *
 * describe("MyTests", () => {
 *   beforeEach(() => {
 *     mockRef.current = createMockSupabase();
 *   });
 * });
 * ```
 */
