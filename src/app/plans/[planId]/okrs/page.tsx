"use client";

import { useState, use } from "react";
import { Plus, Target, Loader2, TrendingUp, CheckCircle2, ListTodo } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/layout/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  ObjectiveCard,
  ObjectiveDialog,
  AnnualKrDialog,
  QuarterTargetsDialog,
  DeleteConfirmationDialog,
} from "@/components/okr";
import {
  usePlan,
  usePlanRole,
  usePlanStats,
  useObjectivesWithKrs,
  useCreateObjective,
  useUpdateObjective,
  useDeleteObjective,
  useAnnualKrWithDetails,
  useCreateAnnualKr,
  useUpdateAnnualKr,
  useDeleteAnnualKr,
  useSetKrTags,
  useUpsertQuarterTargets,
  useKrGroups,
  useTags,
  useQuarterTargetsByKr,
} from "@/features";
import type { Objective, AnnualKr, ObjectiveWithKrs } from "@/lib/supabase/types";

// Stats Card Component
function StatsCard({
  icon: Icon,
  label,
  value,
  subtext,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  subtext?: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-card bg-bg-1 flex items-center justify-center shrink-0">
            <Icon className="w-5 h-5 text-text-muted" />
          </div>
          <div>
            <p className="text-small text-text-muted">{label}</p>
            <p className="text-h4 font-heading font-bold">{value}</p>
            {subtext && <p className="text-xs text-text-subtle">{subtext}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function OKRsPage({
  params,
}: {
  params: Promise<{ planId: string }>;
}) {
  const { planId } = use(params);

  // Data fetching
  const { data: plan, isLoading: planLoading } = usePlan(planId);
  const { data: role, isLoading: roleLoading } = usePlanRole(planId);
  const { data: stats } = usePlanStats(planId);
  const { data: objectives, isLoading: objectivesLoading } = useObjectivesWithKrs(planId);
  const { data: groups = [] } = useKrGroups(planId);
  const { data: tags = [] } = useTags(planId);

  // Mutations
  const createObjective = useCreateObjective();
  const updateObjective = useUpdateObjective();
  const deleteObjective = useDeleteObjective();
  const createAnnualKr = useCreateAnnualKr();
  const updateAnnualKr = useUpdateAnnualKr();
  const deleteAnnualKr = useDeleteAnnualKr();
  const setKrTags = useSetKrTags();
  const upsertQuarterTargets = useUpsertQuarterTargets();

  // Dialog states
  const [objectiveDialogOpen, setObjectiveDialogOpen] = useState(false);
  const [editingObjective, setEditingObjective] = useState<Objective | null>(null);

  const [krDialogOpen, setKrDialogOpen] = useState(false);
  const [editingKr, setEditingKr] = useState<AnnualKr | null>(null);
  const [krObjectiveId, setKrObjectiveId] = useState<string>("");
  const [krSelectedTags, setKrSelectedTags] = useState<string[]>([]);

  const [quarterTargetsDialogOpen, setQuarterTargetsDialogOpen] = useState(false);
  const [quarterTargetsKr, setQuarterTargetsKr] = useState<AnnualKr | null>(null);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    type: "objective" | "kr";
    id: string;
    name: string;
    objectiveId?: string;
  } | null>(null);

  // Permission check
  const canEdit = role === "owner" || role === "editor";
  const isLoading = planLoading || roleLoading || objectivesLoading;

  // Get existing objective codes
  const existingCodes = objectives?.map((o) => o.code) || [];

  // Calculate overall progress
  const overallProgress = objectives && objectives.length > 0
    ? objectives.reduce((sum, obj) => sum + (obj.progress || 0), 0) / objectives.length
    : 0;

  // Handlers
  function handleCreateObjective() {
    setEditingObjective(null);
    setObjectiveDialogOpen(true);
  }

  function handleEditObjective(objective: Objective) {
    setEditingObjective(objective);
    setObjectiveDialogOpen(true);
  }

  function handleDeleteObjective(objective: ObjectiveWithKrs) {
    setDeleteTarget({
      type: "objective",
      id: objective.id,
      name: `${objective.code}: ${objective.name}`,
    });
    setDeleteDialogOpen(true);
  }

  function handleAddKr(objectiveId: string) {
    setEditingKr(null);
    setKrObjectiveId(objectiveId);
    setKrSelectedTags([]);
    setKrDialogOpen(true);
  }

  function handleEditKr(kr: AnnualKr, objectiveId: string) {
    setEditingKr(kr);
    setKrObjectiveId(objectiveId);
    // TODO: Fetch current tags for the KR
    setKrSelectedTags([]);
    setKrDialogOpen(true);
  }

  function handleDeleteKr(kr: AnnualKr, objectiveId: string) {
    setDeleteTarget({
      type: "kr",
      id: kr.id,
      name: kr.name,
      objectiveId,
    });
    setDeleteDialogOpen(true);
  }

  function handleEditQuarterTargets(kr: AnnualKr) {
    setQuarterTargetsKr(kr);
    setQuarterTargetsDialogOpen(true);
  }

  async function handleObjectiveSubmit(data: Parameters<typeof createObjective.mutateAsync>[0]) {
    if (editingObjective) {
      await updateObjective.mutateAsync({
        objectiveId: editingObjective.id,
        updates: data,
      });
    } else {
      await createObjective.mutateAsync(data as Parameters<typeof createObjective.mutateAsync>[0]);
    }
  }

  async function handleKrSubmit(
    data: Parameters<typeof createAnnualKr.mutateAsync>[0],
    tagIds: string[]
  ) {
    if (editingKr) {
      await updateAnnualKr.mutateAsync({
        krId: editingKr.id,
        updates: data,
      });
      if (tagIds.length > 0 || krSelectedTags.length > 0) {
        await setKrTags.mutateAsync({ krId: editingKr.id, tagIds });
      }
    } else {
      const newKr = await createAnnualKr.mutateAsync(
        data as Parameters<typeof createAnnualKr.mutateAsync>[0]
      );
      if (tagIds.length > 0) {
        await setKrTags.mutateAsync({ krId: newKr.id, tagIds });
      }
    }
  }

  async function handleQuarterTargetsSubmit(
    targets: { quarter: 1 | 2 | 3 | 4; target_value: number; notes?: string }[]
  ) {
    if (!quarterTargetsKr) return;
    await upsertQuarterTargets.mutateAsync({
      annualKrId: quarterTargetsKr.id,
      targets,
    });
  }

  async function handleDelete() {
    if (!deleteTarget) return;

    if (deleteTarget.type === "objective") {
      await deleteObjective.mutateAsync({
        objectiveId: deleteTarget.id,
        planId,
      });
    } else {
      await deleteAnnualKr.mutateAsync({
        krId: deleteTarget.id,
        objectiveId: deleteTarget.objectiveId!,
      });
    }
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-text-muted" />
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <PageHeader
        title="Objectives & Key Results"
        description={plan ? `${plan.name} • ${plan.year}` : "Define and track your annual OKRs"}
      >
        {canEdit && (
          <Button onClick={handleCreateObjective} className="gap-2">
            <Plus className="w-4 h-4" />
            New Objective
          </Button>
        )}
      </PageHeader>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatsCard
          icon={Target}
          label="Objectives"
          value={stats?.objective_count || 0}
        />
        <StatsCard
          icon={TrendingUp}
          label="Key Results"
          value={stats?.kr_count || 0}
        />
        <StatsCard
          icon={CheckCircle2}
          label="Overall Progress"
          value={`${Math.round(overallProgress)}%`}
        />
        <StatsCard
          icon={ListTodo}
          label="Tasks"
          value={stats?.task_count || 0}
          subtext={stats ? `${stats.completed_task_count} completed` : undefined}
        />
      </div>

      {/* Objectives List */}
      {objectives && objectives.length > 0 ? (
        <div className="space-y-4">
          {objectives.map((objective) => (
            <ObjectiveCard
              key={objective.id}
              objective={objective}
              role={role || "viewer"}
              onEdit={() => handleEditObjective(objective)}
              onDelete={() => handleDeleteObjective(objective)}
              onAddKr={() => handleAddKr(objective.id)}
              onEditKr={(krId) => {
                const kr = objective.annual_krs?.find((k) => k.id === krId);
                if (kr) handleEditKr(kr, objective.id);
              }}
              onDeleteKr={(krId) => {
                const kr = objective.annual_krs?.find((k) => k.id === krId);
                if (kr) handleDeleteKr(kr, objective.id);
              }}
              onEditQuarterTargets={(krId) => {
                const kr = objective.annual_krs?.find((k) => k.id === krId);
                if (kr) handleEditQuarterTargets(kr);
              }}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Target}
          title="No objectives yet"
          description={
            canEdit
              ? "Create your first objective to start tracking your OKRs"
              : "No objectives have been created for this plan yet"
          }
          action={
            canEdit && (
              <Button onClick={handleCreateObjective} className="gap-2">
                <Plus className="w-4 h-4" />
                Create Objective
              </Button>
            )
          }
        />
      )}

      {/* Dialogs */}
      <ObjectiveDialog
        open={objectiveDialogOpen}
        onOpenChange={setObjectiveDialogOpen}
        planId={planId}
        objective={editingObjective}
        existingCodes={existingCodes}
        onSubmit={handleObjectiveSubmit}
      />

      <AnnualKrDialog
        open={krDialogOpen}
        onOpenChange={setKrDialogOpen}
        objectiveId={krObjectiveId}
        kr={editingKr}
        groups={groups}
        tags={tags}
        selectedTags={krSelectedTags}
        onSubmit={handleKrSubmit}
      />

      {quarterTargetsKr && (
        <QuarterTargetsDialogWrapper
          open={quarterTargetsDialogOpen}
          onOpenChange={setQuarterTargetsDialogOpen}
          kr={quarterTargetsKr}
          onSubmit={handleQuarterTargetsSubmit}
        />
      )}

      <DeleteConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title={deleteTarget?.type === "objective" ? "Delete Objective" : "Delete Key Result"}
        description={
          deleteTarget?.type === "objective"
            ? "This will also delete all associated key results and quarter targets."
            : "This will also delete all associated quarter targets and check-ins."
        }
        itemName={deleteTarget?.name || ""}
        onConfirm={handleDelete}
      />
    </>
  );
}

// Wrapper component to fetch quarter targets
function QuarterTargetsDialogWrapper({
  open,
  onOpenChange,
  kr,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kr: AnnualKr;
  onSubmit: (targets: { quarter: 1 | 2 | 3 | 4; target_value: number; notes?: string }[]) => Promise<void>;
}) {
  const { data: quarterTargets = [] } = useQuarterTargetsByKr(kr.id);

  return (
    <QuarterTargetsDialog
      open={open}
      onOpenChange={onOpenChange}
      kr={kr}
      quarterTargets={quarterTargets}
      onSubmit={onSubmit}
    />
  );
}
