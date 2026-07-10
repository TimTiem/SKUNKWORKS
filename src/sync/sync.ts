import { pushAll } from './outbox'
import { pullAll } from './pull'
import { supabase } from './supabase'

/**
 * Sync orchestrator. The network is background reconciliation, never in the
 * critical path of any user action (NFR-08): every entry point is fire-and-
 * forget, failures are swallowed and retried on the next trigger, and
 * nothing here ever blocks or decorates the UI (P1/P8).
 *
 * iOS reality: no background sync — everything runs on open/foreground/
 * online/after-write triggers (CLAUDE.md → PWA rules).
 */

let inFlight: Promise<void> | null = null

export function syncNow(): Promise<void> {
  inFlight ??= run().finally(() => {
    inFlight = null
  })
  return inFlight
}

async function run(): Promise<void> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return
  const { data } = await supabase.auth.getSession()
  if (!data.session) return
  try {
    await pushAll()
    await pullAll()
  } catch (err) {
    console.warn('sync failed — will retry on next trigger', err)
  }
}

let debounceTimer: ReturnType<typeof setTimeout> | undefined

/** Debounced sync for right after local writes — batches rapid captures. */
export function requestSync(delayMs = 800): void {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => void syncNow(), delayMs)
}

/** Wire the sync triggers (call once when a session exists); returns cleanup. */
export function startSyncTriggers(): () => void {
  const onOnline = () => void syncNow()
  const onVisible = () => {
    if (document.visibilityState === 'visible') void syncNow()
  }
  window.addEventListener('online', onOnline)
  document.addEventListener('visibilitychange', onVisible)
  void syncNow()
  return () => {
    window.removeEventListener('online', onOnline)
    document.removeEventListener('visibilitychange', onVisible)
    clearTimeout(debounceTimer)
  }
}
