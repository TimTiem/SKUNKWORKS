/**
 * Shared row shapes — mirror `supabase/migrations/0001_init.sql`.
 * Field names stay snake_case to match the server columns 1:1 (no mapping layer).
 */

/**
 * Local sync flag: 1 = has changes not yet pushed, 0 = in sync.
 * Numeric (not boolean) because IndexedDB indexes cannot index booleans.
 */
export type Dirty = 0 | 1

/** Sync-safe fields every syncable row carries (CLAUDE.md → sync-safe conventions). */
export interface SyncableRow {
  /** Client-generated UUID — stable identity before it ever reaches the server. */
  id: string
  /** null until the row is claimed by the signed-in user (stamped on first push). */
  user_id: string | null
  /** ISO timestamp. */
  created_at: string
  /** ISO timestamp. Server-authoritative — the local value is only an echo. */
  updated_at: string
  /** Soft-delete tombstone. All deletes are soft. */
  deleted_at: string | null
  dirty: Dirty
}

// --- Mutable rows (LWW by server updated_at) --------------------------------

export type TaskStatus = 'open' | 'done' | 'deferred'

export interface TaskRow extends SyncableRow {
  /** The only required user field. */
  text: string
  note: string | null
  tag: string | null
  estimate_ms: number | null
  status: TaskStatus
}

export interface RewardRow extends SyncableRow {
  name: string
  description: string | null
  /** Defaults small/medium/big; user-editable. */
  tier: string
  coin_cost: number
  min_level: number | null
}

// --- Append-only event logs (immutable, never conflict) ---------------------

export interface CompletionRow extends SyncableRow {
  task_id: string | null
  completed_at: string
  xp_awarded: number
  coins_awarded: number
  multiplier: number
  focus_session_id: string | null
}

export interface FocusSessionRow extends SyncableRow {
  task_id: string | null
  started_at: string
  ended_at: string | null
  planned_ms: number
  actual_ms: number | null
}

export interface CoinLedgerRow extends SyncableRow {
  /** +earn / -spend; balance = sum(delta). Never store the balance. */
  delta: number
  reason: string
  ref_id: string | null
  at: string
}

export interface RedemptionRow extends SyncableRow {
  reward_id: string | null
  reward_name_snapshot: string
  coins_spent: number
  at: string
}

export interface FactUnlockRow extends SyncableRow {
  /** Stable bundled-content fact id — never reused, never un-seen. */
  fact_id: string
  unlocked_at: string
}

// --- Local-only --------------------------------------------------------------

/** Key-value store for schema_version, app_version, last_synced, first-run flags. */
export interface MetaRow {
  key: string
  value: unknown
}
