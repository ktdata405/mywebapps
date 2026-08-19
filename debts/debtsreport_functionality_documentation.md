# Debts Report Page Documentation

File documented: `debts/debtsreport.html`

## Purpose
Analytics and operations dashboard for debts: view, filter, settle/reopen, edit, delete.

## Key Functionalities
- Fetches all debt rows and normalizes statuses/types.
- KPI metrics (active debts, settled, receivable, payable, people count).
- Search + status/type filters.
- Grouped person-wise rendering with net exposure.
- Row actions: edit, settle/reopen, delete.
- Pull-to-refresh and manual refresh support.

## Workflow
1. Load and normalize debts.
2. Compute metrics and render grouped list.
3. User applies filters/search.
4. User performs row actions; page refreshes data on success.

## Edge Cases Covered
- Missing script URL and malformed API response guards.
- Invalid row IDs block actions.
- No filtered results show empty state.
- Confirmation cancel path handled cleanly.
- Loader cleanup in `finally` prevents stuck state.

## UI Documentation
- **Layout**: dashboard header, KPI cards, filter panel, grouped debt cards/list.
- **States**: filter chip active states, pending/settled badges, empty/error states.
- **Responsive**: compact mobile shell with touch-friendly actions.
- **Accessibility**: native controls with icon-driven actions.

