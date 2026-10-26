# TT2-021: Investigate and add news headlines

- **Type:** Story
- **Phase:** Connected and advanced roadmap
- **Priority:** P1
- **Status:** In progress — curated RSS implementation added; verification pending
- **Owner:** Unassigned
- **Dependencies:** [TT2-002](TT2-002-widget-registry-and-lifecycle.md), [TT2-003](TT2-003-versioned-storage-and-migration.md), [TT2-005](TT2-005-glass-shell-and-widget-gallery.md)
- **Plan:** [Version 2.0.0 plan](../plan.md)

## User story

As a user, I want headlines from sources I choose so that I can glance at the news without leaving my dashboard.

## Scope and implementation notes

- Use selected curated HTTPS RSS feeds directly; available sources include BBC News, The Guardian, CNN, Fox News, The New York Post, and The Hindu. Arbitrary user-entered feeds are out of scope for this slice.
- Keep the display to publisher, headline, publication time, and article link. Do not scrape article bodies.
- Use a user gesture to grant optional access to selected feed hosts; keep feed hosts in extension CSP and request only selected origins.
- Share each source's cache across widgets/tabs, bound response size/items, show freshness and stale-cache behavior, and validate outbound HTTPS links.
- TT2-020 is deferred with Customization Polish; this slice localizes feed failures and serializes requests with Web Locks.
- Keep source content as untrusted data and document network data usage.

## Acceptance criteria

- [ ] Selected feed terms permit this personal, non-commercial use; source attribution and feed-provided branding are retained. CNN, New York Post, and The Hindu terms and current endpoints still need release verification.
- [ ] The widget shows source attribution and freshness and handles unavailable feeds without breaking the canvas.
- [ ] No remote JavaScript, scraped full article bodies, or packaged secret credentials are introduced.
- [ ] Requests are bounded and shared across matching widget instances.

## Verification

Verify selected feed URLs, publisher terms, permission flow, stale-cache handling, and article links in the installed extension. Re-check feed terms and availability before release.

## Progress checklist

- [x] Confirm implementation details and resolve story-specific open questions.
- [x] Implement the agreed scope.
- [ ] Complete acceptance criteria and appropriate verification.
- [ ] Record evidence, limitations, and relevant documentation changes.
- [ ] Update this story and the central plan to Done.

## Work log

| Date | Update | Evidence / blocker |
| --- | --- | --- |
| 2026-10-24 | Story created; implementation has not started. | Planning only. |
| 2026-10-26 | Promoted TT2-021 to active work at the user's direction, deferring Customization Polish. Chose curated direct RSS feeds from BBC and The Guardian; selected sources require optional host access. | BBC publishes official RSS feeds and terms requiring prominent attribution; The Guardian documents RSS for personal, non-commercial use. See [BBC feed list](https://support.bbc.co.uk/platform/feeds/NewsFeeds.htm), [BBC RSS terms](https://downloads.bbc.co.uk/usingthebbc/bbc_terms_of_use_31March2022english.pdf), and [Guardian RSS guidance](https://www.theguardian.com/help/feeds). |
| 2026-10-26 | Added a list-style news widget with feed-provided logo when available (agency monogram otherwise), publisher/headline/time, safe article links, source and refresh settings, optional feed-host permission request, per-feed shared cache, and local stale content. | Code/docs updated; installed-extension permissions, feed response shapes, source branding, cache, and visual review remain pending. |
| 2026-10-26 | Expanded per-widget source choices with CNN, Fox News, New York Post, and The Hindu feeds; added their feed origins to CSP and optional host permissions. | Fox's official RSS list documents its selected endpoints and RSS terms. CNN, New York Post, and The Hindu endpoints need current feed and terms verification before release. MS NOW's current general-news feed URL could not be verified. The Washington Post is excluded because its RSS terms require registration and prohibit local storage/archiving, which this widget uses. |

## Completion record

- Implementation / PR: Pending
- Verification evidence: Pending
- Remaining limitations: Pending
