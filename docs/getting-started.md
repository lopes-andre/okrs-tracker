# Getting Started

Complete setup guide for developing the OKRs Tracker application.

## Prerequisites

Before you begin, ensure you have the following installed:

| Tool | Version | Check Command |
|------|---------|---------------|
| Node.js | 18.17+ | `node --version` |
| npm | 9+ | `npm --version` |
| Git | 2.40+ | `git --version` |

Optional but recommended:
- [Supabase CLI](https://supabase.com/docs/guides/cli) for local database development
- [VS Code](https://code.visualstudio.com/) with ESLint and Tailwind CSS IntelliSense extensions

## Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/lopes-andre/okrs-tracker.git
cd okrs-tracker
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment

Copy the example environment file:

```bash
cp .env.example .env.local
```

Edit `.env.local` with your Supabase credentials:

```env
# Get these from your Supabase project: Settings → API
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-anon-key
SUPABASE_SECRET_KEY=your-service-role-secret-key
```

### 4. Set Up Supabase

#### Option A: Use Supabase Cloud (Recommended for beginners)

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **Settings → API** to get your credentials
3. Go to **SQL Editor** and run migrations in order:

```
supabase/migrations/001_extensions_and_types.sql
supabase/migrations/002_helper_functions.sql
supabase/migrations/003_core_tables.sql
... (continue through 014_realtime.sql)
```

4. Configure authentication:
   - Go to **Authentication → Providers**
   - Enable Email authentication
   - Optionally enable Google OAuth (see [OAuth Setup](#oauth-setup))

#### Option B: Use Supabase Local Development

If you have the Supabase CLI installed:

```bash
# Start local Supabase
supabase start

# Apply all migrations
supabase db reset

# View local dashboard
supabase status  # Shows Studio URL (usually localhost:54323)
```

### 5. Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Supabase Configuration Details

### Getting Your Credentials

1. Log in to [supabase.com](https://supabase.com)
2. Select your project (or create a new one)
3. Navigate to **Settings → API**
4. Copy these values:

| Setting | Environment Variable | Description |
|---------|---------------------|-------------|
| Project URL | `NEXT_PUBLIC_SUPABASE_URL` | Your project's API URL |
| `anon` `public` key | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Safe to expose in browser |
| `service_role` key | `SUPABASE_SECRET_KEY` | Server-side only, never expose |

### Database Migrations

The project uses 14 consolidated migration files. Run them in order:

| # | File | What it creates |
|---|------|-----------------|
| 1 | `001_extensions_and_types.sql` | PostgreSQL extensions, enum types |
| 2 | `002_helper_functions.sql` | Trigger functions, utilities |
| 3 | `003_core_tables.sql` | profiles, plans, plan_members, invites |
| 4 | `004_okr_tables.sql` | objectives, kr_groups, annual_krs, quarter_targets, tasks |
| 5 | `005_tracking_tables.sql` | check_ins, tags, task_tags, kr_tags |
| 6 | `006_ui_tables.sql` | dashboards, dashboard_widgets |
| 7 | `007_activity_events.sql` | activity_events table + triggers |
| 8 | `008_weekly_reviews.sql` | weekly_reviews tables + triggers |
| 9 | `009_task_features.sql` | reminders, assignees, recurrence |
| 10 | `010_communication.sql` | comments, mentions, notifications |
| 11 | `011_rls_policies.sql` | Row Level Security policies |
| 12 | `012_views.sql` | Database views |
| 13 | `013_rpc_functions.sql` | Client-callable RPC functions |
| 14 | `014_realtime.sql` | Supabase Realtime publication |

### OAuth Setup

To enable Google OAuth:

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing
3. Navigate to **APIs & Services → Credentials**
4. Click **Create Credentials → OAuth client ID**
5. Select **Web application**
6. Add authorized redirect URI:
   - For development: `http://localhost:3000/auth/callback`
   - For production: `https://your-domain.com/auth/callback`
   - Also add: `https://your-project-ref.supabase.co/auth/v1/callback`
7. Copy Client ID and Client Secret
8. In Supabase Dashboard, go to **Authentication → Providers → Google**
9. Enable Google and paste your credentials

## Project Structure Overview

```
okrs-tracker/
├── src/
│   ├── app/                  # Next.js App Router pages
│   ├── components/           # React components by domain
│   ├── features/             # Data layer (API + React Query)
│   └── lib/                  # Core utilities
├── supabase/
│   └── migrations/           # Database migrations (14 files)
├── docs/                     # Documentation
├── .env.example              # Environment template
└── package.json
```

See [Architecture](./architecture.md) for detailed system design.

## Common Development Tasks

### Creating a New Plan

1. Start the development server
2. Sign up or log in
3. Click "Create Plan" on the plans page
4. Enter a name and year

### Running Tests

```bash
# Watch mode (development)
npm test

# Single run
npm run test:run

# With coverage
npm run test:coverage
```

See [Testing Guide](./testing.md) for comprehensive testing documentation.

### Building for Production

```bash
npm run build
npm run start
```

### Linting

```bash
npm run lint
```

## Troubleshooting Setup

### "Invalid API key" or "Failed to fetch"

- Verify your Supabase URL and keys in `.env.local`
- Ensure there are no trailing spaces in your environment variables
- Check that you're using the `anon` key (not the `service_role` key) for `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

### "relation does not exist"

- Ensure all migrations have been run in order
- Check the Supabase SQL Editor for errors
- Try running `supabase db reset` if using local development

### "401 Unauthorized" on login

- Check that authentication is enabled in Supabase Dashboard
- Verify OAuth redirect URIs match your development URL
- Clear browser cookies and try again

### Port 3000 already in use

```bash
# Find and kill the process
lsof -i :3000
kill -9 <PID>

# Or run on a different port
npm run dev -- -p 3001
```

See [Troubleshooting](./troubleshooting.md) for more solutions.

## Next Steps

- Read the [Architecture](./architecture.md) documentation
- Explore the [Database](./database.md) schema
- Review [Features](./features.md) for user-facing functionality
- Check [Development Workflow](./development-workflow.md) for coding standards
