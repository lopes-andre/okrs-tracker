-- Migration: Comments and Notifications for Phase 2: Communication
-- Description: Add comments on tasks, @mentions, and real-time notifications

-- ============================================================================
-- COMMENTS TABLE
-- ============================================================================

CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_comments_task_id ON comments(task_id);
CREATE INDEX idx_comments_user_id ON comments(user_id);
CREATE INDEX idx_comments_plan_id ON comments(plan_id);
CREATE INDEX idx_comments_created_at ON comments(created_at DESC);

-- Auto-update timestamp trigger
CREATE TRIGGER comments_updated_at
  BEFORE UPDATE ON comments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================================
-- COMMENT MENTIONS TABLE (junction table for @mentions)
-- ============================================================================

CREATE TABLE comment_mentions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(comment_id, user_id)
);

-- Index for finding mentions by user
CREATE INDEX idx_comment_mentions_user_id ON comment_mentions(user_id);
CREATE INDEX idx_comment_mentions_comment_id ON comment_mentions(comment_id);

-- ============================================================================
-- NOTIFICATION TYPE ENUM
-- ============================================================================

CREATE TYPE notification_type AS ENUM (
  'mentioned',       -- @mentioned in a comment
  'comment',         -- Someone commented on your task
  'assigned',        -- Assigned to a task
  'unassigned',      -- Removed from a task
  'task_completed',  -- Task you're assigned to was completed
  'task_updated'     -- Task you're assigned to was updated
);

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
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, read) WHERE read = FALSE;
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX idx_notifications_plan_id ON notifications(plan_id);

-- ============================================================================
-- ROW LEVEL SECURITY - COMMENTS
-- ============================================================================

ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- Users can view comments in plans they're members of
CREATE POLICY "Users can view comments in their plans" ON comments
  FOR SELECT USING (
    plan_id IN (
      SELECT plan_id FROM plan_members WHERE user_id = auth.uid()
    )
  );

-- Editors and owners can create comments
CREATE POLICY "Editors can create comments" ON comments
  FOR INSERT WITH CHECK (
    plan_id IN (
      SELECT plan_id FROM plan_members
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'editor')
    )
    AND user_id = auth.uid()
  );

-- Users can update their own comments
CREATE POLICY "Users can update own comments" ON comments
  FOR UPDATE USING (
    user_id = auth.uid()
  ) WITH CHECK (
    user_id = auth.uid()
  );

-- Users can delete their own comments, owners can delete any
CREATE POLICY "Users can delete own comments or owners can delete any" ON comments
  FOR DELETE USING (
    user_id = auth.uid()
    OR plan_id IN (
      SELECT plan_id FROM plan_members
      WHERE user_id = auth.uid()
      AND role = 'owner'
    )
  );

-- ============================================================================
-- ROW LEVEL SECURITY - COMMENT MENTIONS
-- ============================================================================

ALTER TABLE comment_mentions ENABLE ROW LEVEL SECURITY;

-- Users can view mentions in plans they're members of
CREATE POLICY "Users can view mentions in their plans" ON comment_mentions
  FOR SELECT USING (
    comment_id IN (
      SELECT id FROM comments WHERE plan_id IN (
        SELECT plan_id FROM plan_members WHERE user_id = auth.uid()
      )
    )
  );

-- Comment authors can create mentions
CREATE POLICY "Comment authors can create mentions" ON comment_mentions
  FOR INSERT WITH CHECK (
    comment_id IN (
      SELECT id FROM comments WHERE user_id = auth.uid()
    )
  );

-- Mentions are deleted via CASCADE when comment is deleted
CREATE POLICY "Comment authors can delete mentions" ON comment_mentions
  FOR DELETE USING (
    comment_id IN (
      SELECT id FROM comments WHERE user_id = auth.uid()
    )
  );

-- ============================================================================
-- ROW LEVEL SECURITY - NOTIFICATIONS
-- ============================================================================

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users can only view their own notifications
CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT USING (user_id = auth.uid());

-- System/triggers create notifications (use service role for this)
-- For now, allow users in the same plan to create notifications for others
CREATE POLICY "Plan members can create notifications" ON notifications
  FOR INSERT WITH CHECK (
    plan_id IN (
      SELECT plan_id FROM plan_members WHERE user_id = auth.uid()
    )
  );

-- Users can update (mark read) their own notifications
CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own notifications
CREATE POLICY "Users can delete own notifications" ON notifications
  FOR DELETE USING (user_id = auth.uid());

-- ============================================================================
-- ENABLE REALTIME FOR NOTIFICATIONS
-- ============================================================================

ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- ============================================================================
-- ADD TO EVENT ENTITY TYPE (for activity logging if needed)
-- ============================================================================

-- Add 'comment' to event_entity_type enum if we want to track comment activity
ALTER TYPE event_entity_type ADD VALUE IF NOT EXISTS 'comment';
