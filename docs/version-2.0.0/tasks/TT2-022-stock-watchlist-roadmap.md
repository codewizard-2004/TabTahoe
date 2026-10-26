# TT2-022: Add a crypto watchlist; defer stocks

- **Type:** Story
- **Phase:** Connected and advanced roadmap
- **Priority:** P1
- **Status:** In progress — crypto-only tracker implemented; stocks deferred; verification pending
- **Owner:** Unassigned
- **Dependencies:** [TT2-002](TT2-002-widget-registry-and-lifecycle.md), [TT2-003](TT2-003-versioned-storage-and-migration.md), [TT2-005](TT2-005-glass-shell-and-widget-gallery.md)
- **Plan:** [Version 2.0.0 plan](../plan.md)

## User story

As a user, I want a crypto watchlist so that I can see recent prices, daily changes, and logos for coins I follow.

## Scope and implementation notes

- Add a list-style crypto watchlist with curated assets, quote currency, and refresh interval in widget settings.
- Use CoinPaprika's keyless public ticker API and logo CDN; show the API's required visible attribution.
- Cache data locally, serialize matching requests across tabs where supported, preserve stale values after errors, and show source freshness.
- Request optional host access from a user gesture. Document network requests and the free tier's personal-use limits.
- Stock tracking is deferred at the user's direction.

## Acceptance criteria

- [ ] CoinPaprika personal-use terms, provider responses, and logo CDN use are verified before release.
- [ ] Displayed prices include currency, freshness, daily change, and a clear delayed/snapshot caveat.
- [ ] Rate limits and errors preserve cached data with an honest stale indicator.
- [ ] Credentials are excluded from exports, logs, and repository files.
- [ ] No claims of guaranteed real-time or trading-grade pricing are made without supporting provider terms.

## Verification

Verify provider responses and CORS in the installed extension, symbols/currencies, logos and fallback marks, permissions, cache/stale behavior, refresh limits, and source terms before release.

## Progress checklist

- [x] Confirm implementation details and resolve story-specific open questions.
- [x] Implement the initial agreed scope.
- [ ] Complete acceptance criteria and appropriate verification.
- [ ] Record evidence, limitations, and relevant documentation changes.
- [ ] Update this story and the central plan to Done.

## Work log

| Date | Update | Evidence / blocker |
| --- | --- | --- |
| 2026-10-24 | Story created; implementation has not started. | Planning only. |
| 2026-10-26 | Promoted TT2-022 at the user's direction. Initially implemented a combined stock and crypto tracker, then removed stocks at the user's request after the first trial displayed no prices. Replaced the crypto provider with CoinPaprika's documented keyless ticker endpoint, switched to its timestamped per-coin responses, kept source logos and hourly-or-slower refresh, and added visible provider attribution and permission guidance. | CoinPaprika documents its browser-callable, keyless ticker API, 24-hour change fields, source timestamps, free personal-use limits, and required attribution. Verify CORS, logo CDN, permission flow, and rendering in the installed extension before release. See [CoinPaprika ticker API](https://docs.coinpaprika.com/api-reference/tickers/get-ticker-for-a-specific-coin), [CoinPaprika API limits and terms](https://coinpaprika.com/api), and [API terms](https://coinpaprika.com/api-terms-of-use/). Stock prices are deferred. |
| 2026-10-26 | Added Pi Network (PI) to the curated coin selector using CoinPaprika asset ID `pi2-pi-network`. | CoinPaprika identifies this asset and ticker endpoint on the [Pi Network listing](https://coinpaprika.com/coin/pi2-pi-network). |

## Completion record

- Implementation / PR: Pending
- Verification evidence: Pending
- Remaining limitations: Pending
