---
name: search
description: >
  Search the team knowledge base using hybrid search (FTS + semantic).
  Trigger: "팀 지식에서 찾아줘", "tc search", "team context search",
  or when the user asks a question that could be answered by team knowledge.
---

Search the Team Context knowledge base for relevant knowledge.

## Steps

1. Call the `tc_search` MCP tool with the user's query:
   ```
   tc_search(query: "{user query}", limit: 10)
   ```

2. Optionally add filters if the user specifies:
   - `type`: fact, decision, procedure, heuristic, profile, term, artifact
   - `domain`: frontend, backend, etc.

3. Present results clearly:
   - Show title, type, domain, and relevant snippet
   - If the user wants details, use Read to show the full file

4. If no results found:
   - Try broader search terms
   - Suggest the user might want to `/tc:ingest` this knowledge
