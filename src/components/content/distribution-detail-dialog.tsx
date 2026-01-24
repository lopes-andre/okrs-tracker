"use client";

import { useState, useEffect, useCallback } from "react";
import { format as formatDate } from "date-fns";
import { Loader2, Calendar } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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
import { PlatformIcon } from "./platform-icon";
import { useUpdateDistribution } from "@/features/content/hooks";
import { useCreateTask } from "@/features/tasks/hooks";
import type { ContentDistribution, ContentDistributionStatus } from "@/lib/supabase/types";

// ============================================================================
// TYPES
// ============================================================================

interface DistributionDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  distribution: ContentDistribution;
  planId: string;
  postTitle?: string;
}

interface PlatformSpecificData {
  caption?: string;
  hashtags?: string[];
  location?: string;
  alt_text?: string;
  hide_likes?: boolean;
  disable_comments?: boolean;
  // LinkedIn
  mentioned_profiles?: string[];
  document_title?: string;
  article_title?: string;
  // YouTube
  video_title?: string;
  video_description?: string;
  tags?: string[];
  category?: string;
  visibility?: "public" | "unlisted" | "private";
  // TikTok
  sound?: string;
  duet_enabled?: boolean;
  stitch_enabled?: boolean;
  comments_enabled?: boolean;
  // X (Twitter)
  tweet_text?: string;
  thread_tweets?: string[];
  poll_options?: string[];
  poll_duration?: number;
  // Blog
  slug?: string;
  meta_title?: string;
  meta_description?: string;
  categories?: string[];
  seo_keywords?: string[];
  publish_status?: "draft" | "published";
  // Podcast/Spotify
  episode_title?: string;
  episode_description?: string;
  episode_number?: number;
  season_number?: number;
  explicit?: boolean;
  // Newsletter
  subject_line?: string;
  preview_text?: string;
  audience_segment?: string;
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
  ],
  spotify: [
    { value: "episode", label: "Episode" },
  ],
};

// ============================================================================
// COMPONENT
// ============================================================================

