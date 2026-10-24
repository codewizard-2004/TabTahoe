# TT2-020: Keep large canvases responsive and recoverable

- **Type:** Story
- **Phase:** Customization polish
- **Priority:** P0
- **Status:** Todo
- **Owner:** Unassigned
- **Dependencies:** [TT2-009](TT2-009-keyboard-canvas-accessibility.md), [TT2-011](TT2-011-timer-background-alerts.md), [TT2-015](TT2-015-image-viewer-widget.md), [TT2-019](TT2-019-duplicate-lock-and-settings.md)
- **Plan:** [Version 2.0.0 plan](../plan.md)

## User story

As a user, I want my new tab to open quickly and remain stable even with several widgets.

## Scope and implementation notes

- Measure initial render and interactions against the existing dashboard on a recorded reference device.
- Share weather/provider requests, pause unnecessary visual updates in hidden documents, and clean up removed instances.
- Debounce storage writes and avoid remounting content during dragging/resizing.
- Define supported widget count/dimension limits using measured behavior.
- Exercise storage failures, corrupt entries, interrupted loading, and missing assets with localized recovery.

## Acceptance criteria

- [ ] A recorded representative canvas and larger stress canvas have reproducible timings and agreed budgets.
- [ ] Dragging/resizing does not lose note focus or recreate timers and media integrations unnecessarily.
- [ ] Repeated add/remove operations do not accumulate observers, timers, listeners, or object URLs.
- [ ] Network failures and individual widget errors do not block canvas editing or other widgets.
- [ ] Performance limits and known constraints are documented rather than inferred from one empty layout.

## Verification

Profile representative layouts, compare initial load, inspect repeated mount/unmount, and simulate offline/storage failure. Broaden checks only for unresolved issues.

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

## Completion record

- Implementation / PR: Pending
- Verification evidence: Pending
- Remaining limitations: Pending
