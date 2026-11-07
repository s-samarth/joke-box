/**
 * Every observation, filtered by topic and kind and searched by words. All three live in the URL
 * (?topic=, ?kind=, ?q=), so the back button and a shared link land on the same view; new
 * observations go under the topic and kind you're looking at. While some aren't under a topic
 * yet, Sort goes through them one at a time.
 */
import { Inbox, Search } from 'lucide-react'
import { useState } from 'react'
import { useSearchParams } from 'react-router'
import { useObservations } from '../../api/notebook'
import type { Observation } from '../../api/types'
import { Button } from '../../components/ui/Button'
import { ChipRow } from '../../components/ui/ChipRow'
import { Input } from '../../components/ui/Field'
import { OrderToggle } from '../../components/time/MonthSection'
import { EmptyState, PageHead, Spinner } from '../../components/ui/pieces'
import type { Order } from '../../lib/months'
import { matchesWords } from '../../lib/search'
import { KindManager } from './KindManager'
import { ObservationBox } from './ObservationBox'
import { ObservationList } from './ObservationList'
import { KindMenu, TopicMenu } from './ObservationMenus'
import { ObservationSorter } from './ObservationSorter'
import { matchesFilters, NOT_SORTED, PLAIN_KIND } from './observationMeta'

const newest = (a: Observation, b: Observation) => b.created_at.localeCompare(a.created_at)

export function ObservationsPage() {
  const { data: observations, isPending } = useObservations()
  const [params, setParams] = useSearchParams()
  const [managing, setManaging] = useState(false)
  const [sorting, setSorting] = useState<string[] | null>(null)
  const topic = params.get('topic')
  const kind = params.get('kind')
  const order: Order = params.get('order') === 'old' ? 'old' : 'new'
  const all = observations ?? []
  const query = params.get('q') ?? ''
  const filtered = all.filter((o) => matchesFilters(o, topic, kind))
  const shown = filtered.filter((o) => matchesWords(query, [o.text]))
  const unsorted = all.filter((o) => o.topic_id === null)
  // Each menu counts within the other's choice, so the numbers match what picking would show.
  const topicCount = (value: string | null) => all.filter((o) => matchesFilters(o, value, kind)).length
  const kindCount = (value: string | null) => all.filter((o) => matchesFilters(o, topic, value)).length
  // Each control changes only its own part of the URL, keeping the others.
  const setParam = (name: string, value: string | null) => setParams((p) => { if (value) p.set(name, value); else p.delete(name); return p }, { replace: true })
  const filedUnder = (value: string | null, none: string) => (value && value !== none ? value : null)

  return (
    <div className="mx-auto max-w-2xl">
      <PageHead title="Observations">
        {unsorted.length > 0 && (
          <Button variant="quiet" small icon={<Inbox size={16} />} aria-label={`Sort ${unsorted.length} into topics`} onClick={() => setSorting([...unsorted].sort(newest).map((o) => o.id))}>
            Sort {unsorted.length}
          </Button>
        )}
      </PageHead>
      <p className="-mt-2 mb-5 text-dim">Things you noticed that aren't jokes yet, by topic. Write a premise or a joke when the angle shows up.</p>

      <ObservationBox key={`${topic}-${kind}`} initialTopicId={filedUnder(topic, NOT_SORTED)} initialKindId={filedUnder(kind, PLAIN_KIND)} />

      {all.length > 0 && (
        <div className="mt-8 space-y-3">
          <div className="relative">
            <Search size={18} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-faint" />
            <Input type="search" aria-label="Search observations" placeholder="Search observations" className="pl-10" value={query} onChange={(e) => setParam('q', e.target.value)} />
          </div>
          <ChipRow className="-mx-4 px-4 sm:mx-0 sm:px-0">
            <TopicMenu value={topic} onChange={(v) => setParam('topic', v)} counts={topicCount} />
            <KindMenu value={kind} onChange={(v) => setParam('kind', v)} counts={kindCount} onManage={() => setManaging(true)} />
          </ChipRow>
        </div>
      )}

      {isPending && !observations ? (
        <div className="py-10"><Spinner /></div>
      ) : shown.length === 0 ? (
        <EmptyState title={query.trim() && filtered.length ? 'Nothing matches' : all.length ? 'Nothing here yet' : 'No observations yet'}>
          {query.trim() && filtered.length ? 'Try fewer words.' : all.length ? 'Log one above and it lands here.' : 'The next weird thing you see, log it above before it fades.'}
        </EmptyState>
      ) : (
        <>
          <div className="mt-3 mb-1 flex justify-end"><OrderToggle order={order} onChange={(o) => setParam('order', o === 'old' ? 'old' : null)} /></div>
          <ObservationList observations={shown} order={order} />
        </>
      )}
      {managing && <KindManager onClose={() => setManaging(false)} />}
      {sorting && <ObservationSorter ids={sorting} onClose={() => setSorting(null)} />}
    </div>
  )
}
