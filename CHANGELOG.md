# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

#### Content Planner Feature
- Full content management system with Kanban workflow
- Post status workflow: backlog → tagged → ongoing → complete
- Distribution scheduling across multiple platform accounts
- Media uploads with drag-drop support
- Video link embedding (YouTube, Vimeo, Loom)
- Content calendar with month/week/day/list views
- Campaign tracking for paid advertising
- Goals and metrics tracking per platform

#### Accessibility Improvements
- Added aria-labels to all icon-only buttons
- Added prefers-reduced-motion support for animations
- Added skip-to-content link for keyboard navigation
- Added focus-within support for hover-only actions
- Improved semantic HTML with main landmark

#### Database & Query Optimizations
- Added 30+ performance indexes on commonly queried columns
- Added optimized RPC functions to eliminate N+1 patterns:
  - `get_tags_with_usage` - Tag counts in single query
  - `get_task_metrics` - Task completion metrics
  - `get_checkin_streak` - Streak calculation
  - `get_activity_stats` - Timeline analytics
  - Batch update functions for widgets and tasks
- Optimized RLS policies with helper functions

#### Error Handling & Resilience
- Added global error boundary with recovery actions
- Added feature-level error boundaries
- Added error logging service with structured errors
- Added retry logic with exponential backoff for API calls
- Added mutation retry patterns for transient failures
- Added circuit breaker pattern for failing services
- Added Web Vitals monitoring (LCP, FID, CLS, TTFB)

#### Documentation
- Comprehensive documentation suite
  - Developer documentation (architecture, database, API, deployment, testing)
  - End user features guide
  - Troubleshooting guide
  - Getting started guide

## [1.0.0] - 2026-01-24

### Added

#### Core OKR Features
- Plan management with yearly goals
- Objectives with customizable codes (O1, O2, etc.)
- Key Results with 5 types: metric, count, milestone, rate, average
- Quarterly targets for pacing annual KRs
- Progress tracking with automatic calculations
- Pace analysis (ahead, on track, at risk, off track)

#### Task Management
- Tasks linked to Objectives, KRs, or Quarter Targets
- Priority levels (low, medium, high)
- Effort estimates (light, moderate, heavy)
- Due dates with optional times
- Status tracking (pending, in progress, completed, cancelled)
- Tag system for organization
- Recurring tasks (daily, weekly, monthly, yearly)
- Multi-user task assignment

#### Check-ins & Progress
- Check-in recording with notes and evidence URLs
- Automatic progress updates on check-in
- Progress forecasting based on current pace
- Historical check-in tracking

#### Analytics Dashboard
- Summary cards with key metrics
- Progress charts over time
- Burn-up visualization
- Activity heatmap (GitHub-style)
- KR performance comparison tables
- Pace analysis panels
- Quarterly comparisons
- Task metrics and trends

#### Weekly Reviews
- 8-step guided review wizard
- Reflection prompts (what went well, improve, lessons)
- Progress snapshot capture
- Week rating (1-5 stars)
- Review streak tracking
- Configurable reminders

#### Collaboration
- Team plans with role-based access (owner, editor, viewer)
- Member invitations via email
- Comments with @mentions
- Real-time notifications
- Activity timeline with filtering

#### Customizable Dashboard
- Widget-based dashboard system
- 9 widget types available
- Add, remove, and configure widgets
- Fullscreen widget expansion
- Widget categories (overview, analytics, activity)

#### Data Portability
- Export to JSON (complete backup)
- Export to Markdown (human-readable)
- Import with validation and preview
- Cloud backups via Supabase Storage
- Import options (skip history, reset progress)

#### Security
- Row Level Security on all tables
- Role-based access control
- Secure authentication (email, OAuth)
- Activity audit trail

### Technical

#### Stack
- Next.js 15.1 with App Router
- React 19
- TypeScript 5.7 (strict mode)
- Supabase (PostgreSQL + Auth + Storage)
- TanStack React Query 5.90
- Tailwind CSS 3.4
- Radix UI components
- Recharts 3.6

#### Database
- 14 consolidated migrations
- 28 tables with RLS policies
- 6 database views
- Activity event triggers
- Optimized indexes

#### Testing
- Vitest 4.0 test runner
- 700+ tests
- Testing Library for components
- Mock Supabase utilities
- Factory functions for test data

---

## Version History

- **1.0.0** (2026-01-24): Initial public release
