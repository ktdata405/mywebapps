# Cashew Report Page - Functionality, Edge Cases, and UI Documentation

File documented: `cashew/cashewreport.html`

## 1) Page Purpose

`cashewreport.html` is the analytics and management page for Cashew expenses. It provides reporting, insights, scheduled transaction workflows, and export utilities.

## 2) Core Functionalities

### 2.1 Reporting and Filters
- Fetches expense data by month/year or all-time context.
- Provides search and category filtering.
- Displays totals and grouped transaction results.

### 2.2 Transactions View
- Date-grouped transaction list.
- Draft/completed visual markers.
- Quick "edit day" handoff to `cashew.html`.

### 2.3 Insights View
- Category-wise summary cards.
- Relative contribution/progress visualizations.
- Category drilldown modal listing matching transactions.

### 2.4 Scheduled Transactions View
- Upcoming/completed tab behavior.
- Search and status filtering.
- Add scheduled transaction flow.
- Save selected scheduled items into Cashew entries.
- Add single scheduled item into active Cashew workflow.

### 2.5 Export Center
- Export options modal (category/date range/sort).
- Export preview generation.
- Copy export content.
- Download TXT and PDF export outputs.

### 2.6 Utility UX Features
- Pull-to-refresh interaction for mobile.
- Loader overlays for long-running tasks.
- Missed-dates popup for date gap awareness.
- Calculator modal support.

## 3) Typical User Flow

1. Page initializes with month/year and loads report data.
2. User switches between Transactions, Insights, and Scheduled tabs.
3. User filters/searches and reviews details.
4. User optionally edits a day in main Cashew page.
5. User optionally manages scheduled transactions.
6. User exports report output as needed.

## 4) Edge Cases Covered (Page + JS)

### 4.1 Date/Data Parsing Reliability
- Supports multiple date format fallbacks while grouping/filtering data.
- Handles malformed date rows without breaking full render.

### 4.2 Empty and No-Match States
- Explicit no-data messages for:
  - Transactions list
  - Scheduled list
  - Export preview
  - Missed dates results

### 4.3 Scheduled Logic Safety
- Computes completion differently for repeating vs non-repeating schedules.
- Prunes stale selected keys after refresh/filter changes.
- Requires upcoming-tab context and non-empty selection for save-selected flow.

### 4.4 Validation Guards
- Scheduled add blocks when required date/amount fields are invalid.
- Save-selected blocks when no selectable rows are available.

### 4.5 Export Robustness
- Blocks export when no data is available.
- Guards for PDF library availability before PDF generation.
- Sanitizes filename and handles no-preview/no-export cases safely.

### 4.6 Mobile Interaction Guard
- Pull-to-refresh only triggers at top scroll + threshold to avoid accidental refresh.

## 5) UI Documentation

### 5.1 Layout Structure
- Sticky header and dashboard-style body.
- Desktop bento-like two-column structure:
  - Left: filters and summary cards.
  - Right: tabbed content views.
- Responsive collapse to mobile-friendly single-column layout.

### 5.2 Major UI Sections
- Filters and period controls.
- KPI summary cards.
- Tab container:
  - Transactions
  - Insights
  - Scheduled
- Modal components:
  - Export options
  - Export preview
  - Category transactions
  - Scheduled add form
  - Missed dates
- Loader overlays.

### 5.3 Visual States and Indicators
- Active tab highlighting.
- Draft/status badges for transaction groups.
- Scheduled status styles for upcoming/completed states.
- Selected-count badge for bulk scheduled actions.
- No-data cards and inline helper texts.

### 5.4 Responsive Behavior
- Mobile spacing and control stacking.
- Floating action button behavior for quick add on small screens.
- Pull-to-refresh indicator and threshold behavior.
- Modal/dialog scaling for narrow viewports.

### 5.5 Feedback Patterns
- Contextual success/error/info alerts through shared UI utility.
- Loader text/states during fetch/save/export operations.
- Preview-first pattern before final export/download.

### 5.6 Accessibility Notes
Current support:
- Native controls used broadly.
- Some ARIA labels on settings/scheduled controls.
- `Escape` close behavior for modal interactions.

Potential improvements:
- Expand ARIA live announcements for dynamic list updates.
- Improve keyboard-first navigation hints for tab and modal controls.

