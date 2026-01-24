# Content Planner Integration Map

> Created: 2026-01-24
> Phase: 1 - Foundation & Data Model

This document maps all integration points between the Content Planner feature and existing systems.

## Table of Contents

- [Overview](#overview)
- [Tasks System](#tasks-system)
- [Check-ins System](#check-ins-system)
- [Activity Timeline](#activity-timeline)
- [Comments System](#comments-system)
- [Notifications System](#notifications-system)
- [Objectives & Key Results](#objectives--key-results)
- [Tags System](#tags-system)
- [Patterns to Follow](#patterns-to-follow)
- [File Reference Map](#file-reference-map)

---

## Overview

The Content Planner will integrate with the following existing systems:

| System | Integration Type | Purpose |
|--------|------------------|---------|
| Tasks | Create linked tasks | Auto-create tasks for content production |
| Check-ins | Metrics tracking | Record distribution performance metrics |
| Activity Timeline | Event logging | Track content lifecycle events |
| Comments | Collaboration | Allow discussion on content posts |
| Notifications | Alerts | Notify team of assignments, mentions |
| OKRs | Goal linking | Link accounts to Key Results |
| Tags | Organization | Reuse tag system for content categorization |

---

## Tasks System

### Database Schema

**Table**: `tasks` (Migration 004)

**Key Columns:**
- `id` (UUID, PK)
- `plan_id` (FK to plans)
- `objective_id`, `annual_kr_id`, `quarter_target_id` (parent linkage)
- `title`, `description`
- `status` (enum: 'pending', 'in_progress', 'completed', 'cancelled')
- `priority` (enum: 'low', 'medium', 'high')
- `effort` (enum: 'light', 'moderate', 'heavy')
- `due_date`, `due_time`, `completed_at`
- `assigned_to` (FK to profiles)
- `sort_order`

**Related Tables:**
- `task_assignees` - Multi-user assignment
- `task_tags` - Many-to-many with tags

### Files

| File | Purpose |
|------|---------|
| `src/features/tasks/api.ts` | CRUD operations |
| `src/features/tasks/hooks.ts` | React Query hooks |

### Key Functions to Reuse

```typescript
// Creating a task linked to a KR
createTask({
  plan_id,
  annual_kr_id,  // Link to content account's default KR
  title,
  description,
  priority,
  effort,
  due_date,
  assigned_to
})

// Update task status
updateTaskStatus(taskId, status)

// Complete task
completeTask(taskId)
```

### Integration Points

1. **Auto-create tasks**: When a distribution is scheduled, create a linked task
2. **Link to KR**: Use `content_accounts.linked_kr_id` to link tasks to KRs
3. **Task completion**: Mark task complete when distribution is posted

---

## Check-ins System

### Database Schema

**Table**: `check_ins` (Migration 005)

**Key Columns:**
- `id` (UUID, PK)
- `annual_kr_id` (FK, required)
- `quarter_target_id` (FK, optional)
- `value` (NUMERIC)
- `previous_value` (NUMERIC, auto-captured)
- `note`, `evidence_url`
- `recorded_at`, `recorded_by`

### Files

| File | Purpose |
|------|---------|
| `src/features/check-ins/api.ts` | CRUD operations |
| `src/features/check-ins/hooks.ts` | React Query hooks |

### Key Functions to Reuse

```typescript
// Quick check-in for metrics
quickCheckIn(annualKrId, value, note?, evidenceUrl?, quarterTargetId?)

// Get check-ins for a KR
getCheckInsByKr(annualKrId)
```

### Integration Points

1. **Metrics check-ins**: Content distribution metrics can trigger KR check-ins
2. **Evidence links**: Use `evidence_url` to link to the actual post
3. **Aggregate metrics**: Sum follower growth, engagement, etc.

---

## Activity Timeline

### Database Schema

**Table**: `activity_events` (Migration 007)

**Key Columns:**
- `id` (UUID, PK)
- `plan_id` (FK)
- `user_id` (FK, nullable)
- `entity_type` (enum: 'task', 'check_in', 'member', 'objective', 'annual_kr', 'quarter_target', 'plan', 'weekly_review', 'comment')
- `entity_id` (UUID)
- `event_type` (enum: 'created', 'updated', 'deleted', 'status_changed', 'completed', 'joined', 'left', 'role_changed', 'started')
- `old_data`, `new_data`, `metadata` (JSONB)

### Logging Function

```sql
-- Helper function to log events
log_activity_event(
  plan_id UUID,
  entity_type event_entity_type,
  entity_id UUID,
  event_type event_type,
  old_data JSONB,
  new_data JSONB,
  metadata JSONB DEFAULT NULL
)
```

### Files

| File | Purpose |
|------|---------|
| `src/features/timeline/api.ts` | Query operations |
| `src/features/timeline/hooks.ts` | React Query hooks |

### Integration Points

1. **New entity types needed**: Add to `event_entity_type` enum:
   - `content_post`
   - `content_distribution`
   - `content_campaign`

2. **Events to log**:
   - Post created/updated/deleted
   - Post status changed (backlog → tagged → ongoing → complete)
   - Distribution scheduled/posted
   - Metrics check-in recorded
   - Campaign started/paused/completed

3. **Trigger template**:
```sql
CREATE OR REPLACE FUNCTION content_posts_activity_events()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
AS $$ BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM log_activity_event(
      NEW.plan_id, 'content_post'::event_entity_type, NEW.id, 'created'::event_type,
      NULL, jsonb_build_object('title', NEW.title, 'status', NEW.status)
    );
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      PERFORM log_activity_event(
        NEW.plan_id, 'content_post'::event_entity_type, NEW.id, 'status_changed'::event_type,
        jsonb_build_object('status', OLD.status),
        jsonb_build_object('status', NEW.status)
      );
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM log_activity_event(
      OLD.plan_id, 'content_post'::event_entity_type, OLD.id, 'deleted'::event_type,
      jsonb_build_object('title', OLD.title), NULL
    );
  END IF;
  RETURN COALESCE(NEW, OLD);
END; $$;
```

---

## Comments System

### Database Schema

**Tables**: `comments`, `comment_mentions`, `comment_reads` (Migration 010)

**Comments Table:**
- `id` (UUID, PK)
- `plan_id`, `task_id` (FKs)
- `user_id` (author)
- `content` (TEXT)

**Comment Mentions**: Tracks @mentions for notifications

**Comment Reads**: Tracks last_read_at for unread indicators

### Files

| File | Purpose |
|------|---------|
| `src/features/comments/api.ts` | CRUD operations |
| `src/features/comments/hooks.ts` | React Query hooks |

### Key Functions to Reuse

```typescript
// Get comments with user info
getTaskComments(taskId)

// Create with mentions
createComment(data, mentionedUserIds)

// Unread tracking
markTaskCommentsAsRead(taskId, userId)
getTaskUnreadCount(taskId, userId)

// Batch counts (efficient)
getTasksCommentCounts(taskIds, userId)
```

### Integration Points

1. **Current limitation**: Comments are task-scoped (`task_id`)
2. **Options for content posts**:
   - Option A: Extend comments table with `content_post_id` (nullable)
   - Option B: Create linked task for each post, use task comments
   - **Recommendation**: Option A - extend table for flexibility

3. **Schema change needed**:
```sql
ALTER TABLE comments ADD COLUMN content_post_id UUID REFERENCES content_posts(id) ON DELETE CASCADE;
-- Adjust constraint: either task_id OR content_post_id must be set
```

---

## Notifications System

### Database Schema

**Table**: `notifications` (Migration 010)

**Key Columns:**
- `id` (UUID, PK)
- `user_id` (recipient)
- `type` (enum: 'mentioned', 'comment', 'assigned', 'unassigned', 'task_completed', 'task_updated')
- `plan_id`, `task_id`, `comment_id` (context FKs)
- `actor_id` (who triggered)
- `read` (boolean)

### Files

| File | Purpose |
|------|---------|
| `src/features/notifications/api.ts` | CRUD operations |
| `src/features/notifications/hooks.ts` | React Query hooks |

### Key Functions to Reuse

```typescript
// Create notifications
createNotification(data)
createNotifications(data[])  // Batch for multi-user

// Mark as read
markAsRead(notificationId)
markAllAsRead(userId)
```

### Integration Points

1. **New notification types needed**: Extend `notification_type` enum:
   - `content_scheduled` - Distribution scheduled
   - `content_posted` - Distribution went live
   - `content_assigned` - Assigned to content post

2. **Schema change needed**:
```sql
ALTER TABLE notifications ADD COLUMN content_post_id UUID REFERENCES content_posts(id) ON DELETE CASCADE;
ALTER TABLE notifications ADD COLUMN content_distribution_id UUID REFERENCES content_distributions(id) ON DELETE CASCADE;
```

3. **Trigger points**:
   - When distribution is scheduled
   - When distribution is posted
   - When user is assigned to content post

---

## Objectives & Key Results

### Database Schema

**Tables**: `objectives`, `annual_krs`, `quarter_targets` (Migration 004)

**Annual KRs Key Columns:**
- `id`, `objective_id`
- `name`, `description`
- `kr_type` (enum: 'metric', 'count', 'milestone', 'rate', 'average')
- `direction` (enum: 'increase', 'decrease', 'maintain')
- `start_value`, `target_value`, `current_value`
- `owner_id`

### Files

| File | Purpose |
|------|---------|
| `src/features/objectives/api.ts` | Objectives CRUD |
| `src/features/annual-krs/api.ts` | KRs CRUD |
| `src/features/quarter-targets/api.ts` | Quarter targets |

### Integration Points

1. **Account-KR linking**: `content_accounts.linked_kr_id` links to `annual_krs.id`
2. **Task auto-creation**: Tasks created from content link to the account's KR
3. **Metrics aggregation**: Content metrics can feed into KR progress

**Example flow:**
1. User creates Instagram account linked to "Grow followers by 10K" KR
2. User schedules a post for that account
3. Task is auto-created with `annual_kr_id` set
4. When post goes live, metrics check-in updates KR progress

---

## Tags System

### Database Schema

**Table**: `tags` (Migration 005)

**Key Columns:**
- `id`, `plan_id`
- `name` (unique per plan)
- `kind` (enum: 'platform', 'funnel_stage', 'initiative', 'category', 'custom')
- `color`

### Files

| File | Purpose |
|------|---------|
| `src/features/tags/api.ts` | CRUD operations |
| `src/features/tags/hooks.ts` | React Query hooks |

### Integration Points

1. **Content goals vs tags**: Content Planner has its own `content_goals` table
2. **Reason**: Goals are content-specific (Authority, Audience, Sales, etc.)
3. **Future consideration**: Could unify with tags using `kind = 'content_goal'`

---

## Patterns to Follow

### Feature Module Structure

```
src/features/content/
├── api.ts           # Supabase queries
├── hooks.ts         # React Query hooks
└── index.ts         # Re-exports
```

### API Pattern

```typescript
import { createUntypedClient as createClient } from "@/lib/supabase/untyped-client";
import { handleSupabaseError } from "@/lib/api-utils";
import type { ContentPost } from "@/lib/supabase/types";

export async function getContentPosts(planId: string): Promise<ContentPost[]> {
  const supabase = createClient();
  return handleSupabaseError(
    supabase
      .from("content_posts")
      .select("*")
      .eq("plan_id", planId)
      .order("display_order", { ascending: true }),
    "getContentPosts"
  );
}
```

### Hooks Pattern

```typescript
"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-client";
import { useToast } from "@/components/ui/use-toast";
import { formatErrorMessage, successMessages } from "@/lib/toast-utils";
import * as api from "./api";

export function useContentPosts(planId: string) {
  return useQuery({
    queryKey: queryKeys.content.posts.list(planId),
    queryFn: () => api.getContentPosts(planId),
    enabled: !!planId,
  });
}

export function useCreateContentPost(planId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (post: ContentPostInsert) => api.createContentPost(post),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.content.posts.all });
      toast(successMessages.contentPostCreated);
    },
    onError: (error) => {
      toast(formatErrorMessage(error));
    },
  });
}
```

### Query Keys Pattern

Add to `src/lib/query-client.tsx`:

```typescript
content: {
  all: ["content"] as const,
  platforms: {
    all: [...queryKeys.content.all, "platforms"] as const,
    list: () => [...queryKeys.content.platforms.all, "list"] as const,
  },
  accounts: {
    all: [...queryKeys.content.all, "accounts"] as const,
    list: (planId: string) => [...queryKeys.content.accounts.all, "list", planId] as const,
  },
  goals: {
    all: [...queryKeys.content.all, "goals"] as const,
    list: (planId: string) => [...queryKeys.content.goals.all, "list", planId] as const,
  },
  posts: {
    all: [...queryKeys.content.all, "posts"] as const,
    list: (planId: string) => [...queryKeys.content.posts.all, "list", planId] as const,
    detail: (postId: string) => [...queryKeys.content.posts.all, "detail", postId] as const,
  },
  distributions: {
    all: [...queryKeys.content.all, "distributions"] as const,
    byPost: (postId: string) => [...queryKeys.content.distributions.all, "byPost", postId] as const,
  },
  campaigns: {
    all: [...queryKeys.content.all, "campaigns"] as const,
    list: (planId: string) => [...queryKeys.content.campaigns.all, "list", planId] as const,
  },
},
```

### RLS Policy Pattern

```sql
-- View: Plan members
CREATE POLICY "Users can view content posts in their plans"
ON content_posts FOR SELECT
USING (plan_id IN (
  SELECT plan_id FROM plan_members WHERE user_id = auth.uid()
));

-- Modify: Editors and owners
CREATE POLICY "Editors can manage content posts"
ON content_posts FOR ALL
USING (plan_id IN (
  SELECT plan_id FROM plan_members
  WHERE user_id = auth.uid() AND role IN ('owner', 'editor')
));
```

---

## File Reference Map

### Database Migrations

| File | Content |
|------|---------|
| `supabase/migrations/001_extensions_and_types.sql` | Enums and extensions |
| `supabase/migrations/003_core_tables.sql` | Profiles, plans, plan_members |
| `supabase/migrations/004_okr_tables.sql` | Objectives, KRs, tasks |
| `supabase/migrations/005_tracking_tables.sql` | Check-ins, tags |
| `supabase/migrations/007_activity_events.sql` | Activity logging |
| `supabase/migrations/010_communication.sql` | Comments, notifications |
| `supabase/migrations/011_rls_policies.sql` | RLS policies |

### Feature Modules

| Directory | Purpose |
|-----------|---------|
| `src/features/tasks/` | Task management |
| `src/features/check-ins/` | Progress check-ins |
| `src/features/timeline/` | Activity events |
| `src/features/comments/` | Comments system |
| `src/features/notifications/` | Notifications |
| `src/features/objectives/` | Objectives |
| `src/features/annual-krs/` | Key Results |
| `src/features/tags/` | Tags |

### Core Libraries

| File | Purpose |
|------|---------|
| `src/lib/query-client.tsx` | Query key factory |
| `src/lib/api-utils.ts` | Error handling |
| `src/lib/toast-utils.ts` | Toast messages |
| `src/lib/supabase/types.ts` | Type definitions |

---

## Schema Changes Summary

To fully integrate with existing systems, the following changes are needed:

### New Enums (Migration)

```sql
-- Add to event_entity_type enum
ALTER TYPE event_entity_type ADD VALUE 'content_post';
ALTER TYPE event_entity_type ADD VALUE 'content_distribution';
ALTER TYPE event_entity_type ADD VALUE 'content_campaign';

-- Add to notification_type enum (optional)
ALTER TYPE notification_type ADD VALUE 'content_scheduled';
ALTER TYPE notification_type ADD VALUE 'content_posted';
ALTER TYPE notification_type ADD VALUE 'content_assigned';
```

### Table Extensions (Optional, Phase 2+)

```sql
-- Extend comments for content posts
ALTER TABLE comments ADD COLUMN content_post_id UUID REFERENCES content_posts(id) ON DELETE CASCADE;

-- Extend notifications for content
ALTER TABLE notifications ADD COLUMN content_post_id UUID REFERENCES content_posts(id) ON DELETE CASCADE;
ALTER TABLE notifications ADD COLUMN content_distribution_id UUID REFERENCES content_distributions(id) ON DELETE CASCADE;
```
