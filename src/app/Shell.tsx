import type { Session } from '@supabase/supabase-js'
import { supabase } from '../sync/supabase'

/**
 * Signed-in layout shell. The placeholder body is replaced by capture + task
 * list in Wave 1 slice 3. Sign-out lives here quietly until Settings (V1).
 */
export function Shell({ session }: { session: Session }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <main className="flex flex-1 flex-col items-center justify-center gap-3 p-6">
        <h1 className="text-4xl font-bold tracking-tight text-ink-strong">SKUNKWORKS</h1>
        <p className="text-ink-muted">Start small. Win now.</p>
        <p className="rounded-pill bg-surface-raised px-4 py-1.5 text-sm text-accent-soft shadow-card">
          Scaffold ready — Wave 1 in progress
        </p>
      </main>
      <footer className="flex items-center justify-center gap-3 p-4 text-xs text-ink-muted">
        <span>Signed in as {session.user.email}</span>
        <button
          type="button"
          onClick={() => void supabase.auth.signOut()}
          className="underline-offset-2 hover:underline"
        >
          Sign out
        </button>
      </footer>
    </div>
  )
}
