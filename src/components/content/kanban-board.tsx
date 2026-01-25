"use client";

import { useState, useCallback, useMemo } from "react";
import { Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { KanbanColumn } from "./kanban-column";
import { PostCard } from "./post-card";
import { PostDetailModal } from "./post-detail-modal";
import { KanbanFilters, defaultFilters, type KanbanFilters as KanbanFiltersType } from "./kanban-filters";
import { usePostsWithDetails, useAccountsWithPlatform, useToggleFavorite, useAutoUpdateOverdueDistributions } from "@/features/content/hooks";
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

// ============================================================================
// COMPONENT
// ============================================================================

export function KanbanBoard({ planId, goals }: KanbanBoardProps) {
  const { data: posts, isLoading } = usePostsWithDetails(planId);
  const { data: accounts = [] } = useAccountsWithPlatform(planId);
  const toggleFavorite = useToggleFavorite(planId);

  // Auto-update overdue distributions to "posted" status on page load
  useAutoUpdateOverdueDistributions(planId, posts);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [initialStatus, setInitialStatus] = useState<ContentPostStatus>("backlog");

  // Filter state
  const [filters, setFilters] = useState<KanbanFiltersType>(defaultFilters);

  // Handle favorite toggle
  const handleToggleFavorite = useCallback((postId: string, isFavorite: boolean) => {
    toggleFavorite.mutate({ postId, isFavorite });
  }, [toggleFavorite]);

  // Check if any filters are active
  const hasActiveFilters = useMemo(() => {
    return (
      filters.search !== "" ||
      filters.goalIds.length > 0 ||
      filters.accountIds.length > 0 ||
      filters.hasDistributions !== null ||
      filters.isFavorite === true ||
      filters.hasMedia !== null ||
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

      // Has media filter
      if (filters.hasMedia !== null) {
        const mediaCount = post.media?.length || 0;
        if (filters.hasMedia && mediaCount === 0) return false;
        if (!filters.hasMedia && mediaCount > 0) return false;
      }

      // Has links filter
      if (filters.hasLinks !== null) {
        const linkCount = post.links?.length || 0;
        if (filters.hasLinks && linkCount === 0) return false;
        if (!filters.hasLinks && linkCount > 0) return false;
      }

      return true;
    });
  }, [posts, filters]);

  // Organize filtered posts by status
  const postsByStatus = useMemo(() => {
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

    return grouped;
  }, [filteredPosts]);

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-text-muted" />
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold">Content Pipeline</h2>
          <p className="text-small text-text-muted">
            Posts move automatically based on distribution status
          </p>
        </div>
        <Button onClick={handleNewPost}>
          <Plus className="w-4 h-4 mr-2" />
          New Post
        </Button>
      </div>

      <div className="mb-6">
        <KanbanFilters
          goals={goals}
          accounts={accounts}
          filters={filters}
          onFiltersChange={setFilters}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
        {COLUMNS.map((column) => {
          const columnPosts = postsByStatus[column.id];
          const isBacklog = column.id === "backlog";

          return (
            <KanbanColumn
              key={column.id}
              id={column.id}
              title={column.title}
              description={column.description}
              count={columnPosts.length}
              emptyMessage={
                hasActiveFilters
                  ? "No posts match your filters"
                  : column.emptyMessage
              }
              onAddPost={isBacklog ? handleNewPost : undefined}
              showAddButton={isBacklog}
            >
              {columnPosts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  onClick={() => handleEditPost(post)}
                  onToggleFavorite={handleToggleFavorite}
                />
              ))}
            </KanbanColumn>
          );
        })}
      </div>

      <PostDetailModal
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        planId={planId}
        postId={selectedPostId}
        goals={goals}
        accounts={accounts}
        initialStatus={initialStatus}
      />
    </>
  );
}
