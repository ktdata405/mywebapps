# Cashew Import Page - Functionality Documentation

File documented: `cashew/cashewimport.html`

This document explains each user-facing and processing functionality implemented on the Cashew Import page.

## 1) Purpose

The page imports transaction data from spreadsheets, lets users review and edit entries by date, and saves transformed expense data into the Cashew Google Sheet backend.

## 2) Header and Navigation

### 2.1 Install App
- Shows an **Install App** button only when browser emits the `beforeinstallprompt` event.
- Clicking triggers PWA install prompt.

### 2.2 Navigation Links
- **Report** -> `cashewreport.html`
- **Cashew** -> `cashew.html`
- **Home** -> `../index.html`
- **Google Sheet** -> opens configured sheet URL in a new tab.

### 2.3 Current Page Indicator
- Displays **Import** as the active section label.

## 3) Import Entry (File Upload)

### 3.1 Accepted Formats
- `.xlsx`
- `.xls`
- `.csv`

### 3.2 Upload Methods
- Click upload area to choose a file.
- Drag-and-drop file into upload zone.

### 3.3 Import Instructions to User
- Date column
- Amount (debit) column
- Remarks column
- Tags column

## 4) File Parsing and Row Construction

### 4.1 Multi-Sheet Parsing
- Reads all sheets from workbook and combines valid records.

### 4.2 Flexible Header Detection
Supports alias matching for:
- Date
- Amount/debit/credit
- Remarks/details/description
- Tags

### 4.3 Skip Rules
Rows are skipped when:
- Tag is exactly `self`
- Date is invalid
- Amount missing or invalid
- Amount <= 0

### 4.4 Incoming/Received Identification
Rows are flagged for incoming detection based on terms like:
- `received`
- `credit`
- `incoming`
(and related CTT/self-transfer patterns)

## 5) Workspace Layout After Import

### 5.1 Date Sidebar
For each date, sidebar shows:
- Date label
- Number of rows
- Date total
- Checkbox for batch save selection

### 5.2 Sidebar Status Badges
Dates can show state indicators:
- **Sunday**
- **Saved**
- **Failed**

### 5.3 Totals Display
- Per-date total in selected date header
- Grand total across all dates in sidebar summary

## 6) Toolbar Functionalities

### 6.1 New File
- Clears current imported data and returns to upload stage.

### 6.2 Club Category
- For selected date, merges rows with same category.
- Combined row keeps summed amount and merged text details.

### 6.3 Remove Incoming
- Removes incoming/received/CTT-like rows across all dates.
- Re-renders counts and totals.

### 6.4 Add Row
- Adds a new manual row to currently selected date.

### 6.5 Save Date
- Validates current date rows and saves only that date.

### 6.6 Save Checked
- Saves only sidebar dates selected by checkbox.

### 6.7 Save All
- Validates and saves all available dates.

## 7) Row-Level Editing

Each transaction row supports:
- **Category** select
- **Transaction Details** text input
- **Amount** numeric input
- **Remark - Amount** text input

### 7.1 Row Actions
- **Duplicate** row
- **Split** row amount into two rows
- **Delete** row

### 7.2 Tag Note Display
- Shows special note badge for `self transfer`/`ctt` tags.

## 8) Auto Behaviors During Editing

### 8.1 Apply Date Category
- Changing date-level category applies category to all rows of selected date.
- Automatically reclubs duplicate categories afterward.

### 8.2 Remark Amount Parsing
- If remark contains suffix amount (example: `Groceries-850`), amount is auto-updated.

### 8.3 Live Totals Refresh
- Sidebar counts and totals update instantly after edits.

## 9) Validation Before Save

For each row, the following are required:
- Category selected (not empty and not placeholder)
- Amount > 0
- Remark present

On validation failure:
- Invalid inputs are highlighted.
- Error message summarizes issue counts.
- Save is blocked until corrected.

## 10) Save and Backend Sync

### 10.1 Payload Preparation
- Rows are grouped/merged by category per date.
- Request payload includes fields such as:
  - `type: cashew`
  - `expenses`
  - `total`
  - `isEdit`
  - `action: update`
  - `originalDate`

### 10.2 API Endpoint
- POST request is sent to `CONFIG.GOOGLE_SHEET_URL_CASHEW`.
- Uses `fetch(..., { mode: 'no-cors' })`.

### 10.3 Save Status Tracking
- Successful date saves are marked **Saved**.
- Date that fails during save is marked **Failed**.

## 11) Loader and Progress Feedback

- Loader appears while reading files and during save operations.
- Loader message text changes to indicate current stage.
- Loader is hidden after completion or error.

## 12) Error Handling

- Import parse errors trigger user alerts.
- Save exceptions update date failure state and show error feedback.
- Invalid file structure can be caught during processing and reported.

## 13) Functional Workflow Summary

1. User uploads spreadsheet file.
2. System parses sheets and creates normalized date-wise rows.
3. User reviews and edits entries by date.
4. User runs optional cleanup (club, remove incoming, add row).
5. System validates rows.
6. User saves selected/all dates to Google Sheet backend.
7. Sidebar status reflects saved/failed outcomes.

## 14) Edge Cases Covered (HTML + JavaScript)

### 14.1 Validation and Data Integrity
- Save is blocked if no date is selected for actions that require current date context.
- Row validation prevents save when category is empty/placeholder, amount is invalid/non-positive, or remark is blank.
- Split operation is guarded and does not run for invalid or zero amounts.
- Invalid rows are visually highlighted and error state clears when user fixes fields.

