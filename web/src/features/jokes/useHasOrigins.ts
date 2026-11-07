/** Does a joke have anything for JokeOrigins to show (so a caller can skip its frame)? */
import { useObservations } from '../../api/notebook'
import type { Joke } from '../../api/types'

export function useHasOrigins(joke: Joke): boolean {
  const { data: observations = [] } = useObservations()
  return (joke.voice_note_ids ?? []).length > 0 || observations.some((o) => (o.joke_ids ?? []).includes(joke.id))
}
