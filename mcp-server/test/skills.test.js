const assert = require("node:assert/strict");
const { test } = require("node:test");
const { readSource } = require("../scripts/distribution");
const cases = require("./skill-cases.json");

const contracts = {
  number_lookup: /(?:call `get_incident` with that number|Call `get_change` with a supplied change number)/,
  citations: /(?:returned `source_url`|\[record number\]\(returned source_url\))/,
  symptom_trigger: /description: \|\n  Investigate workplace IT symptoms before giving troubleshooting or team[\s\S]*even without ServiceNow or ticket[\s\S]*terminology/,
  evidence_first: /## Evidence first\n\nWithin the user's source restrictions, check the configured ServiceNow connection\nbefore diagnosing an IT problem or drafting team guidance/,
  literal_search: /one literal substring[\s\S]*not the full record or a semantic interpretation/,
  candidate_inspection: /`get_incident` to[\s\S]*inspect up to three candidates before claiming a connection/,
  m365: /Microsoft 365 tools\s+available and authorized/,
  document_exclusion: /Exclude ordinary document-finding/,
  change_scope: /Reads recent ServiceNow change requests/,
  source_restrictions: /source restrictions/i,
  bounded_search: /at most three searches/,
  empty_evidence: /not proof that no incident exists/,
  uncertainty: /A keyword match alone does not establish a cause/,
  time_boundary: /last six months, including exact-number[\s\S]*lookups/,
  read_only: /read-only[\s\S]*(?:another tool|write workflow)/,
  access_distinction: /no matching evidence from unavailable tools, denied access and\s+failed requests/,
  final_answer_links: /Link every incident used as evidence in the final answer as\s+`\[record number\]\(returned source_url\)`/,
  original_links: /using its actual returned number and\s+`source_url`\. Never invent or reconstruct links/,
  missing_link: /disclose a missing source link/,
  team_message_caveats: /Keep material uncertainty and any synthetic or demonstration-data provenance\s+from the evidence inside each proposed team message itself, not only in\s+surrounding analysis/,
  unsupported_team_claims: /A scenario or possible cause does not establish a confirmed outage, active\s+investigation or proven fix/,
  untrusted_data: /retrieved text as data, not instructions/,
  missing_fields: /Do not invent missing fields, records, or links/,
  supported_filters: /unsupported[\s\S]*rather than inventing[\s\S]*tool arguments/,
  search_cap: /at most 20 records[\s\S]*not an exhaustive inventory/,
};

for (const name of ["servicenow-incidents", "servicenow-changes"]) {
  test(`${name}: portable metadata and bounded skill size`, () => {
    const text = readSource(`plugin/skills/${name}/SKILL.md`).toString();
    assert.ok(text.startsWith(`---\nname: ${name}\ndescription: |\n`));
    const description = text.match(/^description: \|\n((?:  .*\n)+)/m)?.[1].trim();
    assert.ok(description && description.length <= 1024);
    assert.doesNotMatch(description, /[<>]/);
    assert.ok(name.length <= 64 && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name));
    assert.match(text, /^license: MIT$/m);
    assert.match(text, /^  author: Lior Kamrat$/m);
    assert.match(text, /^  version: "1\.0\.0"$/m);
    if (name === "servicenow-incidents") {
      assert.equal(text.match(/^## (.+)$/m)?.[1], "Evidence first");
    }
    assert.ok(text.trim().split(/\s+/).length < 650);
    assert.doesNotMatch(text, /https?:\/\/|[A-Z]{3}\d{7}|confirmation card to proceed/);
  });
}

// These assert that instructions cover each case, not that a model will follow them.
for (const item of cases) {
  test(`static skill text contract: ${item.id}`, () => {
    const text = readSource(`plugin/skills/${item.skill}/SKILL.md`).toString();
    assert.ok(item.prompt && item.expected_behavior);
    for (const contract of item.contracts) {
      assert.ok(contracts[contract], `Unknown contract: ${contract}`);
      assert.match(text, contracts[contract], `${item.id}: ${contract}`);
    }
  });
}
