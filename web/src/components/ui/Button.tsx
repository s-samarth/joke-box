import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-accent text-black hover:bg-accent-hover active:bg-accent-press font-semibold',
  secondary: 'bg-raised text-text ring-1 ring-line-strong hover:bg-hover',
  ghost: 'text-muted hover:text-text hover:bg-white/5',
  danger: 'bg-danger/10 text-danger ring-1 ring-danger/30 hover:bg-danger/20',
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  icon?: ReactNode
  size?: 'sm' | 'md'
}

/** The one button. Min height 40px (44px on touch) so it's easy to hit on a phone. */
export function Button({ variant = 'secondary', icon, size = 'md', className = '', children, ...rest }: ButtonProps) {
  const sizing = size === 'sm' ? 'h-9 px-3 text-sm' : 'h-11 px-4 text-sm sm:h-10'
  return (
    <button
      type="button"
      className={`inline-flex shrink-0 items-center justify-center gap-2 rounded-xl transition-colors disabled:pointer-events-none disabled:opacity-40 ${sizing} ${VARIANTS[variant]} ${className}`}
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

/** A square button with only an icon. `label` is read out by screen readers. */
export function IconButton({ label, className = '', children, ...rest }: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`inline-flex size-10 shrink-0 items-center justify-center rounded-xl text-muted transition-colors hover:bg-white/5 hover:text-text disabled:opacity-40 ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
}
