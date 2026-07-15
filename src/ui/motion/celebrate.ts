/**
 * Celebration variants (CLAUDE.md → Design system): a small rotated set so a
 * celebration is never one repeated animation. Each is static under
 * `prefers-reduced-motion` (handled in index.css). Callers pass a seed
 * (level number, redemption count) so consecutive celebrations differ.
 */
const VARIANTS = ['celebrate-stamp', 'celebrate-pop', 'celebrate-flicker', 'celebrate-rise'] as const

export function celebrationClass(seed: number): string {
  const index = ((Math.trunc(seed) % VARIANTS.length) + VARIANTS.length) % VARIANTS.length
  return VARIANTS[index]
}
