# TT2-017: Export and import validated canvas configurations

- **Type:** Story
- **Phase:** Customization polish
- **Priority:** P1
- **Status:** Todo
- **Owner:** Unassigned
- **Dependencies:** [TT2-003](TT2-003-versioned-storage-and-migration.md), [TT2-006](TT2-006-edit-mode-and-history.md), [TT2-015](TT2-015-image-viewer-widget.md)
- **Plan:** [Version 2.0.0 plan](../plan.md)

## User story

As a user, I want a portable canvas backup so that I can restore or share my arrangement.

## Scope and implementation notes

- Define a versioned JSON format and clearly distinguish layout configuration from full content backup.
- Export safe settings and portable text content where documented; exclude credentials, browser bookmarks, and large image blobs by default.
- Mark excluded local assets and private fields, and explain what will require reattachment.
- Validate schema, counts, bounds, IDs, content lengths, URLs, and file size before previewing an import.
- Apply import through a reversible draft and preserve the previous committed layout until Done.

## Acceptance criteria

- [ ] Export/import round trips the documented fields and communicates omissions before export/import.
- [ ] Invalid or unsupported files cannot partially overwrite the current canvas.
- [ ] Imported instance IDs are remapped safely and missing asset references show a repair state.
- [ ] Executable URLs, prototype-related keys, unknown types, and excessive dimensions/counts are rejected or safely handled.
- [ ] No credential or API secret appears in a shared export.

## Verification

Use round-trip fixtures, malformed files, unsupported versions, malicious URLs, missing assets, duplicate IDs, and oversized payloads.

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
