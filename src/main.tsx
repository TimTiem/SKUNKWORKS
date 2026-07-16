import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './pwa.ts'
import { getMeta, META_KEYS } from './db/meta'
import { runMigrations } from './db/migrations'
import { captureInstallPrompt } from './features/install/installPrompt'
import { setSoundEnabled } from './ui/feedback'
import App from './App.tsx'

// beforeinstallprompt fires once, early — capture it before anything renders.
captureInstallPrompt()

const root = document.getElementById('root')!

// Local data migrations run BEFORE first render (SETUP.md §5) so the UI
// never sees a half-migrated store. Each migration is transactional, so a
// failure rolls back cleanly — we surface it instead of rendering over it.
runMigrations()
  .then(() => {
    // Load the device-local mute pref into the feedback module before the
    // first completion can fire (default ON if never set). Fire-and-forget —
    // rendering never waits on it.
    void getMeta<boolean>(META_KEYS.soundEnabled).then((on) => setSoundEnabled(on ?? true))
    createRoot(root).render(
      <StrictMode>
        <App />
      </StrictMode>,
    )
  })
  .catch((err: unknown) => {
    console.error('Local migration failed', err)
    root.textContent =
      'SKUNKWORKS could not prepare its local database. Your data is untouched — please reload to retry.'
  })
