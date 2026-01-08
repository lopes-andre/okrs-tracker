"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { TaskStatus, TaskPriority, Objective } from "@/lib/supabase/types";

export interface TaskFilterValues {
  status?: TaskStatus[];
  priority?: TaskPriority[];
  objective_id?: string;
  due_date_from?: string;
  due_date_to?: string;
}

interface TaskFiltersProps {
  filters: TaskFilterValues;
  onChange: (filters: TaskFilterValues) => void;
  objectives?: Objective[];
}

const statusOptions: { value: TaskStatus; label: string }[] = [
  { value: "pending", label: "To Do" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

const priorityOptions: { value: TaskPriority; label: string }[] = [
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

export function TaskFilters({ filters, onChange, objectives = [] }: TaskFiltersProps) {
  const hasFilters =
    (filters.status && filters.status.length > 0) ||
    (filters.priority && filters.priority.length > 0) ||
    filters.objective_id ||
    filters.due_date_from ||
    filters.due_date_to;

  function toggleStatus(status: TaskStatus) {
    const current = filters.status || [];
    const updated = current.includes(status)
      ? current.filter((s) => s !== status)
      : [...current, status];
    onChange({ ...filters, status: updated.length > 0 ? updated : undefined });
  }

  function togglePriority(priority: TaskPriority) {
    const current = filters.priority || [];
    const updated = current.includes(priority)
      ? current.filter((p) => p !== priority)
      : [...current, priority];
    onChange({ ...filters, priority: updated.length > 0 ? updated : undefined });
  }

  function clearFilters() {
    onChange({});
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {/* Status Filter */}
        <Select
          value=""
          onValueChange={(v) => v && toggleStatus(v as TaskStatus)}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {statusOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Priority Filter */}
        <Select
          value=""
          onValueChange={(v) => v && togglePriority(v as TaskPriority)}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            {priorityOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Objective Filter */}
        {objectives.length > 0 && (
          <Select
            value={filters.objective_id || ""}
            onValueChange={(v) => onChange({ ...filters, objective_id: v || undefined })}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Objective" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Objectives</SelectItem>
              {objectives.map((obj) => (
                <SelectItem key={obj.id} value={obj.id}>
                  {obj.code}: {obj.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Clear Filters */}
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="text-text-muted">
            <X className="w-4 h-4 mr-1" />
            Clear
          </Button>
        )}
      </div>

      {/* Active Filter Badges */}
      {hasFilters && (
        <div className="flex flex-wrap gap-2">
          {filters.status?.map((status) => (
            <Badge
              key={status}
              variant="secondary"
              className="cursor-pointer"
              onClick={() => toggleStatus(status)}
            >
              {statusOptions.find((o) => o.value === status)?.label}
              <X className="w-3 h-3 ml-1" />
            </Badge>
          ))}
          {filters.priority?.map((priority) => (
            <Badge
              key={priority}
              variant="secondary"
              className="cursor-pointer"
              onClick={() => togglePriority(priority)}
            >
              {priorityOptions.find((o) => o.value === priority)?.label}
              <X className="w-3 h-3 ml-1" />
            </Badge>
          ))}
          {filters.objective_id && (
            <Badge
              variant="secondary"
              className="cursor-pointer"
              onClick={() => onChange({ ...filters, objective_id: undefined })}
            >
              {objectives.find((o) => o.id === filters.objective_id)?.code || "Objective"}
              <X className="w-3 h-3 ml-1" />
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
