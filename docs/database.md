# Database

Complete database schema documentation for the OKRs Tracker application.

## Overview

| Aspect | Value |
|--------|-------|
| Database | PostgreSQL (via Supabase) |
| Migrations | 14 consolidated files |
| Tables | 28 |
| Views | 6 |
| RPC Functions | 3 |
| Row Level Security | Enabled on all tables |

## Schema Diagram

```
┌─────────────────┐     ┌─────────────────┐
│    profiles     │     │     plans       │
│  (user data)    │◀───▶│  (OKR plans)    │
└────────┬────────┘     └────────┬────────┘
         │                       │
         ▼                       ▼
┌─────────────────┐     ┌─────────────────┐
│  plan_members   │     │   objectives    │
│ (membership)    │     │ (annual goals)  │
└─────────────────┘     └────────┬────────┘
                                 │
                                 ▼
                        ┌─────────────────┐
                        │   annual_krs    │
                        │ (key results)   │
                        └────────┬────────┘
                                 │
              ┌──────────────────┼──────────────────┐
              ▼                  ▼                  ▼
     ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
     │ quarter_targets │ │    check_ins    │ │     tasks       │
     │ (Q1-Q4 goals)   │ │ (progress)      │ │ (action items)  │
     └─────────────────┘ └─────────────────┘ └─────────────────┘
```

## Enum Types

All enums are defined in `001_extensions_and_types.sql`:

```sql
-- Plan membership role
CREATE TYPE okr_role AS ENUM ('owner', 'editor', 'viewer');

-- Key Result measurement type
CREATE TYPE kr_type AS ENUM ('metric', 'count', 'milestone', 'rate', 'average');

-- Progress direction
CREATE TYPE kr_direction AS ENUM ('increase', 'decrease', 'maintain');

-- How KR aggregates across quarters
CREATE TYPE kr_aggregation AS ENUM ('reset_quarterly', 'cumulative');

-- Task status
CREATE TYPE task_status AS ENUM ('pending', 'in_progress', 'completed', 'cancelled');

-- Task priority
CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high');

-- Task effort estimate
CREATE TYPE task_effort AS ENUM ('light', 'moderate', 'heavy');

-- Tag categorization
CREATE TYPE tag_kind AS ENUM ('platform', 'funnel_stage', 'initiative', 'category', 'custom');

-- Activity event entities
CREATE TYPE event_entity_type AS ENUM (
  'task', 'check_in', 'member', 'objective',
  'annual_kr', 'quarter_target', 'plan', 'weekly_review', 'comment'
);

-- Activity event actions
CREATE TYPE event_type AS ENUM (
  'created', 'updated', 'deleted', 'status_changed',
  'completed', 'joined', 'left', 'role_changed', 'started'
);

-- Weekly review status
CREATE TYPE weekly_review_status AS ENUM ('open', 'pending', 'late', 'complete');

-- Notification types
CREATE TYPE notification_type AS ENUM (
  'mentioned', 'comment', 'assigned', 'unassigned',
  'task_completed', 'task_updated'
);

-- Task recurrence
CREATE TYPE recurrence_frequency AS ENUM ('daily', 'weekly', 'monthly', 'yearly');
CREATE TYPE recurrence_end_type AS ENUM ('never', 'count', 'until');
```

## Core Tables

### profiles

User profiles synced from `auth.users` via trigger.

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### plans

OKR plans (typically yearly).

```sql
CREATE TABLE plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  year INT NOT NULL,
  description TEXT,
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### plan_members

Plan membership with role-based access.

```sql
CREATE TABLE plan_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role okr_role NOT NULL DEFAULT 'viewer',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(plan_id, user_id)
);
```

### plan_invites

Pending invitations to plans.

```sql
CREATE TABLE plan_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role okr_role NOT NULL DEFAULT 'viewer',
  token TEXT NOT NULL UNIQUE,
  invited_by UUID NOT NULL REFERENCES profiles(id),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## OKR Tables

### objectives

Annual objectives within a plan.

```sql
CREATE TABLE objectives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  code TEXT NOT NULL,           -- e.g., "O1", "O2"
  name TEXT NOT NULL,
  description TEXT,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(plan_id, code)
);
```

### kr_groups

Optional grouping for related KRs.

