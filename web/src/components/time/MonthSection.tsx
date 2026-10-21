/**
 * A month of a list under a heading that stays pinned while you scroll through it, so you always
 * know where you are in time. The section carries the id the time scrubber jumps to.
 */
import { ArrowDownUp } from 'lucide-react'
import type { ReactNode } from 'react'
import { monthAnchor, type Order } from '../../lib/months'

/** Clears the phone's top bar; on desktop the list's own scroll box starts at the top. */
const PINNED = 'top-[calc(3.25rem+env(safe-area-inset-top))] lg:top-0'

export function MonthSection({ scope, monthKey, label, count, children }: { scope: string; monthKey: string; label: string; count: number; children: ReactNode }) {
  return (
    <section id={monthAnchor(scope, monthKey)} className="scroll-mt-[calc(3.25rem+env(safe-area-inset-top))] lg:scroll-mt-0">
      <h2 className={`sticky z-10 flex items-baseline gap-2 bg-ink/95 py-2 text-sm font-semibold backdrop-blur ${PINNED}`}>
        {label} <span className="font-normal text-faint tabular">{count}</span>
      </h2>
      {children}
    </section>
  )
}

/** Newest first or oldest first. */
export function OrderToggle({ order, onChange }: { order: Order; onChange: (o: Order) => void }) {
  return (
    <button type="button" onClick={() => onChange(order === 'new' ? 'old' : 'new')} aria-label={`Sorted ${order === 'new' ? 'newest' : 'oldest'} first. Switch`}
      className="inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-sm text-dim transition hover:bg-ink-3 hover:text-paper">
      <ArrowDownUp size={15} /> {order === 'new' ? 'Newest first' : 'Oldest first'}
    </button>
  )
}
