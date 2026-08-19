# Scan Report Page Documentation

File documented: `scan/scanreport.html`

## Purpose
History gallery for uploaded scans with search, grid/list views, and lightbox preview.

## Key Functionalities
- Fetches scan records from backend.
- Skeleton loading placeholders.
- Search by filename/timestamp.
- Grid/list view toggle persisted in local storage.
- Lightbox preview with next/prev, download, caption/index.
- Pull-to-refresh on mobile.

## Workflow
1. Show skeleton UI and fetch scans.
2. Render cards/list and count badge.
3. User filters with search.
4. User opens lightbox and navigates images.

## Edge Cases Covered
- API errors/non-success responses show error state.
- Empty results show no-documents state.
- Broken image preview falls back to placeholder.
- Lightbox boundaries hide/disable next/prev at ends.
- Keyboard handlers no-op unless lightbox is active.
- Pull-to-refresh only triggers at top and threshold.

## UI Documentation
- **Layout**: sticky header with search and actions, content grid/list, lightbox overlay.
- **States**: skeleton loading, no-results, grid/list active mode, lightbox open/closed.
- **Responsive**: mobile-safe controls, swipe support, pull-to-refresh indicator.
- **Accessibility**: basic labels with mixed icon-first interactions.

