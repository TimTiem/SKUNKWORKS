import { db } from '../db/db'
import { getMeta, setMeta } from '../db/meta'
import type { SyncableRow } from '../types/rows'
import { supabase } from './supabase'
import { ALL_SYNCED_TABLES } from './tables'

/**
 * Delta pull (Decision 4): fetch rows whose server `updated_at` is past the
 * per-table `last_pulled` cursor, oldest first, and merge with LWW. The
 * cursor only advances after a page merges, so a failed pull just retries.
 */

const PAGE_SIZE = 1000
const EPOCH = '1970-01-01T00:00:00.000Z'
const cursorKey = (table: string) => `last_pulled:${table}`

export async function pullAll(): Promise<void> {
  for (const table of ALL_SYNCED_TABLES) await pullTable(table)
}

async function pullTable(table: string): Promise<void> {
  let cursor = (await getMeta<string>(cursorKey(table))) ?? EPOCH
  for (;;) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .gt('updated_at', cursor)
      .order('updated_at', { ascending: true })
      .limit(PAGE_SIZE)
    if (error) throw new Error(`pull ${table}: ${error.message}`)

    const rows = (data ?? []) as SyncableRow[]
    if (rows.length === 0) return

    await mergeRows(table, rows)
    cursor = rows[rows.length - 1].updated_at
    await setMeta(cursorKey(table), cursor)
    if (rows.length < PAGE_SIZE) return
  }
}

async function mergeRows(table: string, serverRows: SyncableRow[]): Promise<void> {
  const store = db.table<SyncableRow, string>(table)
  await db.transaction('rw', store, async () => {
    for (const server of serverRows) {
      const local = await store.get(server.id)
      // LWW: an unpushed local edit survives only when it is newer than the
      // server version — it will win again on the next push. Everything else
      // (including soft-delete tombstones) takes the server row.
      if (local?.dirty === 1 && local.updated_at >= server.updated_at) continue
      await store.put({ ...server, dirty: 0 })
    }
  })
}
