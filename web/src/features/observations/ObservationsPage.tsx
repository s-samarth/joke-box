/**
 * Every observation, filtered by topic and searched by words. Both live in the URL (?topic=,
 * ?q=), so the back button and a shared link land on the same view; new observations go under
 * that topic.
 */
import { Search, Settings2 } from 'lucide-react'
import { useState } from 'react'
import { useSearchParams } from 'react-router'
import { useObservations, useObservationTopics } from '../../api/notebook'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Field'
import { OrderToggle } from '../../components/time/MonthSection'
import { EmptyState, PageHead, Spinner } from '../../components/ui/pieces'
import type { Order } from '../../lib/months'
import { matchesWords } from '../../lib/search'
import { ObservationBox } from './ObservationBox'
import { ObservationList } from './ObservationList'
import { ObservationTopicManager } from './ObservationTopicManager'

const NONE = 'none'
const tab = (on: boolean) =>
  `inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-3 text-[15px] transition ${on ? 'bg-ink-3 text-paper' : 'text-dim hover:text-paper'}`

export function ObservationsPage() {
  const { data: observations, isPending } = useObservations()
  const { data: topics = [] } = useObservationTopics()
  const [params, setParams] = useSearchParams()
  const [managing, setManaging] = useState(false)
  const filter = params.get('topic')
  const order: Order = params.get('order') === 'old' ? 'old' : 'new'
  const all = observations ?? []
  const query = params.get('q') ?? ''
  const underTopic = filter === null ? all : all.filter((o) => (filter === NONE ? o.topic_id === null : o.topic_id === filter))
  const shown = underTopic.filter((o) => matchesWords(query, [o.text]))
  const count = (id: string | null) => all.filter((o) => o.topic_id === id).length
  // Each control changes only its own part of the URL (?topic=, ?order=), keeping the other.
  const setParam = (name: string, value: string | null) => setParams((p) => { if (value) p.set(name, value); else p.delete(name); return p }, { replace: true })
  const setFilter = (value: string | null) => setParam('topic', value)

  return (
    <div className="mx-auto max-w-2xl">
      <PageHead title="Observations">
        <Button variant="quiet" small icon={<Settings2 size={16} />} onClick={() => setManaging(true)}>Topics</Button>
      </PageHead>
      <p className="-mt-2 mb-5 text-dim">Things you noticed that aren't jokes yet. Turn one into a joke when the angle shows up.</p>

      <ObservationBox key={filter ?? 'all'} initialTopicId={filter && filter !== NONE ? filter : null} />

      {all.length > 0 && (
        <div className="relative mt-8">
          <Search size={18} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-faint" />
          <Input type="search" aria-label="Search observations" placeholder="Search observations" className="pl-10" value={query} onChange={(e) => setParam('q', e.target.value)} />
        </div>
      )}

      <nav aria-label="Filter by topic" className="no-scrollbar mt-4 mb-3 flex gap-1 overflow-x-auto">
        <button type="button" aria-pressed={filter === null} onClick={() => setFilter(null)} className={tab(filter === null)}>All <span className="text-faint tabular">{all.length}</span></button>
        {topics.map((t) => (
          <button key={t.id} type="button" aria-pressed={filter === t.id} onClick={() => setFilter(t.id)} className={tab(filter === t.id)}>
            {t.name} <span className="text-faint tabular">{count(t.id)}</span>
          </button>
        ))}
        {count(null) > 0 && topics.length > 0 && (
          <button type="button" aria-pressed={filter === NONE} onClick={() => setFilter(NONE)} className={tab(filter === NONE)}>No topic <span className="text-faint tabular">{count(null)}</span></button>
        )}
      </nav>

      {isPending && !observations ? (
        <div className="py-10"><Spinner /></div>
      ) : shown.length === 0 ? (
        <EmptyState title={query.trim() && underTopic.length ? 'Nothing matches' : all.length ? 'Nothing under this topic' : 'No observations yet'}>
          {query.trim() && underTopic.length ? 'Try fewer words.' : all.length ? 'Log one above and it lands here.' : 'The next weird thing you see, log it above before it fades.'}
        </EmptyState>
      ) : (
        <>
          <div className="mb-1 flex justify-end"><OrderToggle order={order} onChange={(o) => setParam('order', o === 'old' ? 'old' : null)} /></div>
          <ObservationList observations={shown} order={order} />
        </>
      )}
      {managing && <ObservationTopicManager onClose={() => setManaging(false)} />}
    </div>
  )
}
