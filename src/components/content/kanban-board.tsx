"use client";

import { useState, useCallback, useMemo, lazy, Suspense } from "react";
import Link from "next/link";
import { Plus, Loader2, BookOpen, CheckSquare, X, Trash2, Star } from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { KanbanColumn } from "./kanban-column";
import { PostCard } from "./post-card";

// Lazy load heavy modal component
const PostDetailModal = lazy(() =>
  import("./post-detail-modal").then((mod) => ({ default: mod.PostDetailModal }))
);
import { KanbanFilters, defaultFilters, type KanbanFilters as KanbanFiltersType } from "./kanban-filters";
import { usePostsWithDetails, useAccountsWithPlatform, useToggleFavorite, useAutoUpdateOverdueDistributions, useReorderPosts, useDeletePost } from "@/features/content/hooks";
import type { ContentPostWithDetails, ContentPostStatus, ContentGoal } from "@/lib/supabase/types";

// ============================================================================
// TYPES
// ============================================================================

interface KanbanBoardProps {
  planId: string;
  goals: ContentGoal[];
}

interface Column {
  id: ContentPostStatus;
  title: string;
  description: string;
  emptyMessage: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const COLUMNS: Column[] = [
  {
    id: "backlog",
    title: "Backlog",
    description: "Ideas and drafts",
    emptyMessage: "No content ideas yet",
  },
  {
    id: "tagged",
    title: "Tagged",
    description: "Ready to schedule",
    emptyMessage: "No posts ready for scheduling",
  },
  {
    id: "ongoing",
    title: "Ongoing",
    description: "Scheduled or in progress",
    emptyMessage: "No posts in progress",
  },
  {
    id: "complete",
    title: "Complete",
    description: "All distributions posted",
    emptyMessage: "No completed posts yet",
  },
];

// Maximum visible completed posts in kanban (rest go to Content Logbook)
const MAX_VISIBLE_COMPLETED = 10;

// Initial visible posts per column (for load more pattern)
const INITIAL_VISIBLE_PER_COLUMN = 20;
const LOAD_MORE_INCREMENT = 20;

// ============================================================================
// SORTABLE POST CARD WRAPPER
// ============================================================================

interface SortablePostCardProps {
  post: ContentPostWithDetails;
  position: number;
  isSelected?: boolean;
  isSelectionMode?: boolean;
  onClick: () => void;
  onToggleFavorite: (postId: string, isFavorite: boolean) => void;
  onToggleSelect?: (postId: string) => void;
}

function SortablePostCard({
  post,
  position,
  isSelected,
  isSelectionMode,
  onClick,
  onToggleFavorite,
  onToggleSelect,
}: SortablePostCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: post.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <PostCard
        post={post}
        position={position}
        isSelected={isSelected}
        isSelectionMode={isSelectionMode}
        onClick={onClick}
        onToggleFavorite={onToggleFavorite}
        onToggleSelect={onToggleSelect}
      />
    </div>
  );
}

// ============================================================================
// COMPONENT
// ============================================================================

