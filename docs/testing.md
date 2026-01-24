# Testing Guide

Comprehensive testing documentation for the OKRs Tracker application.

## Overview

| Metric | Value |
|--------|-------|
| Test Runner | Vitest 4.0 |
| Component Testing | @testing-library/react 16.3 |
| Coverage Tool | @vitest/coverage-v8 |
| Test Files | 20+ |
| Total Tests | 700+ |

## Running Tests

```bash
# Watch mode (development)
npm test

# Single run
npm run test:run

# With coverage report
npm run test:coverage

# Run specific file
npm test -- src/lib/progress-engine.test.ts

# Run tests matching pattern
npm test -- --grep "computeKrProgress"

# Run with UI (browser-based)
npm run test:ui

# CI mode (for pipelines)
npm run test:ci
```

## Test Architecture

```
src/
├── test/                       # Test utilities and setup
│   ├── factories/              # Test data factories
│   │   └── index.ts            # Type-safe factory functions
│   ├── mocks/                  # Mock implementations
│   │   └── supabase.ts         # Supabase client mock
│   ├── utils/                  # Test helpers
│   │   └── render.tsx          # Custom render with providers
│   └── setup.ts                # Vitest global setup
│
├── lib/                        # Library tests (co-located)
│   ├── progress-engine.test.ts
│   ├── weekly-review-engine.test.ts
│   └── api-utils.test.ts
│
├── features/                   # Feature module tests (co-located)
│   ├── plans/
│   │   ├── api.test.ts
│   │   └── hooks.test.ts
│   └── ...
│
└── components/                 # Component tests (co-located)
    └── okr/
        ├── pace-badge.test.tsx
        └── progress-display.test.tsx
```

## Test Categories

### 1. Unit Tests - Pure Functions

Test pure utility functions with no external dependencies.

**Location**: `src/lib/*.test.ts`

**Example**:

```typescript
import { describe, it, expect } from "vitest";
import { computeKrProgress } from "./progress-engine";
import { createAnnualKr, createCheckIn } from "@/test/factories";

describe("computeKrProgress", () => {
  it("should calculate progress for metric type KR", () => {
    const kr = createAnnualKr({
      kr_type: "metric",
      start_value: 0,
      target_value: 100,
    });
    const checkIns = [createCheckIn({ value: 50 })];

    const result = computeKrProgress(kr, checkIns, [], 2026);

    expect(result.progress).toBe(0.5);
    expect(result.currentValue).toBe(50);
  });

  it("should handle decrease direction", () => {
    const kr = createAnnualKr({
      direction: "decrease",
      start_value: 100,
      target_value: 0,
      current_value: 50,
    });

    const result = computeKrProgress(kr, [], [], 2026);

    expect(result.progress).toBe(0.5);
  });
});
```

### 2. API Tests - Supabase Queries

Test API functions that interact with Supabase.

**Location**: `src/features/*/api.test.ts`

**Pattern**:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockSupabase } from "@/test/mocks/supabase";
import { createTask } from "@/test/factories";

const { mockRef } = vi.hoisted(() => ({
  mockRef: { current: null as ReturnType<typeof createMockSupabase> | null },
}));

vi.mock("@/lib/supabase/untyped-client", () => ({
  createUntypedClient: () => mockRef.current?.mockSupabase,
}));

import * as api from "./api";

function getMock() {
  return mockRef.current!;
}

describe("Tasks API", () => {
  beforeEach(() => {
    mockRef.current = createMockSupabase();
  });

  it("should fetch tasks for plan", async () => {
    const task = createTask({ plan_id: "plan-123" });
    getMock().setMockData("tasks", [task]);

    const result = await api.getTasks("plan-123");

    expect(result).toEqual([task]);
  });

  it("should apply filters", async () => {
    getMock().setMockData("tasks", []);

    await api.getTasks("plan-123", { status: "completed" });

    const calls = getMock().getMockCalls("tasks");
    expect(calls.some((c) => c.method === "eq" && c.args[0] === "status")).toBe(true);
  });
});
```

### 3. Hook Tests - React Query Hooks

Test React Query hooks with `renderHook`.

**Location**: `src/features/*/hooks.test.ts`

**Pattern**:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createTask } from "@/test/factories";

vi.mock("./api", () => ({
  getTasks: vi.fn(),
  createTask: vi.fn(),
}));

import * as api from "./api";
import { useTasks, useCreateTask } from "./hooks";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  };
}

describe("useTasks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should fetch tasks", async () => {
    const tasks = [createTask(), createTask()];
    vi.mocked(api.getTasks).mockResolvedValue(tasks);

    const { result } = renderHook(() => useTasks("plan-123"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(tasks);
  });

  it("should not fetch without planId", () => {
    const { result } = renderHook(() => useTasks(""), {
      wrapper: createWrapper(),
    });

    expect(result.current.isFetching).toBe(false);
  });
});
```

### 4. Component Tests - React Components

Test React components with `@testing-library/react`.

**Location**: `src/components/*/*.test.tsx`

**Pattern**:

```typescript
import { describe, it, expect } from "vitest";
import { render, screen } from "@/test/utils/render";
import { PaceBadge } from "./pace-badge";

describe("PaceBadge", () => {
  it("should render ahead status", () => {
    render(<PaceBadge status="ahead" />);

    expect(screen.getByText("Ahead")).toBeInTheDocument();
    expect(screen.getByText("Ahead")).toHaveClass("text-status-success");
  });

  it("should render at risk status", () => {
    render(<PaceBadge status="at_risk" />);

    expect(screen.getByText("At Risk")).toBeInTheDocument();
    expect(screen.getByText("At Risk")).toHaveClass("text-status-warning");
  });

  it("should render off track status", () => {
    render(<PaceBadge status="off_track" />);

    expect(screen.getByText("Off Track")).toBeInTheDocument();
    expect(screen.getByText("Off Track")).toHaveClass("text-status-danger");
  });
});
```

## Test Utilities

### Factories (`src/test/factories/index.ts`)

Type-safe factory functions for creating test data:

```typescript
import {
  createPlan,
  createObjective,
  createAnnualKr,
  createQuarterTarget,
  createTask,
  createCheckIn,
  createTag,
  createActivityEvent,
} from "@/test/factories";

