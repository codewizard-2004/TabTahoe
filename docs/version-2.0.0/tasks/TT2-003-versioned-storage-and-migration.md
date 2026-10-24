# TT2-003: Persist versioned canvas layouts and migrate version 1 data

- **Type:** Story
- **Phase:** Canvas foundation
- **Priority:** P0
- **Status:** Done
- **Owner:** Unassigned
- **Dependencies:** [TT2-002](TT2-002-widget-registry-and-lifecycle.md)
- **Plan:** [Version 2.0.0 plan](../plan.md)

## User story

As an existing user, I want my dashboard and data preserved when upgrading so that customization does not cost me my saved setup.

## Scope and implementation notes

- Define versioned canvas documents, per-instance settings, and separately owned content records.
- Migrate enabled version 1 widgets, favourites, search, greeting, appearance, and background preferences into a familiar default layout.
- Preserve calendar task keys, bookmark references, uploaded wallpaper, shortcut IDs, and nested groups.
- Validate bounds, IDs, types, and settings on load; preserve a recoverable original before committing migration.
- Specify cross-tab conflict handling and separate high-frequency content saves from layout writes.

## Acceptance criteria

- [x] Migration is idempotent and only completes after the new document has been successfully saved.
- [x] Missing, malformed, unknown-version, and unknown-widget data lead to a recoverable state without overwriting the original.
- [x] Removing a widget does not delete shared calendar tasks or browser bookmarks.
- [x] Extension storage and web-preview fallback both support persistence and reload.
- [x] Concurrent dashboard tabs follow a documented conflict policy and do not silently discard an active editing draft.

## Verification

Add meaningful fixtures for clean install, representative version 1 data, rerun migration, interrupted write, invalid input, and concurrent changes.

## Progress checklist

- [x] Confirm implementation details and resolve story-specific open questions.
- [x] Implement the agreed scope.
- [x] Complete acceptance criteria and appropriate verification.
- [x] Record evidence, limitations, and relevant documentation changes.
- [x] Update this story and the central plan to Done.

## Work log

| Date | Update | Evidence / blocker |
| --- | --- | --- |
| 2026-10-24 | Story created; implementation has not started. | Planning only. |
| 2026-10-24 | Implemented schema-v2 named layouts, version-1 migration and backup, collection ownership, separate task content, extension/preview backends, validation/recovery, and revision conflicts. | The last complete `npm run test:browser` run passed preview and installed-extension migration, persistence/reload, named save/load/rename/appearance, shared task/bookmark retention, invalid-data recovery, and two-tab conflict scenarios. `npm test` passed 23 tests. |

## Completion record

- Implementation / PR: `storage/browser.js`, `storage/workspace.js`, `storage/content.js`, and appearance/layout orchestration in `app.js` and `ui/appearance.js`.
- Verification evidence: `node --test tests/core.test.js tests/canvas.test.js tests/workspace.test.js` (23 passing); `npm run test:browser` (preview and installed MV3 passed). Current shell lacks Node/npm, so these results are from the preceding full run before the additional TT2-004 sound-test edit.
- Remaining limitations: Named layouts are profile-local with no export/import or cloud sync; image records are retained when referenced by saved layouts and may eventually need orphan cleanup.
