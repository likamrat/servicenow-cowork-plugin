const fs = require("node:fs");
const path = require("node:path");
const { createHash } = require("node:crypto");
const AdmZip = require("adm-zip");
const { ROOT, PLUGIN_FILES, SOURCE_FILES, readSource, checkDistribution } = require("./distribution");

function httpsUrl(value, field, endpoint = false) {
  let url;
  try { url = new URL(value); } catch { throw new Error(`${field} must be an absolute HTTPS URL.`); }
  if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash ||
      (endpoint && url.pathname !== "/mcp")) {
    throw new Error(`${field} must use HTTPS without credentials, query or fragment${endpoint ? ", with path /mcp" : ""}.`);
  }
  return url.href;
}

function configuredManifest(manifest, config) {
  const fields = ["appId", "mcpServerUrl", "websiteUrl", "privacyUrl", "termsOfUseUrl", "acknowledgeUnauthenticatedEndpoint"];
  if (!config || typeof config !== "object" || Array.isArray(config) ||
      Object.keys(config).some((key) => !fields.includes(key))) {
    throw new Error("Package configuration contains unsupported fields. Credentials do not belong in this file.");
  }
  if (typeof config.appId !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(config.appId)) {
    throw new Error("appId must be a UUID assigned to this app.");
  }
  if (config.acknowledgeUnauthenticatedEndpoint !== true) {
    throw new Error("This connector has no client authentication. Review the exposure and set acknowledgeUnauthenticatedEndpoint only with the operator's approval.");
  }
  manifest.id = config.appId;
  for (const field of ["websiteUrl", "privacyUrl", "termsOfUseUrl"]) {
    manifest.developer[field] = httpsUrl(config[field], field);
  }
  manifest.agentConnectors[0].toolSource.remoteMcpServer.mcpServerUrl = httpsUrl(config.mcpServerUrl, "mcpServerUrl", true);
  return manifest;
}

function archive(entries) {
  const zip = new AdmZip();
  for (const [name, data] of Object.entries(entries).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)) {
    const entry = zip.addFile(name, data, "", 0o644);
    // Normalize platform metadata and store bytes without compressor-version differences.
    entry.header.made = 0x0314;
    entry.header.method = 0;
    entry.header.time = new Date(1980, 0, 1, 0, 0, 0);
  }
  return zip.toBuffer();
}

function buildPlugin({ config, root = ROOT } = {}) {
  checkDistribution(root);
  const entries = Object.fromEntries(PLUGIN_FILES.map((file) => [file, readSource(`plugin/${file}`, root)]));
  const manifest = JSON.parse(entries["manifest.json"]);
  if (config !== undefined) configuredManifest(manifest, config);
  entries["manifest.json"] = Buffer.from(JSON.stringify(manifest, null, 2) + "\n");
  entries.LICENSE = readSource("LICENSE", root);
  entries.NOTICE = readSource("NOTICE", root);
  return archive(entries);
}

function buildSource(root = ROOT) {
  checkDistribution(root);
  return archive(Object.fromEntries(SOURCE_FILES.map((file) => [file, readSource(file, root)])));
}

function main(args) {
  if (args.length === 1 && args[0] === "--help") {
    console.log("Usage: npm run package -- --template | --source | --config <local.json>\nOutputs go to dist/template, dist/source or dist/configured. No network calls or uploads.");
    return;
  }
  let data;
  let folder;
  let filename = "servicenow-for-cowork.zip";
  if (args.length === 1 && args[0] === "--template") {
    data = buildPlugin();
    folder = "template";
  } else if (args.length === 1 && args[0] === "--source") {
    data = buildSource();
    folder = "source";
    filename = "servicenow-for-cowork-source.zip";
  } else if (args.length === 2 && args[0] === "--config") {
    const config = JSON.parse(fs.readFileSync(path.resolve(args[1]), "utf8"));
    data = buildPlugin({ config });
    folder = "configured";
  } else {
    throw new Error("Choose exactly one of --template, --source or --config <local.json>. Use --help for details.");
  }
  const output = path.join(ROOT, "dist", folder, filename);
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, data);
  console.log(`${path.relative(ROOT, output)}\nSHA-256 ${createHash("sha256").update(data).digest("hex")}`);
  if (folder === "template") console.log("Unconfigured template: not installable. Supply local deployment configuration before upload.");
  if (folder === "configured") console.log("Configuration applied locally; endpoint access, policy and Cowork acceptance are not verified. Do not share deployment-specific packages.");
  if (folder === "source") console.log("Allowlisted source snapshot without Git history, credentials or configured packages. Review before any publication.");
}

if (require.main === module) {
  try { main(process.argv.slice(2)); }
  catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

module.exports = { archive, buildPlugin, buildSource, configuredManifest };
