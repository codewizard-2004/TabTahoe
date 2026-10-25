# TT2-010: Add a duration countdown timer with an alarm

- **Type:** Story
- **Phase:** Offline widgets
- **Priority:** P0
- **Status:** In progress — implementation added; verification pending
- **Owner:** Unassigned
- **Dependencies:** [TT2-002](TT2-002-widget-registry-and-lifecycle.md), [TT2-003](TT2-003-versioned-storage-and-migration.md), [TT2-005](TT2-005-glass-shell-and-widget-gallery.md)
- **Plan:** [Version 2.0.0 plan](../plan.md)

## User story

As a user studying or working, I want to set a duration such as one hour and hear an alarm when it finishes so that I can concentrate without watching the clock.

## Scope and implementation notes

- Provide hours/minutes/seconds entry, convenient presets, title, start, pause, resume, reset, dismiss, and run-again actions.
- Center glass presets and hide them while the timer is active or complete. Keep all sound and notification preferences in widget settings.
- Offer selected local alarm tones or a locally stored uploaded sound, volume and mute controls, plus optional 90%/95% progress notifications and a desktop notification toggle for progress and completion.
- Represent running state with an end timestamp; represent paused state with remaining duration.
- Persist and synchronize state by timer instance; calculate remaining time after reload or tab suspension.
- Provide a visible completed state, several locally synthesized sound patterns, optional uploaded sound, mute/volume preferences, and an explicit sound test.
- Separate the simple timer from future Pomodoro sessions and date/event countdowns.

## Acceptance criteria

- [ ] A one-hour duration starts at 01:00:00 and counts down correctly without relying on interval counts as elapsed time.
- [ ] Pause/resume/reset and reopening the dashboard preserve the intended state.
- [ ] Zero, negative, malformed, and out-of-range durations are handled with accessible validation.
- [ ] Completion presents an alarm state and plays sound when permitted; blocked audio produces visible guidance.
- [ ] Optional 90%/95% progress and completion alerts appear as browser notifications when enabled and permission is granted.
- [ ] Multiple instances operate independently and opening multiple dashboard tabs does not multiply the completion alarm.
- [ ] Alarm ownership and missed completion behavior integrate with task TT2-011.

## Verification

Use controlled time for duration math, pause/resume, expiration, restored timers, and duplicate completion. Manually verify sound after a user starts a timer.

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
| 2026-10-25 | Added per-instance persisted deadline/paused state, presets, pause/resume/reset/dismiss/run-again, synthesized test/completion sound, mute/volume settings, and visible validation. | Code added; controlled-time and multi-tab sound ownership checks remain pending. |
| 2026-10-25 | Applied timer settings correction: presets are centered glass controls and hidden during/after a run; settings now contain built-in/uploaded sound choice, upload/test, volume/mute, optional desktop notification permission, and configurable 90%/95% progress notification. | Code and browser alarm milestone scheduling added; installed extension verification remains pending. |
| 2026-10-25 | Clarified desktop notification setting as the actual progress and completion notifications; permission is requested when settings are saved with notifications enabled. | Browser alarm service worker emits native extension notifications; installed extension permission and delivery review remains pending. |

## Completion record

- Implementation / PR: Pending
- Verification evidence: Pending
- Remaining limitations: Pending
