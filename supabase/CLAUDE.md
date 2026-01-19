# Supabase Configuration - `supabase/`

Database schema, migrations, and local development configuration.

## Directory Structure

```
supabase/
├── config.toml       # Local Supabase configuration
├── seed.sql          # Seed data for development
└── migrations/       # Database migrations
    ├── 20260108000001_enums_and_functions.sql
    ├── 20260108000002_core_tables.sql
    ├── 20260108000003_okr_tables.sql
    ├── 20260108000004_tracking_tables.sql
    ├── 20260108000005_ui_tables.sql
    ├── 20260108000006_activity_events.sql
    ├── 20260108000007_rls_policies.sql
    ├── 20260108000008_views.sql
    ├── 20260110000001_add_due_time.sql
    ├── 20260110000002_add_task_effort.sql
    ├── 20260111000002_weekly_reviews.sql
    ├── 20260111000003_weekly_review_activity.sql
    └── 20260119180700_drop_mindmap_tables.sql
```

## Database Schema

### Enums

```sql
-- Role in a plan
CREATE TYPE okr_role AS ENUM ('owner', 'editor', 'viewer');

-- KR type
CREATE TYPE kr_type AS ENUM ('metric', 'count', 'milestone', 'rate', 'average');

-- KR direction
CREATE TYPE kr_direction AS ENUM ('increase', 'decrease', 'maintain');

-- KR aggregation
CREATE TYPE kr_aggregation AS ENUM ('reset_quarterly', 'cumulative');

-- Task status
CREATE TYPE task_status AS ENUM ('pending', 'in_progress', 'completed', 'cancelled');

-- Task priority
CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high');

-- Task effort
CREATE TYPE task_effort AS ENUM ('light', 'moderate', 'heavy');

-- Tag kind
CREATE TYPE tag_kind AS ENUM ('platform', 'funnel_stage', 'initiative', 'category', 'custom');

-- Event types for activity log
CREATE TYPE event_entity_type AS ENUM ('task', 'check_in', 'member', 'objective', 'annual_kr', 'quarter_target', 'plan', 'weekly_review');
CREATE TYPE event_type AS ENUM ('created', 'updated', 'deleted', 'status_changed', 'completed', 'joined', 'left', 'role_changed', 'started');

-- Weekly review status
CREATE TYPE weekly_review_status AS ENUM ('open', 'pending', 'late', 'complete');
```

### Core Tables

#### `profiles`
User profiles, synced from `auth.users` via trigger.

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

#### `plans`
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

#### `plan_members`
Plan membership with roles.

```sql
CREATE TABLE plan_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role okr_role NOT NULL DEFAULT 'viewer',
  UNIQUE(plan_id, user_id)
);
```

### OKR Tables

#### `objectives`
Annual objectives within a plan.

```sql
CREATE TABLE objectives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  code TEXT NOT NULL,           -- e.g., "O1", "O2"
  name TEXT NOT NULL,
  description TEXT,
  sort_order INT DEFAULT 0,
  UNIQUE(plan_id, code)
);
```

#### `annual_krs`
Annual Key Results.

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
  unit TEXT,                    -- e.g., "followers", "%"
  start_value NUMERIC DEFAULT 0,
  target_value NUMERIC NOT NULL,
  current_value NUMERIC DEFAULT 0,
  sort_order INT DEFAULT 0
);
```

#### `quarter_targets`
Quarterly targets for KRs.

```sql
CREATE TABLE quarter_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  annual_kr_id UUID NOT NULL REFERENCES annual_krs(id) ON DELETE CASCADE,
  quarter INT NOT NULL CHECK (quarter >= 1 AND quarter <= 4),
  target_value NUMERIC NOT NULL,
  current_value NUMERIC DEFAULT 0,
  notes TEXT,
  UNIQUE(annual_kr_id, quarter)
);
```

### Tracking Tables

#### `tasks`
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
  -- Only one parent allowed
  CONSTRAINT tasks_parent_check CHECK (
    ((objective_id IS NOT NULL)::int + 
     (annual_kr_id IS NOT NULL)::int + 
     (quarter_target_id IS NOT NULL)::int) <= 1
  )
);
```

