-- Enable Realtime for collaborative tables
-- This allows clients to subscribe to changes via Supabase Realtime

-- First, check if the tables are already in the publication and add them if not
-- Using DO block to handle cases where tables might already be in the publication

DO $$
BEGIN
  -- Enable realtime for objectives
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'objectives'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE objectives;
  END IF;

  -- Enable realtime for annual_krs
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'annual_krs'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE annual_krs;
  END IF;

  -- Enable realtime for quarter_targets
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'quarter_targets'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE quarter_targets;
  END IF;

  -- Enable realtime for tasks
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'tasks'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE tasks;
  END IF;

  -- Enable realtime for check_ins
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'check_ins'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE check_ins;
  END IF;

  -- Enable realtime for plan_members
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'plan_members'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE plan_members;
  END IF;

  -- Enable realtime for activity_events
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'activity_events'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE activity_events;
  END IF;

  -- Enable realtime for dashboards
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'dashboards'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE dashboards;
  END IF;

  -- Enable realtime for dashboard_widgets
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'dashboard_widgets'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE dashboard_widgets;
  END IF;

  -- Enable realtime for tags
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'tags'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE tags;
  END IF;

  -- Enable realtime for weekly_reviews
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'weekly_reviews'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE weekly_reviews;
  END IF;
END $$;

-- Add a comment explaining the realtime setup
COMMENT ON PUBLICATION supabase_realtime IS 'Publication for Supabase Realtime - includes tables for collaborative OKR tracking';
