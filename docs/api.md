# API Reference

Internal API documentation for the OKRs Tracker application.

## Overview

The application uses a feature module pattern where each domain has:
- **API functions** (`api.ts`) - Raw Supabase operations
- **React Query hooks** (`hooks.ts`) - Data fetching with caching

All API functions are in `src/features/*/api.ts` and exported through `src/features/index.ts`.

## Plans

### API Functions

```typescript
// Get all plans for current user
getPlans(): Promise<Plan[]>

// Get single plan by ID
getPlan(planId: string): Promise<Plan | null>

// Get user's role in a plan
getPlanRole(planId: string): Promise<OkrRole | null>

// Get plan members
getPlanMembers(planId: string): Promise<PlanMember[]>

// Create new plan (user becomes owner)
createPlan(plan: PlanInsert): Promise<Plan>

// Update plan
updatePlan(planId: string, updates: PlanUpdate): Promise<Plan>

// Delete plan (owner only)
deletePlan(planId: string): Promise<void>

// Invite user to plan
createPlanInvite(invite: PlanInviteInsert): Promise<PlanInvite>

// Remove member from plan
removePlanMember(planId: string, userId: string): Promise<void>
```

### Hooks

```typescript
// List user's plans
usePlans()

// Single plan details
usePlan(planId: string)

// User's role in plan
usePlanRole(planId: string)

// Plan members
usePlanMembers(planId: string)

// Mutations
useCreatePlan()
useUpdatePlan()
useDeletePlan()
useCreatePlanInvite()
useRemovePlanMember()
```

## Objectives

### API Functions

```typescript
// Get objectives for a plan
getObjectives(planId: string): Promise<Objective[]>

// Get objectives with nested KRs
getObjectivesWithKrs(planId: string): Promise<ObjectiveWithKrs[]>

// Create objective
createObjective(objective: ObjectiveInsert): Promise<Objective>

// Update objective
updateObjective(objectiveId: string, updates: ObjectiveUpdate): Promise<Objective>

// Delete objective
deleteObjective(objectiveId: string): Promise<void>

// Reorder objectives
reorderObjectives(planId: string, orderedIds: string[]): Promise<void>
```

### Hooks

```typescript
useObjectives(planId: string)
useObjectivesWithKrs(planId: string)
useObjectiveProgress(planId: string)

useCreateObjective()
useUpdateObjective()
useDeleteObjective()
useReorderObjectives()
```

## Annual KRs

### API Functions

```typescript
// Get all KRs for a plan
getAnnualKrs(planId: string): Promise<AnnualKr[]>

// Get KRs by objective
getAnnualKrsByObjective(objectiveId: string): Promise<AnnualKr[]>

// Get KR with full details (targets, check-ins)
getAnnualKrWithDetails(krId: string): Promise<AnnualKrWithDetails>

// Create KR
createAnnualKr(kr: AnnualKrInsert): Promise<AnnualKr>

// Update KR
updateAnnualKr(krId: string, updates: AnnualKrUpdate): Promise<AnnualKr>

// Delete KR
deleteAnnualKr(krId: string): Promise<void>
```

### Hooks

```typescript
useAnnualKrs(planId: string)
useAnnualKrsByObjective(objectiveId: string)
useAnnualKrWithDetails(krId: string)

useCreateAnnualKr()
useUpdateAnnualKr()
useDeleteAnnualKr()
```

## Quarter Targets

### API Functions

```typescript
// Get all targets for a plan
getQuarterTargets(planId: string): Promise<QuarterTarget[]>

// Get targets by KR
getQuarterTargetsByKr(annualKrId: string): Promise<QuarterTarget[]>

// Set targets for a KR (creates/updates Q1-Q4)
setQuarterTargets(annualKrId: string, targets: QuarterTargetInput[]): Promise<QuarterTarget[]>
```

### Hooks

```typescript
useQuarterTargets(planId: string)
useQuarterTargetsByKr(annualKrId: string)

useSetQuarterTargets()
```

## Tasks

### API Functions

