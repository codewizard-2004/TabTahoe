# Canvas foundation: engine and widget contracts

Date: 2026-10-24. The engine and registry decision/evidence below records the
TT2-001 and TT2-002 prototype. It is historical foundation evidence; subsequent
sections link to the production storage and canvas work.

## Decision: locally packaged GridStack 14.0.0

Use GridStack behind `canvas/adapter.js`. Its `mode: 'float'` disables gravity
and preserves deliberate gaps. Collisions push neighbours rather than overlap
them. Do not call `compact()` or use automatic packing modes.

Primary references:

- [GridStack layout modes](https://gridstackjs.com/doc/html/types/GridStackMode.html)
- [GridStack options](https://gridstackjs.com/doc/html/interfaces/GridStackOptions.html)
- [GridStack save, load, update, lifecycle, and events](https://gridstackjs.com/doc/html/classes/GridStack.html)
- [Pinned source and MIT license](https://github.com/gridstack/gridstack.js/tree/v14.0.0)

The prototype demonstrates the required behavior, so a custom pointer/touch
engine is unnecessary. A custom engine could reduce packaged bytes, but would
make TabTahoe responsible for collision resolution, gesture handling, and edge
scrolling. GridStack still needs TabTahoe's validation, keyboard controls,
desktop window adaptation, transaction history, and content lifecycle.

The JavaScript is 93,333 bytes; CSS is 6,138 bytes (99,471 bytes combined,
uncompressed). The MIT license and bundled notices are retained. Provenance and
the verified npm archive SHA-512 are in `vendor/gridstack/README.md`. There are
no runtime package dependencies, installation step, framework, or compilation.
The packaged UMD script is loaded before the fixture's module. Only the adapter
accesses its `GridStack` global. Neither production `index.html` nor `app.js`
loads it yet.

Scripts and styles are local. No inline handlers, remote executable resources,
`eval`, or permission changes are introduced. The fixture was exercised as a
page inside the loaded MV3 extension under its existing CSP, as well as in HTTP
preview. Its own CSP also restricts scripts to `self`.

## Geometry and adapter

Coordinates are integer cells on a 12-column desktop grid. Rows are 72 CSS
pixels, with a 6-pixel inset per card (12 pixels between surfaces). The initial
validation budget is 100 instances and 1,000 rows; TT2-020 must measure practical
performance before these become release promises. Widgets declare minimum
sizes. Vertical scrolling belongs to the page; GridStack provides gesture edge
scrolling, to receive further boundary coverage in TT2-007.

The adapter exposes:

| Method | Contract |
| --- | --- |
| `mount(element, geometry)` | Attach existing DOM with a unique stable ID and valid, unoccupied geometry. |
| `remove(id)` | Remove layout/DOM without destroying widget-owned content records. Caller destroys its runtime first. |
| `serialize()` | Return only explicit IDs, integer coordinates, sizes, and minimum sizes. No HTML/content serialization. |
| `restore(layout)` | Validate the entire non-overlapping layout and restore already mounted, matching IDs. |
| `update(id, geometry)` | Apply validated move/resize coordinates; engine resolves collisions. |
| `setEditing(enabled)` | Enable dedicated handles or disable movement and resizing. |
| `destroy()` | Release engine handlers, retaining DOM for caller-owned cleanup. Idempotent. |

`onChange(layout)` reports user changes; caller-driven mount/remove/restore do
not publish intermediate states. Content never needs engine node objects.
GridStack omits saved sizes equal to their minimums: the adapter expands them
before validating and returning its explicit geometry format.

No compaction is performed on mount, removal, or restore. Pointer and touch
movement starts only at `.canvas-move-handle` (press and hold for touch).
Native shortcut dragging, inputs,
and text selection stay inside the widget. In the fixture, arrow keys on that
handle move one cell; Shift + arrows resize. Invalid sizes/bounds show feedback.

Narrow fixture windows use a CSS stack and disable engine gestures, preserving
all desktop coordinates. This is existing prototype behavior, not a required
mobile layout. The project is PC/desktop-only; no further mobile/tablet or
touch-specific optimization or verification is planned. Full reading/focus order, widget content sizing,
interrupted gestures, short-window and zoom coverage belong to TT2-007–009.
The prototype's controls are verification aids; they are not transactional Done,
Cancel, or history controls.

## Widget registry and runtime

`widgets/registry.js` owns definitions and validation, independently of the DOM
or layout engine. Definitions include a type, version, title, description,
default/minimum size, capabilities, settings fields, and lifecycle hooks.
Gallery metadata is returned as detached copies. Settings support bounded
strings/numbers, booleans, and choice lists, with validated defaults. Unknown
types, versions, settings, and invalid values are rejected.

Instances contain `{ id, type, version, settings }`. Geometry belongs to the
canvas; persisted content ownership and version 1 migration are implemented in
TT2-003. IDs are
stable when supplied and generated with `crypto.randomUUID()` for new instances.
DOM references are scoped to each instance's content element, with no global
widget IDs or per-type selectors.

`widgets/runtime.js` invokes `mount`, `update`, `resize`, and `destroy` hooks with
`{ instance, element, scope, state }`. Hooks are synchronous; asynchronous work
must handle its own rejection and use `scope.signal` for requests. Rejected hook
promises are caught defensively while the instance remains mounted. Resources
must be allocated through the instance scope:

- `listen` removes registered listeners.
- `interval` clears timers.
- `observe` disconnects observers, including the runtime's content-size observer.
- `objectUrl` revokes local blob URLs.
- `cleanup` registers other disposers; late registration disposes immediately.
- `signal` aborts requests on failure or destruction.

Scope disposal runs even when a hook or another disposer fails. A lifecycle
failure becomes a local, accessible error inside its existing glass shell;
other instances continue running. Removing widgets does not delete shared
calendar tasks, bookmarks, or any persisted content. Production dashboard
widgets now use this contract through TT2-004.

## Review and verification

Serve the repository with `python3 -m http.server 4173 --bind 127.0.0.1`, then
open `http://127.0.0.1:4173/tests/fixtures/canvas.html`. The page starts with two
independent clocks, intentional gaps, and a nested shortcut interaction check.
Add/remove instances, change one clock's setting, move/resize with handles or
keys, save, and reload. Use “Add failing widget” to inspect a localized failure.
Prototype saves use `tabtahoe:canvas-prototype:1` in localStorage and do not touch
version 1 preferences, tasks, wallpaper, or shortcut collections. Saves are only
fixture data; extension-storage migration and cross-tab policies are TT2-003.

- Earlier prototype runs covered layout bounds/overlap, widget lifecycle,
  cleanup, and failure isolation in preview and installed MV3 contexts.
- A temporary headless Brave review of the production canvas covered the single
  Customize entry, gallery add, per-widget shortcut style and top-bar settings,
  undo/redo, keyboard and pointer resize, cancel/save/reload, draft recovery,
  bookmarks, tab mute, fill-window persistence, and geometry across desktop
  viewport sizes and 125% page scaling.
- Appearance screenshots at minimum and maximum opacity are in ignored
  `test-results/canvas-glass-opacity-min.png` and
  `test-results/canvas-glass-opacity-max.png`.
- Node and npm are unavailable in the current shell, so repository unit and
  browser commands were not run for the follow-up UI work. Assistive-technology
  and optional per-site media permission review remain release checks.

## Production canvas progress

TT2-003 implements schema-v2 storage, version-1 migration, named layouts,
recoverable backups, separate content ownership, and revision conflict
handling. Phase 1 is implemented across TT2-001–009 and TT2-027–030. The
follow-up stories add one Customize entry point, per-widget settings, a
per-layout desktop-fill option, an optional top-bar widget, and a separate
visual layout picker. TT2-030 awaits the user's browser review. Full release
verification, repository test commands, and assistive-technology review remain
part of TT2-026.
