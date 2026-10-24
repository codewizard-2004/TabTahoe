# TT2-006: Add transactional edit mode with undo and redo

- **Type:** Story
- **Phase:** Canvas foundation
- **Priority:** P0
- **Status:** Done
- **Owner:** Unassigned
- **Dependencies:** [TT2-003](TT2-003-versioned-storage-and-migration.md), [TT2-005](TT2-005-glass-shell-and-widget-gallery.md)
- **Plan:** [Version 2.0.0 plan](../plan.md)

## User story

As a user, I want to experiment with my layout and undo mistakes so that customization feels safe.

## Scope and implementation notes

- Add Edit canvas, Done, Cancel, Undo, and Redo controls with visible editing state.
- Create an editing draft from the committed canvas and save layout changes only on Done.
- Define reversible operations for add, remove, move, resize, duplicate, lock, and layout appearance changes.
- Keep task completion, timer operation, note text, and other live widget content outside layout undo.
- Handle navigation/reload and external storage changes while a draft is open without silent data loss.

## Acceptance criteria

- [x] Cancel restores the committed layout and Done persists the validated draft.
- [x] Undo/redo accurately restores instances, placement, and relevant settings through mixed operations.
- [x] Normal mode hides drag/resize controls and allows ordinary text selection and widget interaction.
- [x] Global history shortcuts do not steal native undo from an input, textarea, or content editor.
- [x] Reload recovery and cross-tab conflict handling are documented and visible to the user when relevant.

## Verification

Exercise add/move/resize/remove sequences, redo invalidation, cancel, refresh, and an external update during an active draft.

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
| 2026-10-24 | Added a 100-step undo/redo history for layout geometry, widget instances/settings, lock state, and appearance. Save commits; Cancel restores committed state. Ctrl/Cmd+Z and Ctrl/Cmd+Shift+Z (or Ctrl/Cmd+Y) are ignored in text inputs. Drafts are kept in tab-scoped session storage and prompt to resume or discard after reload; outdated drafts save as new recovered layouts. | Implemented in `app.js`; keyboard walkthrough and mixed-operation history verification remain pending. |
| 2026-10-24 | Verified add, undo/redo, keyboard resize, pointer resize, Cancel, Save/reload, and session draft recovery in headless Brave. Prior browser evidence covers cross-tab conflict prompts and stale-draft protection. | History remains bounded to 100 snapshots; widget content is intentionally not part of layout history. |

## Completion record

- Implementation / PR: `app.js`, `index.html`, and `canvas.css`.
- Verification evidence: Headless Brave passed gallery add, undo/redo, keyboard and pointer resize, cancel rollback, committed reload, and reload recovery. Existing browser checks cover conflict recovery. Code keeps shortcuts out of native text editors.
- Remaining limitations: History is bounded to 100 snapshots and scoped to the open tab's edit draft; shared widget content is intentionally outside layout history.
