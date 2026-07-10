import { Shell } from './app/Shell'
import { SignIn } from './features/auth/SignIn'
import { useSession } from './features/auth/useSession'

function App() {
  const { session, loading } = useSession()

  // Session state resolves from local storage in a few ms (no network), so a
  // blank frame here never lasts long enough to see — and never spins (P8).
  if (loading) return null

  return session ? <Shell session={session} /> : <SignIn />
}

export default App
