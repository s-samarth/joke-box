/** Sitting idle: each pile as a chip that opens the list holding it. */
import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router'
import type { Idle } from '../pulse'
import { PulseCard } from './PulseCard'

const dot = (to: string) => (to.startsWith('/observations') ? 'bg-orchid' : to.startsWith('/premises') ? 'bg-sky' : 'bg-ok')

export function IdleCard({ idle }: { idle: Idle[] }) {
  return (
    <PulseCard title="Sitting idle">
      {idle.length === 0 ? (
        <p className="text-[15px] text-dim">Nothing's sitting idle. Everything you wrote went somewhere.</p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {idle.map((i) => (
            <li key={i.label}>
              <Link to={i.to} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-ink-3 px-3.5 text-sm hover:bg-ink-4">
                <span className={`size-2 rounded-full ${dot(i.to)}`} aria-hidden />
                <b className="font-semibold tabular">{i.count}</b>
                <span className="text-dim">{i.label}</span>
                <ChevronRight size={15} className="text-faint" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </PulseCard>
  )
}
