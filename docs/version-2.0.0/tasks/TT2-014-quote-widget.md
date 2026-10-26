# TT2-014: Add an API-backed quote widget with an offline fallback

- **Type:** Story
- **Phase:** Offline widgets
- **Priority:** P1
- **Status:** Done — implementation complete; API/category verification pending
- **Owner:** Unassigned
- **Dependencies:** [TT2-002](TT2-002-widget-registry-and-lifecycle.md), [TT2-003](TT2-003-versioned-storage-and-migration.md), [TT2-005](TT2-005-glass-shell-and-widget-gallery.md)
- **Plan:** [Version 2.0.0 plan](../plan.md)

## User story

As a user, I want a daily or manually shuffled quote so that my dashboard can show a small piece of inspiration.

## Scope and implementation notes

- Use a documented quote API when available, with a modest bundled collection as the deterministic offline fallback. Record source licensing, provenance, attribution, and the API's data-use requirements.
- Use a free no-key quote API, categorized quote selection, and refresh choices of 30 minutes, 1 hour, 6 hours, and 1 day.
- Allow quote text size to be selected in widget settings.
- Bundle attributed famous-person quotes for offline fallback. Do not provide user-authored quote entry.
- Cache the last successful API result locally, define behavior for API errors, rate limits, malformed responses, and unavailable network access, and fall back to bundled quotes when needed.
- Keep the current selection stable across tabs for each refresh interval, including when switching between API and fallback sources.

## Acceptance criteria

- [ ] API quotes render when the service is available and display the required attribution.
- [ ] Bundled famous-person fallback quotes render without network access and show attribution.
- [ ] Category and 30-minute, 1-hour, 6-hour, and daily refresh settings work and stay consistent across tabs.
- [ ] No API key or user-authored quote workflow is required.
- [ ] Quote font size can be changed in widget settings.
- [ ] Long quotes adapt or scroll within supported widget sizes without obscuring controls.

## Verification

Verify API success, category filters, attribution, caching, rate-limit and malformed-response handling, fallback behavior without network access, each refresh interval, reload consistency, long text, and offline behavior.

## Progress checklist

- [ ] Confirm implementation details and resolve story-specific open questions.
- [x] Implement the agreed scope.
- [ ] Complete acceptance criteria and appropriate verification.
- [ ] Record evidence, limitations, and relevant documentation changes.
- [ ] Update this story and the central plan to Done.

## Work log

| Date | Update | Evidence / blocker |
| --- | --- | --- |
| 2026-10-24 | Story created; implementation has not started. | Planning only. |
| 2026-10-25 | Replaced the earlier quote prototype with categorized batch fetching, interval settings, deterministic interval selection, and a bundled attributed famous-person fallback. Removed personal quote entry. | Initial service choice later proved to require registered access for browser API use; see 2026-10-26 service replacement below. |
| 2026-10-25 | Removed visible offline/fallback status copy and added a per-widget quote font-size setting. | Code added; visual review at all sizes remains pending. |
| 2026-10-26 | Switched the remote source to Quotable’s public no-key batch endpoint after ZenQuotes rejected requests without an API key. | The Quotable hostname later failed DNS resolution in the user's browser; see the 2026-10-26 provider replacement entry. |
| 2026-10-26 | Marked Done at the user's direction. | Implementation is in `0475461`; remote fetch, category filters, cache, fallback, and installed-extension CSP checks remain pending. |
| 2026-10-26 | Replaced the DNS-failing Quotable host with the documented no-auth DummyJSON quotes collection, capped each response at 100 items, and moved category filtering into the extension. Updated CSP, host access, and cache namespace. | DummyJSON documents its quotes list and `limit`/`select` parameters. Reload the unpacked extension; live API and category behavior remain unverified. |

## Completion record

- Implementation / PR: Commit `0475461` (`feat: Implement offline widgets for notes, quotes, and image carousel`)
- Verification evidence: Not run for this completion update.
- Remaining limitations: Verify DummyJSON reachability, local category matches, and fallback behavior in Brave.
