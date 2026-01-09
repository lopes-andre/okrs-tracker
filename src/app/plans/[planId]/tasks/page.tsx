"use client";

import { use, useState, useMemo } from "react";
import Link from "next/link";
import {
  Plus,
  Clock,
  AlertTriangle,
  ListTodo,
  Target,
  LayoutList,
  Layers,
  CheckCircle2,
  CalendarDays,
  Lightbulb,
  History,
  Loader2,
  Calendar,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/layout/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TaskRow, TaskDialog, CollapsibleTaskList } from "@/components/tasks";
import { DeleteConfirmationDialog } from "@/components/okr/delete-confirmation-dialog";
import {
  useTasksGrouped,
  useRecentCompletedTasks,
  useCreateTask,
  useUpdateTask,
  useDeleteTask,
  useSetTaskTags,
} from "@/features/tasks/hooks";
import { useObjectives } from "@/features/objectives/hooks";
import { useAnnualKrs } from "@/features/annual-krs/hooks";
import { useTags, useCreateTag } from "@/features/tags/hooks";
import { usePlanRole } from "@/features/plans/hooks";
import type {
  TaskStatus,
  TaskInsert,
  TaskUpdate,
  TaskWithDetails,
  OkrRole,
} from "@/lib/supabase/types";
import { cn } from "@/lib/utils";

// Type for the stats card filter
type StatsFilter = "all" | "today" | "overdue" | "thisWeek" | "completed";

