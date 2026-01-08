-- Migration: Tracking Tables
-- Description: Create check_ins, tags, and tag junction tables

-- ============================================================================
-- CHECK_INS TABLE
-- ============================================================================
-- Time-series progress updates for KRs

CREATE TABLE check_ins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  annual_kr_id UUID NOT NULL REFERENCES annual_krs(id) ON DELETE CASCADE,
  quarter_target_id UUID REFERENCES quarter_targets(id) ON DELETE SET NULL,
  value NUMERIC NOT NULL,
  previous_value NUMERIC, -- Stored for easy delta calculation
  note TEXT,
  evidence_url TEXT, -- Link to proof (screenshot, post URL, etc.)
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  recorded_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_check_ins_annual_kr_id ON check_ins(annual_kr_id);
CREATE INDEX idx_check_ins_quarter_target_id ON check_ins(quarter_target_id);
CREATE INDEX idx_check_ins_recorded_at ON check_ins(recorded_at);
CREATE INDEX idx_check_ins_recorded_by ON check_ins(recorded_by);

COMMENT ON TABLE check_ins IS 'Time-series progress updates for key results';
COMMENT ON COLUMN check_ins.evidence_url IS 'Optional link to proof (screenshot, post URL, analytics)';

-- ============================================================================
-- FUNCTION: Auto-update KR current_value on check-in
-- ============================================================================

CREATE OR REPLACE FUNCTION update_kr_on_checkin()
RETURNS TRIGGER AS $$
BEGIN
  -- Store the previous value
  SELECT current_value INTO NEW.previous_value
  FROM annual_krs
  WHERE id = NEW.annual_kr_id;
  
  -- Update annual KR current value
  UPDATE annual_krs
  SET current_value = NEW.value
  WHERE id = NEW.annual_kr_id;
  
  -- Update quarter target if specified
  IF NEW.quarter_target_id IS NOT NULL THEN
    UPDATE quarter_targets
    SET current_value = NEW.value
    WHERE id = NEW.quarter_target_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_ins_update_kr_trigger
  BEFORE INSERT ON check_ins
  FOR EACH ROW
  EXECUTE FUNCTION update_kr_on_checkin();

-- ============================================================================
-- TAGS TABLE
-- ============================================================================
-- Flexible tags for filtering and grouping

CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  kind tag_kind NOT NULL DEFAULT 'custom',
  color TEXT, -- Optional hex color
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Unique name per plan
  UNIQUE(plan_id, name)
);

-- Indexes
CREATE INDEX idx_tags_plan_id ON tags(plan_id);
CREATE INDEX idx_tags_kind ON tags(kind);

COMMENT ON TABLE tags IS 'Flexible tags for filtering (platform, funnel_stage, initiative, etc.)';

-- ============================================================================
-- ANNUAL_KR_TAGS TABLE
-- ============================================================================
-- Junction table for KRs and tags

CREATE TABLE annual_kr_tags (
  annual_kr_id UUID NOT NULL REFERENCES annual_krs(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (annual_kr_id, tag_id)
);

-- Indexes
CREATE INDEX idx_annual_kr_tags_tag_id ON annual_kr_tags(tag_id);

COMMENT ON TABLE annual_kr_tags IS 'Many-to-many relationship between KRs and tags';

-- ============================================================================
-- TASK_TAGS TABLE
-- ============================================================================
-- Junction table for tasks and tags

CREATE TABLE task_tags (
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (task_id, tag_id)
);

-- Indexes
CREATE INDEX idx_task_tags_tag_id ON task_tags(tag_id);

COMMENT ON TABLE task_tags IS 'Many-to-many relationship between tasks and tags';
