import Database from 'better-sqlite3';
import { ftsSearch, type FtsResult, type FtsOptions } from './fts.js';
import { vectorSearch, type VectorResult, type VectorSearchOptions } from './vector.js';

export interface HybridResult {
  docId: number;
  path: string;
  title: string;
  type: string | null;
  domain: string | null;
  score: number;        // RRF fused score
  ftsRank: number | null;
  vectorSimilarity: number | null;
  snippet: string;
  heading: string;
}

export interface HybridSearchOptions {
  type?: string;
  domain?: string;
  limit?: number;
  ftsWeight?: number;     // Default 1.0
  vectorWeight?: number;  // Default 1.0
  k?: number;             // RRF constant, default 60
}

/**
 * Reciprocal Rank Fusion (RRF)
 * score(d) = sum( weight_i / (k + rank_i) ) for each retriever
 */
export function hybridSearch(
  db: Database.Database,
  query: string,
  queryEmbedding: Float64Array | null,
  opts: HybridSearchOptions = {}
): HybridResult[] {
  const limit = opts.limit ?? 20;
  const ftsWeight = opts.ftsWeight ?? 1.0;
  const vectorWeight = opts.vectorWeight ?? 1.0;
  const k = opts.k ?? 60;

  const filterOpts = { type: opts.type, domain: opts.domain, limit: limit * 2 };

  // FTS results
  const ftsResults = ftsSearch(db, query, filterOpts as FtsOptions);

  // Vector results (only if embedding provided)
  const vecResults = queryEmbedding
    ? vectorSearch(db, queryEmbedding, filterOpts as VectorSearchOptions)
    : [];

  // Build RRF score map
  const scoreMap = new Map<number, {
    docId: number;
    path: string;
    title: string;
    type: string | null;
    domain: string | null;
    score: number;
    ftsRank: number | null;
    vectorSimilarity: number | null;
    snippet: string;
    heading: string;
  }>();

  // FTS contributions
  for (let i = 0; i < ftsResults.length; i++) {
    const r = ftsResults[i];
    const entry = scoreMap.get(r.id) ?? {
      docId: r.id,
      path: r.path,
      title: r.title,
      type: r.type,
      domain: r.domain,
      score: 0,
      ftsRank: null,
      vectorSimilarity: null,
      snippet: r.snippet,
      heading: '',
    };
    entry.ftsRank = i + 1;
    entry.score += ftsWeight / (k + i + 1);
    entry.snippet = r.snippet;
    scoreMap.set(r.id, entry);
  }

  // Vector contributions
  for (let i = 0; i < vecResults.length; i++) {
    const r = vecResults[i];
    const entry = scoreMap.get(r.docId) ?? {
      docId: r.docId,
      path: r.path,
      title: r.title,
      type: r.type,
      domain: r.domain,
      score: 0,
      ftsRank: null,
      vectorSimilarity: null,
      snippet: '',
      heading: '',
    };
    entry.vectorSimilarity = r.similarity;
    entry.heading = r.heading;
    entry.score += vectorWeight / (k + i + 1);
    scoreMap.set(r.docId, entry);
  }

  // Sort by fused score
  const results = Array.from(scoreMap.values());
  results.sort((a, b) => b.score - a.score);
  return results.slice(0, limit);
}
