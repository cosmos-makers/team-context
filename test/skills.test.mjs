/**
 * Phase 4 Verification: Skills structure + plugin metadata
 * Run: node test/skills.test.mjs
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const PLUGIN = join(ROOT, 'framework', 'plugin');
const SKILLS = join(PLUGIN, 'skills');

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passed++;
  } else {
    console.error(`  ✗ ${message}`);
    failed++;
  }
}

// --- Plugin metadata ---
console.log('\n=== Plugin metadata ===');

const pluginJson = JSON.parse(readFileSync(join(PLUGIN, '.claude-plugin', 'plugin.json'), 'utf-8'));
assert(pluginJson.name === 'team-context', 'plugin name');
assert(pluginJson.version === '0.2.0', 'plugin version 0.2.0');
assert(pluginJson.description.length > 20, 'description is meaningful');

// --- Skills existence ---
console.log('\n=== Skills existence ===');

const expectedSkills = ['init', 'ingest', 'search', 'explore', 'gaps'];
for (const skill of expectedSkills) {
  const skillPath = join(SKILLS, skill, 'SKILL.md');
  assert(existsSync(skillPath), `${skill}/SKILL.md exists`);
}

// --- Skill frontmatter validation ---
console.log('\n=== Skill frontmatter ===');

for (const skill of expectedSkills) {
  const content = readFileSync(join(SKILLS, skill, 'SKILL.md'), 'utf-8');

  // Must start with frontmatter
  assert(content.startsWith('---'), `${skill} has frontmatter`);

  // Must have name field
  const nameMatch = content.match(/^name:\s*(.+)$/m);
  assert(nameMatch && nameMatch[1].trim() === skill, `${skill} name matches`);

  // Must have description
  assert(content.includes('description:'), `${skill} has description`);
}

// --- Ingest skill completeness ---
console.log('\n=== Ingest skill completeness ===');

const ingestContent = readFileSync(join(SKILLS, 'ingest', 'SKILL.md'), 'utf-8');

// Must reference all pipeline steps
const requiredSteps = [
  'Decompose',
  'Classify',
  'duplicate',
  'Write',
  'Reindex',
  'Guardrails',
];
for (const step of requiredSteps) {
  assert(
    ingestContent.toLowerCase().includes(step.toLowerCase()),
    `ingest references "${step}"`
  );
}

// Must reference taxonomy files
assert(ingestContent.includes('structure.json'), 'ingest references structure.json');
assert(ingestContent.includes('schema.json'), 'ingest references schema.json');

// Must reference tc_search for dedup
assert(ingestContent.includes('tc_search'), 'ingest uses tc_search for dedup');

// Must reference tc_reindex
assert(ingestContent.includes('tc_reindex'), 'ingest calls tc_reindex');

// Must have all 7 type classifications
const typeKeywords = ['fact', 'decision', 'procedure', 'heuristic', 'profile', 'term', 'artifact'];
for (const t of typeKeywords) {
  assert(ingestContent.includes(t), `ingest handles type: ${t}`);
}

// --- Init skill completeness ---
console.log('\n=== Init skill completeness ===');

const initContent = readFileSync(join(SKILLS, 'init', 'SKILL.md'), 'utf-8');
assert(initContent.includes('config.json'), 'init creates config');
assert(initContent.includes('.gitignore'), 'init updates gitignore');
assert(initContent.includes('tc_reindex'), 'init triggers initial index');
assert(initContent.includes('folder structure') || initContent.includes('structure'), 'init creates folder structure');

// --- Search skill ---
console.log('\n=== Search skill ===');

const searchContent = readFileSync(join(SKILLS, 'search', 'SKILL.md'), 'utf-8');
assert(searchContent.includes('tc_search'), 'search calls tc_search');
assert(searchContent.includes('type') && searchContent.includes('domain'), 'search supports filters');

// --- Explore skill ---
console.log('\n=== Explore skill ===');

const exploreContent = readFileSync(join(SKILLS, 'explore', 'SKILL.md'), 'utf-8');
assert(exploreContent.includes('tc_entities'), 'explore calls tc_entities');
assert(exploreContent.includes('tc_explore'), 'explore calls tc_explore');
assert(exploreContent.includes('depth'), 'explore supports depth');

// --- Gaps skill ---
console.log('\n=== Gaps skill ===');

const gapsContent = readFileSync(join(SKILLS, 'gaps', 'SKILL.md'), 'utf-8');
assert(gapsContent.includes('tc_stats'), 'gaps calls tc_stats');
assert(gapsContent.includes('stale') || gapsContent.includes('Stale'), 'gaps detects staleness');
assert(gapsContent.includes('gap') || gapsContent.includes('Gap'), 'gaps identifies gaps');

// --- Engine integration ---
console.log('\n=== Engine build ===');

assert(existsSync(join(ROOT, 'engine', 'dist', 'mcp', 'server.js')), 'MCP server built');
assert(existsSync(join(ROOT, 'engine', 'dist', 'index.js')), 'engine index built');

// --- Full structure check ---
console.log('\n=== Complete v2 structure ===');

const v2Files = [
  'taxonomy/structure.json',
  'taxonomy/schema.json',
  'template/README.md',
  'template/domains/_template.md',
  'template/decisions/_template.md',
  'template/people/_template.md',
  'template/procedures/_template.md',
  'template/artifacts/_template.md',
  'template/tacit/_template.md',
  'template/glossary/_template.md',
  'engine/package.json',
  'engine/tsconfig.json',
  'engine/src/db/schema.ts',
  'engine/src/db/connection.ts',
  'engine/src/indexer/indexer.ts',
  'engine/src/indexer/parser.ts',
  'engine/src/indexer/scanner.ts',
  'engine/src/search/fts.ts',
  'engine/src/search/vector.ts',
  'engine/src/search/hybrid.ts',
  'engine/src/graph/store.ts',
  'engine/src/mcp/server.ts',
  'engine/src/index.ts',
  'framework/plugin/.claude-plugin/plugin.json',
  'framework/plugin/skills/init/SKILL.md',
  'framework/plugin/skills/ingest/SKILL.md',
  'framework/plugin/skills/search/SKILL.md',
  'framework/plugin/skills/explore/SKILL.md',
  'framework/plugin/skills/gaps/SKILL.md',
];

for (const file of v2Files) {
  assert(existsSync(join(ROOT, file)), file);
}

// --- Summary ---
console.log(`\n${'='.repeat(40)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
