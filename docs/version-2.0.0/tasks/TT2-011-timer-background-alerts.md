# TT2-011: Support timer completion when the dashboard is closed

- **Type:** Story
- **Phase:** Offline widgets
- **Priority:** P0
- **Status:** Todo
- **Owner:** Unassigned
- **Dependencies:** [TT2-010](TT2-010-duration-countdown-timer.md)
- **Plan:** [Version 2.0.0 plan](../plan.md)

## User story

As a user, I want a timer alert even after closing the dashboard so that the alarm remains useful while I study in another tab.

## Scope and implementation notes

- Design a Manifest V3 service worker using persisted deadlines and chrome.alarms for completion scheduling.
- Provide optional desktop notifications with a permission flow initiated from timer settings.
- Coordinate completion ownership between dashboard tabs and the worker to avoid duplicate sound and notifications.
- Reconcile alarms at startup, resume, and timer mutations; define missed completion behavior.
- Keep sound available in an open dashboard; investigate an offscreen audio document only if sound with all dashboards closed is required.

## Acceptance criteria

- [ ] With notification permission granted and the browser running, a timer can notify after all dashboard tabs close.
- [ ] Denied notification permission leaves the timer usable and clearly explains the available in-page alarm behavior.
- [ ] Pause/reset/removal cancel scheduled work and editing a timer updates its scheduled deadline.
- [ ] Browser restart and device sleep reconcile persisted deadlines without replaying an unbounded backlog.
- [ ] The UI and README explain that browser alarms are not exact real-time scheduling and cannot sound while the browser/device is shut down.
- [ ] Sound with every dashboard closed is not claimed unless an offscreen implementation is included and verified.
- [ ] Required alarms permission and optional notifications permission are documented; no unrelated access is added.

## Verification

Verify in an installed extension with multiple new tabs, all dashboard tabs closed, permission denied/granted, browser restart, and sleep/resume. Consult current official APIs before implementation.

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
