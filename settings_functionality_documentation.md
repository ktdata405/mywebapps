# Settings Page Documentation

File documented: `settings.html`

## Purpose
Central preferences hub for theme, language, UI mode, security options, notifications, and local data reset.

## Key Functionalities
- Theme and dark/light mode persistence.
- Language selection and localization update hooks.
- UI mode toggles (new/legacy, side wheel, temp wheel) with exclusivity logic.
- PIN enable/disable and set/change with validation.
- Notification and fingerprint preference toggles.
- Clear all local app data with confirmation.

## Workflow
1. Load current settings from local storage.
2. User updates toggles/selectors.
3. Save values immediately to local storage.
4. Optional: configure PIN or clear local data.

## Edge Cases Covered
- UI mode toggles enforce mutual exclusivity and fallback behavior.
- PIN validation checks length, numeric-only, empty fields, and confirm mismatch.
- PIN setup panel hidden when PIN feature is disabled.
- Default theme mode applied when preference is missing.
- Clear-data action guarded by confirmation dialog.

## UI Documentation
- **Layout**: sticky header, section cards (General, Views, Security, Data, About), footer, loader.
- **States**: toggle on/off visuals, conditional PIN panel visibility, theme mode changes.
- **Responsive**: compact spacing and typography at smaller breakpoints.
- **Accessibility**: labeled form controls and native checkbox semantics.

