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
  intent_translation: /Translate the user's business intent[\s\S]*related activities, components or observable symptoms[\s\S]*search hypotheses, not facts/,
  agent_owned_search: /Choose search terms yourself[\s\S]*not required to know ticket wording/,
  diverse_search: /At most two targeted searches[\s\S]*meaningfully different hypotheses[\s\S]*acronym expansions alone/,
  bounded_discovery_fallback: /If neither targeted search finds plausible candidates[\s\S]*third and final search[\s\S]*omit `query`[\s\S]*preserve all requested filters[\s\S]*source restrictions/,
  explicit_literal_scope: /For an explicit literal-title request[\s\S]*keep that literal scope[\s\S]*no concept expansion or unfiltered fallback/,
  empty_not_health: /Empty matches prove neither absence of related incidents nor connection health/,
  candidate_inspection: /`get_incident` to[\s\S]*inspect up to three candidates before claiming a connection/,
  m365: /Microsoft 365 tools\s+available and authorized/,
  enterprise_intent: /system context, team guidance or who should investigate[\s\S]*before the first answer[\s\S]*without explicit document, file or technical terms/,
  first_turn_grounding: /Do not defer this to a later prompt/,
  enterprise_source_scope: /Use only sources allowed by the user and available and authorized in this session[\s\S]*excludes enterprise sources[\s\S]*do not call them/,
  independent_enterprise_search: /Independently of incident results, use at most three enterprise searches[\s\S]*including at most one fallback/,
  system_context_query: /Search for the affected service's system documentation[\s\S]*Search separately for service ownership/,
  ticket_independent_context: /Neither general query should require an incident number or symptom[\s\S]*incident-specific discussion query distinct/,
  bounded_enterprise_followup: /If evidence is incomplete, use the single remaining search[\s\S]*Do not retry denied or failed requests as keyword fallbacks/,
  read_enterprise_hits: /Read up to three relevant hits[\s\S]*system documentation and responsibility evidence when available[\s\S]*actual returned contents[\s\S]*titles, snippets or search activity alone are not grounding/,
  supported_investigator: /Name an investigator only when retrieved responsibility evidence supports that person[\s\S]*directory identity alone is not ownership evidence/,
  recorded_owner_boundary: /Separate the incident's recorded group\/assignee from the recommended investigator/,
  ownership_gap: /conflicting, stale or team-only evidence[\s\S]*do not invent a named owner/,
  recommendation_not_assignment: /A recommendation is not assignment authorization[\s\S]*do not resolve source assignees, provision users or write records/,
  enterprise_completion: /Before answering, include the relevant document findings and the evidence for the recommendation[\s\S]*allowed evidence is missing or unreadable[\s\S]*not claim enterprise grounding is complete/,
  document_exclusion: /Exclude ordinary document-finding/,
  change_scope: /Reads recent ServiceNow change requests/,
  source_restrictions: /source restrictions/i,
  bounded_search: /at most three searches/,
  empty_evidence: /not proof that no incident exists/,
  uncertainty: /A keyword match alone does not establish a cause/,
  time_boundary: /last six months, including exact-number[\s\S]*lookups/,
  read_only: /read-only[\s\S]*(?:another tool|write workflow)/,
  current_schema: /Read the current incident schema with `get_incident_schema`[\s\S]*supported fields, choices and reference targets/,
  exact_identity: /`resolve_incident_assignee`[\s\S]*Names and email addresses\s+are selectors, not immutable identities[\s\S]*Never choose the\s+first similar name/,
  existing_assignee_route: /With `unique` existing source identity[\s\S]*`Incident\.Manage`[\s\S]*`User\.Manage`, `User\.Access\.Manage` and access assessments are not\s+prerequisites for ordinary assignment/,
  source_assignment_boundary: /Identity resolution is not an eligibility certificate[\s\S]*source ACLs\/rules and the guarded incident operation remain authoritative[\s\S]*Stop on a real rejection or unknown write; do not grant access as a workaround/,
  user_admin_not_assignment: /Ordinary assignment uses `Incident\.Manage`, not this profile\/access workflow[\s\S]*Enter this workflow only for separately authorized user creation or access changes/,
  assignment_scope: /change only the assignee and preserve the group and other fields[\s\S]*must not clear the old assignee first/,
  contextual_handoff: /Resolve "that incident" from the inspected conversation context[\s\S]*multiple plausible incidents[\s\S]*ask which one/,
  handoff_preflight: /Before either requested effect, qualify both assignment and journal append\/readback[\s\S]*stop before a partial assignment[\s\S]*not proof that notes can be persisted/,
  journal_not_description: /Append to the supported internal `work_notes` field[\s\S]*Never replace `description` or use resolution `close_notes`[\s\S]*Customer-visible `comments` require explicit intent/,
  grounded_handoff: /observed findings, supporting source links, unresolved hypotheses and next checks[\s\S]*review request is not evidence that a rollout occurred[\s\S]*Do not turn a hypothesis into a confirmed cause/,
  handoff_readback: /Independently verify both the exact assignee and the appended note[\s\S]*assignment alone is not a completed handoff[\s\S]*Do not treat a scalar field comparison or an excluded journal field as append proof/,
  uncertain_note_recovery: /Recover the original `operation_id` read-only with `get_incident_operation`[\s\S]*Never append again or reassign under a new ID[\s\S]*current matching text alone does not establish attribution/,
  journal_dispatch: /`update_incident` with `values\.work_notes` and `values\.assigned_to` in one[\s\S]*version-guarded patch[\s\S]*`record_fields` and `work_note` separately[\s\S]*20 entries[\s\S]*`get_incident_operation`[\s\S]*`get_incident` excludes journals/,
  notes_only_scope: /For notes-only requests, omit `assigned_to`/,
  write_authorization: /required native Cowork confirmation gate before any write[\s\S]*unavailable or unverified, stop before mutation/,
  version_guard: /current version guard[\s\S]*not\s+atomic compare-and-swap/,
  write_readback: /independently read back the source[\s\S]*intended\s+fields and preserved fields/,
  uncertain_recovery: /read-only operation\s+recovery with the original operation ID[\s\S]*Do not replay under that or a new ID/,
  deletion_evidence: /verify exact absence[\s\S]*empty filtered search is not deletion proof/,
  operation_dispatch: /`create_incident`[\s\S]*`update_incident`[\s\S]*`expected_mod_count`[\s\S]*`values\.assigned_to`[\s\S]*JSON `null`[\s\S]*`delete_incident`[\s\S]*`get_incident_operation`/,
  transport_not_absence: /Transport or protocol failures[\s\S]*not\s+source-backed "not found" results[\s\S]*do not infer a deleted incident or missing user[\s\S]*blindly repeating the assignment/,
  directory_first: /For a name-only request, use the actual Work IQ or organization-directory tools[\s\S]*Keep technical login\/email handling internal[\s\S]*Do not ask the user for email as\s+the normal handoff/,
  honest_directory_context: /does not depend on Work IQ or verify directory identity from supplied profile\s+fields[\s\S]*Never send a fabricated `directory_verified` assertion/,
  natural_assignment_request: /Handle ordinary freeform assignment requests[\s\S]*instructions carry the workflow[\s\S]*not a tool recipe, email, directory ID or creation choreography/,
  dynamic_directory_people: /Resolve the person afresh[\s\S]*future directory users[\s\S]*Do not rely on example names, preconfigured person IDs, person allowlists or\s+manually prepared source accounts/,
  meaningful_clarification: /Ask only for genuine identity ambiguity, missing permitted context or required\s+authorization/,
  mcp_only_composition: /Creation, eligibility changes and assignment must originate in Cowork through\s+the delivered authenticated MCP tools[\s\S]*Do not replace `create_user`[\s\S]*direct ServiceNow API writes, manual pre-provisioning or a legacy private\s+backend/,
  continuation_gate: /Preflight the complete continuation before creating[\s\S]*assignee_readiness: not_evaluated[\s\S]*path is unavailable[\s\S]*before creating/,
  generic_user_scope: /`User\.Manage`, separately from `Incident\.Manage`[\s\S]*gap, not a missing user/,
  generic_user_context: /request data, not authorization or backend-verified directory identity[\s\S]*Direct source CRUD with sufficient user-supplied\s+data does not require Work IQ/,
  generic_user_write: /`get_user_schema`[\s\S]*`create_user`[\s\S]*`user_name`[\s\S]*`update_user`[\s\S]*`expected_mod_count`/,
  user_profile_boundary: /Profile fields do not include credentials,\s+roles, group membership, login renaming or lifecycle changes/,
  user_delete_guard: /`assess_user_delete`[\s\S]*`delete_user`[\s\S]*`expected_impact_sha256`[\s\S]*`acknowledged_native_effects`/,
  user_recovery: /`get_user_operation` with the original operation ID[\s\S]*Never replay under the same or a new ID/,
  access_scope: /`User\.Access\.Manage`[\s\S]*not implied by `User\.Manage`/,
  access_preflight: /`inspect_user_access_policy`[\s\S]*`policy_available: true`[\s\S]*before creating/,
  access_assessment: /`assess_user_access` with the exact `sys_id` and policy key[\s\S]*five-minute caller-bound assessment/,
  access_apply: /`apply_user_access` with that `sys_id`, `assessment_id`,[\s\S]*`operation_id` and exact `acknowledged_native_effects`/,
  access_recovery: /`get_user_access_operation` with the original operation ID[\s\S]*Never repeat grants/,
  truthful_user_metadata: /`generic_record_interface` restriction concerns raw record tools, not semantic\s+user CRUD[\s\S]*`semantic_user_interface` support is not policy approval or source\s+permission[\s\S]*suggestions,[\s\S]*not a closed enum/,
  unevaluated_policy: /`qualification: not_evaluated` and `policy_available: null`[\s\S]*readiness is unknown, not denied or approved/,
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

