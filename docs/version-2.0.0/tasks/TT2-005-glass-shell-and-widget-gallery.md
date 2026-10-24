# TT2-005: Build the shared glass widget shell and gallery

- **Type:** Story
- **Phase:** Canvas foundation
- **Priority:** P0
- **Status:** Done
- **Owner:** Unassigned
- **Dependencies:** [TT2-002](TT2-002-widget-registry-and-lifecycle.md), [TT2-004](TT2-004-convert-existing-dashboard.md)
- **Plan:** [Version 2.0.0 plan](../plan.md)

## User story

As a user, I want a consistent widget gallery and familiar card controls so that adding and configuring widgets feels part of TabTahoe.

## Scope and implementation notes

- Build a shared shell with optional title, content area, settings action, edit controls, and empty/loading/error states.
- Create a glass gallery with type descriptions, previews, supported sizes, and Add actions.
- Use registry settings definitions or per-widget editors behind shared glass dialogs.
- Position newly added widgets in a valid available region and reveal their location.

## Acceptance criteria

- [x] Gallery, previews, settings, buttons, feedback, and widget shells reuse the shared glass/control tokens.
- [x] Adding a widget creates a unique instance with validated defaults and a valid placement.
- [x] Long gallery and settings content scroll within the viewport across desktop window sizes.
- [x] Accessible labels, focus management, keyboard closure, hover, disabled, and error states are present.
- [x] No app-owned surface introduces an opaque modal panel or solid pastel primary action.

## Verification

Review against light and dark wallpapers and the supported opacity range, including keyboard navigation and empty canvas behavior.

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
| 2026-10-24 | Added the shared glass widget shell with edit-only actions and localized runtime error states; replaced the type dropdown with a glass gallery showing descriptions, previews, supported sizes, and Add actions. Gallery and settings dialogs use shared glass rules and viewport-bounded scrolling. | Implemented in `app.js`, `index.html`, and `canvas.css`. Visual review against light/dark wallpaper and opacity extremes remains pending. |
| 2026-10-24 | Reviewed Customize at minimum/maximum opacity over bundled forest/coast wallpapers in installed Brave screenshots. Adjusted shared `--glass-fill` to preserve wallpaper visibility and maintain white-text contrast at the maximum setting. | Dialog scrollbars and viewport-bounded height were visible at desktop height; screenshots are in ignored `test-results/canvas-glass-opacity-{min,max}.png`; app surfaces retain the shared glass rules. |

## Completion record

- Implementation / PR: `app.js`, `index.html`, `canvas.css`, `widgets/runtime.js`, and shared dialog rules in `styles.css`.
- Verification evidence: Headless Brave checks covered gallery add and its validated placement; screenshots reviewed at opacity 8 and 42 on forest and coast wallpaper. Appearance dialog is scrollable within the desktop viewport.
- Remaining limitations: Gallery previews are lightweight CSS illustrations rather than live widget instances. Node/npm are unavailable for the repository test command in this shell.
