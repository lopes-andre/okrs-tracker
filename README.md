# OKRs Tracker

A premium personal OKR (Objectives and Key Results) tracking application built with Next.js 15 and Supabase. Track annual objectives, quarterly key results, tasks, and visualize progress with beautiful analytics.

[![Next.js](https://img.shields.io/badge/Next.js-15.1-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-green?logo=supabase)](https://supabase.com/)
[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](./LICENSE)

## Overview

OKRs Tracker helps ambitious individuals and teams manage their goals using the OKR methodology. Create annual plans with objectives, break them down into measurable key results, set quarterly targets, and track progress through check-ins.

**Key capabilities:**
- Hierarchical goal structure: Plans → Objectives → Key Results → Quarterly Targets → Tasks
- Multiple KR types: metric, count, milestone, rate, average
- Progress tracking with pace analysis and forecasting
- Team collaboration with role-based access control
- Weekly review rituals with reflection prompts
- Beautiful analytics dashboards with charts and heatmaps
- Full data portability (JSON/Markdown export, cloud backups)

## Quick Start

```bash
# 1. Clone and install
git clone https://github.com/lopes-andre/okrs-tracker.git
cd okrs-tracker
npm install

# 2. Configure environment
cp .env.example .env.local
# Edit .env.local with your Supabase credentials

# 3. Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

→ See [Getting Started Guide](./docs/getting-started.md) for detailed setup instructions including Supabase configuration.

## Tech Stack

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| [Next.js](https://nextjs.org/) | 15.1 | React framework with App Router |
| [React](https://react.dev/) | 19.0 | UI library |
| [TypeScript](https://www.typescriptlang.org/) | 5.7 | Type safety |
| [Tailwind CSS](https://tailwindcss.com/) | 3.4 | Utility-first styling |
| [Radix UI](https://www.radix-ui.com/) | Various | Accessible components |
| [TanStack Query](https://tanstack.com/query) | 5.90 | Server state management |
| [Recharts](https://recharts.org/) | 3.6 | Charts and visualizations |

### Backend
| Technology | Version | Purpose |
|------------|---------|---------|
| [Supabase](https://supabase.com/) | 2.47 | PostgreSQL + Auth + Storage |
| [Zod](https://zod.dev/) | 4.3 | Runtime validation |

### Testing
| Technology | Version | Purpose |
|------------|---------|---------|
| [Vitest](https://vitest.dev/) | 4.0 | Test runner |
| [Testing Library](https://testing-library.com/) | 16.3 | Component testing |

## Project Structure

```
okrs-tracker/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── login/              # Authentication
│   │   └── plans/[planId]/     # Plan-specific routes
│   │       ├── okrs/           # OKR management
│   │       ├── tasks/          # Task management
│   │       ├── analytics/      # Charts & insights
│   │       ├── reviews/        # Weekly reviews
│   │       ├── timeline/       # Activity feed
│   │       └── settings/       # Plan settings
│   ├── components/             # React components by domain
│   ├── features/               # Data layer (API + React Query hooks)
│   └── lib/                    # Core utilities & business logic
├── supabase/
│   └── migrations/             # Database migrations (14 files)
└── docs/                       # Documentation
```

→ See [Architecture](./docs/architecture.md) for detailed system design.

## Documentation

| Document | Description |
|----------|-------------|
| [Getting Started](./docs/getting-started.md) | Detailed setup and configuration guide |
| [Architecture](./docs/architecture.md) | System design and key decisions |
| [Database](./docs/database.md) | Schema, tables, and relationships |
| [Features](./docs/features.md) | End-user feature documentation |
| [API Reference](./docs/api.md) | Internal API documentation |
| [Testing](./docs/testing.md) | Testing strategy and guidelines |
| [Deployment](./docs/deployment.md) | Production deployment guide |
| [Troubleshooting](./docs/troubleshooting.md) | Common issues and solutions |

## Development

### Commands

```bash
npm run dev          # Start development server
npm run build        # Production build
npm run lint         # Run ESLint
npm run test         # Run tests in watch mode
npm run test:run     # Run tests once
npm run test:coverage # Run tests with coverage
```

### Database Setup

The project uses 14 consolidated migration files:

| # | File | Description |
|---|------|-------------|
| 1 | `001_extensions_and_types.sql` | PostgreSQL extensions and enums |
| 2 | `002_helper_functions.sql` | Trigger and utility functions |
| 3 | `003_core_tables.sql` | profiles, plans, plan_members, invites |
| 4 | `004_okr_tables.sql` | objectives, kr_groups, annual_krs, quarter_targets, tasks |
| 5 | `005_tracking_tables.sql` | check_ins, tags, tag junctions |
| 6 | `006_ui_tables.sql` | dashboards, dashboard_widgets |
| 7 | `007_activity_events.sql` | activity_events + logging triggers |
| 8 | `008_weekly_reviews.sql` | weekly_reviews tables + triggers |
| 9 | `009_task_features.sql` | reminders, assignees, recurrence |
| 10 | `010_communication.sql` | comments, mentions, notifications |
| 11 | `011_rls_policies.sql` | Row Level Security policies |
| 12 | `012_views.sql` | Database views |
| 13 | `013_rpc_functions.sql` | Client-callable RPC functions |
| 14 | `014_realtime.sql` | Supabase Realtime configuration |

Run migrations in Supabase Dashboard → SQL Editor, or use the Supabase CLI:

```bash
supabase db reset  # Reset and run all migrations
```

→ See [Database Documentation](./docs/database.md) for full schema details.

## Features

### OKR Management
- **Objectives**: Annual goals with descriptions and sort order
- **Key Results**: Measurable outcomes with 5 types (metric, count, milestone, rate, average)
- **Quarterly Targets**: Break down annual KRs into quarterly milestones
- **Progress Tracking**: Check-ins with notes and evidence links

### Task Management
- Tasks linked to Objectives, KRs, or Quarter Targets
- Priority levels (low, medium, high) and effort estimates
- Due dates with optional times
- Tag system for organization
- Recurring tasks (daily, weekly, monthly, yearly)

### Analytics
- Progress charts and burn-up visualization
- Pace analysis with forecasting
- Activity heatmap (GitHub-style)
- KR performance comparison tables
- Team workload distribution

### Collaboration
- Role-based access: Owner, Editor, Viewer
- Comments with @mentions
- Real-time notifications
- Team member workload visibility

### Weekly Reviews
- 8-step review wizard
- Reflection prompts (what went well, what to improve, lessons learned)
- Progress snapshots captured at completion
- Review analytics and streaks

### Data Portability
- Export to JSON (full backup)
- Export to Markdown (human-readable)
- Import with validation and preview
- Cloud backups to Supabase Storage

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

### Quick contribution steps:
1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes with tests
4. Submit a pull request

## License

This project is licensed under the Apache License 2.0 - see [LICENSE](./LICENSE) for details.

---

Built with care for ambitious goal-setters.
