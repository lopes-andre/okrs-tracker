-- ============================================================================
-- Migration 015: Content Planner Foundation
-- ============================================================================
-- Creates the foundation for the social media content planning system.
-- Includes platforms, accounts, goals, posts, distributions, and campaigns.
-- ============================================================================

-- ============================================================================
-- NEW ENUMS
-- ============================================================================

-- Content post status (Kanban-style workflow)
CREATE TYPE content_post_status AS ENUM (
  'backlog',    -- Idea captured, no platforms assigned
  'tagged',     -- Has platforms/accounts assigned but not scheduled
  'ongoing',    -- Some distributions scheduled/posted, not all complete
  'complete'    -- All distributions posted
);

-- Content distribution status
CREATE TYPE content_distribution_status AS ENUM (
  'draft',      -- Draft, not scheduled
  'scheduled',  -- Scheduled for future posting
  'posted'      -- Actually posted to platform
);

-- Content campaign status
CREATE TYPE content_campaign_status AS ENUM (
  'draft',
  'active',
  'paused',
  'completed'
);

-- Content campaign objective
CREATE TYPE content_campaign_objective AS ENUM (
  'awareness',
  'traffic',
  'engagement',
  'conversions'
);

-- Content account type
CREATE TYPE content_account_type AS ENUM (
  'personal',
  'business'
);

-- Add new entity types for activity events
ALTER TYPE event_entity_type ADD VALUE IF NOT EXISTS 'content_post';
ALTER TYPE event_entity_type ADD VALUE IF NOT EXISTS 'content_distribution';
ALTER TYPE event_entity_type ADD VALUE IF NOT EXISTS 'content_campaign';

-- ============================================================================
-- COMMENTS ON ENUMS
-- ============================================================================

COMMENT ON TYPE content_post_status IS 'Content post workflow status for Kanban board';
COMMENT ON TYPE content_distribution_status IS 'Status of a post distribution to a platform';
COMMENT ON TYPE content_campaign_status IS 'Paid campaign lifecycle status';
COMMENT ON TYPE content_campaign_objective IS 'Paid campaign optimization objective';
COMMENT ON TYPE content_account_type IS 'Type of social media account';

-- ============================================================================
-- TABLE: content_platforms
-- ============================================================================
-- Platform definitions (Instagram, LinkedIn, YouTube, etc.)
-- This is reference data, seeded once.

CREATE TABLE content_platforms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  icon TEXT NOT NULL,
  color TEXT NOT NULL,
  supported_formats JSONB NOT NULL DEFAULT '[]',
  available_metrics JSONB NOT NULL DEFAULT '[]',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_content_platforms_name ON content_platforms(name);
CREATE INDEX idx_content_platforms_active ON content_platforms(is_active) WHERE is_active = true;

CREATE TRIGGER content_platforms_updated_at
  BEFORE UPDATE ON content_platforms
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE content_platforms IS 'Social media platform definitions with supported formats and metrics';
COMMENT ON COLUMN content_platforms.name IS 'Unique identifier: instagram, linkedin, youtube, etc.';
COMMENT ON COLUMN content_platforms.supported_formats IS 'Array of format strings like ["post", "carousel", "reel", "story"]';
COMMENT ON COLUMN content_platforms.available_metrics IS 'Array of metric definitions this platform supports';

-- ============================================================================
-- TABLE: content_accounts
-- ============================================================================
-- User's accounts on each platform.

CREATE TABLE content_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  platform_id UUID NOT NULL REFERENCES content_platforms(id) ON DELETE RESTRICT,
  account_name TEXT NOT NULL,
  account_type content_account_type NOT NULL DEFAULT 'personal',
  linked_kr_id UUID REFERENCES annual_krs(id) ON DELETE SET NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  settings JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_content_accounts_plan ON content_accounts(plan_id);
CREATE INDEX idx_content_accounts_user ON content_accounts(user_id);
CREATE INDEX idx_content_accounts_platform ON content_accounts(platform_id);
CREATE INDEX idx_content_accounts_active ON content_accounts(plan_id, is_active) WHERE is_active = true;

CREATE TRIGGER content_accounts_updated_at
  BEFORE UPDATE ON content_accounts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE content_accounts IS 'User social media accounts linked to plans';
