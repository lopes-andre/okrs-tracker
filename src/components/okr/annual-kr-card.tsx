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
  Plus,
  Clock,
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { QuarterTargetPills } from "./quarter-target-pills";
import { PaceBadge } from "./pace-badge";
import type { AnnualKr, OkrRole, QuarterTarget } from "@/lib/supabase/types";
import type { ProgressResult } from "@/lib/progress-engine";
import { formatValueWithUnit, formatProgress, formatDelta } from "@/lib/progress-engine";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

interface AnnualKrCardProps {
  kr: AnnualKr & { quarter_targets?: QuarterTarget[] };
  role: OkrRole;
  onEdit: () => void;
  onDelete: () => void;
  onEditQuarterTargets?: () => void;
  onCheckIn?: () => void;
  /** Optional computed progress - if not provided, basic progress is calculated */
  progressResult?: ProgressResult;
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

export function AnnualKrCard({ kr, role, onEdit, onDelete, onEditQuarterTargets, onCheckIn, progressResult }: AnnualKrCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const canEdit = role === "owner" || role === "editor";

  // Calculate progress (fallback if progressResult not provided)
  const range = kr.target_value - kr.start_value;
  const basicProgress = range > 0 
    ? Math.min(Math.max(((kr.current_value - kr.start_value) / range) * 100, 0), 100)
    : kr.current_value >= kr.target_value ? 100 : 0;
  
  // Use progressResult if available
  const progress = progressResult ? progressResult.progress * 100 : basicProgress;
  const hasProgressEngine = !!progressResult;

  // Direction icon
  const DirectionIcon = directionIcons[kr.direction] || Target;

  // Format values
  const formatValue = (value: number) => formatValueWithUnit(value, kr.unit, kr.kr_type);

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
          </p>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Pace Badge (if progress engine result available) */}
          {hasProgressEngine && progressResult && (
            <PaceBadge 
              status={progressResult.paceStatus}
              paceRatio={progressResult.paceRatio}
              progress={progressResult.progress}
              expectedProgress={progressResult.expectedProgress}
            />
          )}
          
          <div className="flex items-center gap-2 w-32">
            <Progress value={progress} className="flex-1" />
            <span className="text-small font-medium w-10 text-right">
              {Math.round(progress)}%
            </span>
          </div>
        </div>

        {/* Quarter Pills Preview */}
        {hasQuarterTargets && !isExpanded && (
          <QuarterTargetPills 
            quarterTargets={kr.quarter_targets!} 
            compact 
          />
        )}

        {/* Quick Check-in Button */}
        {canEdit && onCheckIn && (
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={onCheckIn}
                  className="gap-1.5 h-7 px-2.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <TrendingUp className="w-3.5 h-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">
                Record check-in
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
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
              {onCheckIn && (
                <DropdownMenuItem onClick={onCheckIn}>
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Record Check-in
                </DropdownMenuItem>
              )}
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

      {/* Expanded: Quarter Targets and Progress Details */}
      {isExpanded && (
        <div className="px-3 pb-3 pt-0 space-y-2">
          {/* Quarter Targets */}
          {hasQuarterTargets && (
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
          )}
          
          {/* Progress Engine Details */}
          {hasProgressEngine && progressResult && (
            <div className="ml-[52px] p-3 bg-bg-1 rounded-button">
              <p className="text-small font-medium text-text-muted mb-2">
                Progress Details
              </p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-small">
                <div className="flex justify-between">
                  <span className="text-text-muted">Current:</span>
                  <span className="font-medium">{formatValue(progressResult.currentValue)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Target:</span>
                  <span className="font-medium">{formatValue(progressResult.target)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Progress:</span>
                  <span className="font-medium">{formatProgress(progressResult.progress)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Expected:</span>
                  <span className="font-medium">{formatProgress(progressResult.expectedProgress)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Delta:</span>
                  <span className={cn(
                    "font-medium",
                    progressResult.delta >= 0 ? "text-status-success" : "text-status-danger"
                  )}>
                    {formatDelta(progressResult.delta, kr.unit, kr.direction)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Days left:</span>
                  <span className="font-medium">{progressResult.daysRemaining}</span>
                </div>
                {progressResult.forecastValue !== null && (
                  <div className="flex justify-between col-span-2 pt-1 border-t border-border-soft/50 mt-1">
                    <span className="text-text-muted flex items-center gap-1">
                      <Target className="w-3 h-3" />
                      Forecast:
                    </span>
                    <span className={cn(
                      "font-medium",
                      progressResult.forecastValue >= progressResult.target 
                        ? "text-status-success" 
                        : "text-status-warning"
                    )}>
                      {formatValue(progressResult.forecastValue)}
                      {progressResult.forecastValue >= progressResult.target 
                        ? " ✓ On pace" 
                        : " ⚠ Below target"}
                    </span>
                  </div>
                )}
                {progressResult.lastCheckInDate && (
                  <div className="flex justify-between col-span-2 pt-1 border-t border-border-soft/50 mt-1">
                    <span className="text-text-muted flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Last check-in:
                    </span>
                    <span className="font-medium">
                      {formatDistanceToNow(progressResult.lastCheckInDate, { addSuffix: true })}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
