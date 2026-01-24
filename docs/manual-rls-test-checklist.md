# Manual RLS Security Test Checklist

**Date**: 2026-01-24
**Purpose**: Verify Row Level Security is working correctly after migration

---

## Prerequisites

### Test Users Setup

You need **two test users** with different plan memberships:

| User | Email | Role |
|------|-------|------|
| **UserA** | usera@test.com | Owner of "Test Plan A" |
| **UserB** | userb@test.com | NOT a member of "Test Plan A" |

### Test Data Setup

1. Log in as **UserA**
2. Create a plan called "Test Plan A" (note the plan ID)
3. Add at least:
   - 1 Objective
   - 1 Key Result
   - 1 Task
   - 1 Check-in
4. Log out

---

## Part 1: Plans Table RLS Tests

### Test 1.1: Plan Visibility ✓/✗

| Step | Action | Expected Result | Pass? |
|------|--------|-----------------|-------|
| 1 | Log in as **UserA** | Login successful | ☐ |
| 2 | Go to Plans list | See "Test Plan A" | ☐ |
| 3 | Log out | - | ☐ |
| 4 | Log in as **UserB** | Login successful | ☐ |
| 5 | Go to Plans list | **Should NOT see** "Test Plan A" | ☐ |

### Test 1.2: Direct Plan Access ✓/✗

| Step | Action | Expected Result | Pass? |
|------|--------|-----------------|-------|
| 1 | Log in as **UserB** | Login successful | ☐ |
| 2 | Navigate directly to `/plans/[TestPlanA-ID]` | Should see 404 or access denied | ☐ |
| 3 | Try `/plans/[TestPlanA-ID]/okrs` | Should see 404 or access denied | ☐ |
| 4 | Try `/plans/[TestPlanA-ID]/tasks` | Should see 404 or access denied | ☐ |

### Test 1.3: Plan Modification ✓/✗

| Step | Action | Expected Result | Pass? |
|------|--------|-----------------|-------|
| 1 | Log in as **UserA** | Login successful | ☐ |
| 2 | Edit "Test Plan A" name | Change saves successfully | ☐ |
| 3 | Log in as **UserB** | Login successful | ☐ |
| 4 | Open browser console | - | ☐ |
| 5 | Run: `await supabase.from('plans').update({name:'Hacked'}).eq('id','[TestPlanA-ID]')` | Should return error or 0 rows affected | ☐ |

---

## Part 2: View Security Tests

### Test 2.1: v_plan_stats View ✓/✗

| Step | Action | Expected Result | Pass? |
|------|--------|-----------------|-------|
| 1 | Log in as **UserA** | - | ☐ |
| 2 | Open browser console | - | ☐ |
| 3 | Run: `await supabase.from('v_plan_stats').select('*')` | Should return stats for UserA's plans only | ☐ |
| 4 | Log in as **UserB** | - | ☐ |
| 5 | Run same query | Should NOT include "Test Plan A" stats | ☐ |

### Test 2.2: v_objective_progress View ✓/✗

| Step | Action | Expected Result | Pass? |
|------|--------|-----------------|-------|
| 1 | Log in as **UserA** | - | ☐ |
| 2 | Run: `await supabase.from('v_objective_progress').select('*')` | Should return UserA's objectives | ☐ |
| 3 | Log in as **UserB** | - | ☐ |
| 4 | Run same query | Should NOT include "Test Plan A" objectives | ☐ |

### Test 2.3: v_kr_progress View ✓/✗

| Step | Action | Expected Result | Pass? |
|------|--------|-----------------|-------|
| 1 | Log in as **UserA** | - | ☐ |
| 2 | Run: `await supabase.from('v_kr_progress').select('*')` | Should return UserA's KRs | ☐ |
| 3 | Log in as **UserB** | - | ☐ |
| 4 | Run same query | Should NOT include "Test Plan A" KRs | ☐ |

### Test 2.4: v_plan_checkins_by_day View ✓/✗

| Step | Action | Expected Result | Pass? |
|------|--------|-----------------|-------|
| 1 | Log in as **UserA** | - | ☐ |
| 2 | Run: `await supabase.from('v_plan_checkins_by_day').select('*')` | Should return UserA's check-in data | ☐ |
| 3 | Log in as **UserB** | - | ☐ |
| 4 | Run same query | Should NOT include "Test Plan A" check-ins | ☐ |

### Test 2.5: v_quarter_overview View ✓/✗

| Step | Action | Expected Result | Pass? |
|------|--------|-----------------|-------|
| 1 | Log in as **UserA** | - | ☐ |
| 2 | Run: `await supabase.from('v_quarter_overview').select('*')` | Should return UserA's quarter data | ☐ |
| 3 | Log in as **UserB** | - | ☐ |
| 4 | Run same query | Should NOT include "Test Plan A" data | ☐ |

### Test 2.6: v_weekly_review_summary View ✓/✗

| Step | Action | Expected Result | Pass? |
|------|--------|-----------------|-------|
| 1 | Log in as **UserA** | - | ☐ |
| 2 | Run: `await supabase.from('v_weekly_review_summary').select('*')` | Should return UserA's reviews | ☐ |
| 3 | Log in as **UserB** | - | ☐ |
| 4 | Run same query | Should NOT include "Test Plan A" reviews | ☐ |

### Test 2.7: v_plan_review_stats View ✓/✗

