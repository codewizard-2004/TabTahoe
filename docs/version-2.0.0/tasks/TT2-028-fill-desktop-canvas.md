# TT2-028: Let the canvas fill the desktop window

- **Type:** Story
- **Phase:** Canvas foundation
- **Priority:** P0
- **Status:** Done
- **Owner:** Unassigned
- **Dependencies:** [TT2-008](TT2-008-responsive-layouts.md), [TT2-027](TT2-027-unified-customization.md)
- **Plan:** [Version 2.0.0 plan](../plan.md)

## User story

As a user, I want the canvas area to fill the available desktop window when I choose, so my workspace can use the full screen.

## Acceptance criteria

- [x] General settings offers a “Fill the canvas area to the desktop window” option.
- [x] The option is saved with each named layout and is restored when switching layouts.
- [x] Fill mode uses the available desktop page area while preserving widget coordinates and allowing taller layouts to scroll.
- [x] The option is keyboard accessible and does not alter the saved widget geometry.

## Verification

Headless Brave confirmed the setting is present in General, persists through workspace storage, and toggles the root fill-mode class. Page scaling and viewport resizing preserved saved geometry.

## Work log

| Date | Update | Evidence / blocker |
| --- | --- | --- |
| 2026-10-24 | Added per-layout `fillWindow` appearance state, a General settings checkbox, and desktop flex/minimum-height rules for the canvas region. | Installed-extension check saved the option with a named layout and read it back; existing geometry survived viewport resizing and 125% page scaling. |

