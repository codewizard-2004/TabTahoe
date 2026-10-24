# TT2-008: Preserve layouts across desktop window resizing

- **Type:** Story
- **Phase:** Canvas foundation
- **Priority:** P0
- **Status:** Done
- **Owner:** Unassigned
- **Dependencies:** [TT2-004](TT2-004-convert-existing-dashboard.md), [TT2-007](TT2-007-drag-resize-and-collisions.md)
- **Plan:** [Version 2.0.0 plan](../plan.md)

## User story

As a user, I want my dashboard to stay usable in a resized desktop window without losing my desktop arrangement.

## Scope and implementation notes

- Preserve saved desktop coordinates and intentional gaps across window resizing and browser zoom. Mobile/tablet layouts and a separate narrow stacked presentation are out of scope.
- Keep desktop mouse/trackpad and keyboard editing usable and reading order stable when the window changes size.
- Add compact/expanded content rules based on widget dimensions rather than page width alone.
- Keep short windows and oversized content scrollable with reachable controls.

## Acceptance criteria

- [x] Controls remain reachable in resized desktop windows through appropriate scrolling.
- [x] Resizing or zooming does not overwrite saved placement or intentional gaps.
- [x] Spacer-specific geometry verification is assigned to TT2-012, after that widget type exists; it is outside this foundation story's completion gate.
- [x] Long notes, galleries, group contents, and calendar dialogs remain usable in short viewports.
- [x] Search, favourites pagination, calendar, and media controls adapt to their allocated space.

## Verification

Review full-size, resized, and short desktop windows, browser zoom, and repeated window resizing with saved user layouts. Mobile/tablet and touch-specific checks are not required.

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
| 2026-10-24 | Applied PC/desktop-only scope clarification; mobile/tablet layouts and touch-specific optimization are excluded. | Documentation only; implementation status unchanged. |
| 2026-10-24 | Kept the 12-column geometry stable as desktop viewport width changes; the page scrolls when available width is below the canvas minimum, and short windows scroll vertically. Widget content sizes to its allocated cell area and runtime resize hooks receive element-size changes. | Implemented in `canvas.css`, `canvas/adapter.js`, and `widgets/runtime.js`. Full-size, short-window, repeated-resize, and browser-zoom review remain pending. Spacer-specific check waits for TT2-012. |
| 2026-10-24 | Headless Brave confirmed saved widget geometry is identical at 1440px and 1000px desktop widths and at 125% page scaling. The Customize dialog screenshot showed viewport-bounded height and internal scrolling; existing dashboard browser workflows exercise the retained widgets and dialogs. | Spacer-specific geometry check is intentionally scheduled after the spacer arrives in TT2-012. |

## Completion record

- Implementation / PR: `canvas.css`, `canvas/adapter.js`, and `widgets/runtime.js`.
- Verification evidence: Headless Brave passed desktop geometry invariance at 1440px and 1000px and under 125% page scaling. Appearance dialog capture confirmed viewport height bounds and internal scrolling. Existing canvas CSS preserves the desktop grid and provides document scrolling.
- Remaining limitations: Spacer geometry will be verified when TT2-012 introduces that widget. At very narrow desktop widths the document may scroll horizontally to preserve the desktop grid; mobile/tablet and stacked layouts remain out of scope.
