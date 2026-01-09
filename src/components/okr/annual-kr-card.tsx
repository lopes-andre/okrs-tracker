"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
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
import type { ProgressResult } from "@/lib/progress-engine";
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
  /** Last check-in for display */
  lastCheckIn?: CheckIn;
}

const krTypeLabels: Record<string, string> = {
  metric: "Metric",
  count: "Count",
  milestone: "Milestone",
  rate: "Rate",
  average: "Average",
};

const directionLabels: Record<string, string> = {
  increase: "Increase",
  decrease: "Decrease",
  maintain: "Maintain",
};

const aggregationLabels: Record<string, string> = {
  latest: "Latest Value",
  cumulative: "Cumulative (YTD)",
  average: "Average",
  max: "Maximum",
  min: "Minimum",
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
  lastCheckIn,
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

  // Handle card click (expand/collapse)
  const handleCardClick = (e: React.MouseEvent) => {
    // Don't expand if clicking on buttons or dropdown
    const target = e.target as HTMLElement;
    if (
      target.closest('button') || 
      target.closest('[role="menu"]') ||
      target.closest('[data-radix-popper-content-wrapper]')
    ) {
      return;
    }
    setIsExpanded(!isExpanded);
  };

  return (
    <div
      onClick={handleCardClick}
      className={cn(
        "group rounded-card border transition-all cursor-pointer",
        isExpanded 
          ? "border-border bg-white shadow-card" 
          : "border-border-soft bg-white hover:border-border hover:shadow-card-hover"
      )}
    >
      {/* Main Row - Collapsed View */}
      <div className="flex items-center gap-3 p-3">
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

        {/* Expand/Collapse Indicator */}
        <div className={cn(
          "w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-colors",
          isExpanded ? "bg-accent/10" : "bg-bg-1 group-hover:bg-bg-2"
        )}>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-accent" />
          ) : (
            <ChevronDown className="w-4 h-4 text-text-subtle group-hover:text-text-muted" />
          )}
        </div>

        {/* Quick Check-in Button */}
        {canEdit && onCheckIn && (
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={(e) => { e.stopPropagation(); onCheckIn(); }}
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
                onClick={(e) => e.stopPropagation()}
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

      {/* Expanded View */}
      {isExpanded && (
        <div className="border-t border-border-soft">
          {/* KR Details Header */}
          <div className="p-4 bg-bg-1/50">
            {/* Description */}
            {kr.description && (
              <p className="text-body-sm text-text-muted mb-4">
                {kr.description}
              </p>
            )}
            
            {/* Info Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {/* Type */}
              <div>
                <p className="text-xs text-text-subtle mb-1">Type</p>
                <p className="text-small font-medium">{krTypeLabels[kr.kr_type]}</p>
              </div>
              
              {/* Direction */}
              <div>
                <p className="text-xs text-text-subtle mb-1">Direction</p>
                <div className="flex items-center gap-1.5">
                  <DirectionIcon className="w-3.5 h-3.5 text-text-muted" />
                  <p className="text-small font-medium">{directionLabels[kr.direction]}</p>
                </div>
              </div>
              
              {/* Aggregation */}
              <div>
                <p className="text-xs text-text-subtle mb-1">Aggregation</p>
                <p className="text-small font-medium">{aggregationLabels[kr.aggregation] || kr.aggregation}</p>
              </div>
              
              {/* Start Value */}
              <div>
                <p className="text-xs text-text-subtle mb-1">Start Value</p>
                <p className="text-small font-medium">{formatValue(kr.start_value)}</p>
              </div>
              
              {/* Target Value */}
              <div>
                <p className="text-xs text-text-subtle mb-1">Target Value</p>
                <p className="text-small font-medium text-accent">{formatValue(kr.target_value)}</p>
              </div>
              
              {/* Current Value */}
              <div>
                <p className="text-xs text-text-subtle mb-1">Current Value</p>
                <p className={cn(
                  "text-small font-bold",
                  progress >= 100 ? "text-status-success" : 
                  progress >= 70 ? "text-status-info" :
                  progress >= 40 ? "text-status-warning" :
                  "text-text-strong"
                )}>
                  {formatValue(kr.current_value)}
                </p>
              </div>
            </div>
            
            {/* Progress Bar with Details */}
            <div className="mt-4 p-3 bg-white rounded-card border border-border-soft">
              <div className="flex items-center justify-between mb-2">
                <span className="text-small font-medium">Annual Progress</span>
                <div className="flex items-center gap-3">
                  {hasProgressEngine && progressResult && (
                    <>
                      <span className="text-xs text-text-muted">
                        Expected: {formatProgress(progressResult.expectedProgress)}
                      </span>
                      <PaceBadge 
                        status={progressResult.paceStatus}
                        paceRatio={progressResult.paceRatio}
                        progress={progressResult.progress}
                        expectedProgress={progressResult.expectedProgress}
                      />
                    </>
                  )}
                  <span className="text-body font-bold">{Math.round(progress)}%</span>
                </div>
              </div>
              <Progress value={progress} className="h-2" />
              
              {/* Additional Progress Info */}
              {hasProgressEngine && progressResult && (
                <div className="flex items-center justify-between mt-2 text-xs text-text-muted">
                  <span>
                    Delta: <span className={progressResult.delta >= 0 ? "text-status-success" : "text-status-danger"}>
                      {formatDelta(progressResult.delta, kr.unit, kr.direction)}
                    </span>
                  </span>
                  <span>{progressResult.daysRemaining} days remaining</span>
                  {progressResult.forecastValue !== null && (
                    <span>
                      Forecast: <span className={progressResult.forecastValue >= progressResult.target ? "text-status-success" : "text-status-warning"}>
                        {formatValue(progressResult.forecastValue)}
                      </span>
                    </span>
                  )}
                </div>
              )}
            </div>
            
            {/* Last Check-in */}
            {(lastCheckIn || (progressResult?.lastCheckInDate)) && (
              <div className="flex items-center gap-2 mt-3 text-xs text-text-muted">
                <Clock className="w-3.5 h-3.5" />
                <span>
                  Last check-in: {progressResult?.lastCheckInDate 
                    ? formatDistanceToNow(progressResult.lastCheckInDate, { addSuffix: true })
                    : lastCheckIn 
                    ? formatDistanceToNow(new Date(lastCheckIn.recorded_at), { addSuffix: true })
                    : "Never"
                  }
                </span>
              </div>
            )}
          </div>
          
          {/* Quarterly Progress Section */}
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-small font-semibold text-text-strong">
                Quarterly Progress
              </h4>
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
            
            {hasQuarterTargets ? (
              <>
                {/* Quarter Cards Grid */}
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
                  <div className="flex justify-end mt-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => { e.stopPropagation(); onEditQuarterTargets(); }}
                      className="text-xs gap-1.5 text-text-muted hover:text-text-strong"
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      Edit Quarterly Targets
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <div className="p-6 bg-bg-1 rounded-card border border-dashed border-border text-center">
                <Calendar className="w-8 h-8 text-text-subtle mx-auto mb-2" />
                <p className="text-small text-text-muted mb-3">
                  No quarterly targets set for this KR
                </p>
                {canEdit && onEditQuarterTargets && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={(e) => { e.stopPropagation(); onEditQuarterTargets(); }}
                    className="gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Set Quarterly Targets
                  </Button>
                )}
              </div>
            )}
          </div>
          
          {/* Quick Actions Footer */}
          {canEdit && (
            <div className="px-4 py-3 bg-bg-1/30 border-t border-border-soft flex items-center justify-end gap-2">
              {onCheckIn && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={(e) => { e.stopPropagation(); onCheckIn(); }}
                  className="gap-1.5"
                >
                  <TrendingUp className="w-3.5 h-3.5" />
                  Record Check-in
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => { e.stopPropagation(); onEdit(); }}
                className="gap-1.5"
              >
                <Pencil className="w-3.5 h-3.5" />
                Edit KR
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
