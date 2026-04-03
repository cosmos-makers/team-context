export { getDb, closeDb } from './db/connection.js';
export { initSchema, SCHEMA_VERSION } from './db/schema.js';
export { indexDocuments, type IndexResult } from './indexer/indexer.js';
export { parseMarkdown, chunkMarkdown } from './indexer/parser.js';
export { scanDirectory } from './indexer/scanner.js';
export { ftsSearch, type FtsResult, type FtsOptions } from './search/fts.js';
export { vectorSearch, cosineSimilarity, blobToFloat64Array, float64ArrayToBlob, type VectorResult } from './search/vector.js';
export { hybridSearch, type HybridResult, type HybridSearchOptions } from './search/hybrid.js';
export { upsertEntity, addRelationship, searchEntities, getNeighborhood, type Entity, type Relationship } from './graph/store.js';
