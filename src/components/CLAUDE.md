# Components - `src/components/`

React components organized by domain.

## Directory Structure

```
src/components/
├── ui/              # Base UI primitives (Radix-based)
├── layout/          # App layout components
├── dashboard/       # Widget-based dashboard system
├── okr/             # OKR-specific components
├── tasks/           # Task management components
├── tags/            # Tag management components
├── activity/        # Activity feed components
├── analytics/       # Charts and data visualization
├── import-export/   # Import/export settings & dialogs
└── weekly-review/   # Weekly review components
```

## UI Components (`ui/`)

Base components built on Radix UI with CVA variants.

### Core Components

| Component | Base | Variants |
|-----------|------|----------|
| `Button` | Radix Slot | default, secondary, ghost, outline, danger + sizes |
| `Dialog` | Radix Dialog | - |
| `Select` | Radix Select | - |
| `Tabs` | Radix Tabs | - |
| `Card` | div | CardHeader, CardTitle, CardDescription, CardContent |
| `Badge` | span | default, secondary, outline, destructive |
| `Input` | input | - |
| `Label` | Radix Label | - |
| `Checkbox` | Radix Checkbox | - |
| `Progress` | Radix Progress | - |
| `Toast` | Radix Toast | default, success, warning, destructive |
| `Tooltip` | Radix Tooltip | - |
| `Popover` | Radix Popover | - |
| `DropdownMenu` | Radix DropdownMenu | - |

### Usage Pattern

```tsx
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

<Button variant="secondary" size="sm">
  Click me
</Button>

<Dialog open={isOpen} onOpenChange={setIsOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Title</DialogTitle>
    </DialogHeader>
    {/* content */}
  </DialogContent>
</Dialog>
```

### Toast System

```tsx
// In component
import { useToast } from "@/components/ui/use-toast";

const { toast } = useToast();

// Show toast
toast({
  title: "Success",
  description: "Item created",
  variant: "success",
});

// Or use predefined messages
import { successMessages } from "@/lib/toast-utils";
toast(successMessages.taskCreated);
```

## Layout Components (`layout/`)

### `Navbar`
Top navigation with plan selector and user menu.

### `PageHeader`
Consistent page header with title and description.

```tsx
<PageHeader
  title="Tasks"
  description="Manage your tasks"
/>
```

### `EmptyState`
Empty state with icon, message, and optional action.

```tsx
<EmptyState
  icon={TagIcon}
  title="No tags yet"
  description="Create tags to organize tasks"
  action={{
    label: "Create Tag",
    onClick: () => setShowDialog(true),
  }}
/>
```

### `PlanNav`
Plan-level navigation sidebar/tabs.

## Dashboard Components (`dashboard/`)

Widget-based dashboard system for customizable plan overview.

### Architecture

```
src/components/dashboard/
├── index.ts                    # Re-exports all dashboard components
├── widget-registry.ts          # Widget type definitions & component mapping
├── dashboard-grid.tsx          # CSS Grid layout container (4-col responsive)
├── widget-wrapper.tsx          # Widget card with header/actions/fullscreen
├── widget-fullscreen.tsx       # Fullscreen dialog for expanded view
├── add-widget-dialog.tsx       # Widget picker dialog
├── dashboard-header.tsx        # Dashboard title, edit toggle, add button
├── dashboard-data-provider.tsx # Shared data context for widgets
├── widget-renderer.tsx         # Maps widget types to components
└── widgets/                    # Individual widget components
    ├── objective-scorecards.tsx
    ├── at-risk-krs.tsx
    ├── tasks-due.tsx
    ├── timeline-preview.tsx
    ├── recent-checkins.tsx
    ├── activity-heatmap-widget.tsx
    ├── summary-cards-widget.tsx
    ├── progress-chart-widget.tsx
    └── quick-actions.tsx
```

### Widget Types

