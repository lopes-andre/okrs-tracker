-- Migration: UI Persistence Tables
-- Description: Create mindmap_views, mindmap_nodes, mindmap_edges, dashboards, dashboard_widgets, and saved_views tables

-- ============================================================================
-- MINDMAP_VIEWS TABLE
-- ============================================================================
-- Stores user's mindmap viewport settings per plan

CREATE TABLE mindmap_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  viewport_x NUMERIC NOT NULL DEFAULT 0,
  viewport_y NUMERIC NOT NULL DEFAULT 0,
  viewport_zoom NUMERIC NOT NULL DEFAULT 1.0 CHECK (viewport_zoom > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- One view per user per plan
  UNIQUE(plan_id, user_id)
);

-- Indexes
CREATE INDEX idx_mindmap_views_plan_id ON mindmap_views(plan_id);
CREATE INDEX idx_mindmap_views_user_id ON mindmap_views(user_id);

-- Trigger for updated_at
CREATE TRIGGER mindmap_views_updated_at
  BEFORE UPDATE ON mindmap_views
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE mindmap_views IS 'User-specific mindmap viewport settings';

-- ============================================================================
-- MINDMAP_NODES TABLE
-- ============================================================================
-- Stores node positions in the mindmap

CREATE TABLE mindmap_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mindmap_view_id UUID NOT NULL REFERENCES mindmap_views(id) ON DELETE CASCADE,
  entity_type mindmap_entity_type NOT NULL,
  entity_id UUID NOT NULL,
  position_x NUMERIC NOT NULL DEFAULT 0,
  position_y NUMERIC NOT NULL DEFAULT 0,
  is_collapsed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- One node per entity per view
  UNIQUE(mindmap_view_id, entity_type, entity_id)
);

-- Indexes
CREATE INDEX idx_mindmap_nodes_view_id ON mindmap_nodes(mindmap_view_id);
CREATE INDEX idx_mindmap_nodes_entity ON mindmap_nodes(entity_type, entity_id);

-- Trigger for updated_at
CREATE TRIGGER mindmap_nodes_updated_at
  BEFORE UPDATE ON mindmap_nodes
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE mindmap_nodes IS 'Node positions in mindmap visualizations';

-- ============================================================================
-- MINDMAP_EDGES TABLE
-- ============================================================================
-- Stores custom edges (connections) in the mindmap

CREATE TABLE mindmap_edges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mindmap_view_id UUID NOT NULL REFERENCES mindmap_views(id) ON DELETE CASCADE,
  source_node_id UUID NOT NULL REFERENCES mindmap_nodes(id) ON DELETE CASCADE,
  target_node_id UUID NOT NULL REFERENCES mindmap_nodes(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Prevent duplicate edges
  UNIQUE(mindmap_view_id, source_node_id, target_node_id),
  -- Prevent self-referencing edges
  CHECK (source_node_id != target_node_id)
);

-- Indexes
CREATE INDEX idx_mindmap_edges_view_id ON mindmap_edges(mindmap_view_id);
CREATE INDEX idx_mindmap_edges_source ON mindmap_edges(source_node_id);
CREATE INDEX idx_mindmap_edges_target ON mindmap_edges(target_node_id);

COMMENT ON TABLE mindmap_edges IS 'Custom connections between mindmap nodes';

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

-- Indexes
CREATE INDEX idx_dashboards_plan_id ON dashboards(plan_id);
CREATE INDEX idx_dashboards_created_by ON dashboards(created_by);

-- Trigger for updated_at
CREATE TRIGGER dashboards_updated_at
  BEFORE UPDATE ON dashboards
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- Ensure only one default dashboard per plan
CREATE UNIQUE INDEX idx_dashboards_default 
  ON dashboards(plan_id) 
  WHERE is_default = TRUE;

COMMENT ON TABLE dashboards IS 'Custom dashboards for plans';

-- ============================================================================
-- DASHBOARD_WIDGETS TABLE
-- ============================================================================
-- Widgets within a dashboard (JSON-based config)

CREATE TABLE dashboard_widgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dashboard_id UUID NOT NULL REFERENCES dashboards(id) ON DELETE CASCADE,
  widget_type TEXT NOT NULL, -- e.g., "progress_chart", "kr_list", "activity_feed"
  title TEXT,
  config JSONB NOT NULL DEFAULT '{}', -- Widget-specific configuration
  position_x INT NOT NULL DEFAULT 0,
  position_y INT NOT NULL DEFAULT 0,
  width INT NOT NULL DEFAULT 1 CHECK (width > 0),
  height INT NOT NULL DEFAULT 1 CHECK (height > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_dashboard_widgets_dashboard_id ON dashboard_widgets(dashboard_id);
CREATE INDEX idx_dashboard_widgets_type ON dashboard_widgets(widget_type);

-- Trigger for updated_at
CREATE TRIGGER dashboard_widgets_updated_at
  BEFORE UPDATE ON dashboard_widgets
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE dashboard_widgets IS 'Widget configurations within dashboards';
COMMENT ON COLUMN dashboard_widgets.config IS 'JSON configuration specific to widget type';

-- ============================================================================
-- SAVED_VIEWS TABLE
-- ============================================================================
-- Saved filter/sort configurations per user

CREATE TABLE saved_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  view_type TEXT NOT NULL, -- e.g., "okrs", "tasks", "timeline"
  filters JSONB NOT NULL DEFAULT '{}',
  sort_by TEXT,
  sort_order TEXT CHECK (sort_order IN ('asc', 'desc')),
  columns TEXT[], -- Array of visible columns
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_saved_views_plan_id ON saved_views(plan_id);
CREATE INDEX idx_saved_views_user_id ON saved_views(user_id);
CREATE INDEX idx_saved_views_view_type ON saved_views(view_type);

-- Trigger for updated_at
CREATE TRIGGER saved_views_updated_at
  BEFORE UPDATE ON saved_views
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- Ensure only one default view per type per user per plan
CREATE UNIQUE INDEX idx_saved_views_default 
  ON saved_views(plan_id, user_id, view_type) 
  WHERE is_default = TRUE;

COMMENT ON TABLE saved_views IS 'User-specific saved filter/sort configurations';
