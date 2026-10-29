const assert = require("node:assert/strict");
const { test } = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const { spawnSync } = require("node:child_process");
const { crc32 } = require("node:zlib");
const AdmZip = require("adm-zip");
const { buildPlugin, buildSource, configuredManifest } = require("../scripts/package");
const { ROOT, PLUGIN_FILES, SOURCE_FILES, checkText, checkDistribution, readSource } = require("../scripts/distribution");
const { icon } = require("../scripts/icons");

const config = {
  appId: "12345678-1234-4234-8234-123456789abc",
  mcpServerUrl: "https://mcp.example.invalid/mcp",
  websiteUrl: "https://project.example.invalid",
  privacyUrl: "https://project.example.invalid/privacy",
  termsOfUseUrl: "https://project.example.invalid/terms",
  acknowledgeUnauthenticatedEndpoint: true,
};

function manifest() {
  return JSON.parse(readSource("plugin/manifest.json"));
}

function assertArchiveIntegrity(zip) {
  for (const entry of zip.getEntries()) {
    const data = entry.getData();
    assert.equal(data.length, entry.header.size, entry.entryName);
    assert.equal(crc32(data), entry.header.crc, entry.entryName);
    assert.equal(entry.header.made, 0x0314, "Stable Unix ZIP metadata on every build OS");
    assert.equal((entry.attr >>> 16) & 0o777, 0o644, "Exported source must remain readable");
    assert.equal(entry.header.method, 0, "Store bytes without compressor-version differences");
  }
}

test("plugin ZIP has reproducible bytes, valid entries, both skills and aligned release versions", () => {
  const bytes = buildPlugin();
  assert.deepEqual(buildPlugin(), bytes);
  const zip = new AdmZip(bytes);
  assertArchiveIntegrity(zip);
  assert.deepEqual(zip.getEntries().map((entry) => entry.entryName).sort(), [...PLUGIN_FILES, "LICENSE", "NOTICE"].sort());
  const packaged = JSON.parse(zip.readAsText("manifest.json"));
  assert.equal(packaged.version, "1.0.0");
  assert.equal(packaged.manifestVersion, "1.28", "The Microsoft manifest schema has its own version");
  assert.equal(JSON.parse(readSource("mcp-server/package.json")).version, "1.0.0");
  assert.equal(packaged.id, "");
  assert.equal(packaged.agentConnectors[0].toolSource.remoteMcpServer.mcpServerUrl, "");
  assert.equal(packaged.agentConnectors[0].toolSource.remoteMcpServer.authorization.type, "None");
  assert.deepEqual(JSON.parse(zip.readAsText("mcp-tools.json")), JSON.parse(readSource("plugin/mcp-tools.json")));
  for (const skill of packaged.agentSkills) {
    const file = `${skill.folder.replace(/^\.\//, "")}/SKILL.md`;
    assert.match(zip.readAsText(file), /^  version: "1\.0\.0"$/m);
    assert.equal(zip.readAsText(file), readSource(`plugin/${file}`).toString());
  }
  for (const name of ["LICENSE", "NOTICE"]) assert.equal(zip.readAsText(name), readSource(name).toString());
  for (const entry of zip.getEntries()) {
    assert.equal(entry.entryName.includes("\\"), false);
    assert.equal(entry.entryName.includes(".."), false);
    if (!entry.entryName.endsWith(".png")) checkText(entry.entryName, entry.getData().toString());
  }
});

test("icons are reproducible original pixels without embedded metadata or brand assets", () => {
  for (const [name, size, outline] of [["color", 192, false], ["outline", 32, true]]) {
    const data = readSource(`plugin/${name}.png`);
    assert.deepEqual(data, icon(size, outline));
    assert.equal(data.readUInt32BE(16), size);
    assert.equal(data.readUInt32BE(20), size);
    assert.equal(data.includes(Buffer.from("tEXt")), false);
    assert.equal(data.includes(Buffer.from("eXIf")), false);
  }
});