| Widget Type | Description | Fullscreen |
|-------------|-------------|------------|
| `objective_scorecards` | Objectives with progress | Yes |
| `at_risk_krs` | KRs behind pace | Yes |
| `tasks_due` | Upcoming/overdue tasks | Yes |
| `timeline_preview` | Recent activity events | Yes |
| `recent_checkins` | Latest check-ins | Yes |
| `activity_heatmap` | GitHub-style heatmap | Yes |
| `summary_cards` | Key metrics at a glance | No |
| `progress_chart` | KR progress over time | Yes |
| `quick_actions` | Navigation shortcuts | No |

### Usage

```tsx
import {
  DashboardGrid,
  DashboardHeader,
  DashboardDataProvider,
  AddWidgetDialog,
} from "@/components/dashboard";

// In page component
<DashboardDataProvider planId={planId}>
  <DashboardGrid
    widgets={widgets}
    isEditing={isEditing}
    onRemoveWidget={handleRemoveWidget}
  />
</DashboardDataProvider>
```

### Data Provider

All widgets access shared data through `useDashboardData()` hook:

```typescript
const {
  planId,
  plan,
  year,
  objectives,
  annualKrs,
  checkIns,
  tasks,
  isLoading,
  atRiskKrs,      // Computed: KRs with at_risk/off_track pace
  overallProgress // Computed: Average KR progress
} = useDashboardData();
```

### Adding a New Widget

1. Define widget type in `widget-registry.ts`:
```typescript
export const WIDGET_TYPES = {
  // ...existing
  MY_WIDGET: "my_widget",
};

WIDGET_DEFINITIONS[WIDGET_TYPES.MY_WIDGET] = {
  type: WIDGET_TYPES.MY_WIDGET,
  name: "My Widget",
  description: "Description here",
  icon: SomeIcon,
  category: "overview", // or "analytics" | "activity"
  defaultWidth: 2,      // 1-4 columns
  defaultHeight: 1,     // rows
  supportsFullscreen: true,
};
```

2. Create widget component in `widgets/`:
```tsx
export function MyWidget({ config }: { config: Record<string, unknown> }) {
  const { planId, objectives } = useDashboardData();
  return <div>...</div>;
}
```

3. Add to `widget-renderer.tsx`:
```tsx
case WIDGET_TYPES.MY_WIDGET:
  return <MyWidget config={config} />;
```

4. Export from `index.ts`

## OKR Components (`okr/`)

### `ObjectiveCard`
Displays objective with progress and KR count.

### `ObjectiveDialog`
Create/edit objective form.

### `AnnualKrCard`
Displays KR with progress, pace badge, quarter pills.

### `AnnualKrDialog`
Create/edit KR form with type selection.

### `CheckInDialog`
Record a check-in for a KR.

### `CheckInList`
List of check-ins for a KR.

### `QuarterTargetPills`
Visual display of Q1-Q4 targets.

### `QuarterTargetsDialog`
Set quarterly targets for a KR.

### `ProgressDisplay`
Progress bar with percentage.

### `PaceBadge`
Pace status indicator (Ahead, On Track, At Risk, Off Track).

### `DeleteConfirmationDialog`
Reusable delete confirmation.

## Task Components (`tasks/`)

### `TaskDialog`
Create/edit task form with OKR linking.

Props:
```typescript
interface TaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planId: string;
  task?: Task | null;          // For editing
  objectives?: Objective[];     // For linking
  annualKrs?: AnnualKr[];      // For linking
  tags?: Tag[];                // Available tags
  selectedTags?: string[];     // Pre-selected tag IDs
  onSubmit: (data: TaskData, tagIds: string[]) => Promise<void>;
  onCreateTag?: (name: string) => Promise<Tag>;
}
```

### `TaskRow`
Single task display with status toggle.

### `TaskFilters`
Filter controls for task list.

### `TasksSection`
Section wrapper with header.

### `CollapsibleTaskList`
Collapsible list of tasks by category.

## Tag Components (`tags/`)

### `TagsSettings`
Full tag management UI (create, edit, delete).

Features:
- Group tags by kind (custom, category, platform, etc.)
- Show usage count per tag
- Confirmation dialogs for edit/delete
- Warning when tag is used by tasks

