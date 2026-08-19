# Index Page Documentation

File documented: `index.html`

## Purpose
Modern home launcher for all modules with PIN gate, theme/localization support, and wheel-based navigation.

## Key Functionalities
- Redirects to `index_old.html` when new home UI is disabled in local storage.
- Applies saved settings (theme, language, side/temp wheel preferences).
- PIN authentication with 4-digit validation and session flag (`sessionStorage.isAuthenticated`).
- Builds launcher nodes dynamically from app data for center/side/temp layouts.
- Loader-assisted navigation, service worker registration, animated background.

## Workflow
1. Pre-check UI preference and redirect if needed.
2. Apply settings and greeting text.
3. Show auth screen if PIN is enabled; otherwise show app content.
4. On success, set session auth and enable module navigation.
5. Navigate with loader and reset loader on `pageshow`.

## Edge Cases Covered
- Non-digit PIN input is stripped and capped to 4 chars.
- Wrong PIN triggers shake/error UI and timed reset.
- PIN disabled or missing app PIN bypasses auth safely.
- Auth screen tap re-focuses hidden PIN input (mobile reliability).
- Temp-wheel mode overrides side-wheel mode safely.
- Loader cleanup handles browser back/forward restore.

## UI Documentation
- **Layout**: auth screen, sticky header, wheel launcher area, footer, full-screen loader.
- **States**: auth/app visible states, filled/error PIN dots, dark/light mode, wheel mode classes.
- **Responsive**: multiple breakpoints adjust wheel size, text, spacing, and safe-area paddings.
- **Accessibility**: `aria-label` on key controls and PIN input; partial reduced-motion handling.

