# Cowork plugin setup

Start with the [local checks](README.md#get-started), using Node.js 24+.
This repository builds the client package; it does not start a backend,
provision hosting, change access or install anything in Cowork.

## Required connection before installation

The [shared ServiceNow MCP](https://github.com/likamrat/servicenow-mcp) owns
instance configuration, authentication, generic incident/user operations and server operation.
Use its restricted authenticated Cowork HTTP entrypoint. Reads and incident
operations use that one backend and one connector, not separate assignment
products. Generic user profile CRUD uses its own authorization and source-policy
guards. Credentials, arbitrary role/group grants and executable configuration are
not ordinary profile fields or unrestricted administrative endpoints.
Preserve the six-month updated-ticket restriction and 20-result ticket search
limit; these are not directory or user-profile lookup windows.

An installable package requires both a reachable HTTPS endpoint and a real
Microsoft token-store OAuth registration for that endpoint. This repository
does not supply either. Installation or enabling a plugin cannot start a server,
create its OAuth configuration, or make localhost reachable from Cowork.

For an existing installation, first record its actual plugin/app identity,
installed publication label, configured MCP URL, authentication type and
matching uploaded package. Source examples and an enabled connection card
do not establish the installed route. Keep any host-managed publication label
separate from the source package version; do not silently change identity or
bump/downgrade a version to repair connectivity.

### Reuse backend authentication through OAuthPluginVault

[Cowork supports static OAuth through OAuthPluginVault](https://learn.microsoft.com/en-us/microsoft-365/copilot/extensibility/configure-plugin-mcp-servers#use-oauth-authentication).
Reuse the shared backend's supported Entra bearer-token validation and approved
ServiceNow credential provider. Do not copy credentials into this client or add
a second authentication service.

The incoming Cowork connection and the backend's outgoing ServiceNow login are
different boundaries. An existing ServiceNow login, native-app client or local
coding-assistant connection is not a Cowork OAuth registration.

For the combined route, review the backend's API audience, tenant, approved
OAuth client and the separately approved delegated `Incident.Manage`,
`User.Manage` and `User.Access.Manage` scopes. Incident-only tokens retain the
original ten tools; profile-only tokens expose eight user tools; access-only
tokens expose four policy-controlled access tools. All three expose twenty-two.
Do not silently extend an existing incident consent to user administration or
assume a capability implementation approves tenant-wide consent. New assignees
do not require authorizing every tenant caller to administer users; keep caller
consent at the least required exposure. The token
must identify the requester; never accept requester identity from tool arguments.
The source execution account and assignee remain distinct from that requester.
An authenticated requester or eligible assignee does not establish source ACL
permission.

Ordinary assignment to an existing, exactly resolved source user uses
`Incident.Manage`; it does not require the profile or access-administration
scopes. Missing user-administration tools are not a reason to block that incident
workflow or broaden consent. Identity resolution is not an eligibility certificate:
honor known source restrictions and the guarded incident operation's actual result.
User creation or access changes remain separate, authorized workflows.

The shared backend's `start:cowork` entrypoint uses an existing protected binding
directory and a private `cowork-profile.json` in its configured state directory.
The profile binds the instance, external URL, tenant, resource application GUID
audience and OAuth client GUID. Start connection qualification with
`writes_enabled: false`; enable writes only under the separate approved scope.
The default restricted listener is loopback port 3003. Keep it separate from
administrative listeners and follow the backend's own operational instructions.

Use an approved static OAuth client with the provider callback
`https://teams.microsoft.com/api/platform/v1.0/oAuthRedirect`. Register its
authorization/token endpoints, required delegated scope and protected client
credential in the Microsoft token store through Developer Portal. Include
`offline_access` when refresh is required. Bind the registration to the approved
base URL and organization. The current [MCP OAuth guidance](https://learn.microsoft.com/en-us/microsoft-365/copilot/extensibility/plugin-authentication-oauth#use-the-teams-developer-portal)
requires **Any Teams app** for Copilot MCP calls rather than a specific Teams
app restriction; **My organization only** supports a single-tenant deployment.
Changing an existing app restriction needs explicit access approval, not a
silent authentication workaround. A Cowork publication identifier, app manifest
ID and Entra client ID are distinct identifiers; do not substitute one for another.
New clients, scopes, secrets, consent and registration changes require their
applicable approvals; never broaden organization access to get past a sign-in failure.

The resulting OAuth registration ID is the manifest's `authorization.referenceId`.
It is **not** the Entra application/client ID, API audience, token or secret.
Entra does not provide the dynamic-client-registration endpoint needed for DCR.
API-key authentication is not currently supported by Cowork.

#### Different delegated grants on a shared registration

A shared static Scope field that explicitly requests all three API scopes can
send an ordinary incident user to an admin-consent gate even when that user
already has incident access. Inspect the actual authorization request and current
resource/client grants before changing anything: organization-wide incident
consent and operator-only user-administration consent are different grants.
Inventory the registration's consumers; narrowing it to `Incident.Manage` alone
can also remove required capabilities from privileged consumers.

For an existing, reviewed client/resource with the required delegated grants,
[Entra's `.default` scope](https://learn.microsoft.com/en-us/entra/identity-platform/scopes-oidc#default-when-the-user-gives-consent)
can select the resource scopes already granted for the signed-in user, including
applicable organization-wide consent. A static request can use
`<resource-application-ID-URI>/.default` plus `offline_access` when refresh is
required, without explicitly requesting the operator's administrative scopes
from every user. This does not create grants or a per-user configuration override.
When no applicable grant exists, or `prompt=consent` is forced, `.default` can
instead prompt for configured permissions; stop and qualify that consent rather
than accepting it as a connectivity fix.

Preserve the registration, client/resource identity, endpoint, audience and
existing grants. Verify the saved Scope field and the actual next OAuth request,
then audit a real read's tenant, requester and client before permitting writes.
Check both ordinary and required privileged consumers; a Connected badge is not
caller or capability proof. Cowork's separate **Always allowed** tool setting
does not grant OAuth scopes, source permissions or unsupported change-record
write capabilities.

Work IQ/directory context belongs to the agent, not this generic backend.
For a name-only assignment, the current host must supply an actual authorized
directory/people capability and usable structured identity/profile data.
Keep technical addresses internal; do not make the user paste an email as
the normal integration step. Do not use another tenant's coding-assistant
connection or fabricate a directory-verification flag. Generic user CRUD can
also use sufficient direct request data without a directory provider.

### Generic user profile and continuation policy

Before enabling source profile creation/update, qualify the backend's private
`user-profile-contract.json` against the actual source. `get_user_schema` exposes
schema/rule fingerprints, not review approval. The contract also requires
reviewed collision-query visibility, native username uniqueness, protected
identities and the disclosed source hooks. Do not copy discovery output into
a trusted policy merely to bypass a guard.

Creation uses ordinary supplied profile data and defaults to an inactive,
locked, notification-disabled human without a password, roles, groups or SSO
enrollment. Source hooks can still create/synchronize email devices or identity
metadata; updates while locked can revoke sessions. Preserve those effects
and incomplete outcomes instead of silently compensating.

Profile CRUD alone does not implement every create-to-assign continuation.
Before creating for an assignment, qualify the actual reference predicate and
separately supported lifecycle/access actions. A required incident role can
include inherited privileges; group membership and activation are not harmless
profile fields. Obtain the specific policy/permission where required, preserve
the complete role closure and native effects, and do not hardcode assumptions
about active status from a qualifier that does not require it.

Use `inspect_user_access_policy` without arguments to discover installed keys,
then inspect the relevant `policy` and require `policy_available: true` before
creating a source counterpart. Definition-specific inspection supplies review
evidence only, not approval. Keep definition policies closed by default and
qualified against full contained-role/ACL/source-hook evidence. They must not
contain a preconfigured list of assignee people.

Once the exact source user exists, `assess_user_access` creates a short-lived
caller-bound target/access snapshot. Apply only that assessment's reviewed
missing stages through `apply_user_access`, with its declared native-effect
acknowledgments and actual authorization. Preserve unrelated access and lock
state. Recover partial or uncertain stages through `get_user_access_operation`
without repeating grants or hiding failure by deleting the user.

If no authorized continuation is available, stop before avoidable creation
and report that exact gate, not an upfront manual account-setup requirement.
After an actual partial creation, retain the source identity and original
operation receipt. No password setup, duplicate create, new-UUID replay or
automatic account deletion is an implied recovery.

### Reach a locally operated backend

Cowork requires HTTPS `/mcp`, TLS 1.2 or later and Streamable HTTP.
[Microsoft documents a development tunnel for a local server](https://learn.microsoft.com/en-us/copilot/cowork/cowork-plugin-development#test-a-connector-against-a-local-mcp-server).
For ongoing local operation, use a separately approved persistent HTTPS development
tunnel forwarding only the restricted OAuth-enforcing listener. The relay may
be reachable publicly, but the MCP endpoint must reject requests without valid
authorization before exposing tools or records. A tunnel login page is not
Cowork OAuth and must not be used as evidence of working MCP authentication.

Before exposure, verify the restricted listener rejects anonymous, expired,
wrong-tenant, wrong-audience, wrong-client and insufficient-scope requests.
Never forward an administrative listener or revive an expired anonymous bridge.
Record the owner, exact port, availability policy and shutdown procedure. If no approved
route exists, stop at this prerequisite rather than publishing an unusable ZIP.
Direct localhost, stdio and bundling server files in the ZIP do not provide a
remote connection. End users install and activate the plugin; they should not
need a custom launcher.

### Availability, Stop and recovery

The installed plugin and its backend have separate lifecycles. Keep the plugin
enabled for users; do not stop the backend when a verification succeeds, a
conversation ends or one task completes. For an approved ongoing connection,
use explicit operator **Start** and **Stop**, not an artificial hourly timer.
A separately time-limited grant must still end on its own approved boundary.

Create the persistent relay once and host that exact resource on subsequent
starts. Normal Stop ends hosting and owned processes, **not** the relay resource,
private state, operation journals, OAuth registration or installed plugin.
Deleting or replacing the resource can strand the plugin and vault on an old
URL. If that already happened, verify the replacement's real URL and repair the
existing bindings once; never silently create new URLs during recovery.

[Provider retention is separate from availability](https://learn.microsoft.com/en-us/azure/developer/dev-tunnels/faq):
persistent dev tunnels expire after inactivity (30 days by default), with new
activity moving that inactivity window forward. This is not an hourly Cowork
session limit or a guarantee that a URL exists forever. Check the actual resource
and access-control expiration independently. Dev tunnels have no production SLA;
local operation also depends on the computer being awake, its network and the
owned processes. No automatic OS startup or new hosting platform is implied.

Preserve explicit Stop intent durably. Recovery must not undo it. Before an
owned-process restart, verify process identity and creation time, the existing
relay/URL and exact protected state binding. Refuse restart when a lock or
unfinished operation needs reconciliation; never clear it or replay a source
write to make a connection test pass. Reuse the same source state and relay,
then verify protected protocol readiness and repeated read-only calls.

Distinguish planned Stop, a missing relay, a failed owned process, stale
plugin/vault URL bindings and actual OAuth errors. A credential-free MCP
initialize should reach the protected `401` challenge, not return an endpoint
`404`. That `401` proves reachability and rejection, not successful client
authentication. A source-backed empty lookup is different from either transport
failure. Do not repair endpoint loss by granting roles or regenerating secrets.

For tenant-wide distribution, use the supported tenant deployment controls for
the same app identity and verify visibility for another intended account.
The backend admits verified delegated identities from its configured tenant,
not only the operator who installed it. Source execution still uses the shared
configured ServiceNow account; it is not per-user ServiceNow impersonation.
Per-caller operation ownership and no-replay guards remain mandatory. Prove a
different account's own native sign-in and read-only call before claiming that
other presenters can use the integration; sharing visibility alone is not proof.

Keep credentials in the backend's protected environment or credential provider,
never in this repository, package configuration, chat, logs or ZIPs.

## Build the plugin package

Obtain separate approval for starting services, external access, sign-in and upload.

Copy [package.example.json](package.example.json) to `package.local.json` at the
repository root. Replace the non-working examples:

- `appId`: your app's UUID; keep it when updating the same app.
- `mcpServerUrl`: your approved HTTPS `/mcp` endpoint.
- `oauthRegistrationId`: the actual non-secret Microsoft token-store registration ID.
- `websiteUrl`, `privacyUrl`, `termsOfUseUrl`: your developer and policy pages.

Keep credentials out of this file and leave `plugin/manifest.json` unchanged.
The packager rejects anonymous authentication, extra connectors, loopback MCP
URLs and legacy unauthenticated-endpoint acknowledgements.

From this repository root:

```sh
npm run package -- --config package.local.json
```

Output: `dist/configured/servicenow-for-cowork.zip` at the repository root.
The build checks configuration syntax; it neither verifies the OAuth registration
or endpoint nor uploads anything.

## Install and verify

Use the approved personal or tenant installation path in
[Microsoft's Cowork guide](https://learn.microsoft.com/en-us/copilot/cowork/cowork-plugin-development).
Upload the configured ZIP, not the template or source archive.

1. Against the configured endpoint, verify authenticated MCP initialization and
   `tools/list` match the scope-appropriate subset of the pinned packaged contract.
   Qualify the combined catalog with all three reviewed scopes. Check anonymous access fails.
   A health response or direct native-client success is insufficient.
2. After installation and sign-in approval, use the intended tenant's Cowork
   session for one incident retrieval. Inspect actual connector execution,
   authenticated requester and the backend's request to the intended source.
   A successful empty query proves only that query's connectivity, not the
   required retrieval-and-assignment journey.
   Open the actual skill body used by the task and compare its workflow with
   the uploaded package. A current plugin version or connector does not prove
   that the task selected current skill content. If older personal or
   organizational copies coexist, establish the selected skill's origin and
   use supported selection/deactivation controls for stale content; names and
   icons alone do not identify a registration. Do not change source policy to
   compensate for an obsolete skill.
   The current identities are `servicenow-incidents`,
   `servicenow-changes` and `servicenow-users`. Verify those exact current
   child bodies rather than an older similarly named skill before assignment.
   For discovery, use the user's original business question without coaching
   title keywords. Verify the investigation reference was loaded and that
   related search hypotheses or the bounded fallback lead to inspected, relevant
   source records. Literal-title control queries diagnose retrieval but do not
   establish natural-language acceptance. Static skill tests check instructions,
   not whether the host's model follows them.
   If that first question asks who should investigate or requests system context,
   verify actual authorized Work IQ/Microsoft 365 retrieval and reads in the same
   first response. Require relevant document findings and responsibility evidence
   with returned citations alongside incident facts; plugin listings and search
   activity labels are insufficient. General documentation/ownership queries must
   not require a ticket number or symptom. Keep recorded assignment distinct from
   an evidence-supported recommendation and perform no write for this question.
   For script-assisted reads, require original source metadata to survive into
   the answer: document titles link to their source-returned URLs when available,
   or use native document citations. A helper-script citation is not an original
   document citation. Report a missing source link/provenance gap rather than
   inventing one. File-card rendering and project-memory errors are separate host
   outcomes; neither establishes whether source contents were read.
   Report exclusions, unavailable tools, denied access, failed requests and missing
   or unreadable evidence distinctly. Do not add technical instructions to the
   prompt or defer this acceptance condition to a later architecture question.
3. Use a fresh, normal freeform request such as "Can you assign this incident to
   Jordan Lee?" for the actual authorized target. Do not include a tool recipe,
   email, directory ID or creation choreography, or artificial source restrictions.
   Qualify a directory person without a preconfigured identity, person allowlist
   or manually prepared ServiceNow counterpart; future people added after
   deployment must follow the same dynamic path. Instructions, not the prompt,
   must resolve the named person through actual host-native directory tools, retain
   technical login/email internally, then reuse or create the exact source user
   through generic user CRUD only when the complete continuation is qualified.
   When absent, Cowork itself must invoke the delivered MCP `create_user`, then
   approved MCP eligibility tools and guarded incident update. Direct worker or
   coordinator source writes, manual pre-provisioning and legacy private-backend
   shortcuts do not qualify; the MCP's internal source transport is expected.
   Capture actual native tool invocations, verified caller and durable operation
   evidence. A directory-only diagnostic does not prove this complete journey.
   Honor the real Cowork confirmation/consent gates; annotations and tool
   arguments are not user approval. Do not fabricate a confirmation card.
4. Independently read the source record and compare the assignee identity,
   intended changed fields and preserved fields. Preserve the original source
   link and operation receipt. Report denied, stale, uncertain and no-change
   outcomes separately; recover uncertain writes read-only, without replay.
   When the request includes findings/notes, qualify supported internal journal
   append and independent note readback before either effect. Use the existing
   `update_incident` with `values.work_notes` and the assignee in the same guarded
   patch. Independently inspect caller-owned `get_incident_operation` evidence:
   `work_note` and `record_fields` are separate outcomes. Ordinary `get_incident`
   still excludes journals. Verify appended content and journal identity, not a
   description replacement or merely matching scalar state. The bounded note
   window and source visibility can leave evidence unknown; never repeat an
   uncertain append under another operation ID.
5. Qualify create, other updates and deletion only on their separately authorized
   targets, including source-side effects and any retention requirements.

Local tests, an installed package, an OAuth token exchange and direct backend
calls do not prove plugin-origin execution. The plugin supplies no Microsoft 365
connection; Microsoft 365 citations require separately authorized tools.

Distinguish these outcomes: missing tools, unreachable endpoint, authentication
or source-policy denial, successful empty query, successful returned records.
Finding a skill without an MCP invocation proves neither a source read nor an
empty instance. Diagnose the actual installed route before changing a connector.
An assistant's suggestion of a different connector is not a diagnosis.

## Shared tool contract

`package.json` pins the shared MCP version and normalized SHA-256 of
`contracts/cowork-authenticated-tools.json`. `plugin/mcp-tools.json` is the generated client
snapshot; package builds reject drift. Compare it with an approved shared checkout:

```powershell
npm run contract -- --check ..\servicenow-mcp\contracts\cowork-authenticated-tools.json
```

Use `--sync` instead of `--check` to regenerate the snapshot from that pinned
contract. Contract upgrades require an intentional version/hash review first.
These commands are offline and never load server code or credentials.
Cowork also discovers runtime tools through `tools/list`; updating the package
alone does not update a running server.

## Before sharing source

```sh
npm run check:distribution
npm run package -- --source
```

Review `dist/source/servicenow-for-cowork-source.zip` before separately approving
publication. The scan is targeted, not a complete secret audit.

For a new public repository, use the reviewed export rather than copying
development history. Keep configured ZIPs and local settings private; retain
LICENSE and NOTICE in any distribution.
