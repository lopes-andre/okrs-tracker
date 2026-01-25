# Content Components - `src/components/content/`

React components for the Content Planner feature.

## Directory Structure

```
src/components/content/
├── kanban-board.tsx              # Main Kanban board with DnD
├── kanban-column.tsx             # Column container
├── kanban-filters.tsx            # Filter controls (debounced search)
├── post-card.tsx                 # Post card (memoized)
├── post-detail-modal.tsx         # Full post editor modal
├── post-dialog.tsx               # Quick post create/edit
├── quick-capture.tsx             # Quick post creation
│
├── content-calendar.tsx          # Calendar container
├── calendar-month-view.tsx       # Month grid view
├── calendar-week-view.tsx        # Week time slots
├── calendar-day-view.tsx         # Day hourly view
├── calendar-list-view.tsx        # List of distributions
├── calendar-filters.tsx          # Calendar filter controls
├── calendar-entry.tsx            # Single calendar entry
│
├── post-distributions-tab.tsx    # Distribution management tab
├── pending-distributions-tab.tsx # Pending distributions view
├── distribution-accordion-item.tsx      # Distribution display
├── pending-distribution-accordion-item.tsx # Pending distribution
├── add-distribution-dialog.tsx   # Create distribution
├── distribution-detail-dialog.tsx # Edit distribution
├── mark-posted-dialog.tsx        # Mark as posted
├── metrics-checkin-dialog.tsx    # Log metrics
│
├── media-upload.tsx              # File upload with drag-drop
├── media-section.tsx             # Media display/reorder
├── media-preview-lightbox.tsx    # Media lightbox viewer
├── pending-media-upload.tsx      # Upload to pending posts
│
├── campaigns-list.tsx            # Campaign list view
├── campaign-card.tsx             # Campaign display card
├── campaign-dialog.tsx           # Create/edit campaign
├── campaign-checkin-dialog.tsx   # Campaign metrics check-in
│
├── content-settings.tsx          # Settings container (tabs)
├── accounts-settings.tsx         # Account management
├── goals-settings.tsx            # Goal management
├── account-dialog.tsx            # Create/edit account
├── goal-dialog.tsx               # Create/edit goal
│
├── content-analytics.tsx         # Analytics dashboard
├── platform-metrics-config.ts    # Metric type definitions
│
├── platform-icon.tsx             # Platform icon renderer
├── platform-badge.tsx            # Platform badge display
├── account-badge.tsx             # Account name badge
├── kr-selector.tsx               # KR linking selector
│
└── index.ts                      # Re-exports
```

## Key Components

### KanbanBoard

Main content pipeline with drag-and-drop reordering.

```typescript
interface KanbanBoardProps {
  planId: string;
  goals: ContentGoal[];
}
```

**Features:**
- DnD using `@dnd-kit/core` and `@dnd-kit/sortable`
- Multi-select mode with bulk actions (delete, favorite)
- Position indicators (1, 2, 3...)
- Load more pattern (20 initial, +20 per load)
- Complete column limited to 10 posts
- Auto-update overdue distributions to posted

**Key Patterns:**
```typescript
// Selection state using Set for O(1) operations
const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

// Visible counts per column for load more
const [visibleCounts, setVisibleCounts] = useState<Record<ContentPostStatus, number>>({
  backlog: 20,
  tagged: 20,
  ongoing: 20,
  complete: 10,
});

// DnD sensors with activation constraint
const sensors = useSensors(
  useSensor(PointerSensor, {
    activationConstraint: { distance: 8 },
  }),
  useSensor(KeyboardSensor, {
    coordinateGetter: sortableKeyboardCoordinates,
  })
);
```

### PostCard

Memoized post card component for performance.

```typescript
interface PostCardProps {
  post: ContentPostWithDetails;
  position?: number;           // Position indicator
  isSelected?: boolean;        // Multi-select state
  isSelectionMode?: boolean;   // Show checkbox vs position
  onClick?: () => void;
  onToggleFavorite?: (postId: string, isFavorite: boolean) => void;
  onToggleSelect?: (postId: string) => void;
}
```

**Performance Optimizations:**
```typescript
// Main component is memoized
export const PostCard = memo(function PostCard({ ... }) { ... });

// CoverImage has custom comparison
const CoverImage = memo(function CoverImage({ post }) { ... },
  (prevProps, nextProps) => {
    // Only re-render if cover image candidate changes
    return prevFirst?.file_url === nextFirst?.file_url;
  }
);
```

