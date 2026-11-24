/** Both Jokes list views use the same rows, counts, order and cluster links. */
import type { Cluster } from '../../../api/clusters'
import type { Joke } from '../../../api/types'
import { isDiscarded } from '../discarded'
import { allDiscarded, leadOf } from './lead'

export interface ListRow {
  /** The lead when visible, otherwise the first matching version in the chosen sort. */
  joke: Joke
  cluster?: { id: string; name: string; lead: Joke }
  /** Versions in the cluster, leaving out discarded ones while they're hidden. */
  total: number
  matching: number
  discarded: boolean
}

interface Options {
  clusters: Cluster[]
  showDiscarded: boolean
}

/** Keep a cluster where its representative sorts, even when another version sorts earlier. */
export function stackRows(visible: Joke[], all: Joke[], { clusters, showDiscarded }: Options): ListRow[] {
  const versionsByCluster = new Map<string, Joke[]>()
  for (const joke of all) {
    if (!joke.cluster_id) continue
    const versions = versionsByCluster.get(joke.cluster_id)
    if (versions) versions.push(joke)
    else versionsByCluster.set(joke.cluster_id, [joke])
  }
  const byId = new Map(clusters.map((c) => [c.id, c]))
  const visibleIds = new Set(visible.map((joke) => joke.id))
  const byCluster = new Map<string, ListRow>()
  const rows: ListRow[] = []
  for (const joke of visible) {
    const id = joke.cluster_id
    if (!id) {
      rows.push({ joke, total: 1, matching: 1, discarded: false })
      continue
    }
    let row = byCluster.get(id)
    if (!row) {
      const versions = versionsByCluster.get(id) ?? [joke]
      const cluster = byId.get(id)
      const lead = leadOf(cluster, versions) ?? joke
      row = {
        joke: visibleIds.has(lead.id) ? lead : joke,
        cluster: { id, name: cluster?.title.trim() || lead.setup, lead },
        total: showDiscarded ? versions.length : versions.filter((j) => !isDiscarded(j)).length,
        matching: 0, discarded: allDiscarded(versions),
      }
      byCluster.set(id, row)
    }
    row.matching++
    if (row.joke.id === joke.id) rows.push(row)
  }
  return rows
}

/** "3 versions", or "2 of 3 versions" when the filters narrow the cluster. */
export function badge(row: ListRow): string {
  const n = row.matching < row.total ? `${row.matching} of ${row.total}` : String(row.total)
  return `${n} ${row.total === 1 ? 'version' : 'versions'}`
}
