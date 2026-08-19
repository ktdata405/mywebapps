# Dashboard Page Documentation

File documented: `dashboard.html`

## Purpose
Modern report launcher dashboard using wheel-based navigation patterns.

## Key Functionalities
- Redirects to `dashboard_old.html` when new dashboard UI is disabled.
- Applies theme, language, and wheel mode settings.
- Dynamically builds report navigation nodes.
- Loader-assisted link navigation (including back-home action).
- Animated background and rotating temp-wheel connector lines.

## Workflow
1. Check new UI preference and redirect if needed.
2. Apply saved settings.
3. Build report nodes for active layout mode.
4. Intercept clicks, show loader, navigate.
5. Maintain animations and resize-based layout recalculation.

## Edge Cases Covered
- Resolves side-vs-temp mode conflict through class priority.
- Ignores invalid/blank links and `_blank` links for loader interception.
- Recomputes orbit layout on resize.
- Clears loader on `pageshow`.

## UI Documentation
- **Layout**: top bar with back action, wheel navigation area, footer, loader.
- **States**: dark/light mode, active layout mode, node hover/active states.
- **Responsive**: wheel and text scale down across breakpoints.
- **Accessibility**: back button label; temp nodes include labels/titles.

