# Migration Archive Manifest

**Archive Date**: 2026-01-24
**Purpose**: Backup of original migrations before consolidation cleanup
**Branch**: `refactor/migration-cleanup`

---

## Original Migration Files (22 + 1 rollback)

| # | Filename | Size | Original Date | Description |
|---|----------|------|---------------|-------------|
| 1 | `20260108000001_enums_and_functions.sql` | 2.8KB | 2026-01-08 | Base enums and helper functions |
| 2 | `20260108000002_core_tables.sql` | 7.6KB | 2026-01-08 | Core tables: profiles, plans, plan_members, plan_invites |
| 3 | `20260108000003_okr_tables.sql` | 9.4KB | 2026-01-08 | OKR tables: objectives, kr_groups, annual_krs, quarter_targets, tasks |
| 4 | `20260108000004_tracking_tables.sql` | 4.2KB | 2026-01-08 | Tracking: check_ins, tags, junction tables |
| 5 | `20260108000005_ui_tables.sql` | 4.0KB | 2026-01-08 | UI persistence: dashboards, dashboard_widgets, saved_views |
| 6 | `20260108000006_activity_events.sql` | 11.7KB | 2026-01-08 | Activity timeline with triggers |
| 7 | `20260108000007_rls_policies.sql` | 15.7KB | 2026-01-08 | RLS policies for all tables |
| 8 | `20260108000008_views.sql` | 6.1KB | 2026-01-08 | Database views |
| 9 | `20260111000002_weekly_reviews.sql` | 14.3KB | 2026-01-11 | Weekly reviews feature |
| 10 | `20260111000003_weekly_review_activity.sql` | 4.1KB | 2026-01-11 | Weekly review activity events |
| 11 | `20260122000001_task_reminders.sql` | 4.1KB | 2026-01-22 | Task reminders |
| 12 | `20260122000002_task_reminders_on_time.sql` | 0.2KB | 2026-01-22 | Fix: adds on-time reminder option |
| 13 | `20260123000001_enable_realtime.sql` | 3.2KB | 2026-01-23 | Enable Supabase Realtime |
| 14 | `20260123000002_kr_owners.sql` | 0.4KB | 2026-01-23 | KR ownership column |
| 15 | `20260123000003_task_assignees.sql` | 1.7KB | 2026-01-23 | Multi-user task assignment |
| 16 | `20260123000004_comments_notifications.sql` | 7.4KB | 2026-01-23 | Comments and notifications |
| 17 | `20260123000005_comment_reads.sql` | 1.8KB | 2026-01-23 | Comment read tracking |
| 18 | `20260123000006_optimize_comment_counts.sql` | 0.9KB | 2026-01-23 | Comment count optimization |
| 19 | `20260124000001_team_analytics.sql` | 8.0KB | 2026-01-24 | Team analytics functions |
| 20 | `20260124000002_task_recurrence.sql` | 9.2KB | 2026-01-24 | Recurring tasks |
| 21 | `20260124100001_fix_plans_rls.sql` | 3.2KB | 2026-01-24 | Fix: Enable RLS on plans |
| 22 | `20260124100002_fix_views_security_invoker.sql` | 12.8KB | 2026-01-24 | Fix: SECURITY INVOKER on views |
| - | `emergency_rollback_rls_fix.sql` | 8.4KB | 2026-01-24 | Emergency rollback script |

**Total Size**: ~106KB

---

## Objects Removed During Consolidation

The following objects were identified as unused and removed:

### Tables Removed
- `saved_views` - Feature never implemented, no usage in codebase

### Views Removed
- `v_plan_timeline` - activity_events queried directly instead
- `v_weekly_review_stats_by_month` - Stats computed client-side

### Functions Removed
- `get_or_create_weekly_review()` - Logic implemented in application code
- `update_updated_at_column()` - Duplicate of set_updated_at(), consolidated

---

## Issues Fixed During Consolidation

1. **RLS Policy Bug**: Fixed `actor_id` → `user_id` in activity_events policy
2. **Duplicate Function**: Consolidated `update_updated_at_column()` into `set_updated_at()`
3. **SECURITY DEFINER Views**: All views now use SECURITY INVOKER
4. **RLS on plans**: Properly enabled and forced

---

## Notes

- This archive is for reference only and should NOT be deployed
- The new consolidated migrations in `supabase/migrations/` are the source of truth
- If you need to restore the original migrations, copy files from this archive back to migrations/
