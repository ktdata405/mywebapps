# Calculator Hub Documentation

File documented: `calculator/calculator.html`

## Purpose
Launcher page for all calculator utilities in the calculator module.

## Key Functionalities
- Card-based navigation to specific calculators.
- Loader overlay transition before opening target page.
- Animated canvas/hover visual effects.
- Service worker registration and localization hook.

## Workflow
1. User opens calculator hub.
2. User selects a calculator card.
3. Loader appears briefly and redirects.

## Edge Cases Covered
- Service worker registration guarded with feature check and catch.
- Loader hidden on `pageshow` to avoid stuck state on back navigation.

## UI Documentation
- **Layout**: header with back/home, calculator card grid, footer, loader.
- **States**: card hover glow, loader visible/hidden.
- **Responsive**: grid collapses to fewer columns on small screens.
- **Accessibility**: native links/buttons; mostly visual cues.

