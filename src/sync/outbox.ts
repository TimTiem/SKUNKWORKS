import { db } from '../db/db'
import type { SyncableRow } from '../types/rows'
import { supabase } from './supabase'
import { LOG_TABLES, MUTABLE_TABLES } from './tables'

/**
 * Outbox push (Decision 4): the `dirty` flag on every row IS the queue.
 * Re-sends are idempotent on the client UUID — mutable rows upsert, logs
 * insert-only with duplicates ignored (append-only rows are immutable, so a
 * duplicate is by definition already correct on the server).
 */

type ServerRow = SyncableRow & Record<string, unknown>

/**
 * `dirty` is local-only. `user_id` is omitted so the server default
 * `auth.uid()` stamps inserts — the client never asserts identity.
 */
function toPayload(row: SyncableRow): Record<string, unknown> {
  const { dirty: _dirty, user_id: _userId, ...payload } = row as Record<string, unknown> & SyncableRow
  return payload
}

export async function pushAll(): Promise<void> {
  for (const table of MUTABLE_TABLES) await pushTable(table, false)
  for (const table of LOG_TABLES) await pushTable(table, true)
}

async function pushTable(table: string, appendOnly: boolean): Promise<void> {
  const store = db.table<SyncableRow, string>(table)
  const dirtyRows = await store.where('dirty').equals(1).toArray()
  if (dirtyRows.length === 0) return

  const { data, error } = await supabase
    .from(table)
    .upsert(dirtyRows.map(toPayload), { onConflict: 'id', ignoreDuplicates: appendOnly })
    .select()
  if (error) throw new Error(`push ${table}: ${error.message}`)

  await markClean(table, dirtyRows, (data ?? []) as ServerRow[])
}

async function markClean(
  table: string,
  pushed: SyncableRow[],
  serverRows: ServerRow[],
): Promise<void> {
  const serverById = new Map(serverRows.map((r) => [r.id, r]))
  const store = db.table<SyncableRow, string>(table)
  await db.transaction('rw', store, async () => {
    for (const row of pushed) {
      const current = await store.get(row.id)
      // The updated_at echo changes on every local edit, so a mismatch means
      // the row was edited mid-flight — leave it dirty for the next push.
      if (!current || current.updated_at !== row.updated_at) continue
      const server = serverById.get(row.id)
      // Adopt the server-stamped fields (updated_at, user_id) when returned;
      // append-only duplicates return nothing and just go clean as-is.
      await store.put(server ? { ...current, ...server, dirty: 0 } : { ...current, dirty: 0 })
    }
  })
}
