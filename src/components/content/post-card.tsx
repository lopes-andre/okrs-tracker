"use client";

import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import {
  Calendar,
  Image as ImageIcon,
  Link2,
  Send,
  Star,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { PlatformIcon } from "./platform-icon";
import { getMediaSignedUrl } from "@/features/content/api";
import type { ContentPostWithDetails } from "@/lib/supabase/types";

// ============================================================================
// TYPES
// ============================================================================

interface PostCardProps {
  post: ContentPostWithDetails;
  onClick?: () => void;
  onToggleFavorite?: (postId: string, isFavorite: boolean) => void;
}

// ============================================================================
// COVER IMAGE COMPONENT
// ============================================================================

function CoverImage({ post }: { post: ContentPostWithDetails }) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  // Find the first image media
  const firstImage = post.media?.find(
    (m) => m.file_type === "image" || m.mime_type?.startsWith("image/")
  );

  useEffect(() => {
    if (!firstImage) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    async function fetchUrl() {
      try {
        const url = await getMediaSignedUrl(firstImage!.file_url);
        if (!cancelled) {
          setImageUrl(url);
          setIsLoading(false);
        }
      } catch {
        if (!cancelled) {
          setHasError(true);
          setIsLoading(false);
        }
      }
    }

    fetchUrl();

    return () => {
      cancelled = true;
    };
  }, [firstImage]);

  if (!firstImage || hasError) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="w-full h-[120px] bg-bg-1 flex items-center justify-center rounded-t-card -mt-3 -mx-3 mb-3">
        <Loader2 className="w-5 h-5 animate-spin text-text-muted" />
      </div>
    );
  }

  if (!imageUrl) {
    return null;
  }

  return (
    <div className="w-full h-[120px] -mt-3 -mx-3 mb-3 overflow-hidden rounded-t-card">
      <img
        src={imageUrl}
        alt={post.title}
        className="w-full h-full object-cover"
        loading="lazy"
        onError={() => setHasError(true)}
      />
    </div>
  );
}

// ============================================================================
// PLATFORM ICON WITH COUNT BADGE
// ============================================================================

function PlatformIconWithBadge({
  platformName,
  count,
}: {
  platformName: string;
  count: number;
}) {
  return (
    <div className="relative">
      <PlatformIcon platformName={platformName} size="sm" />
      {count > 1 && (
        <span className="absolute -top-1 -right-1 min-w-[14px] h-[14px] bg-accent text-white text-[9px] font-medium rounded-full flex items-center justify-center px-0.5">
          {count}
        </span>
      )}
    </div>
  );
}

// ============================================================================
// SCHEDULED DATES DISPLAY
// ============================================================================

function ScheduledDatesDisplay({
  distributions,
}: {
  distributions: ContentPostWithDetails["distributions"];
}) {
  const scheduledDates = distributions
    ?.filter((d) => d.status === "scheduled" && d.scheduled_at)
    .map((d) => ({
      date: new Date(d.scheduled_at!),
      platform: d.account?.platform?.name || "Unknown",
    }))
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  if (!scheduledDates || scheduledDates.length === 0) {
    return null;
  }

  const MAX_VISIBLE_DATES = 2;
  const visibleDates = scheduledDates.slice(0, MAX_VISIBLE_DATES);
  const remainingCount = scheduledDates.length - MAX_VISIBLE_DATES;

  const tooltipContent = scheduledDates
    .map((d) => `${format(d.date, "MMM d")} (${d.platform})`)
    .join("\n");

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1 cursor-default">
            <Calendar className="w-3 h-3" />
            <span className="text-small">
              {visibleDates.map((d, i) => (
                <span key={i}>
                  {i > 0 && ", "}
                  {format(d.date, "MMM d")}
                </span>
              ))}
              {remainingCount > 0 && (
                <span className="text-text-muted"> +{remainingCount}</span>
              )}
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-[200px]">
          <p className="text-xs whitespace-pre-line">{tooltipContent}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function PostCard({ post, onClick, onToggleFavorite }: PostCardProps) {
  // Count distributions by platform
  const platformCounts = post.distributions?.reduce(
    (acc, dist) => {
      const platformId = dist.account?.platform?.id || "unknown";
      const platformName = dist.account?.platform?.name || "blog";
      if (!acc[platformId]) {
        acc[platformId] = { name: platformName, count: 0 };
      }
      acc[platformId].count += 1;
      return acc;
    },
    {} as Record<string, { name: string; count: number }>
  ) || {};

  const platforms = Object.values(platformCounts);
  const totalDistributions = post.distribution_count || 0;
  const postedCount = post.posted_count || 0;
  const scheduledCount = post.scheduled_count || 0;

  // Check if post has media images for cover
  const hasImageMedia = post.media?.some(
    (m) => m.file_type === "image" || m.mime_type?.startsWith("image/")
  );

  const handleFavoriteClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onToggleFavorite?.(post.id, !post.is_favorite);
    },
    [post.id, post.is_favorite, onToggleFavorite]
  );

  return (
    <div
      className={cn(
        "bg-bg-0 rounded-card border border-border-soft",
        "hover:border-border hover:shadow-sm transition-all cursor-pointer",
        "p-3 relative"
      )}
      onClick={onClick}
    >
      {/* Favorite Star - Top Right */}
      <button
        onClick={handleFavoriteClick}
        className={cn(
          "absolute top-2 right-2 z-10 p-1 rounded-full transition-all",
          "hover:bg-bg-1",
          post.is_favorite ? "text-amber-500" : "text-text-muted hover:text-amber-400"
        )}
        title={post.is_favorite ? "Remove from favorites" : "Add to favorites"}
      >
        <Star
          className={cn("w-4 h-4", post.is_favorite && "fill-current")}
        />
      </button>

      {/* Cover Image (if has image media) */}
      {hasImageMedia && <CoverImage post={post} />}

      {/* Title */}
      <h4 className="font-medium text-body-sm line-clamp-2 mb-2 pr-6">
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

        {/* All Scheduled dates */}
        <ScheduledDatesDisplay distributions={post.distributions} />
      </div>

      {/* Distributions */}
      {totalDistributions > 0 && (
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-border-soft">
          {/* Platform icons with count badges */}
          <div className="flex items-center gap-1.5">
            {platforms.slice(0, 4).map((platform, index) => (
              <PlatformIconWithBadge
                key={index}
                platformName={platform.name}
                count={platform.count}
              />
            ))}
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
