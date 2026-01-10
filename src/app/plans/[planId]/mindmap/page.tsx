"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { Map, Loader2, Download, RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/layout/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MindmapCanvas } from "@/components/mindmap";
import { usePlan } from "@/features/plans/hooks";
import { useObjectivesWithKrs } from "@/features/objectives/hooks";
import { useTasks } from "@/features/tasks/hooks";
import { useCheckIns } from "@/features/check-ins/hooks";

export default function MindmapPage({
  params,
}: {
  params: Promise<{ planId: string }>;
}) {
  const { planId } = use(params);
  const router = useRouter();

  // Fetch all data needed for the mindmap
  const { data: plan, isLoading: isLoadingPlan } = usePlan(planId);
  const { data: objectives, isLoading: isLoadingObjectives } = useObjectivesWithKrs(planId);
  const { data: tasks, isLoading: isLoadingTasks } = useTasks(planId);
  const { data: checkIns, isLoading: isLoadingCheckIns } = useCheckIns(planId);

  const isLoading = isLoadingPlan || isLoadingObjectives || isLoadingTasks || isLoadingCheckIns;

  // Handle node click - navigate to the entity
  const handleNodeClick = (nodeId: string, entityType: string, entityId: string) => {
    switch (entityType) {
      case "plan":
        router.push(`/plans/${planId}`);
        break;
      case "objective":
        router.push(`/plans/${planId}/okrs`);
        break;
      case "kr":
        router.push(`/plans/${planId}/okrs`);
        break;
      case "task":
        router.push(`/plans/${planId}/tasks`);
        break;
      default:
        break;
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-10 w-10 animate-spin text-text-muted" />
      </div>
    );
  }

  const hasData = objectives && objectives.length > 0;

  return (
    <>
      <PageHeader
        title="Mindmap"
        description="Visual hierarchy of your objectives and key results"
      >
        <Button variant="secondary" className="gap-2">
          <Download className="w-4 h-4" />
          Export Image
        </Button>
      </PageHeader>

      {/* Mindmap Canvas */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          {!hasData ? (
            <div className="h-[600px] flex flex-col items-center justify-center bg-bg-1/30">
              <EmptyState
                icon={Map}
                title="No objectives yet"
                description="Create objectives and key results to visualize them in the mindmap."
                action={{
                  label: "Create Objective",
                  href: `/plans/${planId}/okrs`,
                }}
              />
            </div>
          ) : (
            <div className="h-[700px]">
              <MindmapCanvas
                plan={plan!}
                objectives={objectives}
                tasks={tasks || []}
                checkIns={checkIns || []}
                onNodeClick={handleNodeClick}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Cards */}
      {hasData && (
        <div className="grid md:grid-cols-3 gap-6 mt-6">
          <Card className="bg-bg-0/50">
            <CardContent className="pt-6">
              <h4 className="font-heading font-semibold text-body mb-1">
                Interactive Visualization
              </h4>
              <p className="text-body-sm text-text-muted">
                Drag to pan, scroll to zoom. Click nodes to navigate to details.
              </p>
            </CardContent>
          </Card>
          <Card className="bg-bg-0/50">
            <CardContent className="pt-6">
              <h4 className="font-heading font-semibold text-body mb-1">
                Live Progress
              </h4>
              <p className="text-body-sm text-text-muted">
                Each node shows real-time progress with color-coded pace indicators.
              </p>
            </CardContent>
          </Card>
          <Card className="bg-bg-0/50">
            <CardContent className="pt-6">
              <h4 className="font-heading font-semibold text-body mb-1">
                Toggle Visibility
              </h4>
              <p className="text-body-sm text-text-muted">
                Use the controls to show/hide quarters, tasks, and the minimap.
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
