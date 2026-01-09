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
  CheckCircle2,
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
import type { AnnualKr, OkrRole, QuarterTarget, CheckIn } from "@/lib/supabase/types";
import type { ProgressResult, QuarterProgressResult } from "@/lib/progress-engine";
import { 
  formatValueWithUnit, 
  formatProgress, 
  formatDelta,
  getCurrentQuarter,
  computeAllQuartersProgress,
  getQuarterProgressSummary,
} from "@/lib/progress-engine";
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
  /** Check-ins for computing quarter progress */
  checkIns?: CheckIn[];
  /** Plan year for quarter calculations */
  planYear?: number;
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

export function AnnualKrCard({ 
  kr, 
  role, 
  onEdit, 
  onDelete, 
  onEditQuarterTargets, 
  onCheckIn, 
  progressResult,
  checkIns = [],
  planYear = new Date().getFullYear(),
}: AnnualKrCardProps) {
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
  
  // Compute quarter progress
  const quarterProgress = hasQuarterTargets 
    ? computeAllQuartersProgress(kr.quarter_targets!, kr, checkIns, planYear)
    : [];
  
  const quarterSummary = hasQuarterTargets
    ? getQuarterProgressSummary(kr.quarter_targets!, kr, checkIns, planYear)
    : null;
  
  const currentQuarter = getCurrentQuarter();
  const currentQuarterData = quarterProgress.find(q => q.isCurrent);

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
            quarterProgress={quarterProgress}
            compact 
          />
        )}
        
        {/* Current Quarter Quick Status */}
        {hasQuarterTargets && !isExpanded && currentQuarterData && (
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className={cn(
                  "flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium shrink-0",
                  currentQuarterData.isComplete 
                    ? "bg-status-success/10 text-status-success"
                    : currentQuarterData.progress >= 0.7
                    ? "bg-status-success/10 text-status-success"
                    : currentQuarterData.progress >= 0.4
                    ? "bg-status-warning/10 text-status-warning"
                    : "bg-status-info/10 text-status-info"
                )}>
                  {currentQuarterData.isComplete ? (
                    <>
                      <CheckCircle2 className="w-3 h-3" />
                      Q{currentQuarter} ✓
                    </>
                  ) : (
                    <>
                      Q{currentQuarter}: {Math.round(currentQuarterData.progress * 100)}%
                    </>
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p className="font-medium">
                  Q{currentQuarter} Progress: {Math.round(currentQuarterData.progress * 100)}%
                </p>
                <p className="text-xs text-text-subtle">
                  {currentQuarterData.currentValue.toLocaleString()} / {currentQuarterData.target.toLocaleString()}
                  {kr.unit && ` ${kr.unit}`}
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
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
        <div className="px-3 pb-3 pt-0 space-y-3 border-t border-border-soft">
          {/* Quarterly Progress Section */}
          {hasQuarterTargets && (
            <div className="ml-[52px] mt-3">
              <div className="flex items-center justify-between mb-3">
                <p className="text-small font-semibold text-text-strong">
                  Quarterly Breakdown
                </p>
                {quarterSummary && (
                  <span className={cn(
                    "text-xs px-2 py-0.5 rounded-full font-medium",
                    quarterSummary.isOnTrackForYear 
                      ? "bg-status-success/10 text-status-success"
                      : "bg-status-warning/10 text-status-warning"
                  )}>
                    {quarterSummary.completedQuarters}/4 quarters complete
                  </span>
                )}
              </div>
              
              {/* Detailed Quarter Cards */}
              <div className="grid grid-cols-4 gap-3">
                {quarterProgress.map((qp) => {
                  const quarterTarget = kr.quarter_targets?.find(qt => qt.quarter === qp.quarter);
                  
                  return (
                    <div 
                      key={qp.quarter}
                      className={cn(
                        "p-3 rounded-card border transition-all",
                        qp.isCurrent && "ring-2 ring-offset-2 ring-accent/30",
                        qp.isComplete 
                          ? "bg-status-success/5 border-status-success/30" 
                          : qp.isPast && !qp.isComplete
                          ? "bg-status-danger/5 border-status-danger/30"
                          : qp.isFuture
                          ? "bg-bg-1 border-border-soft"
                          : "bg-white border-border"
                      )}
                    >
                      {/* Quarter Header */}
                      <div className="flex items-center justify-between mb-2">
                        <span className={cn(
                          "text-xs font-bold",
                          qp.isComplete ? "text-status-success" :
                          qp.isPast ? "text-status-danger" :
                          qp.isCurrent ? "text-accent" :
                          "text-text-subtle"
                        )}>
                          Q{qp.quarter}
                        </span>
                        {qp.isComplete && (
                          <CheckCircle2 className="w-4 h-4 text-status-success" />
                        )}
                        {qp.isCurrent && !qp.isComplete && (
                          <span className="text-[10px] bg-accent/10 text-accent px-1.5 py-0.5 rounded font-medium">
                            NOW
                          </span>
                        )}
                        {qp.isPast && !qp.isComplete && (
                          <span className="text-[10px] text-status-danger">Missed</span>
                        )}
                      </div>
                      
                      {/* Progress Value */}
                      <div className="mb-2">
                        <p className={cn(
                          "text-lg font-bold",
                          qp.isComplete ? "text-status-success" :
                          qp.isPast ? "text-status-danger" :
                          qp.isCurrent ? "text-text-strong" :
                          "text-text-muted"
                        )}>
                          {Math.round(qp.progress * 100)}%
                        </p>
                        <p className="text-[10px] text-text-muted">
                          {qp.currentValue.toLocaleString()} / {qp.target.toLocaleString()}
                          {kr.unit && ` ${kr.unit}`}
                        </p>
                      </div>
                      
                      {/* Progress Bar */}
                      <Progress 
                        value={qp.progress * 100} 
                        className={cn(
                          "h-1.5 mb-2",
                          qp.isComplete && "[&>div]:bg-status-success",
                          qp.isPast && !qp.isComplete && "[&>div]:bg-status-danger",
                          qp.isCurrent && "[&>div]:bg-accent"
                        )}
                      />
                      
                      {/* Pace Info for Current Quarter */}
                      {qp.isCurrent && (
                        <div className="text-[10px] space-y-0.5 pt-1 border-t border-border-soft/50">
                          <div className="flex justify-between">
                            <span className="text-text-muted">Expected:</span>
                            <span className="font-medium">{Math.round(qp.expectedProgress * 100)}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-text-muted">Days left:</span>
                            <span className="font-medium">{qp.daysRemaining}d</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-text-muted">Pace:</span>
                            <PaceBadge 
                              status={qp.paceStatus}
                              paceRatio={qp.paceRatio}
                              progress={qp.progress}
                              expectedProgress={qp.expectedProgress}
                              compact
                            />
                          </div>
                        </div>
                      )}
                      
                      {/* Days info for future quarters */}
                      {qp.isFuture && (
                        <p className="text-[10px] text-text-subtle text-center pt-1 border-t border-border-soft/50">
                          Starts in {qp.daysRemaining}d
                        </p>
                      )}
                      
                      {/* Notes */}
                      {quarterTarget?.notes && (
                        <p className="text-[10px] text-text-muted italic mt-2 truncate" title={quarterTarget.notes}>
                          {quarterTarget.notes}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
              
              {/* Edit Quarterly Targets Button */}
              {canEdit && onEditQuarterTargets && (
                <div className="flex justify-end mt-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onEditQuarterTargets}
                    className="text-xs gap-1.5 text-text-muted hover:text-text-strong"
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    Edit Quarterly Targets
                  </Button>
                </div>
              )}
            </div>
          )}
          
          {/* No Quarter Targets - Prompt to Add */}
          {!hasQuarterTargets && canEdit && onEditQuarterTargets && (
            <div className="ml-[52px] mt-3 p-4 bg-bg-1 rounded-card border border-dashed border-border text-center">
              <p className="text-small text-text-muted mb-2">
                No quarterly targets set
              </p>
              <Button
                variant="secondary"
                size="sm"
                onClick={onEditQuarterTargets}
                className="gap-1.5"
              >
                <Calendar className="w-3.5 h-3.5" />
                Set Quarterly Targets
              </Button>
            </div>
          )}
          
          {/* Annual Progress Details */}
          {hasProgressEngine && progressResult && (
            <div className="ml-[52px] p-3 bg-white rounded-card border border-border-soft">
              <p className="text-small font-semibold text-text-strong mb-2">
                Annual Progress
              </p>
              <div className="grid grid-cols-3 gap-3 text-small">
                <div className="p-2 bg-bg-1 rounded-button text-center">
                  <p className="text-xs text-text-muted">Current</p>
                  <p className="text-body font-bold">{formatValue(progressResult.currentValue)}</p>
                </div>
                <div className="p-2 bg-bg-1 rounded-button text-center">
                  <p className="text-xs text-text-muted">Target</p>
                  <p className="text-body font-bold">{formatValue(progressResult.target)}</p>
                </div>
                <div className="p-2 bg-bg-1 rounded-button text-center">
                  <p className="text-xs text-text-muted">Delta</p>
                  <p className={cn(
                    "text-body font-bold",
                    progressResult.delta >= 0 ? "text-status-success" : "text-status-danger"
                  )}>
                    {formatDelta(progressResult.delta, kr.unit, kr.direction)}
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mt-3 text-small">
                <div className="flex justify-between">
                  <span className="text-text-muted">Progress:</span>
                  <span className="font-medium">{formatProgress(progressResult.progress)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Expected:</span>
                  <span className="font-medium">{formatProgress(progressResult.expectedProgress)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Days left:</span>
                  <span className="font-medium">{progressResult.daysRemaining} days</span>
                </div>
                {progressResult.forecastValue !== null && (
                  <div className="flex justify-between">
                    <span className="text-text-muted">Forecast:</span>
                    <span className={cn(
                      "font-medium",
                      progressResult.forecastValue >= progressResult.target 
                        ? "text-status-success" 
                        : "text-status-warning"
                    )}>
                      {formatValue(progressResult.forecastValue)}
                    </span>
                  </div>
                )}
              </div>
              
              {progressResult.lastCheckInDate && (
                <div className="flex items-center gap-1.5 mt-3 pt-2 border-t border-border-soft/50 text-xs text-text-muted">
                  <Clock className="w-3 h-3" />
                  Last check-in: {formatDistanceToNow(progressResult.lastCheckInDate, { addSuffix: true })}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