```typescript
// Get tasks with optional filters
getTasks(planId: string, filters?: TaskFilters): Promise<Task[]>

// Get tasks grouped by timeline (overdue, today, this week, etc.)
getTasksGrouped(planId: string): Promise<GroupedTasks>

// Create task
createTask(task: TaskInsert): Promise<Task>

// Update task
updateTask(taskId: string, updates: TaskUpdate): Promise<Task>

// Delete task
deleteTask(taskId: string): Promise<void>

// Quick complete/uncomplete
completeTask(taskId: string): Promise<Task>
uncompleteTask(taskId: string): Promise<Task>
```

### Filter Types

```typescript
interface TaskFilters {
  status?: TaskStatus | TaskStatus[];
  priority?: TaskPriority | TaskPriority[];
  effort?: TaskEffort | TaskEffort[];
  objective_id?: string;
  annual_kr_id?: string;
  quarter_target_id?: string;
  tag_ids?: string[];
  due_date_from?: string;
  due_date_to?: string;
  assigned_to?: string;
  listView?: 'active' | 'overdue' | 'today' | 'this_week' | 'completed' | 'all';
}
```

### Hooks

```typescript
useTasks(planId: string, filters?: TaskFilters)
useTasksGrouped(planId: string)

useCreateTask(planId: string)
useUpdateTask()
useDeleteTask()
useCompleteTask()
```

## Check-ins

### API Functions

```typescript
// Get check-ins with optional filters
getCheckIns(planId: string, filters?: CheckInFilters): Promise<CheckIn[]>

// Get check-ins by KR
getCheckInsByKr(annualKrId: string): Promise<CheckIn[]>

// Create check-in
createCheckIn(checkIn: CheckInInsert): Promise<CheckIn>

// Delete check-in
deleteCheckIn(checkInId: string): Promise<void>
```

### Hooks

```typescript
useCheckIns(planId: string, filters?: CheckInFilters)
useCheckInsByKr(annualKrId: string)

useCreateCheckIn()
useDeleteCheckIn()
```

## Tags

### API Functions

```typescript
// Get all tags for a plan
getTags(planId: string): Promise<Tag[]>

// Get tags with usage count
getTagsWithUsage(planId: string): Promise<TagWithUsage[]>

// Create tag
createTag(tag: TagInsert): Promise<Tag>

// Update tag
updateTag(tagId: string, updates: TagUpdate): Promise<Tag>

// Delete tag
deleteTag(tagId: string): Promise<void>
```

### Hooks

```typescript
useTags(planId: string)
useTagsWithUsage(planId: string)

useCreateTag(planId: string)
useUpdateTag()
useDeleteTag()
```

## Timeline (Activity Events)

### API Functions

```typescript
// Get activity events with filters
getTimeline(planId: string, filters?: TimelineFilters): Promise<ActivityEvent[]>

// Get paginated timeline
getTimelinePaginated(
  planId: string,
  page: number,
  limit: number,
  filters?: TimelineFilters
): Promise<PaginatedResult<ActivityEvent>>
```

### Filter Types

```typescript
interface TimelineFilters {
  entity_type?: EventEntityType | EventEntityType[];
  event_type?: EventType | EventType[];
  user_id?: string;
  date_from?: string;
  date_to?: string;
}
```

### Hooks

```typescript
useTimeline(planId: string, filters?: TimelineFilters)
useTimelinePaginated(planId: string, page: number, limit?: number, filters?: TimelineFilters)
```

## Weekly Reviews

### API Functions

```typescript
// Get all reviews for a plan
getWeeklyReviews(planId: string): Promise<WeeklyReview[]>

// Get current week's review
getCurrentWeekReview(planId: string): Promise<WeeklyReview | null>

// Create review
createWeeklyReview(review: WeeklyReviewInsert): Promise<WeeklyReview>

// Update review
updateWeeklyReview(reviewId: string, updates: WeeklyReviewUpdate): Promise<WeeklyReview>

// Get review settings
getReviewSettings(planId: string): Promise<WeeklyReviewSettings | null>

// Update review settings
updateReviewSettings(planId: string, settings: WeeklyReviewSettingsUpdate): Promise<WeeklyReviewSettings>
```

### Hooks

```typescript
useWeeklyReviews(planId: string)
useCurrentWeekReview(planId: string)
useReviewSettings(planId: string)

useCreateWeeklyReview()
useUpdateWeeklyReview()
useUpdateReviewSettings()
```

