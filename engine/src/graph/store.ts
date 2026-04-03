import Database from 'better-sqlite3';

export interface Entity {
  id: number;
  name: string;
  type: string | null;
  aliases: string[];
  metadata: Record<string, unknown>;
}

export interface Relationship {
  id: number;
  sourceId: number;
  targetId: number;
  sourceName: string;
  targetName: string;
  type: string;
  weight: number;
  context: string | null;
  docId: number | null;
}

export function upsertEntity(db: Database.Database, name: string, type?: string): number {
  const existing = db.prepare('SELECT id FROM entities WHERE name = ?').get(name) as { id: number } | undefined;
  if (existing) return existing.id;

  const result = db.prepare('INSERT INTO entities (name, type) VALUES (?, ?)').run(name, type ?? null);
  return Number(result.lastInsertRowid);
}

export function addRelationship(
  db: Database.Database,
  sourceId: number,
  targetId: number,
  type: string,
  context?: string,
  docId?: number
): number {
  const result = db.prepare(`
    INSERT INTO relationships (source_id, target_id, type, context, doc_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(sourceId, targetId, type, context ?? null, docId ?? null, Date.now());
  return Number(result.lastInsertRowid);
}

export function searchEntities(
  db: Database.Database,
  query: string,
  type?: string,
  limit: number = 20
): Entity[] {
  let sql = `SELECT id, name, type, aliases, metadata FROM entities WHERE name LIKE ?`;
  const params: unknown[] = [`%${query}%`];

  if (type) {
    sql += ' AND type = ?';
    params.push(type);
  }
  sql += ' LIMIT ?';
  params.push(limit);

  const rows = db.prepare(sql).all(...params) as { id: number; name: string; type: string | null; aliases: string; metadata: string }[];
  return rows.map(r => ({
    id: r.id,
    name: r.name,
    type: r.type,
    aliases: JSON.parse(r.aliases || '[]'),
    metadata: JSON.parse(r.metadata || '{}'),
  }));
}

export function getNeighborhood(
  db: Database.Database,
  entityId: number,
  depth: number = 1,
  limit: number = 50
): { entities: Entity[]; relationships: Relationship[] } {
  const visited = new Set<number>([entityId]);
  const allRelationships: Relationship[] = [];
  let frontier = [entityId];

  for (let d = 0; d < depth; d++) {
    if (frontier.length === 0) break;
    const placeholders = frontier.map(() => '?').join(',');

    const rels = db.prepare(`
      SELECT r.id, r.source_id, r.target_id, r.type, r.weight, r.context, r.doc_id,
             s.name AS source_name, t.name AS target_name
      FROM relationships r
      JOIN entities s ON s.id = r.source_id
      JOIN entities t ON t.id = r.target_id
      WHERE r.source_id IN (${placeholders}) OR r.target_id IN (${placeholders})
      LIMIT ?
    `).all(...frontier, ...frontier, limit) as (Relationship & { source_name: string; target_name: string })[];

    const nextFrontier: number[] = [];
    for (const rel of rels) {
      allRelationships.push({
        id: rel.id,
        sourceId: rel.sourceId ?? (rel as any).source_id,
        targetId: rel.targetId ?? (rel as any).target_id,
        sourceName: rel.source_name ?? rel.sourceName,
        targetName: rel.target_name ?? rel.targetName,
        type: rel.type,
        weight: rel.weight,
        context: rel.context,
        docId: rel.docId ?? (rel as any).doc_id,
      });

      const otherId = (rel as any).source_id === entityId ? (rel as any).target_id : (rel as any).source_id;
      if (!visited.has(otherId)) {
        visited.add(otherId);
        nextFrontier.push(otherId);
      }
    }
    frontier = nextFrontier;
  }

  // Fetch all visited entities
  const entityIds = Array.from(visited);
  const placeholders = entityIds.map(() => '?').join(',');
  const entities = db.prepare(`
    SELECT id, name, type, aliases, metadata FROM entities WHERE id IN (${placeholders})
  `).all(...entityIds) as { id: number; name: string; type: string | null; aliases: string; metadata: string }[];

  return {
    entities: entities.map(e => ({
      id: e.id,
      name: e.name,
      type: e.type,
      aliases: JSON.parse(e.aliases || '[]'),
      metadata: JSON.parse(e.metadata || '{}'),
    })),
    relationships: allRelationships,
  };
}
