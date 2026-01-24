# Architecture

System design and architectural decisions for the OKRs Tracker application.

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                             │
│  ┌─────────────┐  ┌──────────────────┐  ┌──────────────────┐   │
│  │   Browser   │  │ React Server     │  │ Client           │   │
│  │             │  │ Components (RSC) │  │ Components       │   │
│  └─────────────┘  └──────────────────┘  └──────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────────┐
│                      NEXT.JS APP ROUTER                          │
│  ┌─────────────┐  ┌──────────────────┐  ┌──────────────────┐   │
│  │ Middleware  │  │ Page Components  │  │ Server Actions   │   │
│  │ (Auth)      │  │                  │  │                  │   │
│  └─────────────┘  └──────────────────┘  └──────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────────┐
│                         DATA LAYER                               │
│  ┌─────────────┐  ┌──────────────────┐  ┌──────────────────┐   │
│  │ React Query │  │ Feature Modules  │  │ Progress Engine  │   │
│  │ (Cache)     │  │ (API + Hooks)    │  │ (Calculations)   │   │
│  └─────────────┘  └──────────────────┘  └──────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────────┐
│                      SUPABASE BACKEND                            │
│  ┌─────────────┐  ┌──────────────────┐  ┌──────────────────┐   │
│  │ Auth        │  │ PostgreSQL + RLS │  │ Storage          │   │
│  │ (OAuth)     │  │                  │  │ (Backups)        │   │
│  └─────────────┘  └──────────────────┘  └──────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow

### Read Flow (Queries)

```
User Action
    │
    ▼
React Query Hook
    │
    ├── Cache Hit? ──▶ Return cached data
    │
    └── Cache Miss
           │
           ▼
    Feature API Function
           │
           ▼
    Supabase Client
           │
           ▼
    PostgreSQL (with RLS)
           │
           ▼
    Return data ──▶ Update cache ──▶ Render UI
```

### Write Flow (Mutations)

```
User Action
    │
    ▼
React Query Mutation
    │
    ▼
Feature API Function
    │
    ▼
Supabase Client
    │
    ▼
PostgreSQL
    │
    ├── DB Triggers ──▶ activity_events (audit log)
    │
    ▼
Success ──▶ Invalidate queries ──▶ Refetch updated data
```

## Core Data Model

### Entity Relationships

```
PLAN
 ├── has many OBJECTIVES
 │    └── has many ANNUAL_KRS
 │         └── has many QUARTER_TARGETS
 │         └── has many CHECK_INS
 │
 ├── has many TASKS
 │    └── linked to OBJECTIVE or KR or QUARTER_TARGET (optional)
 │    └── has many TASK_TAGS
 │
 ├── has many TAGS
 │
 ├── has many ACTIVITY_EVENTS (audit log)
 │
 ├── has many WEEKLY_REVIEWS
 │
 ├── has one DASHBOARD
 │    └── has many DASHBOARD_WIDGETS
 │
 └── has many PLAN_MEMBERS
      └── references PROFILES (users)
```

### Key Types

| Type | Values | Description |
|------|--------|-------------|
| `okr_role` | owner, editor, viewer | Plan membership role |
| `kr_type` | metric, count, milestone, rate, average | KR measurement type |
| `kr_direction` | increase, decrease, maintain | Progress direction |
| `task_status` | pending, in_progress, completed, cancelled | Task state |
| `task_priority` | low, medium, high | Task importance |
| `event_type` | created, updated, deleted, completed, ... | Activity event types |

## Key Abstractions

### 1. Feature Module Pattern

Each domain follows a consistent structure:

```
src/features/tasks/
├── api.ts      # Supabase queries and mutations
├── hooks.ts    # React Query hooks
└── index.ts    # Re-exports
```

**API Layer** - Raw Supabase operations:

```typescript
// api.ts
export async function getTasks(planId: string): Promise<Task[]> {
  const supabase = createClient();
  return handleSupabaseError(
    supabase.from("tasks").select("*").eq("plan_id", planId)
  );
}
```

**Hooks Layer** - React Query integration:

```typescript
// hooks.ts
export function useTasks(planId: string) {
  return useQuery({
    queryKey: queryKeys.tasks.list(planId),
    queryFn: () => api.getTasks(planId),
    enabled: !!planId,
  });
}
```

### 2. Progress Engine

Pure, testable functions for OKR progress calculations:

```typescript
// src/lib/progress-engine.ts

type PaceStatus = "ahead" | "on_track" | "at_risk" | "off_track";

interface ProgressResult {
  currentValue: number;
  progress: number;        // 0-1
  expectedProgress: number; // Time-based expected progress
  paceRatio: number;       // actual/expected
  paceStatus: PaceStatus;
  forecastValue: number | null;
  daysRemaining: number;
}

// Main calculation function
computeKrProgress(kr, checkIns, tasks, planYear, asOfDate) → ProgressResult

// Rollups
computeObjectiveProgress(objective, krProgresses) → ObjectiveProgress
computePlanProgress(planId, objectiveProgresses) → PlanProgress
```

### 3. Query Key Factory

Centralized cache key management:

