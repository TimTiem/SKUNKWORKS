/**
 * Design tokens — the single source of style truth (CLAUDE.md → Design system).
 *
 * Structure:
 *  - `palettes` hold the raw color values per theme (dark is the default;
 *    light applies via `prefers-color-scheme`). Wave 2's unlockable themes
 *    are additional palettes swapped in the same way.
 *  - `cssVariables()` flattens a palette into CSS custom properties; a small
 *    Tailwind plugin in `tailwind.config.ts` injects them, so components only
 *    ever speak semantic names (`bg-surface-raised`, `text-ink-muted`, …)
 *    and theming never touches component code.
 *  - Type scale: we deliberately adopt Tailwind's default modular scale —
 *    boring, proven, and enough; the tokens here add families and weights.
 *
 * Never hard-code a color, radius, duration, or easing in a component; add a
 * token here and consume it through Tailwind.
 */

export interface Palette {
  surface: {
    /** App background. */
    base: string
    /** Cards, list rows, sheets. */
    raised: string
    /** Inputs, wells, secondary fills. */
    overlay: string
  }
  ink: {
    /** Headings, primary content. */
    strong: string
    /** Body text. */
    base: string
    /** Secondary text, placeholders. */
    muted: string
  }
  accent: {
    base: string
    soft: string
    strong: string
    /** Text placed ON an accent fill (buttons). */
    ink: string
  }
  /** Semantic gamification colors. */
  xp: string
  coin: string
  success: string
  focus: string
  shadow: {
    card: string
    pop: string
  }
}

export const palettes: Record<'dark' | 'light', Palette> = {
  dark: {
    surface: { base: '#0F1117', raised: '#171A23', overlay: '#232736' },
    ink: { strong: '#F4F5F9', base: '#C3C7D4', muted: '#8A90A3' },
    accent: { base: '#7C6CF6', soft: '#A99DF9', strong: '#5B48E8', ink: '#FFFFFF' },
    xp: '#7C6CF6',
    coin: '#F5B84B',
    success: '#4ADE80',
    focus: '#38BDF8',
    shadow: {
      card: '0 1px 2px rgb(0 0 0 / 0.25), 0 4px 16px rgb(0 0 0 / 0.20)',
      pop: '0 4px 8px rgb(0 0 0 / 0.30), 0 12px 32px rgb(0 0 0 / 0.35)',
    },
  },
  light: {
    surface: { base: '#F5F6FA', raised: '#FFFFFF', overlay: '#E7E9F2' },
    ink: { strong: '#171A23', base: '#3C4152', muted: '#5D6478' },
    accent: { base: '#5B48E8', soft: '#7C6CF6', strong: '#4633CF', ink: '#FFFFFF' },
    xp: '#5B48E8',
    coin: '#8A5E00',
    success: '#1A7F42',
    focus: '#0273A8',
    shadow: {
      card: '0 1px 2px rgb(23 26 35 / 0.08), 0 4px 16px rgb(23 26 35 / 0.07)',
      pop: '0 4px 8px rgb(23 26 35 / 0.12), 0 12px 32px rgb(23 26 35 / 0.14)',
    },
  },
}

/** '#7C6CF6' → '124 108 246' (rgb triplet, so Tailwind alpha modifiers work). */
export function hexToRgbTriplet(hex: string): string {
  const value = hex.replace('#', '')
  const r = parseInt(value.slice(0, 2), 16)
  const g = parseInt(value.slice(2, 4), 16)
  const b = parseInt(value.slice(4, 6), 16)
  return `${r} ${g} ${b}`
}

/** Flatten a palette into the CSS custom properties the Tailwind theme reads. */
export function cssVariables(palette: Palette): Record<string, string> {
  return {
    '--color-surface-base': hexToRgbTriplet(palette.surface.base),
    '--color-surface-raised': hexToRgbTriplet(palette.surface.raised),
    '--color-surface-overlay': hexToRgbTriplet(palette.surface.overlay),
    '--color-ink-strong': hexToRgbTriplet(palette.ink.strong),
    '--color-ink-base': hexToRgbTriplet(palette.ink.base),
    '--color-ink-muted': hexToRgbTriplet(palette.ink.muted),
    '--color-accent-base': hexToRgbTriplet(palette.accent.base),
    '--color-accent-soft': hexToRgbTriplet(palette.accent.soft),
    '--color-accent-strong': hexToRgbTriplet(palette.accent.strong),
    '--color-accent-ink': hexToRgbTriplet(palette.accent.ink),
    '--color-xp': hexToRgbTriplet(palette.xp),
    '--color-coin': hexToRgbTriplet(palette.coin),
    '--color-success': hexToRgbTriplet(palette.success),
    '--color-focus': hexToRgbTriplet(palette.focus),
    '--shadow-card': palette.shadow.card,
    '--shadow-pop': palette.shadow.pop,
  }
}

const v = (name: string) => `rgb(var(${name}) / <alpha-value>)`

export const tokens = {
  /** Semantic color map — resolves through the theme variables above. */
  colors: {
    surface: {
      base: v('--color-surface-base'),
      raised: v('--color-surface-raised'),
      overlay: v('--color-surface-overlay'),
    },
    ink: {
      strong: v('--color-ink-strong'),
      base: v('--color-ink-base'),
      muted: v('--color-ink-muted'),
    },
    accent: {
      base: v('--color-accent-base'),
      soft: v('--color-accent-soft'),
      strong: v('--color-accent-strong'),
      ink: v('--color-accent-ink'),
    },
    xp: v('--color-xp'),
    coin: v('--color-coin'),
    success: v('--color-success'),
    focus: v('--color-focus'),
  },

  /** System stack: fast, native on every platform, no font-loading flash. */
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
    card: '1rem', // cards, sheets, list rows
    pill: '9999px', // progress bars, chips
  },

  shadows: {
    card: 'var(--shadow-card)',
    pop: 'var(--shadow-pop)',
  },

  /**
   * Motion vocabulary: `enter` / `exit` / `celebrate` (CLAUDE.md → Design
   * system). The CSS classes in `index.css` mirror these values. All motion
   * must honor `prefers-reduced-motion` with a static fallback.
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
