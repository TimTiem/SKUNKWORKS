import Dexie, { type Table } from 'dexie'
import type {
  CoinLedgerRow,
  CompletionRow,
  FactUnlockRow,
  FocusSessionRow,
  MetaRow,
  RedemptionRow,
  RewardRow,
  TaskLinkRow,
  TaskRow,
} from '../types/rows'

/**
 * Local IndexedDB store — the source of truth for the UI (Decision 4).
 *
 * Dexie `version()` handles *store/index* changes; data migrations live in
 * `src/db/migrations/` gated by the `schema_version` meta record. Index
 * choices: `updated_at` for delta sync, `dirty` for the outbox scan,
 * time fields for derivations/UI ordering.
 */
export class SkunkworksDB extends Dexie {
  tasks!: Table<TaskRow, string>
  task_links!: Table<TaskLinkRow, string>
  rewards!: Table<RewardRow, string>
  completions!: Table<CompletionRow, string>
  focus_sessions!: Table<FocusSessionRow, string>
  coin_ledger!: Table<CoinLedgerRow, string>
  redemptions!: Table<RedemptionRow, string>
  fact_unlocks!: Table<FactUnlockRow, string>
  meta!: Table<MetaRow, string>

  constructor() {
    super('skunkworks')
    this.version(1).stores({
      tasks: 'id, status, updated_at, dirty',
      rewards: 'id, updated_at, dirty',
      completions: 'id, completed_at, updated_at, dirty',
      focus_sessions: 'id, started_at, updated_at, dirty',
      coin_ledger: 'id, at, updated_at, dirty',
      redemptions: 'id, at, updated_at, dirty',
      fact_unlocks: 'id, fact_id, updated_at, dirty',
      meta: 'key',
    })
    // v1.1 (mirrors supabase/migrations/0002): task planning fields + links.
    // The matching DATA migration (backfilling defaults on old rows) runs in
    // src/db/migrations before first render.
    this.version(2).stores({
      tasks: 'id, status, updated_at, dirty, parent_id',
      task_links: 'id, updated_at, dirty, blocked_id, blocker_id',
    })
  }
}

export const db = new SkunkworksDB()
