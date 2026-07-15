import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../../db/db'
import { InstallHint } from './InstallHint'
import { installHintState } from './installState'

const base = { standalone: false, ios: false, hasPromptEvent: false, dismissed: false }

describe('installHintState (pure decision)', () => {
  it('never shows when already installed or dismissed', () => {
    expect(installHintState({ ...base, standalone: true, hasPromptEvent: true })).toEqual({
      show: false,
    })
    expect(installHintState({ ...base, dismissed: true, ios: true })).toEqual({ show: false })
  })

  it('offers the native prompt when the browser gave us one', () => {
    expect(installHintState({ ...base, hasPromptEvent: true })).toEqual({
      show: true,
      mode: 'prompt',
    })
  })

  it('falls back to share-sheet instructions on iOS', () => {
    expect(installHintState({ ...base, ios: true })).toEqual({
      show: true,
      mode: 'ios-instructions',
    })
  })

  it('stays silent where no install path exists (no noise, P8)', () => {
    expect(installHintState(base)).toEqual({ show: false })
  })
})

describe('InstallHint', () => {
  beforeEach(async () => {
    await Promise.all(db.tables.map((t) => t.clear()))
  })

  it('shows iOS instructions and dismisses once, persistently (meta flag)', async () => {
    render(<InstallHint envOverride={{ ios: true }} />)
    expect(await screen.findByText(/add to home screen/i)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /dismiss/i }))
    await waitFor(async () =>
      expect(await db.meta.get('install_hint_dismissed')).toMatchObject({ value: true }),
    )
    await waitFor(() => expect(screen.queryByText(/add to home screen/i)).not.toBeInTheDocument())
  })

  it('renders nothing when already running installed', async () => {
    const { container } = render(<InstallHint envOverride={{ standalone: true, ios: true }} />)
    // Give the meta live-query a beat to resolve, then expect silence.
    await waitFor(() => expect(container).toBeEmptyDOMElement())
  })
})
