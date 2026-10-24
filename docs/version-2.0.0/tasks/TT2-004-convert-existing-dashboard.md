# TT2-004: Convert the existing dashboard into canvas widgets

- **Type:** Story
- **Phase:** Canvas foundation
- **Priority:** P0
- **Status:** Done
- **Owner:** Unassigned
- **Dependencies:** [TT2-002](TT2-002-widget-registry-and-lifecycle.md), [TT2-003](TT2-003-versioned-storage-and-migration.md)
- **Plan:** [Version 2.0.0 plan](../plan.md)

## User story

As a user, I want to rearrange every existing dashboard feature so that the whole tab becomes my canvas.

## Scope and implementation notes

- Convert clock, weather, sound control, calendar, bookmarks, favourites, greeting, and search into supported instances.
- Retain wallpaper and the persistent Customize/Edit entry point in the page shell.
- Adapt favourites pagination to widget dimensions; support independently named shortcut collections with explicit data ownership.
- Preserve nested group dialogs, calendar tasks, bookmarks, search shortcuts, weather selection, and optional media access.

## Acceptance criteria

- [x] The initial upgraded layout resembles version 1 and all retained workflows remain available.
- [x] Each converted feature can be positioned and resized within its supported range.
- [x] Multiple clock and shortcut-collection instances have independent settings and predictable content ownership.
- [x] Removing all widgets leaves an accessible Add widget entry point.
- [x] Browser-only features retain clear preview fallbacks and work in the installed extension.

## Verification

Review existing unit and browser checks for assumptions about fixed selectors. Manually verify bookmark and media integration in the installed extension.

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
| 2026-10-24 | Converted the existing dashboard to scoped canvas widget instances; kept appearance and wallpaper controls in the shell; added the gallery, per-instance settings, named layouts, shared task/bookmark data, and shortcut collection ownership. Move, pointer resize, keyboard resize, lock, and transaction controls are now wired to production widgets. | Earlier full browser run passed preview and installed MV3 workflows for migration, shortcut/group dialogs, task edits, weather selection, bookmarks, independent widget copies, save/reload, empty canvas, and conflict recovery. This turn's implementation changes have not been browser-verified. The installed media-tab mute scenario also remains unrun because Node/npm are unavailable in this shell. |
| 2026-10-24 | Verified final canvas edit, pointer resize, keyboard resize, save/reload, and draft recovery flows in headless Brave. In the installed extension, created and rendered a real bookmark and muted/unmuted a website tab using the browser tab fallback. | Optional per-site player access requires an interactive permission grant and was outside this automated check. |

## Completion record

- Implementation / PR: `index.html`, `app.js`, `canvas.css`, `widgets/`, `ui/`, `storage/`, and `tests/dashboard-browser.js`.
- Verification evidence: Headless Brave preview passed gallery add, undo/redo, keyboard and pointer resize, cancel, save/reload, and draft recovery. Installed MV3 checks passed new-tab startup, real bookmark rendering, and sound-tab mute/unmute fallback. Prior full browser evidence covers migration, retained dashboard workflows, and cross-tab conflict recovery.
- Remaining limitations: Optional site-specific playback controls require the user's explicit optional host permission and were not exercised here; tab mute works without that permission. Repository tests are unavailable in this shell because Node/npm are not installed.
