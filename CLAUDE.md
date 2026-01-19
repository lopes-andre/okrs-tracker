# OKRs Tracker - Project Context for Claude

This document provides comprehensive context for AI assistants working on this codebase.

## Project Overview

**OKRs Tracker** is a premium personal OKR (Objectives and Key Results) tracking application built with Next.js 15 and Supabase. It helps individuals manage annual objectives, quarterly key results, tasks, and track progress with beautiful analytics.

### Key Features
- **Objectives & Key Results**: Annual objectives with multiple KR types (metric, count, milestone, rate, average)
- **Quarterly Targets**: Break down annual KRs into quarterly milestones
- **Tasks**: Task management linked to OKRs with due dates, priorities, and tags
- **Check-ins**: Progress tracking through check-ins
- **Analytics**: Charts, pace analysis, burnup charts, activity heatmaps
- **Weekly Reviews**: Structured review system with reflection prompts
- **Mind Map**: Visual OKR hierarchy using React Flow
- **Activity Timeline**: Audit trail of all changes

## Tech Stack

### Core Framework
- **Next.js 15.1.0** - App Router with React Server Components
- **React 19.0.0** - Latest React with concurrent features
- **TypeScript 5.7** - Strict mode enabled

### Backend & Database
- **Supabase** - PostgreSQL database with Row Level Security
- **@supabase/ssr** - Server-side rendering support for auth
- **@supabase/supabase-js** - Client library

### State Management & Data Fetching
- **TanStack React Query 5.90** - Server state management with caching
- Custom query keys factory at `src/lib/query-client.tsx`

### UI & Styling
- **Tailwind CSS 3.4** - Utility-first CSS
- **Radix UI** - Headless accessible components:
  - Dialog, Dropdown Menu, Select, Tabs, Popover, Toast, Tooltip, etc.
- **class-variance-authority (CVA)** - Variant-based component styling
- **Lucide React** - Icon library
- **Recharts 3.6** - Charting library
- **@xyflow/react 12.10** - Flow-based diagrams (Mind Map)

### Utilities
- **date-fns 4.1** - Date manipulation
- **clsx + tailwind-merge** - Class name utilities
- **html-to-image** - Export functionality

### Testing
- **Vitest 4.0** - Test runner
- **@testing-library/react** - Component testing
- Coverage via @vitest/coverage-v8

## Project Structure

```
okrs-tracker/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── (auth)/            # Auth-related server actions
│   │   ├── auth/callback/     # OAuth callback route
│   │   ├── login/             # Login page
│   │   ├── plans/             # Main app routes (protected)
│   │   │   ├── [planId]/      # Dynamic plan routes
│   │   │   │   ├── analytics/ # Analytics dashboard
│   │   │   │   ├── mindmap/   # Mind map visualization
│   │   │   │   ├── okrs/      # OKRs management
│   │   │   │   ├── reviews/   # Weekly reviews
│   │   │   │   ├── settings/  # Plan settings
│   │   │   │   ├── tasks/     # Tasks management
│   │   │   │   └── timeline/  # Activity timeline
│   │   │   └── page.tsx       # Plans list
│   │   ├── globals.css        # Global styles
│   │   └── layout.tsx         # Root layout
│   │
│   ├── components/            # React components
│   │   ├── activity/          # Activity feed components
│   │   ├── analytics/         # Charts and analytics
│   │   ├── layout/            # Layout components (Navbar, PageHeader, EmptyState)
│   │   ├── mindmap/           # Mind map components
│   │   ├── okr/               # OKR-specific components
│   │   ├── tags/              # Tag management components
│   │   ├── tasks/             # Task-related components
│   │   ├── ui/                # Base UI components (Radix-based)
│   │   └── weekly-review/     # Weekly review components
│   │
│   ├── features/              # Feature modules (API + hooks)
│   │   ├── analytics/
│   │   ├── annual-krs/
│   │   ├── check-ins/
│   │   ├── dashboards/
│   │   ├── mindmap/
│   │   ├── objectives/
│   │   ├── plans/
│   │   ├── progress/
│   │   ├── quarter-targets/
│   │   ├── tags/
│   │   ├── tasks/
│   │   ├── timeline/
│   │   └── weekly-reviews/
│   │
│   ├── lib/                   # Core utilities
│   │   ├── supabase/          # Supabase client configs
│   │   ├── api-utils.ts       # API helpers (error handling, pagination)
│   │   ├── design-tokens.ts   # Design system tokens
│   │   ├── progress-engine.ts # OKR progress calculations
│   │   ├── query-client.tsx   # React Query provider & keys
│   │   ├── toast-utils.ts     # Toast message utilities
│   │   ├── utils.ts           # General utilities
│   │   └── weekly-review-engine.ts
│   │
│   └── middleware.ts          # Auth middleware
│
├── supabase/
│   ├── migrations/            # Database migrations
│   ├── config.toml            # Supabase local config
│   └── seed.sql               # Seed data
│
├── coverage/                  # Test coverage reports
├── tailwind.config.ts         # Tailwind configuration
├── tsconfig.json              # TypeScript config
├── vitest.config.ts           # Vitest config
└── package.json
```

