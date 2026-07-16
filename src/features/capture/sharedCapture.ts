/**
 * OS quick-capture (FR-06): the PWA manifest (vite.config.ts) declares a
 * `share_target` and a "Capture" shortcut, both GET to '/'. So shared text
 * arrives as URL query params on launch. We read them once, early (from
 * main.tsx, before render), stash the text, and strip the URL so a reload
 * can't re-capture. CaptureBar prefills from the stash on mount. Where the
 * platform has no share target (iOS today), this simply never fires.
 */

/** Pure: extract a capture string from a URL query ('' or '?text=…'). */
export function sharedCaptureText(search: string): string | null {
  const params = new URLSearchParams(search)
  const parts = [params.get('title'), params.get('text'), params.get('url')]
    .map((s) => s?.trim())
    .filter((s): s is string => !!s)
  // De-dup — some share sheets copy the same string into title AND text.
  return parts.length ? [...new Set(parts)].join(' ') : null
}

let pending: string | null = null

/** Read shared text / capture intent from the current URL; stash + strip it. */
export function captureSharedText(): void {
  if (typeof window === 'undefined') return
  const params = new URLSearchParams(window.location.search)
  const hasIntent =
    params.has('text') || params.has('title') || params.has('url') || params.get('capture') === '1'
  if (!hasIntent) return
  pending = sharedCaptureText(window.location.search)
  // Clean start_url; a refresh shouldn't re-trigger capture.
  window.history.replaceState(null, '', window.location.pathname)
}

/** Peek the pending shared text without consuming it (StrictMode-remount safe). */
export function peekSharedCapture(): string | null {
  return pending
}

/** Clear the stash once the shared text has actually been captured. */
export function clearSharedCapture(): void {
  pending = null
}