function workflowText(name) {
  const skill = readSource(`plugin/skills/${name}/SKILL.md`).toString();
  return name === "servicenow-incidents"
    ? skill + "\n" + readSource("plugin/skills/servicenow-incidents/references/investigation.md") +
      "\n" + readSource("plugin/skills/servicenow-incidents/references/assignment.md") +
      "\n" + readSource("plugin/skills/servicenow-incidents/references/handoff.md")
    : skill;
}

for (const name of ["servicenow-incidents", "servicenow-changes", "servicenow-users"]) {
  test(`${name}: portable metadata and bounded skill size`, () => {
    const text = readSource(`plugin/skills/${name}/SKILL.md`).toString();
    assert.ok(text.startsWith(`---\nname: ${name}\ndescription: |\n`));
    const description = text.match(/^description: \|\n((?:  .*\n)+)/m)?.[1].trim();
    assert.ok(description && description.length <= 1024);
    assert.doesNotMatch(description, /[<>]/);
    assert.ok(name.length <= 64 && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name));
    assert.match(text, /^license: MIT$/m);
    assert.match(text, /^  author: Lior Kamrat$/m);
    assert.match(text, /^  version: "1\.0\.11"$/m);
    assert.doesNotMatch(text, /`servicenow-mcp-(?:incidents|changes|users)`/);
    if (name === "servicenow-incidents") {
      assert.equal(text.match(/^## (.+)$/m)?.[1], "Evidence first");
    }
    assert.ok(text.trim().split(/\s+/).length < 1000);
    assert.doesNotMatch(text, /https?:\/\/|[A-Z]{3}\d{7}|confirmation card to proceed/);
  });
}

test("incident workflow names all shared incident-operation tools without a second connector", () => {
  const text = workflowText("servicenow-incidents");
  const { tools } = JSON.parse(readSource("plugin/mcp-tools.json"));
  for (const name of [
    "get_incident_schema", "resolve_incident_assignee",
    "create_incident", "update_incident", "delete_incident", "get_incident_operation",
  ]) {
    assert.ok(tools.some((tool) => tool.name === name), `Missing packaged tool: ${name}`);
    assert.ok(text.includes(`\`${name}\``), `Missing skill dispatch: ${name}`);
  }
  assert.match(text, contracts.operation_dispatch);
  assert.doesNotMatch(text, /This plugin is read-only|separately authenticated|mapped alias/);
});

test("directory-first reference is explicitly loaded and generic user workflow names the shared tools", () => {
  const incident = readSource("plugin/skills/servicenow-incidents/SKILL.md").toString();
  const reference = readSource("plugin/skills/servicenow-incidents/references/assignment.md").toString();
  assert.match(incident, /\[Directory-first assignment\]\(references\/assignment\.md\)/);
  assert.ok(reference.trim().split(/\s+/).length < 800);
  const users = workflowText("servicenow-users");
  const { tools } = JSON.parse(readSource("plugin/mcp-tools.json"));
  for (const name of ["get_user_schema", "lookup_users", "get_user", "create_user", "update_user",
    "assess_user_delete", "delete_user", "get_user_operation", "inspect_user_access_policy",
    "assess_user_access", "apply_user_access", "get_user_access_operation"]) {
    assert.ok(tools.some(tool => tool.name === name), `Missing shared tool: ${name}`);
    assert.ok(users.includes(`\`${name}\``), `Missing generic user dispatch: ${name}`);
  }
  assert.doesNotMatch(reference + users, /prepare_incident_onboarding|onboard_incident_assignee|directory_verified\s*:\s*true/);
});

test("freeform assignment cases keep orchestration out of user prompts", () => {
  for (const id of ["directory-first-name-only-assignment", "future-directory-person", "ambiguous-directory-person", "contextual-assignment-with-findings"]) {
    const item = cases.find(item => item.id === id);
    assert.ok(item, `Missing freeform assignment case: ${id}`);
    assert.doesNotMatch(item.prompt, /Work\s?IQ|directory|counterpart|create|lookup_users|update_incident|operation_id|@|[a-f0-9]{8}-[a-f0-9]{4}-/i);
    assert.ok(item.contracts.includes("natural_assignment_request"));
    assert.ok(item.contracts.includes("dynamic_directory_people"));
  }
});

test("handoff reference is loaded for notes requests and remains bounded", () => {
  const incident = readSource("plugin/skills/servicenow-incidents/SKILL.md").toString();
  const reference = readSource("plugin/skills/servicenow-incidents/references/handoff.md").toString();
  assert.match(incident, /For findings\/notes, read \[Handoff notes\]\(references\/handoff\.md\)/);
  assert.match(incident, /For assignment-only requests, change only the assignee/);
  assert.ok(reference.trim().split(/\s+/).length < 400);
  assert.doesNotMatch(reference, /https?:\/\/|[A-Z]{3}\d{7}/);
});

test("natural-language investigation is loaded before discovery and stays generic", () => {
  const incident = readSource("plugin/skills/servicenow-incidents/SKILL.md").toString();
  const reference = readSource("plugin/skills/servicenow-incidents/references/investigation.md").toString();
  assert.match(incident, /\[Natural-language investigation\]\(references\/investigation\.md\)\s+before the first search/);
  assert.ok(reference.trim().split(/\s+/).length < 750);
  assert.doesNotMatch(incident + reference, /https?:\/\/|[A-Z]{3}\d{7}|\bPOS\b|point of sale|card payments|\bSam\b|Openspace/i);
  assert.match(reference, /agent reasoning, not a fixed keyword dictionary/);
});

const enterpriseContracts = [
  "enterprise_intent", "first_turn_grounding", "enterprise_source_scope",
  "independent_enterprise_search", "system_context_query", "ticket_independent_context",
  "bounded_enterprise_followup", "read_enterprise_hits", "supported_investigator",
  "recorded_owner_boundary", "ownership_gap", "recommendation_not_assignment", "enterprise_completion",
];

test("first-turn grounding lives on the investigation path, not only the assignment path", () => {
  const incident = readSource("plugin/skills/servicenow-incidents/SKILL.md").toString();
  const reference = readSource("plugin/skills/servicenow-incidents/references/investigation.md").toString();
  const description = incident.match(/^description: \|\n((?:  .*\n)+)/m)?.[1];
  assert.match(description, /who should investigate[\s\S]*first-turn Work IQ/);
  assert.match(incident, /before the first search or investigation answer,\s+including when an incident number is supplied/);
  assert.match(incident, /Complete the reference's enterprise-grounding steps in the first response/);
  assert.match(reference, /Use at most three searches in total for incident retrieval/);
  assert.match(reference, /Stop incident searching once inspected incident evidence is sufficient;\s+this does not complete enterprise grounding/);
  for (const contract of enterpriseContracts) assert.match(reference, contracts[contract], contract);
});

test("first-turn ownership fixtures retain business-only prompts", () => {
  const first = cases.find(item => item.id === "first-turn-business-ownership");
  assert.equal(first?.prompt, "Our stores are reporting slow card payments. What's happening, and who should investigate?");
  for (const id of ["first-turn-business-ownership", "first-turn-other-service"]) {
    const item = cases.find(item => item.id === id);
    assert.ok(item, `Missing first-turn case: ${id}`);
    assert.doesNotMatch(item.prompt, /ServiceNow|Work\s?IQ|Microsoft 365|document|file|architecture|search|INC\d|Sam|Openspace/i);
    for (const contract of enterpriseContracts) assert.ok(item.contracts.includes(contract), `${id}: ${contract}`);
  }
});

// These assert that instructions cover each case, not that a model will follow them.
for (const item of cases) {
  test(`static skill text contract: ${item.id}`, () => {
    const text = workflowText(item.skill);
    assert.ok(item.prompt && item.expected_behavior);
    for (const contract of item.contracts) {
      assert.ok(contracts[contract], `Unknown contract: ${contract}`);
      assert.match(text, contracts[contract], `${item.id}: ${contract}`);
    }
  });
}
