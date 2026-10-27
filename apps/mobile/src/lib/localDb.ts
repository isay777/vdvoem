import * as SQLite from 'expo-sqlite';
import type { PendingMutation } from '@my-vdvoem/shared';

let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function database() {
  databasePromise ??= SQLite.openDatabaseAsync('my-vdvoem.db');
  const db = await databasePromise;
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS cached_entities (
      kind TEXT NOT NULL,
      id TEXT NOT NULL,
      payload TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (kind, id)
    );
    CREATE TABLE IF NOT EXISTS pending_mutations (
      id TEXT PRIMARY KEY,
      entity_kind TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      operation TEXT NOT NULL,
      expected_version INTEGER,
      payload TEXT NOT NULL,
      created_at TEXT NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      last_error TEXT
    );
  `);
  return db;
}

export async function cacheEntities(kind: string, rows: Record<string, unknown>[]) {
  const db = await database();
  await db.withTransactionAsync(async () => {
    for (const row of rows) {
      await db.runAsync('INSERT OR REPLACE INTO cached_entities(kind,id,payload,updated_at) VALUES(?,?,?,?)', kind, String(row.id), JSON.stringify(row), String(row.updated_at ?? new Date().toISOString()));
    }
  });
}

export async function readCachedEntities(): Promise<Record<string, unknown>[]> {
  const db = await database();
  const rows = await db.getAllAsync<{ payload: string }>('SELECT payload FROM cached_entities ORDER BY updated_at DESC');
  return rows.map((row) => JSON.parse(row.payload));
}

export async function enqueueMutation(mutation: PendingMutation) {
  const db = await database();
  await db.runAsync(
    'INSERT OR REPLACE INTO pending_mutations(id,entity_kind,entity_id,operation,expected_version,payload,created_at,attempts,last_error) VALUES(?,?,?,?,?,?,?,?,?)',
    mutation.id, mutation.entityKind, mutation.entityId, mutation.operation, mutation.expectedVersion, JSON.stringify(mutation.payload), mutation.createdAt, mutation.attempts, mutation.lastError,
  );
}

export async function readPendingMutations(): Promise<PendingMutation[]> {
  const db = await database();
  const rows = await db.getAllAsync<Record<string, string | number | null>>('SELECT * FROM pending_mutations ORDER BY created_at ASC');
  return rows.map((row) => ({
    id: String(row.id), entityKind: String(row.entity_kind) as PendingMutation['entityKind'], entityId: String(row.entity_id), operation: String(row.operation) as PendingMutation['operation'],
    expectedVersion: row.expected_version === null ? null : Number(row.expected_version), payload: JSON.parse(String(row.payload)), createdAt: String(row.created_at), attempts: Number(row.attempts), lastError: row.last_error ? String(row.last_error) : null,
  }));
}

export async function removeMutation(id: string) { const db = await database(); await db.runAsync('DELETE FROM pending_mutations WHERE id = ?', id); }
export async function failMutation(id: string, error: string) { const db = await database(); await db.runAsync('UPDATE pending_mutations SET attempts = attempts + 1, last_error = ? WHERE id = ?', error, id); }
export async function purgeLocalData() { const db = await database(); await db.execAsync('DELETE FROM cached_entities; DELETE FROM pending_mutations;'); }
