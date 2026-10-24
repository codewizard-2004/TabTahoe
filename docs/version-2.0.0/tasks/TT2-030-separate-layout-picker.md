# TT2-030: Separate layout switching from canvas editing

- **Type:** Story
- **Phase:** Canvas foundation
- **Priority:** P0
- **Status:** In progress
- **Owner:** Unassigned
- **Dependencies:** [TT2-003](TT2-003-versioned-storage-and-migration.md), [TT2-027](TT2-027-unified-customization.md)
- **Plan:** [Version 2.0.0 plan](../plan.md)

## User story

As a user, I want to switch among my saved layouts without first entering canvas customization, so layout selection remains a separate, predictable action.

## Acceptance criteria

- [x] A persistent Change layout button sits beside Customize at the bottom of the page and opens independently of edit mode.
- [x] The chooser shows a small visual preview for every saved layout; selecting a preview loads that layout.
- [x] Each card has separate Edit, Rename, and Delete actions.
- [x] Renaming or deleting another layout preserves an active edit draft; loading a preview or deleting the active layout clearly identifies that the draft will be discarded.
- [x] Save as new layout remains available from the chooser.
- [ ] User reviews the new chooser and its actions in the extension.

## Verification

Implementation review only. Per the user's instruction, no browser test was run; the user will verify the new interaction in the extension.

## Work log

| Date | Update | Evidence / blocker |
| --- | --- | --- |
| 2026-10-24 | Added the separate footer action, SVG layout previews, load-on-preview behavior, and distinct Edit, Rename, and trash actions. Added a dedicated glass rename dialog and retained save-as-copy. | Code review and `git diff --check` only. Browser verification is intentionally left to the user. |

