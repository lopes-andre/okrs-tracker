# Technical Debt

This document tracks known technical debt in the codebase.

## Last Updated: 2026-01-25

---

## Native `<img>` Elements

**Priority:** Low
**Effort:** Medium
**Impact:** Performance (LCP, bandwidth)

The following files use native `<img>` elements instead of Next.js `<Image />` component:

| File | Line | Reason |
|------|------|--------|
| `src/components/content/media-preview-lightbox.tsx` | 325, 441 | Dynamic signed URLs from Supabase Storage |
| `src/components/content/media-section.tsx` | 160 | Dynamic signed URLs from Supabase Storage |
| `src/components/content/media-upload.tsx` | 99 | Dynamic signed URLs from Supabase Storage |
| `src/components/content/pending-media-upload.tsx` | 304 | Local blob URLs (File objects) |
| `src/components/content/post-card.tsx` | 226 | Dynamic signed URLs from Supabase Storage |

### Why Not next/image?

These images come from:
1. **Supabase Storage signed URLs** - URLs are dynamically generated and expire, making static optimization difficult
2. **Local blob URLs** - Created from File objects for preview before upload

### Potential Solutions

1. **Configure remotePatterns** in next.config.js for Supabase domain
2. **Use unoptimized prop** for dynamic content
3. **Create a custom image loader** for Supabase URLs

### Recommendation

Keep as-is for now. The performance impact is minimal since:
- These are user-uploaded images (not LCP critical)
- Images are typically small thumbnails
- Signed URLs expire, making caching complex

---

## Completed Items

- [x] Removed unused imports and variables (2026-01-25)
- [x] Fixed Lucide Image icon accessibility warnings (2026-01-25)
- [x] Removed unnecessary eslint-disable comments (2026-01-25)
- [x] Cleaned up debug console.error statements (2026-01-25)
- [x] Replaced legitimate error logs with logger utility (2026-01-25)
