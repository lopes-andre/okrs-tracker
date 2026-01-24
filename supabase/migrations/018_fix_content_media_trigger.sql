-- ============================================================================
-- Migration 018: Fix Content Media Cleanup Trigger
-- ============================================================================
-- Fixes the cleanup_content_post_media trigger function to use the correct
-- column name (file_url instead of storage_path).
-- ============================================================================

-- Drop the existing trigger first
DROP TRIGGER IF EXISTS content_posts_cleanup_media ON content_posts;

-- Replace the function with the corrected column name
CREATE OR REPLACE FUNCTION cleanup_content_post_media()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_media RECORD;
BEGIN
  -- Log the paths that need cleanup
  -- The actual storage files need to be cleaned up separately via application code
  FOR v_media IN
    SELECT file_url FROM content_post_media WHERE post_id = OLD.id
  LOOP
    RAISE NOTICE 'Media file to cleanup: %', v_media.file_url;
  END LOOP;

  RETURN OLD;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER content_posts_cleanup_media
  BEFORE DELETE ON content_posts
  FOR EACH ROW EXECUTE FUNCTION cleanup_content_post_media();

COMMENT ON FUNCTION cleanup_content_post_media() IS
  'Logs media files that need cleanup when a content post is deleted';
