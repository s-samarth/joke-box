/**
 * A list from a note. Numbered items get a number badge; indented items sit under the item above
 * them in smaller, quieter type, so a long list reads as a few groups instead of one wall.
 */
import { Check } from 'lucide-react'
import type { ReactNode } from 'react'
import { groupItems, type ListItem } from './bodyFormat'

interface Props {
  ordered: boolean
  items: ListItem[]
  inline: (text: string) => ReactNode
  onTick?: (line: number) => void
}

function Tick({ item, onTick }: { item: ListItem; onTick?: (line: number) => void }) {
  const box = `mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-md ring-1 ${item.checked ? 'bg-ok text-ink ring-ok' : 'ring-rule-strong'}`
  const mark = item.checked && <Check size={14} strokeWidth={3} />
  if (!onTick) return <span className={box} aria-hidden>{mark}</span>
  return (
    <button type="button" role="checkbox" aria-checked={Boolean(item.checked)} aria-label={item.text} onClick={() => onTick(item.line)} className={`${box} hover:ring-tape`}>
      {mark}
    </button>
  )
}

/** The mark before an item: a tick box, a number badge or a dot. */
function Marker({ item, n, ordered, onTick }: { item: ListItem; n: number; ordered: boolean; onTick?: (line: number) => void }) {
  if (item.checked !== null) return <Tick item={item} onTick={onTick} />
  if (ordered) return <span aria-hidden className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-ink-4 text-[11px] font-semibold text-paper">{n}</span>
  return <span aria-hidden className="mt-[0.6em] size-1.5 shrink-0 rounded-full bg-faint" />
}

export function NoteList({ ordered, items, inline, onTick }: Props) {
  const List = ordered ? 'ol' : 'ul'
  return (
    <List className="space-y-2">
      {groupItems(items).map(({ item, children }, i) => (
        <li key={item.line}>
          <div className="flex gap-2.5">
            <Marker item={item} n={i + 1} ordered={ordered} onTick={onTick} />
            <span className={item.checked ? 'text-dim' : ''}>{inline(item.text)}</span>
          </div>
          {children.length > 0 && (
            <ul className="mt-1 ml-[1.875rem] space-y-0.5 border-l border-rule pl-3 text-sm text-dim">
              {children.map((c) => (
                <li key={c.line} className="flex gap-2">
                  {c.checked !== null && <Tick item={c} onTick={onTick} />}
                  <span className={c.checked ? 'text-faint' : ''}>{inline(c.text)}</span>
                </li>
              ))}
            </ul>
          )}
        </li>
      ))}
    </List>
  )
}
