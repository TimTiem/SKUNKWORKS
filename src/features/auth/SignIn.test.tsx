import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { supabase } from '../../sync/supabase'
import { SignIn } from './SignIn'

vi.mock('../../sync/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
    },
  },
}))

const ok = { data: { user: null, session: null }, error: null } as never
const failed = (message: string) =>
  ({ data: { user: null, session: null }, error: { message } }) as never

function fillAndSubmit(button: RegExp) {
  fireEvent.change(screen.getByLabelText(/^email$/i), {
    target: { value: 'tim@example.com' },
  })
  fireEvent.change(screen.getByLabelText(/^password$/i), {
    target: { value: 'hunter22' },
  })
  fireEvent.click(screen.getByRole('button', { name: button }))
}

describe('SignIn', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue(ok)
    vi.mocked(supabase.auth.signUp).mockResolvedValue(ok)
  })

  it('signs in with email and password', async () => {
    render(<SignIn />)
    fillAndSubmit(/^sign in$/i)

    expect(await screen.findByRole('button', { name: /^sign in$/i })).toBeEnabled()
    expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'tim@example.com',
      password: 'hunter22',
    })
  })

  it('creates the account in sign-up mode', async () => {
    render(<SignIn />)
    fireEvent.click(screen.getByRole('button', { name: /create your account/i }))
    fillAndSubmit(/^create account$/i)

    expect(await screen.findByRole('button', { name: /^create account$/i })).toBeEnabled()
    expect(supabase.auth.signUp).toHaveBeenCalledWith({
      email: 'tim@example.com',
      password: 'hunter22',
    })
    expect(supabase.auth.signInWithPassword).not.toHaveBeenCalled()
  })

  it('shows a gentle message for wrong credentials', async () => {
    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue(
      failed('Invalid login credentials'),
    )
    render(<SignIn />)
    fillAndSubmit(/^sign in$/i)

    expect(await screen.findByRole('alert')).toHaveTextContent(/didn't match/i)
  })

  it('points an already-registered email back to sign-in', async () => {
    vi.mocked(supabase.auth.signUp).mockResolvedValue(
      failed('User already registered'),
    )
    render(<SignIn />)
    fireEvent.click(screen.getByRole('button', { name: /create your account/i }))
    fillAndSubmit(/^create account$/i)

    expect(await screen.findByRole('alert')).toHaveTextContent(/already has an account/i)
  })

  it('can toggle back to sign-in mode', () => {
    render(<SignIn />)
    fireEvent.click(screen.getByRole('button', { name: /create your account/i }))
    fireEvent.click(screen.getByRole('button', { name: /already set up/i }))
    expect(screen.getByRole('button', { name: /^sign in$/i })).toBeInTheDocument()
  })
})