export function KanbanBoard({ planId, goals }: KanbanBoardProps) {
  const { data: posts, isLoading } = usePostsWithDetails(planId);
  const { data: accounts = [] } = useAccountsWithPlatform(planId);
  const toggleFavorite = useToggleFavorite(planId);
  const reorderPosts = useReorderPosts(planId);
  const deletePost = useDeletePost(planId);

  // Auto-update overdue distributions to "posted" status on page load
  useAutoUpdateOverdueDistributions(planId, posts);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require 8px of movement before activating
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [initialStatus, setInitialStatus] = useState<ContentPostStatus>("backlog");

  // Filter state
  const [filters, setFilters] = useState<KanbanFiltersType>(defaultFilters);

  // Selection state
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Visible count per column (for load more pattern)
  const [visibleCounts, setVisibleCounts] = useState<Record<ContentPostStatus, number>>({
    backlog: INITIAL_VISIBLE_PER_COLUMN,
    tagged: INITIAL_VISIBLE_PER_COLUMN,
    ongoing: INITIAL_VISIBLE_PER_COLUMN,
    complete: MAX_VISIBLE_COMPLETED, // Complete uses its own limit
  });

  // Handle favorite toggle
  const handleToggleFavorite = useCallback((postId: string, isFavorite: boolean) => {
    toggleFavorite.mutate({ postId, isFavorite });
  }, [toggleFavorite]);

  // Handle selection toggle
  const handleToggleSelect = useCallback((postId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(postId)) {
        next.delete(postId);
      } else {
        next.add(postId);
      }
      return next;
    });
  }, []);

  // Exit selection mode
  const handleExitSelectionMode = useCallback(() => {
    setIsSelectionMode(false);
    setSelectedIds(new Set());
  }, []);

  // Bulk delete selected posts
  const handleBulkDelete = useCallback(async () => {
    if (selectedIds.size === 0) return;

    const confirmDelete = window.confirm(
      `Are you sure you want to delete ${selectedIds.size} post${selectedIds.size > 1 ? 's' : ''}? This action cannot be undone.`
    );

    if (!confirmDelete) return;

    for (const postId of selectedIds) {
      await deletePost.mutateAsync(postId);
    }

    setSelectedIds(new Set());
    setIsSelectionMode(false);
  }, [selectedIds, deletePost]);

  // Bulk toggle favorite
  const handleBulkToggleFavorite = useCallback(async (isFavorite: boolean) => {
    if (selectedIds.size === 0) return;

    for (const postId of selectedIds) {
      toggleFavorite.mutate({ postId, isFavorite });
    }

    setSelectedIds(new Set());
    setIsSelectionMode(false);
  }, [selectedIds, toggleFavorite]);

  // Handle load more for a column
  const handleLoadMore = useCallback((status: ContentPostStatus) => {
    setVisibleCounts((prev) => ({
      ...prev,
      [status]: prev[status] + LOAD_MORE_INCREMENT,
    }));
  }, []);

  // Check if any filters are active
  const hasActiveFilters = useMemo(() => {
    return (
      filters.search !== "" ||
      filters.goalIds.length > 0 ||
      filters.accountIds.length > 0 ||
      filters.hasDistributions !== null ||
      filters.isFavorite === true ||
      filters.hasMedia !== null ||
      filters.hasVideoLinks !== null ||
      filters.hasLinks !== null
    );
  }, [filters]);

  // Filter posts based on current filters
  const filteredPosts = useMemo(() => {
    if (!posts) return [];

    return posts.filter((post) => {
      // Search filter - matches title or description (case-insensitive)
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const titleMatch = post.title.toLowerCase().includes(searchLower);
        const descMatch = post.description?.toLowerCase().includes(searchLower);
        if (!titleMatch && !descMatch) return false;
      }

      // Favorites filter
      if (filters.isFavorite === true && !post.is_favorite) {
        return false;
      }

      // Goal filter
      if (filters.goalIds.length > 0) {
        const postGoalIds = post.goals?.map((g) => g.id) || [];
        const hasMatchingGoal = filters.goalIds.some((id) => postGoalIds.includes(id));
        if (!hasMatchingGoal) return false;
      }

      // Account filter (based on distributions)
      if (filters.accountIds.length > 0) {
        const postAccountIds = post.distributions?.map((d) => d.account_id) || [];
        const hasMatchingAccount = filters.accountIds.some((id) => postAccountIds.includes(id));
        if (!hasMatchingAccount) return false;
      }

      // Has distributions filter
      if (filters.hasDistributions !== null) {
        const distributionCount = post.distribution_count || 0;
        if (filters.hasDistributions && distributionCount === 0) return false;
        if (!filters.hasDistributions && distributionCount > 0) return false;
      }

      // Has media filter (non-video media files)
      if (filters.hasMedia !== null) {
        const nonVideoMediaCount = post.media?.filter(
          m => m.media_type !== "video_link" && !m.is_external
        ).length || 0;
        if (filters.hasMedia && nonVideoMediaCount === 0) return false;
        if (!filters.hasMedia && nonVideoMediaCount > 0) return false;
      }

      // Has video links filter
      if (filters.hasVideoLinks !== null) {
        const videoLinkCount = post.media?.filter(
          m => m.media_type === "video_link" || m.is_external
        ).length || 0;
        if (filters.hasVideoLinks && videoLinkCount === 0) return false;
        if (!filters.hasVideoLinks && videoLinkCount > 0) return false;
      }

      // Has links filter (reference links, not video links)
      if (filters.hasLinks !== null) {
        const linkCount = post.links?.length || 0;
        if (filters.hasLinks && linkCount === 0) return false;
        if (!filters.hasLinks && linkCount > 0) return false;
      }

      // Distribution status filter
      if (filters.distributionStatuses.length > 0) {
        const postDistStatuses = post.distributions?.map((d) => d.status) || [];
        const hasMatchingStatus = filters.distributionStatuses.some((status) =>
          postDistStatuses.includes(status)
        );
        if (!hasMatchingStatus) return false;
      }

      // Format filter
      if (filters.formats.length > 0) {
        const postFormats = post.distributions
          ?.map((d) => d.format)
          .filter(Boolean) || [];
        const hasMatchingFormat = filters.formats.some((format) =>
          postFormats.includes(format)
        );
        if (!hasMatchingFormat) return false;
      }

      return true;
    });
  }, [posts, filters]);

  // Organize filtered posts by status
  const { postsByStatus, totalCounts } = useMemo(() => {
    const grouped: Record<ContentPostStatus, ContentPostWithDetails[]> = {
      backlog: [],
      tagged: [],
      ongoing: [],
      complete: [],
    };

    filteredPosts.forEach((post) => {
      grouped[post.status].push(post);
    });

    // Sort each column by display_order
    Object.keys(grouped).forEach((status) => {
      grouped[status as ContentPostStatus].sort(
        (a, b) => a.display_order - b.display_order
      );
    });

    // Track total counts before slicing
    const totals: Record<ContentPostStatus, number> = {
      backlog: grouped.backlog.length,
      tagged: grouped.tagged.length,
      ongoing: grouped.ongoing.length,
      complete: grouped.complete.length,
    };

    // For complete column, sort by most recently updated
    grouped.complete = grouped.complete
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

    // Apply visible limits to each column
    grouped.backlog = grouped.backlog.slice(0, visibleCounts.backlog);
    grouped.tagged = grouped.tagged.slice(0, visibleCounts.tagged);
    grouped.ongoing = grouped.ongoing.slice(0, visibleCounts.ongoing);
    grouped.complete = grouped.complete.slice(0, MAX_VISIBLE_COMPLETED);

    return { postsByStatus: grouped, totalCounts: totals };
  }, [filteredPosts, visibleCounts]);

  // Select all visible posts
  const handleSelectAll = useCallback(() => {
    const allVisibleIds = new Set<string>();
    Object.values(postsByStatus).forEach((columnPosts) => {
      columnPosts.forEach((post) => allVisibleIds.add(post.id));
    });
    setSelectedIds(allVisibleIds);
  }, [postsByStatus]);

  // Handle creating a new post (only in backlog)
  const handleNewPost = useCallback(() => {
    setSelectedPostId(null);
    setInitialStatus("backlog");
    setDialogOpen(true);
  }, []);

  // Handle editing a post
  const handleEditPost = useCallback((post: ContentPostWithDetails) => {
    setSelectedPostId(post.id);
    setDialogOpen(true);
  }, []);

  // Calculate position info for the selected post
  const positionInfo = useMemo(() => {
    if (!selectedPostId) return undefined;

    // Find the post and its status
    const post = filteredPosts.find(p => p.id === selectedPostId);
    if (!post) return undefined;

    // Get all posts in the same status (not limited by visibleCounts)
    const postsInStatus = filteredPosts
      .filter(p => p.status === post.status)
      .sort((a, b) => a.display_order - b.display_order);

    const currentPosition = postsInStatus.findIndex(p => p.id === selectedPostId) + 1;
    const totalInStatus = postsInStatus.length;

    if (currentPosition === 0 || totalInStatus === 0) return undefined;

    return { currentPosition, totalInStatus };
  }, [selectedPostId, filteredPosts]);

  // Handle position change from modal
  const handlePositionChange = useCallback((newPosition: number) => {
    if (!selectedPostId || !positionInfo) return;

    const post = filteredPosts.find(p => p.id === selectedPostId);
    if (!post) return;

    // Get all posts in the same status, sorted by display_order
    const postsInStatus = filteredPosts
      .filter(p => p.status === post.status)
      .sort((a, b) => a.display_order - b.display_order);

    const currentIndex = postsInStatus.findIndex(p => p.id === selectedPostId);
    const newIndex = newPosition - 1; // Convert 1-based to 0-based

    if (currentIndex === newIndex || currentIndex === -1) return;

    // Reorder the array
    const reordered = [...postsInStatus];
    const [removed] = reordered.splice(currentIndex, 1);
    reordered.splice(newIndex, 0, removed);

    // Call the reorder API
    reorderPosts.mutate({
      postIds: reordered.map(p => p.id),
      status: post.status,
    });
  }, [selectedPostId, positionInfo, filteredPosts, reorderPosts]);

  // Handle drag end for reordering
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    // Find which column the items belong to
    const activePost = filteredPosts.find(p => p.id === active.id);
    const overPost = filteredPosts.find(p => p.id === over.id);

    if (!activePost || !overPost) return;

    // Only allow reordering within the same column
    if (activePost.status !== overPost.status) return;

    const status = activePost.status;
    const columnPosts = postsByStatus[status];
    const oldIndex = columnPosts.findIndex(p => p.id === active.id);
    const newIndex = columnPosts.findIndex(p => p.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    // Create new order
    const newOrder = [...columnPosts];
    const [removed] = newOrder.splice(oldIndex, 1);
    newOrder.splice(newIndex, 0, removed);

    // Update the order on the server
    reorderPosts.mutate({
      postIds: newOrder.map(p => p.id),
      status,
    });
  }, [filteredPosts, postsByStatus, reorderPosts]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-text-muted" />
      </div>
    );
  }

  return (
    <>
      {/* Selection Mode Bar */}
      {isSelectionMode && (
        <div className="flex items-center justify-between mb-4 p-3 bg-accent/10 border border-accent/20 rounded-lg">
          <div className="flex items-center gap-3">
            <span className="text-body-sm font-medium">
              {selectedIds.size} selected
            </span>
            <Button variant="ghost" size="sm" onClick={handleSelectAll}>
              Select All
            </Button>
          </div>
          <div className="flex items-center gap-2">
            {/* Bulk Actions - only show when items are selected */}
            {selectedIds.size > 0 && (
              <>
                {/* Favorite */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Star className="w-4 h-4 mr-1" />
                      Favorite
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleBulkToggleFavorite(true)}>
                      Add to Favorites
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleBulkToggleFavorite(false)}>
                      Remove from Favorites
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Delete */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBulkDelete}
                  className="text-status-danger hover:text-status-danger hover:bg-status-danger/10"
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Delete
                </Button>
              </>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={handleExitSelectionMode}
            >
              <X className="w-4 h-4 mr-1" />
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold">Content Pipeline</h2>
          <p className="text-small text-text-muted">
            Posts move automatically based on distribution status
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={isSelectionMode ? "secondary" : "outline"}
            onClick={() => {
              if (isSelectionMode) {
                // Exiting selection mode - clear selection
                setSelectedIds(new Set());
              }
              setIsSelectionMode(!isSelectionMode);
            }}
          >
            <CheckSquare className="w-4 h-4 mr-2" />
            Select
          </Button>
          <Link href={`/plans/${planId}/content/logbook`}>
            <Button variant="outline">
              <BookOpen className="w-4 h-4 mr-2" />
              Logbook
            </Button>
          </Link>
          <Button onClick={handleNewPost}>
            <Plus className="w-4 h-4 mr-2" />
            New Post
          </Button>
        </div>
      </div>

      <div className="mb-6">
        <KanbanFilters
          goals={goals}
          accounts={accounts}
          filters={filters}
          onFiltersChange={setFilters}
        />
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
          {COLUMNS.map((column) => {
            const columnPosts = postsByStatus[column.id];
            const totalCount = totalCounts[column.id];
            const isBacklog = column.id === "backlog";
            const isComplete = column.id === "complete";

            // Show total count in header for all columns
            const showViewAll = isComplete && totalCount > MAX_VISIBLE_COMPLETED;
            const showLoadMore = !isComplete && columnPosts.length < totalCount;

            return (
              <KanbanColumn
                key={column.id}
                id={column.id}
                title={column.title}
                description={column.description}
                count={totalCount}
                emptyMessage={
                  hasActiveFilters
                    ? "No posts match your filters"
                    : column.emptyMessage
                }
                onAddPost={isBacklog ? handleNewPost : undefined}
                showAddButton={isBacklog}
              >
                <SortableContext
                  items={columnPosts.map(p => p.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {columnPosts.map((post, index) => (
                    <SortablePostCard
                      key={post.id}
                      post={post}
                      position={index + 1}
                      isSelected={selectedIds.has(post.id)}
                      isSelectionMode={isSelectionMode}
                      onClick={() => handleEditPost(post)}
                      onToggleFavorite={handleToggleFavorite}
                      onToggleSelect={handleToggleSelect}
                    />
                  ))}
                </SortableContext>

                {/* Load More button for non-complete columns */}
                {showLoadMore && (
                  <div className="pt-2 pb-1 text-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleLoadMore(column.id)}
                      className="text-small text-text-muted hover:text-text"
                    >
                      Load more ({totalCount - columnPosts.length} remaining)
                    </Button>
                  </div>
                )}

                {/* View All footer for Complete column */}
                {showViewAll && (
                  <div className="pt-2 pb-1 text-center border-t border-border-soft mt-2">
                    <p className="text-small text-text-muted">
                      Showing {columnPosts.length} of {totalCount}
                      {" • "}
                      <Link
                        href={`/plans/${planId}/content/logbook`}
                        className="text-accent hover:underline"
                      >
                        View All
                      </Link>
                    </p>
                  </div>
                )}
              </KanbanColumn>
            );
          })}
        </div>
      </DndContext>

      {/* Lazy load modal only when dialog is open */}
      {dialogOpen && (
        <Suspense fallback={null}>
          <PostDetailModal
            open={dialogOpen}
            onOpenChange={setDialogOpen}
            planId={planId}
            postId={selectedPostId}
            goals={goals}
            accounts={accounts}
            initialStatus={initialStatus}
            positionInfo={positionInfo}
            onPositionChange={handlePositionChange}
          />
        </Suspense>
      )}
    </>
  );
}
