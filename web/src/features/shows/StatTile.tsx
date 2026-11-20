/**
 * One number in a box, the Shows page's stat tile: a small label, then the value big with an
 * optional unit after it. The same box as Home's Observations / Premises / Jokes tiles. A group of
 * them sits under a small heading (TileGroup).
 */
import type { ReactNode } from 'react'

interface TileProps {
  label: ReactNode
  value: ReactNode
  unit?: string
  /** Gold number and ring, for the stage streak. */
  accent?: boolean
}

export function StatTile({ label, value, unit, accent }: TileProps) {
  return (
    <div className={`min-w-0 rounded-xl bg-ink-2 px-3 py-2.5 ring-1 sm:px-3.5 ${accent ? 'ring-tape/30' : 'ring-rule'}`}>
      <dt className="flex items-center gap-1.5 truncate text-xs text-dim sm:text-[13px]">{label}</dt>
      <dd className="mt-1.5 truncate">
        <span className={`headline text-[24px] leading-none tabular sm:text-[28px] ${accent ? 'text-tape' : ''}`}>{value}</span>
        {unit && <span className="text-[13px] text-dim"> {unit}</span>}
      </dd>
    </div>
  )
}

/** A small heading over a row of tiles. `cols` is the Tailwind grid class for the row. */
export function TileGroup({ title, cols, children }: { title: string; cols: string; children: ReactNode }) {
  return (
    <section aria-label={title} className="min-w-0">
      <h2 className="mb-1.5 text-xs text-faint">{title}</h2>
      <dl className={`grid gap-2 ${cols}`}>{children}</dl>
    </section>
  )
}
