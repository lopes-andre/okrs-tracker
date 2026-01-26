# Task Visibility by Role - Implementation Plan

## Phase 1: Discovery Summary

### 1.1 Data Model Summary

#### Plan Ownership
- **NOT stored on plans table** - The `created_by` field exists but ownership is determined through `plan_members`
- **Ownership determined by:** `plan_members.role = 'owner'`
- **Role hierarchy:** owner > editor > viewer (via `okr_role_rank()` function)

#### Task Assignment Storage
- **Primary:** `task_assignees` junction table (supports multiple assignees)
  - `task_id`, `user_id`, `assigned_at`, `assigned_by`
  - `UNIQUE(task_id, user_id)` constraint
- **Legacy:** `tasks.assigned_to` column (single assignee, still exists)

#### Current RLS on Tasks
```sql
-- CURRENT: All plan members can see ALL tasks
CREATE POLICY "Tasks viewable by members"
  ON tasks FOR SELECT
  USING (has_plan_access(plan_id, 'viewer'));
```

### 1.2 All Task Touchpoints Identified

#### API Functions (src/features/tasks/api.ts)
- `getTasks(planId, filters?)`
- `getTasksWithDetails(planId, filters?)`
- `getTasksGrouped(planId, filters?)`
- `getTasksByObjective(objectiveId)`
- `getTasksByAnnualKr(annualKrId)`
- `getTasksByQuarterTarget(quarterTargetId)`
- `getTasksPaginated(planId, page, limit, filters?)`
- `getCompletedTasksPaginated(planId, page, limit, filters?)`
- `getRecentCompletedTasks(planId, limit?)`
- `getFutureTasks(planId, limit?)`
- `getTask(taskId)`
- `getTaskWithDetails(taskId)`
- `getTaskCounts(planId)` - **IMPORTANT: counts need to reflect visibility**
- `createTask()`, `updateTask()`, `deleteTask()` - write operations
- Bulk operations: `bulkUpdateTaskStatus()`, `bulkDeleteTasks()`
- Assignee operations: `getTaskAssignees()`, `setTaskAssignees()`, etc.

#### Pages/Routes
1. `/plans/[planId]/tasks/page.tsx` - Main tasks page
2. `/plans/[planId]/tasks/logbook/page.tsx` - Completed tasks archive
3. `/plans/[planId]/page.tsx` - Dashboard (via DashboardDataProvider)
4. `/plans/[planId]/analytics/page.tsx` - Analytics page

#### Dashboard Widgets
- `dashboard-data-provider.tsx` - Fetches tasks for all widgets
- `widgets/tasks-due.tsx` - Shows upcoming/overdue tasks

#### Analytics (src/features/analytics/)
- `getAnalyticsData(planId)` - Returns tasks for analytics
- `getTaskMetrics(planId)` - Task-specific metrics (counts, completion rates)

#### Activity Timeline (src/features/timeline/)
- Task-related activity events are logged and displayed
- Events include: created, updated, status_changed, completed, deleted

#### Search (src/features/search/)
- `searchPlan(planId, query)` - Searches tasks within a plan
- `searchGlobal(query)` - Global search across all plans

#### Comments (src/features/comments/)
- `useTasksCommentCounts()` - Comment counts per task

#### Notifications (src/features/notifications/)
- Task assignment creates notifications

#### Progress Engine (src/lib/progress-engine.ts)
- Tasks used for milestone progress calculation

### 1.3 Edge Cases to Handle

| Scenario | Behavior |
|----------|----------|
| Task with NO assignees | Only owners can see |
| Task with MULTIPLE assignees | All assignees can see |
| Task created by non-owner, not assigned | Only owners can see |
| User unassigned from task | Loses visibility immediately |
| Ownership transfers | New owner sees all, old owner sees only assigned |
| Archived/completed tasks | Same visibility rules apply |
| Task comments | Should follow task visibility |
| Task counts on dashboard | Reflect filtered count per user |
| Analytics metrics | Reflect only visible tasks per user |
| Activity log entries | Only show for visible tasks |
| Direct URL to hidden task | Show "not found" (security through obscurity) |