### KanbanFilters

Filter controls with debounced search.

```typescript
interface KanbanFilters {
  search: string;
  goalIds: string[];
  accountIds: string[];
  hasDistributions: boolean | null;
  isFavorite: boolean | null;
  hasMedia: boolean | null;
  hasVideoLinks: boolean | null;
  hasLinks: boolean | null;
}
```

**Debounced Search Pattern:**
```typescript
const SEARCH_DEBOUNCE_MS = 300;
const [localSearch, setLocalSearch] = useState(filters.search);

useEffect(() => {
  if (localSearch === filters.search) return;
  const timeoutId = setTimeout(() => {
    onFiltersChange({ ...filters, search: localSearch });
  }, SEARCH_DEBOUNCE_MS);
  return () => clearTimeout(timeoutId);
}, [localSearch]);
```

### PostDetailModal

Full post editing modal with tabs.

```typescript
interface PostDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planId: string;
  postId: string | null;      // null for new post
  goals: ContentGoal[];
  accounts: ContentAccountWithPlatform[];
  initialStatus?: ContentPostStatus;
}
```

**Tabs:**
1. Basic Info (title, description, goals)
2. Media (upload, video links)
3. Links (reference URLs)
4. Distributions (schedule, mark posted)
5. Metrics (for posted distributions)

### PlatformIcon

Renders platform-specific icons.

```typescript
interface PlatformIconProps {
  platformName: string;   // instagram, linkedin, youtube, etc.
  size?: "sm" | "md" | "lg";
  className?: string;
}

// Also exports color helper
export function getPlatformColors(platformId: string): {
  bg: string;
  text: string;
  border: string;
}
```

**Supported Platforms:**
- instagram, linkedin, youtube, tiktok, x, blog, spotify, newsletter

## Component Patterns

### Standard Dialog Pattern

```typescript
interface MyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planId: string;
  item?: MyType | null;
  onSubmit: (data: MyData) => Promise<void>;
}

export function MyDialog({ open, onOpenChange, item, onSubmit }: MyDialogProps) {
  const isEditing = !!item;
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      if (item) {
        setFormState({ ...item });
      } else {
        setFormState(defaultValues);
      }
    }
  }, [open, item]);

  // ...
}
```

### Selection Mode Pattern

```typescript
const [isSelectionMode, setIsSelectionMode] = useState(false);
const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

// Toggle selection
const handleToggleSelect = useCallback((id: string) => {
  setSelectedIds((prev) => {
    const next = new Set(prev);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    return next;
  });
}, []);

// Exit selection mode clears selection
const handleExitSelectionMode = useCallback(() => {
  setIsSelectionMode(false);
  setSelectedIds(new Set());
}, []);
```

### Cover Image Priority

1. First uploaded IMAGE (not PDF, not external)
2. First video_link with thumbnail_url
3. None if no valid candidates

```typescript
const firstImage = sortedMedia.find((m) => {
  const isImage = m.media_type === "image" || m.mime_type?.startsWith("image/");
  const isExternal = m.is_external || m.media_type === "video_link";
  return isImage && !isExternal;
});

const videoWithThumbnail = !firstImage ? sortedMedia.find(
  (m) => (m.media_type === "video_link" || m.is_external) && m.thumbnail_url
) : null;
```

## Styling Guidelines

### Card Styles

```tsx
// Post card
className={cn(
  "bg-bg-0 rounded-card border overflow-hidden",
  "hover:shadow-sm transition-all cursor-pointer",
  isSelected
    ? "border-accent ring-1 ring-accent"
    : "border-border-soft hover:border-border"
)}
```

### Selection Checkbox

```tsx
<button
  onClick={handleCheckboxClick}
  className={cn(
    "flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors",
    isSelected
      ? "bg-accent border-accent text-white"
      : "border-border-soft hover:border-accent"
  )}
>
  {isSelected && <Check className="w-3 h-3" />}
</button>
```

### Goal Badge

```tsx
<Badge
  variant="outline"
  className="text-[10px] px-1.5 py-0"
  style={{
    borderColor: goal.color || undefined,
    color: goal.color || undefined,
  }}
>
  {goal.name}
</Badge>
```

## Dependencies

- `@dnd-kit/core`: DnD context and sensors
- `@dnd-kit/sortable`: Sortable list functionality
- `@dnd-kit/utilities`: CSS transform helpers
- `date-fns`: Date formatting
- `lucide-react`: Icons
