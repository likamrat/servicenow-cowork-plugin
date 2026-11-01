const fs = require("node:fs");
const path = require("node:path");
const { createHash } = require("node:crypto");

const ROOT = path.resolve(__dirname, "..");

function checkContract(data, binding) {
  const normalized = data.toString("utf8").replace(/\r\n/g, "\n");
  const hash = createHash("sha256").update(normalized).digest("hex");
  if (!binding || hash !== binding.sha256) {
    throw new Error("Cowork tool descriptions do not match the pinned shared MCP contract.");
  }
  const { tools } = JSON.parse(normalized);
  const names = ["search_incidents", "get_incident", "search_changes", "get_change"];
  if (!Array.isArray(tools) || tools.length !== names.length ||
      names.some((name) => tools.filter((tool) => tool.name === name).length !== 1) ||
      tools.some((tool) => tool.annotations?.readOnlyHint !== true ||
        tool.inputSchema?.type !== "object" || typeof tool.description !== "string")) {
    throw new Error("The shared Cowork contract must contain exactly four read-only incident/change tools.");
  }
  return Buffer.from(normalized);
}

function main(args) {
  const binding = require("../package.json").serviceNowMcp;
  const snapshot = path.join(ROOT, "plugin", "mcp-tools.json");
  if (args.length === 0) {
    checkContract(fs.readFileSync(snapshot), binding);
  } else if (args.length === 2 && ["--check", "--sync"].includes(args[0])) {
    const data = checkContract(fs.readFileSync(path.resolve(args[1])), binding);
    if (args[0] === "--sync") fs.writeFileSync(snapshot, data);
    else if (!data.equals(checkContract(fs.readFileSync(snapshot), binding))) {
      throw new Error("The packaged and shared MCP tool descriptions differ.");
    }
  } else {
    throw new Error("Usage: npm run contract -- [--check | --sync] <shared-contract.json>");
  }
  console.log(`Cowork tool descriptions match shared MCP ${binding.version}. No service was contacted.`);
}

if (require.main === module) {
  try { main(process.argv.slice(2)); }
  catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

module.exports = { checkContract };
