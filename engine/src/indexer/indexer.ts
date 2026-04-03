import { readFileSync } from 'fs';
import Database from 'better-sqlite3';
import { parseMarkdown } from './parser.js';
import { scanDirectory, type ScannedFile } from './scanner.js';

export interface IndexResult {
  added: number;
  updated: number;
  removed: number;
  total: number;
}

/** Convert any value to a SQLite-safe string or null */
function toStr(val: unknown): string | null {
  if (val == null) return null;
  if (val instanceof Date) return val.toISOString().slice(0, 10);
  if (typeof val === 'string') return val;
  return String(val);
}

export function indexDocuments(db: Database.Database, rootDir: string): IndexResult {
  const files = scanDirectory(rootDir);
  const result: IndexResult = { added: 0, updated: 0, removed: 0, total: files.length };

  const insertStmt = db.prepare(`
    INSERT INTO documents (path, title, type, domain, status, confidence, source, source_ref,
      recorded_at, expires, tags, entities, context, content, actionability, created_at, modified_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const updateStmt = db.prepare(`
    UPDATE documents SET title=?, type=?, domain=?, status=?, confidence=?, source=?, source_ref=?,
      recorded_at=?, expires=?, tags=?, entities=?, context=?, content=?, actionability=?, modified_at=?
    WHERE path=?
  `);

  const getExisting = db.prepare('SELECT id, modified_at FROM documents WHERE path = ?');
  const getAllPaths = db.prepare('SELECT id, path FROM documents');
  const deleteStmt = db.prepare('DELETE FROM documents WHERE id = ?');

  const txn = db.transaction(() => {
    const indexedPaths = new Set<string>();

    for (const file of files) {
      indexedPaths.add(file.relativePath);
      const raw = readFileSync(file.path, 'utf-8');
      const { frontmatter: fm, content, title } = parseMarkdown(raw);

      const existing = getExisting.get(file.relativePath) as { id: number; modified_at: number } | undefined;

      const tags = JSON.stringify(fm.tags ?? []);
      const entities = JSON.stringify(fm.entities ?? []);

      if (!existing) {
        insertStmt.run(
          file.relativePath, title,
          toStr(fm.type), toStr(fm.domain),
          toStr(fm.status) ?? 'draft', toStr(fm.confidence) ?? 'medium',
          toStr(fm.source), toStr(fm.source_ref),
          toStr(fm.recorded_at), toStr(fm.expires),
          tags, entities,
          toStr(fm.context), content,
          toStr(fm.actionability) ?? 'reference',
          file.mtime, file.mtime
        );
        result.added++;
      } else if (file.mtime - existing.modified_at > 1000) {
        updateStmt.run(
          title,
          toStr(fm.type), toStr(fm.domain),
          toStr(fm.status) ?? 'draft', toStr(fm.confidence) ?? 'medium',
          toStr(fm.source), toStr(fm.source_ref),
          toStr(fm.recorded_at), toStr(fm.expires),
          tags, entities,
          toStr(fm.context), content,
          toStr(fm.actionability) ?? 'reference',
          file.mtime,
          file.relativePath
        );
        result.updated++;
      }
    }

    // Remove documents for deleted files
    const allDocs = getAllPaths.all() as { id: number; path: string }[];
    for (const doc of allDocs) {
      if (!indexedPaths.has(doc.path)) {
        deleteStmt.run(doc.id);
        result.removed++;
      }
    }
  });

  txn();
  return result;
}
