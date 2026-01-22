"use client";

import { use, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  DashboardGrid,
  DashboardHeader,
  DashboardDataProvider,
  AddWidgetDialog,
  getWidgetDefinition,
} from "@/components/dashboard";
import { calculateNextPosition } from "@/features/dashboards/default-widgets";
import { usePlan, usePlanRole } from "@/features/plans/hooks";
import {
  useDefaultDashboard,
  useDashboardWithWidgets,
  useEnsureDefaultDashboard,
  useCreateDashboardWidget,
  useDeleteDashboardWidget,
  useUpdateWidgetPositions,
} from "@/features/dashboards/hooks";

export default function PlanOverviewPage({
  params,
}: {
  params: Promise<{ planId: string }>;
}) {
  const { planId } = use(params);

  // State
  const [isEditing, setIsEditing] = useState(false);
  const [addWidgetOpen, setAddWidgetOpen] = useState(false);

  // Ensure default dashboard exists
  useEnsureDefaultDashboard(planId);

  // Queries
  const { data: plan, isLoading: planLoading } = usePlan(planId);
  const { data: role } = usePlanRole(planId);
  const { data: defaultDashboard, isLoading: dashboardLoading } = useDefaultDashboard(planId);
  const { data: dashboardData, isLoading: widgetsLoading } = useDashboardWithWidgets(
    defaultDashboard?.id || ""
  );

  // Mutations
  const createWidget = useCreateDashboardWidget();
  const deleteWidget = useDeleteDashboardWidget();
  const updatePositions = useUpdateWidgetPositions();

  const isLoading = planLoading || dashboardLoading || (defaultDashboard && widgetsLoading);
  const canEdit = role === "owner" || role === "editor";
  const widgets = dashboardData?.widgets || [];

  // Handlers
  async function handleAddWidget(widgetType: string) {
    if (!defaultDashboard) return;

    const definition = getWidgetDefinition(widgetType);
    if (!definition) return;

    const position = calculateNextPosition(
      widgets.map((w) => ({
        position_x: w.position_x,
        position_y: w.position_y,
        width: w.width,
        height: w.height,
      })),
      definition.defaultWidth
    );

    await createWidget.mutateAsync({
      dashboard_id: defaultDashboard.id,
      widget_type: widgetType,
      title: definition.name,
      config: {},
      position_x: position.x,
      position_y: position.y,
      width: definition.defaultWidth,
      height: definition.defaultHeight,
    });
  }

  async function handleRemoveWidget(widgetId: string) {
    if (!defaultDashboard) return;
    await deleteWidget.mutateAsync({
      widgetId,
      dashboardId: defaultDashboard.id,
    });
  }

  async function handleReorderWidgets(
    newPositions: { id: string; position_x: number; position_y: number }[]
  ) {
    if (!defaultDashboard) return;
    await updatePositions.mutateAsync({
      dashboardId: defaultDashboard.id,
      widgets: newPositions,
    });
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-text-muted" />
      </div>
    );
  }

  return (
    <>
      <DashboardHeader
        plan={plan}
        dashboard={defaultDashboard}
        isEditing={isEditing}
        onToggleEdit={() => setIsEditing(!isEditing)}
        onAddWidget={() => setAddWidgetOpen(true)}
        canEdit={canEdit}
      />

      <DashboardDataProvider planId={planId}>
        <DashboardGrid
          widgets={widgets}
          isEditing={isEditing}
          onRemoveWidget={handleRemoveWidget}
          onReorderWidgets={handleReorderWidgets}
        />
      </DashboardDataProvider>

      <AddWidgetDialog
        open={addWidgetOpen}
        onOpenChange={setAddWidgetOpen}
        onAddWidget={handleAddWidget}
        existingWidgetTypes={widgets.map((w) => w.widget_type)}
      />
    </>
  );
}
