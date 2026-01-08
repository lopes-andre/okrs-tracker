# OKRs Tracker

A premium personal OKR (Objectives and Key Results) tracking web application. Designed for ambitious individuals to manage annual objectives, quarterly key results, and track progress with beautiful analytics.

![OKRs Tracker](https://via.placeholder.com/1200x630/F5F5F5/1A1A1A?text=OKRs+Tracker)

## Features

### Core Functionality
- **Hierarchical OKR Structure**: Annual Plans → Objectives → Annual KRs → Quarterly KRs → Tasks
- **Mixed KR Types**: Support for metrics, counts, milestones, rates, and averages
- **Time Scoping**: Quarterly reset vs. cumulative year-to-date tracking
- **Progress Roll-ups**: Weighted averages with configurable weights

### Tracking & Analytics
- **Quick Check-ins**: 10-second updates with optional notes and evidence links
- **Pace Indicators**: Target by date, actual, delta, and forecasts
- **Visual Dashboards**: Charts, heatmaps, and progress visualizations
- **Timeline/Audit Feed**: Full activity history with change tracking

### Collaboration
- **Access Management**: Owner, Editor, and Viewer roles
- **Team Sharing**: Invite collaborators to your OKR plans
- **Evidence Attachments**: Link posts, screenshots, and external data

## Tech Stack

- **Framework**: [Next.js 15](https://nextjs.org/) with App Router
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Components**: [shadcn/ui](https://ui.shadcn.com/) (Radix-based)
- **Database**: [Supabase](https://supabase.com/) (PostgreSQL + Auth + RLS)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Fonts**: Plus Jakarta Sans (headings) + Inter (body)

## Getting Started

### Prerequisites
- Node.js 18+
- npm, yarn, or pnpm
- A Supabase account (free tier works)

### 1. Clone and Install

```bash
git clone https://github.com/yourusername/okrs-tracker.git
cd okrs-tracker
npm install
```

### 2. Set Up Supabase

#### Option A: Using Supabase Cloud (Recommended)

1. **Create a Supabase project** at [supabase.com](https://supabase.com)

2. **Copy your environment variables**:
   - Go to Project Settings → API Keys
   - Copy the Project URL, Publishable key, and Secret key

3. **Create `.env.local`** in the project root:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
   SUPABASE_SECRET_KEY=your-secret-key
   ```

4. **Run migrations**:
   - Go to Supabase Dashboard → SQL Editor
   - Run each migration file in order (from `supabase/migrations/`):
     1. `20260108000001_enums_and_functions.sql`
     2. `20260108000002_core_tables.sql`
     3. `20260108000003_okr_tables.sql`
     4. `20260108000004_tracking_tables.sql`
     5. `20260108000005_ui_tables.sql`
     6. `20260108000006_activity_events.sql`
     7. `20260108000007_rls_policies.sql`
     8. `20260108000008_views.sql`

#### Option B: Using Supabase CLI (Local Development)

1. **Install Supabase CLI**:
   ```bash
   brew install supabase/tap/supabase
   ```

2. **Start local Supabase**:
   ```bash
   supabase start
   ```

3. **Apply migrations**:
   ```bash
   supabase db push
   ```

4. **Use local credentials** in `.env.local`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<local-publishable-key>
   ```

### 3. Seed Demo Data (Optional)

After signing up with your first user:

1. Get your user ID from Supabase Dashboard → Authentication → Users
2. Run the seed script in SQL Editor:
   ```sql
   -- The seed.sql file automatically finds the first user
   -- Just run supabase/seed.sql in the SQL Editor
   ```

Or via CLI:
```bash
supabase db seed
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
├── src/
│   ├── app/                      # Next.js App Router pages
│   │   ├── login/               # Authentication page
│   │   ├── plans/               # Plans listing
│   │   └── plans/[planId]/      # Plan-specific pages
│   │       ├── okrs/            # OKR editor
│   │       ├── timeline/        # Activity feed
│   │       ├── analytics/       # Charts & insights
│   │       ├── mindmap/         # Visual hierarchy
│   │       └── settings/        # Plan configuration
│   ├── components/
│   │   ├── layout/              # Layout components
│   │   └── ui/                  # shadcn/ui components
│   ├── lib/
│   │   ├── supabase/            # Supabase client & types
│   │   ├── design-tokens.ts     # Design system values
│   │   └── utils.ts             # Utility functions
│   └── middleware.ts            # Auth middleware
├── supabase/
│   ├── migrations/              # Database migrations
│   │   ├── 001_enums_and_functions.sql
│   │   ├── 002_core_tables.sql
│   │   ├── 003_okr_tables.sql
│   │   ├── 004_tracking_tables.sql
│   │   ├── 005_ui_tables.sql
│   │   ├── 006_activity_events.sql
│   │   ├── 007_rls_policies.sql
│   │   └── 008_views.sql
│   ├── seed.sql                 # Demo data
│   └── config.toml              # Local dev config
└── tailwind.config.ts           # Tailwind + design system
```

## Database Schema

### Core Tables
- `profiles` - User profiles (synced from auth.users)
- `plans` - Annual OKR plans
- `plan_members` - Membership with roles (owner/editor/viewer)
- `plan_invites` - Pending invitations

### OKR Tables
- `objectives` - Annual objectives
- `kr_groups` - Grouping for KRs (Audience, Content, etc.)
- `annual_krs` - Annual key results
- `quarter_targets` - Quarterly targets for each KR
- `tasks` - Tasks linked to objectives or quarter targets

### Tracking Tables
- `check_ins` - Time-series progress updates
- `tags` - Flexible tags (platform, funnel stage, etc.)
- `annual_kr_tags` - KR-tag associations
- `task_tags` - Task-tag associations
- `activity_events` - Timeline/audit log

### UI Persistence Tables
- `mindmap_views` - User's mindmap viewport
- `mindmap_nodes` - Node positions
- `mindmap_edges` - Custom connections
- `dashboards` - Custom dashboards
- `dashboard_widgets` - Widget configurations
- `saved_views` - Saved filter/sort settings

### Views
- `v_plan_timeline` - Activity events with user info
- `v_plan_checkins_by_day` - Check-ins aggregated by day
- `v_objective_progress` - Calculated objective progress
- `v_kr_progress` - Detailed KR progress
- `v_plan_stats` - High-level plan statistics
- `v_quarter_overview` - Quarter targets overview

## Row Level Security (RLS)

All tables have RLS enabled with policies:

| Role | Can View | Can Create | Can Edit | Can Delete |
|------|----------|------------|----------|------------|
| **Viewer** | ✅ All plan data | ❌ | ❌ | ❌ |
| **Editor** | ✅ All plan data | ✅ OKRs, tasks, check-ins | ✅ OKRs, tasks | ✅ OKRs, tasks |
| **Owner** | ✅ All plan data | ✅ Everything | ✅ Everything | ✅ Everything + members |

### RLS Validation

To verify RLS is working:

1. Create two users (User A and User B)
2. Have User A create a plan
3. Log in as User B and try to access User A's plan → Should fail
4. Have User A invite User B as viewer
5. User B can now view but not edit

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |

## Design System

The app follows a **Kympler-inspired design system**: premium, minimalist, and executive-grade.

### Typography
- **Headings**: Plus Jakarta Sans (600-700 weight)
- **Body**: Inter (400-500 weight)

### Colors
- **Backgrounds**: White (#FFFFFF), Light Gray (#F5F5F5)
- **Text**: Black (#000000) with opacity variants
- **Accent**: Near-black (#1A1A1A)

### Components
- Cards with 16px radius and soft shadows
- Buttons with 12px radius
- Pill-shaped badges
- Subtle hover states

## Roadmap

### ✅ Completed
- [x] Next.js + TypeScript + Tailwind setup
- [x] Design system implementation
- [x] shadcn/ui component library
- [x] All placeholder pages
- [x] Supabase schema with migrations
- [x] Row Level Security policies
- [x] Activity timeline triggers
- [x] Database views
- [x] Authentication UI (sign up, sign in, sign out)
- [x] User profile auto-creation on signup

### 🔜 Coming Next
- [ ] CRUD operations for OKRs
- [ ] Check-in functionality
- [ ] Real-time updates
- [ ] Analytics charts (Recharts)
- [ ] Mindmap visualization (React Flow)
- [ ] Weekly review flow
- [ ] Export/import functionality

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

Built with ❤️ for ambitious goal-setters.
