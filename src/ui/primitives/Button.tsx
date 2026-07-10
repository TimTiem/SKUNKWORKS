import type { ButtonHTMLAttributes } from 'react'

const VARIANTS = {
  /** The one emphatic action on a screen. */
  primary:
    'rounded-control bg-accent-strong px-4 py-3 font-medium text-accent-ink transition-colors duration-enter ease-standard hover:bg-accent-base disabled:opacity-60',
  /** Low-key actions that must never compete for attention (P8). */
  quiet:
    'rounded-control px-3 py-2 text-sm text-ink-muted underline-offset-2 transition-colors duration-enter ease-standard hover:text-ink-base hover:underline',
} as const

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof VARIANTS
}

export function Button({ variant = 'primary', className = '', type = 'button', ...props }: ButtonProps) {
  return <button type={type} className={`${VARIANTS[variant]} ${className}`} {...props} />
}
