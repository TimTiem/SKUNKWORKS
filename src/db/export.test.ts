import { beforeEach, describe, expect, it } from 'vitest'
import { newTask } from '../domain/tasks'
import { newReward } from '../domain/rewards'
import { db } from './db'
import { buildExport, exportFilename } from './export'
import { setMeta, META_KEYS } from './meta'

const T0 = '2026-07-15T10:00:00.000Z'

describe('JSON export (FR-56)', () => {
  beforeEach(async () => {
    await Promise.all(db.tables.map((t) => t.clear()))
  })

  it('bundles every table, including meta, with version fields', async () => {
    await db.tasks.add(newTask('Backup me', 't-1', T0))
    await db.rewards.add(newReward({ name: 'Ice cream', tier: 'small', coinCost: 50 }, 'r-1', T0))
    await setMeta(META_KEYS.schemaVersion, 3)

    const bundle = await buildExport(T0)

    expect(bundle.app).toBe('skunkworks')
    expect(bundle.format_version).toBe(1)
    expect(bundle.exported_at).toBe(T0)
    expect(bundle.schema_version).toBe(3)
    // Every Dexie table appears — nothing silently left behind.
    for (const table of db.tables) {
      expect(bundle.tables[table.name]).toBeDefined()
    }
    expect(bundle.tables.tasks).toHaveLength(1)
    expect(bundle.tables.rewards).toHaveLength(1)
    expect(bundle.tables.meta).toContainEqual({ key: 'schema_version', value: 3 })
  })

  it('names the file by date', () => {
    expect(exportFilename(T0)).toBe('skunkworks-export-2026-07-15.json')
  })
})
