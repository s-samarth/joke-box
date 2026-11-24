/**
 * Put jokes you've already written into a cluster. The lead stays pinned at the top to compare
 * against; the joke picker's filters (the Jokes list's) start on the lead's topic and subtopic,
 * where the versions usually are, and a tap ticks one. A joke is a version in one cluster at
 * most: one already in another is greyed out at the bottom, naming that cluster, and has to be
 * taken out of it first. Rendered only while open, so every opening starts fresh.
 */
import { Crown, Layers } from 'lucide-react'
import { useState } from 'react'
import { useClusters } from '../../../api/clusters'
import { useJokes, useSaveJoke } from '../../../api/library'
import type { Joke } from '../../../api/types'
import { JokePickSheet } from '../../pickers/JokePickSheet'
import { toInput } from '../useAutosaveJoke'
import { clusterName, versionsOf } from './lead'

interface Props {
  clusterId: string
  /** Its lead: pinned at the top, and the topic and subtopic the filters start on. */
  lead?: Joke
  onClose: () => void
}

export function AddVersionsDialog({ clusterId, lead, onClose }: Props) {
  const { data: jokes = [] } = useJokes()
  const { data: clusters = [] } = useClusters()
  const save = useSaveJoke()
  const [candidates] = useState(() => jokes.filter((j) => j.cluster_id !== clusterId))
  const otherCluster = (id: string) => clusterName(clusters.find((c) => c.id === id), versionsOf(id, jokes))
  const add = (ids: string[]) => {
    for (const j of jokes) if (ids.includes(j.id)) save.mutate({ id: j.id, input: { ...toInput(j), cluster_id: clusterId } })
  }

  return (
    <JokePickSheet title="Add versions" description="Jokes you've written that say the same joke another way. Tap to pick." onClose={onClose}
      candidates={candidates} start={{ topic: lead?.topic_id ?? null, sub: lead?.subtopic_id }} many={['Add', 'version', 'versions']} onPick={add}
      blockedBy={(j) => (j.cluster_id ? `In “${otherCluster(j.cluster_id)}” · take it out there first` : null)} blockedIcon={<Layers size={18} aria-hidden />}
      pinned={lead && (
        <div className="mb-4 rounded-xl bg-ink-3 px-4 py-3">
          <p className="mb-1 flex items-center gap-1.5 text-[13px] text-faint"><Crown size={13} aria-hidden />The lead, to compare against</p>
          <p className="line-clamp-3 leading-snug">{lead.setup}</p>
          {lead.punchline && <p className="mt-1 line-clamp-2 text-[15px] text-tape">{lead.punchline}</p>}
        </div>
      )} />
  )
}
