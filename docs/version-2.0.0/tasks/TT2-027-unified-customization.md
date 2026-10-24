# TT2-027: Unify canvas customization and widget settings

- **Type:** Story
- **Phase:** Canvas foundation
- **Priority:** P0
- **Status:** Done
- **Owner:** Unassigned
- **Dependencies:** [TT2-005](TT2-005-glass-shell-and-widget-gallery.md), [TT2-006](TT2-006-edit-mode-and-history.md), [TT2-019](TT2-019-duplicate-lock-and-settings.md)
- **Plan:** [Version 2.0.0 plan](../plan.md)

## User story

As a user, I want one clear entry point for customizing my canvas and settings on the widgets they affect, so the page stays simple and each saved layout is easy to understand.

## Acceptance criteria

- [x] One persistent Customize action opens canvas edit mode; the former separate Edit canvas and top-bar settings actions are removed.
- [x] Edit mode contains Add, Undo, Redo, and General settings; Change layout remains a separate persistent footer action.
- [x] General settings contains wallpaper selection/rotation, glass opacity, and the desktop fill option.
- [x] Search engine, temperature, greeting name, clock format, and shortcut appearance are configured on their matching widget instances.
- [x] Saved layout controls remain usable from edit mode without silently losing the current draft.

## Verification

Headless Brave confirmed the Customize-to-edit flow and General settings field set. Browser interaction checks passed edit, cancel, save, and layout persistence. Widget settings use the existing validated per-instance registry editors.

## Work log

| Date | Update | Evidence / blocker |
| --- | --- | --- |
| 2026-10-24 | Removed duplicate edit/settings entry points, placed General settings in the editor, and moved shortcut appearance into each Favourites instance. General settings now holds shared wallpaper/glass/canvas presentation only. | Headless Brave confirmed the Customize-to-edit flow, reduced General form, per-widget appearance updates and Cancel rollback. The separate Change layout gallery is tracked in TT2-030. Existing legacy preferences still migrate into widget defaults. |

