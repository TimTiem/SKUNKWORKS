import { db } from './db'
import { getMeta, META_KEYS } from './meta'

/**
 * JSON export (FR-56): a full snapshot of the local store — every table,
 * including meta. It is the ultimate backup and the migration escape hatch
 * (CLAUDE.md → schema versioning): if iOS ever evicts IndexedDB or a device
 * dies, nothing is lost. Import is parked ("Later"); `format_version` is
 * here so a future importer knows what it's reading.
 */

export interface ExportBundle {
  app: 'skunkworks'
  format_version: 1
  exported_at: string
  schema_version: number | null
  tables: Record<string, unknown[]>
}

export async function buildExport(nowIso = new Date().toISOString()): Promise<ExportBundle> {
  const tables: Record<string, unknown[]> = {}
  for (const table of db.tables) {
    tables[table.name] = await table.toArray()
  }
  return {
    app: 'skunkworks',
    format_version: 1,
    exported_at: nowIso,
    schema_version: (await getMeta<number>(META_KEYS.schemaVersion)) ?? null,
    tables,
  }
}

/** skunkworks-export-2026-07-15.json */
export function exportFilename(nowIso: string): string {
  return `skunkworks-export-${nowIso.slice(0, 10)}.json`
}
