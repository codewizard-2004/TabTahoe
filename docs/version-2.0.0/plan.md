# TabTahoe 2.0.0 — Customizable widget canvas

- **Planning baseline:** 2026-10-24
- **Working branch:** `tabtahoe-canvas` (user-provided)
- **Overall status:** Phase 1 Canvas Foundation is complete (TT2-001–009 and TT2-027–029). The remaining phases and release verification are in progress.
- **Target release:** 2.0.0
- **Delivery scope:** Phases 1–3 plus release verification.
- **Future roadmap:** Phase 4; not a prerequisite for releasing the core canvas.

## Product goal

Turn the full new-tab dashboard into a user-arranged canvas. Users can add multiple widget instances, move and resize them, reserve empty space, and choose presentation settings. Every app-owned surface retains TabTahoe's strict glassmorphic macOS theme.

The first milestone is the current dashboard, fully rearrangeable and resizable, with its familiar appearance and existing workflows intact. Build the canvas foundation before expanding the widget catalog.

## Platform scope

PC/desktop browsers only. Mobile and tablet support, mobile layouts and breakpoints, and touch-specific optimization or verification are out of scope. Prioritize mouse/trackpad and keyboard interaction. Desktop window resizing, browser zoom, allocated widget sizes, and scrollable dialogs remain in scope; a separate narrow stacked layout or layout editor is not required.

## Confirmed direction and terminology

- Retain HTML, CSS, and modular vanilla JavaScript. A React/framework migration is not required for this release.
- Evaluate a locally packaged layout library, initially GridStack, behind an adapter. The exact engine remains an implementation decision to validate in TT2-001.
- Introduce an aligned, grid-snapped canvas with deliberate empty cells and no automatic packing that destroys user spacing.
- Allow vertical growth. Preserve saved geometry and intentional gaps across desktop window resizing and browser zoom.
- All existing dashboard features, including search, greeting, and favourites, become configurable widget instances. Wallpaper and a persistent customization entry point remain in the page shell.
- The requested **timer is a duration countdown with an alarm**: set one hour, start, and receive an alert at the end. It is not a countdown to a calendar event.
- A **focus/Pomodoro timer** adds work/break sessions and repeated cycles. It is a possible future enhancement; it is not necessary to deliver the requested timer.
- Plan optional desktop notifications for completion while dashboard tabs are closed. Audible alerts in an open dashboard are core behavior. Sound with every dashboard closed requires a separately validated offscreen approach and must not be promised by default.
- Local-first storage and offline operation remain the default for core widgets. Widgets that use remote content must provide a documented local fallback. Existing weather/media/browser integrations retain their current boundaries.

## Intended experience

Normal mode presents the user's widgets without editing handles or accidental movement. A persistent Customize/Edit canvas action remains accessible even when the canvas is empty.

Edit mode exposes alignment guides, drag/resize handles, the widget gallery, per-widget settings, duplicate/remove/lock actions, undo/redo, Done, and Cancel. Placement and layout-related settings are edited as a draft; Done commits and Cancel restores the previous layout. Live content edits such as notes, task completion, and timer operation are separate from layout history.

Widgets use supported minimum sizes and compact/expanded presentations. They adapt their content to allocated dimensions instead of merely scaling text. Desktop mouse/trackpad and keyboard workflows should work. Browser-owned surfaces retain the browser/OS theme.

## Delivery phases

### Phase 1 — Canvas foundation

**Outcome:** The existing dashboard runs as independently configured widget instances on a persistent, accessible canvas.

Work includes engine evaluation, registry/lifecycle, versioned storage and migration, conversion of existing features, shared glass shell and gallery, edit history, dragging/resizing, desktop window adaptation, and keyboard editing. Exit when the familiar initial layout can be rearranged, committed, reopened, and restored without breaking existing data or interactions.

### Phase 2 — Offline widgets

**Outcome:** Users can add useful personal widgets without accounts, with local fallbacks for any widget that optionally uses a remote data service.

Deliver duration timer, background notification integration, spacer, notes, an API-backed quote widget with a bundled offline fallback, and a local image viewer. Multiple instances must remain independent. Timer completion must be coordinated across open tabs. Background scheduling is browser-dependent and is not an exact real-time alarm service; document behavior for sleep, restart, denied notifications, and a closed browser. Quote API usage, attribution, caching, failure behavior, and fallback selection must be documented.

