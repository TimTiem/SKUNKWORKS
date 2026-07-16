import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { CaptureBar } from '../features/capture/CaptureBar'
import { FocusScreen } from '../features/focus/FocusScreen'
import { useActiveFocus } from '../features/focus/useActiveFocus'
import { ExportButton } from '../features/export/ExportButton'
import { FactRevealProvider } from '../features/facts/useFactReveal'
import { InstallHint } from '../features/install/InstallHint'
import { MatrixScreen } from '../features/matrix/MatrixScreen'
import { ThemePicker } from '../features/gamification/ThemePicker'
import { XpBar } from '../features/gamification/XpBar'
import { useStats } from '../features/gamification/useStats'
import { useTheme } from '../features/gamification/useTheme'
import { RewardDropProvider } from '../features/rewards/RewardDropProvider'
import { RewardsScreen } from '../features/rewards/RewardsScreen'
import { SoundToggle } from '../features/settings/SoundToggle'
import { TaskList } from '../features/tasks/TaskList'
import { supabase } from '../sync/supabase'
import { startSyncTriggers } from '../sync/sync'

const VIEWS = [
  { id: 'tasks', label: 'Tasks' },
  { id: 'matrix', label: 'Matrix' },
  { id: 'rewards', label: 'Rewards' },
  { id: 'themes', label: 'Themes' },
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

  // Apply the selected theme app-wide (data-theme on <html>) regardless of
  // which view is open.
  const stats = useStats()
  useTheme(stats?.level ?? 1)

  const { focus, task, loading } = useActiveFocus()
  if (loading) return null

  // The providers wrap both surfaces so completing a task from the list OR
  // from focus can raise the same app-level fact card and free-reward drop.
  if (focus) {
    return (
      <FactRevealProvider>
        <RewardDropProvider>
          <FocusScreen focus={focus} task={task} />
        </RewardDropProvider>
      </FactRevealProvider>
    )
  }

  return (
    <FactRevealProvider>
      <RewardDropProvider>
        <div className="mx-auto flex min-h-dvh w-full max-w-xl flex-col gap-4 p-4">
          <header className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <h1 className="font-display text-lg tracking-[0.14em] text-ink-strong">SKUNKWORKS</h1>
            <nav aria-label="Sections" className="flex gap-1">
              {VIEWS.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  aria-current={view === v.id ? 'page' : undefined}
                  onClick={() => setView(v.id)}
                  className={`rounded-pill px-4 py-2 text-sm font-semibold uppercase tracking-wide transition-colors duration-enter ease-standard ${
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
          <main className="flex-1">
            {view === 'tasks' && <TaskList />}
            {view === 'matrix' && <MatrixScreen />}
            {view === 'rewards' && <RewardsScreen />}
            {view === 'themes' && <ThemePicker />}
          </main>
          <InstallHint />
          <footer className="flex items-center justify-center gap-3 p-2 text-xs text-ink-muted">
            <span>Signed in as {session.user.email}</span>
            <SoundToggle />
            <ExportButton />
            <button
              type="button"
              onClick={() => void supabase.auth.signOut()}
              className="underline-offset-2 hover:underline"
            >
              Sign out
            </button>
          </footer>
        </div>
      </RewardDropProvider>
    </FactRevealProvider>
  )
}
