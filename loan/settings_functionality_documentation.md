# Loan Settings Page Documentation

File documented: `loan/settings.html`

## Purpose
Module-level appearance settings for loan pages (theme selection and dark/light mode).

## Key Functionalities
- Dynamic theme card grid built from in-page theme definitions.
- Applies selected theme using CSS custom properties.
- Dark mode toggle with persistence.
- Uses shared global theming hook if available; falls back to body classes.
- Service worker registration.

## Workflow
1. Load saved theme and mode.
2. User selects theme card.
3. User toggles dark mode.
4. Preferences save immediately to local storage.

## Edge Cases Covered
- Missing/invalid saved theme falls back to default.
- Missing dark mode preference defaults to dark theme.
- Safe fallback if shared theme helper function is unavailable.

## UI Documentation
- **Layout**: header shortcuts, theme selection section, dark-mode switch section.
- **States**: selected theme card, dark/light active mode.
- **Responsive**: mobile-safe spacing and safe-area support.
- **Accessibility**: native checkbox/toggle behavior and labeled controls.

