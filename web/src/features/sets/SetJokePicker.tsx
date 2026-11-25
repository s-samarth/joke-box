/**
 * Add jokes to a beat: the joke picker sheet with the Jokes tab's search and filters, and rows
 * like its list. A cluster is one row under its name and adds its lead (which then follows the
 * lead); "Pick another version" lists its versions, lead crowned, and choosing one pins it. Tick
 * as many as you like: they go in in the order you ticked them. The book button reads a joke
 * whole first. Jokes already in the set, and clusters with a version in it, sit at the bottom.
 * Adding under a premise changes only the set, never a joke's premise in your library.
 */
import { BookOpen, Check, ChevronDown, Crown, Layers } from 'lucide-react'
import { useState } from 'react'
import { useClusters } from '../../api/clusters'
import { useJokes, useTopics } from '../../api/library'
import type { Joke } from '../../api/types'
import { StrengthTicks } from '../../components/ui/pieces'
import { clock } from '../../lib/duration'
import { statusOf, topicName } from '../../lib/jokeMeta'
import { isDiscarded } from '../jokes/discarded'
import { JokeFilters } from '../jokes/JokeFilters'
import { JokeRowBody } from '../jokes/JokeRowBody'
import { inOrder, versionsOf } from '../jokes/cluster/lead'
import { badge, stackRows } from '../jokes/cluster/stacks'
import { linkStyle, PickSheet } from '../pickers/PickSheet'
import { useJokePickFilters, type StartAt } from '../pickers/useJokePickFilters'
import { CLUSTER_ROW as ROW, inSet, inSetLast, resolvePicks } from './setPicks'

interface Props {
  title: string
  description: string
  onClose: () => void
  /** Jokes already in the set. */
  used: Set<string>
  start: StartAt
  memory?: string
  /** The premise they go under, or null for a list with no premise. */
  onAdd: (jokes: Joke[]) => void
  onRead: (joke: Joke) => void
}

