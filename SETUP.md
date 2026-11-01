# Cowork plugin setup

Start with the [local checks](README.md#get-started), using Node.js 24+.
This repository builds the client package; it does not start a backend,
provision hosting, change access or install anything in Cowork.

## Select the shared MCP endpoint

The [shared ServiceNow MCP](https://github.com/likamrat/servicenow-mcp) owns
instance configuration, authentication and server operation. Use its read-only
HTTP entrypoint with an account authorized for the intended instance. Preserve
the four incident/change tools, six-month updated-record restriction and
20-result search limit. Administrative capabilities belong to a separate
interface and must never be exposed as the Cowork endpoint.

For an existing installation, first record its actual plugin/app identity,
installed publication label, configured MCP URL, authentication type and
matching uploaded package. Source examples and an enabled connection card
do not establish the installed route. Keep any host-managed publication label
separate from the source package version; do not silently change identity or
bump/downgrade a version to repair connectivity.

Cowork requires a reachable HTTPS `/mcp` endpoint using Streamable HTTP.
[Microsoft documents a development tunnel for a local server](https://learn.microsoft.com/en-us/copilot/cowork/cowork-plugin-development#test-a-connector-against-a-local-mcp-server);
the server need not be cloud-hosted. A tunnel still exposes it externally and
requires explicit approval. Use a separate restricted listener, not an existing
administrative port. Record the tunnel owner, lifetime and stop procedure.
Direct localhost, stdio and bundling server files in the ZIP do not provide
that remote connection.

Keep credentials in the backend's protected environment or credential provider,
never in this repository, package configuration, chat, logs or ZIPs.

## Build the plugin package

> **Access warning:** the manifest uses authorization `None`. Anyone who can
> reach the endpoint can read the exposed fields through its configured account.
> Cowork's "Only you" visibility does not authenticate MCP requests. A private
> tunnel's interactive login is not automatically compatible with Cowork.
> Review supported access controls before exposing sensitive records.

Obtain separate approval for starting services, external access, sign-in and upload.

Copy [package.example.json](package.example.json) to `package.local.json` at the
repository root. Replace the non-working examples:

- `appId`: your app's UUID; keep it when updating the same app.
- `mcpServerUrl`: your approved HTTPS `/mcp` endpoint.
- `websiteUrl`, `privacyUrl`, `termsOfUseUrl`: your developer and policy pages.

Set `acknowledgeUnauthenticatedEndpoint` to `true` only after the operator approves
the exposure. Keep credentials out of this file and leave `plugin/manifest.json` unchanged.

From this repository root:

```sh
npm run package -- --config package.local.json
```

Output: `dist/configured/servicenow-for-cowork.zip` at the repository root.
The build checks configuration syntax; it neither verifies the endpoint nor uploads anything.

## Install and verify

Use the approved personal or tenant installation path in
[Microsoft's Cowork guide](https://learn.microsoft.com/en-us/copilot/cowork/cowork-plugin-development).
Upload the configured ZIP, not the template or source archive.

1. Against the configured endpoint, verify MCP initialization and `tools/list`
   expose exactly the four packaged tools. A health response alone is insufficient.
2. After installation approval, use a fresh Cowork conversation for one read-only
   incident search. Inspect actual tool execution and correlate it with the
   restricted server's request to the intended ServiceNow instance. A successful
   authenticated empty result is valid connectivity proof; do not create records
   to make the check pass.
3. If a record is returned, confirm its original source link belongs to the
   intended instance. For a symptom-based request, inspect the selected tools.
   Microsoft 365 citations require separately authorized Microsoft 365 tools.

Keep these checks read-only. Local tests do not prove Cowork routing or Microsoft
365 access; the plugin supplies no Microsoft 365 connection.

Distinguish these outcomes: missing tools, unreachable endpoint, authentication
or source-policy denial, successful empty query, successful returned records.
Finding a skill without an MCP invocation proves neither a source read nor an
empty instance. Diagnose the actual installed route before changing a connector.
An assistant's suggestion of a different connector is not a diagnosis.

## Shared tool contract

`package.json` pins the shared MCP version and normalized SHA-256 of
`contracts/cowork-tools.json`. `plugin/mcp-tools.json` is the generated client
snapshot; package builds reject drift. Compare it with an approved shared checkout:

```powershell
npm run contract -- --check ..\servicenow-mcp\contracts\cowork-tools.json
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
