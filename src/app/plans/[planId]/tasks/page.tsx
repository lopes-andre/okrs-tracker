"use client";

import { use, useState, useMemo } from "react";
import {
  Plus,
  Clock,
  AlertTriangle,
  ListTodo,
  Target,
  Filter,
  LayoutList,
  Layers,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TaskRow } from "@/components/tasks/task-row";
import { TaskDialog } from "@/components/tasks/task-dialog";
import { TaskFilters, type TaskFilterValues } from "@/components/tasks/task-filters";
import { DeleteConfirmationDialog } from "@/components/okr/delete-confirmation-dialog";
import {
  useTasks,
  useCreateTask,
  useUpdateTask,
  useDeleteTask,
} from "@/features/tasks/hooks";
import { useObjectives } from "@/features/objectives/hooks";
import { useAnnualKrs } from "@/features/annual-krs/hooks";
import { usePlanRole } from "@/features/plans/hooks";
import type { Task, TaskStatus, TaskInsert, TaskUpdate, OkrRole } from "@/lib/supabase/types";

export default function TasksPage({
  params,
}: {
  params: Promise<{ planId: string }>;
}) {
  const { planId } = use(params);

  const { data: tasks = [], isLoading } = useTasks(planId);
  const { data: objectives = [] } = useObjectives(planId);
  // annualKrs available for future "By KR" grouping enhancements
  const { data: _annualKrs = [] } = useAnnualKrs(planId);
  const { data: role } = usePlanRole(planId);
  const userRole: OkrRole = role || "viewer";
  const canEdit = userRole === "owner" || userRole === "editor";

  const createTask = useCreateTask(planId);
  const updateTask = useUpdateTask(planId);
  const deleteTask = useDeleteTask(planId);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; task: Task | null }>({
    open: false,
    task: null,
  });

  // Filter state
  const [filters, setFilters] = useState<TaskFilterValues>({});
  const [showFilters, setShowFilters] = useState(false);
  const [activeView, setActiveView] = useState<"list" | "grouped">("list");

  // Date calculations
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Apply filters to tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (filters.status && filters.status.length > 0) {
        if (!filters.status.includes(task.status)) return false;
      }
      if (filters.priority && filters.priority.length > 0) {
        if (!filters.priority.includes(task.priority)) return false;
      }
      if (filters.objective_id) {
        if (task.objective_id !== filters.objective_id) return false;
      }
      if (filters.due_date_from) {
        if (!task.due_date || new Date(task.due_date) < new Date(filters.due_date_from)) return false;
      }
      if (filters.due_date_to) {
        if (!task.due_date || new Date(task.due_date) > new Date(filters.due_date_to)) return false;
      }
      return true;
    });
  }, [tasks, filters]);

  // Categorize tasks
  const activeTasks = filteredTasks.filter((t) => t.status !== "completed" && t.status !== "cancelled");
  
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

  const completedTasks = filteredTasks.filter((t) => t.status === "completed");

  // Group tasks by objective
  const tasksByObjective = useMemo(() => {
    const grouped: Record<string, { objective: typeof objectives[0] | null; tasks: Task[] }> = {};
    
    // Add "No Objective" group
    grouped["none"] = { objective: null, tasks: [] };
    
    // Add groups for each objective
    objectives.forEach((obj) => {
      grouped[obj.id] = { objective: obj, tasks: [] };
    });

    // Distribute tasks
    activeTasks.forEach((task) => {
      const key = task.objective_id || "none";
      if (grouped[key]) {
        grouped[key].tasks.push(task);
      } else {
        grouped["none"].tasks.push(task);
      }
    });

    return grouped;
  }, [activeTasks, objectives]);

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

  return (
    <>
      <PageHeader
        title="Tasks"
        description={`${activeTasks.length} active tasks · ${overdueTasks.length} overdue`}
      >
        <Button
          variant="secondary"
          onClick={() => setShowFilters(!showFilters)}
          className={showFilters ? "bg-bg-1" : ""}
        >
          <Filter className="w-4 h-4 mr-2" />
          Filter
        </Button>
        {canEdit && (
          <Button onClick={openCreate}>
            <Plus className="w-4 h-4 mr-2" />
            Add Task
          </Button>
        )}
      </PageHeader>

      {/* Filters */}
      {showFilters && (
        <Card className="mb-6">
          <CardContent className="pt-4">
            <TaskFilters
              filters={filters}
              onChange={setFilters}
              objectives={objectives}
            />
          </CardContent>
        </Card>
      )}

      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-h4 font-bold text-text-strong">{activeTasks.length}</p>
            <p className="text-small text-text-muted">Active</p>
          </CardContent>
        </Card>
        <Card className={overdueTasks.length > 0 ? "border-status-danger/30" : ""}>
          <CardContent className="pt-4 text-center">
            <p className={`text-h4 font-bold ${overdueTasks.length > 0 ? "text-status-danger" : "text-text-strong"}`}>
              {overdueTasks.length}
            </p>
            <p className="text-small text-text-muted">Overdue</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-h4 font-bold text-status-warning">{dueSoonTasks.length}</p>
            <p className="text-small text-text-muted">Due Soon</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-h4 font-bold text-status-success">{completedTasks.length}</p>
            <p className="text-small text-text-muted">Completed</p>
          </CardContent>
        </Card>
      </div>

      {/* View Tabs */}
      <Tabs value={activeView} onValueChange={(v) => setActiveView(v as "list" | "grouped")} className="space-y-4">
        <TabsList>
          <TabsTrigger value="list" className="gap-2">
            <LayoutList className="w-4 h-4" />
            List View
          </TabsTrigger>
          <TabsTrigger value="grouped" className="gap-2">
            <Layers className="w-4 h-4" />
            By Objective
          </TabsTrigger>
        </TabsList>

        {/* List View */}
        <TabsContent value="list" className="space-y-6">
          {isLoading ? (
            <Card>
              <CardContent className="py-8 text-center text-text-muted">
                Loading tasks...
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Overdue Section */}
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

              {/* Due Soon Section */}
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

              {/* Completed Tasks (collapsed) */}
              {completedTasks.length > 0 && (
                <Card className="opacity-70">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-h5 text-text-muted">
                      Completed ({completedTasks.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="divide-y divide-border-soft">
                      {completedTasks.slice(0, 5).map((task) => (
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
                    {completedTasks.length > 5 && (
                      <p className="text-small text-text-muted text-center py-3">
                        +{completedTasks.length - 5} more completed
                      </p>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Empty State */}
              {activeTasks.length === 0 && completedTasks.length === 0 && (
                <Card>
                  <CardContent className="py-12 text-center">
                    <ListTodo className="w-12 h-12 text-text-subtle mx-auto mb-4" />
                    <h3 className="font-heading text-h5 font-semibold text-text-strong mb-2">
                      No tasks yet
                    </h3>
                    <p className="text-body-sm text-text-muted mb-4">
                      Create tasks to track your progress and stay organized.
                    </p>
                    {canEdit && (
                      <Button onClick={openCreate}>
                        <Plus className="w-4 h-4 mr-2" />
                        Create Task
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>

        {/* Grouped by Objective View */}
        <TabsContent value="grouped" className="space-y-6">
          {Object.entries(tasksByObjective)
            .filter(([, group]) => group.tasks.length > 0)
            .sort(([keyA], [keyB]) => {
              // Put "none" at the end
              if (keyA === "none") return 1;
              if (keyB === "none") return -1;
              return 0;
            })
            .map(([key, group]) => (
              <Card key={key}>
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-text-muted" />
                    <CardTitle className="text-h5">
                      {group.objective ? (
                        <>
                          {group.objective.code}: {group.objective.name}
                        </>
                      ) : (
                        "No Objective"
                      )}
                    </CardTitle>
                    <Badge variant="secondary">{group.tasks.length}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-border-soft">
                    {group.tasks.map((task) => (
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
            ))}

          {Object.values(tasksByObjective).every((g) => g.tasks.length === 0) && (
            <Card>
              <CardContent className="py-12 text-center">
                <ListTodo className="w-12 h-12 text-text-subtle mx-auto mb-4" />
                <h3 className="font-heading text-h5 font-semibold text-text-strong mb-2">
                  No active tasks
                </h3>
                <p className="text-body-sm text-text-muted mb-4">
                  Create tasks to track your progress on objectives.
                </p>
                {canEdit && (
                  <Button onClick={openCreate}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Task
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <TaskDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        planId={planId}
        task={editingTask}
        objectives={objectives}
        onSubmit={editingTask ? handleUpdate : handleCreate}
      />

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
