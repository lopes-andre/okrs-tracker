# Frontend Code - `src/`

Frontend source code for the OKRs Tracker application.

## Overview

| Directory | Purpose | Documentation |
|-----------|---------|---------------|
| `app/` | Next.js App Router pages and layouts | Below |
| `components/` | React components by domain | [CLAUDE.md](./components/CLAUDE.md) |
| `features/` | Data layer (API + React Query hooks) | [CLAUDE.md](./features/CLAUDE.md) |
| `lib/` | Core utilities and business logic | [CLAUDE.md](./lib/CLAUDE.md) |

## Architecture Principles

### 1. Separation of Concerns

```
Page (app/)           → Layout, composition, navigation
  └─ Component        → UI rendering, user interactions
       └─ Hook        → Data fetching, mutations (features/)
            └─ API    → Supabase queries (features/)
                 └─ Utils → Business logic (lib/)
```

### 2. Server vs Client Components

```tsx
// Default: Server Component (no directive needed)
// Can read from server, no client state
export default function Page() { ... }

// Client Component: Add "use client" directive
// For interactivity, hooks, browser APIs
"use client";
export function InteractiveWidget() { ... }
```

**Guidelines:**
- Pages are Server Components by default
- Components with `useState`, `useEffect`, or event handlers need `"use client"`
- Keep client boundaries as low as possible in the tree
- Import client components into server components (not vice versa)

### 3. Data Flow

```
[Supabase] ←→ [API functions] ←→ [React Query hooks] ←→ [Components]
                                        ↓
                              [Query Cache (TanStack)]
```

## App Router Structure (`app/`)

```
src/app/
├── layout.tsx              # Root layout (providers, fonts)
├── page.tsx                # Landing/redirect
├── globals.css             # Global styles + Tailwind
│
├── (auth)/                 # Auth route group (server actions)
│   ├── sign-in/action.ts   # Sign-in server action
│   ├── sign-out/action.ts  # Sign-out server action
│   └── sign-up/action.ts   # Sign-up server action
│
├── auth/
│   └── callback/route.ts   # OAuth callback handler
│
├── login/
│   └── page.tsx            # Login page
│
└── plans/                  # Protected routes (require auth)
    ├── layout.tsx          # Plans layout with auth check
    ├── page.tsx            # Plans list
    └── [planId]/           # Dynamic plan routes
        ├── layout.tsx      # Plan layout with navigation
        ├── page.tsx        # Plan dashboard
        ├── analytics/      # Analytics dashboard
        ├── okrs/           # OKR management
        ├── reviews/        # Weekly reviews
        ├── settings/       # Plan settings
        ├── tasks/          # Task management
        └── timeline/       # Activity timeline
```

### Routing Conventions

| Pattern | Purpose | Example |
|---------|---------|---------|
| `page.tsx` | Route endpoint | `/plans/page.tsx` → `/plans` |
| `layout.tsx` | Shared layout | Wraps children routes |
| `[param]` | Dynamic segment | `[planId]` captures plan ID |
| `(group)` | Route group | `(auth)` groups without URL segment |
| `route.ts` | API route | OAuth callback handler |
| `action.ts` | Server actions | Form submissions |

### Protected Routes

All routes under `/plans` require authentication. The layout checks auth state:

```tsx
// src/app/plans/layout.tsx
export default async function PlansLayout({ children }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return <>{children}</>;
}
```

## Styling Conventions

### Tailwind Patterns

```tsx
// Use cn() for conditional classes
import { cn } from "@/lib/utils";

<div className={cn(
  "p-4 rounded-lg border",           // Base styles
  isActive && "border-accent",        // Conditional
  variant === "ghost" && "bg-transparent"
)} />
```

### Class Order

Follow this order for consistency:
1. Layout: `flex`, `grid`, `block`
2. Positioning: `relative`, `absolute`
3. Spacing: `p-`, `m-`, `gap-`
4. Sizing: `w-`, `h-`, `max-w-`
5. Typography: `text-`, `font-`
6. Colors: `bg-`, `text-`, `border-`
7. Effects: `shadow-`, `opacity-`
8. Transitions: `transition-`, `animate-`

### Design Tokens

Use semantic tokens instead of raw colors:

```tsx
// ✓ Good - semantic tokens
className="bg-bg-0 text-text border-border-soft"
className="text-text-muted"
className="text-status-success"
className="bg-accent text-white"

// ✗ Avoid - raw colors
className="bg-white text-black"
className="text-gray-500"
```

**Available Tokens:**

| Category | Tokens |
|----------|--------|
| Background | `bg-0` (white), `bg-1` (gray), `bg-2` (translucent) |
| Text | `text` (default), `text-strong`, `text-muted` |
| Border | `border` (default), `border-soft` |
| Status | `status-success`, `status-warning`, `status-danger` |
| Accent | `accent` (blue), `accent-hover` |

