#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { getDb, closeDb } from '../db/connection.js';
import { indexDocuments } from '../indexer/indexer.js';
import { ftsSearch } from '../search/fts.js';
import { hybridSearch } from '../search/hybrid.js';
import { searchEntities, getNeighborhood, upsertEntity } from '../graph/store.js';
import { existsSync, readFileSync } from 'fs';
import { join, resolve } from 'path';

// Config
interface TcConfig {
  root: string;
  db: string;
  domains: string[];
}

function loadConfig(configPath?: string): TcConfig {
  const searchPaths = [
    configPath,
    process.env.TC_CONFIG,
    join(process.cwd(), '.team-context', 'config.json'),
  ].filter(Boolean) as string[];

  for (const p of searchPaths) {
    if (existsSync(p)) {
      const raw = JSON.parse(readFileSync(p, 'utf-8'));
      return {
        root: resolve(raw.root || './knowledge'),
        db: resolve(raw.db || '.team-context/index.db'),
        domains: raw.domains || [],
      };
    }
  }

  // Defaults
  return {
    root: resolve(process.env.TC_ROOT || './knowledge'),
    db: resolve(process.env.TC_DB || '.team-context/index.db'),
    domains: [],
  };
}

const config = loadConfig();
const db = getDb(config.db);

// Tools definition
const TOOLS = [
  {
    name: 'tc_search',
    description: 'Hybrid search over the team knowledge base (FTS5 + optional vector). Returns ranked results.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        query: { type: 'string', description: 'Search query' },
        type: { type: 'string', description: 'Filter by type: fact|decision|procedure|heuristic|profile|term|artifact' },
        domain: { type: 'string', description: 'Filter by domain' },
        limit: { type: 'number', description: 'Max results (default 10)' },
      },
      required: ['query'],
    },
  },
  {
    name: 'tc_reindex',
    description: 'Re-scan and index all markdown files in the knowledge base.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        force: { type: 'boolean', description: 'Force full reindex (default: incremental)' },
      },
    },
  },
  {
    name: 'tc_entities',
    description: 'Search entities in the knowledge graph by name or type.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        query: { type: 'string', description: 'Entity name to search' },
        type: { type: 'string', description: 'Filter by entity type: person|project|technology|org|concept' },
        limit: { type: 'number', description: 'Max results (default 20)' },
      },
      required: ['query'],
    },
  },
  {
    name: 'tc_explore',
    description: 'Explore the knowledge graph around an entity — returns neighbors and relationships.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        entity: { type: 'string', description: 'Entity name to explore' },
        depth: { type: 'number', description: 'Graph traversal depth (default 1, max 3)' },
      },
      required: ['entity'],
    },
  },
  {
    name: 'tc_stats',
    description: 'Knowledge base statistics — document counts by type/domain, staleness, coverage.',
    inputSchema: {
      type: 'object' as const,
      properties: {},
    },
  },
];

// Tool handlers
async function handleSearch(args: Record<string, unknown>) {
  const query = args.query as string;
  const results = hybridSearch(db, query, null, {
    type: args.type as string | undefined,
    domain: args.domain as string | undefined,
    limit: (args.limit as number) ?? 10,
  });

  if (results.length === 0) {
    return { content: [{ type: 'text' as const, text: 'No results found.' }] };
  }

  const lines = results.map((r, i) =>
    `${i + 1}. **${r.title}** (${r.path})\n   type: ${r.type ?? '—'} | domain: ${r.domain ?? '—'} | score: ${r.score.toFixed(4)}\n   ${r.snippet || ''}`
  );

  return { content: [{ type: 'text' as const, text: lines.join('\n\n') }] };
}

async function handleReindex(args: Record<string, unknown>) {
  if (!existsSync(config.root)) {
    return { content: [{ type: 'text' as const, text: `Knowledge root not found: ${config.root}` }] };
  }

  const result = indexDocuments(db, config.root);

  // Auto-extract entities from frontmatter
  const docs = db.prepare('SELECT id, entities FROM documents').all() as { id: number; entities: string }[];
  let entityCount = 0;
  for (const doc of docs) {
    try {
      const entities = JSON.parse(doc.entities || '[]') as string[];
      for (const name of entities) {
        if (name && name.length > 0) {
          upsertEntity(db, name);
          entityCount++;
        }
      }
    } catch { /* skip malformed */ }
  }

  return {
    content: [{
      type: 'text' as const,
      text: `Reindex complete: ${result.added} added, ${result.updated} updated, ${result.removed} removed (${result.total} files). ${entityCount} entity refs processed.`,
    }],
  };
}

