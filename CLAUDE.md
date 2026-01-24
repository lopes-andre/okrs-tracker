# OKRs Tracker - AI Assistant Instructions

This document provides comprehensive context for AI assistants (Claude Code and others) working on this codebase.

## Project Overview

**OKRs Tracker** is a full-featured OKR (Objectives and Key Results) tracking application for individuals and teams. Built with Next.js 15 and Supabase, it helps users manage annual objectives, quarterly key results, tasks, and track progress with analytics.

### Core Domain Concepts

| Concept | Description |
|---------|-------------|
| **Plan** | A yearly OKR plan (e.g., "2026 Goals") |
| **Objective** | A high-level annual goal (e.g., "O1: Grow Audience") |
| **Key Result (KR)** | A measurable outcome for an objective |
| **Quarter Target** | Quarterly milestone for a KR (Q1-Q4) |
| **Task** | Actionable work item linked to OKRs |
| **Check-in** | Progress update for a KR |
| **Weekly Review** | Structured reflection on the week |

### KR Types
- **Metric**: Numeric value (followers, revenue)
- **Count**: Integer count (posts published)
- **Milestone**: Binary completion (launch feature)
- **Rate**: Percentage or ratio (conversion rate)
- **Average**: Mean value (engagement rate)

### KR Directions
- **Increase**: Goal is to grow the value
- **Decrease**: Goal is to reduce the value
- **Maintain**: Goal is to stay within range

## Tech Stack

| Category | Technology | Version |
|----------|------------|---------|
| Framework | Next.js (App Router) | 15.1 |
| Language | TypeScript (strict) | 5.7 |
| UI | React | 19.0 |
| Styling | Tailwind CSS | 3.4 |
| Components | Radix UI + CVA | Various |
| State | TanStack React Query | 5.90 |
| Charts | Recharts | 3.6 |
| Database | Supabase (PostgreSQL) | 2.47 |
| Validation | Zod | 4.3 |
| Testing | Vitest + Testing Library | 4.0 |
| Dates | date-fns | 4.1 |
| Icons | Lucide React | 0.468 |

## Project Structure

```
okrs-tracker/
├── src/
│   ├── app/                      # Next.js App Router
│   │   ├── (auth)/               # Auth server actions
│   │   ├── auth/callback/        # OAuth callback
│   │   ├── login/                # Login page
│   │   └── plans/                # Protected routes
│   │       ├── page.tsx          # Plans list
│   │       └── [planId]/         # Plan routes
│   │           ├── page.tsx      # Dashboard
│   │           ├── okrs/         # OKR management
│   │           ├── tasks/        # Task management
│   │           │   └── logbook/  # Completed tasks
│   │           ├── analytics/    # Charts & insights
│   │           ├── reviews/      # Weekly reviews
│   │           │   └── [reviewId]/ # Review wizard
│   │           ├── timeline/     # Activity feed
│   │           └── settings/     # Plan settings
│   │
│   ├── components/               # React components
│   │   ├── ui/                   # Base Radix UI components
│   │   ├── layout/               # Navbar, PageHeader, EmptyState
│   │   ├── dashboard/            # Widget-based dashboard
│   │   ├── okr/                  # OKR components
│   │   ├── tasks/                # Task components
│   │   ├── tags/                 # Tag management
│   │   ├── activity/             # Activity timeline
│   │   ├── analytics/            # Charts and data viz
│   │   ├── comments/             # Comment system
│   │   ├── import-export/        # Import/export UI
│   │   └── weekly-review/        # Review components
│   │
│   ├── features/                 # Data layer (API + hooks)
│   │   ├── plans/                # Plan management
│   │   ├── objectives/           # Objectives CRUD
│   │   ├── annual-krs/           # Key Results CRUD
│   │   ├── quarter-targets/      # Quarter targets
│   │   ├── tasks/                # Task management
│   │   ├── task-recurrence/      # Recurring tasks
│   │   ├── check-ins/            # Progress check-ins
│   │   ├── tags/                 # Tags & KR groups
│   │   ├── comments/             # Comments & mentions
│   │   ├── notifications/        # In-app notifications
│   │   ├── timeline/             # Activity events
│   │   ├── weekly-reviews/       # Weekly reviews
│   │   ├── dashboards/           # Dashboard widgets
│   │   ├── analytics/            # Analytics queries
│   │   ├── team-analytics/       # Team workload stats
│   │   ├── progress/             # Progress computations
│   │   └── import-export/        # Data portability
│   │
│   ├── lib/                      # Core utilities
│   │   ├── supabase/             # Supabase clients & types
│   │   ├── progress-engine.ts    # OKR progress calculations
│   │   ├── weekly-review-engine.ts # Review logic
│   │   ├── recurrence-engine.ts  # Task recurrence logic
│   │   ├── query-client.tsx      # React Query setup
│   │   ├── api-utils.ts          # API helpers
│   │   ├── toast-utils.ts        # Toast messages
│   │   ├── design-tokens.ts      # Design system values
│   │   └── utils.ts              # General utilities
│   │
│   ├── test/                     # Test utilities
│   │   ├── factories/            # Test data factories
│   │   ├── mocks/                # Mock implementations
│   │   └── utils/                # Test helpers
│   │
│   └── middleware.ts             # Auth middleware
│
├── supabase/
│   ├── migrations/               # 14 consolidated migrations
│   ├── scripts/                  # Utility SQL scripts
│   └── config.toml               # Local Supabase config
│
└── docs/                         # Documentation
```