export function SetJokePicker({ used, start, memory, onAdd, onRead, ...sheet }: Props) {
  const { data: jokes = [] } = useJokes()
  const { data: clusters = [] } = useClusters()
  const { data: topics = [] } = useTopics()
  const { f, shown, discarded, showDiscarded } = useJokePickFilters(jokes, start, memory)
  const [ticked, setTicked] = useState<string[]>([])
  const [chosen, setChosen] = useState<Map<string, string>>(new Map())
  const [opened, setOpened] = useState<string | null>(null)
  const byId = new Map(jokes.map((j) => [j.id, j]))
  const stacked = stackRows(shown, jokes, { clusters, showDiscarded: showDiscarded || Boolean(f.status) })
  const versions = (clusterId: string) => inOrder(clusters.find((c) => c.id === clusterId), versionsOf(clusterId, jokes)).filter((j) => showDiscarded || !isDiscarded(j))
  const pick = (clusterId: string, lead: Joke) => byId.get(chosen.get(clusterId) ?? '') ?? lead
  const where = (j: Joke) => {
    const topic = topics.find((t) => t.id === j.topic_id)
    const sub = topic?.subtopics.find((s) => s.id === j.subtopic_id && !s.is_system)?.name
    return [f.topic ? null : topicName(topic), sub].filter(Boolean).join(' › ')
  }
  const choose = (clusterId: string, joke: Joke) => {
    setChosen(new Map(chosen).set(clusterId, joke.id))
    if (!ticked.includes(ROW + clusterId)) setTicked([...ticked, ROW + clusterId])
  }
  // One quiet line, dot-separated, so it reads apart from the chips beside it.
  const details = (j: Joke) => (
    <span className="flex min-w-0 flex-wrap items-center gap-x-1.5">
      <StrengthTicks strength={j.strength} />
      {[statusOf(j.status), where(j), j.duration_seconds > 0 ? clock(j.duration_seconds) : ''].filter(Boolean).map((t) => <span key={t} className="tabular before:mr-1.5 before:content-['·']">{t}</span>)}
    </span>
  )
  const read = (j: Joke) => (
    <button type="button" onClick={() => onRead(j)} aria-label={`Read the whole joke: ${j.setup}`} title="Read it whole"
      className="inline-flex size-10 items-center justify-center rounded-lg text-faint hover:bg-ink-3 hover:text-paper"><BookOpen size={17} /></button>
  )

  const rows = stacked.map((row) => {
    const c = row.cluster
    const joke = c ? pick(c.id, c.lead) : row.joke
    const here = inSet(row.joke, used, jokes)
    const note = used.has(joke.id) ? 'In the set' : here ? 'Another version is in the set' : null
    const body = (
      <>
        {c && c.name !== c.lead.setup && <p className="mb-1.5 flex items-center gap-1.5 text-[13px] font-medium text-dim"><Layers size={13} className="shrink-0 text-tape" aria-hidden /><span className="line-clamp-1">{c.name}</span></p>}
        <JokeRowBody joke={joke} punchClass="text-tape/90">
          {c && <span className="flex items-center gap-1 rounded-md bg-tape/15 px-1.5 py-0.5 text-tape"><Layers size={12} aria-hidden />{badge(row)}</span>}
          {note && <span className={`rounded-md bg-ink-3 px-1.5 py-0.5 ${here && !used.has(joke.id) ? 'text-amber' : 'text-paper'}`}>{note}</span>}
          {details(joke)}
        </JokeRowBody>
      </>
    )
    const open = c && opened === c.id
    const below = c && (
      <div className="mx-4 border-t border-rule pt-1 pb-2 pl-8">
        <button type="button" onClick={() => setOpened(open ? null : c.id)} aria-expanded={Boolean(open)} className="inline-flex h-8 items-center gap-1 text-[13px] text-dim hover:text-paper">
          {joke.id === c.lead.id ? 'Adds the lead' : 'Adds this version, pinned'} · {open ? 'Hide versions' : 'Pick another version'}
          <ChevronDown size={14} className={open ? 'rotate-180' : ''} />
        </button>
        {open && (
          <ul role="radiogroup" aria-label="Versions" className="mt-1 space-y-1">
            {versions(c.id).map((v) => (
              <li key={v.id} className="flex items-start">
                <button type="button" role="radio" aria-checked={v.id === joke.id} disabled={used.has(v.id)} onClick={() => choose(c.id, v)}
                  className={`flex min-w-0 flex-1 items-start gap-2.5 rounded-lg px-2 py-2 text-left disabled:opacity-50 ${v.id === joke.id ? 'bg-ink-3' : 'hover:bg-ink-3/60'}`}>
                  <span className={`mt-1 size-3.5 shrink-0 rounded-full border-[1.5px] ${v.id === joke.id ? 'border-tape bg-tape' : 'border-faint'}`} aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="line-clamp-2 text-[15px] leading-snug">{v.setup}</span>
                    <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-faint">
                      {v.id === c.lead.id && <span className="flex items-center gap-1 text-tape"><Crown size={12} aria-hidden />Lead</span>}
                      {used.has(v.id) && <span className="flex items-center gap-1"><Check size={12} aria-hidden />In the set</span>}
                      {details(v)}
                    </span>
                  </span>
                </button>
                <span className="shrink-0 pl-1">{read(v)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    )
    return { id: c ? ROW + c.id : joke.id, body, blocked: used.has(joke.id), blockedIcon: <Check size={18} aria-hidden />, aside: read(joke), below, last: here }
  })
  const ordered = inSetLast(rows, (r) => r.last)
  const status = (
    <>
      {`${rows.length} ${rows.length === 1 ? 'joke' : 'jokes'}`}
      {discarded > 0 && <>{` · ${discarded} discarded ${showDiscarded ? 'shown' : 'hidden'} `}<button type="button" onClick={() => f.set({ discarded: showDiscarded ? null : 'show' })} className={linkStyle}>{showDiscarded ? 'Hide' : 'Show'}</button></>}
      {f.active && <> · <button type="button" onClick={() => f.set({ topic: null, sub: null, premise: null, type: null, status: null, persona: null, generic: null, q: null })} className={linkStyle}>Clear filters</button></>}
    </>
  )
  return (
    <PickSheet {...sheet} filters={<JokeFilters f={f} edge="-mx-5 px-5" />} status={status} rows={ordered} many={['Add', 'joke', 'jokes']}
      ticked={ticked} onTicked={setTicked} onPick={(ids) => onAdd(resolvePicks(ids, chosen, jokes, clusters))} empty="No jokes match. Try another word, or Clear filters." />
  )
}
