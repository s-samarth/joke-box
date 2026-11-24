/**
 * A cluster, opened beside the Jokes list (/jokes/c/:clusterId): its versions as boxes side by side
 * to compare, the lead first, each editable in place (VersionCard). Below them, write a new version
 * or add jokes you've written. Discarded versions hide behind Show, like in the list. On a phone the
 * boxes stack and the page has its own way back.
 */
import { ArrowLeft, ListChecks, Plus } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'
import { useClusters } from '../../../api/clusters'
import { useJokes, useTopics } from '../../../api/library'
import { Button } from '../../../components/ui/Button'
import { EmptyState, Spinner } from '../../../components/ui/pieces'
import { topicName } from '../../../lib/jokeMeta'
import { useCapture } from '../../capture/captureContext'
import { isDiscarded } from '../discarded'
import { AddVersionsDialog } from './AddVersionsDialog'
import { ClusterHeader } from './ClusterHeader'
import { inOrder, versionCount, versionsOf } from './lead'
import { useClusterActions } from './useClusterActions'
import { VersionCard } from './VersionCard'

export function ClusterPage() {
  const { clusterId = '' } = useParams()
  const [params] = useSearchParams()
  const { data: jokes, isPending } = useJokes()
  const { data: clusters = [] } = useClusters()
  const { data: topics = [] } = useTopics()
  const { openCapture } = useCapture()
  const [adding, setAdding] = useState(false)
  const [showDiscarded, setShowDiscarded] = useState(false)
  const query = params.toString() ? `?${params}` : ''
  const back = `/jokes${query}`
  const cluster = clusters.find((c) => c.id === clusterId)
  const versions = versionsOf(clusterId, jokes ?? [])
  const actions = useClusterActions(clusterId, cluster, versions, back)
  const { lead } = actions

  if (isPending && !jokes) return <div className="py-16"><Spinner /></div>
  if (!versions.length) {
    return <EmptyState title="Cluster not found" action={<Link to={back} className="text-tape">Back to jokes</Link>}>It may have been dissolved, or its jokes are in the Trash.</EmptyState>
  }

  const topic = topics.find((t) => t.id === lead?.topic_id)
  const sub = topic?.subtopics.find((s) => s.id === lead?.subtopic_id)
  const discarded = versions.filter(isDiscarded).length
  const shown = inOrder(cluster, versions).filter((v) => showDiscarded || !isDiscarded(v) || v === lead)
  // Filed like the lead, on its premise and from its observations. Its place in a chain starts blank.
  const writeVersion = () => openCapture({ topicId: lead?.topic_id, subtopicId: lead?.subtopic_id, premiseId: lead?.premise_id, observationIds: actions.cameFrom(lead), clusterId })

  return (
    <article className="pb-10">
      <Link to={back} className="inline-flex h-12 items-center gap-1.5 text-dim hover:text-paper lg:hidden"><ArrowLeft size={18} /> Jokes</Link>
      <div className="pt-2 lg:pt-10">
        <ClusterHeader key={`${clusterId}:${Boolean(cluster)}`} clusterId={clusterId} cluster={cluster} standIn={lead?.setup ?? ''}
          filed={[topicName(topic), sub?.name].filter(Boolean).join(' · ') + ` · ${versionCount(versions.length - discarded)}`} onDissolve={() => void actions.dissolve()} />
      </div>
      <div className="@container mt-6">
        <ul className="grid gap-3 @xl:grid-cols-2 @4xl:grid-cols-3">
          {shown.map((v) => <VersionCard key={v.id} joke={v} isLead={v === lead} actions={actions} openTo={`/jokes/${v.id}${query}`} />)}
        </ul>
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-2">
        <Button small icon={<Plus size={16} />} onClick={writeVersion}>Write a version</Button>
        <Button small icon={<ListChecks size={16} />} onClick={() => setAdding(true)}>Add jokes you've written</Button>
        {discarded > 0 && (
          <p className="ml-auto text-sm text-faint">
            {`${discarded} discarded ${showDiscarded ? 'shown' : 'hidden'} `}
            <button type="button" onClick={() => setShowDiscarded((s) => !s)} className="-my-2 px-1 py-2 font-medium text-dim underline-offset-4 hover:text-paper hover:underline">
              {showDiscarded ? 'Hide' : 'Show'}
            </button>
          </p>
        )}
      </div>
      <AddVersionsDialog clusterId={clusterId} lead={lead} open={adding} onOpenChange={setAdding} />
    </article>
  )
}
