# Milk Entry Page Documentation

File documented: `milk/milk.html`

## Purpose
Daily milk collection entry page with draft/completed save flow and per-date status tracking.

## Key Functionalities
- Date navigation and date picker.
- Morning/evening liter entry with optional remarks.
- Live daily total and cost calculation (`UNIT_PRICE` based).
- Manual cost override mode.
- Save as Draft or Completed.
- Month accordion with per-day status indicators.
- Edit prefill via local storage handoff from report page.

## Workflow
1. Initialize date and fetch selected day data.
2. User enters liters/remarks and checks totals.
3. Save as Draft or Completed.
4. On success, update status/calendar and move forward.

## Edge Cases Covered
- Invalid numeric inputs fallback to `0`.
- Prefill fallback defaults when stored values are invalid.
- Multiple date format parsing support.
- Future-date navigation blocked.
- Manual cost mode reset when date/context changes.
- Save button locking and loader during request.

## UI Documentation
- **Layout**: left date/calendar pane, right entry pane, sticky header, bottom action bar.
- **States**: date status badge (no data/draft/done/checking), manual-cost mode on/off.
- **Responsive**: mobile-safe action bar and compact controls.
- **Accessibility**: native inputs and clear control labels.

