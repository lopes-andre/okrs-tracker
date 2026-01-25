# Content Planner Documentation

> Version: 1.0.0
> Last Updated: 2026-01-25
> Status: Production Ready

Comprehensive documentation for the Content Planner feature in OKRs Tracker.

## Table of Contents

1. [Feature Overview](#1-feature-overview)
2. [User Guide](#2-user-guide)
3. [Technical Documentation](#3-technical-documentation)
4. [Data Model](#4-data-model)
5. [API Reference](#5-api-reference)
6. [Changelog](#6-changelog)
7. [Integration with Other Features](#7-integration-with-other-features)
8. [Configuration](#8-configuration)
9. [Verification Checklist](#9-verification-checklist)
10. [Summary](#10-summary)

---

## 1. Feature Overview

### Purpose

The Content Planner is a comprehensive content management system integrated into OKRs Tracker. It helps users plan, schedule, and track content across multiple social media platforms while connecting content efforts to business objectives through KR (Key Result) linking.

### Core Capabilities

| Capability | Description |
|------------|-------------|
| **Kanban Board** | Visual workflow with drag-and-drop reordering within columns |
| **Multi-Platform** | 8 supported platforms (Instagram, LinkedIn, YouTube, TikTok, X, Blog, Spotify, Newsletter) |
| **Distribution Management** | Schedule content to multiple accounts with format customization |
| **Media Handling** | Upload images, PDFs; add video links with thumbnails |
| **Calendar Views** | Month, week, day, and list views for scheduled content |
| **Campaigns** | Track paid advertising campaigns with budget and metrics |
| **Analytics** | Platform-level metrics aggregation and top post tracking |
| **OKR Integration** | Link accounts to Key Results for tracking content impact |

### Post Status Workflow

Posts flow automatically through four statuses based on their distributions:

```
Backlog → Tagged → Ongoing → Complete
```

| Status | Condition |
|--------|-----------|
| **Backlog** | No distributions assigned |
| **Tagged** | Has distributions in `draft` status |
| **Ongoing** | Has `scheduled` or some `posted` distributions |
| **Complete** | All distributions are `posted` |

The system automatically updates post status when distribution statuses change.

---

## 2. User Guide

### 2.1 Content Pipeline (Kanban Board)

The Kanban board is the primary interface for managing content posts.

#### Creating Posts

1. Click **New Post** in the header (or the + button in the Backlog column)
2. Enter a title and optional description
3. Add content goals (colored tags)
4. Click **Create**

New posts are always created in the **Backlog** column.

#### Managing Posts

- **Click a post** to open the detail modal
- **Drag and drop** posts to reorder within the same column
- **Favorite** posts by clicking the star icon
- **Position numbers** show the order of posts in each column (1, 2, 3...)

#### Multi-Select Mode

1. Click the **Select** button in the header
2. Click posts to select/deselect them (checkbox appears)
3. Use **Select All** to select all visible posts
4. Perform bulk actions:
   - **Favorite**: Add or remove from favorites
   - **Delete**: Delete selected posts (with confirmation)
5. Click **Cancel** to exit selection mode

#### Filtering Posts

Use the filter controls to narrow down visible posts:

| Filter | Description |
|--------|-------------|
| Search | Matches title or description (debounced 300ms) |
| Favorites only | Show only starred posts |
| Has media files | Posts with uploaded images/files |
| Has video links | Posts with external video links |
| Has reference links | Posts with added reference URLs |
| No attachments | Posts without any media |
| Has/No distributions | Filter by distribution status |
| Goals | Filter by content goal |
| Accounts | Filter by distribution account |

Active filters show as badges that can be individually removed.

#### Load More Pattern

- Each column shows up to 20 posts initially
- Click **Load more** to show additional posts
- The **Complete** column shows max 10 recent posts
- Click **View All** or **Logbook** to see all completed posts

### 2.2 Content Logbook

The Content Logbook (`/plans/[planId]/content/logbook`) displays all completed posts, grouped by completion date.

**Features:**
- Paginated list (20 posts per page)
- Filter by search, goal, or account
- Shows post metadata (media count, link count, distribution status)
- Click any post to open the detail modal

**Accessing the Logbook:**
- Click the **Logbook** button in the Kanban board header
- Click **View All** in the Complete column footer

### 2.3 Post Detail Modal

The post detail modal provides full editing capabilities:

#### Basic Information Tab
- Title and description
- Content goals (multi-select with colors)
- Delete post option

#### Media Tab
- Upload images (JPEG, PNG, WebP, GIF) or PDFs
- Add video links (YouTube, Vimeo, etc.) with optional thumbnails
- Reorder media by drag and drop
- Cover image is automatically selected (first uploaded image or video thumbnail)

#### Reference Links Tab
- Add URLs for reference materials
- Optional title for each link

#### Distributions Tab
- Add distribution to account
- Set format (platform-specific: post, carousel, reel, article, etc.)
- Write platform-specific caption with hashtag detection
- Schedule date and time
- Mark as posted (sets posted_at timestamp)
- View/delete existing distributions

#### Metrics Tab (for posted distributions)
- Log performance metrics (impressions, likes, comments, etc.)
- View metrics history
- Platform-specific metric types

### 2.4 Calendar Views

The calendar shows scheduled distributions across all accounts.

**Available Views:**
- **Month**: Full month grid with distribution indicators
- **Week**: Weekly view with time slots
- **Day**: Hourly schedule for a single day
- **List**: Chronological list of upcoming distributions

**Filtering:**
- Filter by platform
- Filter by distribution status
- Custom date range

### 2.5 Campaigns

Track paid advertising campaigns with budget and performance metrics.

#### Creating a Campaign

1. Go to the **Campaigns** tab
2. Click **New Campaign**
3. Fill in:
   - Name and description
   - Platform (which platform the ads run on)
   - Objective (Awareness, Traffic, Engagement, Conversions)
   - Status (Draft, Active, Paused, Completed)
   - Budget allocated
   - Start and end dates
4. Click **Create**

#### Campaign Check-ins

Log campaign performance periodically:
- Impressions
- Clicks
- Conversions
- Spend
- Notes

### 2.6 Analytics

The Analytics tab provides aggregated content performance data:

**Metrics Displayed:**
- Total posts and posted count
- Total distributions and posted distributions
- Platform-level metrics (impressions, engagement, engagement rate)
- Top performing posts by engagement
- Recent metrics check-ins

### 2.7 Settings

#### Accounts Tab

Manage your social media accounts:

1. Click **Add Account**
2. Select platform from the list
3. Enter account name (e.g., "@myhandle")
4. Choose account type (Personal or Business)
5. Optionally link to a Key Result (for tracking impact)

**Account Features:**
- Reorder accounts by dragging
- Edit account details
- Delete accounts (cascades to distributions)
- Link to KR for goal tracking

#### Goals Tab

Create content goals for categorizing posts:

1. Click **Add Goal**
2. Enter goal name (e.g., "Authority", "Audience Growth", "Sales")
3. Choose a color
4. Add optional description

Goals appear as colored badges on post cards.

---

## 3. Technical Documentation

### 3.1 Architecture

The Content Planner follows the standard feature module pattern:

```
src/
├── features/content/
│   ├── api.ts           # Supabase queries (56 functions)
│   ├── hooks.ts         # React Query hooks (35+ hooks)
│   ├── content.test.ts  # Unit tests
│   └── index.ts         # Re-exports
│
├── components/content/
│   ├── kanban-board.tsx        # Main Kanban with DnD
│   ├── kanban-column.tsx       # Column container
│   ├── kanban-filters.tsx      # Filter controls
│   ├── post-card.tsx           # Post card (memoized)
│   ├── post-detail-modal.tsx   # Full post editor
│   ├── content-calendar.tsx    # Calendar component
│   ├── campaigns-list.tsx      # Campaign management
│   ├── content-analytics.tsx   # Analytics dashboard
│   ├── content-settings.tsx    # Settings tabs
│   └── ... (40+ components)
│
└── app/plans/[planId]/content/
    ├── page.tsx           # Main content page (5 tabs)
    └── logbook/
        └── page.tsx       # Completed posts archive
```

### 3.2 Key Components

#### KanbanBoard (`kanban-board.tsx`)

**Props:**
```typescript
interface KanbanBoardProps {
  planId: string;
  goals: ContentGoal[];
}
```

**Features:**
- DnD context using `@dnd-kit/core` and `@dnd-kit/sortable`
- Multi-select with `Set<string>` for selected IDs
- Bulk actions (delete, favorite)
- Load more pattern with per-column visibility counts
- Auto-update overdue distributions to posted status

**Key State:**
```typescript
const [isSelectionMode, setIsSelectionMode] = useState(false);
const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
const [visibleCounts, setVisibleCounts] = useState<Record<ContentPostStatus, number>>({
  backlog: 20,
  tagged: 20,
  ongoing: 20,
  complete: 10,
});
```

#### PostCard (`post-card.tsx`)

**Props:**
```typescript
interface PostCardProps {
  post: ContentPostWithDetails;
  position?: number;           // Position indicator (1, 2, 3...)
  isSelected?: boolean;        // Multi-select state
  isSelectionMode?: boolean;   // Show checkbox vs position
  onClick?: () => void;
  onToggleFavorite?: (postId: string, isFavorite: boolean) => void;
  onToggleSelect?: (postId: string) => void;
}
```

**Performance Optimizations:**
- Wrapped with `React.memo()` for render optimization
- `CoverImage` sub-component also memoized with custom comparison
- Optimistic UI updates for favorite toggle

#### KanbanFilters (`kanban-filters.tsx`)

**Debounced Search:**
```typescript
const SEARCH_DEBOUNCE_MS = 300;
const [localSearch, setLocalSearch] = useState(filters.search);

useEffect(() => {
  if (localSearch === filters.search) return;
  const timeoutId = setTimeout(() => {
    onFiltersChange({ ...filters, search: localSearch });
  }, SEARCH_DEBOUNCE_MS);
  return () => clearTimeout(timeoutId);
}, [localSearch]);
```

### 3.3 Drag and Drop Implementation

Uses `@dnd-kit` library for accessible drag and drop:

```typescript
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
```

**Constraints:**
- 8px activation distance (prevents accidental drags)
- Only allows reordering within the same column
- Status cannot be changed by dragging (automatically determined)

### 3.4 Performance Optimizations

#### Signed URL Caching

Media files are stored in private Supabase Storage. Signed URLs are cached to prevent re-fetching:

```typescript
// api.ts
const signedUrlCache = new Map<string, { url: string; expiresAt: number }>();
const CACHE_DURATION_MS = 30 * 60 * 1000; // 30 minutes

export async function getMediaSignedUrl(path: string): Promise<string> {
  const cached = signedUrlCache.get(path);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.url;
  }
  // ... fetch and cache
}
```

#### Component Memoization

```typescript
// PostCard is memoized
export const PostCard = memo(function PostCard({ ... }) { ... });

// CoverImage has custom comparison function
const CoverImage = memo(function CoverImage({ post }) { ... },
  (prevProps, nextProps) => {
    // Only re-render if cover image candidate changes
    return prevFirst?.file_url === nextFirst?.file_url;
  }
);
```

#### Auto-Update Overdue Distributions

A custom hook automatically marks overdue scheduled distributions as posted:

```typescript
export function useAutoUpdateOverdueDistributions(
  planId: string,
  posts: ContentPostWithDetails[] | undefined
) {
  // Runs once on page load
  // Finds distributions where scheduled_at is in the past
  // Updates status to "posted"
}
```

### 3.5 Query Keys

Content Planner uses centralized query keys in `src/lib/query-client.tsx`:

```typescript
content: {
  all: ["content"] as const,
  platforms: {
    all: [...queryKeys.content.all, "platforms"] as const,
    list: () => [...queryKeys.content.platforms.all, "list"] as const,
  },
  accounts: {
    all: [...queryKeys.content.all, "accounts"] as const,
    list: (planId: string) => [...queryKeys.content.accounts.all, "list", planId] as const,
  },
  goals: {
    all: [...queryKeys.content.all, "goals"] as const,
    list: (planId: string) => [...queryKeys.content.goals.all, "list", planId] as const,
  },
  posts: {
    all: [...queryKeys.content.all, "posts"] as const,
    list: (planId: string) => [...queryKeys.content.posts.all, "list", planId] as const,
    detail: (postId: string) => [...queryKeys.content.posts.all, "detail", postId] as const,
  },
  distributions: {
    all: [...queryKeys.content.all, "distributions"] as const,
    byPost: (postId: string) => [...queryKeys.content.distributions.all, "byPost", postId] as const,
    calendar: (planId: string, start: string, end: string) =>
      [...queryKeys.content.distributions.all, "calendar", planId, start, end] as const,
  },
  campaigns: {
    all: [...queryKeys.content.all, "campaigns"] as const,
    list: (planId: string) => [...queryKeys.content.campaigns.all, "list", planId] as const,
    detail: (campaignId: string) => [...queryKeys.content.campaigns.all, "detail", campaignId] as const,
  },
  analytics: {
    all: [...queryKeys.content.all, "analytics"] as const,
    plan: (planId: string) => [...queryKeys.content.analytics.all, "plan", planId] as const,
  },
},
```

---

## 4. Data Model

### 4.1 Database Schema

#### Enums

```sql
-- Post status (Kanban columns)
CREATE TYPE content_post_status AS ENUM ('backlog', 'tagged', 'ongoing', 'complete');

-- Distribution status
CREATE TYPE content_distribution_status AS ENUM ('draft', 'scheduled', 'posted');

-- Campaign status
CREATE TYPE content_campaign_status AS ENUM ('draft', 'active', 'paused', 'completed');

-- Campaign objective
CREATE TYPE content_campaign_objective AS ENUM ('awareness', 'traffic', 'engagement', 'conversions');

-- Account type
CREATE TYPE content_account_type AS ENUM ('personal', 'business');

-- Media type
CREATE TYPE content_media_type AS ENUM ('image', 'pdf', 'video', 'video_link', 'file');
```

#### Tables

**content_platforms** (read-only, seeded)
```sql
CREATE TABLE content_platforms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) NOT NULL UNIQUE,
  display_name VARCHAR(100) NOT NULL,
  icon VARCHAR(50),
  color VARCHAR(7),
  supported_formats TEXT[],
  available_metrics JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**content_accounts**
```sql
CREATE TABLE content_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  platform_id UUID NOT NULL REFERENCES content_platforms(id),
  account_name VARCHAR(255) NOT NULL,
  account_type content_account_type DEFAULT 'personal',
  linked_kr_id UUID REFERENCES annual_krs(id) ON DELETE SET NULL,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**content_goals**
```sql
CREATE TABLE content_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  color VARCHAR(7),
  description TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**content_posts**
```sql
CREATE TABLE content_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  status content_post_status DEFAULT 'backlog',
  created_by UUID NOT NULL REFERENCES auth.users(id),
  display_order INTEGER DEFAULT 0,
  is_favorite BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**content_post_goals** (junction table)
```sql
CREATE TABLE content_post_goals (
  post_id UUID NOT NULL REFERENCES content_posts(id) ON DELETE CASCADE,
  goal_id UUID NOT NULL REFERENCES content_goals(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, goal_id)
);
```

**content_post_media**
```sql
CREATE TABLE content_post_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES content_posts(id) ON DELETE CASCADE,
  file_type VARCHAR(50) NOT NULL,
  file_name VARCHAR(500) NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER,
  mime_type VARCHAR(100),
  display_order INTEGER DEFAULT 0,
  alt_text TEXT,
  media_type content_media_type DEFAULT 'file',
  is_external BOOLEAN DEFAULT false,
  thumbnail_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**content_post_links**
```sql
CREATE TABLE content_post_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES content_posts(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  title VARCHAR(500),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**content_distributions**
```sql
CREATE TABLE content_distributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES content_posts(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES content_accounts(id) ON DELETE CASCADE,
  status content_distribution_status DEFAULT 'draft',
  format VARCHAR(100),
  caption TEXT,
  scheduled_at TIMESTAMPTZ,
  posted_at TIMESTAMPTZ,
  platform_post_url TEXT,
  platform_specific_data JSONB DEFAULT '{}',
  linked_task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**content_distribution_metrics**
```sql
CREATE TABLE content_distribution_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  distribution_id UUID NOT NULL REFERENCES content_distributions(id) ON DELETE CASCADE,
  checked_by UUID NOT NULL REFERENCES auth.users(id),
  metrics JSONB NOT NULL DEFAULT '{}',
  checked_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**content_campaigns**
```sql
CREATE TABLE content_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  platform_id UUID NOT NULL REFERENCES content_platforms(id),
  name VARCHAR(500) NOT NULL,
  description TEXT,
  objective content_campaign_objective DEFAULT 'awareness',
  status content_campaign_status DEFAULT 'draft',
  budget_allocated DECIMAL(12,2),
  budget_spent DECIMAL(12,2) DEFAULT 0,
  start_date DATE,
  end_date DATE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**content_campaign_posts** (junction table)
```sql
CREATE TABLE content_campaign_posts (
  campaign_id UUID NOT NULL REFERENCES content_campaigns(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES content_posts(id) ON DELETE CASCADE,
  sort_order INTEGER DEFAULT 0,
  PRIMARY KEY (campaign_id, post_id)
);
```

**content_campaign_checkins**
```sql
CREATE TABLE content_campaign_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES content_campaigns(id) ON DELETE CASCADE,
  impressions INTEGER,
  clicks INTEGER,
  conversions INTEGER,
  spend DECIMAL(12,2),
  notes TEXT,
  checked_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 4.2 Seeded Platforms

The following platforms are pre-seeded:

| Platform | Formats | Metrics |
|----------|---------|---------|
| Instagram | post, carousel, reel, story | impressions, reach, likes, comments, shares, saves |
| LinkedIn | post, article, document, video | impressions, reactions, comments, shares, clicks |
| YouTube | short, video | views, likes, comments, shares, watch_time, subscribers |
| TikTok | video | views, likes, comments, shares, watch_time |
| X (Twitter) | tweet, thread | impressions, likes, retweets, replies, bookmarks |
| Blog | article | page_views, time_on_page, bounce_rate |
| Spotify | episode | plays, listeners, followers, saves |
| Newsletter | edition | sent, opens, clicks, unsubscribes |

### 4.3 RLS Policies

All content tables use Row Level Security based on plan membership:

```sql
-- View policy (plan members)
CREATE POLICY "Users can view content in their plans"
ON content_posts FOR SELECT
USING (plan_id IN (
  SELECT plan_id FROM plan_members WHERE user_id = auth.uid()
));

-- Modify policy (editors and owners)
CREATE POLICY "Editors can manage content"
ON content_posts FOR ALL
USING (plan_id IN (
  SELECT plan_id FROM plan_members
  WHERE user_id = auth.uid() AND role IN ('owner', 'editor')
));
```

### 4.4 Database Functions

**update_content_post_status()** - Trigger function that auto-updates post status based on distributions:

```sql
CREATE OR REPLACE FUNCTION update_content_post_status()
RETURNS TRIGGER AS $$
DECLARE
  v_post_id UUID;
  v_total_count INT;
  v_posted_count INT;
  v_scheduled_count INT;
  v_new_status content_post_status;
BEGIN
  -- Get post_id from the distribution
  v_post_id := COALESCE(NEW.post_id, OLD.post_id);

  -- Count distributions by status
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'posted'),
    COUNT(*) FILTER (WHERE status = 'scheduled')
  INTO v_total_count, v_posted_count, v_scheduled_count
  FROM content_distributions
  WHERE post_id = v_post_id;

  -- Determine new status
  IF v_total_count = 0 THEN
    v_new_status := 'backlog';
  ELSIF v_posted_count = v_total_count THEN
    v_new_status := 'complete';
  ELSIF v_posted_count > 0 OR v_scheduled_count > 0 THEN
    v_new_status := 'ongoing';
  ELSE
    v_new_status := 'tagged';
  END IF;

  -- Update post status
  UPDATE content_posts SET status = v_new_status WHERE id = v_post_id;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;
```

**get_content_posts_with_details()** - RPC function for efficient post fetching:

```sql
CREATE OR REPLACE FUNCTION get_content_posts_with_details(p_plan_id UUID)
RETURNS TABLE (
  id UUID, plan_id UUID, title TEXT, description TEXT, status content_post_status,
  created_by UUID, display_order INT, is_favorite BOOLEAN,
  created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ,
  goals JSONB, distribution_count INT, scheduled_count INT, posted_count INT
) AS $$
BEGIN
  -- Returns posts with aggregated goal and distribution data
END;
$$ LANGUAGE plpgsql;
```

**get_content_calendar()** - RPC function for calendar data:

```sql
CREATE OR REPLACE FUNCTION get_content_calendar(
  p_plan_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  distribution_id UUID, post_id UUID, post_title TEXT,
  account_id UUID, account_name TEXT, platform_name TEXT,
  scheduled_at TIMESTAMPTZ, status content_distribution_status, format TEXT
) AS $$
BEGIN
  -- Returns distributions within date range
END;
$$ LANGUAGE plpgsql;
```

**reorder_content_posts()** - RPC function for Kanban reordering:

```sql
CREATE OR REPLACE FUNCTION reorder_content_posts(
  p_post_ids UUID[],
  p_status content_post_status
)
RETURNS VOID AS $$
BEGIN
  -- Updates display_order for each post based on array position
END;
$$ LANGUAGE plpgsql;
```

### 4.5 Activity Events

The following activity events are logged:

| Entity | Events |
|--------|--------|
| content_post | created, updated, deleted, status_changed |
| content_distribution | created, updated, deleted, status_changed |
| content_campaign | created, updated, deleted, status_changed |
| content_distribution_metrics | created |

---

## 5. API Reference

### 5.1 API Functions (`src/features/content/api.ts`)

#### Platforms (Read-only)

| Function | Returns | Description |
|----------|---------|-------------|
| `getPlatforms()` | `ContentPlatform[]` | Get all platforms |
| `getPlatform(id)` | `ContentPlatform \| null` | Get single platform |

#### Accounts

| Function | Returns | Description |
|----------|---------|-------------|
| `getAccounts(planId)` | `ContentAccount[]` | List accounts |
| `getAccountsWithPlatform(planId)` | `ContentAccountWithPlatform[]` | With platform details |
| `getAccount(accountId)` | `ContentAccountWithPlatform \| null` | Single account |
| `createAccount(account)` | `ContentAccount` | Create account |
| `updateAccount(id, updates)` | `ContentAccount` | Update account |
| `deleteAccount(id)` | `void` | Delete account |

#### Goals

| Function | Returns | Description |
|----------|---------|-------------|
| `getGoals(planId)` | `ContentGoal[]` | List goals |
| `createGoal(goal)` | `ContentGoal` | Create goal |
| `updateGoal(id, updates)` | `ContentGoal` | Update goal |
| `deleteGoal(id)` | `void` | Delete goal |
| `reorderGoals(goalIds)` | `void` | Reorder goals |

#### Posts

| Function | Returns | Description |
|----------|---------|-------------|
| `getPosts(planId, filters?)` | `ContentPost[]` | List posts |
| `getPostsWithDetails(planId)` | `ContentPostWithDetails[]` | With goals/distributions |
| `getPost(postId)` | `ContentPostWithDetails \| null` | Single post |
| `createPost(post, goalIds?)` | `ContentPost` | Create post |
| `updatePost(id, updates, goalIds?)` | `ContentPost` | Update post |
| `deletePost(id)` | `void` | Delete post |
| `togglePostFavorite(id, isFavorite)` | `ContentPost` | Toggle favorite |
| `reorderPosts(postIds, status)` | `void` | Reorder within column |

#### Post Media

| Function | Returns | Description |
|----------|---------|-------------|
| `addPostMedia(media)` | `ContentPostMedia` | Add media record |
| `deletePostMedia(id)` | `void` | Delete media |

#### Post Links

| Function | Returns | Description |
|----------|---------|-------------|
| `addPostLink(link)` | `ContentPostLink` | Add reference link |
| `deletePostLink(id)` | `void` | Delete link |

#### Distributions

| Function | Returns | Description |
|----------|---------|-------------|
| `getDistributionsByPost(postId)` | `ContentDistribution[]` | List by post |
| `getCalendarData(planId, start, end)` | `ContentCalendarEntry[]` | Calendar data |
| `createDistribution(distribution)` | `ContentDistribution` | Create |
| `updateDistribution(id, updates)` | `ContentDistribution` | Update |
| `deleteDistribution(id)` | `void` | Delete |
| `markDistributionPosted(id, url?)` | `ContentDistribution` | Mark as posted |

#### Distribution Metrics

| Function | Returns | Description |
|----------|---------|-------------|
| `getDistributionMetrics(distId)` | `ContentDistributionMetrics[]` | List metrics |
| `addDistributionMetrics(metrics)` | `ContentDistributionMetrics` | Add metrics |

#### Campaigns

| Function | Returns | Description |
|----------|---------|-------------|
| `getCampaigns(planId, filters?)` | `ContentCampaign[]` | List campaigns |
| `getCampaign(id)` | `ContentCampaign \| null` | Single campaign |
| `createCampaign(planId, data)` | `ContentCampaign` | Create |
| `updateCampaign(id, updates)` | `ContentCampaign` | Update |
| `deleteCampaign(id)` | `void` | Delete |
| `addPostsToCampaign(campId, postIds)` | `void` | Link posts |
| `removePostFromCampaign(campId, postId)` | `void` | Unlink post |

#### Campaign Checkins

| Function | Returns | Description |
|----------|---------|-------------|
| `getCampaignCheckins(campId)` | `ContentCampaignCheckin[]` | List checkins |
| `addCampaignCheckin(checkin)` | `ContentCampaignCheckin` | Add checkin |

#### Storage

| Function | Returns | Description |
|----------|---------|-------------|
| `uploadMediaFile(planId, postId, file)` | `ContentPostMedia` | Upload file |
| `getMediaSignedUrl(path)` | `string` | Get signed URL (cached) |
| `deleteMediaFile(mediaId)` | `void` | Delete from storage |
| `addVideoLink(postId, url, title, thumb?, planId?)` | `ContentPostMedia` | Add video link |

#### Analytics

| Function | Returns | Description |
|----------|---------|-------------|
| `getContentAnalytics(planId)` | `ContentAnalyticsData` | Aggregated analytics |

### 5.2 React Query Hooks (`src/features/content/hooks.ts`)

#### Query Hooks

| Hook | Returns | Description |
|------|---------|-------------|
| `usePlatforms()` | `UseQueryResult<ContentPlatform[]>` | Platforms (24h cache) |
| `useAccounts(planId)` | `UseQueryResult<ContentAccount[]>` | Accounts |
| `useAccountsWithPlatform(planId)` | `UseQueryResult<ContentAccountWithPlatform[]>` | With platform |
| `useGoals(planId)` | `UseQueryResult<ContentGoal[]>` | Goals |
| `usePosts(planId, filters?)` | `UseQueryResult<ContentPost[]>` | Posts |
| `usePostsWithDetails(planId)` | `UseQueryResult<ContentPostWithDetails[]>` | With details |
| `usePost(postId)` | `UseQueryResult<ContentPostWithDetails>` | Single post |
| `useDistributionsByPost(postId)` | `UseQueryResult<ContentDistribution[]>` | Distributions |
| `useCalendarData(planId, start, end)` | `UseQueryResult<ContentCalendarEntry[]>` | Calendar |
| `useCampaigns(planId, filters?)` | `UseQueryResult<ContentCampaign[]>` | Campaigns |
| `useCampaign(campaignId)` | `UseQueryResult<ContentCampaign>` | Single campaign |
| `useCampaignCheckins(campaignId)` | `UseQueryResult<ContentCampaignCheckin[]>` | Checkins |
| `useDistributionMetrics(distId)` | `UseQueryResult<ContentDistributionMetrics[]>` | Metrics |
| `useContentAnalytics(planId)` | `UseQueryResult<ContentAnalyticsData>` | Analytics |

#### Mutation Hooks

| Hook | Description |
|------|-------------|
| `useCreateAccount(planId)` | Create account |
| `useUpdateAccount(planId)` | Update account |
| `useDeleteAccount(planId)` | Delete account |
| `useCreateGoal(planId)` | Create goal |
| `useUpdateGoal(planId)` | Update goal |
| `useDeleteGoal(planId)` | Delete goal |
| `useReorderGoals(planId)` | Reorder goals |
| `useCreatePost(planId)` | Create post |
| `useUpdatePost(planId)` | Update post |
| `useDeletePost(planId)` | Delete post |
| `useToggleFavorite(planId)` | Toggle favorite (optimistic) |
| `useReorderPosts(planId)` | Reorder posts |
| `useAddPostMedia(planId)` | Add media |
| `useDeletePostMedia(planId)` | Delete media |
| `useAddPostLink(planId)` | Add link |
| `useDeletePostLink(planId)` | Delete link |
| `useCreateDistribution(planId)` | Create distribution |
| `useUpdateDistribution(planId)` | Update distribution |
| `useDeleteDistribution(planId)` | Delete distribution |
| `useMarkDistributionPosted(planId)` | Mark as posted |
| `useAddDistributionMetrics(planId)` | Add metrics |
| `useUploadMedia(planId)` | Upload media file |
| `useDeleteMedia(planId)` | Delete media file |
| `useAddVideoLink(planId)` | Add video link |
| `useCreateCampaign(planId)` | Create campaign |
| `useUpdateCampaign(planId)` | Update campaign |
| `useDeleteCampaign(planId)` | Delete campaign |
| `useAddCampaignCheckin(planId)` | Add campaign checkin |

#### Utility Hooks

| Hook | Description |
|------|-------------|
| `useAutoUpdateOverdueDistributions(planId, posts)` | Auto-mark overdue as posted |

---

## 6. Changelog

### Version 1.0.0 (2026-01-25)

#### Part 12-13 Features
- **Video links filter**: Added `hasVideoLinks` filter to Kanban
- **Recently Completed pattern**: Complete column shows max 10 items
- **Content Logbook**: New page for viewing all completed posts
- **Load more pattern**: Columns show 20 initial posts with load more
- **Debounced search**: 300ms debounce for search input
- **Drag and drop**: Reorder posts within columns using @dnd-kit
- **Position indicators**: Show 1, 2, 3... on post cards
- **Multi-select**: Bulk selection with delete and favorite actions
- **Logbook link**: Added BookOpen button in Kanban header
- **Performance optimization**: Signed URL caching, component memoization
- **Auto-update overdue**: Scheduled distributions past due date auto-marked posted

#### Commits
- `ec8e5bb` - Video links filter, Recently Completed pattern, Content Logbook
- `bff91d9` - Load more pattern, debounced search
- `878af75` - Drag-drop, multi-select, position indicators, performance fixes

### Initial Release

#### Core Features
- Kanban board with 4-column workflow
- Post creation and editing
- Content goals with colors
- Media upload (images, PDFs)
- Video link support with thumbnails
- Reference links
- Distribution management
- Platform-specific formats
- Caption with hashtag detection
- Scheduling with date/time
- Mark as posted functionality
- Distribution metrics tracking
- Calendar views (month, week, day, list)
- Campaign management
- Campaign check-ins
- Analytics dashboard
- Settings (accounts, goals)
- Account-KR linking
- Activity event logging

---

## 7. Integration with Other Features

### 7.1 OKR Integration

Content accounts can be linked to Key Results:

```typescript
// content_accounts.linked_kr_id references annual_krs.id
```

**Use Case:**
1. Create a KR like "Grow Instagram followers to 10K"
2. Link your Instagram account to this KR in Settings
3. Content metrics can contribute to KR progress

### 7.2 Activity Timeline

Content events are logged to the activity timeline:

| Entity | Event Types |
|--------|-------------|
| `content_post` | created, updated, deleted, status_changed |
| `content_distribution` | created, updated, deleted, status_changed |
| `content_campaign` | created, updated, deleted, status_changed |
| `content_distribution_metrics` | created |

Events appear in the plan's Timeline page.

### 7.3 Tasks Integration (Future)

The schema supports linking distributions to tasks:

```sql
content_distributions.linked_task_id REFERENCES tasks(id)
```

**Planned Features:**
- Auto-create task when distribution is scheduled
- Task completion when distribution is posted
- Task links to account's KR

---

## 8. Configuration

### 8.1 Storage Bucket

The Content Planner requires a Supabase Storage bucket:

**Bucket Name:** `content-media`

**Setup:**
1. Go to Supabase Dashboard → Storage
2. Create new bucket named `content-media`
3. Set to **Private** (not public)
4. The application uses signed URLs for access

**Storage Structure:**
```
content-media/
└── {planId}/
    └── {postId}/
        ├── 1706185200000.jpg
        ├── 1706185200001.png
        └── thumb_1706185200002.jpg
```

### 8.2 Environment Variables

No additional environment variables required beyond standard Supabase configuration.

### 8.3 Migrations

Content Planner requires these migrations:

| Migration | Description |
|-----------|-------------|
| `015_content_planner.sql` | Base schema (tables, enums, RLS) |
| `016_content_planner_functions.sql` | Functions, triggers, RPC |
| `017_content_media_storage.sql` | Storage bucket policies |
| `018_fix_content_media_trigger.sql` | Media field enhancements |
| `019_content_post_favorites.sql` | Favorite feature |
| `020_content_media_video_links.sql` | Video link support |

---

## 9. Verification Checklist

### Kanban Board

- [ ] Posts display in correct columns based on status
- [ ] New posts create in Backlog
- [ ] Drag and drop reorders within column
- [ ] Position numbers update after reorder
- [ ] Multi-select mode shows checkboxes
- [ ] Bulk delete works with confirmation
- [ ] Bulk favorite adds/removes stars
- [ ] Selection clears when exiting mode
- [ ] Load more shows additional posts
- [ ] Complete column limited to 10 posts
- [ ] View All links to Logbook

### Filters

- [ ] Search debounces (300ms delay)
- [ ] Clear search is immediate
- [ ] Filter badges show active filters
- [ ] Each filter can be removed individually
- [ ] Clear All removes all filters
- [ ] Filters persist during session

### Post Detail Modal

- [ ] Edit title and description
- [ ] Add/remove goals
- [ ] Upload images and PDFs
- [ ] Add video links with thumbnails
- [ ] Add reference links
- [ ] Create distributions
- [ ] Schedule distributions
- [ ] Mark distributions as posted
- [ ] Post status updates automatically

### Performance

- [ ] Cover images load without flickering on filter change
- [ ] Signed URLs are cached (check network tab)
- [ ] No unnecessary re-renders (React DevTools)
- [ ] Large post lists scroll smoothly

### Data Integrity

- [ ] Post status matches distribution states
- [ ] Deleting distribution updates post status
- [ ] Deleting post cascades to distributions
- [ ] Media files deleted from storage on removal

---

## 10. Summary

### What Was Built

The Content Planner is a full-featured content management system with:

1. **Kanban Workflow**: 4-column board with automatic status transitions
2. **Rich Post Editing**: Goals, media, links, distributions
3. **Multi-Platform Support**: 8 platforms with format customization
4. **Calendar Integration**: Multiple views for scheduling
5. **Campaign Tracking**: Budget and metrics for paid content
6. **Analytics**: Platform and post performance aggregation
7. **OKR Integration**: Link accounts to Key Results

### Technical Highlights

- **React Query** for server state management
- **@dnd-kit** for accessible drag and drop
- **React.memo** for performance optimization
- **Signed URL caching** for media files
- **Debounced inputs** for search performance
- **Automatic status updates** via database triggers
- **Row Level Security** for data protection

### Files Summary

| Category | Count |
|----------|-------|
| Components | 40+ |
| API Functions | 56 |
| React Query Hooks | 35+ |
| Database Tables | 12 |
| Database Functions | 4 |
| Migrations | 6 |

### Key Dependencies

- `@dnd-kit/core`: ^6.x
- `@dnd-kit/sortable`: ^8.x
- `@tanstack/react-query`: ^5.x
- `date-fns`: ^4.x
- `lucide-react`: ^0.468.x
