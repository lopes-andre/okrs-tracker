# Performance Optimization Audit

Date: January 2026
Branch: `perf/optimization-audit`

## Summary

This audit focused on improving React rendering performance, bundle size optimization, and image loading performance.

## Optimizations Made

### 1. React Component Performance (`099e6c6`)

**Problem**: List components were re-rendering on every parent update, even when their props hadn't changed.

**Solution**: Added `React.memo` and `useMemo` to key list item components.

| Component | Optimization |
|-----------|-------------|
| `TaskRow` | Added `memo()` wrapper, `useCallback` for handlers |
| `AnnualKrCard` | Added `memo()`, `useMemo` for progress calculations |
| `DistributionAccordionItem` | Added `memo()`, memoized hashtag regex detection |

**Files Changed**:
- `src/components/tasks/task-row.tsx`
- `src/components/okr/annual-kr-card.tsx`
- `src/components/content/distribution-accordion-item.tsx`

**React Query staleTime Optimizations**:

| Hook | staleTime | Rationale |
|------|-----------|-----------|
| `useTags`, `useTagsByKind`, `useTagsWithUsage`, `useKrGroups` | 5 minutes | Tags change infrequently |
| `useAccounts`, `useAccountsWithPlatform`, `useGoals` | 5 minutes | Account config rarely changes |
| `useAnalyticsData` | 2 minutes | Expensive computation, acceptable staleness |

### 2. Bundle Size Optimization (`d4900b0`)

**Problem**: Heavy modal components (1000+ lines) were included in initial page bundles, increasing First Load JS.

**Solution**: Lazy load modal components with `React.lazy()` and `Suspense`.

| Component | Lines | Lazy Loaded In |
|-----------|-------|----------------|
| `PostDetailModal` | 1,345 | `kanban-board.tsx`, `content-calendar.tsx` |
| `CampaignDialog` | 1,131 | `campaigns-list.tsx` |
| `TaskDialog` | 835 | `tasks/page.tsx`, `tasks-section.tsx` |

**Pattern Applied**:
```tsx
// Lazy import
const MyDialog = lazy(() =>
  import("./my-dialog").then((mod) => ({ default: mod.MyDialog }))
);

// Conditional rendering with Suspense
{dialogOpen && (
  <Suspense fallback={null}>
    <MyDialog open={dialogOpen} onOpenChange={setDialogOpen} />
  </Suspense>
)}
```

### 3. Image Optimization (`19cf34a`)

**Problem**: Images loaded eagerly, blocking initial render and consuming bandwidth.

**Solution**: Added `loading="lazy"` attribute to user-uploaded images.

**Files Changed**:
- `src/components/content/media-section.tsx`
- `src/components/content/media-upload.tsx`
- `src/components/content/pending-media-upload.tsx`
- `src/components/content/media-preview-lightbox.tsx` (thumbnails only)

**Note**: Lightbox main image excluded from lazy loading since it's the primary focus when opened.

## Bundle Analysis

Route sizes after optimization:

| Route | Size | First Load JS |
|-------|------|---------------|
| `/` | 166 B | 106 kB |
| `/login` | 3.99 kB | 118 kB |
| `/plans` | 12.5 kB | 245 kB |
| `/plans/[planId]` | 13.1 kB | 383 kB |
| `/plans/[planId]/analytics` | 47.8 kB | 474 kB |
| `/plans/[planId]/content` | 31.4 kB | 427 kB |
| `/plans/[planId]/okrs` | 19.6 kB | 333 kB |
| `/plans/[planId]/tasks` | 14.8 kB | 312 kB |
| `/plans/[planId]/settings` | 17.6 kB | 362 kB |

Shared chunks: 102 kB total

## Performance Best Practices

### When to Use `React.memo`

Use memo for components that:
1. Render frequently in lists (e.g., `TaskRow`, `PostCard`)
2. Have expensive render logic
3. Receive stable props from parent

### When to Use `useMemo`

Use useMemo for:
1. Expensive calculations (regex operations, array transformations)
2. Derived data that depends on props/state
3. Objects/arrays passed to memoized child components

### When to Lazy Load

Lazy load components that:
1. Are not immediately visible (modals, dialogs)
2. Are large (>500 lines or significant dependencies)
3. Are conditionally rendered based on user interaction

### staleTime Guidelines

| Data Type | Recommended staleTime |
|-----------|----------------------|
| Static configuration | 5-10 minutes |
| User-created content (lists) | 0-30 seconds |
| Analytics/computations | 1-5 minutes |
| Real-time data | 0 (default) |

## Future Considerations

1. **Bundle Analyzer**: Consider adding `@next/bundle-analyzer` for detailed bundle inspection
2. **Prefetching**: Add `queryClient.prefetchQuery()` for anticipated navigation
3. **Virtual Lists**: For very long lists, consider `react-virtual` or `@tanstack/react-virtual`
4. **Image CDN**: Consider using Next.js Image component with configured remote domains for Supabase storage
