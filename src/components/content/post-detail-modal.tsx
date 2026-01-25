"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Loader2,
  X,
  Trash2,
  Copy,
  MoreHorizontal,
  FileText,
  Send,
  Activity,
  Image as ImageIcon,
  Link2,
  Plus,
  ExternalLink,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { format as formatDate, isPast } from "date-fns";
import { usePost, useUpdatePost, useDeletePost, useCreatePost, useAddPostLink, useDeletePostLink, useUploadMedia, useAddVideoLink, useCreateDistribution, useUpdateDistribution, useDeleteDistribution } from "@/features/content/hooks";
import { useCreateTask } from "@/features/tasks/hooks";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";
import { PostDistributionsTab } from "./post-distributions-tab";
import type { DistributionEditData } from "./distribution-accordion-item";
import { PostMetricsTab } from "./post-metrics-tab";
import { MediaSection } from "./media-section";
import { PendingMediaUpload } from "./pending-media-upload";
import { PendingDistributionsTab } from "./pending-distributions-tab";
import type {
  ContentPostStatus,
  ContentGoal,
  ContentAccountWithPlatform,
  ContentDistributionInsert,
} from "@/lib/supabase/types";

// ============================================================================
// PENDING TYPES
// ============================================================================

interface PendingLink {
  id: string;
  url: string;
  title: string;
}

interface PendingVideoLink {
  id: string;
  url: string;
  title: string;
}

interface PendingDistributionPlatformData {
  subject_line?: string;
  preview_text?: string;
  article_title?: string;
  meta_description?: string;
  video_title?: string;
  visibility?: "public" | "unlisted" | "private";
  episode_title?: string;
  season_number?: number;
  episode_number?: number;
}

interface PendingDistribution {
  id: string;
  accountId: string;
  format: string | null;
  caption: string | null;
  scheduledAt: string | null;
  postedAt: string | null;
  status: "draft" | "scheduled" | "posted";
  platformPostUrl?: string | null;
  internalNotes?: string | null;
  createPerformanceCheckTasks?: boolean;
  platformData?: PendingDistributionPlatformData;
}

// ============================================================================
// TYPES
// ============================================================================

interface PositionInfo {
  currentPosition: number; // 1-based position
  totalInStatus: number;
}

interface PostDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planId: string;
  postId?: string | null;
  goals: ContentGoal[];
  accounts: ContentAccountWithPlatform[];
  initialStatus?: ContentPostStatus;
  positionInfo?: PositionInfo; // Position info for reordering
  onPositionChange?: (newPosition: number) => void; // Callback when position changes
}

// ============================================================================
// STATUS OPTIONS
// ============================================================================

const statusOptions: { value: ContentPostStatus; label: string; color: string }[] = [
  { value: "backlog", label: "Backlog", color: "bg-text-muted/20" },
  { value: "tagged", label: "Tagged", color: "bg-amber-100 dark:bg-amber-900/30" },
  { value: "ongoing", label: "Ongoing", color: "bg-blue-100 dark:bg-blue-900/30" },
  { value: "complete", label: "Complete", color: "bg-green-100 dark:bg-green-900/30" },
];

// ============================================================================
// COMPONENT
// ============================================================================