### Phase 3 — Customization polish

**Outcome:** Customization is comfortable, recoverable, visually consistent, and fast enough for everyday new-tab use.

Deliver starter layouts/reset, export/import, bounded appearance controls, consistent duplication/locking/settings, and performance/resilience work. Finish release verification and user documentation after all core dependencies are ready.

### Phase 4 — Connected and advanced widgets roadmap

**Outcome:** Maintain explicit discovery stories for features that require provider selection or additional product decisions.

Investigate news, stocks, restricted custom content, further productivity widgets, and advanced layouts. Do not imply these ship in the core 2.0.0 release. News and stocks need current licensing, quota, privacy, attribution, permissions, and credentials decisions before implementation. Custom content must preserve the theme and extension security boundary.

## Architecture and data model

### Boundaries

Suggested organization, to refine during implementation:

```text
app.js                 application startup and orchestration
core.js                shared DOM-independent helpers
canvas/                layout adapter, editing draft, placement, history
widgets/               registry and individual widget implementations
storage/               versioned documents, migration, content/assets
ui/                    shared glass shell, dialogs, gallery, controls
assets/                packaged visuals, timer sound, licensed quote data
```

A registry describes each type's defaults, settings validation, default/minimum size, supported actions, and lifecycle. Instances own their settings and DOM references. Canvas code owns geometry; the shared shell owns consistent controls; widget modules own their behavior. Widget destruction must release listeners, observers, timers, requests, and object URLs.

### Illustrative saved instance

```json
{
  "id": "timer-study",
  "type": "timer",
  "version": 1,
  "layout": { "x": 0, "y": 2, "w": 4, "h": 2 },
  "settings": { "title": "Study", "durationSeconds": 3600 },
  "contentRef": "timer-state:timer-study"
}
```

The surrounding canvas document carries a schema version and canvas settings. The example is a planning contract, not a finalized schema. Grid coordinates use documented units and constraints, not arbitrary imported CSS.

### Persistence and ownership

- Support user-named saved layouts (for example, “Amal’s layout” and “Sandra’s style”), including arrangement, per-widget settings, and appearance. Save, switch, rename, and delete layouts locally; retain referenced live content. This user-requested addition is owned by TT2-003/004; built-in presets/reset remain TT2-016.
- Store committed geometry and per-instance settings separately from high-frequency widget content and asset blobs.
- Keep existing shared calendar task records and browser bookmarks independent from whether their widgets are present.
- Give notes and shortcut collections explicit content ownership; decide cloning behavior per type rather than blindly deep-copying every record.
- Keep images in IndexedDB and persist stable references. Account for drafts, undo, duplicates, and deletion before asset cleanup.
- Keep extension storage and web-preview fallback. Handle other open dashboard tabs with a documented conflict policy; do not silently replace active drafts.
- Validate imported and loaded data. Unknown versions/types, failed migration, missing assets, or one broken widget must produce recoverable localized states.
- Migrate version 1 preferences and layout once, preserve a recoverable original, and mark migration complete only after successful persistence.

### Timer behavior

Use persisted timestamps for elapsed time, not the number of interval callbacks. A running timer stores its deadline; a paused timer stores remaining duration. Refresh display while visible and reconcile from persisted state after reload, suspension, resume, or restart.

Use a service worker and browser alarms for background scheduling, with optional notifications. Coordinate a single completion event per run across pages and the worker. Dashboard audio can use a bundled sound after user interaction; blocked audio must have a visible fallback. Completion remains visible until dismissed. Pausing, resetting, removing, or replacing a timer must cancel obsolete scheduling. A duplicated timer starts idle.

Browser alarms can be delayed, devices can sleep, and a closed browser cannot deliver an on-time alert. Reconciliation should report a missed completion once according to the chosen policy, not replay a backlog. An offscreen audio document is a separate implementation decision if sound with no dashboard open becomes a firm requirement.

## Theme and security requirements

All widgets, gallery previews, nested views, settings forms, menus, dialogs, controls, and transient feedback must use the shared glass tokens. Retain wallpaper-visible fill, blur/saturation, fine light borders, inset highlights, rounded corners, restrained shadows, and system typography. Primary actions use translucent mint glass and readable light text.

Reuse `--glass-fill`, `--glass-border`, `--glass-shadow`, `--glass-filter`, `--glass-control-*`, and `--glass-action-fill`. Global opacity must affect the entire app-owned surface family. Shared `dialog` and backdrop styling applies to new editors too. Long content scrolls within the viewport; focus, labels, placeholders, errors, and disabled states remain legible.

