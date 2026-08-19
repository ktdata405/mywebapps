# Village Interest Calculator Documentation

File documented: `calculator/village_interest.html`

## Purpose
Calculates village-style simple interest using either fixed months or date-range duration.

## Key Functionalities
- Duration modes: month input or start/end dates.
- Computes interest, total payable, and monthly estimates.
- Generates repayment schedule.
- Principal amount in words display.

## Workflow
1. Select duration mode.
2. Enter principal/rate and duration input.
3. Calculate and review summary + schedule.
4. Clear form when needed.

## Edge Cases Covered
- Validates missing principal/rate fields.
- Date mode checks invalid dates and end-before-start cases.
- Month mode requires duration > 0.
- Clear operation resets schedule and mode-specific UI safely.

## UI Documentation
- **Layout**: mode tabs, input card, result section, schedule accordion.
- **States**: active duration mode, result shown/hidden, schedule expand state.
- **Responsive**: optimized single-column mobile view.
- **Accessibility**: standard inputs/buttons with basic labeling.