export default function TasksPage({
  params,
}: {
  params: Promise<{ planId: string }>;
}) {
  const { planId } = use(params);

  // Data hooks
  const { data: groupedTasks, isLoading } = useTasksGrouped(planId);
  const { data: recentCompleted = [], isLoading: isLoadingCompleted } =
    useRecentCompletedTasks(planId, 10);
  const { data: objectives = [] } = useObjectives(planId);
  const { data: annualKrs = [] } = useAnnualKrs(planId);
  const { data: tags = [] } = useTags(planId);
  const { data: role } = usePlanRole(planId);
  const userRole: OkrRole = role || "viewer";
  const canEdit = userRole === "owner" || userRole === "editor";

  // Mutations
  const createTask = useCreateTask(planId);
  const updateTask = useUpdateTask(planId);
  const deleteTask = useDeleteTask(planId);
  const setTaskTags = useSetTaskTags(planId);
  const createTag = useCreateTag(planId);

  // UI State
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskWithDetails | null>(null);
  const [editingTaskTags, setEditingTaskTags] = useState<string[]>([]);
  const [editingObjectiveId, setEditingObjectiveId] = useState<string>("");
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    task: TaskWithDetails | null;
  }>({
    open: false,
    task: null,
  });
  const [activeFilter, setActiveFilter] = useState<StatsFilter>("all");
  const [activeView, setActiveView] = useState<"list" | "grouped">("list");

  // Stats from grouped data
  const counts = groupedTasks?.counts || {
    active: 0,
    today: 0,
    overdue: 0,
    thisWeek: 0,
    thisMonth: 0,
    backlog: 0,
    completed: 0,
  };

  // Task lists
  const todayTasks = groupedTasks?.today || [];
  const overdueTasks = groupedTasks?.overdue || [];
  const thisWeekTasks = groupedTasks?.thisWeek || [];
  const thisMonthTasks = groupedTasks?.thisMonth || [];
  const backlogTasks = groupedTasks?.backlog || [];

  // All active tasks for grouping
  const allActiveTasks = useMemo(() => {
    if (!groupedTasks) return [];
    return [
      ...todayTasks,
      ...overdueTasks,
      ...thisWeekTasks,
      ...thisMonthTasks,
      ...backlogTasks,
    ];
  }, [groupedTasks, todayTasks, overdueTasks, thisWeekTasks, thisMonthTasks, backlogTasks]);

  // Group tasks by objective for "By Objective" view
  // Also consider tasks linked via annual_kr
  const tasksByObjective = useMemo(() => {
    const grouped: Record<
      string,
      { objective: (typeof objectives)[0] | null; tasks: TaskWithDetails[] }
    > = {};

    grouped["none"] = { objective: null, tasks: [] };
    objectives.forEach((obj) => {
      grouped[obj.id] = { objective: obj, tasks: [] };
    });

    allActiveTasks.forEach((task) => {
      // Check if task is linked via objective_id
      if (task.objective_id && grouped[task.objective_id]) {
        grouped[task.objective_id].tasks.push(task);
        return;
      }
      
      // Check if task is linked via annual_kr_id - find the objective
      if (task.annual_kr_id) {
        const kr = annualKrs.find((k) => k.id === task.annual_kr_id);
        if (kr && grouped[kr.objective_id]) {
          grouped[kr.objective_id].tasks.push(task);
          return;
        }
      }
      
      // Otherwise, unassigned
      grouped["none"].tasks.push(task);
    });

    return grouped;
  }, [allActiveTasks, objectives, annualKrs]);

  // Handlers
  type TaskDialogData = Omit<TaskInsert, "plan_id"> | TaskUpdate;

  async function handleCreate(data: TaskDialogData, tagIds: string[]) {
    const newTask = await createTask.mutateAsync(
      data as Omit<TaskInsert, "plan_id">
    );
    if (tagIds.length > 0) {
      await setTaskTags.mutateAsync({ taskId: newTask.id, tagIds });
    }
  }

  async function handleUpdate(data: TaskDialogData, tagIds: string[]) {
    if (!editingTask) return;
    await updateTask.mutateAsync({
      id: editingTask.id,
      data: data as TaskUpdate,
    });
    await setTaskTags.mutateAsync({ taskId: editingTask.id, tagIds });
    setEditingTask(null);
  }

  async function handleStatusChange(task: TaskWithDetails, status: TaskStatus) {
    await updateTask.mutateAsync({ id: task.id, data: { status } });
  }

  async function handleDelete() {
    if (!deleteDialog.task) return;
    await deleteTask.mutateAsync(deleteDialog.task.id);
    setDeleteDialog({ open: false, task: null });
  }

  async function handleCreateTag(name: string) {
    return createTag.mutateAsync({ name, kind: "custom", color: null });
  }

  function openEdit(task: TaskWithDetails) {
    setEditingTask(task);
    setEditingTaskTags(task.tags?.map((t) => t.id) || []);
    
    // Fix: When task has annual_kr_id, find its objective
    if (task.annual_kr_id && !task.objective_id) {
      const kr = annualKrs.find((k) => k.id === task.annual_kr_id);
      if (kr) {
        setEditingObjectiveId(kr.objective_id);
      } else {
        setEditingObjectiveId("");
      }
    } else {
      setEditingObjectiveId(task.objective_id || "");
    }
    
    setDialogOpen(true);
  }

  function openCreate() {
    setEditingTask(null);
    setEditingTaskTags([]);
    setEditingObjectiveId("");
    setDialogOpen(true);
  }

  // Filter click handler for stats cards
  function handleStatsClick(filter: StatsFilter) {
    setActiveFilter(filter === activeFilter ? "all" : filter);
  }

  // Determine which sections to show based on filter
  const showToday = activeFilter === "all" || activeFilter === "today";
  const showOverdue = activeFilter === "all" || activeFilter === "overdue";
  const showThisWeek = activeFilter === "all" || activeFilter === "thisWeek";
  const showThisMonth = activeFilter === "all";
  const showBacklog = activeFilter === "all";
  const showCompleted = activeFilter === "all" || activeFilter === "completed";

  // Render task function for CollapsibleTaskList
  function renderTask(
    task: TaskWithDetails,
    handlers: {
      onStatusChange: (status: TaskStatus) => void;
      onEdit: () => void;
      onDelete: () => void;
    }
  ) {
    return (
      <TaskRow
        key={task.id}
        task={task}
        role={userRole}
        onStatusChange={handlers.onStatusChange}
        onEdit={handlers.onEdit}
        onDelete={handlers.onDelete}
      />
    );
  }

  return (
    <>
      <PageHeader
        title="Tasks"
        description={`Manage your deliverables and action items`}
      >
        <Link href={`/plans/${planId}/tasks/logbook`}>
          <Button variant="secondary" className="gap-2">
            <History className="w-4 h-4" />
            Logbook
          </Button>
        </Link>
        {canEdit && (
          <Button onClick={openCreate}>
            <Plus className="w-4 h-4 mr-2" />
            Add Task
          </Button>
        )}
      </PageHeader>

      {/* Stats Cards - Clickable Filters */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <Card
          className={cn(
            "cursor-pointer transition-all hover:border-accent/50",
            activeFilter === "all" && "ring-2 ring-accent/30"
          )}
          onClick={() => handleStatsClick("all")}
        >
          <CardContent className="pt-4 text-center">
            <ListTodo className="w-5 h-5 mx-auto mb-1 text-text-muted" />
            <p className="text-h4 font-bold text-text-strong">{counts.active}</p>
            <p className="text-small text-text-muted">Active</p>
          </CardContent>
        </Card>

        <Card
          className={cn(
            "cursor-pointer transition-all hover:border-status-info/50",
            counts.today > 0 && "border-status-info/30",
            activeFilter === "today" && "ring-2 ring-status-info/30"
          )}
          onClick={() => handleStatsClick("today")}
        >
          <CardContent className="pt-4 text-center">
            <Calendar className="w-5 h-5 mx-auto mb-1 text-status-info" />
            <p className="text-h4 font-bold text-status-info">{counts.today}</p>
            <p className="text-small text-text-muted">Today</p>
          </CardContent>
        </Card>

        <Card
          className={cn(
            "cursor-pointer transition-all hover:border-status-danger/50",
            counts.overdue > 0 && "border-status-danger/30",
            activeFilter === "overdue" && "ring-2 ring-status-danger/30"
          )}
          onClick={() => handleStatsClick("overdue")}
        >
          <CardContent className="pt-4 text-center">
            <AlertTriangle className="w-5 h-5 mx-auto mb-1 text-status-danger" />
            <p
              className={cn(
                "text-h4 font-bold",
                counts.overdue > 0 ? "text-status-danger" : "text-text-strong"
              )}
            >
              {counts.overdue}
            </p>
            <p className="text-small text-text-muted">Overdue</p>
          </CardContent>
        </Card>

        <Card
          className={cn(
            "cursor-pointer transition-all hover:border-status-warning/50",
            activeFilter === "thisWeek" && "ring-2 ring-status-warning/30"
          )}
          onClick={() => handleStatsClick("thisWeek")}
        >
          <CardContent className="pt-4 text-center">
            <Clock className="w-5 h-5 mx-auto mb-1 text-status-warning" />
            <p className="text-h4 font-bold text-status-warning">
              {counts.thisWeek}
            </p>
            <p className="text-small text-text-muted">This Week</p>
          </CardContent>
        </Card>

        <Card
          className={cn(
            "cursor-pointer transition-all hover:border-status-success/50",
            activeFilter === "completed" && "ring-2 ring-status-success/30"
          )}
          onClick={() => handleStatsClick("completed")}
        >
          <CardContent className="pt-4 text-center">
            <CheckCircle2 className="w-5 h-5 mx-auto mb-1 text-status-success" />
            <p className="text-h4 font-bold text-status-success">
              {counts.completed}
            </p>
            <p className="text-small text-text-muted">Completed</p>
          </CardContent>
        </Card>
      </div>

      {/* Active Filter Badge */}
      {activeFilter !== "all" && (
        <div className="flex items-center gap-2 mb-4">
          <span className="text-small text-text-muted">Showing:</span>
          <Badge
            variant={
              activeFilter === "today"
                ? "info"
                : activeFilter === "overdue"
                ? "danger"
                : activeFilter === "thisWeek"
                ? "warning"
                : "success"
            }
            className="cursor-pointer"
            onClick={() => setActiveFilter("all")}
          >
            {activeFilter === "today"
              ? "Due Today"
              : activeFilter === "overdue"
              ? "Overdue Tasks"
              : activeFilter === "thisWeek"
              ? "Due This Week"
              : "Completed Tasks"}
            <span className="ml-1">×</span>
          </Badge>
        </div>
      )}

      {/* View Tabs */}
      <Tabs
        value={activeView}
        onValueChange={(v) => setActiveView(v as "list" | "grouped")}
        className="space-y-4"
      >
        <TabsList>
          <TabsTrigger value="list" className="gap-2">
            <LayoutList className="w-4 h-4" />
            Timeline View
          </TabsTrigger>
          <TabsTrigger value="grouped" className="gap-2">
            <Layers className="w-4 h-4" />
            By Objective
          </TabsTrigger>
        </TabsList>

        {/* Timeline (List) View */}
        <TabsContent value="list" className="space-y-4">
          {isLoading ? (
            <Card>
              <CardContent className="py-12 flex justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-text-muted" />
              </CardContent>
            </Card>
          ) : counts.active === 0 && counts.completed === 0 ? (
            <EmptyState
              icon={ListTodo}
              title="No tasks yet"
              description={
                canEdit
                  ? "Create tasks to track your progress and stay organized."
                  : "No tasks have been created for this plan yet."
              }
              action={
                canEdit
                  ? { label: "Create Task", onClick: openCreate }
                  : undefined
              }
            />
          ) : (
            <>
              {/* Today - Blue, prominent, first */}
              {showToday && (
                <CollapsibleTaskList
                  title="Today"
                  count={counts.today}
                  tasks={todayTasks}
                  icon={<Calendar className="w-4 h-4 text-status-info" />}
                  variant="accent"
                  defaultExpanded={true}
                  role={userRole}
                  onStatusChange={handleStatusChange}
                  onEdit={openEdit}
                  onDelete={(task) => setDeleteDialog({ open: true, task })}
                  renderTask={renderTask}
                  emptyMessage="No tasks due today"
                />
              )}

              {/* Overdue */}
              {showOverdue && (
                <CollapsibleTaskList
                  title="Overdue"
                  count={counts.overdue}
                  tasks={overdueTasks}
                  icon={<AlertTriangle className="w-4 h-4 text-status-danger" />}
                  variant="danger"
                  defaultExpanded={true}
                  role={userRole}
                  onStatusChange={handleStatusChange}
                  onEdit={openEdit}
                  onDelete={(task) => setDeleteDialog({ open: true, task })}
                  renderTask={renderTask}
                  emptyMessage="No overdue tasks"
                />
              )}

              {/* This Week */}
              {showThisWeek && (
                <CollapsibleTaskList
                  title="This Week"
                  count={counts.thisWeek}
                  tasks={thisWeekTasks}
                  icon={<Clock className="w-4 h-4 text-status-warning" />}
                  variant="warning"
                  defaultExpanded={true}
                  role={userRole}
                  onStatusChange={handleStatusChange}
                  onEdit={openEdit}
                  onDelete={(task) => setDeleteDialog({ open: true, task })}
                  renderTask={renderTask}
                  emptyMessage="No tasks due later this week"
                />
              )}

              {/* This Month */}
              {showThisMonth && (
                <CollapsibleTaskList
                  title="This Month"
                  count={counts.thisMonth}
                  tasks={thisMonthTasks}
                  icon={<CalendarDays className="w-4 h-4 text-text-muted" />}
                  variant="default"
                  defaultExpanded={false}
                  role={userRole}
                  onStatusChange={handleStatusChange}
                  onEdit={openEdit}
                  onDelete={(task) => setDeleteDialog({ open: true, task })}
                  renderTask={renderTask}
                  emptyMessage="No tasks due later this month"
                />
              )}

              {/* Ideas Backlog (no due date + future) */}
              {showBacklog && (
                <CollapsibleTaskList
                  title="Ideas Backlog"
                  count={counts.backlog}
                  tasks={backlogTasks}
                  icon={<Lightbulb className="w-4 h-4 text-text-subtle" />}
                  variant="muted"
                  defaultExpanded={false}
                  role={userRole}
                  onStatusChange={handleStatusChange}
                  onEdit={openEdit}
                  onDelete={(task) => setDeleteDialog({ open: true, task })}
                  renderTask={renderTask}
                  emptyMessage="No tasks in backlog"
                />
              )}

              {/* Completed (recent only, link to logbook) */}
              {showCompleted && (
                <Card className="opacity-80">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-status-success" />
                        <CardTitle className="text-h5 text-text-muted">
                          Recently Completed
                        </CardTitle>
                        <Badge variant="success">{counts.completed}</Badge>
                      </div>
                      <Link href={`/plans/${planId}/tasks/logbook`}>
                        <Button variant="ghost" size="sm" className="gap-1">
                          View All
                          <History className="w-4 h-4" />
                        </Button>
                      </Link>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    {isLoadingCompleted ? (
                      <div className="py-6 flex justify-center">
                        <Loader2 className="w-6 h-6 animate-spin text-text-muted" />
                      </div>
                    ) : recentCompleted.length === 0 ? (
                      <p className="py-6 text-center text-body-sm text-text-muted">
                        No completed tasks yet
                      </p>
                    ) : (
                      <div className="divide-y divide-border-soft">
                        {recentCompleted.map((task) => (
                          <TaskRow
                            key={task.id}
                            task={task}
                            role={userRole}
                            onStatusChange={(status) =>
                              handleStatusChange(task, status)
                            }
                            onEdit={() => openEdit(task)}
                            onDelete={() =>
                              setDeleteDialog({ open: true, task })
                            }
                          />
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>

        {/* Grouped by Objective View */}
        <TabsContent value="grouped" className="space-y-4">
          {isLoading ? (
            <Card>
              <CardContent className="py-12 flex justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-text-muted" />
              </CardContent>
            </Card>
          ) : (
            <>
              {Object.entries(tasksByObjective)
                .filter(([, group]) => group.tasks.length > 0)
                .sort(([keyA], [keyB]) => {
                  if (keyA === "none") return 1;
                  if (keyB === "none") return -1;
                  return 0;
                })
                .map(([key, group]) => (
                  <CollapsibleTaskList
                    key={key}
                    title={
                      group.objective
                        ? `${group.objective.code}: ${group.objective.name}`
                        : "Unassigned Tasks"
                    }
                    count={group.tasks.length}
                    tasks={group.tasks}
                    icon={<Target className="w-4 h-4 text-text-muted" />}
                    variant="default"
                    defaultExpanded={true}
                    role={userRole}
                    onStatusChange={handleStatusChange}
                    onEdit={openEdit}
                    onDelete={(task) => setDeleteDialog({ open: true, task })}
                    renderTask={renderTask}
                  />
                ))}

              {Object.values(tasksByObjective).every(
                (g) => g.tasks.length === 0
              ) && (
                <EmptyState
                  icon={ListTodo}
                  title="No active tasks"
                  description="Create tasks to track your progress on objectives."
                  action={
                    canEdit
                      ? { label: "Create Task", onClick: openCreate }
                      : undefined
                  }
                />
              )}
            </>
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
        annualKrs={annualKrs}
        tags={tags}
        selectedTags={editingTaskTags}
        initialObjectiveId={editingObjectiveId}
        onSubmit={editingTask ? handleUpdate : handleCreate}
        onCreateTag={handleCreateTag}
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
