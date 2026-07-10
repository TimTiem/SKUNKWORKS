import type { Config } from 'tailwindcss'
import plugin from 'tailwindcss/plugin'
import { cssVariables, palettes, tokens } from './src/ui/tokens'

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
      fontFamily: { sans: [...tokens.fonts.sans] },
      borderRadius: tokens.radii,
      boxShadow: tokens.shadows,
      transitionDuration: tokens.motion.durations,
      transitionTimingFunction: tokens.motion.easings,
    },
  },
  plugins: [
    plugin(({ addBase }) => {
      addBase({
        // Dark-first; light applies when the OS asks for it.
        ':root': cssVariables(palettes.dark),
        '@media (prefers-color-scheme: light)': {
          ':root': cssVariables(palettes.light),
        },
      })
    }),
  ],
} satisfies Config
