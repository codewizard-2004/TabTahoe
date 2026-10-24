# TT2-018: Add theme-safe canvas and widget appearance controls

- **Type:** Story
- **Phase:** Customization polish
- **Priority:** P1
- **Status:** Todo
- **Owner:** Unassigned
- **Dependencies:** [TT2-005](TT2-005-glass-shell-and-widget-gallery.md), [TT2-008](TT2-008-responsive-layouts.md)
- **Plan:** [Version 2.0.0 plan](../plan.md)

## User story

As a user, I want control over spacing and presentation while retaining a coherent glass dashboard.

## Scope and implementation notes

- Provide bounded canvas gap/padding settings and per-widget title visibility, density, and restrained accent choices.
- Reuse glass fill, border, shadow, filter, control, and action tokens for all existing and new surfaces.
- Ensure global opacity reaches widget editors, nested views, galleries, menus, and transient feedback.
- Document supported customization boundaries; do not expose arbitrary CSS in the core experience.

## Acceptance criteria

- [ ] Every app-owned surface retains frosted translucency, rounded corners, light borders, and inset highlights.
- [ ] Appearance settings persist, participate in appropriate edit history, and survive desktop window resizing.
- [ ] Labels, placeholders, error messages, focus rings, and primary actions remain readable across supported opacity settings.
- [ ] Existing native select option fallbacks stay limited to browser-owned popup legibility.

## Verification

Review light/dark wallpapers at opacity extremes, desktop window sizes, and all dialogs listed in the repository visual requirements.

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
| 2026-10-24 | Applied PC/desktop-only scope clarification; mobile/tablet layouts and touch-specific optimization are excluded. | Documentation only; implementation status unchanged. |

## Completion record

- Implementation / PR: Pending
- Verification evidence: Pending
- Remaining limitations: Pending
