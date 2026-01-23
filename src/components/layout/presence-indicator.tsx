"use client";

import { useState } from "react";
import { useRealtime } from "@/lib/realtime";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Users, Wifi, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface PresenceIndicatorProps {
  className?: string;
  showConnectionStatus?: boolean;
}

/**
 * Shows online users and connection status for real-time collaboration.
 * Displays avatars of online users with a popover for details.
 */
export function PresenceIndicator({
  className,
  showConnectionStatus = true,
}: PresenceIndicatorProps) {
  const { isConnected, connectionStatus, onlineUsers } = useRealtime();
  const [isOpen, setIsOpen] = useState(false);

  // Filter out duplicates by userId
  const uniqueUsers = onlineUsers.filter(
    (user, index, self) =>
      index === self.findIndex((u) => u.oduserId === user.oduserId)
  );

  // Get initials from email or name
  const getInitials = (email: string, fullName: string | null): string => {
    if (fullName) {
      return fullName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    return email.slice(0, 2).toUpperCase();
  };

  // Generate a consistent color based on string
  const getAvatarColor = (str: string): string => {
    const colors = [
      "bg-blue-500",
      "bg-green-500",
      "bg-purple-500",
      "bg-pink-500",
      "bg-indigo-500",
      "bg-teal-500",
      "bg-orange-500",
      "bg-cyan-500",
    ];
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  // Format page name for display
  const formatPageName = (page?: string): string => {
    if (!page) return "Unknown page";
    // Convert path to readable name
    const parts = page.split("/").filter(Boolean);
    const lastPart = parts[parts.length - 1] || "Dashboard";
    return lastPart.charAt(0).toUpperCase() + lastPart.slice(1);
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {/* Connection status indicator */}
      {showConnectionStatus && (
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className={cn(
                "flex items-center justify-center w-6 h-6 rounded-full transition-colors",
                isConnected
                  ? "bg-status-success/10 text-status-success"
                  : connectionStatus === "reconnecting"
                  ? "bg-status-warning/10 text-status-warning"
                  : "bg-text-muted/10 text-text-muted"
              )}
            >
              {isConnected ? (
                <Wifi className="w-3.5 h-3.5" />
              ) : (
                <WifiOff className="w-3.5 h-3.5" />
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            {isConnected
              ? "Real-time sync active"
              : connectionStatus === "reconnecting"
              ? "Reconnecting..."
              : "Offline - changes will sync when connected"}
          </TooltipContent>
        </Tooltip>
      )}

      {/* Online users indicator */}
      {uniqueUsers.length > 0 && (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <button
              className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-bg-0 border border-border-soft hover:border-border transition-colors"
              aria-label={`${uniqueUsers.length} user${uniqueUsers.length !== 1 ? "s" : ""} online`}
            >
              {/* Avatar stack (show up to 3) */}
              <div className="flex -space-x-2">
                {uniqueUsers.slice(0, 3).map((user, index) => (
                  <div
                    key={user.oduserId}
                    className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-medium border-2 border-bg-0",
                      getAvatarColor(user.email)
                    )}
                    style={{ zIndex: 3 - index }}
                  >
                    {getInitials(user.email, user.fullName)}
                  </div>
                ))}
              </div>

              {/* Count if more than 3 */}
              {uniqueUsers.length > 3 && (
                <span className="text-xs text-text-muted ml-1">
                  +{uniqueUsers.length - 3}
                </span>
              )}

              <Users className="w-3.5 h-3.5 text-text-muted ml-0.5" />
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-64 p-0">
            <div className="p-3 border-b border-border-soft">
              <h4 className="text-sm font-medium">
                Online Now ({uniqueUsers.length})
              </h4>
              <p className="text-xs text-text-muted mt-0.5">
                Collaborators viewing this plan
              </p>
            </div>
            <ul className="p-2 max-h-64 overflow-y-auto">
              {uniqueUsers.map((user) => (
                <li
                  key={user.oduserId}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-bg-1 transition-colors"
                >
                  <div
                    className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium flex-shrink-0",
                      getAvatarColor(user.email)
                    )}
                  >
                    {getInitials(user.email, user.fullName)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {user.fullName || user.email.split("@")[0]}
                    </p>
                    <p className="text-xs text-text-muted truncate">
                      {formatPageName(user.currentPage)}
                    </p>
                  </div>
                  <div className="w-2 h-2 rounded-full bg-status-success flex-shrink-0" />
                </li>
              ))}
            </ul>
          </PopoverContent>
        </Popover>
      )}

      {/* Show icon when no other users are online */}
      {uniqueUsers.length === 0 && isConnected && (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-bg-0 border border-border-soft text-text-muted">
              <Users className="w-3.5 h-3.5" />
            </div>
          </TooltipTrigger>
          <TooltipContent>Only you are viewing this plan</TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}
