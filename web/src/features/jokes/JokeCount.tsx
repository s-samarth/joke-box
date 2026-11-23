/**
 * The line under the Jokes filters: how many jokes show, and when some are discarded, how many and
 * a Show or Hide that flips them in or out (see discarded.ts).
 */
import { count } from '../../lib/topics'
import type { useJokeFilters } from './useJokeFilters'

export function JokeCount({ f }: { f: ReturnType<typeof useJokeFilters> }) {
  const total = count(f.total, 'joke', 'jokes')
  return (
    <p className="mt-4 mb-1 text-sm text-faint">
      {f.active || f.hidingDiscarded ? `${f.visible.length} of ${total}` : total}
      {f.discarded > 0 && (
        <>
          {` · ${f.discarded} discarded ${f.showDiscarded ? 'shown' : 'hidden'} `}
          <button type="button" onClick={() => f.set({ discarded: f.showDiscarded ? null : 'show' })}
            className="-my-2 px-1 py-2 font-medium text-dim underline-offset-4 hover:text-paper hover:underline">
            {f.showDiscarded ? 'Hide' : 'Show'}
          </button>
        </>
      )}
    </p>
  )
}
