# TT2-023: Design a theme-safe custom content widget

- **Type:** Story
- **Phase:** Connected and advanced roadmap
- **Priority:** P2
- **Status:** Roadmap
- **Owner:** Unassigned
- **Dependencies:** [TT2-005](TT2-005-glass-shell-and-widget-gallery.md), [TT2-017](TT2-017-layout-export-and-import.md), [TT2-018](TT2-018-appearance-controls.md)
- **Plan:** [Version 2.0.0 plan](../plan.md)

## User story

As a user, I want a small custom content block so that I can display information the standard widgets do not cover.

## Scope and implementation notes

- Define an allowlist of headings, text, lists, links, and optionally images with inherited TabTahoe styles.
- Evaluate a locally bundled, maintained sanitizer; disallow scripts, inline event handlers, arbitrary styles, unsafe URLs, and active embeds.
- Specify markup limits, editing/preview behavior, link targets, and import validation.
- If richer executable content is ever proposed, treat isolation and permissions as a separate design decision rather than relaxing the main page policy.

## Acceptance criteria

- [ ] A documented allowlist and threat model define exactly what content can render.
- [ ] All rendered content remains inside the shared glass shell and cannot restyle the dashboard.
- [ ] Malformed markup and executable payloads are safely rejected or sanitized.
- [ ] No CSP relaxation or arbitrary code execution is introduced by this story.

## Verification

Roadmap only for 2.0.0. Before implementation, review current extension policy and test realistic sanitizer bypass and URL cases.

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
