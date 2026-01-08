"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Target,
  TrendingUp,
  TrendingDown,
  Minus,
  MoreHorizontal,
  Pencil,
  Trash2,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { QuarterTargetPills } from "./quarter-target-pills";
import type { AnnualKr, OkrRole, QuarterTarget } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";

interface AnnualKrCardProps {
  kr: AnnualKr & { quarter_targets?: QuarterTarget[] };
  role: OkrRole;
  onEdit: () => void;
  onDelete: () => void;
  onEditQuarterTargets?: () => void;
}

const krTypeLabels: Record<string, string> = {
  metric: "Metric",
  count: "Count",
  milestone: "Milestone",
  rate: "Rate",
  average: "Average",
};

const directionIcons = {
  increase: TrendingUp,
  decrease: TrendingDown,
  maintain: Minus,
};

export function AnnualKrCard({ kr, role, onEdit, onDelete, onEditQuarterTargets }: AnnualKrCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const canEdit = role === "owner" || role === "editor";

  // Calculate progress
  const range = kr.target_value - kr.start_value;
  const progress = range > 0 
    ? Math.min(Math.max(((kr.current_value - kr.start_value) / range) * 100, 0), 100)
    : kr.current_value >= kr.target_value ? 100 : 0;

  // Direction icon
  const DirectionIcon = directionIcons[kr.direction] || Target;

  // Format values based on type
  const formatValue = (value: number) => {
    if (kr.kr_type === "rate") {
      return `${value.toFixed(1)}%`;
    }
    return value.toLocaleString();
  };

  const hasQuarterTargets = kr.quarter_targets && kr.quarter_targets.length > 0;

  return (
    <div
      className={cn(
        "group rounded-card border border-border-soft bg-white transition-all",
        "hover:border-border hover:shadow-card-hover"
      )}
    >
      {/* Main Row */}
      <div className="flex items-center gap-3 p-3">
        {/* Expand Button (if has quarter targets) */}
        {hasQuarterTargets ? (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-0.5 hover:bg-bg-1 rounded transition-colors shrink-0"
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 text-text-muted" />
            ) : (
              <ChevronRight className="w-4 h-4 text-text-muted" />
            )}
          </button>
        ) : (
          <div className="w-5" /> // Spacer
        )}

        {/* Icon */}
        <div className="w-8 h-8 rounded-button bg-bg-1 flex items-center justify-center shrink-0">
          <DirectionIcon className="w-4 h-4 text-text-muted" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <p className="text-body-sm font-medium text-text-strong truncate">
              {kr.name}
            </p>
            <Badge variant="secondary" className="text-xs shrink-0">
              {krTypeLabels[kr.kr_type] || kr.kr_type}
            </Badge>
            {kr.aggregation === "cumulative" && (
              <Badge variant="secondary" className="text-xs shrink-0">
                Cumulative
              </Badge>
            )}
          </div>
          <p className="text-small text-text-muted">
            {formatValue(kr.current_value)} / {formatValue(kr.target_value)}
            {kr.unit && ` ${kr.unit}`}
          </p>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-3 w-40 shrink-0">
          <Progress value={progress} className="flex-1" />
          <span className="text-small font-medium w-10 text-right">
            {Math.round(progress)}%
          </span>
        </div>

        {/* Quarter Pills Preview */}
        {hasQuarterTargets && !isExpanded && (
          <QuarterTargetPills 
            quarterTargets={kr.quarter_targets!} 
            compact 
          />
        )}

        {/* Actions */}
        {canEdit && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
              >
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>
                <Pencil className="w-4 h-4 mr-2" />
                Edit Key Result
              </DropdownMenuItem>
              {onEditQuarterTargets && (
                <DropdownMenuItem onClick={onEditQuarterTargets}>
                  <Calendar className="w-4 h-4 mr-2" />
                  Set Quarterly Targets
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={onDelete}
                className="text-status-danger focus:text-status-danger"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Key Result
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Expanded: Quarter Targets */}
      {isExpanded && hasQuarterTargets && (
        <div className="px-3 pb-3 pt-0">
          <div className="ml-[52px] p-3 bg-bg-1 rounded-button">
            <p className="text-small font-medium text-text-muted mb-2">
              Quarterly Targets
            </p>
            <QuarterTargetPills 
              quarterTargets={kr.quarter_targets!}
              showValues
              unit={kr.unit}
            />
          </div>
        </div>
      )}
    </div>
  );
}
