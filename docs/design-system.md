# Design System Guide

> Established: 2026-01-24

This document describes the design system for the OKRs Tracker application, based on a Kympler-inspired aesthetic: neutral palette, crisp typography, soft shadows, rounded cards, generous whitespace, and subtle borders.

## Table of Contents

- [Design Philosophy](#design-philosophy)
- [Color System](#color-system)
- [Typography](#typography)
- [Spacing](#spacing)
- [Border Radius](#border-radius)
- [Shadows](#shadows)
- [Animations](#animations)
- [Component Inventory](#component-inventory)
- [Usage Guidelines](#usage-guidelines)
- [Component Checklist](#component-checklist)

---

## Design Philosophy

### Core Principles

1. **Minimalism** - Clean, uncluttered interfaces
2. **Professionalism** - Neutral palette with accent color for actions
3. **Clarity** - Clear visual hierarchy
4. **Subtlety** - Soft shadows, gentle transitions
5. **Consistency** - Reusable tokens and patterns

### Key Characteristics

| Characteristic | Implementation |
|----------------|----------------|
| Color palette | Neutral grays with blue accent |
| Typography | Plus Jakarta Sans (headings) + Inter (body) |
| Corners | Generously rounded (12-16px) |
| Shadows | Soft, diffused |
| Borders | Subtle, low opacity |
| Whitespace | Generous padding and margins |

---

## Color System

### Backgrounds

| Token | Hex/Value | Tailwind Class | Usage |
|-------|-----------|----------------|-------|
| Primary | `#FFFFFF` | `bg-bg-0` | Main backgrounds |
| Secondary | `#F5F5F5` | `bg-bg-1` | Cards, sections |
| Tertiary | `rgba(245,245,245,0.35)` | `bg-bg-2` | Overlays |
| Subtle | `rgba(245,245,245,0.20)` | `bg-bg-subtle` | Very light fills |

### Text

| Token | Hex/Value | Tailwind Class | Usage |
|-------|-----------|----------------|-------|
| Strong | `#000000` | `text-text-strong` | Headings, emphasis |
| Default | `#000000` | `text-text` | Body text |
| Muted | `rgba(0,0,0,0.60)` | `text-text-muted` | Secondary text |
| Subtle | `rgba(0,0,0,0.40)` | `text-text-subtle` | Tertiary text |

### Borders

| Token | Hex/Value | Tailwind Class | Usage |
|-------|-----------|----------------|-------|
| Default | `rgba(0,0,0,0.10)` | `border-border` | Standard borders |
| Soft | `rgba(0,0,0,0.08)` | `border-border-soft` | Subtle dividers |
| Strong | `rgba(0,0,0,0.15)` | `border-border-strong` | Emphasis borders |

### Status Colors

Use sparingly for meaningful status indicators.

| Token | Hex | Tailwind Class | Usage |
|-------|-----|----------------|-------|
| Success | `#22C55E` | `text-status-success` | Positive states, completion |
| Warning | `#F59E0B` | `text-status-warning` | Caution, needs attention |
| Danger | `#EF4444` | `text-status-danger` | Errors, destructive actions |
| Info | `#3B82F6` | `text-status-info` | Information, tips |

### Accent Colors

Professional blue for primary actions and focus states.

| Token | Hex | Tailwind Class | Usage |
|-------|-----|----------------|-------|
| Default | `#2563EB` | `bg-accent` | Primary buttons, links |
| Hover | `#1D4ED8` | `bg-accent-hover` | Hover states |
| Muted | `rgba(37,99,235,0.08)` | `bg-accent-muted` | Subtle highlights |

---

## Typography

### Font Families

| Family | Token | Usage |
|--------|-------|-------|
| Plus Jakarta Sans | `font-heading` | Headings (H1-H5) |
| Inter | `font-body`, `font-sans` | Body text, UI |

### Font Sizes

| Token | Size | Line Height | Weight | Tailwind |
|-------|------|-------------|--------|----------|
| H1 | 52px / 40px | 1.1 | 700 | `text-h1` / `text-h1-mobile` |
| H2 | 36px / 30px | 1.15 | 700 | `text-h2` / `text-h2-mobile` |
| H3 | 26px / 22px | 1.2 | 600 | `text-h3` / `text-h3-mobile` |
| H4 | 20px | 1.3 | 600 | `text-h4` |
| H5 | 18px | 1.4 | 600 | `text-h5` |
| Body LG | 16px | 1.6 | 400 | `text-body-lg` |
| Body | 15px | 1.55 | 400 | `text-body` |
| Body SM | 14px | 1.5 | 400 | `text-body-sm` |
| Caption | 13px | 1.4 | 500 | `text-caption` |
| Small | 12px | 1.4 | 400 | `text-small` |

### Font Weights

| Weight | Value | Usage |
|--------|-------|-------|
| Regular | 400 | Body text |
| Medium | 500 | Captions, labels |
| Semibold | 600 | H3-H5, emphasis |
| Bold | 700 | H1-H2, strong emphasis |

### Letter Spacing

| Token | Value | Usage |
|-------|-------|-------|
| Tighter | -0.02em | Large headings (H1) |
| Tight | -0.01em | Medium headings (H2-H3) |
| Normal | 0 | Body text |

---

## Spacing

### Gap Scale

| Token | Size | Tailwind |
|-------|------|----------|
| XS | 8px | `gap-2` |
| SM | 12px | `gap-3` |
| MD | 16px | `gap-4` |
| LG | 24px | `gap-6` |
| XL | 32px | `gap-8` |
| 2XL | 48px | `gap-12` |

### Container Widths

| Token | Size | Tailwind |
|-------|------|----------|
| Container | 1200px | `max-w-container` |
| Container SM | 1100px | `max-w-container-sm` |
| Content | 800px | `max-w-content` |

### Section Spacing

| Token | Desktop | Mobile |
|-------|---------|--------|
| Vertical | 80px | 48px |
| Container padding | 32px | 20px |

---

## Border Radius

| Token | Size | Tailwind | Usage |
|-------|------|----------|-------|
| Card | 16px | `rounded-card` | Cards, dialogs |
| Button | 12px | `rounded-button` | Buttons |
| Input | 12px | `rounded-input` | Form inputs |
| Pill | 999px | `rounded-pill` | Tags, pills |
| SM | 8px | `rounded-sm` | Small elements |
| MD | 12px | `rounded-md` | Default |
| LG | 16px | `rounded-lg` | Large elements |

---

## Shadows

| Token | Value | Tailwind | Usage |
|-------|-------|----------|-------|
| Soft | `0 8px 24px rgba(0,0,0,0.08)` | `shadow-soft` | General elevation |
| Card | `0 6px 18px rgba(0,0,0,0.06)` | `shadow-card` | Cards |
| Hover | `0 10px 30px rgba(0,0,0,0.10)` | `shadow-hover` | Hover states |
| Card Hover | `0 12px 32px rgba(0,0,0,0.12)` | `shadow-card-hover` | Card hover |
| Input | `0 2px 8px rgba(0,0,0,0.04)` | `shadow-input` | Form inputs |
| Input Focus | `0 0 0 3px rgba(0,0,0,0.08)` | `shadow-input-focus` | Input focus ring |

---

## Animations

### Durations

| Token | Duration | Tailwind | Usage |
|-------|----------|----------|-------|
| Fast | 120ms | `duration-fast` | Micro-interactions |
| Normal | 180ms | `duration-normal` | Standard transitions |
| Slow | 280ms | `duration-slow` | Larger movements |

### Easing

| Token | Value | Usage |
|-------|-------|-------|
| Default | `cubic-bezier(0.25, 0.1, 0.25, 1)` | All transitions |

### Keyframe Animations

| Animation | Tailwind | Usage |
|-----------|----------|-------|
| Fade In | `animate-fade-in` | Content appearing |
| Fade In Up | `animate-fade-in-up` | Modal/card entrance |
| Slide In Right | `animate-slide-in-right` | Side panel entrance |
| Scale In | `animate-scale-in` | Popover/dropdown |

---

## Component Inventory

### Base UI Components (`src/components/ui/`)

| Component | Base | Variants | File |
|-----------|------|----------|------|
| Button | Radix Slot | default, secondary, ghost, outline, danger + sizes | `button.tsx` |
| Card | div | CardHeader, CardTitle, CardDescription, CardContent | `card.tsx` |
| Badge | span | default, secondary, outline, destructive | `badge.tsx` |
| Input | input | - | `input.tsx` |
| Label | Radix Label | - | `label.tsx` |
| Checkbox | Radix Checkbox | - | `checkbox.tsx` |
| Select | Radix Select | Trigger, Content, Item | `select.tsx` |
| Dialog | Radix Dialog | Content, Header, Title, Footer | `dialog.tsx` |
| AlertDialog | Radix AlertDialog | - | `alert-dialog.tsx` |
| DropdownMenu | Radix DropdownMenu | Item, Separator | `dropdown-menu.tsx` |
| Tabs | Radix Tabs | List, Trigger, Content | `tabs.tsx` |
| Popover | Radix Popover | - | `popover.tsx` |
| Tooltip | Radix Tooltip | - | `tooltip.tsx` |
| Progress | Radix Progress | - | `progress.tsx` |
| Toast | Radix Toast | default, success, warning, destructive | `toast.tsx` |
| Toaster | - | Toast container | `toaster.tsx` |
| Avatar | Radix Avatar | - | `avatar.tsx` |
| Table | table | Header, Body, Row, Cell | `table.tsx` |
| ExpandableCard | - | Collapsible card | `expandable-card.tsx` |
| MarkdownEditor | textarea | - | `markdown-editor.tsx` |
| Sortable | DnD Kit | Drag and drop | `sortable.tsx` |
| ErrorBoundary | React Component | - | `error-boundary.tsx` |

### Domain Components

| Directory | Purpose |
|-----------|---------|
| `layout/` | Navbar, PageHeader, EmptyState |
| `dashboard/` | Widget system, grid layout |
| `okr/` | Objective cards, KR cards, check-ins |
| `tasks/` | Task dialogs, filters, rows |
| `tags/` | Tag management |
| `activity/` | Activity feed |
| `analytics/` | Charts, metrics panels |
| `weekly-review/` | Review components |
| `import-export/` | Import/export dialogs |

---

## Usage Guidelines

### Color Usage

```tsx
// ✓ Good - semantic tokens
className="bg-bg-0 text-text border-border-soft"
className="text-text-muted"
className="text-status-success"
className="bg-accent text-white"

// ✗ Avoid - raw colors
className="bg-white text-black"
className="text-gray-500"
className="text-green-500"
```

### Typography Usage

```tsx
// ✓ Good - semantic classes
<h1 className="font-heading text-h1 md:text-h1-mobile">Title</h1>
<p className="text-body text-text-muted">Description</p>
<span className="text-small text-text-subtle">Footnote</span>

// ✗ Avoid - arbitrary sizes
<h1 className="text-[52px] font-bold">Title</h1>
```

### Spacing Usage

```tsx
// ✓ Good - Tailwind scale
className="p-4 gap-6 space-y-4"
className="max-w-container mx-auto"

// ✗ Avoid - arbitrary values
className="p-[17px] gap-[23px]"
```

### Shadow Usage

```tsx
// ✓ Good - semantic shadows
className="shadow-card hover:shadow-card-hover"
className="shadow-input focus:shadow-input-focus"

// ✗ Avoid - custom shadows
className="shadow-[0_5px_15px_rgba(0,0,0,0.1)]"
```

### Animation Usage

```tsx
// ✓ Good - defined animations
className="transition-colors duration-normal"
className="animate-fade-in-up"

// ✗ Avoid - arbitrary durations
className="transition-all duration-[175ms]"
```

---

## Component Checklist

Use this checklist when creating or reviewing components:

### Structure
- [ ] Uses semantic HTML elements
- [ ] Props interface defined with TypeScript
- [ ] Supports `className` prop for customization
- [ ] Uses `cn()` utility for conditional classes

### Styling
- [ ] Uses design tokens (no hard-coded colors/sizes)
- [ ] Follows Tailwind class order convention
- [ ] Responsive design (mobile-first)
- [ ] Hover/focus states defined
- [ ] Animations use defined durations/easings

### Accessibility
- [ ] Proper ARIA attributes
- [ ] Keyboard navigation supported
- [ ] Focus visible states
- [ ] Color contrast meets WCAG AA

### Consistency
- [ ] Matches existing component patterns
- [ ] Uses existing UI components where possible
- [ ] Follows naming conventions
- [ ] Exported from index file

### Example Component

```tsx
"use client";

import { cn } from "@/lib/utils";

interface MyComponentProps {
  title: string;
  description?: string;
  variant?: "default" | "muted";
  className?: string;
}

export function MyComponent({
  title,
  description,
  variant = "default",
  className,
}: MyComponentProps) {
  return (
    <div
      className={cn(
        // Base styles
        "p-4 rounded-card border transition-colors",
        // Variant styles
        variant === "default" && "bg-bg-0 border-border",
        variant === "muted" && "bg-bg-1 border-border-soft",
        // Hover state
        "hover:border-border-strong",
        // Custom classes
        className
      )}
    >
      <h3 className="font-heading text-h5 text-text-strong">{title}</h3>
      {description && (
        <p className="mt-1 text-body-sm text-text-muted">{description}</p>
      )}
    </div>
  );
}
```

---

## Files Reference

| File | Purpose |
|------|---------|
| `src/lib/design-tokens.ts` | Design tokens for JS access |
| `tailwind.config.ts` | Tailwind configuration |
| `src/app/globals.css` | Global styles |
| `src/components/ui/` | Base UI components |
