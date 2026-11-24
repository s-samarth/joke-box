/**
 * The words of a joke as a list row shows them: the setup and the punchline, two lines each, and a
 * line of details under them that the caller fills in. The Jokes list and the picker for adding
 * versions to a cluster both use it, so a joke looks the same wherever you pick it from.
 */
import type { ReactNode } from 'react'
import type { Joke } from '../../api/types'

export function JokeRowBody({ joke, punchClass = 'text-dim', children }: { joke: Joke; punchClass?: string; children: ReactNode }) {
  return (
    <>
      <p className="line-clamp-2 leading-snug">{joke.setup}</p>
      {joke.punchline && <p className={`mt-1 line-clamp-2 text-[15px] ${punchClass}`}>{joke.punchline}</p>}
      {/* Wraps when crowded (two long types): one line that can't wrap ran off a phone's edge and let the page zoom out. */}
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-faint">{children}</div>
    </>
  )
}
