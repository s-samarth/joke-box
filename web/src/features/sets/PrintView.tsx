/** A set on paper: big, numbered, with each bit's runtime and where you should be by then. */
import { ArrowLeft, Printer } from 'lucide-react'
import { Link, useParams } from 'react-router'
import { useBits } from '../../api/library'
import { useSetlists } from '../../api/shows'
import { clock } from '../../lib/duration'
import { formatDate } from '../../lib/time'

export function PrintView() {
  const { setId } = useParams()
  const { data: sets = [] } = useSetlists()
  const { data: bits = [] } = useBits()
  const setlist = sets.find((s) => s.id === setId)
  if (!setlist) return <div className="p-8 text-dim">Set not found.</div>
  const ends = setlist.items.map((_, i) => setlist.items.slice(0, i + 1).reduce((sum, it) => sum + it.duration_seconds, 0))
  const details = [setlist.show_date && formatDate(setlist.show_date), setlist.venue_name, `${clock(setlist.target_seconds)} slot`].filter(Boolean)

  return (
    <div className="min-h-dvh bg-white text-black">
      <div className="flex items-center justify-between border-b border-black/10 px-6 py-3 print:hidden">
        <Link to={`/sets/${setlist.id}`} className="inline-flex items-center gap-1.5"><ArrowLeft size={16} /> Back to the set</Link>
        <button type="button" onClick={() => window.print()} className="inline-flex h-10 items-center gap-2 rounded-lg bg-black px-4 font-semibold text-white"><Printer size={16} /> Print</button>
      </div>
      <article className="mx-auto max-w-2xl px-8 py-10">
        <h1 className="headline text-6xl">{setlist.name}</h1>
        <p className="mt-2 border-b-2 border-black pb-4 text-lg">{details.join(', ')}</p>
        <ol className="mt-6 space-y-5">
          {setlist.items.map((item, i) => {
            const bit = bits.find((b) => b.id === item.bit_id)
            return (
              <li key={item.bit_id} className="grid grid-cols-[2rem_1fr_auto] gap-4 break-inside-avoid">
                <span className="text-2xl font-bold tabular">{i + 1}</span>
                <div>
                  <p className="font-marker text-2xl leading-snug">{bit?.setup ?? 'Deleted joke'}</p>
                  {bit?.punchline && <p className="mt-1 text-lg leading-snug">{bit.punchline}</p>}
                </div>
                <span className="text-right text-lg tabular">{clock(item.duration_seconds)}<span className="block text-sm text-black/50">by {clock(ends[i])}</span></span>
              </li>
            )
          })}
        </ol>
      </article>
    </div>
  )
}