Use `textContent` for plain user content and `safeUrl` for supported navigation. Bundle executable resources locally; no remote scripts, shared secret API keys, or arbitrary CSS/code execution. Future custom content needs a small markup allowlist and maintained sanitizer, not direct untrusted `innerHTML`. Request and document only permissions used by implemented features.

## Scope boundaries

Core release: grid placement, intentional spaces, existing widgets, duration timer, spacer, notes, quotes, images, presets, bounded appearance, and configuration export/import.

Deferred: free pixel placement, overlapping layers, nested canvas sections, date/event countdowns, Pomodoro cycles, slideshows, cloud sync, marketplaces, arbitrary executable widgets, and unrestricted HTML/CSS. These require later stories or explicit scope changes. Additional productivity widget candidates include checklist, world clock, daily intention, habit tracker, week agenda, and calculator/unit converter.

## Decisions to resolve during implementation

| Decision | Starting recommendation | Owning task |
| --- | --- | --- |
| Layout engine and packaged dependency policy | Evaluate GridStack; retain vanilla ES modules | TT2-001 |
| Columns, row unit, collision policy, dimension limits | Snapped grid, no automatic compaction, no overlap | TT2-007 |
| Desktop window sizing | Preserve saved geometry; keep controls reachable with scrolling and zoom | TT2-008 |
| Cross-tab updates and active draft conflicts | Explicit revision/conflict policy; no silent overwrite | TT2-003 / TT2-006 |
| Alarm with dashboard closed | Browser alarm plus optional desktop notification | TT2-011 |
| Sound with every dashboard closed | Defer unless offscreen audio is required and verified | TT2-011 |
| Export contents | Versioned configuration and documented portable text; omit secrets and image blobs | TT2-017 |
| Performance budgets and supported widget count | Measure representative canvases before fixing limits | TT2-020 |
| News/stocks providers and credentials | Investigate current terms before committing | TT2-021 / TT2-022 |

## Progress tracking

This plan is the release-level index; each linked story is the source of truth for its acceptance criteria, implementation notes, evidence, and work log. Keep both updated in the same change.

Statuses: **Todo**, **In progress**, **Blocked**, **Done**, **Roadmap**. A checkbox is checked only when the story is Done. Roadmap stories remain unchecked and are excluded from the core completion count. Promote a roadmap item only through an explicit scope update with dependencies and acceptance criteria reviewed.

Priorities: **P0** foundational/release-critical; **P1** planned core feature/polish; **P2** discovery/future work. P1 is part of the release scope, not an automatic deferral. No deadlines or estimates are committed in this planning baseline.

Current totals: **12/24 core stories Done**, **5 roadmap stories**. Phase 1: **12/12 Done**. See the [canvas foundation decision and verification record](canvas-foundation.md) and [storage and named-layout implementation record](storage-and-named-layouts.md). The 2.0.0 implementation remains in development; package release versions have not been changed.

