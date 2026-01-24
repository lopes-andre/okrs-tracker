-- ============================================================================
-- Migration 017: Content Media Storage
-- ============================================================================
-- Creates storage bucket and RLS policies for content media files.
-- Files are organized as: {plan_id}/{post_id}/{filename}
-- ============================================================================

-- ============================================================================
-- CREATE STORAGE BUCKET
-- ============================================================================
-- Note: Bucket creation via SQL requires running as service role or via
-- dashboard. This migration sets up the policies assuming the bucket exists.
-- The bucket should be created with:
--   - Name: content-media
--   - Public: false
--   - File size limit: 10MB
--   - Allowed MIME types: image/jpeg, image/png, image/webp, image/gif, application/pdf

-- Create bucket if it doesn't exist (requires superuser/service role)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'content-media',
  'content-media',
  false,
  10485760, -- 10MB in bytes
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ============================================================================
-- RLS POLICIES FOR content-media BUCKET
-- ============================================================================

-- Helper function to extract plan_id from storage path
-- Path format: {plan_id}/{post_id}/{filename}
CREATE OR REPLACE FUNCTION storage.get_plan_id_from_path(path TEXT)
RETURNS UUID
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  -- Extract first segment (plan_id) from path
  RETURN (string_to_array(path, '/'))[1]::UUID;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$;

-- Policy: Users can upload files to plans they're editors of
CREATE POLICY "Editors can upload content media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'content-media'
  AND storage.get_plan_id_from_path(name) IN (
    SELECT plan_id FROM plan_members
    WHERE user_id = auth.uid()
    AND role IN ('owner', 'editor')
  )
);

-- Policy: Users can view files from plans they're members of
CREATE POLICY "Members can view content media"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'content-media'
  AND storage.get_plan_id_from_path(name) IN (
    SELECT plan_id FROM plan_members
    WHERE user_id = auth.uid()
  )
);

-- Policy: Users can update files in plans they're editors of
CREATE POLICY "Editors can update content media"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'content-media'
  AND storage.get_plan_id_from_path(name) IN (
    SELECT plan_id FROM plan_members
    WHERE user_id = auth.uid()
    AND role IN ('owner', 'editor')
  )
)
WITH CHECK (
  bucket_id = 'content-media'
  AND storage.get_plan_id_from_path(name) IN (
    SELECT plan_id FROM plan_members
    WHERE user_id = auth.uid()
    AND role IN ('owner', 'editor')
  )
);

-- Policy: Users can delete files from plans they're editors of
CREATE POLICY "Editors can delete content media"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'content-media'
  AND storage.get_plan_id_from_path(name) IN (
    SELECT plan_id FROM plan_members
    WHERE user_id = auth.uid()
    AND role IN ('owner', 'editor')
  )
);

-- ============================================================================
-- HELPER FUNCTION: Generate storage path
-- ============================================================================
-- Generates a consistent path for content media files

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
-- FUNCTION: Cleanup orphaned media files
-- ============================================================================
-- Called when a content_post is deleted to remove associated media files
-- Note: This function uses storage.delete which requires storage admin privileges
-- In production, this would typically be handled via a Edge Function or webhook

CREATE OR REPLACE FUNCTION cleanup_content_post_media()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_media RECORD;
BEGIN
  -- Delete all media records (cascade from content_post_media FK handles this)
  -- The actual storage files need to be cleaned up separately
  -- Log the paths that need cleanup
  FOR v_media IN
    SELECT storage_path FROM content_post_media WHERE post_id = OLD.id
  LOOP
    -- In production, queue these for cleanup via background job
    RAISE NOTICE 'Media file to cleanup: %', v_media.storage_path;
  END LOOP;

  RETURN OLD;
END;
$$;

-- Trigger to log media cleanup needs when posts are deleted
CREATE TRIGGER content_posts_cleanup_media
  BEFORE DELETE ON content_posts
  FOR EACH ROW EXECUTE FUNCTION cleanup_content_post_media();

COMMENT ON FUNCTION cleanup_content_post_media() IS
  'Logs media files that need cleanup when a content post is deleted';