## Key Architectural Patterns

### 1. Feature Module Pattern

Each domain has its own module in `src/features/`:

```
src/features/tasks/
├── api.ts      # Supabase queries/mutations
├── hooks.ts    # React Query hooks
└── index.ts    # Re-exports
```

**API Layer:**
```typescript
// api.ts
import { createUntypedClient as createClient } from "@/lib/supabase/untyped-client";
import { handleSupabaseError } from "@/lib/api-utils";

export async function getTasks(planId: string): Promise<Task[]> {
  const supabase = createClient();
  return handleSupabaseError(
    supabase.from("tasks").select("*").eq("plan_id", planId)
  );
}
```

**Hooks Layer:**
```typescript
// hooks.ts
"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-client";
import * as api from "./api";

export function useTasks(planId: string) {
  return useQuery({
    queryKey: queryKeys.tasks.list(planId),
    queryFn: () => api.getTasks(planId),
    enabled: !!planId,
  });
}
```

### 2. Query Key Factory

Centralized cache keys in `src/lib/query-client.tsx`:

```typescript
export const queryKeys = {
  tasks: {
    all: ["tasks"] as const,
    list: (planId: string) => [...queryKeys.tasks.all, "list", planId] as const,
    detail: (id: string) => [...queryKeys.tasks.all, "detail", id] as const,
  },
  // ... other domains
};
```

### 3. Supabase Client Strategy

Three client types for different contexts:

| Client | File | Use Case |
|--------|------|----------|
| Typed | `client.ts` | Browser, typed queries |
| Server | `server.ts` | RSC, Server Actions |
| Untyped | `untyped-client.ts` | Complex/dynamic queries |

### 4. Progress Engine

Pure functions in `src/lib/progress-engine.ts` for OKR calculations:
- Progress percentages
- Pace status (ahead/on_track/at_risk/off_track)
- Forecasting
- Rollups (Objective and Plan level)

## Development Workflow

### Branch Naming
```
feature/description    # New features
fix/description        # Bug fixes
refactor/description   # Code refactoring
docs/description       # Documentation
chore/description      # Maintenance
```

### Commit Messages
Use conventional commits:
```
feat(tasks): add recurring task scheduling
fix(auth): resolve session refresh issue
refactor(progress): simplify calculation logic
docs(readme): update setup instructions
```

### PR Process
1. Create feature branch from `main`
2. Make changes with tests
3. Ensure `npm run build` passes
4. Submit PR with description
5. Merge to `main` after review

## Code Conventions

### File Naming
- Components: `PascalCase.tsx` (e.g., `TaskDialog.tsx`)
- Utilities: `kebab-case.ts` (e.g., `progress-engine.ts`)
- Tests: `*.test.ts` or `*.test.tsx`

### Component Structure
```tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useTasks } from "@/features/tasks";
import type { Task } from "@/lib/supabase/types";

interface TaskListProps {
  planId: string;
  onSelect?: (task: Task) => void;
}

export function TaskList({ planId, onSelect }: TaskListProps) {
  const { data: tasks, isLoading } = useTasks(planId);
  // ...
}
```