test("configured ZIP changes only manifest deployment fields and never the source", () => {
  const source = readSource("plugin/manifest.json");
  const zip = new AdmZip(buildPlugin({ config }));
  const result = JSON.parse(zip.readAsText("manifest.json"));
  assert.deepEqual(result, configuredManifest(manifest(), config));
  assert.deepEqual(readSource("plugin/manifest.json"), source);
  assert.equal(result.agentConnectors[0].toolSource.remoteMcpServer.mcpServerUrl, config.mcpServerUrl);
  for (const file of PLUGIN_FILES.filter((file) => file !== "manifest.json")) {
    assert.deepEqual(zip.getEntry(file).getData(), readSource(`plugin/${file}`));
  }
  assert.deepEqual(buildPlugin({ config }), buildPlugin({ config }));
});

test("configuration requires a UUID, safe URLs, known fields and exposure acknowledgement", () => {
  for (const patch of [
    { appId: "" }, { appId: "not-an-app-id" },
    { acknowledgeUnauthenticatedEndpoint: false },
    { acknowledgeUnauthenticatedEndpoint: "true" },
    { mcpServerUrl: "http://mcp.example.invalid/mcp" },
    { mcpServerUrl: "https://user:password" + "@mcp.example.invalid/mcp" },
    { mcpServerUrl: "https://mcp.example.invalid/mcp?token=placeholder" },
    { mcpServerUrl: "https://mcp.example.invalid/mcp#fragment" },
    { mcpServerUrl: "https://mcp.example.invalid/wrong-path" },
    { privacyUrl: "" }, { termsOfUseUrl: "not-a-url" },
    { websiteUrl: "https://project.example.invalid?tracking=placeholder" },
    { password: "synthetic-placeholder" },
  ]) {
    assert.throws(() => configuredManifest(manifest(), { ...config, ...patch }));
  }
  for (const value of [null, [], false]) assert.throws(() => configuredManifest(manifest(), value));
  assert.throws(() => buildPlugin({ config: null }), /unsupported fields/);
});

test("source export uses only its allowlist and excludes Git, local settings and built archives", () => {
  const bytes = buildSource();
  assert.deepEqual(buildSource(), bytes);
  const zip = new AdmZip(bytes);
  assertArchiveIntegrity(zip);
  assert.deepEqual(zip.getEntries().map((entry) => entry.entryName).sort(), [...SOURCE_FILES].sort());
  for (const entry of zip.getEntries()) {
    assert.doesNotMatch(entry.entryName, /(?:^|\/)(?:\.git|node_modules|dist)(?:\/|$)|\.local\.json$|(?:^|\/)\.env$/);
  }
  assert.equal(checkDistribution(), SOURCE_FILES.length);
});

test("distribution guard rejects concrete deployment artifacts without echoing their values", () => {
  const samples = [
    ["instance address", "https://" + "dev" + "000000" + ".service-now.com"],
    ["tunnel address", "https://" + "fixture" + ".trycloudflare.com"],
    ["tenant address", "https://" + "fixture" + ".sharepoint.com"],
    ["machine path", "C:" + "\\Users\\example\\private"],
    ["email address", "person" + "@organization.invalid"],
    ["access token", "ghp_" + "x".repeat(36)],
    ["private key", "-----BEGIN " + "PRIVATE KEY-----"],
    ["unreviewed URL host", "https://" + "private-host.internal"],
  ];
  for (const [label, value] of samples) {
    assert.throws(() => checkText("fixture", value), (error) => {
      assert.ok(error.message.includes(label));
      assert.equal(error.message.includes(value), false);
      return true;
    });
  }
  assert.throws(() => checkText("skill", "A temporary connection", { publicSurface: true }));
  assert.doesNotThrow(() => checkText("fixture", "https://mcp.example.invalid/mcp"));
});

test("instance configuration fails early without disclosing invalid values or contacting a service", () => {
  for (const instance of [
    "", "not-an-origin", "http://servicenow.example.invalid",
    "https://user:password" + "@servicenow.example.invalid",
    "https://servicenow.example.invalid/path",
    "https://servicenow.example.invalid?token=placeholder",
    "https://servicenow.example.invalid#fragment",
  ]) {
    const result = spawnSync(process.execPath, ["-e", "require('./src/server')"], {
      cwd: path.join(ROOT, "mcp-server"),
      env: { ...process.env, MCP_ALLOWED_HOSTS: "", MCP_ALLOWED_ORIGINS: "", SERVICENOW_INSTANCE: instance, SERVICENOW_USERNAME: "test-user", SERVICENOW_PASSWORD: "test-only" },
      encoding: "utf8",
    });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /SERVICENOW_INSTANCE/);
    assert.doesNotMatch(result.stderr, /test-only|user:password|token=placeholder/);
  }
});

