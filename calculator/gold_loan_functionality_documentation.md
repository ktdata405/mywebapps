# Gold Loan Calculator Documentation

File documented: `calculator/gold_loan.html`

## Purpose
Estimates eligible loan amount and interest for gold-backed borrowing.

## Key Functionalities
- Inputs for gold weight, rate/gram, LTV, interest rate, tenure.
- Computes total gold value, eligible loan, monthly interest, total interest.
- LTV badge/bar updates with risk styling.

## Workflow
1. User enters or adjusts all fields.
2. Calculator runs automatically on input changes.
3. Results update instantly.

## Edge Cases Covered
- Empty/invalid numeric fields fallback to `0` to avoid NaN.
- High LTV threshold updates visual warning state.

## UI Documentation
- **Layout**: two-panel layout (input card + result card).
- **States**: LTV visual state changes, live result updates.
- **Responsive**: stacks to single column on small screens.
- **Accessibility**: native numeric inputs and labels.

