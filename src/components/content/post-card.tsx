"use client";

import { useState, useEffect, useCallback, useRef, memo } from "react";
import { format, isPast } from "date-fns";
import {
  Calendar,
  Image as ImageIcon,
  Link2,
  Megaphone,
  Send,
  Star,
  Loader2,
  Check,
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
  position?: number;
  isSelected?: boolean;
  isSelectionMode?: boolean;
  onClick?: () => void;
  onToggleFavorite?: (postId: string, isFavorite: boolean) => void;
  onToggleSelect?: (postId: string) => void;
}

// ============================================================================
// FAVORITE STAR BUTTON COMPONENT
// ============================================================================

interface FavoriteStarProps {
  isFavorite: boolean;
  onToggle: () => void;
}

function FavoriteStar({ isFavorite, onToggle }: FavoriteStarProps) {
  const [isAnimating, setIsAnimating] = useState(false);
  const [optimisticFavorite, setOptimisticFavorite] = useState(isFavorite);
  const pendingRef = useRef(false);

  // Sync optimistic state with actual state when it changes from server
  useEffect(() => {
    if (!pendingRef.current) {
      setOptimisticFavorite(isFavorite);
    }
  }, [isFavorite]);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();

      // Optimistic update - immediately toggle UI
      const newValue = !optimisticFavorite;
      setOptimisticFavorite(newValue);
      pendingRef.current = true;

      // Trigger animation
      setIsAnimating(true);
      setTimeout(() => setIsAnimating(false), 300);

      // Call the actual toggle (will sync on success/error)
      onToggle();

      // Reset pending flag after a delay to allow server sync
      setTimeout(() => {
        pendingRef.current = false;
      }, 2000);
    },
    [optimisticFavorite, onToggle]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        e.stopPropagation();
        handleClick(e as unknown as React.MouseEvent);
      }
    },
    [handleClick]
  );

  return (
    <button
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role="button"
      aria-label={optimisticFavorite ? "Remove from favorites" : "Add to favorites"}
      aria-pressed={optimisticFavorite}
      tabIndex={0}
      className={cn(
        // Base styles - 44x44 min touch target with visible 24x24 button
        "relative flex items-center justify-center",
        "w-7 h-7 -mr-1", // Visible size with negative margin to align
        "rounded-full",
        "transition-all duration-200 ease-out",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1",
        // Hover states
        "hover:bg-bg-1 hover:scale-110",
        // Active (click) state
        "active:scale-125",
        // Color states
        optimisticFavorite
          ? "text-amber-500"
          : "text-text-muted/60 hover:text-amber-400"
      )}
      style={{
        // Ensure minimum touch target
        minWidth: "44px",
        minHeight: "44px",
        margin: "-8px -8px -8px 0", // Expand touch area without affecting layout
        padding: "8px",
      }}
    >
      <Star
        className={cn(
          "w-4 h-4 transition-all duration-200",
          optimisticFavorite && "fill-current",
          // Pop animation when toggling
          isAnimating && "scale-125"
        )}
        style={{
          // Smooth fill transition
          transition: "fill 150ms ease-out, transform 200ms ease-out",
        }}
      />
    </button>
  );
}

// ============================================================================
// COVER IMAGE COMPONENT
// ============================================================================

/**
 * Cover photo priority:
 * 1. First uploaded IMAGE in the media list
 * 2. First video_link with a thumbnail_url
 * 3. If no images or video thumbnails, no cover photo
 * PDFs and video links without thumbnails are NOT used as cover photos
 */
