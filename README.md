# ServiceNow for Cowork

ServiceNow for Cowork is a Microsoft Copilot Cowork plugin for read-only access to
ServiceNow incidents and change requests. It brings recent ticket details and
original source links into IT investigations, alongside any Microsoft 365 context
available through Cowork's separately authorized tools.

## Get started

This client uses authorization `None`. The shared MCP's supported remote Cowork
route requires OAuth, which this package does not provide. Its compatible legacy
read-only server is for local use only.

[Setup](SETUP.md) explains package preparation and the prerequisites for installing
against an existing, separately approved compatible backend. This repository does
not supply that deployment. Do not expose the legacy listener or remove server
authentication to connect this package.

## Included skills

- [Incidents](plugin/skills/servicenow-incidents/SKILL.md): investigate workplace IT symptoms or look up a ticket.
- [Change requests](plugin/skills/servicenow-changes/SKILL.md): find changes and read their status.

## MCP tools

| Tool | Purpose |
|---|---|
| `search_incidents` | Find incidents by number, literal title substring, state, priority or assignee. |
| `get_incident` | Read an incident's description, impact and resolution notes by number. |
| `search_changes` | Find change requests by state, type or assignment group. |
| `get_change` | Read one change request by number. |

All four tools are read-only and return source links. All reads are limited to
records updated within six months; searches return up to 20 matches, newest update
first. Incident search is not semantic or full-record search.

Exact lookups return selected detail fields. Unlisted fields, including
`comments`, `work_notes` and `caller_id`, are excluded.

## Architecture

This repository is the thin Cowork client: two skills, the connector manifest,
generated tool descriptions and package tooling. The separately operated
[ServiceNow MCP](https://github.com/likamrat/servicenow-mcp) owns the backend.
Its operator manages ServiceNow credentials, hosting and endpoint access.
The package contains no server and supplies no Microsoft 365 connection.

## Credits and license

Credit goes to [fizamusthafa](https://github.com/fizamusthafa/servicenow-cowork-plugin)
for the original plugin this project builds on. This adaptation is maintained
by Lior Kamrat.

MIT; see [LICENSE](LICENSE) and [NOTICE](NOTICE).
