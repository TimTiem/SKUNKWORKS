import type { CoinLedgerRow } from '../types/rows'

/**
 * Coin balance (Decision 2) = sum of the append-only ledger — earns positive,
 * redemptions negative (Wave 2). Never a stored mutable integer.
 */
export function coinBalance(ledger: readonly Pick<CoinLedgerRow, 'delta'>[]): number {
  return ledger.reduce((sum, entry) => sum + entry.delta, 0)
}
