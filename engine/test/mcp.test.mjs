/**
 * Phase 3 Verification: MCP server tools — end-to-end test
 * Tests the tool handlers directly (no stdio transport needed)
 * Run: node test/mcp.test.mjs
 */

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import Database from 'better-sqlite3';

import { initSchema } from '../dist/db/schema.js';
import { indexDocuments } from '../dist/indexer/indexer.js';
import { ftsSearch } from '../dist/search/fts.js';
import { hybridSearch } from '../dist/search/hybrid.js';
import { searchEntities, getNeighborhood, upsertEntity, addRelationship } from '../dist/graph/store.js';

let tmpDir, knowledgeDir, db;

before(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'tc-mcp-'));
  knowledgeDir = join(tmpDir, 'knowledge');

  // Create a realistic knowledge base
  mkdirSync(join(knowledgeDir, 'domains', 'frontend'), { recursive: true });
  mkdirSync(join(knowledgeDir, 'domains', 'backend'), { recursive: true });
  mkdirSync(join(knowledgeDir, 'decisions', '2026'), { recursive: true });
  mkdirSync(join(knowledgeDir, 'people'), { recursive: true });
  mkdirSync(join(knowledgeDir, 'procedures', 'dev'), { recursive: true });
  mkdirSync(join(knowledgeDir, 'tacit', 'lessons'), { recursive: true });
  mkdirSync(join(knowledgeDir, 'glossary'), { recursive: true });

  const docs = [
    ['domains/frontend/react-hooks-pattern.md', {
      id: 'react-hooks-pattern', type: 'fact', domain: 'frontend', status: 'active',
      source: 'code-review', recorded_at: '2026-03-01',
      tags: ['react', 'hooks', 'pattern'], entities: ['React', 'ClipHome'],
      context: 'Custom hooks pattern used across clip-home'
    }, '# React Hooks Pattern\n\n## Summary\n\nWe use custom hooks for data fetching with SWR.\n\n## Details\n\nAll API calls go through `useApi()` hook.'],

    ['domains/backend/clip-api-v2.md', {
      id: 'clip-api-v2', type: 'fact', domain: 'backend', status: 'active',
      source: 'document', recorded_at: '2026-02-15',
      tags: ['api', 'clip', 'v2'], entities: ['Clip API', 'Clip Core Dev'],
      context: 'API v2 migration documentation'
    }, '# Clip API v2\n\n## Summary\n\nNew REST API with pagination and filtering support.\n\n## Endpoints\n\nGET /v2/clips, POST /v2/clips'],

    ['decisions/2026/nextjs-adoption.md', {
      id: 'nextjs-adoption', type: 'decision', domain: 'frontend', status: 'active',
      source: 'meeting', recorded_at: '2026-02-01',
      tags: ['nextjs', 'architecture'], entities: ['Next.js', 'React', 'ClipHome'],
      context: 'Framework selection meeting'
    }, '# Next.js Adoption\n\n## Decision\n\nUse Next.js App Router for ClipHome rebuild.\n\n## Rationale\n\nSSR support, React Server Components, team familiarity.'],

    ['people/goh-donghyun.md', {
      id: 'goh-donghyun', type: 'profile', domain: 'frontend', status: 'active',
      source: 'observation', recorded_at: '2026-03-15',
      tags: ['team'], entities: ['고동현', 'ClipHome', 'React'],
      context: 'Clip Web team member'
    }, '# 고동현\n\n## Expertise\n\nReact, TypeScript, Clip Profile Web\n\n## Ask Them About\n\n- Clip Profile architecture\n- Series On web player'],

    ['procedures/dev/deploy-checklist.md', {
      id: 'deploy-checklist', type: 'procedure', domain: 'frontend', status: 'active',
      source: 'document', recorded_at: '2026-01-20',
      tags: ['deploy', 'checklist'], entities: ['ClipHome'],
      context: 'Production deployment process'
    }, '# Deploy Checklist\n\n## Steps\n\n1. Run tests\n2. Build production\n3. Deploy to staging\n4. Smoke test\n5. Deploy to production'],

    ['tacit/lessons/ssr-hydration-mismatch.md', {
      id: 'ssr-hydration-mismatch', type: 'heuristic', domain: 'frontend', status: 'active',
      confidence: 'medium', source: 'observation', recorded_at: '2026-03-10',
      tags: ['ssr', 'hydration', 'debugging'], entities: ['Next.js', 'React'],
      context: 'Lesson from production incident'
    }, '# SSR Hydration Mismatch\n\n## The Insight\n\nAlways check `useEffect` timing when you see hydration errors.\n\n## Story\n\nWe spent 2 days debugging a hydration mismatch caused by locale-dependent date formatting.'],

    ['glossary/clip-home.md', {
      id: 'clip-home-term', type: 'term', domain: 'product', status: 'active',
      source: 'document', recorded_at: '2026-01-01',
      tags: ['clip', 'product'], entities: ['ClipHome'],
      context: 'Main entry point of Naver Clip'
    }, '# ClipHome\n\n## Definition\n\nThe main landing page of Naver Clip service featuring short-form video feed.'],
  ];

  for (const [path, fm, body] of docs) {
    const fmLines = Object.entries(fm).map(([k, v]) => {
      if (Array.isArray(v)) return `${k}: [${v.map(i => `"${i}"`).join(', ')}]`;
      return `${k}: "${v}"`;
    });
    const content = `---\n${fmLines.join('\n')}\n---\n\n${body}`;
    const fullPath = join(knowledgeDir, path);
    writeFileSync(fullPath, content);
  }

  db = new Database(join(tmpDir, 'test.db'));
  initSchema(db);

  // Index
  indexDocuments(db, knowledgeDir);

  // Seed entities and relationships
  const clipHomeId = upsertEntity(db, 'ClipHome', 'project');
  const reactId = upsertEntity(db, 'React', 'technology');
  const nextjsId = upsertEntity(db, 'Next.js', 'technology');
  const gohId = upsertEntity(db, '고동현', 'person');
  const clipApiId = upsertEntity(db, 'Clip API', 'technology');
  const coreDevId = upsertEntity(db, 'Clip Core Dev', 'org');

  addRelationship(db, clipHomeId, reactId, 'uses');
  addRelationship(db, clipHomeId, nextjsId, 'uses');
  addRelationship(db, gohId, clipHomeId, 'works-on');
  addRelationship(db, gohId, reactId, 'expert-in');
  addRelationship(db, clipApiId, coreDevId, 'maintained-by');
});

