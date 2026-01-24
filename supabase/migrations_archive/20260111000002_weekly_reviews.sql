-- ============================================================================
-- WEEKLY REVIEWS FEATURE
-- A structured weekly ritual for reflecting on progress, celebrating wins,
-- identifying gaps, and planning improvements. Inspired by Agile retrospectives.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- HELPER FUNCTION: Update updated_at timestamp
-- (Create if not exists - may already exist from other migrations)
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------------------------
-- ENUMS
-- ----------------------------------------------------------------------------

-- Review status enum
CREATE TYPE weekly_review_status AS ENUM (
  'open',      -- Current week, review started but not completed
  'pending',   -- Past week, review not done
  'late',      -- Completed after the week ended (after Monday)
  'complete'   -- Completed on time (within the week or by Monday EOD)
);

-- ----------------------------------------------------------------------------
-- WEEKLY REVIEWS TABLE
-- One review per plan per week
-- ----------------------------------------------------------------------------

CREATE TABLE weekly_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  
  -- Week identification (ISO week)
  year INTEGER NOT NULL,
  week_number INTEGER NOT NULL CHECK (week_number BETWEEN 1 AND 53),
  week_start DATE NOT NULL,  -- Monday of that week
  week_end DATE NOT NULL,    -- Sunday of that week
  
  -- Status tracking
  status weekly_review_status NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,      -- When user actually started the review flow
  completed_at TIMESTAMPTZ,    -- When user finished and submitted
  
  -- Reflection content (markdown supported)
  reflection_what_went_well TEXT DEFAULT '',
  reflection_what_to_improve TEXT DEFAULT '',
  reflection_lessons_learned TEXT DEFAULT '',
  reflection_notes TEXT DEFAULT '',  -- Free-form additional notes
  
  -- Summary statistics (snapshot captured at completion)
  stats_krs_updated INTEGER DEFAULT 0,
  stats_tasks_completed INTEGER DEFAULT 0,
  stats_tasks_created INTEGER DEFAULT 0,
  stats_check_ins_made INTEGER DEFAULT 0,
  stats_objectives_on_track INTEGER DEFAULT 0,
  stats_objectives_at_risk INTEGER DEFAULT 0,
  stats_objectives_off_track INTEGER DEFAULT 0,
  stats_overall_progress INTEGER DEFAULT 0,  -- YTD progress percentage (0-100) at completion
  stats_total_krs INTEGER DEFAULT 0,         -- Total active KRs at completion
  
  -- Week rating (1-5 stars, optional)
  week_rating INTEGER CHECK (week_rating IS NULL OR week_rating BETWEEN 1 AND 5),
  
  -- Metadata
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Ensure one review per plan per week
  UNIQUE(plan_id, year, week_number)
);

-- Index for efficient queries
CREATE INDEX idx_weekly_reviews_plan_id ON weekly_reviews(plan_id);
CREATE INDEX idx_weekly_reviews_status ON weekly_reviews(status);
CREATE INDEX idx_weekly_reviews_year_week ON weekly_reviews(year, week_number);
CREATE INDEX idx_weekly_reviews_week_start ON weekly_reviews(week_start);

-- ----------------------------------------------------------------------------
-- WEEKLY REVIEW SETTINGS TABLE
-- Per-plan configuration for review reminders
-- ----------------------------------------------------------------------------

CREATE TABLE weekly_review_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE UNIQUE,
  
  -- Reminder configuration
  reminder_enabled BOOLEAN NOT NULL DEFAULT true,
  reminder_day INTEGER NOT NULL DEFAULT 5 CHECK (reminder_day BETWEEN 0 AND 6),  -- 0=Sun, 5=Fri
  reminder_time TIME NOT NULL DEFAULT '17:00',
  
  -- Auto-create reviews for each new week
  auto_create_reviews BOOLEAN NOT NULL DEFAULT true,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- WEEKLY REVIEW KR UPDATES TABLE
-- Track KR value changes made during a review
-- ----------------------------------------------------------------------------

CREATE TABLE weekly_review_kr_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  weekly_review_id UUID NOT NULL REFERENCES weekly_reviews(id) ON DELETE CASCADE,
  annual_kr_id UUID NOT NULL REFERENCES annual_krs(id) ON DELETE CASCADE,
  
  -- Value tracking
  value_before DECIMAL,
  value_after DECIMAL,
  progress_before DECIMAL,  -- 0-1 progress percentage
  progress_after DECIMAL,
  
  -- Optional note for this specific update
  notes TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- One update per KR per review
  UNIQUE(weekly_review_id, annual_kr_id)
);