## Dashboards

### API Functions

```typescript
// Get dashboard for a plan
getDashboard(planId: string): Promise<Dashboard | null>

// Get dashboard widgets
getDashboardWidgets(dashboardId: string): Promise<DashboardWidget[]>

// Create widget
createWidget(widget: DashboardWidgetInsert): Promise<DashboardWidget>

// Update widget
updateWidget(widgetId: string, updates: DashboardWidgetUpdate): Promise<DashboardWidget>

// Delete widget
deleteWidget(widgetId: string): Promise<void>

// Reorder widgets
reorderWidgets(dashboardId: string, widgets: WidgetPosition[]): Promise<void>
```

### Hooks

```typescript
useDashboard(planId: string)
useDashboardWidgets(dashboardId: string)

useCreateWidget()
useUpdateWidget()
useDeleteWidget()
useReorderWidgets()
```

## Import/Export

### API Functions

```typescript
// Export plan to JSON
exportPlanToJson(planId: string): Promise<PlanExport>

// Export plan to Markdown
exportPlanToMarkdown(data: PlanExport): string

// Parse and validate import file
parseImportFile(content: string): ImportPreview

// Import plan from JSON
importPlanFromJson(content: string, options: ImportOptions): Promise<ImportResult>
```

### Cloud Backups

```typescript
// List backups for a plan
getBackups(planId: string): Promise<Backup[]>

// Create backup
createBackup(planId: string): Promise<Backup>

// Delete backup
deleteBackup(backupPath: string): Promise<void>

// Restore from backup
restoreBackup(backupPath: string, options?: ImportOptions): Promise<ImportResult>
```

### Hooks

```typescript
useExportJson(planId: string)
useExportMarkdown(planId: string)
useParseImportFile()
useImportPlan()

useBackups(planId: string)
useCreateBackup(planId: string)
useDeleteBackup()
useRestoreBackup()
```

## Comments

### API Functions

```typescript
// Get comments for an entity
getComments(planId: string, entityType: string, entityId: string): Promise<Comment[]>

// Get comment counts for multiple entities
getCommentCounts(planId: string, entityType: string, entityIds: string[]): Promise<CommentCounts>

// Create comment
createComment(comment: CommentInsert): Promise<Comment>

// Update comment
updateComment(commentId: string, content: string): Promise<Comment>

// Delete comment
deleteComment(commentId: string): Promise<void>
```

### Hooks

```typescript
useComments(planId: string, entityType: string, entityId: string)
useCommentCounts(planId: string, entityType: string, entityIds: string[])

useCreateComment()
useUpdateComment()
useDeleteComment()
```

## Query Keys

All query keys are defined in `src/lib/query-client.tsx`:

```typescript
export const queryKeys = {
  plans: {
    all: ["plans"],
    list: () => [...queryKeys.plans.all, "list"],
    detail: (planId: string) => [...queryKeys.plans.all, "detail", planId],
    role: (planId: string) => [...queryKeys.plans.all, "role", planId],
    members: (planId: string) => [...queryKeys.plans.all, "members", planId],
    stats: (planId: string) => [...queryKeys.plans.all, "stats", planId],
  },
  objectives: {
    all: ["objectives"],
    list: (planId: string) => [...queryKeys.objectives.all, "list", planId],
    withKrs: (planId: string) => [...queryKeys.objectives.all, "withKrs", planId],
    progress: (planId: string) => [...queryKeys.objectives.all, "progress", planId],
  },
  // ... (see file for complete list)
};
```

## Error Handling

All API functions use `handleSupabaseError()`:

```typescript
// Throws ApiError on failure
const data = await handleSupabaseError(supabase.from("tasks").select());

// ApiError includes user-friendly messages
try {
  await createTask(task);
} catch (error) {
  if (error instanceof ApiError) {
    toast({ title: error.userMessage, variant: "destructive" });
  }
}
```

Common error codes:

| Code | Meaning | User Message |
|------|---------|--------------|
| `23505` | Unique violation | "This item already exists." |
| `42501` | Permission denied | "You don't have permission." |
| `PGRST116` | Not found | "Item not found." |