const CoverImage = memo(function CoverImage({ post }: { post: ContentPostWithDetails }) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  // Sort by display_order and find the best cover image candidate
  const sortedMedia = [...(post.media || [])].sort((a, b) => a.display_order - b.display_order);

  // First priority: uploaded images
  const firstImage = sortedMedia.find(
    (m) => {
      const isImage = m.media_type === "image" || m.file_type === "image" || m.mime_type?.startsWith("image/");
      const isExternal = m.is_external || m.media_type === "video_link";
      return isImage && !isExternal;
    }
  );

  // Second priority: video_link with thumbnail
  const videoWithThumbnail = !firstImage ? sortedMedia.find(
    (m) => (m.media_type === "video_link" || m.is_external) && m.thumbnail_url
  ) : null;

  // Determine what to display
  const coverCandidate = firstImage || videoWithThumbnail;
  const urlToFetch = firstImage
    ? firstImage.file_url
    : (videoWithThumbnail?.thumbnail_url || null);

  useEffect(() => {
    if (!urlToFetch) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    async function fetchUrl() {
      try {
        const url = await getMediaSignedUrl(urlToFetch!);
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
  }, [urlToFetch]);

  if (!coverCandidate || hasError) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="w-full h-[120px] bg-bg-1 flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-text-muted" />
      </div>
    );
  }

  if (!imageUrl) {
    return null;
  }

  return (
    <img
      src={imageUrl}
      alt={post.title}
      className="w-full h-[120px] object-cover"
      loading="lazy"
      onError={() => setHasError(true)}
    />
  );
}, (prevProps, nextProps) => {
  // Only re-render if the media array changes (compare by first image URL)
  const prevMedia = prevProps.post.media || [];
  const nextMedia = nextProps.post.media || [];

  // Compare the cover image candidate
  const prevFirst = prevMedia.find(m =>
    (m.media_type === "image" || m.file_type === "image" || m.mime_type?.startsWith("image/")) &&
    !(m.is_external || m.media_type === "video_link")
  );
  const nextFirst = nextMedia.find(m =>
    (m.media_type === "image" || m.file_type === "image" || m.mime_type?.startsWith("image/")) &&
    !(m.is_external || m.media_type === "video_link")
  );

  return prevFirst?.file_url === nextFirst?.file_url;
});

// ============================================================================
// PLATFORM ICON WITH COUNT BADGE
// ============================================================================

interface PlatformDistribution {
  accountName: string;
  status: string;
}

function PlatformIconWithBadge({
  platformName,
  count,
  distributions,
}: {
  platformName: string;
  count: number;
  distributions: PlatformDistribution[];
}) {
  // Check if all distributions are drafts (for visual distinction)
  const allDrafts = distributions.every((d) => d.status === "draft");

  // Build tooltip content
  const tooltipContent = distributions
    .map((d) => {
      const statusLabel =
        d.status === "draft"
          ? "(Draft)"
          : d.status === "scheduled"
            ? "(Scheduled)"
            : "(Posted)";
      return `${d.accountName} ${statusLabel}`;
    })
    .join("\n");

  return (
    <TooltipProvider>
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "relative",
              // Gray out if all distributions are drafts
              allDrafts && "opacity-40 grayscale"
            )}
          >
            <PlatformIcon platformName={platformName} size="sm" />
            {count > 1 && (
              <span
                className={cn(
                  "absolute -top-1 -right-1 min-w-[14px] h-[14px] text-white text-[9px] font-medium rounded-full flex items-center justify-center px-0.5",
                  // Use muted color for draft-only badges
                  allDrafts ? "bg-text-muted" : "bg-accent"
                )}
              >
                {count}
              </span>
            )}
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
// SCHEDULED DATES DISPLAY
// ============================================================================

