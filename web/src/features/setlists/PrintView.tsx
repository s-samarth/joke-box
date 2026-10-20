/** A printable set: bit titles in order with running time, large and high-contrast. */
import { ArrowLeft, Printer } from 'lucide-react'
import { Link, useParams } from 'react-router'
import { useBits } from '../../api/library'
import { useSetlists } from '../../api/shows'
import { clock } from '../../lib/duration'
import { formatDate } from '../../lib/time'

export function PrintView() {
  const { setlistId } = useParams()
  const { data: setlists = [] } = useSetlists()
  const { data: bits = [] } = useBits()
  const setlist = setlists.find((s) => s.id === setlistId)
  if (!setlist) return <div className="p-8 text-muted">Setlist not found.</div>

  // Running time at the end of each bit.
  const ends = setlist.items.map((_, i) => setlist.items.slice(0, i + 1).reduce((sum, it) => sum + it.duration_seconds, 0))
  return (
    <div className="min-h-dvh bg-white text-black">
      <div className="flex items-center justify-between border-b border-black/10 px-6 py-3 print:hidden">
        <Link to={`/setlist/${setlist.id}`} className="inline-flex items-center gap-1.5 text-sm"><ArrowLeft size={16} /> Back</Link>
        <button type="button" onClick={() => window.print()} className="inline-flex h-10 items-center gap-2 rounded-xl bg-black px-4 text-sm font-semibold text-white"><Printer size={16} /> Print</button>
      </div>
      <article className="mx-auto max-w-2xl px-8 py-10">
        <header className="mb-8 border-b-2 border-black pb-4">
          <h1 className="font-display text-4xl font-bold">{setlist.name}</h1>
          <p className="mt-2 text-lg">
            {[setlist.show_date && formatDate(setlist.show_date), setlist.venue_name, `Target ${clock(setlist.target_seconds)}`].filter(Boolean).join(' · ')}
          </p>
        </header>
        <ol className="space-y-5">
          {setlist.items.map((item, i) => {
            const bit = bits.find((b) => b.id === item.bit_id)
            return (
              <li key={item.bit_id} className="flex gap-4 break-inside-avoid">
                <span className="w-8 shrink-0 text-2xl font-bold">{i + 1}.</span>
                <div className="flex-1">
                  <p className="text-2xl leading-snug font-semibold">{bit?.setup ?? 'Deleted bit'}</p>
                  {bit?.punchline && <p className="mt-1 text-lg leading-snug">{bit.punchline}</p>}
                </div>
                <span className="shrink-0 text-right text-lg tabular">{clock(item.duration_seconds)}<br /><span className="text-sm text-black/50">@{clock(ends[i])}</span></span>
              </li>
            )
          })}
        </ol>
      </article>
    </div>
  )
}
