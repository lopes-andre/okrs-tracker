# Phase 1: Security Warnings Analysis Report

**Date**: 2026-01-24
**Branch**: `fix/supabase-security-warnings`

---

## 1. Function Analysis Summary

### Functions in Current Migrations Needing search_path

| # | Function | File | Language | SECURITY | Status |
|---|----------|------|----------|----------|--------|
| 1 | `set_updated_at()` | 002_helper_functions.sql | plpgsql | - | Needs fix |
| 2 | `okr_role_rank()` | 002_helper_functions.sql | plpgsql | IMMUTABLE | Needs fix |
| 3 | `request_user_id()` | 002_helper_functions.sql | plpgsql | SECURITY DEFINER | Needs fix |
| 4 | `has_plan_access()` | 003_core_tables.sql | plpgsql | SECURITY DEFINER | Needs fix |
| 5 | `handle_new_user()` | 003_core_tables.sql | plpgsql | SECURITY DEFINER | **Already has** |
| 6 | `handle_new_plan()` | 003_core_tables.sql | plpgsql | SECURITY DEFINER | **Already has** |
| 7 | `accept_pending_invites()` | 003_core_tables.sql | plpgsql | SECURITY DEFINER | **Already has** |
| 8 | `tasks_set_completed_at()` | 004_okr_tables.sql | plpgsql | - | Needs fix |
| 9 | `get_plan_id_from_objective()` | 004_okr_tables.sql | sql | STABLE | Needs fix |
| 10 | `get_plan_id_from_annual_kr()` | 004_okr_tables.sql | sql | STABLE | Needs fix |
| 11 | `get_plan_id_from_quarter_target()` | 004_okr_tables.sql | sql | STABLE | Needs fix |
| 12 | `update_kr_on_checkin()` | 005_tracking_tables.sql | plpgsql | - | Needs fix |
| 13 | `log_activity_event()` | 007_activity_events.sql | plpgsql | SECURITY DEFINER | Needs fix |
| 14 | `tasks_activity_events()` | 007_activity_events.sql | plpgsql | SECURITY DEFINER | Needs fix |
| 15 | `checkins_activity_events()` | 007_activity_events.sql | plpgsql | SECURITY DEFINER | Needs fix |
| 16 | `plan_members_activity_events()` | 007_activity_events.sql | plpgsql | SECURITY DEFINER | Needs fix |
| 17 | `objectives_activity_events()` | 007_activity_events.sql | plpgsql | SECURITY DEFINER | Needs fix |
| 18 | `annual_krs_activity_events()` | 007_activity_events.sql | plpgsql | SECURITY DEFINER | Needs fix |
| 19 | `weekly_reviews_activity_events()` | 008_weekly_reviews.sql | plpgsql | SECURITY DEFINER | Needs fix |
| 20 | `get_tasks_comment_counts()` | 013_rpc_functions.sql | sql | STABLE | Needs fix |
| 21 | `get_member_workload_stats()` | 013_rpc_functions.sql | sql | STABLE | Needs fix |
| 22 | `get_member_contributions_by_period()` | 013_rpc_functions.sql | sql | STABLE | Needs fix |

**Functions that need search_path**: 19 (3 already have it)

### Missing Functions (Must Be Added)

The following functions were in the original migrations but missing from consolidated migrations.
**These ARE actively used** in `src/features/task-recurrence/api.ts`:

| Function | Purpose | Used By | Recommendation |
|----------|---------|---------|----------------|
| `get_recurring_master_task()` | Get master task for recurring instance | `getMasterTaskId()` | **Add to 009_task_features.sql** |
| `is_recurring_task()` | Check if task is recurring | `isRecurringTask()` | **Add to 009_task_features.sql** |
| `get_task_recurrence_info()` | Get recurrence info for task | `getTaskRecurrenceInfo()` | **Add to 009_task_features.sql** |

### Functions Mentioned in Warnings But Not in Migrations

These functions may exist in the deployed database but were intentionally removed:

| Function | Status | Recommendation |
|----------|--------|----------------|
| `update_updated_at_column()` | Removed (duplicate of set_updated_at) | **Leave removed** |
| `get_or_create_weekly_review()` | Removed (logic in app) | **Leave removed** |
| `log_weekly_review_activity()` | Not in any migration | **Investigate** |

---

## 2. RLS Policy Analysis

### Warning 1: Plans INSERT Policy

**Policy**: "Authenticated users can create plans"
**Location**: 011_rls_policies.sql:76-79
**Current**: `WITH CHECK (true)`

**Analysis**:
- This allows any authenticated user to create a plan
- The `handle_new_plan()` trigger then adds them as owner
- The `created_by` column is set in the INSERT, so users can only create plans for themselves

**Recommendation**: **Keep as-is but add validation**
- Add check that `created_by = auth.uid()` to ensure users can only create plans for themselves
- This is a minimal security improvement without breaking functionality

**Proposed Policy**:
```sql
CREATE POLICY "Authenticated users can create plans"
  ON plans FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());
```

### Warning 2: Plan Members INSERT Policy

**Policy**: Appears to be "Service role can insert plan members"
**Location**: 011_rls_policies.sql:101-104
**Current**: `WITH CHECK (true)` for `TO service_role`

**Analysis**:
- This is for `service_role` only, not `authenticated` users
- Service role is trusted and used by triggers
- For authenticated users, we have separate policies:
  - "Plan creators can add themselves as owner" (lines 106-117)
  - "Owners can add members" (lines 119-125)

**Recommendation**: **Keep as-is**
- The service_role policy is intentionally permissive because it's only for triggers
- The authenticated user policies are properly scoped
- The warning may be for a different policy in the deployed database

---

## 3. Rollback Script

Created at: `supabase/scripts/rollback_security_warnings_fix.sql`

---

## 4. Summary & Approval Request

### Changes Needed

1. **Add search_path to 19 functions**
   - Pattern: Add `SET search_path = ''` for maximum security
   - This prevents search path injection attacks

2. **Add 3 missing recurrence functions**
   - These were accidentally omitted during migration consolidation

3. **Tighten plans INSERT policy**
   - Add `created_by = auth.uid()` check

### No Changes Needed

1. **Service role plan_members INSERT policy** - Already properly scoped to service_role
2. **Leaked Password Protection** - Dashboard setting, not migration

### Questions for Approval

1. **Confirm plans INSERT policy change**: Add `created_by = auth.uid()` check?
2. **Confirm adding missing recurrence functions**: These seem to be used in the codebase
3. **Proceed with search_path fixes for all 19 functions?**

Please confirm the approach before I proceed to Phase 2.
