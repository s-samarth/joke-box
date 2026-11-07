/**
 * Where a joke came from, read-only: the observations behind it and its voice notes (playable).
 * Shown while rewriting it and in the joke panel on the map and in sets, where editing the
 * links would be a detour; the joke's own page is where they change. Nothing linked: nothing shown.
 */
import { useObservations } from '../../api/notebook'
import type { Joke } from '../../api/types'
import { VoiceNotesOn } from '../voice/VoiceNotesOn'

export function JokeOrigins({ joke }: { joke: Joke }) {
  const { data: observations = [] } = useObservations()
  const behind = observations.filter((o) => (o.joke_ids ?? []).includes(joke.id))
  return (
    <div className="space-y-4">
      {behind.length > 0 && (
        <section aria-label="From observations">
          <h3 className="mb-1 text-sm text-dim">From observations</h3>
          <ul className="space-y-2">
            {behind.map((o) => <li key={o.id} className="border-l-2 border-rule pl-3 text-[15px] leading-snug whitespace-pre-wrap text-paper/90">{o.text}</li>)}
          </ul>
        </section>
      )}
      <VoiceNotesOn ids={joke.voice_note_ids ?? []} />
    </div>
  )
}

