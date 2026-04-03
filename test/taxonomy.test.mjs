/**
 * Phase 1 Verification: Taxonomy structure + schema + templates
 * Run: node test/taxonomy.test.mjs
 */

import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

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

function assertFileExists(path, label) {
  assert(existsSync(join(ROOT, path)), `${label || path} exists`);
}

// --- Test 1: structure.json ---
console.log('\n=== structure.json ===');

const structurePath = join(ROOT, 'taxonomy/structure.json');
assertFileExists('taxonomy/structure.json', 'structure.json');

const structure = JSON.parse(readFileSync(structurePath, 'utf-8'));
assert(structure.version === '1.0.0', 'version is 1.0.0');
assert(Array.isArray(structure.categories), 'categories is array');
assert(structure.categories.length === 7, `7 categories (got ${structure.categories.length})`);

const expectedIds = ['domains', 'decisions', 'people', 'procedures', 'artifacts', 'tacit', 'glossary'];
const actualIds = structure.categories.map(c => c.id);
assert(
  expectedIds.every(id => actualIds.includes(id)),
  `all 7 category IDs present: ${actualIds.join(', ')}`
);

// Each category must have required fields
for (const cat of structure.categories) {
  const hasFields = cat.id && cat.name && cat.cognitiveFunction && cat.memoryType
    && cat.description && cat.academicBasis && cat.path;
  assert(hasFields, `category "${cat.id}" has all required fields`);
}

// Design principles
assert(Array.isArray(structure.designPrinciples), 'designPrinciples is array');
assert(structure.designPrinciples.length >= 5, `≥5 design principles (got ${structure.designPrinciples.length})`);

// --- Test 2: schema.json ---
console.log('\n=== schema.json ===');

assertFileExists('taxonomy/schema.json', 'schema.json');
const schema = JSON.parse(readFileSync(join(ROOT, 'taxonomy/schema.json'), 'utf-8'));

assert(schema.type === 'object', 'schema type is object');
assert(Array.isArray(schema.required), 'required fields defined');

const requiredFields = ['id', 'type', 'source', 'recorded_at'];
assert(
  requiredFields.every(f => schema.required.includes(f)),
  `required fields: ${requiredFields.join(', ')}`
);

const expectedProps = [
  'id', 'type', 'domain', 'status', 'confidence',
  'source', 'source_ref', 'recorded_at', 'expires',
  'tags', 'entities', 'context', 'actionability'
];
const actualProps = Object.keys(schema.properties);
assert(
  expectedProps.every(p => actualProps.includes(p)),
  `all ${expectedProps.length} properties defined`
);

// Type enum must match category types
const typeEnum = schema.properties.type.enum;
assert(typeEnum.length === 7, `7 type values (got ${typeEnum.length})`);
assert(typeEnum.includes('fact') && typeEnum.includes('decision') && typeEnum.includes('procedure'),
  'type enum includes fact, decision, procedure');

// --- Test 3: Template structure ---
console.log('\n=== Template structure ===');

assertFileExists('template/README.md', 'template/README.md');

const templateDirs = ['domains', 'decisions', 'people', 'procedures', 'artifacts', 'tacit', 'glossary'];
for (const dir of templateDirs) {
  assertFileExists(`template/${dir}`, `template/${dir}/`);
}

// Tacit subdirectories
for (const sub of ['heuristics', 'lessons', 'anti-patterns']) {
  assertFileExists(`template/tacit/${sub}`, `template/tacit/${sub}/`);
}

// --- Test 4: Template files with valid frontmatter ---
console.log('\n=== Template frontmatter validation ===');

const templateFiles = [
  'template/domains/_template.md',
  'template/decisions/_template.md',
  'template/people/_template.md',
  'template/procedures/_template.md',
  'template/artifacts/_template.md',
  'template/tacit/_template.md',
  'template/glossary/_template.md',
];

for (const file of templateFiles) {
  assertFileExists(file, file);
  const content = readFileSync(join(ROOT, file), 'utf-8');

  // Must start with frontmatter
  assert(content.startsWith('---'), `${file} starts with frontmatter`);

  // Must contain type field
  assert(content.includes('type:'), `${file} has type field`);

  // Must contain required fields from schema
  for (const field of requiredFields) {
    assert(content.includes(`${field}:`), `${file} has ${field} field`);
  }
}

// --- Test 5: Cognitive function coverage ---
console.log('\n=== Cognitive coverage ===');

const cognitiveFunctions = structure.categories.map(c => c.cognitiveFunction);
assert(cognitiveFunctions.some(f => f.includes('WHAT')), 'covers WHAT');
assert(cognitiveFunctions.some(f => f.includes('WHY')), 'covers WHY');
assert(cognitiveFunctions.some(f => f.includes('WHO')), 'covers WHO');
assert(cognitiveFunctions.some(f => f.includes('HOW')), 'covers HOW');

// Academic basis must reference real papers
for (const cat of structure.categories) {
  assert(
    cat.academicBasis.match(/\(\d{4}\)/),
    `category "${cat.id}" cites a year in academic basis`
  );
}

// --- Summary ---
console.log(`\n${'='.repeat(40)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