| Step | Action | Expected Result | Pass? |
|------|--------|-----------------|-------|
| 1 | Log in as **UserA** | - | ☐ |
| 2 | Run: `await supabase.from('v_plan_review_stats').select('*')` | Should return UserA's review stats | ☐ |
| 3 | Log in as **UserB** | - | ☐ |
| 4 | Run same query | Should NOT include "Test Plan A" stats | ☐ |

---

## Part 3: Application Functionality Tests

After applying migrations, verify the app still works correctly.

### Test 3.1: Dashboard ✓/✗

| Step | Action | Expected Result | Pass? |
|------|--------|-----------------|-------|
| 1 | Log in as **UserA** | - | ☐ |
| 2 | Go to Dashboard | Dashboard loads without errors | ☐ |
| 3 | Verify widgets display data | All widgets show correct data | ☐ |
| 4 | Check browser console | No RLS-related errors | ☐ |

### Test 3.2: OKRs Page ✓/✗

| Step | Action | Expected Result | Pass? |
|------|--------|-----------------|-------|
| 1 | Go to OKRs page | Page loads correctly | ☐ |
| 2 | View objectives | Objectives display with progress | ☐ |
| 3 | View KRs | KRs display with progress | ☐ |
| 4 | Create new objective | Creates successfully | ☐ |
| 5 | Create new KR | Creates successfully | ☐ |

### Test 3.3: Tasks Page ✓/✗

| Step | Action | Expected Result | Pass? |
|------|--------|-----------------|-------|
| 1 | Go to Tasks page | Page loads correctly | ☐ |
| 2 | View tasks | Tasks display correctly | ☐ |
| 3 | Create new task | Creates successfully | ☐ |
| 4 | Complete a task | Status updates correctly | ☐ |

### Test 3.4: Analytics Page ✓/✗

| Step | Action | Expected Result | Pass? |
|------|--------|-----------------|-------|
| 1 | Go to Analytics page | Page loads correctly | ☐ |
| 2 | View Progress tab | Charts display correctly | ☐ |
| 3 | View Activity tab | Heatmap displays correctly | ☐ |
| 4 | View other tabs | All tabs work | ☐ |

### Test 3.5: Check-ins ✓/✗

| Step | Action | Expected Result | Pass? |
|------|--------|-----------------|-------|
| 1 | Go to a KR detail | Page loads | ☐ |
| 2 | Create a check-in | Check-in saves | ☐ |
| 3 | Verify KR value updated | Current value reflects check-in | ☐ |

### Test 3.6: Weekly Reviews ✓/✗

| Step | Action | Expected Result | Pass? |
|------|--------|-----------------|-------|
| 1 | Go to Reviews page | Page loads correctly | ☐ |
| 2 | View current week review | Review displays | ☐ |
| 3 | Add reflection notes | Notes save successfully | ☐ |

### Test 3.7: Settings Page ✓/✗

| Step | Action | Expected Result | Pass? |
|------|--------|-----------------|-------|
| 1 | Go to Settings | Page loads correctly | ☐ |
| 2 | View plan settings | Settings display | ☐ |
| 3 | View members | Members list displays | ☐ |

---

## Part 4: Role-Based Access Tests

### Test 4.1: Viewer Role ✓/✗

| Step | Action | Expected Result | Pass? |
|------|--------|-----------------|-------|
| 1 | Add **UserB** to "Test Plan A" as **viewer** | Invite sent/accepted | ☐ |
| 2 | Log in as **UserB** | - | ☐ |
| 3 | View "Test Plan A" | Can see plan and data | ☐ |
| 4 | Try to create objective | Should be **denied** | ☐ |
| 5 | Try to create task | Should be **denied** | ☐ |

### Test 4.2: Editor Role ✓/✗

| Step | Action | Expected Result | Pass? |
|------|--------|-----------------|-------|
| 1 | Change **UserB** to **editor** role | Role updated | ☐ |
| 2 | Log in as **UserB** | - | ☐ |
| 3 | Create objective | Should **succeed** | ☐ |
| 4 | Create task | Should **succeed** | ☐ |
| 5 | Try to delete plan | Should be **denied** | ☐ |

### Test 4.3: Owner Role ✓/✗

| Step | Action | Expected Result | Pass? |
|------|--------|-----------------|-------|
| 1 | Log in as **UserA** (owner) | - | ☐ |
| 2 | Update plan settings | Should **succeed** | ☐ |
| 3 | Remove member | Should **succeed** | ☐ |
| 4 | Delete plan | Should **succeed** (test with disposable plan) | ☐ |

---

## Test Results Summary

| Category | Tests Passed | Tests Failed |
|----------|--------------|--------------|
| Plans Table RLS | /3 | |
| View Security | /7 | |
| App Functionality | /7 | |
| Role-Based Access | /3 | |
| **TOTAL** | **/20** | |

---

## Sign-off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Tester | | | |
| Reviewer | | | |

---

## Notes

_Record any issues, observations, or concerns below:_

```
[Space for notes]
```

---

## If Tests Fail

1. **DO NOT PANIC**
2. Note which specific test failed
3. Check browser console for error messages
4. Run the rollback script if needed:
   ```sql
   -- In Supabase SQL Editor
   \i supabase/migrations/emergency_rollback_rls_fix.sql
   ```
5. Report the failure with:
   - Which test failed
   - Error message (if any)
   - Browser console output
   - Steps to reproduce
