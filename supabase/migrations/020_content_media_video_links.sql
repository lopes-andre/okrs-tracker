-- ============================================================================
-- Migration 020: Content Media - Video Links Support
-- ============================================================================
-- Adds support for external video links as media type, with optional thumbnails.
-- ============================================================================

-- Add new columns to content_post_media for video link support
ALTER TABLE content_post_media
  ADD COLUMN media_type TEXT NOT NULL DEFAULT 'file',
  ADD COLUMN is_external BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN thumbnail_url TEXT;

-- Update existing records to have correct media_type based on file_type
UPDATE content_post_media
SET media_type = CASE
  WHEN file_type = 'image' OR file_type LIKE 'image/%' THEN 'image'
  WHEN file_type = 'pdf' OR file_type LIKE 'application/pdf' THEN 'pdf'
  WHEN file_type = 'video' OR file_type LIKE 'video/%' THEN 'video'
  ELSE 'file'
END;

-- Add constraint for media_type values
ALTER TABLE content_post_media
  ADD CONSTRAINT chk_media_type CHECK (media_type IN ('image', 'pdf', 'video', 'video_link', 'file'));

-- Add index for media_type filtering
CREATE INDEX idx_content_post_media_type ON content_post_media(post_id, media_type);

-- Comments
COMMENT ON COLUMN content_post_media.media_type IS 'Type of media: image, pdf, video (uploaded), video_link (external), file (other)';
COMMENT ON COLUMN content_post_media.is_external IS 'Whether this media is an external link (true) or uploaded file (false)';
COMMENT ON COLUMN content_post_media.thumbnail_url IS 'Optional thumbnail URL for video links (uploaded to storage or generated)';
