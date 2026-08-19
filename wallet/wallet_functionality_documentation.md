# Wallet Entry Page Documentation

File documented: `wallet/wallet.html`

## Purpose
Captures wallet vault entries for bank credentials, IDs, and cards.

## Key Functionalities
- Owner selection before save.
- Entry-type chips to switch among Bank/ID/Card forms.
- Form-specific payload creation.
- Save via Apps Script query action (`addWalletEntry`).
- KTui-based feedback with fallback notification path.

## Workflow
1. User selects owner.
2. User selects entry type and fills required fields.
3. Submit validates and sends payload.
4. Success shows message and resets active form.

## Edge Cases Covered
- Invalid/missing script URL blocked.
- 401/403 permission errors surfaced with clear message.
- Required-field guards in HTML + JS.
- Request/parse failures handled via try/catch.
- Fallback notification path if KTui toast is unavailable.

## UI Documentation
- **Layout**: header shortcuts, owner selector, type chips, form cards, footer.
- **States**: active type chip/form, submit feedback state.
- **Responsive**: stacked card layout for small screens.
- **Accessibility**: labeled fields and native form elements.

