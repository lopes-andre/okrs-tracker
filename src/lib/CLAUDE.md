# Library Module - `src/lib/`

Core utilities, configurations, and business logic.

## Files Overview

### `supabase/` - Database Clients

| File | Purpose |
|------|---------|
| `client.ts` | Browser-side Supabase client (typed) |
| `server.ts` | Server-side Supabase client (RSC, Server Actions) |
| `untyped-client.ts` | Untyped client for complex queries |
| `middleware.ts` | Session refresh middleware |
| `types.ts` | All database types and interfaces |

#### Client Usage Pattern
```typescript
// In client components (hooks, API functions)
import { createUntypedClient as createClient } from "@/lib/supabase/untyped-client";

// In server components/actions
import { createClient } from "@/lib/supabase/server";
```

### `api-utils.ts` - API Helpers

**Error Handling:**
```typescript
// Throw on error, return data
const data = await handleSupabaseError(query);

// Return null if not found, throw on other errors
const item = await handleSupabaseQuery(query);
```

**Pagination:**
```typescript
const { from, to } = getPaginationRange(page, limit);
const result = createPaginatedResult(data, count, page, limit);
```

### `query-client.tsx` - React Query Setup

**Provider:**
```tsx
// Used in root layout
<QueryProvider>
  {children}
</QueryProvider>
```

**Query Keys Factory:**
```typescript
queryKeys.tasks.list(planId)           // ["tasks", "list", planId]
queryKeys.tasks.detail(taskId)         // ["tasks", "detail", taskId]
queryKeys.objectives.withKrs(planId)   // ["objectives", "withKrs", planId]
```

### `progress-engine.ts` - OKR Calculations

**Pure functions for progress computation. No side effects, fully testable.**

Key Types:
- `PaceStatus`: `"ahead" | "on_track" | "at_risk" | "off_track"`
- `ProgressResult`: Complete progress state for a KR
- `QuarterProgressResult`: Quarter-specific progress

Key Functions:
```typescript
// Main entry point for KR progress
computeKrProgress(kr, checkIns, tasks, planYear, asOfDate)

// Quarter target progress
computeQuarterProgress(quarterTarget, kr, checkIns, planYear)

// Rollups
computeObjectiveProgress(objective, krProgresses)
computePlanProgress(planId, objectiveProgresses)

// Time series
buildDailySeries(kr, checkIns, window)
buildWeeklySeries(dailySeries)

// Display helpers
formatProgress(0.75)      // "75%"
formatPaceStatus("ahead") // "Ahead"
```

### `toast-utils.ts` - Notification Messages

**Success Messages:**
```typescript
successMessages.taskCreated   // { title: "Task created", variant: "success" }
successMessages.taskCompleted // { title: "Task completed", description: "Great work! 🎉" }
```

**Error Formatting:**
```typescript
formatErrorMessage(error) // Returns { title, description, variant: "destructive" }
```

### `utils.ts` - General Utilities

```typescript
cn("class1", condition && "class2")  // Merge Tailwind classes
```

### `design-tokens.ts` - Design System Values

Type-safe access to design values when needed in JS:
```typescript
colors.accent.default  // "#2563EB"
typography.fontSize.h1 // { desktop: "52px", mobile: "40px" }
spacing.gap.lg         // "24px"
shadows.card           // "0 6px 18px rgba(0, 0, 0, 0.06)"
```

### `weekly-review-engine.ts` - Review Logic

Functions for weekly review system:
```typescript
getWeekNumber(date)
getWeekDates(year, weekNumber)
calculateReviewStats(events)
```

## Common Patterns

### Adding a New Query Key
```typescript
// In query-client.tsx
export const queryKeys = {
  // ...existing keys
  myFeature: {
    all: ["myFeature"] as const,
    list: (planId: string) => [...queryKeys.myFeature.all, "list", planId] as const,
  },
};
```

### Adding a Success Message
```typescript
// In toast-utils.ts
export const successMessages = {
  // ...existing
  myFeatureCreated: { title: "Created", variant: "success" as const },
};
```

### Extending API Utils
```typescript
// For new helper patterns, add to api-utils.ts
export function myHelper(...) {
  // Implementation
}
```

## Testing

Tests are co-located:
- `progress-engine.test.ts` - Progress calculations
- `weekly-review-engine.test.ts` - Review logic

Run: `npm test` or `npm run test:coverage`
