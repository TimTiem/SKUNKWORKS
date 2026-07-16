import { requestSync } from '../sync/sync'
import { db } from './db'
import type { ExportBundle } from './export'

/**
 * JSON import (FR-57) — the restore side of export, and a migration escape
 * hatch. It MERGES a backup into the local store by client UUID (bulkPut, so
 * re-importing is idempotent). It never imports `meta`: schema_version, the
 * active focus session, theme and sound prefs are device-local and must not be
 * clobbered by another device's backup. Imported rows keep their `dirty` flag,
 * so anything the backup had pending re-syncs while already-synced rows don't
 * push — and a newer server row still wins the next pull (LWW), so importing an
 * old backup can't permanently override fresher server data.
 */

/** Everything a backup may write — every syncable table except `meta`. */
const IMPORTABLE = new Set([
  'tasks',
  'task_links',
  'rewards',
  'completions',
  'focus_sessions',
  'coin_ledger',
  'redemptions',
  'fact_unlocks',
])

export interface ImportResult {
  imported: number
  tables: number
}

/** Parse + validate an export file. Throws a friendly Error on anything off. */
export function parseImport(text: string): ExportBundle {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error("That file isn't valid JSON.")
  }
  const bundle = data as Partial<ExportBundle>
  if (!bundle || bundle.app !== 'skunkworks' || typeof bundle.tables !== 'object' || bundle.tables === null) {
    throw new Error("That doesn't look like a SKUNKWORKS export.")
  }
  if (bundle.format_version !== 1) {
    throw new Error(`Unsupported export format (v${String(bundle.format_version)}).`)
  }
  return bundle as ExportBundle
}

/** How many rows an import would write — for the confirmation prompt. */
export function countImportable(bundle: ExportBundle): number {
  let n = 0
  for (const [name, rows] of Object.entries(bundle.tables)) {
    if (IMPORTABLE.has(name) && Array.isArray(rows)) n += rows.length
  }
  return n
}

export async function importBundle(bundle: ExportBundle): Promise<ImportResult> {
  const targets = db.tables.filter(
    (t) => IMPORTABLE.has(t.name) && Array.isArray(bundle.tables[t.name]),
  )
  let imported = 0
  await db.transaction('rw', targets, async () => {
    for (const table of targets) {
      const rows = bundle.tables[table.name] as unknown[]
      if (rows.length === 0) continue
      await table.bulkPut(rows as never)
      imported += rows.length
    }
  })
  requestSync()
  return { imported, tables: targets.length }
}