### Responsive Design

```tsx
// Mobile-first approach
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
  {/* 1 col mobile, 2 cols tablet, 4 cols desktop */}
</div>

// Common breakpoints
// sm: 640px, md: 768px, lg: 1024px, xl: 1280px
```

## State Management

### Server State (React Query)

All server data flows through TanStack Query hooks:

```tsx
"use client";

import { useObjectives } from "@/features/objectives/hooks";

function ObjectiveList({ planId }) {
  const { data, isLoading, error } = useObjectives(planId);

  if (isLoading) return <Skeleton />;
  if (error) return <ErrorMessage error={error} />;

  return <ul>{data.map(o => ...)}</ul>;
}
```

### Local State

Use React state for UI-only concerns:

```tsx
// Dialog open state
const [isOpen, setIsOpen] = useState(false);

// Form state
const [formData, setFormData] = useState({ name: "" });

// Filter state
const [filters, setFilters] = useState<Filters>({});
```

### URL State

Use URL params for shareable/bookmarkable state:

```tsx
// Reading from URL
const searchParams = useSearchParams();
const view = searchParams.get("view") || "grid";

// Updating URL
const router = useRouter();
router.push(`?view=list`);
```

## Component Patterns

### Standard Component

```tsx
"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { Objective } from "@/lib/supabase/types";

interface ObjectiveCardProps {
  objective: Objective;
  onEdit?: () => void;
  className?: string;
}

export function ObjectiveCard({
  objective,
  onEdit,
  className
}: ObjectiveCardProps) {
  return (
    <div className={cn("p-4 rounded-card border", className)}>
      <h3 className="font-medium">{objective.name}</h3>
      {onEdit && (
        <Button variant="ghost" size="sm" onClick={onEdit}>
          Edit
        </Button>
      )}
    </div>
  );
}
```

### Page Component

```tsx
// Server Component by default
import { Suspense } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { ObjectiveList } from "@/components/okr/objective-list";
import { ObjectiveListSkeleton } from "@/components/okr/objective-list-skeleton";

interface PageProps {
  params: Promise<{ planId: string }>;
}

export default async function OkrsPage({ params }: PageProps) {
  const { planId } = await params;

  return (
    <div className="container py-6 space-y-6">
      <PageHeader
        title="OKRs"
        description="Manage your objectives and key results"
      />

      <Suspense fallback={<ObjectiveListSkeleton />}>
        <ObjectiveList planId={planId} />
      </Suspense>
    </div>
  );
}
```

### Dialog Pattern

```tsx
"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";

interface CreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: FormData) => Promise<void>;
}

export function CreateDialog({ open, onOpenChange, onSubmit }: CreateDialogProps) {
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) setName("");
  }, [open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSubmit({ name });
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Item</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter name"
            required
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

## Import Conventions

Order imports consistently:

```tsx
// 1. React/Next.js
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

// 2. Third-party libraries
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { Loader2, Plus, Trash } from "lucide-react";

// 3. Internal components
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";

// 4. Internal features/hooks
import { useObjectives, useCreateObjective } from "@/features/objectives/hooks";

// 5. Internal utilities
import { cn } from "@/lib/utils";
import { queryKeys } from "@/lib/query-client";

// 6. Types (use type imports)
import type { Objective, Plan } from "@/lib/supabase/types";
```

## Error Handling

### In Components

```tsx
function DataDisplay({ planId }: { planId: string }) {
  const { data, isLoading, error } = useData(planId);

  if (isLoading) {
    return <Skeleton />;
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-status-danger">Failed to load data</p>
        <p className="text-text-muted text-sm">{error.message}</p>
      </div>
    );
  }

  return <DataView data={data} />;
}
```

### In Mutations

```tsx
const { mutate, isPending } = useCreateItem();

function handleCreate(data: ItemData) {
  mutate(data, {
    onSuccess: () => {
      // Handle success (toast shown by hook)
      onOpenChange(false);
    },
    onError: (error) => {
      // Handle error (toast shown by hook)
      console.error("Create failed:", error);
    },
  });
}
```

## Performance Tips

1. **Colocate components** - Keep components close to where they're used
2. **Lazy load dialogs** - Use `dynamic()` for heavy dialogs
3. **Memoize expensive renders** - Use `useMemo` for derived data
4. **Batch updates** - Group related state updates
5. **Avoid prop drilling** - Use context or composition
6. **Prefetch data** - Use `queryClient.prefetchQuery()` for anticipated navigation

## Testing

Tests are co-located with source files:

```
src/lib/progress-engine.ts
src/lib/progress-engine.test.ts
```

Run tests:
```bash
npm test              # Watch mode
npm run test:run      # Single run
npm run test:coverage # With coverage
```