export function PostDetailModal({
  open,
  onOpenChange,
  planId,
  postId,
  goals,
  accounts,
  initialStatus = "backlog",
  positionInfo,
  onPositionChange,
}: PostDetailModalProps) {
  const isEditing = !!postId;
  const { data: post, isLoading: isLoadingPost } = usePost(postId || "");
  const createPost = useCreatePost(planId);
  const updatePost = useUpdatePost(planId);
  const deletePost = useDeletePost(planId);
  const addPostLink = useAddPostLink(planId);
  const deletePostLink = useDeletePostLink(planId);
  const uploadMedia = useUploadMedia(planId);
  const addVideoLink = useAddVideoLink(planId);
  const createDistribution = useCreateDistribution(planId);
  const updateDistribution = useUpdateDistribution(planId);
  const deleteDistributionMutation = useDeleteDistribution(planId);
  const createTask = useCreateTask(planId);
  const { toast } = useToast();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showCloseConfirmDialog, setShowCloseConfirmDialog] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<ContentPostStatus>(initialStatus);
  const [selectedGoalIds, setSelectedGoalIds] = useState<string[]>([]);
  const [position, setPosition] = useState<number>(1);

  // Initial values for change tracking (edit mode)
  const [initialTitle, setInitialTitle] = useState("");
  const [initialDescription, setInitialDescription] = useState("");
  const [initialGoalIds, setInitialGoalIds] = useState<string[]>([]);
  const [initialPosition, setInitialPosition] = useState<number>(1);

  // Link form state (for existing posts)
  const [showAddLinkForm, setShowAddLinkForm] = useState(false);
  const [newLinkUrl, setNewLinkUrl] = useState("");
  const [newLinkTitle, setNewLinkTitle] = useState("");

  // Pending state for new posts (stored locally until post is created)
  const [pendingMediaFiles, setPendingMediaFiles] = useState<File[]>([]);
  const [pendingVideoLinks, setPendingVideoLinks] = useState<PendingVideoLink[]>([]);
  const [pendingLinks, setPendingLinks] = useState<PendingLink[]>([]);
  const [pendingDistributions, setPendingDistributions] = useState<PendingDistribution[]>([]);

  // Edit mode distribution tracking (for unified save)
  const [editedDistributions, setEditedDistributions] = useState<Record<string, DistributionEditData>>({});
  const [deletedDistributionIds, setDeletedDistributionIds] = useState<string[]>([]);

  // Reset form when dialog opens or post changes
  useEffect(() => {
    if (open) {
      if (post) {
        const postTitle = post.title || "";
        const postDescription = post.description || "";
        const postGoalIds = post.goals?.map((g) => g.id) || [];
        const postPosition = positionInfo?.currentPosition || 1;

        setTitle(postTitle);
        setDescription(postDescription);
        setStatus(post.status);
        setSelectedGoalIds(postGoalIds);
        setPosition(postPosition);

        // Store initial values for change tracking
        setInitialTitle(postTitle);
        setInitialDescription(postDescription);
        setInitialGoalIds(postGoalIds);
        setInitialPosition(postPosition);
      } else if (!isEditing) {
        setTitle("");
        setDescription("");
        setStatus(initialStatus);
        setSelectedGoalIds([]);
        setPosition(1);
        // Reset pending state for new posts
        setPendingMediaFiles([]);
        setPendingVideoLinks([]);
        setPendingLinks([]);
        setPendingDistributions([]);
        // Reset initial values
        setInitialTitle("");
        setInitialDescription("");
        setInitialGoalIds([]);
        setInitialPosition(1);
      }
      setActiveTab("overview");
      setShowAddLinkForm(false);
      setNewLinkUrl("");
      setNewLinkTitle("");
      // Reset distribution edit tracking
      setEditedDistributions({});
      setDeletedDistributionIds([]);
    }
  }, [open, post, isEditing, initialStatus, positionInfo]);

  // Check if there are unsaved changes
  const hasUnsavedChanges = useMemo(() => {
    if (isEditing) {
      // For editing: compare current values with initial values
      const titleChanged = title !== initialTitle;
      const descriptionChanged = description !== initialDescription;
      const goalsChanged = JSON.stringify([...selectedGoalIds].sort()) !== JSON.stringify([...initialGoalIds].sort());
      const positionChanged = position !== initialPosition;
      const hasDistributionDeletes = deletedDistributionIds.length > 0;

      // Check if any distribution has actual changes (compare edited values against original)
      let hasDistributionEdits = false;
      for (const [distributionId, editData] of Object.entries(editedDistributions)) {
        const original = post?.distributions?.find(d => d.id === distributionId);
        if (!original) {
          hasDistributionEdits = true;
          break;
        }

        // Get original values for comparison
        const originalData = (original.platform_specific_data || {}) as Record<string, unknown>;
        let origScheduledDate = "";
        let origScheduledTime = "";
        if (original.scheduled_at) {
          const date = new Date(original.scheduled_at);
          origScheduledDate = formatDate(date, "yyyy-MM-dd");
          origScheduledTime = formatDate(date, "HH:mm");
        }

        // Compare each field
        const formatChanged = (editData.format ?? null) !== (original.format ?? null);
        const captionChanged = (editData.caption ?? null) !== (original.caption ?? originalData.caption ?? originalData.tweet_text ?? originalData.video_description ?? null);
        const dateChanged = (editData.scheduledDate ?? "") !== origScheduledDate;
        const timeChanged = (editData.scheduledTime ?? "") !== origScheduledTime;
        const urlChanged = (editData.platformPostUrl ?? null) !== (original.platform_post_url ?? null);
        const notesChanged = (editData.internalNotes ?? null) !== (originalData.internal_notes ?? null);

        if (formatChanged || captionChanged || dateChanged || timeChanged || urlChanged || notesChanged) {
          hasDistributionEdits = true;
          break;
        }
      }

      return titleChanged || descriptionChanged || goalsChanged || positionChanged || hasDistributionEdits || hasDistributionDeletes;
    } else {
      // For new posts: check if any content has been added
      const hasTitle = title.trim().length > 0;
      const hasDescription = description.trim().length > 0;
      const hasGoals = selectedGoalIds.length > 0;
      const hasMedia = pendingMediaFiles.length > 0;
      const hasVideoLinks = pendingVideoLinks.length > 0;
      const hasLinks = pendingLinks.length > 0;
      const hasDistributions = pendingDistributions.length > 0;
      return hasTitle || hasDescription || hasGoals || hasMedia || hasVideoLinks || hasLinks || hasDistributions;
    }
  }, [isEditing, title, description, selectedGoalIds, position, initialTitle, initialDescription, initialGoalIds, initialPosition, pendingMediaFiles, pendingVideoLinks, pendingLinks, pendingDistributions, editedDistributions, deletedDistributionIds, post?.distributions]);

  // Handle close request (intercept to check for unsaved changes)
  const handleCloseRequest = useCallback((openState: boolean) => {
    if (!openState && hasUnsavedChanges) {
      // User is trying to close, but there are unsaved changes
      setShowCloseConfirmDialog(true);
    } else {
      onOpenChange(openState);
    }
  }, [hasUnsavedChanges, onOpenChange]);

  // Handle discard changes
  const handleDiscardChanges = useCallback(() => {
    setShowCloseConfirmDialog(false);
    onOpenChange(false);
  }, [onOpenChange]);

  // Compute status for new posts based on pending distributions
  const computedStatus = useCallback((): ContentPostStatus => {
    if (pendingDistributions.length === 0) return "backlog";

    const allPosted = pendingDistributions.every(d => d.status === "posted");
    if (allPosted) return "complete";

    const hasScheduledOrPosted = pendingDistributions.some(
      d => d.status === "scheduled" || d.status === "posted"
    );
    if (hasScheduledOrPosted) return "ongoing";

    return "tagged";
  }, [pendingDistributions]);

  // Handlers for pending media
  const handleAddPendingMedia = useCallback((files: File[]) => {
    setPendingMediaFiles(prev => [...prev, ...files]);
  }, []);

  const handleRemovePendingMedia = useCallback((index: number) => {
    setPendingMediaFiles(prev => prev.filter((_, i) => i !== index));
  }, []);

  // Handlers for pending video links
  const handleAddPendingVideoLink = useCallback((url: string, title: string) => {
    setPendingVideoLinks(prev => [...prev, { id: crypto.randomUUID(), url, title }]);
  }, []);

  const handleRemovePendingVideoLink = useCallback((id: string) => {
    setPendingVideoLinks(prev => prev.filter(v => v.id !== id));
  }, []);

  // Handlers for pending links
  const handleAddPendingLink = useCallback((url: string, linkTitle: string) => {
    setPendingLinks(prev => [...prev, { id: crypto.randomUUID(), url, title: linkTitle }]);
  }, []);

  const handleRemovePendingLink = useCallback((id: string) => {
    setPendingLinks(prev => prev.filter(l => l.id !== id));
  }, []);

  // Handlers for pending distributions
  const handleAddPendingDistribution = useCallback((distribution: Omit<PendingDistribution, "id">) => {
    setPendingDistributions(prev => [...prev, { ...distribution, id: crypto.randomUUID() }]);
  }, []);

  const handleUpdatePendingDistribution = useCallback((id: string, updates: Partial<PendingDistribution>) => {
    setPendingDistributions(prev =>
      prev.map(d => d.id === id ? { ...d, ...updates } : d)
    );
  }, []);

  const handleRemovePendingDistribution = useCallback((id: string) => {
    setPendingDistributions(prev => prev.filter(d => d.id !== id));
  }, []);

  // Handlers for editing existing distributions (edit mode)
  const handleDistributionUpdate = useCallback((distributionId: string, updates: DistributionEditData) => {
    setEditedDistributions(prev => ({
      ...prev,
      [distributionId]: updates,
    }));
  }, []);

  const handleDistributionDelete = useCallback((distributionId: string) => {
    setDeletedDistributionIds(prev => [...prev, distributionId]);
    // Also remove from edited distributions
    setEditedDistributions(prev => {
      const next = { ...prev };
      delete next[distributionId];
      return next;
    });
  }, []);

  // Handle adding a link
  const handleAddLink = useCallback(async () => {
    if (!postId || !newLinkUrl.trim()) return;

    await addPostLink.mutateAsync({
      post_id: postId,
      url: newLinkUrl.trim(),
      title: newLinkTitle.trim() || null,
    });

    setNewLinkUrl("");
    setNewLinkTitle("");
    setShowAddLinkForm(false);
  }, [postId, newLinkUrl, newLinkTitle, addPostLink]);

  // Handle deleting a link
  const handleDeleteLink = useCallback(async (linkId: string) => {
    await deletePostLink.mutateAsync(linkId);
  }, [deletePostLink]);

  // Toggle goal selection
  const toggleGoal = useCallback((goalId: string) => {
    setSelectedGoalIds((prev) =>
      prev.includes(goalId)
        ? prev.filter((id) => id !== goalId)
        : [...prev, goalId]
    );
  }, []);

  // Handle form save
  const handleSave = useCallback(async () => {
    if (!title.trim()) return;

    setIsSubmitting(true);
    try {
      if (isEditing && postId) {
        // Update existing post
        await updatePost.mutateAsync({
          postId,
          updates: {
            title: title.trim(),
            description: description.trim() || null,
            status,
          },
          goalIds: selectedGoalIds,
        });

        // Delete removed distributions
        for (const distributionId of deletedDistributionIds) {
          try {
            await deleteDistributionMutation.mutateAsync(distributionId);
          } catch (err) {
            console.error("Failed to delete distribution:", err);
          }
        }

        // Update edited distributions (only those with actual changes)
        for (const [distributionId, editData] of Object.entries(editedDistributions)) {
          try {
            // Check if this distribution has actual changes (skip if no real changes)
            const original = post?.distributions?.find(d => d.id === distributionId);
            if (original) {
              const originalData = (original.platform_specific_data || {}) as Record<string, unknown>;
              let origScheduledDate = "";
              let origScheduledTime = "";
              if (original.scheduled_at) {
                const date = new Date(original.scheduled_at);
                origScheduledDate = formatDate(date, "yyyy-MM-dd");
                origScheduledTime = formatDate(date, "HH:mm");
              }

              // Compare each field to detect real changes
              const formatChanged = (editData.format ?? null) !== (original.format ?? null);
              const captionChanged = (editData.caption ?? null) !== (original.caption ?? originalData.caption ?? originalData.tweet_text ?? originalData.video_description ?? null);
              const dateChanged = (editData.scheduledDate ?? "") !== origScheduledDate;
              const timeChanged = (editData.scheduledTime ?? "") !== origScheduledTime;
              const urlChanged = (editData.platformPostUrl ?? null) !== (original.platform_post_url ?? null);
              const notesChanged = (editData.internalNotes ?? null) !== (originalData.internal_notes ?? null);

              // Check platform data changes (for blog/newsletter specific fields)
              const origPlatformData = editData.platformData || {};
              const platformDataChanged = JSON.stringify(origPlatformData) !== JSON.stringify(originalData);

              // Check toggle state change
              const savedToggleState = originalData.create_performance_check_tasks;
              const toggleChanged = editData.createPerformanceCheckTasks !== (savedToggleState !== undefined ? savedToggleState : true);

              const hasRealChanges = formatChanged || captionChanged || dateChanged || timeChanged || urlChanged || notesChanged || platformDataChanged || toggleChanged;

              if (!hasRealChanges) {
                // Skip this distribution - no actual changes
                continue;
              }
            }

            // Build scheduled_at from date and time if both are present
            let scheduledAt: string | null = null;
            let computedStatus: "draft" | "scheduled" | "posted" = "draft";
            let postedAt: string | null = null;

            if (editData.scheduledDate && editData.scheduledTime) {
              const scheduledDateTime = new Date(`${editData.scheduledDate}T${editData.scheduledTime}`);
              scheduledAt = scheduledDateTime.toISOString();
              if (isPast(scheduledDateTime)) {
                computedStatus = "posted";
                postedAt = scheduledAt;
              } else {
                computedStatus = "scheduled";
              }
            }

            // Build platform_specific_data
            const platformSpecificData: Record<string, unknown> = {};
            if (editData.internalNotes) {
              platformSpecificData.internal_notes = editData.internalNotes;
            }
            if (editData.platformData) {
              Object.assign(platformSpecificData, editData.platformData);
            }
            if (editData.createPerformanceCheckTasks !== undefined) {
              platformSpecificData.create_performance_check_tasks = editData.createPerformanceCheckTasks;
            }

            await updateDistribution.mutateAsync({
              distributionId,
              updates: {
                format: editData.format ?? null,
                caption: editData.caption ?? null,
                scheduled_at: scheduledAt,
                posted_at: postedAt,
                status: computedStatus,
                platform_post_url: editData.platformPostUrl ?? null,
                platform_specific_data: platformSpecificData,
              },
            });

            // Create performance check tasks if enabled, has scheduled date, and is posted
            // IMPORTANT: Only create tasks if they haven't already been created (prevent duplicates)
            const tasksAlreadyCreated = editData.platformData?.performance_tasks_created === true;
            if (editData.createPerformanceCheckTasks && scheduledAt && computedStatus === "posted" && !tasksAlreadyCreated) {
              // Find the distribution to get account info
              const distribution = post?.distributions?.find(d => d.id === distributionId);
              const account = distribution?.account;
              const platformDisplayName = account?.platform?.display_name || "Platform";
              const accountName = account?.account_name || "Account";

              const scheduledDateObj = new Date(scheduledAt);

              // 1 week performance check task
              const oneWeekLater = new Date(scheduledDateObj);
              oneWeekLater.setDate(oneWeekLater.getDate() + 7);
              try {
                await createTask.mutateAsync({
                  title: `1-week check: ${title.trim()} on ${platformDisplayName}`,
                  description: `Check performance metrics for "${title.trim()}" posted to ${accountName} on ${platformDisplayName}. Look at engagement, reach, and any early insights.`,
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
              } catch {
                // Task creation failure is not critical
              }

              // 1 month performance check task
              const oneMonthLater = new Date(scheduledDateObj);
              oneMonthLater.setMonth(oneMonthLater.getMonth() + 1);
              try {
                await createTask.mutateAsync({
                  title: `1-month check: ${title.trim()} on ${platformDisplayName}`,
                  description: `Review final performance metrics for "${title.trim()}" posted to ${accountName} on ${platformDisplayName}. Document learnings and compare to goals.`,
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
              } catch {
                // Task creation failure is not critical
              }

              // Mark tasks as created to prevent duplicates on future saves
              try {
                await updateDistribution.mutateAsync({
                  distributionId,
                  updates: {
                    platform_specific_data: {
                      ...platformSpecificData,
                      performance_tasks_created: true,
                    },
                  },
                });
              } catch {
                // Non-critical
              }
            }
          } catch (err) {
            console.error("Failed to update distribution:", err);
          }
        }

        // Handle position change if it was modified
        if (position !== initialPosition && onPositionChange) {
          onPositionChange(position);
        }

        // Close the modal after saving
        onOpenChange(false);
      } else {
        // Create new post with computed status
        const newStatus = computedStatus();
        const newPost = await createPost.mutateAsync({
          post: {
            title: title.trim(),
            description: description.trim() || null,
            status: newStatus,
          },
          goalIds: selectedGoalIds,
        });

        // Track failures to show summary
        const failures: string[] = [];

        // Upload pending media files
        for (const file of pendingMediaFiles) {
          try {
            await uploadMedia.mutateAsync({ postId: newPost.id, file });
          } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "Unknown error";
            console.error("Failed to upload media:", errorMessage, err);
            failures.push(`Media "${file.name}": ${errorMessage}`);
          }
        }

        // Add pending video links
        for (const videoLink of pendingVideoLinks) {
          try {
            await addVideoLink.mutateAsync({
              postId: newPost.id,
              url: videoLink.url,
              title: videoLink.title,
            });
          } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "Unknown error";
            console.error("Failed to add video link:", errorMessage, err);
            failures.push(`Video "${videoLink.title}": ${errorMessage}`);
          }
        }

        // Add pending links
        for (const link of pendingLinks) {
          try {
            await addPostLink.mutateAsync({
              post_id: newPost.id,
              url: link.url,
              title: link.title || null,
            });
          } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "Unknown error";
            console.error("Failed to add link:", errorMessage, err);
            failures.push(`Link "${link.title || link.url}": ${errorMessage}`);
          }
        }

        // Create pending distributions
        for (const dist of pendingDistributions) {
          try {
            // Get account info for task creation
            const account = accounts.find(a => a.id === dist.accountId);
            const platformDisplayName = account?.platform?.display_name || "Platform";
            const accountName = account?.account_name || "Account";

            // Determine if tasks will be created (to mark in platform_specific_data)
            const willCreateTasks = dist.createPerformanceCheckTasks && dist.scheduledAt;

            const platformSpecificData: Record<string, unknown> = {};
            // Copy platform-specific data (subject_line, article_title, meta_description, etc.)
            if (dist.platformData) {
              Object.assign(platformSpecificData, dist.platformData);
            }
            if (dist.internalNotes) {
              platformSpecificData.internal_notes = dist.internalNotes;
            }
            if (willCreateTasks) {
              // Mark that tasks will be created to prevent duplicates on future edits
              platformSpecificData.performance_tasks_created = true;
            }

            const distributionData: ContentDistributionInsert = {
              post_id: newPost.id,
              account_id: dist.accountId,
              status: dist.status,
              format: dist.format,
              caption: dist.caption,
              scheduled_at: dist.scheduledAt,
              posted_at: dist.postedAt,
              platform_post_url: dist.platformPostUrl || null,
              platform_specific_data: platformSpecificData,
              linked_task_id: null,
            };
            await createDistribution.mutateAsync(distributionData);

            // Create performance check tasks if enabled and has scheduled date
            if (willCreateTasks) {
              const scheduledDateObj = new Date(dist.scheduledAt!);

              // 1 week performance check task
              const oneWeekLater = new Date(scheduledDateObj);
              oneWeekLater.setDate(oneWeekLater.getDate() + 7);
              try {
                await createTask.mutateAsync({
                  title: `1-week check: ${title.trim()} on ${platformDisplayName}`,
                  description: `Check performance metrics for "${title.trim()}" posted to ${accountName} on ${platformDisplayName}. Look at engagement, reach, and any early insights.`,
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
              } catch {
                // Task creation failure is not critical
              }

              // 1 month performance check task
              const oneMonthLater = new Date(scheduledDateObj);
              oneMonthLater.setMonth(oneMonthLater.getMonth() + 1);
              try {
                await createTask.mutateAsync({
                  title: `1-month check: ${title.trim()} on ${platformDisplayName}`,
                  description: `Review final performance metrics for "${title.trim()}" posted to ${accountName} on ${platformDisplayName}. Document learnings and compare to goals.`,
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
              } catch {
                // Task creation failure is not critical
              }
            }
          } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "Unknown error";
            console.error("Failed to create distribution:", errorMessage, err);
            failures.push(`Distribution: ${errorMessage}`);
          }
        }

        // Show warning if some items failed but post was created
        if (failures.length > 0) {
          toast({
            title: "Post created with some issues",
            description: `${failures.length} item(s) could not be added. Check the post details.`,
            variant: "warning",
          });
        }

        onOpenChange(false);
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [title, description, status, selectedGoalIds, position, initialPosition, onPositionChange, isEditing, postId, createPost, updatePost, onOpenChange, computedStatus, pendingMediaFiles, pendingVideoLinks, pendingLinks, pendingDistributions, uploadMedia, addVideoLink, addPostLink, createDistribution, createTask, accounts, toast, deletedDistributionIds, editedDistributions, deleteDistributionMutation, updateDistribution, post?.distributions]);

  // Handle save and close (called from confirmation dialog)
  const handleSaveAndClose = useCallback(async () => {
    setShowCloseConfirmDialog(false);
    await handleSave();
  }, [handleSave]);

  // Handle delete
  const handleDelete = useCallback(async () => {
    if (!postId) return;

    setIsSubmitting(true);
    try {
      await deletePost.mutateAsync(postId);
      setShowDeleteDialog(false);
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  }, [postId, deletePost, onOpenChange]);

  // Handle duplicate
  const handleDuplicate = useCallback(async () => {
    if (!post) return;

    setIsSubmitting(true);
    try {
      await createPost.mutateAsync({
        post: {
          title: `${post.title} (Copy)`,
          description: post.description,
          status: "backlog",
        },
        goalIds: post.goals?.map((g) => g.id) || [],
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [post, createPost]);

  // Loading state
  if (isEditing && isLoadingPost) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[900px] max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Loading Post</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-text-muted" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const currentStatus = statusOptions.find((s) => s.value === status);

  return (
    <>
      <Dialog open={open} onOpenChange={handleCloseRequest}>
        <DialogContent className="sm:max-w-[900px] max-h-[90vh] flex flex-col p-0">
          {/* Header */}
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-border-soft">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  <DialogTitle className="text-xl">
                    {isEditing ? "Edit Post" : "New Post"}
                  </DialogTitle>
                  {isEditing && currentStatus && (
                    <Badge
                      variant="outline"
                      className={cn("shrink-0", currentStatus.color)}
                    >
                      {currentStatus.label}
                    </Badge>
                  )}
                  {isEditing && positionInfo && positionInfo.totalInStatus > 0 && (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-small text-text-muted">#</span>
                      <Input
                        type="number"
                        min={1}
                        max={positionInfo.totalInStatus}
                        value={position}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          if (!isNaN(val)) {
                            setPosition(Math.max(1, Math.min(val, positionInfo.totalInStatus)));
                          }
                        }}
                        className="w-14 h-7 px-2 text-center text-small"
                        title={`Position in ${currentStatus?.label || "column"} (1-${positionInfo.totalInStatus})`}
                      />
                      <span className="text-small text-text-muted">/ {positionInfo.totalInStatus}</span>
                    </div>
                  )}
                </div>
                {isEditing && post && (
                  <p className="text-small text-text-muted truncate">
                    {post.title}
                  </p>
                )}
                {!isEditing && (
                  <p className="text-small text-text-muted">
                    Status is set automatically based on distributions
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2">
                {isEditing && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={handleDuplicate}>
                        <Copy className="w-4 h-4 mr-2" />
                        Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => setShowDeleteDialog(true)}
                        className="text-status-danger focus:text-status-danger"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>
          </DialogHeader>

          {/* Tabs */}
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="flex-1 flex flex-col overflow-hidden"
          >
            <TabsList className="px-6 border-b border-border-soft rounded-none justify-start bg-transparent h-auto p-0">
              <TabsTrigger
                value="overview"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-accent data-[state=active]:bg-transparent px-4 py-3"
              >
                <FileText className="w-4 h-4 mr-2" />
                Overview
              </TabsTrigger>
              <TabsTrigger
                value="distributions"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-accent data-[state=active]:bg-transparent px-4 py-3"
              >
                <Send className="w-4 h-4 mr-2" />
                Distributions
                {(isEditing ? post?.distribution_count : pendingDistributions.length) ? (
                  <Badge variant="secondary" className="ml-2 text-[10px] px-1.5">
                    {isEditing ? post?.distribution_count : pendingDistributions.length}
                  </Badge>
                ) : null}
              </TabsTrigger>
              {isEditing && (
                <>
                  <TabsTrigger
                    value="metrics"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-accent data-[state=active]:bg-transparent px-4 py-3"
                  >
                    <TrendingUp className="w-4 h-4 mr-2" />
                    Metrics
                    {post?.posted_count && post.posted_count > 0 ? (
                      <Badge variant="secondary" className="ml-2 text-[10px] px-1.5">
                        {post.posted_count}
                      </Badge>
                    ) : null}
                  </TabsTrigger>
                  <TabsTrigger
                    value="activity"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-accent data-[state=active]:bg-transparent px-4 py-3"
                  >
                    <Activity className="w-4 h-4 mr-2" />
                    Activity
                  </TabsTrigger>
                </>
              )}
            </TabsList>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto">
              {/* Overview Tab */}
              <TabsContent value="overview" className="p-6 space-y-6 m-0">
                {/* Title */}
                <div className="space-y-2">
                  <Label htmlFor="title">Title <span className="text-status-danger">*</span></Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter post title..."
                    className="text-lg font-medium"
                  />
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Add a description, content notes, or draft your post..."
                    rows={5}
                    className="resize-none"
                  />
                </div>

                {/* Goals */}
                {goals.length > 0 && (
                  <div className="space-y-2">
                    <Label>Content Goals</Label>
                    <div className="flex flex-wrap gap-2">
                      {goals.map((goal) => {
                        const isSelected = selectedGoalIds.includes(goal.id);
                        return (
                          <Badge
                            key={goal.id}
                            variant={isSelected ? "default" : "outline"}
                            className={cn(
                              "cursor-pointer transition-colors",
                              isSelected
                                ? "bg-accent hover:bg-accent-hover"
                                : "hover:bg-bg-1"
                            )}
                            style={
                              isSelected && goal.color
                                ? { backgroundColor: goal.color }
                                : !isSelected && goal.color
                                ? { borderColor: goal.color, color: goal.color }
                                : undefined
                            }
                            onClick={() => toggleGoal(goal.id)}
                          >
                            {goal.name}
                            {isSelected && <X className="w-3 h-3 ml-1" />}
                          </Badge>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Media Section */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <ImageIcon className="w-4 h-4" />
                    Media & Video Links
                    {(() => {
                      const count = isEditing
                        ? (post?.media?.length || 0)
                        : (pendingMediaFiles.length + pendingVideoLinks.length);
                      return count > 0 ? (
                        <Badge variant="secondary" className="text-[10px]">
                          {count}
                        </Badge>
                      ) : null;
                    })()}
                  </Label>
                  {isEditing && post ? (
                    <MediaSection
                      postId={post.id}
                      planId={planId}
                      media={post.media || []}
                    />
                  ) : (
                    <PendingMediaUpload
                      files={pendingMediaFiles}
                      onAddFiles={handleAddPendingMedia}
                      onRemoveFile={handleRemovePendingMedia}
                      videoLinks={pendingVideoLinks}
                      onAddVideoLink={handleAddPendingVideoLink}
                      onRemoveVideoLink={handleRemovePendingVideoLink}
                    />
                  )}
                </div>

                {/* Reference Links */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Link2 className="w-4 h-4" />
                    Reference Links
                    {(isEditing ? post?.links?.length : pendingLinks.length) ? (
                      <Badge variant="secondary" className="text-[10px]">
                        {isEditing ? post?.links?.length : pendingLinks.length}
                      </Badge>
                    ) : null}
                  </Label>
                  <div className="border border-border rounded-lg p-4 space-y-3">
                    {/* Existing links (edit mode) */}
                    {isEditing && post?.links && post.links.length > 0 && (
                      <div className="space-y-2">
                        {post.links.map((link) => (
                          <div
                            key={link.id}
                            className="flex items-center gap-2 p-2 bg-bg-1 rounded-md group"
                          >
                            <Link2 className="w-4 h-4 text-text-muted shrink-0" />
                            <a
                              href={link.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-1 min-w-0 text-small hover:text-accent truncate"
                            >
                              {link.title || link.url}
                            </a>
                            <ExternalLink className="w-3 h-3 text-text-muted shrink-0" />
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                              onClick={() => handleDeleteLink(link.id)}
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Pending links (new mode) */}
                    {!isEditing && pendingLinks.length > 0 && (
                      <div className="space-y-2">
                        {pendingLinks.map((link) => (
                          <div
                            key={link.id}
                            className="flex items-center gap-2 p-2 bg-bg-1 rounded-md group"
                          >
                            <Link2 className="w-4 h-4 text-text-muted shrink-0" />
                            <span className="flex-1 min-w-0 text-small truncate">
                              {link.title || link.url}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                              onClick={() => handleRemovePendingLink(link.id)}
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Add link form */}
                    {showAddLinkForm ? (
                      <div className="space-y-2">
                        <Input
                          placeholder="https://..."
                          value={newLinkUrl}
                          onChange={(e) => setNewLinkUrl(e.target.value)}
                          autoFocus
                        />
                        <Input
                          placeholder="Link title (optional)"
                          value={newLinkTitle}
                          onChange={(e) => setNewLinkTitle(e.target.value)}
                        />
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={() => {
                              setShowAddLinkForm(false);
                              setNewLinkUrl("");
                              setNewLinkTitle("");
                            }}
                          >
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            className="flex-1"
                            onClick={() => {
                              if (isEditing) {
                                handleAddLink();
                              } else {
                                // Add to pending links
                                handleAddPendingLink(newLinkUrl.trim(), newLinkTitle.trim());
                                setNewLinkUrl("");
                                setNewLinkTitle("");
                                setShowAddLinkForm(false);
                              }
                            }}
                            disabled={!newLinkUrl.trim() || (isEditing && addPostLink.isPending)}
                          >
                            {isEditing && addPostLink.isPending ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              "Add"
                            )}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => setShowAddLinkForm(true)}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Link
                      </Button>
                    )}
                  </div>
                </div>
              </TabsContent>

              {/* Distributions Tab */}
              <TabsContent value="distributions" className="p-6 m-0">
                {isEditing && post ? (
                  <PostDistributionsTab
                    post={post}
                    accounts={accounts}
                    planId={planId}
                    editedDistributions={editedDistributions}
                    onDistributionUpdate={handleDistributionUpdate}
                    deletedDistributionIds={deletedDistributionIds}
                    onDistributionDelete={handleDistributionDelete}
                  />
                ) : (
                  <PendingDistributionsTab
                    accounts={accounts}
                    pendingDistributions={pendingDistributions}
                    onAddDistribution={handleAddPendingDistribution}
                    onUpdateDistribution={handleUpdatePendingDistribution}
                    onRemoveDistribution={handleRemovePendingDistribution}
                  />
                )}
              </TabsContent>

              {/* Metrics Tab */}
              {isEditing && post && (
                <TabsContent value="metrics" className="p-6 m-0">
                  <PostMetricsTab post={post} planId={planId} />
                </TabsContent>
              )}

              {/* Activity Tab */}
              {isEditing && (
                <TabsContent value="activity" className="p-6 m-0">
                  <div className="text-center py-12">
                    <Activity className="w-12 h-12 mx-auto mb-4 text-text-muted" />
                    <h3 className="font-medium mb-2">Activity Timeline</h3>
                    <p className="text-small text-text-muted">
                      Activity tracking coming soon
                    </p>
                  </div>
                </TabsContent>
              )}
            </div>
          </Tabs>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-border-soft flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => handleCloseRequest(false)}
              disabled={isSubmitting}
            >
              {isEditing ? "Close" : "Cancel"}
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSubmitting || !title.trim()}
            >
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isEditing ? "Save & Close" : "Create Post"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Post</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{post?.title}&quot;? This
              will also delete all distributions and media associated with this
              post. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isSubmitting}
              className="bg-status-danger hover:bg-status-danger/90"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Unsaved Changes Confirmation */}
      <AlertDialog open={showCloseConfirmDialog} onOpenChange={setShowCloseConfirmDialog}>
        <AlertDialogContent className="sm:max-w-[425px]">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Unsaved Changes
            </AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. Would you like to save them before leaving?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 sm:flex-row">
            <AlertDialogCancel
              onClick={() => setShowCloseConfirmDialog(false)}
              className="sm:order-1"
            >
              Continue Editing
            </AlertDialogCancel>
            <Button
              variant="outline"
              onClick={handleDiscardChanges}
              className="text-status-danger hover:bg-status-danger/10 sm:order-2"
            >
              Discard
            </Button>
            <AlertDialogAction
              onClick={handleSaveAndClose}
              disabled={isSubmitting || !title.trim()}
              className="sm:order-3"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
