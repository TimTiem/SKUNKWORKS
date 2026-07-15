import type { Config } from 'tailwindcss'
import plugin from 'tailwindcss/plugin'
import { themeBaseStyles, tokens } from './src/ui/tokens'

/**
 * Tailwind theme extended from the design-token layer (`src/ui/tokens.ts`) —
 * the token module stays the single source of style truth (SETUP.md §3).
 * Colors resolve through CSS variables injected below, so the light theme
 * (and Wave 2's unlockable themes) swap palettes without touching components.
 */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: tokens.colors,
      fontFamily: { sans: [...tokens.fonts.sans], display: [...tokens.fonts.display] },
      borderRadius: tokens.radii,
      boxShadow: tokens.shadows,
      transitionDuration: tokens.motion.durations,
      transitionTimingFunction: tokens.motion.easings,
    },
  },
  plugins: [
    plugin(({ addBase }) => {
      // Dark-only (Tim's call, 2026-07-15). Every theme is emitted as a
      // `[data-theme]` rule so switching is a runtime attribute flip — no
      // injected <style>, CSP-safe.
      addBase(themeBaseStyles())
    }),
  ],
} satisfies Config