// Basic usage
const plan = createPlan({ name: "2026 Goals" });
const objective = createObjective({ plan_id: plan.id });
const kr = createAnnualKr({
  objective_id: objective.id,
  kr_type: "metric",
  target_value: 100,
});

// With defaults - only specify what matters
const task = createTask({ status: "completed" });
const checkIn = createCheckIn({ value: 75 });
```

### Mock Supabase (`src/test/mocks/supabase.ts`)

Comprehensive Supabase client mock:

```typescript
import { createMockSupabase } from "@/test/mocks/supabase";

const mock = createMockSupabase();

// Set mock data for a table
mock.setMockData("tasks", [task1, task2]);

// Set error response
mock.setMockError("tasks", { code: "42501", message: "Permission denied" });

// Get recorded method calls
const calls = mock.getMockCalls("tasks");
expect(calls).toContainEqual({
  method: "eq",
  args: ["plan_id", "plan-123"],
});
```

### Custom Render (`src/test/utils/render.tsx`)

Render with all necessary providers:

```typescript
import { render, screen, within, fireEvent } from "@/test/utils/render";

// Includes: QueryClientProvider, ToastProvider, etc.
render(<MyComponent />);

// Use screen queries
expect(screen.getByRole("button")).toBeEnabled();

// Within a container
const card = screen.getByTestId("task-card");
expect(within(card).getByText("Task Title")).toBeInTheDocument();

// Fire events
fireEvent.click(screen.getByRole("button", { name: "Save" }));
```

## Coverage

Run coverage report:

```bash
npm run test:coverage
```

Coverage targets:

| Module | Target | Current |
|--------|--------|---------|
| `lib/progress-engine.ts` | 90%+ | ~91% |
| `lib/api-utils.ts` | 90%+ | 100% |
| `features/*/hooks.ts` | 80%+ | ~90% |
| `features/*/api.ts` | 80%+ | ~85% |
| Components | 70%+ | Varies |

## Best Practices

### DO

- **Use factories** for test data - avoid hardcoding values
- **Test behavior**, not implementation - focus on what the user sees
- **Mock at boundaries** - mock API calls, not internal functions
- **Use explicit values** when order matters (timestamps, sort order)
- **Clear mocks** in `beforeEach` - prevent test pollution
- **Test error states** - verify error handling works
- **Use `waitFor`** for async assertions - avoid flaky tests

```typescript
// Good - explicit, clear intent
it("should show completed tasks count", () => {
  const tasks = [
    createTask({ status: "completed" }),
    createTask({ status: "completed" }),
    createTask({ status: "pending" }),
  ];
  render(<TaskSummary tasks={tasks} />);
  expect(screen.getByText("2 completed")).toBeInTheDocument();
});
```

### DON'T

- **Don't test implementation** - internal state, private methods
- **Don't use random data** - makes tests non-deterministic
- **Don't share state** between tests - use `beforeEach` reset
- **Don't test libraries** - assume React Query, Radix work correctly
- **Don't mock too granularly** - prefer integration over unit

```typescript
// Bad - testing implementation detail
it("should set isLoading to true", () => {
  const { result } = renderHook(() => useTasks("plan-123"));
  expect(result.current.isLoading).toBe(true); // Testing React Query internals
});

// Good - testing user-visible behavior
it("should show loading spinner while fetching", async () => {
  render(<TaskList planId="plan-123" />);
  expect(screen.getByRole("progressbar")).toBeInTheDocument();
});
```

## Troubleshooting

### "Unable to find element" in component tests

1. Check conditional rendering - component might not render content
2. Use `screen.debug()` to see rendered output
3. Try `findByText` for async content instead of `getByText`

```typescript
// For async content
const element = await screen.findByText("Loaded data");

// Debug rendered output
screen.debug();
```

### Test order affects results

1. Ensure mocks are reset in `beforeEach`
2. Use unique IDs per test
3. Don't share QueryClient instances

```typescript
beforeEach(() => {
  vi.clearAllMocks();
  mockRef.current = createMockSupabase();
});
```

### Coverage not updating

1. Clear cache: `npm test -- --clearCache`
2. Ensure file is imported in tests
3. Check `vitest.config.ts` include patterns

### Mock not being used

1. Verify mock is hoisted with `vi.hoisted()`
2. Import API after mock setup
3. Check mock path matches import path

```typescript
// Must use vi.hoisted for mocks used before imports
const { mockRef } = vi.hoisted(() => ({
  mockRef: { current: null },
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => mockRef.current,
}));

// Import AFTER mock setup
import { myFunction } from "./my-module";
```

## Adding New Tests

### For a new pure function

```typescript
// src/lib/my-utils.test.ts
import { describe, it, expect } from "vitest";
import { myFunction } from "./my-utils";

describe("myFunction", () => {
  it("should handle normal input", () => {
    expect(myFunction("input")).toBe("expected");
  });

  it("should handle edge case", () => {
    expect(myFunction("")).toBe("default");
  });

  it("should throw on invalid input", () => {
    expect(() => myFunction(null)).toThrow("Invalid input");
  });
});
```

### For a new API function

Follow the API Tests pattern in section 2 above.

### For a new hook

Follow the Hook Tests pattern in section 3 above.

### For a new component

Follow the Component Tests pattern in section 4 above.
