"use client";

import { useState, useMemo } from "react";
import { 
  ChevronDown, 
  ChevronRight, 
  MoreHorizontal, 
  Pencil, 
  Trash2, 
  Plus,
  GripVertical,
} from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { AnnualKrCard } from "./annual-kr-card";
import { computeKrProgress, classifyPaceStatus, formatProgress } from "@/lib/progress-engine";
import type { ObjectiveWithKrs, OkrRole, CheckIn } from "@/lib/supabase/types";

interface ObjectiveCardProps {
  objective: ObjectiveWithKrs;
  role: OkrRole;
  onEdit: () => void;
  onDelete: () => void;
  onAddKr: () => void;
  onEditKr: (krId: string) => void;
  onDeleteKr: (krId: string) => void;
  onEditQuarterTargets?: (krId: string) => void;
  onCheckIn?: (krId: string) => void;
  /** Check-ins by KR ID for progress computation */
  checkInsByKr?: Record<string, CheckIn[]>;
  /** Plan year for quarter calculations */
  planYear?: number;
}

export function ObjectiveCard({
  objective,
  role,
  onEdit,
  onDelete,
  onAddKr,
  onEditKr,
  onDeleteKr,
  onEditQuarterTargets,
  onCheckIn,
  checkInsByKr = {},
  planYear = new Date().getFullYear(),
}: ObjectiveCardProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const canEdit = role === "owner" || role === "editor";
  const krCount = objective.annual_krs?.length || 0;

  // Compute progress for each KR using the progress engine
  const krProgressResults = useMemo(() => {
    const results: Record<string, ReturnType<typeof computeKrProgress>> = {};
    if (objective.annual_krs) {
      for (const kr of objective.annual_krs) {
        const checkIns = checkInsByKr[kr.id] || [];
        // Pass empty tasks array - task-based progress is optional
        results[kr.id] = computeKrProgress(kr, checkIns, [], planYear);
      }
    }
    return results;
  }, [objective.annual_krs, checkInsByKr, planYear]);

  // Compute real-time Objective progress and expected progress as simple averages
  const { progress, expectedProgress, paceStatus } = useMemo(() => {
    const krs = objective.annual_krs || [];
    if (krs.length === 0) return { progress: 0, expectedProgress: 0, paceRatio: 1, paceStatus: "on_track" as const };
    
    let totalProgress = 0;
    let totalExpected = 0;
    
    for (const kr of krs) {
      const krResult = krProgressResults[kr.id];
      if (krResult) {
        // Progress from progress engine is 0-1
        totalProgress += krResult.progress;
        totalExpected += krResult.expectedProgress;
      }
    }
    
    const avgProgress = totalProgress / krs.length;
    const avgExpected = totalExpected / krs.length;
    
    // Calculate pace ratio (actual vs expected)
    const ratio = avgExpected > 0 ? avgProgress / avgExpected : (avgProgress > 0 ? 2 : 1);
    const status = classifyPaceStatus(ratio);
    
    return {
      progress: Math.min(Math.max(avgProgress * 100, 0), 100),
      expectedProgress: Math.min(Math.max(avgExpected * 100, 0), 100),
      paceRatio: ratio,
      paceStatus: status,
    };
  }, [objective.annual_krs, krProgressResults]);

  // Map pace status to display properties
  const getStatusDisplay = () => {
    switch (paceStatus) {
      case "ahead":
        return { label: "Ahead", variant: "success" as const };
      case "on_track":
        return { label: "On Track", variant: "success" as const };
      case "at_risk":
        return { label: "At Risk", variant: "warning" as const };
      case "off_track":
        return { label: "Behind", variant: "danger" as const };
      default:
        return { label: "Behind", variant: "danger" as const };
    }
  };

  const status = getStatusDisplay();
  
  // Calculate the delta between actual and expected
  const progressDelta = progress - expectedProgress;

  return (
    <Card className="group">
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          {/* Drag Handle (for future drag-and-drop) */}
          {canEdit && (
            <div className="opacity-0 group-hover:opacity-100 transition-opacity cursor-grab pt-1">
              <GripVertical className="w-4 h-4 text-text-subtle" />
            </div>
          )}

          {/* Expand/Collapse Button */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 -m-1 hover:bg-bg-1 rounded transition-colors shrink-0 mt-0.5"
          >
            {isExpanded ? (
              <ChevronDown className="w-5 h-5 text-text-muted" />
            ) : (
              <ChevronRight className="w-5 h-5 text-text-muted" />
            )}
          </button>

          {/* Objective Code Badge */}
          <div className="w-12 h-12 rounded-card bg-bg-1 border border-border-soft flex items-center justify-center shrink-0">
            <span className="font-heading font-bold text-body text-text-muted">
              {objective.code}
            </span>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h3 className="font-heading font-semibold text-h5 text-text-strong truncate">
                  {objective.name}
                </h3>
                {objective.description && (
                  <p className="text-body-sm text-text-muted mt-0.5 line-clamp-2">
                    {objective.description}
                  </p>
                )}
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="secondary" className="text-xs">
                    {krCount} Key Result{krCount !== 1 ? "s" : ""}
                  </Badge>
                </div>
              </div>

              {/* Right side: Status + Progress */}
              <div className="flex items-center gap-4 shrink-0">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div>
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs max-w-xs">
                    <p className="font-medium mb-1">
                      {status.label === "Ahead" || status.label === "On Track"
                        ? "You're doing great!"
                        : status.label === "At Risk"
                        ? "Needs attention"
                        : "Falling behind schedule"}
                    </p>
                    <div className="space-y-0.5 text-muted-foreground">
                      <p>Current progress: {formatProgress(progress / 100)}</p>
                      <p>Expected by today: {formatProgress(expectedProgress / 100)}</p>
                      {progressDelta > 0 ? (
                        <p className="text-status-success">You are {Math.abs(progressDelta).toFixed(1)}% ahead of schedule</p>
                      ) : progressDelta < 0 ? (
                        <p className="text-status-danger">You are {Math.abs(progressDelta).toFixed(1)}% behind schedule</p>
                      ) : (
                        <p>Exactly on track!</p>
                      )}
                    </div>
                  </TooltipContent>
                </Tooltip>
                <div className="flex items-center gap-2 w-32">
                  <Progress value={progress} className="flex-1" />
                  <span className="font-heading font-bold text-body w-12 text-right">
                    {Math.round(progress)}%
                  </span>
                </div>

                {/* Actions Menu */}
                {canEdit && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={onEdit}>
                        <Pencil className="w-4 h-4 mr-2" />
                        Edit Objective
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={onAddKr}>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Key Result
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={onDelete}
                        className="text-status-danger focus:text-status-danger"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete Objective
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardHeader>

      {/* Expanded Content - Key Results */}
      {isExpanded && (
        <CardContent className="pt-0">
          <div className="ml-[72px] space-y-2">
              {objective.annual_krs && objective.annual_krs.length > 0 ? (
              <>
                {objective.annual_krs.map((kr) => (
                  <AnnualKrCard
                    key={kr.id}
                    kr={kr}
                    role={role}
                    onEdit={() => onEditKr(kr.id)}
                    onDelete={() => onDeleteKr(kr.id)}
                    onEditQuarterTargets={
                      onEditQuarterTargets ? () => onEditQuarterTargets(kr.id) : undefined
                    }
                    onCheckIn={onCheckIn ? () => onCheckIn(kr.id) : undefined}
                    checkIns={checkInsByKr[kr.id] || []}
                    planYear={planYear}
                    progressResult={krProgressResults[kr.id]}
                  />
                ))}
              </>
            ) : (
              <div className="py-6 text-center text-text-muted text-body-sm border border-dashed border-border-soft rounded-card">
                No key results yet
              </div>
            )}

            {/* Add KR Button */}
            {canEdit && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onAddKr}
                className="w-full text-text-muted hover:text-text-strong mt-2"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Key Result
              </Button>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
