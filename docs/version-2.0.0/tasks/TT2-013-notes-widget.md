# TT2-013: Add an autosaving notes widget

- **Type:** Story
- **Phase:** Offline widgets
- **Priority:** P1
- **Status:** Todo
- **Owner:** Unassigned
- **Dependencies:** [TT2-002](TT2-002-widget-registry-and-lifecycle.md), [TT2-003](TT2-003-versioned-storage-and-migration.md), [TT2-005](TT2-005-glass-shell-and-widget-gallery.md)
- **Plan:** [Version 2.0.0 plan](../plan.md)

## User story

As a user, I want an editable note on my dashboard so that I can keep useful information close at hand.

## Scope and implementation notes

- Provide an optional title, plain-text editor, readable size options, and a saving/error indication.
- Debounce content saves independently from canvas layout commits.
- Define sensible content limits and cross-tab editing behavior.
- Preserve focus, selection, and unsaved text during layout changes.

## Acceptance criteria

- [ ] Each note has independent content that survives reload and browser restart.
- [ ] Typing or selecting text never triggers a canvas drag.
- [ ] Save failures retain the text and provide a recoverable error state.
- [ ] Canceling layout edits does not undo independently saved note text.
- [ ] Text is treated as user content, with no executable markup interpretation.

## Verification

Verify independent notes, save/reload, simultaneous tabs, resize while typing, storage failure, and long content.

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
