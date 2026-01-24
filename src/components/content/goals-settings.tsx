"use client";

import { useState } from "react";
import {
  Plus,
  Loader2,
  MoreVertical,
  Pencil,
  Trash2,
  GripVertical,
  Target,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/layout/empty-state";
import { GoalDialog } from "./goal-dialog";
import { DeleteConfirmationDialog } from "@/components/okr/delete-confirmation-dialog";
import { useGoals, useDeleteGoal, useReorderGoals } from "@/features/content/hooks";
import type { ContentGoal } from "@/lib/supabase/types";

interface GoalsSettingsProps {
  planId: string;
}

// Preset goal colors
const goalColors: Record<string, { bg: string; text: string; border: string }> = {
  "#3B82F6": { bg: "bg-blue-500/10", text: "text-blue-600", border: "border-blue-500/30" },
  "#10B981": { bg: "bg-emerald-500/10", text: "text-emerald-600", border: "border-emerald-500/30" },
  "#F59E0B": { bg: "bg-amber-500/10", text: "text-amber-600", border: "border-amber-500/30" },
  "#EF4444": { bg: "bg-red-500/10", text: "text-red-600", border: "border-red-500/30" },
  "#8B5CF6": { bg: "bg-violet-500/10", text: "text-violet-600", border: "border-violet-500/30" },
  "#EC4899": { bg: "bg-pink-500/10", text: "text-pink-600", border: "border-pink-500/30" },
  "#6366F1": { bg: "bg-indigo-500/10", text: "text-indigo-600", border: "border-indigo-500/30" },
  "#14B8A6": { bg: "bg-teal-500/10", text: "text-teal-600", border: "border-teal-500/30" },
};

function getGoalColors(color: string | null) {
  if (!color) return { bg: "bg-bg-1", text: "text-text-muted", border: "border-border" };
  return goalColors[color] || { bg: "bg-bg-1", text: "text-text-muted", border: "border-border" };
}

export function GoalsSettings({ planId }: GoalsSettingsProps) {
  const { data: goals, isLoading } = useGoals(planId);
  const deleteGoal = useDeleteGoal(planId);
  const reorderGoals = useReorderGoals(planId);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<ContentGoal | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [goalToDelete, setGoalToDelete] = useState<ContentGoal | null>(null);
  const [draggedGoal, setDraggedGoal] = useState<ContentGoal | null>(null);

  const handleEdit = (goal: ContentGoal) => {
    setEditingGoal(goal);
    setDialogOpen(true);
  };

  const handleDelete = (goal: ContentGoal) => {
    setGoalToDelete(goal);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (goalToDelete) {
      await deleteGoal.mutateAsync(goalToDelete.id);
      setDeleteDialogOpen(false);
      setGoalToDelete(null);
    }
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setEditingGoal(null);
  };

  const handleDragStart = (goal: ContentGoal) => {
    setDraggedGoal(goal);
  };

  const handleDragOver = (e: React.DragEvent, targetGoal: ContentGoal) => {
    e.preventDefault();
    if (!draggedGoal || draggedGoal.id === targetGoal.id) return;
  };

  const handleDrop = async (targetGoal: ContentGoal) => {
    if (!draggedGoal || !goals || draggedGoal.id === targetGoal.id) {
      setDraggedGoal(null);
      return;
    }

    const oldIndex = goals.findIndex((g) => g.id === draggedGoal.id);
    const newIndex = goals.findIndex((g) => g.id === targetGoal.id);

    // Create new order
    const newGoals = [...goals];
    newGoals.splice(oldIndex, 1);
    newGoals.splice(newIndex, 0, draggedGoal);

    // Update order
    await reorderGoals.mutateAsync(newGoals.map((g) => g.id));
    setDraggedGoal(null);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-text-muted" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-h4 font-heading font-semibold text-text-strong">
            Content Goals
          </h2>
          <p className="text-small text-text-muted mt-1">
            Define content goals to categorize and track purpose of your posts
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Add Goal
        </Button>
      </div>

      {/* Goals List */}
      {!goals || goals.length === 0 ? (
        <EmptyState
          icon={Target}
          title="No content goals defined"
          description="Create goals like Authority, Audience Growth, or Lead Generation to categorize your content strategy."
          action={{
            label: "Add Goal",
            onClick: () => setDialogOpen(true),
          }}
        />
      ) : (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Active Goals</CardTitle>
            <CardDescription>
              Drag to reorder. Goals can be linked to KRs for tracking.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {goals.map((goal) => (
                <GoalRow
                  key={goal.id}
                  goal={goal}
                  onEdit={() => handleEdit(goal)}
                  onDelete={() => handleDelete(goal)}
                  isDragging={draggedGoal?.id === goal.id}
                  onDragStart={() => handleDragStart(goal)}
                  onDragOver={(e) => handleDragOver(e, goal)}
                  onDrop={() => handleDrop(goal)}
                  onDragEnd={() => setDraggedGoal(null)}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Goal Dialog */}
      <GoalDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        planId={planId}
        goal={editingGoal}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={confirmDelete}
        title="Delete Goal"
        description="Posts with this goal will lose this categorization."
        itemName={goalToDelete?.name || "this goal"}
      />
    </div>
  );
}

interface GoalRowProps {
  goal: ContentGoal;
  onEdit: () => void;
  onDelete: () => void;
  isDragging: boolean;
  onDragStart: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: () => void;
  onDragEnd: () => void;
}

function GoalRow({
  goal,
  onEdit,
  onDelete,
  isDragging,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: GoalRowProps) {
  const colors = getGoalColors(goal.color);

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      className={`flex items-center justify-between p-4 rounded-card border border-border-soft bg-bg-0 hover:border-border transition-colors ${
        isDragging ? "opacity-50" : ""
      }`}
    >
      <div className="flex items-center gap-4">
        <div className="cursor-grab active:cursor-grabbing text-text-muted hover:text-text">
          <GripVertical className="w-4 h-4" />
        </div>

        <div
          className={`w-3 h-3 rounded-full ${colors.bg} border ${colors.border}`}
          style={{ backgroundColor: goal.color || undefined }}
        />

        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="font-medium">{goal.name}</span>
          </div>
          {goal.description && (
            <span className="text-small text-text-muted">
              {goal.description}
            </span>
          )}
        </div>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreVertical className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onEdit}>
            <Pencil className="w-4 h-4 mr-2" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={onDelete}
            className="text-status-danger focus:text-status-danger"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
