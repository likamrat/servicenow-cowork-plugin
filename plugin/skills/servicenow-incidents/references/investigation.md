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

Use at most three searches in total:

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
   Stop searching once inspected evidence answers the request.

Answer the business question naturally with linked evidence. Keep query mechanics
internal unless requested. Distinguish relevant records from a confirmed cause.
If the bounded search remains inconclusive, say what could not be established.
Empty matches prove neither absence of related incidents nor connection health.
Report actual tool failures separately; changing permissions is not a search strategy.
