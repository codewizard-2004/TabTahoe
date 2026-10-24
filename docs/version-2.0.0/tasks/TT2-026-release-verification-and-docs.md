# TT2-026: Verify and document the version 2.0.0 release

- **Type:** Story
- **Phase:** Release gate
- **Priority:** P0
- **Status:** Todo
- **Owner:** Unassigned
- **Dependencies:** [TT2-001](TT2-001-evaluate-canvas-engine.md), [TT2-002](TT2-002-widget-registry-and-lifecycle.md), [TT2-003](TT2-003-versioned-storage-and-migration.md), [TT2-004](TT2-004-convert-existing-dashboard.md), [TT2-005](TT2-005-glass-shell-and-widget-gallery.md), [TT2-006](TT2-006-edit-mode-and-history.md), [TT2-007](TT2-007-drag-resize-and-collisions.md), [TT2-008](TT2-008-responsive-layouts.md), [TT2-009](TT2-009-keyboard-canvas-accessibility.md), [TT2-010](TT2-010-duration-countdown-timer.md), [TT2-011](TT2-011-timer-background-alerts.md), [TT2-012](TT2-012-spacer-widget.md), [TT2-013](TT2-013-notes-widget.md), [TT2-014](TT2-014-quote-widget.md), [TT2-015](TT2-015-image-viewer-widget.md), [TT2-016](TT2-016-layout-presets-and-reset.md), [TT2-017](TT2-017-layout-export-and-import.md), [TT2-018](TT2-018-appearance-controls.md), [TT2-019](TT2-019-duplicate-lock-and-settings.md), [TT2-020](TT2-020-performance-and-resilience.md)
- **Plan:** [Version 2.0.0 plan](../plan.md)

## User story

As a user upgrading to 2.0.0, I want a tested release with clear instructions and permission changes so that I can customize with confidence.

## Scope and implementation notes

- Run appropriate pure logic and browser checks after implementation; update the test command so new tests are included.
- Verify fresh install, version 1 upgrade, rollback/recovery behavior, and installed-extension browser APIs.
- Review every app-owned surface and capture desktop screenshots, including resized desktop windows under ignored test-results/.
- Update README with canvas editing, widgets, timer alarm limits, local storage, backup scope, dependencies/license, and permissions.
- Update package.json and manifest.json to 2.0.0 together only when preparing the release; review runtime packaging for new modules/assets.

## Acceptance criteria

- [ ] Tasks TT2-001 through TT2-020 are Done or have an explicit, documented scope decision; P0 requirements cannot be silently deferred.
- [ ] Relevant automated checks pass or limitations/failures are recorded with an explicit release decision.
- [ ] Manual coverage includes Customize, weather search/results, shortcuts, groups, calendar tasks including completed items, bookmarks, all new widgets, and timer background behavior.
- [ ] Migration and representative saved layouts survive installed-extension reload/restart without loss of existing data.
- [ ] Permissions and new network services are accurately documented; phase 4 roadmap items do not block release.
- [ ] Release notes state verification performed, known limitations, and any features that require extension installation.

## Verification

Follow the user's current verification instructions. If they opt to test themselves, provide the checklist and record their results; do not run checks against that preference.

## Progress checklist

- [ ] Confirm implementation details and resolve story-specific open questions.
- [ ] Implement the agreed scope.
- [ ] Complete acceptance criteria and appropriate verification.
- [ ] Record evidence, limitations, and relevant documentation changes.
- [ ] Update this story and the central plan to Done.

## Work log

| Date | Update | Evidence / blocker |
| --- | --- | --- |
| 2026-10-24 | Story created; implementation has not started. | Planning only. |
| 2026-10-24 | Applied PC/desktop-only scope clarification; mobile/tablet layouts and touch-specific optimization are excluded. | Documentation only; implementation status unchanged. |

## Completion record

- Implementation / PR: Pending
- Verification evidence: Pending
- Remaining limitations: Pending
