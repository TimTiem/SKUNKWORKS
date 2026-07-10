import { useState, type FormEvent } from 'react'
import { supabase } from '../../sync/supabase'
import { Button } from '../../ui/primitives/Button'

type Mode = 'signIn' | 'signUp'

/**
 * Email + password sign-in (FR-54's no-SMTP alternative — product decision
 * 2026-07-10: no mail-service dependency, no cost, and no iOS PWA
 * link-opens-in-Safari problem). Requires "Confirm email" OFF in Supabase.
 *
 * Sign-in happens once per device; the session is cached for offline reuse
 * (FR-55). Copy is encouraging, never gate-keeping (P8). On success we do
 * nothing: `onAuthStateChange` flips the app to the signed-in shell.
 */
export function SignIn() {
  const [mode, setMode] = useState<Mode>('signIn')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    const { error: authError } =
      mode === 'signIn'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password })
    setBusy(false)
    if (authError) setError(gentleMessage(authError.message))
  }

  const signingIn = mode === 'signIn'

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 p-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight text-ink-strong">SKUNKWORKS</h1>
        <p className="mt-1 text-ink-muted">Start small. Win now.</p>
      </div>

      <div className="w-full max-w-sm rounded-card bg-surface-raised p-6 shadow-card">
        <p className="mb-3 text-sm text-ink-base">
          One account, three devices. Sign in once — after that it works offline.
        </p>
        <form onSubmit={(e) => void submit(e)} className="flex flex-col gap-3">
          <label htmlFor="email" className="sr-only">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            autoFocus
            autoComplete="email"
            inputMode="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-control bg-surface-overlay px-4 py-3 text-ink-strong placeholder:text-ink-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-base"
          />
          <label htmlFor="password" className="sr-only">
            Password
          </label>
          <input
            id="password"
            type="password"
            required
            autoComplete={signingIn ? 'current-password' : 'new-password'}
            placeholder="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-control bg-surface-overlay px-4 py-3 text-ink-strong placeholder:text-ink-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-base"
          />
          <Button type="submit" disabled={busy}>
            {busy ? 'One moment…' : signingIn ? 'Sign in' : 'Create account'}
          </Button>
          <Button
            variant="quiet"
            onClick={() => {
              setMode(signingIn ? 'signUp' : 'signIn')
              setError(null)
            }}
          >
            {signingIn ? 'First time here? Create your account' : 'Already set up? Sign in'}
          </Button>
        </form>

        {error && (
          <p role="alert" className="mt-3 text-sm text-ink-base">
            {error}
          </p>
        )}
      </div>
    </main>
  )
}

function gentleMessage(message: string): string {
  if (!navigator.onLine) {
    return "You're offline. Connect once to sign in — after that, everything works offline."
  }
  if (/invalid login credentials/i.test(message)) {
    return "That email + password combo didn't match — double-check and try again."
  }
  if (/already registered/i.test(message)) {
    return 'This email already has an account — use "Sign in" instead.'
  }
  if (/password should be at least/i.test(message)) {
    return 'Almost — the password needs at least 6 characters.'
  }
  return "That didn't go through — give it another try in a moment."
}