CREATE INDEX idx_weekly_review_kr_updates_review ON weekly_review_kr_updates(weekly_review_id);
CREATE INDEX idx_weekly_review_kr_updates_kr ON weekly_review_kr_updates(annual_kr_id);

-- ----------------------------------------------------------------------------
-- WEEKLY REVIEW TASK SNAPSHOTS TABLE
-- Capture task status during the review
-- ----------------------------------------------------------------------------

CREATE TABLE weekly_review_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  weekly_review_id UUID NOT NULL REFERENCES weekly_reviews(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  
  -- Snapshot of task state
  status_at_review TEXT NOT NULL,
  was_completed_this_week BOOLEAN DEFAULT false,
  was_created_this_week BOOLEAN DEFAULT false,
  was_overdue BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(weekly_review_id, task_id)
);

CREATE INDEX idx_weekly_review_tasks_review ON weekly_review_tasks(weekly_review_id);

-- ----------------------------------------------------------------------------
-- TRIGGERS
-- ----------------------------------------------------------------------------

-- Update timestamp trigger for weekly_reviews
CREATE TRIGGER weekly_reviews_updated_at
  BEFORE UPDATE ON weekly_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Update timestamp trigger for weekly_review_settings
CREATE TRIGGER weekly_review_settings_updated_at
  BEFORE UPDATE ON weekly_review_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- NOTE: Activity event triggers for weekly_reviews are defined in
-- 20260111000003_weekly_review_activity.sql which uses the standard
-- log_activity_event helper function for consistency.

-- ----------------------------------------------------------------------------
-- ROW LEVEL SECURITY
-- ----------------------------------------------------------------------------

ALTER TABLE weekly_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_review_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_review_kr_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_review_tasks ENABLE ROW LEVEL SECURITY;

-- Weekly Reviews policies (same as other plan-scoped tables)
CREATE POLICY "Users can view weekly reviews for their plans"
  ON weekly_reviews FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM plan_members pm
      WHERE pm.plan_id = weekly_reviews.plan_id
      AND pm.user_id = auth.uid()
    )
  );

CREATE POLICY "Editors can create weekly reviews"
  ON weekly_reviews FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM plan_members pm
      WHERE pm.plan_id = weekly_reviews.plan_id
      AND pm.user_id = auth.uid()
      AND pm.role IN ('owner', 'editor')
    )
  );

CREATE POLICY "Editors can update weekly reviews"
  ON weekly_reviews FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM plan_members pm
      WHERE pm.plan_id = weekly_reviews.plan_id
      AND pm.user_id = auth.uid()
      AND pm.role IN ('owner', 'editor')
    )
  );

CREATE POLICY "Owners can delete weekly reviews"
  ON weekly_reviews FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM plan_members pm
      WHERE pm.plan_id = weekly_reviews.plan_id
      AND pm.user_id = auth.uid()
      AND pm.role = 'owner'
    )
  );

-- Weekly Review Settings policies
CREATE POLICY "Users can view review settings for their plans"
  ON weekly_review_settings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM plan_members pm
      WHERE pm.plan_id = weekly_review_settings.plan_id
      AND pm.user_id = auth.uid()
    )
  );

CREATE POLICY "Editors can manage review settings"
  ON weekly_review_settings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM plan_members pm
      WHERE pm.plan_id = weekly_review_settings.plan_id
      AND pm.user_id = auth.uid()
      AND pm.role IN ('owner', 'editor')
    )
  );

-- Weekly Review KR Updates policies
CREATE POLICY "Users can view KR updates for their plans"
  ON weekly_review_kr_updates FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM weekly_reviews wr
      JOIN plan_members pm ON pm.plan_id = wr.plan_id
      WHERE wr.id = weekly_review_kr_updates.weekly_review_id
      AND pm.user_id = auth.uid()
    )
  );

CREATE POLICY "Editors can manage KR updates"
  ON weekly_review_kr_updates FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM weekly_reviews wr
      JOIN plan_members pm ON pm.plan_id = wr.plan_id
      WHERE wr.id = weekly_review_kr_updates.weekly_review_id
      AND pm.user_id = auth.uid()
      AND pm.role IN ('owner', 'editor')
    )
  );

-- Weekly Review Tasks policies
CREATE POLICY "Users can view task snapshots for their plans"
  ON weekly_review_tasks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM weekly_reviews wr
      JOIN plan_members pm ON pm.plan_id = wr.plan_id
      WHERE wr.id = weekly_review_tasks.weekly_review_id
      AND pm.user_id = auth.uid()
    )
  );

