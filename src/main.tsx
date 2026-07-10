import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './pwa.ts'
import { runMigrations } from './db/migrations'
import App from './App.tsx'

const root = document.getElementById('root')!

// Local data migrations run BEFORE first render (SETUP.md §5) so the UI
// never sees a half-migrated store. Each migration is transactional, so a
// failure rolls back cleanly — we surface it instead of rendering over it.
runMigrations()
  .then(() => {
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
