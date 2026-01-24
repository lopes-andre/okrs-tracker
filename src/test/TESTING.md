# Testing Guide - OKRs Tracker

Comprehensive testing documentation for the OKRs Tracker application.

## Overview

| Metric | Value |
|--------|-------|
| Test Files | 20 |
| Total Tests | 722 |
| Test Runner | Vitest 4.0 |
| Component Testing | @testing-library/react |
| Coverage Tool | @vitest/coverage-v8 |

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
│   ├── progress-engine.test.ts # Progress calculations
│   ├── weekly-review-engine.test.ts
│   └── api-utils.test.ts
│
├── features/                   # Feature module tests (co-located)
│   ├── plans/
│   │   ├── api.test.ts
│   │   └── hooks.test.ts
│   ├── objectives/
│   │   └── hooks.test.ts
│   └── ...
│
└── components/                 # Component tests (co-located)
    └── okr/
        ├── pace-badge.test.tsx
        └── progress-display.test.tsx
```

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
```

## Test Categories

### 1. Unit Tests - Pure Functions

Test pure utility functions with no external dependencies.

**Location**: `src/lib/*.test.ts`

**Example**:
```typescript
describe("computeKrProgress", () => {
  it("should calculate progress for metric type KR", () => {
    const kr = createAnnualKr({ kr_type: "metric", start_value: 0, target_value: 100 });
    const checkIns = [createCheckIn({ value: 50 })];

    const result = computeKrProgress(kr, checkIns, [], 2026);

    expect(result.progress).toBe(0.5);
    expect(result.currentValue).toBe(50);
  });
});
```

### 2. API Tests - Supabase Queries

Test API functions that interact with Supabase.

**Location**: `src/features/*/api.test.ts`

**Pattern**:
```typescript
import { createMockSupabase } from "@/test/mocks/supabase";

const { mockRef } = vi.hoisted(() => ({
  mockRef: { current: null as ReturnType<typeof createMockSupabase> | null },
}));

vi.mock("@/lib/supabase/untyped-client", () => ({
  createUntypedClient: () => mockRef.current?.mockSupabase,
}));

describe("MyAPI", () => {
  beforeEach(() => {
    mockRef.current = createMockSupabase();
  });

  it("should fetch data", async () => {
    getMock().setMockData("my_table", [mockItem]);

    const result = await myApi.getData();

    expect(result).toEqual([mockItem]);
  });
});
```

### 3. Hook Tests - React Query Hooks

Test React Query hooks with `renderHook`.

**Location**: `src/features/*/hooks.test.ts`

**Pattern**:
```typescript
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("./api", () => ({
  getData: vi.fn(),
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe("useMyData", () => {
  it("should fetch data", async () => {
    vi.mocked(api.getData).mockResolvedValue(mockData);

    const { result } = renderHook(() => useMyData("plan-123"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockData);
  });
});
```

### 4. Component Tests - React Components

Test React components with `@testing-library/react`.

**Location**: `src/components/*/*.test.tsx`

**Pattern**:
```typescript
import { render, screen } from "@/test/utils/render";
import { MyComponent } from "./my-component";

describe("MyComponent", () => {
  it("should render with props", () => {
    render(<MyComponent title="Hello" value={42} />);

    expect(screen.getByText("Hello")).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
  });
});
```

### 5. Integration Tests

Test component + hook + utility integrations.

**Location**: Alongside components in `*.test.tsx`

**Example**: `progress-display.test.tsx` tests component rendering with progress-engine utilities.

## Test Utilities

### Factories (`src/test/factories/index.ts`)

Type-safe factory functions for creating test data:

```typescript
// Basic entities
createPlan({ name: "My Plan" })
createObjective({ title: "Q1 Goals" })
createAnnualKr({ kr_type: "metric", target_value: 100 })
createQuarterTarget({ quarter: 1, target_value: 25 })
createTask({ title: "Task 1", status: "todo" })
createCheckIn({ value: 50, note: "Week 1 update" })
createTag({ name: "Priority" })

// Activity events
createActivityEvent({ event_type: "created" })

// Complex scenarios
createKrWithProgress("kr-1", [25, 50, 75]) // KR with check-in history
```

### Mock Supabase (`src/test/mocks/supabase.ts`)

Comprehensive Supabase client mock:

