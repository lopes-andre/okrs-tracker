"use client";

import { format, parseISO, isPast, isToday } from "date-fns";
import { Check, Clock, Megaphone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { PlatformIcon } from "./platform-icon";
import { cn } from "@/lib/utils";
import type { ContentCalendarEntry } from "@/lib/supabase/types";

// ============================================================================
// TYPES
// ============================================================================

interface CalendarEntryProps {
  entry: ContentCalendarEntry;
  onClick?: () => void;
  variant?: "compact" | "default" | "expanded";
  showTime?: boolean;
}

interface CalendarEntryGroupProps {
  entries: ContentCalendarEntry[];
  onClick?: (entry: ContentCalendarEntry) => void;
  variant?: "compact" | "default" | "expanded";
  showTime?: boolean;
  maxVisible?: number;
  onMoreClick?: () => void;
}

// ============================================================================
// HELPERS
// ============================================================================

function getEntryStatus(entry: ContentCalendarEntry) {
  if (entry.status === "posted") {
    return "posted";
  }

  if (entry.scheduled_at) {
    const scheduledDate = parseISO(entry.scheduled_at);
    // If scheduled time has passed, treat as posted (auto-posted)
    if (isPast(scheduledDate) && !isToday(scheduledDate)) {
      return "posted"; // Changed from "overdue" to "posted"
    }
    return "scheduled";
  }

  return "draft";
}

function getStatusStyles(status: string) {
  switch (status) {
    case "posted":
      return "bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-300";
    case "scheduled":
      return "bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-300";
    default:
      return "bg-bg-1 border-border text-text";
  }
}

// ============================================================================
// SINGLE ENTRY COMPONENT
// ============================================================================

export function CalendarEntry({
  entry,
  onClick,
  variant = "default",
  showTime = true,
}: CalendarEntryProps) {
  const status = getEntryStatus(entry);
  const statusStyles = getStatusStyles(status);

  const time = entry.scheduled_at
    ? format(parseISO(entry.scheduled_at), "h:mm a")
    : null;

  const content = (
    <div
      className={cn(
        "flex items-center gap-2 rounded-md border cursor-pointer transition-all hover:shadow-sm",
        statusStyles,
        entry.campaign_id && "ring-1 ring-accent/50",
        variant === "compact" && "px-1.5 py-0.5 text-[10px]",
        variant === "default" && "px-2 py-1 text-small",
        variant === "expanded" && "px-3 py-2"
      )}
      onClick={onClick}
    >
      {/* Campaign indicator + Platform Icon */}
      <div className="flex items-center gap-1 shrink-0">
        {entry.campaign_id && (
          <Megaphone className="w-3 h-3 text-accent" />
        )}
        <PlatformIcon
          platformName={entry.platform_name}
          size={variant === "compact" ? "sm" : "sm"}
        />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            "truncate font-medium",
            variant === "compact" && "text-[10px]",
            variant === "default" && "text-small",
            variant === "expanded" && "text-body-sm"
          )}
        >
          {entry.post_title}
        </p>
        {variant === "expanded" && (
          <p className="text-[10px] text-text-muted truncate">
            {entry.account_name}
          </p>
        )}
      </div>

      {/* Time */}
      {showTime && time && variant !== "compact" && (
        <span className="text-[10px] text-text-muted shrink-0">{time}</span>
      )}

      {/* Status Icon */}
      {status === "posted" && (
        <Check className="w-3 h-3 text-green-600 shrink-0" />
      )}
    </div>
  );

  // Wrap in tooltip for additional info
  return (
    <TooltipProvider>
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>{content}</TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <div className="space-y-1.5">
            <p className="font-medium">{entry.post_title}</p>
            <div className="flex items-center gap-2 text-small">
              <PlatformIcon
                platformName={entry.platform_name}
                size="sm"
              />
              <span>{entry.account_name}</span>
            </div>
            {time && (
              <p className="text-small text-text-muted flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {time}
              </p>
            )}
            {entry.campaign_name && (
              <p className="text-small text-accent flex items-center gap-1">
                <Megaphone className="w-3 h-3" />
                {entry.campaign_name}
              </p>
            )}
            {/* Content Goals */}
            {entry.goals && entry.goals.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-0.5">
                {entry.goals.map((goal) => (
                  <Badge
                    key={goal.id}
                    variant="outline"
                    className="text-[10px] px-1.5 py-0"
                    style={{
                      borderColor: goal.color || undefined,
                      color: goal.color || undefined,
                    }}
                  >
                    {goal.name}
                  </Badge>
                ))}
              </div>
            )}
            <Badge
              variant={status === "posted" ? "default" : "outline"}
              className={cn(
                "text-[10px]",
                status === "posted" && "bg-green-600",
                status === "scheduled" && "border-blue-500 text-blue-600"
              )}
            >
              {status === "posted" && "Posted"}
              {status === "scheduled" && "Scheduled"}
            </Badge>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ============================================================================
