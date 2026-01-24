# RLS Security Fix Analysis Report

**Date**: 2026-01-24
**Branch**: `fix/supabase-rls-security`

## Executive Summary

The Supabase database linter reports 11 security issues that need addressing:
1. RLS disabled on `plans` table (despite policies being defined)
2. 10 views using SECURITY DEFINER (bypassing RLS)

---

## 1. RLS on `plans` Table

### 1.1 Current State in Migrations

The migration `20260108000007_rls_policies.sql` explicitly enables RLS:

```sql
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
```

And defines these policies:
- `"Plans are viewable by members"` (SELECT) - Uses `has_plan_access(id, 'viewer')`
- `"Authenticated users can create plans"` (INSERT) - `WITH CHECK (true)`
- `"Owners can update plans"` (UPDATE) - Uses `has_plan_access(id, 'owner')`
- `"Owners can delete plans"` (DELETE) - Uses `has_plan_access(id, 'owner')`

### 1.2 Why Linter Reports RLS Disabled

**Hypothesis**: The linter is checking the actual database state, not the migration files. This can happen if:
1. Migration was partially applied
2. A later migration or manual command disabled RLS
3. Database was reset without running all migrations
4. There's a difference between local and production databases

**Git History Search**: No migrations found that DISABLE RLS on plans.

### 1.3 Risk Assessment

**CRITICAL**: If RLS is truly disabled on `plans`:
- Any authenticated user can see ALL plans in the system
- The `has_plan_access()` checks in policies are NOT being enforced
- This is a **data privacy violation**

### 1.4 Recommended Action

Re-enable RLS with explicit FORCE option:
```sql
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans FORCE ROW LEVEL SECURITY;
```

The `FORCE` option ensures RLS applies even to table owners (important for security).

---

## 2. SECURITY DEFINER Views

### 2.1 Understanding the Issue

PostgreSQL views can have two security modes:
- **SECURITY INVOKER** (default): Queries run with the permissions of the user executing the query
- **SECURITY DEFINER**: Queries run with the permissions of the view creator (usually a superuser)

When a view uses SECURITY DEFINER, it **bypasses RLS** because it runs as the creator, not the authenticated user.

### 2.2 Views Identified

| View | Location | Used In Code | Purpose |
|------|----------|--------------|---------|
| `v_plan_timeline` | views.sql | No (only types) | Activity events with user info |
| `v_plan_checkins_by_day` | views.sql | check-ins/api.ts, analytics/api.ts | Aggregated check-ins per day |
| `v_plan_stats` | views.sql | plans/api.ts | Plan-level statistics |
| `v_objective_progress` | views.sql | objectives/api.ts | Objective progress calculation |
| `v_kr_progress` | views.sql | annual-krs/api.ts | KR progress details |
| `v_quarter_overview` | views.sql | quarter-targets/api.ts | Quarterly targets with progress |
| `v_weekly_review_summary` | weekly_reviews.sql | weekly-reviews/api.ts | Review with computed fields |
| `v_plan_review_stats` | weekly_reviews.sql | weekly-reviews/api.ts | Plan review statistics |
| `v_weekly_review_stats_by_month` | weekly_review_activity.sql | No | Monthly review aggregates |

### 2.3 View Analysis & Recommendations

| View | Recommendation | Justification |
|------|----------------|---------------|
| `v_plan_timeline` | **SECURITY INVOKER** | Returns per-plan data, should respect RLS |
| `v_plan_checkins_by_day` | **SECURITY INVOKER** | Returns per-plan data, should respect RLS |
| `v_plan_stats` | **SECURITY INVOKER** | Returns per-plan stats, should respect RLS |
| `v_objective_progress` | **SECURITY INVOKER** | Returns per-plan objectives, should respect RLS |
| `v_kr_progress` | **SECURITY INVOKER** | Returns per-plan KRs, should respect RLS |
| `v_quarter_overview` | **SECURITY INVOKER** | Returns per-plan data, should respect RLS |
| `v_weekly_review_summary` | **SECURITY INVOKER** | Returns per-plan reviews, should respect RLS |
| `v_plan_review_stats` | **SECURITY INVOKER** | Returns per-plan stats, should respect RLS |
| `v_weekly_review_stats_by_month` | **SECURITY INVOKER** | Returns per-plan stats, should respect RLS |

**All views should use SECURITY INVOKER** because:
1. All views return data scoped to a `plan_id`
2. The API always filters by `plan_id` (e.g., `.eq("plan_id", planId)`)
3. RLS policies on base tables should apply to protect data
4. None of these views need to aggregate cross-plan data

### 2.4 Why Default Became DEFINER

In PostgreSQL, the default is actually SECURITY INVOKER. However, Supabase may:
1. Create views with SECURITY DEFINER by default
2. The views might have been created before RLS was enabled
3. Some Supabase versions or configurations default to DEFINER

---

## 3. Security Implications

### 3.1 With Current State (RLS Disabled + DEFINER Views)

**Data Exposure Risk**:
- User A can potentially query `v_plan_stats` and see ALL plans
- Views bypass RLS, so even if we fix the table RLS, views still leak data
- The `.eq("plan_id", planId)` filter in code is the ONLY protection (insufficient)

### 3.2 After Fix

**Proper Security**:
- RLS on `plans` enforces membership checks at database level
- Views with SECURITY INVOKER inherit the caller's permissions
- Data access requires passing through RLS policies
- Defense in depth: API filter + RLS + view security

---

## 4. Rollback Strategy

A rollback script has been created at:
`supabase/migrations/emergency_rollback_rls_fix.sql`

This script can:
1. Disable RLS on plans (if needed)
2. Restore views to their current state

**Usage**: Only run if the fix causes application issues.

---

## 5. Implementation Plan

### Phase 2: Fix RLS on `plans` table
1. Create migration to enable RLS with FORCE
2. Verify all policies exist
3. Test policy enforcement

### Phase 3: Fix SECURITY DEFINER views
1. Recreate all 9 views with explicit SECURITY INVOKER
2. Test that views respect RLS

### Phase 4: Testing
1. Automated tests for RLS enforcement
2. Manual test checklist

---

## 6. Files Created

| File | Purpose |
|------|---------|
| `supabase/migrations/emergency_rollback_rls_fix.sql` | Rollback script |
| `docs/rls-security-fix-analysis.md` | This analysis document |

---

## 7. Approval Required

**Please review this analysis and confirm:**

1. ✅ Rollback script is ready
2. ✅ Analysis of RLS on plans is complete
3. ✅ Analysis of SECURITY DEFINER views is complete
4. ✅ All 9 views should use SECURITY INVOKER

**Awaiting your approval to proceed to Phase 2.**
