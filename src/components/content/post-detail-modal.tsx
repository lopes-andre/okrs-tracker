"use client";

import { useState, useEffect, useCallback } from "react";
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
import { usePost, useUpdatePost, useDeletePost, useCreatePost, useAddPostLink, useDeletePostLink, useUploadMedia, useCreateDistribution } from "@/features/content/hooks";
import { cn } from "@/lib/utils";
import { PostDistributionsTab } from "./post-distributions-tab";
import { PostMetricsTab } from "./post-metrics-tab";
import { MediaUpload } from "./media-upload";
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

interface PendingDistribution {
  id: string;
  accountId: string;
  format: string | null;
  caption: string | null;
  scheduledAt: string | null;
  postedAt: string | null;
  status: "draft" | "scheduled" | "posted";
}

// ============================================================================
// TYPES
// ============================================================================

interface PostDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planId: string;
  postId?: string | null;
  goals: ContentGoal[];
  accounts: ContentAccountWithPlatform[];
  initialStatus?: ContentPostStatus;
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
}: PostDetailModalProps) {
  const isEditing = !!postId;
  const { data: post, isLoading: isLoadingPost } = usePost(postId || "");
  const createPost = useCreatePost(planId);
  const updatePost = useUpdatePost(planId);
  const deletePost = useDeletePost(planId);
  const addPostLink = useAddPostLink(planId);
  const deletePostLink = useDeletePostLink(planId);
  const uploadMedia = useUploadMedia(planId);
  const createDistribution = useCreateDistribution(planId);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<ContentPostStatus>(initialStatus);
  const [selectedGoalIds, setSelectedGoalIds] = useState<string[]>([]);

  // Link form state (for existing posts)
  const [showAddLinkForm, setShowAddLinkForm] = useState(false);
  const [newLinkUrl, setNewLinkUrl] = useState("");
  const [newLinkTitle, setNewLinkTitle] = useState("");

  // Pending state for new posts (stored locally until post is created)
  const [pendingMediaFiles, setPendingMediaFiles] = useState<File[]>([]);
  const [pendingLinks, setPendingLinks] = useState<PendingLink[]>([]);
  const [pendingDistributions, setPendingDistributions] = useState<PendingDistribution[]>([]);

  // Reset form when dialog opens or post changes
  useEffect(() => {
    if (open) {
      if (post) {
        setTitle(post.title || "");
        setDescription(post.description || "");
        setStatus(post.status);
        setSelectedGoalIds(post.goals?.map((g) => g.id) || []);
      } else if (!isEditing) {
        setTitle("");
        setDescription("");
        setStatus(initialStatus);
        setSelectedGoalIds([]);
        // Reset pending state for new posts
        setPendingMediaFiles([]);
        setPendingLinks([]);
        setPendingDistributions([]);
      }
      setActiveTab("overview");
      setShowAddLinkForm(false);
      setNewLinkUrl("");
      setNewLinkTitle("");
    }
  }, [open, post, isEditing, initialStatus]);

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

        // Upload pending media files
        for (const file of pendingMediaFiles) {
          try {
            await uploadMedia.mutateAsync({ postId: newPost.id, file });
          } catch (err) {
            console.error("Failed to upload media:", err);
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
            console.error("Failed to add link:", err);
          }
        }

        // Create pending distributions
        for (const dist of pendingDistributions) {
          try {
            const distributionData: ContentDistributionInsert = {
              post_id: newPost.id,
              account_id: dist.accountId,
              status: dist.status,
              format: dist.format,
              caption: dist.caption,
              scheduled_at: dist.scheduledAt,
              posted_at: dist.postedAt,
              platform_post_url: null,
              platform_specific_data: {},
              linked_task_id: null,
            };
            await createDistribution.mutateAsync(distributionData);
          } catch (err) {
            console.error("Failed to create distribution:", err);
          }
        }

        onOpenChange(false);
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [title, description, status, selectedGoalIds, isEditing, postId, createPost, updatePost, onOpenChange, computedStatus, pendingMediaFiles, pendingLinks, pendingDistributions, uploadMedia, addPostLink, createDistribution]);

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
      <Dialog open={open} onOpenChange={onOpenChange}>
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
                    value="media"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-accent data-[state=active]:bg-transparent px-4 py-3"
                  >
                    <ImageIcon className="w-4 h-4 mr-2" />
                    Media
                    {post?.media && post.media.length > 0 && (
                      <Badge variant="secondary" className="ml-2 text-[10px] px-1.5">
                        {post.media.length}
                      </Badge>
                    )}
                  </TabsTrigger>
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

                {/* Media & Links */}
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Media */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <ImageIcon className="w-4 h-4" />
                      Media
                      {(isEditing ? post?.media?.length : pendingMediaFiles.length) ? (
                        <Badge variant="secondary" className="text-[10px]">
                          {isEditing ? post?.media?.length : pendingMediaFiles.length}
                        </Badge>
                      ) : null}
                    </Label>
                    {isEditing ? (
                      // Editing mode - show existing media
                      post?.media && post.media.length > 0 ? (
                        <div className="border border-border rounded-lg p-4 space-y-3">
                          <div className="space-y-2">
                            {post.media.slice(0, 3).map((media) => (
                              <div
                                key={media.id}
                                className="flex items-center gap-2 text-small"
                              >
                                {media.file_type?.startsWith("image/") ? (
                                  <ImageIcon className="w-4 h-4 text-text-muted shrink-0" />
                                ) : (
                                  <FileText className="w-4 h-4 text-text-muted shrink-0" />
                                )}
                                <span className="truncate text-text-muted">
                                  {media.file_name || "File"}
                                </span>
                              </div>
                            ))}
                            {post.media.length > 3 && (
                              <p className="text-small text-text-muted">
                                +{post.media.length - 3} more files
                              </p>
                            )}
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full"
                            onClick={() => setActiveTab("media")}
                          >
                            Manage Media
                          </Button>
                        </div>
                      ) : (
                        <div className="border border-dashed border-border rounded-lg p-6 text-center">
                          <ImageIcon className="w-8 h-8 mx-auto mb-2 text-text-muted" />
                          <p className="text-small text-text-muted mb-2">
                            Upload images and files for this post
                          </p>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setActiveTab("media")}
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Add Media
                          </Button>
                        </div>
                      )
                    ) : (
                      // New post mode - show pending media upload
                      <PendingMediaUpload
                        files={pendingMediaFiles}
                        onAddFiles={handleAddPendingMedia}
                        onRemoveFile={handleRemovePendingMedia}
                      />
                    )}
                  </div>

                  {/* Links */}
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
                </div>
              </TabsContent>

              {/* Distributions Tab */}
              <TabsContent value="distributions" className="p-6 m-0">
                {isEditing && post ? (
                  <PostDistributionsTab
                    post={post}
                    accounts={accounts}
                    planId={planId}
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

              {/* Media Tab */}
              {isEditing && post && (
                <TabsContent value="media" className="p-6 m-0">
                  <MediaUpload
                    postId={post.id}
                    planId={planId}
                    media={post.media || []}
                  />
                </TabsContent>
              )}

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
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              {isEditing ? "Close" : "Cancel"}
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSubmitting || !title.trim()}
            >
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isEditing ? "Save Changes" : "Create Post"}
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
    </>
  );
}
