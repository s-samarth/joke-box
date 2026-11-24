/**
 * Put jokes you've already written on a premise: the joke sheet with the Jokes tab's filters,
 * starting on the premise's topic (clear them for any topic), ticking as many as you like. A joke
 * resting on another premise moves to this one, and says so before you pick it.
 */
import { useJokes, useSaveJoke } from '../../api/library'
import { usePremises, type Premise } from '../../api/premises'
import { toInput } from '../jokes/useAutosaveJoke'
import { JokePickSheet } from '../pickers/JokePickSheet'

export function AddJokesDialog({ premise, open, onOpenChange }: { premise: Premise; open: boolean; onOpenChange: (open: boolean) => void }) {
  const { data: jokes = [] } = useJokes()
  const { data: premises = [] } = usePremises()
  const save = useSaveJoke()
  const takeOf = (id: string) => premises.find((p) => p.id === id)?.take
  const add = (ids: string[]) => {
    for (const j of jokes) if (ids.includes(j.id)) save.mutate({ id: j.id, input: { ...toInput(j), premise_id: premise.id } })
  }
  if (!open) return null

  return (
    <JokePickSheet title="Add jokes to this premise" description="Starts on the premise's topic. Clear the filters for any joke." onClose={() => onOpenChange(false)}
      candidates={jokes.filter((j) => j.premise_id !== premise.id)} start={{ topic: premise.topic_id }} many={['Add', 'joke', 'jokes']} onPick={add}
      note={(j) => (j.premise_id && takeOf(j.premise_id) ? `Moves from: ${takeOf(j.premise_id)}` : null)} />
  )
}
