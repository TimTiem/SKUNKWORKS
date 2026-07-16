/// <reference types="vitest/config" />
import { readFileSync } from 'node:fs'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// Single source of the app version (NFR-19): baked into the build so Settings
// (FR-58) and the "What's new" card (FR-59) can read it at runtime.
const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8')) as {
  version: string
}

// https://vite.dev/config/
export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  plugins: [
    react(),
    VitePWA({
      // Prompt-to-reload, never silent-swap; the in-app prompt must defer
      // during an active focus session or sync flush (CLAUDE.md → PWA rules).
      registerType: 'prompt',
      includeAssets: ['favicon.svg', 'icons/apple-touch-icon.png'],
      manifest: {
        name: 'SKUNKWORKS',
        short_name: 'SKUNKWORKS',
        description:
          'Single-user, offline-first, gamified productivity PWA. Start small. Win now.',
        display: 'standalone',
        // Pure-black chrome (Tim, 2026-07-16) — matches index.html.
        theme_color: '#000000',
        background_color: '#000000',
        // OS quick-capture (FR-06): accept text shared from other apps and a
        // long-press "Capture" jump. GET, so the shared text arrives as a query
        // param the app reads on load (see features/capture/sharedCapture.ts).
        // Support varies by platform (works on Android/Chromium; iOS PWA is
        // limited) — it degrades to a normal launch where unsupported.
        share_target: {
          action: '/',
          method: 'GET',
          params: { title: 'title', text: 'text', url: 'url' },
        },
        shortcuts: [
          {
            name: 'Capture a task',
            short_name: 'Capture',
            description: 'Jump straight to capturing a task',
            url: '/?capture=1',
          },
        ],
        icons: [
          { src: '/icons/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          {
            src: '/icons/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Precache the app shell so a cold offline launch works.
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
})
