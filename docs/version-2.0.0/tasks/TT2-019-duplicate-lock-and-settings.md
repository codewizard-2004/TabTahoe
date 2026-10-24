# TT2-019: Polish widget duplication, locking, and settings

- **Type:** Story
- **Phase:** Customization polish
- **Priority:** P1
- **Status:** Todo
- **Owner:** Unassigned
- **Dependencies:** [TT2-006](TT2-006-edit-mode-and-history.md), [TT2-010](TT2-010-duration-countdown-timer.md), [TT2-013](TT2-013-notes-widget.md), [TT2-015](TT2-015-image-viewer-widget.md)
- **Plan:** [Version 2.0.0 plan](../plan.md)

## User story

As a user, I want predictable duplicate and lock actions so that I can reuse useful arrangements without disturbing finished sections.

## Scope and implementation notes

- Expose duplicate, rename/title, lock/unlock, settings, and remove actions consistently where supported.
- Specify cloning behavior per type: copy notes, reference image assets, start duplicated timers idle, and keep shared browser data shared.
- Lock placement and size while leaving content controls usable.
- Separate widget removal from deleting underlying user content and explain destructive content actions.

## Acceptance criteria

- [ ] Duplicates receive unique IDs and valid nearby placements.
- [ ] A duplicated timer never creates an unexpected running alarm.
- [ ] Editing a duplicate note or shortcut collection follows documented independent/shared ownership rules.
- [ ] Locked widgets cannot be moved/resized by pointer or keyboard until unlocked.
- [ ] Undo/redo restores lock and duplication changes without asset loss or dangling timers.

## Verification

Verify each type-specific duplication rule, locked keyboard/pointer behavior, remove/undo, and multi-tab updates.

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
