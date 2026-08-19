# Denominations Entry Page Documentation

File documented: `denomination/denominations.html`

## Purpose
Captures daily cash denomination counts, computes totals/derived balances, and saves records.

## Key Functionalities
- Dynamic denomination cards with quantity steppers.
- Live totals: notes, coins, grand total, amount-in-words.
- Derived fields: A/C paid and available balance.
- Previous balance fetch from month sheet and nearest previous row.
- Save/reset flow with edit mode support from report page.
- Built-in calculator modal.

## Workflow
1. Initialize date and denomination cards.
2. Fetch previous balance for selected date.
3. User enters quantities/extra fields.
4. Review totals and save (create/update).
5. Success clears form or returns from edit flow.

## Edge Cases Covered
- Invalid numbers default to `0`.
- Flexible date parsing for multiple formats.
- Previous balance falls back to `sheet2Data` or `0` on errors.
- Future date navigation blocked.
- Submit button disabled during save to prevent duplicates.
- Calculator handles malformed expressions safely.

## UI Documentation
- **Layout**: top action bar, denomination grid, sticky summary/details panel, bottom save bar.
- **States**: masked/unmasked balance, loading overlay, edit vs add mode.
- **Responsive**: desktop split layout and mobile action bar.
- **Accessibility**: native inputs/buttons and clear visual grouping.