after(() => {
  if (db) db.close();
  rmSync(tmpDir, { recursive: true, force: true });
});

// --- tc_search ---
describe('tc_search', () => {
  test('finds by keyword', () => {
    const results = hybridSearch(db, 'React hooks', null, { limit: 10 });
    assert.ok(results.length > 0);
    assert.ok(results.some(r => r.path.includes('react-hooks')));
  });

  test('finds Korean content', () => {
    const results = hybridSearch(db, '고동현', null, { limit: 10 });
    assert.ok(results.length > 0);
  });

  test('filters by type=decision', () => {
    const results = hybridSearch(db, 'Next.js', null, { type: 'decision', limit: 10 });
    assert.ok(results.length > 0);
    assert.ok(results.every(r => r.type === 'decision'));
  });

  test('filters by domain=backend', () => {
    const results = hybridSearch(db, 'API', null, { domain: 'backend', limit: 10 });
    assert.ok(results.length > 0);
    assert.ok(results.every(r => r.domain === 'backend'));
  });

  test('returns ranked results', () => {
    const results = hybridSearch(db, 'ClipHome React', null, { limit: 10 });
    assert.ok(results.length >= 2);
    // Scores should be descending
    for (let i = 1; i < results.length; i++) {
      assert.ok(results[i - 1].score >= results[i].score, 'scores descending');
    }
  });
});

// --- tc_reindex ---
describe('tc_reindex', () => {
  test('all 7 documents indexed', () => {
    const count = db.prepare('SELECT COUNT(*) as n FROM documents').get();
    assert.equal(count.n, 7);
  });

  test('frontmatter fields stored correctly', () => {
    const doc = db.prepare("SELECT * FROM documents WHERE path LIKE '%nextjs-adoption%'").get();
    assert.equal(doc.type, 'decision');
    assert.equal(doc.domain, 'frontend');
    assert.equal(doc.status, 'active');
    assert.ok(doc.content.includes('App Router'));
  });

  test('incremental reindex is stable', () => {
    const result = indexDocuments(db, knowledgeDir);
    assert.equal(result.added, 0);
    assert.equal(result.updated, 0);
    assert.equal(result.removed, 0);
  });
});

