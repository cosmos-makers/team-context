# Team Context

[한국어](README.ko.md)

A shared team knowledge mounting system for AI coding agents. Fork this template, fill it with your team's knowledge, and let your AI agent reference it automatically.

## Why

AI coding agents start every conversation from scratch. They don't know your team's conventions, glossary, project structure, or who owns what. **Team Context** fixes this — mount a shared knowledge repo and your agent instantly understands the team.

## How It Works

```
┌─────────────────────────────────┐
│  Team repo (GitHub/GHE)         │
│  conventions/ glossary/ ...     │
└──────────────┬──────────────────┘
               │  mount
               ▼
┌─────────────────────────────────┐
│  ~/.claude/team-context/{id}/   │
│  Local cache + CLAUDE.md inject │
└──────────────┬──────────────────┘
               │  auto-reference
               ▼
┌─────────────────────────────────┐
│  AI agent reads team knowledge  │
│  during any conversation        │
└─────────────────────────────────┘
```

1. **Fork** this template repo
2. **Fill** it with your team's docs (conventions, glossary, projects, services)
3. **Mount** it in Claude Code:
   ```
   Install team context from: https://[your-pages-url]/SETUP.md
   ```
4. Your agent now knows your team's knowledge

## What Goes In

| Directory | Purpose |
|-----------|---------|
| `glossary/` | Team-specific terms, acronyms, internal system names |
| `conventions/` | Coding conventions, naming rules, branch strategy |
| `projects/` | Current projects, epics, sprint info |
| `services/` | Service architecture, dependencies, ownership |
| `docs/` | Onboarding guides, process docs |

## Operations

| Command | What It Does |
|---------|--------------|
| **mount** | Install a team context from a SETUP.md URL |
| **unmount** | Remove a mounted team context |
| **update** | Pull latest from remote repo |
| **push** | Add/edit content and push back to the shared repo |

## External Source Sync

Add `.context/sources.yml` to auto-sync from Confluence, Jira, or GitHub:

```yaml
sources:
  - id: team-wiki
    type: confluence
    space: YOUR_SPACE_KEY
    sync_to: docs/
```

See [sources.example.yml](.context/sources.example.yml) for the full template.

## Guardrails

Built-in safety rules prevent collecting secrets, PII, personal opinions, or org-sensitive information. The guardrails enforce: **improve systems and processes, never judge people.**

## License

MIT
