/** Small presentational pieces shared across screens. */
import { Star } from 'lucide-react'
import type { CSSProperties, ReactNode } from 'react'
import { useTypeColor } from '../../api/typeColors'
import { strengthLabel } from '../../lib/bitMeta'

/** Strength as five ticks, like marks scratched into a notebook margin. */
export function StrengthTicks({ strength, size = 'sm', fill = 'bg-tape' }: { strength: number; size?: 'sm' | 'lg'; fill?: string }) {
  const tick = size === 'lg' ? 'h-4 w-1.5' : 'h-3 w-1'
  return (
    <span className="inline-flex items-end gap-[3px]" role="img" aria-label={`Strength: ${strengthLabel(strength)}`} title={strengthLabel(strength)}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className={`${tick} rounded-[1px] ${n <= strength ? fill : 'bg-ink-4'}`} />
      ))}
    </span>
  )
}

/** A type as a coloured dot and its name. Lighter than a pill, so lists stay calm. */
export function TypeLabel({ name }: { name: string }) {
  const colorOf = useTypeColor()
  return (
    <span className="inline-flex items-center gap-1.5 text-[13px] text-dim">
      <span className="size-1.5 rounded-full" style={{ backgroundColor: colorOf(name) }} aria-hidden />
      {name}
    </span>
  )
}

export function Stars({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <span className="inline-flex" role="img" aria-label={`${rating} of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} size={size} className={n <= rating ? 'fill-tape text-tape' : 'text-ink-4'} />
      ))}
    </span>
  )
}

/** A strip of masking tape with marker writing. `seed` keeps each strip's tilt stable. */
export function Tape({ children, seed = 0, dim, optional, className = '' }: { children: ReactNode; seed?: number; dim?: boolean; optional?: boolean; className?: string }) {
  const tilt = (((seed * 37) % 7) - 3) * 0.25
  return (
    <div className={`tape ${optional ? 'tape-optional' : ''} ${dim ? 'tape-dim' : ''} ${className}`} style={{ '--tilt': `${tilt}deg` } as CSSProperties}>
      {children}
    </div>
  )
}

export function EmptyState({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-3 py-12">
      <p className="headline text-3xl text-paper">{title}</p>
      {children && <div className="max-w-sm text-[15px] leading-relaxed text-dim">{children}</div>}
      {action}
    </div>
  )
}

export function Spinner({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 text-dim" role="status">
      <div className="size-5 animate-spin rounded-full border-2 border-tape border-t-transparent" />
      <span className="text-sm">{label}</span>
    </div>
  )
}

/** A page heading in gig-poster type, with optional actions on the right. */
export function PageHead({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="flex items-end justify-between gap-3 pt-6 pb-5 lg:pt-10">
      <h1 className="headline text-[44px] sm:text-[56px]">{title}</h1>
      {children && <div className="flex shrink-0 items-center gap-1 pb-1">{children}</div>}
    </div>
  )
}

/** A quiet section heading inside a page. */
export function SectionHead({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-3">
      <h2 className="headline text-2xl">{title}</h2>
      {children}
    </div>
  )
}
