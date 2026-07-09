import type { Config } from 'tailwindcss'
import { tokens } from './src/ui/tokens'

/**
 * Tailwind theme is extended from the design-token layer (`src/ui/tokens.ts`)
 * so the token module stays the single source of style truth (SETUP.md §3).
 */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
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
  plugins: [],
} satisfies Config