async function handleEntities(args: Record<string, unknown>) {
  const results = searchEntities(
    db,
    args.query as string,
    args.type as string | undefined,
    (args.limit as number) ?? 20
  );

  if (results.length === 0) {
    return { content: [{ type: 'text' as const, text: 'No entities found.' }] };
  }

  const lines = results.map(e =>
    `- **${e.name}** (${e.type ?? 'unknown'})${e.aliases.length > 0 ? ` aka: ${e.aliases.join(', ')}` : ''}`
  );

  return { content: [{ type: 'text' as const, text: lines.join('\n') }] };
}

async function handleExplore(args: Record<string, unknown>) {
  const entityName = args.entity as string;
  const depth = Math.min((args.depth as number) ?? 1, 3);

  // Find entity
  const matches = searchEntities(db, entityName, undefined, 1);
  if (matches.length === 0) {
    return { content: [{ type: 'text' as const, text: `Entity "${entityName}" not found.` }] };
  }

  const entity = matches[0];
  const { entities, relationships } = getNeighborhood(db, entity.id, depth);

  const entityLines = entities.map(e => `- ${e.name} (${e.type ?? '?'})`);
  const relLines = relationships.map(r =>
    `- ${r.sourceName} --[${r.type}]--> ${r.targetName}${r.context ? ` (${r.context})` : ''}`
  );

  const text = [
    `## ${entity.name} — Knowledge Graph (depth ${depth})`,
    '',
    `### Entities (${entities.length})`,
    ...entityLines,
    '',
    `### Relationships (${relationships.length})`,
    ...(relLines.length > 0 ? relLines : ['(none)']),
  ].join('\n');

  return { content: [{ type: 'text' as const, text }] };
}

async function handleStats() {
  const total = (db.prepare('SELECT COUNT(*) as n FROM documents').get() as { n: number }).n;
  const byType = db.prepare('SELECT type, COUNT(*) as n FROM documents GROUP BY type ORDER BY n DESC').all() as { type: string; n: number }[];
  const byDomain = db.prepare('SELECT domain, COUNT(*) as n FROM documents GROUP BY domain ORDER BY n DESC').all() as { domain: string; n: number }[];
  const entityCount = (db.prepare('SELECT COUNT(*) as n FROM entities').get() as { n: number }).n;
  const relCount = (db.prepare('SELECT COUNT(*) as n FROM relationships').get() as { n: number }).n;

  const statusCounts = db.prepare('SELECT status, COUNT(*) as n FROM documents GROUP BY status').all() as { status: string; n: number }[];

  const lines = [
    `## Team Context Stats`,
    ``,
    `**Total documents**: ${total}`,
    `**Entities**: ${entityCount} | **Relationships**: ${relCount}`,
    ``,
    `### By Type`,
    ...byType.map(r => `- ${r.type ?? '(none)'}: ${r.n}`),
    ``,
    `### By Domain`,
    ...byDomain.map(r => `- ${r.domain ?? '(none)'}: ${r.n}`),
    ``,
    `### By Status`,
    ...statusCounts.map(r => `- ${r.status ?? '(none)'}: ${r.n}`),
  ];

  return { content: [{ type: 'text' as const, text: lines.join('\n') }] };
}

// Server setup
const server = new Server(
  { name: 'team-context', version: '0.2.0' },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: TOOLS,
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args = {} } = request.params;

  switch (name) {
    case 'tc_search': return handleSearch(args);
    case 'tc_reindex': return handleReindex(args);
    case 'tc_entities': return handleEntities(args);
    case 'tc_explore': return handleExplore(args);
    case 'tc_stats': return handleStats();
    default:
      return { content: [{ type: 'text' as const, text: `Unknown tool: ${name}` }] };
  }
});

// Start
const transport = new StdioServerTransport();
await server.connect(transport);

process.on('SIGINT', () => {
  closeDb();
  process.exit(0);
});
