# Loan Report Page Documentation

File documented: `loan/loanreport.html`

## Purpose
Displays loan portfolio summary, repayment history, and payment transaction operations.

## Key Functionalities
- Fetches and renders all loans with totals and per-loan metrics.
- Shows interest, EMI estimate, paid amount, balance, and progress.
- Repayment history modal with month status toggle.
- Payment modal to record loan transactions.
- Refresh, pull-to-refresh, and mobile FAB support.

## Workflow
1. Fetch loan data on load.
2. Render summary KPIs and loan cards.
3. Open repayment modal to review/update month statuses.
4. Add payment transaction from modal and refresh report.

## Edge Cases Covered
- Empty data shows explicit no-loans state.
- Defensive parsing for missing/invalid numeric values.
- EMI guarded against zero tenure.
- API failure paths show alerts and preserve UI integrity.
- Loader cleanup in async paths.

## UI Documentation
- **Layout**: top nav, KPI summary cards, loan card list, repayment/payment modals.
- **States**: loan progress visuals, modal open/close, loading state, no-data state.
- **Responsive**: touch-friendly cards and bottom-sheet style modal behavior on mobile.
- **Accessibility**: native form controls; icon actions with labels/titles.

