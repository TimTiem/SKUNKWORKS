/**
 * Design tokens — the single source of style truth (CLAUDE.md → Design system).
 *
 * Structure:
 *  - SKUNKWORKS is DARK-ONLY (Tim's call, 2026-07-15: "dark backgrounds,
 *    military, sleek"). One PURE-BLACK chassis is shared by every theme
 *    (2026-07-16); themes swap the accent/timer/XP colors only, and those
 *    accents are deliberately VIBRANT so they pop on the black ground. `ops`
 *    (tactical amber) is the default; the rest unlock at milestone levels.
 *  - `cssVariables()` flattens a palette into CSS custom properties; a small
 *    Tailwind plugin in `tailwind.config.ts` injects them, so components only
 *    ever speak semantic names (`bg-surface-raised`, `text-ink-muted`, …)
 *    and theming never touches component code.
 *  - Type: Rajdhani (condensed, technical) for all UI text; Black Ops One
 *    (stencil) for display moments — the wordmark, level, the focus clock.
 *    Both ship bundled in `src/assets/fonts` (offline-first, no font CDN).
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

/**
 * The shared chassis: PURE-BLACK ground (Tim, 2026-07-16), crisp ink, deep
 * shadows. The background is true #000000 (OLED-black on phones — vivid accents
 * pop hardest against it); raised/overlay lift cards just enough to read. Every
 * theme rides on this — only accents differ (see ACCENTS below).
 */
const CHASSIS = {
  surface: { base: '#000000', raised: '#0E1014', overlay: '#171B23' },
  ink: { strong: '#EEF1F4', base: '#B9BFC9', muted: '#7B8290' },
  coin: '#F5B84B',
  success: '#4ADE80',
  shadow: {
    card: '0 1px 2px rgb(0 0 0 / 0.40), 0 4px 16px rgb(0 0 0 / 0.35)',
    pop: '0 4px 8px rgb(0 0 0 / 0.45), 0 12px 32px rgb(0 0 0 / 0.50)',
  },
} as const

/**
 * Unlockable themes (Wave 2 cosmetics, P7): accent + timer + XP color swaps
 * on the shared chassis, derived from level — nothing to store or manage.
 * `ops` is the default (level 1); `nebula` (the old default) stays a level-1
 * choice so nothing Tim had is taken away (P4 in spirit).
 */
export interface ThemeMeta {
  id: string
  name: string
  unlockLevel: number
}

// Display names can change freely; the `id` is the stored pref key and must
// never change (renaming an id would silently reset a user's chosen theme).
export const THEMES: readonly ThemeMeta[] = [
  { id: 'ops', name: 'Night Ops', unlockLevel: 1 },
  { id: 'nebula', name: 'Nebula', unlockLevel: 1 },
  { id: 'meadow', name: 'Meadow', unlockLevel: 3 },
  { id: 'ember', name: 'Ember', unlockLevel: 5 },
  { id: 'tide', name: 'Manta', unlockLevel: 8 },
  { id: 'slate', name: 'Fuchsia', unlockLevel: 12 },
]

export const DEFAULT_THEME = 'ops'

interface AccentSpec {
  base: string
  soft: string
  strong: string
  focus: string
  /** Text on an accent fill — amber needs dark ink, the others white. */
  ink: string
}

// Vibrant, high-chroma accents (Tim, 2026-07-16: "very vibrant — manta blue, a
// very deep red"). `base` is the hero color (XP bar, borders, glows — no small
// text sits on it, so it can run bright); `soft` is a light tint that reads as
// text on the black ground; `strong` is a deep shade used as a FILL under
// `ink` text (buttons, pops) — kept dark enough that `ink` clears AA. Amber and
// emerald take dark ink; the deep hues take white.
const ACCENTS: Record<string, AccentSpec> = {
  // Electric tactical amber — the military default, punchier than before.
  ops: { base: '#FF9F1A', soft: '#FFC65C', strong: '#C77800', focus: '#00C2FF', ink: '#1A0F00' },
  // Electric violet.
  nebula: { base: '#8B5CFF', soft: '#C4A6FF', strong: '#6425E0', focus: '#22E0A0', ink: '#FFFFFF' },
  // Vivid emerald.
  meadow: { base: '#12E06B', soft: '#7BF3AB', strong: '#0A9E4A', focus: '#FF9F1A', ink: '#03170C' },
  // A very deep, vivid red (Tim's ask).
  ember: { base: '#FF2740', soft: '#FF8A97', strong: '#B00020', focus: '#00C2FF', ink: '#FFFFFF' },
  // Manta blue — electric cyan-blue.
  tide: { base: '#00B4FF', soft: '#7BDCFF', strong: '#0072CC', focus: '#FF9F1A', ink: '#FFFFFF' },
  // Vivid fuchsia.
  slate: { base: '#FF2E9A', soft: '#FF87C4', strong: '#C10E6E', focus: '#00E0FF', ink: '#FFFFFF' },
}

/** Build a theme palette: shared chassis + swapped accent/xp/focus. */
function themed(accent: AccentSpec): Palette {
  return {
    ...CHASSIS,
    accent: { base: accent.base, soft: accent.soft, strong: accent.strong, ink: accent.ink },
    xp: accent.base,
    focus: accent.focus,
  }
}

/** One palette per theme (the app is dark-only). */
export const themePalettes: Record<string, Palette> = Object.fromEntries(
  THEMES.map((t) => [t.id, themed(ACCENTS[t.id])]),
)

/**
 * Base styles for the Tailwind plugin: the default theme on bare `:root`
 * (correct first paint before JS), plus a `[data-theme="…"]` block per theme.
 * The bare attribute selector matches <html> (runtime switch = one attribute
 * flip) AND any nested element — so the ThemePicker swatches can each carry
 * their own theme's colors.
 */
/** Recursive CSS-rule shape (selectors → declarations or nested at-rules). */
export type CssRules = { [key: string]: string | CssRules }

export function themeBaseStyles(): CssRules {
  const rules: CssRules = {
    ':root': cssVariables(themePalettes[DEFAULT_THEME]),
  }
  for (const { id } of THEMES) {
    rules[`[data-theme="${id}"]`] = cssVariables(themePalettes[id])
  }
  return rules
}

/** '#F5A524' → '245 165 36' (rgb triplet, so Tailwind alpha modifiers work). */
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

  /** Bundled families (see src/assets/fonts); system stacks as fallback. */
  fonts: {
    sans: [
      'Rajdhani',
      'system-ui',
      '-apple-system',
      'Segoe UI',
      'Roboto',
      'Helvetica Neue',
      'Arial',
      'sans-serif',
    ],
    /** Display stencil — wordmark, level, focus clock. One weight (400). */
    display: ['"Black Ops One"', 'Rajdhani', 'system-ui', 'sans-serif'],
  },

  /** Sharp, technical corners — sleek over friendly. */
  radii: {
    control: '0.375rem', // buttons, inputs
    card: '0.625rem', // cards, sheets, list rows
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