```typescript
// src/lib/query-client.tsx
export const queryKeys = {
  tasks: {
    all: ["tasks"] as const,
    list: (planId: string) => [...queryKeys.tasks.all, "list", planId] as const,
    detail: (taskId: string) => [...queryKeys.tasks.all, "detail", taskId] as const,
  },
  // ... other domains
};
```

### 4. UI Component System

Based on Radix UI with class-variance-authority (CVA):

```typescript
// src/components/ui/button.tsx
const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-button...",
  {
    variants: {
      variant: {
        default: "bg-accent text-white hover:bg-accent-hover",
        secondary: "bg-bg-0 text-text-strong border border-border",
        ghost: "text-text-strong hover:bg-accent-muted",
        danger: "bg-status-danger text-white",
      },
      size: {
        default: "h-10 px-5 py-2",
        sm: "h-8 px-4 text-small",
        lg: "h-12 px-8 text-body",
      },
    },
  }
);
```

## Authentication Flow

```
┌────────┐     ┌────────────┐     ┌────────────┐     ┌──────────┐
│ User   │────▶│ /login     │────▶│ Supabase   │────▶│ Callback │
│        │     │ page       │     │ OAuth      │     │ /auth/   │
└────────┘     └────────────┘     └────────────┘     └──────────┘
                                                           │
                                                           ▼
                                                    ┌──────────────┐
                                                    │ Create/Update│
                                                    │ Profile      │
                                                    └──────────────┘
                                                           │
                                                           ▼
                                                    ┌──────────────┐
                                                    │ Redirect to  │
                                                    │ /plans       │
                                                    └──────────────┘
```

### Middleware Protection

All routes under `/plans` are protected by middleware that:
1. Checks for valid Supabase session
2. Refreshes session if needed
3. Redirects to `/login` if unauthenticated

## Row Level Security

All database tables have RLS policies based on `plan_members`:

```sql
-- Users can only view data in plans they're members of
CREATE POLICY "Users can view tasks in their plans" ON tasks
  FOR SELECT USING (
    plan_id IN (
      SELECT plan_id FROM plan_members WHERE user_id = auth.uid()
    )
  );

-- Only editors and owners can modify data
CREATE POLICY "Editors can modify tasks" ON tasks
  FOR ALL USING (
    plan_id IN (
      SELECT plan_id FROM plan_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'editor')
    )
  );
```

## Activity Event System

Automatic audit trail via PostgreSQL triggers:

```sql
-- Applied to major tables (tasks, objectives, annual_krs, etc.)
CREATE TRIGGER tasks_activity
  AFTER INSERT OR UPDATE OR DELETE ON tasks
  FOR EACH ROW EXECUTE FUNCTION log_activity_event('task');
```

Events are stored in `activity_events` table and displayed in the Timeline view.

## Import/Export System

### Export

```
Plan Data ──▶ exportPlanToJson() ──▶ JSON File
                                      │
         ──▶ exportPlanToMarkdown() ──▶ Markdown File
```

### Import

```
JSON File ──▶ parseImportFile() ──▶ Validation ──▶ Preview
                                                     │
                                         User Approval
                                                     │
                                         importPlanFromJson()
                                                     │
                                         ┌───────────────┐
                                         │ Create Plan   │
                                         │ Create Tags   │
                                         │ Create KRs    │
                                         │ Map References│
                                         └───────────────┘
```

### Cloud Backups

- Storage bucket: `plan-backups`
- Path pattern: `{userId}/{planId}/{planName}_{timestamp}.json`
- RLS: Users can only access their own folder

## Performance Considerations

### Query Optimization

- Indexes on frequently filtered columns (plan_id, status, due_date)
- Composite indexes for common query patterns
- Partial indexes for active tasks

### Client-Side Caching

- React Query with 1-minute stale time
- 5-minute garbage collection time
- Background refetch on window focus (production)

### Database Views

Pre-computed views for complex aggregations:

| View | Purpose |
|------|---------|
| `v_objective_progress` | Objective progress with KR counts |
| `v_kr_progress` | KR progress calculations |
| `v_plan_stats` | Plan-level statistics |
| `v_weekly_review_summary` | Review status summaries |
| `v_plan_review_stats` | Review analytics and streaks |

## Design Decisions

### Why Supabase?

- Managed PostgreSQL with built-in auth
- Row Level Security for data protection
- Real-time subscriptions (future use)
- Storage for cloud backups
- Generous free tier for personal projects

### Why React Query?

- Automatic caching and background updates
- Optimistic updates capability
- Declarative data fetching
- Excellent devtools
- Handles loading/error states

### Why Feature Module Pattern?

- Clear separation of concerns
- Easy to test each layer independently
- Consistent structure across domains
- Facilitates code discovery

### Why Pure Progress Engine?

- Testable without mocking database
- Deterministic calculations
- Can be reused in different contexts
- Easy to reason about

## Future Considerations

### Potential Enhancements

- **Optimistic Updates**: For better perceived performance
- **Offline Support**: Service workers + IndexedDB
- **Real-time Collaboration**: Supabase Realtime subscriptions
- **Edge Functions**: For heavy computations

### Scaling Options

- Database read replicas for analytics
- CDN caching for static assets
- Background jobs for weekly review generation
- Horizontal scaling of Next.js instances