test("request boundary configuration rejects wildcard, malformed and ambiguous entries", () => {
  for (const [name, values] of Object.entries({
    MCP_ALLOWED_HOSTS: [
      "*", ".", "mcp..example.invalid", "*.example.invalid", "https://mcp.example.invalid",
      "mcp.example.invalid:443", "mcp.example.invalid/path", "mcp.example.invalid,",
    ],
    MCP_ALLOWED_ORIGINS: [
      "*", "null", "https://client.example.invalid/path",
      "https://client.example.invalid/", "https://client.example.invalid" + ",",
      "https://user:password" + "@client.example.invalid",
    ],
  })) {
    for (const value of values) {
      const result = spawnSync(process.execPath, ["-e", "require('./src/server')"], {
        cwd: path.join(ROOT, "mcp-server"),
        env: {
          ...process.env, SERVICENOW_INSTANCE: "https://servicenow.example.invalid",
          SERVICENOW_USERNAME: "test-user", SERVICENOW_PASSWORD: "test-only",
          MCP_ALLOWED_HOSTS: "", MCP_ALLOWED_ORIGINS: "", [name]: value,
        },
        encoding: "utf8",
      });
      assert.notEqual(result.status, 0);
      assert.ok(result.stderr.includes(name));
      assert.doesNotMatch(result.stderr, /test-only|user:password/);
    }
  }
});

test("default origin policy permits machine clients but rejects browser origins", () => {
  const result = spawnSync(process.execPath, ["-e", `
    const { once } = require("node:events");
    const { app } = require("./src/server");
    (async () => {
      const server = app.listen(0, "127.0.0.1");
      try {
        await once(server, "listening");
        const statuses = [];
        for (const origin of [undefined, "https://client.example.invalid", "null"]) {
          const response = await fetch("http://127.0.0.1:" + server.address().port + "/mcp", {
            method: "POST",
            headers: { "Content-Type": "application/json", ...(origin ? { Origin: origin } : {}) },
            body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
          });
          statuses.push(response.status);
          await response.arrayBuffer();
        }
        console.log(JSON.stringify(statuses));
      } finally {
        server.closeAllConnections();
        await new Promise(resolve => server.close(resolve));
      }
    })().catch(error => { console.error(error.message); process.exitCode = 1; });
  `], {
    cwd: path.join(ROOT, "mcp-server"),
    env: {
      ...process.env, SERVICENOW_INSTANCE: "https://servicenow.example.invalid",
      SERVICENOW_USERNAME: "test-user", SERVICENOW_PASSWORD: "test-only",
      MCP_ALLOWED_HOSTS: "", MCP_ALLOWED_ORIGINS: "",
    },
    encoding: "utf8",
    timeout: 10000,
  });
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), [200, 403, 403]);
});

test("archive excludes unexpected files and fails if an allowlisted file is a symlink", (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "cowork-package-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  for (const file of SOURCE_FILES) {
    const target = path.join(root, ...file.split("/"));
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(path.join(ROOT, ...file.split("/")), target);
  }
  fs.writeFileSync(path.join(root, "package.local.json"), '{"password":"synthetic"}');
  fs.writeFileSync(path.join(root, "plugin", "private-notes.txt"), "not for distribution");
  const source = new AdmZip(buildSource(root));
  assert.equal(source.getEntry("package.local.json"), null);
  assert.equal(source.getEntry("plugin/private-notes.txt"), null);
  // Junction creation is available on Windows without file-symlink privileges.
  const skill = path.join(root, "plugin", "skills", "servicenow-changes");
  const moved = path.join(root, "moved-skill");
  fs.renameSync(skill, moved);
  fs.symlinkSync(moved, skill, process.platform === "win32" ? "junction" : "dir");
  assert.throws(() => buildPlugin({ root }), /symlink|regular source/i);
});
