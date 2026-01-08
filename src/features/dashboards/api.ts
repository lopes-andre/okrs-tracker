import { createClient } from "@/lib/supabase/client";
import { handleSupabaseError, handleSupabaseQuery } from "@/lib/api-utils";
import type {
  Dashboard,
  DashboardInsert,
  DashboardUpdate,
  DashboardWidget,
  DashboardWidgetInsert,
  DashboardWidgetUpdate,
} from "@/lib/supabase/types";

// ============================================================================
// DASHBOARDS API
// ============================================================================

/**
 * Get all dashboards for a plan
 */
export async function getDashboards(planId: string): Promise<Dashboard[]> {
  const supabase = createClient();

  return handleSupabaseError(
    supabase
      .from("dashboards")
      .select("*")
      .eq("plan_id", planId)
      .order("is_default", { ascending: false })
      .order("name", { ascending: true })
  );
}

/**
 * Get the default dashboard for a plan
 */
export async function getDefaultDashboard(planId: string): Promise<Dashboard | null> {
  const supabase = createClient();

  return handleSupabaseQuery(
    supabase
      .from("dashboards")
      .select("*")
      .eq("plan_id", planId)
      .eq("is_default", true)
      .single()
  );
}

/**
 * Get a dashboard by ID
 */
export async function getDashboard(dashboardId: string): Promise<Dashboard | null> {
  const supabase = createClient();

  return handleSupabaseQuery(
    supabase
      .from("dashboards")
      .select("*")
      .eq("id", dashboardId)
      .single()
  );
}

/**
 * Get a dashboard with its widgets
 */
export async function getDashboardWithWidgets(dashboardId: string): Promise<(Dashboard & { widgets: DashboardWidget[] }) | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("dashboards")
    .select(`
      *,
      widgets:dashboard_widgets(*)
    `)
    .eq("id", dashboardId)
    .single();

  if (error && error.code !== "PGRST116") throw error;
  return data;
}

/**
 * Create a dashboard
 */
export async function createDashboard(dashboard: Omit<DashboardInsert, "created_by">): Promise<Dashboard> {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  return handleSupabaseError(
    supabase
      .from("dashboards")
      .insert({ ...dashboard, created_by: user.id })
      .select()
      .single()
  );
}

/**
 * Update a dashboard
 */
export async function updateDashboard(
  dashboardId: string,
  updates: DashboardUpdate
): Promise<Dashboard> {
  const supabase = createClient();

  return handleSupabaseError(
    supabase
      .from("dashboards")
      .update(updates)
      .eq("id", dashboardId)
      .select()
      .single()
  );
}

/**
 * Set a dashboard as default
 */
export async function setDefaultDashboard(planId: string, dashboardId: string): Promise<void> {
  const supabase = createClient();

  // First, unset any existing default
  await supabase
    .from("dashboards")
    .update({ is_default: false })
    .eq("plan_id", planId)
    .eq("is_default", true);

  // Then set the new default
  const { error } = await supabase
    .from("dashboards")
    .update({ is_default: true })
    .eq("id", dashboardId);

  if (error) throw error;
}

/**
 * Delete a dashboard
 */
export async function deleteDashboard(dashboardId: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from("dashboards")
    .delete()
    .eq("id", dashboardId);

  if (error) throw error;
}

// ============================================================================
// DASHBOARD WIDGETS API
// ============================================================================

/**
 * Get widgets for a dashboard
 */
export async function getDashboardWidgets(dashboardId: string): Promise<DashboardWidget[]> {
  const supabase = createClient();

  return handleSupabaseError(
    supabase
      .from("dashboard_widgets")
      .select("*")
      .eq("dashboard_id", dashboardId)
      .order("position_y", { ascending: true })
      .order("position_x", { ascending: true })
  );
}

/**
 * Create a widget
 */
export async function createDashboardWidget(widget: DashboardWidgetInsert): Promise<DashboardWidget> {
  const supabase = createClient();

  return handleSupabaseError(
    supabase
      .from("dashboard_widgets")
      .insert(widget)
      .select()
      .single()
  );
}

/**
 * Update a widget
 */
export async function updateDashboardWidget(
  widgetId: string,
  updates: DashboardWidgetUpdate
): Promise<DashboardWidget> {
  const supabase = createClient();

  return handleSupabaseError(
    supabase
      .from("dashboard_widgets")
      .update(updates)
      .eq("id", widgetId)
      .select()
      .single()
  );
}

/**
 * Update widget positions (batch update for drag-and-drop)
 */
export async function updateWidgetPositions(
  widgets: { id: string; position_x: number; position_y: number; width?: number; height?: number }[]
): Promise<void> {
  const supabase = createClient();

  const updates = widgets.map((widget) =>
    supabase
      .from("dashboard_widgets")
      .update({
        position_x: widget.position_x,
        position_y: widget.position_y,
        ...(widget.width && { width: widget.width }),
        ...(widget.height && { height: widget.height }),
      })
      .eq("id", widget.id)
  );

  await Promise.all(updates);
}

/**
 * Delete a widget
 */
export async function deleteDashboardWidget(widgetId: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from("dashboard_widgets")
    .delete()
    .eq("id", widgetId);

  if (error) throw error;
}
