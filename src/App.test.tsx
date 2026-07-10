import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './sync/supabase'
import App from './App'

vi.mock('./sync/supabase', () => {
  // Permissive empty query chain: the Shell fires a background sync on mount.
  const chain: Record<string, unknown> = {
    then: (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) =>
      Promise.resolve({ data: [], error: null }).then(resolve, reject),
  }
  for (const m of ['select', 'gt', 'order', 'limit', 'upsert']) chain[m] = () => chain
  return {
    supabase: {
      from: vi.fn(() => chain),
      auth: {
        getSession: vi.fn(),
        onAuthStateChange: vi.fn(() => ({
          data: { subscription: { unsubscribe: vi.fn() } },
        })),
        signInWithPassword: vi.fn(),
        signUp: vi.fn(),
        signOut: vi.fn(),
      },
    },
  }
})

function mockSession(session: Session | null) {
  vi.mocked(supabase.auth.getSession).mockResolvedValue({
    data: { session },
    error: null,
  } as never)
}

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(supabase.auth.onAuthStateChange).mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    } as never)
  })

  it('shows the sign-in screen when there is no cached session', async () => {
    mockSession(null)
    render(<App />)

    expect(await screen.findByLabelText(/^email$/i)).toBeInTheDocument()
  })

  it('shows the signed-in shell when a cached session exists (offline-safe)', async () => {
    mockSession({ user: { email: 'tim@example.com' } } as unknown as Session)
    render(<App />)

    expect(
      await screen.findByRole('heading', { name: /skunkworks/i }),
    ).toBeInTheDocument()
    expect(screen.getByText(/signed in as tim@example.com/i)).toBeInTheDocument()
  })
})
