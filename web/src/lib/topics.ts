/** Wording for what happens to a topic's things when it's deleted. */
import { THOUGHTS } from './jokeMeta'

export interface TopicUse {
  jokes: number
  premises: number
  shows: number
}

export const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

/** "Its 3 jokes, 1 premise and 2 logged shows move to Thoughts.", naming only what it has. */
export function topicMoveMessage({ jokes, premises, shows }: TopicUse): string {
  const parts = [
    jokes && count(jokes, 'joke', 'jokes'),
    premises && count(premises, 'premise', 'premises'),
    shows && count(shows, 'logged show', 'logged shows'),
  ].filter((p): p is string => Boolean(p))
  if (!parts.length) return 'Nothing is filed under it.'
  const list = parts.length === 1 ? parts[0] : `${parts.slice(0, -1).join(', ')} and ${parts.at(-1)}`
  const single = jokes + premises + shows === 1
  return `Its ${list} ${single ? 'moves' : 'move'} to ${THOUGHTS}.`
}
