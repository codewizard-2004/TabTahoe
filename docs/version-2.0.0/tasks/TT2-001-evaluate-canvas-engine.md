# TT2-001: Evaluate and select the canvas layout engine

- **Type:** Story
- **Phase:** Canvas foundation
- **Priority:** P0
- **Status:** Done
- **Owner:** Unassigned
- **Dependencies:** None
- **Plan:** [Version 2.0.0 plan](../plan.md)

## User story

As a maintainer, I want a proven layout engine behind a small adapter so that moving and resizing widgets remains reliable without a framework rewrite.

## Scope and implementation notes

- Prototype GridStack using locally packaged assets; compare with a small custom grid only if required behavior cannot be achieved.
- Verify deliberate empty cells, disabled compaction, collision handling, minimum sizes, and stable saved coordinates.
- Exercise nested shortcut dragging, text selection, mouse/trackpad interaction, keyboard integration, and desktop window resizing.
- Record library license, packaged size, CSP compatibility, integration approach, and dependency/build implications.

## Acceptance criteria

- [x] A short decision record explains the chosen engine and tradeoffs with links to authoritative documentation.
- [x] The prototype supports move, resize, save, and restore without remote scripts or inline event handlers.
- [x] The chosen approach preserves intentional gaps and does not break shortcut dragging or normal widget interaction.
- [x] A documented adapter isolates engine-specific calls from widget code.

## Verification

Use a throwaway dashboard fixture for interaction review. Inspect packaged resources and license. No framework migration is part of this story.

## Progress checklist

- [x] Confirm implementation details and resolve story-specific open questions.
- [x] Implement the agreed scope.
- [x] Complete acceptance criteria and appropriate verification.
- [x] Record evidence, limitations, and relevant documentation changes.
- [x] Update this story and the central plan to Done.

## Implementation notes

See the [canvas foundation decision and contracts](../canvas-foundation.md) for
architecture, adapter/lifecycle APIs, reproduction steps, and verification limits.
This completes the foundation story through an isolated prototype; dashboard
conversion and production persistence remain TT2-003 and TT2-004.

## Work log

| Date | Update | Evidence / blocker |
| --- | --- | --- |
| 2026-10-24 | Story created; implementation has not started. | Planning only. |
| 2026-10-24 | Applied PC/desktop-only scope clarification; mobile/tablet layouts and touch-specific optimization are excluded. | Documentation only; implementation status unchanged. |
| 2026-10-24 | Selected locally packaged GridStack 14.0.0 behind the validated adapter; added an isolated glass fixture. | `canvas/adapter.js`, `canvas/geometry.js`, `vendor/gridstack/`, `tests/fixtures/canvas.html`. |
| 2026-10-24 | Verified unit behavior and real Brave interactions in preview and an installed MV3 extension. | 14 unit tests; `npm run test:canvas`; ignored `test-results/canvas-*.png`. |

## Completion record

- Implementation / PR: Local implementation; see the files above. No PR created.
- Verification evidence: 14 passing unit tests plus the focused Brave canvas checks in HTTP preview and under the installed MV3 CSP, including pointer/touch/keyboard, restore/reload, minimum sizes/collisions/gaps, duplicate settings, resize delivery, cleanup, and failure isolation.
- Remaining limitations: Fixture types only; production conversion, migration, transactional editing, and desktop window sizing and accessibility hardening remain in subsequent Phase 1 stories. The older dashboard browser flow still has stale selectors for calendar and superseded controls; see the linked verification record.
