# MSI Report Page Documentation

File documented: `msi/msireport.html`

## Purpose
Investment analytics dashboard with monthly overview, all-time totals, and history/edit features.

## Key Functionalities
- Fetch and normalize records from user sheet.
- User switch (Kalyan/Layan) changes platform model.
- Tabs: This Month, All-Time, Transaction History.
- History filters: category, sort order, with-data-only.
- Month navigator with bounds.
- Total-net-worth masking toggle.
- Edit handoff to entry page through session storage.

## Workflow
1. Fetch records for active user.
2. Normalize and sort rows.
3. Render summary cards and history table.
4. User filters/sorts/navigates months.
5. User edits selected row via redirect.

## Edge Cases Covered
- Missing endpoint and invalid response shape guards.
- HTTP/JSON parse failure handling.
- Empty data resets dashboard safely.
- Alias matching handles inconsistent backend column names.
- Invalid category filter falls back to `all`.
- Month navigation blocks out-of-range movement.

## UI Documentation
- **Layout**: navbar actions, hero summary controls, overview card grids, history table.
- **States**: active tab/filter, masked/unmasked totals, no-data/error states.
- **Responsive**: horizontal table scroll and mobile touch spacing.
- **Accessibility**: mostly native controls with icon labels.

