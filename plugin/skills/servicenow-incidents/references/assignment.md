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

Use `lookup_users` with exact directory-returned email and/or login, with the
appropriate `field`; union and deduplicate distinct source results. When only
incident tools are authorized, `resolve_incident_assignee` can resolve an
existing source identity, but it cannot create one. Names and email addresses
are selectors, not immutable identities.

Only `unique` identifies one candidate; stop on `ambiguous` or `incomplete`.
Inspect the exact source user with `get_user` when authorized. Never choose the
first similar name, invent a directory mapping, overwrite an existing identity
or treat a failed/truncated lookup as proven absence.

If complete exact lookups establish no source match and the requested workflow
requires creation, follow `servicenow-users`: inspect `get_user_schema`, verify
`User.Manage` and the reviewed source profile policy, and use `create_user` with
actual discovered login/profile data. Keep the directory ID as context, not an
unsupported source field; the source `sys_id` must come from ServiceNow.

**Preflight the complete continuation before creating.** Use `inspect_user_access_policy`
under `User.Access.Manage` as described in `servicenow-users`. Creation defaults
to inactive, locked, notification-disabled and no access;
`assignee_readiness: not_evaluated` is not readiness. Match a qualified policy to
actual source qualifiers. Do not invent commands, bundle privileges into `profile`
or assume a role is neutral. If that path is unavailable, report the exact
capability/policy gate before creating avoidable unusable accounts.
Do not substitute manual upfront account setup.

If creation succeeds but a later stage fails, retain its returned identity and
operation receipt, and report the incomplete stage. If creation is uncertain,
use `get_user_operation` with the original operation ID; do not create again,
switch IDs or use a later email match as proof that this attempt created it.

## Assign and verify

Reference existence and directory membership are not assignment eligibility.
Follow `servicenow-users` for assessed, authorized MCP access continuation.
Once the exact source user and required eligibility are established, refresh
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