### 14.2 Header, Date, and Amount Parsing Variations
- Header normalization handles alias names and loosely matched column labels.
- Date parsing supports Date objects, Excel serial dates, `dd/mm/yyyy`, `dd-mm-yyyy`, and JS date fallback.
- Amount parsing handles currency symbols/commas and mixed debit-credit schemas.
- Balance-like columns are ignored to avoid false amount extraction.

### 14.3 Import Row Filtering
- Rows tagged exactly `self` are skipped.
- Rows with invalid date or invalid/non-positive amount are skipped and counted.
- Incoming/received/credit/CTT-like rows can be removed in one cleanup action.

### 14.4 Safe Editing and UI Consistency
- Drag-and-drop silently ignores invalid file payloads (no crash path).
- Duplicate/split/delete actions check row existence before applying changes.
- Checked-date selections are automatically pruned if those dates are removed from dataset.
- Empty-date and empty-import states render explicit "No data" UX.

### 14.5 Save Flow Robustness
- Save All / Save Checked are blocked when dataset is empty or nothing is selected.
- Bulk saves are prevalidated; first invalid date is surfaced and save is aborted before partial corruption.
- On save failure, the in-progress date is marked Failed and loader is dismissed safely.
- On success, failed markers are cleared and saved state is reflected in sidebar.

### 14.6 File/Workbook Failure Handling
- Workbook with zero sheets triggers explicit import error.
- Workbook with no valid rows after parsing shows skip-count based alert.
- File read and parse exceptions are caught; loader hides and readable error feedback is shown.

### 14.7 Security and Compatibility Safeguards
- Special tag-note text escapes `<` and `>` before rendering to avoid HTML injection in note badges.
- PWA install UI is only shown when install prompt API is available.
- Standalone/PWA launch path sets session auth continuity for app navigation.
- Mobile-safe meta tags and responsive dual layouts (desktop table + mobile card view) preserve usability.

## 15) UI Documentation

### 15.1 UI Architecture (Two-Phase Flow)
- The page has two mutually exclusive UI phases:
  1. **Upload Phase** (`#upload-section`) for file selection/import.
  2. **Preview/Edit Phase** (`#preview-section`) for date-wise review and save.
- Flow transitions from upload to preview only after successful parse.

### 15.2 Header UI
- Sticky top header with:
  - Product identity (`Cashew`, `Import Excel`).
  - PWA **Install App** button (conditional visibility).
  - Quick navigation buttons (Report, Cashew, Home, Google Sheet).
  - Active page marker (**Import**).
- Header buttons use icon + hover styles and tooltips (`title` attributes).

### 15.3 Upload Section UI
- Large drag-and-drop area (`#drop-zone`) with dashed border and import icon.
- Hidden file input (`#file-input`) triggered by click on drop zone.
- Accepted formats presented visually and through input `accept` filter.
- "Expected Columns" helper card guides file schema before upload.

### 15.4 Preview Section UI
- Action toolbar at top with grouped actions:
  - Reset/New, cleanup actions, manual add, and save actions.
- Main workspace split:
  - **Left panel**: date list + per-date totals + checkboxes.
  - **Right panel**: selected-date transactions editor.
- Loader overlay appears for long-running operations.

### 15.5 Date Sidebar UI States
Each date row can appear as:
- **Active** (currently selected date)
- **Sunday** (special calendar indicator)
- **Saved** (successful backend sync)
- **Failed** (save failure marker)

Additional date row UI elements:
- Per-date checkbox for Save Checked flow.
- Row count and date total.
- Status icon/badge changes by state.

### 15.6 Transaction Editor UI
For each transaction row:
- Category dropdown.
- Transaction details input.
- Amount input.
- Remark input.
- Row action buttons: Duplicate, Split, Delete.

Field semantics:
- Amount visually emphasized with money-color style.
- Remark and details use distinct color tokens for readability.
- Field-level errors render inline styles + message text.

### 15.7 Responsive UI Behavior
- Toolbar labels shorten on small screens (`sm`/`md` class switches).
- Desktop uses tabular editor view.
- Mobile switches to stacked card editor view.
- Date list is horizontally scrollable on mobile and vertical on desktop.
- Upload hints/grid collapse gracefully for narrow screens.

### 15.8 Visual Language and Design System
- Dark glassmorphism base with custom theme tokens.
- Semantic action color variants:
  - Red for destructive/filter removal.
  - Green for primary final save.
  - Violet for targeted save actions.
  - Sky/amber/slate for utility actions.
- Date and money indicators use explicit color coding to improve scanning.
- Animated accents (example: Sunday pulse indicator) communicate status.

### 15.9 User Feedback Patterns
- Long operations: full-screen loader with changing progress text.
- User notifications: centralized through `KTui.alert(...)`.
  - Underlying notification style is configurable via `localStorage.notificationStyle`.
  - Supports toast/popup style depending on user setting.
- Validation/success/error messages are contextual to current action.

### 15.10 Empty and Recovery States
- If no data exists after filters/removals, explicit empty-state messaging is shown.
- If selected date has no rows, detail pane shows a no-data message.
- After failures, UI marks failed date and keeps user in editable context for recovery.

### 15.11 Accessibility Notes (Current + Improvement Opportunities)
Current support:
- Language/meta viewport setup for mobile and PWA contexts.
- Native form controls for most interactions.
- `aria-label` used on date selection checkboxes.
- `title` tooltips on many icon-only buttons.

Potential improvements:
- Add keyboard activation and ARIA role to drag-and-drop clickable zone.
- Add `aria-invalid`/live regions for validation messaging.
- Add explicit label association for hidden file input trigger flow.
