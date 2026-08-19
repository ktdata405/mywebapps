# Dashboard Old Page Documentation

File documented: `dashboard_old.html`

## Purpose
Legacy report dashboard with searchable card grid.

## Key Functionalities
- Redirects to `dashboard.html` when new dashboard UI is enabled.
- Search filter with clear icon and no-results panel.
- Loader transition before navigating to report pages.
- Spotlight hover interaction on cards.

## Workflow
1. Redirect check for legacy/new UI.
2. Render report cards.
3. Search/filter cards.
4. Click card to open with loader transition.

## Edge Cases Covered
- Empty search restores full card set.
- No matches shows no-results state.
- Invalid links are ignored by navigation handler.
- Loader is removed on `pageshow`.

## UI Documentation
- **Layout**: header with back action, search bar, report cards, footer, loader.
- **States**: hover glow, filtered/no-results, loader state.
- **Responsive**: tighter card grid and spacing on small screens.
- **Accessibility**: basic native semantics with labeled back navigation.

