# Scan Workspace Page Documentation

File documented: `scan/scan.html` (+ `scan/scan.js`)

## Purpose
Scanner workspace for capturing images, browsing document folders/files, and uploading scans.

## Key Functionalities
- Three modules: Camera, Browse, Upload.
- Camera capture flow with capture counter and finish-scan handoff.
- Browse mode with folder navigation and file/folder actions.
- Upload mode with drag-drop/file picker and backend upload.
- Recent activity panel and refresh path.

## Workflow
1. Initialize page and bind handlers.
2. Try camera access; fallback if unavailable.
3. Capture images and move to upload preview.
4. Upload files to backend.
5. Refresh browse list and continue management actions.

## Edge Cases Covered
- Missing `CONFIG` guard.
- Camera permission/device failure fallback.
- Finish-scan blocked when no captures exist.
- Empty file list ignored safely.
- Folder name validation (no empty/invalid slash names).
- Move/rename/delete actions include validation and rollback-safe refresh paths.
- Locked files cannot be moved.

## UI Documentation
- **Layout**: sidebar navigation, center module workspace, optional activity sidebar, global overlays.
- **States**: active module, upload preview state, flash/loader overlays.
- **Responsive**: module layout adapts to mobile with touch-friendly actions.
- **Accessibility**: icon-heavy controls; keyboard/ARIA coverage is partial.

