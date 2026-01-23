"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import type { Profile } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";

interface CommentInputProps {
  members: Profile[];
  currentUser?: Profile | null;
  onSubmit: (content: string, mentionedUserIds: string[]) => Promise<void>;
  placeholder?: string;
  initialContent?: string;
  isSubmitting?: boolean;
  autoFocus?: boolean;
  onCancel?: () => void;
}

interface MentionState {
  isActive: boolean;
  startIndex: number;
  query: string;
  selectedIndex: number;
}

export function CommentInput({
  members,
  currentUser,
  onSubmit,
  placeholder = "Add a comment... Use @ to mention someone",
  initialContent = "",
  isSubmitting = false,
  autoFocus = false,
  onCancel,
}: CommentInputProps) {
  const [content, setContent] = useState(initialContent);
  const [mentionedUserIds, setMentionedUserIds] = useState<Set<string>>(
    new Set()
  );
  const [mention, setMention] = useState<MentionState>({
    isActive: false,
    startIndex: 0,
    query: "",
    selectedIndex: 0,
  });

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mentionListRef = useRef<HTMLDivElement>(null);

  // Filter members based on mention query (exclude current user)
  const filteredMembers = members.filter((member) => {
    if (member.id === currentUser?.id) return false;
    if (!mention.query) return true;
    const searchTerm = mention.query.toLowerCase();
    return (
      member.full_name?.toLowerCase().includes(searchTerm) ||
      member.email.toLowerCase().includes(searchTerm)
    );
  });

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        200
      )}px`;
    }
  }, [content]);

  // Handle content change and detect @mentions
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const value = e.target.value;
      const cursorPos = e.target.selectionStart;

      setContent(value);

      // Check if we're in a mention context
      const textBeforeCursor = value.slice(0, cursorPos);
      const lastAtIndex = textBeforeCursor.lastIndexOf("@");

      if (lastAtIndex !== -1) {
        const textAfterAt = textBeforeCursor.slice(lastAtIndex + 1);
        // Check if there's no space in the mention query (still typing the mention)
        if (!textAfterAt.includes(" ") && !textAfterAt.includes("\n")) {
          setMention({
            isActive: true,
            startIndex: lastAtIndex,
            query: textAfterAt,
            selectedIndex: 0,
          });
          return;
        }
      }

      // Not in mention context
      setMention((prev) => ({ ...prev, isActive: false }));
    },
    []
  );

  // Handle form submission (defined before handleKeyDown to allow proper dependency)
  const handleSubmit = useCallback(async () => {
    if (!content.trim() || isSubmitting) return;

    try {
      await onSubmit(content.trim(), Array.from(mentionedUserIds));
      setContent("");
      setMentionedUserIds(new Set());
    } catch {
      // Error handling is done in the parent component
    }
  }, [content, mentionedUserIds, isSubmitting, onSubmit]);

  // Select a mention from the dropdown (defined before handleKeyDown to allow proper dependency)
  const selectMention = useCallback(
    (member: Profile) => {
      const displayName = member.full_name || member.email.split("@")[0];
      const beforeMention = content.slice(0, mention.startIndex);
      const afterMention = content.slice(
        mention.startIndex + mention.query.length + 1
      );
      const newContent = `${beforeMention}@${displayName} ${afterMention}`;

      setContent(newContent);
      setMentionedUserIds((prev) => new Set([...prev, member.id]));
      setMention({ isActive: false, startIndex: 0, query: "", selectedIndex: 0 });

      // Focus back on textarea
      setTimeout(() => {
        if (textareaRef.current) {
          const newCursorPos = beforeMention.length + displayName.length + 2;
          textareaRef.current.focus();
          textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
        }
      }, 0);
    },
    [content, mention]
  );

  // Handle keyboard navigation in mention list
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (!mention.isActive || filteredMembers.length === 0) {
        // Handle submit on Cmd/Ctrl + Enter
        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
          e.preventDefault();
          handleSubmit();
        }
        return;
      }

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setMention((prev) => ({
            ...prev,
            selectedIndex: Math.min(
              prev.selectedIndex + 1,
              filteredMembers.length - 1
            ),
          }));
          break;
        case "ArrowUp":
          e.preventDefault();
          setMention((prev) => ({
            ...prev,
            selectedIndex: Math.max(prev.selectedIndex - 1, 0),
          }));
          break;
        case "Enter":
        case "Tab":
          e.preventDefault();
          selectMention(filteredMembers[mention.selectedIndex]);
          break;
        case "Escape":
          e.preventDefault();
          setMention((prev) => ({ ...prev, isActive: false }));
          break;
      }
    },
    [mention, filteredMembers, handleSubmit, selectMention]
  );

  const userInitials = currentUser?.full_name
    ? currentUser.full_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : currentUser?.email?.slice(0, 2).toUpperCase() || "?";

  return (
    <div className="flex gap-3">
      {/* Current user avatar */}
      <Avatar className="h-8 w-8 shrink-0">
        {currentUser?.avatar_url && (
          <AvatarImage src={currentUser.avatar_url} />
        )}
        <AvatarFallback className="text-xs bg-accent/10 text-accent">
          {userInitials}
        </AvatarFallback>
      </Avatar>

      {/* Input area */}
      <div className="flex-1 relative">
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            autoFocus={autoFocus}
            disabled={isSubmitting}
            rows={1}
            className={cn(
              "w-full px-3 py-2 pr-10 text-body-sm rounded-lg border border-border-soft",
              "bg-white placeholder:text-text-subtle resize-none",
              "focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              "min-h-[40px] max-h-[200px]"
            )}
          />

          {/* Submit button */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleSubmit}
            disabled={!content.trim() || isSubmitting}
            className="absolute right-1 top-1 h-8 w-8"
            aria-label={isSubmitting ? "Sending comment" : "Send comment"}
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Cancel button for edit mode */}
        {onCancel && (
          <div className="flex justify-end mt-2 gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSubmit}
              disabled={!content.trim() || isSubmitting}
            >
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save
            </Button>
          </div>
        )}

        {/* Mention autocomplete dropdown */}
        {mention.isActive && filteredMembers.length > 0 && (
          <div
            ref={mentionListRef}
            className={cn(
              "absolute z-50 mt-1 w-64 max-h-48 overflow-auto",
              "bg-white rounded-lg border border-border shadow-lg"
            )}
          >
            {filteredMembers.map((member, index) => (
              <button
                key={member.id}
                type="button"
                onClick={() => selectMention(member)}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-2 text-left",
                  "hover:bg-bg-1 transition-colors",
                  index === mention.selectedIndex && "bg-bg-1"
                )}
              >
                <Avatar className="h-6 w-6">
                  {member.avatar_url && <AvatarImage src={member.avatar_url} />}
                  <AvatarFallback className="text-[10px] bg-accent/10 text-accent">
                    {member.full_name
                      ? member.full_name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .toUpperCase()
                          .slice(0, 2)
                      : member.email.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="text-body-sm font-medium text-text-strong truncate">
                    {member.full_name || member.email}
                  </div>
                  {member.full_name && (
                    <div className="text-small text-text-muted truncate">
                      {member.email}
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Hint text */}
        <p className="mt-1 text-small text-text-subtle">
          Press <kbd className="px-1 py-0.5 bg-bg-1 rounded text-[10px]">@</kbd> to mention,{" "}
          <kbd className="px-1 py-0.5 bg-bg-1 rounded text-[10px]">Cmd+Enter</kbd> to send
        </p>
      </div>
    </div>
  );
}
