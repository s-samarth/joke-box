/**
 * The Jokes list, with each cluster as one row: a stack showing one version, like Google Photos
 * stacking similar shots. The row shows the lead when it matches the filters, otherwise the
 * version that sorts first among those that do, so you can see why the cluster is there. It sits
 * where that version sorts. `flat` lists every version on its own row instead.
 */
import type { Cluster } from '../../../api/clusters'
import type { Joke } from '../../../api/types'
import { isDiscarded } from '../discarded'
import { allDiscarded, leadOf, versionsOf } from './lead'

export interface ListRow {
  joke: Joke
  /** Set when the joke is a version in a cluster. */
  clusterId?: string
  /** Versions in the cluster, leaving out discarded ones while they're hidden. */
  total: number
  /** How many of them the filters left (always 1 when flat). */
  matching: number
  /** Every version is discarded, so the cluster is too. */
  discarded: boolean
  isLead: boolean
}

interface Options {
  clusters: Cluster[]
  showDiscarded: boolean
  flat: boolean
}

/** `visible`: the filtered, sorted jokes. `all`: every joke, to count each cluster's versions. */
export function stackRows(visible: Joke[], all: Joke[], { clusters, showDiscarded, flat }: Options): ListRow[] {
  const shown = new Map<string, Joke[]>()
  for (const j of visible) if (j.cluster_id) shown.set(j.cluster_id, [...(shown.get(j.cluster_id) ?? []), j])
  const info = new Map<string, { face: Joke; lead?: Joke; total: number; matching: number; discarded: boolean }>()
  for (const [id, members] of shown) {
    const versions = versionsOf(id, all)
    const lead = leadOf(clusters.find((c) => c.id === id), versions)
    const counted = showDiscarded ? versions : versions.filter((j) => !isDiscarded(j))
    const face = lead && members.includes(lead) ? lead : members[0]
    info.set(id, { face, lead, total: Math.max(counted.length, members.length), matching: members.length, discarded: allDiscarded(versions) })
  }
  const rows: ListRow[] = []
  for (const joke of visible) {
    const cluster = joke.cluster_id ? info.get(joke.cluster_id) : undefined
    if (!cluster) {
      rows.push({ joke, total: 1, matching: 1, discarded: false, isLead: false })
      continue
    }
    if (!flat && cluster.face !== joke) continue
    const base = { joke, clusterId: joke.cluster_id ?? undefined, total: cluster.total, discarded: cluster.discarded, isLead: cluster.lead === joke }
    rows.push({ ...base, matching: flat ? 1 : cluster.matching })
  }
  return rows
}

/** The badge on a stacked row: "3 versions", or "2 of 3 versions" when the filters narrow it. */
export function badge(row: ListRow, flat: boolean): string {
  if (flat) return row.isLead ? `Lead of ${row.total}` : `1 of ${row.total} versions`
  const n = row.matching < row.total ? `${row.matching} of ${row.total}` : String(row.total)
  return `${n} ${row.total === 1 ? 'version' : 'versions'}`
}