| Done | ID / story | Phase | Priority | Status |
| --- | --- | --- | --- | --- |
| [x] | [TT2-001: Evaluate and select the canvas layout engine](tasks/TT2-001-evaluate-canvas-engine.md) | Canvas foundation | P0 | Done |
| [x] | [TT2-002: Introduce widget instances and a registry](tasks/TT2-002-widget-registry-and-lifecycle.md) | Canvas foundation | P0 | Done |
| [x] | [TT2-003: Persist versioned canvas layouts and migrate version 1 data](tasks/TT2-003-versioned-storage-and-migration.md) | Canvas foundation | P0 | Done |
| [x] | [TT2-004: Convert the existing dashboard into canvas widgets](tasks/TT2-004-convert-existing-dashboard.md) | Canvas foundation | P0 | Done |
| [x] | [TT2-005: Build the shared glass widget shell and gallery](tasks/TT2-005-glass-shell-and-widget-gallery.md) | Canvas foundation | P0 | Done |
| [x] | [TT2-006: Add transactional edit mode with undo and redo](tasks/TT2-006-edit-mode-and-history.md) | Canvas foundation | P0 | Done |
| [x] | [TT2-007: Implement placement, resizing, and intentional spacing](tasks/TT2-007-drag-resize-and-collisions.md) | Canvas foundation | P0 | Done |
| [x] | [TT2-008: Preserve layouts across desktop window resizing](tasks/TT2-008-responsive-layouts.md) | Canvas foundation | P0 | Done |
| [x] | [TT2-009: Make canvas editing accessible without dragging](tasks/TT2-009-keyboard-canvas-accessibility.md) | Canvas foundation | P0 | Done |
| [x] | [TT2-027: Unify canvas customization and widget settings](tasks/TT2-027-unified-customization.md) | Canvas foundation | P0 | Done |
| [x] | [TT2-028: Let the canvas fill the desktop window](tasks/TT2-028-fill-desktop-canvas.md) | Canvas foundation | P0 | Done |
| [x] | [TT2-029: Make the dashboard top bar an optional widget](tasks/TT2-029-optional-topbar-widget.md) | Canvas foundation | P0 | Done |
| [ ] | [TT2-010: Add a duration countdown timer with an alarm](tasks/TT2-010-duration-countdown-timer.md) | Offline widgets | P0 | Todo |
| [ ] | [TT2-011: Support timer completion when the dashboard is closed](tasks/TT2-011-timer-background-alerts.md) | Offline widgets | P0 | Todo |
| [ ] | [TT2-012: Add an invisible spacer widget](tasks/TT2-012-spacer-widget.md) | Offline widgets | P1 | Todo |
| [ ] | [TT2-013: Add an autosaving notes widget](tasks/TT2-013-notes-widget.md) | Offline widgets | P1 | Todo |
| [ ] | [TT2-014: Add an API-backed quote widget with an offline fallback](tasks/TT2-014-quote-widget.md) | Offline widgets | P1 | Todo |
| [ ] | [TT2-015: Add a local image viewer widget](tasks/TT2-015-image-viewer-widget.md) | Offline widgets | P1 | Todo |
| [ ] | [TT2-016: Offer starter layouts and a recoverable reset](tasks/TT2-016-layout-presets-and-reset.md) | Customization polish | P1 | Todo |
| [ ] | [TT2-017: Export and import validated canvas configurations](tasks/TT2-017-layout-export-and-import.md) | Customization polish | P1 | Todo |
| [ ] | [TT2-018: Add theme-safe canvas and widget appearance controls](tasks/TT2-018-appearance-controls.md) | Customization polish | P1 | Todo |
| [ ] | [TT2-019: Polish widget duplication, locking, and settings](tasks/TT2-019-duplicate-lock-and-settings.md) | Customization polish | P1 | Todo |
| [ ] | [TT2-020: Keep large canvases responsive and recoverable](tasks/TT2-020-performance-and-resilience.md) | Customization polish | P0 | Todo |
| [ ] | [TT2-021: Investigate and add news headlines](tasks/TT2-021-news-headlines-roadmap.md) | Connected and advanced roadmap | P2 | Roadmap |
| [ ] | [TT2-022: Investigate and add a stock watchlist](tasks/TT2-022-stock-watchlist-roadmap.md) | Connected and advanced roadmap | P2 | Roadmap |
| [ ] | [TT2-023: Design a theme-safe custom content widget](tasks/TT2-023-custom-content-roadmap.md) | Connected and advanced roadmap | P2 | Roadmap |
| [ ] | [TT2-024: Prioritize additional productivity widgets](tasks/TT2-024-additional-widgets-roadmap.md) | Connected and advanced roadmap | P2 | Roadmap |
| [ ] | [TT2-025: Evaluate advanced canvas features after the grid release](tasks/TT2-025-advanced-canvas-roadmap.md) | Connected and advanced roadmap | P2 | Roadmap |
| [ ] | [TT2-026: Verify and document the version 2.0.0 release](tasks/TT2-026-release-verification-and-docs.md) | Release gate | P0 | Todo |

## Recommended execution sequence

1. TT2-001 engine decision → TT2-002 registry → TT2-003 persistence/migration.
2. TT2-004 existing feature conversion → TT2-005 shell/gallery → TT2-006 edit history → TT2-007 placement → TT2-008 desktop window sizing → TT2-009 keyboard review → TT2-027 unified customization → TT2-028 desktop fill area → TT2-029 optional top bar widget.
3. TT2-010 duration timer → TT2-011 background alerts; add TT2-012–TT2-015 offline widgets once their foundation dependencies are ready.
4. TT2-016–TT2-019 customization polish → TT2-020 performance/resilience → TT2-026 release verification.
5. Revisit TT2-021–TT2-025 after the core experience is stable and provider/product decisions are available.

