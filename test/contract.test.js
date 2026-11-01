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

test("packaged descriptions match the shared versioned read-only contract", () => {
  const normalized = snapshot.toString().replace(/\r\n/g, "\n");
  assert.equal(serviceNowMcp.version, "1.0.0");
  assert.equal(checkContract(snapshot, serviceNowMcp).toString(), normalized);
  assert.equal(checkContract(Buffer.from(normalized.replace(/\n/g, "\r\n")), serviceNowMcp).toString(), normalized);
  assert.throws(() => checkContract(Buffer.from(normalized + " "), serviceNowMcp), /pinned shared MCP contract/);
  assert.throws(() => checkContract(snapshot), /pinned shared MCP contract/);

  const changed = JSON.parse(normalized);
  changed.tools[0].annotations.readOnlyHint = false;
  const data = Buffer.from(JSON.stringify(changed));
  const sha256 = createHash("sha256").update(data).digest("hex");
  assert.throws(() => checkContract(data, { ...serviceNowMcp, sha256 }), /four read-only/);
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
