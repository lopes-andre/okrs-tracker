-- ============================================================================
-- Migration 006: UI Tables
-- ============================================================================
-- Creates dashboard and widget tables for UI persistence.
-- Note: saved_views table removed (feature never implemented).
-- ============================================================================

-- ============================================================================
-- DASHBOARDS TABLE
-- ============================================================================
-- Custom dashboards for a plan

CREATE TABLE dashboards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_dashboards_plan_id ON dashboards(plan_id);
CREATE INDEX idx_dashboards_created_by ON dashboards(created_by);

-- Ensure only one default dashboard per plan
CREATE UNIQUE INDEX idx_dashboards_default
  ON dashboards(plan_id)
  WHERE is_default = TRUE;

CREATE TRIGGER dashboards_updated_at
  BEFORE UPDATE ON dashboards
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE dashboards IS 'Custom dashboards for plans';

-- ============================================================================
-- DASHBOARD_WIDGETS TABLE
-- ============================================================================
-- Widgets within a dashboard (JSON-based config)

CREATE TABLE dashboard_widgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dashboard_id UUID NOT NULL REFERENCES dashboards(id) ON DELETE CASCADE,
  widget_type TEXT NOT NULL,
  title TEXT,
  config JSONB NOT NULL DEFAULT '{}',
  position_x INT NOT NULL DEFAULT 0,
  position_y INT NOT NULL DEFAULT 0,
  width INT NOT NULL DEFAULT 1 CHECK (width > 0),
  height INT NOT NULL DEFAULT 1 CHECK (height > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_dashboard_widgets_dashboard_id ON dashboard_widgets(dashboard_id);
CREATE INDEX idx_dashboard_widgets_type ON dashboard_widgets(widget_type);

CREATE TRIGGER dashboard_widgets_updated_at
  BEFORE UPDATE ON dashboard_widgets
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE dashboard_widgets IS 'Widget configurations within dashboards';
COMMENT ON COLUMN dashboard_widgets.config IS 'JSON configuration specific to widget type';
