# Private Tasks Implementation Plan

## Overview

Add an `is_private` flag to tasks. Private tasks are only visible to plan owners.

**Behavior:**
- All plan members can see all NON-private tasks (default, original behavior)
- Tasks can be marked "Private" by plan owners
- Private tasks are ONLY visible to plan owners
- Non-owners cannot see private tasks anywhere

---

## Phase 1: Discovery Summary

### 1.1 Data Model

**Plan Ownership:**
- Determined by `plan_members.role = 'owner'`
- Multiple owners possible (though rare)
- No `owner_id` on plans table

**Tasks Table Current Schema:**
```typescript
interface Task {
  id: string;
  plan_id: string;
  objective_id: string | null;
  annual_kr_id: string | null;
  quarter_target_id: string | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  effort: TaskEffort;
  due_date: string | null;
  due_time: string | null;
  completed_at: string | null;
  assigned_to: string | null;
  reminder_enabled: boolean;
  sort_order: number;
  is_recurring: boolean;
  recurring_master_id: string | null;
  created_at: string;
  updated_at: string;
}
```

### 1.2 All Task Touchpoints

| Location | Purpose | Update Needed |
|----------|---------|---------------|
| `src/features/tasks/api.ts` | All task queries | RLS handles filtering |
| `src/features/tasks/hooks.ts` | React Query hooks | No change (RLS) |
| `src/features/search/api.ts` | Plan & global search | RLS handles filtering |
| `src/features/timeline/api.ts` | Activity log | RLS handles filtering |
| `src/features/analytics/api.ts` | Task analytics | RLS handles filtering |
| `src/components/tasks/task-dialog.tsx` | Create/edit form | Add Private toggle |
| `src/components/tasks/task-row.tsx` | Task display | Add Private indicator |
| `src/components/dashboard/widgets/tasks-due.tsx` | Dashboard widget | RLS handles filtering |
| `src/app/plans/[planId]/tasks/page.tsx` | Tasks page | Pass isOwner to dialog |
| `src/app/plans/[planId]/tasks/logbook/page.tsx` | Logbook page | No change (RLS) |
| `src/lib/supabase/types.ts` | TypeScript types | Add is_private field |

### 1.3 Edge Cases

| Scenario | Behavior |
|----------|----------|
| Making task with assignees private | Remove non-owner assignees (warn user) |
| Assigning non-owner to private task | Prevent (validation) |
| Making private task public | Task becomes visible to all |
| Plan ownership transfer | New owner sees private tasks |
| Private task in activity log | Only visible to owners (RLS) |
| Private task comments | Only visible to owners (RLS) |
| Search results | Only visible to owners (RLS) |
| Dashboard counts | Filtered by RLS per user |

---

## Phase 2: Database Changes

### 2.1 Add is_private Column

```sql
-- Migration 030: Add is_private column to tasks
ALTER TABLE tasks ADD COLUMN is_private BOOLEAN NOT NULL DEFAULT false;

-- Index for filtering
CREATE INDEX idx_tasks_is_private ON tasks(plan_id, is_private) WHERE is_private = true;
```

### 2.2 Update RLS Policy

```sql
-- Drop existing SELECT policy
DROP POLICY IF EXISTS "Tasks viewable by members" ON tasks;

-- New policy: Non-private OR user is owner
CREATE POLICY "Tasks viewable with privacy"
  ON tasks FOR SELECT
  TO authenticated
  USING (
    has_plan_access(plan_id, 'viewer')
    AND (
      -- Task is not private - everyone can see
      is_private = false
      OR
      -- Task is private - only owners can see
      EXISTS (
        SELECT 1 FROM plan_members pm
        WHERE pm.plan_id = tasks.plan_id
        AND pm.user_id = auth.uid()
        AND pm.role = 'owner'
      )
    )
  );
```

### 2.3 Related Tables

Task-related tables reference tasks via foreign key. With RLS on tasks filtering out private tasks, related data is also protected:

| Table | How Protected |
|-------|---------------|
| task_tags | JOIN to tasks filters private |
| task_assignees | JOIN to tasks filters private |
| task_recurrence_rules | JOIN to tasks filters private |
| task_recurrence_instances | JOIN via rules filters private |
| comments | JOIN to tasks filters private |
| activity_events | Need to update policy |

