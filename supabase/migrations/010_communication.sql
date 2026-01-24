-- ============================================================================
-- Migration 010: Communication
-- ============================================================================
-- Creates comments, mentions, notifications, and read tracking tables.
-- ============================================================================

-- ============================================================================
-- COMMENTS TABLE
-- ============================================================================

CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_comments_task_id ON comments(task_id);
CREATE INDEX idx_comments_user_id ON comments(user_id);
CREATE INDEX idx_comments_plan_id ON comments(plan_id);
CREATE INDEX idx_comments_created_at ON comments(created_at DESC);

CREATE TRIGGER comments_updated_at
  BEFORE UPDATE ON comments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE comments IS 'Task comments for team communication';

-- ============================================================================
-- COMMENT MENTIONS TABLE
-- ============================================================================
-- Junction table for @mentions in comments

CREATE TABLE comment_mentions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(comment_id, user_id)
);

CREATE INDEX idx_comment_mentions_user_id ON comment_mentions(user_id);
CREATE INDEX idx_comment_mentions_comment_id ON comment_mentions(comment_id);

COMMENT ON TABLE comment_mentions IS 'Tracks @mentions within comments';

-- ============================================================================
-- NOTIFICATIONS TABLE
-- ============================================================================

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, read) WHERE read = FALSE;
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX idx_notifications_plan_id ON notifications(plan_id);

COMMENT ON TABLE notifications IS 'User notifications for mentions, comments, and assignments';
COMMENT ON COLUMN notifications.actor_id IS 'User who triggered the notification';

-- ============================================================================
-- COMMENT READS TABLE
-- ============================================================================
-- Tracks when users last viewed comments on a task for unread indicators

CREATE TABLE comment_reads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  last_read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(task_id, user_id)
);

CREATE INDEX idx_comment_reads_task_id ON comment_reads(task_id);
CREATE INDEX idx_comment_reads_user_id ON comment_reads(user_id);

COMMENT ON TABLE comment_reads IS 'Tracks last read timestamp per user per task for unread indicators';

