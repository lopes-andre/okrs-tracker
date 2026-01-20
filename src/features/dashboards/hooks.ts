"use client";

import { useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-client";
import { useToast } from "@/components/ui/use-toast";
import { formatErrorMessage, successMessages } from "@/lib/toast-utils";
import * as api from "./api";
import { DEFAULT_DASHBOARD_WIDGETS } from "./default-widgets";
import type { DashboardInsert, DashboardUpdate, DashboardWidgetInsert, DashboardWidgetUpdate } from "@/lib/supabase/types";

// ============================================================================
// DASHBOARD QUERIES
// ============================================================================

/**
 * Get all dashboards for a plan
 */
export function useDashboards(planId: string) {
  return useQuery({
    queryKey: queryKeys.dashboards.list(planId),
    queryFn: () => api.getDashboards(planId),
    enabled: !!planId,
  });
}

/**
 * Get the default dashboard
 */
export function useDefaultDashboard(planId: string) {
  return useQuery({
    queryKey: [...queryKeys.dashboards.list(planId), "default"],
    queryFn: () => api.getDefaultDashboard(planId),
    enabled: !!planId,
  });
}

/**
 * Get a dashboard by ID
 */
export function useDashboard(dashboardId: string) {
  return useQuery({
    queryKey: queryKeys.dashboards.detail(dashboardId),
    queryFn: () => api.getDashboard(dashboardId),
    enabled: !!dashboardId,
  });
}

/**
 * Get a dashboard with its widgets
 */
export function useDashboardWithWidgets(dashboardId: string) {
  return useQuery({
    queryKey: [...queryKeys.dashboards.detail(dashboardId), "widgets"],
    queryFn: () => api.getDashboardWithWidgets(dashboardId),
    enabled: !!dashboardId,
  });
}

/**
 * Get widgets for a dashboard
 */
export function useDashboardWidgets(dashboardId: string) {
  return useQuery({
    queryKey: queryKeys.dashboards.widgets(dashboardId),
    queryFn: () => api.getDashboardWidgets(dashboardId),
    enabled: !!dashboardId,
  });
}

// ============================================================================
// DASHBOARD MUTATIONS
// ============================================================================

/**
 * Create a dashboard
 */
export function useCreateDashboard() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (dashboard: Omit<DashboardInsert, "created_by">) => api.createDashboard(dashboard),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboards.list(data.plan_id) });
      toast(successMessages.dashboardCreated);
    },
    onError: (error) => {
      toast(formatErrorMessage(error));
    },
  });
}

/**
 * Update a dashboard
 */
export function useUpdateDashboard() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ dashboardId, updates }: { dashboardId: string; updates: DashboardUpdate }) =>
      api.updateDashboard(dashboardId, updates),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboards.detail(data.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboards.list(data.plan_id) });
      toast(successMessages.dashboardUpdated);
    },
    onError: (error) => {
      toast(formatErrorMessage(error));
    },
  });
}

/**
 * Set a dashboard as default
 */
export function useSetDefaultDashboard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ planId, dashboardId }: { planId: string; dashboardId: string }) =>
      api.setDefaultDashboard(planId, dashboardId),
    onSuccess: (_, { planId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboards.list(planId) });
    },
  });
}

/**
 * Delete a dashboard
 */
export function useDeleteDashboard() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ dashboardId, planId }: { dashboardId: string; planId: string }) =>
      api.deleteDashboard(dashboardId),
    onSuccess: (_, { planId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboards.list(planId) });
      toast(successMessages.dashboardDeleted);
    },
    onError: (error) => {
      toast(formatErrorMessage(error));
    },
  });
}

// ============================================================================
// WIDGET MUTATIONS
// ============================================================================

/**
 * Create a widget
 */
export function useCreateDashboardWidget() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (widget: DashboardWidgetInsert) => api.createDashboardWidget(widget),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboards.widgets(data.dashboard_id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboards.detail(data.dashboard_id) });
      toast(successMessages.widgetAdded);
    },
    onError: (error) => {
      toast(formatErrorMessage(error));
    },
  });
}

/**
 * Update a widget
 */
export function useUpdateDashboardWidget() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ widgetId, updates }: { widgetId: string; updates: DashboardWidgetUpdate }) =>
      api.updateDashboardWidget(widgetId, updates),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboards.widgets(data.dashboard_id) });
    },
  });
}

/**
 * Update widget positions (batch)
 */
export function useUpdateWidgetPositions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ dashboardId, widgets }: { 
      dashboardId: string; 
      widgets: { id: string; position_x: number; position_y: number; width?: number; height?: number }[] 
    }) => api.updateWidgetPositions(widgets),
    onSuccess: (_, { dashboardId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboards.widgets(dashboardId) });
    },
  });
}

/**
 * Delete a widget
 */
export function useDeleteDashboardWidget() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ widgetId, dashboardId }: { widgetId: string; dashboardId: string }) =>
      api.deleteDashboardWidget(widgetId),
    onSuccess: (_, { dashboardId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboards.widgets(dashboardId) });
      toast(successMessages.widgetRemoved);
    },
    onError: (error) => {
      toast(formatErrorMessage(error));
    },
  });
}

// ============================================================================
// DEFAULT DASHBOARD INITIALIZATION
// ============================================================================

/**
 * Ensures a default dashboard exists for the plan.
 * Creates one with default widgets if it doesn't exist.
 */
export function useEnsureDefaultDashboard(planId: string) {
  const queryClient = useQueryClient();
  const isCreating = useRef(false);

  const { data: defaultDashboard, isLoading } = useDefaultDashboard(planId);

  useEffect(() => {
    async function createDefaultDashboard() {
      if (!planId || isLoading || defaultDashboard || isCreating.current) {
        return;
      }

      isCreating.current = true;

      try {
        // Create the dashboard
        const dashboard = await api.createDashboard({
          plan_id: planId,
          name: "Overview",
          description: "Default dashboard",
          is_default: true,
        });

        // Create default widgets
        await Promise.all(
          DEFAULT_DASHBOARD_WIDGETS.map((widget) =>
            api.createDashboardWidget({
              ...widget,
              dashboard_id: dashboard.id,
            })
          )
        );

        // Invalidate queries to refetch
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboards.list(planId) });
      } catch (error) {
        console.error("Failed to create default dashboard:", error);
      } finally {
        isCreating.current = false;
      }
    }

    createDefaultDashboard();
  }, [planId, isLoading, defaultDashboard, queryClient]);

  return { isInitializing: isLoading || (!defaultDashboard && !isCreating.current) };
}