---

## Phase 2: Implementation Plan

### 2.1 Database Layer Changes

#### New RLS Policy for Tasks SELECT

```sql
-- DROP existing policy
DROP POLICY IF EXISTS "Tasks viewable by members" ON tasks;

-- NEW: Role-based task visibility
-- Owners see all tasks in plan
-- Non-owners see only tasks assigned to them
CREATE POLICY "Tasks viewable by role"
  ON tasks FOR SELECT
  TO authenticated
  USING (
    -- Check if user is plan owner
    EXISTS (
      SELECT 1 FROM plan_members pm
      WHERE pm.plan_id = tasks.plan_id
      AND pm.user_id = auth.uid()
      AND pm.role = 'owner'
    )
    OR
    -- Check if user is assigned to task (via task_assignees table)
    EXISTS (
      SELECT 1 FROM task_assignees ta
      WHERE ta.task_id = tasks.id
      AND ta.user_id = auth.uid()
    )
    OR
    -- Check legacy assigned_to column
    tasks.assigned_to = auth.uid()
  );
```

#### Update Task Assignees RLS
Task assignees visibility should follow task visibility:

```sql
DROP POLICY IF EXISTS "Task assignees viewable by members" ON task_assignees;

CREATE POLICY "Task assignees viewable by role"
  ON task_assignees FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tasks t
      WHERE t.id = task_assignees.task_id
      -- Reuse the task visibility logic
      AND (
        -- User is plan owner
        EXISTS (
          SELECT 1 FROM plan_members pm
          WHERE pm.plan_id = t.plan_id
          AND pm.user_id = auth.uid()
          AND pm.role = 'owner'
        )
        OR
        -- User is assigned to this task
        EXISTS (
          SELECT 1 FROM task_assignees ta2
          WHERE ta2.task_id = t.id
          AND ta2.user_id = auth.uid()
        )
        OR
        t.assigned_to = auth.uid()
      )
    )
  );
```

#### Keep Write Policies Unchanged
INSERT, UPDATE, DELETE policies remain as-is (editors can modify all tasks they can access).

### 2.2 Application Layer Changes

#### No Query Changes Needed
Since RLS handles filtering, existing queries will automatically return filtered results.

#### UI Label Updates (Optional)
Consider updating labels for non-owners:
- "Tasks" → "My Tasks" (for non-owners)
- "0 tasks" → "No tasks assigned to you"

#### Dashboard Task Counts
The `getTaskCounts()` function will automatically return filtered counts due to RLS.

#### Activity Log Consideration
Activity events reference task_id. We have two options:
1. **Option A:** Keep showing all activity (reveals task existence but not content)
2. **Option B:** Filter activity to only visible tasks

**Recommendation:** Option B for security - filter activity log.

### 2.3 Files to Modify

| File | Change Type | Description | Status |
|------|-------------|-------------|--------|
| `supabase/migrations/027_task_visibility_by_role.sql` | CREATE | New migration for RLS policy | ✅ Done |
| `src/features/timeline/api.ts` | MODIFY | Filter activity by task visibility | N/A (handled at RLS level) |
| `src/components/tasks/TaskRow.tsx` | MINOR | Update empty state messaging | N/A |
| `src/app/plans/[planId]/tasks/page.tsx` | MINOR | Update empty state for non-owners | ✅ Done |
| `src/app/plans/[planId]/tasks/logbook/page.tsx` | MINOR | Update logbook for non-owners | ✅ Done |

### 2.3.1 Tables Updated in Migration

| Table | Old Policy | New Policy |
|-------|------------|------------|
| `tasks` | "Tasks viewable by members" | "Tasks viewable by role" |
| `task_assignees` | "Task assignees viewable by members" | "Task assignees viewable by role" |
| `task_tags` | "Task tags viewable by members" | "Task tags viewable by role" |
| `task_recurrence_rules` | "Recurrence rules viewable by members" | "Recurrence rules viewable by role" |
| `task_recurrence_instances` | "Recurrence instances viewable by members" | "Recurrence instances viewable by role" |
| `activity_events` | "Activity events viewable by members" | "Activity events viewable by role" |
| `comments` | "Users can view comments in their plans" | "Comments viewable by task visibility" |
| `comment_mentions` | "Users can view mentions in their plans" | "Mentions viewable by task visibility" |

