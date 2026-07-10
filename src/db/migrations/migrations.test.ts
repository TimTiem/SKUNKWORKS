import { describe, expect, it } from 'vitest'
import { migrations, pendingMigrations, type Migration } from './index'

const noop = async () => {}
const m = (version: number): Migration => ({ version, name: `m${version}`, run: noop })

describe('pendingMigrations', () => {
  it('returns everything when nothing has been applied', () => {
    expect(pendingMigrations([m(1), m(2)], 0).map((x) => x.version)).toEqual([1, 2])
  })

  it('returns only migrations newer than the stored schema_version', () => {
    expect(pendingMigrations([m(1), m(2), m(3)], 2).map((x) => x.version)).toEqual([3])
  })

  it('returns an empty list when up to date', () => {
    expect(pendingMigrations([m(1)], 1)).toEqual([])
  })

  it('sorts out-of-order definitions', () => {
    expect(pendingMigrations([m(2), m(1)], 0).map((x) => x.version)).toEqual([1, 2])
  })

  it('rejects gaps in the version sequence', () => {
    expect(() => pendingMigrations([m(1), m(3)], 0)).toThrow(/not contiguous/)
  })

  it('rejects duplicate versions', () => {
    expect(() => pendingMigrations([m(1), m(1)], 0)).toThrow(/not contiguous/)
  })

  it('rejects lists that do not start at 1', () => {
    expect(() => pendingMigrations([m(2)], 0)).toThrow(/not contiguous/)
  })

  it('the real migration list is valid', () => {
    expect(() => pendingMigrations(migrations, 0)).not.toThrow()
  })
})
