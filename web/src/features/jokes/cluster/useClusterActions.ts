/**
 * What you can do to a cluster and its versions from the cluster itself, each saved through the
 * usual queued saves so it works offline: pick the lead, discard or bring back a version, take one
 * out, copy one as a new version, delete one, dissolve the cluster. When the lead stops being one,
 * a toast says which version leads now (the same rule as the server's, see lead.ts). A new
 * version starts with what versions share: the premise, the observations it came from and the
 * joke it follows. (The jokes that follow it can't be shared: each follows one joke.)
 */
import { useNavigate } from 'react-router'
import { useDissolveCluster, useSaveCluster, type Cluster } from '../../../api/clusters'
import { newId } from '../../../api/client'
import { useDeleteJoke, useSaveJoke } from '../../../api/library'
import { useLinkObservation, useObservations } from '../../../api/notebook'
import type { Joke, JokeInput } from '../../../api/types'
import { useFeedback } from '../../../components/ui/feedbackContext'
import { DEFAULT_STATUS } from '../../../lib/jokeMeta'
import { DISCARDED, isDiscarded } from '../discarded'
import { toInput } from '../useAutosaveJoke'
import { leadOf } from './lead'

const short = (text: string) => (text.length > 48 ? `${text.slice(0, 47)}…` : text)

export function useClusterActions(clusterId: string, cluster: Cluster | undefined, versions: Joke[], back: string) {
  const saveCluster = useSaveCluster()
  const dissolve = useDissolveCluster()
  const saveJoke = useSaveJoke()
  const remove = useDeleteJoke()
  const { toast, confirm } = useFeedback()
  const navigate = useNavigate()
  const { data: observations = [] } = useObservations()
  const link = useLinkObservation()
  const lead = leadOf(cluster, versions)
  /** The observations a version came from: a new version starts from the same ones. */
  const cameFrom = (joke: Joke | undefined) => (joke ? observations.filter((o) => o.joke_ids.includes(joke.id)).map((o) => o.id) : [])

  const edit = (joke: Joke, patch: Partial<JokeInput>) => saveJoke.mutate({ id: joke.id, input: { ...toInput(joke), ...patch } })

  /** After `joke` leaves the active versions: say who leads now, if it was the lead. */
  const handOn = (joke: Joke, left: Joke[]) => {
    if (joke !== lead) return
    const next = leadOf({ lead_joke_id: null }, left)
    if (next && !isDiscarded(next)) toast(`"${short(next.setup)}" leads now`)
  }

  const makeLead = (joke: Joke) => {
    saveCluster.mutate({ id: clusterId, input: { lead_joke_id: joke.id, version: cluster?.version } })
    toast('Lead changed', lead ? { label: 'Undo', onClick: () => saveCluster.mutate({ id: clusterId, input: { lead_joke_id: lead.id } }) } : undefined)
  }

  const discard = (joke: Joke) => {
    const was = joke.status
    edit(joke, { status: 'Discarded' })
    handOn(joke, versions.map((v) => (v === joke ? { ...v, status: DISCARDED } : v)))
    toast('Version discarded', { label: 'Undo', onClick: () => edit(joke, { status: was }) })
  }

  const bringBack = (joke: Joke) => edit(joke, { status: DEFAULT_STATUS })

  const takeOut = (joke: Joke) => {
    edit(joke, { cluster_id: null })
    handOn(joke, versions.filter((v) => v !== joke))
    const last = versions.length === 1
    toast(last ? 'Taken out. The cluster had no other versions, so it’s gone' : 'Taken out of the cluster', {
      label: 'Undo',
      onClick: () => {
        if (last && cluster) saveCluster.mutate({ id: clusterId, input: { title: cluster.title, notes: cluster.notes, lead_joke_id: joke.id } })
        edit(joke, { cluster_id: clusterId })
      },
    })
    if (last) navigate(back)
  }

  /** A copy to rework: the same words, details and origins, as an untested Draft in this cluster. */
  const duplicate = (joke: Joke) => {
    const { version: _v, ...input } = toInput(joke)
    const id = newId()
    saveJoke.mutate({ id, input: { ...input, status: DEFAULT_STATUS, strength: null, cluster_id: clusterId, created_at: new Date().toISOString() } })
    for (const o of cameFrom(joke)) link.mutate({ id: o, kind: 'jokes', targetId: id, on: true })
    toast('Copied as a new version')
  }

  const deleteJoke = async (joke: Joke) => {
    const ok = await confirm({ title: 'Delete this version?', message: 'It goes to the Trash for 30 days. Put it back and it returns to this cluster.', confirmLabel: 'Delete joke', danger: true })
    if (!ok) return
    remove.mutate(joke.id, { onError: (e) => toast(`Not deleted: ${e.message}`) })
    handOn(joke, versions.filter((v) => v !== joke))
    toast('Joke deleted')
    if (versions.length === 1) navigate(back)
  }

  const dissolveAll = async () => {
    const n = versions.length
    const ok = await confirm({ title: 'Dissolve this cluster?', message: `${n === 1 ? 'Its joke goes back to being a joke' : `Its ${n} jokes go back to being separate jokes`}. Nothing is deleted.`, confirmLabel: 'Dissolve' })
    if (!ok) return
    const kept = { title: cluster?.title ?? '', notes: cluster?.notes ?? '', lead_joke_id: lead?.id ?? null }
    dissolve.mutate(clusterId)
    navigate(back)
    toast('Cluster dissolved', {
      label: 'Undo',
      onClick: () => {
        saveCluster.mutate({ id: clusterId, input: kept })
        for (const v of versions) edit(v, { cluster_id: clusterId })
      },
    })
  }

  return { lead, cameFrom, makeLead, discard, bringBack, takeOut, duplicate, deleteJoke, dissolve: dissolveAll }
}
