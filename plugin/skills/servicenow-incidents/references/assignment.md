# Directory-first assignment

This is an agent-composed workflow over generic capabilities, not a separate
provisioning service. Work IQ supplies context to the agent; the ServiceNow MCP
does not depend on Work IQ or verify directory identity from supplied profile
fields. Never send a fabricated `directory_verified` assertion.

Handle ordinary freeform assignment requests: these instructions carry the workflow.
The human supplies the intended incident and person, not a tool recipe, email, directory ID or creation choreography.
Ask only for genuine identity ambiguity, missing permitted context or required
authorization. Assignment intent does not itself authorize account or access grants;
use separately qualified workflow authorization and honor real confirmation gates.

Creation, eligibility changes and assignment must originate in Cowork through
the delivered authenticated MCP tools. Do not replace `create_user` with
direct ServiceNow API writes, manual pre-provisioning or a legacy private
backend. The MCP's internal source transport is expected, not a client workaround.

## Resolve the person in the permitted sources

Resolve the person afresh, including future directory users added after deployment.
Do not rely on example names, preconfigured person IDs, person allowlists or
manually prepared source accounts. Retain exact identities only as evidence for
the current workflow and its recovery, not as a substitute for current resolution.

For a name-only request, use the actual Work IQ or organization-directory tools
available in the current Cowork tenant. Native people search or structured
directory/profile retrieval can provide a directory ID, display name, technical
login and email. Use the advertised tools and fields; do not invent a tool prefix,
SQL table, email address, tenant field or split a full name into guessed profile
parts. Directory users and personal contacts are different entities.

Keep technical login/email handling internal. Do not ask the user for email as
the normal handoff. If several people match, ask which person using grounded
distinguishing details rather than choosing the first row.

Honor explicit source restrictions. If directory access is excluded, do not
silently use it: an exact existing ServiceNow identity may still be resolved
within that scope, otherwise report the missing permitted context. A previous
source restriction is not implicitly erased by the next request. Never substitute
another tenant or a coding assistant's corporate Work IQ connection.

## Resolve or create the source user

Use `resolve_incident_assignee` with an exact permitted selector for incident
assignment. If `lookup_users` is also authorized, use exact directory-returned
email/login with the appropriate `field`; union and deduplicate distinct results.
Neither lookup creates a user. Names and email addresses
are selectors, not immutable identities.

Only `unique` identifies one candidate; stop on `ambiguous` or `incomplete`.
Inspect the exact source user with `get_user` when authorized. Never choose the
first similar name, invent a directory mapping, overwrite an existing identity
or treat a failed/truncated lookup as proven absence.

With `unique` existing source identity and no known source restriction requiring
account/access changes, use the incident workflow under `Incident.Manage`.
`User.Manage`, `User.Access.Manage` and access assessments are not
prerequisites for ordinary assignment. Identity resolution is not an eligibility certificate:
source ACLs/rules and the guarded incident operation remain authoritative.
Stop on a real rejection or unknown write; do not grant access as a workaround.

If complete exact lookups establish no match and creation is separately authorized,
read `servicenow-users`. Use `get_user_schema` and `create_user` under `User.Manage`
with actual discovered profile data and the reviewed source policy.
Directory IDs are context; use only the ServiceNow-returned `sys_id`.

**Preflight the complete continuation before creating.** `inspect_user_access_policy`
under `User.Access.Manage` must qualify needed eligibility changes against actual
source requirements. Creation defaults to inactive, locked, notification-disabled
and no access; `assignee_readiness: not_evaluated` is not readiness.
If that path is unavailable, stop before creating; no manual setup or privileges
hidden in `profile`.

Retain created identities, receipts and partial outcomes. For uncertain creation,
use `get_user_operation` with the original operation ID; do not create again or
treat a later email match as attribution.

## Assign and verify

After resolving an existing user, or completing separately authorized access changes, refresh
`get_incident` and use `update_incident` with its current `expected_mod_count`,
one retained operation ID and `values.assigned_to` set to the source user ID.
For explicit unassignment use JSON `null`. Do not put an email, display name
or directory object ID into `assigned_to`.

Change only the assignee and preserve the group and other fields unless the
user explicitly requested more. Reassignment must not clear the old assignee
first. Keep the authenticated requester, source execution account and target
assignee distinct.

Honor the real user authorization and required host confirmation. Independently
read back the assignment and preserved fields with original source links.
Use `get_incident_operation` for an uncertain incident write, without replay.
Do not report a completed assignment from user creation, an eligible candidate,
or a successful directory lookup alone.
