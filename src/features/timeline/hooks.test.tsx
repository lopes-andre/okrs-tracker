/**
 * Timeline Hooks Unit Tests
 *
 * Tests for React Query hooks wrapping the timeline API.
 * Uses renderHook with QueryClientProvider for testing.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { createActivityEvent } from "@/test/factories";

// Mock the API module
vi.mock("./api", () => ({
  getTimeline: vi.fn(),
  getRecentActivity: vi.fn(),
  getTimelinePaginated: vi.fn(),
  getEntityActivity: vi.fn(),
  getActivityByDate: vi.fn(),
  getActivityStats: vi.fn(),
}));

// Import after mocking
import * as api from "./api";
import {
  useTimeline,
  useRecentActivity,
  useTimelinePaginated,
  useEntityActivity,
  useActivityByDate,
  useActivityStats,
} from "./hooks";

// ============================================================================
// TEST UTILITIES
// ============================================================================

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

function createWrapper() {
  const queryClient = createTestQueryClient();
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  };
}

// ============================================================================
// TIMELINE QUERY HOOKS TESTS
// ============================================================================

describe("Timeline Hooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("useTimeline", () => {
    it("should fetch timeline events for a plan", async () => {
      const mockEvents = [
        createActivityEvent({ id: "event-1", event_type: "created" }),
        createActivityEvent({ id: "event-2", event_type: "updated" }),
      ];
      vi.mocked(api.getTimeline).mockResolvedValue(mockEvents);

      const { result } = renderHook(() => useTimeline("plan-123"), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockEvents);
      expect(api.getTimeline).toHaveBeenCalledWith("plan-123", undefined);
    });

    it("should pass filters to API", async () => {
      vi.mocked(api.getTimeline).mockResolvedValue([]);

      const filters = { entityType: "task" as const };
      const { result } = renderHook(() => useTimeline("plan-123", filters), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(api.getTimeline).toHaveBeenCalledWith("plan-123", filters);
    });

    it("should not fetch when planId is empty", async () => {
      const { result } = renderHook(() => useTimeline(""), {
        wrapper: createWrapper(),
      });

      expect(result.current.fetchStatus).toBe("idle");
      expect(api.getTimeline).not.toHaveBeenCalled();
    });

    it("should handle error state", async () => {
      const error = new Error("Failed to fetch timeline");
      vi.mocked(api.getTimeline).mockRejectedValue(error);

      const { result } = renderHook(() => useTimeline("plan-123"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBe(error);
    });
  });

  describe("useRecentActivity", () => {
    it("should fetch recent activity", async () => {
      const mockEvents = [
        createActivityEvent({ id: "event-1" }),
        createActivityEvent({ id: "event-2" }),
      ];
      vi.mocked(api.getRecentActivity).mockResolvedValue(mockEvents);

      const { result } = renderHook(() => useRecentActivity("plan-123", 10), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(api.getRecentActivity).toHaveBeenCalledWith("plan-123", 10);
    });

    it("should use default limit of 20", async () => {
      vi.mocked(api.getRecentActivity).mockResolvedValue([]);

      const { result } = renderHook(() => useRecentActivity("plan-123"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(api.getRecentActivity).toHaveBeenCalledWith("plan-123", 20);
    });

    it("should not fetch when planId is empty", async () => {
      const { result } = renderHook(() => useRecentActivity(""), {
        wrapper: createWrapper(),
      });

      expect(result.current.fetchStatus).toBe("idle");
    });
  });

  describe("useTimelinePaginated", () => {
    it("should fetch paginated timeline", async () => {
      const mockResult = {
        events: [createActivityEvent({ id: "event-1" })],
        total: 50,
        page: 2,
        limit: 20,
        totalPages: 3,
      };
      vi.mocked(api.getTimelinePaginated).mockResolvedValue(mockResult);

      const { result } = renderHook(() => useTimelinePaginated("plan-123", 2, 20), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.total).toBe(50);
      expect(result.current.data?.page).toBe(2);
      expect(api.getTimelinePaginated).toHaveBeenCalledWith("plan-123", 2, 20, undefined);
    });

    it("should pass filters to API", async () => {
      const mockResult = { events: [], total: 0, page: 1, limit: 20, totalPages: 0 };
      vi.mocked(api.getTimelinePaginated).mockResolvedValue(mockResult);

      const filters = { eventType: "created" as const };
      const { result } = renderHook(() => useTimelinePaginated("plan-123", 1, 20, filters), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(api.getTimelinePaginated).toHaveBeenCalledWith("plan-123", 1, 20, filters);
    });

    it("should not fetch when planId is empty", async () => {
      const { result } = renderHook(() => useTimelinePaginated("", 1, 20), {
        wrapper: createWrapper(),
      });

      expect(result.current.fetchStatus).toBe("idle");
    });
  });

  describe("useEntityActivity", () => {
    it("should fetch activity for a specific entity", async () => {
      const mockEvents = [
        createActivityEvent({ id: "event-1", entity_type: "task", entity_id: "task-123" }),
      ];
      vi.mocked(api.getEntityActivity).mockResolvedValue(mockEvents);

      const { result } = renderHook(
        () => useEntityActivity("plan-123", "task", "task-123"),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(api.getEntityActivity).toHaveBeenCalledWith("plan-123", "task", "task-123");
    });

    it("should not fetch when planId is empty", async () => {
      const { result } = renderHook(
        () => useEntityActivity("", "task", "task-123"),
        { wrapper: createWrapper() }
      );

      expect(result.current.fetchStatus).toBe("idle");
    });

    it("should not fetch when entityType is empty", async () => {
      const { result } = renderHook(
        () => useEntityActivity("plan-123", "", "task-123"),
        { wrapper: createWrapper() }
      );

      expect(result.current.fetchStatus).toBe("idle");
    });

    it("should not fetch when entityId is empty", async () => {
      const { result } = renderHook(
        () => useEntityActivity("plan-123", "task", ""),
        { wrapper: createWrapper() }
      );

      expect(result.current.fetchStatus).toBe("idle");
    });
  });

  describe("useActivityByDate", () => {
    it("should fetch activity grouped by date", async () => {
      const mockData = [
        { date: "2026-01-20", count: 5, events: [] },
        { date: "2026-01-21", count: 3, events: [] },
      ];
      vi.mocked(api.getActivityByDate).mockResolvedValue(mockData);

      const { result } = renderHook(
        () => useActivityByDate("plan-123", "2026-01-01", "2026-01-31"),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(api.getActivityByDate).toHaveBeenCalledWith("plan-123", "2026-01-01", "2026-01-31");
    });

    it("should fetch without date range", async () => {
      vi.mocked(api.getActivityByDate).mockResolvedValue([]);

      const { result } = renderHook(
        () => useActivityByDate("plan-123"),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(api.getActivityByDate).toHaveBeenCalledWith("plan-123", undefined, undefined);
    });

    it("should not fetch when planId is empty", async () => {
      const { result } = renderHook(
        () => useActivityByDate(""),
        { wrapper: createWrapper() }
      );

      expect(result.current.fetchStatus).toBe("idle");
    });
  });

  describe("useActivityStats", () => {
    it("should fetch activity statistics", async () => {
      const mockStats = {
        totalEvents: 100,
        eventsByType: { created: 40, updated: 35, deleted: 25 },
        eventsByEntity: { task: 60, check_in: 30, objective: 10 },
        mostActiveDay: "2026-01-15",
      };
      vi.mocked(api.getActivityStats).mockResolvedValue(mockStats);

      const { result } = renderHook(
        () => useActivityStats("plan-123", "2026-01-01", "2026-01-31"),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.totalEvents).toBe(100);
      expect(api.getActivityStats).toHaveBeenCalledWith("plan-123", "2026-01-01", "2026-01-31");
    });

    it("should fetch stats without date range", async () => {
      vi.mocked(api.getActivityStats).mockResolvedValue({ totalEvents: 0 });

      const { result } = renderHook(
        () => useActivityStats("plan-123"),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(api.getActivityStats).toHaveBeenCalledWith("plan-123", undefined, undefined);
    });

    it("should not fetch when planId is empty", async () => {
      const { result } = renderHook(
        () => useActivityStats(""),
        { wrapper: createWrapper() }
      );

      expect(result.current.fetchStatus).toBe("idle");
    });
  });
});
