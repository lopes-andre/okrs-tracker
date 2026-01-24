# Supabase Configuration - `supabase/`

Database schema, migrations, and local development configuration.

## Directory Structure

```
supabase/
├── config.toml           # Local Supabase configuration
├── seed.sql              # Seed data for development
├── TARGET_SCHEMA.md      # Target schema documentation
├── migrations/           # Consolidated database migrations (14 files)
│   ├── 001_extensions_and_types.sql   # All enums (14)
│   ├── 002_helper_functions.sql       # Trigger & helper functions
│   ├── 003_core_tables.sql            # profiles, plans, plan_members, invites
│   ├── 004_okr_tables.sql             # objectives, kr_groups, annual_krs, quarter_targets, tasks
│   ├── 005_tracking_tables.sql        # check_ins, tags, tag junctions
│   ├── 006_ui_tables.sql              # dashboards, dashboard_widgets
│   ├── 007_activity_events.sql        # activity_events + triggers
│   ├── 008_weekly_reviews.sql         # weekly_reviews tables + triggers
│   ├── 009_task_features.sql          # task_reminder_settings, assignees, recurrence
│   ├── 010_communication.sql          # comments, mentions, notifications
│   ├── 011_rls_policies.sql           # All RLS policies (28 tables)
│   ├── 012_views.sql                  # Database views (6)
│   ├── 013_rpc_functions.sql          # Client-callable RPC functions
│   └── 014_realtime.sql               # Supabase Realtime publication
└── migrations_archive/   # Original migrations (for reference)
    ├── MANIFEST.md       # Archive manifest
    └── *.sql             # Archived migration files
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
CREATE TYPE event_entity_type AS ENUM ('task', 'check_in', 'member', 'objective', 'annual_kr', 'quarter_target', 'plan', 'weekly_review', 'comment');
CREATE TYPE event_type AS ENUM ('created', 'updated', 'deleted', 'status_changed', 'completed', 'joined', 'left', 'role_changed', 'started');

-- Weekly review status
CREATE TYPE weekly_review_status AS ENUM ('open', 'pending', 'late', 'complete');

-- Notification types
CREATE TYPE notification_type AS ENUM ('mentioned', 'comment', 'assigned', 'unassigned', 'task_completed', 'task_updated');

-- Task recurrence
CREATE TYPE recurrence_frequency AS ENUM ('daily', 'weekly', 'monthly', 'yearly');
CREATE TYPE recurrence_end_type AS ENUM ('never', 'count', 'until');
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

### Content Planner

Content planning and distribution management tables (migrations 015-017).

**Enums:**
```sql
CREATE TYPE content_post_status AS ENUM ('backlog', 'tagged', 'ongoing', 'complete');
CREATE TYPE content_distribution_status AS ENUM ('draft', 'scheduled', 'posted');
CREATE TYPE content_campaign_status AS ENUM ('draft', 'active', 'paused', 'completed');
CREATE TYPE content_campaign_objective AS ENUM ('awareness', 'traffic', 'engagement', 'conversions');
CREATE TYPE content_account_type AS ENUM ('personal', 'business');
```

**Core Tables:**
- `content_platforms` - Platform definitions (Instagram, LinkedIn, etc.) - read-only, seeded
- `content_accounts` - User's social media accounts linked to plans
- `content_goals` - Content goals per plan (Authority, Audience Growth, etc.)
- `content_posts` - Content ideas/posts with Kanban workflow
- `content_post_goals` - Many-to-many: posts to goals
- `content_post_media` - Media files attached to posts
- `content_post_links` - Links attached to posts
- `content_distributions` - Distribution schedule for each post/account
- `content_distribution_metrics` - Performance metrics check-ins
- `content_campaigns` - Paid campaign tracking
- `content_campaign_posts` - Many-to-many: campaigns to posts
- `content_campaign_checkins` - Campaign performance check-ins

**Key RPC Functions:**
- `get_content_posts_with_details(plan_id)` - Posts with goals and distribution counts
- `get_content_calendar(plan_id, start_date, end_date)` - Calendar view data
- `reorder_content_posts(post_ids, status)` - Kanban reordering

**Auto-status Trigger:**
The `update_content_post_status()` trigger automatically updates post status based on distributions:
- No distributions → `backlog`
- Has distributions, none scheduled/posted → `tagged`
- Any scheduled or posted → `ongoing`
- All posted → `complete`

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

Precomputed views for common queries (all use SECURITY INVOKER):

- `v_plan_checkins_by_day` - Check-in counts by day for heatmaps
- `v_objective_progress` - Objective progress with KR counts
- `v_kr_progress` - KR progress calculations
- `v_plan_stats` - Plan-level statistics
- `v_quarter_overview` - Quarter summary
- `v_weekly_review_summary` - Review status with computed fields
- `v_plan_review_stats` - Review analytics and streaks

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

## Supabase Storage

### `plan-backups` Bucket

Cloud backup storage for plan exports.

**Configuration:**
- Private bucket (not publicly accessible)
- File size limit: 50MB
- Path pattern: `{userId}/{planId}/{planName}_{timestamp}.json`

**RLS Policy:**
Users can only access files in their own folder:
```sql
CREATE POLICY "Users access own backups"
ON storage.objects FOR ALL
USING (
  bucket_id = 'plan-backups'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
```

**Usage (via `src/features/import-export/backup.ts`):**
```typescript
// Create backup
const { data } = await supabase.storage
  .from('plan-backups')
  .upload(filePath, jsonBlob, { contentType: 'application/json' });

// List backups
const { data } = await supabase.storage
  .from('plan-backups')
  .list(`${userId}/${planId}`);

// Download backup
const { data } = await supabase.storage
  .from('plan-backups')
  .download(filePath);

// Delete backup
const { error } = await supabase.storage
  .from('plan-backups')
  .remove([filePath]);
```

### `content-media` Bucket

Storage for content planner media files (images, PDFs).

**Configuration:**
- Private bucket (uses signed URLs)
- File size limit: 10MB
- Allowed MIME types: image/jpeg, image/png, image/webp, image/gif, application/pdf
- Path pattern: `{planId}/{postId}/{filename}`

**RLS Policies:**
- Members can view files from their plans
- Editors can upload/delete files in their plans

**Usage (via `src/features/content/api.ts`):**
```typescript
// Upload media
const { path, url } = await uploadMediaFile(planId, postId, file);

// Get signed URL
const signedUrl = await getMediaSignedUrl(path);

// Delete media
await deleteMediaFile(path);
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
