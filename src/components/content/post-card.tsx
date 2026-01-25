"use client";

import { format } from "date-fns";
import {
  Calendar,
  Image as ImageIcon,
  Link2,
  Send,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { PlatformIcon } from "./platform-icon";
import type { ContentPostWithDetails } from "@/lib/supabase/types";

// ============================================================================
// TYPES
// ============================================================================

interface PostCardProps {
  post: ContentPostWithDetails;
  onClick?: () => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function PostCard({ post, onClick }: PostCardProps) {
  // Count distributions by platform
  const platformCounts = post.distributions?.reduce(
    (acc, dist) => {
      const platformId = dist.account?.platform?.id || "unknown";
      acc[platformId] = (acc[platformId] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  ) || {};

  const platforms = Object.keys(platformCounts);
  const totalDistributions = post.distribution_count || 0;
  const postedCount = post.posted_count || 0;
  const scheduledCount = post.scheduled_count || 0;

  // Get the earliest scheduled date
  const nextScheduledDate = post.distributions
    ?.filter((d) => d.status === "scheduled" && d.scheduled_at)
    .sort((a, b) => new Date(a.scheduled_at!).getTime() - new Date(b.scheduled_at!).getTime())[0]
    ?.scheduled_at;

  return (
    <div
      className={cn(
        "bg-bg-0 rounded-card border border-border-soft p-3",
        "hover:border-border hover:shadow-sm transition-all cursor-pointer"
      )}
      onClick={onClick}
    >
      {/* Title */}
      <h4 className="font-medium text-body-sm line-clamp-2 mb-2">
        {post.title || "Untitled Post"}
      </h4>

      {/* Description preview */}
      {post.description && (
        <p className="text-small text-text-muted line-clamp-2 mb-3">
          {post.description}
        </p>
      )}

      {/* Goals */}
      {post.goals && post.goals.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {post.goals.map((goal) => (
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

      {/* Metadata Row */}
      <div className="flex items-center gap-3 text-text-muted">
        {/* Media count */}
        {post.media && post.media.length > 0 && (
          <div className="flex items-center gap-1">
            <ImageIcon className="w-3 h-3" />
            <span className="text-small">{post.media.length}</span>
          </div>
        )}

        {/* Links count */}
        {post.links && post.links.length > 0 && (
          <div className="flex items-center gap-1">
            <Link2 className="w-3 h-3" />
            <span className="text-small">{post.links.length}</span>
          </div>
        )}

        {/* Scheduled date */}
        {nextScheduledDate && (
          <div className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            <span className="text-small">
              {format(new Date(nextScheduledDate), "MMM d")}
            </span>
          </div>
        )}
      </div>

      {/* Distributions */}
      {totalDistributions > 0 && (
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-border-soft">
          {/* Platform icons */}
          <div className="flex items-center gap-1">
            {platforms.slice(0, 4).map((platformId) => {
              const dist = post.distributions?.find(
                (d) => d.account?.platform?.id === platformId
              );
              const platformName = dist?.account?.platform?.name || "blog";
              return (
                <PlatformIcon
                  key={platformId}
                  platformName={platformName}
                  size="sm"
                />
              );
            })}
            {platforms.length > 4 && (
              <span className="text-small text-text-muted ml-1">
                +{platforms.length - 4}
              </span>
            )}
          </div>

          {/* Distribution status */}
          <div className="flex items-center gap-2 text-small">
            {scheduledCount > 0 && (
              <div className="flex items-center gap-1 text-amber-600">
                <Calendar className="w-3 h-3" />
                <span>{scheduledCount}</span>
              </div>
            )}
            {postedCount > 0 && (
              <div className="flex items-center gap-1 text-green-600">
                <Send className="w-3 h-3" />
                <span>{postedCount}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
