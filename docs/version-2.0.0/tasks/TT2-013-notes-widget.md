# TT2-013: Add an autosaving notes widget

- **Type:** Story
- **Phase:** Offline widgets
- **Priority:** P1
- **Status:** Done — implementation complete; verification pending
- **Owner:** Unassigned
- **Dependencies:** [TT2-002](TT2-002-widget-registry-and-lifecycle.md), [TT2-003](TT2-003-versioned-storage-and-migration.md), [TT2-005](TT2-005-glass-shell-and-widget-gallery.md)
- **Plan:** [Version 2.0.0 plan](../plan.md)

## User story

As a user, I want an editable note on my dashboard so that I can keep useful information close at hand.

## Scope and implementation notes

- Show notes in a selectable list; clicking a row opens its plain-text editor, and each row has compact rename and delete controls plus a new-note action.
- Debounce content saves independently from canvas layout commits.
- Define sensible content limits and cross-tab editing behavior.
- Preserve focus, selection, and unsaved text during layout changes.

## Acceptance criteria

- [ ] Each note has independent content that survives reload and browser restart.
- [ ] Users can add, rename, select, edit, and delete notes from compact controls.
- [ ] Typing or selecting text never triggers a canvas drag.
- [ ] Save failures retain the text and provide a recoverable error state.
- [ ] Canceling layout edits does not undo independently saved note text.
- [ ] Text is treated as user content, with no executable markup interpretation.

## Verification

Verify independent notes, save/reload, simultaneous tabs, resize while typing, storage failure, and long content.

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
| 2026-10-25 | Added independent per-widget plain-text content storage, debounced saves, loading/saving/error feedback, and bounded input. | Code added; cross-tab, storage failure, and reload verification remain pending. |
| 2026-10-25 | Expanded Notes to hold up to 50 individually titled notes with compact add/rename/delete controls and persistent selection content. | Code added; verify multiple-note CRUD and cross-tab behavior. |
| 2026-10-25 | Reworked the widget into a note list beside the selected note editor, placing rename and delete icons on each list row. | Code added; visual review remains pending. |
| 2026-10-25 | Changed Notes to open in list-only mode; selecting a note switches to its editor, and a back button returns to the list. Adding or deleting a note keeps the widget in list view. | Code updated; visual and interaction review remains pending. |
| 2026-10-26 | Marked Done at the user's direction. | Implementation is in `0475461`; persistence, CRUD, cross-tab, storage failure, and visual checks remain pending. |

## Completion record

- Implementation / PR: Commit `0475461` (`feat: Implement offline widgets for notes, quotes, and image carousel`)
- Verification evidence: Not run for this completion update.
- Remaining limitations: Verify note lifecycle, persistence, failure recovery, and simultaneous tabs.
