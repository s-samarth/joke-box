/**
 * Link something by typing, not scrolling: a search box that shows the three best matches (every
 * word has to appear). Tap one to link it; the box clears and stays ready for the next. Focused
 * and empty, it suggests three to start from (the caller's order: same topic first, newest).
 * What's already linked still turns up, dimmed with a tick, and a tap on it unlinks it.
 * Like linking a page in Notion or an issue in GitHub.
 *
 * The list closes on a tap outside it, not when the box loses focus: on an iPhone the box loses
 * focus as soon as a match is touched, which used to hide the list before the tap could link.
 */
import { Check, Link2, Search } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { matchesWords } from '../../lib/search'

export interface Linkable {
  id: string
  text: string
  /** A quiet second line: its topic, or what it is. */
  sub?: string
  /** Already linked: shown dimmed, and a tap unlinks it. */
  linked?: boolean
}

const SHOWN = 3

interface Props {
  items: Linkable[]
  placeholder: string
  onPick: (id: string) => void
  onUnpick?: (id: string) => void
}

export function LinkSearch({ items, placeholder, onPick, onUnpick }: Props) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const box = useRef<HTMLDivElement>(null)
  const listId = useId()
  const shown = onUnpick ? items : items.filter((i) => !i.linked)
  const found = shown.filter((i) => matchesWords(query, [i.text, i.sub ?? ''])).slice(0, SHOWN)
  const left = shown.some((i) => !i.linked)
  const choose = (i: Linkable) => {
    if (i.linked) onUnpick?.(i.id)
    else onPick(i.id)
    setQuery('')
  }

  useEffect(() => {
    if (!open) return
    const outside = (e: PointerEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('pointerdown', outside)
    return () => document.removeEventListener('pointerdown', outside)
  }, [open])

  return (
    <div ref={box} className="relative">
      <Search size={17} className="pointer-events-none absolute top-[22px] left-3 -translate-y-1/2 text-faint" />
      <input type="search" value={query} placeholder={placeholder} aria-label={placeholder} aria-controls={listId} aria-expanded={open}
        onChange={(e) => { setQuery(e.target.value); setOpen(true) }} onFocus={() => setOpen(true)}
        // Tabbing away closes it; a tap on a match keeps it (see above).
        onBlur={(e) => { if (e.relatedTarget && !box.current?.contains(e.relatedTarget)) setOpen(false) }}
        // Enter links the first match and never submits a form the box sits in (New joke).
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); if (found[0]) choose(found[0]) } if (e.key === 'Escape') { setQuery(''); setOpen(false) } }}
        className="h-11 w-full rounded-xl bg-ink-2 pr-3 pl-10 text-[15px] text-paper ring-1 ring-rule outline-none placeholder:text-faint focus:ring-2 focus:ring-paper/40" />
      {open && (
        <ul id={listId} role="listbox" aria-label="Matches" className="mt-1.5 overflow-hidden rounded-xl bg-ink-2 ring-1 ring-rule">
          {found.length === 0 ? (
            <li className="px-4 py-3 text-sm text-dim">{query.trim() ? 'Nothing matches. Try fewer words.' : left ? 'Type to search.' : 'Nothing left to link.'}</li>
          ) : found.map((i) => (
            <li key={i.id} role="option" aria-selected={!!i.linked} className="border-t border-rule first:border-t-0">
              {/* On a computer, keeps the box focused, so you can type the next one straight away. */}
              <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => choose(i)}
                aria-label={i.linked ? `Unlink: ${i.text}` : undefined}
                className={`flex w-full items-start gap-3 px-4 py-2.5 text-left transition-colors hover:bg-ink-3 ${i.linked ? 'bg-ink-3/60 text-faint' : ''}`}>
                {i.linked
                  ? <Check size={15} className="mt-1 shrink-0 text-faint" aria-hidden />
                  : <Link2 size={15} className="mt-1 shrink-0 text-tape" aria-hidden />}
                <span className="min-w-0 flex-1">
                  <span className="line-clamp-2 text-[15px] leading-snug">{i.text}</span>
                  <span className="mt-0.5 block text-xs text-faint">{i.linked ? ['Linked · tap to unlink', i.sub].filter(Boolean).join(' · ') : i.sub}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