## Activity Components (`activity/`)

### `ActivityEventCard`
Single activity event display.

### `ActivityFilters`
Filter controls for activity timeline.

### `WeeklyReviewPanel`
Summarized weekly activity view.

## Analytics Components (`analytics/`)

### Chart Components
- `ActivityBarChart` - Bar chart for activity
- `ActivityHeatmap` - GitHub-style heatmap
- `BurnupChart` - Burnup/burndown chart
- `ProgressChart` - Progress over time

### Data Components
- `SummaryCards` - KPI summary cards
- `KrPerformanceTable` - KR comparison table
- `PaceAnalysisPanel` - Pace breakdown
- `ProductivityPanel` - Productivity metrics
- `TaskMetricsPanel` - Task statistics
- `QuarterlyComparison` - Quarter comparison
- `WeeklyReviewMetrics` - Review statistics
- `SavedViews` - View presets

## Weekly Review Components (`weekly-review/`)

### `ReviewSettings`
Configure review schedule and preferences.

## Import/Export Components (`import-export/`)

### `ImportExportSettings`
Main settings tab with three sections:
- **Export Data**: JSON and Markdown download buttons
- **Import Data**: File upload area (owner only)
- **Cloud Backups**: Backup list with create/delete (owner only)

Props:
```typescript
interface ImportExportSettingsProps {
  planId: string;
  isOwner: boolean;
}
```

### `ImportDialog`
Multi-step import wizard:

1. **Select**: Drag-drop file upload area
2. **Preview**: Validation results, entity counts
3. **Options**: Import settings (skip check-ins, reset progress)
4. **Importing**: Progress spinner
5. **Complete**: Success/error summary

Props:
```typescript
interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}
```

Features:
- Zod schema validation with error display
- Cross-reference validation warnings
- Entity count preview (objectives, KRs, tasks, etc.)
- Configurable import options
- Automatic redirect to new plan on success

## Component Patterns

### Standard Component Structure

```tsx
"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFeatureHook } from "@/features";
import type { SomeType } from "@/lib/supabase/types";

interface MyComponentProps {
  planId: string;
  onAction?: () => void;
}

export function MyComponent({ planId, onAction }: MyComponentProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { data, isLoading } = useFeatureHook(planId);

  if (isLoading) {
    return <Loader2 className="animate-spin" />;
  }

  return (
    <div className="space-y-4">
      {/* content */}
    </div>
  );
}
```

### Dialog Component Pattern

```tsx
interface MyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item?: MyType | null;  // For edit mode
  onSubmit: (data: MyData) => Promise<void>;
}

export function MyDialog({ open, onOpenChange, item, onSubmit }: MyDialogProps) {
  const isEditing = !!item;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formState, setFormState] = useState({});

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      if (item) {
        setFormState({ ...item });
      } else {
        setFormState({ /* defaults */ });
      }
    }
  }, [open, item]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSubmit(formState);
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit" : "Create"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          {/* form fields */}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="animate-spin mr-2" />}
              {isEditing ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

### Empty State Pattern

```tsx
if (data.length === 0) {
  return (
    <EmptyState
      icon={InboxIcon}
      title="No items yet"
      description="Create your first item to get started"
      action={{
        label: "Create Item",
        onClick: () => setShowCreateDialog(true),
      }}
    />
  );
}
```

## Styling Guidelines

- Use `cn()` for conditional classes
- Follow Tailwind class order: layout → spacing → sizing → typography → colors → effects
- Use design tokens: `text-text-muted`, `bg-bg-1`, `border-border-soft`
- Common patterns:
  ```tsx
  // Card with hover
  className="bg-bg-0 rounded-card border border-border-soft hover:border-border transition-colors"
  
  // Interactive item
  className="p-3 rounded-card hover:bg-bg-1 cursor-pointer transition-colors"
  
  // Status colors
  className={cn(
    "text-small font-medium",
    status === "success" && "text-status-success",
    status === "warning" && "text-status-warning",
    status === "danger" && "text-status-danger",
  )}
  ```
