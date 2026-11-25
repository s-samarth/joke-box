/**
 * Pick premises, with the Premises tab's own filters (search the take and notes, topic, status,
 * sort) and rows like its list. Filters start on the caller's topic; clear them to pick from any.
 * Discarded premises stay hidden until you Show them or pick a status, as in the tab. Used for
 * the premise a joke rests on (one pick), the premises that came from an observation (many) and
 * the premises in a set's beat.
 */
import { Search, X } from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import { useJokes, useTopics } from '../../api/library'
import { PREMISE_STATUSES, usePremises, type Premise } from '../../api/premises'
import { ChipRow } from '../../components/ui/ChipRow'
import { Input } from '../../components/ui/Field'
import { Dropdown, type MenuItem } from '../../components/ui/Menu'
import { countByPremise } from '../../lib/premises'
import { keepDiscarded } from '../jokes/discarded'
import { MenuButton } from '../jokes/JokeFilters'
import { TopicMenu } from '../observations/ObservationMenus'
import { PremiseRowBody } from '../premises/PremiseListParts'
import { premiseMatches, PREMISE_SORTS, sortPremises, type PremiseSort } from '../premises/premiseSort'
import { linkStyle, PickSheet } from './PickSheet'

interface Props {
  title: string
  description: string
  onClose: () => void
  /** Which premises can be picked at all (not the ones already linked). */
  candidates?: (p: Premise) => boolean
  /** The topic the filters start on. */
  topicId: string | null
  many?: [verb: string, one: string, more: string]
  current?: string | null
  /** A detail worth knowing before picking one (already in this beat). */
  note?: (p: Premise) => string | null
  after?: ReactNode
  onPick: (ids: string[]) => void
}

export function PremisePickSheet({ candidates = () => true, topicId, note = () => null, ...sheet }: Props) {
  const { data: premises = [] } = usePremises()
  const { data: jokes = [] } = useJokes()
  const { data: topics = [] } = useTopics()
  const [q, setQ] = useState('')
  const [topic, setTopic] = useState(topicId)
  const [status, setStatus] = useState<string | null>(null)
  const [sort, setSort] = useState<PremiseSort>('new')
  const [showDiscarded, setShowDiscarded] = useState(false)
  const counts = useMemo(() => countByPremise(jokes), [jokes])
  const pool = premises.filter(candidates)
  const matching = pool.filter((p) => premiseMatches(p, q, topic, status))
  const { kept, discarded } = keepDiscarded(matching, showDiscarded, Boolean(status))
  const shown = sortPremises(kept, sort, (p) => counts.get(p.id) ?? 0, topics.map((t) => t.id))
  const active = Boolean(q.trim() || topic || status)
  const clear = () => { setQ(''); setTopic(null); setStatus(null) }

  const statusItems: MenuItem[] = [
    { label: 'Any status', onSelect: () => setStatus(null), checked: !status },
    ...PREMISE_STATUSES.map((s) => ({ label: s, onSelect: () => setStatus(s), checked: status === s })),
  ]
  const sortItems: MenuItem[] = (Object.keys(PREMISE_SORTS) as PremiseSort[]).map((k) => ({ label: PREMISE_SORTS[k], onSelect: () => setSort(k), checked: sort === k }))
  const filters = (
    <div className="space-y-3">
      <div className="relative">
        <Search size={18} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-faint" />
        <Input type="search" aria-label="Search premises" placeholder="Search takes and notes" className="pl-10" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <ChipRow className="-mx-5 px-5">
        <TopicMenu value={topic} onChange={setTopic} counts={(v) => pool.filter((p) => premiseMatches(p, '', v, status)).length} />
        <Dropdown align="start" items={statusItems} trigger={<span><MenuButton label={status ?? 'Status'} on={Boolean(status)} /></span>} />
        <Dropdown align="start" items={sortItems} trigger={<span><MenuButton label={PREMISE_SORTS[sort]} on={false} /></span>} />
        {active && <button type="button" onClick={clear} className="inline-flex h-9 shrink-0 items-center gap-1 px-2 text-sm text-dim hover:text-paper"><X size={14} /> Clear</button>}
      </ChipRow>
    </div>
  )
  const count = (
    <>
      {`${shown.length} ${shown.length === 1 ? 'premise' : 'premises'}`}
      {discarded > 0 && <>{` · ${discarded} discarded ${showDiscarded ? 'shown' : 'hidden'} `}<button type="button" onClick={() => setShowDiscarded(!showDiscarded)} className={linkStyle}>{showDiscarded ? 'Hide' : 'Show'}</button></>}
      {active && <> · <button type="button" onClick={clear} className={linkStyle}>Clear filters</button></>}
    </>
  )
  const rows = shown.map((p) => ({
    id: p.id,
    body: (
      <span className="flex items-start gap-3">
        <PremiseRowBody premise={p} jokes={counts.get(p.id) ?? 0} topics={topics} showTopic={!topic}>
          {p.id === sheet.current && <span className="text-tape">Current</span>}
          {note(p) && <span className="rounded-md bg-ink-3 px-1.5 py-0.5 text-paper">{note(p)}</span>}
        </PremiseRowBody>
      </span>
    ),
  }))

  return <PickSheet {...sheet} filters={filters} status={count} rows={rows} empty={pool.length ? 'No premises match. Try another word, or Clear filters.' : 'No premises yet.'} />
}
