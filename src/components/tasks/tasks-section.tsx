"use client";

import { useState, lazy, Suspense } from "react";
import { Plus, Clock, AlertTriangle, ListTodo } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TaskRow } from "./task-row";

// Lazy load heavy dialog component
const TaskDialog = lazy(() =>
  import("./task-dialog").then((mod) => ({ default: mod.TaskDialog }))
);
import { DeleteConfirmationDialog } from "@/components/okr/delete-confirmation-dialog";
import {
  useTasks,
  useCreateTask,
  useUpdateTask,
  useDeleteTask,
} from "@/features/tasks/hooks";
import { useObjectives } from "@/features/objectives/hooks";
import { usePlanRole } from "@/features/plans/hooks";
import type { Task, TaskStatus, TaskInsert, TaskUpdate, OkrRole } from "@/lib/supabase/types";

interface TasksSectionProps {
  planId: string;
  view?: "summary" | "full";
}

export function TasksSection({ planId, view = "summary" }: TasksSectionProps) {
  const { data: tasks = [], isLoading } = useTasks(planId);
  const { data: objectives = [] } = useObjectives(planId);
  const { data: role } = usePlanRole(planId);
  const userRole: OkrRole = role || "viewer";

  const createTask = useCreateTask(planId);
  const updateTask = useUpdateTask(planId);
  const deleteTask = useDeleteTask(planId);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; task: Task | null }>({
    open: false,
    task: null,
  });

  // Filter tasks
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const activeTasks = tasks.filter((t) => t.status !== "completed" && t.status !== "cancelled");
  
  const overdueTasks = activeTasks.filter((t) => {
    if (!t.due_date) return false;
    return new Date(t.due_date) < today;
  });

  const dueSoonTasks = activeTasks.filter((t) => {
    if (!t.due_date) return false;
    const dueDate = new Date(t.due_date);
    const daysUntil = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntil >= 0 && daysUntil <= 7;
  });

  const completedThisWeek = tasks.filter((t) => {
    if (t.status !== "completed" || !t.completed_at) return false;
    const completedDate = new Date(t.completed_at);
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    return completedDate >= weekAgo;
  });

  // Type that matches TaskDialog's onSubmit
  type TaskDialogData = Omit<TaskInsert, "plan_id"> | TaskUpdate;
  
  // Handlers
  async function handleCreate(data: TaskDialogData) {
    await createTask.mutateAsync(data as Omit<TaskInsert, "plan_id">);
  }

  async function handleUpdate(data: TaskDialogData) {
    if (!editingTask) return;
    await updateTask.mutateAsync({ 
      id: editingTask.id, 
      data: data as TaskUpdate,
    });
    setEditingTask(null);
  }

  async function handleStatusChange(task: Task, status: TaskStatus) {
    await updateTask.mutateAsync({ id: task.id, data: { status } });
  }

  async function handleDelete() {
    if (!deleteDialog.task) return;
    await deleteTask.mutateAsync(deleteDialog.task.id);
    setDeleteDialog({ open: false, task: null });
  }

  function openEdit(task: Task) {
    setEditingTask(task);
    setDialogOpen(true);
  }

  function openCreate() {
    setEditingTask(null);
    setDialogOpen(true);
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-text-muted">
          Loading tasks...
        </CardContent>
      </Card>
    );
  }

  // Summary view for plan overview page
  if (view === "summary") {
    return (
      <>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <ListTodo className="w-4 h-4 text-text-muted" />
              <CardTitle className="text-h5">Tasks</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              {(userRole === "owner" || userRole === "editor") && (
                <Button variant="ghost" size="sm" onClick={openCreate}>
                  <Plus className="w-4 h-4 mr-1" />
                  Add
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-3 rounded-button bg-bg-1/50">
                <p className="text-h4 font-bold text-text-strong">{activeTasks.length}</p>
                <p className="text-small text-text-muted">Active</p>
              </div>
              <div className="text-center p-3 rounded-button bg-status-danger/5">
                <p className="text-h4 font-bold text-status-danger">{overdueTasks.length}</p>
                <p className="text-small text-text-muted">Overdue</p>
              </div>
              <div className="text-center p-3 rounded-button bg-status-success/5">
                <p className="text-h4 font-bold text-status-success">{completedThisWeek.length}</p>
                <p className="text-small text-text-muted">Done (7d)</p>
              </div>
            </div>

            {/* Overdue Section */}
            {overdueTasks.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-status-danger" />
                  <h4 className="text-body-sm font-medium text-status-danger">Overdue</h4>
                </div>
                <div className="border border-status-danger/20 rounded-button overflow-hidden">
                  {overdueTasks.slice(0, 3).map((task) => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      role={userRole}
                      onStatusChange={(status) => handleStatusChange(task, status)}
                      onEdit={() => openEdit(task)}
                      onDelete={() => setDeleteDialog({ open: true, task })}
                    />
                  ))}
                </div>
                {overdueTasks.length > 3 && (
                  <p className="text-small text-text-muted mt-2 text-center">
                    +{overdueTasks.length - 3} more overdue
                  </p>
                )}
              </div>
            )}

            {/* Due Soon Section */}
            {dueSoonTasks.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-status-warning" />
                  <h4 className="text-body-sm font-medium text-text-strong">Due Soon</h4>
                </div>
                <div className="border border-border-soft rounded-button overflow-hidden">
                  {dueSoonTasks.slice(0, 5).map((task) => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      role={userRole}
                      onStatusChange={(status) => handleStatusChange(task, status)}
                      onEdit={() => openEdit(task)}
                      onDelete={() => setDeleteDialog({ open: true, task })}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Empty state */}
            {activeTasks.length === 0 && (
              <div className="text-center py-6">
                <ListTodo className="w-8 h-8 text-text-subtle mx-auto mb-2" />
                <p className="text-body-sm text-text-muted">No active tasks</p>
                {(userRole === "owner" || userRole === "editor") && (
                  <Button variant="ghost" size="sm" onClick={openCreate} className="mt-2">
                    <Plus className="w-4 h-4 mr-1" />
                    Create your first task
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Dialogs - Lazy loaded */}
        {dialogOpen && (
          <Suspense fallback={null}>
            <TaskDialog
              open={dialogOpen}
              onOpenChange={setDialogOpen}
              planId={planId}
              task={editingTask}
              objectives={objectives}
              onSubmit={editingTask ? handleUpdate : handleCreate}
            />
          </Suspense>
        )}

        <DeleteConfirmationDialog
          open={deleteDialog.open}
          onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}
          title="Delete Task"
          description="This action cannot be undone."
          itemName={deleteDialog.task?.title || ""}
          onConfirm={handleDelete}
        />
      </>
    );
  }

  // Full view (for dedicated tasks page if needed)
  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-heading text-h3 font-semibold text-text-strong">Tasks</h2>
            <p className="text-body-sm text-text-muted mt-1">
              {activeTasks.length} active · {overdueTasks.length} overdue · {completedThisWeek.length} completed this week
            </p>
          </div>
          {(userRole === "owner" || userRole === "editor") && (
            <Button onClick={openCreate}>
              <Plus className="w-4 h-4 mr-2" />
              Add Task
            </Button>
          )}
        </div>

        {/* Overdue */}
        {overdueTasks.length > 0 && (
          <Card className="border-status-danger/30">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-status-danger" />
                <CardTitle className="text-h5 text-status-danger">
                  Overdue ({overdueTasks.length})
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border-soft">
                {overdueTasks.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    role={userRole}
                    onStatusChange={(status) => handleStatusChange(task, status)}
                    onEdit={() => openEdit(task)}
                    onDelete={() => setDeleteDialog({ open: true, task })}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Due Soon */}
        {dueSoonTasks.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-status-warning" />
                <CardTitle className="text-h5">Due This Week ({dueSoonTasks.length})</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border-soft">
                {dueSoonTasks.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    role={userRole}
                    onStatusChange={(status) => handleStatusChange(task, status)}
                    onEdit={() => openEdit(task)}
                    onDelete={() => setDeleteDialog({ open: true, task })}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Other Active Tasks */}
        {activeTasks.filter((t) => !overdueTasks.includes(t) && !dueSoonTasks.includes(t)).length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-h5">Other Tasks</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border-soft">
                {activeTasks
                  .filter((t) => !overdueTasks.includes(t) && !dueSoonTasks.includes(t))
                  .map((task) => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      role={userRole}
                      onStatusChange={(status) => handleStatusChange(task, status)}
                      onEdit={() => openEdit(task)}
                      onDelete={() => setDeleteDialog({ open: true, task })}
                    />
                  ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {activeTasks.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <ListTodo className="w-12 h-12 text-text-subtle mx-auto mb-4" />
              <h3 className="font-heading text-h5 font-semibold text-text-strong mb-2">
                No tasks yet
              </h3>
              <p className="text-body-sm text-text-muted mb-4">
                Create tasks to track your progress and stay organized.
              </p>
              {(userRole === "owner" || userRole === "editor") && (
                <Button onClick={openCreate}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Task
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Dialogs - Lazy loaded */}
      {dialogOpen && (
        <Suspense fallback={null}>
          <TaskDialog
            open={dialogOpen}
            onOpenChange={setDialogOpen}
            planId={planId}
            task={editingTask}
            objectives={objectives}
            onSubmit={editingTask ? handleUpdate : handleCreate}
          />
        </Suspense>
      )}

      <DeleteConfirmationDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}
        title="Delete Task"
        description="This action cannot be undone."
        itemName={deleteDialog.task?.title || ""}
        onConfirm={handleDelete}
      />
    </>
  );
}
