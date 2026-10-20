/** Study, from Today: the watchlist, your analyses and your external links. On a phone this is the way in. */
import { ExternalLink, ListChecks, NotebookPen } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { useAnalyses, useWatchlist } from '../../api/study'
import { SectionHead } from '../../components/ui/bits'

function Tile({ to, icon, title, detail }: { to: string; icon: ReactNode; title: string; detail: string }) {
  return (
    <Link to={to} className="flex flex-col gap-1 rounded-xl bg-ink-2 p-3.5 ring-1 ring-rule transition-colors hover:bg-ink-3">
      <span className="text-tape">{icon}</span>
      <span className="font-medium leading-tight">{title}</span>
      <span className="text-sm text-faint tabular">{detail}</span>
    </Link>
  )
}

export function TodayStudy() {
  const { data: items = [] } = useWatchlist()
  const { data: analyses = [] } = useAnalyses()
  const watched = items.filter((i) => i.watched).length
  return (
    <section className="mt-12">
      <SectionHead title="Study" />
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <Tile to="/watchlist" icon={<ListChecks size={18} />} title="Watchlist" detail={items.length ? `${watched}/${items.length} watched` : 'Set it up'} />
        <Tile to="/analysis" icon={<NotebookPen size={18} />} title="Analysis" detail={analyses.length === 1 ? '1 written' : `${analyses.length} written`} />
        <Tile to="/links" icon={<ExternalLink size={18} />} title="External links" detail="2 sites" />
      </div>
    </section>
  )
}
