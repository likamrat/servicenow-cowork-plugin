const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..", "..");
const PLUGIN_FILES = [
  "manifest.json", "mcp-tools.json", "color.png", "outline.png",
  "skills/servicenow-incidents/SKILL.md", "skills/servicenow-changes/SKILL.md",
];
const SOURCE_FILES = [
  ".gitattributes", ".gitignore", "LICENSE", "NOTICE", "README.md", "SETUP.md",
  "package.example.json",
  "mcp-server/.env.example", "mcp-server/.gitignore",
  "mcp-server/package.json", "mcp-server/package-lock.json",
  "mcp-server/src/server.js",
  "mcp-server/scripts/distribution.js", "mcp-server/scripts/package.js", "mcp-server/scripts/icons.js",
  "mcp-server/test/server.test.js", "mcp-server/test/package.test.js",
  "mcp-server/test/skills.test.js", "mcp-server/test/skill-cases.json",
  ...PLUGIN_FILES.map((file) => `plugin/${file}`),
];

const PUBLIC_HOSTS = new Set([
  "github.com", "registry.npmjs.org", "opencollective.com", "tidelift.com",
  "developer.microsoft.com", "learn.microsoft.com", "modelcontextprotocol.io",
]);

function checkText(file, text, { publicSurface = false } = {}) {
  const issues = [];
  const patterns = [
    ["instance address", /\bdev\d+\.service-now\.com\b/i],
    ["tunnel address", /\b[\w.-]+\.(?:trycloudflare\.com|ngrok(?:-free)?\.(?:app|io)|devtunnels\.ms|loca\.lt)\b/i],
    ["tenant address", /\b[\w.-]+\.(?:sharepoint\.com|onmicrosoft\.com)\b/i],
    ["machine path", /(?:[A-Z]:[\\/]+(?:Users|home)[\\/]|\/(?:Users|home)\/[a-z0-9_-]+)/i],
    ["private key", /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
    ["access token", /\b(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})\b/],
    ["email address", /\b[\w.+-]+@[\w-]+(?:\.[\w-]+)+\b/],
  ];
  for (const [label, pattern] of patterns) {
    if (pattern.test(text)) issues.push(`${file}: ${label}`);
  }
  // Only literal URLs are checked; computed URLs and secret-manager values need operator review.
  for (const match of text.matchAll(/https?:\/\/[A-Za-z0-9][^\s"'<>`\\)}\]]*/g)) {
    let url;
    try { url = new URL(match[0]); } catch { continue; }
    const host = url.hostname;
    const example = /(?:^|\.)example\.(?:invalid|org|com|net)$/.test(host);
    const loopback = ["localhost", "127.0.0.1"].includes(host);
    if (!PUBLIC_HOSTS.has(host) && !example && !loopback) issues.push(`${file}: unreviewed URL host`);
  }
  if (publicSurface && /\b(?:demo|ignite|temporary|preview)\b/i.test(text)) {
    issues.push(`${file}: transient public wording`);
  }
  if (issues.length) throw new Error([...new Set(issues)].join("\n"));
}

function readSource(file, root = ROOT) {
  let fullPath = root;
  for (const part of file.split("/")) {
    fullPath = path.join(fullPath, part);
    if (fs.lstatSync(fullPath).isSymbolicLink()) throw new Error(`Symlink in source path: ${file}`);
  }
  if (!fs.lstatSync(fullPath).isFile()) throw new Error(`Not a regular source file: ${file}`);
  const data = fs.readFileSync(fullPath);
  if (file.endsWith(".png")) return data;
  const text = data.toString("utf8").replace(/\r\n/g, "\n");
  checkText(file, text, { publicSurface: file.startsWith("plugin/") || file === "README.md" });
  return Buffer.from(text);
}

function checkDistribution(root = ROOT) {
  for (const file of SOURCE_FILES) readSource(file, root);
  const manifest = JSON.parse(readSource("plugin/manifest.json", root));
  if (manifest.id || manifest.agentConnectors[0].toolSource.remoteMcpServer.mcpServerUrl ||
      ["websiteUrl", "privacyUrl", "termsOfUseUrl"].some((key) => manifest.developer[key])) {
    throw new Error("Keep deployment values out of the source manifest; use a local package configuration.");
  }
  return SOURCE_FILES.length;
}

if (require.main === module) {
  try {
    console.log(`Checked ${checkDistribution()} allowlisted source files. No flagged distribution material.`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

module.exports = { ROOT, PLUGIN_FILES, SOURCE_FILES, checkText, readSource, checkDistribution };
