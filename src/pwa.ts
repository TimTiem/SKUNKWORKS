import { registerSW } from 'virtual:pwa-register'

/**
 * Service-worker registration — `registerType: 'prompt'`: we prompt to
 * reload, never silent-swap (CLAUDE.md → PWA rules).
 *
 * TODO(slice 7): replace `confirm` with the in-app update prompt, and defer
 * it while a focus session is active or a sync flush is in flight.
 */
const updateSW = registerSW({
  onNeedRefresh() {
    if (window.confirm('A new version of SKUNKWORKS is ready. Reload now?')) {
      void updateSW(true)
    }
  },
})