// GROUPED ENTRIES COMPONENT (for same post, multiple platforms)
// ============================================================================

export function CalendarEntryGroup({
  entries,
  onClick,
  variant = "default",
  showTime = true,
  maxVisible = 3,
  onMoreClick,
}: CalendarEntryGroupProps) {
  if (entries.length === 0) return null;

  // Group entries by post_id and scheduled time
  const groupedByPostAndTime = entries.reduce((acc, entry) => {
    const key = `${entry.post_id}-${entry.scheduled_at}`;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(entry);
    return acc;
  }, {} as Record<string, ContentCalendarEntry[]>);

  const groups = Object.values(groupedByPostAndTime);
  const visibleGroups = groups.slice(0, maxVisible);
  const hiddenCount = groups.length - maxVisible;

  return (
    <div className="space-y-1">
      {visibleGroups.map((group, idx) => {
        // If same post scheduled to multiple platforms at same time, show combined
        if (group.length > 1) {
          const firstEntry = group[0];
          const status = getEntryStatus(firstEntry);
          const statusStyles = getStatusStyles(status);
          const time = firstEntry.scheduled_at
            ? format(parseISO(firstEntry.scheduled_at), "h:mm a")
            : null;
          const hasCampaign = group.some((e) => e.campaign_id);

          return (
            <div
              key={idx}
              className={cn(
                "flex items-center gap-2 rounded-md border cursor-pointer transition-all hover:shadow-sm",
                statusStyles,
                hasCampaign && "ring-1 ring-accent/50",
                variant === "compact" && "px-1.5 py-0.5",
                variant === "default" && "px-2 py-1",
                variant === "expanded" && "px-3 py-2"
              )}
              onClick={() => onClick?.(firstEntry)}
            >
              {/* Campaign indicator + Multiple Platform Icons */}
              <div className="flex items-center gap-1 shrink-0">
                {hasCampaign && (
                  <Megaphone className="w-3 h-3 text-accent" />
                )}
                <div className="flex -space-x-1">
                  {group.slice(0, 3).map((entry, i) => (
                    <PlatformIcon
                      key={entry.distribution_id}
                      platformName={entry.platform_name}
                      size="sm"
                      className={i > 0 ? "ring-1 ring-white rounded-full" : ""}
                    />
                  ))}
                  {group.length > 3 && (
                    <span className="text-[10px] text-text-muted ml-1">
                      +{group.length - 3}
                    </span>
                  )}
                </div>
              </div>

              {/* Content */}
              <p
                className={cn(
                  "flex-1 min-w-0 truncate font-medium",
                  variant === "compact" && "text-[10px]",
                  variant === "default" && "text-small",
                  variant === "expanded" && "text-body-sm"
                )}
              >
                {firstEntry.post_title}
              </p>

              {/* Time */}
              {showTime && time && variant !== "compact" && (
                <span className="text-[10px] text-text-muted shrink-0">
                  {time}
                </span>
              )}

              {/* Status */}
              {status === "posted" && (
                <Check className="w-3 h-3 text-green-600 shrink-0" />
              )}
            </div>
          );
        }

        // Single entry
        return (
          <CalendarEntry
            key={group[0].distribution_id}
            entry={group[0]}
            onClick={() => onClick?.(group[0])}
            variant={variant}
            showTime={showTime}
          />
        );
      })}

      {/* Hidden count */}
      {hiddenCount > 0 && (
        onMoreClick ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onMoreClick();
            }}
            className="w-full text-[10px] text-accent hover:text-accent-hover text-center py-0.5 hover:underline transition-colors"
          >
            +{hiddenCount} more
          </button>
        ) : (
          <p className="text-[10px] text-text-muted text-center py-0.5">
            +{hiddenCount} more
          </p>
        )
      )}
    </div>
  );
}
