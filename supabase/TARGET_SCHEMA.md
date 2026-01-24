# Target Schema Definition

**Date**: 2026-01-24
**Branch**: `refactor/migration-cleanup`

This document defines what the consolidated migrations will create.

---

## Migration Structure (15 files)

| # | Filename | Contents |
|---|----------|----------|
| 001 | `001_extensions_and_types.sql` | All 13 enums |
| 002 | `002_helper_functions.sql` | Core helper functions |
| 003 | `003_core_tables.sql` | profiles, plans, plan_members, plan_invites |
| 004 | `004_okr_tables.sql` | objectives, kr_groups, annual_krs, quarter_targets, tasks |
| 005 | `005_tracking_tables.sql` | check_ins, tags, junction tables |
| 006 | `006_ui_tables.sql` | dashboards, dashboard_widgets |
| 007 | `007_activity_events.sql` | activity_events + all triggers |
| 008 | `008_weekly_reviews.sql` | weekly_reviews tables + triggers |
| 009 | `009_task_features.sql` | reminders, assignees, recurrence |
| 010 | `010_communication.sql` | comments, mentions, notifications |
| 011 | `011_rls_policies.sql` | All RLS policies |
| 012 | `012_views.sql` | 7 views (SECURITY INVOKER) |
| 013 | `013_rpc_functions.sql` | Client-callable RPC functions |
| 014 | `014_realtime.sql` | Supabase Realtime publication |
| 015 | `015_indexes.sql` | Performance indexes |

---

## Objects INCLUDED

### Enums (13)
- okr_role
- kr_type
- kr_direction
- kr_aggregation
- task_status
- task_priority
- task_effort
- tag_kind
- event_entity_type (with all values including 'comment', 'weekly_review')
- event_type
- weekly_review_status
- notification_type
- recurrence_frequency
- recurrence_end_type

### Tables (28)
1. profiles
2. plans
3. plan_members
4. plan_invites
5. objectives
6. kr_groups
7. annual_krs (includes owner_id)
8. quarter_targets
9. tasks (includes reminder_enabled, is_recurring, recurring_master_id)
10. check_ins
11. tags
12. annual_kr_tags
13. task_tags
14. dashboards
15. dashboard_widgets
16. activity_events
17. weekly_reviews
18. weekly_review_settings
19. weekly_review_kr_updates
20. weekly_review_tasks
21. task_reminder_settings (includes time_reminder_on_time)
22. task_assignees
23. comments
24. comment_mentions
25. notifications
26. comment_reads
27. task_recurrence_rules
28. task_recurrence_instances

### Views (7)
1. v_plan_checkins_by_day
2. v_objective_progress
3. v_kr_progress
4. v_plan_stats
5. v_quarter_overview
6. v_weekly_review_summary
7. v_plan_review_stats

### Functions
**Helper Functions:**
- set_updated_at()
- okr_role_rank()
- request_user_id()
- has_plan_access()
- get_plan_id_from_objective()
- get_plan_id_from_annual_kr()
- get_plan_id_from_quarter_target()

**Auth Triggers:**
- handle_new_user()
- handle_new_plan()
- accept_pending_invites()

**Business Logic:**
- tasks_set_completed_at()
- update_kr_on_checkin()
- log_activity_event()

**Activity Triggers:**
- tasks_activity_events()
- checkins_activity_events()
- plan_members_activity_events()
- objectives_activity_events()
- annual_krs_activity_events()
- weekly_reviews_activity_events()

**RPC Functions:**
- get_tasks_comment_counts()
- get_member_workload_stats()
- get_member_contributions_by_period()
- get_recurring_master_task()
- is_recurring_task()
- get_task_recurrence_info()

---

## Objects REMOVED

### Tables (1)
- ~~saved_views~~ - Feature never implemented

### Views (2)
- ~~v_plan_timeline~~ - Not used; activity_events queried directly
- ~~v_weekly_review_stats_by_month~~ - Not used; stats computed client-side

### Functions (2)
- ~~update_updated_at_column()~~ - Duplicate of set_updated_at()
- ~~get_or_create_weekly_review()~~ - Logic implemented in application code

---

## Bug Fixes Applied

### 1. RLS Policy Fix
**Table**: activity_events
**Issue**: Policy referenced non-existent `actor_id` column
**Fix**: Changed to `user_id`

```sql
-- Before (broken):
AND (actor_id = auth.uid() OR actor_id IS NULL)

-- After (fixed):
AND (user_id = auth.uid() OR user_id IS NULL)
```

### 2. Duplicate Function Consolidated
**Removed**: `update_updated_at_column()`
**Kept**: `set_updated_at()`
**All triggers updated to use**: `set_updated_at()`

### 3. Views Security
**All views**: Created with `WITH (security_invoker = true)`

### 4. RLS Enforcement
**Table**: plans
**Added**: `FORCE ROW LEVEL SECURITY`

---

## Verification Checklist

After consolidation, verify:

- [ ] All 28 tables exist
- [ ] All 7 views exist with SECURITY INVOKER
- [ ] RLS enabled on all tables
- [ ] RLS forced on plans table
- [ ] All triggers function correctly
- [ ] All RPC functions callable
- [ ] Application starts without errors
- [ ] All features work correctly
- [ ] Supabase linter passes with 0 errors
