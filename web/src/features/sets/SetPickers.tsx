/**
 * The set builder's pickers, all of them the library's own sheets: jokes (SetJokePicker, the
 * Jokes tab's filters), a premise for a beat, and a premise for jokes you picked in a no-premise
 * list (jokes first, premise later). Plus reading a joke whole (JokePeek).
 *
 * Putting jokes under a premise here changes only the set: in your library each joke keeps the
 * premise it rests on, or none (docs/sets.md). Undo puts the beat back. Jokes can also go
 * straight into a gate (+ Joke inside its box). Move › Another premise… picks the premise for one
 * joke (a gate brings its jokes) the same way.
 */
import { Plus } from 'lucide-react'
import { useState } from 'react'
import { useJokes } from '../../api/library'
import { usePremises } from '../../api/premises'
import type { Beat, Joke } from '../../api/types'
import { useFeedback } from '../../components/ui/feedbackContext'
import { chainTo } from '../../lib/chains'
import { JokePeek } from '../jokes/JokePeek'
import { PremisePickSheet } from '../pickers/PremisePickSheet'
import { NewPremiseDialog } from '../premises/NewPremiseDialog'
import { addPiecesTo, groupUnder, newPremise, pieceFor, setEntries } from './beatEdit'
import { movedLists } from './beatMove'
import { hasPieces, jokeIds } from './beats'
import { moveTo } from './moveTo'
import { SetJokePicker } from './SetJokePicker'
import { many, short, usePremiseTake } from './usePremiseTake'

export type Picking =
  | { kind: 'jokes'; beatId: string; entryId: string | null; gateId?: string | null }
  | { kind: 'premise'; beatId: string }
  | { kind: 'group'; beatId: string; entryId: string; pieceIds: string[] }
  | { kind: 'move'; beatId: string; pieceId: string }

interface Props {
  picking: Picking | null
  onPicking: (p: Picking | null) => void
  beats: Beat[]
  onBeat: (beat: Beat) => void
  leadOf: (clusterId: string) => string | null | undefined
  reading: Joke | null
  onReading: (joke: Joke | null) => void
}

const chip = 'mt-3 inline-flex h-10 items-center gap-2 rounded-lg bg-ink-3 px-3 text-[15px] text-dim hover:bg-ink-4 hover:text-paper'

