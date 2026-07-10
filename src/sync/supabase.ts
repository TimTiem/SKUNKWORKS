import { createClient } from '@supabase/supabase-js'

/**
 * Supabase client (SETUP.md §6). Only the anon key is ever bundled — RLS is
 * the security boundary. Never the service-role key.
 *
 * Default client options are what we want: the session persists locally and
 * refreshes opportunistically, so after the first sign-in the app works fully
 * offline (FR-55) — the UI is never gated behind a live auth check. (The
 * cached auth session is supabase-js internals, not app data, so the
 * "never localStorage for app data" rule doesn't apply to it.)
 */
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

if (!url || !anonKey) {
  throw new Error(
    'Missing Supabase env vars. Copy .env.example to .env.local and set ' +
      'VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (Vercel: Project Settings → Environment Variables).',
  )
}

export const supabase = createClient(url, anonKey)
