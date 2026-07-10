import type { Session } from '@supabase/supabase-js'
import { CaptureBar } from '../features/capture/CaptureBar'
import { TaskList } from '../features/tasks/TaskList'
import { supabase } from '../sync/supabase'

/**
 * Signed-in layout: capture on top, the list right under it. Gamification
 * header (XP bar) lands in slice 5; sign-out lives here quietly until
 * Settings (V1).
 */
export function Shell({ session }: { session: Session }) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-xl flex-col gap-4 p-4">
      <header className="flex items-center justify-between pt-1">
        <h1 className="text-lg font-bold tracking-tight text-ink-strong">SKUNKWORKS</h1>
      </header>
      <CaptureBar />
      <main className="flex-1">
        <TaskList />
      </main>
      <footer className="flex items-center justify-center gap-3 p-2 text-xs text-ink-muted">
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