function ScheduledDatesDisplay({
  distributions,
}: {
  distributions: ContentPostWithDetails["distributions"];
}) {
  // Filter for truly scheduled distributions (future dates only)
  // Overdue scheduled distributions are effectively "posted"
  const scheduledDates = distributions
    ?.filter((d) => {
      if (d.status !== "scheduled" || !d.scheduled_at) return false;
      const scheduledDate = new Date(d.scheduled_at);
      return !isPast(scheduledDate); // Only include future dates
    })
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

export const PostCard = memo(function PostCard({
  post,
  position,
  isSelected = false,
  isSelectionMode = false,
  onClick,
  onToggleFavorite,
  onToggleSelect,
}: PostCardProps) {
  // Count distributions by platform and collect account info
  const platformCounts = post.distributions?.reduce(
    (acc, dist) => {
      const platformId = dist.account?.platform?.id || "unknown";
      const platformName = dist.account?.platform?.name || "blog";
      const accountName = dist.account?.account_name || "Unknown Account";
      const status = dist.status || "draft";

      if (!acc[platformId]) {
        acc[platformId] = { name: platformName, count: 0, distributions: [] };
      }
      acc[platformId].count += 1;
      acc[platformId].distributions.push({ accountName, status });
      return acc;
    },
    {} as Record<string, { name: string; count: number; distributions: PlatformDistribution[] }>
  ) || {};

  const platforms = Object.values(platformCounts);
  const totalDistributions = post.distribution_count || 0;
  const postedCount = post.posted_count || 0;
  const scheduledCount = post.scheduled_count || 0;

  // Check if post has any valid cover image (uploaded image or video_link with thumbnail)
  const hasImageMedia = post.media?.some((m) => {
    const isImage = m.media_type === "image" || m.file_type === "image" || m.mime_type?.startsWith("image/");
    const isExternal = m.is_external || m.media_type === "video_link";
    // Uploaded images always qualify
    if (isImage && !isExternal) return true;
    // Video links with thumbnails qualify
    if ((m.media_type === "video_link" || isExternal) && m.thumbnail_url) return true;
    return false;
  });

  const handleToggleFavorite = useCallback(() => {
    onToggleFavorite?.(post.id, !post.is_favorite);
  }, [post.id, post.is_favorite, onToggleFavorite]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    if (isSelectionMode) {
      e.preventDefault();
      onToggleSelect?.(post.id);
    } else {
      onClick?.();
    }
  }, [isSelectionMode, onClick, onToggleSelect, post.id]);

  const handleCheckboxClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleSelect?.(post.id);
  }, [onToggleSelect, post.id]);

  return (
    <div
      className={cn(
        "bg-bg-0 rounded-card border overflow-hidden",
        "hover:shadow-sm transition-all cursor-pointer",
        isSelected
          ? "border-accent ring-1 ring-accent"
          : "border-border-soft hover:border-border"
      )}
      onClick={handleClick}
    >
      {/* Cover Image - full width, no padding */}
      {hasImageMedia && (
        <div className="w-full">
          <CoverImage post={post} />
        </div>
      )}

      {/* Card Content - has padding */}
      <div className="p-3">
        {/* Title Row with Selection/Position & Favorite Star */}
        <div className="flex items-start gap-2 mb-2">
          {/* Selection checkbox or position indicator */}
          {isSelectionMode ? (
            <button
              onClick={handleCheckboxClick}
              className={cn(
                "flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors",
                isSelected
                  ? "bg-accent border-accent text-white"
                  : "border-border-soft hover:border-accent"
              )}
            >
              {isSelected && <Check className="w-3 h-3" />}
            </button>
          ) : position !== undefined ? (
            <span className="flex-shrink-0 w-5 h-5 rounded bg-bg-1 text-text-muted text-[10px] font-medium flex items-center justify-center">
              {position}
            </span>
          ) : null}
          <h4 className="flex-1 font-medium text-body-sm line-clamp-2">
            {post.title || "Untitled Post"}
          </h4>
          <FavoriteStar
            isFavorite={post.is_favorite}
            onToggle={handleToggleFavorite}
          />
        </div>

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
          {/* Campaign indicator */}
          {post.has_campaign && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center">
                    <Megaphone className="w-3.5 h-3.5 text-accent" />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p className="text-xs">Part of a campaign</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

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
                  distributions={platform.distributions}
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
    </div>
  );
});
