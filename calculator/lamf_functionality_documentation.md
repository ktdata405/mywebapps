# LAMF Calculator Documentation

File documented: `calculator/lamf.html`

## Purpose
Calculates loan eligibility and interest for Loan Against Mutual Funds.

## Key Functionalities
- Inputs for portfolio value, fund type, LTV ratio, interest rate.
- Auto LTV presets by fund type.
- Computes eligible loan and daily/monthly/yearly interest.
- Number formatting with Indian separators.

## Workflow
1. Enter portfolio value.
2. Select fund type or adjust LTV/rate manually.
3. View live loan/interest results.

## Edge Cases Covered
- Invalid/empty numbers fallback to `0`.
- Non-digit portfolio characters are stripped.
- Missing values do not break calculation flow.

## UI Documentation
- **Layout**: single card form with result and formula help tooltip.
- **States**: live result updates on input changes.
- **Responsive**: simplified one-column presentation on small screens.
- **Accessibility**: native inputs and labels.

