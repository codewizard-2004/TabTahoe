# Versioned storage, migration, and named layouts

Date: 2026-10-24. Implementation record for TT2-003 and the persistence portion
of TT2-004.

## Saved workspace

`canvasWorkspace` is a schema-version-2 document containing an active layout ID,
a revision, and up to 50 named layouts. Each layout owns its widget instances,
grid geometry, and appearance preferences. Widget instances store a stable ID,
type/version, and validated settings. The workspace does not embed widget HTML,
shortcut trees, task records, bookmarks, or wallpaper bytes.

The initial migrated layout is named **My layout**. Users can save additional
layouts with their own names, switch between them, rename them, or delete an
inactive layout. For example, **Amal’s layout** and **Sandra’s style** can have
different widget sets, placement, per-widget settings, wallpaper selection, and
glass opacity. Uploaded wallpaper files are kept as immutable UUID-keyed
IndexedDB assets when replaced, so another saved layout can continue to refer
to its earlier image. Layout snapshots are local to the current browser
profile; they are not cloud-synced or exported in this phase.

Shortcut collections are separate records keyed by collection ID. Duplicating a
Favourites widget creates an independent collection; the migrated collection
keeps existing shortcut/group IDs and nested structure. Calendar tasks stay
under their existing date keys and browser bookmarks remain in the browser's
bookmark store. Removing a layout or widget does not delete those shared
records.

## Backends and migration

- Installed extension: `chrome.storage.local`.
- Web preview: namespaced `localStorage` keys with a Web Locks guarded
  compare-and-write operation.
- Uploaded images: the existing local IndexedDB database.
- Calendar task content: existing independent task keys; task edits do not
  increment the workspace revision.

The first open reads legacy preferences, shortcuts, pin references, and the
existing wallpaper asset. It validates and normalizes a familiar widget layout,
persists a full version-1 recovery backup and the migrated shortcut collection,
then writes `canvasWorkspace` last as the migration completion marker. If a
write fails before that marker, opening again can safely repeat migration. The
original version-1 keys are not deleted. Malformed and unsupported workspace
documents remain untouched and open a recovery screen with a downloadable
backup. Unknown widget types/versions remain in the saved document and appear
as an isolated unavailable-widget message.

## Multi-tab policy

Committed workspaces carry an opaque revision. A commit must match the revision
the editing tab began from; otherwise the stale write is rejected. Other tabs
refresh a clean view when a newer workspace arrives. A tab with a draft keeps
that draft and shows a conflict prompt: load the newest workspace or save the
draft as a separately named recovered copy. A `beforeunload` guard also warns
when leaving with an unsaved draft.

## Evidence and remaining work

The browser harness covers clean startup, representative version-1 migration,
legacy nested shortcut IDs, task and pin retention, uploaded wallpaper
references, save/reload, named save/load/rename, per-layout appearance,
independent widget instances, invalid/future data recovery, shared task and
bookmark retention, and a real concurrent-tab conflict in both preview and an
installed extension profile. The last complete run passed before the
installed-extension sound-tab check was added. That check is currently pending
execution because this shell does not expose Node.js or npm.

Remaining phase-one verification is tracked in TT2-004 through TT2-009:
manual installed-extension media access permission/playback controls; visual
review of all dialogs and desktop window sizes; keyboard, zoom, and edit-history
review. The current implementation has local undo/redo and reload draft recovery.
Named-layout export/import, built-in presets/reset, and cross-device sync remain
outside these stories.
