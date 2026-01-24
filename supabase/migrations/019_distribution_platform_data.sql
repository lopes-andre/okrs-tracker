-- Migration: Add platform_specific_data to content_distributions
-- This column stores platform-specific fields like captions, hashtags, visibility settings, etc.

-- Add platform_specific_data column
ALTER TABLE content_distributions
ADD COLUMN IF NOT EXISTS platform_specific_data JSONB DEFAULT '{}'::jsonb;

-- Add comment explaining the column
COMMENT ON COLUMN content_distributions.platform_specific_data IS 'Platform-specific fields: caption, hashtags, location, alt_text, visibility, episode_title, etc.';
