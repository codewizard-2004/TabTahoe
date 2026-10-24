# TT2-002: Introduce widget instances and a registry

- **Type:** Story
- **Phase:** Canvas foundation
- **Priority:** P0
- **Status:** Done
- **Owner:** Unassigned
- **Dependencies:** [TT2-001](TT2-001-evaluate-canvas-engine.md)
- **Plan:** [Version 2.0.0 plan](../plan.md)

## User story

As a user, I want multiple independently configured widgets of the same type so that my dashboard can contain several clocks, notes, and shortcut collections.

## Scope and implementation notes

- Define a registry with type, version, title, defaults, default/minimum sizes, capability flags, settings schema, mount, update, resize, and destroy hooks.
- Create stable instance IDs and instance-scoped DOM references; remove reliance on a single global ID per widget type.
- Separate canvas placement, glass shell, widget content, browser integrations, and storage into small ES modules.
- Keep reusable DOM-independent validation and calculations in core.js or focused pure modules.

## Acceptance criteria

- [x] Two instances of the same supported type can render and update without shared DOM IDs or accidental settings changes.
- [x] Removing an instance cleans up its timers, listeners, observers, and pending requests.
- [x] A widget failure displays a glass error state without preventing the rest of the dashboard from loading.
- [x] Registry metadata can populate the gallery and constrain sizing without per-type canvas conditionals.

## Verification

Use a small test widget to exercise duplicate mount, resize, update, destruction, and failure isolation.

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
| 2026-10-24 | Added DOM-independent registry/settings metadata and instance-scoped lifecycle/resource ownership. | `widgets/registry.js`, `widgets/runtime.js`, `tests/canvas.test.js`, duplicate-clock and failure fixtures. |
| 2026-10-24 | Verified unit behavior and real Brave interactions in preview and an installed MV3 extension. | 14 unit tests; `npm run test:canvas`; ignored `test-results/canvas-*.png`. |

## Completion record

- Implementation / PR: Local implementation; see the files above. No PR created.
- Verification evidence: 14 passing unit tests plus the focused Brave canvas checks in HTTP preview and under the installed MV3 CSP, including pointer/touch/keyboard, restore/reload, minimum sizes/collisions/gaps, duplicate settings, resize delivery, cleanup, and failure isolation.
- Remaining limitations: Fixture types only; production conversion, migration, transactional editing, and desktop window sizing and accessibility hardening remain in subsequent Phase 1 stories. The older dashboard browser flow still has stale selectors for calendar and superseded controls; see the linked verification record.
