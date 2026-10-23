/**
 * One joke on the joke board: a card with a slight tilt, like something pinned to a corkboard.
 * Zoomed far out, the words would be too small to read, so it shows the first few words of the
 * setup in large type instead.
 */
import type { HTMLAttributes } from 'react'
import type { Joke } from '../../../api/types'
import { StrengthTicks, TypeLabel } from '../../../components/ui/pieces'
import { NODE } from './mapLayout'

/** At or below this zoom, boxes switch to their first few words, big. */
export const LABEL_ZOOM = 0.55

const firstWords = (text: string, n = 6) => {
  const words = text.trim().split(/\s+/)
  return words.length > n ? `${words.slice(0, n).join(' ')}…` : text
}

interface Props extends HTMLAttributes<HTMLButtonElement> {
  joke: Joke
  x: number
  y: number
  tilt: number
  dim: boolean
  selected: boolean
  faded: boolean
  dragging: boolean
  pinned: boolean
  labels: boolean
}

export function BoardBox({ joke, x, y, tilt, dim, selected, faded, dragging, pinned, labels, ...handlers }: Props) {
  const edge = selected ? 'border-2 border-tape bg-ink-3' : dim ? 'border border-dashed border-rule-strong bg-ink/70' : 'border border-rule-strong bg-ink-2 hover:border-tape/60'
  return (
    <button type="button" data-joke={joke.id} aria-pressed={selected}
      aria-label={`${joke.setup}${dim ? ' (outside these filters)' : ''}${pinned ? ', placed by hand' : ''}. Drag it or use the arrow keys to move it.`}
      style={{ position: 'absolute', left: x, top: y, width: NODE.w, height: NODE.h, transform: `rotate(${dragging ? 0 : tilt}deg) scale(${dragging ? 1.04 : 1})`, touchAction: 'pan-x pan-y' }}
      className={`flex flex-col justify-between rounded-xl p-3 text-left [-webkit-touch-callout:none] select-none ${edge} ${dragging ? 'z-20 shadow-lift' : 'transition-[opacity,transform,border-color]'} ${faded ? 'opacity-30' : dim && !selected ? 'opacity-60' : ''}`}
      {...handlers}>
      {labels ? (
        <span className="line-clamp-3 text-[24px] leading-[1.15] font-semibold text-paper">{firstWords(joke.setup)}</span>
      ) : (
        <>
          <span className="line-clamp-3 text-[14px] leading-snug text-paper">{joke.setup}</span>
          <span className="mt-2 flex items-center gap-3">
            <StrengthTicks strength={joke.strength} />
            {joke.types[0] && <span className="min-w-0 truncate"><TypeLabel name={joke.types[0]} /></span>}
          </span>
        </>
      )}
    </button>
  )
}
