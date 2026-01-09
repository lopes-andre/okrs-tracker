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
- **Data Fetching**: [TanStack Query](https://tanstack.com/query)
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

#### Create a Supabase Project

1. **Create a project** at [supabase.com](https://supabase.com)

2. **Copy your environment variables**:
   - Go to Project Settings → API Keys
   - Copy the Project URL, Publishable key (anon), and Secret key (service_role)

3. **Create `.env.local`** in the project root:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-anon-key
   SUPABASE_SECRET_KEY=your-service-role-secret-key
   ```

4. **Run migrations** in Supabase Dashboard → SQL Editor.
   
   Run each migration file **in order** (copy-paste the contents):
   
   | Order | File | Description |
   |-------|------|-------------|
   | 1 | `20260108000001_enums_and_functions.sql` | Enums and helper functions |
   | 2 | `20260108000002_core_tables.sql` | Profiles, plans, members, invites |
   | 3 | `20260108000003_okr_tables.sql` | Objectives, KRs, quarter targets, tasks |
   | 4 | `20260108000004_tracking_tables.sql` | Check-ins, tags, task_tags |
   | 5 | `20260108000005_ui_tables.sql` | Mindmap, dashboards, saved views |
   | 6 | `20260108000006_activity_events.sql` | Activity timeline + triggers |
   | 7 | `20260108000007_rls_policies.sql` | Row Level Security policies |
   | 8 | `20260108000008_views.sql` | Database views |
   | 9 | `20260109000001_tasks_improvements.sql` | Task-KR linking, performance indexes |
   | 10 | `20260110000001_add_due_time.sql` | Optional due time for tasks |
   | 11 | `20260110000002_add_task_effort.sql` | Effort estimation for tasks |
   | 12 | `20260111000001_remove_weight_columns.sql` | Remove weight from objectives/KRs |

   **Important**: Run them in order! Each migration depends on the previous ones.
   
   > **Tip**: You can run all migrations at once by copying all SQL files into a single query, but ensure they're in the correct order.

5. **Configure Auth** (optional but recommended):
   - Go to Authentication → URL Configuration
   - Set Site URL to `http://localhost:3000` (dev) or your production URL
   - Add redirect URLs: `http://localhost:3000/auth/callback`

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Create Your First Account

1. Go to `/login`
2. Sign up with your email
3. Check your email for confirmation (or disable email confirmation in Supabase Auth settings for dev)
4. Sign in
5. Create your first OKR plan!

## Project Structure

```
├── src/
│   ├── app/                      # Next.js App Router pages
│   │   ├── (auth)/              # Auth actions
│   │   ├── auth/callback/       # OAuth callback
│   │   ├── login/               # Authentication page
│   │   ├── plans/               # Plans listing
│   │   └── plans/[planId]/      # Plan-specific pages
│   │       ├── okrs/            # OKR editor
│   │       ├── tasks/           # Tasks management
│   │       │   └── logbook/     # Completed tasks history
│   │       ├── timeline/        # Activity feed
│   │       ├── analytics/       # Charts & insights
│   │       ├── mindmap/         # Visual hierarchy
│   │       └── settings/        # Plan configuration
│   ├── components/
│   │   ├── layout/              # Layout components
│   │   ├── okr/                 # OKR-specific components
│   │   ├── tasks/               # Task components
│   │   └── ui/                  # shadcn/ui components
│   ├── features/                # Data access layer
│   │   ├── plans/               # Plans API & hooks
│   │   ├── objectives/          # Objectives API & hooks
│   │   ├── annual-krs/          # Annual KRs API & hooks
│   │   ├── quarter-targets/     # Quarter targets API & hooks
│   │   ├── tasks/               # Tasks API & hooks
│   │   ├── check-ins/           # Check-ins API & hooks
│   │   ├── tags/                # Tags & groups API & hooks
│   │   ├── timeline/            # Timeline API & hooks
│   │   ├── dashboards/          # Dashboards API & hooks
│   │   └── mindmap/             # Mindmap API & hooks
│   └── lib/
│       ├── supabase/            # Supabase clients & types
│       ├── design-tokens.ts     # Design system values
│       ├── query-client.tsx     # TanStack Query setup
│       ├── api-utils.ts         # API helper functions
│       ├── toast-utils.ts       # Toast notifications
│       └── utils.ts             # Utility functions
├── supabase/
│   ├── migrations/              # Database migrations (11 files)
│   ├── seed.sql                 # Demo data
│   └── config.toml              # Local dev config
└── tailwind.config.ts           # Tailwind + design system
```

## Database Schema

### Core Tables
- `profiles` - User profiles (auto-created on signup)
- `plans` - Annual OKR plans
- `plan_members` - Membership with roles (owner/editor/viewer)
- `plan_invites` - Pending invitations

### OKR Tables
- `objectives` - Annual objectives
- `kr_groups` - Grouping for KRs (Audience, Content, etc.)
- `annual_krs` - Annual key results
- `quarter_targets` - Quarterly targets for each KR
- `tasks` - Tasks linked to objectives, annual KRs, or quarter targets (with optional due time)

### Tracking Tables
- `check_ins` - Time-series progress updates
- `tags` - Flexible tags (platform, funnel stage, etc.)
- `activity_events` - Timeline/audit log (auto-populated by triggers)

### Views
- `v_plan_timeline` - Activity events with user info
- `v_plan_stats` - High-level plan statistics
- `v_objective_progress` - Calculated objective progress
- `v_kr_progress` - Detailed KR progress

## Row Level Security (RLS)

All tables have RLS enabled with role-based policies:

| Role | Can View | Can Create | Can Edit | Can Delete |
|------|----------|------------|----------|------------|
| **Viewer** | ✅ All plan data | ❌ | ❌ | ❌ |
| **Editor** | ✅ All plan data | ✅ OKRs, tasks, check-ins | ✅ OKRs, tasks | ✅ OKRs, tasks |
| **Owner** | ✅ All plan data | ✅ Everything | ✅ Everything | ✅ Everything + members |

## Data Access Layer

The app uses a clean, typed data access layer:

### API Functions (`features/*/api.ts`)
- Supabase queries with proper error handling
- Type-safe with TypeScript

### React Query Hooks (`features/*/hooks.ts`)
- Automatic caching and revalidation
- Optimistic updates
- Loading and error states

### Example Usage

```tsx
import { usePlans, useCreatePlan } from "@/features";

function MyComponent() {
  const { data: plans, isLoading } = usePlans();
  const createPlan = useCreatePlan();
  
  const handleCreate = () => {
    createPlan.mutate({ name: "2026 OKRs", year: 2026 });
  };
  
  if (isLoading) return <Spinner />;
  return <PlansList plans={plans} onCreate={handleCreate} />;
}
```

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |

## Troubleshooting

### "Permission denied" when creating a plan
- Make sure you ran **all 11 migration files** in order
- Check that your `.env.local` has the correct Supabase keys
- Verify you're logged in (check browser cookies)

### Styles not loading
- Make sure `autoprefixer` is installed: `npm install autoprefixer`
- Restart the dev server after installing dependencies

### Email confirmation not working
- For development, you can disable email confirmation in Supabase Dashboard → Authentication → Settings → Email Auth → Toggle off "Confirm email"

### Empty data on pages
- Make sure you're accessing a valid plan (use the plan ID from the URL, not just "2026")
- Check browser console for API errors

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
- [x] Supabase schema with migrations (10 files)
- [x] Row Level Security policies
- [x] Activity timeline triggers
- [x] Database views
- [x] Authentication (sign up, sign in, sign out)
- [x] User profile auto-creation
- [x] Data access layer (TanStack Query)
- [x] Plans CRUD
- [x] Objectives & KRs management
- [x] Tasks management with:
  - [x] Link tasks to Objectives, Annual KRs, or Quarter Targets
  - [x] Custom tags for filtering and grouping
  - [x] Due date + optional due time
  - [x] Collapsible task lists (Today, Overdue, This Week, etc.)
  - [x] Completed tasks logbook with pagination
  - [x] Late completion tracking
- [x] Timeline page with real data
- [x] Settings page with member management
- [x] Analytics overview

### 🔜 Coming Next
- [ ] Check-in functionality
- [ ] Real-time updates
- [ ] Analytics charts (Recharts)
- [ ] Mindmap visualization (React Flow)
- [ ] Weekly review flow
- [ ] Export/import functionality
- [ ] Task reminders (using due time)

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

Built with ❤️ for ambitious goal-setters.
