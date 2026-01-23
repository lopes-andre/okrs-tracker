"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { MessageCircle, Loader2, X, AtSign } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MarkdownEditor } from "@/components/ui/markdown-editor";
import { CommentCard } from "./comment-card";
import {
  useTaskComments,
  useCreateComment,
  useUpdateComment,
  useDeleteComment,
  useMarkTaskCommentsAsRead,
} from "@/features/comments/hooks";
import { useToast } from "@/components/ui/use-toast";
import { formatErrorMessage } from "@/lib/toast-utils";
import type { CommentWithUser, CommentInsert, Profile, TaskWithDetails } from "@/lib/supabase/types";

interface CommentsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: TaskWithDetails | null;
  planId: string;
  members: Profile[];
  currentUser?: Profile | null;
  currentUserId?: string;
  isOwner?: boolean;
}

export function CommentsDialog({
  open,
  onOpenChange,
  task,
  planId,
  members,
  currentUser,
  currentUserId,
  isOwner = false,
}: CommentsDialogProps) {
  const { toast } = useToast();
  const taskId = task?.id ?? null;
  const { data: comments = [], isLoading } = useTaskComments(taskId);
  const createComment = useCreateComment(taskId ?? "", planId);
  const updateComment = useUpdateComment(taskId ?? "");
  const deleteComment = useDeleteComment(taskId ?? "");
  const markAsRead = useMarkTaskCommentsAsRead();

  const [newComment, setNewComment] = useState("");
  const [editingComment, setEditingComment] = useState<CommentWithUser | null>(null);
  const [editContent, setEditContent] = useState("");
  const [showMentionPicker, setShowMentionPicker] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [_mentionedUserIds, setMentionedUserIds] = useState<string[]>([]);

  // Mark comments as read when dialog opens
  useEffect(() => {
    if (open && currentUserId && taskId) {
      markAsRead.mutate({ taskId, userId: currentUserId });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, currentUserId, taskId]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setNewComment("");
      setEditingComment(null);
      setEditContent("");
      setMentionedUserIds([]);
    }
  }, [open]);

  // Extract mentioned user IDs from content
  const extractMentions = useCallback(
    (content: string): string[] => {
      const mentioned: string[] = [];
      const mentionRegex = /@(\w+(?:\s+\w+)?)/g;
      let match;

      while ((match = mentionRegex.exec(content)) !== null) {
        const mentionText = match[1].toLowerCase();
        for (const member of members) {
          const name = member.full_name?.toLowerCase() || "";
          const firstName = name.split(" ")[0];
          if (
            name.includes(mentionText) ||
            firstName === mentionText ||
            mentionText.includes(firstName)
          ) {
            if (!mentioned.includes(member.id)) {
              mentioned.push(member.id);
            }
          }
        }
      }

      return mentioned;
    },
    [members]
  );

  // Filter members for mention picker
  const filteredMembers = useMemo(() => {
    if (!mentionQuery) return members.slice(0, 5);
    const query = mentionQuery.toLowerCase();
    return members
      .filter(
        (m) =>
          m.full_name?.toLowerCase().includes(query) ||
          m.email.toLowerCase().includes(query)
      )
      .slice(0, 5);
  }, [members, mentionQuery]);

  // Handle inserting a mention
  const insertMention = (member: Profile) => {
    const name = member.full_name || member.email.split("@")[0];
    const mention = `@${name} `;

    if (editingComment) {
      setEditContent((prev) => prev + mention);
    } else {
      setNewComment((prev) => prev + mention);
    }

    setShowMentionPicker(false);
    setMentionQuery("");
  };

  // Handle create comment
  const handleCreate = async () => {
    if (!currentUserId || !taskId || !newComment.trim()) return;

    const mentions = extractMentions(newComment);
    const data: CommentInsert = {
      plan_id: planId,
      task_id: taskId,
      user_id: currentUserId,
      content: newComment.trim(),
    };

    try {
      await createComment.mutateAsync({ data, mentionedUserIds: mentions });
      setNewComment("");
      setMentionedUserIds([]);
      toast({ title: "Comment added", variant: "default" });
    } catch (error) {
      toast(formatErrorMessage(error));
    }
  };

  // Handle update comment
  const handleUpdate = async () => {
    if (!editingComment || !editContent.trim()) return;

    const mentions = extractMentions(editContent);

    try {
      await updateComment.mutateAsync({
        commentId: editingComment.id,
        data: { content: editContent.trim() },
        mentionedUserIds: mentions,
      });
      setEditingComment(null);
      setEditContent("");
      toast({ title: "Comment updated", variant: "default" });
    } catch (error) {
      toast(formatErrorMessage(error));
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

  // Start editing a comment
  const startEdit = (comment: CommentWithUser) => {
    setEditingComment(comment);
    setEditContent(comment.content);
  };

  const currentUserInitials = currentUser?.full_name
    ? currentUser.full_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : currentUser?.email?.slice(0, 2).toUpperCase() || "?";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b border-border-soft">
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Comments on &ldquo;{task?.title ?? "Task"}&rdquo;
          </DialogTitle>
        </DialogHeader>

        {/* Comments List */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-text-muted" />
            </div>
          ) : comments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <MessageCircle className="h-12 w-12 text-text-subtle mb-3" />
              <p className="text-body-sm text-text-muted">No comments yet</p>
              <p className="text-small text-text-subtle">
                Be the first to leave a comment
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {comments.map((comment) =>
                editingComment?.id === comment.id ? (
                  <div key={comment.id} className="space-y-3">
                    <MarkdownEditor
                      value={editContent}
                      onChange={setEditContent}
                      placeholder="Edit your comment..."
                      minHeight={100}
                      maxHeight={200}
                    />
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingComment(null);
                          setEditContent("");
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleUpdate}
                        disabled={updateComment.isPending || !editContent.trim()}
                      >
                        {updateComment.isPending && (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        )}
                        Save
                      </Button>
                    </div>
                  </div>
                ) : (
                  <CommentCard
                    key={comment.id}
                    comment={comment}
                    currentUserId={currentUserId}
                    isOwner={isOwner}
                    members={members}
                    onEdit={startEdit}
                    onDelete={handleDelete}
                  />
                )
              )}
            </div>
          )}
        </div>

        {/* New Comment Input */}
        {currentUserId && (
          <div className="px-6 py-4 border-t border-border-soft bg-bg-1/30">
            <div className="flex gap-3">
              <Avatar className="h-8 w-8 shrink-0">
                {currentUser?.avatar_url && (
                  <AvatarImage src={currentUser.avatar_url} />
                )}
                <AvatarFallback className="text-xs bg-accent/10 text-accent">
                  {currentUserInitials}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 space-y-3">
                {/* Mention picker button */}
                <div className="relative">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute -top-1 right-0 h-7 text-xs gap-1 z-10"
                    onClick={() => setShowMentionPicker(!showMentionPicker)}
                  >
                    <AtSign className="h-3.5 w-3.5" />
                    Mention
                  </Button>

                  {showMentionPicker && (
                    <div className="absolute right-0 top-6 z-20 w-64 bg-bg-0 border border-border-soft rounded-card shadow-lg p-2">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-text-muted">
                          Mention someone
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5"
                          onClick={() => setShowMentionPicker(false)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                      <input
                        type="text"
                        value={mentionQuery}
                        onChange={(e) => setMentionQuery(e.target.value)}
                        placeholder="Search..."
                        className="w-full px-2 py-1 text-sm border border-border-soft rounded mb-2 bg-bg-0"
                        autoFocus
                      />
                      <div className="max-h-40 overflow-y-auto space-y-1">
                        {filteredMembers.map((member) => (
                          <button
                            key={member.id}
                            onClick={() => insertMention(member)}
                            className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-bg-1 text-left"
                          >
                            <Avatar className="h-6 w-6">
                              {member.avatar_url && (
                                <AvatarImage src={member.avatar_url} />
                              )}
                              <AvatarFallback className="text-[10px]">
                                {member.full_name?.slice(0, 2).toUpperCase() ||
                                  member.email.slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">
                                {member.full_name || member.email}
                              </p>
                              {member.full_name && (
                                <p className="text-xs text-text-muted truncate">
                                  {member.email}
                                </p>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <MarkdownEditor
                  value={newComment}
                  onChange={setNewComment}
                  placeholder="Write a comment... Use @name to mention someone"
                  minHeight={80}
                  maxHeight={150}
                  showCharCount={false}
                />

                <div className="flex justify-end">
                  <Button
                    onClick={handleCreate}
                    disabled={createComment.isPending || !newComment.trim()}
                  >
                    {createComment.isPending && (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    )}
                    Post Comment
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
