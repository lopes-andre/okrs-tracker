/**
 * Check-ins Hooks Unit Tests
 *
 * Tests for React Query hooks wrapping the check-ins API.
 * Uses renderHook with QueryClientProvider for testing.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { createCheckIn } from "@/test/factories";

// Mock the API module
vi.mock("./api", () => ({
  getCheckIns: vi.fn(),
  getCheckInsWithDetails: vi.fn(),
  getCheckInsByKr: vi.fn(),
  getRecentCheckIns: vi.fn(),
  getCheckInsPaginated: vi.fn(),
  getCheckInsByDay: vi.fn(),
  createCheckIn: vi.fn(),
  quickCheckIn: vi.fn(),
  updateCheckIn: vi.fn(),
}));

// Mock the toast hook
vi.mock("@/components/ui/use-toast", () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

// Import after mocking
import * as api from "./api";
import {
  useCheckIns,
  useCheckInsWithDetails,
  useCheckInsByKr,
  useRecentCheckIns,
  useCheckInsPaginated,
  useCheckInsByDay,
  useCreateCheckIn,
  useQuickCheckIn,
  useUpdateCheckIn,
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
// QUERY HOOKS TESTS
// ============================================================================

describe("Check-ins Query Hooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("useCheckIns", () => {
    it("should fetch check-ins for a plan", async () => {
      const mockCheckIns = [
        createCheckIn({ id: "ci-1", annual_kr_id: "kr-1" }),
        createCheckIn({ id: "ci-2", annual_kr_id: "kr-2" }),
      ];
      vi.mocked(api.getCheckIns).mockResolvedValue(mockCheckIns);

      const { result } = renderHook(() => useCheckIns("plan-123"), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockCheckIns);
      expect(api.getCheckIns).toHaveBeenCalledWith("plan-123", undefined);
    });

    it("should pass filters to API", async () => {
      vi.mocked(api.getCheckIns).mockResolvedValue([]);

      const filters = { annualKrId: "kr-123" };
      const { result } = renderHook(() => useCheckIns("plan-123", filters), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(api.getCheckIns).toHaveBeenCalledWith("plan-123", filters);
    });

    it("should not fetch when planId is empty", async () => {
      const { result } = renderHook(() => useCheckIns(""), {
        wrapper: createWrapper(),
      });

      expect(result.current.fetchStatus).toBe("idle");
      expect(api.getCheckIns).not.toHaveBeenCalled();
    });

    it("should handle error state", async () => {
      const error = new Error("Failed to fetch check-ins");
      vi.mocked(api.getCheckIns).mockRejectedValue(error);

      const { result } = renderHook(() => useCheckIns("plan-123"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBe(error);
    });
  });

  describe("useCheckInsWithDetails", () => {
    it("should fetch check-ins with details", async () => {
      const mockCheckIns = [
        { ...createCheckIn({ id: "ci-1" }), annual_kr: { name: "KR 1" } },
      ];
      vi.mocked(api.getCheckInsWithDetails).mockResolvedValue(mockCheckIns);

      const { result } = renderHook(() => useCheckInsWithDetails("plan-123"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockCheckIns);
      expect(api.getCheckInsWithDetails).toHaveBeenCalledWith("plan-123", undefined);
    });

    it("should not fetch when planId is empty", async () => {
      const { result } = renderHook(() => useCheckInsWithDetails(""), {
        wrapper: createWrapper(),
      });

      expect(result.current.fetchStatus).toBe("idle");
    });
  });

  describe("useCheckInsByKr", () => {
    it("should fetch check-ins for a specific KR", async () => {
      const mockCheckIns = [
        createCheckIn({ id: "ci-1", annual_kr_id: "kr-123" }),
        createCheckIn({ id: "ci-2", annual_kr_id: "kr-123" }),
      ];
      vi.mocked(api.getCheckInsByKr).mockResolvedValue(mockCheckIns);

      const { result } = renderHook(() => useCheckInsByKr("kr-123"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toHaveLength(2);
      expect(api.getCheckInsByKr).toHaveBeenCalledWith("kr-123");
    });

    it("should not fetch when annualKrId is empty", async () => {
      const { result } = renderHook(() => useCheckInsByKr(""), {
        wrapper: createWrapper(),
      });

      expect(result.current.fetchStatus).toBe("idle");
      expect(api.getCheckInsByKr).not.toHaveBeenCalled();
    });
  });

  describe("useRecentCheckIns", () => {
    it("should fetch recent check-ins", async () => {
      const mockCheckIns = [
        createCheckIn({ id: "ci-1" }),
        createCheckIn({ id: "ci-2" }),
      ];
      vi.mocked(api.getRecentCheckIns).mockResolvedValue(mockCheckIns);

      const { result } = renderHook(() => useRecentCheckIns("plan-123", 5), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(api.getRecentCheckIns).toHaveBeenCalledWith("plan-123", 5);
    });

    it("should use default limit of 10", async () => {
      vi.mocked(api.getRecentCheckIns).mockResolvedValue([]);

      const { result } = renderHook(() => useRecentCheckIns("plan-123"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(api.getRecentCheckIns).toHaveBeenCalledWith("plan-123", 10);
    });

    it("should not fetch when planId is empty", async () => {
      const { result } = renderHook(() => useRecentCheckIns(""), {
        wrapper: createWrapper(),
      });

      expect(result.current.fetchStatus).toBe("idle");
    });
  });

  describe("useCheckInsPaginated", () => {
    it("should fetch paginated check-ins", async () => {
      const mockResult = {
        checkIns: [createCheckIn({ id: "ci-1" })],
        total: 25,
        page: 2,
        limit: 10,
        totalPages: 3,
      };
      vi.mocked(api.getCheckInsPaginated).mockResolvedValue(mockResult);

      const { result } = renderHook(() => useCheckInsPaginated("plan-123", 2, 10), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.total).toBe(25);
      expect(result.current.data?.page).toBe(2);
      expect(api.getCheckInsPaginated).toHaveBeenCalledWith("plan-123", 2, 10, undefined);
    });

    it("should pass filters to API", async () => {
      const mockResult = { checkIns: [], total: 0, page: 1, limit: 20, totalPages: 0 };
      vi.mocked(api.getCheckInsPaginated).mockResolvedValue(mockResult);

      const filters = { annualKrId: "kr-123" };
      const { result } = renderHook(() => useCheckInsPaginated("plan-123", 1, 20, filters), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(api.getCheckInsPaginated).toHaveBeenCalledWith("plan-123", 1, 20, filters);
    });

    it("should not fetch when planId is empty", async () => {
      const { result } = renderHook(() => useCheckInsPaginated("", 1, 20), {
        wrapper: createWrapper(),
      });

      expect(result.current.fetchStatus).toBe("idle");
    });
  });

  describe("useCheckInsByDay", () => {
    it("should fetch check-ins grouped by day", async () => {
      const mockData = [
        { date: "2026-01-20", count: 5 },
        { date: "2026-01-21", count: 3 },
      ];
      vi.mocked(api.getCheckInsByDay).mockResolvedValue(mockData);

      const { result } = renderHook(() => useCheckInsByDay("plan-123"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toHaveLength(2);
      expect(api.getCheckInsByDay).toHaveBeenCalledWith("plan-123");
    });

    it("should not fetch when planId is empty", async () => {
      const { result } = renderHook(() => useCheckInsByDay(""), {
        wrapper: createWrapper(),
      });

      expect(result.current.fetchStatus).toBe("idle");
    });
  });
});

// ============================================================================
// MUTATION HOOKS TESTS
// ============================================================================

describe("Check-ins Mutation Hooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("useCreateCheckIn", () => {
    it("should create a check-in", async () => {
      const newCheckIn = createCheckIn({ id: "new-ci", annual_kr_id: "kr-123", value: 50 });
      vi.mocked(api.createCheckIn).mockResolvedValue(newCheckIn);

      const { result } = renderHook(() => useCreateCheckIn(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        annual_kr_id: "kr-123",
        value: 50,
        recorded_by: "user-123",
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(api.createCheckIn).toHaveBeenCalledWith({
        annual_kr_id: "kr-123",
        value: 50,
        recorded_by: "user-123",
      });
      expect(result.current.data).toEqual(newCheckIn);
    });

    it("should handle creation error", async () => {
      const error = new Error("Creation failed");
      vi.mocked(api.createCheckIn).mockRejectedValue(error);

      const { result } = renderHook(() => useCreateCheckIn(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        annual_kr_id: "kr-123",
        value: 50,
        recorded_by: "user-123",
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBe(error);
    });

    it("should support optional fields", async () => {
      const newCheckIn = createCheckIn({
        id: "new-ci",
        annual_kr_id: "kr-123",
        value: 75,
        note: "Great progress!",
        evidence_url: "https://example.com/evidence",
        quarter_target_id: "qt-123",
      });
      vi.mocked(api.createCheckIn).mockResolvedValue(newCheckIn);

      const { result } = renderHook(() => useCreateCheckIn(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        annual_kr_id: "kr-123",
        value: 75,
        note: "Great progress!",
        evidence_url: "https://example.com/evidence",
        quarter_target_id: "qt-123",
        recorded_by: "user-123",
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(api.createCheckIn).toHaveBeenCalledWith({
        annual_kr_id: "kr-123",
        value: 75,
        note: "Great progress!",
        evidence_url: "https://example.com/evidence",
        quarter_target_id: "qt-123",
        recorded_by: "user-123",
      });
    });
  });

  describe("useQuickCheckIn", () => {
    it("should create a quick check-in", async () => {
      const newCheckIn = createCheckIn({ id: "quick-ci", annual_kr_id: "kr-123", value: 60 });
      vi.mocked(api.quickCheckIn).mockResolvedValue(newCheckIn);

      const { result } = renderHook(() => useQuickCheckIn(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        annualKrId: "kr-123",
        value: 60,
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(api.quickCheckIn).toHaveBeenCalledWith("kr-123", 60, undefined, undefined, undefined);
    });

    it("should support optional note and evidence", async () => {
      const newCheckIn = createCheckIn({ id: "quick-ci", annual_kr_id: "kr-123", value: 80 });
      vi.mocked(api.quickCheckIn).mockResolvedValue(newCheckIn);

      const { result } = renderHook(() => useQuickCheckIn(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        annualKrId: "kr-123",
        value: 80,
        note: "Weekly update",
        evidenceUrl: "https://example.com/report",
        quarterTargetId: "qt-123",
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(api.quickCheckIn).toHaveBeenCalledWith(
        "kr-123",
        80,
        "Weekly update",
        "https://example.com/report",
        "qt-123"
      );
    });

    it("should handle error", async () => {
      const error = new Error("Quick check-in failed");
      vi.mocked(api.quickCheckIn).mockRejectedValue(error);

      const { result } = renderHook(() => useQuickCheckIn(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        annualKrId: "kr-123",
        value: 60,
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBe(error);
    });
  });

  describe("useUpdateCheckIn", () => {
    it("should update a check-in", async () => {
      const updatedCheckIn = createCheckIn({ id: "ci-123", value: 90, note: "Updated note" });
      vi.mocked(api.updateCheckIn).mockResolvedValue(updatedCheckIn);

      const { result } = renderHook(() => useUpdateCheckIn(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        checkInId: "ci-123",
        updates: { note: "Updated note" },
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(api.updateCheckIn).toHaveBeenCalledWith("ci-123", { note: "Updated note" });
    });

    it("should update value", async () => {
      const updatedCheckIn = createCheckIn({ id: "ci-123", value: 95 });
      vi.mocked(api.updateCheckIn).mockResolvedValue(updatedCheckIn);

      const { result } = renderHook(() => useUpdateCheckIn(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        checkInId: "ci-123",
        updates: { value: 95 },
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(api.updateCheckIn).toHaveBeenCalledWith("ci-123", { value: 95 });
    });

    it("should handle update error", async () => {
      const error = new Error("Update failed");
      vi.mocked(api.updateCheckIn).mockRejectedValue(error);

      const { result } = renderHook(() => useUpdateCheckIn(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        checkInId: "ci-123",
        updates: { note: "Updated note" },
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBe(error);
    });
  });
});
