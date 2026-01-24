# Performance Baseline

> Established: 2026-01-24
> Last Updated: 2026-01-24

This document establishes the performance baseline for the OKRs Tracker application. Use these metrics to detect regressions and track improvements.

## Table of Contents

- [Bundle Sizes](#bundle-sizes)
- [Core Web Vitals Thresholds](#core-web-vitals-thresholds)
- [API Performance Thresholds](#api-performance-thresholds)
- [Key User Flows](#key-user-flows)
- [Database Query Performance](#database-query-performance)
- [Measurement Methodology](#measurement-methodology)
- [Re-measurement Instructions](#re-measurement-instructions)
- [Known Optimization Opportunities](#known-optimization-opportunities)

---

## Bundle Sizes

First Load JS sizes as of 2026-01-24:

| Route | Size (KB) | Threshold (+10%) | Status |
|-------|-----------|------------------|--------|
| Shared (all routes) | 102 | 112 | Baseline |
| `/plans/[planId]` (Dashboard) | 379 | 417 | Baseline |
| `/plans/[planId]/analytics` | 463 | 509 | Baseline |
| `/plans/[planId]/okrs` | 324 | 356 | Baseline |
| `/plans/[planId]/tasks` | 309 | 340 | Baseline |
| `/plans/[planId]/settings` | 352 | 387 | Baseline |
| `/plans/[planId]/reviews` | 269 | 296 | Baseline |
| Middleware | 80 | 88 | Baseline |

### Bundle Size Guidelines

- **Shared JS**: Keep under 120 KB - this affects every page load
- **Route JS**: Individual routes should stay under 500 KB
- **Analytics page**: Largest due to Recharts - consider lazy loading charts if it grows
- **Regression threshold**: 10% increase from baseline triggers investigation

---

## Core Web Vitals Thresholds

Based on Google's Core Web Vitals standards:

| Metric | Good | Needs Improvement | Poor |
|--------|------|-------------------|------|
| **LCP** (Largest Contentful Paint) | ≤ 2500ms | ≤ 4000ms | > 4000ms |
| **FID** (First Input Delay) | ≤ 100ms | ≤ 300ms | > 300ms |
| **CLS** (Cumulative Layout Shift) | ≤ 0.1 | ≤ 0.25 | > 0.25 |
| **FCP** (First Contentful Paint) | ≤ 1800ms | ≤ 3000ms | > 3000ms |
| **TTFB** (Time to First Byte) | ≤ 800ms | ≤ 1800ms | > 1800ms |
| **INP** (Interaction to Next Paint) | ≤ 200ms | ≤ 500ms | > 500ms |

### Application Targets

| Page | LCP Target | FCP Target | CLS Target |
|------|------------|------------|------------|
| Dashboard | < 2000ms | < 1500ms | < 0.05 |
| OKRs List | < 2000ms | < 1500ms | < 0.05 |
| Analytics | < 2500ms | < 1800ms | < 0.1 |
| Tasks | < 2000ms | < 1500ms | < 0.05 |

---

## API Performance Thresholds

| Operation Type | Good | Warning | Critical |
|----------------|------|---------|----------|
| Simple query (single table) | < 100ms | < 200ms | > 500ms |
| Complex query (joins) | < 200ms | < 400ms | > 800ms |
| List queries (paginated) | < 150ms | < 300ms | > 600ms |
| Mutations (create/update) | < 200ms | < 400ms | > 800ms |
| Analytics aggregations | < 300ms | < 500ms | > 1000ms |

---

## Key User Flows

### Flow 1: Initial App Load
1. User navigates to app URL
2. Auth check via middleware
3. Redirect to plans list or login
4. **Target**: Complete in < 2 seconds

### Flow 2: Dashboard Load
1. User selects a plan
2. Dashboard widgets load
3. All widgets rendered with data
4. **Target**: First meaningful paint < 1.5s, full load < 3s

### Flow 3: Create Check-in
1. User opens KR detail
2. Enters check-in value
3. Submits check-in
4. UI updates with new progress
5. **Target**: Complete mutation and UI update < 500ms

### Flow 4: Task Management
1. User navigates to tasks
2. Task list loads with filters
3. User creates new task
4. Task appears in list
5. **Target**: List load < 1.5s, create < 500ms

### Flow 5: Analytics View
1. User navigates to analytics
2. Charts and metrics load
3. Interactive elements ready
4. **Target**: Initial charts visible < 2s, full interactivity < 3s

---

## Database Query Performance

### Critical Queries to Monitor

| Query | Description | Target | Current Status |
|-------|-------------|--------|----------------|
| `getObjectivesWithKrs` | Objectives with nested KRs | < 200ms | Indexed |
| `getTasksWithDetails` | Tasks with tags and assignees | < 200ms | Indexed |
| `getAnalyticsData` | Analytics aggregations | < 300ms | Uses views |
| `getDashboardWidgets` | Dashboard configuration | < 100ms | Indexed |
| `v_plan_checkins_by_day` | Check-in aggregation view | < 200ms | Materialized |
| `v_objective_progress` | Progress calculations | < 200ms | Materialized |

### Existing Indexes (50+)

The database has comprehensive indexes covering:
- Primary keys on all tables
- Foreign key relationships (plan_id, objective_id, etc.)
- Commonly filtered columns (status, priority, due_date)
- Composite indexes for common query patterns
- GIN indexes for JSONB fields

---

## Measurement Methodology

### Bundle Size Measurement

```bash
# Run production build
npm run build

# Output shows First Load JS for each route
# Look for the "First Load JS" column in build output

# For detailed analysis
ANALYZE=true npm run build
# Opens bundle analyzer in browser
```

### Core Web Vitals Measurement

1. **Development**: Check browser console for `[Web Vitals]` logs
2. **Production**: Use Chrome DevTools > Lighthouse
3. **Real User**: Check Vercel Analytics (if deployed) or add custom analytics

### API Performance Measurement

```typescript
import { timedFetch } from "@/lib/performance";

// Wrap any fetch call
const data = await timedFetch("getObjectives", () =>
  api.getObjectives(planId)
);
// Logs warning if > 500ms
```

### Manual Performance Profiling

1. Open Chrome DevTools > Performance tab
2. Start recording
3. Perform the user flow
4. Stop recording
5. Analyze flame chart and metrics

---

## Re-measurement Instructions

### Weekly Check (Automated)

1. Bundle sizes are tracked in `BUNDLE_BASELINES` in `src/lib/performance.ts`
2. CI should fail if bundle size exceeds threshold (when CI is configured)

### Monthly Baseline Update

1. Run production build: `npm run build`
2. Record bundle sizes in this document
3. Update `BUNDLE_BASELINES` in `src/lib/performance.ts`
4. Run Lighthouse on key pages
5. Document any significant changes

### After Major Changes

1. Compare bundle sizes before/after
2. Run full Lighthouse audit
3. Test key user flows manually
4. Update baselines if intentional increases

---

## Known Optimization Opportunities

### High Priority

1. **Analytics page bundle size (463 KB)**
   - Consider lazy loading individual chart components
   - Recharts could be dynamically imported
   - Potential savings: 50-100 KB

2. **Image optimization**
   - Ensure all images use next/image
   - Consider WebP format for avatars
   - Add blur placeholders for better LCP

### Medium Priority

3. **React Query prefetching**
   - Prefetch dashboard data on plan list hover
   - Reduces perceived load time

4. **Component code splitting**
   - Dialog components can be lazy loaded
   - Settings tabs can use dynamic imports

5. **Font loading optimization**
   - Currently loading 4 weights of Plus Jakarta Sans
   - Consider reducing to 3 weights (400, 600, 700)

### Low Priority (Future)

6. **Service Worker for offline support**
   - Cache static assets
   - Cache recent plan data

7. **Streaming SSR**
   - Use React Suspense boundaries
   - Progressive loading for dashboard widgets

---

## Performance Monitoring Setup

The application includes built-in performance monitoring:

### WebVitalsReporter Component

Located in `src/components/performance/web-vitals-reporter.tsx`:
- Automatically tracks Core Web Vitals
- Logs to console in development
- Supports custom callback for analytics integration

### Performance Utilities

Located in `src/lib/performance.ts`:
- `measureAsync` / `measureSync` - Timing wrappers
- `markStart` / `markEnd` - Performance marks
- `timedFetch` - API call timing with slow query detection
- `isSlowOperation` - Threshold checking
- `hasBundleRegression` - Bundle size regression detection

### Usage Example

```typescript
// In any component or API function
import { timedFetch, markStart, markEnd } from "@/lib/performance";

// Time an API call
const data = await timedFetch("loadDashboard", () =>
  api.getDashboard(planId)
);

// Manual timing
markStart("complexOperation");
// ... do work ...
const duration = markEnd("complexOperation");
```

---

## Appendix: Build Output Reference

```
Route (app)                              Size     First Load JS
┌ ○ /                                    175 B          102 kB
├ ○ /_not-found                          979 B          103 kB
├ ○ /login                               4.63 kB        107 kB
├ ƒ /plans                               3.7 kB         141 kB
├ ƒ /plans/[planId]                      275 kB         379 kB
├ ƒ /plans/[planId]/analytics            360 kB         463 kB
├ ƒ /plans/[planId]/okrs                 222 kB         324 kB
├ ƒ /plans/[planId]/reviews              166 kB         269 kB
├ ƒ /plans/[planId]/settings             250 kB         352 kB
├ ƒ /plans/[planId]/tasks                207 kB         309 kB
└ ƒ /plans/[planId]/timeline             176 kB         279 kB

○  (Static)   prerendered as static content
ƒ  (Dynamic)  server-rendered on demand
```
