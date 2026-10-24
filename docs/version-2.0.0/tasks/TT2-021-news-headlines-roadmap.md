# TT2-021: Investigate and add news headlines

- **Type:** Story
- **Phase:** Connected and advanced roadmap
- **Priority:** P2
- **Status:** Roadmap
- **Owner:** Unassigned
- **Dependencies:** [TT2-002](TT2-002-widget-registry-and-lifecycle.md), [TT2-003](TT2-003-versioned-storage-and-migration.md), [TT2-005](TT2-005-glass-shell-and-widget-gallery.md), [TT2-020](TT2-020-performance-and-resilience.md)
- **Plan:** [Version 2.0.0 plan](../plan.md)

## User story

As a user, I want headlines from sources I choose so that I can glance at the news without leaving my dashboard.

## Scope and implementation notes

- Evaluate licensed APIs and/or RSS feeds for attribution, terms, availability, CORS, and optional host permissions.
- Decide whether curated sources or arbitrary feeds are supported; document whether a backend is required.
- Define source/topic settings, refresh policy, shared cache, timestamps, offline state, and safe outbound links.
- Keep source content as untrusted data and document network data usage.

## Acceptance criteria

- [ ] A provider decision records terms, cost, attribution, quotas, privacy, and permission requirements before integration.
- [ ] An implemented slice shows source attribution and freshness and handles unavailable feeds without breaking the canvas.
- [ ] No remote JavaScript, scraped full article bodies, or packaged secret credentials are introduced.
- [ ] Requests are bounded and shared across matching widget instances.

## Verification

Roadmap only for 2.0.0. Investigate current primary provider documentation before estimating or committing delivery.

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
