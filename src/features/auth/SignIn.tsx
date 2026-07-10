import { useState, type FormEvent } from 'react'
import { supabase } from '../../sync/supabase'

type Step = 'email' | 'code'

/**
 * One-field magic-link/OTP sign-in (FR-54, PRD §3.1).
 *
 * The Supabase email carries both a link and a 6-digit code. The code path
 * exists because an installed iOS PWA has storage isolated from Safari —
 * tapping the link signs in the *browser*, not the home-screen app. Typing
 * the code signs in right here, on any device (CLAUDE.md → iOS realities).
 *
 * Copy is encouraging, never gate-keeping (P8). On success we do nothing:
 * `onAuthStateChange` flips the app to the signed-in shell.
 */
export function SignIn() {
  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function sendCode(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    const { error: sendError } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    })
    setBusy(false)
    if (sendError) {
      setError(
        navigator.onLine
          ? "That didn't go through — give it another try in a moment."
          : "You're offline. Connect once to sign in — after that, everything works offline.",
      )
      return
    }
    setStep('code')
  }

  async function verifyCode(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    const { error: verifyError } = await supabase.auth.verifyOtp({
      email,
      token: code.trim(),
      type: 'email',
    })
    setBusy(false)
    if (verifyError) {
      setError("That code didn't match — check the newest email and try again.")
    }
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 p-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight text-ink-strong">SKUNKWORKS</h1>
        <p className="mt-1 text-ink-muted">Start small. Win now.</p>
      </div>

      <div className="w-full max-w-sm rounded-card bg-surface-raised p-6 shadow-card">
        {step === 'email' ? (
          <form onSubmit={(e) => void sendCode(e)} className="flex flex-col gap-3">
            <label htmlFor="email" className="text-sm text-ink-base">
              One email, no password — we&apos;ll send you a sign-in code.
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
            <button
              type="submit"
              disabled={busy}
              className="rounded-control bg-accent-base px-4 py-3 font-medium text-ink-strong transition-colors duration-enter ease-standard hover:bg-accent-strong disabled:opacity-60"
            >
              {busy ? 'Sending…' : 'Send sign-in code'}
            </button>
          </form>
        ) : (
          <form onSubmit={(e) => void verifyCode(e)} className="flex flex-col gap-3">
            <p className="text-sm text-ink-base">
              Check your email — enter the 6-digit code, or tap the link in the message if
              you&apos;re on this device&apos;s browser.
            </p>
            <label htmlFor="otp-code" className="sr-only">
              6-digit code
            </label>
            <input
              id="otp-code"
              type="text"
              required
              autoFocus
              autoComplete="one-time-code"
              inputMode="numeric"
              maxLength={6}
              placeholder="123456"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full rounded-control bg-surface-overlay px-4 py-3 text-center text-xl tracking-[0.4em] text-ink-strong placeholder:tracking-normal placeholder:text-ink-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-base"
            />
            <button
              type="submit"
              disabled={busy}
              className="rounded-control bg-accent-base px-4 py-3 font-medium text-ink-strong transition-colors duration-enter ease-standard hover:bg-accent-strong disabled:opacity-60"
            >
              {busy ? 'Signing in…' : 'Sign in'}
            </button>
            <button
              type="button"
              onClick={() => {
                setStep('email')
                setCode('')
                setError(null)
              }}
              className="text-sm text-ink-muted underline-offset-2 hover:underline"
            >
              Use a different email
            </button>
          </form>
        )}

        {error && (
          <p role="alert" className="mt-3 text-sm text-ink-base">
            {error}
          </p>
        )}
      </div>
    </main>
  )
}
