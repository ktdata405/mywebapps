# Denominations Report Page Documentation

File documented: `denomination/denominationsreport.html`

## Purpose
Displays historical denomination records with expandable details and edit roundtrip support.

## Key Functionalities
- Fetches report rows from denomination backend.
- Optional available-balance card with privacy mask toggle.
- Expandable accordion cards per date entry.
- Detail rendering for denomination values and extra fields.
- Edit action sends row to entry page via local storage.
- Pull-to-refresh and manual refresh support.

## Workflow
1. Fetch data on page load.
2. Render balance card and report list.
3. User expands entries for detailed breakdown.
4. User edits selected row via redirect to entry page.

## Edge Cases Covered
- Graceful fallback for invalid/unparseable dates.
- Empty dataset shows explicit empty state.
- Fetch failure shows error state.
- Optional fields shown only when available.
- Currency formatting guarded against NaN.

## UI Documentation
- **Layout**: sticky header, balance card, report list cards, loader/empty states.
- **States**: accordion open/closed, balance masked/unmasked, loading/error/empty.
- **Responsive**: touch-friendly mobile card layout and FAB shortcut.
- **Accessibility**: labeled actions; mostly native semantics.

