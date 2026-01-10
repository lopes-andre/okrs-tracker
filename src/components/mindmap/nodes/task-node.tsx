"use client";

import { memo } from "react";
import { type NodeProps } from "@xyflow/react";
import { Circle, Clock, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { BaseNodeWrapper } from "./base-node";
import type { TaskNodeData } from "../types";
import { NODE_DIMENSIONS } from "../types";
import { cn } from "@/lib/utils";

const STATUS_CONFIG = {
  not_started: { icon: Circle, className: "text-text-muted" },
  in_progress: { icon: Clock, className: "text-accent" },
  completed: { icon: CheckCircle2, className: "text-status-success" },
  cancelled: { icon: XCircle, className: "text-text-subtle" },
};

const PRIORITY_STYLES = {
  low: "border-l-text-muted",
  medium: "border-l-accent",
  high: "border-l-status-warning",
  urgent: "border-l-status-danger",
};

function TaskNodeComponent({ data, selected }: NodeProps<TaskNodeData>) {
  const { icon: StatusIcon, className: statusClassName } = STATUS_CONFIG[data.status];

  return (
    <BaseNodeWrapper
      nodeType="task"
      isSelected={selected}
      showSourceHandle={false}
      className={cn("relative border-l-2", PRIORITY_STYLES[data.priority])}
      style={{ width: NODE_DIMENSIONS.task.width }}
    >
      <div className="p-2">
        <div className="flex items-center gap-2">
          <StatusIcon className={cn("w-3 h-3 shrink-0", statusClassName)} />
          <span
            className={cn(
              "text-[10px] truncate",
              data.status === "completed" && "line-through text-text-muted",
              data.status === "cancelled" && "line-through text-text-subtle"
            )}
          >
            {data.label}
          </span>
        </div>
        {data.dueDate && data.status !== "completed" && (
          <div className="flex items-center gap-1 mt-1 ml-5">
            <Clock className="w-2.5 h-2.5 text-text-subtle" />
            <span className="text-[8px] text-text-subtle">
              {new Date(data.dueDate).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}
            </span>
          </div>
        )}
      </div>
    </BaseNodeWrapper>
  );
}

export const TaskNode = memo(TaskNodeComponent);
