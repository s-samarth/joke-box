/** Analysis: every set and online joke you've written up, newest edits first. */
import { Plus, Search } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { useAnalyses } from '../../api/study'
import { EmptyState, PageHead, Spinner } from '../../components/ui/pieces'
import { Input } from '../../components/ui/Field'
import { formatDate } from '../../lib/time'

/** "https://www.youtube.com/watch?v=…" -> "youtube.com" */
function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return ''
  }
}

const newButton = (
  <Link to="/analysis/new" className="inline-flex h-9 items-center gap-2 rounded-lg bg-tape px-3 text-sm font-semibold text-tape-ink hover:bg-[#f5da77]">
    <Plus size={16} /> New analysis
  </Link>
)

export function AnalysisPage() {
  const { data: analyses = [], isPending } = useAnalyses()
  const [query, setQuery] = useState('')
  const words = query.toLowerCase().split(/\s+/).filter(Boolean)
  const shown = analyses.filter((a) => words.every((w) => `${a.title} ${a.body}`.toLowerCase().includes(w)))

  if (isPending) return <div className="py-16"><Spinner /></div>

  return (
    <div className="mx-auto max-w-2xl">
      <PageHead title="Analysis">{analyses.length > 0 && newButton}</PageHead>
      {analyses.length === 0 ? (
        <EmptyState title="No analyses yet" action={newButton}>
          Watched a set or a joke online? Write down how it works: the premise, the turns, the tags, what you'd take from it. Start one from any routine on your watchlist too.
        </EmptyState>
      ) : (
        <>
          <div className="relative">
            <Search size={18} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-faint" />
            <Input type="search" aria-label="Search analyses" placeholder="Search names and notes" className="pl-10" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          {shown.length === 0 && <p className="mt-6 text-dim">No analyses match “{query}”.</p>}
          <ul className="mt-4 divide-y divide-rule border-y border-rule">
            {shown.map((a) => (
              <li key={a.id}>
                <Link to={`/analysis/${a.id}`} className="block py-3.5 hover:bg-ink-2/60">
                  <p className="font-medium">{a.title}</p>
                  {a.body && <p className="mt-0.5 line-clamp-2 text-sm text-dim">{a.body}</p>}
                  <p className="mt-1 text-sm text-faint">
                    {formatDate(a.updated_at)}{a.url && hostOf(a.url) && <span>, {hostOf(a.url)}</span>}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
