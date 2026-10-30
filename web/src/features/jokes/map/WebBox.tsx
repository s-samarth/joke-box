/** One joke on the premise web: bigger and bolder than a map box, so the web reads from afar. */
import type { Joke } from '../../../api/types'
import { StrengthTicks, TypeLabel } from '../../../components/ui/pieces'
import { WEB_NODE } from './webLayout'

interface Props {
  joke: Joke
  x: number
  y: number
  dim: boolean
  selected: boolean
  onSelect: () => void
}

export function WebBox({ joke, x, y, dim, selected, onSelect }: Props) {
  const edge = selected
    ? 'border-tape bg-ink-3'
    : dim ? 'border-dashed border-rule-strong bg-ink/70 opacity-60' : 'border-rule-strong bg-ink-2 hover:border-tape/70 hover:bg-ink-3'
  return (
    <button type="button" data-joke={joke.id} onClick={onSelect} aria-pressed={selected} aria-label={`${joke.setup}${dim ? ' (outside these filters)' : ''}`}
      style={{ position: 'absolute', left: x, top: y, width: WEB_NODE.w, height: WEB_NODE.h }}
      className={`flex flex-col justify-between rounded-2xl border-2 p-4 text-left shadow-lift transition-[opacity,border-color,background-color] ${edge}`}>
      <span className="line-clamp-3 text-[16px] leading-snug font-medium text-paper">{joke.setup}</span>
      <span className="mt-2 flex items-center gap-3">
        <StrengthTicks strength={joke.strength} />
        {joke.types[0] && <span className="min-w-0 truncate text-[13px]"><TypeLabel name={joke.types[0]} /></span>}
      </span>
    </button>
  )
}
