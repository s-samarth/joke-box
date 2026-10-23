/** One joke on the joke map: its setup, strength and first type. Tapping it opens it beside the map. */
import type { CSSProperties } from 'react'
import type { Joke } from '../../../api/types'
import { StrengthTicks, TypeLabel } from '../../../components/ui/pieces'
import { NODE } from './mapLayout'

interface Props {
  joke: Joke
  /** Where it sits on the map; none for a joke in the grid under it. */
  at?: { x: number; y: number }
  dim?: boolean
  selected?: boolean
  /** Another chain is lit up, so this one steps back. */
  faded?: boolean
  onSelect: () => void
  onLight?: (on: boolean) => void
}

export function MapBox({ joke, at, dim, selected, faded, onSelect, onLight }: Props) {
  const style: CSSProperties | undefined = at && { position: 'absolute', left: at.x, top: at.y, width: NODE.w, height: NODE.h }
  const edge = selected
    ? 'border-2 border-tape bg-ink-3'
    : dim ? 'border border-dashed border-rule-strong bg-ink/60' : 'border border-rule-strong bg-ink-2 hover:border-tape/60'
  return (
    <button type="button" data-joke={joke.id} style={style} onClick={onSelect} aria-pressed={selected}
      aria-label={`${joke.setup}${dim ? ' (outside these filters)' : ''}`}
      onMouseEnter={() => onLight?.(true)} onMouseLeave={() => onLight?.(false)} onFocus={() => onLight?.(true)} onBlur={() => onLight?.(false)}
      className={`flex flex-col justify-between rounded-xl p-3 text-left transition-[opacity,border-color] ${edge} ${at ? '' : 'min-h-24'} ${faded ? 'opacity-30' : dim && !selected ? 'opacity-60' : ''}`}>
      <span className="line-clamp-3 text-[14px] leading-snug text-paper">{joke.setup}</span>
      <span className="mt-2 flex items-center gap-3">
        <StrengthTicks strength={joke.strength} />
        {joke.types[0] && <span className="min-w-0 truncate"><TypeLabel name={joke.types[0]} /></span>}
      </span>
    </button>
  )
}
