# Natural-language investigation

## Translate intent

Translate the user's business intent into related activities, components or observable symptoms
that a ticket author might describe. Treat these as search hypotheses, not facts
about the source or a confirmed cause. Use the user's context and ordinary domain
knowledge; this is agent reasoning, not a fixed keyword dictionary.
Choose search terms yourself; the user is not required to know ticket wording.
Clarify genuine ambiguity about the intended service, not routine vocabulary differences.

For an explicit literal-title request, keep that literal scope:
no concept expansion or unfiltered fallback. Honor all source restrictions.

## Retrieve and inspect

Use at most three searches in total for incident retrieval:

1. At most two targeted searches should test meaningfully different hypotheses
   about the user's intent; acronym expansions alone are insufficient coverage.
   Call `search_incidents` with a short discriminating term or phrase for each.
   Its `query` matches one literal substring of the short description (title),
   not the full record or a semantic interpretation. Search one term or phrase
   per call, not several alternatives joined together. Add only requested state,
   priority or assignee filters; they narrow together.
2. If neither targeted search finds plausible candidates, use the third and final search
   to inspect recent ticket vocabulary: omit `query` and preserve all requested filters.
   Take this fallback only when source restrictions permit browsing recent titles.
   The returned sample is bounded, not an exhaustive inventory.
3. Use returned titles to ground relevance, not to rubber-stamp a hypothesis.
   Use `get_incident` to
   inspect up to three candidates before claiming a connection. Compare their
   affected service, symptoms, current state, impact, and recorded workaround
   with the user's problem. A keyword match alone does not establish a cause.
   Stop incident searching once inspected incident evidence is sufficient;
   this does not complete enterprise grounding.

Answer the business question naturally with linked evidence. Keep query mechanics
internal unless requested. Distinguish relevant records from a confirmed cause.
If the bounded search remains inconclusive, say what could not be established.
Empty matches prove neither absence of related incidents nor connection health.
Report actual tool failures separately; changing permissions is not a search strategy.

## Ground enterprise context in this response

For system context, team guidance or who should investigate, retrieve relevant
documentation and responsibility evidence before the first answer, even
without explicit document, file or technical terms.
Do not defer this to a later prompt.
Use only sources allowed by the user and available and authorized in this session.
If the user excludes enterprise sources or allows only attachments, do not call them;
use only permitted evidence and disclose the scope limit.

Independently of incident results, use at most three enterprise searches,
including at most one fallback:

1. Search for the affected service's system documentation, such as design or runbooks.
2. Search separately for service ownership, support responsibilities or team context.
   Neither general query should require an incident number or symptom.
3. If evidence is incomplete, use the single remaining search for a different
   service term grounded in the question or retrieved context, or for incident-specific
   discussion. Keep an incident-specific discussion query distinct from general
   documentation/ownership queries. Do not retry denied or failed requests as keyword fallbacks.

Read up to three relevant hits, covering system documentation and responsibility evidence when available.
Base findings on actual returned contents; titles, snippets or search activity alone are not grounding.
Preserve each source's title, original URL/native citation and supporting content together,
including in script output. Link document titles to original source-returned URLs in
the first answer when available. Cite original documents, not helper scripts or their
output artifacts; a script citation is not a document citation. If no original URL or
native source citation survives, disclose the provenance gap; never invent links.

Separate the incident's recorded group/assignee from the recommended investigator.
Name an investigator only when retrieved responsibility evidence supports that person;
directory identity alone is not ownership evidence. Disclose conflicting, stale or team-only evidence;
do not invent a named owner or take one from project instructions or examples.
A recommendation is not assignment authorization:
do not resolve source assignees, provision users or write records for an investigation question.

Before answering, include the relevant document findings and the evidence for the recommendation
alongside ServiceNow facts, keeping cause unconfirmed unless supported.
If allowed evidence is missing or unreadable, state the gap and distinguish no matching evidence
from unavailable tools, denied access and failed requests. Do not claim enterprise grounding is complete.
