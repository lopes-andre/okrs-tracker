"use client";

import { useState } from "react";
import { format, parseISO, differenceInDays } from "date-fns";
import {
  MoreHorizontal,
  Pencil,
  Trash2,
  Play,
  Pause,
  CheckCircle,
  TrendingUp,
  Calendar,
  Target,
  FileText,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type {
  ContentCampaign,
  ContentCampaignStatus,
  ContentCampaignObjective,
} from "@/lib/supabase/types";

// ============================================================================
// TYPES
// ============================================================================

interface CampaignCardProps {
  campaign: ContentCampaign;
  postCount?: number;
  onEdit?: () => void;
  onDelete?: () => void;
  onStatusChange?: (status: ContentCampaignStatus) => void;
  onAddCheckin?: () => void;
  onClick?: () => void;
}

// ============================================================================
// HELPERS
// ============================================================================

function getStatusConfig(status: ContentCampaignStatus) {
  switch (status) {
    case "draft":
      return {
        label: "Draft",
        color: "bg-text-muted/20 text-text-muted",
        icon: FileText,
      };
    case "active":
      return {
        label: "Active",
        color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
        icon: Play,
      };
    case "paused":
      return {
        label: "Paused",
        color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
        icon: Pause,
      };
    case "completed":
      return {
        label: "Completed",
        color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
        icon: CheckCircle,
      };
  }
}

function getObjectiveConfig(objective: ContentCampaignObjective) {
  switch (objective) {
    case "awareness":
      return { label: "Awareness", color: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300" };
    case "traffic":
      return { label: "Traffic", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300" };
    case "engagement":
      return { label: "Engagement", color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300" };
    case "conversions":
      return { label: "Conversions", color: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300" };
  }
}

function calculateProgress(startDate: string | null, endDate: string | null): number {
  if (!startDate || !endDate) return 0;

  const start = parseISO(startDate);
  const end = parseISO(endDate);
  const now = new Date();

  if (now < start) return 0;
  if (now > end) return 100;

  const totalDays = differenceInDays(end, start);
  const elapsedDays = differenceInDays(now, start);

  if (totalDays === 0) return 100;
  return Math.round((elapsedDays / totalDays) * 100);
}

function formatDateRange(startDate: string | null, endDate: string | null): string {
  if (!startDate && !endDate) return "No dates set";
  if (startDate && !endDate) return `From ${format(parseISO(startDate), "MMM d, yyyy")}`;
  if (!startDate && endDate) return `Until ${format(parseISO(endDate), "MMM d, yyyy")}`;
  return `${format(parseISO(startDate!), "MMM d")} - ${format(parseISO(endDate!), "MMM d, yyyy")}`;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function CampaignCard({
  campaign,
  postCount = 0,
  onEdit,
  onDelete,
  onStatusChange,
  onAddCheckin,
  onClick,
}: CampaignCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const statusConfig = getStatusConfig(campaign.status);
  const objectiveConfig = getObjectiveConfig(campaign.objective);
  const progress = calculateProgress(campaign.start_date, campaign.end_date);
  const StatusIcon = statusConfig.icon;

  return (
    <>
      <Card
        className={cn(
          "hover:shadow-md transition-shadow cursor-pointer",
          campaign.status === "draft" && "opacity-75"
        )}
        onClick={onClick}
      >
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h3 className="font-medium truncate">{campaign.name}</h3>
              {campaign.description && (
                <p className="text-small text-text-muted line-clamp-2 mt-1">
                  {campaign.description}
                </p>
              )}
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {onEdit && (
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(); }}>
                    <Pencil className="w-4 h-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                )}
                {onAddCheckin && campaign.status === "active" && (
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onAddCheckin(); }}>
                    <TrendingUp className="w-4 h-4 mr-2" />
                    Add Check-in
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                {onStatusChange && campaign.status === "draft" && (
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onStatusChange("active"); }}>
                    <Play className="w-4 h-4 mr-2" />
                    Start Campaign
                  </DropdownMenuItem>
                )}
                {onStatusChange && campaign.status === "active" && (
                  <>
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onStatusChange("paused"); }}>
                      <Pause className="w-4 h-4 mr-2" />
                      Pause
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onStatusChange("completed"); }}>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Mark Complete
                    </DropdownMenuItem>
                  </>
                )}
                {onStatusChange && campaign.status === "paused" && (
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onStatusChange("active"); }}>
                    <Play className="w-4 h-4 mr-2" />
                    Resume
                  </DropdownMenuItem>
                )}
                {onDelete && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={(e) => { e.stopPropagation(); setShowDeleteDialog(true); }}
                      className="text-status-danger focus:text-status-danger"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Status and Objective Badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className={cn("gap-1", statusConfig.color)}>
              <StatusIcon className="w-3 h-3" />
              {statusConfig.label}
            </Badge>
            <Badge variant="outline" className={objectiveConfig.color}>
              <Target className="w-3 h-3 mr-1" />
              {objectiveConfig.label}
            </Badge>
          </div>

          {/* Date Range */}
          <div className="flex items-center gap-2 text-small text-text-muted">
            <Calendar className="w-4 h-4" />
            <span>{formatDateRange(campaign.start_date, campaign.end_date)}</span>
          </div>

          {/* Progress (for active campaigns with dates) */}
          {campaign.status === "active" && campaign.start_date && campaign.end_date && (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-small">
                <span className="text-text-muted">Timeline Progress</span>
                <span className="font-medium">{progress}%</span>
              </div>
              <Progress value={progress} className="h-1.5" />
            </div>
          )}

          {/* Post Count */}
          <div className="flex items-center justify-between text-small pt-2 border-t border-border-soft">
            <span className="text-text-muted">Posts</span>
            <span className="font-medium">{postCount}</span>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Campaign</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{campaign.name}&quot;? This will
              remove the campaign but keep the associated posts. This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onDelete?.();
                setShowDeleteDialog(false);
              }}
              className="bg-status-danger hover:bg-status-danger/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
