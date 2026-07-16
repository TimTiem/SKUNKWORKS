import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './pwa.ts'
import { getMeta, setMeta, META_KEYS } from './db/meta'
import { runMigrations } from './db/migrations'
import { captureSharedText } from './features/capture/sharedCapture'
import { captureInstallPrompt } from './features/install/installPrompt'
import { setSoundEnabled } from './ui/feedback'
import { APP_VERSION } from './lib/version'
import App from './App.tsx'

// beforeinstallprompt fires once, early — capture it before anything renders.
captureInstallPrompt()
// If launched via an OS share / "Capture" shortcut, grab the shared text now
// (before render) and strip the URL, so CaptureBar can prefill it (FR-06).
captureSharedText()

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
    // Record the running version (NFR-19) so Settings/export can show it.
    void setMeta(META_KEYS.appVersion, APP_VERSION)
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
