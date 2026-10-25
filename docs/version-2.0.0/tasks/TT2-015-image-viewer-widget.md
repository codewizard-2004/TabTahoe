# TT2-015: Add a local image viewer widget

- **Type:** Story
- **Phase:** Offline widgets
- **Priority:** P1
- **Status:** In progress — implementation added; verification pending
- **Owner:** Unassigned
- **Dependencies:** [TT2-002](TT2-002-widget-registry-and-lifecycle.md), [TT2-003](TT2-003-versioned-storage-and-migration.md), [TT2-005](TT2-005-glass-shell-and-widget-gallery.md)
- **Plan:** [Version 2.0.0 plan](../plan.md)

## User story

As a user, I want to place a personal image on my canvas so that the dashboard feels like my space.

## Scope and implementation notes

- Support local image selection with validated formats, file-size/dimension limits, and decode errors.
- Store image blobs in IndexedDB and stable per-widget carousel references in local content storage; manage the list in widget settings.
- Provide a multi-image carousel with add/remove management in widget settings, contain/cover, and a configurable rotation interval.
- Show carousel position with dots and keep image names off the displayed photo.
- Define asset reference counting and cleanup across draft edits, undo, duplicates, and committed deletions.

## Acceptance criteria

- [ ] Images remain local and display after reload without needing the original file.
- [ ] Multiple images can be added/removed in widget settings and rotate on the selected interval.
- [ ] Carousel position uses accessible dots; image filenames are not displayed over the photo.
- [ ] Supported fit modes preserve the chosen presentation across resizing.
- [ ] Invalid files and storage quota failures leave existing content recoverable.
- [ ] Removing or canceling a draft does not delete an asset still referenced by another widget or undo entry.
- [ ] Object URLs and unused assets are cleaned up safely; images have accessible descriptions.

## Verification

Verify large/invalid uploads, missing assets, duplicate/delete/undo, offline reload, quota failure, and image replacement.

## Progress checklist

- [ ] Confirm implementation details and resolve story-specific open questions.
- [x] Implement the agreed scope.
- [ ] Complete acceptance criteria and appropriate verification.
- [ ] Record evidence, limitations, and relevant documentation changes.
- [ ] Update this story and the central plan to Done.

## Work log

| Date | Update | Evidence / blocker |
| --- | --- | --- |
| 2026-10-24 | Story created; implementation has not started. | Planning only. |
| 2026-10-25 | Expanded the single-image view into a local multi-image carousel. Added add/remove management and rotation/fit settings in the widget settings dialog; files remain validated and stored in IndexedDB. | Code added; verify carousel rotation, invalid files, quota errors, duplicates, undo, and reload in the browser. |
| 2026-10-25 | Removed visible image filenames and count text; added accessible clickable position dots. | Code added; visual review remains pending. |

## Completion record

- Implementation / PR: Pending
- Verification evidence: Pending
- Remaining limitations: Pending
