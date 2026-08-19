# Loan Entry Page Documentation

File documented: `loan/loan.html` (+ `loan/script.js`)

## Purpose
Captures loan transactions (given/taken) and submits new/update loan records.

## Key Functionalities
- Form fields for borrower details, amount, interest, tenure, status, remarks.
- Amount formatting and amount-in-words conversion.
- Submit flow integrated through `script.js` with add/update actions.
- Edit prefill support using `localStorage.loanEditData`.
- Service worker registration.

## Workflow
1. User fills loan form.
2. Amount field auto-formats and shows words.
3. Submit normalizes payload and posts to backend.
4. Success shows feedback and resets/redirects as configured.

## Edge Cases Covered
- Non-numeric amount cleanup.
- Safe fallback for invalid numeric parses.
- Edit-prefill guards on malformed date/tenure values.
- Submit button disabled during async call and restored in `finally`.
- API/network errors surfaced in message area.

## UI Documentation
- **Layout**: glass card form with iconized inputs and top navigation.
- **States**: add/update mode, submit loading, success/error message state.
- **Responsive**: two-column desktop fields collapse to one column on mobile.
- **Accessibility**: labeled required fields and native controls.

