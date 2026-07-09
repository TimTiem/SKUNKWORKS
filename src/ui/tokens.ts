/**
 * Design tokens — the single source of style truth.
 *
 * Authored here, mirrored into `tailwind.config.ts` (CLAUDE.md → Design system).
 * Never hard-code a color, radius, duration, or easing in a component; add a
 * token here and consume it through Tailwind classes.
 *
 * NOTE: this is the scaffold-level starter set. The cohesive visual system
 * (light/dark themes, full type scale, celebration variants) is authored in
 * Wave 1, slice 7 — extend this module then; don't bypass it.
 */

export const tokens = {
  colors: {
    // Surfaces (dark-first; light theme lands in slice 7)
    surface: {
      base: '#0F1117',
      raised: '#171A23',
      overlay: '#1F2330',
    },
    // Text
    ink: {
      strong: '#F4F5F9',
      base: '#C3C7D4',
      muted: '#8A90A3',
    },
    // Brand / action
    accent: {
      base: '#7C6CF6',
      soft: '#A99DF9',
      strong: '#5B48E8',
    },
    // Semantic gamification colors
    xp: '#7C6CF6', // XP + level progress
    coin: '#F5B84B', // spendable coins
    success: '#4ADE80', // completion feedback
    focus: '#38BDF8', // focus-timer ring
  },

  fonts: {
    sans: [
      'system-ui',
      '-apple-system',
      'Segoe UI',
      'Roboto',
      'Helvetica Neue',
      'Arial',
      'sans-serif',
    ],
  },

  radii: {
    control: '0.625rem', // buttons, inputs
    card: '1rem', // cards, sheets
    pill: '9999px', // progress bars, chips
  },

  shadows: {
    card: '0 1px 2px rgb(0 0 0 / 0.25), 0 4px 16px rgb(0 0 0 / 0.20)',
    pop: '0 4px 8px rgb(0 0 0 / 0.30), 0 12px 32px rgb(0 0 0 / 0.35)',
  },

  /**
   * Motion vocabulary: `enter` / `exit` / `celebrate` (CLAUDE.md → Design system).
   * All motion must honor `prefers-reduced-motion` with a static fallback.
   */
  motion: {
    durations: {
      enter: '180ms',
      exit: '140ms',
      celebrate: '600ms',
    },
    easings: {
      standard: 'cubic-bezier(0.2, 0, 0, 1)',
      decelerate: 'cubic-bezier(0, 0, 0, 1)',
      celebrate: 'cubic-bezier(0.34, 1.56, 0.64, 1)', // playful overshoot
    },
  },
} as const
