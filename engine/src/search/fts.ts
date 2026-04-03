import Database from 'better-sqlite3';

export interface FtsResult {
  id: number;
  path: string;
  title: string;
  type: string | null;
  domain: string | null;
  snippet: string;
  rank: number;
}

export interface FtsOptions {
  type?: string;
  domain?: string;
  status?: string;
  limit?: number;
}

/** Escape FTS5 special characters by wrapping tokens in double quotes */
function escapeFts5(query: string): string {
  // Wrap each token in quotes to handle dots, colons, etc.
  return query
    .split(/\s+/)
    .filter(t => t.length > 0)
    .map(t => `"${t.replace(/"/g, '""')}"`)
    .join(' ');
}

export function ftsSearch(db: Database.Database, query: string, opts: FtsOptions = {}): FtsResult[] {
  const limit = opts.limit ?? 20;
  const conditions: string[] = [];
  const params: unknown[] = [];

  const safeQuery = escapeFts5(query);
  conditions.push('documents_fts MATCH ?');
  params.push(safeQuery);

  let filterSql = '';
  if (opts.type) {
    filterSql += ' AND d.type = ?';
    params.push(opts.type);
  }
  if (opts.domain) {
    filterSql += ' AND d.domain = ?';
    params.push(opts.domain);
  }
  if (opts.status) {
    filterSql += ' AND d.status = ?';
    params.push(opts.status);
  }

  params.push(limit);

  const sql = `
    SELECT d.id, d.path, d.title, d.type, d.domain,
           snippet(documents_fts, 1, '<b>', '</b>', '...', 32) AS snippet,
           rank
    FROM documents_fts
    JOIN documents d ON d.id = documents_fts.rowid
    WHERE ${conditions.join(' AND ')}${filterSql}
    ORDER BY rank
    LIMIT ?
  `;

  return db.prepare(sql).all(...params) as FtsResult[];
}