## Architectural Patterns

### 1. Feature-Based Organization

Each domain has its own module in `src/features/` containing:
- `api.ts` - Supabase queries and mutations
- `hooks.ts` - React Query hooks wrapping the API

```typescript
// src/features/objectives/api.ts
export async function getObjectives(planId: string): Promise<Objective[]> {
  const supabase = createClient();
  return handleSupabaseError(
    supabase.from("objectives").select("*").eq("plan_id", planId)
  );
}

// src/features/objectives/hooks.ts
export function useObjectives(planId: string) {
  return useQuery({
    queryKey: queryKeys.objectives.list(planId),
    queryFn: () => api.getObjectives(planId),
    enabled: !!planId,
  });
}
```

### 2. Query Key Factory

Centralized query keys in `src/lib/query-client.tsx` for cache management:

```typescript
export const queryKeys = {
  plans: {
    all: ["plans"] as const,
    list: () => [...queryKeys.plans.all, "list"] as const,
    detail: (planId: string) => [...queryKeys.plans.all, "detail", planId] as const,
  },
  objectives: {
    all: ["objectives"] as const,
    list: (planId: string) => [...queryKeys.objectives.all, "list", planId] as const,
    // ...
  },
  // ...
};
```

### 3. Supabase Client Strategy

Three client types for different contexts:

```typescript
// Client-side (browser) - src/lib/supabase/client.ts
export function createClient() {
  return createBrowserClient<Database>(url, key);
}

// Server-side (RSC, Server Actions) - src/lib/supabase/server.ts
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient<Database>(url, key, { cookies: {...} });
}

// Untyped client for complex queries - src/lib/supabase/untyped-client.ts
export function createUntypedClient() {
  return createBrowserClient(url, key); // No Database type
}
```

### 4. Error Handling Pattern

Consistent error handling with user-friendly messages:

```typescript
// src/lib/api-utils.ts
export class ApiError extends Error {
  get userMessage(): string {
    switch (this.code) {
      case "23505": return "This item already exists.";
      case "42501": return "You don't have permission.";
      // ...
    }
  }
}

export async function handleSupabaseError<T>(query): Promise<T> {
  const { data, error } = await query;
  if (error) throw new ApiError(error);
  return data;
}
```

### 5. Toast Notifications

Standardized toast messages in `src/lib/toast-utils.ts`:

```typescript
export const successMessages = {
  taskCreated: { title: "Task created", variant: "success" },
  taskCompleted: { title: "Task completed", description: "Great work! 🎉", variant: "success" },
  // ...
};
```

### 6. Progress Engine

Pure, testable functions in `src/lib/progress-engine.ts` for:
- Computing current values
- Progress percentages (0-1)
- Expected progress (pace baseline)
- Pace status (ahead/on_track/at_risk/off_track)
- Forecasts
- Daily/weekly series
- Rollups (Objective & Plan level)

## Design System

