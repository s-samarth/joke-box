import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'tape' | 'plain' | 'quiet' | 'danger'

const VARIANTS: Record<Variant, string> = {
  tape: 'bg-tape text-tape-ink font-semibold hover:bg-[#f5da77] active:bg-tape-deep',
  plain: 'bg-ink-3 text-paper hover:bg-ink-4',
  quiet: 'text-dim hover:text-paper hover:bg-ink-3',
  danger: 'text-light hover:bg-light/10',
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  icon?: ReactNode
  small?: boolean
}

/** One button. 44px tall on phones so it's easy to hit after a set. */
export function Button({ variant = 'plain', icon, small, className = '', children, ...rest }: ButtonProps) {
  const size = small ? 'h-9 px-3 text-sm' : 'h-11 px-4 text-[15px] sm:h-10'
  return (
    <button
      type="button"
      className={`inline-flex shrink-0 items-center justify-center gap-2 rounded-lg transition-colors disabled:pointer-events-none disabled:opacity-40 ${size} ${VARIANTS[variant]} ${className}`}
      {...rest}
    >
      {icon}
      {children}
    </button>
  )
}

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string
  children: ReactNode
}

export function IconButton({ label, className = '', children, ...rest }: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`inline-flex size-10 shrink-0 items-center justify-center rounded-lg text-dim transition-colors hover:bg-ink-3 hover:text-paper disabled:opacity-30 ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
}