### Import Order
1. React/Next.js
2. Third-party libraries
3. Internal components (`@/components/`)
4. Internal features (`@/features/`)
5. Internal utilities (`@/lib/`)
6. Types

### TypeScript
- Strict mode enabled
- Types in `src/lib/supabase/types.ts`
- Use `type` imports for type-only imports
- All new code must pass type checking

## Database Conventions

### Table Naming
- Plural, snake_case: `tasks`, `annual_krs`, `plan_members`
- Junction tables: `task_tags`, `annual_kr_tags`

### Column Naming
- snake_case: `created_at`, `plan_id`, `is_recurring`
- Foreign keys: `{table}_id` (e.g., `task_id`, `user_id`)
- Timestamps: `created_at`, `updated_at`, `completed_at`

### RLS Policies
All tables use Row Level Security based on `plan_members`:
```sql
CREATE POLICY "Users can view in their plans" ON tasks
  FOR SELECT USING (
    plan_id IN (SELECT plan_id FROM plan_members WHERE user_id = auth.uid())
  );
```

### Functions
- Use `SET search_path = ''` for security
- Prefix table references with `public.`
- Use `SECURITY DEFINER` only when necessary

## Testing

### Test Location
Tests are co-located with source files:
- `progress-engine.test.ts` next to `progress-engine.ts`
- `hooks.test.ts` next to `hooks.ts`

### Running Tests
```bash
npm test              # Watch mode
npm run test:run      # Single run
npm run test:coverage # With coverage
```

### Test Patterns
- Use factories from `src/test/factories/`
- Mock Supabase with `src/test/mocks/supabase.ts`
- Test behavior, not implementation

## Common Tasks

### Adding a New Feature

1. **Database** (if needed):
   ```bash
   # Add to appropriate migration file or create new one
   supabase db reset
   ```

2. **Types** in `src/lib/supabase/types.ts`

3. **Feature module**:
   - `src/features/myFeature/api.ts`
   - `src/features/myFeature/hooks.ts`

4. **Query keys** in `src/lib/query-client.tsx`

5. **Toast messages** in `src/lib/toast-utils.ts`

6. **Components** in `src/components/myFeature/`

7. **Route** in `src/app/plans/[planId]/myFeature/`

### Adding a Settings Tab

1. Create component in `src/components/`
2. Import in `src/app/plans/[planId]/settings/page.tsx`
3. Add `TabsTrigger` and `TabsContent`

### Adding an Analytics Widget

1. Define widget in `src/components/dashboard/widget-registry.ts`
2. Create widget component in `src/components/dashboard/widgets/`
3. Add to `widget-renderer.tsx`

## Do's and Don'ts

### DO
- ✅ Check existing patterns before implementing
- ✅ Use the feature module structure (api.ts + hooks.ts)
- ✅ Add query keys to the centralized factory
- ✅ Invalidate related queries on mutations
- ✅ Use toast notifications for user feedback
- ✅ Follow TypeScript strict mode
- ✅ Write tests for business logic
- ✅ Use existing design tokens and components

### DON'T
- ❌ Create new patterns when existing ones work
- ❌ Skip type checking
- ❌ Forget to invalidate related queries
- ❌ Use arbitrary Tailwind values (use design tokens)
- ❌ Expose service role keys to the browser
- ❌ Skip RLS policies on new tables
- ❌ Leave console.log statements in production code

## Useful Commands

```bash
# Development
npm run dev              # Start dev server
npm run build            # Production build
npm run lint             # Run ESLint

# Testing
npm test                 # Watch mode
npm run test:run         # Single run
npm run test:coverage    # With coverage

# Database
supabase start           # Start local Supabase
supabase stop            # Stop local Supabase
supabase db reset        # Reset and re-run migrations
supabase migration new X # Create new migration
```

## Related Documentation

- [Getting Started](./docs/getting-started.md) - Setup guide
- [Architecture](./docs/architecture.md) - System design
- [Database](./docs/database.md) - Schema documentation
- [Testing](./docs/testing.md) - Testing guide
- [Deployment](./docs/deployment.md) - Production setup

### Domain-Specific Instructions
- [Components](./src/components/CLAUDE.md)
- [Features](./src/features/CLAUDE.md)
- [Library](./src/lib/CLAUDE.md)
- [Supabase](./supabase/CLAUDE.md)
