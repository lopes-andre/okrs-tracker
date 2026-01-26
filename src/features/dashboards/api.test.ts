/**
 * Dashboards API Unit Tests
 *
 * Tests for dashboard and widget CRUD operations.
 * Uses the mock Supabase client to verify query construction and data handling.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createMockSupabase } from "@/test/mocks/supabase";

// Use vi.hoisted to create a variable that exists at the hoisted scope
const { mockRef, mockUserRef } = vi.hoisted(() => ({
  mockRef: { current: null as ReturnType<typeof createMockSupabase> | null },
  mockUserRef: { current: { id: "user-123", email: "test@example.com" } as { id: string; email: string } | null },
}));

// Mock the Supabase client
vi.mock("@/lib/supabase/untyped-client", () => ({
  createUntypedClient: () => ({
    ...mockRef.current?.mockSupabase,
    auth: {
      getUser: () => Promise.resolve({
        data: { user: mockUserRef.current },
        error: null
      }),
    },
  }),
}));

// Import API functions after mocking
import * as dashboardsApi from "./api";

// Helper to get current mock
const getMock = () => mockRef.current!;

// ============================================================================
// TEST HELPERS
// ============================================================================

function createDashboard(overrides: Partial<{
  id: string;
  plan_id: string;
  name: string;
  description: string | null;
  is_default: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}> = {}) {
  return {
    id: overrides.id || `dashboard-${Math.random().toString(36).slice(2)}`,
    plan_id: overrides.plan_id || "plan-123",
    name: overrides.name || "My Dashboard",
    description: overrides.description ?? null,
    is_default: overrides.is_default ?? false,
    created_by: overrides.created_by || "user-123",
    created_at: overrides.created_at || new Date().toISOString(),
    updated_at: overrides.updated_at || new Date().toISOString(),
  };
}

function createDashboardWidget(overrides: Partial<{
  id: string;
  dashboard_id: string;
  widget_type: string;
  title: string;
  position_x: number;
  position_y: number;
  width: number;
  height: number;
  config: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}> = {}) {
  return {
    id: overrides.id || `widget-${Math.random().toString(36).slice(2)}`,
    dashboard_id: overrides.dashboard_id || "dashboard-123",
    widget_type: overrides.widget_type || "progress_chart",
    title: overrides.title || "Progress Chart",
    position_x: overrides.position_x ?? 0,
    position_y: overrides.position_y ?? 0,
    width: overrides.width ?? 4,
    height: overrides.height ?? 2,
    config: overrides.config || {},
    created_at: overrides.created_at || new Date().toISOString(),
    updated_at: overrides.updated_at || new Date().toISOString(),
  };
}

// ============================================================================
// TEST SETUP
// ============================================================================

describe("Dashboards API", () => {
  beforeEach(() => {
    mockRef.current = createMockSupabase();
    mockUserRef.current = { id: "user-123", email: "test@example.com" };
  });

  afterEach(() => {
    getMock().clearMocks();
    vi.clearAllMocks();
  });

  // ============================================================================
  // GET DASHBOARDS
  // ============================================================================

  describe("getDashboards", () => {
    it("should fetch all dashboards for a plan", async () => {
      const dash1 = createDashboard({ id: "d-1", plan_id: "plan-123", is_default: true });
      const dash2 = createDashboard({ id: "d-2", plan_id: "plan-123", is_default: false });
      getMock().setMockData("dashboards", [dash1, dash2]);

      const result = await dashboardsApi.getDashboards("plan-123");

      expect(result).toHaveLength(2);
    });

    it("should filter by plan_id", async () => {
      const planDash = createDashboard({ id: "d-1", plan_id: "plan-123" });
      const otherDash = createDashboard({ id: "d-2", plan_id: "other-plan" });
      getMock().setMockData("dashboards", [planDash, otherDash]);

      const result = await dashboardsApi.getDashboards("plan-123");

      expect(result).toHaveLength(1);
      expect(result[0].plan_id).toBe("plan-123");
    });

    it("should return empty array when no dashboards", async () => {
      getMock().setMockData("dashboards", []);

      const result = await dashboardsApi.getDashboards("plan-123");

      expect(result).toEqual([]);
    });

    it("should order by is_default descending then name ascending", async () => {
      getMock().setMockData("dashboards", []);

      await dashboardsApi.getDashboards("plan-123");

      const calls = getMock().getMockCalls("dashboards");
      const orderCalls = calls.filter((c) => c.method === "order");
      expect(orderCalls).toHaveLength(2);
      expect(orderCalls[0].args[0]).toBe("is_default");
      expect(orderCalls[0].args[1]).toEqual({ ascending: false });
      expect(orderCalls[1].args[0]).toBe("name");
      expect(orderCalls[1].args[1]).toEqual({ ascending: true });
    });
  });

  // ============================================================================
  // GET DEFAULT DASHBOARD
  // ============================================================================

  describe("getDefaultDashboard", () => {
    it("should return the default dashboard for a plan", async () => {
      const defaultDash = createDashboard({ id: "d-1", plan_id: "plan-123", is_default: true });
      getMock().setMockData("dashboards", [defaultDash]);

      const result = await dashboardsApi.getDefaultDashboard("plan-123");

      expect(result).not.toBeNull();
      expect(result!.is_default).toBe(true);
    });

    it("should return null when no default dashboard exists", async () => {
      getMock().setMockData("dashboards", []);

      const result = await dashboardsApi.getDefaultDashboard("plan-123");

      expect(result).toBeNull();
    });

    it("should filter by plan_id and is_default=true", async () => {
      getMock().setMockData("dashboards", []);

      await dashboardsApi.getDefaultDashboard("plan-123");

      const calls = getMock().getMockCalls("dashboards");
      expect(calls.some((c) => c.method === "eq" && c.args[0] === "plan_id")).toBe(true);
      expect(calls.some((c) => c.method === "eq" && c.args[0] === "is_default" && c.args[1] === true)).toBe(true);
    });
  });

  // ============================================================================
  // GET DASHBOARD
  // ============================================================================

  describe("getDashboard", () => {
    it("should return a dashboard by ID", async () => {
      const dashboard = createDashboard({ id: "d-123" });
      getMock().setMockData("dashboards", [dashboard]);

      const result = await dashboardsApi.getDashboard("d-123");

      expect(result).not.toBeNull();
      expect(result!.id).toBe("d-123");
    });

    it("should return null when dashboard not found", async () => {
      getMock().setMockData("dashboards", []);

      const result = await dashboardsApi.getDashboard("nonexistent");

      expect(result).toBeNull();
    });

    it("should use single() for fetching", async () => {
      getMock().setMockData("dashboards", [createDashboard()]);

      await dashboardsApi.getDashboard("d-123");

      const calls = getMock().getMockCalls("dashboards");
      expect(calls.some((c) => c.method === "single")).toBe(true);
    });
  });

  // ============================================================================
  // GET DASHBOARD WITH WIDGETS
  // ============================================================================

  describe("getDashboardWithWidgets", () => {
    it("should return a dashboard with its widgets", async () => {
      const widget1 = createDashboardWidget({ id: "w-1", dashboard_id: "d-123" });
      const widget2 = createDashboardWidget({ id: "w-2", dashboard_id: "d-123" });
      const dashboard = { ...createDashboard({ id: "d-123" }), widgets: [widget1, widget2] };
      getMock().setMockData("dashboards", [dashboard]);

      const result = await dashboardsApi.getDashboardWithWidgets("d-123");

      expect(result).not.toBeNull();
      expect(result!.widgets).toHaveLength(2);
    });

    it("should return null when dashboard not found", async () => {
      getMock().setMockData("dashboards", []);

      const result = await dashboardsApi.getDashboardWithWidgets("nonexistent");

      expect(result).toBeNull();
    });

    it("should include nested widgets in select", async () => {
      getMock().setMockData("dashboards", [{ ...createDashboard({ id: "d-123" }), widgets: [] }]);

      await dashboardsApi.getDashboardWithWidgets("d-123");

      const calls = getMock().getMockCalls("dashboards");
      const selectCall = calls.find((c) => c.method === "select");
      expect(selectCall?.args[0]).toContain("widgets:dashboard_widgets");
    });
  });

  // ============================================================================
  // CREATE DASHBOARD
  // ============================================================================

  describe("createDashboard", () => {
    it("should create a dashboard", async () => {
      const newDashboard = {
        plan_id: "plan-123",
        name: "My New Dashboard",
      };
      getMock().setMockData("dashboards", []);

      const result = await dashboardsApi.createDashboard(newDashboard);

      expect(result.plan_id).toBe("plan-123");
      expect(result.name).toBe("My New Dashboard");
    });

    it("should set created_by to current user", async () => {
      const newDashboard = {
        plan_id: "plan-123",
        name: "Test Dashboard",
      };
      getMock().setMockData("dashboards", []);

      await dashboardsApi.createDashboard(newDashboard);

      const calls = getMock().getMockCalls("dashboards");
      const insertCall = calls.find((c) => c.method === "insert");
      expect(insertCall?.args[0].created_by).toBe("user-123");
    });

    it("should throw error when not authenticated", async () => {
      mockUserRef.current = null;
      const newDashboard = {
        plan_id: "plan-123",
        name: "Test Dashboard",
      };

      await expect(dashboardsApi.createDashboard(newDashboard)).rejects.toThrow("Not authenticated");
    });

    it("should make insert and select calls", async () => {
      const newDashboard = {
        plan_id: "plan-123",
        name: "Test Dashboard",
      };
      getMock().setMockData("dashboards", []);

      await dashboardsApi.createDashboard(newDashboard);

      const calls = getMock().getMockCalls("dashboards");
      expect(calls.some((c) => c.method === "insert")).toBe(true);
      expect(calls.some((c) => c.method === "select")).toBe(true);
      expect(calls.some((c) => c.method === "single")).toBe(true);
    });
  });

  // ============================================================================
  // UPDATE DASHBOARD
  // ============================================================================

  describe("updateDashboard", () => {
    it("should update a dashboard", async () => {
      const dashboard = createDashboard({ id: "d-123", name: "Old Name" });
      getMock().setMockData("dashboards", [dashboard]);

      const result = await dashboardsApi.updateDashboard("d-123", { name: "New Name" });

      expect(result.name).toBe("New Name");
    });

    it("should make update, eq, select, and single calls", async () => {
      getMock().setMockData("dashboards", [createDashboard({ id: "d-123" })]);

      await dashboardsApi.updateDashboard("d-123", { name: "Updated" });

      const calls = getMock().getMockCalls("dashboards");
      expect(calls.some((c) => c.method === "update")).toBe(true);
      expect(calls.some((c) => c.method === "eq" && c.args[0] === "id")).toBe(true);
      expect(calls.some((c) => c.method === "select")).toBe(true);
      expect(calls.some((c) => c.method === "single")).toBe(true);
    });
  });

  // ============================================================================
  // SET DEFAULT DASHBOARD
  // ============================================================================

  describe("setDefaultDashboard", () => {
    it("should set a dashboard as default", async () => {
      const defaultDash = createDashboard({ id: "d-old", plan_id: "plan-123", is_default: true });
      const newDefaultDash = createDashboard({ id: "d-new", plan_id: "plan-123", is_default: false });
      getMock().setMockData("dashboards", [defaultDash, newDefaultDash]);

      await dashboardsApi.setDefaultDashboard("plan-123", "d-new");

      const calls = getMock().getMockCalls("dashboards");
      // First update: unset existing default
      expect(calls.some((c) => c.method === "update" && c.args[0]?.is_default === false)).toBe(true);
      // Second update: set new default
      expect(calls.some((c) => c.method === "update" && c.args[0]?.is_default === true)).toBe(true);
    });

    it("should first unset existing default then set new default", async () => {
      getMock().setMockData("dashboards", []);

      await dashboardsApi.setDefaultDashboard("plan-123", "d-new");

      const calls = getMock().getMockCalls("dashboards");
      const updateCalls = calls.filter((c) => c.method === "update");
      expect(updateCalls.length).toBeGreaterThanOrEqual(2);
    });
  });

  // ============================================================================
  // DELETE DASHBOARD
  // ============================================================================

  describe("deleteDashboard", () => {
    it("should delete a dashboard", async () => {
      const dashboard = createDashboard({ id: "d-123" });
      getMock().setMockData("dashboards", [dashboard]);

      await dashboardsApi.deleteDashboard("d-123");

      const calls = getMock().getMockCalls("dashboards");
      expect(calls.some((c) => c.method === "delete")).toBe(true);
      expect(calls.some((c) => c.method === "eq" && c.args[0] === "id")).toBe(true);
    });
  });

  // ============================================================================
  // GET DASHBOARD WIDGETS
  // ============================================================================

  describe("getDashboardWidgets", () => {
    it("should fetch all widgets for a dashboard", async () => {
      const widget1 = createDashboardWidget({ id: "w-1", dashboard_id: "d-123" });
      const widget2 = createDashboardWidget({ id: "w-2", dashboard_id: "d-123" });
      getMock().setMockData("dashboard_widgets", [widget1, widget2]);

      const result = await dashboardsApi.getDashboardWidgets("d-123");

      expect(result).toHaveLength(2);
    });

    it("should filter by dashboard_id", async () => {
      const dashWidget = createDashboardWidget({ id: "w-1", dashboard_id: "d-123" });
      const otherWidget = createDashboardWidget({ id: "w-2", dashboard_id: "other-dash" });
      getMock().setMockData("dashboard_widgets", [dashWidget, otherWidget]);

      const result = await dashboardsApi.getDashboardWidgets("d-123");

      expect(result).toHaveLength(1);
      expect(result[0].dashboard_id).toBe("d-123");
    });

    it("should return empty array when no widgets", async () => {
      getMock().setMockData("dashboard_widgets", []);

      const result = await dashboardsApi.getDashboardWidgets("d-123");

      expect(result).toEqual([]);
    });

    it("should order by position_y then position_x ascending", async () => {
      getMock().setMockData("dashboard_widgets", []);

      await dashboardsApi.getDashboardWidgets("d-123");

      const calls = getMock().getMockCalls("dashboard_widgets");
      const orderCalls = calls.filter((c) => c.method === "order");
      expect(orderCalls).toHaveLength(2);
      expect(orderCalls[0].args[0]).toBe("position_y");
      expect(orderCalls[0].args[1]).toEqual({ ascending: true });
      expect(orderCalls[1].args[0]).toBe("position_x");
      expect(orderCalls[1].args[1]).toEqual({ ascending: true });
    });
  });

  // ============================================================================
  // CREATE DASHBOARD WIDGET
  // ============================================================================

  describe("createDashboardWidget", () => {
    it("should create a widget", async () => {
      const newWidget = {
        dashboard_id: "d-123",
        widget_type: "progress_chart",
        title: "Progress Chart",
        position_x: 0,
        position_y: 0,
        width: 4,
        height: 2,
      };
      getMock().setMockData("dashboard_widgets", []);

      const result = await dashboardsApi.createDashboardWidget(newWidget);

      expect(result.dashboard_id).toBe("d-123");
      expect(result.widget_type).toBe("progress_chart");
    });

    it("should make insert and select calls", async () => {
      const newWidget = {
        dashboard_id: "d-123",
        widget_type: "tasks_widget",
        title: "Tasks",
        position_x: 0,
        position_y: 0,
        width: 2,
        height: 2,
      };
      getMock().setMockData("dashboard_widgets", []);

      await dashboardsApi.createDashboardWidget(newWidget);

      const calls = getMock().getMockCalls("dashboard_widgets");
      expect(calls.some((c) => c.method === "insert")).toBe(true);
      expect(calls.some((c) => c.method === "select")).toBe(true);
      expect(calls.some((c) => c.method === "single")).toBe(true);
    });
  });

  // ============================================================================
  // UPDATE DASHBOARD WIDGET
  // ============================================================================

  describe("updateDashboardWidget", () => {
    it("should update a widget", async () => {
      const widget = createDashboardWidget({ id: "w-123", title: "Old Title" });
      getMock().setMockData("dashboard_widgets", [widget]);

      const result = await dashboardsApi.updateDashboardWidget("w-123", { title: "New Title" });

      expect(result.title).toBe("New Title");
    });

    it("should update position", async () => {
      const widget = createDashboardWidget({ id: "w-123", position_x: 0, position_y: 0 });
      getMock().setMockData("dashboard_widgets", [widget]);

      const result = await dashboardsApi.updateDashboardWidget("w-123", {
        position_x: 4,
        position_y: 2
      });

      expect(result.position_x).toBe(4);
      expect(result.position_y).toBe(2);
    });

    it("should make update, eq, select, and single calls", async () => {
      getMock().setMockData("dashboard_widgets", [createDashboardWidget({ id: "w-123" })]);

      await dashboardsApi.updateDashboardWidget("w-123", { title: "Updated" });

      const calls = getMock().getMockCalls("dashboard_widgets");
      expect(calls.some((c) => c.method === "update")).toBe(true);
      expect(calls.some((c) => c.method === "eq" && c.args[0] === "id")).toBe(true);
      expect(calls.some((c) => c.method === "select")).toBe(true);
      expect(calls.some((c) => c.method === "single")).toBe(true);
    });
  });

  // ============================================================================
  // UPDATE WIDGET POSITIONS (BATCH)
  // ============================================================================

  describe("updateWidgetPositions", () => {
    it("should update positions for multiple widgets", async () => {
      getMock().setMockData("dashboard_widgets", [
        createDashboardWidget({ id: "w-1" }),
        createDashboardWidget({ id: "w-2" }),
      ]);

      const widgets = [
        { id: "w-1", position_x: 0, position_y: 0 },
        { id: "w-2", position_x: 4, position_y: 0 },
      ];

      await dashboardsApi.updateWidgetPositions(widgets);

      const calls = getMock().getMockCalls("dashboard_widgets");
      const updateCalls = calls.filter((c) => c.method === "update");
      expect(updateCalls.length).toBeGreaterThanOrEqual(2);
    });

    it("should include width and height when provided", async () => {
      getMock().setMockData("dashboard_widgets", [createDashboardWidget({ id: "w-1" })]);

      const widgets = [
        { id: "w-1", position_x: 0, position_y: 0, width: 6, height: 4 },
      ];

      await dashboardsApi.updateWidgetPositions(widgets);

      const calls = getMock().getMockCalls("dashboard_widgets");
      const updateCall = calls.find((c) => c.method === "update");
      expect(updateCall?.args[0]).toHaveProperty("position_x", 0);
      expect(updateCall?.args[0]).toHaveProperty("position_y", 0);
      expect(updateCall?.args[0]).toHaveProperty("width", 6);
      expect(updateCall?.args[0]).toHaveProperty("height", 4);
    });

    it("should not include width/height when not provided", async () => {
      getMock().setMockData("dashboard_widgets", [createDashboardWidget({ id: "w-1" })]);

      const widgets = [
        { id: "w-1", position_x: 2, position_y: 2 },
      ];

      await dashboardsApi.updateWidgetPositions(widgets);

      const calls = getMock().getMockCalls("dashboard_widgets");
      const updateCall = calls.find((c) => c.method === "update");
      expect(updateCall?.args[0]).toHaveProperty("position_x", 2);
      expect(updateCall?.args[0]).toHaveProperty("position_y", 2);
      expect(updateCall?.args[0]).not.toHaveProperty("width");
      expect(updateCall?.args[0]).not.toHaveProperty("height");
    });
  });

  // ============================================================================
  // DELETE DASHBOARD WIDGET
  // ============================================================================

  describe("deleteDashboardWidget", () => {
    it("should delete a widget", async () => {
      const widget = createDashboardWidget({ id: "w-123" });
      getMock().setMockData("dashboard_widgets", [widget]);

      await dashboardsApi.deleteDashboardWidget("w-123");

      const calls = getMock().getMockCalls("dashboard_widgets");
      expect(calls.some((c) => c.method === "delete")).toBe(true);
      expect(calls.some((c) => c.method === "eq" && c.args[0] === "id")).toBe(true);
    });
  });

  // ============================================================================
  // ERROR HANDLING
  // ============================================================================

  describe("error handling", () => {
    it("should throw error when getDashboards fails", async () => {
      getMock().setMockError("dashboards", new Error("Database error"));

      await expect(dashboardsApi.getDashboards("plan-123")).rejects.toThrow();
    });

    it("should throw error when getDashboardWidgets fails", async () => {
      getMock().setMockError("dashboard_widgets", new Error("Database error"));

      await expect(dashboardsApi.getDashboardWidgets("d-123")).rejects.toThrow();
    });

    it("should throw error when createDashboard fails", async () => {
      getMock().setMockError("dashboards", new Error("Database error"));

      await expect(
        dashboardsApi.createDashboard({
          plan_id: "plan-123",
          name: "Test",
        })
      ).rejects.toThrow();
    });

    it("should throw error when updateDashboard fails", async () => {
      getMock().setMockError("dashboards", new Error("Database error"));

      await expect(
        dashboardsApi.updateDashboard("d-123", { name: "Updated" })
      ).rejects.toThrow();
    });

    it("should throw error when deleteDashboard fails", async () => {
      getMock().setMockError("dashboards", new Error("Database error"));

      await expect(dashboardsApi.deleteDashboard("d-123")).rejects.toThrow();
    });

    it("should throw error when createDashboardWidget fails", async () => {
      getMock().setMockError("dashboard_widgets", new Error("Database error"));

      await expect(
        dashboardsApi.createDashboardWidget({
          dashboard_id: "d-123",
          widget_type: "progress_chart",
          title: "Test",
          position_x: 0,
          position_y: 0,
          width: 2,
          height: 2,
        })
      ).rejects.toThrow();
    });

    it("should throw error when updateDashboardWidget fails", async () => {
      getMock().setMockError("dashboard_widgets", new Error("Database error"));

      await expect(
        dashboardsApi.updateDashboardWidget("w-123", { title: "Updated" })
      ).rejects.toThrow();
    });

    it("should throw error when deleteDashboardWidget fails", async () => {
      getMock().setMockError("dashboard_widgets", new Error("Database error"));

      await expect(dashboardsApi.deleteDashboardWidget("w-123")).rejects.toThrow();
    });
  });
});
