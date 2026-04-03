import Database from 'better-sqlite3';

const SCHEMA_VERSION = 1;

const SCHEMA_SQL = `
-- Documents: core knowledge units
CREATE TABLE IF NOT EXISTS documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  path TEXT UNIQUE NOT NULL,
  title TEXT,
  type TEXT,
  domain TEXT,
  status TEXT DEFAULT 'draft',
  confidence TEXT DEFAULT 'medium',
  source TEXT,
  source_ref TEXT,
  recorded_at TEXT,
  expires TEXT,
  tags TEXT DEFAULT '[]',
  entities TEXT DEFAULT '[]',
  context TEXT,
  content TEXT,
  actionability TEXT DEFAULT 'reference',
  created_at INTEGER NOT NULL,
  modified_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_documents_type ON documents(type);
CREATE INDEX IF NOT EXISTS idx_documents_domain ON documents(domain);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
CREATE INDEX IF NOT EXISTS idx_documents_modified ON documents(modified_at);

-- FTS5 full-text search
CREATE VIRTUAL TABLE IF NOT EXISTS documents_fts USING fts5(
  title, content, tags, entities,
  content=documents, content_rowid=id
);

-- FTS5 sync triggers
CREATE TRIGGER IF NOT EXISTS documents_ai AFTER INSERT ON documents BEGIN
  INSERT INTO documents_fts(rowid, title, content, tags, entities)
  VALUES (new.id, new.title, new.content, new.tags, new.entities);
END;

CREATE TRIGGER IF NOT EXISTS documents_ad AFTER DELETE ON documents BEGIN
  INSERT INTO documents_fts(documents_fts, rowid, title, content, tags, entities)
  VALUES ('delete', old.id, old.title, old.content, old.tags, old.entities);
END;

CREATE TRIGGER IF NOT EXISTS documents_au AFTER UPDATE ON documents BEGIN
  INSERT INTO documents_fts(documents_fts, rowid, title, content, tags, entities)
  VALUES ('delete', old.id, old.title, old.content, old.tags, old.entities);
  INSERT INTO documents_fts(rowid, title, content, tags, entities)
  VALUES (new.id, new.title, new.content, new.tags, new.entities);
END;

-- Embeddings: vector storage for semantic search
CREATE TABLE IF NOT EXISTS embeddings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  doc_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL DEFAULT 0,
  heading TEXT,
  embedding BLOB NOT NULL,
  UNIQUE(doc_id, chunk_index)
);

CREATE INDEX IF NOT EXISTS idx_embeddings_doc ON embeddings(doc_id);

-- Entities: knowledge graph nodes
CREATE TABLE IF NOT EXISTS entities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  type TEXT,
  aliases TEXT DEFAULT '[]',
  metadata TEXT DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_entities_type ON entities(type);
CREATE INDEX IF NOT EXISTS idx_entities_name ON entities(name);

-- Relationships: knowledge graph edges
CREATE TABLE IF NOT EXISTS relationships (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_id INTEGER NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  target_id INTEGER NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  weight REAL DEFAULT 1.0,
  context TEXT,
  doc_id INTEGER REFERENCES documents(id) ON DELETE SET NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_rel_source ON relationships(source_id);
CREATE INDEX IF NOT EXISTS idx_rel_target ON relationships(target_id);
CREATE INDEX IF NOT EXISTS idx_rel_type ON relationships(type);

-- Schema version tracking
CREATE TABLE IF NOT EXISTS meta (
  key TEXT PRIMARY KEY,
  value TEXT
);
`;

export function initSchema(db: Database.Database): void {
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  const currentVersion = getSchemaVersion(db);

  if (currentVersion < SCHEMA_VERSION) {
    db.exec(SCHEMA_SQL);
    db.prepare('INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)')
      .run('schema_version', String(SCHEMA_VERSION));
  }
}

export function getSchemaVersion(db: Database.Database): number {
  try {
    const row = db.prepare("SELECT value FROM meta WHERE key = 'schema_version'").get() as { value: string } | undefined;
    return row ? parseInt(row.value, 10) : 0;
  } catch {
    return 0;
  }
}

export { SCHEMA_VERSION };
