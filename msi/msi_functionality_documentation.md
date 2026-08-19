# MSI Entry Page Documentation

File documented: `msi/msi.html`

## Purpose
Monthly investment entry page for different users (Kalyan/Layan) with per-platform input fields.

## Key Functionalities
- User selector toggles relevant form sections.
- Month/year controls with current-date defaults.
- Numeric sanitization and Indian-format display.
- Live total calculation from visible inputs.
- Edit-prefill via `sessionStorage.msiEditData` mapping.
- Save to backend endpoint with loader and alerts.

## Workflow
1. Initialize defaults and active user section.
2. User enters platform investment values.
3. Total updates in real time.
4. Submit saves row and redirects to report page.

## Edge Cases Covered
- Invalid numeric input cleanup and decimal normalization.
- Empty numbers treated as `0` for totals.
- Hidden user fields excluded from total/payload.
- Edit key mapping handles column-name differences.
- Duplicate submit mitigation via button disable.

## UI Documentation
- **Layout**: header actions, control card, user-specific investment cards, save CTA, loader.
- **States**: active user section, saving state, validation/error feedback.
- **Responsive**: card sections stack for smaller devices.
- **Accessibility**: native labels/inputs and clear section headings.

