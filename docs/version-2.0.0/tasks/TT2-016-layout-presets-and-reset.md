# TT2-016: Offer starter layouts and a recoverable reset

- **Type:** Story
- **Phase:** Customization polish
- **Priority:** P1
- **Status:** Todo
- **Owner:** Unassigned
- **Dependencies:** [TT2-006](TT2-006-edit-mode-and-history.md), [TT2-008](TT2-008-responsive-layouts.md), [TT2-012](TT2-012-spacer-widget.md), [TT2-013](TT2-013-notes-widget.md), [TT2-014](TT2-014-quote-widget.md), [TT2-015](TT2-015-image-viewer-widget.md)
- **Plan:** [Version 2.0.0 plan](../plan.md)

## User story

As a user, I want attractive starting layouts so that I can customize without building everything from scratch.

## Scope and implementation notes

- Create a small set of presets such as Classic, Focus, and Minimal using supported widgets.
- Show glass previews and explain which layout/settings will be replaced.
- Apply presets through edit history and preserve unrelated content/assets.
- Offer a reset to the familiar default layout without clearing browser data.

## Acceptance criteria

- [ ] Presets produce valid desktop layouts and work offline.
- [ ] Applying a preset is undoable before committing and canceling restores the prior layout.
- [ ] Calendar tasks, browser bookmarks, and retained user content are not silently deleted.
- [ ] Preset definitions are versioned and validated through the same pipeline as saved layouts.

## Verification

Review each preset with empty and existing content, multiple screen sizes, undo, cancel, and missing optional feature access.

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
