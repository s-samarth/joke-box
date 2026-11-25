/**
 * The cue card: what you memorise (docs/sets.md). The point, then each beat's cue and time in
 * order, with its premises, jokes with no premise and crowd work under it. Gates are marked.
 * Big enough to read off a phone or a printed page.
 */
import { ArrowLeft, Printer } from 'lucide-react'
import { Link, useParams } from 'react-router'
import { useJokes } from '../../api/library'
import { usePremises } from '../../api/premises'
import { useSetlists } from '../../api/shows'
import type { SetEntry } from '../../api/types'
import { clock } from '../../lib/duration'
import { beatTotal, beatsOf } from './beats'
import { starts } from './stageWalk'

const clip = (text: string, n: number) => (text.length > n ? `${text.slice(0, n - 1)}…` : text)

export function PrintView() {
  const { setId } = useParams()
  const { data: sets = [] } = useSetlists()
  const { data: jokes = [] } = useJokes()
  const { data: premiseList = [] } = usePremises()
  const setlist = sets.find((s) => s.id === setId)
  if (!setlist) return <div className="p-8 text-dim">Set not found.</div>
  const beats = beatsOf(setlist)
  const at = starts(beats)
  const byId = new Map(jokes.map((j) => [j.id, j]))
  const premises = new Map(premiseList.map((p) => [p.id, p]))
  const line = (e: SetEntry) => {
    if (e.kind === 'crowd') return <span className="italic">Crowd work{e.title ? `: ${e.title}` : ''}</span>
    if (e.kind === 'premise') return <span>{clip((e.premise_id && premises.get(e.premise_id)?.take) || 'Premise', 70)}{e.gate && <b className="ml-1.5 text-sm">(gate)</b>}</span>
    const punch = e.pieces.map((p) => byId.get(p.joke_id)).map((j) => clip(j?.punchline || j?.setup || '', 40)).filter(Boolean)
    return <span className="text-black/60">+ {punch.join(' · ') || 'jokes'}</span>
  }

  return (
    <div className="min-h-dvh bg-white text-black">
      <div className="flex items-center justify-between border-b border-black/10 px-6 py-3 print:hidden">
        <Link to={`/sets/${setlist.id}`} className="inline-flex items-center gap-1.5"><ArrowLeft size={16} /> Back to the set</Link>
        <button type="button" onClick={() => window.print()} className="inline-flex h-10 items-center gap-2 rounded-lg bg-black px-4 font-semibold text-white"><Printer size={16} /> Print</button>
      </div>
      <article className="mx-auto max-w-2xl px-6 py-10 sm:px-8">
        <h1 className="headline text-5xl sm:text-6xl">{setlist.name}</h1>
        <p className="mt-2 text-lg">{clock(beatTotal(beats))} of beats · {clock(setlist.target_seconds)} slot</p>
        {setlist.point && <p className="mt-4 border-l-4 border-black pl-3 text-xl leading-snug">{setlist.point}</p>}
        <ol className="mt-8 space-y-6 border-t-2 border-black pt-6">
          {beats.length === 0 && <li className="text-lg text-black/60">No beats yet.</li>}
          {beats.map((b, i) => (
            <li key={b.id} className="break-inside-avoid">
              <div className="flex items-baseline gap-3">
                <span className="text-xl font-bold tabular">{i + 1}</span>
                <span className="font-marker text-3xl">{b.cue || `Beat ${i + 1}`}</span>
                <span className="ml-auto text-lg tabular">{clock(b.seconds)}<span className="ml-2 text-sm text-black/50">from {clock(at[i])}</span></span>
              </div>
              <ul className="mt-1.5 space-y-0.5 pl-8 text-lg leading-snug">
                {b.entries.map((e) => <li key={e.id}>{line(e)}</li>)}
              </ul>
            </li>
          ))}
        </ol>
      </article>
    </div>
  )
}
