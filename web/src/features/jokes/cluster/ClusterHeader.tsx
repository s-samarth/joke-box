/**
 * The top of a cluster: where it's filed, its core idea (the title, edited in place; empty, the
 * lead's setup shows in its place) and notes, saved after a short pause or when you leave. The ⋯
 * menu dissolves it.
 */
import { Merge, MoreHorizontal } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useSaveCluster, type Cluster } from '../../../api/clusters'
import { IconButton } from '../../../components/ui/Button'
import { GrowingText } from '../../../components/ui/Field'
import { Dropdown } from '../../../components/ui/Menu'
import { onHide } from '../../../lib/saveOnHide'

const DELAY = 700

type Words = { title: string; notes: string }

/** Title and notes only: the lead is saved on its own, so neither undoes the other. */
function useClusterWords(clusterId: string, cluster: Cluster | undefined) {
  const [draft, setDraft] = useState<Words>({ title: cluster?.title ?? '', notes: cluster?.notes ?? '' })
  const [from] = useState(cluster?.version)
  const save = useSaveCluster()
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const pending = useRef<Words | null>(null)
  const mutate = useRef(save.mutate)
  mutate.current = save.mutate

  const flush = () => {
    clearTimeout(timer.current)
    if (pending.current) mutate.current({ id: clusterId, input: { ...pending.current, version: from } })
    pending.current = null
  }
  const update = (patch: Partial<Words>) => {
    setDraft((d) => (pending.current = { ...d, ...patch }))
    clearTimeout(timer.current)
    timer.current = setTimeout(flush, DELAY)
  }
  useEffect(() => {
    const stop = onHide(flush)
    return () => {
      stop()
      flush()
    }
    // Only on mount/unmount for this cluster; flush reads the latest values through refs.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [clusterId])
  return { draft, update }
}

interface Props {
  clusterId: string
  cluster?: Cluster
  /** The lead's setup, shown while the cluster has no title of its own. */
  standIn: string
  /** Where it's filed: the lead's topic and subtopic. */
  filed: string
  onDissolve: () => void
}

export function ClusterHeader({ clusterId, cluster, standIn, filed, onDissolve }: Props) {
  const { draft, update } = useClusterWords(clusterId, cluster)
  return (
    <header>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-faint">Cluster · {filed}</p>
        <Dropdown items={[{ label: 'Dissolve cluster', icon: <Merge size={16} />, onSelect: onDissolve }]}
          trigger={<IconButton label="Cluster actions"><MoreHorizontal size={20} /></IconButton>} />
      </div>
      <GrowingText aria-label="What the versions share" placeholder={standIn || 'Name the core idea'} value={draft.title}
        onChange={(e) => update({ title: e.target.value })} className="mt-1 text-[24px] leading-tight font-medium sm:text-[26px]" />
      <GrowingText aria-label="Notes" placeholder="Notes: which version works where, what to try" value={draft.notes}
        onChange={(e) => update({ notes: e.target.value })} className="mt-2 text-[15px] text-dim" />
    </header>
  )
}
