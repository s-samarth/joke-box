/**
 * The cue card: what you memorise (docs/sets.md), in the app's dark colours. The point, then each
 * beat's cue, time and start, its Status and persona, and under it its premises, Standalone jokes
 * (by title, when they have one) and crowd work. Each joke is the start of its punchline with a dot
 * in its Vibe colour: teal when it's loose, and what rides on a gate in sky after "if it lands".
 * Printing turns it black on white, so it doesn't use a page of ink.
 */
import { ArrowLeft, Printer } from 'lucide-react'
import { Fragment, type ReactNode } from 'react'
import { Link, useParams } from 'react-router'
import { useJokes } from '../../api/library'
import { usePremises } from '../../api/premises'
import { useSetFields } from '../../api/setFields'
import { useSetlists } from '../../api/shows'
import type { Joke, SetEntry } from '../../api/types'
import { clock } from '../../lib/duration'
import { useVibeTone } from '../jokes/vibeTone'
import { LabelChip } from './BeatBoard'
import { beatName, beatTotal, beatsOf, personaField, statusField } from './beats'
import { starts } from './birdsEye'
import { type Row, rowsOf } from './gateRows'

const clip = (text: string, n: number) => (text.length > n ? `${text.slice(0, n - 1).trimEnd()}…` : text)

export function PrintView() {
  const { setId } = useParams()
  const { data: sets = [] } = useSetlists()
  const { data: jokes = [] } = useJokes()
  const { data: premiseList = [] } = usePremises()
  const { fields } = useSetFields()
  const vibe = useVibeTone()
  const setlist = sets.find((s) => s.id === setId)
  if (!setlist) return <div className="p-8 text-dim">Set not found.</div>
  const beats = beatsOf(setlist)
  const at = starts(beats)
  const byId = new Map(jokes.map((j) => [j.id, j]))
  const premises = new Map(premiseList.map((p) => [p.id, p]))
  const labels = [statusField(fields), personaField(fields)].filter((f) => f !== undefined)

  const token = (j: Joke | undefined, loose: boolean) => (
    <span className={loose ? 'text-teal print:text-black' : 'text-paper print:text-black'}>
      <span className="mr-1 inline-block size-2 rounded-full align-middle" style={vibe(j?.persona).dot} />
      {clip(j?.punchline || j?.setup || 'A joke that is gone', 40)}
    </span>
  )
  const line = (rows: Row[]): ReactNode => rows.map((r, n) => (
    <Fragment key={r.piece.id}>
      {n > 0 && <span className="text-faint"> · </span>}
      {token(byId.get(r.piece.joke_id), r.piece.loose)}
      {r.guarded.length > 0 && <span className="text-sky print:text-black"> (if it lands: {line(r.guarded)})</span>}
    </Fragment>
  ))
  const entry = (e: SetEntry) => {
    if (e.kind === 'crowd') return (
      <li key={e.id} className="text-orchid print:text-black">
        <span className="italic">Crowd work{e.title ? `: ${e.title}` : ''}</span>
        {e.questions.map((q) => <span key={q.id} className="block pl-3">? {clip(q.text || 'A question', 60)} <span className={`text-sm ${q.has_reply ? 'text-ok' : 'text-amber'} print:text-black`}>{q.has_reply ? 'reply ready' : 'no reply yet'}</span></span>)}
      </li>
    )
    const take = e.kind === 'premise' ? clip((e.premise_id && premises.get(e.premise_id)?.take) || 'Premise', 70) : e.title?.trim()
    const tint = e.kind === 'premise' ? (e.gate ? 'text-sky' : 'text-leaf') : 'text-paper'
    return (
      <li key={e.id}>
        {take && <span className={`block font-semibold ${tint} print:text-black`}>{e.kind === 'premise' && e.gate && 'If that landed: '}{take}</span>}
        <span className="text-dim">+ </span>{e.pieces.length ? line(rowsOf(e.pieces)) : <span className="text-faint">no jokes yet</span>}
      </li>
    )
  }

  return (
    <div className="min-h-dvh bg-ink text-paper print:bg-white print:text-black">
      <div className="flex items-center justify-between border-b border-rule px-4 py-2.5 sm:px-6 print:hidden">
        <Link to={`/sets/${setlist.id}`} className="inline-flex h-10 items-center gap-1.5 text-dim hover:text-paper"><ArrowLeft size={16} /> Back to the set</Link>
        <button type="button" onClick={() => window.print()} className="inline-flex h-10 items-center gap-2 rounded-lg bg-tape px-4 font-semibold text-tape-ink"><Printer size={16} /> Print</button>
      </div>
      <article className="mx-auto max-w-2xl px-5 py-8 sm:px-8">
        <h1 className="headline text-5xl sm:text-6xl">{setlist.name}</h1>
        <p className="mt-2 text-lg text-dim print:text-black">{clock(beatTotal(beats))} of beats · {clock(setlist.target_seconds)} slot</p>
        {setlist.point && <p className="mt-4 border-l-4 border-tape pl-3 text-xl leading-snug print:border-black">{setlist.point}</p>}
        <ol className="mt-6 border-t-2 border-rule-strong print:border-black">
          {beats.length === 0 && <li className="pt-6 text-lg text-dim">No beats yet.</li>}
          {beats.map((b, i) => (
            <li key={b.id} className="break-inside-avoid border-b border-rule py-4">
              <div className="flex items-baseline gap-3">
                <span className="text-xl font-bold tabular">{i + 1}</span>
                <span className="font-marker text-3xl text-tape print:text-black">{beatName(b, i)}</span>
                <span className="ml-auto text-lg whitespace-nowrap tabular">{clock(b.seconds)}<span className="ml-2 text-sm text-faint">from {clock(at[i])}</span></span>
              </div>
              <div className="mt-1.5 flex flex-wrap gap-1.5 pl-8">
                {labels.map((f) => <LabelChip key={f.id} field={f} beat={b} />)}
                {b.shift_reason && <span className="rounded-full px-2 py-px text-[11px] text-dim ring-1 ring-rule-strong">{b.shift_reason}</span>}
              </div>
              <ul className="mt-2 space-y-1.5 pl-8 text-[17px] leading-snug">{b.entries.map(entry)}</ul>
            </li>
          ))}
        </ol>
      </article>
    </div>
  )
}
