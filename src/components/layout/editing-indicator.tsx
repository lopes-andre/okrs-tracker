"use client";

import { Pencil } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useEditingUsers } from "@/lib/realtime";
import type { EditableEntityType } from "@/lib/realtime";
import { cn } from "@/lib/utils";

interface EditingIndicatorProps {
  /** The type of entity to check for editors */
  entityType: EditableEntityType;
  /** The ID of the entity to check for editors */
  entityId: string;
  /** Current user's ID to exclude from the indicator */
  currentUserId?: string;
  /** Additional CSS classes */
  className?: string;
  /** Size variant */
  size?: "sm" | "md";
}

/**
 * Shows an indicator when other users are editing the same entity.
 * Displays avatars of users currently editing with a tooltip.
 */
export function EditingIndicator({
  entityType,
  entityId,
  currentUserId,
  className,
  size = "sm",
}: EditingIndicatorProps) {
  const editingUsers = useEditingUsers(entityType, entityId, currentUserId);

  if (editingUsers.length === 0) {
    return null;
  }

  const avatarSize = size === "sm" ? "h-5 w-5" : "h-6 w-6";
  const iconSize = size === "sm" ? "w-3 h-3" : "w-4 h-4";
  const fontSize = size === "sm" ? "text-[10px]" : "text-xs";

  return (
    <Tooltip delayDuration={0}>
      <TooltipTrigger asChild>
        <div
          className={cn(
            "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full",
            "bg-status-warning/10 border border-status-warning/30",
            "animate-pulse",
            className
          )}
        >
          <Pencil className={cn(iconSize, "text-status-warning")} />
          <div className="flex -space-x-1">
            {editingUsers.slice(0, 2).map((user) => (
              <Avatar
                key={user.oduserId}
                className={cn(avatarSize, "border border-bg-0")}
              >
                {user.avatarUrl && <AvatarImage src={user.avatarUrl} />}
                <AvatarFallback className={cn(fontSize, "bg-status-warning/20 text-status-warning font-medium")}>
                  {user.fullName
                    ? user.fullName
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase()
                        .slice(0, 2)
                    : user.email?.slice(0, 2).toUpperCase() || "?"}
                </AvatarFallback>
              </Avatar>
            ))}
          </div>
          {editingUsers.length > 2 && (
            <span className={cn(fontSize, "text-status-warning font-medium")}>
              +{editingUsers.length - 2}
            </span>
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs">
        <div className="flex flex-col gap-0.5">
          <span className="font-medium text-status-warning">Currently editing:</span>
          {editingUsers.map((user) => (
            <span key={user.oduserId}>
              {user.fullName || user.email || "Unknown user"}
            </span>
          ))}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

/**
 * A smaller, inline indicator for use in lists/tables.
 * Just shows a pencil icon with a tooltip.
 */
export function EditingDot({
  entityType,
  entityId,
  currentUserId,
  className,
}: Omit<EditingIndicatorProps, "size">) {
  const editingUsers = useEditingUsers(entityType, entityId, currentUserId);

  if (editingUsers.length === 0) {
    return null;
  }

  return (
    <Tooltip delayDuration={0}>
      <TooltipTrigger asChild>
        <div
          className={cn(
            "inline-flex items-center justify-center w-5 h-5 rounded-full",
            "bg-status-warning/20 animate-pulse",
            className
          )}
        >
          <Pencil className="w-3 h-3 text-status-warning" />
        </div>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs">
        <div className="flex flex-col gap-0.5">
          <span className="font-medium text-status-warning">Being edited by:</span>
          {editingUsers.map((user) => (
            <span key={user.oduserId}>
              {user.fullName || user.email || "Unknown user"}
            </span>
          ))}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