```sql
CREATE TABLE kr_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### annual_krs

Annual Key Results with various measurement types.

```sql
CREATE TABLE annual_krs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  objective_id UUID NOT NULL REFERENCES objectives(id) ON DELETE CASCADE,
  group_id UUID REFERENCES kr_groups(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  kr_type kr_type DEFAULT 'metric',
  direction kr_direction DEFAULT 'increase',
  aggregation kr_aggregation DEFAULT 'reset_quarterly',
  unit TEXT,                    -- e.g., "followers", "%", "$"
  start_value NUMERIC DEFAULT 0,
  target_value NUMERIC NOT NULL,
  current_value NUMERIC DEFAULT 0,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**KR Types Explained:**

| Type | Description | Example |
|------|-------------|---------|
| `metric` | Numeric target | "Increase revenue to $100K" |
| `count` | Count of items | "Complete 10 blog posts" |
| `milestone` | Binary achievement | "Launch product v2.0" |
| `rate` | Percentage or ratio | "Achieve 95% uptime" |
| `average` | Average over period | "Maintain 4.5 star rating" |

### quarter_targets

Quarterly targets breaking down annual KRs.

```sql
CREATE TABLE quarter_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  annual_kr_id UUID NOT NULL REFERENCES annual_krs(id) ON DELETE CASCADE,
  quarter INT NOT NULL CHECK (quarter >= 1 AND quarter <= 4),
  target_value NUMERIC NOT NULL,
  current_value NUMERIC DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(annual_kr_id, quarter)
);
```

## Task Tables

### tasks

Tasks linked to OKRs or standalone.

```sql
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  objective_id UUID REFERENCES objectives(id) ON DELETE CASCADE,
  annual_kr_id UUID REFERENCES annual_krs(id) ON DELETE CASCADE,
  quarter_target_id UUID REFERENCES quarter_targets(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status task_status DEFAULT 'pending',
  priority task_priority DEFAULT 'medium',
  effort task_effort DEFAULT 'moderate',
  due_date DATE,
  due_time TIME,
  completed_at TIMESTAMPTZ,
  assigned_to UUID REFERENCES profiles(id),
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  -- Only one parent allowed
  CONSTRAINT tasks_parent_check CHECK (
    ((objective_id IS NOT NULL)::int +
     (annual_kr_id IS NOT NULL)::int +
     (quarter_target_id IS NOT NULL)::int) <= 1
  )
);
```

### task_recurrence_rules

Recurring task configuration.

```sql
CREATE TABLE task_recurrence_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE UNIQUE,
  frequency recurrence_frequency NOT NULL,
  interval INT NOT NULL DEFAULT 1,
  days_of_week INT[],           -- 0=Sunday, 6=Saturday
  day_of_month INT,
  month_of_year INT,
  end_type recurrence_end_type NOT NULL DEFAULT 'never',
  end_count INT,
  end_date DATE,
  rrule_string TEXT,            -- iCal RRULE format
  last_generated_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### task_assignees

Multi-user task assignment.

```sql
CREATE TABLE task_assignees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES profiles(id),
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(task_id, user_id)
);
```

## Tracking Tables

### check_ins

Progress check-ins for KRs.

```sql
CREATE TABLE check_ins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  annual_kr_id UUID NOT NULL REFERENCES annual_krs(id) ON DELETE CASCADE,
  quarter_target_id UUID REFERENCES quarter_targets(id),
  value NUMERIC NOT NULL,
  previous_value NUMERIC,       -- Auto-captured
  note TEXT,
  evidence_url TEXT,
  recorded_at TIMESTAMPTZ NOT NULL,
  recorded_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### tags

Tags for categorizing tasks.

```sql
CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  kind tag_kind DEFAULT 'custom',
  color TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(plan_id, name)
);
```

### task_tags

Many-to-many junction for task tagging.

```sql
CREATE TABLE task_tags (
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (task_id, tag_id)
);
```

## Communication Tables

### comments

Comments on various entities.

```sql
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  entity_type event_entity_type NOT NULL,
  entity_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES profiles(id),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### mentions

User mentions in comments.

```sql
CREATE TABLE mentions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(comment_id, user_id)
);
```

### notifications

User notifications.

```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  entity_type event_entity_type,
  entity_id UUID,
  actor_id UUID REFERENCES profiles(id),
  message TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## UI Tables

### dashboards

Per-plan dashboard configuration.

