"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { CommentWithUser, Profile } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";

interface CommentCardProps {
  comment: CommentWithUser;
  currentUserId?: string;
  isOwner?: boolean;
  onEdit?: (comment: CommentWithUser) => void;
  onDelete?: (commentId: string) => void;
  members?: Profile[];
}

/**
 * Render comment content with highlighted @mentions
 */
function renderContentWithMentions(
  content: string,
  mentions?: CommentWithUser["mentions"]
): React.ReactNode {
  if (!mentions || mentions.length === 0) {
    return content;
  }

  // Build a map of user IDs to their names
  const mentionMap = new Map<string, string>();
  mentions.forEach((mention) => {
    if (mention.user) {
      mentionMap.set(
        mention.user_id,
        mention.user.full_name || mention.user.email
      );
    }
  });

  // Find all @mentions in the content and highlight them
  // Unicode-aware pattern to support accented characters (é, ã, ç, etc.)
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  const mentionRegex = /@([\p{L}\p{M}]+(?:\s+[\p{L}\p{M}]+)?)/gu;
  let match;

  while ((match = mentionRegex.exec(content)) !== null) {
    // Add text before the match
    if (match.index > lastIndex) {
      parts.push(content.slice(lastIndex, match.index));
    }

    // Check if this mention matches any of our actual mentions
    const mentionText = match[1];
    let isMention = false;
    mentionMap.forEach((name) => {
      if (
        name.toLowerCase().includes(mentionText.toLowerCase()) ||
        mentionText.toLowerCase().includes(name.toLowerCase().split(" ")[0])
      ) {
        isMention = true;
      }
    });

    if (isMention) {
      parts.push(
        <span
          key={match.index}
          className="bg-accent/10 text-accent px-1 rounded font-medium"
        >
          @{mentionText}
        </span>
      );
    } else {
      parts.push(match[0]);
    }

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < content.length) {
    parts.push(content.slice(lastIndex));
  }

  return parts.length > 0 ? parts : content;
}

export function CommentCard({
  comment,
  currentUserId,
  isOwner = false,
  onEdit,
  onDelete,
}: CommentCardProps) {
  const [showActions, setShowActions] = useState(false);
  const canModify = currentUserId === comment.user_id || isOwner;

  const userInitials = comment.user?.full_name
    ? comment.user.full_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : comment.user?.email?.slice(0, 2).toUpperCase() || "?";

  return (
    <div
      className="flex gap-3 group"
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Avatar */}
      <Avatar className="h-8 w-8 shrink-0">
        {comment.user?.avatar_url && (
          <AvatarImage src={comment.user.avatar_url} />
        )}
        <AvatarFallback className="text-xs bg-accent/10 text-accent">
          {userInitials}
        </AvatarFallback>
      </Avatar>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-body-sm font-medium text-text-strong">
            {comment.user?.full_name || comment.user?.email || "Unknown user"}
          </span>
          <span className="text-small text-text-muted">
            {formatDistanceToNow(new Date(comment.created_at), {
              addSuffix: true,
            })}
          </span>
          {comment.updated_at !== comment.created_at && (
            <span className="text-small text-text-subtle">(edited)</span>
          )}
        </div>

        <div className="mt-1 text-body-sm text-text whitespace-pre-wrap break-words">
          {renderContentWithMentions(comment.content, comment.mentions)}
        </div>
      </div>

      {/* Actions */}
      {canModify && (
        <div
          className={cn(
            "shrink-0 transition-opacity",
            showActions ? "opacity-100" : "opacity-0"
          )}
        >
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {currentUserId === comment.user_id && onEdit && (
                <DropdownMenuItem onClick={() => onEdit(comment)}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit
                </DropdownMenuItem>
              )}
              {onDelete && (
                <DropdownMenuItem
                  onClick={() => onDelete(comment.id)}
                  className="text-status-danger focus:text-status-danger"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </div>
  );
}
