# Milk Report Page Documentation

File documented: `milk/milkreport.html`

## Purpose
Monthly reporting dashboard for milk records with edit flow and month-paid tracking.

## Key Functionalities
- Month/year filters with quick chips and navigation.
- Detailed records in card or table/list mode.
- Monthly summary in card/list mode with persisted preference.
- Draft/Done stage display by day.
- Edit action stores row and redirects to `milk.html`.
- Mark-month-paid flow with confirmation modal.

## Workflow
1. Load report for selected month/year.
2. Render detail records and monthly summaries.
3. User toggles view modes, edits row, or marks month paid.
4. Refresh UI after updates.

## Edge Cases Covered
- Empty datasets show dedicated no-data states.
- Month navigation bounded to allowed year range.
- Fetch error handling with loader cleanup.
- Draft-aware confirmation before marking month paid.
- Date parsing fallback for mixed formats.

## UI Documentation
- **Layout**: top bar, filters section, summary panel, detailed collection panel, modal overlays.
- **States**: paid/unpaid badge, view-mode toggles, loader/empty/error states.
- **Responsive**: mobile cards, floating add button, touch-friendly actions.
- **Accessibility**: mostly native controls with visual status indicators.

