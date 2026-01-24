# Error Handling & Logging Guide

> Established: 2026-01-24

This document describes the error handling patterns and logging conventions used in the OKRs Tracker application.

## Table of Contents

- [Overview](#overview)
- [Structured Logging](#structured-logging)
- [Error Reporting](#error-reporting)
- [Component Error Boundaries](#component-error-boundaries)
- [API Error Handling](#api-error-handling)
- [Best Practices](#best-practices)
- [Adding External Monitoring](#adding-external-monitoring)

---

## Overview

The application uses a centralized approach to error handling and logging:

| Module | Purpose | Location |
|--------|---------|----------|
| `logger` | Structured logging | `src/lib/logger.ts` |
| `error-reporter` | Centralized error collection | `src/lib/error-reporter.ts` |
| `api-utils` | API error handling | `src/lib/api-utils.ts` |
| `ErrorBoundary` | React error boundaries | `src/components/ui/error-boundary.tsx` |

---

## Structured Logging

### Basic Usage

```typescript
import { logger } from "@/lib/logger";

// Different log levels
logger.debug("Detailed info for debugging", { userId, action });
logger.info("Normal operation info", { page: "dashboard" });
logger.warn("Something unusual happened", { threshold: 500, actual: 750 });
logger.error("Operation failed", { endpoint: "/api/tasks" }, error);
```

### Log Levels

| Level | When to Use | Production |
|-------|-------------|------------|
| `debug` | Detailed debugging info | Hidden |
| `info` | Normal operations | Visible |
| `warn` | Unusual but handled | Visible |
| `error` | Failures requiring attention | Visible |

### Module-Specific Loggers

Create loggers with automatic module context:

```typescript
import { createModuleLogger } from "@/lib/logger";

const logger = createModuleLogger("TaskList");

// All logs include { module: "TaskList" }
logger.info("Loading tasks", { count: 10 });
```

### Child Loggers

Create loggers with inherited context:

```typescript
const pageLogger = logger.child({ page: "dashboard" });
const widgetLogger = pageLogger.child({ widget: "tasks" });

// Logs include { page: "dashboard", widget: "tasks" }
widgetLogger.info("Widget loaded");
```

### Timed Operations

Automatically log operation duration:

```typescript
const result = await logger.time(
  "fetchDashboardData",
  () => api.getDashboardData(planId),
  { planId }
);
// Logs: "fetchDashboardData completed" with durationMs
```

### Output Format

**Development**: Pretty-printed console output with colors and grouping.

**Production**: JSON-structured output for log aggregation:

```json
{
  "timestamp": "2026-01-24T10:30:00.000Z",
  "level": "error",
  "message": "API request failed",
  "context": { "endpoint": "/api/tasks", "method": "POST" },
  "error": { "name": "ApiError", "message": "...", "stack": "..." }
}
```

---

## Error Reporting

### Basic Error Reporting

```typescript
import { reportError } from "@/lib/error-reporter";

try {
  await riskyOperation();
} catch (error) {
  const errorId = reportError(error as Error, {
    component: "TaskDialog",
    action: "save_task",
  });
  // errorId can be shown to user for support reference
}
```

### Component Error Handler

Create component-specific error handlers:

```typescript
import { createComponentErrorHandler } from "@/lib/error-reporter";

const handleError = createComponentErrorHandler("TaskDialog");

async function saveTask() {
  try {
    await api.createTask(data);
  } catch (error) {
    handleError(error as Error, "save_task");
    toast(errorMessages.taskCreateFailed);
  }
}
```

### API Error Handler

For API-specific errors:

```typescript
import { handleApiError } from "@/lib/error-reporter";

try {
  await fetch("/api/tasks");
} catch (error) {
  handleApiError(error as Error, "/api/tasks", "GET", {
    planId,
    retryCount: 2
  });
}
```

### Error Reporter Class

For advanced usage with persistent context:

```typescript
import { ErrorReporter } from "@/lib/error-reporter";

const reporter = new ErrorReporter({
  component: "TaskList",
  planId
});

// Use throughout the component
reporter.report(error, { action: "delete" });

// Or wrap async operations
await reporter.wrap(
  () => api.deleteTask(taskId),
  "delete_task"
);
```

### Deduplication

The error reporter automatically deduplicates rapid-fire errors (same error within 5 seconds).

---

## Component Error Boundaries

### Basic Usage

```tsx
import { ErrorBoundary } from "@/components/ui/error-boundary";

<ErrorBoundary componentName="TaskList">
  <TaskList planId={planId} />
</ErrorBoundary>
```

### With Custom Fallback

```tsx
<ErrorBoundary
  componentName="Dashboard"
  fallback={<DashboardError onRetry={() => window.location.reload()} />}
>
  <Dashboard />
</ErrorBoundary>
```

### With Custom Error Handler

```tsx
<ErrorBoundary
  componentName="Analytics"
  onError={(error, errorInfo) => {
    // Custom handling in addition to automatic reporting
    analytics.trackError("analytics_crash", { error: error.message });
  }}
>
  <Analytics />
</ErrorBoundary>
```

### HOC Pattern

For functional components:

```tsx
import { withErrorBoundary } from "@/components/ui/error-boundary";

const SafeTaskList = withErrorBoundary(TaskList);

// Usage
<SafeTaskList planId={planId} />
```

---

## API Error Handling

### ApiError Class

All Supabase errors are wrapped in `ApiError`:

```typescript
import { ApiError } from "@/lib/api-utils";

try {
  await api.createTask(data);
} catch (error) {
  if (error instanceof ApiError) {
    // User-friendly message
    toast({
      title: "Failed to create task",
      description: error.userMessage,
      variant: "destructive"
    });

    // Structured context for logging
    console.log(error.toLogContext());
    // { code: "23505", details: "...", hint: "...", userMessage: "This item already exists." }
  }
}
```

### Common Error Codes

| Code | Type | User Message |
|------|------|--------------|
| `23505` | Unique violation | "This item already exists." |
| `23503` | Foreign key violation | "Cannot delete this item because it is referenced by other data." |
| `23502` | Not null violation | "Required field is missing." |
| `42501` | Insufficient privilege | "You don't have permission to perform this action." |
| `PGRST301` | RLS violation | "You don't have access to this resource." |
| `22P02` | Invalid format | "Invalid data format provided." |

### Using handleSupabaseError

```typescript
import { handleSupabaseError } from "@/lib/api-utils";

export async function getObjectives(planId: string) {
  return handleSupabaseError(
    supabase.from("objectives").select("*").eq("plan_id", planId),
    "getObjectives" // Operation name for logging
  );
}
```

---

## Best Practices

### 1. Always Add Context

```typescript
// Bad - no context
logger.error("Failed");

// Good - with context
logger.error("Task creation failed", {
  planId,
  taskData: { name: data.name, status: data.status },
}, error);
```

### 2. Use Appropriate Log Levels

```typescript
// Debug: Internal state, loop iterations, detailed flow
logger.debug("Processing item", { index, total });

// Info: User actions, state changes, completed operations
logger.info("Task completed", { taskId });

// Warn: Recovered errors, unusual conditions, deprecations
logger.warn("Retry succeeded after failure", { attempt: 3 });

// Error: Unrecovered failures, data issues, crashes
logger.error("Payment processing failed", {}, paymentError);
```

### 3. Never Log Sensitive Data

```typescript
// Bad - logging PII
logger.info("User logged in", { email, password });

// Good - log IDs only
logger.info("User logged in", { userId });
```

### 4. Handle All Errors

```typescript
// Always catch and handle errors
async function loadData() {
  try {
    const data = await api.getData();
    return data;
  } catch (error) {
    handleError(error as Error, "loadData");
    // Re-throw or return fallback
    throw error;
  }
}
```

### 5. Use Toast for User Feedback

```typescript
import { toast } from "@/components/ui/use-toast";
import { errorMessages } from "@/lib/toast-utils";

try {
  await saveTask();
  toast(successMessages.taskCreated);
} catch (error) {
  handleError(error as Error, "saveTask");
  toast(errorMessages.taskCreateFailed);
}
```

---

## Adding External Monitoring

The error reporter is designed to integrate with external services like Sentry, LogRocket, or Datadog.

### Registering a Handler

```typescript
// In app initialization (e.g., layout.tsx or _app.tsx)
import { registerErrorHandler } from "@/lib/error-reporter";
import * as Sentry from "@sentry/nextjs";

registerErrorHandler((reportedError) => {
  Sentry.captureException(new Error(reportedError.error.message), {
    tags: {
      component: reportedError.context.component,
      action: reportedError.context.action,
    },
    extra: {
      ...reportedError.context,
      browser: reportedError.browser,
    },
  });
});
```

### Setting Up Global Handlers

```typescript
// In client-side initialization
import { setupGlobalErrorHandlers } from "@/lib/error-reporter";

// Catches uncaught errors and unhandled promise rejections
setupGlobalErrorHandlers();
```

### Multiple Handlers

You can register multiple handlers for different services:

```typescript
// Sentry for error tracking
registerErrorHandler((error) => Sentry.captureException(...));

// Analytics for metrics
registerErrorHandler((error) => analytics.trackError(...));

// Custom logging service
registerErrorHandler((error) => loggingService.send(...));
```

---

## Files Reference

| File | Purpose |
|------|---------|
| `src/lib/logger.ts` | Structured logging utility |
| `src/lib/error-reporter.ts` | Centralized error reporting |
| `src/lib/api-utils.ts` | API error handling (ApiError class) |
| `src/lib/toast-utils.ts` | User-facing error messages |
| `src/components/ui/error-boundary.tsx` | React error boundary |
