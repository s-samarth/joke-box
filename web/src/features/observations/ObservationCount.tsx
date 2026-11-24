/**
 * The count line under the observations' filters: how many show, and how many discarded ones are
 * hidden with Show (Hide puts them away again), like the premises' and jokes' count lines.
 */
import { count } from '../../lib/topics'

interface Props {
  shown: number
  total: number
  /** A filter is set, or discarded ones are hidden: say "N of M". */
  narrowed: boolean
  discarded: number
  showing: boolean
  onToggle: () => void
}

export function ObservationCount({ shown, total, narrowed, discarded, showing, onToggle }: Props) {
  const all = count(total, 'observation', 'observations')
  return (
    <p className="mt-4 mb-1 text-sm text-faint">
      {narrowed ? `${shown} of ${all}` : all}
      {discarded > 0 && (
        <>
          {` · ${discarded} discarded ${showing ? 'shown' : 'hidden'} `}
          <button type="button" onClick={onToggle} className="-my-2 px-1 py-2 font-medium text-dim underline-offset-4 hover:text-paper hover:underline">
            {showing ? 'Hide' : 'Show'}
          </button>
        </>
      )}
    </p>
  )
}
