-- Seed Data for OKRs Tracker
-- ============================================================================
-- IMPORTANT: This seed file should be run AFTER a user signs up.
-- Replace 'YOUR_USER_ID' with the actual user ID from auth.users
-- 
-- To find your user ID:
-- 1. Sign up in the app
-- 2. Go to Supabase Dashboard > Authentication > Users
-- 3. Copy your user's ID
--
-- Or run this query after signup:
-- SELECT id, email FROM auth.users ORDER BY created_at DESC LIMIT 1;
-- ============================================================================

-- Set the user ID (replace with your actual user ID after signup)
-- You can also use a transaction variable like this:
DO $$
DECLARE
  v_user_id UUID;
  v_plan_id UUID;
  v_obj1_id UUID;
  v_obj2_id UUID;
  v_obj3_id UUID;
  v_group_audience_id UUID;
  v_group_content_id UUID;
  v_group_leads_id UUID;
  v_kr1_id UUID;
  v_kr2_id UUID;
  v_kr3_id UUID;
  v_kr4_id UUID;
  v_kr5_id UUID;
  v_kr6_id UUID;
  v_qt1_id UUID;
  v_qt2_id UUID;
  v_tag_linkedin_id UUID;
  v_tag_youtube_id UUID;
  v_tag_newsletter_id UUID;
