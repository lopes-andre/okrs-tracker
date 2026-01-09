"use client";

import { use, useState } from "react";
import Link from "next/link";
import {
  History,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Calendar,
  Target,
  Filter,
  Loader2,
  ArrowLeft,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/layout/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TaskRow } from "@/components/tasks/task-row";
import { DeleteConfirmationDialog } from "@/components/okr/delete-confirmation-dialog";
import {
  useCompletedTasksPaginated,
  useUpdateTask,
  useDeleteTask,
} from "@/features/tasks/hooks";
import { useObjectives } from "@/features/objectives/hooks";
import { usePlanRole } from "@/features/plans/hooks";
import type {
  TaskStatus,
  TaskWithDetails,
  TaskFilters,
  OkrRole,
} from "@/lib/supabase/types";
import { format, subDays, subMonths, startOfMonth, endOfMonth } from "date-fns";

export default function TasksLogbookPage({
  params,
}: {
  params: Promise<{ planId: string }>;
}) {
  const { planId } = use(params);

  // Pagination state
  const [page, setPage] = useState(1);
  const [limit] = useState(20);

  // Filter state
  const [showFilters, setShowFilters] = useState(false);
  const [dateRange, setDateRange] = useState<"all" | "7d" | "30d" | "month">("all");
  const [objectiveFilter, setObjectiveFilter] = useState<string>("");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  // Build filters
  const filters: Omit<TaskFilters, "status" | "listView"> = {};
  if (objectiveFilter) {
    filters.objective_id = objectiveFilter;
  }

  // Calculate date range
  let completedFrom: string | undefined;
  let completedTo: string | undefined;

  if (dateRange === "7d") {
    completedFrom = format(subDays(new Date(), 7), "yyyy-MM-dd");
  } else if (dateRange === "30d") {
    completedFrom = format(subDays(new Date(), 30), "yyyy-MM-dd");
  } else if (dateRange === "month") {
    completedFrom = format(startOfMonth(new Date()), "yyyy-MM-dd");
    completedTo = format(endOfMonth(new Date()), "yyyy-MM-dd");
  } else if (dateFrom) {
    completedFrom = dateFrom;
  }

  if (dateTo) {
    completedTo = dateTo;
  }

  // Add date filters (these filter by due_date, but we'll filter by completed_at in display)
  // For proper backend filtering, we'd need to add completed_at filter support
  // For now, using the API as-is

  // Data hooks
  const { data, isLoading, isFetching } = useCompletedTasksPaginated(
    planId,
    page,
    limit,
    filters
  );
  const { data: objectives = [] } = useObjectives(planId);
  const { data: role } = usePlanRole(planId);
  const userRole: OkrRole = role || "viewer";
  const canEdit = userRole === "owner" || userRole === "editor";

  // Mutations
  const updateTask = useUpdateTask(planId);
  const deleteTask = useDeleteTask(planId);

  // Delete dialog state
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    task: TaskWithDetails | null;
  }>({
    open: false,
    task: null,
  });

  // Extract data
  const completedTasks = data?.data || [];
  const totalCount = data?.count || 0;
  const totalPages = data?.totalPages || 1;
  const hasNextPage = data?.hasMore || false;

  // Handlers
  async function handleStatusChange(task: TaskWithDetails, status: TaskStatus) {
    await updateTask.mutateAsync({ id: task.id, data: { status } });
  }

  async function handleDelete() {
    if (!deleteDialog.task) return;
    await deleteTask.mutateAsync(deleteDialog.task.id);
    setDeleteDialog({ open: false, task: null });
  }

  // Group completed tasks by completion date
  const tasksByDate: Record<string, TaskWithDetails[]> = {};
  completedTasks.forEach((task) => {
    if (!task.completed_at) return;
    const dateKey = format(new Date(task.completed_at), "yyyy-MM-dd");
    if (!tasksByDate[dateKey]) {
      tasksByDate[dateKey] = [];
    }
    tasksByDate[dateKey].push(task);
  });

  const sortedDates = Object.keys(tasksByDate).sort(
    (a, b) => new Date(b).getTime() - new Date(a).getTime()
  );

  return (
    <>
      <PageHeader
        title="Tasks Logbook"
        description={`${totalCount} completed tasks`}
      >
        <Link href={`/plans/${planId}/tasks`}>
          <Button variant="secondary" className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Tasks
          </Button>
        </Link>
        <Button
          variant="secondary"
          onClick={() => setShowFilters(!showFilters)}
          className={showFilters ? "bg-bg-1" : ""}
        >
          <Filter className="w-4 h-4 mr-2" />
          Filter
        </Button>
      </PageHeader>

      {/* Filters */}
      {showFilters && (
        <Card className="mb-6">
          <CardContent className="pt-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Date Range Preset */}
              <div className="space-y-2">
                <Label>Time Period</Label>
                <Select
                  value={dateRange}
                  onValueChange={(v) => {
                    setDateRange(v as typeof dateRange);
                    if (v !== "all") {
                      setDateFrom("");
                      setDateTo("");
                    }
                    setPage(1);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="7d">Last 7 Days</SelectItem>
                    <SelectItem value="30d">Last 30 Days</SelectItem>
                    <SelectItem value="month">This Month</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Objective Filter */}
              <div className="space-y-2">
                <Label>Objective</Label>
                <Select
                  value={objectiveFilter || "all"}
                  onValueChange={(v) => {
                    setObjectiveFilter(v === "all" ? "" : v);
                    setPage(1);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Objectives" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Objectives</SelectItem>
                    {objectives.map((obj) => (
                      <SelectItem key={obj.id} value={obj.id}>
                        {obj.code}: {obj.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Custom Date From */}
              <div className="space-y-2">
                <Label>From Date</Label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => {
                    setDateFrom(e.target.value);
                    setDateRange("all");
                    setPage(1);
                  }}
                />
              </div>

              {/* Custom Date To */}
              <div className="space-y-2">
                <Label>To Date</Label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => {
                    setDateTo(e.target.value);
                    setDateRange("all");
                    setPage(1);
                  }}
                />
              </div>
            </div>

            {/* Clear Filters */}
            {(objectiveFilter || dateRange !== "all" || dateFrom || dateTo) && (
              <div className="mt-4 flex justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setObjectiveFilter("");
                    setDateRange("all");
                    setDateFrom("");
                    setDateTo("");
                    setPage(1);
                  }}
                >
                  Clear All Filters
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Content */}
      {isLoading ? (
        <Card>
          <CardContent className="py-12 flex justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-text-muted" />
          </CardContent>
        </Card>
      ) : completedTasks.length === 0 ? (
        <EmptyState
          icon={CheckCircle2}
          title="No completed tasks"
          description="Complete some tasks to see them here in your logbook."
          action={{
            label: "Go to Tasks",
            href: `/plans/${planId}/tasks`,
          }}
        />
      ) : (
        <div className="space-y-6">
          {/* Summary Stats */}
          <Card>
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-status-success" />
                    <span className="text-body font-medium">{totalCount} tasks completed</span>
                  </div>
                  {sortedDates.length > 0 && (
                    <div className="flex items-center gap-2 text-text-muted">
                      <Calendar className="w-4 h-4" />
                      <span className="text-body-sm">
                        From {format(new Date(sortedDates[sortedDates.length - 1]), "MMM d")} to{" "}
                        {format(new Date(sortedDates[0]), "MMM d, yyyy")}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tasks Grouped by Date */}
          {sortedDates.map((dateKey) => (
            <Card key={dateKey}>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-text-muted" />
                  <CardTitle className="text-h5">
                    {format(new Date(dateKey), "EEEE, MMMM d, yyyy")}
                  </CardTitle>
                  <Badge variant="secondary">{tasksByDate[dateKey].length}</Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-border-soft">
                  {tasksByDate[dateKey].map((task) => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      role={userRole}
                      onStatusChange={(status) => handleStatusChange(task, status)}
                      onEdit={() => {}} // No editing from logbook for now
                      onDelete={() => setDeleteDialog({ open: true, task })}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Pagination */}
          <Card>
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <p className="text-body-sm text-text-muted">
                  Showing {(page - 1) * limit + 1}-
                  {Math.min(page * limit, totalCount)} of {totalCount} completed tasks
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={page === 1 || isFetching}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Previous
                  </Button>
                  <span className="text-body-sm text-text-muted px-2">
                    Page {page} of {totalPages}
                  </span>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={!hasNextPage || isFetching}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Delete Dialog */}
      <DeleteConfirmationDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}
        title="Delete Task"
        description="This will permanently remove this completed task from your logbook."
        itemName={deleteDialog.task?.title || ""}
        onConfirm={handleDelete}
      />
    </>
  );
}
