# Current State & Development Context

## Recent Work (January 2026)

### Just Completed: Tags Management
Added a Tags settings page to allow CRUD operations on tags:

**Files Changed:**
- `src/features/tags/api.ts` - Added `getTagsWithUsage()` function
- `src/features/tags/hooks.ts` - Added `useTagsWithUsage()` hook, improved cache invalidation
- `src/lib/query-client.tsx` - Added `withUsage` query key
- `src/lib/toast-utils.ts` - Enhanced tag success messages
- `src/components/tags/tags-settings.tsx` - **NEW** - Full tag management UI
- `src/components/tags/index.ts` - **NEW** - Barrel export
- `src/app/plans/[planId]/settings/page.tsx` - Added Tags tab

**Features:**
- View all tags grouped by kind (custom, category, platform, etc.)
- Shows usage count per tag (how many tasks use it)
- Create tags with name and category
- Edit tags with warning about affected tasks
- Delete tags with confirmation showing impact

### Weekly Reviews System
Full weekly review implementation with:
- Review creation and tracking
- Reflection prompts (what went well, what to improve, lessons learned)
- Statistics capture at review completion
- Review settings for scheduling

### Activity Timeline
Comprehensive activity logging:
- Automatic event capture via database triggers
- Filterable timeline view
- Entity type and event type filters
- Date range filtering
- Paginated results

## Known Issues / Technical Debt

### TypeScript Errors (Non-blocking)
Some pre-existing TypeScript errors in analytics and activity components:

1. **Analytics Components** - Recharts type mismatches:
   - `activity-bar-chart.tsx` - Formatter type issue
   - `burnup-chart.tsx` - ValueType handling
   - `kr-performance-table.tsx` - Nullable forecast handling
   - `progress-chart.tsx` - Record type mismatch

2. **Activity Components** - Missing enum values:
   - `activity-event-card.tsx` - Missing "started" event type handling

3. **Settings Page** - Type export issue:
   - `ActivityFiltersState` type not exported from activity module

4. **Reviews Pages** - Various type issues:
   - Pace status string format mismatches (`"on-track"` vs `"on_track"`)
   - PageHeader prop mismatches

### Patterns That Could Use Improvement
- Some components have mixed fetching and rendering concerns
- Optimistic updates not consistently implemented
- Some query invalidation could be more targeted

## Active Development Areas

### Features In Good Shape
- ✅ OKR management (objectives, KRs, quarter targets)
- ✅ Task management with filtering
- ✅ Check-in tracking
- ✅ Tag management
- ✅ Activity timeline
- ✅ Mind map visualization
- ✅ Basic analytics charts
- ✅ Weekly reviews

### Areas for Enhancement
- Dashboard customization
- More advanced analytics
- Export/reporting functionality
- Mobile responsiveness improvements
- Offline support
- Collaboration features (real-time updates)

## Common Development Tasks

### Adding a New Feature

1. **Database first** (if needed):
   ```bash
   supabase migration new feature_name
   # Edit migration
   supabase db reset
   ```

2. **Update types** in `src/lib/supabase/types.ts`

3. **Create feature module**:
   - `src/features/featureName/api.ts`
   - `src/features/featureName/hooks.ts`
   - Export from `src/features/index.ts`

4. **Add query keys** in `src/lib/query-client.tsx`

5. **Add toast messages** in `src/lib/toast-utils.ts`

6. **Create components** in `src/components/featureName/`

7. **Add routes** in `src/app/plans/[planId]/featureName/`

### Fixing a Bug

1. Reproduce the issue
2. Identify the source (often in hooks or api layer)
3. Check query invalidation patterns
4. Verify types are correct
5. Test the fix
6. Ensure no regressions

### Adding a Settings Tab

1. Create component in `src/components/` (e.g., `MySettings.tsx`)
2. Import in `src/app/plans/[planId]/settings/page.tsx`
3. Add to `TabsList`:
   ```tsx
   <TabsTrigger value="my-feature" className="gap-2">
     <Icon className="w-4 h-4" />
     My Feature
   </TabsTrigger>
   ```
4. Add `TabsContent`:
   ```tsx
   <TabsContent value="my-feature">
     <MySettings planId={planId} isOwner={isOwner} />
   </TabsContent>
   ```

## Environment & Testing

### Local Development
```bash
npm run dev          # Start Next.js dev server
supabase start       # Start local Supabase
```

### Running Tests
```bash
npm test             # Watch mode
npm run test:run     # Single run
npm run test:coverage
```

### Building
```bash
npm run build        # Production build
npm run lint         # ESLint check
```

## Conversation History Insights

### Design Preferences
- Premium, minimalist aesthetic (Kympler-inspired)
- Professional blue accent color
- Soft shadows and rounded corners
- Generous whitespace
- Clear visual hierarchy

### Coding Preferences
- Strict TypeScript
- Feature module pattern (api + hooks)
- React Query for all data fetching
- Radix UI for accessible components
- Tailwind with design tokens
- Toast notifications for feedback
- Comprehensive query invalidation

### User Workflow
- Users manage yearly OKR plans
- Plans contain objectives with key results
- KRs have quarterly targets
- Tasks can be linked to OKRs
- Progress tracked via check-ins
- Weekly reviews for reflection

## Quick Reference

### Key Files for Common Changes

| Task | Files |
|------|-------|
| Add new entity type | `types.ts`, `api.ts`, `hooks.ts`, query-client |
| New settings section | `settings/page.tsx`, new component |
| New analytics widget | `src/components/analytics/` |
| Update progress calc | `progress-engine.ts` |
| New toast message | `toast-utils.ts` |
| Database change | `supabase/migrations/`, `types.ts` |

### Import Shortcuts
```typescript
// Features (hooks and API)
import { useTasks, useCreateTask } from "@/features";

// UI Components
import { Button, Dialog, Select } from "@/components/ui";

// Utilities
import { cn } from "@/lib/utils";
import { formatErrorMessage, successMessages } from "@/lib/toast-utils";
```
