/**
 * The pulse's first card: the step fewest ideas get through, said in one line, with the list that
 * holds them; then the plain sentences worth knowing (a kind gone quiet, the biggest unused pile).
 */
import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router'
import type { Step } from '../pulse'

const SAY: Record<Step['kind'], { title: string; body: (s: Step) => string; link: string; to: string }> = {
  observations: {
    title: 'Most observations go nowhere yet',
    body: (s) => `${s.of} observations in the last 90 days, ${s.done} led to a premise, joke or brainstorm.`,
    link: 'Open your unused observations',
    to: '/observations?unused=1',
  },
  premises: {
    title: 'Your ideas stall at premise to joke',
    body: (s) => `${s.of} premises in the last 90 days, ${s.done} with a joke on them.`,
    link: 'Open premises without a joke',
    to: '/premises?sort=fewest',
  },
  jokes: {
    title: 'Few jokes reach Stage Ready',
    body: (s) => `${s.of} jokes in the last 90 days, ${s.done} marked Stage Ready.`,
    link: 'Open your drafts',
    to: '/jokes?status=Draft',
  },
}

export function PulseHeadline({ narrowest, notes, wider }: { narrowest: Step | null; notes: string[]; wider: boolean }) {
  if (!narrowest && !notes.length) return null
  const say = narrowest && SAY[narrowest.kind]
  return (
    <div className="rounded-xl bg-tape/[0.08] px-4 py-3.5 ring-1 ring-tape/30 sm:px-5">
      {say && narrowest && (
        <>
          <p className="headline text-[24px] text-tape">{say.title}</p>
          <p className="mt-1.5 text-[15px]">{say.body(narrowest)}{wider ? ' Every other step is wider.' : ''}</p>
          <Link to={say.to} className="mt-2 inline-flex min-h-11 items-center gap-1 text-[15px] text-tape hover:underline">{say.link}<ChevronRight size={16} /></Link>
        </>
      )}
      {notes.length > 0 && (
        <ul className={`space-y-1.5 text-[15px] ${say ? 'border-t border-tape/20 pt-3' : ''}`}>
          {notes.map((n) => <li key={n} className="flex gap-2.5"><span className="mt-2 size-1.5 shrink-0 rounded-full bg-tape" aria-hidden />{n}</li>)}
        </ul>
      )}
    </div>
  )
}
