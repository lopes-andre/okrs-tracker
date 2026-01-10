"use client";

import { 
  X, 
  Target, 
  Bullseye, 
  TrendingUp,
  Calendar,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { MindmapNodeData, PlanNodeData, ObjectiveNodeData, KrNodeData, QuarterNodeData, TaskNodeData } from "./types";
import { PaceBadge, NodeProgressBar } from "./nodes/base-node";

interface NodeDetailPanelProps {
  nodeData: MindmapNodeData | null;
  onClose: () => void;
  onNavigate?: (entityType: string, entityId: string) => void;
}

export function NodeDetailPanel({ nodeData, onClose, onNavigate }: NodeDetailPanelProps) {
  if (!nodeData) return null;

  const handleNavigate = () => {
    if (onNavigate) {
      onNavigate(nodeData.type, nodeData.entityId);
    }
  };

  return (
    <div className="absolute bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 bg-bg-0 border border-border-soft rounded-card shadow-lg z-50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-border-soft bg-bg-1/30">
        <div className="flex items-center gap-2">
          <NodeTypeIcon type={nodeData.type} />
          <span className="text-xs font-medium text-text-muted uppercase tracking-wide">
            {nodeData.type}
          </span>
        </div>
        <Button variant="ghost" size="icon-sm" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-heading font-semibold text-body text-text-strong mb-2 line-clamp-2">
          {nodeData.label}
        </h3>

        {nodeData.description && (
          <p className="text-small text-text-muted mb-3 line-clamp-3">
            {nodeData.description}
          </p>
        )}

        {/* Progress Section */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-text-muted">Progress</span>
            <div className="flex items-center gap-2">
              <span className="text-small font-medium text-text-strong">
                {Math.round(nodeData.progress * 100)}%
              </span>
              <PaceBadge status={nodeData.paceStatus} size="sm" />
            </div>
          </div>
          <NodeProgressBar 
            progress={nodeData.progress} 
            paceStatus={nodeData.paceStatus} 
            size="md" 
          />
        </div>

        {/* Type-specific details */}
        <NodeTypeDetails nodeData={nodeData} />

        {/* Navigate button */}
        {onNavigate && (
          <Button 
            variant="secondary" 
            size="sm" 
            className="w-full mt-4 gap-2"
            onClick={handleNavigate}
          >
            View Details
            <ExternalLink className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

function NodeTypeIcon({ type }: { type: string }) {
  const icons: Record<string, typeof Target> = {
    plan: Target,
    objective: Bullseye,
    kr: TrendingUp,
    quarter: Calendar,
    task: CheckCircle2,
  };
  const Icon = icons[type] || Target;
  
  return (
    <div className="w-6 h-6 rounded bg-accent/10 flex items-center justify-center">
      <Icon className="w-3.5 h-3.5 text-accent" />
    </div>
  );
}

function NodeTypeDetails({ nodeData }: { nodeData: MindmapNodeData }) {
  switch (nodeData.type) {
    case "plan":
      return <PlanDetails data={nodeData} />;
    case "objective":
      return <ObjectiveDetails data={nodeData} />;
    case "kr":
      return <KrDetails data={nodeData} />;
    case "quarter":
      return <QuarterDetails data={nodeData} />;
    case "task":
      return <TaskDetails data={nodeData} />;
    default:
      return null;
  }
}

function PlanDetails({ data }: { data: PlanNodeData }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="bg-bg-1/50 rounded-card p-2.5">
        <div className="text-lg font-bold font-heading text-text-strong">
          {data.objectivesCount}
        </div>
        <div className="text-[10px] text-text-muted">Objectives</div>
      </div>
      <div className="bg-bg-1/50 rounded-card p-2.5">
        <div className="text-lg font-bold font-heading text-text-strong">
          {data.krsCount}
        </div>
        <div className="text-[10px] text-text-muted">Key Results</div>
      </div>
    </div>
  );
}

function ObjectiveDetails({ data }: { data: ObjectiveNodeData }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-xs">
        <span className="px-2 py-0.5 bg-bg-1 rounded text-text-muted font-medium">
          {data.code}
        </span>
      </div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-text-muted">KRs Completed</span>
        <span className="font-medium text-text-strong">
          {data.krsCompleted} / {data.krsCount}
        </span>
      </div>
    </div>
  );
}

function KrDetails({ data }: { data: KrNodeData }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-xs">
        <span className="px-2 py-0.5 bg-bg-1 rounded text-text-muted capitalize">
          {data.krType}
        </span>
        <span className={cn(
          "px-2 py-0.5 rounded text-[10px]",
          data.direction === "increase" && "bg-status-success/10 text-status-success",
          data.direction === "decrease" && "bg-status-danger/10 text-status-danger",
          data.direction === "maintain" && "bg-accent/10 text-accent"
        )}>
          {data.direction === "increase" ? "↑" : data.direction === "decrease" ? "↓" : "→"} {data.direction}
        </span>
      </div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-text-muted">Current Value</span>
        <span className="font-medium text-text-strong">
          {data.currentValue.toLocaleString()}{data.unit && ` ${data.unit}`}
        </span>
      </div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-text-muted">Target</span>
        <span className="font-medium text-text-strong">
          {data.targetValue.toLocaleString()}{data.unit && ` ${data.unit}`}
        </span>
      </div>
    </div>
  );
}

function QuarterDetails({ data }: { data: QuarterNodeData }) {
  const statusLabels = {
    upcoming: "Upcoming",
    active: "In Progress",
    completed: "Completed",
    failed: "Failed",
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-xs">
        <span className={cn(
          "px-2 py-0.5 rounded",
          data.status === "completed" && "bg-status-success/10 text-status-success",
          data.status === "active" && "bg-accent/10 text-accent",
          data.status === "failed" && "bg-status-danger/10 text-status-danger",
          data.status === "upcoming" && "bg-bg-1 text-text-muted"
        )}>
          {statusLabels[data.status]}
        </span>
      </div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-text-muted">Target Value</span>
        <span className="font-medium text-text-strong">
          {data.targetValue.toLocaleString()}
        </span>
      </div>
    </div>
  );
}

function TaskDetails({ data }: { data: TaskNodeData }) {
  const statusLabels = {
    not_started: "Not Started",
    in_progress: "In Progress",
    completed: "Completed",
    cancelled: "Cancelled",
  };

  const priorityStyles = {
    low: "bg-bg-1 text-text-muted",
    medium: "bg-accent/10 text-accent",
    high: "bg-status-warning/10 text-status-warning",
    urgent: "bg-status-danger/10 text-status-danger",
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-xs">
        <span className={cn("px-2 py-0.5 rounded capitalize", priorityStyles[data.priority])}>
          {data.priority}
        </span>
        <span className="text-text-muted">{statusLabels[data.status]}</span>
      </div>
      {data.dueDate && (
        <div className="flex items-center justify-between text-xs">
          <span className="text-text-muted">Due Date</span>
          <span className="font-medium text-text-strong">
            {new Date(data.dueDate).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </span>
        </div>
      )}
    </div>
  );
}
