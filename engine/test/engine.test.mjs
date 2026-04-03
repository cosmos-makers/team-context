/**
 * Phase 2 Verification: DB + indexer + FTS + vector + hybrid + graph
 * Run: node test/engine.test.mjs
 */

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

import { getDb, closeDb, initSchema, SCHEMA_VERSION } from '../dist/index.js';
import { indexDocuments } from '../dist/indexer/indexer.js';
import { parseMarkdown, chunkMarkdown } from '../dist/indexer/parser.js';
import { scanDirectory } from '../dist/indexer/scanner.js';
import { ftsSearch } from '../dist/search/fts.js';
import { cosineSimilarity, blobToFloat64Array, float64ArrayToBlob, vectorSearch } from '../dist/search/vector.js';
import { hybridSearch } from '../dist/search/hybrid.js';
import { upsertEntity, addRelationship, searchEntities, getNeighborhood } from '../dist/graph/store.js';
import Database from 'better-sqlite3';

// --- Setup ---
let tmpDir;
let knowledgeDir;
let dbPath;
let db;

before(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'tc-test-'));
  knowledgeDir = join(tmpDir, 'knowledge');
  dbPath = join(tmpDir, 'test.db');

  // Create test knowledge base
  mkdirSync(join(knowledgeDir, 'domains', 'frontend'), { recursive: true });
  mkdirSync(join(knowledgeDir, 'decisions', '2026'), { recursive: true });
  mkdirSync(join(knowledgeDir, 'glossary'), { recursive: true });

  writeFileSync(join(knowledgeDir, 'domains', 'frontend', 'react-migration.md'), `---
id: react-migration
type: fact
domain: frontend
status: active
confidence: high
source: meeting
source_ref: "https://wiki.example.com/react-migration"
recorded_at: 2026-03-15
tags: [react, migration, clip-home]
entities: [ClipHome, React]
context: "클립홈 프론트엔드 리액트 마이그레이션 진행 중"
---

# React Migration

## Summary

클립홈 서비스를 React 18로 마이그레이션하고 있다. Server Components 도입 예정.

## Details

현재 Vue 2 기반이며, 2026 Q2까지 완료 목표.
`);

  writeFileSync(join(knowledgeDir, 'decisions', '2026', 'use-nextjs.md'), `---
id: use-nextjs
type: decision
domain: frontend
status: active
confidence: high
source: meeting
recorded_at: 2026-02-01
tags: [nextjs, architecture]
entities: [Next.js, React]
context: "프레임워크 선정 회의에서 결정"
---

# Next.js 도입 결정

## Decision

클립홈 리빌드에 Next.js App Router를 사용한다.

## Rationale

SSR + RSC 지원, 팀 경험, 에코시스템.
`);

  writeFileSync(join(knowledgeDir, 'glossary', 'clip-home.md'), `---
id: clip-home
type: term
domain: product
status: active
confidence: high
source: document
recorded_at: 2026-01-01
tags: [clip, product]
entities: [ClipHome]
context: "클립 서비스의 메인 홈 화면"
---

# ClipHome (클립홈)

## Definition

네이버 클립 서비스의 메인 진입점. 숏폼 비디오 피드, 크리에이터 추천, 검색 기능 제공.
`);

  db = new Database(dbPath);
  initSchema(db);
});

after(() => {
  if (db) db.close();
  rmSync(tmpDir, { recursive: true, force: true });
});

// --- Test: Schema ---
describe('Schema', () => {
  test('creates all tables', () => {
    const tables = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
    ).all().map(r => r.name);

    assert.ok(tables.includes('documents'), 'documents table');
    assert.ok(tables.includes('documents_fts'), 'documents_fts table');
    assert.ok(tables.includes('embeddings'), 'embeddings table');
    assert.ok(tables.includes('entities'), 'entities table');
    assert.ok(tables.includes('relationships'), 'relationships table');
    assert.ok(tables.includes('meta'), 'meta table');
  });

  test('schema version is set', () => {
    const row = db.prepare("SELECT value FROM meta WHERE key='schema_version'").get();
    assert.equal(row.value, String(SCHEMA_VERSION));
  });
});

// --- Test: Parser ---
describe('Parser', () => {
  test('parses frontmatter and content', () => {
    const md = `---
id: test-doc
type: fact
source: meeting
recorded_at: 2026-01-01
---

# Test Document

Some content here.`;

    const { frontmatter, content, title } = parseMarkdown(md);
    assert.equal(frontmatter.id, 'test-doc');
    assert.equal(frontmatter.type, 'fact');
    assert.equal(title, 'Test Document');
    assert.ok(content.includes('Some content here'));
  });

  test('chunks markdown by headings', () => {
    const md = `# Title

Intro text.

## Section 1

Section 1 content.

## Section 2

Section 2 content.`;

    const chunks = chunkMarkdown(md);
    assert.ok(chunks.length >= 2, `got ${chunks.length} chunks`);
    assert.ok(chunks.some(c => c.heading === 'Section 1'));
    assert.ok(chunks.some(c => c.heading === 'Section 2'));
  });
});

