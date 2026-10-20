/** Small presentational pieces used across screens. */
import { Flame } from 'lucide-react'
import type { ReactNode } from 'react'
import { strengthLabel, typeStyle } from '../../lib/bitMeta'

export function TypeChip({ name }: { name: string }) {
  return (
    <span className={`inline-flex h-6 items-center rounded-full px-2.5 text-xs font-medium ring-1 ${typeStyle(name)}`}>
      {name}
    </span>
  )
}

/** Strength 1 to 5 as flames, with the label for screen readers. */
export function Flames({ strength, size = 14 }: { strength: number; size?: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" title={strengthLabel(strength)} aria-label={`Strength: ${strengthLabel(strength)}`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Flame key={n} size={size} className={n <= strength ? 'fill-accent text-accent' : 'text-white/15'} />
      ))}
    </span>
  )
}

export function EmptyState({ icon, title, children }: { icon: ReactNode; title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-raised text-faint ring-1 ring-line">{icon}</div>
      <p className="font-display text-lg font-semibold">{title}</p>
      {children && <div className="max-w-sm text-sm text-muted">{children}</div>}
    </div>
  )
}

export function Spinner({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center gap-3" role="status">
      <div className="size-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      <span className="text-sm text-muted">{label}</span>
    </div>
  )
}

export function Pill({ active, onClick, children, ...rest }: { active: boolean; onClick: () => void; children: ReactNode } & Record<string, unknown>) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`h-9 shrink-0 rounded-full px-3.5 text-sm transition-colors ${active ? 'bg-accent text-black font-semibold' : 'bg-raised text-muted ring-1 ring-line hover:text-text'}`}
      {...rest}
    >
      {children}
    </button>
  )
}

/** A card surface. */
export function Panel({ className = '', children }: { className?: string; children: ReactNode }) {
  return <div className={`rounded-2xl bg-panel ring-1 ring-line ${className}`}>{children}</div>
}
