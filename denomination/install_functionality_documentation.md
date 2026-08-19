# Denomination Install Page Documentation

File documented: `denomination/install.html`

## Purpose
Guides users through PWA installation with native prompt support and manual fallback instructions.

## Key Functionalities
- Detects whether this app is already installed.
- Uses `beforeinstallprompt` when available.
- Handles installed vs manual instruction states.
- Platform tabs for Android/iOS install steps.
- Service worker registration.

## Workflow
1. Detect app install context.
2. If installed, show open-app action.
3. If prompt is available, show install button.
4. Otherwise show manual platform instructions.

## Edge Cases Covered
- Prevents false installed-state positives in nested PWA contexts.
- Fallback to manual flow when prompt never appears.
- Handles install prompt dismissal path.
- iOS-specific guidance defaults for iOS agents.

## UI Documentation
- **Layout**: centered install card with status pill, actions, and instructions.
- **States**: checking, ready-to-install, installed, manual guidance.
- **Responsive**: mobile-friendly single-column card.
- **Accessibility**: clear button labeling; limited advanced ARIA.

