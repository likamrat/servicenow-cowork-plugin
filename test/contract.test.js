const assert = require("node:assert/strict");
const { test } = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const { createHash } = require("node:crypto");
const { spawnSync } = require("node:child_process");
const { checkContract } = require("../scripts/contract");
const { serviceNowMcp } = require("../package.json");

const root = path.resolve(__dirname, "..");
const snapshot = fs.readFileSync(path.join(root, "plugin", "mcp-tools.json"));

test("packaged descriptions match the shared versioned authenticated incident/user contract", () => {
  const normalized = snapshot.toString().replace(/\r\n/g, "\n");
  assert.equal(serviceNowMcp.version, "1.0.0");
  assert.equal(checkContract(snapshot, serviceNowMcp).toString(), normalized);
  assert.equal(checkContract(Buffer.from(normalized.replace(/\n/g, "\r\n")), serviceNowMcp).toString(), normalized);
  assert.throws(() => checkContract(Buffer.from(normalized + " "), serviceNowMcp), /pinned shared MCP contract/);
  assert.throws(() => checkContract(snapshot), /pinned shared MCP contract/);

  const expected = [
    "search_incidents", "get_incident", "search_changes", "get_change",
    "get_incident_schema", "resolve_incident_assignee",
    "create_incident", "update_incident", "delete_incident", "get_incident_operation",
    "get_user_schema", "lookup_users", "get_user", "create_user", "update_user",
    "assess_user_delete", "delete_user", "get_user_operation",
    "inspect_user_access_policy", "assess_user_access", "apply_user_access", "get_user_access_operation",
  ];
  assert.deepEqual(JSON.parse(normalized).tools.map((tool) => tool.name), expected);
  for (const mutate of [
    (tools) => { tools[0].annotations.readOnlyHint = false; },
    (tools) => { tools.find((tool) => tool.name === "update_incident").annotations.readOnlyHint = true; },
    (tools) => { tools.find((tool) => tool.name === "delete_incident").annotations.destructiveHint = false; },
    (tools) => { tools.find((tool) => tool.name === "create_incident").annotations.idempotentHint = true; },
    (tools) => { tools.find((tool) => tool.name === "create_user").annotations.readOnlyHint = true; },
    (tools) => { tools.find((tool) => tool.name === "delete_user").annotations.destructiveHint = false; },
    (tools) => { tools.find((tool) => tool.name === "update_user").annotations.idempotentHint = true; },
    (tools) => { tools.find((tool) => tool.name === "inspect_user_access_policy").annotations.readOnlyHint = false; },
    (tools) => { tools.find((tool) => tool.name === "apply_user_access").annotations.readOnlyHint = true; },
    (tools) => { tools.find((tool) => tool.name === "apply_user_access").annotations.destructiveHint = false; },
    (tools) => { tools.find((tool) => tool.name === "apply_user_access").annotations.idempotentHint = true; },
    (tools) => { tools[0].name = "local_admin_user_create"; },
    (tools) => { tools.push(structuredClone(tools[0])); },
  ]) {
    const changed = JSON.parse(normalized);
    mutate(changed.tools);
    const data = Buffer.from(JSON.stringify(changed));
    const sha256 = createHash("sha256").update(data).digest("hex");
    assert.throws(() => checkContract(data, { ...serviceNowMcp, sha256 }), /restricted incident\/user contract/);
  }
});

test("contract CLI checks the snapshot without starting a backend", () => {
  const result = spawnSync(process.execPath, ["scripts/contract.js", "--check", "plugin/mcp-tools.json"], {
    cwd: root, encoding: "utf8",
  });

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /No service was contacted/);
  const invalid = spawnSync(process.execPath, ["scripts/contract.js", "--check"], {
    cwd: root, encoding: "utf8",
  });
  assert.notEqual(invalid.status, 0);
  assert.match(invalid.stderr, /Usage:/);
});

test("existing incident tools describe append evidence and requester-owned recovery", () => {
  const { tools } = JSON.parse(snapshot);
  const update = tools.find(tool => tool.name === "update_incident");
  const recovery = tools.find(tool => tool.name === "get_incident_operation");
  assert.match(update.description, /values\.work_notes[\s\S]*same patch[\s\S]*journal_input/);
  assert.match(update.description, /work_note separately from record_fields/);
  assert.match(update.description, /never retry a sent append under any UUID/);
  assert.match(recovery.description, /requester's own[\s\S]*20-entry[\s\S]*not unrestricted journal history/);
  assert.deepEqual(recovery.inputSchema.required, ["operation_id"]);
  assert.equal(recovery.annotations.readOnlyHint, true);
});