// --- tc_entities ---
describe('tc_entities', () => {
  test('finds entity by name', () => {
    const results = searchEntities(db, 'React');
    assert.ok(results.length > 0);
    assert.ok(results.some(e => e.name === 'React'));
  });

  test('finds entity by partial match', () => {
    const results = searchEntities(db, 'Clip');
    assert.ok(results.length >= 2, `found ${results.length} Clip entities`);
  });

  test('filters by type', () => {
    const results = searchEntities(db, '고동현', 'person');
    assert.ok(results.length > 0);
    assert.equal(results[0].type, 'person');
  });
});

// --- tc_explore ---
describe('tc_explore', () => {
  test('explores neighborhood of ClipHome', () => {
    const matches = searchEntities(db, 'ClipHome', undefined, 1);
    assert.ok(matches.length > 0);

    const { entities, relationships } = getNeighborhood(db, matches[0].id, 1);
    assert.ok(entities.length >= 3, `ClipHome has ${entities.length} neighbors`);
    assert.ok(relationships.length >= 2, `ClipHome has ${relationships.length} relationships`);
  });

  test('finds path through graph (depth 2)', () => {
    const goh = searchEntities(db, '고동현', undefined, 1);
    assert.ok(goh.length > 0);

    const { entities } = getNeighborhood(db, goh[0].id, 2);
    // 고동현 -> ClipHome -> React/Next.js — should reach at least 3 entities
    assert.ok(entities.length >= 3, `depth 2 from 고동현 reaches ${entities.length} entities`);
  });
});

// --- tc_stats ---
describe('tc_stats', () => {
  test('counts by type', () => {
    const rows = db.prepare('SELECT type, COUNT(*) as n FROM documents GROUP BY type ORDER BY n DESC').all();
    assert.ok(rows.length >= 4, `found ${rows.length} types`);

    const typeMap = Object.fromEntries(rows.map(r => [r.type, r.n]));
    assert.equal(typeMap.fact, 2);       // react-hooks + clip-api
    assert.equal(typeMap.decision, 1);   // nextjs-adoption
    assert.equal(typeMap.profile, 1);    // goh-donghyun
    assert.equal(typeMap.procedure, 1);  // deploy-checklist
    assert.equal(typeMap.heuristic, 1);  // ssr-hydration
    assert.equal(typeMap.term, 1);       // clip-home
  });

  test('counts by domain', () => {
    const rows = db.prepare('SELECT domain, COUNT(*) as n FROM documents GROUP BY domain').all();
    const domainMap = Object.fromEntries(rows.map(r => [r.domain, r.n]));
    assert.ok(domainMap.frontend >= 4);
    assert.ok(domainMap.backend >= 1);
    assert.ok(domainMap.product >= 1);
  });

  test('entity and relationship counts', () => {
    const entityCount = db.prepare('SELECT COUNT(*) as n FROM entities').get();
    const relCount = db.prepare('SELECT COUNT(*) as n FROM relationships').get();
    assert.ok(entityCount.n >= 5, `${entityCount.n} entities`);
    assert.ok(relCount.n >= 4, `${relCount.n} relationships`);
  });
});

// --- Cross-cutting: taxonomy coverage ---
describe('Taxonomy coverage', () => {
  test('all 7 folders have at least one document', () => {
    const paths = db.prepare('SELECT path FROM documents').all().map(r => r.path);
    const categories = ['domains/', 'decisions/', 'people/', 'procedures/', 'tacit/', 'glossary/'];
    for (const cat of categories) {
      assert.ok(
        paths.some(p => p.startsWith(cat)),
        `category ${cat} has documents`
      );
    }
  });

  test('all document types are represented', () => {
    const types = db.prepare('SELECT DISTINCT type FROM documents').all().map(r => r.type);
    const expected = ['fact', 'decision', 'profile', 'procedure', 'heuristic', 'term'];
    for (const t of expected) {
      assert.ok(types.includes(t), `type ${t} present`);
    }
  });
});
