/**
 * What the set's joke picker adds (SetJokePicker): a cluster is one row, id `c:<cluster id>`, and
 * adds the version chosen for it, or its lead. Rows with a joke (or any version) already in the
 * set go to the bottom, keeping their order, so choosing another version doesn't move a row.
 */
import type { Cluster } from '../../api/clusters'
import type { Joke } from '../../api/types'
import { inOrder, versionsOf } from '../jokes/cluster/lead'

export const CLUSTER_ROW = 'c:'

/** The jokes the ticked rows add, in the order they were ticked. */
export function resolvePicks(ids: string[], chosen: Map<string, string>, jokes: Joke[], clusters: Cluster[]): Joke[] {
  const byId = new Map(jokes.map((j) => [j.id, j]))
  return ids.flatMap((id) => {
    if (!id.startsWith(CLUSTER_ROW)) return byId.get(id) ?? []
    const clusterId = id.slice(CLUSTER_ROW.length)
    const pick = byId.get(chosen.get(clusterId) ?? '')
    const lead = inOrder(clusters.find((c) => c.id === clusterId), versionsOf(clusterId, jokes))[0]
    return pick?.cluster_id === clusterId ? [pick] : lead ? [lead] : []
  })
}

/** Is this joke, or any version of its cluster, in the set? */
export const inSet = (joke: Joke, used: Set<string>, jokes: Joke[]): boolean =>
  joke.cluster_id ? versionsOf(joke.cluster_id, jokes).some((v) => used.has(v.id)) : used.has(joke.id)

/** Rows not in the set first, then those that are; each keeps its order. */
export const inSetLast = <T>(rows: T[], here: (row: T) => boolean): T[] => [...rows.filter((r) => !here(r)), ...rows.filter(here)]