COMMENT ON COLUMN content_accounts.account_name IS 'Display name like "Personal", "Business", "Main"';
COMMENT ON COLUMN content_accounts.linked_kr_id IS 'Optional KR to auto-link tasks created from this account';
COMMENT ON COLUMN content_accounts.settings IS 'Platform-specific account settings (hashtag sets, posting preferences)';

-- ============================================================================
-- TABLE: content_goals
-- ============================================================================
-- User-defined content goals/intents (Authority, Audience, Viral, Sales, etc.)

CREATE TABLE content_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT,
  description TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Unique constraint on plan_id + lowercase name to prevent duplicates
CREATE UNIQUE INDEX idx_content_goals_unique_name ON content_goals(plan_id, LOWER(name));
CREATE INDEX idx_content_goals_plan ON content_goals(plan_id);
CREATE INDEX idx_content_goals_active ON content_goals(plan_id, is_active) WHERE is_active = true;

CREATE TRIGGER content_goals_updated_at
  BEFORE UPDATE ON content_goals
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE content_goals IS 'Content goals/intents like Authority, Audience Growth, Sales';
COMMENT ON COLUMN content_goals.name IS 'Goal name like "Authority", "Audience", "Viral"';
COMMENT ON COLUMN content_goals.color IS 'Color for visual distinction in UI';

-- ============================================================================
-- TABLE: content_posts
-- ============================================================================
-- The main post/content card entity.

CREATE TABLE content_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status content_post_status NOT NULL DEFAULT 'backlog',
  created_by UUID NOT NULL REFERENCES auth.users(id),
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_content_posts_plan ON content_posts(plan_id);
CREATE INDEX idx_content_posts_status ON content_posts(plan_id, status);
CREATE INDEX idx_content_posts_created_by ON content_posts(created_by);
CREATE INDEX idx_content_posts_order ON content_posts(plan_id, status, display_order);

CREATE TRIGGER content_posts_updated_at
  BEFORE UPDATE ON content_posts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE content_posts IS 'Main content post/idea entity for the Kanban board';
COMMENT ON COLUMN content_posts.title IS 'Short title or headline for the content';
COMMENT ON COLUMN content_posts.description IS 'Detailed content idea, notes, or body text';
COMMENT ON COLUMN content_posts.status IS 'Workflow status: backlog → tagged → ongoing → complete';
COMMENT ON COLUMN content_posts.display_order IS 'Order within status column for Kanban';

-- ============================================================================
-- TABLE: content_post_goals
-- ============================================================================
-- Junction table for post-to-goal many-to-many.

