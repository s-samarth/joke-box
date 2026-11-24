/**
 * Pick observations, with the Observations tab's own filters (search, topic, kind, Not used yet,
 * sort) and rows like its list. Filters start on the caller's topic; clear them to pick from any.
 * Ticks as many as you like: used to link the observations a joke or premise came from.
 */
import { Eye, Search, X } from 'lucide-react'
import { useState } from 'react'
import { useTopics } from '../../api/library'
import { useObservationKinds, useObservations } from '../../api/notebook'
import type { Observation } from '../../api/types'
import { ChipRow } from '../../components/ui/ChipRow'
import { Input } from '../../components/ui/Field'
import { Dropdown, type MenuItem } from '../../components/ui/Menu'
import { StrengthTicks } from '../../components/ui/pieces'
import { matchesWords } from '../../lib/search'
import { formatDate } from '../../lib/time'
import { MenuButton } from '../jokes/JokeFilters'
import { KindMenu, TopicMenu } from '../observations/ObservationMenus'
import { kindLabel, matchesFilters, OBSERVATION_SORTS, PLAIN, sortObservations, topicLabel, type ObservationSort } from '../observations/observationMeta'
import { useUses } from '../observations/useUsed'
import { linkStyle, PickSheet } from './PickSheet'

const chip = (on: boolean) => `inline-flex h-9 shrink-0 items-center rounded-lg px-3 text-sm transition ${on ? 'bg-paper font-medium text-ink' : 'bg-ink-3 text-dim hover:text-paper'}`

interface Props {
  description: string
  onClose: () => void
  /** Already linked: left out. */
  linkedIds: string[]
  /** The topic the filters start on. */
  topicId: string | null
  onPick: (ids: string[]) => void
}

export function ObservationPickSheet({ linkedIds, topicId, ...sheet }: Props) {
  const { data: observations = [] } = useObservations()
  const { data: topics = [] } = useTopics()
  const { data: kinds = [] } = useObservationKinds()
  const uses = useUses()
  const [q, setQ] = useState('')
  const [topic, setTopic] = useState(topicId)
  const [kind, setKind] = useState<string | null>(null)
  const [unused, setUnused] = useState(false)
  const [sort, setSort] = useState<ObservationSort>('new')
  const pool = sortObservations(observations.filter((o) => !linkedIds.includes(o.id)), sort)
  const open = (o: Observation) => !(unused && uses.used(o))
  const shown = pool.filter((o) => matchesFilters(o, topic, kind) && open(o) && matchesWords(q, [o.text]))
  const active = Boolean(topic || kind || unused || q.trim())
  const clear = () => { setQ(''); setTopic(null); setKind(null); setUnused(false) }
  const about = (o: Observation) => [topic ? null : topicLabel(topics, o.topic_id), o.kind_id && kindLabel(kinds, o.kind_id)].filter((x) => x && x !== PLAIN).join(' · ')
  const sortItems: MenuItem[] = (Object.keys(OBSERVATION_SORTS) as ObservationSort[]).map((k) => ({ label: OBSERVATION_SORTS[k], onSelect: () => setSort(k), checked: sort === k }))

  const filters = (
    <div className="space-y-3">
      <div className="relative">
        <Search size={18} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-faint" />
        <Input type="search" aria-label="Search observations" placeholder="Search observations" className="pl-10" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <ChipRow className="-mx-5 px-5">
        <TopicMenu value={topic} onChange={setTopic} counts={(v) => pool.filter((o) => matchesFilters(o, v, kind) && open(o)).length} />
        <KindMenu value={kind} onChange={setKind} counts={(v) => pool.filter((o) => matchesFilters(o, topic, v) && open(o)).length} />
        <button type="button" aria-pressed={unused} onClick={() => setUnused(!unused)} className={chip(unused)}>Not used yet</button>
        <Dropdown align="start" items={sortItems} trigger={<span><MenuButton label={OBSERVATION_SORTS[sort]} on={false} /></span>} />
        {active && <button type="button" onClick={clear} className="inline-flex h-9 shrink-0 items-center gap-1 px-2 text-sm text-dim hover:text-paper"><X size={14} /> Clear</button>}
      </ChipRow>
    </div>
  )
  const status = (
    <>
      {`${shown.length} ${shown.length === 1 ? 'observation' : 'observations'}`}
      {active && <> · <button type="button" onClick={clear} className={linkStyle}>Clear filters</button></>}
    </>
  )
  const rows = shown.map((o) => ({
    id: o.id,
    body: (
      <span className="flex items-start gap-3">
        <Eye size={16} className={`mt-1 shrink-0 ${uses.used(o) ? 'text-tape' : 'text-faint'}`} aria-hidden />
        <span className="min-w-0 flex-1 leading-snug">
          <span className="line-clamp-3">{o.text}</span>
          <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-faint">
            <span>{[about(o), uses.label(o), formatDate(o.created_at)].filter(Boolean).join(' · ')}</span>
            <StrengthTicks strength={o.strength} />
          </span>
        </span>
      </span>
    ),
  }))

  return <PickSheet title="Link observations" {...sheet} filters={filters} status={status} rows={rows} many={['Link', 'observation', 'observations']}
    empty={pool.length ? 'No observations match. Try another word, or Clear filters.' : 'No observations left to link.'} />
}
