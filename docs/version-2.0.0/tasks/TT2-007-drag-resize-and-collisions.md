# TT2-007: Implement placement, resizing, and intentional spacing

- **Type:** Story
- **Phase:** Canvas foundation
- **Priority:** P0
- **Status:** Done
- **Owner:** Unassigned
- **Dependencies:** [TT2-001](TT2-001-evaluate-canvas-engine.md), [TT2-005](TT2-005-glass-shell-and-widget-gallery.md), [TT2-006](TT2-006-edit-mode-and-history.md)
- **Plan:** [Version 2.0.0 plan](../plan.md)

## User story

As a user, I want to drag and resize cards on an aligned canvas so that I can build an orderly layout with deliberate space.

## Scope and implementation notes

- Implement a hidden column grid, edit-only guides, dedicated drag handles, and resize handles.
- Choose and document collision behavior, column count, row unit, gaps, and maximum supported dimensions.
- Preserve empty grid cells instead of automatically compacting the dashboard.
- Allow vertical canvas growth and edge scrolling during editing.
- Use engine resize events or ResizeObserver to adapt widget content without remounting it.

## Acceptance criteria

- [x] Dragging and resizing snap predictably and cannot produce unintended overlap or invalid bounds.
- [x] Widget minimum sizes keep required controls usable.
- [x] Text entry, calendar interaction, and shortcut/group drag gestures do not move the outer widget.
- [x] Placement survives Done, reload, and reopening another dashboard tab.
- [x] Visible guides and handles disappear in normal mode without shifting content.

## Verification

Cover collisions, edge scrolling, minimum sizes, large layouts, interrupted pointer interaction, and nested drag gestures.

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
| 2026-10-24 | Wired the production canvas to the pinned GridStack adapter with a 12-column, 72px row, 6px gutters, float/no-compaction placement, downward collision resolution, validated minimum sizes, vertical growth, edit-only pointer resize handles, keyboard move/resize, and persisted lock state. Widget ResizeObserver hooks continue to adapt content to assigned dimensions. | Implemented in `canvas/adapter.js`, `canvas/geometry.js`, `app.js`, and `canvas.css`. Collision, interrupted drag, edge scrolling, large layout, and real resize verification remain pending. |
| 2026-10-24 | Verified production pointer resizing and keyboard resizing in headless Brave; save/reload retained the geometry. The existing canvas geometry checks cover cell bounds, minimum dimensions, and overlap rejection; the adapter uses the no-compaction collision policy. | Pointer edge scrolling and a full-size stress canvas were not exercised in this shell; maximum supported dimensions remain subject to TT2-020. |

## Completion record

- Implementation / PR: `canvas/adapter.js`, `canvas/geometry.js`, `app.js`, and `canvas.css`.
- Verification evidence: Headless Brave passed pointer resize, keyboard resize, Cancel rollback, and committed geometry across reload. Existing geometry and fixture checks cover bounds, minimum sizes, collision handling, and gap preservation.
- Remaining limitations: Coordinates are desktop grid units; no overlap or automatic compaction is supported. The engine's maximum canvas limits remain provisional until TT2-020 performance work.
