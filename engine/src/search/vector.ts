import Database from 'better-sqlite3';

export interface VectorResult {
  id: number;
  docId: number;
  path: string;
  title: string;
  type: string | null;
  domain: string | null;
  heading: string;
  similarity: number;
}

export interface VectorSearchOptions {
  type?: string;
  domain?: string;
  limit?: number;
  minSimilarity?: number;
}

export function cosineSimilarity(a: Float64Array, b: Float64Array): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

export function blobToFloat64Array(blob: Buffer): Float64Array {
  const ab = new ArrayBuffer(blob.length);
  const view = new Uint8Array(ab);
  for (let i = 0; i < blob.length; i++) view[i] = blob[i];
  return new Float64Array(ab);
}

export function float64ArrayToBlob(arr: Float64Array): Buffer {
  return Buffer.from(arr.buffer);
}

interface EmbeddingRow {
  id: number;
  doc_id: number;
  heading: string | null;
  embedding: Buffer;
}

interface DocRow {
  path: string;
  title: string;
  type: string | null;
  domain: string | null;
}

export function vectorSearch(
  db: Database.Database,
  queryEmbedding: Float64Array,
  opts: VectorSearchOptions = {}
): VectorResult[] {
  const limit = opts.limit ?? 20;
  const minSim = opts.minSimilarity ?? 0.3;

  let filterSql = '';
  const filterParams: unknown[] = [];
  if (opts.type) {
    filterSql += ' AND d.type = ?';
    filterParams.push(opts.type);
  }
  if (opts.domain) {
    filterSql += ' AND d.domain = ?';
    filterParams.push(opts.domain);
  }

  const sql = `
    SELECT e.id, e.doc_id, e.heading, e.embedding, d.path, d.title, d.type, d.domain
    FROM embeddings e
    JOIN documents d ON d.id = e.doc_id
    WHERE 1=1${filterSql}
  `;

  const rows = db.prepare(sql).all(...filterParams) as (EmbeddingRow & DocRow)[];

  const results: VectorResult[] = [];
  for (const row of rows) {
    const emb = blobToFloat64Array(row.embedding);
    const sim = cosineSimilarity(queryEmbedding, emb);
    if (sim >= minSim) {
      results.push({
        id: row.id,
        docId: row.doc_id,
        path: row.path,
        title: row.title,
        type: row.type,
        domain: row.domain,
        heading: row.heading ?? '',
        similarity: sim,
      });
    }
  }

  results.sort((a, b) => b.similarity - a.similarity);
  return results.slice(0, limit);
}
