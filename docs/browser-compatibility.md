# Browser Compatibility

OKRs Tracker is built with modern web technologies and supports current browser versions.

## Supported Browsers

| Browser | Minimum Version | Notes |
|---------|-----------------|-------|
| Chrome | 90+ | Full support |
| Firefox | 90+ | Full support |
| Safari | 14+ | Full support |
| Edge | 90+ | Full support (Chromium-based) |

## Technical Requirements

### JavaScript Features Used
- ES2020+ syntax (async/await, optional chaining, nullish coalescing)
- Fetch API
- CSS Custom Properties
- CSS Grid and Flexbox
- Web Crypto API (for Supabase auth)
- LocalStorage/SessionStorage

### CSS Features Used
- CSS Custom Properties (variables)
- CSS Grid
- Flexbox
- `prefers-reduced-motion` media query
- `focus-visible` pseudo-class
- `backdrop-filter` (with fallback)
- Container queries (limited usage)

## Known Browser-Specific Behaviors

### Safari
- `backdrop-filter` may have slightly different rendering
- Date input formatting follows system locale

### Firefox
- Scrollbar styling uses standard properties (no webkit prefix)
- Some CSS animations may render differently

### Mobile Browsers
- iOS Safari: Full support (iOS 14+)
- Chrome Mobile: Full support (Android 8+)
- Touch interactions optimized

## Progressive Enhancement

The application uses progressive enhancement for:
- Drag-and-drop functionality (falls back to click interactions)
- Animations (respects `prefers-reduced-motion`)
- Date pickers (native on mobile, custom on desktop)

## Not Supported

- Internet Explorer 11 (discontinued)
- Legacy Edge (pre-Chromium)
- Browsers older than 2021

## Testing Methodology

### Manual Testing
- Primary testing on Chrome (development)
- Cross-browser verification on Safari, Firefox, Edge
- Mobile testing on iOS Safari and Chrome Android

### Automated Testing
- Vitest for unit and integration tests
- Testing Library for component tests
- Tests run in jsdom environment

## Performance Considerations

### Bundle Sizes (First Load JS)
| Page | Size |
|------|------|
| Home | 106 kB |
| Login | 118 kB |
| Plans List | 246 kB |
| Dashboard | 383 kB |
| Analytics | 475 kB |
| Tasks | 313 kB |
| OKRs | 334 kB |

### Optimization Techniques
- Code splitting by route
- Tree shaking (unused code elimination)
- Dynamic imports for heavy components
- Image optimization (Next.js Image for static assets)
- React Query caching

## Accessibility

See [Pre-Launch Checklist](./pre-launch-checklist.md) for accessibility compliance details.

Key accessibility features:
- WCAG 2.1 AA compliance target
- Screen reader support
- Keyboard navigation
- High contrast support
- Reduced motion support
