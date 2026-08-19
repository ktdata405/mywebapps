# Index Old Page Documentation

File documented: `index_old.html`

## Purpose
Legacy home launcher with searchable app cards, PIN gate, and loader-based navigation.

## Key Functionalities
- Redirects to `index.html` when new home UI is enabled.
- PIN authentication flow with session auth persistence.
- Search/filter across app cards with clear icon and no-results messaging.
- Card click shows loader then navigates.
- Theme/localization hooks and animated canvas background.

## Workflow
1. Redirect decision (legacy vs new home).
2. Apply saved settings and greeting.
3. Run PIN gating.
4. User filters cards using search.
5. User opens module card through loader transition.

## Edge Cases Covered
- PIN sanitization and error reset flow.
- Empty search restores all cards.
- No matching cards shows explicit empty state.
- Navigation guard avoids invalid links and `_blank` interception.
- Loader reset on `pageshow` after browser history navigation.

## UI Documentation
- **Layout**: auth panel, sticky header, search bar, card grid, footer, loader.
- **States**: card hover/spotlight, search clear visibility, no-results panel, auth/app visibility.
- **Responsive**: compact grid and typography on small screens.
- **Accessibility**: labeled PIN input and native controls; limited advanced ARIA.

