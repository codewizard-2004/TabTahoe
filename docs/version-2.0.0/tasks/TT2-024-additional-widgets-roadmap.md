# TT2-024: Add a Global Clock widget

- **Type:** Story
- **Phase:** Connected and advanced roadmap
- **Priority:** P2
- **Status:** In progress — Global Clock slice implemented; gallery search added; verification pending
- **Owner:** Unassigned
- **Dependencies:** [TT2-010](TT2-010-duration-countdown-timer.md), [TT2-020](TT2-020-performance-and-resilience.md)
- **Plan:** [Version 2.0.0 plan](../plan.md)

## User story

As a user, I want to see the current time in up to three cities so that I can coordinate across time zones at a glance.

## Scope and implementation notes

- Add an offline Global Clock widget that displays live time and local date for up to three configured IANA time zones.
- Let users choose up to three distinct cities from the Global Clock widget's settings; use the browser's time-zone database without network requests or added permissions.
- Add live text search by widget name, type, or description to the Add widget gallery.
- Defer independent checklist, daily intention, habit tracker, week agenda, and calculator/unit converter for later review.
- Assess Pomodoro focus sessions as an enhancement built on the duration timer, with explicit work/break cycles.
- Treat a date/event countdown as a separate optional widget, not the requested duration timer.
- Record effort, offline capability, content ownership, permissions, accessibility, and expected value for each candidate.

## Acceptance criteria

- [x] Global Clock is the selected small implementable slice, with its own user story and acceptance criteria.
- [ ] Global Clock supports one to three distinct time zones and updates while visible.
- [ ] The Add widget search filters the gallery and reports when there are no matches.
- [ ] Global Clock and gallery search add no network requests or permissions.
- [ ] Existing calendar tasks are reused by an agenda where appropriate rather than silently duplicated.
- [ ] No extra widget is implicitly required to finish the 2.0.0 core release.
- [ ] Pomodoro behavior is clearly distinguished from setting a one-hour alarm.

## Verification

Verify city selection, distinct-zone validation, live time/date changes, gallery filtering, keyboard use, and offline behavior in the installed desktop extension.

## Progress checklist

- [x] Confirm implementation details and resolve story-specific open questions for the Global Clock slice.
- [x] Implement the Global Clock and gallery search.
- [ ] Complete acceptance criteria and appropriate verification.
- [ ] Record evidence, limitations, and relevant documentation changes.
- [ ] Update this story and the central plan to Done.

## Work log

| Date | Update | Evidence / blocker |
| --- | --- | --- |
| 2026-10-24 | Story created; implementation has not started. | Planning only. |
| 2026-10-26 | Promoted the world-clock candidate into an implementable Global Clock slice at the user's direction. Added three configurable time-zone slots and a searchable Add widget gallery; other productivity candidates remain deferred. | Uses the browser's built-in IANA time-zone database and local Intl formatting; no remote requests or permissions. Installed-extension verification remains pending. |

## Completion record

- Implementation / PR: Pending
- Verification evidence: Pending
- Remaining limitations: Pending
