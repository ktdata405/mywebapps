# Rent Entry Page Documentation

File documented: `rent/tenet.html` (+ `rent/script.js`)

## Purpose
Add or edit tenant rent transactions and submit them to the rent backend.

## Key Functionalities
- Captures date, side, rent components, utilities, adjustment, remarks.
- Auto-calculates total paid.
- Prev/next date navigation with date picker.
- Add vs update mode using session storage handoff.
- Saves using backend actions (`add`/`update`) with loader feedback.

## Workflow
1. Initialize form and detect edit context.
2. User enters values; total updates automatically.
3. Submit validates required fields and posts payload.
4. On success: update redirects to report, add mode resets and shows local row.

## Edge Cases Covered
- Missing date/side blocks submission.
- Numeric fields default to `0` when invalid.
- Date format parsing includes fallback paths.
- Future-date stepper is blocked.
- Empty remarks normalized to `-`.

## UI Documentation
- **Layout**: sticky header, form sections, actions, optional submitted-record table, loader overlay.
- **States**: add/update mode, loading submit state, validation/alert states.
- **Responsive**: mobile-safe spacing and control sizing.
- **Accessibility**: native inputs and labels.

