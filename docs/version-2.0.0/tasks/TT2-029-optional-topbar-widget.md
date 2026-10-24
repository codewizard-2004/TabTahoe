# TT2-029: Make the dashboard top bar an optional widget

- **Type:** Story
- **Phase:** Canvas foundation
- **Priority:** P0
- **Status:** Done
- **Owner:** Unassigned
- **Dependencies:** [TT2-002](TT2-002-widget-registry-and-lifecycle.md), [TT2-004](TT2-004-convert-existing-dashboard.md), [TT2-027](TT2-027-unified-customization.md)
- **Plan:** [Version 2.0.0 plan](../plan.md)

## User story

As a user, I want to customize, move, resize, or remove the dashboard top bar like any other widget.

## Acceptance criteria

- [x] The top bar is a registered canvas widget with editable title, tagline, and date visibility.
- [x] New layouts created from version 1 data include the familiar top bar by default.
- [x] The top bar can be added from the gallery, moved, resized, locked, duplicated, or removed through common canvas controls.
- [x] The bottom Customize entry point remains available when every canvas widget, including the top bar, is removed.

## Verification

Headless Brave confirmed the top bar appears after clean migration and in the installed extension, uses the shared widget shell, and the Customize entry point remains outside the canvas.

## Work log

| Date | Update | Evidence / blocker |
| --- | --- | --- |
| 2026-10-24 | Converted the fixed header into a `topbar` widget and added it to gallery and version 1 workspace migration. Added per-instance title, tagline, and date settings. | Preview and installed MV3 startup passed with the migrated top bar; Brave changed its title/date settings and canceled the draft. Common widget edit controls provide move/resize/lock/duplicate/remove actions. |