CREATE POLICY "Editors can manage task snapshots"
  ON weekly_review_tasks FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM weekly_reviews wr
      JOIN plan_members pm ON pm.plan_id = wr.plan_id
      WHERE wr.id = weekly_review_tasks.weekly_review_id
      AND pm.user_id = auth.uid()
      AND pm.role IN ('owner', 'editor')
    )
  );

-- ----------------------------------------------------------------------------
-- VIEWS
-- ----------------------------------------------------------------------------

-- View for weekly review summary with computed fields
CREATE OR REPLACE VIEW v_weekly_review_summary AS
SELECT 
  wr.id,
  wr.plan_id,
  wr.year,
  wr.week_number,
  wr.week_start,
  wr.week_end,
  wr.status,
  wr.created_at,
  wr.started_at,
  wr.completed_at,
  wr.week_rating,
  wr.stats_krs_updated,
  wr.stats_tasks_completed,
  wr.stats_tasks_created,
  wr.stats_check_ins_made,
  wr.stats_objectives_on_track,
  wr.stats_objectives_at_risk,
  wr.stats_objectives_off_track,
  -- Computed: days since week ended (for pending reviews)
  CASE 
    WHEN wr.status IN ('pending', 'open') AND CURRENT_DATE > wr.week_end 
    THEN CURRENT_DATE - wr.week_end
    ELSE 0
  END AS days_overdue,
  -- Computed: has reflection content
  (COALESCE(wr.reflection_what_went_well, '') != '' OR 
   COALESCE(wr.reflection_what_to_improve, '') != '' OR
   COALESCE(wr.reflection_lessons_learned, '') != '' OR
   COALESCE(wr.reflection_notes, '') != '') AS has_reflections
FROM weekly_reviews wr;

-- View for plan review stats (for analytics)
CREATE OR REPLACE VIEW v_plan_review_stats AS
SELECT 
  plan_id,
  COUNT(*) AS total_reviews,
  COUNT(*) FILTER (WHERE status = 'complete') AS completed_on_time,
  COUNT(*) FILTER (WHERE status = 'late') AS completed_late,
  COUNT(*) FILTER (WHERE status = 'pending') AS pending,
  ROUND(AVG(week_rating)::numeric, 2) AS avg_rating,
  -- Streak calculation (consecutive complete reviews)
  (
    SELECT COUNT(*)
    FROM (
      SELECT year, week_number,
             ROW_NUMBER() OVER (ORDER BY year DESC, week_number DESC) as rn
      FROM weekly_reviews wr2
      WHERE wr2.plan_id = weekly_reviews.plan_id
        AND wr2.status IN ('complete', 'late')
    ) sub
    WHERE rn = (year * 100 + week_number) - 
          (SELECT MIN(year * 100 + week_number) - 1 
           FROM weekly_reviews wr3 
           WHERE wr3.plan_id = weekly_reviews.plan_id 
             AND wr3.status IN ('complete', 'late'))
  ) AS current_streak
FROM weekly_reviews
GROUP BY plan_id;

-- ----------------------------------------------------------------------------
-- HELPER FUNCTION: Get or create weekly review for current week
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION get_or_create_weekly_review(
  p_plan_id UUID,
  p_year INTEGER DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER,
  p_week INTEGER DEFAULT EXTRACT(WEEK FROM CURRENT_DATE)::INTEGER
)
RETURNS UUID AS $$
DECLARE
  v_review_id UUID;
  v_week_start DATE;
  v_week_end DATE;
BEGIN
  -- Calculate week bounds (ISO week: Monday to Sunday)
  v_week_start := DATE_TRUNC('week', MAKE_DATE(p_year, 1, 4) + (p_week - 1) * INTERVAL '1 week')::DATE;
  v_week_end := v_week_start + INTERVAL '6 days';
  
  -- Try to find existing review
  SELECT id INTO v_review_id
  FROM weekly_reviews
  WHERE plan_id = p_plan_id AND year = p_year AND week_number = p_week;
  
  -- Create if not exists
  IF v_review_id IS NULL THEN
    INSERT INTO weekly_reviews (plan_id, year, week_number, week_start, week_end, status)
    VALUES (p_plan_id, p_year, p_week, v_week_start, v_week_end, 'open')
    RETURNING id INTO v_review_id;
  END IF;
  
  RETURN v_review_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE weekly_reviews IS 'Weekly review records - one per plan per week for structured reflection and progress tracking';
COMMENT ON TABLE weekly_review_settings IS 'Per-plan settings for weekly review reminders and automation';
COMMENT ON TABLE weekly_review_kr_updates IS 'Tracks KR value changes made during weekly reviews';
COMMENT ON TABLE weekly_review_tasks IS 'Snapshot of task states during weekly reviews';
