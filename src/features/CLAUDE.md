# Features Module - `src/features/`

Domain-specific data access layer using React Query.

## Module Structure

Each feature follows the same pattern:

```
src/features/tasks/
├── api.ts      # Supabase queries and mutations
├── hooks.ts    # React Query hooks
└── index.ts    # Re-exports (optional)
```

All features re-export through `src/features/index.ts`.

## Feature Modules

### `plans/`
Plan management (create, update, delete, membership)

**Key exports:**
- `usePlans()` - List user's plans
- `usePlan(planId)` - Single plan details
- `usePlanRole(planId)` - User's role in plan
- `usePlanMembers(planId)` - Plan members list
- `useCreatePlan()`, `useUpdatePlan()`, `useDeletePlan()`
- `useCreatePlanInvite()`, `useRemovePlanMember()`

### `objectives/`
Objective CRUD operations

**Key exports:**
- `useObjectives(planId)` - List objectives
- `useObjectivesWithKrs(planId)` - With nested KRs
- `useObjectiveProgress(planId)` - Progress view data
- `useCreateObjective()`, `useUpdateObjective()`, `useDeleteObjective()`

### `annual-krs/`
Annual Key Results management

**Key exports:**
- `useAnnualKrs(planId)` - List KRs
- `useAnnualKrsByObjective(objectiveId)` - Filtered by objective
- `useAnnualKrWithDetails(krId)` - Full KR with targets
- `useCreateAnnualKr()`, `useUpdateAnnualKr()`, `useDeleteAnnualKr()`

### `quarter-targets/`
Quarterly target management

**Key exports:**
- `useQuarterTargets(planId)` - All targets
- `useQuarterTargetsByKr(annualKrId)` - By KR
- `useSetQuarterTargets()` - Bulk create/update

### `tasks/`
Task management with filtering and pagination

**Key exports:**
- `useTasks(planId, filters)` - List with filters
- `useTasksGrouped(planId)` - Grouped by timeline
- `useCreateTask(planId)`, `useUpdateTask()`, `useDeleteTask()`
- `useCompleteTask()` - Quick completion

**Filter Types:**
```typescript
interface TaskFilters {
  status?: TaskStatus | TaskStatus[];
  priority?: TaskPriority | TaskPriority[];
  objective_id?: string;
  annual_kr_id?: string;
  due_date_from?: string;
  due_date_to?: string;
  listView?: 'active' | 'overdue' | 'this_week' | 'completed' | ...;
}
```

### `check-ins/`
Progress check-in tracking

**Key exports:**
- `useCheckIns(planId, filters)` - List check-ins
- `useCheckInsByKr(annualKrId)` - By KR
- `useCreateCheckIn()`, `useDeleteCheckIn()`

### `tags/`
Tag and KR group management

**Key exports:**
- `useTags(planId)` - List tags
- `useTagsWithUsage(planId)` - With task count
- `useCreateTag(planId)`, `useUpdateTag()`, `useDeleteTag()`
- `useKrGroups(planId)` - KR groupings
- `useCreateKrGroup()`, etc.

### `timeline/`
Activity event timeline

**Key exports:**
- `useTimeline(planId, filters)` - Activity events
- `useTimelinePaginated(planId, page, limit)` - Paginated

### `dashboards/`
Dashboard and widget management

### `weekly-reviews/`
Weekly review system

**Key exports:**
- `useWeeklyReviews(planId)` - List reviews
- `useCurrentWeekReview(planId)` - This week's review
- `useCreateWeeklyReview()`, `useUpdateWeeklyReview()`
- `useReviewSettings(planId)` - Review preferences

### `analytics/`
Analytics data queries

### `progress/`
Progress computation hooks (uses progress-engine)

### `import-export/`
Data portability: export, import, and cloud backups.

**Module Structure:**
```
src/features/import-export/
├── types.ts           # Export schema types (v1.0)
├── schema.ts          # Zod validation schemas
├── export-json.ts     # JSON export logic
├── export-markdown.ts # Markdown export logic
├── import-json.ts     # Import with validation
├── backup.ts          # Supabase Storage operations
├── hooks.ts           # React Query hooks
└── index.ts           # Re-exports
```

**Key exports:**
- `useExportJson(planId)` - Export plan to JSON
- `useExportMarkdown(planId)` - Export plan to Markdown
- `useParseImportFile()` - Parse and validate import file
- `useImportPlan()` - Import plan from JSON
- `useBackups(planId)` - List cloud backups
- `useCreateBackup(planId)` - Create cloud backup
- `useDeleteBackup(planId)` - Delete cloud backup
- `useRestoreBackup()` - Restore from backup

**Export Schema v1.0:**
Each entity has `_exportId` (temp ID) for cross-references without real DB IDs.

