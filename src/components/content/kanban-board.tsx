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
import { PostDialog } from "./post-dialog";
import { QuickCapture } from "./quick-capture";
import { usePostsWithDetails, useCreatePost, useUpdatePost, useReorderPosts } from "@/features/content/hooks";
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
  const createPost = useCreatePost(planId);
  const updatePost = useUpdatePost(planId);
  const reorderPosts = useReorderPosts(planId);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState<ContentPostWithDetails | null>(null);
  const [initialStatus, setInitialStatus] = useState<ContentPostStatus>("backlog");

  // Drag state
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);

  // Organize posts by status
  const postsByStatus = useMemo(() => {
    const grouped: Record<ContentPostStatus, ContentPostWithDetails[]> = {
      backlog: [],
      tagged: [],
      ongoing: [],
      complete: [],
    };

    if (posts) {
      posts.forEach((post) => {
        grouped[post.status].push(post);
      });

      // Sort each column by display_order
      Object.keys(grouped).forEach((status) => {
        grouped[status as ContentPostStatus].sort(
          (a, b) => a.display_order - b.display_order
        );
      });
    }

    return grouped;
  }, [posts]);

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
    setSelectedPost(null);
    setInitialStatus(status);
    setDialogOpen(true);
  }, []);

  // Handle editing a post
  const handleEditPost = useCallback((post: ContentPostWithDetails) => {
    setSelectedPost(post);
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
      <div className="flex items-center justify-between mb-6">
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

      <PostDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        planId={planId}
        post={selectedPost}
        goals={goals}
        initialStatus={initialStatus}
      />
    </>
  );
}
