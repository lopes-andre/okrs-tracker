-- =============================================================================
-- PRODUCTION DATABASE CLEANUP SCRIPT: Remove Mindmap Feature
-- =============================================================================
--
-- Purpose: Remove the mindmap feature tables, policies, triggers, and enum type
--
-- Instructions:
-- 1. Connect to your production Supabase database
-- 2. Run this script in the SQL Editor
-- 3. Verify the tables were dropped by checking the schema
--
-- WARNING: This script is DESTRUCTIVE. Ensure you have backups before running.
-- =============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: Drop RLS Policies
-- ============================================================================
-- These must be dropped before the tables can be removed

DROP POLICY IF EXISTS "Users can view own mindmap views" ON mindmap_views;
DROP POLICY IF EXISTS "Users can manage own mindmap views" ON mindmap_views;
DROP POLICY IF EXISTS "Users can view own mindmap nodes" ON mindmap_nodes;
DROP POLICY IF EXISTS "Users can manage own mindmap nodes" ON mindmap_nodes;
DROP POLICY IF EXISTS "Users can view own mindmap edges" ON mindmap_edges;
DROP POLICY IF EXISTS "Users can manage own mindmap edges" ON mindmap_edges;

-- ============================================================================
-- STEP 2: Drop Triggers
-- ============================================================================

DROP TRIGGER IF EXISTS mindmap_views_updated_at ON mindmap_views;
DROP TRIGGER IF EXISTS mindmap_nodes_updated_at ON mindmap_nodes;

-- ============================================================================
-- STEP 3: Drop Tables (order matters due to foreign key constraints)
-- ============================================================================

-- First, check if tables exist and have data (informational only)
DO $$
DECLARE
    views_count INTEGER;
    nodes_count INTEGER;
    edges_count INTEGER;
BEGIN
    -- Get counts before deletion
    SELECT COUNT(*) INTO views_count FROM mindmap_views;
    SELECT COUNT(*) INTO nodes_count FROM mindmap_nodes;
    SELECT COUNT(*) INTO edges_count FROM mindmap_edges;

    RAISE NOTICE 'Mindmap data counts before deletion:';
    RAISE NOTICE '  - mindmap_views: % rows', views_count;
    RAISE NOTICE '  - mindmap_nodes: % rows', nodes_count;
    RAISE NOTICE '  - mindmap_edges: % rows', edges_count;
EXCEPTION
    WHEN undefined_table THEN
        RAISE NOTICE 'Some or all mindmap tables do not exist (already removed?)';
END $$;

-- Drop edges first (references nodes via foreign key)
DROP TABLE IF EXISTS mindmap_edges CASCADE;

-- Drop nodes (references views via foreign key)
DROP TABLE IF EXISTS mindmap_nodes CASCADE;

-- Drop views (base table)
DROP TABLE IF EXISTS mindmap_views CASCADE;

-- ============================================================================
-- STEP 4: Drop Enum Type
-- ============================================================================

DROP TYPE IF EXISTS mindmap_entity_type CASCADE;

-- ============================================================================
-- STEP 5: Verification
-- ============================================================================

DO $$
BEGIN
    -- Verify tables are gone
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'mindmap_views') THEN
        RAISE EXCEPTION 'ERROR: mindmap_views table still exists!';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'mindmap_nodes') THEN
        RAISE EXCEPTION 'ERROR: mindmap_nodes table still exists!';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'mindmap_edges') THEN
        RAISE EXCEPTION 'ERROR: mindmap_edges table still exists!';
    END IF;

    -- Verify enum is gone
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'mindmap_entity_type') THEN
        RAISE EXCEPTION 'ERROR: mindmap_entity_type enum still exists!';
    END IF;

    RAISE NOTICE '✓ All mindmap tables and types successfully removed!';
END $$;

COMMIT;

-- ============================================================================
-- POST-EXECUTION NOTES
-- ============================================================================
--
-- After running this script:
-- 1. The mindmap_views, mindmap_nodes, and mindmap_edges tables are removed
-- 2. The mindmap_entity_type enum is removed
-- 3. All associated RLS policies and triggers are removed
--
-- The following remain unchanged:
-- - dashboards table (separate feature)
-- - dashboard_widgets table (separate feature)
-- - saved_views table (separate feature)
--
-- If you need to restore this feature, you'll need to:
-- 1. Re-run the original migration: 20260108000001_enums_and_functions.sql (for enum)
-- 2. Re-run the original migration: 20260108000005_ui_tables.sql (for tables)
-- 3. Re-run the original migration: 20260108000007_rls_policies.sql (for policies)
-- =============================================================================
