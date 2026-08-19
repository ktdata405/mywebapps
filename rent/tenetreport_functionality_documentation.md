# Rent Report Page Documentation

File documented: `rent/tenetreport.html`

## Purpose
Report dashboard for rent transactions with filtering, totals, edit/delete actions, and refresh flows.

## Key Functionalities
- Fetches all records and sorts by latest date.
- Side-based filter with persistence.
- Top total-collected KPI with privacy toggle.
- Accordion cards for per-record detail view.
- Edit handoff to entry page via session storage.
- Delete action with confirmation and backend sync.
- Manual and pull-to-refresh.

## Workflow
1. Fetch and cache records.
2. Apply filter and render cards.
3. User expands records, edits, or deletes.
4. Refresh data and KPI totals after actions.

## Edge Cases Covered
- Date/currency parsing fallbacks for malformed values.
- Empty filter result shows dedicated state.
- Fetch failures show error state and keep UI stable.
- In-flight fetch guard prevents duplicate requests.
- Delete cancel path exits cleanly.

## UI Documentation
- **Layout**: sticky header controls, summary KPI, report card list, empty/error blocks.
- **States**: accordion open state, filter active state, loading skeletons, masked total.
- **Responsive**: touch-friendly mobile cards, pull-to-refresh, FAB add button.
- **Accessibility**: native controls with icon action affordances.

