---
name: explore
description: >
  Explore the knowledge graph around a topic or entity.
  Trigger: "이 주제 탐색해줘", "explore", "knowledge map",
  "누가 이거 알아?", "관련 지식 보여줘"
---

Explore the Team Context knowledge graph to discover connections.

## Steps

1. Identify the entity the user wants to explore.

2. Call `tc_entities` to find matching entities:
   ```
   tc_entities(query: "{entity name}")
   ```

3. Call `tc_explore` to get the neighborhood:
   ```
   tc_explore(entity: "{entity name}", depth: 2)
   ```

4. Present the knowledge map:
   - Central entity and its type
   - Connected entities with relationship types
   - Related documents (use `tc_search` with entity name)

5. Offer next steps:
   - "Want me to go deeper into {connected entity}?"
   - "Should I search for documents about {topic}?"
