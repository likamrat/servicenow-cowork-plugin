# Cowork plugin setup

Start with the [local checks](README.md#get-started). You need Node.js 24+ and
the instance owner's approval to use a least-privilege ServiceNow read account.

## Run the MCP server

Supply these variables through a protected process environment or secret manager:

| Variable | Value |
|---|---|
| `SERVICENOW_INSTANCE` | Your instance's HTTPS origin, without a path |
| `SERVICENOW_USERNAME` | Account authorized to read incidents and changes |
| `SERVICENOW_PASSWORD` | Account password |
| `PORT` | An unused local port; default `3001` |

Keep credentials out of chat, shell history, files, logs and packages.
The server does **not** load `.env` files; `.env.example` is a reference only.

From `mcp-server`, with the variables set:

```sh
npm start
```

The server listens on loopback. `GET /health` checks ServiceNow access:
HTTP `200` means connected; `503` means the check failed.

## Build the plugin package

Cowork needs a reachable HTTPS endpoint ending in `/mcp`.
You provide the hosting; this project does not provision it.

> **Access warning:** there is no client authentication or per-user authorization.
> Anyone who can reach the endpoint can read through the configured account.
> Stop before shared or sensitive use until access controls are implemented and reviewed.

Obtain separate approval for hosting, access changes, sign-in and upload.

Copy [package.example.json](package.example.json) to `package.local.json` at the
repository root. Replace the non-working examples:

- `appId`: your app's UUID; keep it when updating the same app.
- `mcpServerUrl`: your approved HTTPS `/mcp` endpoint.
- `websiteUrl`, `privacyUrl`, `termsOfUseUrl`: your developer and policy pages.

Set `acknowledgeUnauthenticatedEndpoint` to `true` only after the operator approves
the exposure. Keep credentials out of this file and leave `plugin/manifest.json` unchanged.

From `mcp-server` on Windows:

```powershell
npm run package -- --config ..\package.local.json
```

On macOS/Linux, use `../package.local.json`.
Output: `dist/configured/servicenow-for-cowork.zip` at the repository root.
The build checks configuration syntax; it neither verifies the endpoint nor uploads anything.

## Install and verify

Use the approved personal or tenant installation path in
[Microsoft's Cowork guide](https://learn.microsoft.com/en-us/copilot/cowork/cowork-plugin-development).
Upload the configured ZIP, not the template or source archive.

1. In a fresh Cowork conversation, look up an authorized incident by number. Confirm its source link opens the same record.
2. Try an IT symptom without a number. Inspect the tool calls before claiming ServiceNow was selected.
3. If Microsoft 365 context was requested, check its separate citations. Distinguish no matches from unavailable tools or denied access.

Keep these checks read-only. Local tests do not prove Cowork routing or Microsoft
365 access; the plugin supplies no Microsoft 365 connection.

Cowork discovers tools from the running server's `tools/list`.
Editing a packaged description alone does not update that server.

## Before sharing source

From `mcp-server`:

```sh
npm run check:distribution
npm run package -- --source
```

Review `dist/source/servicenow-for-cowork-source.zip` before separately approving
publication. The scan is targeted, not a complete secret audit.

For a new public repository, use the reviewed export rather than copying
development history. Keep configured ZIPs and local settings private; retain
LICENSE and NOTICE in any distribution.
