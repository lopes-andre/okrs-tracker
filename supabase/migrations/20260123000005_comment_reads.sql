-- Migration: Comment Reads Table
-- Description: Track when users last viewed comments on a task for unread indicators

-- ============================================================================
-- COMMENT READS TABLE
-- ============================================================================

-- Tracks the last time a user viewed comments on a specific task
-- Any comment created after this timestamp is considered "unread"
CREATE TABLE comment_reads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  last_read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(task_id, user_id)
);

-- Indexes for performance
CREATE INDEX idx_comment_reads_task_id ON comment_reads(task_id);
CREATE INDEX idx_comment_reads_user_id ON comment_reads(user_id);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE comment_reads ENABLE ROW LEVEL SECURITY;

-- Users can view their own read timestamps
CREATE POLICY "Users can view own comment reads" ON comment_reads
  FOR SELECT USING (user_id = auth.uid());

-- Users can insert their own read timestamps
CREATE POLICY "Users can insert own comment reads" ON comment_reads
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Users can update their own read timestamps
CREATE POLICY "Users can update own comment reads" ON comment_reads
  FOR UPDATE USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own read timestamps
CREATE POLICY "Users can delete own comment reads" ON comment_reads
  FOR DELETE USING (user_id = auth.uid());