export function SetPickers({ picking, onPicking, beats, onBeat, leadOf, reading, onReading }: Props) {
  const { data: jokes = [] } = useJokes()
  const { data: premises = [] } = usePremises()
  const { toast } = useFeedback()
  const takeOf = usePremiseTake()
  const [creating, setCreating] = useState(false)
  const byId = new Map(jokes.map((j) => [j.id, j]))
  const used = jokeIds(beats)
  const beat = beats.find((b) => b.id === picking?.beatId)
  const entry = picking && 'entryId' in picking ? beat?.entries.find((e) => e.id === picking.entryId) : undefined
  const pieceJoke = (id: string) => byId.get(beat?.entries.flatMap((e) => (hasPieces(e) ? e.pieces : [])).find((p) => p.id === id)?.joke_id ?? '')
  const premiseId = entry?.kind === 'premise' ? entry.premise_id : null

  // A joke that follows others brings the ones before it that aren't in the set yet.
  const addJokes = (list: Joke[]) => {
    if (picking?.kind !== 'jokes' || !beat) return
    const taken = new Set(used)
    const adding: Joke[] = []
    for (const joke of list) {
      if (taken.has(joke.id)) continue
      for (const j of chainTo(joke, byId)) if (!taken.has(j.id)) { taken.add(j.id); adding.push(j) }
    }
    if (!adding.length) return
    const out = addPiecesTo(beat, picking.entryId, adding.map((j) => pieceFor(j, leadOf)), picking.gateId ?? null)
    onBeat(out.beat)
    onPicking({ ...picking, entryId: out.entryId })
    const before = adding.length - list.filter((j) => !used.has(j.id)).length
    if (before > 0) toast(`Also added the ${before === 1 ? 'joke' : `${before} jokes`} before it`)
  }

  const pickPremise = (id: string) => {
    if (!beat || !picking) return
    if (picking.kind === 'premise') {
      const added = newPremise(id)
      onBeat(setEntries(beat, [...beat.entries, added]))
      return onPicking({ kind: 'jokes', beatId: beat.id, entryId: added.id })
    }
    if (picking.kind === 'move') {
      const next = moveTo(beat, picking.pieceId, { premiseId: id })
      onPicking(null)
      if (next === beat) return
      onBeat(next)
      const count = movedLists(beat, next).size
      return toast(`${many(count)} under “${short(takeOf(id) ?? 'the premise', 40)}” in this set`, { label: 'Undo', onClick: () => onBeat(beat) })
    }
    if (picking.kind !== 'group' || entry?.kind !== 'jokes') return
    onBeat(groupUnder(beat, entry.id, picking.pieceIds, id))
    onPicking(null)
    toast(`${many(picking.pieceIds.length)} under “${short(takeOf(id) ?? 'the premise', 40)}” in this set`, { label: 'Undo', onClick: () => onBeat(beat) })
  }

  const inBeat = new Set(beat?.entries.flatMap((e) => (e.kind === 'premise' && e.premise_id ? [e.premise_id] : [])) ?? [])
  const picked = picking?.kind === 'move' ? [pieceJoke(picking.pieceId)].flatMap((j) => j ?? [])
    : picking?.kind === 'group' && entry?.kind === 'jokes' ? entry.pieces.filter((p) => picking.pieceIds.includes(p.id)).flatMap((p) => byId.get(p.joke_id) ?? []) : []
  const one = picked.length === 1
  const forJokes = picking?.kind === 'group' || picking?.kind === 'move'
  // Start on the picked jokes' topic when they share one that has premises, else on every topic.
  const shared = picked.length && picked.every((j) => j.topic_id === picked[0].topic_id) ? picked[0].topic_id : null
  const sameTopic = premises.some((p) => p.topic_id === shared && p.status !== 'Discarded') ? shared : null
  return (
    <>
      {picking?.kind === 'jokes' && (
        <SetJokePicker key={`${picking.entryId}/${picking.gateId}`} title={picking.gateId ? 'Add jokes to the gate' : 'Add jokes'} onClose={() => onPicking(null)} used={used} onAdd={addJokes} onRead={onReading}
          description={(picking.gateId ? 'Inside the gate: only if it lands. ' : '') + (premiseId ? `Under “${short(takeOf(premiseId) ?? 'a deleted premise')}”. Starts on its topic, so jokes not yet linked to it show too. Only the set changes.` : `Into ${beat?.cue || 'this beat'}, as standalone jokes. Tick them in the order you want them.`)}
          start={premiseId ? { topic: premises.find((p) => p.id === premiseId)?.topic_id ?? null, premise: null } : { topic: null }} memory={premiseId ? undefined : 'set-joke-picker'} />
      )}
      {(picking?.kind === 'premise' || forJokes) && (
        <PremisePickSheet topicId={forJokes ? sameTopic : null} onClose={() => onPicking(null)} onPick={([id]) => pickPremise(id)}
          title={forJokes ? `Which premise ${one ? 'does it' : 'do they'} go under?` : 'Add a premise'}
          description={picking.kind === 'move' ? `“${short(picked[0]?.setup ?? 'This joke', 50)}” goes under it in this set. Its premise in your library stays as it is.`
            : forJokes ? `${many(picked.length)} picked. They go under it in this set. Their premises in your library stay as they are.` : 'The take this part of the beat rests on. You pick its jokes next.'}
          note={(p) => (inBeat.has(p.id) ? (forJokes ? `In this beat: ${one ? 'it joins' : 'they join'} it` : 'Already in this beat') : null)}
          after={<button type="button" onClick={() => setCreating(true)} className={chip}><Plus size={16} /> New premise</button>} />
      )}
      <NewPremiseDialog open={creating} onOpenChange={setCreating} topicId={sameTopic} onCreated={(id) => { setCreating(false); pickPremise(id) }} />
      {reading && <JokePeek joke={reading} onClose={() => onReading(null)} onAdd={picking?.kind === 'jokes' ? () => addJokes([reading]) : undefined} inSet={used.has(reading.id)} />}
    </>
  )
}
