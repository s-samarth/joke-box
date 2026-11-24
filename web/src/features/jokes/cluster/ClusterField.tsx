/**
 * The Cluster row on a joke: which cluster it's a version in, opening it, or taking it out. A joke
 * on its own can start a new cluster (it leads it, and the cluster opens so you can add the other
 * versions) or join one you have, picked from a searchable list.
 */
import { Layers, Plus, Search, X } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { useClusters, useSaveCluster } from '../../../api/clusters'
import { newId } from '../../../api/client'
import { useJokes } from '../../../api/library'
import { Input } from '../../../components/ui/Field'
import { Modal } from '../../../components/ui/Modal'
import { clusterName, leadOf, versionCount, versionsOf } from './lead'

const chip = 'inline-flex min-h-10 items-center gap-2 rounded-lg bg-ink-3 px-3 text-[15px] hover:bg-ink-4'

interface Props {
  /** The joke being edited; none while writing a new one, which can join a cluster but not start one. */
  jokeId?: string
  value: string | null
  onChange: (id: string | null) => void
}

export function ClusterField({ jokeId, value, onChange }: Props) {
  const { data: jokes = [] } = useJokes()
  const { data: clusters = [] } = useClusters()
  const save = useSaveCluster()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [picking, setPicking] = useState(false)
  const [q, setQ] = useState('')
  const query = params.toString() ? `?${params}` : ''
  const named = (id: string) => clusterName(clusters.find((c) => c.id === id), versionsOf(id, jokes))
  // Clusters with a version in the app (one whose jokes are all in the Trash can't be joined here).
  const ids = [...new Set(jokes.flatMap((j) => (j.cluster_id && j.cluster_id !== value ? [j.cluster_id] : [])))]
  const shown = ids.filter((id) => named(id).toLowerCase().includes(q.trim().toLowerCase()))
  const close = () => {
    setPicking(false)
    setQ('')
  }
  const pick = (id: string) => {
    onChange(id)
    close()
  }
  const start = () => {
    const id = newId()
    save.mutate({ id, input: { title: '', notes: '', lead_joke_id: jokeId } })
    onChange(id)
    close()
    // Once the joke's draft has the cluster: leaving the joke saves it, after the cluster.
    setTimeout(() => navigate(`/jokes/c/${id}${query}`))
  }

  if (value) {
    const versions = versionsOf(value, jokes)
    const leads = leadOf(clusters.find((c) => c.id === value), versions)?.id === jokeId
    return (
      <div className="flex flex-wrap items-center gap-2">
        <Link to={`/jokes/c/${value}${query}`} className={`${chip} min-w-0`}>
          <Layers size={16} className="shrink-0 text-tape" aria-hidden />
          <span className="truncate">Version of: {named(value)}</span>
          <span className="shrink-0 text-faint">· {leads ? 'Lead · ' : ''}{versionCount(versions.length)}</span>
        </Link>
        <button type="button" onClick={() => onChange(null)} aria-label="Take out of the cluster" className="inline-flex size-10 items-center justify-center rounded-lg text-faint hover:bg-ink-3 hover:text-paper"><X size={18} /></button>
      </div>
    )
  }

  return (
    <>
      <button type="button" onClick={() => setPicking(true)} className={`${chip} text-dim`}><Layers size={16} aria-hidden />Add to a cluster</button>
      <Modal open={picking} onOpenChange={(o) => (o ? setPicking(true) : close())} title="Add to a cluster" description="Keep the versions of one joke together.">
        {jokeId && (
          <button type="button" onClick={start} className="flex w-full items-center gap-2 rounded-lg px-1 py-3 text-left text-tape hover:bg-ink-3">
            <Plus size={18} aria-hidden />New cluster from this joke
          </button>
        )}
        {ids.length > 0 && (
          <div className="relative mt-2">
            <Search size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-faint" />
            <Input type="search" aria-label="Search clusters" placeholder="Search clusters" className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        )}
        <ul className="mt-2 max-h-[45dvh] divide-y divide-rule overflow-y-auto">
          {!ids.length && <li className="py-4 text-dim">No clusters yet.</li>}
          {ids.length > 0 && !shown.length && <li className="py-4 text-dim">No cluster matches.</li>}
          {shown.map((id) => (
            <li key={id}>
              <button type="button" onClick={() => pick(id)} className="flex w-full items-baseline justify-between gap-3 py-3 text-left hover:text-tape">
                <span className="line-clamp-2">{named(id)}</span>
                <span className="shrink-0 text-sm text-faint">{versionsOf(id, jokes).length}</span>
              </button>
            </li>
          ))}
        </ul>
      </Modal>
    </>
  )
}
