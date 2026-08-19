# Wallet Report Page Documentation

File documented: `wallet/walletreport.html`

## Purpose
Lists and manages wallet records with filtering, masking, copying, and delete operations.

## Key Functionalities
- Fetches and normalizes wallet entries from backend.
- Filters by owner/type/status and free-text search.
- Sort options and result count updates.
- Cards/table view toggle.
- Sensitive value masking toggle.
- Copy summary action and delete action.
- Stats panel (totals, owners, expiring soon, type counts).

## Workflow
1. Initialize and fetch wallet data.
2. Populate owner filters and render list.
3. User applies filters/sort/search.
4. User copies entry data or deletes rows.
5. Refresh and re-render stats.

## Edge Cases Covered
- Invalid script URL and malformed API response handling.
- 401/403 permission error messaging.
- Empty filtered result state.
- Clipboard API fallback when unavailable.
- Delete blocked for missing IDs.
- Expiry/date parse fallbacks for malformed data.
- HTML escaping protects rendered text from injection.

## UI Documentation
- **Layout**: controls panel, stats cards, cards/table containers.
- **States**: masked/unmasked values, active filters, empty/error state.
- **Responsive**: control stacking and list/card adaptation on mobile.
- **Accessibility**: native controls with icon buttons and status badges.