These are implementation dependencies, not a request to delegate work to agents. Verify each story's explicit dependency list before starting it.

## Verification strategy and release gate

Add meaningful pure tests for layout validation, migration, history, timer calculations, quote date rollover, imports, and asset ownership. Adapt the test command to include new test files. Do not add tests that merely mirror trivial markup or implementation details.

Use browser checks for add/edit/move/resize/persistence and targeted integration scenarios. Verify real bookmarks, media controls, service-worker alarms, notifications, and browser permissions in the installed extension; a web preview cannot establish those behaviors.

Manually review desktop layouts, resized/short desktop windows, browser zoom, keyboard use, reduced motion, opacity extremes, light/dark wallpapers, and all existing dialogs: Customize, weather search/results, add/edit shortcut, new/rename group, group contents, calendar tasks including completed items, and bookmarks. Include the new gallery, widget editors, timers, notes, quotes, images, presets, and import feedback. Keep screenshots under ignored `test-results/`.

Test fresh install and representative version 1 migration, reload/restart, multi-tab changes, denied permissions, offline state, missing assets, and storage failures. Record actual evidence in the owning story. Follow the user's current verification preferences; if they choose to test themselves, provide the checklist and record results without running tests on their behalf.

Release only after core acceptance criteria are complete or an explicit scope change is documented, relevant checks and manual review have evidence, README is updated, permissions are justified, and package/manifest versions agree. Update release packaging to include any new runtime directories, libraries, license notices, and sound/data assets. Phase 4 is not a release blocker.

## Plan change log

| Date | Change | Verification |
| --- | --- | --- |
| 2026-10-24 | Created the four-phase plan and Jira-style task backlog; clarified duration timer versus Pomodoro and date countdown. | Documentation structure and links only; no product implementation or application tests. |
| 2026-10-24 | Completed TT2-001 and TT2-002: pinned local GridStack adapter, validated geometry, registry/lifecycle, and an isolated glass canvas fixture. Production migration/conversion remains next. | 14 unit tests pass; focused Brave checks pass in HTTP preview and under installed MV3 CSP, including pointer/touch/keyboard, persistence, narrow reflow, cleanup, and failure isolation. Existing dashboard browser checks retain stale selectors; see the foundation record. |
| 2026-10-24 | Clarified PC/desktop-only scope. Removed mobile/tablet, touch-specific, and narrow stacked-layout requirements; refocused TT2-008 and dependent stories on desktop window sizing. Existing prototype evidence remains historical. Story completion counts unchanged. | Documentation review only; no runtime changes or application tests. |
| 2026-10-24 | Implemented schema-v2 local workspace persistence and recoverable v1 migration; converted production widgets; added glass gallery, bounded layout history, tab-scoped draft recovery, grid pointer/keyboard editing, locks, and desktop window adaptation. TT2-003 is done; TT2-004–009 remain in progress pending review. | The last full unit/browser run predates these latest interaction changes. No tests were added or run in this turn. Inspect each story's verification record before completion. |
| 2026-10-24 | Completed TT2-004–009 and the Phase 1 Canvas Foundation. Added the tested browser verification evidence to each story and adjusted the shared glass fill after maximum-opacity review showed weak text contrast over a bright wallpaper. | Temporary headless Brave checks passed preview editing/history/resize/cancel/save/reload/draft recovery, installed bookmark and tab-mute integration, desktop geometry invariance, and opacity/wallpaper review screenshots. Node/npm are unavailable here, so the repository unit/browser commands and assistive-technology review remain outstanding for release verification. |
| 2026-10-24 | Added and completed TT2-027–029 from the customization feedback: one Customize entry point, a smaller General panel with per-widget preferences, a per-layout desktop fill option, and an optional configurable top-bar widget. Phase 1 now tracks 12 stories. | Temporary Brave checks passed the new edit entry, General fields, widget settings/rollback, named layout save/switch, top-bar migration and customization, fill preference persistence, and existing canvas interactions. |
| 2026-10-24 | Clarified TT2-014 as an API-backed quote widget with local caching, personal quotes stored locally, and a bundled offline fallback. Phase 2 remains offline-first for its other widgets while documenting remote-content fallback requirements. | Documentation review only; implementation and API selection remain pending. |
