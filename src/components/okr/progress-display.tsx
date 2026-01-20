"use client";

import { 
  TrendingUp, 
  TrendingDown, 
  Target,
  Clock,
  Calendar,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { PaceBadge } from "./pace-badge";
import { 
  formatProgress,
  formatValueWithUnit,
  type ProgressResult,
} from "@/lib/progress-engine";
import type { KrType, KrDirection } from "@/lib/supabase/types";
import { formatDistanceToNow, format } from "date-fns";
import { cn } from "@/lib/utils";

interface ProgressDisplayProps {
  progress: ProgressResult;
  krType: KrType;
  direction: KrDirection;
  unit: string | null;
  showForecast?: boolean;
  showDelta?: boolean;
  showLastCheckIn?: boolean;
  compact?: boolean;
}

export function ProgressDisplay({
  progress,
  krType,
  direction: _direction,
  unit,
  showForecast = true,
  showDelta = true,
  showLastCheckIn = true,
  compact = false,
}: ProgressDisplayProps) {
  const progressPercent = Math.round(progress.progress * 100);
  const expectedPercent = Math.round(progress.expectedProgress * 100);
  
  // Determine if ahead or behind
  const isAhead = progress.progress >= progress.expectedProgress;
  const deltaFromExpected = progressPercent - expectedPercent;
  
  return (
    <div className={cn("space-y-2", compact && "space-y-1")}>
      {/* Progress Bar with Expected Marker */}
      <div className="relative">
        <Progress value={progressPercent} className="h-2" />
        {/* Expected progress marker */}
        <div 
          className="absolute top-0 bottom-0 w-0.5 bg-text-subtle/40"
          style={{ left: `${expectedPercent}%` }}
        />
      </div>
      
      {/* Values Row */}
      <div className={cn(
        "flex items-center justify-between gap-2 text-small",
        compact && "text-xs"
      )}>
        {/* Current Value */}
        <div className="flex items-center gap-2">
          <span className="font-medium text-text-strong">
            {formatValueWithUnit(progress.currentValue, unit, krType)}
          </span>
          <span className="text-text-subtle">/</span>
          <span className="text-text-muted">
            {formatValueWithUnit(progress.target, unit, krType)}
          </span>
        </div>
        
        {/* Progress Percentage */}
        <div className="flex items-center gap-2">
          <span className="font-medium">
            {formatProgress(progress.progress)}
          </span>
          
          {/* Delta from expected */}
          {showDelta && deltaFromExpected !== 0 && (
            <Tooltip>
              <TooltipTrigger>
                <Badge
                  variant={isAhead ? "success" : "warning"}
                  className="text-[10px] px-1 py-0"
                >
                  {deltaFromExpected > 0 ? "+" : ""}{deltaFromExpected}%
                </Badge>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p className="text-xs">
                  {isAhead ? "Ahead of" : "Behind"} expected pace by {Math.abs(deltaFromExpected)}%
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Expected: {expectedPercent}%
                </p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>
      
      {/* Additional Info Row */}
      {!compact && (showForecast || showLastCheckIn) && (
        <div className="flex items-center justify-between gap-2 text-xs text-text-muted">
          {/* Forecast */}
          {showForecast && progress.forecastValue !== null && (
            <div className="flex items-center gap-1">
              <Target className="w-3 h-3" />
              <span>
                Forecast: {formatValueWithUnit(progress.forecastValue, unit, krType)}
              </span>
              {progress.forecastValue >= progress.target ? (
                <TrendingUp className="w-3 h-3 text-status-success" />
              ) : (
                <TrendingDown className="w-3 h-3 text-status-warning" />
              )}
            </div>
          )}
          
          {/* Last Check-in */}
          {showLastCheckIn && progress.lastCheckInDate && (
            <div 
              className="flex items-center gap-1"
              title={format(progress.lastCheckInDate, "PPpp")}
            >
              <Clock className="w-3 h-3" />
              <span>
                {formatDistanceToNow(progress.lastCheckInDate, { addSuffix: true })}
              </span>
            </div>
          )}
          
          {/* Days Remaining */}
          {progress.daysRemaining > 0 && (
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              <span>{progress.daysRemaining}d left</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Compact inline progress for use in tables/lists
 */
export function ProgressInline({
  progress,
  krType,
  unit,
}: {
  progress: ProgressResult;
  krType: KrType;
  unit: string | null;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-1.5 text-small">
        <span className="font-medium text-text-strong">
          {formatValueWithUnit(progress.currentValue, unit, krType)}
        </span>
        <span className="text-text-subtle">/</span>
        <span className="text-text-muted">
          {formatValueWithUnit(progress.target, unit, krType)}
        </span>
      </div>
      <div className="flex items-center gap-2 min-w-[120px]">
        <Progress value={progress.progress * 100} className="flex-1 h-1.5" />
        <span className="text-small font-medium w-10 text-right">
          {formatProgress(progress.progress)}
        </span>
      </div>
      <PaceBadge 
        status={progress.paceStatus}
        paceRatio={progress.paceRatio}
        progress={progress.progress}
        expectedProgress={progress.expectedProgress}
        size="sm"
      />
    </div>
  );
}

/**
 * Mini progress indicator for use in tight spaces
 */
export function ProgressMini({
  progress,
}: {
  progress: ProgressResult;
}) {
  const progressPercent = Math.round(progress.progress * 100);
  
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center gap-1.5 cursor-default">
          <Progress value={progressPercent} className="w-16 h-1.5" />
          <span className="text-xs font-medium w-8">
            {progressPercent}%
          </span>
        </div>
      </TooltipTrigger>
      <TooltipContent side="top">
        <div className="text-xs space-y-1">
          <div className="flex justify-between gap-4">
            <span>Progress:</span>
            <span className="font-medium">{progressPercent}%</span>
          </div>
          <div className="flex justify-between gap-4">
            <span>Expected:</span>
            <span className="font-medium">{Math.round(progress.expectedProgress * 100)}%</span>
          </div>
          <div className="flex justify-between gap-4">
            <span>Status:</span>
            <span className="font-medium capitalize">{progress.paceStatus.replace("_", " ")}</span>
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