CREATE TABLE content_post_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES content_posts(id) ON DELETE CASCADE,
  goal_id UUID NOT NULL REFERENCES content_goals(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_content_post_goals_unique ON content_post_goals(post_id, goal_id);
CREATE INDEX idx_content_post_goals_post ON content_post_goals(post_id);
CREATE INDEX idx_content_post_goals_goal ON content_post_goals(goal_id);

COMMENT ON TABLE content_post_goals IS 'Junction table linking posts to content goals';

-- ============================================================================
-- TABLE: content_post_media
-- ============================================================================
-- Media files attached to posts.

CREATE TABLE content_post_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES content_posts(id) ON DELETE CASCADE,
  file_type TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  alt_text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_content_post_media_post ON content_post_media(post_id);
CREATE INDEX idx_content_post_media_order ON content_post_media(post_id, display_order);

COMMENT ON TABLE content_post_media IS 'Media files (images, PDFs, video links) attached to posts';
COMMENT ON COLUMN content_post_media.file_type IS 'Type: image, pdf, video_link';
COMMENT ON COLUMN content_post_media.file_url IS 'Supabase Storage URL or external link';
COMMENT ON COLUMN content_post_media.file_size IS 'File size in bytes (null for external links)';

-- ============================================================================
-- TABLE: content_post_links
-- ============================================================================
-- Reference links attached to posts.

CREATE TABLE content_post_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES content_posts(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  title TEXT,
  description TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_content_post_links_post ON content_post_links(post_id);
CREATE INDEX idx_content_post_links_order ON content_post_links(post_id, display_order);

COMMENT ON TABLE content_post_links IS 'Reference links attached to content posts';

-- ============================================================================
-- TABLE: content_distributions
-- ============================================================================
-- Where a post is being distributed (which platform/account).

CREATE TABLE content_distributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES content_posts(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES content_accounts(id) ON DELETE CASCADE,
  status content_distribution_status NOT NULL DEFAULT 'draft',
  format TEXT,
  caption TEXT,
  scheduled_at TIMESTAMPTZ,
  posted_at TIMESTAMPTZ,
  platform_post_url TEXT,
  platform_specific_data JSONB NOT NULL DEFAULT '{}',
  linked_task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Each post can only be distributed once per account
CREATE UNIQUE INDEX idx_content_distributions_unique ON content_distributions(post_id, account_id);
CREATE INDEX idx_content_distributions_post ON content_distributions(post_id);
CREATE INDEX idx_content_distributions_account ON content_distributions(account_id);
CREATE INDEX idx_content_distributions_status ON content_distributions(status);
CREATE INDEX idx_content_distributions_scheduled ON content_distributions(scheduled_at) WHERE scheduled_at IS NOT NULL;
CREATE INDEX idx_content_distributions_task ON content_distributions(linked_task_id) WHERE linked_task_id IS NOT NULL;

CREATE TRIGGER content_distributions_updated_at
  BEFORE UPDATE ON content_distributions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE content_distributions IS 'Distribution of a post to a specific platform/account';
COMMENT ON COLUMN content_distributions.format IS 'Platform-specific format: post, carousel, reel, story, etc.';
COMMENT ON COLUMN content_distributions.caption IS 'Platform-specific caption/description';
COMMENT ON COLUMN content_distributions.platform_specific_data IS 'Hashtags, mentions, settings per platform';
COMMENT ON COLUMN content_distributions.linked_task_id IS 'Auto-created task for this distribution';

-- ============================================================================
-- TABLE: content_distribution_metrics
-- ============================================================================
-- Check-in style metrics for each distribution.

CREATE TABLE content_distribution_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  distribution_id UUID NOT NULL REFERENCES content_distributions(id) ON DELETE CASCADE,
  checked_at TIMESTAMPTZ NOT NULL,
  checked_by UUID NOT NULL REFERENCES auth.users(id),
  metrics JSONB NOT NULL DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_content_distribution_metrics_dist ON content_distribution_metrics(distribution_id);
CREATE INDEX idx_content_distribution_metrics_checked ON content_distribution_metrics(distribution_id, checked_at);

COMMENT ON TABLE content_distribution_metrics IS 'Performance metrics check-ins for distributions';
COMMENT ON COLUMN content_distribution_metrics.metrics IS 'Platform-specific metrics snapshot (views, likes, comments, etc.)';

-- ============================================================================
-- TABLE: content_campaigns
-- ============================================================================
-- Paid media campaign tracking.

CREATE TABLE content_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  platform_id UUID NOT NULL REFERENCES content_platforms(id) ON DELETE RESTRICT,
  objective content_campaign_objective NOT NULL DEFAULT 'awareness',
  status content_campaign_status NOT NULL DEFAULT 'draft',
  budget_allocated DECIMAL(12, 2),
  start_date DATE,
  end_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_content_campaigns_plan ON content_campaigns(plan_id);
CREATE INDEX idx_content_campaigns_platform ON content_campaigns(platform_id);
CREATE INDEX idx_content_campaigns_status ON content_campaigns(plan_id, status);
CREATE INDEX idx_content_campaigns_dates ON content_campaigns(start_date, end_date);

CREATE TRIGGER content_campaigns_updated_at
  BEFORE UPDATE ON content_campaigns
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE content_campaigns IS 'Paid media campaign tracking';
COMMENT ON COLUMN content_campaigns.objective IS 'Campaign optimization objective';
COMMENT ON COLUMN content_campaigns.budget_allocated IS 'Total budget allocated for the campaign';

-- ============================================================================
-- TABLE: content_campaign_posts
-- ============================================================================
-- Junction for campaigns spanning multiple posts.

CREATE TABLE content_campaign_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES content_campaigns(id) ON DELETE CASCADE,
  distribution_id UUID NOT NULL REFERENCES content_distributions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_content_campaign_posts_unique ON content_campaign_posts(campaign_id, distribution_id);
CREATE INDEX idx_content_campaign_posts_campaign ON content_campaign_posts(campaign_id);
CREATE INDEX idx_content_campaign_posts_dist ON content_campaign_posts(distribution_id);

COMMENT ON TABLE content_campaign_posts IS 'Links campaigns to their promoted distributions';

-- ============================================================================
-- TABLE: content_campaign_checkins
-- ============================================================================
-- Check-ins for campaign performance.

CREATE TABLE content_campaign_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES content_campaigns(id) ON DELETE CASCADE,
  checked_at TIMESTAMPTZ NOT NULL,
  checked_by UUID NOT NULL REFERENCES auth.users(id),
  amount_spent DECIMAL(12, 2) NOT NULL DEFAULT 0,
  impressions INTEGER,
  clicks INTEGER,
  conversions INTEGER,
  cost_per_result DECIMAL(12, 4),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_content_campaign_checkins_campaign ON content_campaign_checkins(campaign_id);
CREATE INDEX idx_content_campaign_checkins_checked ON content_campaign_checkins(campaign_id, checked_at);

COMMENT ON TABLE content_campaign_checkins IS 'Performance check-ins for paid campaigns';

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE content_platforms ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_post_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_post_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_post_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_distributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_distribution_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_campaign_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_campaign_checkins ENABLE ROW LEVEL SECURITY;

-- Platforms: Everyone can view (reference data)
CREATE POLICY "Everyone can view platforms"
  ON content_platforms FOR SELECT
  USING (true);

-- Accounts: Plan members can view, editors+ can manage
CREATE POLICY "Plan members can view accounts"
  ON content_accounts FOR SELECT
  USING (plan_id IN (SELECT plan_id FROM plan_members WHERE user_id = auth.uid()));

CREATE POLICY "Editors can manage accounts"
  ON content_accounts FOR ALL
  USING (plan_id IN (
    SELECT plan_id FROM plan_members
    WHERE user_id = auth.uid() AND role IN ('owner', 'editor')
  ));

-- Goals: Plan members can view, editors+ can manage
CREATE POLICY "Plan members can view goals"
  ON content_goals FOR SELECT
  USING (plan_id IN (SELECT plan_id FROM plan_members WHERE user_id = auth.uid()));

CREATE POLICY "Editors can manage goals"
  ON content_goals FOR ALL
  USING (plan_id IN (
    SELECT plan_id FROM plan_members
    WHERE user_id = auth.uid() AND role IN ('owner', 'editor')
  ));

-- Posts: Plan members can view, editors+ can manage
CREATE POLICY "Plan members can view posts"
  ON content_posts FOR SELECT
  USING (plan_id IN (SELECT plan_id FROM plan_members WHERE user_id = auth.uid()));

CREATE POLICY "Editors can manage posts"
  ON content_posts FOR ALL
  USING (plan_id IN (
    SELECT plan_id FROM plan_members
    WHERE user_id = auth.uid() AND role IN ('owner', 'editor')
  ));

-- Post Goals: Inherit from post
CREATE POLICY "Plan members can view post goals"
  ON content_post_goals FOR SELECT
  USING (post_id IN (
    SELECT id FROM content_posts WHERE plan_id IN (
      SELECT plan_id FROM plan_members WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "Editors can manage post goals"
  ON content_post_goals FOR ALL
  USING (post_id IN (
    SELECT id FROM content_posts WHERE plan_id IN (
      SELECT plan_id FROM plan_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'editor')
    )
  ));

-- Post Media: Inherit from post
CREATE POLICY "Plan members can view post media"
  ON content_post_media FOR SELECT
  USING (post_id IN (
    SELECT id FROM content_posts WHERE plan_id IN (
      SELECT plan_id FROM plan_members WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "Editors can manage post media"
  ON content_post_media FOR ALL
  USING (post_id IN (
    SELECT id FROM content_posts WHERE plan_id IN (
      SELECT plan_id FROM plan_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'editor')
    )
  ));

-- Post Links: Inherit from post
CREATE POLICY "Plan members can view post links"
  ON content_post_links FOR SELECT
  USING (post_id IN (
    SELECT id FROM content_posts WHERE plan_id IN (
      SELECT plan_id FROM plan_members WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "Editors can manage post links"
  ON content_post_links FOR ALL
  USING (post_id IN (
    SELECT id FROM content_posts WHERE plan_id IN (
      SELECT plan_id FROM plan_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'editor')
    )
  ));

-- Distributions: Inherit from post
CREATE POLICY "Plan members can view distributions"
  ON content_distributions FOR SELECT
  USING (post_id IN (
    SELECT id FROM content_posts WHERE plan_id IN (
      SELECT plan_id FROM plan_members WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "Editors can manage distributions"
  ON content_distributions FOR ALL
  USING (post_id IN (
    SELECT id FROM content_posts WHERE plan_id IN (
      SELECT plan_id FROM plan_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'editor')
    )
  ));

-- Distribution Metrics: Inherit from distribution
CREATE POLICY "Plan members can view distribution metrics"
  ON content_distribution_metrics FOR SELECT
  USING (distribution_id IN (
    SELECT d.id FROM content_distributions d
    JOIN content_posts p ON d.post_id = p.id
    WHERE p.plan_id IN (
      SELECT plan_id FROM plan_members WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "Editors can manage distribution metrics"
  ON content_distribution_metrics FOR ALL
  USING (distribution_id IN (
    SELECT d.id FROM content_distributions d
    JOIN content_posts p ON d.post_id = p.id
    WHERE p.plan_id IN (
      SELECT plan_id FROM plan_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'editor')
    )
  ));

-- Campaigns: Plan members can view, editors+ can manage
CREATE POLICY "Plan members can view campaigns"
  ON content_campaigns FOR SELECT
  USING (plan_id IN (SELECT plan_id FROM plan_members WHERE user_id = auth.uid()));

CREATE POLICY "Editors can manage campaigns"
  ON content_campaigns FOR ALL
  USING (plan_id IN (
    SELECT plan_id FROM plan_members
    WHERE user_id = auth.uid() AND role IN ('owner', 'editor')
  ));

-- Campaign Posts: Inherit from campaign
CREATE POLICY "Plan members can view campaign posts"
  ON content_campaign_posts FOR SELECT
  USING (campaign_id IN (
    SELECT id FROM content_campaigns WHERE plan_id IN (
      SELECT plan_id FROM plan_members WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "Editors can manage campaign posts"
  ON content_campaign_posts FOR ALL
  USING (campaign_id IN (
    SELECT id FROM content_campaigns WHERE plan_id IN (
      SELECT plan_id FROM plan_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'editor')
    )
  ));

-- Campaign Checkins: Inherit from campaign
CREATE POLICY "Plan members can view campaign checkins"
  ON content_campaign_checkins FOR SELECT
  USING (campaign_id IN (
    SELECT id FROM content_campaigns WHERE plan_id IN (
      SELECT plan_id FROM plan_members WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "Editors can manage campaign checkins"
  ON content_campaign_checkins FOR ALL
  USING (campaign_id IN (
    SELECT id FROM content_campaigns WHERE plan_id IN (
      SELECT plan_id FROM plan_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'editor')
    )
  ));

-- ============================================================================
-- SEED DATA: Platforms
-- ============================================================================

INSERT INTO content_platforms (name, display_name, icon, color, supported_formats, available_metrics) VALUES
(
  'instagram',
  'Instagram',
  'instagram',
  '#E4405F',
  '["post", "carousel", "reel", "story"]'::jsonb,
  '[
    {"key": "impressions", "label": "Impressions", "type": "count"},
    {"key": "reach", "label": "Reach", "type": "count"},
    {"key": "likes", "label": "Likes", "type": "count"},
    {"key": "comments", "label": "Comments", "type": "count"},
    {"key": "shares", "label": "Shares", "type": "count"},
    {"key": "saves", "label": "Saves", "type": "count"},
    {"key": "profile_visits", "label": "Profile Visits", "type": "count"},
    {"key": "followers_gained", "label": "Followers Gained", "type": "count"}
  ]'::jsonb
),
(
  'linkedin',
  'LinkedIn',
  'linkedin',
  '#0A66C2',
  '["post", "article", "document", "video"]'::jsonb,
  '[
    {"key": "impressions", "label": "Impressions", "type": "count"},
    {"key": "clicks", "label": "Clicks", "type": "count"},
    {"key": "reactions", "label": "Reactions", "type": "count"},
    {"key": "comments", "label": "Comments", "type": "count"},
    {"key": "reposts", "label": "Reposts", "type": "count"},
    {"key": "engagement_rate", "label": "Engagement Rate", "type": "percentage"}
  ]'::jsonb
),
(
  'youtube',
  'YouTube',
  'youtube',
  '#FF0000',
  '["short", "video"]'::jsonb,
  '[
    {"key": "views", "label": "Views", "type": "count"},
    {"key": "watch_time", "label": "Watch Time (hrs)", "type": "duration"},
    {"key": "likes", "label": "Likes", "type": "count"},
    {"key": "comments", "label": "Comments", "type": "count"},
    {"key": "shares", "label": "Shares", "type": "count"},
    {"key": "subscribers_gained", "label": "Subscribers Gained", "type": "count"},
    {"key": "average_view_duration", "label": "Avg View Duration", "type": "duration"},
    {"key": "click_through_rate", "label": "CTR", "type": "percentage"}
  ]'::jsonb
),
(
  'tiktok',
  'TikTok',
  'tiktok',
  '#000000',
  '["video"]'::jsonb,
  '[
    {"key": "views", "label": "Views", "type": "count"},
    {"key": "likes", "label": "Likes", "type": "count"},
    {"key": "comments", "label": "Comments", "type": "count"},
    {"key": "shares", "label": "Shares", "type": "count"},
    {"key": "saves", "label": "Saves", "type": "count"},
    {"key": "profile_views", "label": "Profile Views", "type": "count"},
    {"key": "followers_gained", "label": "Followers Gained", "type": "count"}
  ]'::jsonb
),
(
  'x',
  'X (Twitter)',
  'twitter',
  '#000000',
  '["tweet", "thread"]'::jsonb,
  '[
    {"key": "impressions", "label": "Impressions", "type": "count"},
    {"key": "engagements", "label": "Engagements", "type": "count"},
    {"key": "likes", "label": "Likes", "type": "count"},
    {"key": "retweets", "label": "Retweets", "type": "count"},
    {"key": "replies", "label": "Replies", "type": "count"},
    {"key": "profile_clicks", "label": "Profile Clicks", "type": "count"},
    {"key": "link_clicks", "label": "Link Clicks", "type": "count"}
  ]'::jsonb
),
(
  'blog',
  'Blog',
  'file-text',
  '#FF5722',
  '["article"]'::jsonb,
  '[
    {"key": "page_views", "label": "Page Views", "type": "count"},
    {"key": "unique_visitors", "label": "Unique Visitors", "type": "count"},
    {"key": "avg_time_on_page", "label": "Avg Time on Page", "type": "duration"},
    {"key": "bounce_rate", "label": "Bounce Rate", "type": "percentage"},
    {"key": "comments", "label": "Comments", "type": "count"},
    {"key": "social_shares", "label": "Social Shares", "type": "count"}
  ]'::jsonb
),
(
  'spotify',
  'Spotify',
  'podcast',
  '#1DB954',
  '["episode"]'::jsonb,
  '[
    {"key": "plays", "label": "Plays", "type": "count"},
    {"key": "listeners", "label": "Listeners", "type": "count"},
    {"key": "followers_gained", "label": "Followers Gained", "type": "count"},
    {"key": "avg_listen_duration", "label": "Avg Listen Duration", "type": "duration"},
    {"key": "completion_rate", "label": "Completion Rate", "type": "percentage"}
  ]'::jsonb
),
(
  'newsletter',
  'Newsletter',
  'mail',
  '#6366F1',
  '["edition"]'::jsonb,
  '[
    {"key": "subscribers", "label": "Subscribers", "type": "count"},
    {"key": "open_rate", "label": "Open Rate", "type": "percentage"},
    {"key": "click_rate", "label": "Click Rate", "type": "percentage"},
    {"key": "unsubscribes", "label": "Unsubscribes", "type": "count"},
    {"key": "new_subscribers", "label": "New Subscribers", "type": "count"}
  ]'::jsonb
);

-- ============================================================================
-- COMMENTS ON COLUMNS (Additional)
-- ============================================================================

COMMENT ON COLUMN content_platforms.icon IS 'Lucide icon name for the platform';
COMMENT ON COLUMN content_platforms.color IS 'Brand color hex code for the platform';
