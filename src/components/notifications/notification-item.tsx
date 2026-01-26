"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import {
  AtSign,
  MessageCircle,
  UserPlus,
  UserMinus,
  CheckCircle2,
  Edit3,
  X,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import type { NotificationWithDetails, NotificationType } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";

interface NotificationItemProps {
  notification: NotificationWithDetails;
  planId: string;
  onMarkAsRead?: (id: string) => void;
  onDelete?: (id: string) => void;
  onClick?: () => void;
}

const notificationConfig: Record<
  NotificationType,
  {
    icon: typeof MessageCircle;
    color: string;
    getMessage: (notification: NotificationWithDetails) => string;
  }
> = {
  mentioned: {
    icon: AtSign,
    color: "text-accent",
    getMessage: (n) =>
      `${n.actor?.full_name || "Someone"} mentioned you in a comment`,
  },
  comment: {
    icon: MessageCircle,
    color: "text-status-info",
    getMessage: (n) =>
      `${n.actor?.full_name || "Someone"} commented on "${n.task?.title || "a task"}"`,
  },
  assigned: {
    icon: UserPlus,
    color: "text-status-success",
    getMessage: (n) =>
      `${n.actor?.full_name || "Someone"} assigned you to "${n.task?.title || "a task"}"`,
  },
  unassigned: {
    icon: UserMinus,
    color: "text-status-warning",
    getMessage: (n) =>
      `${n.actor?.full_name || "Someone"} removed you from "${n.task?.title || "a task"}"`,
  },
  task_completed: {
    icon: CheckCircle2,
    color: "text-status-success",
    getMessage: (n) =>
      `"${n.task?.title || "A task"}" was marked as completed`,
  },
  task_updated: {
    icon: Edit3,
    color: "text-text-muted",
    getMessage: (n) =>
      `"${n.task?.title || "A task"}" was updated`,
  },
};

export function NotificationItem({
  notification,
  planId,
  onMarkAsRead,
  onDelete,
  onClick,
}: NotificationItemProps) {
  const config = notificationConfig[notification.type];
  const Icon = config.icon;
  const message = config.getMessage(notification);

  const actorInitials = notification.actor?.full_name
    ? notification.actor.full_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : notification.actor?.email?.slice(0, 2).toUpperCase() || "?";

  // Build link to task if available
  const taskLink = notification.task_id
    ? `/plans/${planId}/tasks?task=${notification.task_id}`
    : null;

  const handleClick = () => {
    if (onMarkAsRead && !notification.read) {
      onMarkAsRead(notification.id);
    }
    onClick?.();
  };

  const content = (
    <div
      className={cn(
        "flex gap-3 p-3 transition-colors",
        notification.read ? "bg-transparent" : "bg-accent/5",
        taskLink && "hover:bg-bg-1 cursor-pointer"
      )}
      onClick={handleClick}
    >
      {/* Actor Avatar or Icon */}
      {notification.actor ? (
        <Avatar className="h-9 w-9 shrink-0">
          {notification.actor.avatar_url && (
            <AvatarImage src={notification.actor.avatar_url} />
          )}
          <AvatarFallback className="text-xs bg-accent/10 text-accent">
            {actorInitials}
          </AvatarFallback>
        </Avatar>
      ) : (
        <div
          className={cn(
            "h-9 w-9 shrink-0 rounded-full flex items-center justify-center bg-bg-1",
            config.color
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
      )}

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-body-sm text-text-strong line-clamp-2">{message}</p>
        <p className="text-small text-text-muted mt-0.5">
          {formatDistanceToNow(new Date(notification.created_at), {
            addSuffix: true,
          })}
        </p>
      </div>

      {/* Actions */}
      <div className="shrink-0 flex items-start gap-1">
        {!notification.read && (
          <div className="w-2 h-2 rounded-full bg-accent mt-2" />
        )}
        {onDelete && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(notification.id);
            }}
            aria-label="Dismiss notification"
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>
    </div>
  );

  if (taskLink) {
    return (
      <Link href={taskLink} className="block group">
        {content}
      </Link>
    );
  }

  return <div className="group">{content}</div>;
}