### 2.4 Implementation Order

1. ✅ **Create migration file** with new RLS policies (`027_task_visibility_by_role.sql`)
2. **Test RLS in isolation** via Supabase SQL editor
3. ✅ **Update activity log filtering** (Option B implemented in migration)
4. ✅ **Update UI empty states** for non-owners ("My Tasks" vs "Tasks")
5. ✅ **Run full test suite** - All 1265 tests pass
6. **Manual testing with owner and member accounts**

---

## Phase 3: Testing Strategy

### 3.1 Test Setup

Create test scenario:
- Plan owned by User A (owner)
- User B is a member (editor role)
- User C is a member (viewer role)

Tasks:
1. Task 1: Assigned to A only
2. Task 2: Assigned to B only
3. Task 3: Assigned to A and B
4. Task 4: No assignees
5. Task 5: Assigned to C only

### 3.2 Expected Results

| Task | Owner A | Editor B | Viewer C |
|------|---------|----------|----------|
| Task 1 | ✓ See | ✗ Hidden | ✗ Hidden |
| Task 2 | ✓ See | ✓ See | ✗ Hidden |
| Task 3 | ✓ See | ✓ See | ✗ Hidden |
| Task 4 | ✓ See | ✗ Hidden | ✗ Hidden |
| Task 5 | ✓ See | ✗ Hidden | ✓ See |

### 3.3 Manual Test Checklist

**As Owner (User A):**
- [ ] Tasks page shows all 5 tasks
- [ ] Logbook shows all completed tasks
- [ ] Dashboard task count = 5
- [ ] Analytics includes all tasks
- [ ] Activity log shows all task events
- [ ] Search returns all tasks

**As Editor (User B):**
- [ ] Tasks page shows Tasks 2, 3 only (2 tasks)
- [ ] Logbook shows only assigned completed tasks
- [ ] Dashboard task count = 2
- [ ] Analytics reflects only visible tasks
- [ ] Activity log shows only visible task events
- [ ] Search returns only visible tasks
- [ ] Direct URL to Task 1 shows "not found"

**As Viewer (User C):**
- [ ] Tasks page shows Task 5 only (1 task)
- [ ] All metrics reflect single visible task

---

## Phase 4: Rollback Plan

### If Issues Occur

1. **Immediate rollback SQL:**
```sql
-- Restore original policy
DROP POLICY IF EXISTS "Tasks viewable by role" ON tasks;
CREATE POLICY "Tasks viewable by members" ON tasks
  FOR SELECT USING (has_plan_access(plan_id, 'viewer'));

-- Restore task_assignees policy
DROP POLICY IF EXISTS "Task assignees viewable by role" ON task_assignees;
CREATE POLICY "Task assignees viewable by members" ON task_assignees
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM tasks t
      WHERE t.id = task_id
      AND has_plan_access(t.plan_id, 'viewer')
    )
  );
```

2. **Git rollback:**
```bash
git revert <commit-hash>
```

---

## Commit Strategy

1. `docs: add task visibility implementation plan`
2. `security(db): update RLS policies for role-based task visibility`
3. `fix(timeline): filter activity log by task visibility` (if implementing)
4. `fix(ui): update empty states for role-based task visibility`
5. `test: add manual test results for task visibility`

---

## Final Checklist Before Merge

- [ ] Migration file created and tested locally
- [ ] RLS policies tested in Supabase SQL editor
- [ ] Manual testing completed for all scenarios
- [ ] No console errors
- [ ] No TypeScript errors
- [ ] Build passes
- [ ] Rollback plan documented and ready
- [ ] Activity log filtering implemented (if chosen)
