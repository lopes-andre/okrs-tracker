-- Migration: Fix content_campaigns schema
-- Description: Add missing columns to match TypeScript types
-- - budget_spent: Track total spend (aggregated from check-ins)
-- - created_by: Track who created the campaign
-- - description: Campaign description (rename notes column)

-- Add budget_spent column (defaults to 0)
ALTER TABLE content_campaigns
ADD COLUMN IF NOT EXISTS budget_spent DECIMAL(12, 2) DEFAULT 0;

COMMENT ON COLUMN content_campaigns.budget_spent IS 'Total budget spent (can be updated from check-ins)';

-- Add created_by column
ALTER TABLE content_campaigns
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES profiles(id) ON DELETE SET NULL;

COMMENT ON COLUMN content_campaigns.created_by IS 'User who created the campaign';

-- Rename notes to description for consistency with API
ALTER TABLE content_campaigns
RENAME COLUMN notes TO description;

COMMENT ON COLUMN content_campaigns.description IS 'Campaign description and notes';
