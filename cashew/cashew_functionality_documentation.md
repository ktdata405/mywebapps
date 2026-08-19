# Cashew Main Page - Functionality, Edge Cases, and UI Documentation

File documented: `cashew/cashew.html`

## 1) Page Purpose

`cashew.html` is the primary daily expense entry page for Cashew. It supports creating, editing, importing, and saving day-wise expenses.

## 2) Core Functionalities

### 2.1 Date-Based Data Loading
- Loads records for selected date and relevant month sheet.
- Supports previous/next day navigation and direct date selection.
- Integrates with report-page edit handoff through local storage.

### 2.2 Expense Entry and Editing
- Dynamic row-based expense input with fields:
  - Category
  - Description/Details
  - Amount
- Add row/remove row actions.
- Real-time total amount calculation.

### 2.3 Save Workflows
- Save as **Draft** or **Completed**.
- Supports update mode when editing an existing day.
- Sends structured payload to Google Apps Script endpoint.

### 2.4 Import Preview Workflow (Inline Modal)
- Upload `.xlsx/.xls/.csv`.
- Parses workbook and groups entries by date.
- Preview, search, sort, and filter imported rows before applying.
- Import selected date rows into current expense editor.

### 2.5 Calendar and Month View
- Calendar-style date picker with data indicators.
- Highlights days with available records.
- Supports quick month/date context switching.

### 2.6 Utility Features
- Built-in calculator modal for quick arithmetic.
- PWA support and install prompt handling.
- Service worker registration.

## 3) Typical User Flow

1. User opens page and current date data is loaded.
2. User navigates to desired date.
3. User enters or edits rows and verifies total.
4. Optional: imports from file through import modal.
5. User saves as Draft/Completed.
6. UI updates save state and date status.

## 4) Edge Cases Covered (Page + JS)

### 4.1 Date and Navigation Guards
- Prevents navigation into future dates.
- Handles mixed date formats with robust parsing fallback.
- If no backend data exists, seeds default base categories.

### 4.2 Row Editing Safety
- If only one row remains, delete clears it instead of removing full structure.
- Total recalculation handles empty/non-numeric values safely.

### 4.3 Save Validation
- Blocks save when no valid expense rows exist.
- In edit mode, validates required original-date reference before update.
- Handles save failure with user-visible error state/alerts.

### 4.4 Import Parsing Resilience
- Handles alias column names and mixed header styles.
- Parses Excel serial dates and formatted strings.
- Handles currency symbols, commas, and accounting-negative amount formats.
- Skips invalid date/amount rows and self-transfer style rows.
- Handles empty workbook/no valid rows/file-read/parse exceptions.

### 4.5 Calculator Input Safety
- Prevents invalid leading operators.
- Trims trailing operators before evaluation.
- Handles malformed expression evaluation errors safely.

## 5) UI Documentation

### 5.1 Layout Structure
- Sticky top header with branding and actions.
- Two-column main content:
  - Date controls/calendar area
  - Expense row editor area
- Fixed bottom action bar for primary save actions.

### 5.2 Major UI Sections
- Header and quick actions.
- Date navigator + month accordion calendar.
- Expense rows container.
- Import preview modal.
- Calculator modal.
- Loader overlay.

### 5.3 Visual States and Indicators
- Save status badge states (checking/saved/no data).
- Calendar day markers for data presence.
- Button visual states for loading/success/error feedback.
- Import empty-state messaging.

### 5.4 Responsive Behavior
- Mobile-optimized bottom action buttons.
- Calendar/accordion collapses cleanly on small screens.
- Modal layouts adapt to narrow viewport widths.

### 5.5 Accessibility Notes
Current support:
- Native inputs/buttons for main interactions.
- Keyboard handling for calculator.
- Focus targeting for modal interactions.

Potential improvements:
- Add broader ARIA annotations for status updates.
- Improve keyboard traversal hints for modal table actions.

