# Land Calculator Documentation

File documented: `calculator/land.html`

## Purpose
Converts land dimensions into local units for regular and irregular plots.

## Key Functionalities
- Modes: Regular plot and Corner/Irregular plot.
- Calculates sq.ft, cents, gajalu (sq.yd), and ankanams.
- Shows formula/details accordion.
- Stores recent calculations in local storage history.

## Workflow
1. Select plot mode.
2. Enter required dimensions.
3. Run calculation and review converted values.
4. Optionally view history or clear it.

## Edge Cases Covered
- Validates positive numeric dimensions per mode.
- Separate validation paths for regular vs irregular input sets.
- History list capped to recent entries and persisted safely.
- Clear history requires confirmation.

## UI Documentation
- **Layout**: mode tabs, input form, result cards, details/history accordions.
- **States**: active mode, validation errors, accordion open/close, history empty/non-empty.
- **Responsive**: card stacks for narrow screens.
- **Accessibility**: native form elements; modal/ARIA enhancements are minimal.

