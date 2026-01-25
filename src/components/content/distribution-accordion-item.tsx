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

export interface DistributionEditData {
  format?: string | null;
  caption?: string | null;
  scheduledDate?: string;
  scheduledTime?: string;
  platformPostUrl?: string | null;
  internalNotes?: string | null;
  platformData?: PlatformSpecificData;
  createPerformanceCheckTasks?: boolean;
}

interface DistributionAccordionItemProps {
  distribution: ContentDistribution & {
    account?: ContentAccountWithPlatform;
  };
  planId: string;
  postTitle?: string;
  isExpanded: boolean;
  onToggle: () => void;
  // Controlled mode props (optional - if not provided, uses direct database updates)
  editedValues?: DistributionEditData;
  onUpdate?: (distributionId: string, updates: DistributionEditData) => void;
  onDelete?: (distributionId: string) => void;
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
  create_performance_check_tasks?: boolean;
  performance_tasks_created?: boolean;
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
  editedValues,
  onUpdate,
  onDelete,
}: DistributionAccordionItemProps) {
  const contentId = useId();
  const updateDistribution = useUpdateDistribution(planId);
  const deleteDistribution = useDeleteDistribution(planId);
  const createTask = useCreateTask(planId);
  const hasAutoUpdated = useRef(false);

  // Controlled mode: changes go to parent via onUpdate
  const isControlled = !!onUpdate;

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

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

  // Form state - use editedValues in controlled mode, otherwise local state
  const [localFormat, setLocalFormat] = useState(distribution.format || "");
  const [localCaption, setLocalCaption] = useState("");
  const [localScheduledDate, setLocalScheduledDate] = useState("");
  const [localScheduledTime, setLocalScheduledTime] = useState("");
  const [localInternalNotes, setLocalInternalNotes] = useState("");
  const [localPlatformData, setLocalPlatformData] = useState<PlatformSpecificData>({});
  const [localPlatformPostUrl, setLocalPlatformPostUrl] = useState("");
  const [localCreatePerformanceCheckTasks, setLocalCreatePerformanceCheckTasks] = useState(true); // Default ON
  const [hasLocalChanges, setHasLocalChanges] = useState(false);

  // Get current values - prefer editedValues in controlled mode
  const format = isControlled && editedValues?.format !== undefined ? editedValues.format || "" : localFormat;
  const caption = isControlled && editedValues?.caption !== undefined ? editedValues.caption || "" : localCaption;
  const scheduledDate = isControlled && editedValues?.scheduledDate !== undefined ? editedValues.scheduledDate : localScheduledDate;
  const scheduledTime = isControlled && editedValues?.scheduledTime !== undefined ? editedValues.scheduledTime : localScheduledTime;
  const internalNotes = isControlled && editedValues?.internalNotes !== undefined ? editedValues.internalNotes || "" : localInternalNotes;
  const platformData = isControlled && editedValues?.platformData !== undefined ? editedValues.platformData : localPlatformData;
  const platformPostUrl = isControlled && editedValues?.platformPostUrl !== undefined ? editedValues.platformPostUrl || "" : localPlatformPostUrl;
  const createPerformanceCheckTasks = isControlled && editedValues?.createPerformanceCheckTasks !== undefined ? editedValues.createPerformanceCheckTasks : localCreatePerformanceCheckTasks;

  // Initialize local form state when distribution changes or accordion expands (uncontrolled mode only)
  useEffect(() => {
    if (isExpanded && !isControlled) {
      setLocalFormat(distribution.format || "");
      const data = (distribution.platform_specific_data || {}) as PlatformSpecificData;
      setLocalPlatformData(data);
      // Read caption from distribution.caption first, then fallback to platform_specific_data for legacy data
      setLocalCaption(distribution.caption || data.caption || data.tweet_text || data.video_description || "");
      setLocalInternalNotes(data.internal_notes || "");
      setLocalPlatformPostUrl(distribution.platform_post_url || "");
      // Load saved toggle state, default to true if not explicitly set
      const savedToggleState = data.create_performance_check_tasks;
      setLocalCreatePerformanceCheckTasks(savedToggleState !== undefined ? savedToggleState : true);
      setHasLocalChanges(false);

      if (distribution.scheduled_at) {
        const date = new Date(distribution.scheduled_at);
        setLocalScheduledDate(formatDate(date, "yyyy-MM-dd"));
        setLocalScheduledTime(formatDate(date, "HH:mm"));
      } else {
        setLocalScheduledDate("");
        setLocalScheduledTime("");
      }
    }
  }, [isExpanded, distribution, isControlled]);

  // Initialize edited values in controlled mode when accordion expands
  useEffect(() => {
    if (isExpanded && isControlled && !editedValues) {
      const data = (distribution.platform_specific_data || {}) as PlatformSpecificData;
      let initScheduledDate = "";
      let initScheduledTime = "";
      if (distribution.scheduled_at) {
        const date = new Date(distribution.scheduled_at);
        initScheduledDate = formatDate(date, "yyyy-MM-dd");
        initScheduledTime = formatDate(date, "HH:mm");
      }

      // Load saved toggle state, default to true if not explicitly set
      const savedToggleState = data.create_performance_check_tasks;

      onUpdate(distribution.id, {
        format: distribution.format,
        // Read caption from distribution.caption first, then fallback to platform_specific_data for legacy data
        caption: distribution.caption || data.caption || data.tweet_text || data.video_description || null,
        scheduledDate: initScheduledDate,
        scheduledTime: initScheduledTime,
        internalNotes: data.internal_notes || null,
        platformData: data,
        platformPostUrl: distribution.platform_post_url,
        createPerformanceCheckTasks: savedToggleState !== undefined ? savedToggleState : true,
      });
    }
  }, [isExpanded, isControlled, editedValues, distribution, onUpdate]);

  // Handle field updates
  const handleFieldUpdate = useCallback((updates: Partial<DistributionEditData>) => {
    if (isControlled) {
      onUpdate(distribution.id, { ...editedValues, ...updates });
    } else {
      // Update local state
      if (updates.format !== undefined) setLocalFormat(updates.format || "");
      if (updates.caption !== undefined) setLocalCaption(updates.caption || "");
      if (updates.scheduledDate !== undefined) setLocalScheduledDate(updates.scheduledDate);
      if (updates.scheduledTime !== undefined) setLocalScheduledTime(updates.scheduledTime);
      if (updates.internalNotes !== undefined) setLocalInternalNotes(updates.internalNotes || "");
      if (updates.platformData !== undefined) setLocalPlatformData(updates.platformData);
      if (updates.platformPostUrl !== undefined) setLocalPlatformPostUrl(updates.platformPostUrl || "");
      if (updates.createPerformanceCheckTasks !== undefined) setLocalCreatePerformanceCheckTasks(updates.createPerformanceCheckTasks);
      setHasLocalChanges(true);
    }
  }, [isControlled, distribution.id, editedValues, onUpdate]);

  // Handle save (uncontrolled mode only)
  const handleSave = useCallback(async () => {
    if (isControlled) return; // In controlled mode, parent handles saving

    setIsSaving(true);
    try {
      let scheduled_at: string | null = null;
      if (scheduledDate && scheduledTime) {
        scheduled_at = new Date(`${scheduledDate}T${scheduledTime}`).toISOString();
      }

      // Check if tasks were already created to prevent duplicates
      const tasksAlreadyCreated = platformData.performance_tasks_created === true;
      const shouldCreateTasks = createPerformanceCheckTasks && scheduled_at && postTitle && !tasksAlreadyCreated;

      const newPlatformData: PlatformSpecificData = {
        ...platformData,
        internal_notes: internalNotes || undefined,
        // Save the toggle state
        create_performance_check_tasks: createPerformanceCheckTasks,
        // Mark tasks as created if we're about to create them
        ...(shouldCreateTasks ? { performance_tasks_created: true } : {}),
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

      // Create performance check tasks if enabled and not already created
      if (shouldCreateTasks) {
        const scheduledDateObj = new Date(scheduled_at!);

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

      setHasLocalChanges(false);
    } finally {
      setIsSaving(false);
    }
  }, [
    isControlled,
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
    if (isControlled && onDelete) {
      onDelete(distribution.id);
      setShowDeleteDialog(false);
    } else {
      await deleteDistribution.mutateAsync(distribution.id);
      setShowDeleteDialog(false);
    }
  }, [isControlled, onDelete, distribution.id, deleteDistribution]);

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
                onValueChange={(v) => handleFieldUpdate({ format: v })}
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

          {/* Caption / Content - different fields based on platform */}
          {platformName === "newsletter" ? (
            <>
              {/* Newsletter: Subject Line (Input) then Preview Text (Textarea) */}
              <div className="space-y-1.5">
                <Label className="text-small">Subject Line</Label>
                <Input
                  value={platformData?.subject_line || ""}
                  onChange={(e) => handleFieldUpdate({ platformData: { ...platformData, subject_line: e.target.value } })}
                  placeholder="Newsletter subject line..."
                  className="bg-bg-0"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-small">Preview Text</Label>
                <Textarea
                  value={caption}
                  onChange={(e) => handleFieldUpdate({ caption: e.target.value })}
                  placeholder="Preview text shown in email clients..."
                  rows={3}
                  className="bg-bg-0"
                />
              </div>
            </>
          ) : platformName === "blog" ? (
            <>
              {/* Blog: Blog Post Title (Input) then Meta Description (Textarea) */}
              <div className="space-y-1.5">
                <Label className="text-small">Blog Post Title</Label>
                <Input
                  value={platformData?.article_title || ""}
                  onChange={(e) => handleFieldUpdate({ platformData: { ...platformData, article_title: e.target.value } })}
                  placeholder="Blog post title..."
                  className="bg-bg-0"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-small">Meta Description</Label>
                <Textarea
                  value={platformData?.meta_description || ""}
                  onChange={(e) => handleFieldUpdate({ platformData: { ...platformData, meta_description: e.target.value } })}
                  placeholder="SEO meta description for the blog post..."
                  rows={3}
                  className="bg-bg-0"
                />
              </div>
            </>
          ) : (
            <div className="space-y-1.5">
              <Label className="text-small">
                {platformName === "twitter" || platformName === "x" ? "Tweet" : "Caption"}
              </Label>
              <Textarea
                value={caption}
                onChange={(e) => handleFieldUpdate({ caption: e.target.value })}
                placeholder={`Enter ${platformName === "twitter" || platformName === "x" ? "tweet" : "caption"}...`}
                rows={3}
                maxLength={platformName === "twitter" || platformName === "x" ? 280 : undefined}
                className="bg-bg-0"
              />
              {(platformName === "twitter" || platformName === "x") && (
                <p className="text-xs text-text-muted text-right">{caption.length}/280</p>
              )}
            </div>
          )}

          {/* Detected Hashtags (auto-extracted from caption) */}
          {(platformName === "instagram" || platformName === "linkedin" || platformName === "tiktok" || platformName === "youtube" || platformName === "spotify" || platformName === "x" || platformName === "twitter") && caption && (
            (() => {
              const detectedHashtags = caption.match(/#[a-zA-Z0-9_]+/g) || [];
              if (detectedHashtags.length === 0) return null;
              const maxHashtags = platformName === "instagram" ? 30 : platformName === "youtube" ? 15 : undefined;
              return (
                <div className="p-3 bg-bg-0 rounded-lg border border-border-soft">
                  <p className="text-xs text-text-muted mb-2">
                    Detected hashtags ({detectedHashtags.length}{maxHashtags ? `/${maxHashtags}` : ""}):
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
                  value={platformData?.video_title || ""}
                  onChange={(e) => handleFieldUpdate({ platformData: { ...platformData, video_title: e.target.value } })}
                  placeholder="Video title..."
                  className="bg-bg-0"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-small">Visibility</Label>
                <Select
                  value={platformData?.visibility || "public"}
                  onValueChange={(v) => handleFieldUpdate({ platformData: { ...platformData, visibility: v as "public" | "unlisted" | "private" } })}
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


          {(platformName === "spotify" || platformName === "podcast") && (
            <>
              <div className="space-y-1.5">
                <Label className="text-small">Episode Title</Label>
                <Input
                  value={platformData?.episode_title || ""}
                  onChange={(e) => handleFieldUpdate({ platformData: { ...platformData, episode_title: e.target.value } })}
                  placeholder="Episode title..."
                  className="bg-bg-0"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-small">Season #</Label>
                  <Input
                    type="number"
                    value={platformData?.season_number || ""}
                    onChange={(e) => handleFieldUpdate({ platformData: { ...platformData, season_number: parseInt(e.target.value) || undefined } })}
                    placeholder="1"
                    className="bg-bg-0"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-small">Episode #</Label>
                  <Input
                    type="number"
                    value={platformData?.episode_number || ""}
                    onChange={(e) => handleFieldUpdate({ platformData: { ...platformData, episode_number: parseInt(e.target.value) || undefined } })}
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
                onChange={(e) => handleFieldUpdate({ scheduledDate: e.target.value })}
                className="bg-bg-0"
              />
              <Input
                type="time"
                value={scheduledTime}
                onChange={(e) => handleFieldUpdate({ scheduledTime: e.target.value })}
                className="bg-bg-0"
              />
            </div>

            {/* Contextual tip based on schedule datetime */}
            {scheduledDate && scheduledTime && effectiveStatus !== "posted" && (() => {
              const scheduledDateTime = new Date(`${scheduledDate}T${scheduledTime}`);
              const isInPast = isPast(scheduledDateTime);

              return isInPast ? (
                <div className="flex items-center gap-2 p-2 rounded-lg text-small bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400">
                  <CheckCircle className="w-4 h-4 shrink-0" />
                  <span>This post will be marked as Posted (scheduled time has passed)</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 p-2 rounded-lg text-small bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400">
                  <Clock className="w-4 h-4 shrink-0" />
                  <span>This post will be shared on {formatDate(scheduledDateTime, "MMM d 'at' h:mm a")}</span>
                </div>
              );
            })()}
          </div>

          {/* Create performance check tasks toggle */}
          {(scheduledDate || scheduledTime) && (
            <div className="flex items-center justify-between p-3 bg-bg-0 rounded-lg border border-border-soft">
              <div>
                <Label className="text-small">Create performance check tasks</Label>
                <p className="text-xs text-text-muted">Add tasks to check metrics at 1 week and 1 month</p>
              </div>
              <Switch checked={createPerformanceCheckTasks} onCheckedChange={(checked) => handleFieldUpdate({ createPerformanceCheckTasks: checked })} />
            </div>
          )}

          {/* Post Link (for posted distributions or when scheduled time is in the past) */}
          {(effectiveStatus === "posted" || (scheduledDate && scheduledTime && isPast(new Date(`${scheduledDate}T${scheduledTime}`)))) && (
            <div className="space-y-1.5">
              <Label className="text-small flex items-center gap-2">
                <ExternalLink className="w-3.5 h-3.5" />
                Post Link
              </Label>
              <Input
                type="url"
                value={platformPostUrl}
                onChange={(e) => handleFieldUpdate({ platformPostUrl: e.target.value })}
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
              onChange={(e) => handleFieldUpdate({ internalNotes: e.target.value })}
              placeholder="Notes for yourself..."
              rows={2}
              className="bg-bg-0"
            />
          </div>

          {/* Actions - only show in uncontrolled mode */}
          {!isControlled && hasLocalChanges && (
            <div className="flex items-center justify-end pt-2 border-t border-border-soft">
              <Button
                size="sm"
                onClick={handleSave}
                disabled={isSaving}
                className="bg-accent hover:bg-accent-hover text-white"
              >
                {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Save Changes
              </Button>
            </div>
          )}
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
