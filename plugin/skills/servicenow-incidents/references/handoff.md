# Handoff notes

Resolve "that incident" from the inspected conversation context. If there are
multiple plausible incidents and none was selected, ask which one before writing.
Resolve the assignee through [Directory-first assignment](assignment.md).
An existing eligible identity needs no account or access grant.

## Qualify the whole request

Before either requested effect, qualify both assignment and journal append/readback
through the current schema and delivered authenticated MCP capabilities.
If either capability is unavailable, stop before a partial assignment and report
the gap. A writable schema field is
not proof that notes can be persisted and independently verified.
Do not substitute direct API calls or an administrative connector.

Append to the supported internal `work_notes` field without replacing earlier
entries. Never replace `description` or use resolution `close_notes` as a handoff
workaround. Customer-visible `comments` require explicit intent and separate
support; this MCP does not support comments or other journal fields.

Carry concise observed findings, supporting source links, unresolved hypotheses and next checks.
A review request is not evidence that a rollout occurred.
Do not turn a hypothesis into a confirmed cause, claim a repair, or invent a
delivered notification. Unavailable Microsoft 365 context stays unavailable.

## Execute and reconcile

Refresh the selected incident's identity/version and preserve unrelated fields.
Honor the native confirmation gate for both requested effects.
For combined handoffs, use `update_incident` with `values.work_notes` and `values.assigned_to` in one
version-guarded patch and one retained operation UUID. Notes must be nonempty
strings within the discovered writable `journal_input` field length.
For notes-only requests, omit `assigned_to`.
Do not split the handoff to evade an unavailable capability.

Independently verify both the exact assignee and the appended note, including
content and journal identity; assignment alone is not a completed handoff.
Do not treat a scalar field comparison or an excluded journal field as append proof.
Report confirmed, partial, denied and uncertain effects.
Inspect `record_fields` and `work_note` separately. Note evidence is bounded to
20 entries; `not_observed`, `unknown` or `limitReached` never proves absence.

Recover the original `operation_id` read-only with `get_incident_operation`.
This caller-owned read returns only the requested note, not unrestricted history;
`get_incident` excludes journals. Preserve uncertainty after lost responses.
Never append again or reassign under a new ID.
Retain the original receipt; current matching text alone does not establish attribution.
