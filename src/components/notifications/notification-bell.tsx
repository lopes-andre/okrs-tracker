"use client";

import { useState } from "react";
import { Bell, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { NotificationItem } from "./notification-item";
import {
  useNotifications,
  useUnreadNotificationCount,
  useNotificationsRealtime,
  useMarkNotificationAsRead,
  useMarkAllNotificationsAsRead,
  useDeleteNotification,
} from "@/features/notifications/hooks";
import { cn } from "@/lib/utils";

interface NotificationBellProps {
  userId: string | null;
  planId: string;
}

export function NotificationBell({ userId, planId }: NotificationBellProps) {
  const [open, setOpen] = useState(false);

  // Fetch notifications and count
  const { data: notifications = [], isLoading } = useNotifications(userId, {
    limit: 20,
  });
  const { data: unreadCount = 0 } = useUnreadNotificationCount(userId);

  // Subscribe to real-time updates
  useNotificationsRealtime(userId);

  // Mutations
  const markAsRead = useMarkNotificationAsRead();
  const markAllAsRead = useMarkAllNotificationsAsRead(userId);
  const deleteNotification = useDeleteNotification();

  const handleMarkAsRead = (notificationId: string) => {
    markAsRead.mutate(notificationId);
  };

  const handleMarkAllAsRead = () => {
    markAllAsRead.mutate();
  };

  const handleDelete = (notificationId: string) => {
    deleteNotification.mutate(notificationId);
  };

  if (!userId) {
    return null;
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span
              className={cn(
                "absolute -top-0.5 -right-0.5 flex items-center justify-center",
                "min-w-[18px] h-[18px] px-1 rounded-full",
                "bg-status-danger text-white text-[10px] font-medium"
              )}
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        className="w-[380px] p-0"
        align="end"
        sideOffset={8}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border-soft">
          <h3 className="text-body-sm font-semibold text-text-strong">
            Notifications
          </h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs gap-1"
              onClick={handleMarkAllAsRead}
              disabled={markAllAsRead.isPending}
            >
              {markAllAsRead.isPending ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Check className="h-3 w-3" />
              )}
              Mark all read
            </Button>
          )}
        </div>

        {/* Notifications List */}
        <div className="max-h-[400px] overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-text-muted" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
              <Bell className="h-8 w-8 text-text-subtle mb-2" />
              <p className="text-body-sm text-text-muted">No notifications yet</p>
              <p className="text-small text-text-subtle">
                You&apos;ll be notified about comments, mentions, and assignments
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border-soft">
              {notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  planId={planId}
                  onMarkAsRead={handleMarkAsRead}
                  onDelete={handleDelete}
                  onClick={() => setOpen(false)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer - optional "View all" link */}
        {notifications.length > 0 && (
          <div className="px-4 py-2 border-t border-border-soft bg-bg-1/50">
            <p className="text-small text-text-muted text-center">
              Showing {notifications.length} most recent
            </p>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