```typescript
const { mockSupabase, setMockData, setMockError, getMockCalls } = createMockSupabase();

// Set mock data
setMockData("tasks", [task1, task2]);

// Set error response
setMockError("tasks", { code: "42501", message: "Permission denied" });

// Verify query construction
const calls = getMockCalls("tasks");
expect(calls.some(c => c.method === "eq" && c.args[0] === "plan_id")).toBe(true);
```

### Custom Render (`src/test/utils/render.tsx`)

Render with all necessary providers:

```typescript
import { render, screen, within } from "@/test/utils/render";

// Includes: QueryClientProvider, ToastProvider, etc.
render(<MyComponent />);
```

## Coverage Summary

| Module | Coverage | Notes |
|--------|----------|-------|
| `lib/progress-engine.ts` | 91% | Core calculations |
| `lib/weekly-review-engine.ts` | 94% | Review logic |
| `lib/api-utils.ts` | 100% | Error handling |
| `features/plans/hooks.ts` | 91% | Plan management |
| `features/objectives/hooks.ts` | 100% | Objective CRUD |
| `features/tasks/hooks.ts` | 83% | Task management |
| `features/check-ins/hooks.ts` | 97% | Check-in tracking |
| `features/timeline/hooks.ts` | 100% | Activity timeline |

Run `npm run test:coverage` for full report.

## Adding New Tests

### 1. New Pure Function

```typescript
// src/lib/my-utils.test.ts
import { describe, it, expect } from "vitest";
import { myFunction } from "./my-utils";

describe("myFunction", () => {
  it("should do something", () => {
    expect(myFunction(input)).toBe(expectedOutput);
  });
});
```

### 2. New API Function

```typescript
// src/features/my-feature/api.test.ts
import { createMockSupabase } from "@/test/mocks/supabase";
import { createMyEntity } from "@/test/factories";

// ... mock setup (see API Tests pattern)

describe("getMyEntities", () => {
  it("should fetch entities for plan", async () => {
    const entity = createMyEntity({ plan_id: "plan-123" });
    getMock().setMockData("my_table", [entity]);

    const result = await api.getMyEntities("plan-123");

    expect(result).toEqual([entity]);
  });
});
```

### 3. New Hook

```typescript
// src/features/my-feature/hooks.test.ts
import { renderHook, waitFor } from "@testing-library/react";

vi.mock("./api", () => ({
  getMyEntities: vi.fn(),
}));

// ... wrapper setup (see Hook Tests pattern)

describe("useMyEntities", () => {
  it("should return entities", async () => {
    vi.mocked(api.getMyEntities).mockResolvedValue([mockEntity]);

    const { result } = renderHook(() => useMyEntities("plan-123"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([mockEntity]);
  });
});
```

### 4. New Component

```typescript
// src/components/my-component/my-component.test.tsx
import { render, screen } from "@/test/utils/render";
import { MyComponent } from "./my-component";
import { createMyEntity } from "@/test/factories";

describe("MyComponent", () => {
  it("should render entity data", () => {
    const entity = createMyEntity({ name: "Test" });

    render(<MyComponent entity={entity} />);

    expect(screen.getByText("Test")).toBeInTheDocument();
  });
});
```

## Best Practices

### DO

- Use factories for test data
- Test behavior, not implementation
- Mock at module boundaries (API, hooks)
- Use explicit values when order matters (timestamps, IDs)
- Clear mocks in `beforeEach`/`afterEach`
- Test error states and edge cases
- Use `waitFor` for async assertions

### DON'T

- Don't test implementation details
- Don't rely on non-deterministic data (random IDs, current time)
- Don't share state between tests
- Don't test third-party library behavior
- Don't mock too granularly (prefer integration)

## Troubleshooting

### "Unable to find element" in component tests

1. Check if component renders content conditionally
2. Use `screen.debug()` to see rendered output
3. Try `findByText` instead of `getByText` for async content

### Test order affects results

1. Ensure mocks are reset in `beforeEach`
2. Use unique IDs per test
3. Don't share QueryClient instances

### Coverage not updating

1. Clear cache: `npm test -- --clearCache`
2. Ensure file is imported in tests
3. Check `vitest.config.ts` include patterns

### Mock not being used

1. Verify mock is hoisted (`vi.hoisted`)
2. Import API after mock setup
3. Check mock path matches import path
