# Interest Float/Flat Calculator Documentation

File documented: `calculator/interest_float_flat.html`

## Purpose
Compares flat-rate and reducing-balance interest with GST and repayment schedule.

## Key Functionalities
- Mode tabs: Flat Rate vs Reducing Balance.
- Tenure handling through years/months.
- Computes interest, GST, total payable, EMI.
- Generates monthly repayment schedule.
- Amount-in-words conversion for principal.

## Workflow
1. Select interest mode.
2. Fill principal, rate, tenure, GST.
3. Run calculation.
4. Review summary and schedule.

## Edge Cases Covered
- Input sanitization removes invalid characters and extra decimals.
- Required input checks show alert and prevent calculation.
- Mode change resets stale schedule/UI data.
- EMI row shown only when calculated value is valid.

## UI Documentation
- **Layout**: calculator card with mode tabs, result panel, schedule accordion.
- **States**: active mode, result section visibility, schedule expand/collapse.
- **Responsive**: compact stacked controls on mobile.
- **Accessibility**: form labels and keyboard-friendly inputs.

