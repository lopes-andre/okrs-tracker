"use client";

import { useState } from "react";
import { MessageCircle, Loader2 } from "lucide-react";
import { CommentCard } from "./comment-card";
import { CommentInput } from "./comment-input";
import type { CommentWithUser, Profile, CommentInsert } from "@/lib/supabase/types";
import {
  useTaskComments,
  useCreateComment,
  useUpdateComment,
  useDeleteComment,
} from "@/features/comments/hooks";
import { useToast } from "@/components/ui/use-toast";
import { formatErrorMessage } from "@/lib/toast-utils";

interface CommentListProps {
  taskId: string;
  planId: string;
  members: Profile[];
  currentUser?: Profile | null;
  currentUserId?: string;
  isOwner?: boolean;
}

export function CommentList({
  taskId,
  planId,
  members,
  currentUser,
  currentUserId,
  isOwner = false,
}: CommentListProps) {
  const { toast } = useToast();
  const { data: comments = [], isLoading } = useTaskComments(taskId);
  const createComment = useCreateComment(taskId, planId);
  const updateComment = useUpdateComment(taskId);
  const deleteComment = useDeleteComment(taskId);

  const [editingComment, setEditingComment] = useState<CommentWithUser | null>(
    null
  );

  // Handle create comment
  const handleCreate = async (content: string, mentionedUserIds: string[]) => {
    if (!currentUserId) return;

    const data: CommentInsert = {
      plan_id: planId,
      task_id: taskId,
      user_id: currentUserId,
      content,
    };

    try {
      await createComment.mutateAsync({ data, mentionedUserIds });
      toast({ title: "Comment added", variant: "default" });
    } catch (error) {
      toast(formatErrorMessage(error));
      throw error;
    }
  };

  // Handle update comment
  const handleUpdate = async (content: string, mentionedUserIds: string[]) => {
    if (!editingComment) return;

    try {
      await updateComment.mutateAsync({
        commentId: editingComment.id,
        data: { content },
        mentionedUserIds,
      });
      setEditingComment(null);
      toast({ title: "Comment updated", variant: "default" });
    } catch (error) {
      toast(formatErrorMessage(error));
      throw error;
    }
  };

  // Handle delete comment
  const handleDelete = async (commentId: string) => {
    try {
      await deleteComment.mutateAsync(commentId);
      toast({ title: "Comment deleted", variant: "default" });
    } catch (error) {
      toast(formatErrorMessage(error));
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-text-muted" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Comments list */}
      {comments.length > 0 ? (
        <div className="space-y-4">
          {comments.map((comment) =>
            editingComment?.id === comment.id ? (
              <div key={comment.id} className="pl-11">
                <CommentInput
                  members={members}
                  currentUser={currentUser}
                  initialContent={comment.content}
                  onSubmit={handleUpdate}
                  isSubmitting={updateComment.isPending}
                  autoFocus
                  onCancel={() => setEditingComment(null)}
                />
              </div>
            ) : (
              <CommentCard
                key={comment.id}
                comment={comment}
                currentUserId={currentUserId}
                isOwner={isOwner}
                members={members}
                onEdit={setEditingComment}
                onDelete={handleDelete}
              />
            )
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <MessageCircle className="h-8 w-8 text-text-subtle mb-2" />
          <p className="text-body-sm text-text-muted">No comments yet</p>
          <p className="text-small text-text-subtle">
            Be the first to leave a comment
          </p>
        </div>
      )}

      {/* New comment input */}
      {currentUserId && !editingComment && (
        <div className="pt-4 border-t border-border-soft">
          <CommentInput
            members={members}
            currentUser={currentUser}
            onSubmit={handleCreate}
            isSubmitting={createComment.isPending}
          />
        </div>
      )}
    </div>
  );
}
