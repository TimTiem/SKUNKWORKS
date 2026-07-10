import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AuthError } from '@supabase/supabase-js'
import { supabase } from '../../sync/supabase'
import { SignIn } from './SignIn'

vi.mock('../../sync/supabase', () => ({
  supabase: {
    auth: {
      signInWithOtp: vi.fn(),
      verifyOtp: vi.fn(),
    },
  },
}))

const okOtpResponse = { data: { user: null, session: null }, error: null }
const failedOtpResponse = {
  data: { user: null, session: null },
  error: { message: 'invalid' } as unknown as AuthError,
}

async function submitEmail(email = 'tim@example.com') {
  fireEvent.change(screen.getByLabelText(/one email/i), { target: { value: email } })
  fireEvent.click(screen.getByRole('button', { name: /send sign-in code/i }))
  return email
}

describe('SignIn', () => {
  beforeEach(() => {
    vi.mocked(supabase.auth.signInWithOtp).mockResolvedValue(okOtpResponse)
    vi.mocked(supabase.auth.verifyOtp).mockResolvedValue(okOtpResponse)
  })

  it('sends a sign-in code to the entered email', async () => {
    render(<SignIn />)
    await submitEmail()

    expect(supabase.auth.signInWithOtp).toHaveBeenCalledWith({
      email: 'tim@example.com',
      options: { emailRedirectTo: window.location.origin },
    })
    expect(await screen.findByLabelText(/6-digit code/i)).toBeInTheDocument()
  })

  it('verifies the 6-digit code for the same email', async () => {
    render(<SignIn />)
    await submitEmail()

    const codeInput = await screen.findByLabelText(/6-digit code/i)
    fireEvent.change(codeInput, { target: { value: ' 123456 ' } })
    fireEvent.click(screen.getByRole('button', { name: /^sign in$/i }))

    expect(await screen.findByRole('button', { name: /^sign in$/i })).toBeEnabled()
    expect(supabase.auth.verifyOtp).toHaveBeenCalledWith({
      email: 'tim@example.com',
      token: '123456',
      type: 'email',
    })
  })

  it('shows a gentle error when sending fails, without leaving the email step', async () => {
    vi.mocked(supabase.auth.signInWithOtp).mockResolvedValue(failedOtpResponse)
    render(<SignIn />)
    await submitEmail()

    expect(await screen.findByRole('alert')).toHaveTextContent(/give it another try/i)
    expect(screen.getByLabelText(/one email/i)).toBeInTheDocument()
  })

  it('shows a gentle error for a wrong code and lets the user retry', async () => {
    vi.mocked(supabase.auth.verifyOtp).mockResolvedValue(failedOtpResponse)
    render(<SignIn />)
    await submitEmail()

    const codeInput = await screen.findByLabelText(/6-digit code/i)
    fireEvent.change(codeInput, { target: { value: '000000' } })
    fireEvent.click(screen.getByRole('button', { name: /^sign in$/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/didn't match/i)
    expect(screen.getByLabelText(/6-digit code/i)).toBeInTheDocument()
  })

  it('can go back to use a different email', async () => {
    render(<SignIn />)
    await submitEmail()

    fireEvent.click(await screen.findByRole('button', { name: /different email/i }))
    expect(screen.getByLabelText(/one email/i)).toBeInTheDocument()
  })
})
