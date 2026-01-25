-- Migration: Add 'started' to event_type enum
-- Description: The 'started' value was missing from the deployed database enum

-- Add 'started' value to event_type enum if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'started'
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'event_type')
  ) THEN
    ALTER TYPE event_type ADD VALUE 'started';
  END IF;
END
$$;
