const assert = require("node:assert/strict");
const { test } = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const { crc32 } = require("node:zlib");
const { createHash } = require("node:crypto");
const AdmZip = require("adm-zip");
const { buildPlugin, buildSource, configuredManifest } = require("../scripts/package");
const { ROOT, PLUGIN_FILES, SOURCE_FILES, checkText, checkDistribution, readSource } = require("../scripts/distribution");
const { checkIcons } = require("../scripts/icons");

const config = {
  appId: "12345678-1234-4234-8234-123456789abc",
  mcpServerUrl: "https://mcp.example.invalid/mcp",
  websiteUrl: "https://project.example.invalid",
  privacyUrl: "https://project.example.invalid/privacy",
  termsOfUseUrl: "https://project.example.invalid/terms",
  oauthRegistrationId: "synthetic-oauth-registration",
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

test("plugin ZIP has reproducible bytes, valid entries, all skills and aligned release versions", () => {
  const bytes = buildPlugin();
  assert.deepEqual(buildPlugin(), bytes);
  const zip = new AdmZip(bytes);
  assertArchiveIntegrity(zip);
  assert.deepEqual(zip.getEntries().map((entry) => entry.entryName).sort(), [...PLUGIN_FILES, "LICENSE", "NOTICE"].sort());
  const packaged = JSON.parse(zip.readAsText("manifest.json"));
  assert.equal(packaged.version, "1.0.10");
  assert.equal(packaged.manifestVersion, "1.28", "The Microsoft manifest schema has its own version");
  assert.equal(JSON.parse(readSource("package.json")).version, packaged.version);
  const lock = JSON.parse(readSource("package-lock.json"));
  assert.equal(lock.version, packaged.version);
  assert.equal(lock.packages[""].version, packaged.version);
  assert.equal(packaged.id, "");
  assert.equal(packaged.agentConnectors[0].toolSource.remoteMcpServer.mcpServerUrl, "");
  assert.equal(packaged.agentConnectors.length, 1, "Reads and incident operations share one authenticated connector");
  assert.deepEqual(packaged.agentSkills.map(skill => skill.folder), [
    "./skills/servicenow-incidents", "./skills/servicenow-changes", "./skills/servicenow-users",
  ]);
  assert.ok(zip.getEntry("skills/servicenow-incidents/references/assignment.md"));
  assert.equal(zip.readAsText("skills/servicenow-incidents/references/handoff.md"),
    readSource("plugin/skills/servicenow-incidents/references/handoff.md").toString());
  assert.equal(zip.readAsText("skills/servicenow-incidents/references/investigation.md"),
    readSource("plugin/skills/servicenow-incidents/references/investigation.md").toString());
  assert.deepEqual(packaged.agentConnectors[0].toolSource.remoteMcpServer.authorization, {
    type: "OAuthPluginVault", referenceId: "",
  });
  assert.deepEqual(JSON.parse(zip.readAsText("mcp-tools.json")), JSON.parse(readSource("plugin/mcp-tools.json")));
  for (const skill of packaged.agentSkills) {
    const file = `${skill.folder.replace(/^\.\//, "")}/SKILL.md`;
    assert.equal(zip.readAsText(file).match(/^name: (.+)$/m)?.[1], path.posix.basename(skill.folder));
    assert.equal(zip.readAsText(file).match(/^  version: "(.+)"$/m)?.[1], packaged.version);
    assert.equal(zip.readAsText(file), readSource(`plugin/${file}`).toString());
  }
  for (const name of ["LICENSE", "NOTICE"]) assert.equal(zip.readAsText(name), readSource(name).toString());
  for (const entry of zip.getEntries()) {
    assert.equal(entry.entryName.includes("\\"), false);
    assert.equal(entry.entryName.includes(".."), false);
    assert.doesNotMatch(entry.entryName, /skills\/servicenow-mcp-(?:incidents|changes|users)\//);
    if (!entry.entryName.endsWith(".png")) {
      const text = entry.getData().toString();
      checkText(entry.entryName, text);
      assert.doesNotMatch(text, /servicenow-mcp-(?:incidents|changes|users)\b/);
      if (entry.entryName.startsWith("skills/") && entry.entryName.endsWith(".md")) {
        for (const [, target] of text.matchAll(/\[[^\]]+\]\(([^)]+\.md)\)/g)) {
          const resolved = path.posix.join(path.posix.dirname(entry.entryName), target);
          assert.ok(zip.getEntry(resolved), `Missing packaged reference: ${resolved}`);
        }
      }
    }
  }
});

