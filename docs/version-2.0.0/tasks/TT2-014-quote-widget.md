# TT2-014: Add an API-backed quote widget with an offline fallback

- **Type:** Story
- **Phase:** Offline widgets
- **Priority:** P1
- **Status:** Todo
- **Owner:** Unassigned
- **Dependencies:** [TT2-002](TT2-002-widget-registry-and-lifecycle.md), [TT2-003](TT2-003-versioned-storage-and-migration.md), [TT2-005](TT2-005-glass-shell-and-widget-gallery.md)
- **Plan:** [Version 2.0.0 plan](../plan.md)

## User story

As a user, I want a daily or manually shuffled quote so that my dashboard can show a small piece of inspiration.

## Scope and implementation notes

- Use a documented quote API when available, with a modest bundled collection as the deterministic offline fallback. Record source licensing, provenance, attribution, and the API's data-use requirements.
- Support daily selection, manual shuffle, and an optional personal quote collection. Keep personal quotes local and do not send them to the API.
- Cache the last successful API result locally, define behavior for API errors, rate limits, malformed responses, and unavailable network access, and fall back to bundled quotes when needed.
- Make local-date rollover deterministic and keep the current selection stable across tabs, including when switching between API and fallback sources.

## Acceptance criteria

- [ ] API quotes render when the service is available and display the required attribution.
- [ ] Bundled fallback quotes render without network access and display available attribution.
- [ ] Daily selection is stable for the chosen local day and changes at the documented rollover.
- [ ] Personal quotes are stored locally and inserted as text.
- [ ] Long quotes adapt or scroll within supported widget sizes without obscuring controls.

## Verification

Verify API success, attribution, caching, rate-limit and malformed-response handling, fallback behavior without network access, date boundaries, reload consistency, an empty personal collection, long text, and offline behavior.

## Progress checklist

- [ ] Confirm implementation details and resolve story-specific open questions.
- [ ] Implement the agreed scope.
- [ ] Complete acceptance criteria and appropriate verification.
- [ ] Record evidence, limitations, and relevant documentation changes.
- [ ] Update this story and the central plan to Done.

## Work log

| Date | Update | Evidence / blocker |
| --- | --- | --- |
| 2026-10-24 | Story created; implementation has not started. | Planning only. |

## Completion record

- Implementation / PR: Pending
- Verification evidence: Pending
- Remaining limitations: Pending
