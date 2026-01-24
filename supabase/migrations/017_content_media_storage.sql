-- ============================================================================
-- Migration 017: Content Media Storage - SQL Components
-- ============================================================================
-- This migration creates helper functions for content media storage.
--
-- IMPORTANT: The storage bucket and RLS policies must be created manually
-- via Supabase Dashboard or CLI. See instructions below.
-- ============================================================================

-- ============================================================================
-- MANUAL SETUP REQUIRED (via Supabase Dashboard)
-- ============================================================================
-- 1. Go to Storage in your Supabase Dashboard
-- 2. Create a new bucket with:
--    - Name: content-media
--    - Public: OFF (private)
--    - File size limit: 10MB
--    - Allowed MIME types: image/jpeg, image/png, image/webp, image/gif, application/pdf
--
-- 3. Add the following RLS policies to the bucket:
--
-- Policy: "Editors can upload content media" (INSERT)
--   - Target roles: authenticated
--   - WITH CHECK: (bucket_id = 'content-media' AND (storage.foldername(name))[1] IN (
--       SELECT plan_id::text FROM plan_members WHERE user_id = auth.uid() AND role IN ('owner', 'editor')
--     ))
--
-- Policy: "Members can view content media" (SELECT)
--   - Target roles: authenticated
--   - USING: (bucket_id = 'content-media' AND (storage.foldername(name))[1] IN (
--       SELECT plan_id::text FROM plan_members WHERE user_id = auth.uid()
--     ))
--
-- Policy: "Editors can update content media" (UPDATE)
--   - Target roles: authenticated
--   - USING/WITH CHECK: (bucket_id = 'content-media' AND (storage.foldername(name))[1] IN (
--       SELECT plan_id::text FROM plan_members WHERE user_id = auth.uid() AND role IN ('owner', 'editor')
--     ))
--
-- Policy: "Editors can delete content media" (DELETE)
--   - Target roles: authenticated
--   - USING: (bucket_id = 'content-media' AND (storage.foldername(name))[1] IN (
--       SELECT plan_id::text FROM plan_members WHERE user_id = auth.uid() AND role IN ('owner', 'editor')
--     ))
-- ============================================================================

-- ============================================================================
-- HELPER FUNCTION: Generate storage path
-- ============================================================================
-- Generates a consistent path for content media files
-- Path format: {plan_id}/{post_id}/{sanitized_filename}

CREATE OR REPLACE FUNCTION generate_content_media_path(
  p_plan_id UUID,
  p_post_id UUID,
  p_filename TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  -- Sanitize filename: remove special characters, keep extension
  RETURN p_plan_id::TEXT || '/' || p_post_id::TEXT || '/' ||
         regexp_replace(p_filename, '[^a-zA-Z0-9._-]', '_', 'g');
END;
$$;

COMMENT ON FUNCTION generate_content_media_path(UUID, UUID, TEXT) IS
  'Generates a storage path for content media files: {plan_id}/{post_id}/{sanitized_filename}';

-- ============================================================================
-- FUNCTION: Cleanup orphaned media files (logging only)
-- ============================================================================
-- Called when a content_post is deleted to log associated media files
-- Note: Actual file deletion should be handled via Edge Function or application code

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
    SELECT storage_path FROM content_post_media WHERE post_id = OLD.id
  LOOP
    RAISE NOTICE 'Media file to cleanup: %', v_media.storage_path;
  END LOOP;

  RETURN OLD;
END;
$$;

-- Trigger to log media cleanup needs when posts are deleted
DROP TRIGGER IF EXISTS content_posts_cleanup_media ON content_posts;
CREATE TRIGGER content_posts_cleanup_media
  BEFORE DELETE ON content_posts
  FOR EACH ROW EXECUTE FUNCTION cleanup_content_post_media();

COMMENT ON FUNCTION cleanup_content_post_media() IS
  'Logs media files that need cleanup when a content post is deleted';
