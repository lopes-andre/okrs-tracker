"use client";

import { useState, useCallback, useMemo } from "react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
  UniqueIdentifier,
  defaultDropAnimationSideEffects,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { KanbanColumn } from "./kanban-column";
import { PostCard } from "./post-card";
import { PostDetailModal } from "./post-detail-modal";
import { QuickCapture } from "./quick-capture";
import { KanbanFilters, defaultFilters, type KanbanFilters as KanbanFiltersType } from "./kanban-filters";
import { usePostsWithDetails, useCreatePost, useUpdatePost, useReorderPosts, useAccountsWithPlatform } from "@/features/content/hooks";
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
}

// ============================================================================
// CONSTANTS
// ============================================================================

const COLUMNS: Column[] = [
  {
    id: "backlog",
    title: "Backlog",
    description: "Ideas and drafts",
  },
  {
    id: "tagged",
    title: "Tagged",
    description: "Ready to schedule",
  },
  {
    id: "ongoing",
    title: "Ongoing",
    description: "Scheduled or in progress",
  },
  {
    id: "complete",
    title: "Complete",
    description: "All distributions posted",
  },
];

// ============================================================================
// COMPONENT
// ============================================================================

export function KanbanBoard({ planId, goals }: KanbanBoardProps) {
  const { data: posts, isLoading } = usePostsWithDetails(planId);
  const { data: accounts = [] } = useAccountsWithPlatform(planId);
  const createPost = useCreatePost(planId);
  const updatePost = useUpdatePost(planId);
  const reorderPosts = useReorderPosts(planId);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [initialStatus, setInitialStatus] = useState<ContentPostStatus>("backlog");

  // Filter state
  const [filters, setFilters] = useState<KanbanFiltersType>(defaultFilters);

  // Drag state
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);

  // Filter posts based on current filters
  const filteredPosts = useMemo(() => {
    if (!posts) return [];

    return posts.filter((post) => {
      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const titleMatch = post.title.toLowerCase().includes(searchLower);
        const descMatch = post.description?.toLowerCase().includes(searchLower);
        if (!titleMatch && !descMatch) return false;
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

  // Get the active post being dragged
  const activePost = useMemo(() => {
    if (!activeId || !posts) return null;
    return posts.find((p) => p.id === activeId) || null;
  }, [activeId, posts]);

  // Sensors for drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor)
  );

  // Handle creating a new post
  const handleNewPost = useCallback((status: ContentPostStatus = "backlog") => {
    setSelectedPostId(null);
    setInitialStatus(status);
    setDialogOpen(true);
  }, []);

  // Handle editing a post
  const handleEditPost = useCallback((post: ContentPostWithDetails) => {
    setSelectedPostId(post.id);
    setDialogOpen(true);
  }, []);

  // Handle quick capture (create post with just title)
  const handleQuickCapture = useCallback(
    async (title: string) => {
      await createPost.mutateAsync({
        post: {
          title,
          description: null,
          status: "backlog",
        },
      });
    },
    [createPost]
  );

  // Handle drag start
  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id);
  }, []);

  // Handle drag over (moving between columns)
  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const { active, over } = event;
      if (!over || !posts) return;

      const activePost = posts.find((p) => p.id === active.id);
      if (!activePost) return;

      // Check if dropping on a column
      const overId = String(over.id);
      const isColumn = COLUMNS.some((col) => col.id === overId);

      if (isColumn) {
        const newStatus = overId as ContentPostStatus;
        if (activePost.status !== newStatus) {
          // Optimistic update - move to new column
          updatePost.mutate({
            postId: activePost.id,
            updates: { status: newStatus },
          });
        }
      } else {
        // Check if we're dropping on another post in a different column
        const overPost = posts.find((p) => p.id === over.id);
        if (overPost && activePost.status !== overPost.status) {
          updatePost.mutate({
            postId: activePost.id,
            updates: { status: overPost.status },
          });
        }
      }
    },
    [posts, updatePost]
  );

  // Handle drag end (reordering within column)
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveId(null);

      if (!over || active.id === over.id || !posts) return;

      const activePost = posts.find((p) => p.id === active.id);
      const overPost = posts.find((p) => p.id === over.id);

      if (!activePost) return;

      // If dropping on a column, already handled in handleDragOver
      const isColumn = COLUMNS.some((col) => col.id === over.id);
      if (isColumn) return;

      // If dropping on another post in the same column, reorder
      if (overPost && activePost.status === overPost.status) {
        const columnPosts = postsByStatus[activePost.status];
        const oldIndex = columnPosts.findIndex((p) => p.id === active.id);
        const newIndex = columnPosts.findIndex((p) => p.id === over.id);

        if (oldIndex !== -1 && newIndex !== -1) {
          const reorderedPosts = arrayMove(columnPosts, oldIndex, newIndex);
          const postIds = reorderedPosts.map((p) => p.id);
          reorderPosts.mutate({ postIds, status: activePost.status });
        }
      }
    },
    [posts, postsByStatus, reorderPosts]
  );

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
            Drag posts through stages from idea to published
          </p>
        </div>
        <Button onClick={() => handleNewPost()}>
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

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {COLUMNS.map((column) => (
            <SortableContext
              key={column.id}
              items={postsByStatus[column.id].map((p) => p.id)}
              strategy={verticalListSortingStrategy}
            >
              <KanbanColumn
                id={column.id}
                title={column.title}
                description={column.description}
                count={postsByStatus[column.id].length}
                onAddPost={() => handleNewPost(column.id)}
                headerContent={
                  column.id === "backlog" ? (
                    <QuickCapture onCapture={handleQuickCapture} />
                  ) : undefined
                }
              >
                {postsByStatus[column.id].map((post) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    onClick={() => handleEditPost(post)}
                  />
                ))}
              </KanbanColumn>
            </SortableContext>
          ))}
        </div>

        <DragOverlay
          dropAnimation={{
            sideEffects: defaultDropAnimationSideEffects({
              styles: {
                active: {
                  opacity: "0.5",
                },
              },
            }),
          }}
        >
          {activePost ? (
            <PostCard post={activePost} isDragOverlay />
          ) : null}
        </DragOverlay>
      </DndContext>

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
