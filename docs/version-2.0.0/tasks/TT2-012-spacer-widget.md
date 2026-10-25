# TT2-012: Add an invisible spacer widget

- **Type:** Story
- **Phase:** Offline widgets
- **Priority:** P1
- **Status:** Done — implementation complete; verification pending
- **Owner:** Unassigned
- **Dependencies:** [TT2-007](TT2-007-drag-resize-and-collisions.md), [TT2-008](TT2-008-responsive-layouts.md)
- **Plan:** [Version 2.0.0 plan](../plan.md)

## User story

As a user, I want reserved blank space so that I can separate sections or keep part of my wallpaper visible.

## Scope and implementation notes

- Implement a content-free grid item with adjustable width and height.
- Show an accessible outline and label only in editing mode.
- Define how spacers reserve cells during placement and retain their geometry across desktop window resizing.

## Acceptance criteria

- [ ] The spacer reserves its intended region without automatic compaction.
- [ ] Normal mode renders no card fill, border, label, or focusable empty content.
- [ ] Editing mode supports keyboard selection, movement, resizing, duplication, and removal.
- [ ] Desktop window resizing preserves spacer size and intentional gaps.

## Verification

Inspect normal/edit modes, collision handling, saved gaps, keyboard selection, and desktop window resizing.

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
| 2026-10-24 | Applied PC/desktop-only scope clarification; mobile/tablet layouts and touch-specific optimization are excluded. | Documentation only; implementation status unchanged. |
| 2026-10-25 | Registered a content-free spacer with independent grid geometry and edit-only outline styling. | Code added; verify intentional gaps and keyboard editing in the browser. |
| 2026-10-26 | Marked Done at the user's direction. | Implementation is in `0475461`; visual, keyboard, collision, and desktop resize checks remain pending. |

## Completion record

- Implementation / PR: Commit `0475461` (`feat: Implement offline widgets for notes, quotes, and image carousel`)
- Verification evidence: Not run for this completion update.
- Remaining limitations: Verify edit-mode behavior and preserved spacing in the browser.