```sql
CREATE TABLE dashboards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE UNIQUE,
  name TEXT DEFAULT 'Dashboard',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### dashboard_widgets

Individual widget configurations.

```sql
CREATE TABLE dashboard_widgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dashboard_id UUID NOT NULL REFERENCES dashboards(id) ON DELETE CASCADE,
  widget_type TEXT NOT NULL,
  position_x INT NOT NULL DEFAULT 0,
  position_y INT NOT NULL DEFAULT 0,
  width INT NOT NULL DEFAULT 1,
  height INT NOT NULL DEFAULT 1,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Activity & Review Tables

### activity_events

Audit trail for all changes (populated by triggers).

```sql
CREATE TABLE activity_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id),
  entity_type event_entity_type NOT NULL,
  entity_id UUID NOT NULL,
  event_type event_type NOT NULL,
  old_data JSONB,
  new_data JSONB,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### weekly_reviews

Weekly review records.

```sql
CREATE TABLE weekly_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  year INT NOT NULL,
  week_number INT NOT NULL CHECK (week_number BETWEEN 1 AND 53),
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  status weekly_review_status DEFAULT 'open',
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  -- Reflections
  reflection_what_went_well TEXT DEFAULT '',
  reflection_what_to_improve TEXT DEFAULT '',
  reflection_lessons_learned TEXT DEFAULT '',
  reflection_notes TEXT DEFAULT '',
  -- Stats (captured at completion)
  stats_krs_updated INT DEFAULT 0,
  stats_tasks_completed INT DEFAULT 0,
  stats_tasks_created INT DEFAULT 0,
  stats_check_ins_made INT DEFAULT 0,
  stats_objectives_on_track INT DEFAULT 0,
  stats_objectives_at_risk INT DEFAULT 0,
  stats_objectives_off_track INT DEFAULT 0,
  stats_overall_progress INT DEFAULT 0,
  stats_total_krs INT DEFAULT 0,
  week_rating INT CHECK (week_rating IS NULL OR week_rating BETWEEN 1 AND 5),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(plan_id, year, week_number)
);
```

## Database Views

### v_objective_progress

Objective progress with KR aggregation.

### v_kr_progress

KR progress calculations.

### v_plan_stats

Plan-level statistics.

### v_plan_checkins_by_day

Check-in counts by day (for heatmaps).

### v_weekly_review_summary

Review status with computed fields.

### v_plan_review_stats

Review analytics and streaks.

## RPC Functions

### get_comment_counts_for_entities

Efficient batch comment counting.

```sql
SELECT * FROM get_comment_counts_for_entities(
  'plan-uuid',
  'objective',
  ARRAY['obj-uuid-1', 'obj-uuid-2']
);
```

## Row Level Security

All tables have RLS enabled. Pattern:

```sql
-- View: Users can see data in their plans
CREATE POLICY "Users can view X in their plans" ON table_name
  FOR SELECT USING (
    plan_id IN (
      SELECT plan_id FROM plan_members WHERE user_id = auth.uid()
    )
  );

-- Modify: Only editors and owners
CREATE POLICY "Editors can modify X" ON table_name
  FOR ALL USING (
    plan_id IN (
      SELECT plan_id FROM plan_members
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'editor')
    )
  );
```

## Indexes

Key indexes for performance:

```sql
-- Plan-based queries (most common)
CREATE INDEX idx_objectives_plan_id ON objectives(plan_id);
CREATE INDEX idx_tasks_plan_id ON tasks(plan_id);
CREATE INDEX idx_check_ins_kr_id ON check_ins(annual_kr_id);

-- Task filtering
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
CREATE INDEX idx_tasks_priority ON tasks(priority);

-- Activity timeline
CREATE INDEX idx_activity_events_plan_id ON activity_events(plan_id);
CREATE INDEX idx_activity_events_created_at ON activity_events(created_at DESC);

-- Weekly reviews
CREATE INDEX idx_weekly_reviews_plan_id ON weekly_reviews(plan_id);
CREATE INDEX idx_weekly_reviews_year_week ON weekly_reviews(year, week_number);
```

## Triggers

### Auto-update timestamps

All tables with `updated_at` use the `set_updated_at()` trigger function.

### Auto-set completed_at

Tasks automatically set `completed_at` when status changes to `completed`.

### Profile sync

New users automatically get a profile created from `auth.users`.

### Activity logging

Major tables have triggers that log changes to `activity_events`.

## Storage Buckets

### plan-backups

Cloud backup storage:

- **Access**: Private (RLS enforced)
- **Path pattern**: `{userId}/{planId}/{planName}_{timestamp}.json`
- **Max file size**: 50MB
