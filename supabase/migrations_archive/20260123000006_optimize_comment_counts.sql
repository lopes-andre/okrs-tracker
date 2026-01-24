-- Optimize comment counting with a server-side function
-- This replaces client-side row fetching with efficient SQL aggregation

-- Function to get comment counts (total and unread) for multiple tasks
CREATE OR REPLACE FUNCTION get_tasks_comment_counts(
  p_task_ids UUID[],
  p_user_id UUID
)
RETURNS TABLE (
  task_id UUID,
  total_count BIGINT,
  unread_count BIGINT
)
LANGUAGE SQL
STABLE
AS $$
  SELECT
    c.task_id,
    COUNT(*) AS total_count,
    COUNT(*) FILTER (
      WHERE cr.last_read_at IS NULL
      OR c.created_at > cr.last_read_at
    ) AS unread_count
  FROM comments c
  LEFT JOIN comment_reads cr
    ON cr.task_id = c.task_id
    AND cr.user_id = p_user_id
  WHERE c.task_id = ANY(p_task_ids)
  GROUP BY c.task_id;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_tasks_comment_counts(UUID[], UUID) TO authenticated;
