/**
 * Writing pulse, at the foot of Daily activity: how the writing is going, read from what's
 * already saved (see pulse.ts), so there is nothing to fill in. The pace against the month
 * before, how far ideas get on their way to a finished joke, what's sitting idle (each row opens
 * the list that shows it), and a few plain sentences.
 */
import { ArrowDown, ArrowUp, ChevronRight, Minus } from 'lucide-react'
import { Link } from 'react-router'
import { useJokes, useTopics } from '../../api/library'
import { useObservations } from '../../api/notebook'
import { usePremises } from '../../api/premises'
import { topicName } from '../../lib/jokeMeta'
import { useToday } from '../../lib/useToday'
import { useUses } from '../observations/useUsed'
import { KIND_META } from './activity'
import { pulse, RECENT, WINDOW, type Idle, type Pace, type Step } from './pulse'

const cap = (s: string) => s[0].toUpperCase() + s.slice(1)

function PaceTile({ kind, now, before }: Pace) {
  const diff = now - before
  const Arrow = diff > 0 ? ArrowUp : diff < 0 ? ArrowDown : Minus
  const versus = diff === 0 ? `same as the ${RECENT} days before` : `${Math.abs(diff)} ${diff > 0 ? 'more' : 'fewer'} than the ${RECENT} days before`
  return (
    <div className="min-w-0">
      <dt className="flex items-center gap-1.5 text-sm text-dim"><span className={`size-2 shrink-0 rounded-full ${KIND_META[kind].dot}`} aria-hidden />{cap(KIND_META[kind].many)}</dt>
      <dd className="mt-1">
        <span className="headline text-[28px] tabular">{now}</span>
        <span className={`mt-0.5 flex items-start gap-1 text-xs ${diff > 0 ? 'text-ok' : 'text-dim'}`}><Arrow size={13} className="mt-0.5 shrink-0" aria-hidden />{versus}</span>
      </dd>
    </div>
  )
}

function StepRow({ kind, label, done, of }: Step) {
  return (
    <li>
      <div className="flex items-baseline justify-between gap-3 text-[15px]">
        <span className="min-w-0">{label}</span>
        <span className="tabular shrink-0 text-dim"><b className="font-semibold text-paper">{done}</b> of {of}</span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-ink-3" aria-hidden>
        <span className={`block h-full rounded-full ${KIND_META[kind].dot}`} style={{ width: `${of ? Math.round((done / of) * 100) : 0}%` }} />
      </div>
    </li>
  )
}

function IdleRow({ label, count, to }: Idle) {
  const words = <><b className="tabular font-semibold text-paper">{count}</b> <span className="text-dim">{label}</span></>
  const row = 'flex min-h-11 items-center justify-between gap-3 py-2 text-[15px]'
  return (
    <li>
      {to ? <Link to={to} className={`${row} hover:text-tape active:bg-ink-2`}><span>{words}</span><ChevronRight size={17} className="shrink-0 text-faint" aria-hidden /></Link> : <p className={row}><span>{words}</span></p>}
    </li>
  )
}

const part = 'text-sm text-dim'

export function WritingPulse() {
  const { data: jokes } = useJokes()
  const { data: premises } = usePremises()
  const { data: observations } = useObservations()
  const { data: topics = [] } = useTopics()
  const uses = useUses()
  const today = useToday()
  const p = pulse({ jokes: jokes ?? [], premises: premises ?? [], observations: observations ?? [], used: uses.used, topicName: (id) => topicName(topics.find((t) => t.id === id)) || 'Random', today })

  return (
    <section aria-labelledby="pulse-title" className="space-y-6 border-t border-rule pt-6">
      <div>
        <h2 id="pulse-title" className="headline text-[28px]">Writing pulse</h2>
        <p className="mt-1 text-sm text-dim">Worked out from what you’ve written. Nothing to log.</p>
      </div>
      {p.thin ? (
        <p className="text-dim">Write a few more observations, premises or jokes and this fills in.</p>
      ) : (
        <>
          <div>
            <h3 className={part}>Written in the last {RECENT} days</h3>
            <dl className="mt-3 grid grid-cols-3 gap-4">{p.pace.map((t) => <PaceTile key={t.kind} {...t} />)}</dl>
          </div>
          <div>
            <h3 className={part}>How far ideas got, of what you wrote in the last {WINDOW} days</h3>
            <ul className="mt-3 space-y-3.5">{p.steps.map((s) => <StepRow key={s.label} {...s} />)}</ul>
          </div>
          {p.idle.length > 0 && (
            <div>
              <h3 className={part}>Sitting idle</h3>
              <ul className="mt-1 divide-y divide-rule border-y border-rule">{p.idle.map((i) => <IdleRow key={i.label} {...i} />)}</ul>
            </div>
          )}
          {p.notes.length > 0 && (
            <div>
              <h3 className={part}>Worth knowing</h3>
              <ul className="mt-2 space-y-2 text-[15px]">{p.notes.map((n) => <li key={n} className="flex gap-2.5"><span className="mt-2 size-1.5 shrink-0 rounded-full bg-tape" aria-hidden />{n}</li>)}</ul>
            </div>
          )}
        </>
      )}
    </section>
  )
}
