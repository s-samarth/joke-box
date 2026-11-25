/** Changing a set's beats, without changing the old ones (React state). Tested in beatEdit.test.ts. */
import { newId } from '../../api/client'
import type { Beat, Joke, SetEntry, SetPiece } from '../../api/types'
import { hasPieces } from './beats'
import { addToGate } from './gateEdit'
import { fitGates } from './gateRows'

export const newBeat = (): Beat => ({ id: newId(), cue: '', description: '', seconds: 120, labels: {}, shift_reason: '', entries: [] })
export const newPremise = (premiseId: string): SetEntry => ({ kind: 'premise', id: newId(), premise_id: premiseId, gate: false, pieces: [] })
export const newJokes = (): SetEntry => ({ kind: 'jokes', id: newId(), pieces: [] })
export const newCrowd = (): SetEntry => ({ kind: 'crowd', id: newId(), title: '', questions: [{ id: newId(), text: '', has_reply: false, replies: [] }] })

/**
 * A joke as a piece of a beat. A version in a cluster follows the cluster's lead if it is the
 * lead; picking another version pins that one for this set.
 */
export function pieceFor(joke: Joke, leadOf: (clusterId: string) => string | null | undefined): SetPiece {
  const cluster = joke.cluster_id ?? null
  return { id: newId(), joke_id: joke.id, cluster_id: cluster, pinned: Boolean(cluster && leadOf(cluster) !== joke.id), loose: false, gate: 0 }
}

/** Swap item i with its neighbour d (-1 up, 1 down). Out of range: unchanged. */
export function swap<T>(list: T[], i: number, d: number): T[] {
  const j = i + d
  if (j < 0 || j >= list.length) return list
  const out = [...list]
  ;[out[i], out[j]] = [out[j], out[i]]
  return out
}

/** A gate guards only jokes after it, and gates go two deep at most (beatMove.ts). */
export const clampGates = fitGates

/** The first premise of a beat has no premise before it to be gated on. */
export function tidyEntries(entries: SetEntry[]): SetEntry[] {
  let first = true
  return entries.map((e) => {
    if (e.kind !== 'premise') return hasPieces(e) ? { ...e, pieces: clampGates(e.pieces) } : e
    const out = { ...e, gate: e.gate && !first, pieces: clampGates(e.pieces) }
    first = false
    return out
  })
}

export const mapBeat = (beats: Beat[], id: string, change: (b: Beat) => Beat) => beats.map((b) => (b.id === id ? change(b) : b))
export const mapEntry = (beat: Beat, id: string, change: (e: SetEntry) => SetEntry): Beat => ({ ...beat, entries: tidyEntries(beat.entries.map((e) => (e.id === id ? change(e) : e))) })
export const setEntries = (beat: Beat, entries: SetEntry[]): Beat => ({ ...beat, entries: tidyEntries(entries) })

/** Change the jokes of a premise or of a no-premise list. */
export const mapPieces = (beat: Beat, entryId: string, change: (p: SetPiece[]) => SetPiece[]) =>
  mapEntry(beat, entryId, (e) => (hasPieces(e) ? { ...e, pieces: clampGates(change(e.pieces)) } : e))

export const toggleLoose = (pieces: SetPiece[], id: string) => pieces.map((p) => (p.id === id ? { ...p, loose: !p.loose } : p))

/**
 * Follow the cluster's lead, or pin the version playing now. Following, the piece shows the
 * lead at once (the server would show it on the next read anyway).
 */
export function togglePin(piece: SetPiece, lead: string | null | undefined): SetPiece {
  if (piece.pinned) return { ...piece, pinned: false, joke_id: lead ?? piece.joke_id }
  return { ...piece, pinned: true }
}

/** Add jokes at the end of a beat: into the last no-premise list, or a new one after it. */
export function addLoose(beat: Beat, pieces: SetPiece[]): Beat {
  const last = beat.entries[beat.entries.length - 1]
  if (last?.kind === 'jokes') return mapPieces(beat, last.id, (p) => [...p, ...pieces])
  return setEntries(beat, [...beat.entries, { kind: 'jokes', id: newId(), pieces }])
}

/** A new set, as "New set" and a joke's "Add to a new set" make it. */
export const emptySet = () => ({ name: 'Untitled set', show_date: null, target_seconds: 420, venue_name: null, rating: null, tag_ids: [], items: [], point: '', beats: [] as Beat[], status: 'Draft' as const })

/** Jokes added from outside the builder (a joke's page) go at the end of the last beat. */
export function addToEnd(beats: Beat[], pieces: SetPiece[]): Beat[] {
  if (!pieces.length) return beats
  const last = beats[beats.length - 1] ?? newBeat()
  const out = beats.length ? beats.slice(0, -1) : []
  return [...out, addLoose(last, pieces)]
}

/**
 * Add jokes into a premise or no-premise list, at its end or at the end of gate `gateId` in it.
 * `entryId` null starts a new no-premise list at the end of the beat. Returns the beat and the
 * list they went into, for the next add.
 */
export function addPiecesTo(beat: Beat, entryId: string | null, pieces: SetPiece[], gateId: string | null = null): { beat: Beat; entryId: string } {
  if (entryId && beat.entries.some((e) => e.id === entryId)) return { beat: mapPieces(beat, entryId, (p) => (gateId ? addToGate(p, gateId, pieces) : [...p, ...pieces])), entryId }
  const entry = { kind: 'jokes' as const, id: newId(), pieces }
  return { beat: setEntries(beat, [...beat.entries, entry]), entryId: entry.id }
}

/**
 * Put some jokes of a no-premise list under a premise (jokes first, premise later). They keep
 * their order and settings. If the beat has that premise already they join the end of it;
 * otherwise the premise goes in just above the list. A list left empty goes.
 */
export function groupUnder(beat: Beat, entryId: string, pieceIds: string[], premiseId: string): Beat {
  const from = beat.entries.find((e) => e.id === entryId)
  if (from?.kind !== 'jokes') return beat
  const moving = from.pieces.filter((p) => pieceIds.includes(p.id))
  if (!moving.length) return beat
  const staying = from.pieces.filter((p) => !pieceIds.includes(p.id))
  const target = beat.entries.find((e) => e.kind === 'premise' && e.premise_id === premiseId)
  const entries = beat.entries.flatMap((e): SetEntry[] => {
    if (e.id === target?.id && e.kind === 'premise') return [{ ...e, pieces: [...e.pieces, ...moving] }]
    if (e.id !== entryId) return [e]
    const left = staying.length ? [{ ...from, pieces: staying }] : []
    return target ? left : [{ ...newPremise(premiseId), pieces: moving } as SetEntry, ...left]
  })
  return setEntries(beat, entries)
}
