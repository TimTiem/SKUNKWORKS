import { db } from '../db'
import { getMeta, setMeta, META_KEYS } from '../meta'

/**
 * Local data-migration runner (SETUP.md §5): forward-only, ordered,
 * idempotent, run on startup BEFORE first render (see `main.tsx`).
 *
 * Each migration and its `schema_version` bump commit in ONE transaction,
 * so a failed migration rolls back completely and can't corrupt data.
 * (Dexie `version()` in `db.ts` owns store/index shape; these migrations
 * own data. Content versioning for facts is separate — not a migration.)
 */
export interface Migration {
  /** Contiguous from 1, strictly increasing. Never renumber a shipped migration. */
  version: number
  name: string
  /** Must be idempotent — it may re-run if a previous attempt failed mid-way. */
  run: () => Promise<void>
}

export const migrations: Migration[] = [
  // Version 1 is the baseline: stores are created by Dexie, no data to move.
  { version: 1, name: 'baseline', run: async () => {} },
  {
    version: 2,
    name: 'task-planning-defaults',
    // Backfill v1.1 planning fields on pre-existing rows (idempotent: only
    // touches rows that are missing a field).
    run: async () => {
      const rows = await db.tasks.toArray()
      for (const row of rows) {
        if (row.importance !== undefined && row.urgency !== undefined) continue
        await db.tasks.put({
          ...row,
          due_at: row.due_at ?? null,
          parent_id: row.parent_id ?? null,
          importance: row.importance ?? 50,
          urgency: row.urgency ?? 50,
        })
      }
    },
  },
]

/** Pure: validate the migration list and return the ones newer than `current`. */
export function pendingMigrations(all: Migration[], current: number): Migration[] {
  const sorted = [...all].sort((a, b) => a.version - b.version)
  sorted.forEach((m, i) => {
    if (m.version !== i + 1) {
      throw new Error(
        `Migration list is not contiguous from 1: found version ${m.version} at position ${i}`,
      )
    }
  })
  return sorted.filter((m) => m.version > current)
}

export async function runMigrations(): Promise<void> {
  const current = (await getMeta<number>(META_KEYS.schemaVersion)) ?? 0
  for (const migration of pendingMigrations(migrations, current)) {
    await db.transaction('rw', db.tables, async () => {
      await migration.run()
      await setMeta(META_KEYS.schemaVersion, migration.version)
    })
  }
}
