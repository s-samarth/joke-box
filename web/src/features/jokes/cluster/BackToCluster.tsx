/**
 * Above a joke that's a version in a cluster: the way back to the cluster it was opened from. The
 * map's reading panel uses it too, to open the cluster a joke is in.
 */
import { Layers } from 'lucide-react'
import { Link, useSearchParams } from 'react-router'
import { useClusters } from '../../../api/clusters'
import { useJokes } from '../../../api/library'
import { clusterName, versionsOf } from './lead'

export function BackToCluster({ clusterId, label = 'Back to cluster' }: { clusterId: string; label?: string }) {
  const { data: jokes = [] } = useJokes()
  const { data: clusters = [] } = useClusters()
  const [params] = useSearchParams()
  const name = clusterName(clusters.find((c) => c.id === clusterId), versionsOf(clusterId, jokes))
  return (
    <Link to={`/jokes/c/${clusterId}${params.toString() ? `?${params}` : ''}`} className="flex min-h-10 max-w-full items-center gap-2 text-sm text-dim hover:text-tape">
      <Layers size={15} className="shrink-0 text-tape" aria-hidden />
      <span className="truncate">{label}: {name}</span>
    </Link>
  )
}
