-- ============================================================================
-- Migration 019: Content Post Favorites
-- ============================================================================
-- Adds favorite/star feature to content posts for quick access and prioritization.
-- ============================================================================

-- Add is_favorite column to content_posts
ALTER TABLE content_posts ADD COLUMN is_favorite BOOLEAN NOT NULL DEFAULT FALSE;

-- Create index for efficient filtering by favorites
CREATE INDEX idx_content_posts_favorites ON content_posts(plan_id, is_favorite) WHERE is_favorite = TRUE;

-- Update RLS policies to include is_favorite in the allowed updates
-- (Existing policies already cover this since they allow ALL operations for editors)

COMMENT ON COLUMN content_posts.is_favorite IS 'Whether this post is marked as a favorite for quick access';

-- ============================================================================
-- Update get_content_posts_with_details to include is_favorite and media counts
-- ============================================================================

CREATE OR REPLACE FUNCTION get_content_posts_with_details(p_plan_id UUID)
RETURNS TABLE (
  id UUID,
  plan_id UUID,
  title TEXT,
  description TEXT,
  status content_post_status,
  created_by UUID,
  display_order INTEGER,
  is_favorite BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  goals JSONB,
  distribution_count BIGINT,
  scheduled_count BIGINT,
  posted_count BIGINT,
  media_count BIGINT,
  link_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.plan_id,
    p.title,
    p.description,
    p.status,
    p.created_by,
    p.display_order,
    p.is_favorite,
    p.created_at,
    p.updated_at,
    COALESCE(
      (
        SELECT jsonb_agg(jsonb_build_object(
          'id', g.id,
          'name', g.name,
          'color', g.color
        ))
        FROM content_post_goals pg
        JOIN content_goals g ON pg.goal_id = g.id
        WHERE pg.post_id = p.id
      ),
      '[]'::jsonb
    ) AS goals,
    (SELECT COUNT(*) FROM content_distributions d WHERE d.post_id = p.id) AS distribution_count,
    (SELECT COUNT(*) FROM content_distributions d WHERE d.post_id = p.id AND d.status = 'scheduled') AS scheduled_count,
    (SELECT COUNT(*) FROM content_distributions d WHERE d.post_id = p.id AND d.status = 'posted') AS posted_count,
    (SELECT COUNT(*) FROM content_post_media m WHERE m.post_id = p.id) AS media_count,
    (SELECT COUNT(*) FROM content_post_links l WHERE l.post_id = p.id) AS link_count
  FROM content_posts p
  WHERE p.plan_id = p_plan_id
  ORDER BY p.is_favorite DESC, p.status, p.display_order;
END;
$$;

COMMENT ON FUNCTION get_content_posts_with_details(UUID) IS 'Get content posts with aggregated goals, distribution counts, and media/link counts. Favorites are shown first.';
