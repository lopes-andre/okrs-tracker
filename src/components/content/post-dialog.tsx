"use client";

import { useState, useEffect } from "react";
import { Loader2, X, Trash2 } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
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
import { useCreatePost, useUpdatePost, useDeletePost } from "@/features/content/hooks";
import { cn } from "@/lib/utils";
import type {
  ContentPostWithDetails,
  ContentPostStatus,
  ContentGoal,
} from "@/lib/supabase/types";

// ============================================================================
// TYPES
// ============================================================================

interface PostDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planId: string;
  post?: ContentPostWithDetails | null;
  goals: ContentGoal[];
  initialStatus?: ContentPostStatus;
}

// ============================================================================
// STATUS OPTIONS
// ============================================================================

const statusOptions: { value: ContentPostStatus; label: string }[] = [
  { value: "backlog", label: "Backlog" },
  { value: "tagged", label: "Tagged" },
  { value: "ongoing", label: "Ongoing" },
  { value: "complete", label: "Complete" },
];

// ============================================================================
// COMPONENT
// ============================================================================

export function PostDialog({
  open,
  onOpenChange,
  planId,
  post,
  goals,
  initialStatus = "backlog",
}: PostDialogProps) {
  const isEditing = !!post;
  const createPost = useCreatePost(planId);
  const updatePost = useUpdatePost(planId);
  const deletePost = useDeletePost(planId);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<ContentPostStatus>(initialStatus);
  const [selectedGoalIds, setSelectedGoalIds] = useState<string[]>([]);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      if (post) {
        setTitle(post.title || "");
        setDescription(post.description || "");
        setStatus(post.status);
        setSelectedGoalIds(post.goals?.map((g) => g.id) || []);
      } else {
        setTitle("");
        setDescription("");
        setStatus(initialStatus);
        setSelectedGoalIds([]);
      }
    }
  }, [open, post, initialStatus]);

  // Toggle goal selection
  const toggleGoal = (goalId: string) => {
    setSelectedGoalIds((prev) =>
      prev.includes(goalId)
        ? prev.filter((id) => id !== goalId)
        : [...prev, goalId]
    );
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) return;

    setIsSubmitting(true);
    try {
      if (isEditing && post) {
        await updatePost.mutateAsync({
          postId: post.id,
          updates: {
            title: title.trim(),
            description: description.trim() || null,
            status,
          },
          goalIds: selectedGoalIds,
        });
      } else {
        await createPost.mutateAsync({
          post: {
            title: title.trim(),
            description: description.trim() || null,
            status,
          },
          goalIds: selectedGoalIds,
        });
      }
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!post) return;

    setIsSubmitting(true);
    try {
      await deletePost.mutateAsync(post.id);
      setShowDeleteDialog(false);
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{isEditing ? "Edit Post" : "New Post"}</DialogTitle>
            <DialogDescription>
              {isEditing
                ? "Update your content post details"
                : "Create a new content post for your pipeline"}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter post title..."
                required
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add a description or content notes..."
                rows={3}
              />
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={status}
                onValueChange={(value) => setStatus(value as ContentPostStatus)}
              >
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Goals */}
            {goals.length > 0 && (
              <div className="space-y-2">
                <Label>Goals</Label>
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
                <p className="text-small text-text-muted">
                  Select content goals for this post
                </p>
              </div>
            )}

            <DialogFooter className="gap-2 sm:gap-0">
              {isEditing && (
                <Button
                  type="button"
                  variant="outline"
                  className="text-status-danger hover:bg-status-danger/10"
                  onClick={() => setShowDeleteDialog(true)}
                  disabled={isSubmitting}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
              )}
              <div className="flex-1" />
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || !title.trim()}>
                {isSubmitting && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                {isEditing ? "Save Changes" : "Create Post"}
              </Button>
            </DialogFooter>
          </form>
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
              {isSubmitting && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
