"use client";

import { useState, useEffect, useCallback, useId, useRef } from "react";
import { format as formatDate, isPast } from "date-fns";
import {
  ChevronDown,
  Calendar,
  CheckCircle,
  Clock,
  Edit,
  Trash2,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
import { useUpdateDistribution, useDeleteDistribution } from "@/features/content/hooks";
import { useCreateTask } from "@/features/tasks/hooks";
import { cn } from "@/lib/utils";
import type {
  ContentDistribution,
  ContentDistributionStatus,
  ContentAccountWithPlatform,
} from "@/lib/supabase/types";

// ============================================================================
// TYPES
// ============================================================================

interface DistributionAccordionItemProps {
  distribution: ContentDistribution & {
    account?: ContentAccountWithPlatform;
  };
  planId: string;
  postTitle?: string;
  isExpanded: boolean;
  onToggle: () => void;
}

interface PlatformSpecificData {
  caption?: string;
  hashtags?: string[];
  location?: string;
  alt_text?: string;
  hide_likes?: boolean;
  disable_comments?: boolean;
  mentioned_profiles?: string[];
  document_title?: string;
  article_title?: string;
  video_title?: string;
  video_description?: string;
  tags?: string[];
  category?: string;
  visibility?: "public" | "unlisted" | "private";
  sound?: string;
  duet_enabled?: boolean;
  stitch_enabled?: boolean;
  comments_enabled?: boolean;
  tweet_text?: string;
  thread_tweets?: string[];
  poll_options?: string[];
  poll_duration?: number;
  slug?: string;
  meta_title?: string;
  meta_description?: string;
  categories?: string[];
  seo_keywords?: string[];
  publish_status?: "draft" | "published";
  episode_title?: string;
  episode_description?: string;
  episode_number?: number;
  season_number?: number;
  explicit?: boolean;
  subject_line?: string;
  preview_text?: string;
  audience_segment?: string;
  internal_notes?: string;
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

const statusConfig: Record<ContentDistributionStatus, { label: string; icon: typeof Clock; color: string }> = {
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
// COMPONENT
// ============================================================================

export function DistributionAccordionItem({
  distribution,
  planId,
  postTitle,
  isExpanded,
  onToggle,
}: DistributionAccordionItemProps) {
  const contentId = useId();
  const updateDistribution = useUpdateDistribution(planId);
  const deleteDistribution = useDeleteDistribution(planId);
  const createTask = useCreateTask(planId);
  const hasAutoUpdated = useRef(false);

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Check if distribution should be auto-marked as posted
  // (scheduled time has passed but status is still "scheduled")
  const isOverdue = distribution.status === "scheduled" &&
    distribution.scheduled_at &&
    isPast(new Date(distribution.scheduled_at));

  // Compute effective status (for display)
  const effectiveStatus: ContentDistributionStatus = isOverdue ? "posted" : distribution.status;

  // Auto-update overdue distributions to posted status
  useEffect(() => {
    if (isOverdue && !hasAutoUpdated.current && !updateDistribution.isPending) {
      hasAutoUpdated.current = true;
      updateDistribution.mutate({
        distributionId: distribution.id,
        updates: {
          status: "posted",
          posted_at: distribution.scheduled_at, // Use scheduled time as posted time
        },
      });
    }
  }, [isOverdue, distribution.id, distribution.scheduled_at, updateDistribution]);

  // Reset auto-update flag when distribution changes
  useEffect(() => {
    hasAutoUpdated.current = false;
  }, [distribution.id]);

  // Get account and platform info
  const account = distribution.account;
  const platformName = account?.platform?.name?.toLowerCase() || "blog";
  const platformDisplayName = account?.platform?.display_name || "Platform";
  const accountName = account?.account_name || "Unknown Account";
  const status = statusConfig[effectiveStatus];
  const StatusIcon = status.icon;
  const formats = formatOptions[platformName] || [];

  // Form state
  const [format, setFormat] = useState(distribution.format || "");
  const [caption, setCaption] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [platformData, setPlatformData] = useState<PlatformSpecificData>({});
  const [platformPostUrl, setPlatformPostUrl] = useState("");
  const [createPerformanceCheckTasks, setCreatePerformanceCheckTasks] = useState(false);

  // Initialize form when distribution changes or accordion expands
  useEffect(() => {
    if (isExpanded) {
      setFormat(distribution.format || "");
      const data = (distribution.platform_specific_data || {}) as PlatformSpecificData;
      setPlatformData(data);
      setCaption(data.caption || data.tweet_text || data.video_description || "");
      setInternalNotes(data.internal_notes || "");
      setPlatformPostUrl(distribution.platform_post_url || "");
      setCreatePerformanceCheckTasks(false);
      setHasChanges(false);

      if (distribution.scheduled_at) {
        const date = new Date(distribution.scheduled_at);
        setScheduledDate(formatDate(date, "yyyy-MM-dd"));
        setScheduledTime(formatDate(date, "HH:mm"));
      } else {
        setScheduledDate("");
        setScheduledTime("");
      }
    }
  }, [isExpanded, distribution]);

  // Track changes
  const handleFieldChange = useCallback(() => {
    setHasChanges(true);
  }, []);

  // Handle save
  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      let scheduled_at: string | null = null;
      if (scheduledDate && scheduledTime) {
        scheduled_at = new Date(`${scheduledDate}T${scheduledTime}`).toISOString();
      }

      const newPlatformData: PlatformSpecificData = {
        ...platformData,
        internal_notes: internalNotes || undefined,
      };

      let newStatus: ContentDistributionStatus = distribution.status;
      if (scheduled_at && newStatus === "draft") {
        newStatus = "scheduled";
      }

      await updateDistribution.mutateAsync({
        distributionId: distribution.id,
        updates: {
          format: format || null,
          caption: caption || null,
          scheduled_at,
          status: newStatus,
          platform_specific_data: newPlatformData as Record<string, unknown>,
          platform_post_url: platformPostUrl || null,
        },
      });

      // Create performance check tasks if enabled (1 week and 1 month after scheduled date)
      if (createPerformanceCheckTasks && scheduled_at && postTitle) {
        const scheduledDateObj = new Date(scheduled_at);

        // 1 week performance check task
        const oneWeekLater = new Date(scheduledDateObj);
        oneWeekLater.setDate(oneWeekLater.getDate() + 7);
        await createTask.mutateAsync({
          title: `1-week check: ${postTitle} on ${platformDisplayName}`,
          description: `Check performance metrics for "${postTitle}" posted to ${accountName} on ${platformDisplayName}. Look at engagement, reach, and any early insights.`,
          status: "pending",
          priority: "low",
          effort: "light",
          due_date: formatDate(oneWeekLater, "yyyy-MM-dd"),
          due_time: null,
          objective_id: null,
          annual_kr_id: null,
          quarter_target_id: null,
          assigned_to: null,
          reminder_enabled: true,
          sort_order: 0,
          is_recurring: false,
          recurring_master_id: null,
        });

        // 1 month performance check task
        const oneMonthLater = new Date(scheduledDateObj);
        oneMonthLater.setMonth(oneMonthLater.getMonth() + 1);
        await createTask.mutateAsync({
          title: `1-month check: ${postTitle} on ${platformDisplayName}`,
          description: `Review final performance metrics for "${postTitle}" posted to ${accountName} on ${platformDisplayName}. Document learnings and compare to goals.`,
          status: "pending",
          priority: "low",
          effort: "light",
          due_date: formatDate(oneMonthLater, "yyyy-MM-dd"),
          due_time: null,
          objective_id: null,
          annual_kr_id: null,
          quarter_target_id: null,
          assigned_to: null,
          reminder_enabled: true,
          sort_order: 0,
          is_recurring: false,
          recurring_master_id: null,
        });
      }

      setHasChanges(false);
    } finally {
      setIsSaving(false);
    }
  }, [
    distribution,
    format,
    caption,
    scheduledDate,
    scheduledTime,
    internalNotes,
    platformData,
    platformPostUrl,
    createPerformanceCheckTasks,
    postTitle,
    accountName,
    platformDisplayName,
    updateDistribution,
    createTask,
  ]);

  // Handle delete
  const handleConfirmDelete = useCallback(async () => {
    await deleteDistribution.mutateAsync(distribution.id);
    setShowDeleteDialog(false);
  }, [distribution.id, deleteDistribution]);

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
            <Badge variant="outline" className={cn("shrink-0 text-[10px]", status.color)}>
              <StatusIcon className="w-3 h-3 mr-1" />
              {status.label}
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
            {distribution.scheduled_at && (
              <>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {formatDate(new Date(distribution.scheduled_at), "MMM d 'at' h:mm a")}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {distribution.platform_post_url && (
            <a
              href={distribution.platform_post_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="p-2 text-text-muted hover:text-accent transition-colors"
              title="View post"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-text-muted hover:text-status-danger"
            onClick={(e) => {
              e.stopPropagation();
              setShowDeleteDialog(true);
            }}
            title="Delete"
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
                value={format}
                onValueChange={(v) => {
                  setFormat(v);
                  handleFieldChange();
                }}
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
              value={caption}
              onChange={(e) => {
                setCaption(e.target.value);
                handleFieldChange();
              }}
              placeholder={`Enter ${platformName === "twitter" || platformName === "x" ? "tweet" : "caption"}...`}
              rows={3}
              maxLength={platformName === "twitter" || platformName === "x" ? 280 : undefined}
              className="bg-bg-0"
            />
            {(platformName === "twitter" || platformName === "x") && (
              <p className="text-xs text-text-muted text-right">{caption.length}/280</p>
            )}
          </div>

          {/* Detected Hashtags (auto-extracted from caption) */}
          {(platformName === "instagram" || platformName === "linkedin" || platformName === "tiktok") && caption && (
            (() => {
              const detectedHashtags = caption.match(/#[a-zA-Z0-9_]+/g) || [];
              if (detectedHashtags.length === 0) return null;
              return (
                <div className="p-3 bg-bg-0 rounded-lg border border-border-soft">
                  <p className="text-xs text-text-muted mb-2">
                    Detected hashtags ({detectedHashtags.length}{platformName === "instagram" ? "/30" : ""}):
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {detectedHashtags.map((tag, idx) => (
                      <span key={idx} className="text-xs text-accent bg-accent/10 px-1.5 py-0.5 rounded">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })()
          )}

          {platformName === "youtube" && (
            <>
              <div className="space-y-1.5">
                <Label className="text-small">Video Title</Label>
                <Input
                  value={platformData.video_title || ""}
                  onChange={(e) => {
                    setPlatformData({ ...platformData, video_title: e.target.value });
                    handleFieldChange();
                  }}
                  placeholder="Video title..."
                  className="bg-bg-0"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-small">Visibility</Label>
                <Select
                  value={platformData.visibility || "public"}
                  onValueChange={(v) => {
                    setPlatformData({
                      ...platformData,
                      visibility: v as "public" | "unlisted" | "private",
                    });
                    handleFieldChange();
                  }}
                >
                  <SelectTrigger className="bg-bg-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">Public</SelectItem>
                    <SelectItem value="unlisted">Unlisted</SelectItem>
                    <SelectItem value="private">Private</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {(platformName === "blog" || platformName === "newsletter") && (
            <div className="space-y-1.5">
              <Label className="text-small">
                {platformName === "blog" ? "Slug" : "Preview Text"}
              </Label>
              <Input
                value={platformName === "blog" ? platformData.slug || "" : platformData.preview_text || ""}
                onChange={(e) => {
                  setPlatformData({
                    ...platformData,
                    [platformName === "blog" ? "slug" : "preview_text"]: e.target.value,
                  });
                  handleFieldChange();
                }}
                placeholder={platformName === "blog" ? "my-article-slug" : "Preview text..."}
                className="bg-bg-0"
              />
            </div>
          )}

          {(platformName === "spotify" || platformName === "podcast") && (
            <>
              <div className="space-y-1.5">
                <Label className="text-small">Episode Title</Label>
                <Input
                  value={platformData.episode_title || ""}
                  onChange={(e) => {
                    setPlatformData({ ...platformData, episode_title: e.target.value });
                    handleFieldChange();
                  }}
                  placeholder="Episode title..."
                  className="bg-bg-0"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-small">Season #</Label>
                  <Input
                    type="number"
                    value={platformData.season_number || ""}
                    onChange={(e) => {
                      setPlatformData({
                        ...platformData,
                        season_number: parseInt(e.target.value) || undefined,
                      });
                      handleFieldChange();
                    }}
                    placeholder="1"
                    className="bg-bg-0"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-small">Episode #</Label>
                  <Input
                    type="number"
                    value={platformData.episode_number || ""}
                    onChange={(e) => {
                      setPlatformData({
                        ...platformData,
                        episode_number: parseInt(e.target.value) || undefined,
                      });
                      handleFieldChange();
                    }}
                    placeholder="1"
                    className="bg-bg-0"
                  />
                </div>
              </div>
            </>
          )}

          {/* Already posted tip */}
          {effectiveStatus === "posted" && (
            <div className="flex items-center gap-2 p-3 bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400 rounded-lg">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span className="text-small">This post was already shared</span>
            </div>
          )}

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
                onChange={(e) => {
                  setScheduledDate(e.target.value);
                  handleFieldChange();
                }}
                className="bg-bg-0"
              />
              <Input
                type="time"
                value={scheduledTime}
                onChange={(e) => {
                  setScheduledTime(e.target.value);
                  handleFieldChange();
                }}
                className="bg-bg-0"
              />
            </div>

            {/* Contextual tip based on schedule datetime */}
            {scheduledDate && scheduledTime && effectiveStatus !== "posted" && (
              <div className="flex items-center gap-2 p-2 rounded-lg text-small bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400">
                <Clock className="w-4 h-4 shrink-0" />
                <span>This post will be shared on {formatDate(new Date(`${scheduledDate}T${scheduledTime}`), "MMM d 'at' h:mm a")}</span>
              </div>
            )}
          </div>

          {/* Create performance check tasks toggle */}
          {(scheduledDate || scheduledTime) && (
            <div className="flex items-center justify-between p-3 bg-bg-0 rounded-lg border border-border-soft">
              <div>
                <Label className="text-small">Create performance check tasks</Label>
                <p className="text-xs text-text-muted">Add tasks to check metrics at 1 week and 1 month</p>
              </div>
              <Switch checked={createPerformanceCheckTasks} onCheckedChange={setCreatePerformanceCheckTasks} />
            </div>
          )}

          {/* Post Link (for posted distributions) */}
          {effectiveStatus === "posted" && (
            <div className="space-y-1.5">
              <Label className="text-small flex items-center gap-2">
                <ExternalLink className="w-3.5 h-3.5" />
                Post Link
              </Label>
              <Input
                type="url"
                value={platformPostUrl}
                onChange={(e) => {
                  setPlatformPostUrl(e.target.value);
                  handleFieldChange();
                }}
                placeholder="https://..."
                className="bg-bg-0"
              />
              <p className="text-xs text-text-muted">Link to the published post</p>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-1.5">
            <Label className="text-small">Internal Notes</Label>
            <Textarea
              value={internalNotes}
              onChange={(e) => {
                setInternalNotes(e.target.value);
                handleFieldChange();
              }}
              placeholder="Notes for yourself..."
              rows={2}
              className="bg-bg-0"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end pt-2 border-t border-border-soft">
            {hasChanges && (
              <Button
                size="sm"
                onClick={handleSave}
                disabled={isSaving}
                className="bg-accent hover:bg-accent-hover text-white"
              >
                {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Save Changes
              </Button>
            )}
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
              onClick={handleConfirmDelete}
              className="bg-status-danger hover:bg-status-danger/90"
            >
              {deleteDistribution.isPending && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