BEGIN
  -- Get the first user (or you can hardcode your user ID)
  SELECT id INTO v_user_id FROM auth.users ORDER BY created_at LIMIT 1;
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'No user found. Please sign up first, then run this seed.';
  END IF;
  
  RAISE NOTICE 'Seeding data for user: %', v_user_id;

  -- ============================================================================
  -- CREATE PLAN
  -- ============================================================================
  
  INSERT INTO plans (name, year, description, created_by)
  VALUES (
    'OKRs 2026',
    2026,
    'Personal and professional goals for 2026. Focus on audience growth, content creation, and building sustainable income streams.',
    v_user_id
  )
  RETURNING id INTO v_plan_id;
  
  RAISE NOTICE 'Created plan: %', v_plan_id;

  -- ============================================================================
  -- CREATE KR GROUPS
  -- ============================================================================
  
  INSERT INTO kr_groups (plan_id, name, description, color, sort_order)
  VALUES 
    (v_plan_id, 'Audience Growth', 'Growing followers and subscribers across platforms', '#3B82F6', 1),
    (v_plan_id, 'Content Output', 'Publishing cadence and quality', '#10B981', 2),
    (v_plan_id, 'Owned Leads', 'Email list and CRM growth', '#8B5CF6', 3)
  RETURNING id INTO v_group_audience_id;
  
  SELECT id INTO v_group_content_id FROM kr_groups WHERE plan_id = v_plan_id AND name = 'Content Output';
  SELECT id INTO v_group_leads_id FROM kr_groups WHERE plan_id = v_plan_id AND name = 'Owned Leads';

  -- ============================================================================
  -- CREATE OBJECTIVES
  -- ============================================================================
  
  INSERT INTO objectives (plan_id, code, name, description, weight, sort_order)
  VALUES 
    (v_plan_id, 'O1', 'Grow audience across all platforms', 'Build a sustainable audience that grows month over month through valuable content and engagement.', 0.35, 1),
    (v_plan_id, 'O2', 'Build sustainable content engine', 'Create a repeatable process for high-quality content production across multiple formats.', 0.35, 2),
    (v_plan_id, 'O3', 'Convert audience to owned leads', 'Transform social followers into email subscribers and engaged community members.', 0.30, 3)
  RETURNING id INTO v_obj1_id;
  
  SELECT id INTO v_obj2_id FROM objectives WHERE plan_id = v_plan_id AND code = 'O2';
  SELECT id INTO v_obj3_id FROM objectives WHERE plan_id = v_plan_id AND code = 'O3';

  -- ============================================================================
  -- CREATE TAGS
  -- ============================================================================
  
  INSERT INTO tags (plan_id, name, kind, color)
  VALUES 
    (v_plan_id, 'LinkedIn', 'platform', '#0A66C2'),
    (v_plan_id, 'YouTube', 'platform', '#FF0000'),
    (v_plan_id, 'Newsletter', 'platform', '#8B5CF6'),
    (v_plan_id, 'Instagram', 'platform', '#E4405F'),
    (v_plan_id, 'Podcast', 'platform', '#9333EA'),
    (v_plan_id, 'Top of Funnel', 'funnel_stage', '#22C55E'),
    (v_plan_id, 'Middle of Funnel', 'funnel_stage', '#F59E0B'),
    (v_plan_id, 'Bottom of Funnel', 'funnel_stage', '#EF4444')
  RETURNING id INTO v_tag_linkedin_id;
  
  SELECT id INTO v_tag_youtube_id FROM tags WHERE plan_id = v_plan_id AND name = 'YouTube';
  SELECT id INTO v_tag_newsletter_id FROM tags WHERE plan_id = v_plan_id AND name = 'Newsletter';

  -- ============================================================================
  -- CREATE ANNUAL KRs FOR O1 (Audience Growth)
  -- ============================================================================
  
  -- KR1: LinkedIn Followers
  INSERT INTO annual_krs (objective_id, group_id, name, description, kr_type, direction, aggregation, unit, start_value, target_value, current_value, weight, sort_order)
  VALUES (
    v_obj1_id, v_group_audience_id,
    'Reach 30,000 LinkedIn followers',
    'Grow LinkedIn following through consistent posting and engagement',
    'metric', 'increase', 'cumulative',
    'followers', 8500, 30000, 12500, 0.35, 1
  )
  RETURNING id INTO v_kr1_id;
  
  -- KR2: YouTube Subscribers
  INSERT INTO annual_krs (objective_id, group_id, name, description, kr_type, direction, aggregation, unit, start_value, target_value, current_value, weight, sort_order)
  VALUES (
    v_obj1_id, v_group_audience_id,
    'Reach 25,000 YouTube subscribers',
    'Build YouTube channel with valuable long-form content',
    'metric', 'increase', 'cumulative',
    'subscribers', 3200, 25000, 8200, 0.35, 2
  )
  RETURNING id INTO v_kr2_id;
  
  -- KR3: Newsletter Subscribers
  INSERT INTO annual_krs (objective_id, group_id, name, description, kr_type, direction, aggregation, unit, start_value, target_value, current_value, weight, sort_order)
  VALUES (
    v_obj3_id, v_group_leads_id,
    'Grow newsletter to 10,000 subscribers',
    'Convert social audience to email list',
    'metric', 'increase', 'cumulative',
    'subscribers', 1800, 10000, 4500, 0.40, 1
  )
  RETURNING id INTO v_kr3_id;

  -- ============================================================================
  -- CREATE ANNUAL KRs FOR O2 (Content Engine)
  -- ============================================================================
  
  -- KR4: LinkedIn Posts
  INSERT INTO annual_krs (objective_id, group_id, name, description, kr_type, direction, aggregation, unit, start_value, target_value, current_value, weight, sort_order)
  VALUES (
    v_obj2_id, v_group_content_id,
    'Publish 156 LinkedIn posts',
    '3 posts per week throughout the year',
    'count', 'increase', 'cumulative',
    'posts', 0, 156, 36, 0.30, 1
  )
  RETURNING id INTO v_kr4_id;
  
  -- KR5: YouTube Videos
  INSERT INTO annual_krs (objective_id, group_id, name, description, kr_type, direction, aggregation, unit, start_value, target_value, current_value, weight, sort_order)
  VALUES (
    v_obj2_id, v_group_content_id,
    'Publish 48 YouTube videos',
    '1 video per week throughout the year',
    'count', 'increase', 'cumulative',
    'videos', 0, 48, 12, 0.35, 2
  )
  RETURNING id INTO v_kr5_id;
  
  -- KR6: Viral Posts (threshold count)
  INSERT INTO annual_krs (objective_id, group_id, name, description, kr_type, direction, aggregation, unit, start_value, target_value, current_value, weight, sort_order)
  VALUES (
    v_obj2_id, v_group_content_id,
    'Achieve 24 posts with 50k+ impressions',
    'Create viral content that reaches wider audience',
    'count', 'increase', 'cumulative',
    'viral posts', 0, 24, 6, 0.35, 3
  )
  RETURNING id INTO v_kr6_id;

  -- ============================================================================
  -- CREATE QUARTER TARGETS
  -- ============================================================================
  
  -- Q1-Q4 targets for LinkedIn Followers
  INSERT INTO quarter_targets (annual_kr_id, quarter, target_value, current_value, notes)
  VALUES 
    (v_kr1_id, 1, 14000, 12500, 'Focus on daily posting'),
    (v_kr1_id, 2, 19000, 0, 'Launch content series'),
    (v_kr1_id, 3, 25000, 0, 'Scale what works'),
    (v_kr1_id, 4, 30000, 0, 'Maintain momentum')
  RETURNING id INTO v_qt1_id;
  
  -- Q1-Q4 targets for YouTube Subscribers
  INSERT INTO quarter_targets (annual_kr_id, quarter, target_value, current_value, notes)
  VALUES 
    (v_kr2_id, 1, 8500, 8200, 'Weekly uploads'),
    (v_kr2_id, 2, 13500, 0, 'Optimize thumbnails'),
    (v_kr2_id, 3, 19000, 0, 'Collaborate with others'),
    (v_kr2_id, 4, 25000, 0, 'Year-end push')
  RETURNING id INTO v_qt2_id;
  
  -- Q1-Q4 targets for Newsletter
  INSERT INTO quarter_targets (annual_kr_id, quarter, target_value, current_value, notes)
  VALUES 
    (v_kr3_id, 1, 4000, 4500, 'Lead magnet launch'),
    (v_kr3_id, 2, 6000, 0, 'Referral program'),
    (v_kr3_id, 3, 8000, 0, 'Content upgrades'),
    (v_kr3_id, 4, 10000, 0, 'Year-end campaign');
  
  -- Q1-Q4 targets for LinkedIn Posts
  INSERT INTO quarter_targets (annual_kr_id, quarter, target_value, current_value, notes)
  VALUES 
    (v_kr4_id, 1, 39, 36, '3 posts/week'),
    (v_kr4_id, 2, 78, 0, NULL),
    (v_kr4_id, 3, 117, 0, NULL),
    (v_kr4_id, 4, 156, 0, NULL);
  
  -- Q1-Q4 targets for YouTube Videos  
  INSERT INTO quarter_targets (annual_kr_id, quarter, target_value, current_value, notes)
  VALUES 
    (v_kr5_id, 1, 12, 12, '1 video/week'),
    (v_kr5_id, 2, 24, 0, NULL),
    (v_kr5_id, 3, 36, 0, NULL),
    (v_kr5_id, 4, 48, 0, NULL);

  -- ============================================================================
  -- ADD TAGS TO KRs
  -- ============================================================================
  
  INSERT INTO annual_kr_tags (annual_kr_id, tag_id)
  VALUES 
    (v_kr1_id, v_tag_linkedin_id),
    (v_kr2_id, v_tag_youtube_id),
    (v_kr3_id, v_tag_newsletter_id),
    (v_kr4_id, v_tag_linkedin_id),
    (v_kr5_id, v_tag_youtube_id);

  -- ============================================================================
  -- CREATE TASKS
  -- ============================================================================
  
  INSERT INTO tasks (plan_id, objective_id, quarter_target_id, title, description, status, priority, due_date, sort_order)
  VALUES 
    -- O1 Tasks
    (v_plan_id, v_obj1_id, NULL, 'Audit current LinkedIn profile', 'Review and optimize profile for conversions', 'completed', 'high', '2026-01-15', 1),
    (v_plan_id, v_obj1_id, NULL, 'Create content calendar template', 'Set up system for planning posts', 'completed', 'high', '2026-01-10', 2),
    (v_plan_id, v_obj1_id, v_qt1_id, 'Launch LinkedIn carousel series', 'Create 5-part carousel series on OKRs', 'in_progress', 'high', '2026-02-01', 3),
    (v_plan_id, v_obj1_id, NULL, 'Set up LinkedIn analytics tracking', 'Track impressions, engagement, and follower growth', 'pending', 'medium', '2026-01-20', 4),
    
    -- O2 Tasks  
    (v_plan_id, v_obj2_id, NULL, 'Set up YouTube studio', 'Optimize recording environment and equipment', 'completed', 'high', '2026-01-05', 1),
    (v_plan_id, v_obj2_id, NULL, 'Create video templates', 'Intro, outro, and thumbnail templates', 'completed', 'medium', '2026-01-12', 2),
    (v_plan_id, v_obj2_id, v_qt2_id, 'Record Q1 video batch', 'Batch record 4 videos in one session', 'in_progress', 'high', '2026-01-25', 3),
    (v_plan_id, v_obj2_id, NULL, 'Research trending topics', 'Identify top performing content in niche', 'pending', 'medium', '2026-02-01', 4),
    
    -- O3 Tasks
    (v_plan_id, v_obj3_id, NULL, 'Design lead magnet', 'Create valuable PDF guide', 'completed', 'high', '2026-01-08', 1),
    (v_plan_id, v_obj3_id, NULL, 'Set up email automation', 'Welcome sequence and nurture flows', 'in_progress', 'high', '2026-01-30', 2),
    (v_plan_id, v_obj3_id, NULL, 'Create landing page', 'High-converting opt-in page', 'pending', 'high', '2026-02-05', 3);

  -- ============================================================================
  -- CREATE CHECK-INS
  -- ============================================================================
  
  -- LinkedIn Followers check-ins
  INSERT INTO check_ins (annual_kr_id, quarter_target_id, value, recorded_at, recorded_by, note, evidence_url)
  VALUES 
    (v_kr1_id, v_qt1_id, 9200, '2026-01-08 10:00:00', v_user_id, 'Starting the year strong', NULL),
    (v_kr1_id, v_qt1_id, 10100, '2026-01-15 09:30:00', v_user_id, 'Carousel post went viral!', 'https://linkedin.com/posts/example1'),
    (v_kr1_id, v_qt1_id, 11200, '2026-01-22 11:00:00', v_user_id, 'Consistent growth', NULL),
    (v_kr1_id, v_qt1_id, 12500, '2026-01-29 10:15:00', v_user_id, 'Best week yet - 1,300 new followers', 'https://linkedin.com/analytics');
  
  -- YouTube Subscribers check-ins
  INSERT INTO check_ins (annual_kr_id, quarter_target_id, value, recorded_at, recorded_by, note)
  VALUES 
    (v_kr2_id, v_qt2_id, 4500, '2026-01-08 10:00:00', v_user_id, 'Starting point'),
    (v_kr2_id, v_qt2_id, 5800, '2026-01-15 09:30:00', v_user_id, 'Video on productivity tips did well'),
    (v_kr2_id, v_qt2_id, 7100, '2026-01-22 11:00:00', v_user_id, 'YouTube Shorts driving growth'),
    (v_kr2_id, v_qt2_id, 8200, '2026-01-29 10:15:00', v_user_id, 'Passed 8k milestone!');
  
  -- Newsletter check-ins
  INSERT INTO check_ins (annual_kr_id, value, recorded_at, recorded_by, note)
  VALUES 
    (v_kr3_id, 2100, '2026-01-08 10:00:00', v_user_id, 'Starting count'),
    (v_kr3_id, 2800, '2026-01-15 09:30:00', v_user_id, 'Lead magnet launched'),
    (v_kr3_id, 3600, '2026-01-22 11:00:00', v_user_id, 'Cross-promotion working'),
    (v_kr3_id, 4500, '2026-01-29 10:15:00', v_user_id, 'Great week - referral program kicked in');
  
  -- Content count check-ins
  INSERT INTO check_ins (annual_kr_id, value, recorded_at, recorded_by)
  VALUES 
    (v_kr4_id, 12, '2026-01-08 18:00:00', v_user_id),
    (v_kr4_id, 24, '2026-01-15 18:00:00', v_user_id),
    (v_kr4_id, 36, '2026-01-29 18:00:00', v_user_id),
    (v_kr5_id, 4, '2026-01-08 18:00:00', v_user_id),
    (v_kr5_id, 8, '2026-01-22 18:00:00', v_user_id),
    (v_kr5_id, 12, '2026-01-29 18:00:00', v_user_id);

  -- ============================================================================
  -- CREATE DEFAULT DASHBOARD
  -- ============================================================================
  
  INSERT INTO dashboards (plan_id, name, description, is_default, created_by)
  VALUES (
    v_plan_id,
    'Main Dashboard',
    'Overview of all objectives and key results',
    TRUE,
    v_user_id
  );

  -- ============================================================================
  -- CONTENT PLANNER: Goals
  -- ============================================================================

  DECLARE
    v_goal_authority_id UUID;
    v_goal_audience_id UUID;
    v_goal_sales_id UUID;
    v_goal_engagement_id UUID;
    v_linkedin_platform_id UUID;
    v_youtube_platform_id UUID;
    v_newsletter_platform_id UUID;
    v_linkedin_account_id UUID;
    v_youtube_account_id UUID;
    v_post1_id UUID;
    v_post2_id UUID;
    v_post3_id UUID;
  BEGIN
    -- Get platform IDs
    SELECT id INTO v_linkedin_platform_id FROM content_platforms WHERE name = 'linkedin';
    SELECT id INTO v_youtube_platform_id FROM content_platforms WHERE name = 'youtube';
    SELECT id INTO v_newsletter_platform_id FROM content_platforms WHERE name = 'newsletter';

    IF v_linkedin_platform_id IS NULL THEN
      RAISE NOTICE 'Content platforms not found. Run migrations first.';
    ELSE
      -- Create content goals
      INSERT INTO content_goals (plan_id, name, description, color, sort_order)
      VALUES
        (v_plan_id, 'Authority', 'Establish expertise and thought leadership', '#8B5CF6', 1),
        (v_plan_id, 'Audience Growth', 'Expand reach and gain new followers', '#3B82F6', 2),
        (v_plan_id, 'Sales', 'Drive conversions and revenue', '#10B981', 3),
        (v_plan_id, 'Engagement', 'Build community and spark conversations', '#F59E0B', 4)
      RETURNING id INTO v_goal_authority_id;

      SELECT id INTO v_goal_audience_id FROM content_goals WHERE plan_id = v_plan_id AND name = 'Audience Growth';
      SELECT id INTO v_goal_sales_id FROM content_goals WHERE plan_id = v_plan_id AND name = 'Sales';
      SELECT id INTO v_goal_engagement_id FROM content_goals WHERE plan_id = v_plan_id AND name = 'Engagement';

      -- Create content accounts (linked to KRs)
      INSERT INTO content_accounts (plan_id, platform_id, account_name, account_handle, account_type, linked_kr_id, sort_order)
      VALUES
        (v_plan_id, v_linkedin_platform_id, 'Main LinkedIn', '@johndoe', 'personal', v_kr1_id, 1),
        (v_plan_id, v_youtube_platform_id, 'Main YouTube', '@johndoe', 'personal', v_kr2_id, 2)
      RETURNING id INTO v_linkedin_account_id;

      SELECT id INTO v_youtube_account_id FROM content_accounts WHERE plan_id = v_plan_id AND platform_id = v_youtube_platform_id;

      -- Create sample content posts
      INSERT INTO content_posts (plan_id, title, description, status, created_by, display_order)
      VALUES
        (v_plan_id, '5 OKR Mistakes I Made (So You Don''t Have To)', 'Share lessons learned from personal OKR journey. Include specific examples and how I fixed them.', 'ongoing', v_user_id, 1),
        (v_plan_id, 'How I Track 100+ KPIs in One Dashboard', 'Tutorial on building a comprehensive tracking system. Show the tech stack and process.', 'tagged', v_user_id, 2),
        (v_plan_id, 'The 80/20 of Content Creation', 'Focus on what actually moves the needle. Debunk common myths about posting frequency.', 'backlog', v_user_id, 3)
      RETURNING id INTO v_post1_id;

      SELECT id INTO v_post2_id FROM content_posts WHERE plan_id = v_plan_id AND title LIKE 'How I Track%';
      SELECT id INTO v_post3_id FROM content_posts WHERE plan_id = v_plan_id AND title LIKE 'The 80/20%';

      -- Link posts to goals
      INSERT INTO content_post_goals (post_id, goal_id)
      VALUES
        (v_post1_id, v_goal_authority_id),
        (v_post1_id, v_goal_engagement_id),
        (v_post2_id, v_goal_authority_id),
        (v_post2_id, v_goal_audience_id),
        (v_post3_id, v_goal_audience_id);

      -- Create distributions for post 1 (ongoing)
      INSERT INTO content_distributions (post_id, account_id, format, status, scheduled_at, posted_at, platform_post_url)
      VALUES
        (v_post1_id, v_linkedin_account_id, 'carousel', 'posted', '2026-01-20 09:00:00', '2026-01-20 09:05:00', 'https://linkedin.com/posts/example-okr-mistakes'),
        (v_post1_id, v_youtube_account_id, 'short', 'scheduled', '2026-01-25 12:00:00', NULL, NULL);

      -- Create distributions for post 2 (tagged, not yet scheduled)
      INSERT INTO content_distributions (post_id, account_id, format, status, notes)
      VALUES
        (v_post2_id, v_linkedin_account_id, 'document', 'draft', 'Need to finalize slides'),
        (v_post2_id, v_youtube_account_id, 'video', 'draft', 'Script in progress');

      RAISE NOTICE 'Content Planner seed data created: 4 goals, 2 accounts, 3 posts, 4 distributions';
    END IF;
  END;

  RAISE NOTICE 'Seed completed successfully!';
  RAISE NOTICE 'Plan ID: %', v_plan_id;
  RAISE NOTICE 'Created: 3 objectives, 6 annual KRs, 20 quarter targets, 11 tasks, 14 check-ins';
  RAISE NOTICE 'Created: 4 content goals, 2 content accounts, 3 content posts';

END $$;
