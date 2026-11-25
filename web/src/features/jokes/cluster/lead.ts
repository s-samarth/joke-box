/**
 * The lead of a cluster, worked out the way the server keeps it (app/services/clusters.py), so the
 * list and the cluster are right offline and before the server answers:
 * - The stored lead, while it isn't discarded.
 * - Otherwise the strongest version that isn't discarded, the most recently edited on a tie,
 *   then the newest, then the highest id.
 * - With every version discarded, the stored lead still (the cluster counts as discarded).
 */
import type { Cluster } from '../../../api/clusters'
import type { Joke } from '../../../api/types'
import { isDiscarded } from '../discarded'

/** The versions in a cluster, from the jokes the app has (the Trash is never among them). */
export const versionsOf = (clusterId: string, jokes: Joke[]): Joke[] => jokes.filter((j) => j.cluster_id === clusterId)

const stronger = (a: Joke, b: Joke) =>
  (b.strength ?? 0) - (a.strength ?? 0) || b.updated_at.localeCompare(a.updated_at) || b.created_at.localeCompare(a.created_at) || (a.id < b.id ? 1 : a.id > b.id ? -1 : 0)

export function leadOf(cluster: Pick<Cluster, 'lead_joke_id'> | undefined, versions: Joke[]): Joke | undefined {
  const active = versions.filter((j) => !isDiscarded(j))
  const stored = versions.find((j) => j.id === cluster?.lead_joke_id)
  if (stored && (!active.length || !isDiscarded(stored))) return stored
  return [...(active.length ? active : versions)].sort(stronger)[0]
}

/** Lead first, then the newest. */
export function inOrder(cluster: Pick<Cluster, 'lead_joke_id'> | undefined, versions: Joke[]): Joke[] {
  const lead = leadOf(cluster, versions)
  return [...versions].sort((a, b) => Number(b === lead) - Number(a === lead) || b.created_at.localeCompare(a.created_at))
}

/** Every version discarded: the cluster counts as discarded too. */
export const allDiscarded = (versions: Joke[]): boolean => versions.length > 0 && versions.every(isDiscarded)

/** What to call a cluster: its title, or its lead's setup when it has none. */
export function clusterName(cluster: Pick<Cluster, 'title' | 'lead_joke_id'> | undefined, versions: Joke[]): string {
  return cluster?.title.trim() || leadOf(cluster, versions)?.setup || 'Untitled cluster'
}

/** "3 versions", "1 version". */
export const versionCount = (n: number): string => `${n} ${n === 1 ? 'version' : 'versions'}`
