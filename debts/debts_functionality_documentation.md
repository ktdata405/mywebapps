# Debts Entry Page Documentation

File documented: `debts/debts.html`

## Purpose
Create or edit debt records (given/taken) and save them to backend storage.

## Key Functionalities
- Entry form for type, person, amount, date, remarks.
- Amount formatting in Indian style during input.
- Add mode and edit mode (`?id=`) with prefill.
- Save through Apps Script actions: add or update.
- Loader + KTui feedback + clear/reset.

## Workflow
1. Initialize today date.
2. If `id` exists, fetch and prefill record.
3. User edits fields and submits.
4. Validate amount and save via API.
5. On success: reset or redirect based on mode.

## Edge Cases Covered
- Invalid/missing script URL handling.
- Edit ID not found falls back safely to add mode.
- Invalid or negative amount blocks submit.
- Date parsing supports multiple formats.
- API/network failures show user-facing error alerts.

## UI Documentation
- **Layout**: sticky header, single form card, action buttons, loader overlay.
- **States**: add vs edit visual state, submit loading, validation messages.
- **Responsive**: mobile-safe form spacing and control sizing.
- **Accessibility**: labeled fields and native controls.

