-- Migration: Drop Mindmap Feature Tables
-- Description: Remove mindmap_views, mindmap_nodes, mindmap_edges tables and mindmap_entity_type enum
--
-- This migration removes the mindmap feature from the application.
-- The feature was never released to production and is being removed to simplify the codebase.

-- ============================================================================
-- DROP RLS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own mindmap views" ON mindmap_views;
DROP POLICY IF EXISTS "Users can manage own mindmap views" ON mindmap_views;
DROP POLICY IF EXISTS "Users can view own mindmap nodes" ON mindmap_nodes;
DROP POLICY IF EXISTS "Users can manage own mindmap nodes" ON mindmap_nodes;
DROP POLICY IF EXISTS "Users can view own mindmap edges" ON mindmap_edges;
DROP POLICY IF EXISTS "Users can manage own mindmap edges" ON mindmap_edges;

-- ============================================================================
-- DROP TRIGGERS
-- ============================================================================

DROP TRIGGER IF EXISTS mindmap_views_updated_at ON mindmap_views;
DROP TRIGGER IF EXISTS mindmap_nodes_updated_at ON mindmap_nodes;

-- ============================================================================
-- DROP TABLES (in order due to foreign key constraints)
-- ============================================================================

-- Drop edges first (references nodes)
DROP TABLE IF EXISTS mindmap_edges;

-- Drop nodes (references views)
DROP TABLE IF EXISTS mindmap_nodes;

-- Drop views (base table)
DROP TABLE IF EXISTS mindmap_views;

-- ============================================================================
-- DROP ENUM TYPE
-- ============================================================================

DROP TYPE IF EXISTS mindmap_entity_type;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON SCHEMA public IS 'Mindmap feature has been removed from this schema';
