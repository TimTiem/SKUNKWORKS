import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { CaptureBar } from '../features/capture/CaptureBar'
import { FocusScreen } from '../features/focus/FocusScreen'
import { useActiveFocus } from '../features/focus/useActiveFocus'
import { XpBar } from '../features/gamification/XpBar'
import { RewardsScreen } from '../features/rewards/RewardsScreen'
import { TaskList } from '../features/tasks/TaskList'
import { supabase } from '../sync/supabase'
import { startSyncTriggers } from '../sync/sync'

const VIEWS = [
  { id: 'tasks', label: 'Tasks' },
  { id: 'rewards', label: 'Rewards' },
] as const

type ViewId = (typeof VIEWS)[number]['id']

/**
 * Signed-in layout: capture on top, the list right under it; an in-progress
 * focus session takes over the whole screen (single-task mode, P3) and is
 * restored after any reload or relaunch. Sign-out lives here quietly until
 * Settings (V1).
 */
export function Shell({ session }: { session: Session }) {
  // Sync on open/foreground/online — mounted only while signed in.
  useEffect(() => startSyncTriggers(), [])
  const [view, setView] = useState<ViewId>('tasks')

  const { focus, task, loading } = useActiveFocus()
  if (loading) return null
  if (focus) return <FocusScreen focus={focus} task={task} />

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-xl flex-col gap-4 p-4">
      <header className="flex items-center justify-between pt-1">
        <h1 className="text-lg font-bold tracking-tight text-ink-strong">SKUNKWORKS</h1>
        <nav aria-label="Sections" className="flex gap-1">
          {VIEWS.map((v) => (
            <button
              key={v.id}
              type="button"
              aria-current={view === v.id ? 'page' : undefined}
              onClick={() => setView(v.id)}
              className={`rounded-pill px-4 py-2 text-sm transition-colors duration-enter ease-standard ${
                view === v.id
                  ? 'bg-surface-overlay text-ink-strong'
                  : 'text-ink-muted hover:text-ink-base'
              }`}
            >
              {v.label}
            </button>
          ))}
        </nav>
      </header>
      <XpBar />
      {view === 'tasks' && <CaptureBar />}
      <main className="flex-1">{view === 'tasks' ? <TaskList /> : <RewardsScreen />}</main>
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
