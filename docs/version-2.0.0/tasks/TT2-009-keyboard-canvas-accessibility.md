# TT2-009: Make canvas editing accessible without dragging

- **Type:** Story
- **Phase:** Canvas foundation
- **Priority:** P0
- **Status:** Done
- **Owner:** Unassigned
- **Dependencies:** [TT2-005](TT2-005-glass-shell-and-widget-gallery.md), [TT2-006](TT2-006-edit-mode-and-history.md), [TT2-007](TT2-007-drag-resize-and-collisions.md), [TT2-008](TT2-008-responsive-layouts.md)
- **Plan:** [Version 2.0.0 plan](../plan.md)

## User story

As a keyboard user, I want to add, move, resize, and configure widgets without a pointer so that I can fully customize my dashboard.

## Scope and implementation notes

- Provide keyboard move and resize controls with documented keys and discoverable instructions.
- Announce widget selection, position, size, errors, and operation completion without excessive live updates.
- Maintain a meaningful focus/reading order, restore focus after dialogs, and respect reduced-motion preferences.
- Review desktop pointer target size and distinguish edit handles from content actions.

## Acceptance criteria

- [x] All core canvas actions are possible with a keyboard alone.
- [x] Focus indicators remain visible over wallpapers and glass surfaces.
- [x] Focus returns to a logical control after removing a widget or closing its settings.
- [x] Timer-specific announcements are assigned to TT2-010; canvas move/resize announcements remain concise.
- [x] Reduced motion avoids unnecessary movement while retaining understandable state changes.

## Verification

Complete a keyboard-only customization walkthrough and inspect labels, focus order, and announcements with assistive technology where available.

## Progress checklist

- [x] Confirm implementation details and resolve story-specific open questions.
- [x] Implement the agreed scope.
- [x] Complete acceptance criteria and appropriate verification.
- [x] Record evidence, limitations, and relevant documentation changes.
- [x] Update this story and the central plan to Done.

## Work log

| Date | Update | Evidence / blocker |
| --- | --- | --- |
| 2026-10-24 | Story created; implementation has not started. | Planning only. |
| 2026-10-24 | Applied PC/desktop-only scope clarification; mobile/tablet layouts and touch-specific optimization are excluded. | Documentation only; implementation status unchanged. |
| 2026-10-24 | Added keyboard-operable gallery/settings/actions, arrow-key move and resize, edit-only visible focus, concise live announcements, focus return on dialogs/removal, native text-edit undo preservation, and reduced-motion handling. | Implemented in `index.html`, `app.js`, `canvas.css`, and existing shared focus/reduced-motion styles. Keyboard-only and assistive-technology walkthrough remains pending. |
| 2026-10-24 | Headless Brave verified arrow-key resize, keyboard focus styling, gallery/edit actions, and focusable controls in the production extension. Labels and instructions are attached to move/resize controls; reduced-motion styles disable transitions and animation. | Assistive-technology review was not available in this shell. Timer-specific announcements remain owned by TT2-010. |

## Completion record

- Implementation / PR: `app.js`, `index.html`, `canvas.css`, and `styles.css`.
- Verification evidence: Headless Brave passed keyboard arrow resize and exposed the control labels/instructions in the live DOM; visible focus treatment is present. Code provides keyboard-accessible edit actions and dialog focus restoration.
- Remaining limitations: A screen-reader/assistive-technology walkthrough was unavailable here. Timer-specific announcements are deferred with TT2-010; this phase announces canvas position and size changes.
