# TT2-022: Investigate and add a stock watchlist

- **Type:** Story
- **Phase:** Connected and advanced roadmap
- **Priority:** P2
- **Status:** Roadmap
- **Owner:** Unassigned
- **Dependencies:** [TT2-002](TT2-002-widget-registry-and-lifecycle.md), [TT2-003](TT2-003-versioned-storage-and-migration.md), [TT2-005](TT2-005-glass-shell-and-widget-gallery.md), [TT2-020](TT2-020-performance-and-resilience.md)
- **Plan:** [Version 2.0.0 plan](../plan.md)

## User story

As a user, I want a small watchlist so that I can see recent prices and changes for markets I follow.

## Scope and implementation notes

- Investigate market coverage, symbol lookup, exchange/currency metadata, licensing, delayed data, quotas, attribution, and cost.
- Choose a viable provider and credentials model; never package a shared secret in the extension.
- Define watchlist settings, cache/refresh rules, timestamps, market-closed states, and data-unavailable states.
- Document requests, optional access, credential storage/omission rules, and any backend dependency.

## Acceptance criteria

- [ ] Provider feasibility is documented before implementation or release scope is expanded.
- [ ] Displayed prices include currency, freshness, and whether data is delayed when applicable.
- [ ] Rate limits and errors preserve cached data with an honest stale indicator.
- [ ] Credentials are excluded from exports, logs, and repository files.
- [ ] No claims of guaranteed real-time or trading-grade pricing are made without supporting provider terms.

## Verification

Roadmap only for 2.0.0. Verify current provider documentation and sample responses before selecting an API.

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
