/**
 * Observations | Premises, at the top of both lists wherever the bottom bar's Ideas tab is the way
 * in (phones and an upright iPad). From 1024 px the rail lists both screens, so it hides.
 */
import { Link, useLocation } from 'react-router'
import { usePremises } from '../api/premises'
import { useObservations } from '../api/notebook'
import { IDEAS, ideasScreen } from './ideas'

export function IdeasSwitch() {
  const current = ideasScreen(useLocation().pathname)
  const counts: Record<string, number | undefined> = {
    '/premises': usePremises().data?.length,
    '/observations': useObservations().data?.length,
  }
  return (
    <nav aria-label="Ideas" className="grid grid-cols-2 gap-1 rounded-xl bg-ink-3 p-1 mt-4 lg:hidden">
      {IDEAS.map(({ to, label }) => {
        const on = current === to
        return (
          <Link key={to} to={to} aria-current={on ? 'page' : undefined}
            className={`flex h-10 min-w-0 items-center justify-center gap-2 rounded-lg text-[15px] transition ${on ? 'bg-paper font-semibold text-ink' : 'text-dim hover:text-paper'}`}>
            <span className="truncate">{label}</span>
            {counts[to] !== undefined && <span className="text-sm tabular opacity-70">{counts[to]}</span>}
          </Link>
        )
      })}
    </nav>
  )
}
