---
name: init
description: >
  Initialize Team Context in the current project.
  Creates the knowledge folder structure, config file, and installs the MCP server.
  Trigger: "team context 초기화", "init team context", "팀 지식 셋업", "/tc:init"
---

Initialize the Team Context knowledge base in the current project.

## Steps

### 1. Ask for configuration

Ask the user:
- **Knowledge root path** (default: `./knowledge`)
- **Domains** — what knowledge domains does this team have? (suggest: frontend, backend, infra, ai, product)

### 2. Create folder structure

Based on `taxonomy/structure.json`, create:

```
{root}/
├── README.md
├── domains/
│   └── {each domain}/
├── decisions/
├── people/
├── procedures/
├── artifacts/
├── tacit/
│   ├── heuristics/
│   ├── lessons/
│   └── anti-patterns/
└── glossary/
```

Copy `_template.md` from `template/` into each top-level category folder.

### 3. Create config

Write `.team-context/config.json`:
```json
{
  "root": "{chosen root path}",
  "db": ".team-context/index.db",
  "taxonomy": "default",
  "domains": ["{user's domains}"]
}
```

### 4. Add to .gitignore

Append to `.gitignore` (if it exists):
```
.team-context/index.db
```

### 5. Register MCP server

Add the team-context MCP server to the project's Claude Code settings.
The server binary is at `{plugin-path}/engine/dist/mcp/server.js`.

### 6. Initial index

Call `tc_reindex()` to index any existing files.

### 7. Report

```
✅ Team Context initialized!

Knowledge base: {root}/
Config: .team-context/config.json
Database: .team-context/index.db

Available commands:
  /tc:ingest  — Add knowledge from a source
  /tc:search  — Search the knowledge base
  /tc:explore — Explore the knowledge graph
  /tc:gaps    — Analyze knowledge coverage

Get started: paste a URL or text and say "이거 팀 지식에 추가해줘"
```
