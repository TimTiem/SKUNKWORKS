/**
 * Chromium fires `beforeinstallprompt` ONCE, early — often before React
 * mounts. We capture it at module scope (wired in main.tsx) and let the
 * hint component subscribe.
 */

export interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let deferred: BeforeInstallPromptEvent | null = null
const listeners = new Set<() => void>()

export function captureInstallPrompt(): void {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault() // we choose the moment; the browser mini-bar doesn't
    deferred = e as BeforeInstallPromptEvent
    listeners.forEach((notify) => notify())
  })
}

export function getInstallPromptEvent(): BeforeInstallPromptEvent | null {
  return deferred
}

/** The event is single-use — clear it once prompted. */
export function consumeInstallPromptEvent(): void {
  deferred = null
  listeners.forEach((notify) => notify())
}

export function onInstallPromptChange(notify: () => void): () => void {
  listeners.add(notify)
  return () => listeners.delete(notify)
}