// --- Test: Scanner ---
describe('Scanner', () => {
  test('finds all markdown files', () => {
    const files = scanDirectory(knowledgeDir);
    assert.equal(files.length, 3, `found ${files.length} files`);
    assert.ok(files.some(f => f.relativePath.includes('react-migration.md')));
    assert.ok(files.some(f => f.relativePath.includes('use-nextjs.md')));
    assert.ok(files.some(f => f.relativePath.includes('clip-home.md')));
  });

  test('skips hidden and underscore files', () => {
    writeFileSync(join(knowledgeDir, '.hidden.md'), '# Hidden');
    writeFileSync(join(knowledgeDir, '_template.md'), '# Template');
    const files = scanDirectory(knowledgeDir);
    assert.ok(!files.some(f => f.relativePath.includes('.hidden')));
    assert.ok(!files.some(f => f.relativePath.includes('_template')));
  });
});

// --- Test: Indexer ---
describe('Indexer', () => {
  test('indexes all documents', () => {
    const result = indexDocuments(db, knowledgeDir);
    assert.equal(result.added, 3);
    assert.equal(result.total, 3);

    const count = db.prepare('SELECT COUNT(*) as n FROM documents').get();
    assert.equal(count.n, 3);
  });

  test('stores frontmatter fields correctly', () => {
    const doc = db.prepare("SELECT * FROM documents WHERE path LIKE '%react-migration%'").get();
    assert.equal(doc.type, 'fact');
    assert.equal(doc.domain, 'frontend');
    assert.equal(doc.status, 'active');
    assert.equal(doc.confidence, 'high');
    assert.ok(doc.content.includes('React 18'));
  });

  test('incremental — no changes on re-index', () => {
    const result = indexDocuments(db, knowledgeDir);
    assert.equal(result.added, 0);
    assert.equal(result.updated, 0);
  });
});

// --- Test: FTS Search ---
describe('FTS Search', () => {
  test('finds by keyword', () => {
    const results = ftsSearch(db, 'React migration');
    assert.ok(results.length > 0, 'found results');
    assert.ok(results[0].path.includes('react-migration'));
  });

  test('finds by Korean content', () => {
    const results = ftsSearch(db, '클립홈');
    assert.ok(results.length > 0, 'found 클립홈 results');
  });

  test('filters by type', () => {
    const results = ftsSearch(db, 'React', { type: 'decision' });
    assert.ok(results.every(r => r.type === 'decision'));
  });

  test('filters by domain', () => {
    const results = ftsSearch(db, 'Next.js', { domain: 'frontend' });
    assert.ok(results.every(r => r.domain === 'frontend'));
  });
});

// --- Test: Vector utilities ---
describe('Vector utilities', () => {
  test('cosine similarity of identical vectors = 1', () => {
    const v = new Float64Array([1, 2, 3, 4]);
    assert.ok(Math.abs(cosineSimilarity(v, v) - 1.0) < 0.001);
  });

  test('cosine similarity of orthogonal vectors = 0', () => {
    const a = new Float64Array([1, 0]);
    const b = new Float64Array([0, 1]);
    assert.ok(Math.abs(cosineSimilarity(a, b)) < 0.001);
  });

  test('blob roundtrip preserves data', () => {
    const original = new Float64Array([1.5, 2.7, -3.14, 0]);
    const blob = float64ArrayToBlob(original);
    const restored = blobToFloat64Array(blob);
    assert.equal(original.length, restored.length);
    for (let i = 0; i < original.length; i++) {
      assert.ok(Math.abs(original[i] - restored[i]) < 0.0001);
    }
  });
});

// --- Test: Hybrid Search (FTS-only mode, no embeddings) ---
describe('Hybrid Search', () => {
  test('works with FTS only (no embeddings)', () => {
    const results = hybridSearch(db, 'React migration', null);
    assert.ok(results.length > 0, 'found results');
    assert.ok(results[0].score > 0);
    assert.ok(results[0].ftsRank !== null);
    assert.equal(results[0].vectorSimilarity, null);
  });

  test('filters by type', () => {
    const results = hybridSearch(db, 'React', null, { type: 'decision' });
    assert.ok(results.every(r => r.type === 'decision'));
  });
});

// --- Test: Graph ---
describe('Graph', () => {
  test('upsert entity', () => {
    const id1 = upsertEntity(db, 'React', 'technology');
    const id2 = upsertEntity(db, 'React', 'technology');
    assert.equal(id1, id2, 'same entity returns same ID');
  });

  test('add relationship', () => {
    const reactId = upsertEntity(db, 'React', 'technology');
    const nextId = upsertEntity(db, 'Next.js', 'technology');
    const relId = addRelationship(db, nextId, reactId, 'uses');
    assert.ok(relId > 0);
  });

  test('search entities', () => {
    upsertEntity(db, 'ClipHome', 'project');
    const results = searchEntities(db, 'Clip');
    assert.ok(results.length > 0);
    assert.ok(results.some(e => e.name === 'ClipHome'));
  });

  test('get neighborhood', () => {
    const reactId = upsertEntity(db, 'React', 'technology');
    const { entities, relationships } = getNeighborhood(db, reactId, 1);
    assert.ok(entities.length > 0);
    assert.ok(entities.some(e => e.name === 'React'));
  });
});
