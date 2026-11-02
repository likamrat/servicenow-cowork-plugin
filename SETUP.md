# Cowork plugin setup

This guide covers the four-tool, read-only package. Its connector uses
authorization `None`, so it cannot use the shared MCP's supported remote Cowork
route, which requires OAuth. The compatible legacy server is loopback-only.
There is no supported remote setup for this package with that shared backend.

## Before you start

- A Microsoft 365 work account with Cowork access and permission to install
  personal plugins. Your tenant's administrator controls that permission.
- Node.js 24+ for the packaging and installation tools. If you are building the
  package yourself, use Git to download this repository.
- An existing, separately approved compatible backend before configuring or
  installing a package. This repository does not supply that deployment.

If an operator has already given you a configured ZIP for this client, confirm
its endpoint and exposure approval with them, then skip to installation.

## 1. Confirm the backend connection

The shared MCP's [legacy read-only server](https://github.com/likamrat/servicenow-mcp/blob/main/docs/DEVELOPMENT.md#legacy-anonymous-read-only-server)
(`npm start`, `src/server.js`) is for local compatibility checks. Keep it on
loopback; tunneling it is not a supported Cowork deployment path. The shared
backend's remote route needs a matching OAuth client, not this `None` package.

Proceed with configuration and installation only if your operator already
supplies a separately approved HTTPS `/mcp` endpoint using Streamable HTTP that
is compatible with this client. The operator must verify the four incident/change
tools, six-month updated-record restriction and 20-result search limit.
If you do not have that backend, stop before the build and installation steps.
The maintainer checks below can run without a live connection.

**Anyone who can reach a `None` endpoint can read its exposed fields through the
configured ServiceNow account.** Personal installation or "Only you" visibility
does not authenticate requests. Exposure approval does not add authentication,
and this guide provides no secure hosting solution for an anonymous endpoint.
Do not disable server authentication or point this package at an administrative
listener. Direct localhost and stdio do not give Cowork a remote connection.

Keep ServiceNow credentials in the backend's protected environment or credential
provider, never in the package, local configuration, chat or logs.

## 2. Build a configured package

For a new checkout, run the commands below. If you already have a checkout,
run only `npm ci` from its root:

```sh
git clone https://github.com/likamrat/servicenow-cowork-plugin.git
cd servicenow-cowork-plugin
npm ci
```

Copy `package.example.json` to `package.local.json` in the repository root.
Replace the examples with:

- `appId`: the app's UUID. For a new app, generate one with
  `node -p "require('node:crypto').randomUUID()"`; keep the existing ID for updates.
- `mcpServerUrl`: the operator-approved HTTPS `/mcp` URL.
- `websiteUrl`, `privacyUrl`, `termsOfUseUrl`: your developer and policy pages,
  required by the Microsoft 365 app manifest.

Set `acknowledgeUnauthenticatedEndpoint` to `true` only after the operator approves
the exposure. Leave `plugin/manifest.json` unchanged. From the repository root:

```sh
npm run package -- --config package.local.json
```

The output is `dist/configured/servicenow-for-cowork.zip`. The build checks local
configuration and the pinned tool descriptions; it does not verify the endpoint,
start a service or upload the package. Keep this configured ZIP and local settings
private. The template and source ZIPs are not installable replacements.

## 3. Install for your account

Use the personal installation path in
[Microsoft's Cowork plugin guide](https://learn.microsoft.com/en-us/copilot/cowork/cowork-plugin-development#step-7-test).
Install Microsoft 365 Agents Toolkit if you do not already have it:

```sh
npm install -g @microsoft/m365agentstoolkit-cli
```

After approval to sign in and install, run these from the repository root.
For a supplied ZIP, replace the file path with its location. Sign in with the
work account you use for Cowork:

```powershell
atk auth login
atk install --file-path "dist\configured\servicenow-for-cowork.zip" --scope Personal
```

Save the returned `TitleId` and `AppId` with the uploaded package. In **Plugins**,
check the Cowork plugin list or **Manage all** for **ServiceNow for Cowork**.
If your organization distributes plugins centrally, give the configured ZIP to
your administrator for the approved tenant installation instead.

Adding MCP to a coding assistant does not install this Cowork plugin.

## 4. Make a first request

Start a new Cowork conversation and ask:

```text
Find recent ServiceNow incidents with VPN in the title and include their source links.
```

Cowork should call `search_incidents` and return linked matches or explain that
no matching recent titles were found. Returned links should belong to the intended
ServiceNow instance. A successful empty search is valid; missing tools, denied
access and failed requests are not empty results. Do not create a record to make
the check pass.

The plugin supplies no Microsoft 365 connection. Requests for Microsoft 365
background require tools that are separately available and authorized in Cowork.

## Updates and connection problems

Before changing an existing installation, record its app identity, installed
publication label, endpoint URL, authentication type and matching uploaded ZIP.
Have the app owner apply a reviewed replacement through the original installation
channel, retaining the app ID. Rebuilding a ZIP does not replace an installed app.
Keep host publication labels separate from source versions; do not change either
just to repair a connection.

Client and backend updates are separate. Changing the endpoint URL or updating
the backend does not give this client OAuth support or additional workflows.
The server must continue to match the four-tool contract.

If a request fails, ask the operator to check MCP initialization, `tools/list`
and the request to the intended ServiceNow instance. Distinguish an unreachable
endpoint, source-access denial and a successful empty query. An enabled card,
a health response or a loaded skill alone does not prove a ServiceNow read.
Diagnose the installed route before replacing connectors.

## Maintainer checks

These local checks need no ServiceNow credentials:

```sh
npm run check
npm test
npm run check:distribution
```

`package.json` pins the shared contract version and normalized SHA-256.
To compare the generated `plugin/mcp-tools.json` with an approved backend checkout,
replace the path below with that checkout's `contracts/cowork-tools.json`:

```powershell
npm run contract -- --check ..\servicenow-mcp\contracts\cowork-tools.json
```

`--sync` regenerates the snapshot only from the pinned contract. Review the
version and hash before an intentional upgrade. Cowork requires packaged tool
descriptions that match the backend; dynamic discovery is host-dependent.
Changing an endpoint or its `tools/list` does not add missing client capabilities.

For source distribution, run `npm run package -- --source` and review
`dist/source/servicenow-for-cowork-source.zip` before approving publication.
The scan is targeted, not a complete secret audit. Use the reviewed export for
a new public repository rather than copying development history. Retain LICENSE
and NOTICE in distributions.

An assisting agent must preserve the read-only tools, limits and skills; report
failures; and obtain separate approval for deployment, external access, access
changes, sign-in and installation. Do not push or publish as part of setup.