### Kympler-Inspired Design
The app follows a premium, minimalist aesthetic:
- Neutral color palette with soft grays
- Professional blue accent (#2563EB)
- Crisp typography (Plus Jakarta Sans for headings, Inter for body)
- Soft shadows and rounded corners
- Generous whitespace

### Color Tokens (Tailwind)
```typescript
colors: {
  bg: { 0: "#FFFFFF", 1: "#F5F5F5", 2: "rgba(245,245,245,0.35)" },
  text: { strong: "#000", DEFAULT: "#000", muted: "rgba(0,0,0,0.60)" },
  border: { DEFAULT: "rgba(0,0,0,0.10)", soft: "rgba(0,0,0,0.08)" },
  status: { success: "#22C55E", warning: "#F59E0B", danger: "#EF4444" },
  accent: { DEFAULT: "#2563EB", hover: "#1D4ED8" },
}
```

### UI Components
Based on Radix UI with CVA variants. All in `src/components/ui/`:
- Button (variants: default, secondary, ghost, outline, danger)
- Card, Dialog, Dropdown, Select, Tabs, Toast, etc.

## Database Schema

### Core Tables
- `profiles` - User profiles (synced from auth.users)
- `plans` - OKR plans (yearly)
- `plan_members` - Plan membership with roles (owner/editor/viewer)
- `objectives` - Annual objectives within plans
- `annual_krs` - Key Results with types (metric/count/milestone/rate/average)
- `quarter_targets` - Quarterly targets for KRs
- `tasks` - Tasks linked to objectives or KRs
- `check_ins` - Progress check-ins
- `tags` - Tags for categorizing tasks
- `task_tags` - Many-to-many junction table
- `activity_events` - Audit trail (auto-populated by triggers)
- `weekly_reviews` - Weekly review records

### Row Level Security
All tables have RLS policies based on `plan_members` relationship. Users can only access data from plans they're members of.

## Development Workflow

### Commands
```bash
npm run dev          # Start development server
npm run build        # Production build
npm run lint         # ESLint check
npm run test         # Run Vitest tests
npm run test:run     # Single test run
npm run test:coverage # Tests with coverage
```

### Environment Variables
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

### Supabase Local Development
```bash
supabase start       # Start local Supabase
supabase db reset    # Reset and re-run migrations
supabase migration new <name>  # Create new migration
```

## Key Conventions

### File Naming
- Components: `PascalCase.tsx` (e.g., `TaskDialog.tsx`)
- Utils/hooks: `kebab-case.ts` (e.g., `use-toast.ts`)
- Feature modules: `api.ts`, `hooks.ts`

### Component Patterns
- "use client" directive for client components
- Props interfaces defined inline or co-located
- Destructure props in function signature
- Use `cn()` utility for conditional classes

### Import Order
1. React/Next.js imports
2. Third-party libraries
3. Internal components (`@/components/`)
4. Internal features/hooks (`@/features/`)
5. Internal utilities (`@/lib/`)
6. Types

### TypeScript
- Strict mode enabled
- Types in `src/lib/supabase/types.ts`
- Use `type` imports when only importing types

## Current State & Known Issues

### Recently Completed
- Tags management page in Settings
- Weekly reviews system
- Activity timeline with filtering
- Mind map visualization

### Known Technical Debt
- Some TypeScript errors in analytics components (Recharts types)
- Activity filters type export issue in settings page
- Some pace status comparisons use wrong string format

### Pending Improvements
- Optimistic updates for better UX
- Offline support consideration
- Export functionality for reports
- Dashboard customization

## Testing

Tests are in `*.test.ts` files alongside source:
- `src/lib/progress-engine.test.ts` - Progress calculations
- `src/lib/weekly-review-engine.test.ts` - Weekly review logic
- `src/components/mindmap/__tests__/` - Mindmap unit tests

Run tests:
```bash
npm test                # Watch mode
npm run test:run        # Single run
npm run test:coverage   # With coverage
```

## Tips for AI Assistants

1. **Always check existing patterns** - Look at similar features before implementing
2. **Use the feature module structure** - API in `api.ts`, hooks in `hooks.ts`
3. **Follow the query key pattern** - Add new keys to `queryKeys` factory
4. **Toast messages** - Add success/error messages to `toast-utils.ts`
5. **Invalidate related queries** - On mutations, invalidate affected query keys
6. **TypeScript strict** - All code must pass strict type checking
7. **Design tokens** - Use existing Tailwind classes, not arbitrary values
8. **Component composition** - Prefer composition over configuration
