/**
 * Install-to-home-screen decision (fast-follow) — pure, so it's testable.
 * Installing matters beyond convenience: iOS may EVICT IndexedDB for
 * non-installed PWAs after ~7 days idle (CLAUDE.md → PWA rules), so the
 * hint protects data. It is quiet and dismiss-once — never a nag (P8).
 */

export interface InstallEnv {
  /** Already running installed (display-mode: standalone / navigator.standalone). */
  standalone: boolean
  /** iOS Safari — no beforeinstallprompt; installing is a share-sheet action. */
  ios: boolean
  /** A captured beforeinstallprompt event is available (Chromium). */
  hasPromptEvent: boolean
  /** The user dismissed the hint on this device (meta flag). */
  dismissed: boolean
}

export type InstallHintState =
  | { show: false }
  | { show: true; mode: 'prompt' | 'ios-instructions' }

export function installHintState(env: InstallEnv): InstallHintState {
  if (env.standalone || env.dismissed) return { show: false }
  if (env.hasPromptEvent) return { show: true, mode: 'prompt' }
  if (env.ios) return { show: true, mode: 'ios-instructions' }
  // Anywhere else (desktop Firefox, macOS Safari …) there is no reliable
  // install path — showing instructions we can't back would just be noise.
  return { show: false }
}