test("packaged color branding matches upstream and outline remains white/transparent", () => {
  checkIcons();
  const color = readSource("plugin/color.png");
  assert.equal(createHash("sha256").update(color).digest("hex"), "47b1ebe5ac0882605f6238a19ef986d38268fc4a92ae7d52014085b0f8c2d00d");
  assert.deepEqual(color.subarray(0, 8), Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  assert.equal(color.readUInt32BE(16), 192);
  assert.equal(color.readUInt32BE(20), 192);
  const zip = new AdmZip(buildPlugin());
  const packaged = JSON.parse(zip.readAsText("manifest.json"));
  assert.deepEqual(zip.getEntry(packaged.icons.color).getData(), color);
  assert.deepEqual(zip.getEntry(packaged.icons.outline).getData(), readSource("plugin/outline.png"));
  for (const [name, size] of [["outline", 32]]) {
    const data = readSource(`plugin/${name}.png`);
    assert.equal(data.readUInt32BE(16), size);
    assert.equal(data.readUInt32BE(20), size);
    assert.equal(data.includes(Buffer.from("tEXt")), false);
    assert.equal(data.includes(Buffer.from("eXIf")), false);
  }
});

test("icon command preserves both assets and rejects neutral replacements", (t) => {
  const before = ["color", "outline"].map((name) => readSource(`plugin/${name}.png`));
  require("node:child_process").execFileSync(process.execPath, [path.join(ROOT, "scripts", "icons.js")]);
  for (const [index, name] of ["color", "outline"].entries()) {
    assert.deepEqual(readSource(`plugin/${name}.png`), before[index]);
  }
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "cowork-icons-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  for (const name of ["color", "outline"]) fs.writeFileSync(path.join(root, `${name}.png`), readSource(`plugin/${name}.png`));
  for (const name of ["color", "outline"]) {
    const file = path.join(root, `${name}.png`);
    const original = fs.readFileSync(file);
    fs.writeFileSync(file, Buffer.alloc(original.length));
    assert.throws(() => checkIcons(root), /differs from the reviewed ServiceNow branding asset/);
    fs.writeFileSync(file, original);
  }
});

test("configured ZIP changes only manifest deployment fields and never the source", () => {
  const source = readSource("plugin/manifest.json");
  const zip = new AdmZip(buildPlugin({ config }));
  const result = JSON.parse(zip.readAsText("manifest.json"));
  assert.deepEqual(result, configuredManifest(manifest(), config));
  assert.deepEqual(readSource("plugin/manifest.json"), source);
  assert.equal(result.agentConnectors[0].toolSource.remoteMcpServer.mcpServerUrl, config.mcpServerUrl);
  assert.deepEqual(result.agentConnectors[0].toolSource.remoteMcpServer.authorization, {
    type: "OAuthPluginVault", referenceId: config.oauthRegistrationId,
  });
  for (const file of PLUGIN_FILES.filter((file) => file !== "manifest.json")) {
    assert.deepEqual(zip.getEntry(file).getData(), readSource(`plugin/${file}`));
  }
  assert.deepEqual(buildPlugin({ config }), buildPlugin({ config }));
});

test("configuration requires a UUID, remote HTTPS and a non-secret OAuth registration reference", () => {
  for (const patch of [
    { appId: "" }, { appId: "not-an-app-id" },
    { oauthRegistrationId: "" }, { oauthRegistrationId: null },
    { oauthRegistrationId: " " }, { oauthRegistrationId: "invalid\nreference" },
    { oauthRegistrationId: "x".repeat(129) },
    { acknowledgeUnauthenticatedEndpoint: true },
    { mcpServerUrl: "http://mcp.example.invalid/mcp" },
    { mcpServerUrl: "https://localhost/mcp" },
    { mcpServerUrl: "https://" + "service.localhost/mcp" },
    { mcpServerUrl: "https://127.0.0.1/mcp" },
    { mcpServerUrl: "https://[::1]/mcp" },
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

test("packaging cannot downgrade authentication or add an anonymous connector", () => {
  for (const type of ["None", "ApiKeyPluginVault", "DynamicClientRegistration"]) {
    const source = manifest();
    source.agentConnectors[0].toolSource.remoteMcpServer.authorization = { type };
    assert.throws(() => configuredManifest(source, config), /OAuthPluginVault/);
  }
  const source = manifest();
  source.agentConnectors.push(structuredClone(source.agentConnectors[0]));
  assert.throws(() => configuredManifest(source, config), /one authenticated connector/);
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
  const toolsPath = path.join(root, "plugin", "mcp-tools.json");
  const tools = fs.readFileSync(toolsPath);
  fs.appendFileSync(toolsPath, " ");
  assert.throws(() => buildPlugin({ root }), /pinned shared MCP contract/);
  fs.writeFileSync(toolsPath, tools);
  const manifestPath = path.join(root, "plugin", "manifest.json");
  const original = fs.readFileSync(manifestPath);
  const changed = JSON.parse(original);
  changed.agentConnectors[0].toolSource.remoteMcpServer.authorization.type = "None";
  fs.writeFileSync(manifestPath, JSON.stringify(changed));
  assert.throws(() => buildPlugin({ root }), /OAuthPluginVault/);
  changed.agentConnectors[0].toolSource.remoteMcpServer.authorization = {
    type: "OAuthPluginVault", referenceId: "private-registration",
  };
  fs.writeFileSync(manifestPath, JSON.stringify(changed));
  assert.throws(() => buildPlugin({ root }), /deployment values/);
  fs.writeFileSync(manifestPath, original);
  // Junction creation is available on Windows without file-symlink privileges.
  const skill = path.join(root, "plugin", "skills", "servicenow-changes");
  const moved = path.join(root, "moved-skill");
  fs.renameSync(skill, moved);
  fs.symlinkSync(moved, skill, process.platform === "win32" ? "junction" : "dir");
  assert.throws(() => buildPlugin({ root }), /symlink|regular source/i);
});