#### `check_ins`
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
  recorded_by UUID NOT NULL REFERENCES profiles(id)
);
```

#### `tags` and `task_tags`
Tag system.

```sql
CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  kind tag_kind DEFAULT 'custom',
  color TEXT,
  UNIQUE(plan_id, name)
);

CREATE TABLE task_tags (
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (task_id, tag_id)
);
```

### Activity Tracking

#### `activity_events`
Audit trail for all changes.

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

Populated automatically by triggers on tables.

### Weekly Reviews

```sql
CREATE TABLE weekly_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  year INT NOT NULL,
  week_number INT NOT NULL,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  status weekly_review_status DEFAULT 'open',
  -- Reflection fields
  reflection_what_went_well TEXT,
  reflection_what_to_improve TEXT,
  reflection_lessons_learned TEXT,
  reflection_notes TEXT,
  -- Stats (captured at completion)
  stats_krs_updated INT DEFAULT 0,
  stats_tasks_completed INT DEFAULT 0,
  stats_tasks_created INT DEFAULT 0,
  stats_check_ins_made INT DEFAULT 0,
  week_rating INT CHECK (week_rating >= 1 AND week_rating <= 5),
  UNIQUE(plan_id, year, week_number)
);
```

## Row Level Security

All tables have RLS enabled with policies based on `plan_members`.

### Pattern

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

## Database Views

Precomputed views for common queries:

- `v_plan_timeline` - Activity events with user info
- `v_objective_progress` - Objective progress with KR counts
- `v_kr_progress` - KR progress calculations
- `v_plan_stats` - Plan-level statistics
- `v_quarter_overview` - Quarter summary
- `v_weekly_review_summary` - Review status

## Triggers

### Auto-update timestamps
```sql
-- set_updated_at() function on all tables with updated_at
```

### Auto-set completed_at
```sql
-- On tasks: sets completed_at when status → completed
```

### Profile sync
```sql
-- Syncs profiles from auth.users on signup
```

### Activity logging
```sql
-- Triggers on major tables to log to activity_events
```

## Local Development

### Commands

```bash
# Start local Supabase
supabase start

# Stop
supabase stop

# Reset database (re-run migrations + seed)
supabase db reset

# Create new migration
supabase migration new migration_name

# Apply migrations
supabase migration up

# View database (Studio UI)
supabase status  # Shows Studio URL
```

### Creating a New Migration

1. Create migration file:
   ```bash
   supabase migration new add_feature_table
   ```

2. Edit `supabase/migrations/TIMESTAMP_add_feature_table.sql`

3. Apply locally:
   ```bash
   supabase db reset
   ```

4. Update TypeScript types in `src/lib/supabase/types.ts`

### Migration Conventions

- Use descriptive names: `add_task_effort`, `create_weekly_reviews`
- Include comments explaining purpose
- Add indexes for frequently queried columns
- Include RLS policies in same migration or dedicated file
- Add triggers for auto-timestamps

### Example Migration

```sql
-- Migration: Add new_feature table
-- Description: Stores new feature data

CREATE TABLE new_feature (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  value NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_new_feature_plan_id ON new_feature(plan_id);

CREATE TRIGGER new_feature_updated_at
  BEFORE UPDATE ON new_feature
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- RLS
ALTER TABLE new_feature ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view in their plans" ON new_feature
  FOR SELECT USING (plan_id IN (
    SELECT plan_id FROM plan_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Editors can modify" ON new_feature
  FOR ALL USING (plan_id IN (
    SELECT plan_id FROM plan_members 
    WHERE user_id = auth.uid() AND role IN ('owner', 'editor')
  ));
```