export function DistributionDetailDialog({
  open,
  onOpenChange,
  distribution,
  planId,
  postTitle,
}: DistributionDetailDialogProps) {
  const updateDistribution = useUpdateDistribution(planId);
  const createTask = useCreateTask(planId);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get account and platform info from distribution
  const dist = distribution as ContentDistribution & {
    account?: {
      account_name: string;
      platform?: { name: string; display_name: string };
    };
  };
  const platformName = dist.account?.platform?.name?.toLowerCase() || "blog";
  const platformDisplayName = dist.account?.platform?.display_name || "Platform";
  const accountName = dist.account?.account_name || "Account";

  // Form state
  const [format, setFormat] = useState(distribution.format || "");
  const [caption, setCaption] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [notes, setNotes] = useState(distribution.notes || "");
  const [platformData, setPlatformData] = useState<PlatformSpecificData>({});
  const [createReminderTask, setCreateReminderTask] = useState(false);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setFormat(distribution.format || "");
      setNotes(distribution.notes || "");
      setCreateReminderTask(false);

      // Parse platform-specific data
      const data = (distribution.platform_specific_data || {}) as PlatformSpecificData;
      setPlatformData(data);
      setCaption(data.caption || data.tweet_text || data.video_description || "");

      // Parse scheduled date/time
      if (distribution.scheduled_at) {
        const date = new Date(distribution.scheduled_at);
        setScheduledDate(formatDate(date, "yyyy-MM-dd"));
        setScheduledTime(formatDate(date, "HH:mm"));
      } else {
        setScheduledDate("");
        setScheduledTime("");
      }
    }
  }, [open, distribution]);

  // Handle save
  const handleSave = useCallback(async () => {
    setIsSubmitting(true);
    try {
      // Build scheduled_at if both date and time are set
      let scheduled_at: string | null = null;
      if (scheduledDate && scheduledTime) {
        scheduled_at = new Date(`${scheduledDate}T${scheduledTime}`).toISOString();
      }

      // Build platform-specific data
      const newPlatformData: PlatformSpecificData = {
        ...platformData,
        caption: caption || undefined,
      };

      // Determine status based on scheduling
      let status: ContentDistributionStatus = distribution.status;
      if (scheduled_at && status === "draft") {
        status = "scheduled";
      }

      await updateDistribution.mutateAsync({
        distributionId: distribution.id,
        updates: {
          format: format || "",
          notes: notes || undefined,
          scheduled_at,
          status,
          platform_specific_data: newPlatformData as Record<string, unknown>,
        },
      });

      // Create reminder task if enabled and scheduling
      if (createReminderTask && scheduled_at && postTitle) {
        const taskTitle = `Post to ${platformDisplayName}: ${postTitle}`;
        await createTask.mutateAsync({
          title: taskTitle,
          description: `Reminder to publish content to ${accountName} on ${platformDisplayName}`,
          status: "pending",
          priority: "medium",
          effort: "light",
          due_date: scheduledDate,
          due_time: scheduledTime,
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

      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  }, [
    distribution,
    format,
    notes,
    caption,
    scheduledDate,
    scheduledTime,
    platformData,
    updateDistribution,
    createTask,
    createReminderTask,
    postTitle,
    accountName,
    platformDisplayName,
    onOpenChange,
  ]);

  const formats = formatOptions[platformName] || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <PlatformIcon platformName={platformName} size="md" />
            <div>
              <DialogTitle>{accountName}</DialogTitle>
              <DialogDescription>{platformDisplayName}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Format */}
          {formats.length > 0 && (
            <div className="space-y-2">
              <Label>Format</Label>
              <Select value={format} onValueChange={setFormat}>
                <SelectTrigger>
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
          <div className="space-y-2">
            <Label>
              {platformName === "twitter" || platformName === "x"
                ? "Tweet"
                : platformName === "newsletter"
                ? "Subject Line"
                : "Caption"}
            </Label>
            <Textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder={`Enter ${platformName === "twitter" || platformName === "x" ? "tweet" : "caption"}...`}
              rows={4}
              maxLength={platformName === "twitter" || platformName === "x" ? 280 : undefined}
            />
            {(platformName === "twitter" || platformName === "x") && (
              <p className="text-small text-text-muted text-right">
                {caption.length}/280
              </p>
            )}
          </div>

          {/* Platform-specific fields */}
          {(platformName === "instagram" ||
            platformName === "linkedin" ||
            platformName === "tiktok") && (
            <div className="space-y-2">
              <Label>Hashtags</Label>
              <Input
                value={platformData.hashtags?.join(" ") || ""}
                onChange={(e) =>
                  setPlatformData({
                    ...platformData,
                    hashtags: e.target.value.split(/\s+/).filter(Boolean),
                  })
                }
                placeholder="#hashtag1 #hashtag2"
              />
              {platformName === "instagram" && (
                <p className="text-small text-text-muted">
                  {(platformData.hashtags?.length || 0)}/30 hashtags
                </p>
              )}
            </div>
          )}

          {platformName === "instagram" && (
            <>
              <div className="space-y-2">
                <Label>Location</Label>
                <Input
                  value={platformData.location || ""}
                  onChange={(e) =>
                    setPlatformData({ ...platformData, location: e.target.value })
                  }
                  placeholder="Add location..."
                />
              </div>
              <div className="space-y-2">
                <Label>Alt Text</Label>
                <Input
                  value={platformData.alt_text || ""}
                  onChange={(e) =>
                    setPlatformData({ ...platformData, alt_text: e.target.value })
                  }
                  placeholder="Describe the image for accessibility..."
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Hide Like Count</Label>
                <Switch
                  checked={platformData.hide_likes || false}
                  onCheckedChange={(checked) =>
                    setPlatformData({ ...platformData, hide_likes: checked })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Disable Comments</Label>
                <Switch
                  checked={platformData.disable_comments || false}
                  onCheckedChange={(checked) =>
                    setPlatformData({ ...platformData, disable_comments: checked })
                  }
                />
              </div>
            </>
          )}

          {platformName === "youtube" && (
            <>
              <div className="space-y-2">
                <Label>Video Title</Label>
                <Input
                  value={platformData.video_title || ""}
                  onChange={(e) =>
                    setPlatformData({ ...platformData, video_title: e.target.value })
                  }
                  placeholder="Enter video title..."
                />
              </div>
              <div className="space-y-2">
                <Label>Visibility</Label>
                <Select
                  value={platformData.visibility || "public"}
                  onValueChange={(value) =>
                    setPlatformData({
                      ...platformData,
                      visibility: value as "public" | "unlisted" | "private",
                    })
                  }
                >
                  <SelectTrigger>
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
            <div className="space-y-2">
              <Label>
                {platformName === "blog" ? "Slug" : "Preview Text"}
              </Label>
              <Input
                value={
                  platformName === "blog"
                    ? platformData.slug || ""
                    : platformData.preview_text || ""
                }
                onChange={(e) =>
                  setPlatformData({
                    ...platformData,
                    [platformName === "blog" ? "slug" : "preview_text"]: e.target.value,
                  })
                }
                placeholder={
                  platformName === "blog"
                    ? "my-article-slug"
                    : "Email preview text..."
                }
              />
            </div>
          )}

          {(platformName === "spotify" || platformName === "podcast") && (
            <>
              <div className="space-y-2">
                <Label>Episode Title</Label>
                <Input
                  value={platformData.episode_title || ""}
                  onChange={(e) =>
                    setPlatformData({ ...platformData, episode_title: e.target.value })
                  }
                  placeholder="Episode title..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Season #</Label>
                  <Input
                    type="number"
                    value={platformData.season_number || ""}
                    onChange={(e) =>
                      setPlatformData({
                        ...platformData,
                        season_number: parseInt(e.target.value) || undefined,
                      })
                    }
                    placeholder="1"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Episode #</Label>
                  <Input
                    type="number"
                    value={platformData.episode_number || ""}
                    onChange={(e) =>
                      setPlatformData({
                        ...platformData,
                        episode_number: parseInt(e.target.value) || undefined,
                      })
                    }
                    placeholder="1"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <Label>Explicit Content</Label>
                <Switch
                  checked={platformData.explicit || false}
                  onCheckedChange={(checked) =>
                    setPlatformData({ ...platformData, explicit: checked })
                  }
                />
              </div>
            </>
          )}

          {/* Scheduling */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Schedule
            </Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-small text-text-muted">Date</Label>
                <Input
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-small text-text-muted">Time</Label>
                <Input
                  type="time"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                />
              </div>
            </div>
            <p className="text-small text-text-muted">
              Leave empty to keep as draft
            </p>
          </div>

          {/* Create reminder task toggle - only show when scheduling */}
          {(scheduledDate || scheduledTime) && (
            <div className="flex items-center justify-between p-3 bg-bg-1 rounded-lg">
              <div>
                <Label>Create reminder task</Label>
                <p className="text-small text-text-muted">
                  Add a task to remind you to post
                </p>
              </div>
              <Switch
                checked={createReminderTask}
                onCheckedChange={setCreateReminderTask}
              />
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Internal notes..."
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