**Import Options:**
```typescript
interface ImportOptions {
  createNewPlan: boolean;      // Always true (creates new plan)
  skipCheckIns?: boolean;      // Skip check-in history
  skipWeeklyReviews?: boolean; // Skip review history
  resetProgress?: boolean;     // Reset KR values to start
}
```

### `content/`
Content Planner for managing social media content with Kanban workflow.

**Module Structure:**
```
src/features/content/
├── api.ts            # Supabase queries for content
├── hooks.ts          # React Query hooks
├── content.test.ts   # Unit tests
└── index.ts          # Re-exports
```

**Key exports:**
- `usePlatforms()` - Available social platforms (read-only)
- `useAccounts(planId)` - Social media accounts
- `useGoals(planId)` - Content goals (Authority, Audience Growth, etc.)
- `usePosts(planId, filters?)` - Content posts with Kanban status
- `usePostsWithDetails(planId)` - Posts with goals and distribution counts
- `usePost(postId)` - Single post with full details
- `useDistributionsByPost(postId)` - Distribution schedule for a post
- `useCalendarData(planId, startDate, endDate)` - Calendar view
- `useCampaigns(planId, filters?)` - Ad campaigns
- `useCreatePost()`, `useUpdatePost()`, `useDeletePost()`
- `useCreateDistribution()`, `useMarkDistributionPosted()`
- `useUploadMedia()`, `useDeleteMedia()` - Storage operations

**Post Status Workflow:**
- `backlog` - No distributions assigned
- `tagged` - Has distributions in draft status
- `ongoing` - Has scheduled or posted distributions (not all complete)
- `complete` - All distributions posted

**Distribution Status:**
- `draft` - Created, not scheduled
- `scheduled` - Scheduled for future posting
- `posted` - Published to platform

## API Pattern

```typescript
// api.ts
import { createUntypedClient as createClient } from "@/lib/supabase/untyped-client";
import { handleSupabaseError, handleSupabaseQuery } from "@/lib/api-utils";
import type { Task, TaskInsert, TaskUpdate } from "@/lib/supabase/types";

export async function getTasks(planId: string): Promise<Task[]> {
  const supabase = createClient();
  return handleSupabaseError(
    supabase
      .from("tasks")
      .select("*")
      .eq("plan_id", planId)
      .order("due_date", { ascending: true })
  );
}

export async function createTask(task: TaskInsert): Promise<Task> {
  const supabase = createClient();
  return handleSupabaseError(
    supabase.from("tasks").insert(task).select().single()
  );
}
```

## Hook Pattern

```typescript
// hooks.ts
"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-client";
import { useToast } from "@/components/ui/use-toast";
import { formatErrorMessage, successMessages } from "@/lib/toast-utils";
import * as api from "./api";
import type { TaskInsert } from "@/lib/supabase/types";

// Queries
export function useTasks(planId: string) {
  return useQuery({
    queryKey: queryKeys.tasks.list(planId),
    queryFn: () => api.getTasks(planId),
    enabled: !!planId,
  });
}

// Mutations
export function useCreateTask(planId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (task: Omit<TaskInsert, "plan_id">) =>
      api.createTask({ ...task, plan_id: planId }),
    onSuccess: () => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.plans.stats(planId) });
      toast(successMessages.taskCreated);
    },
    onError: (error) => {
      toast(formatErrorMessage(error));
    },
  });
}
```

## Adding a New Feature

1. Create directory: `src/features/myFeature/`

2. Create `api.ts`:
```typescript
import { createUntypedClient as createClient } from "@/lib/supabase/untyped-client";
import { handleSupabaseError } from "@/lib/api-utils";

export async function getMyFeatures(planId: string) {
  const supabase = createClient();
  return handleSupabaseError(
    supabase.from("my_table").select("*").eq("plan_id", planId)
  );
}
```

3. Create `hooks.ts`:
```typescript
"use client";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-client";
import * as api from "./api";

export function useMyFeatures(planId: string) {
  return useQuery({
    queryKey: queryKeys.myFeature.list(planId),
    queryFn: () => api.getMyFeatures(planId),
    enabled: !!planId,
  });
}
```

4. Add query keys to `src/lib/query-client.tsx`

5. Export from `src/features/index.ts`:
```typescript
export * from "./myFeature/api";
export * from "./myFeature/hooks";
```

## Query Invalidation Strategy

When mutating, invalidate related queries:

```typescript
// Task completed → invalidate tasks, plan stats, possibly KR progress
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
  queryClient.invalidateQueries({ queryKey: queryKeys.plans.stats(planId) });
},

// Tag updated → invalidate tags AND tasks (tasks display tags)
onSuccess: (data) => {
  queryClient.invalidateQueries({ queryKey: queryKeys.tags.list(data.plan_id) });
  queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
},
```
