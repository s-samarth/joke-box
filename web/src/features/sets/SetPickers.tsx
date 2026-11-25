/**
 * The set builder's pickers, all of them the library's own sheets: jokes (SetJokePicker, the
 * Jokes tab's filters), a premise for a beat, and a premise for jokes you picked in a no-premise
 * list (jokes first, premise later). Plus reading a joke whole (JokePeek).
 *
 * A joke under a premise in a set rests on that premise in your library (docs/sets.md): adding
 * jokes to a premise, or putting loose jokes under one, saves the premise on each joke, so it
 * shows on the joke and in the premise's jokes (usePremiseLink). Undo puts the beat and the jokes
 * back. Jokes can also go straight into a gate (+ Joke inside its box).
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
import { jokeIds } from './beats'
import { SetJokePicker } from './SetJokePicker'
import { many, short, usePremiseLink } from './usePremiseLink'

export type Picking =
  | { kind: 'jokes'; beatId: string; entryId: string | null; gateId?: string | null }
  | { kind: 'premise'; beatId: string }
  | { kind: 'group'; beatId: string; entryId: string; pieceIds: string[] }

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
  const { attach, askToMove, takeOf } = usePremiseLink()
  const [creating, setCreating] = useState(false)
  const byId = new Map(jokes.map((j) => [j.id, j]))
  const used = jokeIds(beats)
  const beat = beats.find((b) => b.id === picking?.beatId)
  const entry = picking?.kind !== 'premise' ? beat?.entries.find((e) => e.id === picking?.entryId) : undefined
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
    const undo = premiseId ? attach(adding, premiseId) : null
    if (undo && adding.some((j) => j.premise_id !== premiseId)) toast(`${many(adding.length)} now on “${short(takeOf(premiseId) ?? 'this premise', 40)}”`, { label: 'Undo', onClick: () => { undo(); onBeat(beat) } })
    else if (before > 0) toast(`Also added the ${before === 1 ? 'joke' : `${before} jokes`} before it`)
  }

  const pickPremise = async (id: string) => {
    if (!beat || !picking) return
    if (picking.kind === 'premise') {
      const added = newPremise(id)
      onBeat(setEntries(beat, [...beat.entries, added]))
      return onPicking({ kind: 'jokes', beatId: beat.id, entryId: added.id })
    }
    if (picking.kind !== 'group' || entry?.kind !== 'jokes') return
    const list = entry.pieces.filter((p) => picking.pieceIds.includes(p.id)).flatMap((p) => byId.get(p.joke_id) ?? [])
    if (!(await askToMove(list, id))) return
    onBeat(groupUnder(beat, entry.id, picking.pieceIds, id))
    onPicking(null)
    const undo = attach(list, id)
    toast(`${many(list.length)} now on “${short(takeOf(id) ?? 'the premise', 40)}”`, { label: 'Undo', onClick: () => { undo(); onBeat(beat) } })
  }

  const inBeat = new Set(beat?.entries.flatMap((e) => (e.kind === 'premise' && e.premise_id ? [e.premise_id] : [])) ?? [])
  const picked = picking?.kind === 'group' && entry?.kind === 'jokes' ? entry.pieces.filter((p) => picking.pieceIds.includes(p.id)).flatMap((p) => byId.get(p.joke_id) ?? []) : []
  // Start on the picked jokes' topic when they share one that has premises, else on every topic.
  const shared = picked.length && picked.every((j) => j.topic_id === picked[0].topic_id) ? picked[0].topic_id : null
  const sameTopic = premises.some((p) => p.topic_id === shared && p.status !== 'Discarded') ? shared : null
  return (
    <>
      {picking?.kind === 'jokes' && (
        <SetJokePicker key={`${picking.entryId}/${picking.gateId}`} title={picking.gateId ? 'Add jokes to the gate' : 'Add jokes'} onClose={() => onPicking(null)} used={used} onAdd={addJokes} onRead={onReading} premiseId={premiseId}
          description={(picking.gateId ? 'Inside the gate: only if it lands. ' : '') + (premiseId ? `Under “${short(takeOf(premiseId) ?? 'a deleted premise')}”. Starts on its jokes: clear the filters for any. Jokes you add rest on it.` : `Into ${beat?.cue || 'this beat'}, with no premise. Tick them in the order you want them.`)}
          start={premiseId ? { topic: null, premise: premiseId } : { topic: null }} memory={premiseId ? undefined : 'set-joke-picker'} />
      )}
      {(picking?.kind === 'premise' || picking?.kind === 'group') && (
        <PremisePickSheet topicId={picking.kind === 'group' ? sameTopic : null} onClose={() => onPicking(null)} onPick={([id]) => void pickPremise(id)}
          title={picking.kind === 'group' ? `Which premise ${picked.length === 1 ? 'does it' : 'do they'} rest on?` : 'Add a premise'}
          description={picking.kind === 'group' ? `${many(picked.length)} picked. They go under it here, and rest on it in your library.` : 'The take this part of the beat rests on. You pick its jokes next.'}
          note={(p) => (inBeat.has(p.id) ? (picking.kind === 'group' ? 'In this beat: they join it' : 'Already in this beat') : null)}
          after={<button type="button" onClick={() => setCreating(true)} className={chip}><Plus size={16} /> New premise</button>} />
      )}
      <NewPremiseDialog open={creating} onOpenChange={setCreating} topicId={sameTopic} onCreated={(id) => { setCreating(false); void pickPremise(id) }} />
      {reading && <JokePeek joke={reading} onClose={() => onReading(null)} onAdd={picking?.kind === 'jokes' ? () => addJokes([reading]) : undefined} inSet={used.has(reading.id)} />}
    </>
  )
}
