-- Migration: Add overall progress snapshot to weekly reviews
-- Description: Store overall progress at review completion time

-- Add column for overall progress percentage (stored as 0-100)
ALTER TABLE weekly_reviews ADD COLUMN IF NOT EXISTS stats_overall_progress INTEGER DEFAULT 0;
ALTER TABLE weekly_reviews ADD COLUMN IF NOT EXISTS stats_total_krs INTEGER DEFAULT 0;

COMMENT ON COLUMN weekly_reviews.stats_overall_progress IS 'Overall YTD progress percentage (0-100) at review completion time';
COMMENT ON COLUMN weekly_reviews.stats_total_krs IS 'Total number of active KRs at review completion time';
