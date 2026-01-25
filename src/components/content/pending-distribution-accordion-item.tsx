"use client";

import { useState, useCallback, useId, useMemo, useEffect } from "react";
import { format as formatDate, isPast } from "date-fns";
import {
  ChevronDown,
  Calendar,
  CheckCircle,
  Clock,
  Edit,
  Trash2,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { PlatformIcon } from "./platform-icon";
import { cn } from "@/lib/utils";
import type { ContentAccountWithPlatform } from "@/lib/supabase/types";

// ============================================================================
// TYPES
// ============================================================================

export interface PendingDistribution {
  id: string;
  accountId: string;
  format: string | null;
  caption: string | null;
  scheduledAt: string | null;
  postedAt: string | null;
  status: "draft" | "scheduled" | "posted";
  platformPostUrl?: string | null;
  internalNotes?: string | null;
}

interface PendingDistributionAccordionItemProps {
  distribution: PendingDistribution;
  account: ContentAccountWithPlatform | undefined;
  isExpanded: boolean;
  onToggle: () => void;
  onUpdate: (updates: Partial<PendingDistribution>) => void;
  onRemove: () => void;
}

// ============================================================================
// FORMAT OPTIONS BY PLATFORM
// ============================================================================

const formatOptions: Record<string, { value: string; label: string }[]> = {
  instagram: [
    { value: "post", label: "Feed Post" },
    { value: "story", label: "Story" },
    { value: "reel", label: "Reel" },
    { value: "carousel", label: "Carousel" },
  ],
  linkedin: [
    { value: "post", label: "Post" },
    { value: "article", label: "Article" },
    { value: "document", label: "Document" },
    { value: "video", label: "Video" },
    { value: "poll", label: "Poll" },
  ],
  youtube: [
    { value: "video", label: "Video" },
    { value: "short", label: "Short" },
  ],
  tiktok: [
    { value: "video", label: "Video" },
  ],
  twitter: [
    { value: "tweet", label: "Tweet" },
    { value: "thread", label: "Thread" },
  ],
  x: [
    { value: "tweet", label: "Tweet" },
    { value: "thread", label: "Thread" },
  ],
  blog: [
    { value: "article", label: "Article" },
  ],
  newsletter: [
    { value: "newsletter", label: "Newsletter" },
  ],
  podcast: [
    { value: "episode", label: "Episode" },
    { value: "clip", label: "Clip" },
  ],
  spotify: [
    { value: "episode", label: "Episode" },
    { value: "clip", label: "Clip" },
  ],
};

// ============================================================================
// STATUS CONFIG
// ============================================================================

const statusConfig = {
  draft: {
    label: "Draft",
    icon: Edit,
    color: "text-text-muted bg-bg-1",
  },
  scheduled: {
    label: "Scheduled",
    icon: Clock,
    color: "text-amber-700 bg-amber-100 dark:text-amber-400 dark:bg-amber-900/30",
  },
  posted: {
    label: "Posted",
    icon: CheckCircle,
    color: "text-green-700 bg-green-100 dark:text-green-400 dark:bg-green-900/30",
  },
};

// ============================================================================
// HASHTAG DETECTION
// ============================================================================

function extractHashtags(text: string): string[] {
  const matches = text.match(/#[a-zA-Z0-9_]+/g);
  return matches || [];
}

// ============================================================================
// COMPONENT
// ============================================================================

export function PendingDistributionAccordionItem({
  distribution,
  account,
  isExpanded,
  onToggle,
  onUpdate,
  onRemove,
}: PendingDistributionAccordionItemProps) {
  const contentId = useId();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Local state for date/time inputs to prevent erasing during typing
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");

  // Get platform info
  const platformName = account?.platform?.name?.toLowerCase() || "blog";
  const platformDisplayName = account?.platform?.display_name || "Platform";
  const accountName = account?.account_name || "Unknown Account";
  const formats = formatOptions[platformName] || [];

  // Initialize local state from distribution when it changes
  useEffect(() => {
    if (distribution.scheduledAt) {
      try {
        const dt = new Date(distribution.scheduledAt);
        setScheduledDate(formatDate(dt, "yyyy-MM-dd"));
        setScheduledTime(formatDate(dt, "HH:mm"));
      } catch {
        setScheduledDate("");
        setScheduledTime("");
      }
    } else {
      setScheduledDate("");
      setScheduledTime("");
    }
  }, [distribution.scheduledAt]);

  // Detected hashtags from caption
  const detectedHashtags = distribution.caption ? extractHashtags(distribution.caption) : [];

  // Check if scheduled datetime is in the past (based on local state for real-time updates)
  const isScheduledInPast = useMemo(() => {
    if (!scheduledDate || !scheduledTime) return false;
    try {
      return isPast(new Date(`${scheduledDate}T${scheduledTime}`));
    } catch {
      return false;
    }
  }, [scheduledDate, scheduledTime]);

  // Compute effective status based on schedule datetime
  const effectiveStatus = useMemo(() => {
    if (scheduledDate && scheduledTime) {
      return isScheduledInPast ? "posted" : "scheduled";
    }
    return "draft";
  }, [scheduledDate, scheduledTime, isScheduledInPast]);

  // Handle schedule change - update local state and parent when both fields are filled
  const handleScheduleChange = useCallback(
    (newDate: string, newTime: string) => {
      // Always update local state
      setScheduledDate(newDate);
      setScheduledTime(newTime);

      // Only update parent state when we have complete data or clearing
      if (newDate && newTime) {
        const scheduledDateTime = new Date(`${newDate}T${newTime}`);
        const scheduledAt = scheduledDateTime.toISOString();

        // Status is computed from datetime: past = posted, future = scheduled
        if (isPast(scheduledDateTime)) {
          onUpdate({ scheduledAt, status: "posted", postedAt: scheduledAt });
        } else {
          onUpdate({ scheduledAt, status: "scheduled", postedAt: null });
        }
      } else if (!newDate && !newTime) {
        // Both cleared - reset to draft
        onUpdate({ scheduledAt: null, status: "draft", postedAt: null });
      }
      // If only one field is filled, keep local state but don't update parent yet
    },
    [onUpdate]
  );

  // Handle keyboard
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onToggle();
      }
    },
    [onToggle]
  );

  return (
    <div className="border border-border-soft rounded-lg overflow-hidden bg-bg-0">
      {/* Header - always visible */}
      <div
        role="button"
        tabIndex={0}
        aria-expanded={isExpanded}
        aria-controls={contentId}
        onClick={onToggle}
        onKeyDown={handleKeyDown}
        className={cn(
          "flex items-center gap-4 p-4 cursor-pointer transition-colors",
          "hover:bg-bg-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-inset",
          isExpanded && "bg-bg-1 border-b border-border-soft"
        )}
      >
        {/* Platform Icon */}
        <div className="shrink-0">
          <PlatformIcon platformName={platformName} size="md" />
        </div>

        {/* Account Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="font-medium truncate">{accountName}</span>
            <Badge variant="outline" className={cn("shrink-0 text-[10px]", statusConfig[effectiveStatus].color)}>
              {(() => {
                const StatusIcon = statusConfig[effectiveStatus].icon;
                return <StatusIcon className="w-3 h-3 mr-1" />;
              })()}
              {statusConfig[effectiveStatus].label}
            </Badge>
          </div>
          <div className="flex items-center gap-3 text-small text-text-muted">
            <span>{platformDisplayName}</span>
            {distribution.format && (
              <>
                <span>•</span>
                <span className="capitalize">{distribution.format}</span>
              </>
            )}
            {distribution.scheduledAt && (
              <>
                <span>•</span>
                <span className="flex items-center gap-1">
                  {isScheduledInPast ? (
                    <CheckCircle className="w-3 h-3 text-green-600" />
                  ) : (
                    <Calendar className="w-3 h-3" />
                  )}
                  {isScheduledInPast ? "Shared" : ""} {formatDate(new Date(distribution.scheduledAt), "MMM d 'at' h:mm a")}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-text-muted hover:text-status-danger"
            onClick={(e) => {
              e.stopPropagation();
              setShowDeleteDialog(true);
            }}
            title="Remove"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
          <ChevronDown
            className={cn(
              "w-5 h-5 text-text-muted transition-transform duration-200",
              isExpanded && "rotate-180"
            )}
          />
        </div>
      </div>

      {/* Expandable Content */}
      <div
        id={contentId}
        className={cn(
          "overflow-hidden transition-all duration-200 ease-out",
          isExpanded ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"
        )}
      >
        <div className="p-4 space-y-4 bg-bg-1/50">
          {/* Format */}
          {formats.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-small">Format</Label>
              <Select
                value={distribution.format || ""}
                onValueChange={(v) => onUpdate({ format: v || null })}
              >
                <SelectTrigger className="bg-bg-0">
                  <SelectValue placeholder="Select format..." />
                </SelectTrigger>
                <SelectContent>
                  {formats.map((f) => (
                    <SelectItem key={f.value} value={f.value}>
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Caption / Content */}
          <div className="space-y-1.5">
            <Label className="text-small">
              {platformName === "twitter" || platformName === "x"
                ? "Tweet"
                : platformName === "newsletter"
                ? "Subject Line"
                : "Caption"}
            </Label>
            <Textarea
              value={distribution.caption || ""}
              onChange={(e) => onUpdate({ caption: e.target.value || null })}
              placeholder={`Enter ${platformName === "twitter" || platformName === "x" ? "tweet" : "caption"}...`}
              rows={3}
              maxLength={platformName === "twitter" || platformName === "x" ? 280 : undefined}
              className="bg-bg-0"
            />
            <div className="flex items-center justify-between text-xs text-text-muted">
              {(platformName === "twitter" || platformName === "x") && (
                <span>{(distribution.caption || "").length}/280</span>
              )}
              {detectedHashtags.length > 0 && (
                <span className="text-accent">
                  {detectedHashtags.length} hashtag{detectedHashtags.length !== 1 ? "s" : ""} detected
                </span>
              )}
            </div>
          </div>

          {/* Schedule */}
          <div className="space-y-1.5">
            <Label className="text-small flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5" />
              Schedule
            </Label>
            <div className="grid grid-cols-2 gap-3">
              <Input
                type="date"
                value={scheduledDate}
                onChange={(e) => handleScheduleChange(e.target.value, scheduledTime)}
                className="bg-bg-0"
              />
              <Input
                type="time"
                value={scheduledTime}
                onChange={(e) => handleScheduleChange(scheduledDate, e.target.value)}
                className="bg-bg-0"
              />
            </div>

            {/* Contextual tip based on schedule datetime */}
            {scheduledDate && scheduledTime && (
              <div className={cn(
                "flex items-center gap-2 p-2 rounded-lg text-small",
                isScheduledInPast
                  ? "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                  : "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400"
              )}>
                {isScheduledInPast ? (
                  <>
                    <CheckCircle className="w-4 h-4 shrink-0" />
                    <span>This post will be marked as Posted</span>
                  </>
                ) : (
                  <>
                    <Clock className="w-4 h-4 shrink-0" />
                    <span>This post will be shared on {formatDate(new Date(`${scheduledDate}T${scheduledTime}`), "MMM d 'at' h:mm a")}</span>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Post Link (shown when datetime is in the past) */}
          {isScheduledInPast && (
            <div className="space-y-1.5">
              <Label className="text-small flex items-center gap-2">
                <ExternalLink className="w-3.5 h-3.5" />
                Post Link
              </Label>
              <Input
                type="url"
                value={distribution.platformPostUrl || ""}
                onChange={(e) => onUpdate({ platformPostUrl: e.target.value || null })}
                placeholder="https://..."
                className="bg-bg-0"
              />
              <p className="text-xs text-text-muted">Link to the published post</p>
            </div>
          )}

          {/* Internal Notes */}
          <div className="space-y-1.5">
            <Label className="text-small">Internal Notes</Label>
            <Textarea
              value={distribution.internalNotes || ""}
              onChange={(e) => onUpdate({ internalNotes: e.target.value || null })}
              placeholder="Notes for yourself..."
              rows={2}
              className="bg-bg-0"
            />
          </div>
        </div>
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Distribution</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this distribution for {accountName}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onRemove();
                setShowDeleteDialog(false);
              }}
              className="bg-status-danger hover:bg-status-danger/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
