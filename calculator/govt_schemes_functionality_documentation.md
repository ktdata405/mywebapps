# Government Schemes Calculator Documentation

File documented: `calculator/govt_schemes.html`

## Purpose
Multi-scheme savings/investment calculator (SSA, PPF, NPS, NSC, KVP, SCSS, POMIS, MSSC).

## Key Functionalities
- Scheme tabs switch among calculators.
- Per-scheme detail panel (expand/collapse).
- Inputs and calculations specific to each scheme.
- Displays scheme-specific result cards.

## Workflow
1. User picks a scheme tab.
2. Optional: view scheme details.
3. Enter values and calculate.
4. View result output for selected scheme.

## Edge Cases Covered
- Guard clauses skip calculations when required values are missing.
- Tab switching isolates scheme UI state.
- Non-validated ranges mostly rely on user correctness (limited hard validation).

## UI Documentation
- **Layout**: single-page tabbed calculator with repeated input/result pattern.
- **States**: active tab, expanded details, result shown/hidden.
- **Responsive**: card and tab layout adapts to mobile widths.
- **Accessibility**: standard form controls; limited ARIA enhancements.

