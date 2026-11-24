/**
 * Put jokes you've already written into a cluster. The lead stays pinned at the top to compare
 * against; the same filters as the Jokes list start on the lead's topic and subtopic, where the
 * versions usually are; rows look like the list's, and a tap ticks one. A joke in another cluster
 * says so, and moves here. Rendered only while open, so every opening starts fresh.
 */
import { Check, Crown, Layers } from 'lucide-react'
import { useState } from 'react'
import { useClusters } from '../../../api/clusters'
import { useJokes, useSaveJoke, useTopics } from '../../../api/library'
import type { Joke } from '../../../api/types'
import { Button } from '../../../components/ui/Button'
import { Modal } from '../../../components/ui/Modal'
import { StrengthTicks } from '../../../components/ui/pieces'
import { clock } from '../../../lib/duration'
import { statusOf } from '../../../lib/jokeMeta'
import { JokeFilters } from '../JokeFilters'
import { JokeRowBody } from '../JokeRowBody'
import { toInput } from '../useAutosaveJoke'
import { clusterName, versionsOf } from './lead'
import { usePickerFilters } from './usePickerFilters'

const link = '-my-2 px-1 py-2 font-medium text-dim underline-offset-4 hover:text-paper hover:underline'

interface Props {
  clusterId: string
  /** Its lead: pinned at the top, and the topic and subtopic the filters start on. */
  lead?: Joke
  onClose: () => void
}

export function AddVersionsDialog({ clusterId, lead, onClose }: Props) {
  const { data: jokes = [] } = useJokes()
  const { data: topics = [] } = useTopics()
  const { data: clusters = [] } = useClusters()
  const save = useSaveJoke()
  const [candidates] = useState(() => jokes.filter((j) => j.cluster_id !== clusterId))
  const { f, shown, discarded, showDiscarded } = usePickerFilters(candidates, lead)
  const [ticked, setTicked] = useState<Set<string>>(new Set())
  const subOf = (j: Joke) => topics.find((t) => t.id === j.topic_id)?.subtopics.find((s) => s.id === j.subtopic_id)?.name
  const otherCluster = (id: string) => clusterName(clusters.find((c) => c.id === id), versionsOf(id, jokes))

  const toggle = (id: string) => setTicked((t) => {
    const next = new Set(t)
    if (!next.delete(id)) next.add(id)
    return next
  })
  const add = () => {
    for (const j of jokes) if (ticked.has(j.id)) save.mutate({ id: j.id, input: { ...toInput(j), cluster_id: clusterId } })
    onClose()
  }
  const n = ticked.size

  return (
    <Modal open onOpenChange={(o) => !o && onClose()} title="Add versions" description="Jokes you've written that say the same joke another way. Tap to pick." wide
      footer={
        <div className="flex flex-1 items-center justify-between gap-3">
          <span className="text-sm text-dim">{n ? <>{n} picked · <button type="button" onClick={() => setTicked(new Set())} className={link}>Clear</button></> : 'None picked yet'}</span>
          <Button variant="tape" disabled={!n} onClick={add}>{n ? `Add ${n} ${n === 1 ? 'version' : 'versions'}` : 'Add versions'}</Button>
        </div>
      }>
      {lead && (
        <div className="mb-4 rounded-xl bg-ink-3 px-4 py-3">
          <p className="mb-1 flex items-center gap-1.5 text-[13px] text-faint"><Crown size={13} aria-hidden />The lead, to compare against</p>
          <p className="line-clamp-3 leading-snug">{lead.setup}</p>
          {lead.punchline && <p className="mt-1 line-clamp-2 text-[15px] text-tape">{lead.punchline}</p>}
        </div>
      )}
      <JokeFilters f={f} edge="-mx-5 px-5" />
      <p className="mt-3 text-sm text-faint">
        {`${shown.length} ${shown.length === 1 ? 'joke' : 'jokes'}`}
        {discarded > 0 && <>{` · ${discarded} discarded ${showDiscarded ? 'shown' : 'hidden'} `}<button type="button" onClick={() => f.set({ discarded: showDiscarded ? null : 'show' })} className={link}>{showDiscarded ? 'Hide' : 'Show'}</button></>}
        {f.active && <> · <button type="button" onClick={() => f.set({ topic: null, sub: null, premise: null, type: null, status: null, q: null })} className={link}>Clear filters</button></>}
      </p>
      <ul className="-mx-5 mt-2 border-t border-rule">
        {shown.length === 0 && <li className="px-5 py-6 text-dim">No jokes match. Try another word, or Clear filters.</li>}
        {shown.map((j) => {
          const on = ticked.has(j.id)
          return (
            <li key={j.id} className="border-b border-rule">
              <button type="button" role="checkbox" aria-checked={on} onClick={() => toggle(j.id)}
                className={`flex w-full items-start gap-3 border-l-[3px] py-3.5 pr-5 pl-[17px] text-left transition-colors ${on ? 'border-tape bg-tape/10' : 'border-transparent hover:bg-ink-3/60'}`}>
                <span className={`mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full border-[1.5px] ${on ? 'border-tape bg-tape text-tape-ink' : 'border-faint'}`}>
                  {on && <Check size={13} strokeWidth={3} aria-hidden />}
                </span>
                <span className="block min-w-0 flex-1">
                  <JokeRowBody joke={j} punchClass="text-tape/90">
                    {j.cluster_id && <span className="flex items-center gap-1 rounded-md bg-ink-3 px-1.5 py-0.5"><Layers size={12} aria-hidden />In “{otherCluster(j.cluster_id)}” · moves here</span>}
                    <StrengthTicks strength={j.strength} />
                    <span>{statusOf(j.status)}</span>
                    {subOf(j) && <span className="truncate">{subOf(j)}</span>}
                    {j.duration_seconds > 0 && <span className="tabular">{clock(j.duration_seconds)}</span>}
                  </JokeRowBody>
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </Modal>
  )
}