**Activity Events Update:**
```sql
DROP POLICY IF EXISTS "Activity events viewable by members" ON activity_events;

CREATE POLICY "Activity events viewable with privacy"
  ON activity_events FOR SELECT
  TO authenticated
  USING (
    has_plan_access(plan_id, 'viewer')
    AND (
      -- Non-task events visible to all
      entity_type != 'task'
      OR
      -- Task events: check if task is visible
      EXISTS (
        SELECT 1 FROM tasks t
        WHERE t.id = activity_events.entity_id
        AND (
          t.is_private = false
          OR EXISTS (
            SELECT 1 FROM plan_members pm
            WHERE pm.plan_id = t.plan_id
            AND pm.user_id = auth.uid()
            AND pm.role = 'owner'
          )
        )
      )
      -- Note: May not find deleted tasks - those events visible to owners only
      OR NOT EXISTS (SELECT 1 FROM tasks WHERE id = activity_events.entity_id)
    )
  );
```

---

## Phase 3: Application Layer Changes

### 3.1 TypeScript Types

**File:** `src/lib/supabase/types.ts`

Add to Task interface:
```typescript
export interface Task {
  // ... existing fields
  is_private: boolean;
}
```

Add to TaskInsert:
```typescript
is_private?: boolean; // Optional, defaults to false
```

### 3.2 Task Dialog (Create/Edit)

**File:** `src/components/tasks/task-dialog.tsx`

Add Private toggle:
- Only visible to plan owners
- Position: Near bottom of form, before submit buttons
- Label: "Private"
- Helper text: "Only visible to plan owners"
- Switch/toggle component

When toggled ON:
- If task has non-owner assignees, show warning dialog
- "Making this private will remove assignees who aren't plan owners"
- Remove those assignees on save

### 3.3 Task Row (Display)

**File:** `src/components/tasks/task-row.tsx`

Add Private indicator:
- Lock icon (🔒) next to title
- Only shown on private tasks
- Tooltip: "Private - only visible to plan owners"

### 3.4 Tasks Page Updates

**File:** `src/app/plans/[planId]/tasks/page.tsx`

- Pass `isOwner` to TaskDialog component
- TaskDialog uses this to show/hide Private toggle

---

## Phase 4: Implementation Order

1. **Database migration** - Add column and update RLS
2. **TypeScript types** - Add is_private to Task type
3. **Task Row** - Add private indicator (lock icon)
4. **Task Dialog** - Add private toggle (owner only)
5. **Assignee validation** - Prevent non-owner assignment to private tasks
6. **Activity events policy** - Update for private task filtering
7. **Testing** - Manual test all scenarios

---

## Phase 5: Files to Modify

| File | Change |
|------|--------|
| `supabase/migrations/030_private_tasks.sql` | CREATE - New migration |
| `src/lib/supabase/types.ts` | MODIFY - Add is_private to Task |
| `src/components/tasks/task-row.tsx` | MODIFY - Add lock icon |
| `src/components/tasks/task-dialog.tsx` | MODIFY - Add private toggle |
| `src/app/plans/[planId]/tasks/page.tsx` | MODIFY - Pass isOwner to dialog |

---

## Phase 6: Testing Checklist

### As Plan Owner:
- [ ] Can see all tasks (private and non-private)
- [ ] Can create private task
- [ ] Can edit task to make it private
- [ ] Can edit task to make it public
- [ ] Private toggle visible in create/edit dialog
- [ ] Lock icon shows on private tasks
- [ ] Dashboard counts include private tasks
- [ ] Activity log shows private task events
- [ ] Search results include private tasks

### As Plan Member (Editor/Viewer):
- [ ] Can see non-private tasks
- [ ] CANNOT see private tasks
- [ ] Private toggle NOT visible in create/edit dialog
- [ ] Dashboard counts exclude private tasks
- [ ] Activity log excludes private task events
- [ ] Search results exclude private tasks
- [ ] Direct URL to private task returns error/empty

### Edge Cases:
- [ ] Making task private removes non-owner assignees
- [ ] Cannot assign non-owner to private task
- [ ] Completed private tasks hidden in logbook for non-owners

---

## Commit Strategy

1. `chore(db): add is_private column to tasks table`
2. `security(db): update RLS policies for private tasks`
3. `feat(types): add is_private to Task type`
4. `feat(ui): add private indicator (lock icon) to task row`
5. `feat(ui): add private toggle to task dialog`
6. `fix: validate assignees for private tasks`
